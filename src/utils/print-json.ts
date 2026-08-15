import type { AggregatedReport } from './aggregator';
import type { ComplianceResult } from './compliance';
import type { OutputConfig } from '../config/types';
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
 * The `output.*` section toggles apply here exactly as they do to the human
 * printers (#63, #91) — a dataset switched off is *omitted*, not emptied, so
 * disabling it actually shrinks the payload (`components[]` and `packages[]`
 * dominate the file size of a stored scan). The split:
 *
 * - `output.packages: false` drops `packages`
 * - `output.components: false` drops `components`
 * - `output.versus: false` drops `versus`
 * - `output.patterns: false` drops `summary.patternCounts`
 *
 * `version`, the `summary` counters, `ruleViolations` and `compliance` are
 * never gated: together they are the machine-readable verdict, and `comply`'s
 * human path prints rules unconditionally too, so honouring `output.rules`
 * here would make JSON *lossier* than the terminal it mirrors — a silent way
 * to blind CI. `output.details` and `output.summary` have no JSON counterpart
 * (per-file details are not serialized; the counters are always present).
 *
 * `compliance` defaults to `computeCompliance(aggregated)` so `scan --format
 * json` carries the same verdict as `comply`; callers that already computed
 * it (comply) pass it through to avoid recomputing.
 */
export function printJson(
  aggregated: AggregatedReport,
  output: OutputConfig,
  compliance: ComplianceResult = computeCompliance(aggregated),
): void {
  const result = {
    version: getVersion(),
    summary: {
      filesAnalyzed: aggregated.filesAnalyzed,
      totalImports: aggregated.totalImports,
      totalComponents: aggregated.totalComponents,
      totalUsagePatterns: aggregated.totalUsagePatterns,
      ...(output.patterns ? { patternCounts: aggregated.patternCounts } : {}),
    },
    ...(output.packages ? { packages: aggregated.packageDistribution } : {}),
    ...(output.components
      ? {
          components: aggregated.topComponents.map((c) => ({
            ...c,
            files: [...c.files],
          })),
        }
      : {}),
    ...(output.versus ? { versus: aggregated.versusResults } : {}),
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
