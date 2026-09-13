import semver from 'semver';
import type { PackageDistribution } from '../utils/aggregator';
import type {
  PackageReleases,
  ReleaseInfo,
  ResolvedCopy,
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

/**
 * Every published release newer than `installedVersion`, oldest-first.
 *
 * No thresholds, no scope, no severity: which of these count as "overdue"
 * is the rule's question, and asking it here is what used to let a verdict
 * leak onto the packages payload (#189). Prereleases are dropped because
 * they are not upgrade candidates by npm convention — a fact about npm, not
 * a policy of this repo's.
 */
function releasesNewerThan(
  installedVersion: string,
  timeMap: Record<string, string>,
  latestVersion: string | undefined,
): ReleaseInfo[] {
  const newer: ReleaseInfo[] = [];

  for (const [version, dateStr] of Object.entries(timeMap)) {
    if (version === 'created' || version === 'modified') continue;
    if (!semver.valid(version)) continue;
    if (semver.prerelease(version)) continue;
    if (semver.lte(version, installedVersion)) continue;

    const semverBump = classifyBump(installedVersion, version);
    if (!semverBump) continue;

    newer.push({
      version,
      releasedDaysAgo: daysSince(dateStr),
      semverBump,
      ...(version === latestVersion ? { isLatest: true } : {}),
    });
  }

  // Oldest first: every consumer of this list walks it looking for the
  // longest-waiting release, so the order it wants is the order it gets.
  return newer.sort((a, b) => b.releasedDaysAgo - a.releasedDaysAgo);
}

/**
 * The facts for one package: every resolved copy, and what was published
 * after each.
 *
 * Both the root copy and any nested duplicates are listed, flagged but
 * unranked. Choosing which of them the verdict is measured against is the
 * `scope` decision and belongs to the rule — collapsing them here, as this
 * used to, meant the packages payload already encoded a policy answer (#57,
 * #189).
 */
export function computePackageReleases(
  installedVersion: string,
  allVersions: string[],
  rootVersion: string | null | undefined,
  timeMap: Record<string, string>,
  distTags: Record<string, string> | undefined,
): PackageReleases {
  const candidates =
    allVersions.length > 0
      ? Array.from(new Set(allVersions))
      : [installedVersion];
  if (!candidates.includes(installedVersion)) candidates.push(installedVersion);

  const latestVersion = distTags?.['latest'];
  const latestEntry = latestVersion ? timeMap[latestVersion] : undefined;

  // `undefined` (never populated — e.g. a hand-built PackageDistribution in
  // a test) means "unknown, assume root"; only an explicit `null`, set by
  // the lockfile layer, marks a package as definitively not a direct
  // dependency (#62).
  const isRootCopy = (version: string) =>
    rootVersion === null
      ? false
      : rootVersion === undefined
        ? version === installedVersion
        : version === rootVersion;

  const resolved: ResolvedCopy[] = candidates.map((version) => ({
    version,
    isRoot: isRootCopy(version),
    newer: releasesNewerThan(version, timeMap, latestVersion),
  }));

  // Root first when there is one, so a reader meets the copy they declared
  // before any nested duplicate.
  resolved.sort((a, b) => Number(b.isRoot) - Number(a.isRoot));

  return {
    resolved,
    latestVersion,
    latestReleasedDaysAgo: latestEntry ? daysSince(latestEntry) : undefined,
  };
}

/** Connection/infra settings only — no policy. Mirrors the now-trimmed
 * `releaseAge` config block (`src/config/schema.ts`). */
export interface ReleaseAgeConnection {
  authToken?: string;
  cacheTtlMs?: number;
  cacheDisabled: boolean;
}

/** What one package's registry lookup produced. `found` records whether the
 * fetch itself succeeded, which is deliberately separate from whether
 * release facts were computed — see the merge loop below. */
interface RegistryResult {
  pkg: PackageDistribution;
  found: boolean;
  deprecated?: string;
  releases?: PackageReleases;
}

/**
 * One registry pass, two outputs, neither of them a judgment. Deprecation
 * is an inventory fact; `PackageReleases` is the release timeline. Both
 * registry-backed rules read this same pass, so they cost one request per
 * installed package between them, not one each (#107).
 *
 * Takes no policy at all any more — no thresholds, no scope, no severity.
 * Whether to call this is the gate (`needsRegistry`); what the answer
 * *means* is the rule's, via `assessPackage`. That split is what keeps
 * `packages[]` identical across two repos with different thresholds and the
 * same lockfile (#189).
 */
export async function enrichFromRegistry(
  packages: PackageDistribution[],
  connection: ReleaseAgeConnection,
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

        return {
          pkg,
          found: true,
          deprecated: typeof deprecated === 'string' ? deprecated : undefined,
          releases: computePackageReleases(
            pkg.version!,
            pkg.allVersions,
            pkg.rootVersion,
            info.time,
            info['dist-tags'],
          ),
        };
      }),
    );

    // Keyed on whether the FETCH succeeded: a package the registry did not
    // answer for records nothing, while one it did records both facts, even
    // if no rule ends up judging either (#107).
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
        ...(result.releases ? { releases: result.releases } : {}),
      };
    }
  }

  return { enriched, skipped };
}
