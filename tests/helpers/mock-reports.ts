import type { UsageReport } from '../../src/swc-parser/types';
import type {
  PackageDistribution,
  PackageInventoryEntry,
} from '../../src/utils/aggregator';
import type {
  PackageReleases,
  ReleaseInfo,
  ResolvedCopy,
} from '../../src/npm-registry/types';
// From ./shared, not ./evaluator: evaluator re-exports only RuleViolation, so
// these two named imports never actually resolved (tests aren't typechecked).
import type {
  NoDeprecatedPackagesViolation,
  NoOutdatedPackagesViolation,
} from '../../src/rules/shared';

/**
 * Creates a minimal UsageReport with all required fields.
 * Override specific fields via the partial argument.
 */
export function createMockReport(
  overrides: Partial<UsageReport> = {},
): UsageReport {
  return {
    filePath: 'mock.tsx',
    summary: { totalImports: 0, totalComponents: 0, totalUsagePatterns: 0 },
    patterns: {
      imports: { default: [], named: [], namespace: [], aliased: [] },
      usage: {
        jsx: [],
        variables: [],
        destructuring: [],
        conditional: [],
        arrays: [],
        objects: [],
      },
      advanced: {
        lazy: [],
        dynamic: [],
        hoc: [],
        memo: [],
        forwardRef: [],
        portal: [],
      },
      props: [],
    },
    components: [],
    ...overrides,
  };
}

/**
 * Creates a minimal PackageDistribution entry.
 * Override specific fields via the partial argument.
 */
export function createMockPackage(
  packageName: string,
  overrides: Partial<PackageDistribution> = {},
): PackageDistribution {
  const version = overrides.version !== undefined ? overrides.version : '1.0.0';
  return {
    packageName,
    version,
    // Defaults to matching `version` — i.e. "yes, this is a root
    // dependency" — since that's what most tests intend by just setting
    // `version`. Override explicitly with `rootVersion: null` to test the
    // "confirmed transitive-only, not a root dependency" case (#62).
    rootVersion: version,
    componentCount: 1,
    usageCount: 1,
    // Defaults to 1 alongside `usageCount`: the default mock is a package
    // present on every axis, and a component rendered once came from a file
    // that imported it once. Override to 0 for the function-only /
    // never-imported cases (#174).
    importingFileCount: 1,
    percentage: 100,
    declaredIn: ['dependencies'],
    hasVersionConflict: false,
    // Defaults to a single-entry array matching `version` (not a fixed
    // '1.0.0') so overriding just `version` doesn't silently produce a
    // package whose only "resolved copy" doesn't match its own installed
    // version — override `allVersions` explicitly for multi-version tests.
    allVersions: version ? [version] : [],
    ...overrides,
  };
}

/**
 * Creates a minimal PackageInventoryEntry — by default a package that is
 * declared, installed as a direct dependency, and used once, i.e. present
 * on all three axes. Override to test a single axis in isolation (e.g.
 * `{ usageCount: 0, componentCount: 0, importingFileCount: 0 }` for
 * declared-but-never-imported, or `{ declaredIn: [], rootVersion: null }` for
 * purely transitive). `{ usageCount: 0, componentCount: 0 }` alone leaves the
 * function-only case: imported, never rendered (#174).
 */
export function createMockInventoryEntry(
  packageName: string,
  overrides: Partial<PackageInventoryEntry> = {},
): PackageInventoryEntry {
  const version = overrides.version !== undefined ? overrides.version : '1.0.0';
  return {
    packageName,
    declaredIn: ['dependencies'],
    version,
    rootVersion: version,
    allVersions: version ? [version] : [],
    hasVersionConflict: false,
    ignored: false,
    usageCount: 1,
    componentCount: 1,
    importingFileCount: 1,
    ...overrides,
  };
}

/**
 * Registry facts for one package — a single root copy at `1.0.0` with
 * nothing newer.
 *
 * Note there is nothing verdict-shaped to override here: no severity, no
 * overdue tier, no recommendation. Expressing "this package is overdue" is
 * a matter of giving it a `newer` release old enough to breach, and then
 * asking `assessPackage` (#189).
 */
