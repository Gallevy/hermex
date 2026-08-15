import micromatch from 'micromatch';
import type { ResolvedRulesConfig } from '../config/types';
import { readPackageJson } from './shared';
import type { RuleViolation } from './shared';

export function evaluateScriptRules(
  repoPath: string,
  rulesConfig: ResolvedRulesConfig,
): RuleViolation[] {
  const rules = rulesConfig['require-scripts'];
  if (rules.length === 0) {
    return [];
  }

  const pkg = readPackageJson(repoPath);
  const scriptKeys = Object.keys(
    (pkg?.scripts as Record<string, string> | undefined) ?? {},
  );

  return rules
    .filter(
      (rule) =>
        !rule.patterns.some((p) =>
          scriptKeys.some((k) => micromatch.isMatch(k, p)),
        ),
    )
    .map((rule) => ({
      ruleId: 'require-scripts' as const,
      severity: rule.severity,
      patterns: rule.patterns,
      message: rule.message,
      matchedFiles: [],
    }));
}
