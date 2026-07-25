import chalk from 'chalk';
import Table from 'cli-table3';
import type {
  AggregatedReport,
  BannedPackageViolation,
  PackageDistribution,
} from './aggregator';
import type {
  AvailableUpgrade,
  ReleaseAgeEntry,
  SemverBump,
} from '../npm-registry/types';
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

// Describe the recommended upgrade for a breached tier.
//
// When a genuinely in-window compliant release exists (`compliantTarget`),
// recommend THAT — even if it lives in a different, unbreached tier than the
// one that failed (e.g. a stale 0.5.x minor line breached while a fresh 1.x
// major sits within its window). The overdue count still reflects how long the
// breached tier has been out of compliance, measured from its oldest breaching
// release (#24).
//
// Only when there's no in-window target at all does the "no compliant release
// available" wording apply — every candidate is itself past its threshold, so
// a day count would imply a countdown that was never achievable (#26).
export function describeUpgradeTarget(
  top: AvailableUpgrade,
  compliantTarget?: { version: string; bump: SemverBump },
): string {
  if (compliantTarget) {
    const overdue = formatDaysOverdue(
      top.breachReleasedDaysAgo,
      top.thresholdDays,
    );
    return `${compliantTarget.bump} ${compliantTarget.version} (${overdue})`;
  }
  const overdue =
    top.releasedDaysAgo > top.thresholdDays
      ? 'no compliant release available'
      : formatDaysOverdue(top.breachReleasedDaysAgo, top.thresholdDays);
  return `${top.semverBump} ${top.version} (${overdue})`;
}

export function formatUpgradeCell(releaseAge?: ReleaseAgeEntry): string {
  if (!releaseAge) return '';
  const {
    worstLevel,
    upgrades,
    severity,
    pendingUpgrade,
    minCompliantVersion,
    minCompliantInWindow,
    minCompliantBump,
  } = releaseAge;

  if (!worstLevel) {
    if (pendingUpgrade) {
      return `${severityIcon('info')} ${pendingUpgrade.semverBump} ${pendingUpgrade.version} (${formatDaysRemaining(pendingUpgrade.daysRemaining)})`;
    }
    return severityIcon('success');
  }

  const top = upgrades[0];
  if (!top) return severityIcon('success');

  const suffix = severity === 'warn' ? chalk.gray(' [not enforced]') : '';

  // Prefer a genuinely compliant, still-in-window release as the recommended
  // target — it may sit in a different tier than the one that breached (the
  // breached tier's own newest release can itself be stale). Only when no such
  // target exists does `describeUpgradeTarget` fall back to "no compliant
  // release available".
  const compliantTarget =
    minCompliantInWindow && minCompliantVersion
      ? {
          version: minCompliantVersion,
          bump: minCompliantBump ?? top.semverBump,
        }
      : undefined;

  const description = describeUpgradeTarget(top, compliantTarget);

  // The status reflects severity, not which tier breached: an enforced package
  // fails comply whether the worst breach is minor_overdue or major_overdue
  // (#28), so it renders red — never a softer yellow just because the breached
  // tier happens to be minor.
  const icon = severityIcon(severity === 'warn' ? 'warn' : 'error');
  return `${icon} ${description}${suffix}`;
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
