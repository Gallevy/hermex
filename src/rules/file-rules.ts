import type { RulesConfig } from '../config/types';
import { toArray, findMatches } from './shared';
import type { RuleViolation } from './shared';

export function evaluateFileRules(
  repoPath: string,
  rulesConfig: RulesConfig,
  excludes: string[],
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  for (const rule of toArray(rulesConfig.detect_files)) {
    const matches = findMatches(rule.patterns, repoPath, excludes);
    if (matches.length > 0) {
      violations.push({
        type: 'detect_files',
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

  return violations;
}
