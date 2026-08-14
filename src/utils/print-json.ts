import type { AggregatedReport } from './aggregator';
import type { ComplianceResult } from './compliance';
import { computeCompliance } from './compliance';
import { getVersion } from './version';

/**
 * Emits the scan/comply JSON. The `compliance` block is the official,
 * machine-readable verdict — `status` (`compliant` | `warning` |
 * `non-compliant`) plus the per-bucket counts that explain it — so consumers
 * read one canonical field instead of re-deriving a status from `packages` /
 * `ruleViolations` and drifting from `comply` (#55). `compliant` mirrors the
 * CLI exit code (0 ⇔ true); `status: 'warning'` never changes that exit code.
 *
 * `ruleViolations` is the single list of every rule hit, `no-packages`
 * included (#77) — there is no second violations field to remember to read.
 *
 * Every top-level key besides `version`, `summary` and `compliance` is a
 * per-item dataset. `patternCounts` sits under `summary` rather than beside
 * them (#80) because it is aggregate statistics — the same kind of number as
 * `totalImports` next to it, just broken down by pattern type.
 *
 * `compliance` defaults to `computeCompliance(aggregated)` so `scan --format
 * json` carries the same verdict as `comply`; callers that already computed
 * it (comply) pass it through to avoid recomputing.
 */
export function printJson(
  aggregated: AggregatedReport,
  compliance: ComplianceResult = computeCompliance(aggregated),
): void {
  const result = {
    version: getVersion(),
    summary: {
      filesAnalyzed: aggregated.filesAnalyzed,
      totalImports: aggregated.totalImports,
      totalComponents: aggregated.totalComponents,
      totalUsagePatterns: aggregated.totalUsagePatterns,
      patternCounts: aggregated.patternCounts,
    },
    packages: aggregated.packageDistribution,
    components: aggregated.topComponents.map((c) => ({
      ...c,
      files: [...c.files],
    })),
    versus: aggregated.versusResults,
    ruleViolations: aggregated.ruleViolations,
    compliance: {
      status: compliance.status,
      compliant: compliance.compliant,
      counts: {
        errorRuleViolations: compliance.errorRuleViolations.length,
        releaseAgeViolations: compliance.releaseAgeViolations.length,
        warningRuleViolations: compliance.warningRuleViolations.length,
      },
    },
  };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
