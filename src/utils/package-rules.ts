import micromatch from 'micromatch';
import type {
  ResolvedDeprecatedPackagesRuleConfig,
  ResolvedHermexConfig,
} from '../config/types';
import { resolveDeprecatedPackagesRule } from '../config/overrides';
import type { RuleViolation } from '../rules/evaluator';
import type { PackageDistribution } from './package-distribution';
import type { PackageInventoryEntry } from './package-inventory';
import { isInstalled, isOwnedByRepo, isUsed } from './package-inventory';

/**
 * Selects the packages this repo owns (`isOwnedByRepo`): declared in
 * `package.json`, recorded as a direct dependency by the lockfile, and/or
 * imported by scanned source.
 *
 * Matching usage alone was the bug behind #75: the usage axis is built from
 * component imports, so build-only tooling — invoked via `npx`, an npm
 * script or a git hook, and never imported — was invisible to a rule that
 * named it outright. Purely transitive dependencies stay out of scope: the
 * repo cannot remove one without dropping its parent, so flagging it would
 * report a violation nobody can fix.
 *
 * Returns `RuleViolation`s like every other rule (#77). One violation per
 * matched package, so a glob rule (`@legacy/*`) hitting three packages
 * yields three entries sharing `patterns` and differing on `packageName` —
 * a hit can be declared-only with no files involved at all (#75).
 */
export function detectForbiddenPackages(
  inventory: PackageInventoryEntry[],
  config?: ResolvedHermexConfig,
): RuleViolation[] {
  const forbidRules = config?.rules['no-packages'] ?? [];
  if (forbidRules.length === 0) {
    return [];
  }

  const violations: RuleViolation[] = [];
  for (const entry of inventory) {
    if (!isOwnedByRepo(entry)) continue;

    for (const rule of forbidRules) {
      if (micromatch.isMatch(entry.packageName, rule.patterns)) {
        violations.push({
          ruleId: 'no-packages',
          severity: rule.severity,
          patterns: rule.patterns,
          message: rule.message,
          packageName: entry.packageName,
        });
        break;
      }
    }
  }
  return violations;
}

/**
 * Selects the *installed* axis (plus used, to cover a phantom dependency
 * that is imported without being in the lockfile).
 *
 * Deliberately not `isOwnedByRepo`: "required" means the package must be
 * available to the code, so a transitive copy satisfies it, and a name in
 * `packages.ignore` — excluded from *reporting*, not uninstalled — must not
 * suddenly count as missing. Being declared but absent from the lockfile,
 * on the other hand, is a genuinely unsatisfied requirement.
 */
export function detectRequiredPackages(
  inventory: PackageInventoryEntry[],
  config?: ResolvedHermexConfig,
): RuleViolation[] {
  const requireRules = config?.rules['require-packages'] ?? [];
  if (requireRules.length === 0) return [];

  const installedNames = inventory
    .filter((entry) => isInstalled(entry) || isUsed(entry))
    .map((entry) => entry.packageName);

  const violations: RuleViolation[] = [];
  for (const rule of requireRules) {
    const satisfied = rule.patterns.some((p) =>
      installedNames.some((name) => micromatch.isMatch(name, p)),
    );
    if (!satisfied) {
      violations.push({
        ruleId: 'require-packages',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
      });
    }
  }
  return violations;
}

/**
 * Judges the deprecation notice registry enrichment already recorded on
 * each package. A pure, synchronous rule over `PackageDistribution.deprecated`
 * — it performs no I/O of its own (#107).
 *
 * Unlike its siblings above it cannot run during `aggregateReports`:
 * `deprecated` doesn't exist until `enrichFromRegistry` has run, so the
 * pipeline calls this from the registry block instead. That's also why it
 * takes `PackageDistribution[]` rather than the inventory — the
 * distribution is the axis enrichment writes to.
 *
 * Resolution is last-match-wins against an implicit `['**']` baseline
 * (`resolveDeprecatedPackagesRule`), the same governance `no-outdated-packages`
 * uses, rather than "every matching entry fires" — so exactly one entry
 * governs a package and `severity: 'off'` genuinely exempts it. The
 * baseline is why a deprecated package stays visible with no rule authored
 * at all, at 'info', never affecting the verdict.
 *
 * Scope matches `detectForbiddenPackages`: only packages the repo owns
 * reach here, since `calculatePackageDistribution` already selected them. A
 * purely transitive deprecated package isn't the repo's to fix.
 */
export function detectDeprecatedPackages(
  packages: PackageDistribution[],
  rules: ResolvedDeprecatedPackagesRuleConfig[],
): RuleViolation[] {
  const violations: RuleViolation[] = [];
  for (const pkg of packages) {
    if (!pkg.deprecated) continue;

    const rule = resolveDeprecatedPackagesRule(pkg.packageName, rules);
    if (rule.severity === 'off') continue;

    violations.push({
      ruleId: 'no-deprecated-packages',
      severity: rule.severity,
      patterns: rule.patterns,
      message: rule.message,
      packageName: pkg.packageName,
      deprecated: pkg.deprecated,
    });
  }
  return violations;
}
