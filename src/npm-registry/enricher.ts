import semver from 'semver';
import type { PackageDistribution } from '../utils/aggregator';
import type { ReleaseAgeThresholds } from '../config/types';
import type {
  AvailableUpgrade,
  OverdueTier,
  PendingUpgrade,
  RecommendedTarget,
  ReleaseAgeEntry,
  SemverBump,
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

/** Whether this tier's oldest available release has aged past its
 * threshold. A tier with no configured threshold (`false`/absent) can never
 * breach. */
function isBreached(
  daysAgo: number,
  bump: SemverBump,
  thresholds: ReleaseAgeThresholds,
): boolean {
  const threshold = thresholds[bump];
  if (threshold === false || threshold === undefined) return false;
  return daysAgo > threshold;
}

/**
 * The overdue tier implied by a set of breached upgrades — `null` when
 * nothing breached.
 *
 * Internal to the "which installed copy is worst" comparison below. The
 * *verdict* of the same shape is the rule's to publish
 * (`deriveOverdueTier`, `src/rules/no-outdated-packages.ts`); this is the
 * same derivation reused for ranking, deliberately not exported, so the
 * facts layer never hands a caller something verdict-shaped (#189).
 */
function tierOf(upgrades: AvailableUpgrade[]): OverdueTier | null {
  if (upgrades.some((u) => u.semverBump === 'major')) return 'major';
  return upgrades.length > 0 ? 'minor' : null;
}

interface ReleaseAgeForVersion {
  upgrades: AvailableUpgrade[];
  pendingUpgrade?: PendingUpgrade;
  latestVersion?: string;
  latestReleasedDaysAgo?: number;
  recommendedTarget?: RecommendedTarget;
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
  let inWindowVersion: string | undefined;
  let inWindowDaysAgo: number | undefined;
  let inWindowBump: SemverBump | undefined;

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
      (inWindowDaysAgo === undefined || daysAgo > inWindowDaysAgo)
    ) {
      inWindowVersion = version;
      inWindowDaysAgo = daysAgo;
      inWindowBump = bump;
    }
  }

  // A bump tier is "breached" if its oldest available version is older than the
  // tier's threshold — report the newest version in that tier as the upgrade
  // target, not the version that happened to trigger the breach.
  const upgrades: AvailableUpgrade[] = [];
  for (const [bump, versions] of byBump.entries()) {
    const oldestDaysAgo = Math.max(...versions.map((v) => v.daysAgo));
    if (!isBreached(oldestDaysAgo, bump, thresholds)) continue;

    const newest = pickNewest(versions);
    upgrades.push({
      version: newest.version,
      releasedDaysAgo: newest.daysAgo,
      breachReleasedDaysAgo: oldestDaysAgo,
      semverBump: bump,
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

  for (const upgrade of finalUpgrades) {
    if (latestVersion && upgrade.version === latestVersion) {
      upgrade.isLatest = true;
    }
  }

  // If nothing newer than installed ever fell inside its tier's threshold,
  // the only real landing spot is latest — recommend it even though it is
  // itself past the window, flagged `inWindow: false` so the display can say
  // there is nothing that would actually clear the breach (#26). That
  // fallback is a recommendation, never an all-clear: a package with
  // breached upgrades stays overdue regardless, which is why the verdict is
  // derived from `upgrades` and never from this (#29).
  let recommendedTarget: RecommendedTarget | undefined;
  if (inWindowVersion !== undefined && inWindowDaysAgo !== undefined) {
    recommendedTarget = {
      version: inWindowVersion,
      releasedDaysAgo: inWindowDaysAgo,
      semverBump: inWindowBump,
      inWindow: true,
    };
  } else if (
    latestVersion &&
    latestReleasedDaysAgo !== undefined &&
    !semver.prerelease(latestVersion) &&
    semver.gt(latestVersion, installedVersion)
  ) {
    recommendedTarget = {
      version: latestVersion,
      releasedDaysAgo: latestReleasedDaysAgo,
      inWindow: false,
    };
  }

  // Only surface a "coming due" advisory when nothing has breached yet — a
  // package that's already in violation on one tier doesn't also need an
  // "N days remaining" note about another, unbreached tier.
  let pendingUpgrade: PendingUpgrade | undefined;
  if (finalUpgrades.length === 0) {
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
    pendingUpgrade,
    latestVersion,
    latestReleasedDaysAgo,
    recommendedTarget,
  };
}

const TIER_RANK: Record<'null' | OverdueTier, number> = {
  null: 0,
  minor: 1,
  major: 2,
};

function tierRank(tier: OverdueTier | null): number {
  return TIER_RANK[tier ?? 'null'];
}

/** A vacuous "nothing enforced" result — no upgrades regardless of what the
 * registry timeline says, since there is no enforced baseline to measure
 * against. */
const NOTHING_ENFORCED: ReleaseAgeForVersion = {
  upgrades: [],
};

/**
 * Resolves which of `allVersions` count toward compliance ('root': just
 * `installedVersion`, and only when `hasRootVersion` confirms it's a real
 * direct dependency — not the "fell back to the highest resolved version"
 * placeholder for a purely transitive package (#62); 'tree': every
 * resolved copy). Evaluates each candidate independently via
 * `computeReleaseAgeForVersion`, and combines them into a single set of
 * facts — those of the worst-off enforced version — while still surfacing
 * overdue-but-not-enforced copies via `advisoryBreaches` regardless of
 * scope (#57).
 *
 * `scope` and `thresholds` are inputs because the arithmetic genuinely
 * needs them: you cannot say which copies count, or which tier is past its
 * line, without them. Severity is not an input — nothing here varies by how
 * hard a policy is enforced, and stamping it onto the result was what let
 * the display read a verdict off the facts (#189).
 */
export function computeReleaseAge(
  installedVersion: string,
  allVersions: string[],
  timeMap: Record<string, string>,
  thresholds: ReleaseAgeThresholds,
  distTags: Record<string, string> | undefined,
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
      const candidateRank = tierRank(tierOf(candidate.upgrades));
      const baselineRank = tierRank(tierOf(baseline.upgrades));
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

  const advisoryBreaches: { version: string; tier: OverdueTier }[] = [];
  for (const version of candidates) {
    if (enforcedVersions.includes(version)) continue;
    const tier = tierOf(perVersion.get(version)!.upgrades);
    if (tier) advisoryBreaches.push({ version, tier });
  }

  return {
    measuredVersion: baselineVersion,
    upgrades: baseline.upgrades,
    pendingUpgrade: baseline.pendingUpgrade,
    latestVersion: baseline.latestVersion,
    latestReleasedDaysAgo: baseline.latestReleasedDaysAgo,
    recommendedTarget: baseline.recommendedTarget,
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

/**
 * The inputs the timeline arithmetic needs from a package's resolved
 * policy — from `resolveReleaseAgeRule` (`src/config/overrides.ts`), one
 * per package, already picked from whichever rule entry governs it.
 *
 * Severity is deliberately absent: it changes nothing here, and only the
 * rule needs it, to decide whether a breach becomes a violation (#189).
 */
export interface ReleaseAgePolicy {
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
