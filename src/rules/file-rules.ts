import type { ResolvedRulesConfig } from '../config/types';
import { findMatches } from './shared';
import type { RuleViolation } from './shared';

export function evaluateFileRules(
  repoPath: string,
  rulesConfig: ResolvedRulesConfig,
  excludes: string[],
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  for (const rule of rulesConfig.detect_files) {
    const matches = findMatches(rule.patterns, repoPath, excludes);
    if (matches.length > 0) {
      violations.push({
        type: 'detect_files',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
        matchedFiles: matches,
        // Every matched file is its own thing to remove.
        subjectCount: matches.length,
      });
    }
  }

  for (const rule of rulesConfig.require_files) {
    const matches = findMatches(rule.patterns, repoPath, excludes);
    if (matches.length === 0) {
      violations.push({
        type: 'require_files',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
        matchedFiles: [],
        // Patterns are OR-ed, so this is one unmet requirement.
        subjectCount: 1,
      });
    }
  }

  return violations;
}
