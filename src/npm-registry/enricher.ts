import semver from 'semver';
import type { PackageDistribution } from '../utils/aggregator';
import type { ReleaseAgeConfig } from '../config/types';
import type {
  AvailableUpgrade,
  ReleaseAgeEntry,
  SemverBump,
  UpgradeLevel,
} from './types';
import { fetchPackageInfo } from './client';

const CONCURRENCY = 8;

function daysSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function classifyBump(installed: string, candidate: string): SemverBump | null {
  const diff = semver.diff(installed, candidate);
  if (!diff) return null;
  if (diff === 'patch' || diff === 'prepatch') return 'patch';
  if (diff === 'minor' || diff === 'preminor') return 'minor';
  if (diff === 'major' || diff === 'premajor') return 'major';
  return null;
}

function upgradeLevel(
  daysAgo: number,
  bump: SemverBump,
  thresholds: ReleaseAgeConfig['thresholds'],
): UpgradeLevel | null {
  const threshold = thresholds[bump];
  if (threshold === false || threshold === undefined) return null;
  if (daysAgo > threshold) {
    // major bump past its threshold → mandatory, minor/patch → needs
    return bump === 'major' ? 'mandatory_upgrade' : 'needs_upgrade';
  }
  return null;
}

function computeReleaseAge(
  installedVersion: string,
  timeMap: Record<string, string>,
  deprecated: string | undefined,
  thresholds: ReleaseAgeConfig['thresholds'],
): ReleaseAgeEntry {
  const upgrades: AvailableUpgrade[] = [];

  for (const [version, dateStr] of Object.entries(timeMap)) {
    if (version === 'created' || version === 'modified') continue;
    if (!semver.valid(version)) continue;
    if (semver.lte(version, installedVersion)) continue;

    const bump = classifyBump(installedVersion, version);
    if (!bump) continue;

    const daysAgo = daysSince(dateStr);
    const level = upgradeLevel(daysAgo, bump, thresholds);
    if (!level) continue;

    upgrades.push({
      version,
      releasedDaysAgo: daysAgo,
      semverBump: bump,
      level,
    });
  }

  // Keep only the oldest (most stable) release per bump level
  const worstPerBump = new Map<SemverBump, AvailableUpgrade>();
  for (const upgrade of upgrades) {
    const existing = worstPerBump.get(upgrade.semverBump);
    if (!existing || upgrade.releasedDaysAgo > existing.releasedDaysAgo) {
      worstPerBump.set(upgrade.semverBump, upgrade);
    }
  }

  const finalUpgrades = Array.from(worstPerBump.values()).sort(
    (a, b) => b.releasedDaysAgo - a.releasedDaysAgo,
  );

  const worstLevel: UpgradeLevel | null = finalUpgrades.some(
    (u) => u.level === 'mandatory_upgrade',
  )
    ? 'mandatory_upgrade'
    : finalUpgrades.length > 0
      ? 'needs_upgrade'
      : null;

  return {
    installedVersion,
    upgrades: finalUpgrades,
    worstLevel,
    deprecated,
  };
}

export async function enrichWithReleaseAge(
  packages: PackageDistribution[],
  config: ReleaseAgeConfig,
): Promise<{ enriched: PackageDistribution[]; skipped: number }> {
  const registryUrl = config.registry;
  const targets = packages.filter((p) => !p.internal && p.version);
  const enriched = [...packages];
  let skipped = 0;

  // Process in batches of CONCURRENCY
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (pkg) => {
        const info = await fetchPackageInfo(
          pkg.packageName,
          registryUrl,
          config.authToken,
        );
        if (!info || !info.time) {
          skipped++;
          return { pkg, entry: null };
        }

        const deprecated =
          info.versions?.[pkg.version!]?.deprecated ?? info.deprecated;

        const entry = computeReleaseAge(
          pkg.version!,
          info.time,
          typeof deprecated === 'string' ? deprecated : undefined,
          config.thresholds,
        );

        return { pkg, entry };
      }),
    );

    for (const { pkg, entry } of results) {
      if (!entry) continue;
      const idx = enriched.findIndex((p) => p.packageName === pkg.packageName);
      if (idx !== -1) {
        enriched[idx] = { ...enriched[idx], releaseAge: entry };
      }
    }
  }

  return { enriched, skipped };
}
