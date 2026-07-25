import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import chalk from 'chalk';
import type { AggregatedReport } from '../../src/utils/aggregator';
import type { RuleViolation } from '../../src/rules/evaluator';
import type { BannedPackageViolation } from '../../src/utils/package-rules';
import { computeCompliance } from '../../src/utils/compliance';
import {
  writeSummaryFile,
  DEFAULT_SUMMARY_TITLE,
} from '../../src/utils/write-summary-file';
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

  function write(aggregated: AggregatedReport, title?: string): string {
    writeSummaryFile(
      summaryPath,
      aggregated,
      computeCompliance(aggregated),
      title,
    );
    return readFileSync(summaryPath, 'utf8');
  }

  describe('title', () => {
    it('defaults to DEFAULT_SUMMARY_TITLE when no title is passed', () => {
      const content = write(makeAggregated());
      expect(content).toContain(`# ${DEFAULT_SUMMARY_TITLE}`);
    });

    it('uses a custom title when one is passed', () => {
      const content = write(makeAggregated(), 'Custom Compliance Report');
      expect(content).toContain('# Custom Compliance Report');
      expect(content).not.toContain(DEFAULT_SUMMARY_TITLE);
    });
  });

  it('writes a file with no ANSI escape sequences, even when chalk color is forced on', () => {
    chalk.level = 1;
    const violation: RuleViolation = {
      type: 'require_files',
      severity: 'error',
      patterns: ['.nvmrc'],
      matchedFiles: [],
    };
    const content = write(makeAggregated({ ruleViolations: [violation] }));
    // oxlint-disable-next-line no-control-regex -- asserting the ANSI escape byte is absent
    expect(content).not.toMatch(/\x1b\[/);
  });

  describe('Rules section', () => {
    it('excludes an info-severity rule violation from the lines and the error/warning count', () => {
      const errorViolation: RuleViolation = {
        type: 'require_files',
        severity: 'error',
        patterns: ['.nvmrc'],
        matchedFiles: [],
      };
      const infoViolation: RuleViolation = {
        type: 'detect_files',
        severity: 'info',
        patterns: ['.env'],
        matchedFiles: ['.env'],
      };
      const content = write(
        makeAggregated({ ruleViolations: [errorViolation, infoViolation] }),
      );
      expect(content).toContain('require_files');
      expect(content).not.toContain('detect_files');
      expect(content).toContain('1 error');
      expect(content).not.toContain('warning');
    });

    it('still shows error and warn severities', () => {
      const errorViolation: RuleViolation = {
        type: 'require_files',
        severity: 'error',
        patterns: ['.nvmrc'],
        matchedFiles: [],
      };
      const warnViolation: RuleViolation = {
        type: 'require_files',
        severity: 'warn',
        patterns: ['.editorconfig'],
        matchedFiles: [],
      };
      const content = write(
        makeAggregated({ ruleViolations: [errorViolation, warnViolation] }),
      );
      expect(content).toContain('1 error, 1 warning');
    });

    it('renders "All rule checks passed" when only info-severity violations exist', () => {
      const infoViolation: RuleViolation = {
        type: 'detect_files',
        severity: 'info',
        patterns: ['.env'],
        matchedFiles: ['.env'],
      };
      const content = write(
        makeAggregated({ ruleViolations: [infoViolation] }),
      );
      expect(content).toContain('All rule checks passed');
      expect(content).not.toContain('detect_files');
    });

    it('still shows a banned package as a forbid_packages line', () => {
      const violation: BannedPackageViolation = {
        packageName: 'moment',
        severity: 'error',
        message: 'Use date-fns or dayjs',
      };
      const content = write(
        makeAggregated({ bannedPackageViolations: [violation] }),
      );
      expect(content).toContain(
        'forbid_packages — moment is forbidden — Use date-fns or dayjs',
      );
    });

    it('shows a banned package with no message and no trailing dash', () => {
      const violation: BannedPackageViolation = {
        packageName: 'moment',
        severity: 'error',
      };
      const content = write(
        makeAggregated({ bannedPackageViolations: [violation] }),
      );
      expect(content).toContain('forbid_packages — moment is forbidden\n');
    });

    it('shows only a warning count when there are no errors', () => {
      const violation: RuleViolation = {
        type: 'require_files',
        severity: 'warn',
        patterns: ['.editorconfig'],
        matchedFiles: [],
      };
      const content = write(makeAggregated({ ruleViolations: [violation] }));
      expect(content).toContain('1 warning');
      expect(content).not.toContain('error');
    });

    it('pluralizes the error/warning counts when there is more than one of each', () => {
      const errors: RuleViolation[] = [
        {
          type: 'require_files',
          severity: 'error',
          patterns: ['a'],
          matchedFiles: [],
        },
        {
          type: 'require_files',
          severity: 'error',
          patterns: ['b'],
          matchedFiles: [],
        },
      ];
      const warnings: BannedPackageViolation[] = [
        { packageName: 'moment', severity: 'warn' },
        { packageName: 'left-pad', severity: 'warn' },
      ];
      const content = write(
        makeAggregated({
          ruleViolations: errors,
          bannedPackageViolations: warnings,
        }),
      );
      expect(content).toContain('2 errors, 2 warnings');
    });

    it('excludes an info-severity banned package violation', () => {
      const violation: BannedPackageViolation = {
        packageName: 'some-pkg',
        severity: 'info',
        message: 'internal note',
      };
      const content = write(
        makeAggregated({ bannedPackageViolations: [violation] }),
      );
      expect(content).toContain('All rule checks passed');
      expect(content).not.toContain('some-pkg');
    });
  });

  describe('Packages section', () => {
    it('excludes a deprecated-only package (no breached tier)', () => {
      const deprecated = createMockPackage('left-pad', {
        releaseAge: createMockReleaseAge({ deprecated: '2020-01-01' }),
      });
      const content = write(
        makeAggregated({ packageDistribution: [deprecated] }),
      );
      expect(content).not.toContain('### Packages');
      expect(content).not.toContain('left-pad');
    });

    it('excludes a not-enforced (severity: warn) overdue package', () => {
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
      const content = write(
        makeAggregated({ packageDistribution: [overdueWarn] }),
      );
      expect(content).not.toContain('### Packages');
      expect(content).not.toContain('lodash');
    });

    it('shows an enforced (severity: error) overdue package with the upgrade description', () => {
      const overdueError = createMockPackage('my-internal-pkg', {
        releaseAge: createMockReleaseAge({
          worstLevel: 'major_overdue',
          severity: 'error',
          upgrades: [
            {
              version: '4.2.0',
              releasedDaysAgo: 10,
              breachReleasedDaysAgo: 100,
              semverBump: 'major',
              level: 'major_overdue',
              thresholdDays: 60,
            },
          ],
        }),
      });
      const content = write(
        makeAggregated({ packageDistribution: [overdueError] }),
      );
      expect(content).toContain('### Packages');
      expect(content).toContain('| | Package | Issue |');
      expect(content).toContain(
        '| 🔴 | `my-internal-pkg` | major 4.2.0 (40 days overdue) |',
      );
    });

    it('joins both reasons on one line for a package that is enforced-overdue and deprecated', () => {
      const both = createMockPackage('my-internal-pkg', {
        releaseAge: createMockReleaseAge({
          worstLevel: 'major_overdue',
          severity: 'error',
          deprecated: '2020-01-01',
          upgrades: [
            {
              version: '4.2.0',
              releasedDaysAgo: 10,
              breachReleasedDaysAgo: 100,
              semverBump: 'major',
              level: 'major_overdue',
              thresholdDays: 60,
            },
          ],
        }),
      });
      const content = write(makeAggregated({ packageDistribution: [both] }));
      const line = content
        .split('\n')
        .find((l) => l.includes('my-internal-pkg'));
      expect(line).toBe(
        '| 🔴 | `my-internal-pkg` | major 4.2.0 (40 days overdue), deprecated |',
      );
    });

    it('shows only "deprecated" when a mandatory violation has no upgrade candidates', () => {
      // worstLevel non-null but upgrades empty is a defensive/edge shape —
      // exercises the `top` guard independently of the deprecated reason.
      const deprecatedOnlyBreach = createMockPackage('my-internal-pkg', {
        releaseAge: createMockReleaseAge({
          worstLevel: 'major_overdue',
          severity: 'error',
          deprecated: '2020-01-01',
          upgrades: [],
        }),
      });
      const content = write(
        makeAggregated({ packageDistribution: [deprecatedOnlyBreach] }),
      );
      const line = content
        .split('\n')
        .find((l) => l.includes('my-internal-pkg'));
      expect(line).toBe('| 🔴 | `my-internal-pkg` | deprecated |');
    });

    it('does not show a banned/restricted package (it is Rules-only, not duplicated here)', () => {
      const banned = createMockPackage('moment');
      const violation: BannedPackageViolation = {
        packageName: 'moment',
        severity: 'error',
        message: 'Use date-fns or dayjs',
      };
      const content = write(
        makeAggregated({
          packageDistribution: [banned],
          bannedPackageViolations: [violation],
        }),
      );
      expect(content).not.toContain('### Packages');
      expect(content).toContain('forbid_packages — moment is forbidden');
    });

    it('omits the Packages heading entirely when there are no mandatory release-age violations', () => {
      const healthy = createMockPackage('react');
      const content = write(makeAggregated({ packageDistribution: [healthy] }));
      expect(content).not.toContain('### Packages');
    });

    it('never uses the "(issues only)" qualifier in the header', () => {
      const overdueError = createMockPackage('my-internal-pkg', {
        releaseAge: createMockReleaseAge({
          worstLevel: 'major_overdue',
          severity: 'error',
          upgrades: [
            {
              version: '4.2.0',
              releasedDaysAgo: 10,
              breachReleasedDaysAgo: 100,
              semverBump: 'major',
              level: 'major_overdue',
              thresholdDays: 60,
            },
          ],
        }),
      });
      const content = write(
        makeAggregated({ packageDistribution: [overdueError] }),
      );
      expect(content).toContain('### Packages\n');
      expect(content).not.toContain('(issues only)');
    });
  });

  it('omits Versus content, even when versusResults is populated', () => {
    const content = write(
      makeAggregated({
        versusResults: [
          {
            name: 'ui-kits',
            packages: ['react', 'vue'],
            entries: [
              {
                packageName: 'react',
                count: 3,
                percentage: 100,
                components: [],
              },
              { packageName: 'vue', count: 0, percentage: 0, components: [] },
            ],
            totalCount: 3,
          },
        ],
      }),
    );
    expect(content).not.toContain('Versus');
    expect(content).not.toContain('ui-kits');
  });

  it('writes a COMPLIANT verdict when there are no violations', () => {
    const content = write(makeAggregated());
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
    const content = write(makeAggregated({ ruleViolations: [violation] }));
    expect(content).toContain('NOT COMPLIANT');
    expect(content).toContain('1 mandatory violation found');
  });
});
