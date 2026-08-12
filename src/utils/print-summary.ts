import chalk from 'chalk';
import Table from 'cli-table3';
import type { AggregatedReport } from './aggregator';
import { formatCount } from './format-utils';

function printHeader() {
  console.log(chalk.green.bold('\n📊 Summary\n'));
}

export function printSummary(aggregated: AggregatedReport) {
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
    // "External Packages" counted rows in packageDistribution, which used to
    // mean "packages with measured usage". Since #78 that array is every
    // package the repo owns, so the old label would now overcount what it
    // claimed to describe.
    ['Packages', formatCount(aggregated.packageDistribution.length)],
    ['External Components', formatCount(externalComponents)],
    ['Total Usages', formatCount(totalExternalUsage)],
  );

  console.log(table.toString());
}
