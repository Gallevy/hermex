import semver from 'semver';
import type { PackageDistribution } from '../utils/aggregator';
import type { ReleaseAgeThresholds } from '../config/types';
import type {
  AvailableUpgrade,
  PendingUpgrade,
  ReleaseAgeEntry,
  SemverBump,
  UpgradeLevel,
} from './types';
import { getPackageInfo, type CacheOptions } from './cache';

/**
 * Only npm is supported today — no config field exposes this URL, since a
 * second registry is speculative extensibility with no current use; add one
 * back if/when it's actually needed. `HERMEX_FIXTURE_REGISTRY` is an
 * internal-only escape hatch (same pattern as `HERMEX_REGISTRY_CACHE_TTL_MS`/
 * `HERMEX_REGISTRY_CACHE_DISABLED` below) that lets `scripts/output-review.ts`
 * redirect fixture runs to its local mock server instead of the real
 * registry — never documented as user-facing config.
 */
export const NPM_REGISTRY_URL =
  process.env['HERMEX_FIXTURE_REGISTRY'] ?? 'https://registry.npmjs.org';

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
  thresholds: ReleaseAgeThresholds,
): UpgradeLevel | null {
  const threshold = thresholds[bump];
  if (threshold === false || threshold === undefined) return null;
  if (daysAgo > threshold) {
    return bump === 'major' ? 'major_overdue' : 'minor_overdue';
  }
  return null;
}

interface ReleaseAgeForVersion {
  upgrades: AvailableUpgrade[];
  worstLevel: UpgradeLevel | null;
  pendingUpgrade?: PendingUpgrade;
  latestVersion?: string;
  latestReleasedDaysAgo?: number;
  minCompliantVersion?: string;
  minCompliantReleasedDaysAgo?: number;
  minCompliantInWindow: boolean;
  minCompliantBump?: SemverBump;
}

/**
 * Computes everything version-dependent for a single installed version
 * against the registry's release timeline — no notion of scope or
 * severity, which are policy facts independent of which installed copy is
 * being checked (#57). Deprecation isn't here either, and no longer passes
 * through release-age at all: it's an inventory fact recorded directly by
 * `enrichFromRegistry` below (#107).
 */
function computeReleaseAgeForVersion(
  installedVersion: string,
  timeMap: Record<string, string>,
  thresholds: ReleaseAgeThresholds,
  distTags: Record<string, string> | undefined,
): ReleaseAgeForVersion {
  const byBump = new Map<SemverBump, { version: string; daysAgo: number }[]>();
  let minCompliantVersion: string | undefined;
  let minCompliantReleasedDaysAgo: number | undefined;
  let minCompliantBump: SemverBump | undefined;

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
      minCompliantBump = bump;
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
  const hadInWindowCandidate = minCompliantVersion !== undefined;
  if (
    !hadInWindowCandidate &&
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

  // The latest-fallback above is a display convenience for "closest
  // achievable target" — it must not also erase worstLevel. A package with
  // breached upgrades is still overdue even when latest itself is past the
  // threshold and there's nothing fresher to recommend instead (#29).
  const worstLevel: UpgradeLevel | null = finalUpgrades.some(
    (u) => u.level === 'major_overdue',
  )
    ? 'major_overdue'
    : finalUpgrades.length > 0
      ? 'minor_overdue'
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
    upgrades: finalUpgrades,
    worstLevel,
    pendingUpgrade,
    latestVersion,
    latestReleasedDaysAgo,
    minCompliantVersion,
    minCompliantReleasedDaysAgo,
    minCompliantInWindow: hadInWindowCandidate,
    minCompliantBump,
  };
}

const LEVEL_RANK: Record<'null' | UpgradeLevel, number> = {
  null: 0,
  minor_overdue: 1,
  major_overdue: 2,
};

function levelRank(level: UpgradeLevel | null): number {
  return LEVEL_RANK[level ?? 'null'];
}

/** A vacuous "nothing enforced" result — worstLevel stays null regardless
 * of what the registry timeline actually says, since there's no enforced
 * baseline to measure against. */
const NOTHING_ENFORCED: ReleaseAgeForVersion = {
  upgrades: [],
  worstLevel: null,
  minCompliantInWindow: false,
};

