import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AggregatedReport } from '../../src/utils/aggregator';
import type { RuleViolation } from '../../src/rules/evaluator';
import { printSummary } from '../../src/utils/print-summary';
import { stripAnsi } from '../../src/utils/severity-format';
import {
  printPackages,
  describeUpgradeTarget,
  formatPackageName,
  formatUpgradeCell,
} from '../../src/utils/print-packages';
import { printComponents } from '../../src/utils/print-components';
import { printPatterns } from '../../src/utils/print-patterns';
import { printDetails } from '../../src/utils/print-details';
import { printVersus } from '../../src/utils/print-versus';
import { printRules, describeViolation } from '../../src/utils/print-rules';
import { printErrors } from '../../src/utils/print-errors';
import { printJson } from '../../src/utils/print-json';
import { printComplianceVerdict } from '../../src/utils/print-compliance';
import { computeCompliance } from '../../src/utils/compliance';
import {
  createMockPackage,
  createMockReleaseAge,
} from '../helpers/mock-reports';

/**
 * Creates a minimal AggregatedReport with all required fields.
 * Override specific fields via the partial argument.
 */
function makeAggregated(
  overrides: Partial<AggregatedReport> = {},
): AggregatedReport {
  return {
    filesAnalyzed: 5,
    totalImports: 10,
    totalComponents: 3,
    totalUsagePatterns: 7,
    patternCounts: [
      { patternType: 'usage.jsx', displayName: 'JSX Usage', count: 5 },
    ],
    componentUsage: new Map(),
    topComponents: [],
    allComponents: ['Button', 'Icon', 'Modal'],
    packageDistribution: [],
    versusResults: [],
    ruleViolations: [],
    bannedPackageViolations: [],
    reports: [],
    ...overrides,
  };
}

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
});

