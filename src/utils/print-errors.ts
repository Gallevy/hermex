import chalk from 'chalk';
import Table from 'cli-table3';
import type { AggregatedReport } from './aggregator';

function printHeader(errorCount: number) {
  console.log(chalk.red.bold(`\n❌ Parse Errors (${errorCount})\n`));
}

export function printErrors(aggregated: AggregatedReport) {
  const errors = aggregated.errors;

  if (errors.length === 0) {
    return; // Don't show section if no errors
  }

  printHeader(errors.length);

  const table = new Table({
    head: ['File', 'Error'],
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
    colWidths: [50, 80],
    wordWrap: true,
  });

  errors.forEach((error) => {
    table.push([chalk.yellow(error.file), chalk.red(error.message)]);
  });

  console.log(table.toString());
}