/**
 * Resolves which of `allVersions` count toward compliance ('root': just
 * `installedVersion`, and only when `hasRootVersion` confirms it's a real
 * direct dependency — not the "fell back to the highest resolved version"
 * placeholder for a purely transitive package (#62); 'tree': every
 * resolved copy). Evaluates each candidate independently via
 * `computeReleaseAgeForVersion`, and combines them into a single verdict —
 * the worst result among the enforced versions — while still surfacing
 * overdue-but-not-enforced copies via `advisoryBreaches` regardless of
 * scope (#57).
 */
export function computeReleaseAge(
  installedVersion: string,
  allVersions: string[],
  timeMap: Record<string, string>,
  thresholds: ReleaseAgeThresholds,
  distTags: Record<string, string> | undefined,
  severity: 'error' | 'warn' | 'info' | 'off',
  scope: 'root' | 'tree',
  hasRootVersion: boolean,
): ReleaseAgeEntry {
  const candidates =
    allVersions.length > 0
      ? Array.from(new Set(allVersions))
      : [installedVersion];
  if (!candidates.includes(installedVersion)) candidates.push(installedVersion);

  const enforcedVersions =
    scope === 'tree' ? candidates : hasRootVersion ? [installedVersion] : [];

  const perVersion = new Map<string, ReleaseAgeForVersion>();
  for (const version of candidates) {
    perVersion.set(
      version,
      computeReleaseAgeForVersion(version, timeMap, thresholds, distTags),
    );
  }

  // No enforced baseline at all — e.g. `scope: 'root'` on a package that
  // was never a direct dependency (only reachable transitively). Nothing
  // can fail comply for it; every candidate below still gets a chance to
  // surface as an advisory breach instead of vanishing silently.
  let baselineVersion = installedVersion;
  let baseline: ReleaseAgeForVersion = NOTHING_ENFORCED;
  if (enforcedVersions.length > 0) {
    baselineVersion = enforcedVersions[0];
    baseline = perVersion.get(baselineVersion)!;
    for (const version of enforcedVersions.slice(1)) {
      const candidate = perVersion.get(version)!;
      const candidateRank = levelRank(candidate.worstLevel);
      const baselineRank = levelRank(baseline.worstLevel);
      const candidateBreachAge =
        candidate.upgrades[0]?.breachReleasedDaysAgo ?? 0;
      const baselineBreachAge =
        baseline.upgrades[0]?.breachReleasedDaysAgo ?? 0;
      if (
        candidateRank > baselineRank ||
        (candidateRank === baselineRank &&
          candidateBreachAge > baselineBreachAge)
      ) {
        baseline = candidate;
        baselineVersion = version;
      }
    }
  }

  const advisoryBreaches: { version: string; level: UpgradeLevel }[] = [];
  for (const version of candidates) {
    if (enforcedVersions.includes(version)) continue;
    const result = perVersion.get(version)!;
    if (result.worstLevel) {
      advisoryBreaches.push({ version, level: result.worstLevel });
    }
  }

  return {
    installedVersion: baselineVersion,
    upgrades: baseline.upgrades,
    worstLevel: baseline.worstLevel,
    pendingUpgrade: baseline.pendingUpgrade,
    latestVersion: baseline.latestVersion,
    latestReleasedDaysAgo: baseline.latestReleasedDaysAgo,
    minCompliantVersion: baseline.minCompliantVersion,
    minCompliantReleasedDaysAgo: baseline.minCompliantReleasedDaysAgo,
    minCompliantInWindow: baseline.minCompliantInWindow,
    minCompliantBump: baseline.minCompliantBump,
    severity,
    scope,
    evaluatedVersions: candidates.length > 1 ? candidates : undefined,
    advisoryBreaches:
      advisoryBreaches.length > 0 ? advisoryBreaches : undefined,
  };
}

/** Connection/infra settings only — no policy. Mirrors the now-trimmed
 * `releaseAge` config block (`src/config/schema.ts`). */
export interface ReleaseAgeConnection {
  authToken?: string;
  cacheTtlMs?: number;
  cacheDisabled: boolean;
}

/** A package's resolved release-age policy — from `resolveReleaseAgeRule`
 * (`src/config/overrides.ts`), one per package, already picked from
 * whichever rule entry governs it. */
