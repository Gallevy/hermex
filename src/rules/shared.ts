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

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

/**
 * Every package name the repo itself declares in `package.json`, deduped
 * across all four dependency buckets. Distinct from the lockfile `versions`
 * map, which also contains every transitive dependency — this is only what
 * the repo can actually add or remove, which is what a "this package is
 * forbidden here" rule should act on (#75).
 */
export function collectDeclaredPackages(repoPath: string): string[] {
  const pkg = readPackageJson(repoPath);
  if (!pkg) return [];

  const names = new Set<string>();
  for (const field of DEPENDENCY_FIELDS) {
    const bucket = pkg[field];
    // The manifest is untyped user input — a malformed bucket (a string, an
    // array, null) must not take the whole scan down.
    if (typeof bucket !== 'object' || bucket === null || Array.isArray(bucket))
      continue;
    for (const name of Object.keys(bucket)) names.add(name);
  }
  return [...names];
}
