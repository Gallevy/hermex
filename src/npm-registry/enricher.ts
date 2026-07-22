import semver from 'semver';
import micromatch from 'micromatch';
import type { PackageDistribution } from '../utils/aggregator';
import type { ReleaseAgeConfig } from '../config/types';
import type {
  AvailableUpgrade,
  PendingUpgrade,
  ReleaseAgeEntry,
  SemverBump,
  UpgradeLevel,
} from './types';
import { getPackageInfo, type CacheOptions } from './cache';

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

function pickNewest(versions: { version: string; daysAgo: number }[]): {
  version: string;
  daysAgo: number;
} {
  return versions.reduce((a, b) => (a.daysAgo < b.daysAgo ? a : b));
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
  distTags: Record<string, string> | undefined,
  severity: 'error' | 'warn',
): ReleaseAgeEntry {
  const byBump = new Map<SemverBump, { version: string; daysAgo: number }[]>();
  let minCompliantVersion: string | undefined;
  let minCompliantReleasedDaysAgo: number | undefined;

  for (const [version, dateStr] of Object.entries(timeMap)) {
    if (version === 'created' || version === 'modified') continue;
    if (!semver.valid(version)) continue;
    if (semver.prerelease(version)) continue;
    if (semver.lte(version, installedVersion)) continue;

    const bump = classifyBump(installedVersion, version);
    if (!bump) continue;

    const daysAgo = daysSince(dateStr);
    const list = byBump.get(bump) ?? [];
    list.push({ version, daysAgo });
    byBump.set(bump, list);

    // Track the oldest release, at whichever bump tier it belongs to, that's
    // still within that tier's configured age threshold (#21) — generalizes
    // what was previously a patch-only check to all three tiers, since the
    // same "is this candidate old enough to be safely adopted" question
    // applies identically to patch, minor, and major bumps, just against a
    // different configured threshold per tier.
    const threshold = thresholds[bump];
    if (
      threshold !== false &&
      threshold !== undefined &&
      daysAgo <= threshold &&
      (minCompliantReleasedDaysAgo === undefined ||
        daysAgo > minCompliantReleasedDaysAgo)
    ) {
      minCompliantVersion = version;
      minCompliantReleasedDaysAgo = daysAgo;
    }
  }

  // A bump tier is "breached" if its oldest available version is older than the
  // tier's threshold — report the newest version in that tier as the upgrade
  // target, not the version that happened to trigger the breach.
  const upgrades: AvailableUpgrade[] = [];
  for (const [bump, versions] of byBump.entries()) {
    const oldestDaysAgo = Math.max(...versions.map((v) => v.daysAgo));
    const level = upgradeLevel(oldestDaysAgo, bump, thresholds);
    if (!level) continue;

    const newest = pickNewest(versions);
    upgrades.push({
      version: newest.version,
      releasedDaysAgo: newest.daysAgo,
      breachReleasedDaysAgo: oldestDaysAgo,
      semverBump: bump,
      level,
      thresholdDays: thresholds[bump] as number,
    });
  }

  const finalUpgrades = upgrades.sort(
    (a, b) => b.releasedDaysAgo - a.releasedDaysAgo,
  );

  const latestVersion = distTags?.['latest'];
  const latestEntry = latestVersion ? timeMap[latestVersion] : undefined;
  const latestReleasedDaysAgo = latestEntry
    ? daysSince(latestEntry)
    : undefined;

  // If nothing newer than installed ever fell inside its tier's threshold,
  // the only real landing spot is latest — treat it as the compliant target
  // even though it's itself past the window, since there's no fresher
  // release to upgrade to instead (#26).
  if (
    minCompliantVersion === undefined &&
    latestVersion &&
    latestReleasedDaysAgo !== undefined &&
    !semver.prerelease(latestVersion) &&
    semver.gt(latestVersion, installedVersion)
  ) {
    minCompliantVersion = latestVersion;
    minCompliantReleasedDaysAgo = latestReleasedDaysAgo;
  }

  for (const upgrade of finalUpgrades) {
    if (latestVersion && upgrade.version === latestVersion) {
      upgrade.isLatest = true;
    }
  }

  const worstLevel: UpgradeLevel | null = finalUpgrades.some(
    (u) => u.level === 'mandatory_upgrade',
  )
    ? 'mandatory_upgrade'
    : finalUpgrades.length > 0
      ? 'needs_upgrade'
      : null;

  // Only surface a "coming due" advisory when nothing has breached yet — a
  // package that's already in violation on one tier doesn't also need an
  // "N days remaining" note about another, unbreached tier.
  let pendingUpgrade: PendingUpgrade | undefined;
  if (worstLevel === null) {
    for (const [bump, versions] of byBump.entries()) {
      const threshold = thresholds[bump];
      if (threshold === false || threshold === undefined) continue;

      const oldestDaysAgo = Math.max(...versions.map((v) => v.daysAgo));
      const daysRemaining = threshold - oldestDaysAgo;
      if (daysRemaining <= 0) continue;

      if (!pendingUpgrade || daysRemaining < pendingUpgrade.daysRemaining) {
        const newest = pickNewest(versions);
        pendingUpgrade = {
          version: newest.version,
          semverBump: bump,
          releasedDaysAgo: newest.daysAgo,
          thresholdDays: threshold,
          daysRemaining,
        };
      }
    }
  }

  return {
    installedVersion,
    upgrades: finalUpgrades,
    worstLevel,
    pendingUpgrade,
    deprecated,
    latestVersion,
    latestReleasedDaysAgo,
    minCompliantVersion,
    minCompliantReleasedDaysAgo,
    severity,
  };
}

export async function enrichWithReleaseAge(
  packages: PackageDistribution[],
  config: ReleaseAgeConfig,
): Promise<{ enriched: PackageDistribution[]; skipped: number }> {
  const registryUrl = config.registry;
  const authToken =
    config.authToken ?? process.env['HERMEX_REGISTRY_AUTH_TOKEN'];
  const targets = packages.filter((p) => !p.internal && p.version);
  const enriched = [...packages];
  let skipped = 0;

  const envTtl = Number(process.env['HERMEX_REGISTRY_CACHE_TTL_MS']);
  const cacheOptions: CacheOptions = {
    ttlMs: Number.isFinite(envTtl) && envTtl > 0 ? envTtl : config.cacheTtlMs,
    disabled:
      process.env['HERMEX_REGISTRY_CACHE_DISABLED'] === '1' ||
      config.cacheDisabled === true,
  };

  // Process in batches of CONCURRENCY
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (pkg) => {
        const info = await getPackageInfo(
          pkg.packageName,
          registryUrl,
          authToken,
          cacheOptions,
        );
        if (!info || !info.time) {
          skipped++;
          return { pkg, entry: null };
        }

        const deprecated =
          info.versions?.[pkg.version!]?.deprecated ?? info.deprecated;

        const severity: 'error' | 'warn' =
          config.enforceOn.length === 0 ||
          micromatch.isMatch(pkg.packageName, config.enforceOn)
            ? 'error'
            : 'warn';

        const entry = computeReleaseAge(
          pkg.version!,
          info.time,
          typeof deprecated === 'string' ? deprecated : undefined,
          config.thresholds,
          info['dist-tags'],
          severity,
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