export interface ReleaseAgePolicy {
  severity: 'error' | 'warn' | 'info' | 'off';
  thresholds: ReleaseAgeThresholds;
  scope: 'root' | 'tree';
}

/** What one package's registry lookup produced. `found` records whether the
 * fetch itself succeeded, which is deliberately separate from whether an
 * `entry` was computed — see the merge loop below. */
interface RegistryResult {
  pkg: PackageDistribution;
  found: boolean;
  deprecated?: string;
  entry?: ReleaseAgeEntry;
}

/**
 * One registry pass, two outputs. Deprecation is an inventory fact and is
 * always recorded; the `ReleaseAgeEntry` is computed only when
 * `resolvePolicy` is supplied — i.e. when `rules['no-outdated-packages']` is
 * non-empty for this repo. So both registry-backed rules cost one request
 * per installed package between them, not one each (#107).
 *
 * Within a release-age run, enrichment stays unconditional regardless of
 * policy (#171, #173): a package's `resolvePolicy` result decides only its
 * severity, thresholds and scope, never whether it's looked up at all.
 * Pure registry I/O plus the timeline math above; policy resolution (which
 * rule entry governs a package) lives one layer up, in `src/rules/`.
 */
export async function enrichFromRegistry(
  packages: PackageDistribution[],
  connection: ReleaseAgeConnection,
  resolvePolicy?: (packageName: string) => ReleaseAgePolicy,
): Promise<{ enriched: PackageDistribution[]; skipped: number }> {
  const authToken =
    connection.authToken ?? process.env['HERMEX_REGISTRY_AUTH_TOKEN'];
  const targets = packages.filter((p) => p.version);
  const enriched = [...packages];
  let skipped = 0;

  const envTtl = Number(process.env['HERMEX_REGISTRY_CACHE_TTL_MS']);
  const cacheOptions: CacheOptions = {
    ttlMs:
      Number.isFinite(envTtl) && envTtl > 0 ? envTtl : connection.cacheTtlMs,
    disabled:
      process.env['HERMEX_REGISTRY_CACHE_DISABLED'] === '1' ||
      connection.cacheDisabled === true,
  };

  // Process in batches of CONCURRENCY
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results: RegistryResult[] = await Promise.all(
      batch.map(async (pkg): Promise<RegistryResult> => {
        const info = await getPackageInfo(
          pkg.packageName,
          NPM_REGISTRY_URL,
          authToken,
          cacheOptions,
        );
        if (!info || !info.time) {
          skipped++;
          return { pkg, found: false };
        }

        const deprecated =
          info.versions?.[pkg.version!]?.deprecated ?? info.deprecated;

        const policy = resolvePolicy?.(pkg.packageName);

        // `undefined` (never populated — e.g. a hand-built PackageDistribution
        // in a test) is treated as "unknown, assume root" for backward
        // compatibility; only an explicit `null` — set by the real pipeline
        // when the lockfile layer confirms this isn't a direct dependency —
        // means "don't enforce this under root scope" (#62).
        const hasRootVersion = pkg.rootVersion !== null;

        const entry = policy
          ? computeReleaseAge(
              pkg.version!,
              pkg.allVersions,
              info.time,
              policy.thresholds,
              info['dist-tags'],
              policy.severity,
              policy.scope,
              hasRootVersion,
            )
          : undefined;

        return {
          pkg,
          found: true,
          deprecated: typeof deprecated === 'string' ? deprecated : undefined,
          entry,
        };
      }),
    );

    // Keyed on whether the FETCH succeeded, never on whether an entry was
    // computed: with release-age off there is no entry for any package, and
    // `if (!entry) continue` would silently discard every deprecation fact
    // this pass exists to collect (#107).
    for (const result of results) {
      if (!result.found) continue;
      const idx = enriched.findIndex(
        (p) => p.packageName === result.pkg.packageName,
      );
      if (idx === -1) continue;
      enriched[idx] = {
        ...enriched[idx],
        ...(result.deprecated !== undefined
          ? { deprecated: result.deprecated }
          : {}),
        ...(result.entry ? { releaseAge: result.entry } : {}),
      };
    }
  }

  return { enriched, skipped };
}