describe('printSummary', () => {
  it('prints without throwing on minimal data', () => {
    expect(() => printSummary(makeAggregated())).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('excludes unknown- and local-sourced components from the External Components count', () => {
    const aggregated = makeAggregated({
      topComponents: [
        { name: 'Button', source: 'react', count: 4, files: new Set() },
        { name: 'Local', source: 'local', count: 2, files: new Set() },
        { name: 'Mystery', source: 'unknown', count: 1, files: new Set() },
      ],
    });
    printSummary(aggregated);
    const output = stripAnsi(
      consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n'),
    );
    expect(output).toMatch(/External Components\s*│\s*1/);
  });
});

describe('printPackages', () => {
  it('prints table mode without throwing on empty distribution', () => {
    expect(() => printPackages(makeAggregated(), 'table')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('prints chart mode without throwing on empty distribution', () => {
    expect(() => printPackages(makeAggregated(), 'chart')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('prints table mode with a populated package entry', () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('react', {
          componentCount: 2,
          usageCount: 8,
          percentage: 100,
          components: ['Button', 'Icon'],
        }),
      ],
    });
    expect(() => printPackages(aggregated, 'table')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('react');
  });

  it('drops the Components/Usage/Percentage columns from the table (they only made sense for a design-system-only listing)', () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('react', {
          componentCount: 2,
          usageCount: 8,
          percentage: 100,
        }),
      ],
    });
    printPackages(aggregated, 'table');
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('Package');
    expect(output).toContain('Version');
    expect(output).not.toContain('Components');
    expect(output).not.toContain('Usage');
    expect(output).not.toContain('Percentage');
  });

  it('reports just the package count in the trailer, with no unique-components/total-usages numbers', () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('react', { componentCount: 2, usageCount: 8 }),
        createMockPackage('vue', { componentCount: 1, usageCount: 1 }),
      ],
    });
    printPackages(aggregated, 'table');
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('Total: 2 packages');
    expect(output).not.toContain('unique components');
    expect(output).not.toContain('total usages');
  });

  it('renders "days overdue" for a package past its release-age threshold', () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('lodash', {
          releaseAge: createMockReleaseAge({
            worstLevel: 'major_overdue',
            severity: 'error',
            upgrades: [
              {
                version: '4.17.21',
                releasedDaysAgo: 10,
                breachReleasedDaysAgo: 100,
                semverBump: 'major',
                level: 'major_overdue',
                thresholdDays: 60,
              },
            ],
          }),
        }),
      ],
    });
    printPackages(aggregated, 'table');
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('40 days overdue');
    expect(output).not.toContain('100d');
  });

  it('computes "days overdue" from the oldest breaching release, not the newest recommended target (#24)', () => {
    // The upgrade target (releasedDaysAgo) is a fresh 14-day-old release,
    // but the tier only breached its 60-day threshold because a 1000-day-old
    // release already exists in it — overdue must be based on that breach,
    // not on how new the recommended target happens to be.
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('@guestyci/feature-toggle-fe', {
          releaseAge: createMockReleaseAge({
            worstLevel: 'major_overdue',
            severity: 'error',
            upgrades: [
              {
                version: '4.0.16',
                releasedDaysAgo: 14,
                breachReleasedDaysAgo: 1000,
                semverBump: 'major',
                level: 'major_overdue',
                thresholdDays: 60,
              },
            ],
          }),
        }),
      ],
    });
    printPackages(aggregated, 'table');
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('940 days overdue');
    expect(output).not.toContain('14 days overdue');
  });

  it('omits a day count when even the recommended target is past its own threshold (#26)', () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('react', {
          releaseAge: createMockReleaseAge({
            worstLevel: 'major_overdue',
            severity: 'error',
            upgrades: [
              {
                version: '18.0.0',
                releasedDaysAgo: 90,
                breachReleasedDaysAgo: 90,
                semverBump: 'major',
                level: 'major_overdue',
                thresholdDays: 60,
              },
            ],
          }),
        }),
      ],
    });
    printPackages(aggregated, 'table');
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('no compliant release available');
    expect(output).not.toContain('days overdue');
  });

  it('renders "days remaining" for a package approaching its threshold', () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('axios', {
          releaseAge: createMockReleaseAge({
            worstLevel: null,
            severity: 'error',
            pendingUpgrade: {
              version: '1.6.0',
              semverBump: 'minor',
              releasedDaysAgo: 33,
              thresholdDays: 45,
              daysRemaining: 12,
            },
          }),
        }),
      ],
    });
    printPackages(aggregated, 'table');
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('12 days remaining');
  });

  it('renders chart mode with a populated package entry', () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('react', { usageCount: 8, percentage: 100 }),
      ],
    });
    printPackages(aggregated, 'chart');
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('react');
    expect(output).toContain('100.0%');
  });

  it('shows "N/A" for a package with no version and no conflict', () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('mystery-pkg', {
          version: null,
          hasVersionConflict: false,
        }),
      ],
    });
    printPackages(aggregated, 'table');
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('N/A');
  });

  it('does nothing for an unrecognized mode value', () => {
    const aggregated = makeAggregated({
      packageDistribution: [createMockPackage('react')],
    });
    printPackages(aggregated, 'bogus' as unknown as 'table');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('chart mode pads an internal package label wider to make room for the [int] tag', () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('@my-org/ui', { internal: true, percentage: 100 }),
      ],
    });
    expect(() => printPackages(aggregated, 'chart')).not.toThrow();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('[int]');
  });

  it('marks a package with multiple resolved versions as a version conflict', () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('lodash', {
          hasVersionConflict: true,
          allVersions: ['3.10.1', '4.17.21'],
        }),
      ],
    });
    printPackages(aggregated, 'table');
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('3.10.1, 4.17.21');
    expect(output).toContain('2 versions');
  });
});

describe('formatPackageName', () => {
  it('prefixes a deprecated package', () => {
    const pkg = createMockPackage('left-pad', {
      releaseAge: createMockReleaseAge({ deprecated: 'use String.padStart' }),
    });
    expect(formatPackageName(pkg)).toContain('[DEPRECATED]');
  });

  it('prefixes an error-severity banned package as [BANNED]', () => {
    const pkg = createMockPackage('moment');
    expect(
      formatPackageName(pkg, { packageName: 'moment', severity: 'error' }),
    ).toContain('[BANNED]');
  });

  it('prefixes a warn-severity banned package as [RESTRICTED]', () => {
    const pkg = createMockPackage('moment');
    expect(
      formatPackageName(pkg, { packageName: 'moment', severity: 'warn' }),
    ).toContain('[RESTRICTED]');
  });

  it('prefixes an internal package as [int] when not banned', () => {
    const pkg = createMockPackage('@my-org/utils', { internal: true });
    expect(formatPackageName(pkg)).toContain('[int]');
  });

  it('prefers [BANNED]/[RESTRICTED] over [int] when a package is both internal and banned', () => {
    const pkg = createMockPackage('@my-org/utils', { internal: true });
    const name = formatPackageName(pkg, {
      packageName: '@my-org/utils',
      severity: 'error',
    });
    expect(name).toContain('[BANNED]');
    expect(name).not.toContain('[int]');
  });

  it('combines [DEPRECATED] with [BANNED] when both apply', () => {
    const pkg = createMockPackage('moment', {
      releaseAge: createMockReleaseAge({ deprecated: 'use dayjs' }),
    });
    const name = formatPackageName(pkg, {
      packageName: 'moment',
      severity: 'error',
    });
    expect(name).toContain('[DEPRECATED]');
    expect(name).toContain('[BANNED]');
  });
});

