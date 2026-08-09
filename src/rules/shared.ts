import { globSync } from 'glob';
import fs from 'fs';
import path from 'path';

export interface RuleViolation {
  type:
    | 'detect_files'
    | 'require_files'
    | 'require_packages'
    | 'require_scripts'
    | 'require_package_fields'
    | 'forbid_package_fields'
    | 'engine_version'
    | 'codeowners';
  severity: 'error' | 'warn' | 'info';
  patterns: string[];
  message?: string;
  matchedFiles: string[];
  // engine_version only
  installedRange?: string;
  requiredRange?: string;
  // package-field rules only
  fieldPath?: string;
  actualValue?: string;
}

export function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/**
 * Type-guard filter for rules whose severity may be 'off' (config-authored
 * rules, resolved via `applyOverrides`/`resolveRules` before evaluators run
 * — see src/config/overrides.ts). Narrows `severity` down to the
 * evaluator-facing 'error' | 'warn' | 'info', so a `RuleViolation` built
 * from a filtered rule type-checks without a cast.
 */
export function isEnabled<T extends { severity: string }>(
  rule: T,
): rule is T & { severity: Exclude<T['severity'], 'off'> } {
  return rule.severity !== 'off';
}

export function findMatches(
  patterns: string[],
  repoPath: string,
  ignore: string[],
): string[] {
  const matches: string[] = [];
  for (const pattern of patterns) {
    const found = globSync(pattern, { cwd: repoPath, nodir: true, ignore });
    matches.push(...found.map((f) => f.replace(/\\/g, '/')));
  }
  return [...new Set(matches)];
}

export function readPackageJson(
  repoPath: string,
): Record<string, unknown> | null {
  try {
    const content = fs.readFileSync(
      path.join(repoPath, 'package.json'),
      'utf-8',
    );
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}
