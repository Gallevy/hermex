import chalk from 'chalk';
import type { AggregatedReport } from './aggregator';

export function printDetails(aggregated: AggregatedReport) {
  console.log(
    chalk.cyan(
      `[DETAILS] Total usage patterns: ${aggregated.totalUsagePatterns.toLocaleString()}`,
    ),
  );

  // Print each pattern type count
  for (const pattern of aggregated.patternCounts) {
    if (pattern.count > 0) {
      console.log(
        chalk.cyan(
          `[DETAILS] ${pattern.displayName}: ${pattern.count.toLocaleString()}`,
        ),
      );
    }
  }
}
