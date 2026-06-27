import chalk from 'chalk';
import Table from 'cli-table3';
import type { AggregatedReport, ComponentUsage } from './aggregator';
import { renderBarChart } from './chart-renderer';

function printHeader() {
  // FIXME why double space, if single space output is wrong somehow?
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

  // Filter out unknown and local components - only show external packages
  const externalComponents = components.filter(
    (comp) => comp.source !== 'unknown' && comp.source !== 'local',
  );

  if (externalComponents.length === 0) {
    console.log(chalk.gray('  No external components found'));
    return;
  }

  const table = new Table({
    head: ['Component', 'Package', 'Count'],
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });

  externalComponents.forEach((comp) => {
    table.push([comp.name, comp.source, comp.count.toString()]);
  });

  console.log(table.toString());
}

function printComponentsChart(components: ComponentUsage[]) {
  printHeader();

  // Filter out unknown and local components - only show external packages
  const externalComponents = components.filter(
    (comp) => comp.source !== 'unknown' && comp.source !== 'local',
  );

  if (externalComponents.length === 0) {
    console.log(chalk.gray('  No external components found'));
    return;
  }

  const data = externalComponents.map((comp) => ({
    label: comp.name,
    value: comp.count,
  }));

  renderBarChart(data, { maxWidth: 50 });
}
