import type { RulesConfig } from '../config/types';
import { toArray, findMatches } from './shared';
import type { RuleViolation } from './shared';

export function evaluateFileRules(
  repoPath: string,
  rulesConfig: RulesConfig,
  excludes: string[],
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  for (const rule of toArray(rulesConfig.forbid_files)) {
    const matches = findMatches(rule.patterns, repoPath, excludes);
    if (matches.length > 0) {
      violations.push({
        type: 'forbid_files',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
        matchedFiles: matches,
      });
    }
  }

  for (const rule of toArray(rulesConfig.require_files)) {
    const matches = findMatches(rule.patterns, repoPath, excludes);
    if (matches.length === 0) {
      violations.push({
        type: 'require_files',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
        matchedFiles: [],
      });
    }
  }

  for (const rule of toArray(rulesConfig.allow_files)) {
    const matches = findMatches(rule.patterns, repoPath, excludes);
    if (matches.length === 0) {
      violations.push({
        type: 'allow_files',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
        matchedFiles: [],
      });
    }
  }

  return violations;
}
