import chalk from 'chalk';
import Table from 'cli-table3';
import type {
  AggregatedReport,
  BannedPackageViolation,
  PackageDistribution,
} from './aggregator';
import type { ReleaseAgeEntry } from '../npm-registry/types';
import {
  formatCount,
  formatDaysOverdue,
  formatDaysRemaining,
} from './format-utils';
import { severityIcon, severityColor } from './severity-format';

function printHeader() {
  console.log(chalk.blueBright.bold('\n📦 Packages\n'));
}

export function formatPackageName(
  pkg: PackageDistribution,
  banned?: BannedPackageViolation,
): string {
  let prefix = '';
  if (pkg.releaseAge?.deprecated) {
    prefix += severityColor('error')('[DEPRECATED] ');
  }
  if (banned) {
    prefix +=
      banned.severity === 'error'
        ? severityColor('error')('[BANNED] ')
        : severityColor('warn')('[RESTRICTED] ');
  } else if (pkg.internal) {
    prefix += severityColor('warn')('[int] ');
  }
  return prefix + pkg.packageName;
}

export function formatUpgradeCell(releaseAge?: ReleaseAgeEntry): string {
  if (!releaseAge) return '';
  const { worstLevel, upgrades, severity, pendingUpgrade } = releaseAge;

  if (!worstLevel) {
    if (pendingUpgrade) {
      return `${severityIcon('info')} ${pendingUpgrade.semverBump} ${pendingUpgrade.version} (${formatDaysRemaining(pendingUpgrade.daysRemaining)})`;
    }
    return severityIcon('success');
  }

  const top = upgrades[0];
  if (!top) return severityIcon('success');

  const suffix = severity === 'warn' ? chalk.gray(' [not enforced]') : '';
  // When even the recommended target is past its own threshold, there's no
  // fresher release to have grabbed instead — a day count would imply a
  // countdown that was never achievable, so omit it (#26).
  const overdue =
    top.releasedDaysAgo > top.thresholdDays
      ? 'no compliant release available'
      : formatDaysOverdue(top.breachReleasedDaysAgo, top.thresholdDays);

  if (worstLevel === 'major_overdue') {
    const icon = severityIcon(severity === 'warn' ? 'warn' : 'error');
    return `${icon} ${top.semverBump} ${top.version} (${overdue})${suffix}`;
  }
  return `${severityIcon('warn')} ${top.semverBump} ${top.version} (${overdue})${suffix}`;
}

export function getBannedViolation(
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
  const head = ['Package', 'Version'];
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
          `⚠ ${pkg.allVersions.join(', ')} (${pkg.allVersions.length} versions — bundle impact)`,
        )
      : pkg.version || 'N/A';

    const row = [
      formatPackageName(pkg, getBannedViolation(pkg, violations)),
      versionCell,
    ];
    if (hasReleaseAge) row.push(formatUpgradeCell(pkg.releaseAge));
    table.push(row);
  });

  console.log(table.toString());

  console.log(chalk.gray(`\nTotal: ${formatCount(packages.length)} packages`));
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
