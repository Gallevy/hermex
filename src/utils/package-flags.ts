import type { PackageDistribution } from './package-distribution';
import type {
  CoreRuleViolation,
  NoDeprecatedPackagesViolation,
  NoPackagesViolation,
  RuleViolation,
} from '../rules/shared';
import { isPluginViolation } from '../rules/shared';
import { severityColor, severityIcon } from './severity-format';

/** The badge word a package rule contributes. Severity-neutral on purpose:
 * the icon beside it carries how hard the rule is enforced, which is what
 * every other surface already does. `[BANNED]`/`[RESTRICTED]` failed that
 * test — one rule, two adjectives, and no config concept behind either
 * (#86).
 *
 * Lowercase, matching the semver words in the Minimum target column beside
 * it and the rule ids these come from. The icon is already doing the
 * shouting; uppercasing the word too just put two casing conventions in one
 * row. */
export type PackageFlagLabel = 'forbidden' | 'deprecated';

export interface PackageFlag {
  ruleId: CoreRuleViolation['ruleId'];
  /** A badge exists if and only if a violation does, so this is always a
   * real violation's severity — never a config-resolved one. That's what
   * keeps a badge and its rules-table row from ever disagreeing. */
  severity: RuleViolation['severity'];
  label: PackageFlagLabel;
  /** Long-form context (the publisher's deprecation notice). Rendered in
   * the Notes block below the table, never inside a cell — a table cell is
   * the wrong shape for a sentence. */
  detail?: string;
}

/** `undefined` means this rule has nothing to say about this package. */
type Contribute = (
  pkg: PackageDistribution,
  violations: RuleViolation[],
) => Omit<PackageFlag, 'ruleId'> | undefined;

/**
 * Plugin findings are excluded before the id check, not merely to narrow
 * the type: this column joins on hermex's own rules, and a plugin's id
 * space is its own (#102).
 */
function findForbidViolation(
  packageName: string,
  violations: RuleViolation[],
): NoPackagesViolation | undefined {
  return violations.find(
    (v): v is NoPackagesViolation =>
      !isPluginViolation(v) &&
      v.ruleId === 'no-packages' &&
      v.packageName === packageName,
  );
}

function findDeprecatedViolation(
  packageName: string,
  violations: RuleViolation[],
): NoDeprecatedPackagesViolation | undefined {
  return violations.find(
    (v): v is NoDeprecatedPackagesViolation =>
      !isPluginViolation(v) &&
      v.ruleId === 'no-deprecated-packages' &&
      v.packageName === packageName,
  );
}

const forbiddenFlag: Contribute = (pkg, violations) => {
  const violation = findForbidViolation(pkg.packageName, violations);
  if (!violation) return undefined;
  return { severity: violation.severity, label: 'forbidden' };
};

const deprecatedFlag: Contribute = (pkg, violations) => {
  const violation = findDeprecatedViolation(pkg.packageName, violations);
  if (!violation) return undefined;
  return {
    severity: violation.severity,
    label: 'deprecated',
    detail: violation.deprecated,
  };
};

/**
 * The single place that declares each package rule's badge — the Packages
 * table's counterpart to `ONE_ROW_PER_VIOLATION` in `print-rules.ts`.
 * Adding a package rule to the table is one entry here and nothing else:
 * no new column, no change to any renderer.
 *
 * An ordered array rather than a Record keyed by rule id, because array
 * order IS badge order on the row — a Record would make that ordering
 * implicit and fragile.
 *
 * `no-outdated-packages` deliberately has no entry. Its verdict is a version
 * comparison, not a flag, so its display is the Installed/Minimum target
 * columns — the same kind of declared rendering choice `NoOutdatedPackagesViolation`
 * (`src/rules/shared.ts`) already makes about it rendering no rules-table
 * row either.
 */
const PACKAGE_FLAG_CONTRIBUTORS: readonly {
  ruleId: CoreRuleViolation['ruleId'];
  contribute: Contribute;
}[] = [
  { ruleId: 'no-packages', contribute: forbiddenFlag },
  { ruleId: 'no-deprecated-packages', contribute: deprecatedFlag },
];

/**
 * Every package rule's badge for one row, in declaration order. `ruleId` is
 * stamped on from the registry entry rather than returned by the
 * contributor, so a contributor structurally cannot mislabel its own rule.
 */
export function collectPackageFlags(
  pkg: PackageDistribution,
  violations: RuleViolation[],
): PackageFlag[] {
  const flags: PackageFlag[] = [];
  for (const { ruleId, contribute } of PACKAGE_FLAG_CONTRIBUTORS) {
    const flag = contribute(pkg, violations);
    if (flag) flags.push({ ruleId, ...flag });
  }
  return flags;
}

/** The Flags cell: `icon label` per badge, space-joined; empty when no
 * rule flagged the row. Colored — cli-table3 measures with `string-width`,
 * which ignores ANSI, so column math is unaffected. */
export function formatPackageFlags(flags: PackageFlag[]): string {
  return flags
    .map(
      (flag) =>
        `${severityIcon(flag.severity)} ${severityColor(flag.severity)(flag.label)}`,
    )
    .join(' ');
}

/** Notes-line facts for the badges carrying long-form context, phrased to
 * read as a continuation of the badge itself ("deprecated: <notice>"). */
export function describeFlagDetails(flags: PackageFlag[]): string[] {
  return flags
    .filter((flag) => flag.detail !== undefined)
    .map((flag) => `${flag.label}: ${flag.detail}`);
}
