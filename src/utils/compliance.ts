import type { AggregatedReport } from './aggregator';
import type { RuleViolation } from '../rules/evaluator';
import type { PackageDistribution } from './package-distribution';

/**
 * The canonical, three-state compliance verdict hermex publishes so
 * downstream consumers (sheet sync, CI dashboards) don't have to invent
 * their own mapping over the raw JSON and disagree with `comply` (#55):
 *
 * - `non-compliant` — has at least one mandatory (error) violation; exactly
 *   `compliant === false`, the same condition `comply` exits non-zero on.
 * - `warning` — passes `comply`, but the policy author flagged something at
 *   `warn` severity: a warn-severity rule or banned-package violation.
 * - `compliant` — no mandatory violations and nothing flagged at `warn`.
 */
export type ComplianceStatus = 'compliant' | 'warning' | 'non-compliant';

export interface ComplianceResult {
  compliant: boolean;
  status: ComplianceStatus;
  /** Every error-severity rule violation, whatever its `type`. */
  errorRuleViolations: RuleViolation[];
  releaseAgeViolations: PackageDistribution[];
  /** Every warn-severity rule violation, whatever its `type`. */
  warningRuleViolations: RuleViolation[];
}

/**
 * A package is a compliance failure when its releaseAge severity is 'error'
 * (i.e. it's in scope per `releaseAge.enforceOn`) AND it has any breached
 * threshold at all (worstLevel is non-null) — both 'minor_overdue' and
 * 'major_overdue' fail comply for an enforced package; only severity
 * decides mandatory vs advisory, not which tier breached (#28).
 *
 * The `warning` tier is deliberately narrow: it covers only warn-severity
 * *rule* violations — signals the policy author opted into. Severity alone
 * decides the bucket; the rule's `type` never does. A non-enforced
 * (severity 'warn') overdue
 * release-age package or a not-yet-due `pendingUpgrade` is advisory data,
 * not a warning, and must not on its own demote `compliant` → `warning`.
 * Consumers that treated any non-blocking outdated row as Warning disagreed
 * with `comply`; reading `status` here is the fix (#55).
 */
export function computeCompliance(
  aggregated: AggregatedReport,
): ComplianceResult {
  const errorRuleViolations = aggregated.ruleViolations.filter(
    (v) => v.severity === 'error',
  );
  const releaseAgeViolations = aggregated.packageDistribution.filter(
    (p) =>
      p.releaseAge?.severity === 'error' && p.releaseAge?.worstLevel !== null,
  );
  const warningRuleViolations = aggregated.ruleViolations.filter(
    (v) => v.severity === 'warn',
  );

  const compliant =
    errorRuleViolations.length === 0 && releaseAgeViolations.length === 0;

  const status: ComplianceStatus = !compliant
    ? 'non-compliant'
    : warningRuleViolations.length > 0
      ? 'warning'
      : 'compliant';

  return {
    compliant,
    status,
    errorRuleViolations,
    releaseAgeViolations,
    warningRuleViolations,
  };
}

/**
 * The count behind the "N mandatory violations found" line both the terminal
 * verdict and `--summary-file` print — a display concern, which is why it
 * lives here rather than in the emitted JSON (consumers read `compliant`, or
 * add the buckets themselves; they're disjoint).
 *
 * Shared by those two renderers because they had this sum copied between
 * them, and both got it wrong the same way when `forbid_packages` moved into
 * `ruleViolations` (#77): each was still adding a separate banned-package
 * bucket that now overlapped, double-reporting every forbidden package.
 */
export function countMandatoryViolations(result: ComplianceResult): number {
  return result.errorRuleViolations.length + result.releaseAgeViolations.length;
}
