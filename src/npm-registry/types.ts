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
  worstLevel: UpgradeLevel | null;
  pendingUpgrade?: PendingUpgrade;
  deprecated?: string;
  latestVersion?: string;
  latestReleasedDaysAgo?: number;
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
