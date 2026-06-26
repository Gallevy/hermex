import { globSync } from 'glob';
import path from 'path';
import type { RuleConfig, RulesConfig } from '../config/types';

export interface RuleViolation {
  type: 'forbid_files' | 'require_files' | 'allow_files';
  severity: 'error' | 'warn';
  patterns: string[];
  message?: string;
  matchedFiles: string[];
}

function toArray(config: RuleConfig | RuleConfig[] | undefined): RuleConfig[] {
  if (!config) return [];
  return Array.isArray(config) ? config : [config];
}

function findMatches(patterns: string[], repoPath: string): string[] {
  const matches: string[] = [];
  for (const pattern of patterns) {
    const found = globSync(pattern, {
      cwd: repoPath,
      nodir: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    });
    matches.push(...found.map((f) => path.join(repoPath, f)));
  }
  return [...new Set(matches)];
}

export function evaluateRules(
  repoPath: string,
  rulesConfig: RulesConfig,
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  for (const rule of toArray(rulesConfig.forbid_files)) {
    const matches = findMatches(rule.patterns, repoPath);
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
    const matches = findMatches(rule.patterns, repoPath);
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
    const matches = findMatches(rule.patterns, repoPath);
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
