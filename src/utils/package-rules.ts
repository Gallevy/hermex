import micromatch from 'micromatch';
import type { ResolvedHermexConfig } from '../config/types';
import type { RuleViolation } from '../rules/evaluator';
import type { PackageInventoryEntry } from './package-inventory';
import { isInstalled, isOwnedByRepo, isUsed } from './package-inventory';

export interface BannedPackageViolation {
  packageName: string;
  severity: 'error' | 'warn' | 'info';
  message?: string;
}

/**
 * Selects the packages this repo owns — declared in `package.json` and/or
 * imported by scanned source (`isOwnedByRepo`).
 *
 * Matching usage alone was the bug behind #75: the usage axis is built from
 * component imports, so build-only tooling — invoked via `npx`, an npm
 * script or a git hook, and never imported — was invisible to a rule that
 * named it outright. Purely transitive dependencies stay out of scope: the
 * repo cannot remove one without dropping its parent, so flagging it would
 * report a violation nobody can fix.
 */
export function detectBannedPackages(
  inventory: PackageInventoryEntry[],
  config?: ResolvedHermexConfig,
): BannedPackageViolation[] {
  const forbidRules = config?.rules.forbid_packages ?? [];
  if (forbidRules.length === 0) {
    return [];
  }

  const violations: BannedPackageViolation[] = [];
  for (const entry of inventory) {
    if (!isOwnedByRepo(entry)) continue;

    for (const rule of forbidRules) {
      if (micromatch.isMatch(entry.packageName, rule.patterns)) {
        violations.push({
          packageName: entry.packageName,
          severity: rule.severity,
          message: rule.message,
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
  const requireRules = config?.rules.require_packages ?? [];
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
        type: 'require_packages',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
        matchedFiles: [],
      });
    }
  }
  return violations;
}
