import type { AggregatedReport } from './aggregator';
import type { RuleViolation } from '../rules/evaluator';
import type { BannedPackageViolation } from './package-rules';
import type { PackageDistribution } from './package-distribution';

export interface ComplianceResult {
  compliant: boolean;
  errorRuleViolations: RuleViolation[];
  errorBannedPackageViolations: BannedPackageViolation[];
  mandatoryReleaseAgeViolations: PackageDistribution[];
}

/**
 * A package is a mandatory compliance failure only when its releaseAge
 * severity is 'error' (i.e. it's in scope per `releaseAge.enforceOn`) AND
 * its worstLevel is 'mandatory_upgrade' — 'needs_upgrade' (patch/minor) is
 * advisory even for enforced packages, matching the existing "mandatory"
 * vocabulary already used by upgradeLevel().
 */
export function computeCompliance(
  aggregated: AggregatedReport,
): ComplianceResult {
  const errorRuleViolations = aggregated.ruleViolations.filter(
    (v) => v.severity === 'error',
  );
  const errorBannedPackageViolations =
    aggregated.bannedPackageViolations.filter((v) => v.severity === 'error');
  const mandatoryReleaseAgeViolations = aggregated.packageDistribution.filter(
    (p) =>
      p.releaseAge?.severity === 'error' &&
      p.releaseAge?.worstLevel === 'mandatory_upgrade',
  );

  return {
    compliant:
      errorRuleViolations.length === 0 &&
      errorBannedPackageViolations.length === 0 &&
      mandatoryReleaseAgeViolations.length === 0,
    errorRuleViolations,
    errorBannedPackageViolations,
    mandatoryReleaseAgeViolations,
  };
}
