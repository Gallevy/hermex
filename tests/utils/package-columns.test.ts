import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_VERSION_COLUMNS } from '../../src/utils/package-columns';
import { printPackages } from '../../src/utils/print-packages';
import type { AggregatedReport } from '../../src/utils/aggregator';
import type { ResolvedReleaseAgeRuleConfig } from '../../src/config/types';
import {
  createMockPackage,
  createMockReleases,
  createOverdueReleases,
  createMockNoOutdatedPackagesViolation,
} from '../helpers/mock-reports';

/**
 * The table recomputes each row's recommendation from facts plus the entry
 * governing it, so the rule entries have to reach it (#189). An advisory
 * catch-all is enough for the cell text; the icon comes from whatever
 * violations a case supplies.
 */
const OUTDATED_RULES: ResolvedReleaseAgeRuleConfig[] = [
  {
    severity: 'warn',
    patterns: ['**'],
    thresholds: { patch: 30, minor: 45, major: 60 },
    scope: 'root',
  },
];

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

function render(
  aggregated: AggregatedReport,
  rules: ResolvedReleaseAgeRuleConfig[] = OUTDATED_RULES,
): string {
  printPackages(aggregated, 'table', rules);
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
            releases: createMockReleases(),
          }),
        ],
      }),
    );

    expect(output).toContain('Installed');
    expect(output).toContain('Minimum target');
  });

  // `applies` needs both halves. Configured but nothing came back (every
  // package skipped, registry unreachable) keeps the clean two-column table.
  it('keeps the plain column when the rule ran but produced no facts', () => {
    const output = render(
      makeAggregated({
        packageDistribution: [createMockPackage('acme', { version: '1.0.0' })],
      }),
    );

    expect(output).toContain('Version');
    expect(output).not.toContain('Minimum target');
  });

  // The other half, and the one that actually broke: registry facts exist
  // for any run that consults the registry — a `no-deprecated-packages`-only
  // run included — so facts alone must not claim this rule's columns, or
  // they render as a column of em dashes belonging to nobody (#189).
  it('keeps the plain column when facts exist but the rule is not configured', () => {
    const output = render(
      makeAggregated({
        packageDistribution: [
          createMockPackage('acme', {
            version: '1.0.0',
            releases: createOverdueReleases({
              target: '2.0.0',
              daysOverdue: 40,
            }),
          }),
        ],
      }),
      [],
    );

    expect(output).toContain('Version');
    expect(output).not.toContain('Minimum target');
    expect(output).not.toContain('—');
  });

  // The icon comes from the joined violation, so a row whose rule entry is
  // 'off' (no violation) renders its target with no verdict attached.
  it('renders the target without an icon when no violation was emitted', () => {
    const output = render(
      makeAggregated({
        packageDistribution: [
          createMockPackage('acme', {
            version: '1.0.0',
            releases: createOverdueReleases({
              target: '2.0.0',
              daysOverdue: 40,
            }),
          }),
        ],
      }),
    );

    expect(output).toContain('2.0.0');
    expect(output).not.toContain('🔴');
  });

  it('takes the cell icon from the joined violation severity', () => {
    const output = render(
      makeAggregated({
        packageDistribution: [
          createMockPackage('acme', {
            version: '1.0.0',
            releases: createOverdueReleases({
              target: '2.0.0',
              daysOverdue: 40,
            }),
          }),
        ],
        ruleViolations: [
          createMockNoOutdatedPackagesViolation('acme', { severity: 'error' }),
        ],
      }),
    );

    expect(output).toContain('🔴');
  });

  // The same facts under a laxer threshold produce a different cell — which
  // is only possible because the cell is recomputed per run rather than
  // cached on the package (#189).
  it('recomputes the cell when the governing thresholds differ', () => {
    const packageDistribution = [
      createMockPackage('acme', {
        version: '1.0.0',
        releases: createOverdueReleases({ target: '2.0.0', daysOverdue: 40 }),
      }),
    ];

    const strict = render(makeAggregated({ packageDistribution }));
    expect(strict).toContain('40 days overdue');

    consoleSpy.mockClear();

    const lenient = render(makeAggregated({ packageDistribution }), [
      {
        ...OUTDATED_RULES[0],
        thresholds: { patch: 30, minor: 45, major: 600 },
      },
    ]);
    expect(lenient).not.toContain('days overdue');
  });
});
