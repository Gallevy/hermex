import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AggregatedReport } from '../../src/utils/aggregator';
import type { RuleViolation } from '../../src/rules/evaluator';
import type { OutputConfig } from '../../src/config/types';
import { HermexConfigSchema } from '../../src/config/schema';
import { printSummary } from '../../src/utils/print-summary';
import { stripAnsi } from '../../src/utils/severity-format';
import {
  printPackages,
  describeUpgradeTarget,
  describeAdvisoryBreaches,
  describeBundleImpact,
  describePackageNotes,
  formatPackageName,
  formatUpgradeCell,
  resolveCompliantTarget,
  resolveInstalledVersion,
} from '../../src/utils/print-packages';
import { enrichWithReleaseAge } from '../../src/npm-registry/enricher';
import { printComponents } from '../../src/utils/print-components';
import { printPatterns } from '../../src/utils/print-patterns';
import { printDetails } from '../../src/utils/print-details';
import { printVersus } from '../../src/utils/print-versus';
import {
  printRules,
  describeViolation,
  formatRuleType,
} from '../../src/utils/print-rules';
import { printErrors } from '../../src/utils/print-errors';
import { printJson } from '../../src/utils/print-json';
import { printComplianceVerdict } from '../../src/utils/print-compliance';
import { computeCompliance } from '../../src/utils/compliance';
import {
  createMockPackage,
  createMockReleaseAge,
} from '../helpers/mock-reports';

// Drive the "user report" test end-to-end through the real enricher, so it
// uses the exact version strings from the report rather than a hand-built
// ReleaseAgeEntry that could drift from what the enricher actually produces.
vi.mock('../../src/npm-registry/cache', () => ({
  getPackageInfo: vi.fn(),
}));
import { getPackageInfo } from '../../src/npm-registry/cache';
const mockGetPackageInfo = getPackageInfo as ReturnType<typeof vi.fn>;

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

/** A no-packages hit, the shape `detectForbiddenPackages` emits (#77). */
function forbidViolation(
  packageName: string,
  severity: RuleViolation['severity'] = 'error',
  message?: string,
): RuleViolation {
  return {
    ruleId: 'no-packages',
    severity,
    patterns: [packageName],
    message,
    matchedFiles: [],
    packageName,
  };
}

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
    packageDistribution: [],
    versusResults: [],
    ruleViolations: [],
    reports: [],
    ...overrides,
  };
}

/**
 * The `output` block a user gets with no config at all — read off the schema
 * rather than hand-written, so these tests can't drift from the real defaults.
 */
