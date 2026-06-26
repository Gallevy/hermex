import chalk from 'chalk';
import type { AggregatedReport, VersusResult } from './aggregator';

const BAR_WIDTH = 30;

function renderBar(percentage: number): string {
  const filled = Math.round((percentage / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

function formatComponents(components: string[], max = 3): string {
  if (components.length === 0) return '';
  const shown = components.slice(0, max);
  const rest = components.length - max;
  const list = shown.join(', ');
  return rest > 0 ? `${list} (+${rest} more)` : list;
}

function printVersusResult(result: VersusResult) {
  console.log(chalk.bold(`  ${result.name}`));
  console.log(chalk.gray(`  ${'─'.repeat(50)}`));

  const maxNameLen = Math.max(
    ...result.entries.map((e) => e.packageName.length),
  );

  for (const entry of result.entries) {
    const name = entry.packageName.padEnd(maxNameLen);
    const bar = renderBar(entry.percentage);
    const pct = chalk.bold(`${entry.percentage.toFixed(1)}%`);
    const usage = chalk.gray(`(${entry.count} usages)`);
    const components =
      entry.components.length > 0
        ? chalk.gray(`  ${formatComponents(entry.components)}`)
        : '';

    console.log(`  ${name}  ${bar} ${pct} ${usage}${components}`);
  }

  if (result.totalCount === 0) {
    console.log(
      chalk.gray('  No usage detected for any package in this group.'),
    );
  }

  console.log();
}

export function printVersus(aggregated: AggregatedReport) {
  if (aggregated.versusResults.length === 0) return;

  console.log(chalk.magentaBright.bold('\n⚖️  Versus\n'));

  for (const result of aggregated.versusResults) {
    printVersusResult(result);
  }
}
