import micromatch from 'micromatch';
import type { ResolvedRulesConfig } from '../config/types';
import { readPackageJson } from './shared';
import type { RuleViolation } from './shared';

interface FieldLookup {
  exists: boolean;
  value: unknown;
}

/** Resolves a dot-path like "engines.node" against the manifest object. */
function getFieldAtPath(
  pkg: Record<string, unknown> | null,
  path: string,
): FieldLookup {
  let current: unknown = pkg;
  for (const key of path.split('.')) {
    if (
      current === null ||
      typeof current !== 'object' ||
      !(key in (current as Record<string, unknown>))
    ) {
      return { exists: false, value: undefined };
    }
    current = (current as Record<string, unknown>)[key];
  }
  return { exists: true, value: current };
}

/** Primitives compare by string form; objects/arrays never match a value pattern. */
function valueMatches(value: unknown, valuePatterns: string[]): boolean {
  if (value === null || typeof value === 'object') return false;
  return micromatch.isMatch(String(value), valuePatterns);
}

export function evaluatePackageFieldRules(
  repoPath: string,
  rulesConfig: ResolvedRulesConfig,
): RuleViolation[] {
  const requireRules = rulesConfig['require-package-fields'];
  const forbidRules = rulesConfig['no-package-fields'];
  if (requireRules.length === 0 && forbidRules.length === 0) return [];

  const pkg = readPackageJson(repoPath);
  const violations: RuleViolation[] = [];

  for (const rule of requireRules) {
    const lookups = rule.patterns.map((p) => ({
      path: p,
      ...getFieldAtPath(pkg, p),
    }));
    const satisfied = lookups.some(
      (l) => l.exists && (!rule.values || valueMatches(l.value, rule.values)),
    );
    if (!satisfied) {
      // Prefer reporting a present-but-mismatched field over a missing one
      const mismatch = rule.values ? lookups.find((l) => l.exists) : undefined;
      violations.push({
        ruleId: 'require-package-fields',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
        matchedFiles: [],
        fieldPath: mismatch?.path,
        actualValue:
          mismatch && typeof mismatch.value !== 'object'
            ? String(mismatch.value)
            : undefined,
      });
    }
  }

  for (const rule of forbidRules) {
    for (const pattern of rule.patterns) {
      const lookup = getFieldAtPath(pkg, pattern);
      const hit =
        lookup.exists &&
        (!rule.values || valueMatches(lookup.value, rule.values));
      if (hit) {
        violations.push({
          ruleId: 'no-package-fields',
          severity: rule.severity,
          patterns: rule.patterns,
          message: rule.message,
          matchedFiles: [],
          fieldPath: pattern,
          actualValue:
            lookup.value !== null && typeof lookup.value !== 'object'
              ? String(lookup.value)
              : undefined,
        });
      }
    }
  }

  return violations;
}
