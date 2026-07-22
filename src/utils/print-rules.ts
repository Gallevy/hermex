import chalk from 'chalk';
import type { AggregatedReport } from './aggregator';
import type { RuleViolation } from '../rules/evaluator';
import { formatTruncatedList } from './format-utils';
import { severityIcon, formatViolationLine } from './severity-format';

function formatRuleType(type: RuleViolation['type']): string {
  switch (type) {
    case 'detect_files':
      return 'detect_files';
    case 'require_files':
      return 'require_files';
    case 'require_packages':
      return 'require_packages';
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

function describeViolation(v: RuleViolation): string {
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
  const { ruleViolations, bannedPackageViolations } = aggregated;
  const hasRuleViolations = ruleViolations.length > 0;
  const hasBannedViolations = bannedPackageViolations.length > 0;

  if (!hasRuleViolations && !hasBannedViolations) {
    console.log(chalk.greenBright.bold(`\n${severityIcon('success')} Rules\n`));
    console.log(chalk.gray('  All rule checks passed'));
    return;
  }

  console.log(chalk.blueBright.bold('\n🔍 Rules\n'));

  if (hasRuleViolations) {
    for (const v of ruleViolations) {
      console.log(
        formatViolationLine({
          icon: severityIcon(v.severity),
          label: formatRuleType(v.type),
          description: describeViolation(v),
        }),
      );
    }
  }

  if (hasBannedViolations) {
    for (const v of bannedPackageViolations) {
      const msg = v.message ? chalk.gray(` — ${v.message}`) : '';
      console.log(
        formatViolationLine({
          icon: severityIcon(v.severity),
          label: 'forbid_packages',
          description: `${v.packageName} is forbidden${msg}`,
        }),
      );
    }
  }

  const errorCount = [
    ...ruleViolations.filter((v) => v.severity === 'error'),
    ...bannedPackageViolations.filter((v) => v.severity === 'error'),
  ].length;
  const warnCount = [
    ...ruleViolations.filter((v) => v.severity === 'warn'),
    ...bannedPackageViolations.filter((v) => v.severity === 'warn'),
  ].length;

  const parts: string[] = [];
  if (errorCount > 0)
    parts.push(chalk.red(`${errorCount} error${errorCount > 1 ? 's' : ''}`));
  if (warnCount > 0)
    parts.push(chalk.yellow(`${warnCount} warning${warnCount > 1 ? 's' : ''}`));
  console.log(chalk.gray(`\n  ${parts.join(', ')}`));
}
