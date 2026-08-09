import micromatch from 'micromatch';
import type { HermexConfig } from '../config/types';
import type { RuleViolation } from '../rules/evaluator';
import { toArray, isEnabled } from '../rules/evaluator';
import type { PackageDistribution } from './package-distribution';

export interface BannedPackageViolation {
  packageName: string;
  severity: 'error' | 'warn' | 'info';
  message?: string;
}

export function detectBannedPackages(
  distribution: PackageDistribution[],
  config?: HermexConfig,
): BannedPackageViolation[] {
  const forbidRules = toArray(config?.rules.forbid_packages).filter(isEnabled);
  if (forbidRules.length === 0) {
    return [];
  }

  const violations: BannedPackageViolation[] = [];
  for (const pkg of distribution) {
    for (const rule of forbidRules) {
      if (micromatch.isMatch(pkg.packageName, rule.patterns)) {
        violations.push({
          packageName: pkg.packageName,
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
  config?: HermexConfig,
): RuleViolation[] {
  const requireRules = toArray(config?.rules.require_packages).filter(
    isEnabled,
  );
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
