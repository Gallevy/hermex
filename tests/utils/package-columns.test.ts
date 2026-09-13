import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_VERSION_COLUMNS } from '../../src/utils/package-columns';
import { printPackages } from '../../src/utils/print-packages';
import type { AggregatedReport } from '../../src/utils/aggregator';
import {
  createMockPackage,
  createMockReleaseAge,
  createMockNoOutdatedPackagesViolation,
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
    packageDistribution: [],
    versusResults: [],
    ruleViolations: [],
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

function render(aggregated: AggregatedReport): string {
  printPackages(aggregated, 'table');
  return consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');
}

describe('DEFAULT_VERSION_COLUMNS', () => {
  it('is the plain single Version column', () => {
    expect(DEFAULT_VERSION_COLUMNS.headers).toEqual(['Version']);
    expect(
      DEFAULT_VERSION_COLUMNS.cells(
        createMockPackage('acme', { version: '1.2.3' }),
      ),
    ).toEqual(['1.2.3']);
  });

  it('renders N/A for a package with no installed version', () => {
    expect(
      DEFAULT_VERSION_COLUMNS.cells(
        createMockPackage('acme', { version: null }),
      ),
    ).toEqual(['N/A']);
  });
});

/**
 * The table asks the column registry which rule owns the version columns
 * rather than testing for any rule by name (#189), so these assert the
 * choice through the rendered output.
 */
describe('packages table column selection', () => {
  it('falls back to one Version column when no rule contributes any', () => {
    const output = render(
      makeAggregated({
        packageDistribution: [createMockPackage('acme', { version: '1.2.3' })],
      }),
    );

    expect(output).toContain('Version');
    expect(output).not.toContain('Minimum target');
    expect(output).not.toContain('Installed');
  });

  it('gives no-outdated-packages the Installed/Minimum target pair once it has data', () => {
    const output = render(
      makeAggregated({
        packageDistribution: [
          createMockPackage('acme', {
            version: '1.0.0',
            releaseAge: createMockReleaseAge({ measuredVersion: '1.0.0' }),
          }),
        ],
      }),
    );

    expect(output).toContain('Installed');
    expect(output).toContain('Minimum target');
  });

  // `applies` keys off the data, not the config: a configured run that got
  // nothing back keeps the clean two-column table.
  it('keeps the plain column when the rule ran but produced no entries', () => {
    const output = render(
      makeAggregated({
        packageDistribution: [createMockPackage('acme', { version: '1.0.0' })],
        ruleViolations: [],
      }),
    );

    expect(output).toContain('Version');
    expect(output).not.toContain('Minimum target');
  });

  // The icon in the cell comes from the joined violation, so a row whose
  // rule entry is 'off' (no violation) renders the target with no verdict.
  it('renders the target without an icon when no violation was emitted', () => {
    const releaseAge = createMockReleaseAge({
      measuredVersion: '1.0.0',
      upgrades: [
        {
          version: '2.0.0',
          releasedDaysAgo: 10,
          breachReleasedDaysAgo: 100,
          semverBump: 'major',
          thresholdDays: 60,
        },
      ],
    });
    const output = render(
      makeAggregated({
        packageDistribution: [
          createMockPackage('acme', { version: '1.0.0', releaseAge }),
        ],
      }),
    );

    expect(output).toContain('2.0.0');
    expect(output).not.toContain('🔴');
  });

  it('takes the cell icon from the joined violation severity', () => {
    const releaseAge = createMockReleaseAge({
      measuredVersion: '1.0.0',
      upgrades: [
        {
          version: '2.0.0',
          releasedDaysAgo: 10,
          breachReleasedDaysAgo: 100,
          semverBump: 'major',
          thresholdDays: 60,
        },
      ],
    });
    const output = render(
      makeAggregated({
        packageDistribution: [
          createMockPackage('acme', { version: '1.0.0', releaseAge }),
        ],
        ruleViolations: [
          createMockNoOutdatedPackagesViolation('acme', { severity: 'error' }),
        ],
      }),
    );

    expect(output).toContain('🔴');
  });
});
