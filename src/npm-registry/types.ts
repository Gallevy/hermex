export type UpgradeLevel = 'minor_overdue' | 'major_overdue';
export type SemverBump = 'patch' | 'minor' | 'major';

export interface AvailableUpgrade {
  version: string;
  releasedDaysAgo: number;
  /**
   * Age (in days) of the oldest release in this bump tier — the one that
   * actually breached `thresholdDays` and drove `level`. Distinct from
   * `releasedDaysAgo`, which is the newest/recommended upgrade target and
   * may be much younger than the release that triggered the breach (#24).
   */
  breachReleasedDaysAgo: number;
  semverBump: SemverBump;
  level: UpgradeLevel;
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

export interface ReleaseAgeEntry {
  installedVersion: string;
  upgrades: AvailableUpgrade[];
  /**
   * `null` only when there are no breached upgrades at all. Independent of
   * whether `minCompliantVersion` fell back to `latestVersion` — a package
   * can still be overdue on a breached tier even when latest itself is past
   * that tier's threshold and there's nothing fresher to recommend instead
   * (#29).
   */
  worstLevel: UpgradeLevel | null;
  pendingUpgrade?: PendingUpgrade;
  deprecated?: string;
  latestVersion?: string;
  latestReleasedDaysAgo?: number;
  /**
   * The oldest release (across any bump tier) that's still within its
   * threshold, i.e. a safe upgrade target. Falls back to `latestVersion`
   * when no release has ever qualified — upgrading to (or already being
   * on) latest is always treated as compliant, since nothing fresher
   * exists to require instead (#26).
   */
  minCompliantVersion?: string;
  minCompliantReleasedDaysAgo?: number;
  /**
   * `true` when `minCompliantVersion` is a genuine still-in-window upgrade
   * target — something you could adopt right now and be compliant. `false`
   * when it only fell back to `latestVersion` because every candidate is
   * itself past its threshold (#26): in that case there is no compliant
   * release to recommend, so the display says so rather than pointing at a
   * target that wouldn't actually clear the breach.
   */
  minCompliantInWindow?: boolean;
  /** Bump tier of `minCompliantVersion` relative to installed — for labeling
   * the recommended target when it differs from the breached tier. */
  minCompliantBump?: SemverBump;
  severity: 'error' | 'warn';
  /**
   * Which lockfile copies count toward this verdict: 'root' checks only
   * `installedVersion`; 'tree' checks every resolved copy. Resolved from
   * `releaseAge.scope`/`scopeExceptions` config (#57).
   */
  scope: 'root' | 'tree';
  /** Every distinct installed version considered — only set when more than one exists. */
  evaluatedVersions?: string[];
  /**
   * Versions from `evaluatedVersions` that breached their own threshold but
   * are NOT part of this verdict (i.e. not in scope) — e.g. nested
   * duplicates under `scope: 'root'`. Always computed when there's a
   * conflict, regardless of scope, so overdue nested copies are never
   * silently invisible just because they don't block `comply` (#57).
   */
  advisoryBreaches?: { version: string; level: UpgradeLevel }[];
}

export interface RegistryPackageInfo {
  name: string;
  time: Record<string, string>;
  deprecated?: string;
  versions: Record<string, { deprecated?: string }>;
  'dist-tags'?: Record<string, string>;
}
