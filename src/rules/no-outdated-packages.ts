import { resolveReleaseAgeRule } from '../config/overrides';
import type {
  ResolvedReleaseAgeRuleConfig,
  ReleaseAgeConfig,
  ReleaseAgeThresholds,
} from '../config/types';
import type { PackageDistribution } from '../utils/aggregator';
import type { ReleaseAgeConnection } from '../npm-registry/enricher';
import type {
  OverdueTier,
  PackageReleases,
  ResolvedCopy,
  SemverBump,
} from '../npm-registry/types';
import type { RuleViolation } from './shared';

export { resolveReleaseAgeRule };

/**
 * Narrows the `releaseAge` config block down to the connection/infra fields
 * the registry layer actually takes. Lives here rather than in the command
 * layer so nothing above the rules has to know that block's shape.
 */
export function releaseAgeConnection(
  config: ReleaseAgeConfig,
): ReleaseAgeConnection {
  return {
    authToken: config.authToken,
    cacheTtlMs: config.cacheTtlMs,
    cacheDisabled: config.cacheDisabled,
  };
}

/** A bump tier whose longest-waiting release has aged past its threshold. */
export interface BreachedTier {
  tier: OverdueTier;
  semverBump: SemverBump;
  /** Newest release in the tier — the version to name when nothing
   * still-in-window exists to recommend instead. */
  version: string;
  /** How far past the threshold the tier's longest-waiting release is. */
  daysOverdue: number;
  /** Age of that newest release — what ranks tiers against each other. */
  newestReleasedDaysAgo: number;
}

/** An upgrade that exists but has not yet aged past its tier's threshold. */
export interface PendingUpgrade {
  version: string;
  semverBump: SemverBump;
  releasedDaysAgo: number;
  thresholdDays: number;
  daysRemaining: number;
}

/** Thresholds applied to one installed copy. */
interface CopyVerdict {
  version: string;
  /** Worst tier first. */
  breaches: BreachedTier[];
  pendingUpgrade?: PendingUpgrade;
  /**
   * The oldest release still inside its tier's threshold — the least
   * disruptive upgrade that would actually satisfy the policy.
   *
   * Absent when no such release exists. There is deliberately no fallback
   * to `latest`: the old shape "recommended" latest with an
   * `inWindow: false` flag beside it saying the recommendation would not
   * clear the breach, a contradiction the display then had to decode (#26).
   * Absent means absent; callers wanting to name *some* newer version fall
   * back to the breached tier's own newest.
   */
  minimumUpgrade?: {
    version: string;
    semverBump: SemverBump;
    releasedDaysAgo: number;
  };
}

const TIER_RANK: Record<OverdueTier, number> = { minor: 1, major: 2 };

function tierOf(bump: SemverBump): OverdueTier {
  return bump === 'major' ? 'major' : 'minor';
}

/** The most severe tier breached by one copy, `null` when none is. */
function worstTier(verdict: CopyVerdict): OverdueTier | null {
  if (verdict.breaches.some((b) => b.tier === 'major')) return 'major';
  return verdict.breaches.length > 0 ? 'minor' : null;
}

function groupByBump(copy: ResolvedCopy) {
  const byBump = new Map<SemverBump, { version: string; daysAgo: number }[]>();
  for (const release of copy.newer) {
    const list = byBump.get(release.semverBump) ?? [];
    list.push({ version: release.version, daysAgo: release.releasedDaysAgo });
    byBump.set(release.semverBump, list);
  }
  return byBump;
}

function newestOf(versions: { version: string; daysAgo: number }[]) {
  return versions.reduce((a, b) => (a.daysAgo < b.daysAgo ? a : b));
}

/**
 * The soonest upcoming deadline, when nothing has breached yet. A package
 * already in violation on one tier does not also need an "N days remaining"
 * note about another.
 */