describe('formatUpgradeCell', () => {
  it('returns an empty string when there is no release-age data', () => {
    expect(formatUpgradeCell(undefined)).toBe('');
  });

  it('returns a success icon when there is no worst level and no pending upgrade', () => {
    expect(formatUpgradeCell(createMockReleaseAge({ worstLevel: null }))).toBe(
      '🟢',
    );
  });

  it('returns a success icon when worstLevel is set but the upgrades list is empty', () => {
    expect(
      formatUpgradeCell(
        createMockReleaseAge({ worstLevel: 'major_overdue', upgrades: [] }),
      ),
    ).toBe('🟢');
  });

  it('uses the warn icon (not error) for a major_overdue upgrade at warn severity', () => {
    const cell = formatUpgradeCell(
      createMockReleaseAge({
        worstLevel: 'major_overdue',
        severity: 'warn',
        upgrades: [
          {
            version: '2.0.0',
            releasedDaysAgo: 10,
            breachReleasedDaysAgo: 100,
            semverBump: 'major',
            level: 'major_overdue',
            thresholdDays: 60,
          },
        ],
      }),
    );
    expect(cell).toContain('🟡');
    expect(cell).not.toContain('🔴');
    expect(cell).toContain('[not enforced]');
  });

  it('uses the warn icon for a non-major_overdue worst level', () => {
    const cell = formatUpgradeCell(
      createMockReleaseAge({
        worstLevel: 'minor_overdue',
        severity: 'error',
        upgrades: [
          {
            version: '1.1.0',
            releasedDaysAgo: 10,
            breachReleasedDaysAgo: 50,
            semverBump: 'minor',
            level: 'minor_overdue',
            thresholdDays: 30,
          },
        ],
      }),
    );
    expect(cell).toContain('🟡');
  });
});

describe('describeUpgradeTarget', () => {
  it('formats the semver bump, version, and days overdue', () => {
    expect(
      describeUpgradeTarget({
        version: '4.2.0',
        releasedDaysAgo: 10,
        breachReleasedDaysAgo: 100,
        semverBump: 'major',
        level: 'major_overdue',
        thresholdDays: 60,
      }),
    ).toBe('major 4.2.0 (40 days overdue)');
  });

  it('reports "no compliant release available" when even the recommended target is past its own threshold (#26)', () => {
    expect(
      describeUpgradeTarget({
        version: '18.0.0',
        releasedDaysAgo: 90,
        breachReleasedDaysAgo: 90,
        semverBump: 'major',
        level: 'major_overdue',
        thresholdDays: 60,
      }),
    ).toBe('major 18.0.0 (no compliant release available)');
  });
});

