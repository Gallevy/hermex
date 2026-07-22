import { writeFileSync } from 'node:fs';
import type { AggregatedReport } from './aggregator';
import type { ComplianceResult } from './compliance';
import type { PackageDistribution } from './package-distribution';
import { describeViolation, formatRuleType } from './print-rules';
import {
  formatPackageName,
  formatUpgradeCell,
  getBannedViolation,
} from './print-packages';
import { severityIcon, stripAnsi } from './severity-format';
import type { BannedPackageViolation } from './package-rules';

function buildRulesSection(aggregated: AggregatedReport): string {
  const { ruleViolations, bannedPackageViolations } = aggregated;

  if (ruleViolations.length === 0 && bannedPackageViolations.length === 0) {
    return '### Rules\n\nAll rule checks passed\n';
  }

  const lines: string[] = ['### Rules', ''];

  for (const v of ruleViolations) {
    lines.push(
      `- ${severityIcon(v.severity)} ${formatRuleType(v.type)} — ${describeViolation(v)}`,
    );
  }

  for (const v of bannedPackageViolations) {
    const msg = v.message ? ` — ${v.message}` : '';
    lines.push(
      `- ${severityIcon(v.severity)} forbid_packages — ${v.packageName} is forbidden${msg}`,
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

// Deliberately not scoped to severity 'error' only — the summary surfaces
// advisory (warn-severity) overdue packages too, even though they wouldn't
// fail computeCompliance (#31).
function isFlaggedPackage(
  pkg: PackageDistribution,
  banned: BannedPackageViolation | undefined,
): boolean {
  return (
    Boolean(pkg.releaseAge?.deprecated) ||
    banned !== undefined ||
    (pkg.releaseAge !== undefined && pkg.releaseAge.worstLevel !== null)
  );
}

function buildPackagesSection(aggregated: AggregatedReport): string {
  const flagged = aggregated.packageDistribution.filter((pkg) =>
    isFlaggedPackage(
      pkg,
      getBannedViolation(pkg, aggregated.bannedPackageViolations),
    ),
  );

  if (flagged.length === 0) return '';

  const lines: string[] = ['### Packages (issues only)', ''];
  for (const pkg of flagged) {
    const banned = getBannedViolation(pkg, aggregated.bannedPackageViolations);
    const name = formatPackageName(pkg, banned);
    const upgrade = formatUpgradeCell(pkg.releaseAge);
    lines.push(`- ${name}${upgrade ? ` ${upgrade}` : ''}`);
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

/**
 * Writes a concise, ANSI-free markdown summary (rules, flagged packages,
 * verdict) for CI surfaces that can't render the full human report — a
 * sticky PR comment or job summary (#31). Omits Versus and progress chrome
 * by construction; never touches ora or the Versus renderer.
 */
export function writeSummaryFile(
  path: string,
  aggregated: AggregatedReport,
  compliance: ComplianceResult,
): void {
  const sections = [
    buildRulesSection(aggregated),
    buildPackagesSection(aggregated),
    buildVerdictSection(compliance),
  ].filter((section) => section.length > 0);

  writeFileSync(path, stripAnsi(sections.join('\n')));
}