function pendingFor(
  byBump: Map<SemverBump, { version: string; daysAgo: number }[]>,
  thresholds: ReleaseAgeThresholds,
): PendingUpgrade | undefined {
  let pending: PendingUpgrade | undefined;
  for (const [bump, versions] of byBump.entries()) {
    const threshold = thresholds[bump];
    if (threshold === false || threshold === undefined) continue;

    const oldest = Math.max(...versions.map((v) => v.daysAgo));
    const daysRemaining = threshold - oldest;
    if (daysRemaining <= 0) continue;

    if (!pending || daysRemaining < pending.daysRemaining) {
      const newest = newestOf(versions);
      pending = {
        version: newest.version,
        semverBump: bump,
        releasedDaysAgo: newest.daysAgo,
        thresholdDays: threshold,
        daysRemaining,
      };
    }
  }
  return pending;
}

/**
 * Applies thresholds to one installed copy.
 *
 * A tier is breached when its *oldest* available release has aged past the
 * threshold — how long something has been sitting there unclaimed — while
 * the version reported is the tier's *newest*, which is what you would
 * actually upgrade to (#24).
 */
function assessCopy(
  copy: ResolvedCopy,
  thresholds: ReleaseAgeThresholds,
): CopyVerdict {
  const byBump = groupByBump(copy);
  const breaches: BreachedTier[] = [];
  let minimumUpgrade: CopyVerdict['minimumUpgrade'];
  let minimumUpgradeDaysAgo = -1;

  for (const [bump, versions] of byBump.entries()) {
    const threshold = thresholds[bump];
    if (threshold === false || threshold === undefined) continue;

    const oldest = Math.max(...versions.map((v) => v.daysAgo));
    if (oldest > threshold) {
      const newest = newestOf(versions);
      breaches.push({
        tier: tierOf(bump),
        semverBump: bump,
        version: newest.version,
        daysOverdue: oldest - threshold,
        newestReleasedDaysAgo: newest.daysAgo,
      });
    }

    // The oldest release still inside its window, across every tier — the
    // most battle-tested thing you could adopt and still be compliant (#21).
    for (const candidate of versions) {
      if (candidate.daysAgo > threshold) continue;
      if (candidate.daysAgo <= minimumUpgradeDaysAgo) continue;
      minimumUpgradeDaysAgo = candidate.daysAgo;
      minimumUpgrade = {
        version: candidate.version,
        semverBump: bump,
        releasedDaysAgo: candidate.daysAgo,
      };
    }
  }

  // Rank by the age of each tier's newest release, so the tier that has gone
  // longest without anyone taking even its freshest option leads.
  breaches.sort((a, b) => b.newestReleasedDaysAgo - a.newestReleasedDaysAgo);

  return {
    version: copy.version,
    breaches,
    minimumUpgrade,
    pendingUpgrade:
      breaches.length === 0 ? pendingFor(byBump, thresholds) : undefined,
  };
}

/**
 * One package's verdict — everything policy decides, and the only place it
 * is decided.
 *
 * Both consumers call this rather than reading a cached answer: the rule,
 * to emit violations, and the Packages table, to render the Minimum target
 * cell for rows no violation covers (an `'off'` entry still renders one).
 * That is what lets `PackageDistribution.releases` stay policy-free while
 * the table still shows a threshold-derived recommendation (#189).
 */
export interface PackageAssessment {
  /** The copy the verdict was measured against — the root one under
   * `scope: 'root'`, the worst offending one under `'tree'` (#57). */
  measuredVersion: string;
  /** `null` when nothing is overdue. */
  overdueTier: OverdueTier | null;
  /** How far past its threshold the governing tier is. 0 when compliant. */
  daysOverdue: number;
  /** Every breached tier of the governing copy, worst first — the detail
   * behind `overdueTier`, for callers that need to say *which* tiers. */
  breaches: BreachedTier[];
  /** What to upgrade to: the oldest still-compliant release when one
   * exists, else the breached tier's own newest. */
  target?: {
    version: string;
    semverBump: SemverBump;
    releasedDaysAgo: number;
  };
  /** Whether `target` would actually clear the breach. When false it is
   * merely the newest thing in the breached tier, and adopting it would
   * leave you overdue anyway (#26). */
  targetClearsBreach: boolean;
  pendingUpgrade?: PendingUpgrade;
  /** Copies the scope excluded that are themselves overdue. They never
   * block `comply`, but hiding them would let real problems pass unnoticed
   * just because policy does not enforce them (#57). */
  advisoryBreaches: { version: string; tier: OverdueTier }[];
}

