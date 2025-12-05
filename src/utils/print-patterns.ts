import chalk from 'chalk';
import Table from 'cli-table3';
import type { AggregatedReport, PatternCount } from './aggregator';
import { renderBarChart } from './chart-renderer';

function printHeader() {
  console.log(chalk.blue.bold('\n🔍 Code Patterns\n'));
}

export function printPatterns(
  aggregated: AggregatedReport,
  mode: 'table' | 'chart',
) {
  const patterns = aggregated.patternCounts.filter((p) => p.count > 0);

  if (mode === 'table') {
    printPatternsTable(patterns);
  } else if (mode === 'chart') {
    printPatternsChart(patterns);
  }
}

function printPatternsTable(patterns: PatternCount[]) {
  printHeader();

  if (patterns.length === 0) {
    console.log(chalk.gray('  No patterns found'));
    return;
  }

  const table = new Table({
    head: ['Pattern', 'Count'],
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });

  patterns.forEach((pattern) => {
    table.push([pattern.displayName, pattern.count.toString()]);
  });

  console.log(table.toString());
}

function printPatternsChart(patterns: PatternCount[]) {
  printHeader();

  if (patterns.length === 0) {
    console.log(chalk.gray('  No patterns found'));
    return;
  }

  const data = patterns.map((pattern) => ({
    label: pattern.displayName,
    value: pattern.count,
  }));

  renderBarChart(data, { maxWidth: 50 });
}
