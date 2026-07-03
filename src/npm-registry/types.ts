export type UpgradeLevel = 'needs_upgrade' | 'mandatory_upgrade';
export type SemverBump = 'patch' | 'minor' | 'major';

export interface AvailableUpgrade {
  version: string;
  releasedDaysAgo: number;
  semverBump: SemverBump;
  level: UpgradeLevel;
  isLatest?: boolean;
}

export interface ReleaseAgeEntry {
  installedVersion: string;
  upgrades: AvailableUpgrade[];
  worstLevel: UpgradeLevel | null;
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
