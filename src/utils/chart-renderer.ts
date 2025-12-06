import chalk from 'chalk';
import { formatCount } from './format-utils';

export interface ChartData {
  label: string;
  value: number;
}

export interface ChartOptions {
  maxWidth?: number;
  showValues?: boolean;
  barChar?: string;
  emptyChar?: string;
}

export function renderBarChart(data: ChartData[], options: ChartOptions = {}) {
  const {
    maxWidth = 50,
    showValues = true,
    barChar = '█',
    emptyChar = '░',
  } = options;

  if (data.length === 0) {
    console.log(chalk.gray('  No data to display'));
    return;
  }

  // Find max value for scaling
  const maxValue = Math.max(...data.map((d) => d.value));
  if (maxValue === 0) {
    console.log(chalk.gray('  All values are zero'));
    return;
  }

  // Find longest label for alignment
  const maxLabelLength = Math.max(...data.map((d) => d.label.length));

  // Render each bar
  for (const item of data) {
    const percentage = item.value / maxValue;
    const barLength = Math.round(percentage * maxWidth);
    const emptyLength = maxWidth - barLength;

    // Pad label
    const paddedLabel = item.label.padEnd(maxLabelLength, ' ');

    // Build bar
    const bar =
      chalk.green(barChar.repeat(barLength)) +
      chalk.gray(emptyChar.repeat(emptyLength));

    // Build value string
    const valueStr = showValues ? ` ${formatCount(item.value)}` : '';

    console.log(`${paddedLabel} ${bar}${valueStr}\n`);
  }
}
