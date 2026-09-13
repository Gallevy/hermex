import { globSync } from 'glob';
import fs from 'fs';
import path from 'path';
import type {
  DeclaredPackages,
  DependencyBucket,
} from '../utils/package-inventory';
// Type-only: `RuleViolation` includes `PluginViolation` while
// `PluginInventoryView` exposes `RuleViolation`. The cycle is legal for
// types and erased at runtime.
import type { PluginViolation } from '../plugins/types';

interface BaseViolation<T extends string> {
  ruleId: T;
  severity: 'error' | 'warn' | 'info';
  patterns: string[];
  message?: string;
}

/**
 * Every violation is atomic — one record per actual subject (one file, one
 * package, one oversize file) — never a bundle. A pattern matching 40 files
 * is 40 `NoFilesViolation`s sharing `patterns`, not one violation with a
 * 40-item array. `groupKeyFor` below is what reconstructs a folded,
 * human-scale display from these at render time (`print-rules.ts`); nothing
 * about counting or compliance needs to know a fold ever happened.
 */
export interface NoFilesViolation extends BaseViolation<'no-files'> {
  matchedFile: string;
}
export type RequireFilesViolation = BaseViolation<'require-files'>;
export type RequirePackagesViolation = BaseViolation<'require-packages'>;
export type RequireScriptsViolation = BaseViolation<'require-scripts'>;

export interface RequireCodeownersViolation extends BaseViolation<'require-codeowners'> {
  /** Distinguishes the three things this rule can report — also part of the
   * grouping key, since `require-codeowners` has no `patterns` identity of
   * its own to key on (it's a singleton rule, not an array). */
  reason: 'missing-file' | 'unowned' | 'wrong-owner';
  /** Absent only for `reason: 'missing-file'`, which has no file subject. */
  matchedFile?: string;
}

/**
 * The package that matched `patterns`. A package's identity is what the
 * packages table joins on.
 */
export interface NoPackagesViolation extends BaseViolation<'no-packages'> {
  packageName?: string;
}

export interface OversizeFile {
  file: string;
  sizeBytes: number;
}

/**
 * One violation per oversize file. Kept as its own field (not just
 * `matchedFile`) because a JSON consumer needs the size to know by how much
 * a file is over without re-stat'ing it.
 */
export interface MaxFileSizeViolation extends BaseViolation<'max-file-size'> {
  /** The rule's `maxSize`, normalized to whole bytes by the config schema. */
  maxSizeBytes: number;
  oversizeFile: OversizeFile;
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

/**
 * One violation per overdue package — see `src/rules/release-age.ts`.
 * Renders only in the Packages table (`print-packages.ts`), never in the
 * Rules table: `RULE_RENDERERS['release-age']` in `print-rules.ts` returns
 * no rows for it, the same kind of declared, first-class rendering choice
 * every other rule type makes, not a special case bolted on separately.
 */
export interface ReleaseAgeViolation extends BaseViolation<'release-age'> {
  packageName: string;
  installedVersion: string;
  worstLevel: 'minor_overdue' | 'major_overdue';
  scope: 'root' | 'tree';
  deprecated?: string;
}

/**
 * hermex's own violations — the rules it implements itself. Each has a
 * literal `ruleId` and may carry rule-specific fields.
 */
export type CoreRuleViolation =
  | NoFilesViolation
  | RequireFilesViolation
  | MaxFileSizeViolation
  | RequirePackagesViolation
  | NoPackagesViolation
  | RequireScriptsViolation
  | RequirePackageFieldsViolation
  | NoPackageFieldsViolation
  | RequireEngineVersionViolation
  | RequireCodeownersViolation
  | ReleaseAgeViolation;

/**
 * Everything the rules table and the compliance verdict see, hermex's own
 * rules and plugin-contributed findings alike (#102). Plugin violations are
 * structurally uniform — hermex does not model the wrapped tool's domain —
 * and carry a `plugin` field the core ones never have, which is the
 * discriminant: narrow with `'plugin' in violation`.
 */
export type RuleViolation = CoreRuleViolation | PluginViolation;

/**
 * The key that reconstructs "one row per rule-config-entry" from a list of
 * atomic violations: `ruleId` plus the entry's own identity, which is
 * exactly what `upsertPatternRules`/`upsertEngineVersionRules`
 * (`src/config/overrides.ts`) already use to keep resolved rule entries
 * unique — `patterns` (order-independent), or `range` for
 * `require-engine-version`. Reusing that identity means two atomic
 * violations from the same rule entry always share a key, and violations
 * from different entries never collide, with no new bookkeeping. Plugin
 * violations are excluded on purpose — they're not part of this grouping
 * model at all, `print-rules.ts` renders each one on its own row as it
 * always has.
 */
export function groupKeyFor(v: CoreRuleViolation): string {
  if (v.ruleId === 'require-engine-version') {
    return `require-engine-version:${v.requiredRange ?? ''}`;
  }
  if (v.ruleId === 'require-codeowners') {
    return `require-codeowners:${v.reason}`;
  }
  return `${v.ruleId}:${[...v.patterns].sort().join(',')}`;
}

/** True for findings contributed by a plugin rather than by a hermex rule. */
export function isPluginViolation(
  violation: RuleViolation,
): violation is PluginViolation {
  return 'plugin' in violation;
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