/** Ranks two copies: worse tier first, then further past its threshold. */
function worseOf(a: CopyVerdict, b: CopyVerdict): CopyVerdict {
  const rank = (v: CopyVerdict) => {
    const tier = worstTier(v);
    return tier ? TIER_RANK[tier] : 0;
  };
  if (rank(a) !== rank(b)) return rank(a) > rank(b) ? a : b;
  return (a.breaches[0]?.daysOverdue ?? 0) >= (b.breaches[0]?.daysOverdue ?? 0)
    ? a
    : b;
}

export function assessPackage(
  releases: PackageReleases,
  policy: { thresholds: ReleaseAgeThresholds; scope: 'root' | 'tree' },
): PackageAssessment {
  const verdicts = releases.resolved.map((copy) =>
    assessCopy(copy, policy.thresholds),
  );

  // Scope decides which copies count. It is applied here, never upstream:
  // the facts list every resolved copy neutrally, so the same payload
  // serves a repo enforcing 'root' and one enforcing 'tree' (#189).
  const enforcedIndexes = releases.resolved
    .map((copy, i) => ({ copy, i }))
    .filter(({ copy }) => policy.scope === 'tree' || copy.isRoot)
    .map(({ i }) => i);

  const enforced = enforcedIndexes.map((i) => verdicts[i]);

  const advisoryBreaches = verdicts
    .filter((_, i) => !enforcedIndexes.includes(i))
    .flatMap((verdict) => {
      const tier = worstTier(verdict);
      return tier ? [{ version: verdict.version, tier }] : [];
    });

  // No enforced baseline at all — e.g. `scope: 'root'` on a package only
  // ever pulled in transitively (#62). Nothing can fail comply for it; the
  // advisory list above still keeps its overdue copies visible.
  if (enforced.length === 0) {
    return {
      measuredVersion: releases.resolved[0]?.version ?? '',
      overdueTier: null,
      daysOverdue: 0,
      breaches: [],
      targetClearsBreach: false,
      advisoryBreaches,
    };
  }

  const governing = enforced.reduce(worseOf);
  const top = governing.breaches[0];
  const minimum = governing.minimumUpgrade;
  const target =
    minimum ??
    (top
      ? {
          version: top.version,
          semverBump: top.semverBump,
          releasedDaysAgo: top.newestReleasedDaysAgo,
        }
      : undefined);

  return {
    measuredVersion: governing.version,
    overdueTier: worstTier(governing),
    daysOverdue: top?.daysOverdue ?? 0,
    breaches: governing.breaches,
    target,
    targetClearsBreach: minimum !== undefined,
    pendingUpgrade: governing.pendingUpgrade,
    advisoryBreaches,
  };
}

/**
 * Evaluates the `no-outdated-packages` rule over packages already enriched
 * with registry facts: resolves which entry governs each one
 * (`resolveReleaseAgeRule`, last-match-wins against the implicit `['**']`
 * baseline), assesses it against that entry's thresholds and scope, and —
 * unless the entry's severity is `'off'` — emits one atomic violation.
 *
 * Pure and synchronous. The registry I/O lives in `enrichFromRegistry`,
 * shared with `no-deprecated-packages` so the two cost one request per
 * package between them (#107).
 */
export function evaluateOutdatedPackages(
  packages: PackageDistribution[],
  rules: ResolvedReleaseAgeRuleConfig[],
): RuleViolation[] {
  if (rules.length === 0) return [];

  const violations: RuleViolation[] = [];
  for (const pkg of packages) {
    if (!pkg.releases) continue;

    // Severity comes from the governing entry, never from the facts — an
    // 'off' entry still carries full release data for the table to render,
    // it just never becomes a violation (#189).
    const rule = resolveReleaseAgeRule(pkg.packageName, rules);
    if (rule.severity === 'off') continue;

    const assessment = assessPackage(pkg.releases, rule);
    if (assessment.overdueTier === null) continue;

    violations.push({
      ruleId: 'no-outdated-packages',
      severity: rule.severity,
      patterns: rule.patterns,
      message: rule.message,
      packageName: pkg.packageName,
      measuredVersion: assessment.measuredVersion,
      overdueTier: assessment.overdueTier,
      daysOverdue: assessment.daysOverdue,
      scope: rule.scope,
    });
  }

  return violations;
}
