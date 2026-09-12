import { resolveReleaseAgeRule } from '../config/overrides';
import type {
  ResolvedReleaseAgeRuleConfig,
  ReleaseAgeConfig,
} from '../config/types';
import type { PackageDistribution } from '../utils/aggregator';
import {
  enrichWithReleaseAge,
  type ReleaseAgeConnection,
} from '../npm-registry/enricher';
import type { RuleViolation } from './shared';

export { resolveReleaseAgeRule };

/**
 * Evaluates the `release-age` rule: for every package with an installed
 * version, resolves which rule entry governs it (`resolveReleaseAgeRule`,
 * last-match-wins against the implicit `['**']` baseline), fetches its
 * registry timeline, and — when the governing entry's severity isn't
 * `'off'` and the package has actually breached its threshold — emits one
 * atomic `ReleaseAgeViolation`. `PackageDistribution.releaseAge` is
 * populated for every package regardless (the Packages table's display
 * data), independent of whether a violation was also produced.
 *
 * Off entirely when `rules['release-age']` is empty for this repo — no
 * registry calls, no `PackageDistribution.releaseAge`. Call sites should
 * skip calling this at all in that case rather than relying on an empty
 * result, since even one call still pays for iterating `packages`.
 */
export async function evaluateReleaseAge(
  packages: PackageDistribution[],
  releaseAgeConfig: ReleaseAgeConfig,
  rules: ResolvedReleaseAgeRuleConfig[],
): Promise<{
  enriched: PackageDistribution[];
  violations: RuleViolation[];
  skipped: number;
}> {
  if (rules.length === 0) {
    return { enriched: packages, violations: [], skipped: 0 };
  }

  const connection: ReleaseAgeConnection = {
    authToken: releaseAgeConfig.authToken,
    cacheTtlMs: releaseAgeConfig.cacheTtlMs,
    cacheDisabled: releaseAgeConfig.cacheDisabled,
  };

  const { enriched, skipped } = await enrichWithReleaseAge(
    packages,
    connection,
    (packageName) => resolveReleaseAgeRule(packageName, rules),
  );

  const violations: RuleViolation[] = [];
  for (const pkg of enriched) {
    const entry = pkg.releaseAge;
    if (!entry || entry.worstLevel === null) continue;
    if (entry.severity === 'off') continue;

    const rule = resolveReleaseAgeRule(pkg.packageName, rules);
    violations.push({
      ruleId: 'release-age',
      severity: entry.severity,
      patterns: rule.patterns,
      message: rule.message,
      packageName: pkg.packageName,
      installedVersion: entry.installedVersion,
      worstLevel: entry.worstLevel,
      scope: entry.scope,
      deprecated: entry.deprecated,
    });
  }

  return { enriched, violations, skipped };
}