export function createMockReleases(
  overrides: Partial<PackageReleases> = {},
): PackageReleases {
  return {
    resolved: [{ version: '1.0.0', isRoot: true, newer: [] }],
    ...overrides,
  };
}

/** The thresholds every fixture here is written against. */
const FIXTURE_THRESHOLDS = { patch: 30, minor: 45, major: 60 };

/**
 * Facts that make exactly one tier breach by a stated amount.
 *
 * Display tests care about the answer ("4.17.21, major, 40 days overdue"),
 * but facts cannot state an answer — so this builds the two releases that
 * *produce* it under `FIXTURE_THRESHOLDS`: one old enough to trip the
 * threshold by `daysOverdue`, and a fresh one that becomes the recommended
 * target. Nothing here is policy; the thresholds live in the rule entries
 * the test passes alongside.
 */
export function createOverdueReleases(opts: {
  copy?: string;
  target: string;
  targetDaysAgo?: number;
  daysOverdue: number;
  semverBump?: ReleaseInfo['semverBump'];
  /** Nested copies, each overdue on its own. */
  advisory?: string[];
}): PackageReleases {
  const bump = opts.semverBump ?? 'major';
  const breachingAge = FIXTURE_THRESHOLDS[bump] + opts.daysOverdue;
  const targetAge = opts.targetDaysAgo ?? 1;

  const newer: ReleaseInfo[] = [
    {
      version: '0.0.1-breacher',
      releasedDaysAgo: breachingAge,
      semverBump: bump,
    },
    { version: opts.target, releasedDaysAgo: targetAge, semverBump: bump },
  ];

  return {
    resolved: [
      { version: opts.copy ?? '1.0.0', isRoot: true, newer },
      ...(opts.advisory ?? []).map((version) => ({
        version,
        isRoot: false,
        newer: [
          {
            version: '99.0.0',
            releasedDaysAgo: 400,
            semverBump: 'major' as const,
          },
        ],
      })),
    ],
  };
}

/** One resolved copy, for building multi-copy (`scope: 'tree'`) fixtures. */
export function createMockCopy(
  version: string,
  newer: ReleaseInfo[] = [],
  isRoot = true,
): ResolvedCopy {
  return { version, isRoot, newer };
}

/**
 * A published release newer than the copy it hangs off. `releasedDaysAgo`
 * is what decides whether any given threshold considers it overdue — the
 * fixture states the fact, the rule states the verdict.
 */
export function createMockRelease(
  version: string,
  releasedDaysAgo: number,
  semverBump: ReleaseInfo['semverBump'] = 'major',
): ReleaseInfo {
  return { version, releasedDaysAgo, semverBump };
}

/**
 * Creates a minimal `NoOutdatedPackagesViolation` — what a mandatory or
 * warn-severity overdue package looks like in `ruleViolations`. This is
 * where the verdict lives; `createMockReleases` above is its facts
 * counterpart on `packageDistribution` (#189).
 */
export function createMockNoOutdatedPackagesViolation(
  packageName: string,
  overrides: Partial<NoOutdatedPackagesViolation> = {},
): NoOutdatedPackagesViolation {
  return {
    ruleId: 'no-outdated-packages',
    severity: 'error',
    patterns: [packageName],
    packageName,
    measuredVersion: '1.0.0',
    overdueTier: 'major',
    daysOverdue: 40,
    scope: 'root',
    ...overrides,
  };
}

/** A `no-deprecated-packages` hit, the shape `detectDeprecatedPackages`
 * emits. Severity defaults to the rule family's own baseline (#107). */
export function createMockDeprecatedViolation(
  packageName: string,
  overrides: Partial<NoDeprecatedPackagesViolation> = {},
): NoDeprecatedPackagesViolation {
  return {
    ruleId: 'no-deprecated-packages',
    severity: 'info',
    patterns: ['**'],
    packageName,
    deprecated: 'no longer maintained',
    ...overrides,
  };
}
