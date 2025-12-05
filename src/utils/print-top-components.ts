import chalk from 'chalk';
import Table from 'cli-table3';
import type { AggregatedReport, ComponentUsage } from './aggregator';
import { renderBarChart } from './chart-renderer';

function printHeader() {
  console.log(chalk.yellow.bold('\n🏆 Top Components\n'));
}

export function printTopComponents(
  aggregated: AggregatedReport,
  mode: 'log' | 'table' | 'chart',
  topN: number = 10,
) {
  const topComponents = aggregated.topComponents.slice(0, topN);

  if (mode === 'log') {
    printTopComponentsLog(topComponents);
  } else if (mode === 'table') {
    printTopComponentsTable(topComponents);
  } else if (mode === 'chart') {
    printTopComponentsChart(topComponents);
  }
}

function printTopComponentsLog(components: ComponentUsage[]) {
  printHeader();

  if (components.length === 0) {
    console.log(chalk.gray('  No components found'));
    return;
  }

  components.forEach((comp, idx) => {
    const rank = idx + 1;
    const emoji =
      rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
    const sourceStr = comp.source !== 'unknown' ? ` from ${comp.source}` : '';
    console.log(
      chalk.yellow(
        `  ${emoji} ${rank}. ${comp.name}${sourceStr}: ${comp.count} uses`,
      ),
    );
  });
}

function printTopComponentsTable(components: ComponentUsage[]) {
  printHeader();

  if (components.length === 0) {
    console.log(chalk.gray('  No components found'));
    return;
  }

  const table = new Table({
    head: ['Rank', 'Component', 'Source', 'Count'],
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });

  components.forEach((comp, idx) => {
    const rank = idx + 1;
    const emoji =
      rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
    table.push([emoji, comp.name, comp.source, comp.count.toString()]);
  });

  console.log(table.toString());
}

function printTopComponentsChart(components: ComponentUsage[]) {
  printHeader();

  if (components.length === 0) {
    console.log(chalk.gray('  No components found'));
    return;
  }

  const data = components.map((comp) => ({
    label: comp.name,
    value: comp.count,
  }));

  renderBarChart(data, { maxWidth: 50 });
}
