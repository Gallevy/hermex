import chalk from 'chalk';
import type { AggregatedReport } from './aggregator';

export function printSummary(
  aggregated: AggregatedReport,
  elapsedTimeSeconds: number,
) {
  // console.log(
  //   chalk.green(
  //     `[SUMMARY] Analysis completed successfully in ${elapsedTimeSeconds.toFixed(1)}s`,
  //   ),
  // );
  console.log(
    chalk.green(
      `[SUMMARY] Files analyzed: ${aggregated.filesAnalyzed.toLocaleString()}`,
    ),
  );
  console.log(
    chalk.green(
      `[SUMMARY] Total imports: ${aggregated.totalImports.toLocaleString()}`,
    ),
  );
  console.log(
    chalk.green(
      `[SUMMARY] Total components: ${aggregated.totalComponents.toLocaleString()}`,
    ),
  );
}
