import chalk from 'chalk';
import Table from 'cli-table3';
import type {
  AggregatedReport,
  BannedPackageViolation,
  PackageDistribution,
} from './aggregator';
import type { ReleaseAgeEntry } from '../npm-registry/types';
import { formatCount } from './format-utils';

function printHeader() {
  console.log(chalk.blueBright.bold('\n📦 Packages\n'));
}

function formatPackageName(
  pkg: PackageDistribution,
  banned?: BannedPackageViolation,
): string {
  let prefix = '';
  if (pkg.releaseAge?.deprecated) {
    prefix += chalk.red('[DEPRECATED] ');
  }
  if (banned) {
    prefix +=
      banned.severity === 'error'
        ? chalk.red('[BANNED] ')
        : chalk.yellow('[RESTRICTED] ');
  } else if (pkg.internal) {
    prefix += chalk.yellow('[int] ');
  }
  return prefix + pkg.packageName;
}

function formatUpgradeCell(releaseAge?: ReleaseAgeEntry): string {
  if (!releaseAge) return '';
  const { worstLevel, upgrades } = releaseAge;
  if (!worstLevel) return chalk.green('✓');

  const top = upgrades[0];
  if (!top) return chalk.green('✓');

  if (worstLevel === 'mandatory_upgrade') {
    return chalk.red(
      `⚠ ${top.semverBump} ${top.version} (${top.releasedDaysAgo}d)`,
    );
  }
  return chalk.yellow(
    `↑ ${top.semverBump} ${top.version} (${top.releasedDaysAgo}d)`,
  );
}

function getBannedViolation(
  pkg: PackageDistribution,
  violations: BannedPackageViolation[],
): BannedPackageViolation | undefined {
  return violations.find((v) => v.packageName === pkg.packageName);
}

export function printPackages(
  aggregated: AggregatedReport,
  mode: 'table' | 'chart',
) {
  const packages = aggregated.packageDistribution;
  const violations = aggregated.bannedPackageViolations;

  if (mode === 'table') {
    printPackagesTable(packages, violations);
  } else if (mode === 'chart') {
    printPackagesChart(packages, violations);
  }
}

function printPackagesTable(
  packages: PackageDistribution[],
  violations: BannedPackageViolation[],
) {
  printHeader();

  if (packages.length === 0) {
    console.log(chalk.gray('  No packages found'));
    return;
  }

  const hasReleaseAge = packages.some((p) => p.releaseAge !== undefined);
  const head = ['Package', 'Version', 'Components', 'Usage', 'Percentage'];
  if (hasReleaseAge) head.push('Upgrades');

  const table = new Table({
    head,
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });

  packages.forEach((pkg) => {
    const versionCell = pkg.hasVersionConflict
      ? chalk.yellow(
          `⚠ ${pkg.allVersions.join(', ')} (multiple — bundle impact)`,
        )
      : pkg.version || 'N/A';

    const row = [
      formatPackageName(pkg, getBannedViolation(pkg, violations)),
      versionCell,
      formatCount(pkg.componentCount),
      formatCount(pkg.usageCount),
      `${pkg.percentage.toFixed(1)}%`,
    ];
    if (hasReleaseAge) row.push(formatUpgradeCell(pkg.releaseAge));
    table.push(row);
  });

  console.log(table.toString());

  const totalComponents = packages.reduce(
    (sum, p) => sum + p.componentCount,
    0,
  );
  const totalExternalUsage = packages.reduce((sum, p) => sum + p.usageCount, 0);
  console.log(
    chalk.gray(
      `\nTotal: ${formatCount(packages.length)} packages | ${formatCount(totalComponents)} unique components | ${formatCount(totalExternalUsage)} total usages`,
    ),
  );
}

function printPackagesChart(
  packages: PackageDistribution[],
  violations: BannedPackageViolation[],
) {
  printHeader();

  if (packages.length === 0) {
    console.log(chalk.gray('  No packages found'));
    return;
  }

  const maxBarWidth = 40;
  const maxPercentage = Math.max(...packages.map((p) => p.percentage));
  const maxLabelLength = Math.max(
    ...packages.map((p) => p.packageName.length + (p.internal ? 6 : 0)),
  );

  packages.forEach((pkg) => {
    const barLength = Math.round(
      (pkg.percentage / maxPercentage) * maxBarWidth,
    );
    const emptyLength = maxBarWidth - barLength;
    const label = formatPackageName(
      pkg,
      getBannedViolation(pkg, violations),
    ).padEnd(maxLabelLength, ' ');

    const bar =
      chalk.green('█'.repeat(barLength)) + chalk.gray('░'.repeat(emptyLength));

    console.log(
      `${label} ${bar} ${chalk.bold(pkg.percentage.toFixed(1) + '%')} (${pkg.usageCount})`,
    );
  });
}
