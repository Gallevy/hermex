import type { ResolvedRulesConfig } from '../config/types';
import { findMatches } from './shared';
import type { RuleViolation } from './shared';

export function evaluateFileRules(
  repoPath: string,
  rulesConfig: ResolvedRulesConfig,
  excludes: string[],
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  for (const rule of rulesConfig['no-files']) {
    const matches = findMatches(rule.patterns, repoPath, excludes);
    if (matches.length > 0) {
      violations.push({
        ruleId: 'no-files',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
        matchedFiles: matches,
      });
    }
  }

  for (const rule of rulesConfig['require-files']) {
    const matches = findMatches(rule.patterns, repoPath, excludes);
    if (matches.length === 0) {
      violations.push({
        ruleId: 'require-files',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
        matchedFiles: [],
      });
    }
  }

  return violations;
}
