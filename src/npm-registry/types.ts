/**
 * Which semver tier a package is overdue on — the `no-outdated-packages`
 * verdict, and the only thing on that axis. It rides on the violation
 * (`src/rules/shared.ts`), never on the registry facts below: a tier is
 * overdue relative to a configured threshold, which is policy.
 *
 * A breached *patch* tier reports `'minor'`. There is no `'patch'` member
 * on purpose — the tier names how far the upgrade moves you, and patch and
 * minor are the same answer to "is this a breaking change".
 */
export type OverdueTier = 'minor' | 'major';

export type SemverBump = 'patch' | 'minor' | 'major';

/**
 * A published release newer than the measured version whose bump tier has
 * already aged past its threshold.
 *
 * Only breached tiers become `AvailableUpgrade`s, so the presence of any is
 * itself the "something is overdue" signal — which is why this carries no
 * overdue field of its own. The tier is `semverBump`; deriving the verdict
 * from it is `deriveOverdueTier` in `src/rules/no-outdated-packages.ts`.
 */
export interface AvailableUpgrade {
  version: string;
  releasedDaysAgo: number;
  /**
   * Age (in days) of the oldest release in this bump tier — the one that
   * actually breached `thresholdDays`. Distinct from `releasedDaysAgo`,
   * which is the newest/recommended upgrade target and may be much younger
   * than the release that triggered the breach (#24).
   */
  breachReleasedDaysAgo: number;
  semverBump: SemverBump;
  thresholdDays: number;
  isLatest?: boolean;
}

/** An upgrade candidate that hasn't yet breached its bump tier's age threshold. */
export interface PendingUpgrade {
  version: string;
  semverBump: SemverBump;
  releasedDaysAgo: number;
  thresholdDays: number;
  daysRemaining: number;
}

/**
 * The upgrade hermex recommends, and whether it actually clears the breach.
 *
 * Grouped into one object rather than spread across four optional
 * `minCompliant*` fields because they are one decision with three possible
 * answers, and flat optionals could not express that: the old shape let
 * `minCompliantVersion` hold a version that was *not* compliant, rescued
 * only by a separate `minCompliantInWindow: false` beside it (#26). Here
 * `inWindow: false` is attached to the fallback it describes.
 */
export interface RecommendedTarget {
  version: string;
  releasedDaysAgo: number;
  /** Bump tier relative to the measured version — for labeling the target
   * when it differs from the breached tier. */
  semverBump?: SemverBump;
  /**
   * `true` when this is a genuine still-in-window target you could adopt
   * right now and be compliant. `false` when it only fell back to latest
   * because every candidate is itself past its threshold (#26): there is no
   * compliant release to recommend, so the display says so rather than
   * pointing at a target that wouldn't clear the breach.
   */
  inWindow: boolean;
}

/**
 * What the registry says about one package's releases, measured against
 * what's installed. **Facts only** — no severity, no verdict.
 *
 * Everything here is derived from published release dates plus the
 * configured thresholds. Thresholds are an *input* (a tier can't be called
 * breached without one), but nothing about how hard the policy is enforced
 * reaches this struct: severity lives on the violation, and whether a
 * package is overdue at all is `upgrades.length > 0`. Populated for every
 * package the registry answered for, whatever its policy — it is the
 * Packages table's data, not a judgment (#189).
 */
export interface ReleaseAgeEntry {
  /**
   * The single version this was measured against. Under `scope: 'root'`
   * that's the root-installed copy; under `scope: 'tree'` it's the worst
   * offending copy in the lockfile, which may be a nested one (#57). Named
   * for what it is rather than `installedVersion`, which read as "the
   * version you installed" while silently meaning something else under
   * tree scope.
   */
  measuredVersion: string;
  /** Breached tiers only, newest-release-first. Empty means nothing is overdue. */
  upgrades: AvailableUpgrade[];
  /** Set only when nothing has breached yet — the "coming due" advisory. */
  pendingUpgrade?: PendingUpgrade;
  latestVersion?: string;
  latestReleasedDaysAgo?: number;
  /** Absent when there is no newer release to point at. */
  recommendedTarget?: RecommendedTarget;
  /** Every distinct installed version considered — only set when more than one exists. */
  evaluatedVersions?: string[];
  /**
   * Versions from `evaluatedVersions` that breached their own threshold but
   * are NOT part of this verdict (i.e. not in scope) — e.g. nested
   * duplicates under `scope: 'root'`. Always computed when there's a
   * conflict, regardless of scope, so overdue nested copies are never
   * silently invisible just because they don't block `comply` (#57).
   */
  advisoryBreaches?: { version: string; tier: OverdueTier }[];
}

export interface RegistryPackageInfo {
  name: string;
  time: Record<string, string>;
  deprecated?: string;
  versions: Record<string, { deprecated?: string }>;
  'dist-tags'?: Record<string, string>;
}
