import chalk from 'chalk';
import type { AggregatedReport, VersusResult } from './aggregator';

/**
 * The versus bars: each group's split across the packages it names.
 *
 * The number behind every bar is how many scanned *files import* each
 * package, not how many times it is rendered — see `VersusEntry.count` for
 * why that changed in #174.
 */
const BAR_WIDTH = 30;

function renderBar(percentage: number): string {
  const filled = Math.round((percentage / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
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
    // Named per entry rather than only in the footer below: in a group where
    // one side is a real dependency and the other is a typo, the totals are
    // non-zero, so the footer never fires and the missing package silently
    // reads as "0% migrated" instead of "not here at all" (#174).
    const detail = entry.present
      ? `(${entry.count} ${entry.count === 1 ? 'file' : 'files'})`
      : '(not found in this repo)';

    console.log(`  ${name}  ${bar} ${pct} ${chalk.gray(detail)}`);
  }

  if (result.totalCount === 0) {
    console.log(
      chalk.gray(
        result.entries.some((e) => e.present)
          ? '  No imports detected for any package in this group.'
          : '  None of these packages was found in this repo.',
      ),
    );
  }

  console.log();
}

export function printVersus(aggregated: AggregatedReport) {
  if (aggregated.versusResults.length === 0) return;

  console.log(chalk.magentaBright.bold('\n⚖️ Versus\n'));

  for (const result of aggregated.versusResults) {
    printVersusResult(result);
  }
}
