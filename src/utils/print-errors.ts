import chalk from 'chalk';
import type { ParseError } from '../swc-parser/types';

export function printErrors(errors: ParseError[]): void {
  if (errors.length === 0) return;
  console.log(chalk.yellow(`\n⚠ ${errors.length} file(s) failed to parse:`));
  for (const { file, message } of errors) {
    console.log(chalk.yellow(`  ${file}`));
    console.log(chalk.gray(`    ${message}`));
  }
  console.log('');
}
