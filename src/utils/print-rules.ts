import chalk from 'chalk';
import type { AggregatedReport } from './aggregator';
import type { RuleViolation } from '../rules/evaluator';

function formatRuleType(type: RuleViolation['type']): string {
  switch (type) {
    case 'detect_files':
      return 'detect_files';
    case 'require_files':
      return 'require_files';
    case 'forbid_packages':
      return 'forbid_packages';
    case 'require_packages':
      return 'require_packages';
    case 'require_scripts':
      return 'require_scripts';
    case 'require_package_fields':
      return 'pkg_fields';
    case 'engine_version':
      return 'engine_version';
  }
}

function ruleIcon(violation: RuleViolation): string {
  if (violation.severity === 'error') return chalk.red('✗');
  if (violation.severity === 'info') return chalk.blue('ℹ');
  return chalk.yellow('⚠');
}

function describeViolation(v: RuleViolation): string {
  const patterns = v.patterns.join(', ');
  const suffix = v.message ? chalk.gray(` — ${v.message}`) : '';

  if (v.type === 'detect_files') {
    const files = v.matchedFiles.map((f) => {
      const parts = f.replace(/\\/g, '/').split('/');
      return parts[parts.length - 1];
    });
    return `${patterns} detected (${files.join(', ')})${suffix}`;
  }

  if (v.type === 'require_files') return `${patterns} not found${suffix}`;
  if (v.type === 'require_packages')
    return `${patterns} not installed${suffix}`;
  if (v.type === 'forbid_packages') return `${patterns} is forbidden${suffix}`;
  if (v.type === 'require_scripts')
    return `script ${patterns} missing in package.json${suffix}`;
  if (v.type === 'require_package_fields')
    return `field ${patterns} missing in package.json${suffix}`;

  if (v.type === 'engine_version') {
    if (!v.installedRange)
      return `engines.node not specified (required ${v.requiredRange})${suffix}`;
    return `engines.node is ${chalk.yellow(v.installedRange)}, required ${chalk.cyan(v.requiredRange)}${suffix}`;
  }

  return `${patterns} not present${suffix}`;
}

export function printRules(aggregated: AggregatedReport): void {
  const { ruleViolations, bannedPackageViolations } = aggregated;
  const hasRuleViolations = ruleViolations.length > 0;
  const hasBannedViolations = bannedPackageViolations.length > 0;

  if (!hasRuleViolations && !hasBannedViolations) {
    console.log(chalk.greenBright.bold('\n✓ Compliance\n'));
    console.log(chalk.gray('  All compliance checks passed'));
    return;
  }

  console.log(chalk.blueBright.bold('\n🔍 Compliance\n'));

  if (hasRuleViolations) {
    for (const v of ruleViolations) {
      const icon = ruleIcon(v);
      const type = chalk.gray(formatRuleType(v.type).padEnd(14));
      const severityTag =
        v.severity === 'error'
          ? chalk.red('[ERROR]')
          : v.severity === 'info'
            ? chalk.blue('[INFO]')
            : chalk.yellow('[WARN]');
      console.log(`  ${icon}  ${type} ${describeViolation(v)}  ${severityTag}`);
    }
  }

  if (hasBannedViolations) {
    if (hasRuleViolations) console.log();
    for (const v of bannedPackageViolations) {
      const icon = v.severity === 'error' ? chalk.red('✗') : chalk.yellow('⚠');
      const tag =
        v.severity === 'error'
          ? chalk.red('[BANNED]')
          : chalk.yellow('[RESTRICTED]');
      const msg = v.message ? chalk.gray(` — ${v.message}`) : '';
      console.log(`  ${icon}  ${tag} ${v.packageName}${msg}`);
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
