import type { AggregatedReport } from './aggregator';
import type { RuleViolation } from '../rules/evaluator';
import type { BannedPackageViolation } from './package-rules';
import type { PackageDistribution } from './package-distribution';

export interface ComplianceResult {
  compliant: boolean;
  errorRuleViolations: RuleViolation[];
  errorBannedPackageViolations: BannedPackageViolation[];
  releaseAgeViolations: PackageDistribution[];
}

/**
 * A package is a compliance failure when its releaseAge severity is 'error'
 * (i.e. it's in scope per `releaseAge.enforceOn`) AND it has any breached
 * threshold at all (worstLevel is non-null) — both 'minor_overdue' and
 * 'major_overdue' fail comply for an enforced package; only severity
 * decides mandatory vs advisory, not which tier breached (#28).
 */
export function computeCompliance(
  aggregated: AggregatedReport,
): ComplianceResult {
  const errorRuleViolations = aggregated.ruleViolations.filter(
    (v) => v.severity === 'error',
  );
  const errorBannedPackageViolations =
    aggregated.bannedPackageViolations.filter((v) => v.severity === 'error');
  const releaseAgeViolations = aggregated.packageDistribution.filter(
    (p) =>
      p.releaseAge?.severity === 'error' && p.releaseAge?.worstLevel !== null,
  );

  return {
    compliant:
      errorRuleViolations.length === 0 &&
      errorBannedPackageViolations.length === 0 &&
      releaseAgeViolations.length === 0,
    errorRuleViolations,
    errorBannedPackageViolations,
    releaseAgeViolations,
  };
}
