import chalk from 'chalk';
import Table from 'cli-table3';
import type { AggregatedReport, PackageDistribution } from './aggregator';
import type { RuleViolation } from '../rules/evaluator';
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
import { severityIcon, severityColor, stripAnsi } from './severity-format';

function printHeader() {
  console.log(chalk.blueBright.bold('\n📦 Packages\n'));
}

export function formatPackageName(
  pkg: PackageDistribution,
  banned?: RuleViolation,
): string {
  let prefix = '';
  if (pkg.releaseAge?.deprecated) {
    prefix += severityColor('error')('[DEPRECATED] ');
  }
  if (banned) {
    // Severity-neutral badge — the icon carries *how hard* the rule is
    // enforced (matching every other surface's icon/description split), so
    // 'warn' and 'info' no longer collapse into an invented "restricted"
    // concept that doesn't exist anywhere in the config (#86). There is only
    // one reason a package lands here — `forbid_packages` — so the badge
    // names that reason, not the severity.
    prefix += `${severityIcon(banned.severity)} [FORBIDDEN] `;
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

// Prefer a genuinely compliant, still-in-window release as the recommended
// target — it may sit in a different tier than the one that breached (the
// breached tier's own newest release can itself be stale). Only when no such
// target exists does `describeUpgradeTarget` fall back to "no compliant
// release available". Extracted so both the human table and `--summary-file`
// derive the recommended target the same way — they diverged on this once
// before (#57).
export function resolveCompliantTarget(
  releaseAge?: ReleaseAgeEntry,
): { version: string; bump: SemverBump } | undefined {
  if (!releaseAge?.minCompliantInWindow || !releaseAge.minCompliantVersion) {
    return undefined;
  }
  return {
    version: releaseAge.minCompliantVersion,
    bump: releaseAge.minCompliantBump ?? releaseAge.upgrades[0]?.semverBump,
  };
}

// Nested lockfile copies that are themselves overdue but aren't part of the
// enforced verdict (e.g. non-root duplicates under `scope: 'root'`) must
// stay visible — they don't block `comply`, but silently hiding them would
// let real problems go unnoticed just because the policy doesn't enforce
// them. One shared formatter, reused by the human table and
// `--summary-file`, so the wording can't drift between the two (#57).
//
// Doesn't re-list which versions are overdue — `describeBundleImpact`
// already names every resolved copy right before this in the same note, so
// repeating a subset of that same list here would just be noise. Bare fact
// text, no icon — the single leading icon for the whole note line is
// decided once by `describePackageNotes`, not per-fact.
export function describeAdvisoryBreaches(
  releaseAge?: ReleaseAgeEntry,
): string | undefined {
  if (!releaseAge?.advisoryBreaches?.length) return undefined;
  const n = releaseAge.advisoryBreaches.length;
  return `${n} nested ${n > 1 ? 'copies' : 'copy'} overdue, not enforced but recommended to resolve`;
}

// The single version a package's compliance verdict was actually measured
// against — `releaseAge.installedVersion` when release-age ran (which, under
// `scope: 'tree'`, may be a nested copy rather than the root version), else
// the plain root-resolved `pkg.version`. Always a single value, never the
// full `allVersions` list — that ambiguity (which of several installed
// copies a cell's overdue count refers to) is exactly what #57 flagged.
export function resolveInstalledVersion(pkg: PackageDistribution): string {
  return pkg.releaseAge?.installedVersion ?? pkg.version ?? 'N/A';
}

// Bundle-impact note for a package with more than one resolved lockfile
// copy — kept separate from the Installed/Target columns (and from
// describeAdvisoryBreaches) so each concern renders as its own sentence in
// the notes list, not crammed into a table cell (#57).
export function describeBundleImpact(
  pkg: PackageDistribution,
): string | undefined {
  if (!pkg.hasVersionConflict) return undefined;
  return `${pkg.allVersions.length} versions installed (bundle impact): ${pkg.allVersions.join(', ')}`;
}

/** Separator between facts on a Notes line — a real Unicode arrow, not an
 * ASCII ligature ("->"/"-->") that only renders as an arrow in specific
 * fonts and shows as literal dashes everywhere else (a rendered GitHub PR
 * comment, a plain terminal). */
export const NOTE_ARROW = '→';

export interface PackageNote {
  /** Always the info icon (🔵) — Notes are stdout-only advisory context,
   * never part of the mandatory verdict (they don't appear in
   * `--summary-file` at all), so nothing here should read as a warning. */
  icon: string;
  /** Each individual fact, to be joined with `NOTE_ARROW` by the caller. */
  facts: string[];
}

// Combines bundle-impact and advisory-breach info into the note shown for a
// package below the human table — stdout only. `--summary-file` feeds CI
// checks and PR comments, where non-blocking context read as a colored
// row/line looks like blame for something that isn't actually failing;
// stdout is the right place for "here's some extra context" (#59).
export function describePackageNotes(
  pkg: PackageDistribution,
): PackageNote | undefined {
  const facts = [
    describeBundleImpact(pkg),
    describeAdvisoryBreaches(pkg.releaseAge),
  ].filter((fact): fact is string => Boolean(fact));
  if (facts.length === 0) return undefined;
  return { icon: severityIcon('info'), facts };
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
  const description = describeUpgradeTarget(
    top,
    resolveCompliantTarget(releaseAge),
  );

  // The status reflects severity, not which tier breached: an enforced package
  // fails comply whether the worst breach is minor_overdue or major_overdue
  // (#28), so it renders red — never a softer yellow just because the breached
  // tier happens to be minor.
  const icon = severityIcon(severity === 'warn' ? 'warn' : 'error');
  return `${icon} ${description}${suffix}`;
}

/**
 * The `no-packages` hit for this package, if any. Filters `ruleViolations`
 * by `ruleId` rather than reading a dedicated banned-packages array, which is
 * what #77 removed — `packageName` is what keeps the join to a table row
 * exact, since a violation carries no file paths to match on.
 */
export function findForbidViolation(
  pkg: PackageDistribution,
  violations: RuleViolation[],
): RuleViolation | undefined {
  return violations.find(
    (v) => v.ruleId === 'no-packages' && v.packageName === pkg.packageName,
  );
}

export function printPackages(
  aggregated: AggregatedReport,
  mode: 'table' | 'chart',
) {
  const packages = aggregated.packageDistribution;
  const violations = aggregated.ruleViolations;

  // Nothing to report — print nothing at all, rather than a "Packages"
  // header plus "No packages found" underneath it. Pure boilerplate when
  // there's genuinely zero data (as opposed to zero *violations* among
  // real packages, which still renders the full table/chart below).
  if (packages.length === 0) return;

  if (mode === 'table') {
    printPackagesTable(packages, violations);
  } else if (mode === 'chart') {
    printPackagesChart(packages, violations);
  }
}

// Only ever called via printPackages, which already guarantees a non-empty
// `packages` array — see the "nothing to report" guard there.
function printPackagesTable(
  packages: PackageDistribution[],
  violations: RuleViolation[],
) {
  printHeader();

  const hasReleaseAge = packages.some((p) => p.releaseAge !== undefined);
  // With release age on, "Version" splits into "Installed" (the single
  // version the verdict was actually measured against) and "Target" (the
  // recommended upgrade) — cramming a multi-version list and an upgrade
  // recommendation into one cell was exactly the ambiguity #57 reported.
  const head = hasReleaseAge
    ? ['Package', 'Installed', 'Target']
    : ['Package', 'Version'];

  const table = new Table({
    head,
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });

  packages.forEach((pkg) => {
    const row = [formatPackageName(pkg, findForbidViolation(pkg, violations))];
    if (hasReleaseAge) {
      row.push(resolveInstalledVersion(pkg), formatUpgradeCell(pkg.releaseAge));
    } else {
      row.push(pkg.version || 'N/A');
    }
    table.push(row);
  });

  console.log(table.toString());

  // Bundle-impact (multiple resolved copies) and advisory nested breaches
  // are per-package context, not part of the pass/fail verdict — printed as
  // notes below the table rather than inside a cell, so the table itself
  // stays a clean "installed → target" comparison (#57).
  const notes = packages
    .map((pkg) => ({ pkg, note: describePackageNotes(pkg) }))
    .filter(
      (entry): entry is { pkg: PackageDistribution; note: PackageNote } =>
        entry.note !== undefined,
    );
  if (notes.length > 0) {
    console.log(chalk.gray('\nNotes:'));
    for (const { pkg, note } of notes) {
      const facts = note.facts.map((fact) => `${NOTE_ARROW} ${fact}`).join(' ');
      console.log(chalk.gray(`  ${note.icon} ${pkg.packageName} ${facts}`));
    }
  }

  console.log(chalk.gray(`\nTotal: ${formatCount(packages.length)} packages`));
}

// Only ever called via printPackages, which already guarantees a non-empty
// `packages` array — see the "nothing to report" guard there.
function printPackagesChart(
  packages: PackageDistribution[],
  violations: RuleViolation[],
) {
  // A share-of-usage chart has nothing to say about a package with no
  // measured usage — every such row would be a 0% empty bar, and since #78
  // `packages` is every package the repo owns rather than only the used
  // ones. With all-zero usage `maxPercentage` would also be 0, making every
  // bar length NaN.
  const charted = packages.filter((p) => p.usageCount > 0);
  if (charted.length === 0) return;

  printHeader();

  const maxBarWidth = 40;
  const maxPercentage = Math.max(...charted.map((p) => p.percentage));
  // Padding is computed from the rendered label itself (ANSI stripped for
  // width, since escape codes contribute zero visible columns) rather than
  // re-derived from which badges apply — that re-derivation is what silently
  // fell out of sync whenever a badge's text changed (#86: [BANNED]/
  // [RESTRICTED] were never accounted for here at all).
  const labels = charted.map((pkg) =>
    formatPackageName(pkg, findForbidViolation(pkg, violations)),
  );
  const maxLabelLength = Math.max(
    ...labels.map((label) => stripAnsi(label).length),
  );

  charted.forEach((pkg, i) => {
    const barLength = Math.round(
      (pkg.percentage / maxPercentage) * maxBarWidth,
    );
    const emptyLength = maxBarWidth - barLength;
    const label = labels[i]!;
    const padding = ' '.repeat(
      Math.max(0, maxLabelLength - stripAnsi(label).length),
    );

    const bar =
      chalk.green('█'.repeat(barLength)) + chalk.gray('░'.repeat(emptyLength));

    console.log(
      `${label}${padding} ${bar} ${chalk.bold(pkg.percentage.toFixed(1) + '%')} (${pkg.usageCount})`,
    );
  });
}
