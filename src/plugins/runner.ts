import chalk from 'chalk';
import type { ResolvedHermexConfig } from '../config/overrides';
import type { AggregatedReport } from '../utils/aggregator';
import type {
  HermexPlugin,
  PluginContext,
  PluginInventoryView,
  PluginViolation,
  PluginViolationInput,
} from './types';

/**
 * Thrown when a plugin's hook rejects or throws. Carries the plugin name so
 * the failure is attributable — "oxlint failed" rather than an anonymous
 * stack out of the middle of the pipeline.
 *
 * A plugin failure aborts the run: a governance tool whose lint plugin
 * quietly did not run while CI stayed green is the worst available failure
 * mode, so hermex reports neither pass nor fail (#102).
 */
export class PluginError extends Error {
  constructor(
    readonly pluginName: string,
    readonly cause: unknown,
  ) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Plugin "${pluginName}" failed: ${detail}`);
    this.name = 'PluginError';
  }
}

/**
 * Namespaces a plugin's rule id under its canonical name, unless the plugin
 * already did. Both `no-unused-vars` and `oxlint/no-unused-vars` coming from
 * the `oxlint` plugin land on `oxlint/no-unused-vars`, so attribution can't
 * be lost or doubled by an inattentive plugin author.
 */
function namespaceRuleId(pluginName: string, ruleId: string): string {
  const prefix = `${pluginName}/`;
  return ruleId.startsWith(prefix) ? ruleId : `${prefix}${ruleId}`;
}

function buildInventoryView(
  aggregated: AggregatedReport,
  violations: readonly PluginViolation[],
): PluginInventoryView {
  return {
    summary: {
      filesAnalyzed: aggregated.filesAnalyzed,
      totalImports: aggregated.totalImports,
      totalComponents: aggregated.totalComponents,
      totalUsagePatterns: aggregated.totalUsagePatterns,
    },
    packages: aggregated.packageDistribution,
    components: aggregated.topComponents,
    versus: aggregated.versusResults,
    // hermex's own findings plus whatever earlier plugins contributed — the
    // view is rebuilt per plugin so a reporter running last sees everything.
    violations: [...aggregated.ruleViolations, ...violations],
  };
}

export interface RunPluginsOptions {
  plugins: readonly HermexPlugin[];
  aggregated: AggregatedReport;
  config: ResolvedHermexConfig;
  cwd: string;
  files: readonly string[];
  /** Suppressed under `--format json`, where stdout is the payload. */
  quiet?: boolean;
}

/**
 * Runs every plugin's `onRunComplete` in array order, sequentially, and
 * returns what they contributed.
 *
 * Sequential rather than parallel because `scripts/output-review.ts` diffs
 * printed output — nondeterministic violation ordering would make every run
 * a false diff. Parallelism is a valid later optimization, but only one that
 * preserves result order.
 *
 * There is no ordering primitive beyond array order (no `enforce: pre|post`,
 * no dependency graph): with a single terminal hook there is no data
 * dependency between plugins, so order only affects how output reads (#102).
 */
export async function runPlugins({
  plugins,
  aggregated,
  config,
  cwd,
  files,
  quiet = false,
}: RunPluginsOptions): Promise<PluginViolation[]> {
  const collected: PluginViolation[] = [];
  if (plugins.length === 0) return collected;

  const meta = new Map<string, unknown>();

  for (const plugin of plugins) {
    const hook = plugin.hooks.onRunComplete;
    if (!hook) continue;

    const ctx: PluginContext = {
      cwd,
      config,
      files,
      inventory: buildInventoryView(aggregated, collected),
      violations: {
        add(violation: PluginViolationInput) {
          collected.push({
            ...violation,
            ruleId: namespaceRuleId(plugin.name, violation.ruleId),
            plugin: plugin.name,
          });
        },
      },
      meta: {
        set: (key, value) => void meta.set(key, value),
        get: (key) => meta.get(key),
      },
      logger: {
        info: (message) => {
          if (!quiet) console.log(chalk.gray(`[${plugin.name}] ${message}`));
        },
        warn: (message) => {
          if (!quiet) console.warn(chalk.yellow(`[${plugin.name}] ${message}`));
        },
      },
    };

    try {
      await hook(ctx);
    } catch (error: unknown) {
      throw new PluginError(plugin.name, error);
    }
  }

  return collected;
}