function makeOutput(overrides: Partial<OutputConfig> = {}): OutputConfig {
  return { ...HermexConfigSchema.parse({}).output, ...overrides };
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
  // Nothing to report — prints nothing at all rather than a "Packages"
  // header plus "No packages found" boilerplate.
  it('prints nothing on an empty distribution in table mode', () => {
    expect(() => printPackages(makeAggregated(), 'table')).not.toThrow();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('prints nothing on an empty distribution in chart mode', () => {
    expect(() => printPackages(makeAggregated(), 'chart')).not.toThrow();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('prints table mode with a populated package entry', () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('react', {
          componentCount: 2,
          usageCount: 8,
          percentage: 100,
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
        createMockPackage('@acme-ui/feature-toggle-fe', {
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

  // (#57) When release age is enabled, the table splits into an unambiguous
  // "Installed" column (the single version the verdict was measured
  // against) and "Target" column, with the bundle-impact/advisory-breach
  // context printed as a separate Notes line below the table — not crammed
  // into a cell where it's unclear which installed copy a claim refers to.
  it('shows Installed/Target columns and a Notes line for a package with an advisory breach', () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('multi-version-lib', {
          hasVersionConflict: true,
          allVersions: ['1.0.0', '3.0.0'],
          version: '3.0.0',
          releaseAge: createMockReleaseAge({
            scope: 'root',
            installedVersion: '3.0.0',
            worstLevel: null,
            advisoryBreaches: [{ version: '1.0.0', level: 'major_overdue' }],
          }),
        }),
      ],
    });
    printPackages(aggregated, 'table');
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('Installed');
    expect(output).toContain('Target');
    // The table row shows only the single installed baseline, not the list.
    const tableLines = output.split('\n').filter((l) => l.includes('│'));
    expect(tableLines.some((l) => l.includes('3.0.0'))).toBe(true);
    // The full version list and the advisory note live in Notes, not the
    // row — icon leads the whole line (always info — Notes are stdout-only
    // advisory context, never a warning), real → arrow joins each fact.
    expect(output).toContain('Notes:');
    expect(output).toContain(
      '🔵 multi-version-lib → 2 versions installed (bundle impact): 1.0.0, 3.0.0 → 1 nested copy overdue, not enforced but recommended to resolve',
    );
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
      formatPackageName(pkg, forbidViolation('moment', 'error')),
    ).toContain('[BANNED]');
  });

  it('prefixes a warn-severity banned package as [RESTRICTED]', () => {
    const pkg = createMockPackage('moment');
    expect(formatPackageName(pkg, forbidViolation('moment', 'warn'))).toContain(
      '[RESTRICTED]',
    );
  });

  it('combines [DEPRECATED] with [BANNED] when both apply', () => {
    const pkg = createMockPackage('moment', {
      releaseAge: createMockReleaseAge({ deprecated: 'use dayjs' }),
    });
    const name = formatPackageName(pkg, forbidViolation('moment'));
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

  // The status icon reflects severity, not which tier breached: an ENFORCED
  // minor_overdue fails comply just like a major would (#28), so it renders red
  // — only a non-enforced (advisory) breach is yellow.
  const minorOverdueUpgrade = {
    version: '1.1.0',
    releasedDaysAgo: 10,
    breachReleasedDaysAgo: 50,
    semverBump: 'minor' as const,
    level: 'minor_overdue' as const,
    thresholdDays: 30,
  };

  it('uses the error icon for an enforced minor_overdue worst level (#28)', () => {
    const cell = formatUpgradeCell(
      createMockReleaseAge({
        worstLevel: 'minor_overdue',
        severity: 'error',
        upgrades: [minorOverdueUpgrade],
      }),
    );
    expect(cell).toContain('🔴');
    expect(cell).not.toContain('🟡');
  });

  it('uses the warn icon for a non-enforced minor_overdue worst level', () => {
    const cell = formatUpgradeCell(
      createMockReleaseAge({
        worstLevel: 'minor_overdue',
        severity: 'warn',
        upgrades: [minorOverdueUpgrade],
      }),
    );
    expect(cell).toContain('🟡');
    expect(cell).toContain('[not enforced]');
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

describe('resolveCompliantTarget (#57)', () => {
  it('returns undefined when releaseAge is undefined', () => {
    expect(resolveCompliantTarget(undefined)).toBeUndefined();
  });

  it('returns undefined when minCompliantInWindow is false', () => {
    const releaseAge = createMockReleaseAge({
      minCompliantInWindow: false,
      minCompliantVersion: '2.0.0',
    });
    expect(resolveCompliantTarget(releaseAge)).toBeUndefined();
  });

  it('returns undefined when minCompliantVersion is missing even if minCompliantInWindow is true', () => {
    const releaseAge = createMockReleaseAge({ minCompliantInWindow: true });
    expect(resolveCompliantTarget(releaseAge)).toBeUndefined();
  });

  it('returns the compliant target with its own bump when set', () => {
    const releaseAge = createMockReleaseAge({
      minCompliantInWindow: true,
      minCompliantVersion: '1.0.0',
      minCompliantBump: 'major',
    });
    expect(resolveCompliantTarget(releaseAge)).toEqual({
      version: '1.0.0',
      bump: 'major',
    });
  });

  it("falls back to the top upgrade's bump when minCompliantBump is not set", () => {
    const releaseAge = createMockReleaseAge({
      minCompliantInWindow: true,
      minCompliantVersion: '1.0.0',
      upgrades: [
        {
          version: '0.5.7',
          releasedDaysAgo: 200,
          breachReleasedDaysAgo: 200,
          semverBump: 'minor',
          level: 'minor_overdue',
          thresholdDays: 45,
        },
      ],
    });
    expect(resolveCompliantTarget(releaseAge)).toEqual({
      version: '1.0.0',
      bump: 'minor',
    });
  });
});

describe('describeAdvisoryBreaches (#57)', () => {
  it('returns undefined when releaseAge is undefined', () => {
    expect(describeAdvisoryBreaches(undefined)).toBeUndefined();
  });

  it('returns undefined when advisoryBreaches is empty or missing', () => {
    expect(describeAdvisoryBreaches(createMockReleaseAge())).toBeUndefined();
    expect(
      describeAdvisoryBreaches(createMockReleaseAge({ advisoryBreaches: [] })),
    ).toBeUndefined();
  });

  it('uses singular "copy" wording for exactly one advisory breach, with no icon of its own', () => {
    const text = describeAdvisoryBreaches(
      createMockReleaseAge({
        advisoryBreaches: [{ version: '1.4.5', level: 'major_overdue' }],
      }),
    );
    // Bare fact text — the single leading icon for the whole Notes line is
    // decided once by describePackageNotes, not per-fact.
    expect(text).not.toContain('🟡');
    expect(text).toContain('1 nested copy overdue');
    expect(text).toContain('not enforced but recommended to resolve');
    // Versions aren't repeated here — describeBundleImpact already lists
    // every resolved copy right before this in describePackageNotes (#57).
    expect(text).not.toContain('1.4.5');
  });

  it('uses plural "copies" wording for multiple advisory breaches, without re-listing versions', () => {
    const text = describeAdvisoryBreaches(
      createMockReleaseAge({
        advisoryBreaches: [
          { version: '1.4.5', level: 'major_overdue' },
          { version: '2.1.9', level: 'major_overdue' },
        ],
      }),
    );
    expect(text).toContain('2 nested copies overdue');
    expect(text).not.toContain('1.4.5');
    expect(text).not.toContain('2.1.9');
  });
});

describe('resolveInstalledVersion (#57)', () => {
  it('uses releaseAge.installedVersion when release age ran', () => {
    const pkg = createMockPackage('multi-version-lib', {
      version: '3.0.0',
      releaseAge: createMockReleaseAge({ installedVersion: '1.0.0' }),
    });
    // Under tree scope the enforced baseline can be a nested copy, not the
    // root version — resolveInstalledVersion must reflect THAT, not pkg.version.
    expect(resolveInstalledVersion(pkg)).toBe('1.0.0');
  });

  it('falls back to pkg.version when release age did not run', () => {
    const pkg = createMockPackage('react', { version: '18.0.0' });
    expect(resolveInstalledVersion(pkg)).toBe('18.0.0');
  });

  it('falls back to "N/A" when neither is available', () => {
    const pkg = createMockPackage('react', { version: null });
    expect(resolveInstalledVersion(pkg)).toBe('N/A');
  });
});

describe('describeBundleImpact (#57)', () => {
  it('returns undefined when there is no version conflict', () => {
    const pkg = createMockPackage('react', { hasVersionConflict: false });
    expect(describeBundleImpact(pkg)).toBeUndefined();
  });

  it('lists every resolved version when there is a conflict', () => {
    const pkg = createMockPackage('lodash', {
      hasVersionConflict: true,
      allVersions: ['3.10.1', '4.17.21'],
    });
    const text = describeBundleImpact(pkg);
    expect(text).toContain('2 versions installed (bundle impact)');
    expect(text).toContain('3.10.1, 4.17.21');
  });
});

describe('describePackageNotes (#57)', () => {
  it('returns undefined when there is neither a conflict nor an advisory breach', () => {
    const pkg = createMockPackage('react');
    expect(describePackageNotes(pkg)).toBeUndefined();
  });

  it('combines bundle-impact and advisory-breach facts, always with an info icon, when both apply', () => {
    const pkg = createMockPackage('multi-version-lib', {
      hasVersionConflict: true,
      allVersions: ['1.0.0', '3.0.0'],
      releaseAge: createMockReleaseAge({
        advisoryBreaches: [{ version: '1.0.0', level: 'major_overdue' }],
      }),
    });
    const note = describePackageNotes(pkg)!;
    // Notes are stdout-only advisory context (never shown in
    // --summary-file), so nothing here should read as a warning.
    expect(note.icon).toBe('🔵');
    expect(note.facts).toEqual([
      '2 versions installed (bundle impact): 1.0.0, 3.0.0',
      '1 nested copy overdue, not enforced but recommended to resolve',
    ]);
  });

  it('shows only the bundle-impact fact, with an info icon, when there is no advisory breach', () => {
    const pkg = createMockPackage('lodash', {
      hasVersionConflict: true,
      allVersions: ['3.10.1', '4.17.21'],
    });
    const note = describePackageNotes(pkg)!;
    expect(note.icon).toBe('🔵');
    expect(note.facts).toEqual([
      '2 versions installed (bundle impact): 3.10.1, 4.17.21',
    ]);
  });
});

describe('formatUpgradeCell — stale 0.x minor line beneath a compliant newer major (user report)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // installed 0.3.30; 0.5.7 is a stale minor (200d, past the 45d threshold) and
  // the ONLY breached tier; v1 (1.0.0) is a recent major (50d, well within the
  // 60d threshold) — a genuinely compliant upgrade target. The cell must
  // recommend 1.0.0, must NOT claim "no compliant release available", and must
  // render as a hard failure (🔴) because the package is enforced.
  it('recommends the compliant major (1.0.0) instead of reporting "no compliant release available"', async () => {
    const pkg = createMockPackage('some-lib', { version: '0.3.30' });
    mockGetPackageInfo.mockResolvedValueOnce({
      name: 'some-lib',
      time: {
        '0.3.30': daysAgo(900),
        '0.5.7': daysAgo(200),
        '1.0.0': daysAgo(50),
      },
      'dist-tags': { latest: '1.0.0' },
      versions: {},
    });

    const { enriched } = await enrichWithReleaseAge([pkg], {
      enabled: true,
      registry: 'https://registry.npmjs.org',
      thresholds: { patch: 30, minor: 45, major: 60 },
      // Named explicitly: severity follows `enforceOn` alone, so the 🔴 this
      // case asserts requires the package to actually be enforced.
      enforceOn: ['some-lib'],
      scope: 'root',
      scopeExceptions: [],
    });

    const cell = formatUpgradeCell(enriched[0].releaseAge);

    // Correct target: the compliant major, not the stale minor.
    expect(cell).toContain('1.0.0');
    expect(cell).not.toContain('0.5.7');
    // The text is a lie today — a compliant release (1.0.0) plainly exists.
    expect(cell).not.toContain('no compliant release available');
    // Enforced minor_overdue fails comply, so the status must be red, not yellow.
    expect(cell).toContain('🔴');
    expect(cell).not.toContain('🟡');
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
  // Rules used to render as a bullet list; it's now a table matching
  // the Packages table's shape — same "Rule | Description" columns, icon
  // leading the Description cell (mirroring the Target cell convention).
  it('renders violations as a Rule/Description table, not a bullet list', () => {
    const errorViolation: RuleViolation = {
      ruleId: 'require-files',
      severity: 'error',
      patterns: ['.nvmrc'],
      matchedFiles: [],
    };
    const aggregated = makeAggregated({
      ruleViolations: [
        errorViolation,
        forbidViolation('moment', 'warn', 'Use dayjs'),
      ],
    });
    printRules(aggregated);
    const output = stripAnsi(
      consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n'),
    );
    expect(output).toContain('Rule');
    expect(output).toContain('Description');
    expect(output).toMatch(/│\s*require-files\s*│\s*🔴 \.nvmrc not found\s*│/);
    expect(output).toMatch(
      /│\s*no-packages\s*│\s*🟡 moment is forbidden — Use dayjs\s*│/,
    );
    // No leftover bullet-list markers from the old rendering.
    expect(output).not.toMatch(/^\s*- 🔴/m);
  });

  // Nothing to report — prints nothing at all rather than a "Rules" header
  // plus an "All rule checks passed" line, indistinguishable from "no rules
  // were ever configured."
  it('prints nothing when there are no violations', () => {
    expect(() => printRules(makeAggregated())).not.toThrow();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('prints violations when present', () => {
    const violation: RuleViolation = {
      ruleId: 'require-packages',
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
      ruleId: 'no-files',
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
      ruleId: 'no-files',
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

  // The table always shows every severity, including info — so the tally
  // below it must count every severity too, or the numbers stop matching
  // the rows (#88).
  it('includes an info count in the summary line so it matches the table rows shown', () => {
    const errorViolation: RuleViolation = {
      ruleId: 'require-files',
      severity: 'error',
      patterns: ['.nvmrc'],
      matchedFiles: [],
    };
    const infoViolation: RuleViolation = {
      ruleId: 'no-files',
      severity: 'info',
      patterns: ['orbis.config.*'],
      matchedFiles: ['orbis.config.ts'],
    };
    const aggregated = makeAggregated({
      ruleViolations: [
        errorViolation,
        forbidViolation('moment', 'warn', 'Use dayjs'),
        infoViolation,
      ],
    });
    printRules(aggregated);
    const output = stripAnsi(
      consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n'),
    );
    expect(output).toContain('1 error, 1 warning, 1 info');
  });

  it('renders require-package-fields/no-package-fields violations under the package-fields label', () => {
    const violation: RuleViolation = {
      ruleId: 'require-package-fields',
      severity: 'warn',
      patterns: ['license'],
      matchedFiles: [],
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('package-fields');
    expect(output).not.toContain('pkg_fields');
  });

  it('truncates a no-files violation with many matched files instead of listing them all', () => {
    const violation: RuleViolation = {
      ruleId: 'no-files',
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

  it('renders a no-packages (banned/restricted) violation through the same line shape as other rules', () => {
    const aggregated = makeAggregated({
      ruleViolations: [forbidViolation('moment', 'warn', 'Use dayjs')],
    });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('no-packages');
    expect(output).toContain('moment is forbidden');
    expect(output).toContain('🟡');
  });

  it('renders a require-files violation as "not found"', () => {
    const violation: RuleViolation = {
      ruleId: 'require-files',
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

  it('renders a require-scripts violation with the script name and package.json context', () => {
    const violation: RuleViolation = {
      ruleId: 'require-scripts',
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

  it('renders a require-package-fields violation with fieldPath/actualValue as a mismatch message', () => {
    const violation: RuleViolation = {
      ruleId: 'require-package-fields',
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

  it('renders a no-package-fields violation using fieldPath when present', () => {
    const violation: RuleViolation = {
      ruleId: 'no-package-fields',
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

  it('renders a no-package-fields violation falling back to patterns when fieldPath is absent', () => {
    const violation: RuleViolation = {
      ruleId: 'no-package-fields',
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

  it('renders an require-engine-version violation showing installedRange when present', () => {
    const violation: RuleViolation = {
      ruleId: 'require-engine-version',
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

  it('renders an require-engine-version violation as "not specified" when installedRange is absent', () => {
    const violation: RuleViolation = {
      ruleId: 'require-engine-version',
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
      ruleId: 'require-codeowners',
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
      ruleId: 'require-codeowners',
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
        ruleId: 'require-files',
        severity: 'error',
        patterns: ['a'],
        matchedFiles: [],
      },
      {
        ruleId: 'require-files',
        severity: 'error',
        patterns: ['b'],
        matchedFiles: [],
      },
    ];
    const aggregated = makeAggregated({
      ruleViolations: [
        ...errorViolations,
        forbidViolation('moment', 'warn'),
        forbidViolation('left-pad', 'warn'),
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
      ruleId: 'some-future-rule-type',
      severity: 'error',
      patterns: ['whatever'],
      matchedFiles: [],
    } as unknown as RuleViolation;
    expect(describeViolation(violation)).toBe('whatever not present');
  });

  describe('plugin violations', () => {
    // Plugin findings carry a ready-made `message` from the wrapped tool and
    // have no `patterns`, so they must be handled before anything reads it.
    const base = {
      ruleId: 'oxlint/no-debugger',
      severity: 'error',
      message: 'debugger statement',
      plugin: 'oxlint',
    } as const;

    it('renders the message alone when there is no location or files', () => {
      expect(describeViolation({ ...base })).toBe('debugger statement');
    });

    it('appends file:line when a location is given', () => {
      const out = describeViolation({
        ...base,
        location: { file: 'src/a.tsx', line: 12 },
      });
      expect(stripAnsi(out)).toBe('debugger statement (src/a.tsx:12)');
    });

    it('omits the line when the location has none', () => {
      const out = describeViolation({
        ...base,
        location: { file: 'src/a.tsx' },
      });
      expect(stripAnsi(out)).toBe('debugger statement (src/a.tsx)');
    });

    it('falls back to the file list when there is no location', () => {
      const out = describeViolation({
        ...base,
        files: ['src/a.tsx', 'src/b.tsx'],
      });
      expect(stripAnsi(out)).toContain('debugger statement (');
      expect(stripAnsi(out)).toContain('src/a.tsx');
    });

    it('renders the namespaced rule id as the rule column, unshortened', () => {
      // hermex passes the wrapped tool's identifiers through rather than
      // translating them (#102).
      expect(formatRuleType({ ...base })).toBe('oxlint/no-debugger');
    });
  });
});

describe('printComplianceVerdict', () => {
  it('uses the singular "violation" when exactly one mandatory violation is present', () => {
    const violation: RuleViolation = {
      ruleId: 'require-files',
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

  it('prints Compliant when there are no mandatory violations', () => {
    const compliance = computeCompliance(makeAggregated());
    expect(() => printComplianceVerdict(compliance)).not.toThrow();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('Compliant');
    expect(output).not.toContain('Not compliant');
  });

  it('prints Not compliant with a count when mandatory violations are present, without repeating per-violation detail', () => {
    const errorViolation: RuleViolation = {
      ruleId: 'require-files',
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
    expect(output).toContain('Not compliant');
    expect(output).toContain('2 mandatory violations');
    // per-violation detail belongs to the Rules/Packages sections above
    // the verdict, not the verdict itself — see printPackages tests for the
    // "days overdue" phrasing this same data renders as there.
    expect(output).not.toContain('@my-org/internal');
    expect(output).not.toContain('release age');
  });

  // #77 regression guard: this count used to add a separate banned-package
  // bucket to the rule bucket. Now that no-packages hits ARE rule
  // violations, that same sum would count each one twice.
  it('counts a forbidden package and a failing rule as two mandatory violations, not four', () => {
    const missingFile: RuleViolation = {
      ruleId: 'require-files',
      severity: 'error',
      patterns: ['.nvmrc'],
      matchedFiles: [],
    };
    const compliance = computeCompliance(
      makeAggregated({
        ruleViolations: [forbidViolation('moment'), missingFile],
      }),
    );
    printComplianceVerdict(compliance);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('2 mandatory violations found');
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
            },
            { packageName: 'vue', count: 0, percentage: 0 },
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
            },
            { packageName: 'vue', count: 0, percentage: 0 },
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
              { packageName: 'react', count: 0, percentage: 0 },
              { packageName: 'vue', count: 0, percentage: 0 },
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
    printJson(makeAggregated(), makeOutput());

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const written = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(written);

    expect(Object.keys(parsed)).toEqual([
      'version',
      'summary',
      'packages',
      'components',
      'versus',
      'ruleViolations',
      'compliance',
    ]);
    expect(parsed.summary.filesAnalyzed).toBe(5);
    expect(parsed.summary.totalImports).toBe(10);
    expect(parsed.summary.totalComponents).toBe(3);
    expect(parsed.summary.totalUsagePatterns).toBe(7);
  });

  // #80: these are aggregate counts — the same kind of number as
  // totalUsagePatterns beside them, just broken down by pattern type — so
  // they belong in summary rather than alongside the per-item datasets.
  it('nests pattern counts under summary rather than as a top-level field', () => {
    printJson(
      makeAggregated({
        patternCounts: [
          { patternType: 'usage.jsx', displayName: 'JSX Usage', count: 5 },
          {
            patternType: 'imports.named',
            displayName: 'Named Imports',
            count: 2,
          },
        ],
      }),
      makeOutput(),
    );

    const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(parsed).not.toHaveProperty('patterns');
    expect(parsed.summary.patternCounts).toEqual([
      { patternType: 'usage.jsx', displayName: 'JSX Usage', count: 5 },
      { patternType: 'imports.named', displayName: 'Named Imports', count: 2 },
    ]);
  });

  it('emits the official compliance verdict (status + counts) so consumers need not re-derive it (#55)', () => {
    printJson(makeAggregated(), makeOutput());

    const written = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(written);

    expect(parsed.compliance).toEqual({
      status: 'compliant',
      compliant: true,
      counts: {
        errorRuleViolations: 0,
        releaseAgeViolations: 0,
        warningRuleViolations: 0,
      },
    });
  });

  // #77: no-packages hits used to sit in a separate top-level field, so
  // a consumer iterating ruleViolations silently missed every one of them.
  it('emits a no-packages hit inside ruleViolations, carrying the matched package', () => {
    printJson(
      makeAggregated({
        ruleViolations: [forbidViolation('moment', 'error', 'Use dayjs')],
      }),
      makeOutput(),
    );

    const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(parsed.ruleViolations).toEqual([
      {
        ruleId: 'no-packages',
        severity: 'error',
        patterns: ['moment'],
        message: 'Use dayjs',
        matchedFiles: [],
        packageName: 'moment',
      },
    ]);
    expect(parsed).not.toHaveProperty('bannedPackageViolations');
  });

  // errorRuleViolations absorbs what errorBannedPackageViolations used to
  // hold — one bucket, so a consumer counting error-severity rule hits sees
  // forbidden packages among them instead of missing them.
  it('counts a forbidden package alongside other rules in errorRuleViolations', () => {
    printJson(
      makeAggregated({
        ruleViolations: [
          forbidViolation('moment'),
          {
            ruleId: 'require-files',
            severity: 'error',
            patterns: ['.nvmrc'],
            matchedFiles: [],
          },
        ],
      }),
      makeOutput(),
    );

    const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(parsed.compliance.counts.errorRuleViolations).toBe(2);
  });

  it("reports compliance status 'warning' for warn-severity rules but keeps compliant true (#55)", () => {
    const aggregated = makeAggregated({
      ruleViolations: [
        {
          ruleId: 'require-files',
          severity: 'warn',
          patterns: ['.editorconfig'],
          matchedFiles: [],
        },
      ],
    });
    printJson(aggregated, makeOutput());

    const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(parsed.compliance.status).toBe('warning');
    expect(parsed.compliance.compliant).toBe(true);
    expect(parsed.compliance.counts.warningRuleViolations).toBe(1);
  });

  it("keeps compliance status 'compliant' for non-enforced overdue and pending-only packages (#55)", () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('react-router-dom', {
          releaseAge: createMockReleaseAge({
            worstLevel: 'major_overdue',
            severity: 'warn',
          }),
        }),
        createMockPackage('@acme-ui/pulse', {
          releaseAge: createMockReleaseAge({
            worstLevel: null,
            severity: 'error',
          }),
        }),
      ],
    });
    printJson(aggregated, makeOutput());

    const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(parsed.compliance.status).toBe('compliant');
    expect(parsed.compliance.compliant).toBe(true);
  });

  it('passes an explicitly provided compliance result straight through (#55)', () => {
    const aggregated = makeAggregated();
    printJson(aggregated, makeOutput(), {
      compliant: false,
      status: 'non-compliant',
      errorRuleViolations: [
        {
          ruleId: 'require-files',
          severity: 'error',
          patterns: ['.nvmrc'],
          matchedFiles: [],
        },
      ],
      releaseAgeViolations: [],
      warningRuleViolations: [],
    });

    const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(parsed.compliance.status).toBe('non-compliant');
    expect(parsed.compliance.compliant).toBe(false);
    expect(parsed.compliance.counts.errorRuleViolations).toBe(1);
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
    printJson(aggregated, makeOutput());

    const written = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(written);
    expect(parsed.components).toHaveLength(1);
    expect(parsed.components[0].name).toBe('Button');
    expect(parsed.components[0].files).toEqual(['a.tsx', 'b.tsx']);
  });

  // #63/#91: output.* used to gate only the human printers, so a consumer
  // asking for a slim report still got the full payload and had to strip it
  // downstream. components[] and packages[] are the bulk of a stored scan.
  describe('output.* section toggles', () => {
    const trimmable = makeAggregated({
      topComponents: [
        { name: 'Button', source: 'antd', count: 4, files: new Set(['a.tsx']) },
      ],
      packageDistribution: [createMockPackage('antd')],
      versusResults: [
        {
          name: 'Migration',
          packages: ['antd', '@acme/arc'],
          entries: [],
          totalCount: 0,
        },
      ],
    });

    it('omits packages entirely when output.packages is false', () => {
      printJson(trimmable, makeOutput({ packages: false }));

      const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
      expect(parsed).not.toHaveProperty('packages');
      expect(parsed.components).toHaveLength(1);
    });

    it('omits components entirely when output.components is false', () => {
      printJson(trimmable, makeOutput({ components: false }));

      const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
      expect(parsed).not.toHaveProperty('components');
      expect(parsed.packages).toHaveLength(1);
    });

    it('omits versus entirely when output.versus is false', () => {
      printJson(trimmable, makeOutput({ versus: false }));

      const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
      expect(parsed).not.toHaveProperty('versus');
    });

    it('omits summary.patternCounts when output.patterns is false, keeping the counters', () => {
      printJson(trimmable, makeOutput({ patterns: false, details: false }));

      const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
      expect(parsed.summary).not.toHaveProperty('patternCounts');
      expect(parsed.summary.filesAnalyzed).toBe(5);
      expect(parsed.summary.totalUsagePatterns).toBe(7);
    });

    // printDetails renders the same patternCounts array as printPatterns (a
    // flat list rather than a table), so gating on output.patterns alone
    // would strip the field while the terminal still printed it under
    // Details — the JSON must never be lossier than the human output.
    it('keeps summary.patternCounts when patterns is off but details is on', () => {
      printJson(trimmable, makeOutput({ patterns: false, details: true }));

      const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
      expect(parsed.summary.patternCounts).toHaveLength(1);
    });

    it('keeps summary.patternCounts when details is off but patterns is on', () => {
      printJson(trimmable, makeOutput({ patterns: 'chart', details: false }));

      const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
      expect(parsed.summary.patternCounts).toHaveLength(1);
    });

    // A disabled section is absent, not `[]` — shrinking the payload is the
    // whole point, and an empty array still costs a key on every scan file.
    it('drops the keys rather than emitting empty arrays', () => {
      printJson(
        trimmable,
        makeOutput({
          packages: false,
          components: false,
          patterns: false,
          details: false,
          versus: false,
        }),
      );

      const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
      expect(Object.keys(parsed)).toEqual([
        'version',
        'summary',
        'ruleViolations',
        'compliance',
      ]);
    });

    // The verdict is what CI reads. `comply` prints rules in human mode
    // regardless of output.rules, so gating them here would make the JSON
    // lossier than the terminal output it mirrors.
    it('keeps ruleViolations and compliance even with every section switched off', () => {
      printJson(
        makeAggregated({
          ruleViolations: [forbidViolation('moment', 'error', 'Use dayjs')],
        }),
        makeOutput({
          summary: false,
          packages: false,
          components: false,
          patterns: false,
          versus: false,
          rules: false,
          details: false,
        }),
      );

      const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
      expect(parsed.ruleViolations).toHaveLength(1);
      expect(parsed.compliance.status).toBe('non-compliant');
      expect(parsed.compliance.counts.errorRuleViolations).toBe(1);
      expect(parsed.version).toBeTypeOf('string');
    });

    it('emits every dataset under the default config', () => {
      printJson(trimmable, makeOutput());

      const parsed = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
      expect(Object.keys(parsed)).toEqual([
        'version',
        'summary',
        'packages',
        'components',
        'versus',
        'ruleViolations',
        'compliance',
      ]);
      expect(parsed.summary.patternCounts).toHaveLength(1);
    });
  });
});
