import { writeFileSync } from 'node:fs';
import type { AggregatedReport } from './aggregator';
import type { ComplianceResult } from './compliance';
import { countMandatoryViolations } from './compliance';
import { buildRuleRows } from './print-rules';
import {
  describeMinimumTarget,
  resolveInstalledVersion,
} from './print-packages';
import { collectPackageFlags, formatPackageFlags } from './package-flags';
import {
  formatSeverityTally,
  severityIcon,
  sortViolationsBySeverity,
  stripAnsi,
} from './severity-format';

// A table, mirroring the Packages section below it, rather than a bullet
// list — same shape, same scanability, in both output surfaces.
function buildRulesSection(aggregated: AggregatedReport): string {
  // Info-severity rows are excluded here (unlike the terminal `printRules`,
  // which shows everything) — a summary meant for a PR comment or job
  // summary should only surface what's actually enforceable (#31).
  const ruleViolations = sortViolationsBySeverity(
    aggregated.ruleViolations.filter((v) => v.severity !== 'info'),
  );

  // Nothing to report — omit the section entirely, matching
  // buildPackagesSection below. The verdict section always states pass/fail
  // clearly; a "### Rules / All rule checks passed" block with zero rows
  // is boilerplate indistinguishable from "no rules were ever configured."
  if (ruleViolations.length === 0) {
    return '';
  }

  const rows = buildRuleRows(ruleViolations);
  if (rows.length === 0) return '';

  const lines: string[] = [
    '### Rules',
    '',
    '| | Rule | Description |',
    '|---|---|---|',
  ];

  // `buildRuleRows`'s `description` never includes the icon — kept in its
  // own leading column here, same as the Packages table below, rather than
  // embedded inline the way the terminal table (single Description column)
  // renders it.
  for (const row of rows) {
    lines.push(
      `| ${severityIcon(row.severity)} | ${row.rule} | ${row.description} |`,
    );
  }

  // Tallies `rows`, not `ruleViolations` — same reasoning as `printRules`:
  // the count must equal what's rendered above it (#88), and release-age
  // never renders a row here even though it's still an (info-filtered-out)
  // member of `ruleViolations`.
  lines.push('', formatSeverityTally(rows));

  return lines.join('\n') + '\n';
}

// Mandatory release-age failures, found by filtering `ruleViolations` for
// error-severity `release-age` hits and joining back to
// `packageDistribution` by `packageName` for the rich upgrade-target detail
// — the same join `findForbidViolation` (`print-packages.ts`) already uses
// for `no-packages`. Release-age violations no longer have their own bucket
// on `ComplianceResult` (#93 superseded — they're ordinary `RuleViolation`s
// now), so this is the direct replacement for the old
// `compliance.releaseAgeViolations` read. Banned and deprecated-only/
// not-enforced packages don't get a row here: banned ones are already shown
// in Rules as a no-packages line, and deprecated-only or not-enforced
// overdue packages are info-level, not enforceable (#31).
//
// Bundle-impact (multiple resolved copies) and advisory nested breaches are
// deliberately NOT included here — they're non-blocking context, and a
// summary meant for a PR comment or CI check reads any colored row/line as
// something that needs attention. That context belongs in the human
// `--format human` table (stdout), not in a surface used for gating (#59).
//
// A mandatory `no-deprecated-packages` hit doesn't get a row of its own
// here either, for the same reason banned packages don't: it renders an
// ordinary row in the Rules section above, which release-age never does.
// The Flags column below still carries it as a cross-reference on the
// rows that ARE listed.
function buildPackagesSection(aggregated: AggregatedReport): string {
  const failingPackageNames = new Set(
    aggregated.ruleViolations
      .filter(
        (v): v is Extract<typeof v, { ruleId: 'release-age' }> =>
          v.ruleId === 'release-age' && v.severity === 'error',
      )
      .map((v) => v.packageName),
  );
  if (failingPackageNames.size === 0) return '';

  const mandatory = aggregated.packageDistribution.filter((pkg) =>
    failingPackageNames.has(pkg.packageName),
  );

  const lines: string[] = [
    '### Packages',
    '',
    '| | Package | Installed | Minimum target | Flags |',
    '|---|---|---|---|---|',
  ];
  // The target cell comes from the same function the human table renders,
  // rather than re-deriving it from the same two helpers — which makes
  // #57's "both surfaces recommend the same version" a structural
  // property instead of two call sites kept in step by hand.
  for (const pkg of mandatory) {
    const flags = formatPackageFlags(
      collectPackageFlags(pkg, aggregated.ruleViolations),
    );
    lines.push(
      `| ${severityIcon('error')} | \`${pkg.packageName}\` | ${resolveInstalledVersion(pkg)} | ${describeMinimumTarget(pkg.releaseAge)} | ${flags} |`,
    );
  }

  return lines.join('\n') + '\n';
}

function buildVerdictSection(compliance: ComplianceResult): string {
  if (compliance.compliant) {
    return `### ${severityIcon('success')} Compliant\n`;
  }

  const mandatoryCount = countMandatoryViolations(compliance);

  return `### ${severityIcon('error')} Not compliant\n\n${mandatoryCount} mandatory violation${mandatoryCount > 1 ? 's' : ''} found\n`;
}

export const DEFAULT_SUMMARY_TITLE = 'Hermex Compliance Report';

/**
 * Writes a concise, ANSI-free markdown summary (title, rules, mandatory
 * package violations, verdict) for CI surfaces that can't render the full
 * human report — a sticky PR comment or job summary (#31). Omits Versus and
 * progress chrome by construction; never touches ora or the Versus renderer.
 */
export function writeSummaryFile(
  path: string,
  aggregated: AggregatedReport,
  compliance: ComplianceResult,
  title: string = DEFAULT_SUMMARY_TITLE,
): void {
  const sections = [
    `# ${title}\n`,
    buildRulesSection(aggregated),
    buildPackagesSection(aggregated),
    buildVerdictSection(compliance),
  ].filter((section) => section.length > 0);

  writeFileSync(path, stripAnsi(sections.join('\n')));
}
