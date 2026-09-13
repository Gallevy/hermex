import chalk from 'chalk';
import Table from 'cli-table3';
import type { AggregatedReport, PackageDistribution } from './aggregator';
import type { RuleViolation } from '../rules/evaluator';
import type {
  AvailableUpgrade,
  ReleaseAgeEntry,
  SemverBump,
} from '../npm-registry/types';
import { formatDaysOverdue, formatDaysRemaining } from './format-utils';
import { formatSeverityTally, severityIcon } from './severity-format';
import type { PackageFlag } from './package-flags';
import {
  collectPackageFlags,
  describeFlagDetails,
  formatPackageFlags,
} from './package-flags';
import type { PackageColumnContributor } from './package-columns';
import { DEFAULT_VERSION_COLUMNS } from './package-columns';
import type { NoOutdatedPackagesViolation } from '../rules/shared';
import { isPluginViolation } from '../rules/shared';

function printHeader() {
  console.log(chalk.blueBright.bold('\n📦 Packages\n'));
}

/**
 * This row's `no-outdated-packages` hit, if any — the join that gives the
 * Minimum target cell its verdict.
 *
 * Plugin findings are excluded before the id check, not merely to narrow
 * the type: this column joins on hermex's own rule, and a plugin's id space
 * is its own (#102). Mirrors `findForbidViolation` in `./package-flags.ts`.
 */
