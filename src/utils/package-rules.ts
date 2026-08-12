import micromatch from 'micromatch';
import type { ResolvedHermexConfig } from '../config/types';
import type { RuleViolation } from '../rules/evaluator';
import type { PackageDistribution } from './package-distribution';

export interface BannedPackageViolation {
  packageName: string;
  severity: 'error' | 'warn' | 'info';
  message?: string;
}

/**
 * @param distribution - Packages discovered through import/usage analysis.
 * @param declaredPackages - Package names declared in `package.json` (see
 *   `collectDeclaredPackages`). Checked in addition to `distribution` because
 *   the distribution is built from component usage alone, so build-only
 *   tooling — invoked via `npx`, scripts or git hooks and never imported —
 *   would otherwise pass a forbid rule that names it outright (#75).
 */
export function detectBannedPackages(
  distribution: PackageDistribution[],
  config?: ResolvedHermexConfig,
  declaredPackages: string[] = [],
): BannedPackageViolation[] {
  const forbidRules = config?.rules.forbid_packages ?? [];
  if (forbidRules.length === 0) {
    return [];
  }

  const ignorePatterns = config?.packages.ignore ?? [];

  // Distribution names first, in their existing (usage-ranked) order, so
  // adding declared packages never reorders the violations already reported.
  const candidates = new Set(distribution.map((pkg) => pkg.packageName));
  for (const name of declaredPackages) {
    if (candidates.has(name)) continue;
    // `calculatePackageDistribution` already applies `packages.ignore` to
    // everything it emits; apply it here too so an ignored package does not
    // become newly visible just by being declared.
    if (ignorePatterns.length > 0 && micromatch.isMatch(name, ignorePatterns))
      continue;
    candidates.add(name);
  }

  const violations: BannedPackageViolation[] = [];
  for (const packageName of candidates) {
    for (const rule of forbidRules) {
      if (micromatch.isMatch(packageName, rule.patterns)) {
        violations.push({
          packageName,
          severity: rule.severity,
          message: rule.message,
        });
        break;
      }
    }
  }
  return violations;
}

export function detectRequiredPackages(
  distribution: PackageDistribution[],
  versions: Record<string, string>,
  config?: ResolvedHermexConfig,
): RuleViolation[] {
  const requireRules = config?.rules.require_packages ?? [];
  if (requireRules.length === 0) return [];

  // All package names available: from lockfile versions + from import distribution
  const installedNames = new Set([
    ...Object.keys(versions),
    ...distribution.map((p) => p.packageName),
  ]);

  const violations: RuleViolation[] = [];
  for (const rule of requireRules) {
    const satisfied = rule.patterns.some((p) =>
      [...installedNames].some((name) => micromatch.isMatch(name, p)),
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
