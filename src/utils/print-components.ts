import chalk from 'chalk';
import Table from 'cli-table3';
import type { AggregatedReport, ComponentUsage } from './aggregator';
import { renderBarChart } from './chart-renderer';

function printHeader() {
  console.log(chalk.magenta.bold('\n⚛️ Components\n'));
}

export function printComponents(
  aggregated: AggregatedReport,
  mode: 'table' | 'chart',
) {
  const components = aggregated.topComponents;

  if (mode === 'table') {
    printComponentsTable(components);
  } else if (mode === 'chart') {
    printComponentsChart(components);
  }
}

function printComponentsTable(components: ComponentUsage[]) {
  printHeader();

  if (components.length === 0) {
    console.log(chalk.gray('  No components found'));
    return;
  }

  const table = new Table({
    head: ['Component', 'Source', 'Count'],
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });

  components.forEach((comp) => {
    table.push([comp.name, comp.source, comp.count.toString()]);
  });

  console.log(table.toString());
}

function printComponentsChart(components: ComponentUsage[]) {
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