describe('printComponents', () => {
  it('prints table mode without throwing on empty components', () => {
    expect(() => printComponents(makeAggregated(), 'table')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('prints chart mode without throwing on empty components', () => {
    expect(() => printComponents(makeAggregated(), 'chart')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('table mode filters out unknown- and local-sourced components and lists the rest', () => {
    const aggregated = makeAggregated({
      topComponents: [
        { name: 'Button', source: 'react', count: 4, files: new Set() },
        { name: 'Local', source: 'local', count: 2, files: new Set() },
      ],
    });
    printComponents(aggregated, 'table');
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('Button');
    expect(output).not.toContain('Local');
  });

  it('chart mode filters out unknown- and local-sourced components and renders a bar chart for the rest', () => {
    const aggregated = makeAggregated({
      topComponents: [
        { name: 'Button', source: 'react', count: 4, files: new Set() },
        { name: 'Local', source: 'local', count: 2, files: new Set() },
      ],
    });
    printComponents(aggregated, 'chart');
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('Button');
    expect(output).not.toContain('Local');
  });

  it('does nothing for an unrecognized mode value', () => {
    printComponents(makeAggregated(), 'bogus' as unknown as 'table');
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe('printPatterns', () => {
  it('prints table mode without throwing', () => {
    expect(() => printPatterns(makeAggregated(), 'table')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('prints chart mode without throwing', () => {
    expect(() => printPatterns(makeAggregated(), 'chart')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('table mode prints "No patterns found" when every pattern count is zero', () => {
    const aggregated = makeAggregated({
      patternCounts: [
        { patternType: 'usage.jsx', displayName: 'JSX Usage', count: 0 },
      ],
    });
    printPatterns(aggregated, 'table');
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('No patterns found');
  });

  it('chart mode prints "No patterns found" when every pattern count is zero', () => {
    const aggregated = makeAggregated({
      patternCounts: [
        { patternType: 'usage.jsx', displayName: 'JSX Usage', count: 0 },
      ],
    });
    printPatterns(aggregated, 'chart');
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('No patterns found');
  });

  it('does nothing for an unrecognized mode value', () => {
    printPatterns(makeAggregated(), 'bogus' as unknown as 'table');
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe('printDetails', () => {
  it('prints without throwing on minimal data', () => {
    expect(() => printDetails(makeAggregated())).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('skips a pattern line when its count is zero', () => {
    const aggregated = makeAggregated({
      patternCounts: [
        { patternType: 'usage.jsx', displayName: 'JSX Usage', count: 0 },
      ],
    });
    printDetails(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).not.toContain('JSX Usage');
  });
});

describe('printRules', () => {
  it('prints a passing message when there are no violations', () => {
    expect(() => printRules(makeAggregated())).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('All rule checks passed');
  });

  it('prints violations when present', () => {
    const violation: RuleViolation = {
      type: 'require_packages',
      severity: 'error',
      patterns: ['eslint'],
      message: 'eslint is required',
      matchedFiles: [],
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    expect(() => printRules(aggregated)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('eslint');
    expect(output).toContain('not installed');
  });

  it('info-severity violations do not affect errorCount/warnCount in the summary line', () => {
    const infoViolation: RuleViolation = {
      type: 'detect_files',
      severity: 'info',
      patterns: ['orbis.config.*'],
      message: 'Orbis detected',
      matchedFiles: ['orbis.config.ts'],
    };
    const aggregated = makeAggregated({ ruleViolations: [infoViolation] });
    expect(() => printRules(aggregated)).not.toThrow();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).not.toContain('error');
    expect(output).not.toContain('warning');
  });

  it('renders info-severity violations with a distinct icon from warn/error', () => {
    const infoViolation: RuleViolation = {
      type: 'detect_files',
      severity: 'info',
      patterns: ['orbis.config.*'],
      matchedFiles: ['orbis.config.ts'],
    };
    const aggregated = makeAggregated({ ruleViolations: [infoViolation] });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('🔵');
    expect(output).not.toContain('🔴');
    expect(output).not.toContain('🟡');
  });

  it('renders require_package_fields/forbid_package_fields violations under the package_fields label', () => {
    const violation: RuleViolation = {
      type: 'require_package_fields',
      severity: 'warn',
      patterns: ['license'],
      matchedFiles: [],
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('package_fields');
    expect(output).not.toContain('pkg_fields');
  });

  it('truncates a detect_files violation with many matched files instead of listing them all', () => {
    const violation: RuleViolation = {
      type: 'detect_files',
      severity: 'error',
      patterns: ['*.config.js'],
      matchedFiles: [
        'cypress.config.js',
        'tsconfig.json',
        'webpack.config.js',
        'babel.config.js',
        'jest.config.js',
      ],
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain(
      'cypress.config.js, tsconfig.json and 3 other files',
    );
    expect(output).not.toContain('webpack.config.js');
  });

  it('renders a forbid_packages (banned/restricted) violation through the same line shape as other rules', () => {
    const aggregated = makeAggregated({
      bannedPackageViolations: [
        { packageName: 'moment', severity: 'warn', message: 'Use dayjs' },
      ],
    });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('forbid_packages');
    expect(output).toContain('moment is forbidden');
    expect(output).toContain('🟡');
  });

  it('renders a require_files violation as "not found"', () => {
    const violation: RuleViolation = {
      type: 'require_files',
      severity: 'error',
      patterns: ['.nvmrc'],
      matchedFiles: [],
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('.nvmrc not found');
  });

  it('renders a require_scripts violation with the script name and package.json context', () => {
    const violation: RuleViolation = {
      type: 'require_scripts',
      severity: 'error',
      patterns: ['test'],
      matchedFiles: [],
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('script test missing in package.json');
  });

  it('renders a require_package_fields violation with fieldPath/actualValue as a mismatch message', () => {
    const violation: RuleViolation = {
      type: 'require_package_fields',
      severity: 'error',
      patterns: ['license'],
      matchedFiles: [],
      fieldPath: 'license',
      actualValue: 'UNLICENSED',
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain(
      'field license is UNLICENSED, does not match required value',
    );
  });

  it('renders a forbid_package_fields violation using fieldPath when present', () => {
    const violation: RuleViolation = {
      type: 'forbid_package_fields',
      severity: 'error',
      patterns: ['scripts.postinstall'],
      matchedFiles: [],
      fieldPath: 'scripts.postinstall',
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('field scripts.postinstall is forbidden');
  });

  it('renders a forbid_package_fields violation falling back to patterns when fieldPath is absent', () => {
    const violation: RuleViolation = {
      type: 'forbid_package_fields',
      severity: 'error',
      patterns: ['scripts.postinstall'],
      matchedFiles: [],
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('field scripts.postinstall is forbidden');
  });

  it('renders an engine_version violation showing installedRange when present', () => {
    const violation: RuleViolation = {
      type: 'engine_version',
      severity: 'error',
      patterns: [],
      matchedFiles: [],
      installedRange: '>=14',
      requiredRange: '>=18',
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('engines.node is');
    expect(output).toContain('>=14');
    expect(output).toContain('required');
    expect(output).toContain('>=18');
  });

  it('renders an engine_version violation as "not specified" when installedRange is absent', () => {
    const violation: RuleViolation = {
      type: 'engine_version',
      severity: 'error',
      patterns: [],
      matchedFiles: [],
      requiredRange: '>=18',
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('engines.node not specified');
    expect(output).toContain('>=18');
  });

  it('renders a codeowners violation as "not found" when there are no matched files', () => {
    const violation: RuleViolation = {
      type: 'codeowners',
      severity: 'error',
      patterns: ['CODEOWNERS'],
      matchedFiles: [],
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('CODEOWNERS not found');
  });

  it('renders a codeowners violation listing unowned files when matched files are present', () => {
    const violation: RuleViolation = {
      type: 'codeowners',
      severity: 'error',
      patterns: ['CODEOWNERS'],
      matchedFiles: ['src/foo.ts', 'src/bar.ts'],
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('2 scanned file(s) have no owner');
  });

  it('pluralizes the error/warning summary counts when there is more than one of each', () => {
    const errorViolations: RuleViolation[] = [
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
    const aggregated = makeAggregated({
      ruleViolations: errorViolations,
      bannedPackageViolations: [
        { packageName: 'moment', severity: 'warn' },
        { packageName: 'left-pad', severity: 'warn' },
      ],
    });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('2 errors');
    expect(output).toContain('2 warnings');
  });
});

describe('describeViolation', () => {
  it('falls back to a generic "not present" description for an unrecognized violation type', () => {
    // Defensive fallback for a violation type outside the known union —
    // e.g. a newer config schema evaluated against an older build.
    const violation = {
      type: 'some_future_rule_type',
      severity: 'error',
      patterns: ['whatever'],
      matchedFiles: [],
    } as unknown as RuleViolation;
    expect(describeViolation(violation)).toBe('whatever not present');
  });
});

describe('printComplianceVerdict', () => {
  it('uses the singular "violation" when exactly one mandatory violation is present', () => {
    const violation: RuleViolation = {
      type: 'require_files',
      severity: 'error',
      patterns: ['.nvmrc'],
      matchedFiles: [],
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    const compliance = computeCompliance(aggregated);
    printComplianceVerdict(compliance);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('1 mandatory violation found');
    expect(output).not.toContain('violations found');
  });

  it('prints COMPLIANT when there are no mandatory violations', () => {
    const compliance = computeCompliance(makeAggregated());
    expect(() => printComplianceVerdict(compliance)).not.toThrow();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('COMPLIANT');
    expect(output).not.toContain('NOT COMPLIANT');
  });

  it('prints NOT COMPLIANT with a count when mandatory violations are present, without repeating per-violation detail', () => {
    const errorViolation: RuleViolation = {
      type: 'require_files',
      severity: 'error',
      patterns: ['.nvmrc'],
      matchedFiles: [],
    };
    const pkg = createMockPackage('@my-org/internal', {
      releaseAge: createMockReleaseAge({
        worstLevel: 'major_overdue',
        severity: 'error',
        upgrades: [
          {
            version: '2.0.0',
            releasedDaysAgo: 90,
            breachReleasedDaysAgo: 90,
            semverBump: 'major',
            level: 'major_overdue',
            thresholdDays: 60,
          },
        ],
      }),
    });
    const aggregated = makeAggregated({
      ruleViolations: [errorViolation],
      packageDistribution: [pkg],
    });
    const compliance = computeCompliance(aggregated);
    expect(compliance.compliant).toBe(false);
    printComplianceVerdict(compliance);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('NOT COMPLIANT');
    expect(output).toContain('2 mandatory violations');
    // per-violation detail belongs to the Rules/Packages sections above
    // the verdict, not the verdict itself — see printPackages tests for the
    // "days overdue" phrasing this same data renders as there.
    expect(output).not.toContain('@my-org/internal');
    expect(output).not.toContain('release age');
  });
});

describe('printVersus', () => {
  it('prints nothing when there are no versus results', () => {
    expect(() => printVersus(makeAggregated())).not.toThrow();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('prints a populated versus result', () => {
    const aggregated = makeAggregated({
      versusResults: [
        {
          name: 'ui-kits',
          packages: ['react', 'vue'],
          entries: [
            {
              packageName: 'react',
              count: 3,
              percentage: 100,
              components: ['Button'],
            },
            { packageName: 'vue', count: 0, percentage: 0, components: [] },
          ],
          totalCount: 3,
        },
      ],
    });
    expect(() => printVersus(aggregated)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('ui-kits');
    expect(output).toContain('react');
  });

  it('does not print the components list — Versus is a package-vs-package comparison, not a component breakdown', () => {
    const aggregated = makeAggregated({
      versusResults: [
        {
          name: 'ui-kits',
          packages: ['react', 'vue'],
          entries: [
            {
              packageName: 'react',
              count: 3,
              percentage: 100,
              components: ['Button', 'Input'],
            },
            { packageName: 'vue', count: 0, percentage: 0, components: [] },
          ],
          totalCount: 3,
        },
      ],
    });
    printVersus(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).not.toContain('Button');
    expect(output).not.toContain('Input');
  });

  it('shows a "no usage detected" note when a versus group has zero total usage', () => {
    printVersus(
      makeAggregated({
        versusResults: [
          {
            name: 'ui-kits',
            packages: ['react', 'vue'],
            entries: [
              { packageName: 'react', count: 0, percentage: 0, components: [] },
              { packageName: 'vue', count: 0, percentage: 0, components: [] },
            ],
            totalCount: 0,
          },
        ],
      }),
    );
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('No usage detected for any package in this group');
  });

  it('prints the header with a single space after the emoji, matching every other section header', () => {
    printVersus(
      makeAggregated({
        versusResults: [
          {
            name: 'ui-kits',
            packages: ['react'],
            entries: [
              {
                packageName: 'react',
                count: 1,
                percentage: 100,
                components: [],
              },
            ],
            totalCount: 1,
          },
        ],
      }),
    );
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('⚖️ Versus');
    expect(output).not.toContain('⚖️  Versus');
  });
});

describe('printErrors', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes to stdout when isJson is false', () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    printErrors([{ file: 'a.tsx', message: 'boom' }], false);
    expect(stdoutSpy).toHaveBeenCalled();
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('writes to stderr when isJson is true', () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    printErrors([{ file: 'a.tsx', message: 'boom' }], true);
    expect(stderrSpy).toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('writes nothing when there are no errors', () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    printErrors([], true);
    expect(stdoutSpy).not.toHaveBeenCalled();
    expect(stderrSpy).not.toHaveBeenCalled();
  });
});

describe('printJson', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('writes parseable JSON with the expected top-level shape', () => {
    printJson(makeAggregated());

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const written = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(written);

    expect(Object.keys(parsed)).toEqual([
      'version',
      'summary',
      'packages',
      'components',
      'patterns',
      'versus',
      'ruleViolations',
      'bannedPackageViolations',
    ]);
    expect(parsed.summary.filesAnalyzed).toBe(5);
    expect(parsed.summary.totalImports).toBe(10);
    expect(parsed.summary.totalComponents).toBe(3);
    expect(parsed.summary.totalUsagePatterns).toBe(7);
  });

  it('serializes component file sets as arrays', () => {
    const aggregated = makeAggregated({
      topComponents: [
        {
          name: 'Button',
          source: 'react',
          count: 4,
          files: new Set(['a.tsx', 'b.tsx']),
        },
      ],
    });
    printJson(aggregated);

    const written = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(written);
    expect(parsed.components).toHaveLength(1);
    expect(parsed.components[0].name).toBe('Button');
    expect(parsed.components[0].files).toEqual(['a.tsx', 'b.tsx']);
  });
});
