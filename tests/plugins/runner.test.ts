import { describe, it, expect, vi, afterEach } from 'vitest';
import { runPlugins, PluginError } from '../../src/plugins';
import type { HermexPlugin, PluginContext } from '../../src/plugins';
import type { AggregatedReport } from '../../src/utils/aggregator';
import type { ResolvedHermexConfig } from '../../src/config/overrides';
import type { RuleViolation } from '../../src/rules/shared';

function aggregated(
  overrides: Partial<AggregatedReport> = {},
): AggregatedReport {
  return {
    filesAnalyzed: 3,
    totalImports: 7,
    totalComponents: 2,
    totalUsagePatterns: 11,
    patternCounts: [],
    componentUsage: new Map(),
    topComponents: [],
    packageInventory: [],
    packageDistribution: [],
    versusResults: [],
    ruleViolations: [],
    reports: [],
    ...overrides,
  };
}

/** Only the fields the runner actually reads off the config. */
const config = {} as ResolvedHermexConfig;

function run(plugins: HermexPlugin[], agg = aggregated()) {
  return runPlugins({
    plugins,
    aggregated: agg,
    config,
    cwd: '/repo',
    files: ['a.tsx', 'b.tsx'],
    quiet: true,
  });
}

/** A plugin whose hook body is supplied by the test. */
function plugin(
  name: string,
  onRunComplete: (ctx: PluginContext) => void | Promise<void>,
): HermexPlugin {
  return { name, hooks: { onRunComplete } };
}

