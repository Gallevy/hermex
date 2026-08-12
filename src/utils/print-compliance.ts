import chalk from 'chalk';
import type { ComplianceResult } from './compliance';
import { countMandatoryViolations } from './compliance';
import { severityIcon } from './severity-format';

/**
 * Prints only the bottom-line verdict — the Rules and Packages sections
 * printed above this already itemize every violation (rule and release-age
 * alike), so repeating them here would just restate the same 🔴 rows.
 */
export function printComplianceVerdict(result: ComplianceResult): void {
  const mandatoryCount = countMandatoryViolations(result);

  if (result.compliant) {
    console.log(
      chalk.greenBright.bold(`\n${severityIcon('success')} COMPLIANT\n`),
    );
    return;
  }

  console.log(chalk.redBright.bold(`\n${severityIcon('error')} NOT COMPLIANT`));
  console.log(
    chalk.red(
      `  ${mandatoryCount} mandatory violation${mandatoryCount > 1 ? 's' : ''} found`,
    ),
  );
  console.log();
}
