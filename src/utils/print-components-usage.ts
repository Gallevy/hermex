import chalk from 'chalk';
import Table from 'cli-table3';
import type { AggregatedReport, ComponentUsage } from './aggregator';
import { renderBarChart } from './chart-renderer';

function printHeader() {
  console.log(chalk.magenta.bold('\n⚛️  Components Usage\n'));
}

export function printComponentsUsage(
  aggregated: AggregatedReport,
  mode: 'table' | 'chart',
) {
  const components = aggregated.topComponents;

  if (mode === 'table') {
    printComponentsUsageTable(components);
  } else if (mode === 'chart') {
    printComponentsUsageChart(components);
  }
}

function printComponentsUsageTable(components: ComponentUsage[]) {
  printHeader();

  if (components.length === 0) {
    console.log(chalk.gray('  No components found'));
    return;
  }

  const table = new Table({
    head: ['Component', 'Source', 'Version', 'Count'],
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });

  components.forEach((comp) => {
    table.push([comp.name, comp.source, '0.0.0', comp.count.toString()]);
  });

  console.log(table.toString());
}

function printComponentsUsageChart(components: ComponentUsage[]) {
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
