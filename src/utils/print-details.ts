import chalk from 'chalk';
import type { AggregatedReport } from './aggregator';

function printHeader() {
  console.log(chalk.cyan.bold('\n📋 Details\n'));
}

export function printDetails(aggregated: AggregatedReport) {
  printHeader();

  console.log(
    chalk.cyan(
      `  Total usage patterns: ${aggregated.totalUsagePatterns.toLocaleString()}`,
    ),
  );

  // Print each pattern type count
  for (const pattern of aggregated.patternCounts) {
    if (pattern.count > 0) {
      console.log(
        chalk.cyan(
          `  ${pattern.displayName}: ${pattern.count.toLocaleString()}`,
        ),
      );
    }
  }
}
