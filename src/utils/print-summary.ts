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
  printHeader();

  const table = new Table({
    head: ['Metric', 'Count'],
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });

  // Calculate external components only (filter out unknown and local)
  const externalComponents = aggregated.topComponents.filter(
    (comp) => comp.source !== 'unknown' && comp.source !== 'local',
  ).length;

  // Calculate total external package usage
  const totalExternalUsage = aggregated.packageDistribution.reduce(
    (sum, pkg) => sum + pkg.usageCount,
    0,
  );

  table.push(
    ['Files Analyzed', formatCount(aggregated.filesAnalyzed)],
    ['External Packages', formatCount(aggregated.packageDistribution.length)],
    ['External Components', formatCount(externalComponents)],
    ['Total Usages', formatCount(totalExternalUsage)],
  );

  console.log(table.toString());

  // Print elapsed time outside the table
  console.log(
    chalk.green(
      `Analysis completed successfully in ${formatDuration(elapsedTimeSeconds)}\n`,
    ),
  );
}
