import chalk from 'chalk';
import Table from 'cli-table3';
import type { AggregatedReport } from './aggregator';
import type { RuleViolation } from '../rules/evaluator';
import { formatTruncatedList } from './format-utils';
import { severityIcon } from './severity-format';

export function formatRuleType(type: RuleViolation['type']): string {
  switch (type) {
    case 'detect_files':
      return 'detect_files';
    case 'require_files':
      return 'require_files';
    case 'require_packages':
      return 'require_packages';
    case 'forbid_packages':
      return 'forbid_packages';
    case 'require_scripts':
      return 'require_scripts';
    case 'require_package_fields':
      return 'package_fields';
    case 'forbid_package_fields':
      return 'package_fields';
    case 'engine_version':
      return 'engine_version';
    case 'codeowners':
      return 'codeowners';
  }
}

export function describeViolation(v: RuleViolation): string {
  const patterns = v.patterns.join(', ');
  const suffix = v.message ? chalk.gray(` — ${v.message}`) : '';

  if (v.type === 'detect_files') {
    const files = v.matchedFiles.map((f) => {
      const parts = f.replace(/\\/g, '/').split('/');
      return parts[parts.length - 1];
    });
    return `${patterns} detected (${formatTruncatedList(files, 'file')})${suffix}`;
  }

  if (v.type === 'require_files') return `${patterns} not found${suffix}`;
  if (v.type === 'require_packages')
    return `${patterns} not installed${suffix}`;
  if (v.type === 'forbid_packages')
    return `${v.packageName ?? patterns} is forbidden${suffix}`;
  if (v.type === 'require_scripts')
    return `script ${patterns} missing in package.json${suffix}`;
  if (v.type === 'require_package_fields') {
    if (v.fieldPath && v.actualValue !== undefined)
      return `field ${v.fieldPath} is ${chalk.yellow(v.actualValue)}, does not match required value${suffix}`;
    return `field ${patterns} missing in package.json${suffix}`;
  }
  if (v.type === 'forbid_package_fields')
    return `field ${v.fieldPath ?? patterns} is forbidden in package.json${suffix}`;

  if (v.type === 'engine_version') {
    if (!v.installedRange)
      return `engines.node not specified (required ${v.requiredRange})${suffix}`;
    return `engines.node is ${chalk.yellow(v.installedRange)}, required ${chalk.cyan(v.requiredRange)}${suffix}`;
  }

  if (v.type === 'codeowners') {
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

  for (const v of ruleViolations) {
    table.push([
      formatRuleType(v.type),
      `${severityIcon(v.severity)} ${describeViolation(v)}`,
    ]);
  }

  console.log(table.toString());

  const errorCount = ruleViolations.filter(
    (v) => v.severity === 'error',
  ).length;
  const warnCount = ruleViolations.filter((v) => v.severity === 'warn').length;

  const parts: string[] = [];
  if (errorCount > 0)
    parts.push(chalk.red(`${errorCount} error${errorCount > 1 ? 's' : ''}`));
  if (warnCount > 0)
    parts.push(chalk.yellow(`${warnCount} warning${warnCount > 1 ? 's' : ''}`));
  console.log(chalk.gray(`\n${parts.join(', ')}`));
}
