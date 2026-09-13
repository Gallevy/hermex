import type { AggregatedReport } from './aggregator';
import type { RuleViolation } from '../rules/evaluator';
import { groupBySeverity } from './severity-format';

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
  /** Every error-severity rule violation, whatever its `type` — release-age
   * included, now that it's a rule like any other (#93 superseded). */
  errorRuleViolations: RuleViolation[];
  /** Every warn-severity rule violation, whatever its `type`. */
  warningRuleViolations: RuleViolation[];
}

/**
 * A package is a compliance failure when its governing `release-age` rule
 * entry resolves to severity 'error' AND it has any breached threshold at
 * all (worstLevel is non-null) — both 'minor_overdue' and 'major_overdue'
 * fail comply for an enforced package; only severity decides mandatory vs
 * advisory, not which tier breached (#28). This is no longer special-cased
 * here at all: `ReleaseAgeViolation`s are ordinary `RuleViolation`s in
 * `aggregated.ruleViolations` (`src/rules/release-age.ts`), so they fall
 * out of the same severity grouping as every other rule.
 *
 * The `warning` tier is deliberately narrow: it covers only warn-severity
 * *rule* violations — signals the policy author opted into. Severity alone
 * decides the bucket; the rule's `type` never does. A non-enforced
 * (severity 'warn') overdue release-age package or a not-yet-due
 * `pendingUpgrade` is advisory data, not a warning, and must not on its own
 * demote `compliant` → `warning`. Consumers that treated any non-blocking
 * outdated row as Warning disagreed with `comply`; reading `status` here is
 * the fix (#55).
 */
export function computeCompliance(
  aggregated: AggregatedReport,
): ComplianceResult {
  const { error: errorRuleViolations, warn: warningRuleViolations } =
    groupBySeverity(aggregated.ruleViolations);

  const compliant = errorRuleViolations.length === 0;

  const status: ComplianceStatus = !compliant
    ? 'non-compliant'
    : warningRuleViolations.length > 0
      ? 'warning'
      : 'compliant';

  return {
    compliant,
    status,
    errorRuleViolations,
    warningRuleViolations,
  };
}

/**
 * The count behind the "N mandatory violations found" line both the terminal
 * verdict and `--summary-file` print — a display concern, which is why it
 * lives here rather than in the emitted JSON (consumers read `compliant`, or
 * add the buckets themselves; they're disjoint).
 */
export function countMandatoryViolations(result: ComplianceResult): number {
  return result.errorRuleViolations.length;
}
