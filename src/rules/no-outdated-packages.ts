import { resolveReleaseAgeRule } from '../config/overrides';
import type {
  ResolvedReleaseAgeRuleConfig,
  ReleaseAgeConfig,
} from '../config/types';
import type { PackageDistribution } from '../utils/aggregator';
import type { ReleaseAgeConnection } from '../npm-registry/enricher';
import type { AvailableUpgrade, OverdueTier } from '../npm-registry/types';
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

/**
 * The rule's verdict for one package: which semver tier it is overdue on,
 * or `null` when nothing is.
 *
 * Derived from the facts rather than stored beside them. `upgrades` holds
 * *breached tiers only*, so its emptiness already answers "is anything
 * overdue" — a stored `worstLevel` was a second copy of that answer living
 * on the registry's output, which is what let the display read a verdict
 * off the facts object (#189).
 *
 * A breached patch tier reports `'minor'`: `OverdueTier` has no `'patch'`
 * member, because the tier names how far the upgrade moves you and patch
 * and minor are the same answer to "is this breaking".
 */
export function deriveOverdueTier(
  upgrades: readonly AvailableUpgrade[],
): OverdueTier | null {
  if (upgrades.some((u) => u.semverBump === 'major')) return 'major';
  return upgrades.length > 0 ? 'minor' : null;
}

/**
 * Evaluates the `no-outdated-packages` rule over packages already enriched by
 * `enrichFromRegistry`: for each one that breached its threshold, resolves
 * which rule entry governs it (`resolveReleaseAgeRule`, last-match-wins
 * against the implicit `['**']` baseline) and — unless that entry's
 * severity is `'off'` — emits one atomic `NoOutdatedPackagesViolation`.
 *
 * Pure and synchronous. The registry I/O it used to own now lives in
 * `enrichFromRegistry`, shared with `no-deprecated-packages` so the two
 * registry-backed rules cost one request per package between them (#107).
 * `PackageDistribution.releaseAge` is populated for every package
 * regardless of whether a violation was also produced — it's the Packages
 * table's display data, not a verdict.
 */
export function evaluateOutdatedPackages(
  packages: PackageDistribution[],
  rules: ResolvedReleaseAgeRuleConfig[],
): RuleViolation[] {
  if (rules.length === 0) return [];

  const violations: RuleViolation[] = [];
  for (const pkg of packages) {
    const tier = pkg.releaseAge && deriveOverdueTier(pkg.releaseAge.upgrades);
    if (!tier) continue;

    // Severity comes from the governing entry, not from the facts — an
    // 'off' entry still carries a full `releaseAge` for the table to
    // render, it just never becomes a violation (#189).
    const rule = resolveReleaseAgeRule(pkg.packageName, rules);
    if (rule.severity === 'off') continue;

    violations.push({
      ruleId: 'no-outdated-packages',
      severity: rule.severity,
      patterns: rule.patterns,
      message: rule.message,
      packageName: pkg.packageName,
      measuredVersion: pkg.releaseAge!.measuredVersion,
      overdueTier: tier,
      scope: rule.scope,
    });
  }

  return violations;
}