describe('runPlugins', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns nothing and does no work when no plugins are configured', async () => {
    await expect(run([])).resolves.toEqual([]);
  });

  it('collects violations contributed through ctx.violations.add', async () => {
    const violations = await run([
      plugin('oxlint', (ctx) => {
        ctx.violations.add({
          ruleId: 'no-unused-vars',
          severity: 'warn',
          message: 'x is unused',
        });
      }),
    ]);

    expect(violations).toEqual([
      {
        ruleId: 'oxlint/no-unused-vars',
        severity: 'warn',
        message: 'x is unused',
        plugin: 'oxlint',
      },
    ]);
  });

  it('namespaces rule ids under the plugin name', async () => {
    const [violation] = await run([
      plugin('my-tool', (ctx) => {
        ctx.violations.add({
          ruleId: 'rule-a',
          severity: 'error',
          message: 'm',
        });
      }),
    ]);

    expect(violation.ruleId).toBe('my-tool/rule-a');
    expect(violation.plugin).toBe('my-tool');
  });

  it('does not double-prefix a rule id the plugin already namespaced', async () => {
    const [violation] = await run([
      plugin('oxlint', (ctx) => {
        ctx.violations.add({
          ruleId: 'oxlint/no-debugger',
          severity: 'error',
          message: 'm',
        });
      }),
    ]);

    expect(violation.ruleId).toBe('oxlint/no-debugger');
  });

  it('imposes no limit on how many violations a plugin contributes', async () => {
    // Granularity is the plugin's decision, not hermex's (#102) — a plugin
    // wrapping a linter may legitimately push thousands of line-level rows.
    const violations = await run([
      plugin('noisy', (ctx) => {
        for (let i = 0; i < 3000; i++)
          ctx.violations.add({
            ruleId: `r${i}`,
            severity: 'info',
            message: 'm',
          });
      }),
    ]);

    expect(violations).toHaveLength(3000);
  });

  it('runs plugins sequentially in array order', async () => {
    const order: string[] = [];
    const slow = plugin('slow', async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push('slow');
    });
    const fast = plugin('fast', () => void order.push('fast'));

    await run([slow, fast]);

    // Not just "both ran" — `slow` must finish before `fast` starts, or the
    // output review would diff on ordering alone.
    expect(order).toEqual(['slow', 'fast']);
  });

  it('preserves contribution order across plugins', async () => {
    const violations = await run([
      plugin('first', (ctx) =>
        ctx.violations.add({ ruleId: 'a', severity: 'info', message: 'm' }),
      ),
      plugin('second', (ctx) =>
        ctx.violations.add({ ruleId: 'b', severity: 'info', message: 'm' }),
      ),
    ]);

    expect(violations.map((v) => v.ruleId)).toEqual(['first/a', 'second/b']);
  });

  it('skips a plugin that declares no onRunComplete hook', async () => {
    const violations = await run([
      { name: 'inert', hooks: {} },
      plugin('active', (ctx) =>
        ctx.violations.add({ ruleId: 'a', severity: 'info', message: 'm' }),
      ),
    ]);

    expect(violations.map((v) => v.ruleId)).toEqual(['active/a']);
  });

  describe('context', () => {
    it('exposes cwd, files and the inventory summary', async () => {
      let seen: PluginContext | undefined;
      await run([plugin('probe', (ctx) => void (seen = ctx))]);

      expect(seen?.cwd).toBe('/repo');
      expect(seen?.files).toEqual(['a.tsx', 'b.tsx']);
      expect(seen?.inventory.summary).toEqual({
        filesAnalyzed: 3,
        totalImports: 7,
        totalComponents: 2,
        totalUsagePatterns: 11,
      });
    });

    it("exposes hermex's own violations to a plugin", async () => {
      const core: RuleViolation = {
        ruleId: 'require-files',
        severity: 'error',
        patterns: ['LICENSE'],
        matchedFiles: [],
      };
      let seen: readonly RuleViolation[] = [];

      await run(
        [plugin('reporter', (ctx) => void (seen = ctx.inventory.violations))],
        aggregated({ ruleViolations: [core] }),
      );

      expect(seen).toEqual([core]);
    });

    it("exposes an earlier plugin's violations to a later one", async () => {
      let seen: readonly RuleViolation[] = [];

      await run([
        plugin('producer', (ctx) =>
          ctx.violations.add({ ruleId: 'a', severity: 'info', message: 'm' }),
        ),
        plugin('reporter', (ctx) => void (seen = ctx.inventory.violations)),
      ]);

      expect(seen.map((v) => v.ruleId)).toEqual(['producer/a']);
    });

    it('shares the meta channel across plugins within one run', async () => {
      let seen: unknown;

      await run([
        plugin('writer', (ctx) => ctx.meta.set('last_commit', 'abc123')),
        plugin('reader', (ctx) => void (seen = ctx.meta.get('last_commit'))),
      ]);

      expect(seen).toBe('abc123');
    });

    it('does not leak the meta channel between runs', async () => {
      await run([plugin('writer', (ctx) => ctx.meta.set('k', 'v'))]);

      let seen: unknown = 'unset';
      await run([plugin('reader', (ctx) => void (seen = ctx.meta.get('k')))]);

      expect(seen).toBeUndefined();
    });

    it('suppresses logger output when quiet (JSON mode owns stdout)', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      await run([plugin('chatty', (ctx) => ctx.logger.info('hello'))]);
      expect(log).not.toHaveBeenCalled();
    });

    it('prefixes logger output with the plugin name when not quiet', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});

      await runPlugins({
        plugins: [plugin('chatty', (ctx) => ctx.logger.info('hello'))],
        aggregated: aggregated(),
        config,
        cwd: '/repo',
        files: [],
      });

      expect(log).toHaveBeenCalledWith(
        expect.stringContaining('[chatty] hello'),
      );
    });
  });

  describe('failure', () => {
    it('wraps a thrown error in PluginError naming the plugin', async () => {
      const failing = plugin('oxlint', () => {
        throw new Error('spawn oxlint ENOENT');
      });

      await expect(run([failing])).rejects.toThrow(PluginError);
      await expect(run([failing])).rejects.toThrow(
        /Plugin "oxlint" failed: spawn oxlint ENOENT/,
      );
    });

    it('wraps a rejected promise the same way', async () => {
      const failing = plugin('async-fail', async () => {
        throw new Error('boom');
      });

      await expect(run([failing])).rejects.toThrow(
        /Plugin "async-fail" failed: boom/,
      );
    });

    it('aborts the run rather than continuing to later plugins', async () => {
      // A governance tool that stays green while a plugin silently did not
      // run is the failure mode #102 rejected — so no later plugin runs.
      const after = vi.fn();

      await expect(
        run([
          plugin('failing', () => {
            throw new Error('boom');
          }),
          plugin('after', after),
        ]),
      ).rejects.toThrow(PluginError);

      expect(after).not.toHaveBeenCalled();
    });

    it('retains the original error as `cause`', async () => {
      const original = new Error('root cause');
      const error = await run([
        plugin('p', () => {
          throw original;
        }),
      ]).catch((e: unknown) => e as PluginError);

      expect(error.cause).toBe(original);
      expect(error.pluginName).toBe('p');
    });
  });
});
