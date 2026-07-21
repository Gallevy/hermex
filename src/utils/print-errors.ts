import chalk from 'chalk';
import type { ParseError } from '../swc-parser/types';

export function printErrors(errors: ParseError[], isJson: boolean): void {
  if (errors.length === 0) return;
  const stream = isJson ? process.stderr : process.stdout;
  stream.write(chalk.yellow(`\n⚠ ${errors.length} file(s) failed to parse:\n`));
  for (const { file, message } of errors) {
    stream.write(chalk.yellow(`  ${file}\n`));
    stream.write(chalk.gray(`    ${message}\n`));
  }
  stream.write('\n');
}
