import type { PackageDistribution } from './package-distribution';
import type { CoreRuleViolation, RuleViolation } from '../rules/shared';

/**
 * How a package rule contributes *columns* to the Packages table — the
 * counterpart to `PACKAGE_FLAG_CONTRIBUTORS` in `./package-flags.ts`, for
 * rules whose output does not fit a badge.
 *
 * Two registries rather than one because the two shapes genuinely differ: a
 * badge is `icon + one word` and every badge rule stacks into the single
 * Flags cell, while a column rule owns table structure — its own headers,
 * its own cells, and a say in whether those columns exist at all.
 * Collapsing them would mean a contributor returning "a badge, or else
 * arbitrary table structure", which is not one contract.
 *
 * `no-outdated-packages` is the reason this exists. Its result is a version
 * comparison — where you are, and the oldest release that would clear the
 * breach — which is the primary answer the rule exists to give, not an
 * annotation on a row. Squeezing it into a badge would have cost the
 * recommended version, the tier and the day count (#189).
 */
export interface PackageColumnContributor {
  ruleId: CoreRuleViolation['ruleId'];
  /** Column headers, left to right. `cells` must return exactly this many. */
  headers: readonly string[];
  /**
   * Whether these columns appear in this run at all. Keyed off the data
   * rather than the config so a rule that was configured but produced
   * nothing (every package skipped, registry unreachable) doesn't grow a
   * column of blanks where the table used to be clean.
   */
  applies: (packages: PackageDistribution[]) => boolean;
  cells: (pkg: PackageDistribution, violations: RuleViolation[]) => string[];
}

/**
 * The version columns when no rule claims them: one plain `Version`.
 *
 * Not a contributor — it's the floor, the thing rendered when every
 * contributor declines, so it has no `ruleId` and no `applies`.
 */
export const DEFAULT_VERSION_COLUMNS = {
  headers: ['Version'] as const,
  cells: (pkg: PackageDistribution): string[] => [pkg.version || 'N/A'],
};
