export type UpgradeLevel = 'needs_upgrade' | 'mandatory_upgrade';
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
   * `null` when compliant, including when no release newer than
   * `installedVersion` has ever fallen inside its bump tier's threshold —
   * in that case the only achievable target is `latestVersion` itself, so
   * there's nothing avoidably stale to flag (#26).
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
  severity: 'error' | 'warn';
}

export interface RegistryPackageInfo {
  name: string;
  time: Record<string, string>;
  deprecated?: string;
  versions: Record<string, { deprecated?: string }>;
  'dist-tags'?: Record<string, string>;
}
