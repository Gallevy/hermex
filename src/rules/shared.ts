import { globSync } from 'glob';
import fs from 'fs';
import path from 'path';
import type {
  DeclaredPackages,
  DependencyBucket,
} from '../utils/package-inventory';

interface BaseViolation<T extends string> {
  ruleId: T;
  severity: 'error' | 'warn' | 'info';
  patterns: string[];
  message?: string;
  matchedFiles: string[];
}

export type NoFilesViolation = BaseViolation<'no-files'>;
export type RequireFilesViolation = BaseViolation<'require-files'>;
export type RequirePackagesViolation = BaseViolation<'require-packages'>;
export type RequireScriptsViolation = BaseViolation<'require-scripts'>;
export type RequireCodeownersViolation = BaseViolation<'require-codeowners'>;

/**
 * The package that matched `patterns`. Kept as a scalar rather than folded
 * into `matchedFiles` because that field is read as file paths everywhere
 * (`describeViolation` takes basenames off it, the codeowners branch counts
 * files with it), and because a package's identity is what the packages
 * table joins on.
 */
export interface NoPackagesViolation extends BaseViolation<'no-packages'> {
  packageName?: string;
}

/** One entry per oversize file, largest first — same order as `matchedFiles`. */
export interface OversizeFile {
  file: string;
  sizeBytes: number;
}

/**
 * The size of every file that breached the ceiling, alongside the ceiling
 * itself. Kept as its own field rather than folded into `matchedFiles`,
 * which is read as plain paths everywhere (`describeViolation` takes
 * basenames off it) — and because re-stat'ing each file is the only other
 * way a JSON consumer could learn by how much a file is over.
 */
export interface MaxFileSizeViolation extends BaseViolation<'max-file-size'> {
  /** The rule's `maxSize`, normalized to whole bytes by the config schema. */
  maxSizeBytes: number;
  oversizeFiles: OversizeFile[];
}

export interface RequirePackageFieldsViolation extends BaseViolation<'require-package-fields'> {
  fieldPath?: string;
  actualValue?: string;
}

export interface NoPackageFieldsViolation extends BaseViolation<'no-package-fields'> {
  fieldPath?: string;
  actualValue?: string;
}

export interface RequireEngineVersionViolation extends BaseViolation<'require-engine-version'> {
  installedRange?: string;
  requiredRange?: string;
}

export type RuleViolation =
  | NoFilesViolation
  | RequireFilesViolation
  | MaxFileSizeViolation
  | RequirePackagesViolation
  | NoPackagesViolation
  | RequireScriptsViolation
  | RequirePackageFieldsViolation
  | NoPackageFieldsViolation
  | RequireEngineVersionViolation
  | RequireCodeownersViolation;

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
