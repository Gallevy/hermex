import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import chalk from 'chalk';
import type { AggregatedReport } from '../../src/utils/aggregator';
import type { RuleViolation } from '../../src/rules/evaluator';
import { computeCompliance } from '../../src/utils/compliance';
import { writeSummaryFile } from '../../src/utils/write-summary-file';
import {
  createMockPackage,
  createMockReleaseAge,
} from '../helpers/mock-reports';

function makeAggregated(
  overrides: Partial<AggregatedReport> = {},
): AggregatedReport {
  return {
    filesAnalyzed: 1,
    totalImports: 1,
    totalComponents: 1,
    totalUsagePatterns: 1,
    patternCounts: [],
    componentUsage: new Map(),
    topComponents: [],
    allComponents: [],
    packageDistribution: [],
    versusResults: [],
    ruleViolations: [],
    bannedPackageViolations: [],
    reports: [],
    ...overrides,
  };
}

describe('writeSummaryFile', () => {
  let tempDir: string;
  let summaryPath: string;
  const originalChalkLevel = chalk.level;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hermex-summary-test-'));
    summaryPath = join(tempDir, 'summary.md');
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
    chalk.level = originalChalkLevel;
  });

  it('writes a file with no ANSI escape sequences, even when chalk color is forced on', () => {
    chalk.level = 1;
    const violation: RuleViolation = {
      type: 'require_files',
      severity: 'error',
      patterns: ['.nvmrc'],
      matchedFiles: [],
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    writeSummaryFile(summaryPath, aggregated, computeCompliance(aggregated));

    const content = readFileSync(summaryPath, 'utf8');
    // oxlint-disable-next-line no-control-regex -- asserting the ANSI escape byte is absent
    expect(content).not.toMatch(/\x1b\[/);
  });

  it('only lists flagged packages (deprecated/banned/overdue), not healthy ones', () => {
    const healthy = createMockPackage('react');
    const deprecated = createMockPackage('left-pad', {
      releaseAge: createMockReleaseAge({ deprecated: '2020-01-01' }),
    });
    const overdueWarn = createMockPackage('lodash', {
      releaseAge: createMockReleaseAge({
        worstLevel: 'minor_overdue',
        severity: 'warn',
        upgrades: [
          {
            version: '4.17.21',
            releasedDaysAgo: 10,
            breachReleasedDaysAgo: 100,
            semverBump: 'minor',
            level: 'minor_overdue',
            thresholdDays: 60,
          },
        ],
      }),
    });
    const aggregated = makeAggregated({
      packageDistribution: [healthy, deprecated, overdueWarn],
    });
    writeSummaryFile(summaryPath, aggregated, computeCompliance(aggregated));

    const content = readFileSync(summaryPath, 'utf8');
    expect(content).toContain('left-pad');
    expect(content).toContain('lodash');
    expect(content).not.toContain('react');
  });

  it('does not show a "success" glyph next to a deprecated-only package with no upgrade info', () => {
    const deprecated = createMockPackage('left-pad', {
      releaseAge: createMockReleaseAge({ deprecated: '2020-01-01' }),
    });
    const aggregated = makeAggregated({ packageDistribution: [deprecated] });
    writeSummaryFile(summaryPath, aggregated, computeCompliance(aggregated));

    const content = readFileSync(summaryPath, 'utf8');
    const packageLine = content
      .split('\n')
      .find((line) => line.includes('left-pad'));
    expect(packageLine).toBe('- [DEPRECATED] left-pad');
  });

  it('omits Versus content, even when versusResults is populated', () => {
    const aggregated = makeAggregated({
      versusResults: [
        {
          name: 'ui-kits',
          packages: ['react', 'vue'],
          entries: [
            { packageName: 'react', count: 3, percentage: 100, components: [] },
            { packageName: 'vue', count: 0, percentage: 0, components: [] },
          ],
          totalCount: 3,
        },
      ],
    });
    writeSummaryFile(summaryPath, aggregated, computeCompliance(aggregated));

    const content = readFileSync(summaryPath, 'utf8');
    expect(content).not.toContain('Versus');
    expect(content).not.toContain('ui-kits');
  });

  it('writes a COMPLIANT verdict when there are no violations', () => {
    const aggregated = makeAggregated();
    writeSummaryFile(summaryPath, aggregated, computeCompliance(aggregated));

    const content = readFileSync(summaryPath, 'utf8');
    expect(content).toContain('COMPLIANT');
    expect(content).not.toContain('NOT COMPLIANT');
  });

  it('writes a NOT COMPLIANT verdict with the mandatory violation count when violations exist', () => {
    const violation: RuleViolation = {
      type: 'require_files',
      severity: 'error',
      patterns: ['.nvmrc'],
      matchedFiles: [],
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    writeSummaryFile(summaryPath, aggregated, computeCompliance(aggregated));

    const content = readFileSync(summaryPath, 'utf8');
    expect(content).toContain('NOT COMPLIANT');
    expect(content).toContain('1 mandatory violation found');
  });
});
