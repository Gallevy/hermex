import chalk from 'chalk';
import Table from 'cli-table3';
import type { AggregatedReport, PackageDistribution } from './aggregator';
import { formatCount } from './format-utils';

function printHeader() {
  console.log(chalk.blueBright.bold('\n📦 Packages\n'));
}

function formatPackageName(pkg: PackageDistribution): string {
  const badge = pkg.internal ? chalk.yellow('[int] ') : '';
  return badge + pkg.packageName;
}

export function printPackages(
  aggregated: AggregatedReport,
  mode: 'table' | 'chart',
) {
  const packages = aggregated.packageDistribution;

  if (mode === 'table') {
    printPackagesTable(packages);
  } else if (mode === 'chart') {
    printPackagesChart(packages);
  }
}

function printPackagesTable(packages: PackageDistribution[]) {
  printHeader();

  if (packages.length === 0) {
    console.log(chalk.gray('  No packages found'));
    return;
  }

  const table = new Table({
    head: ['Package', 'Version', 'Components', 'Usage', 'Percentage'],
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });

  packages.forEach((pkg) => {
    const versionCell = pkg.hasVersionConflict
      ? chalk.yellow(`⚠ ${pkg.allVersions.join(', ')} (multiple — bundle impact)`)
      : pkg.version || 'N/A';

    table.push([
      formatPackageName(pkg),
      versionCell,
      formatCount(pkg.componentCount),
      formatCount(pkg.usageCount),
      `${pkg.percentage.toFixed(1)}%`,
    ]);
  });

  console.log(table.toString());

  const totalComponents = packages.reduce((sum, p) => sum + p.componentCount, 0);
  const totalExternalUsage = packages.reduce((sum, p) => sum + p.usageCount, 0);
  console.log(
    chalk.gray(
      `\nTotal: ${formatCount(packages.length)} packages | ${formatCount(totalComponents)} unique components | ${formatCount(totalExternalUsage)} total usages`,
    ),
  );
}

function printPackagesChart(packages: PackageDistribution[]) {
  printHeader();

  if (packages.length === 0) {
    console.log(chalk.gray('  No packages found'));
    return;
  }

  const maxBarWidth = 40;
  const maxPercentage = Math.max(...packages.map((p) => p.percentage));
  const maxLabelLength = Math.max(...packages.map((p) => p.packageName.length + (p.internal ? 6 : 0)));

  packages.forEach((pkg) => {
    const barLength = Math.round((pkg.percentage / maxPercentage) * maxBarWidth);
    const emptyLength = maxBarWidth - barLength;
    const label = formatPackageName(pkg).padEnd(maxLabelLength, ' ');

    const bar =
      chalk.green('█'.repeat(barLength)) + chalk.gray('░'.repeat(emptyLength));

    console.log(
      `${label} ${bar} ${chalk.bold(pkg.percentage.toFixed(1) + '%')} (${pkg.usageCount})`,
    );
  });
}
