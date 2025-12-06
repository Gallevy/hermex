import chalk from 'chalk';
import type { AggregatedReport } from './aggregator';
import { formatCount } from './format-utils';

function printHeader() {
  console.log(chalk.cyan.bold('\n📋 Details\n'));
}

export function printDetails(aggregated: AggregatedReport) {
  printHeader();

  console.log(
    chalk.cyan(
      `  Total usage patterns: ${formatCount(aggregated.totalUsagePatterns)}`,
    ),
  );

  // Print each pattern type count
  for (const pattern of aggregated.patternCounts) {
    if (pattern.count > 0) {
      console.log(
        chalk.cyan(
          `  ${pattern.displayName}: ${formatCount(pattern.count)}`,
        ),
      );
    }
  }
}
