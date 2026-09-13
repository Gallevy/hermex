import type {
  ResolvedHermexConfig,
  ResolvedRulesConfig,
} from '../config/types';
import type { PackageDistribution } from '../utils/aggregator';
import { enrichFromRegistry } from '../npm-registry/enricher';
import { detectDeprecatedPackages } from '../utils/package-rules';
import {
  evaluateReleaseAge,
  releaseAgeConnection,
  resolveReleaseAgeRule,
} from './release-age';
import type { RuleViolation } from './shared';

/**
 * Whether this repo's rules need the npm registry at all — the gate that
 * decides if a run makes network calls.
 *
 * Both registry-backed families are *explicitly* configured or off: their
 * implicit `['**']` baselines (`RELEASE_AGE_BASELINE`,
 * `DEPRECATED_PACKAGES_BASELINE`) set severity for packages the registry
 * was already consulted about, and are deliberately not a reason to consult
 * it. So an unconfigured `hermex scan` still makes zero requests.
 */
export function needsRegistry(rules: ResolvedRulesConfig): boolean {
  return (
    rules['release-age'].length > 0 ||
    rules['no-deprecated-packages'].length > 0
  );
}

/**
 * Runs every registry-backed rule off a single enrichment pass.
 *
 * `release-age` and `no-deprecated-packages` read different fields of the
 * same registry document, so they share one request per installed package
 * rather than paying for one each (#107). The release-age policy callback
 * is supplied only when that rule is actually configured — without it
 * `enrichFromRegistry` records the deprecation fact and skips the timeline
 * math entirely.
 *
 * Call only when `needsRegistry` is true; with both families empty this
 * would still iterate every package to produce nothing.
 */
export async function evaluateRegistryRules(
  packages: PackageDistribution[],
  config: ResolvedHermexConfig,
): Promise<{
  enriched: PackageDistribution[];
  violations: RuleViolation[];
  skipped: number;
}> {
  const releaseAgeRules = config.rules['release-age'];

  const { enriched, skipped } = await enrichFromRegistry(
    packages,
    releaseAgeConnection(config.releaseAge),
    releaseAgeRules.length > 0
      ? (packageName) => resolveReleaseAgeRule(packageName, releaseAgeRules)
      : undefined,
  );

  return {
    enriched,
    violations: [
      ...evaluateReleaseAge(enriched, releaseAgeRules),
      ...detectDeprecatedPackages(
        enriched,
        config.rules['no-deprecated-packages'],
      ),
    ],
    skipped,
  };
}
