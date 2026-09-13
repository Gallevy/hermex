import { describe, expect, it, vi } from 'vitest';
import { runRules } from '../../src/rules/run';
import { aggregateReports } from '../../src/utils/aggregator';
import { HermexConfigSchema } from '../../src/config/schema';
import type { HermexConfigInput } from '../../src/config/schema';
import { applyOverrides } from '../../src/config/overrides';
import type { JSXUsage, UsageReport } from '../../src/swc-parser/types';
import type { DeclaredPackages } from '../../src/utils/package-inventory';
import { createMockReport } from '../helpers/mock-reports';

/**
 * Parse a partial config through the real schema, then resolve it exactly
 * like the real pipeline does — same reasoning as
 * tests/utils/package-rules.test.ts's createConfig. None of these tests
 * configure `overrides`, so the repo path is never read.
 */
function createConfig(input: HermexConfigInput = {}) {
  return applyOverrides(HermexConfigSchema.parse(input), process.cwd());
}

/** Create a minimal JSXUsage entry for a component. */
function jsxUsage(component: string): JSXUsage {
  return {
    component,
    props: [],
    propsAnalysis: {
      namedProps: [],
      hasSpread: false,
      hasComplexProps: false,
      hasEventHandlers: false,
      propDetails: [],
    },
  };
}

function reportWithNamedImport(name: string, source: string): UsageReport {
  const report = createMockReport();
  report.summary.totalImports = 1;
  report.summary.totalUsagePatterns = 1;
  report.patterns.imports.named.push({ name, source });
  report.patterns.usage.jsx.push(jsxUsage(name));
  return report;
}

/**
 * Runs the rule layer the way the pipeline does: aggregate facts first, then
 * evaluate every rule against them. `repoPath` is a directory with no
 * package.json / CODEOWNERS, so the file and manifest evaluators contribute
 * nothing and each test sees only the rules it configured.
 */
async function run(
  reports: UsageReport[],
  versions: Record<string, string>,
  config: ReturnType<typeof createConfig>,
  declaredPackages: DeclaredPackages = {},
) {
  const analysis = aggregateReports(
    reports,
    versions,
    config,
    {},
    {},
    declaredPackages,
  );

  return runRules({
    repoPath: __dirname,
    config,
    files: [],
    inventory: analysis.packageInventory,
    packages: analysis.packageDistribution,
  });
}

describe('runRules — forbidden packages', () => {
  it('reports a forbidden package as a rule violation', async () => {
    const report = reportWithNamedImport('Moment', 'moment');
    const config = createConfig({
      rules: {
        'no-packages': [
          { severity: 'error', patterns: ['moment'], message: 'Use dayjs' },
        ],
      },
    });

    const { violations } = await run([report], { moment: '2.29.0' }, config);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toEqual({
      ruleId: 'no-packages',
      severity: 'error',
      patterns: ['moment'],
      message: 'Use dayjs',
      packageName: 'moment',
    });
  });

  // #77: one list, so a consumer iterating ruleViolations can't miss a
  // no-packages hit the way it could when they lived in their own field.
  it('puts no-packages and require-packages hits in one list, in detection order', async () => {
    const report = reportWithNamedImport('Moment', 'moment');
    const config = createConfig({
      rules: {
        'no-packages': [{ severity: 'error', patterns: ['moment'] }],
        'require-packages': [{ severity: 'error', patterns: ['dayjs'] }],
      },
    });

    const { violations } = await run([report], { moment: '2.29.0' }, config);

    expect(violations.map((v) => v.ruleId)).toEqual([
      'no-packages',
      'require-packages',
    ]);
  });

  it('reports no violations when no package matches', async () => {
    const report = reportWithNamedImport('Button', 'react');
    const config = createConfig({
      rules: { 'no-packages': [{ severity: 'warn', patterns: ['moment'] }] },
    });

    const { violations } = await run([report], { react: '18.0.0' }, config);

    expect(violations).toEqual([]);
  });

  it('reports a forbidden package that is only declared in package.json', async () => {
    const report = reportWithNamedImport('Button', 'react');
    const config = createConfig({
      rules: {
        'no-packages': [
          { severity: 'error', patterns: ['jest'], message: 'Use vitest' },
        ],
      },
    });

    const { violations } = await run(
      [report],
      { react: '18.0.0', jest: '29.0.0' },
      config,
      { jest: ['devDependencies'] },
    );

    expect(violations).toEqual([
      {
        ruleId: 'no-packages',
        severity: 'error',
        patterns: ['jest'],
        message: 'Use vitest',
        packageName: 'jest',
      },
    ]);
  });
});

describe('runRules — emission order', () => {
  // The order is chosen in runRules, not inherited from whichever call site
  // happened to run first (#84). It reaches the JSON array directly and the
  // human Rules table through a stable sort, so changing it changes output.
  it('returns package rules before evaluator rules, in one list', async () => {
    const report = reportWithNamedImport('Moment', 'moment');
    const config = createConfig({
      rules: {
        'no-packages': [{ severity: 'error', patterns: ['moment'] }],
        'require-files': [
          { severity: 'error', patterns: ['definitely-absent.config.js'] },
        ],
      },
    });

    const analysis = aggregateReports([report], { moment: '2.29.0' }, config);
    const { violations } = await runRules({
      repoPath: __dirname,
      config,
      files: [],
      inventory: analysis.packageInventory,
      packages: analysis.packageDistribution,
    });

    expect(violations.map((v) => v.ruleId)).toEqual([
      'no-packages',
      'require-files',
    ]);
  });
});

describe('runRules — registry gate', () => {
  it('does not touch the registry, or fire its events, when no rule needs it', async () => {
    const report = reportWithNamedImport('Button', 'react');
    const config = createConfig({
      rules: {
        'no-outdated-packages': [],
        'no-deprecated-packages': [],
      },
    });

    const onRegistryStart = vi.fn();
    const onRegistryFinish = vi.fn();

    const analysis = aggregateReports([report], { react: '18.0.0' }, config);
    const { packages } = await runRules({
      repoPath: __dirname,
      config,
      files: [],
      inventory: analysis.packageInventory,
      packages: analysis.packageDistribution,
      events: { onRegistryStart, onRegistryFinish },
    });

    expect(onRegistryStart).not.toHaveBeenCalled();
    expect(onRegistryFinish).not.toHaveBeenCalled();
    // The package list comes back untouched — no enrichment pass ran (#107).
    expect(packages).toBe(analysis.packageDistribution);
  });
});
