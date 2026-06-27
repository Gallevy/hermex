import micromatch from 'micromatch';
import type { RulesConfig } from '../config/types';
import { toArray, readPackageJson } from './shared';
import type { RuleViolation } from './shared';

export function evaluateScriptRules(
  repoPath: string,
  rulesConfig: RulesConfig,
): RuleViolation[] {
  const rules = toArray(rulesConfig.require_scripts);
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
      type: 'require_scripts' as const,
      severity: rule.severity,
      patterns: rule.patterns,
      message: rule.message,
      matchedFiles: [],
    }));
}
