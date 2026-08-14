import { globSync } from 'glob';
import fs from 'fs';
import path from 'path';
import type {
  DeclaredPackages,
  DependencyBucket,
} from '../utils/package-inventory';

export interface RuleViolation {
  type:
    | 'detect_files'
    | 'require_files'
    | 'require_packages'
    | 'forbid_packages'
    | 'require_scripts'
    | 'require_package_fields'
    | 'forbid_package_fields'
    | 'engine_version'
    | 'codeowners';
  severity: 'error' | 'warn' | 'info';
  patterns: string[];
  message?: string;
  matchedFiles: string[];
  /**
   * How many distinct things this one violation is about — files to delete,
   * packages to remove, files to assign an owner. Almost always 1; the
   * exceptions are `detect_files` and `codeowners`, which fold every match
   * into a single violation.
   *
   * Exists because violation *count* and problem count are different numbers
   * and only one of them was ever visible (#83). Nine offending files report
   * as one `detect_files` violation while four forbidden packages report as
   * four, so `ruleViolations.length` compares policy breaches, not workload.
   * Summing `subjectCount` compares workload.
   *
   * Not derivable by a consumer: the subject list lives in a different field
   * per rule type (`matchedFiles`, `patterns`, `packageName`, `fieldPath`,
   * or `requiredRange`), so counting it requires knowing all nine.
   */
  subjectCount: number;
  // engine_version only
  installedRange?: string;
  requiredRange?: string;
  // package-field rules only
  fieldPath?: string;
  actualValue?: string;
  /**
   * forbid_packages only — the package that matched `patterns`. Kept as a
   * scalar rather than folded into `matchedFiles` because that field is read
   * as file paths everywhere (`describeViolation` takes basenames off it, the
   * codeowners branch counts files with it), and because a package's identity
   * is what the packages table joins on.
   */
  packageName?: string;
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

const DEPENDENCY_FIELDS: DependencyBucket[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

/**
 * The *declared* axis of the package inventory: every package this repo
 * lists in `package.json`, with the bucket(s) that declare it.
 *
 * Distinct from the lockfile, which also contains every transitive
 * dependency — this is only what the repo can actually add or remove.
 */
export function collectDeclaredPackages(repoPath: string): DeclaredPackages {
  const pkg = readPackageJson(repoPath);
  if (!pkg) return {};

  // Null prototype: dependency names come from an untrusted manifest, and a
  // key like `__proto__` on a plain object literal would hit the prototype
  // setter instead of creating an own property — silently dropping the
  // package here, and mutating the object's prototype.
  const declared: DeclaredPackages = Object.create(null) as DeclaredPackages;
  for (const field of DEPENDENCY_FIELDS) {
    const bucket = pkg[field];
    // The manifest is untyped user input — a malformed bucket (a string, an
    // array, null) must not take the whole scan down.
    if (typeof bucket !== 'object' || bucket === null || Array.isArray(bucket))
      continue;
    for (const name of Object.keys(bucket)) {
      declared[name] ??= [];
      declared[name].push(field);
    }
  }
  return declared;
}
