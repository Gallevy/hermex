import chalk from 'chalk';
import type { ComplianceResult } from './compliance';

export function printComplianceVerdict(result: ComplianceResult): void {
  const mandatoryCount =
    result.errorRuleViolations.length +
    result.errorBannedPackageViolations.length +
    result.mandatoryReleaseAgeViolations.length;

  if (result.compliant) {
    console.log(chalk.greenBright.bold('\n✓ COMPLIANT\n'));
    return;
  }

  console.log(chalk.redBright.bold(`\n✗ NOT COMPLIANT`));
  console.log(
    chalk.red(
      `  ${mandatoryCount} mandatory violation${mandatoryCount > 1 ? 's' : ''} found`,
    ),
  );

  if (result.mandatoryReleaseAgeViolations.length > 0) {
    console.log();
    for (const pkg of result.mandatoryReleaseAgeViolations) {
      const top = pkg.releaseAge?.upgrades[0];
      console.log(
        chalk.red(
          `  ✗  releaseAge     ${pkg.packageName} is ${top?.semverBump} version behind (${top?.releasedDaysAgo}d) — mandatory upgrade  [ERROR]`,
        ),
      );
    }
  }

  console.log();
}
