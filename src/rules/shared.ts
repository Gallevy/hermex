import { globSync } from 'glob';
import fs from 'fs';
import path from 'path';

export interface RuleViolation {
  type:
    | 'forbid_files'
    | 'require_files'
    | 'allow_files'
    | 'forbid_packages'
    | 'require_packages'
    | 'require_scripts'
    | 'require_package_fields'
    | 'engine_version';
  severity: 'error' | 'warn';
  patterns: string[];
  message?: string;
  matchedFiles: string[];
  // engine_version only
  installedRange?: string;
  requiredRange?: string;
}

export function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
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
