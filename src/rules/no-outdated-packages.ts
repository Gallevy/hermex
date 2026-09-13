import { resolveReleaseAgeRule } from '../config/overrides';
import type {
  ResolvedReleaseAgeRuleConfig,
  ReleaseAgeConfig,
} from '../config/types';
import type { PackageDistribution } from '../utils/aggregator';
import type { ReleaseAgeConnection } from '../npm-registry/enricher';
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
    const entry = pkg.releaseAge;
    if (!entry || entry.worstLevel === null) continue;
    if (entry.severity === 'off') continue;

    const rule = resolveReleaseAgeRule(pkg.packageName, rules);
    violations.push({
      ruleId: 'no-outdated-packages',
      severity: entry.severity,
      patterns: rule.patterns,
      message: rule.message,
      packageName: pkg.packageName,
      installedVersion: entry.installedVersion,
      worstLevel: entry.worstLevel,
      scope: entry.scope,
    });
  }

  return violations;
}
