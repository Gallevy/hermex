import { describe, expect, it } from 'vitest';
import { aggregateReports } from '../../src/utils/aggregator';
import { HermexConfigSchema } from '../../src/config/schema';
import type { HermexConfigInput } from '../../src/config/schema';
import type { JSXUsage } from '../../src/swc-parser/types';
import { createMockReport } from '../helpers/mock-reports';

/** Parse a partial config through the real schema so all defaults apply. */
function createConfig(input: HermexConfigInput = {}) {
  return HermexConfigSchema.parse(input);
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

/** Create a report with a single named import and a JSX usage of it. */
function reportWithNamedImport(name: string, source: string) {
  const report = createMockReport();
  report.summary.totalImports = 1;
  report.summary.totalUsagePatterns = 1;
  report.patterns.imports.named.push({ name, source });
  report.patterns.usage.jsx.push(jsxUsage(name));
  return report;
}

describe('aggregateReports — empty input', () => {
  it('returns zeroed counts for empty reports array', () => {
    const result = aggregateReports([]);
    expect(result.filesAnalyzed).toBe(0);
    expect(result.totalImports).toBe(0);
    expect(result.totalComponents).toBe(0);
    expect(result.totalUsagePatterns).toBe(0);
    expect(result.packageDistribution).toEqual([]);
    expect(result.patternCounts).toEqual([]);
    expect(result.versusResults).toEqual([]);
    expect(result.bannedPackageViolations).toEqual([]);
    expect(result.ruleViolations).toEqual([]);
    expect(result.topComponents).toEqual([]);
    expect(result.allComponents).toEqual([]);
  });
});

describe('aggregateReports — component counting', () => {
  it('counts JSX component usage across reports', () => {
    const report = reportWithNamedImport('Button', 'react');

    const result = aggregateReports([report], { react: '18.0.0' });

    expect(result.filesAnalyzed).toBe(1);
    expect(result.totalImports).toBe(1);
    expect(result.totalComponents).toBe(1);
    expect(result.topComponents).toHaveLength(1);
    expect(result.topComponents[0].name).toBe('Button');
    expect(result.topComponents[0].count).toBe(1);
    expect(result.topComponents[0].source).toBe('react');
    expect(result.allComponents).toEqual(['Button']);
  });

  it('aggregates the same component used across multiple reports', () => {
    const reportA = reportWithNamedImport('Button', 'react');
    const reportB = reportWithNamedImport('Button', 'react');

    const result = aggregateReports([reportA, reportB], { react: '18.0.0' });

    expect(result.filesAnalyzed).toBe(2);
    expect(result.totalComponents).toBe(1);
    expect(result.topComponents).toHaveLength(1);
    expect(result.topComponents[0].name).toBe('Button');
    expect(result.topComponents[0].count).toBe(2);
  });
});

describe('aggregateReports — component files', () => {
  it('tracks each distinct file where a component is used', () => {
    const reportA = reportWithNamedImport('Button', 'react');
    reportA.filePath = 'a.tsx';
    const reportB = reportWithNamedImport('Button', 'react');
    reportB.filePath = 'b.tsx';

    const result = aggregateReports([reportA, reportB], { react: '18.0.0' });

    expect(result.componentUsage.get('react::Button')?.files).toEqual(
      new Set(['a.tsx', 'b.tsx']),
    );
  });

  it('dedupes the same file when a component is used multiple times in it', () => {
    const report = reportWithNamedImport('Button', 'react');
    report.filePath = 'a.tsx';
    report.patterns.usage.jsx.push(jsxUsage('Button'));

    const result = aggregateReports([report], { react: '18.0.0' });

    const button = result.componentUsage.get('react::Button');
    expect(button?.files).toEqual(new Set(['a.tsx']));
    expect(button?.count).toBe(2);
  });
});

describe('aggregateReports — package distribution', () => {
  it('resolves component to its package', () => {
    const report = reportWithNamedImport('Button', 'react');

    const result = aggregateReports([report], { react: '18.0.0' });

    expect(result.packageDistribution).toHaveLength(1);
    const dist = result.packageDistribution[0];
    expect(dist.packageName).toBe('react');
    expect(dist.version).toBe('18.0.0');
    expect(dist.components).toContain('Button');
    expect(dist.componentCount).toBe(1);
    expect(dist.usageCount).toBe(1);
    expect(dist.percentage).toBe(100);
    expect(dist.internal).toBe(false);
  });

  it('resolves subpath imports to the base package', () => {
    const report = reportWithNamedImport('Dialog', '@scope/pkg/sub');

    const result = aggregateReports([report], { '@scope/pkg': '2.1.0' });

    expect(result.packageDistribution).toHaveLength(1);
    expect(result.packageDistribution[0].packageName).toBe('@scope/pkg');
    expect(result.packageDistribution[0].version).toBe('2.1.0');
  });

  it('excludes local and unknown sources from package distribution', () => {
    const localReport = reportWithNamedImport('Button', './components/Button');
    const unknownReport = reportWithNamedImport('Widget', 'unknown-lib');

    // 'unknown-lib' is not in the versions map, so it resolves to 'unknown';
    // './components/Button' resolves to 'local'. Both are skipped.
    const result = aggregateReports([localReport, unknownReport], {});

    expect(result.packageDistribution).toEqual([]);
    // Components are still counted even when their source is local/unknown
    expect(result.totalComponents).toBe(2);
  });

  it('marks packages matching internal patterns as internal', () => {
    const report = reportWithNamedImport('Card', '@company/ui');
    const config = createConfig({ packages: { internal: ['@company/*'] } });

    const result = aggregateReports(
      [report],
      { '@company/ui': '2.0.0' },
      config,
    );

    expect(result.packageDistribution).toHaveLength(1);
    const dist = result.packageDistribution[0];
    expect(dist.packageName).toBe('@company/ui');
    expect(dist.version).toBe('2.0.0');
    expect(dist.internal).toBe(true);
  });

  it('surfaces a lockfile-only, side-effect-imported package that matches releaseAge.enforceOn (#27)', () => {
    // No component ever imports '@guestyci/arc-styles' — it's a CSS
    // package pulled in only via `import '@guestyci/arc-styles/button.css'`,
    // which has no specifiers and never shows up in JSX/import usage.
    const report = reportWithNamedImport('Button', 'react');
    const config = createConfig({
      releaseAge: { enabled: true, enforceOn: ['@guestyci/arc-styles'] },
    });

    const result = aggregateReports(
      [report],
      { react: '18.0.0', '@guestyci/arc-styles': '3.4.0' },
      config,
    );

    const arcStyles = result.packageDistribution.find(
      (p) => p.packageName === '@guestyci/arc-styles',
    );
    expect(arcStyles).toBeDefined();
    expect(arcStyles?.version).toBe('3.4.0');
    expect(arcStyles?.usageCount).toBe(0);
    expect(arcStyles?.componentCount).toBe(0);
  });
});

describe('aggregateReports — banned packages', () => {
  it('reports a banned package violation', () => {
    const report = reportWithNamedImport('Moment', 'moment');
    const config = createConfig({
      rules: {
        forbid_packages: [
          { severity: 'error', patterns: ['moment'], message: 'Use dayjs' },
        ],
      },
    });

    const result = aggregateReports([report], { moment: '2.29.0' }, config);

    expect(result.bannedPackageViolations).toHaveLength(1);
    expect(result.bannedPackageViolations[0]).toEqual({
      packageName: 'moment',
      severity: 'error',
      message: 'Use dayjs',
    });
  });

  it('reports no violations when no package matches', () => {
    const report = reportWithNamedImport('Button', 'react');
    const config = createConfig({
      rules: { forbid_packages: [{ severity: 'warn', patterns: ['moment'] }] },
    });

    const result = aggregateReports([report], { react: '18.0.0' }, config);

    expect(result.bannedPackageViolations).toEqual([]);
  });
});

describe('aggregateReports — pattern counts', () => {
  it('counts patterns from reports', () => {
    const report = createMockReport();
    report.patterns.imports.default.push({ name: 'React', source: 'react' });

    const result = aggregateReports([report]);

    const defaultImports = result.patternCounts.find(
      (p) => p.patternType === 'imports.default',
    );
    expect(defaultImports).toBeDefined();
    expect(defaultImports?.count).toBe(1);
    expect(defaultImports?.displayName).toBe('Default Imports');
  });

  it('aggregates pattern counts across reports and sorts by count', () => {
    const reportA = reportWithNamedImport('Button', 'react');
    const reportB = reportWithNamedImport('Input', 'react');
    reportB.patterns.imports.default.push({ name: 'React', source: 'react' });

    const result = aggregateReports([reportA, reportB], { react: '18.0.0' });

    const named = result.patternCounts.find(
      (p) => p.patternType === 'imports.named',
    );
    const jsx = result.patternCounts.find((p) => p.patternType === 'usage.jsx');
    const defaults = result.patternCounts.find(
      (p) => p.patternType === 'imports.default',
    );
    expect(named?.count).toBe(2);
    expect(jsx?.count).toBe(2);
    expect(defaults?.count).toBe(1);
    // Sorted descending by count
    const counts = result.patternCounts.map((p) => p.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });
});

describe('aggregateReports — versus results', () => {
  it('calculates versus percentages across two competing packages', () => {
    const momentReport = reportWithNamedImport('Moment', 'moment');
    const dayjsReport = reportWithNamedImport('Dayjs', 'dayjs');
    const config = createConfig({
      versus: [{ name: 'Date libraries', packages: ['moment', 'dayjs'] }],
    });

    const result = aggregateReports(
      [momentReport, dayjsReport],
      { moment: '2.29.0', dayjs: '1.11.0' },
      config,
    );

    expect(result.versusResults).toHaveLength(1);
    const versus = result.versusResults[0];
    expect(versus.name).toBe('Date libraries');
    expect(versus.packages).toEqual(['moment', 'dayjs']);
    expect(versus.totalCount).toBe(2);
    expect(versus.entries).toHaveLength(2);

    const moment = versus.entries.find((e) => e.packageName === 'moment');
    const dayjs = versus.entries.find((e) => e.packageName === 'dayjs');
    expect(moment?.count).toBe(1);
    expect(moment?.percentage).toBe(50);
    expect(moment?.components).toEqual(['Moment']);
    expect(dayjs?.count).toBe(1);
    expect(dayjs?.percentage).toBe(50);
  });

  it('reports zero counts for versus packages that are never used', () => {
    const momentReport = reportWithNamedImport('Moment', 'moment');
    const config = createConfig({
      versus: [{ name: 'Date libraries', packages: ['moment', 'dayjs'] }],
    });

    const result = aggregateReports(
      [momentReport],
      { moment: '2.29.0' },
      config,
    );

    const versus = result.versusResults[0];
    expect(versus.totalCount).toBe(1);
    const dayjs = versus.entries.find((e) => e.packageName === 'dayjs');
    expect(dayjs?.count).toBe(0);
    expect(dayjs?.percentage).toBe(0);
    expect(dayjs?.components).toEqual([]);
  });
});
