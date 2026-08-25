import chalk from 'chalk';
import Table from 'cli-table3';
import type { AggregatedReport } from './aggregator';
import type { RuleViolation } from '../rules/evaluator';
import { formatBytes } from './byte-size';
import { formatTruncatedList } from './format-utils';
import {
  formatSeverityTally,
  severityIcon,
  sortViolationsBySeverity,
} from './severity-format';

export function formatRuleType(ruleId: RuleViolation['ruleId']): string {
  switch (ruleId) {
    case 'no-files':
      return 'no-files';
    case 'require-files':
      return 'require-files';
    case 'max-file-size':
      return 'max-file-size';
    case 'require-packages':
      return 'require-packages';
    case 'no-packages':
      return 'no-packages';
    case 'require-scripts':
      return 'require-scripts';
    case 'require-package-fields':
      return 'package-fields';
    case 'no-package-fields':
      return 'package-fields';
    case 'require-engine-version':
      return 'require-engine-version';
    case 'require-codeowners':
      return 'require-codeowners';
  }
}

function basename(file: string): string {
  const parts = file.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
}

export function describeViolation(v: RuleViolation): string {
  const patterns = v.patterns.join(', ');
  const suffix = v.message ? chalk.gray(` — ${v.message}`) : '';

  if (v.ruleId === 'no-files') {
    const files = v.matchedFiles.map(basename);
    return `${patterns} detected (${formatTruncatedList(files, 'file')})${suffix}`;
  }

  if (v.ruleId === 'require-files') return `${patterns} not found${suffix}`;
  if (v.ruleId === 'max-file-size') {
    const files = v.matchedFiles.map(basename);
    const ceiling = `${patterns} over ${formatBytes(v.maxSizeBytes)}`;
    // oversizeFiles is largest-first, so its head is the worst offender —
    // naming it is what tells you how far over the ceiling the rule is. With
    // a single file, "logo.svg at 1.4 KB" beats repeating the same name as
    // both the list and the largest entry.
    const largest = v.oversizeFiles[0];
    if (!largest)
      return `${ceiling} (${formatTruncatedList(files, 'file')})${suffix}`;
    if (files.length === 1)
      return `${ceiling} (${files[0]} at ${formatBytes(largest.sizeBytes)})${suffix}`;
    return `${ceiling} (${formatTruncatedList(files, 'file')}, largest ${formatBytes(largest.sizeBytes)})${suffix}`;
  }

  if (v.ruleId === 'require-packages')
    return `${patterns} not installed${suffix}`;
  if (v.ruleId === 'no-packages')
    return `${v.packageName ?? patterns} is forbidden${suffix}`;
  if (v.ruleId === 'require-scripts')
    return `script ${patterns} missing in package.json${suffix}`;
  if (v.ruleId === 'require-package-fields') {
    if (v.fieldPath && v.actualValue !== undefined)
      return `field ${v.fieldPath} is ${chalk.yellow(v.actualValue)}, does not match required value${suffix}`;
    return `field ${patterns} missing in package.json${suffix}`;
  }
  if (v.ruleId === 'no-package-fields')
    return `field ${v.fieldPath ?? patterns} is forbidden in package.json${suffix}`;

  if (v.ruleId === 'require-engine-version') {
    if (!v.installedRange)
      return `engines.node not specified (required ${v.requiredRange})${suffix}`;
    return `engines.node is ${chalk.yellow(v.installedRange)}, required ${chalk.cyan(v.requiredRange)}${suffix}`;
  }

  if (v.ruleId === 'require-codeowners') {
    if (v.matchedFiles.length === 0)
      return `CODEOWNERS not found (looked in ${patterns})${suffix}`;
    return `${v.matchedFiles.length} scanned file(s) have no owner: ${formatTruncatedList(v.matchedFiles, 'file')}${suffix}`;
  }

  return `${patterns} not present${suffix}`;
}

export function printRules(aggregated: AggregatedReport): void {
  const { ruleViolations } = aggregated;

  // Nothing to report — print nothing at all, rather than a "Rules" header
  // plus an "All rule checks passed" line with zero rows underneath it.
  // The overall compliance verdict (printComplianceVerdict) already gives
  // the definitive pass/fail signal; an empty section here is pure
  // boilerplate, indistinguishable from "no rules were ever configured."
  if (ruleViolations.length === 0) return;

  console.log(chalk.blueBright.bold('\n🔍 Rules\n'));

  // A table, matching the Packages table's shape/scanability, rather than a
  // bullet list.
  const table = new Table({
    head: ['Rule', 'Description'],
    style: { head: ['cyan'], border: ['gray'] },
  });

  for (const v of sortViolationsBySeverity(ruleViolations)) {
    table.push([
      formatRuleType(v.ruleId),
      `${severityIcon(v.severity)} ${describeViolation(v)}`,
    ]);
  }

  console.log(table.toString());

  // Includes info in the tally — the table above always shows every
  // severity, so the count below it must too, or the two disagree (#88).
  console.log(
    chalk.gray(
      `\n${formatSeverityTally(ruleViolations, { includeInfo: true })}`,
    ),
  );
}
