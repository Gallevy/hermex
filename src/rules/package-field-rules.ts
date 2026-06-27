import type { RulesConfig } from '../config/types';
import { toArray, readPackageJson } from './shared';
import type { RuleViolation } from './shared';

export function evaluatePackageFieldRules(
  repoPath: string,
  rulesConfig: RulesConfig,
): RuleViolation[] {
  const rules = toArray(rulesConfig.require_package_fields);
  if (rules.length === 0) {
    return [];
  }

  const pkg = readPackageJson(repoPath);
  const fieldKeys = pkg ? Object.keys(pkg) : [];

  return rules
    .filter((rule) => !rule.patterns.some((p) => fieldKeys.includes(p)))
    .map((rule) => ({
      type: 'require_package_fields' as const,
      severity: rule.severity,
      patterns: rule.patterns,
      message: rule.message,
      matchedFiles: [],
    }));
}
