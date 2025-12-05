import chalk from 'chalk';
import type { AggregatedReport } from './aggregator';

function printHeader() {
  console.log(chalk.green.bold('\n📊 Summary\n'));
}

export function printSummary(
  aggregated: AggregatedReport,
  elapsedTimeSeconds: number,
) {
  printHeader();

  console.log(
    chalk.green(
      `  Analysis completed successfully in ${elapsedTimeSeconds.toFixed(1)}s`,
    ),
  );
  console.log(
    chalk.green(
      `  Files analyzed: ${aggregated.filesAnalyzed.toLocaleString()}`,
    ),
  );
  console.log(
    chalk.green(`  Total imports: ${aggregated.totalImports.toLocaleString()}`),
  );
  console.log(
    chalk.green(
      `  Total components: ${aggregated.totalComponents.toLocaleString()}`,
    ),
  );
}