function findOutdatedViolation(
  packageName: string,
  violations: RuleViolation[],
): NoOutdatedPackagesViolation | undefined {
  return violations.find(
    (v): v is NoOutdatedPackagesViolation =>
      !isPluginViolation(v) &&
      v.ruleId === 'no-outdated-packages' &&
      v.packageName === packageName,
  );
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
// When there is no in-window target, the breached tier's own newest release
// is still the right thing to name. Being on the newest release that exists
// never breaches at all — nothing is newer than installed, so no tier is
// breached and no row is produced — which means this branch is only ever
// reached when a newer release DOES exist and has simply not been taken.
// It used to read "no compliant release available", which contradicted the
// version printed beside it and contradicted `minCompliantVersion`'s own
// rule that being on latest counts as compliant (#26's wording, not its
// arithmetic — the day count below is unchanged).
export function describeUpgradeTarget(
  top: AvailableUpgrade,
  compliantTarget?: { version: string; bump: SemverBump },
): string {
  const version = compliantTarget?.version ?? top.version;
  const bump = compliantTarget?.bump ?? top.semverBump;
  // Counted from the breached tier's OLDEST release: how long the tier has
  // been out of compliance, not how old the recommended target is (#24).
  const overdue = formatDaysOverdue(
    top.breachReleasedDaysAgo,
    top.thresholdDays,
  );
  return `${version} (${bump}, ${overdue})`;
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
  const target = releaseAge?.recommendedTarget;
  if (!target?.inWindow) return undefined;
  return {
    version: target.version,
    bump: target.semverBump ?? releaseAge!.upgrades[0]?.semverBump,
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
// against — `releaseAge.measuredVersion` when the rule ran (which, under
// `scope: 'tree'`, may be a nested copy rather than the root version), else
// the plain root-resolved `pkg.version`. Always a single value, never the
// full `allVersions` list — that ambiguity (which of several installed
// copies a cell's overdue count refers to) is exactly what #57 flagged.
export function resolveInstalledVersion(pkg: PackageDistribution): string {
  return pkg.releaseAge?.measuredVersion ?? pkg.version ?? 'N/A';
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
  flags: PackageFlag[] = [],
): PackageNote | undefined {
  const facts = [
    describeBundleImpact(pkg),
    describeAdvisoryBreaches(pkg.releaseAge),
    // Appended, not prepended: a badge's long-form context (the publisher's
    // deprecation notice) elaborates on the Flags column, so it reads last,
    // after the facts about the package's own installed copies.
    ...describeFlagDetails(flags),
  ].filter((fact): fact is string => Boolean(fact));
  if (facts.length === 0) return undefined;
  return { icon: severityIcon('info'), facts };
}

/**
 * The recommended upgrade as text, with no icon and no verdict: the most
 * conservative version that clears the breach, or the countdown for one
 * that is merely coming due. Empty when there is nothing to recommend.
 *
 * Shared verbatim with `--summary-file`, which renders its own severity in
 * a leading column of its own and so wants the text alone. That sharing is
 * what makes "both surfaces recommend the same version" structural rather
 * than a pair of call sites kept in step by hand (#57).
 */
export function describeMinimumTarget(releaseAge?: ReleaseAgeEntry): string {
  if (!releaseAge) return '';
  const { upgrades, pendingUpgrade } = releaseAge;

  // `upgrades` holds breached tiers only, so an empty list IS "nothing
  // overdue" — no stored verdict needed to ask the question (#189).
  const top = upgrades[0];
  if (!top) {
    return pendingUpgrade
      ? `${pendingUpgrade.version} (${pendingUpgrade.semverBump}, ${formatDaysRemaining(pendingUpgrade.daysRemaining)})`
      : '';
  }

  return describeUpgradeTarget(top, resolveCompliantTarget(releaseAge));
}

/** No release-age verdict for this row at all. Deliberately not blank and
 * not 🟢: an em dash says hermex has no opinion here — either the package
 * has no installed version to check (declared but absent from the lockfile,
 * which the Installed column shows as `N/A`) or the registry never answered
 * for it. 🟢 is the opposite claim: it looked, and there is nothing to do. */
const NO_TARGET = '—';

/**
 * The human table's "Minimum target" cell: `describeMinimumTarget` prefixed
 * by release-age's own verdict.
 *
 * An icon here means a rule is judging this package, and which icon means
 * how hard. So an entry at severity 'off' renders the target text with no
 * icon at all — it produced no violation, and inheriting red from a
 * fallback ternary (as it used to) claimed a verdict nobody made.
 *
 * A pending upgrade keeps the all-clear icon rather than going bare or
 * borrowing a severity: nothing is overdue, so the row is genuinely fine —
 * it just has a date attached. Bare cells next to iconned ones read as a
 * rendering failure rather than as a deliberate absence of verdict.
 */
export function formatMinimumTargetCell(
  pkg: PackageDistribution,
  violations: RuleViolation[],
): string {
  const releaseAge = pkg.releaseAge;
  if (!releaseAge) return NO_TARGET;
  const description = describeMinimumTarget(releaseAge);

  // `upgrades` holds breached tiers only, so emptiness is the all-clear.
  if (!releaseAge.upgrades[0]) {
    const ok = severityIcon('success');
    return description ? `${ok} ${description}` : ok;
  }

  // The verdict is joined from the violation, never read off the package —
  // the same move `collectPackageFlags` makes for the badge column, so a
  // cell and its rules-table counterpart structurally cannot disagree
  // (#189). A breached package with no violation is one whose governing
  // entry is 'off': it renders the target it would have recommended, with
  // no icon, because nothing about it is a verdict.
  const violation = findOutdatedViolation(pkg.packageName, violations);
  if (!violation) return description;

  // Severity, not which tier breached: an enforced package fails comply
  // whether the overdue tier is minor or major (#28), so it renders red —
  // never a softer yellow just because the breached tier happens to be minor.
  return `${severityIcon(violation.severity)} ${description}`;
}

/**
 * `no-outdated-packages`'s entry in the column registry — the Installed and
 * Minimum target pair.
 *
 * Declared here beside the renderers it calls rather than inside
 * `./package-columns.ts`, which would have to import them and close a cycle
 * back to this module. That file owns the *contract*; each rule's columns
 * are declared wherever their cells are rendered.
 *
 * `applies` keys off the data, not the config: a run that configured the
 * rule but got nothing back (every package skipped, registry unreachable)
 * keeps the plain two-column table instead of growing a column of blanks.
 */
const outdatedPackagesColumns: PackageColumnContributor = {
  ruleId: 'no-outdated-packages',
  // With the rule on, "Version" splits into "Installed" (the single version
  // the verdict was actually measured against) and "Minimum target" (the
  // most conservative upgrade that clears the breach) — cramming a
  // multi-version list and an upgrade recommendation into one cell was
  // exactly the ambiguity #57 reported. "Minimum" is load-bearing: the cell
  // deliberately does not name the latest release (#24, #26).
  headers: ['Installed', 'Minimum target'],
  applies: (packages) => packages.some((p) => p.releaseAge !== undefined),
  cells: (pkg, violations) => [
    resolveInstalledVersion(pkg),
    formatMinimumTargetCell(pkg, violations),
  ],
};

/**
 * Every rule that contributes columns, in table order — the counterpart to
 * `PACKAGE_FLAG_CONTRIBUTORS` (`./package-flags.ts`) for output that a
 * badge cannot carry. Adding such a rule is one entry here; the table below
 * asks the registry rather than testing for any rule by name.
 *
 * When none applies, `DEFAULT_VERSION_COLUMNS` renders the plain `Version`
 * column the table has always had.
 */
const PACKAGE_COLUMN_CONTRIBUTORS: readonly PackageColumnContributor[] = [
  outdatedPackagesColumns,
];

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

  const flags = packages.map((pkg) => collectPackageFlags(pkg, violations));
  // Only worth a column once something has actually landed in it —
  // otherwise every repo with no package-rule hits grows a column of blanks
  // where it used to have a clean two-column table.
  const hasFlags = flags.some((rowFlags) => rowFlags.length > 0);

  // Which rule owns the version columns is the registry's answer, not a
  // test for any rule by name — the table no longer knows that
  // `no-outdated-packages` exists (#189).
  const versionColumns =
    PACKAGE_COLUMN_CONTRIBUTORS.find((c) => c.applies(packages)) ??
    DEFAULT_VERSION_COLUMNS;

  const head = ['Package', ...versionColumns.headers];
  if (hasFlags) head.push('Flags');

  const table = new Table({
    head,
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });

  packages.forEach((pkg, index) => {
    // Just the name. The badges that used to be glued on as prefixes are a
    // column of their own now (#86).
    const row = [pkg.packageName, ...versionColumns.cells(pkg, violations)];
    if (hasFlags) row.push(formatPackageFlags(flags[index]));
    table.push(row);
  });

  console.log(table.toString());

  // Bundle-impact (multiple resolved copies) and advisory nested breaches
  // are per-package context, not part of the pass/fail verdict — printed as
  // notes below the table rather than inside a cell, so the table itself
  // stays a clean "installed → target" comparison (#57).
  const notes = packages
    .map((pkg, index) => ({
      pkg,
      note: describePackageNotes(pkg, flags[index]),
    }))
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

  // The same "N errors, M warnings" tally style as the Rules section
  // (`print-rules.ts`), computed from this table's own release-age
  // violations — the only violation kind this table uniquely surfaces (a
  // banned or deprecated package's own hit is already counted in the Rules
  // tally; the Flags badge here is just a cross-reference, not a second
  // count).
  // A plain package count ("N packages total") said nothing about
  // compliance and didn't add up with anything else on screen — this does:
  // Rules-tally + Packages-tally always equals the overall mandatory count.
  const releaseAgeViolations = violations.filter(
    (v) => v.ruleId === 'no-outdated-packages',
  );
  const tally = formatSeverityTally(releaseAgeViolations, {
    includeInfo: true,
  });
  if (tally) {
    console.log(chalk.gray(`\n${tally}`));
  }
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
  const maxLabelLength = Math.max(...charted.map((p) => p.packageName.length));

  charted.forEach((pkg) => {
    const barLength = Math.round(
      (pkg.percentage / maxPercentage) * maxBarWidth,
    );
    const emptyLength = maxBarWidth - barLength;
    // Padded on the bare name — which is exactly what `maxLabelLength`
    // measured. Badges trail the row instead of prefixing the label: as a
    // prefix they made every flagged row wider than the padding allowed
    // for (and carried ANSI codes `.length` counted as visible width),
    // which is the misalignment #86 reported.
    const label = pkg.packageName.padEnd(maxLabelLength, ' ');

    const bar =
      chalk.green('█'.repeat(barLength)) + chalk.gray('░'.repeat(emptyLength));

    const badges = formatPackageFlags(collectPackageFlags(pkg, violations));

    console.log(
      `${label} ${bar} ${chalk.bold(pkg.percentage.toFixed(1) + '%')} (${pkg.usageCount})${badges ? ` ${badges}` : ''}`,
    );
  });
}
