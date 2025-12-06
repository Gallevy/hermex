import chalk from 'chalk';
import Table from 'cli-table3';
import type { AggregatedReport } from './aggregator';
import { formatCount, formatDuration } from './format-utils';

function printHeader() {
  console.log(chalk.green.bold('\n📊 Summary\n'));
}

export function printSummary(
  aggregated: AggregatedReport,
  elapsedTimeSeconds: number,
) {
  // Print elapsed time outside the table
  console.log(
    chalk.green(
      `Analysis completed successfully in ${formatDuration(elapsedTimeSeconds)}\n`,
    ),
  );

  printHeader();

  const table = new Table({
    head: ['Metric', 'Count'],
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });

  table.push(
    ['Files Analyzed', formatCount(aggregated.filesAnalyzed)],
    ['Total Imports', formatCount(aggregated.totalImports)],
    ['Total Components', formatCount(aggregated.totalComponents)],
  );

  console.log(table.toString());
}
