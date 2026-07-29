import { writeFileSync } from 'node:fs';
import type { AggregatedReport } from './aggregator';
import type { ComplianceResult } from './compliance';
import { describeViolation, formatRuleType } from './print-rules';
import {
  describeUpgradeTarget,
  resolveCompliantTarget,
  resolveInstalledVersion,
} from './print-packages';
import { severityIcon, stripAnsi } from './severity-format';

// A table, mirroring the Packages section below it, rather than a bullet
// list — same shape, same scanability, in both output surfaces.
function buildRulesSection(aggregated: AggregatedReport): string {
  // Info-severity rows are excluded here (unlike the terminal `printRules`,
  // which shows everything) — a summary meant for a PR comment or job
  // summary should only surface what's actually enforceable (#31).
  const ruleViolations = aggregated.ruleViolations.filter(
    (v) => v.severity !== 'info',
  );
  const bannedPackageViolations = aggregated.bannedPackageViolations.filter(
    (v) => v.severity !== 'info',
  );

  // Nothing to report — omit the section entirely, matching
  // buildPackagesSection below. The verdict section always states pass/fail
  // clearly; a "### Rules / All rule checks passed" block with zero rows
  // is boilerplate indistinguishable from "no rules were ever configured."
  if (ruleViolations.length === 0 && bannedPackageViolations.length === 0) {
    return '';
  }

  const lines: string[] = [
    '### Rules',
    '',
    '| | Rule | Description |',
    '|---|---|---|',
  ];

  for (const v of ruleViolations) {
    lines.push(
      `| ${severityIcon(v.severity)} | ${formatRuleType(v.type)} | ${describeViolation(v)} |`,
    );
  }

  for (const v of bannedPackageViolations) {
    const msg = v.message ? ` — ${v.message}` : '';
    lines.push(
      `| ${severityIcon(v.severity)} | forbid_packages | ${v.packageName} is forbidden${msg} |`,
    );
  }

  const allViolations = [...ruleViolations, ...bannedPackageViolations];
  const errorCount = allViolations.filter((v) => v.severity === 'error').length;
  const warnCount = allViolations.filter((v) => v.severity === 'warn').length;
  const parts: string[] = [];
  if (errorCount > 0)
    parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
  if (warnCount > 0)
    parts.push(`${warnCount} warning${warnCount > 1 ? 's' : ''}`);
  lines.push('', parts.join(', '));

  return lines.join('\n') + '\n';
}

// Built directly from compliance.releaseAgeViolations rather than a
// separately-derived filter — that's already exactly "release-age packages
// that are mandatory failures" (src/utils/compliance.ts), so the row list
// can never drift from the verdict's mandatory-violation count. Banned and
// deprecated-only/not-enforced packages don't get a row here: banned ones
// are already shown in Rules as a forbid_packages line, and
// deprecated-only or not-enforced-overdue packages are info-level, not
// enforceable (#31).
//
// Bundle-impact (multiple resolved copies) and advisory nested breaches are
// deliberately NOT included here — they're non-blocking context, and a
// summary meant for a PR comment or CI check reads any colored row/line as
// something that needs attention. That context belongs in the human
// `--format human` table (stdout), not in a surface used for gating (#59).
function buildPackagesSection(compliance: ComplianceResult): string {
  const mandatory = compliance.releaseAgeViolations;
  if (mandatory.length === 0) return '';

  const lines: string[] = [
    '### Packages',
    '',
    '| | Package | Installed | Target |',
    '|---|---|---|---|',
  ];
  for (const pkg of mandatory) {
    const top = pkg.releaseAge?.upgrades[0];
    const reasons: string[] = [];
    if (top)
      reasons.push(
        describeUpgradeTarget(top, resolveCompliantTarget(pkg.releaseAge)),
      );
    if (pkg.releaseAge?.deprecated) reasons.push('deprecated');
    lines.push(
      `| ${severityIcon('error')} | \`${pkg.packageName}\` | ${resolveInstalledVersion(pkg)} | ${reasons.join(', ')} |`,
    );
  }

  return lines.join('\n') + '\n';
}

function buildVerdictSection(compliance: ComplianceResult): string {
  if (compliance.compliant) {
    return `### ${severityIcon('success')} COMPLIANT\n`;
  }

  const mandatoryCount =
    compliance.errorRuleViolations.length +
    compliance.errorBannedPackageViolations.length +
    compliance.releaseAgeViolations.length;

  return `### ${severityIcon('error')} NOT COMPLIANT\n\n${mandatoryCount} mandatory violation${mandatoryCount > 1 ? 's' : ''} found\n`;
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
    buildPackagesSection(compliance),
    buildVerdictSection(compliance),
  ].filter((section) => section.length > 0);

  writeFileSync(path, stripAnsi(sections.join('\n')));
}
