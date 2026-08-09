import micromatch from 'micromatch';
import { readPackageJson, toArray } from '../rules/shared';
import type { HermexConfig, RulesConfig } from './schema';

function patternsMatch(a: string[], b: string[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) return false;
  for (const p of setA) if (!setB.has(p)) return false;
  return true;
}

/**
 * Upserts each override rule into `base`, keyed by an exact (order-
 * independent) match on `patterns` — mirrors ESLint's per-rule override: a
 * rule whose patterns match an existing one replaces it (severity 'off'
 * replaces it with nothing, i.e. cancels it); patterns with no existing
 * match are appended as a new rule.
 */
function upsertPatternRules<T extends { severity: string; patterns: string[] }>(
  base: T[],
  overrides: T[],
): T[] {
  let result = base;
  for (const rule of overrides) {
    result = result.filter((r) => !patternsMatch(r.patterns, rule.patterns));
    if (rule.severity !== 'off') {
      result = [...result, rule];
    }
  }
  return result;
}

/** Same upsert semantics as {@link upsertPatternRules}, keyed by `range` instead of `patterns` (engine_version has no patterns). */
function upsertEngineVersionRules<
  T extends { severity: string; range: string },
>(base: T[], overrides: T[]): T[] {
  let result = base;
  for (const rule of overrides) {
    result = result.filter((r) => r.range !== rule.range);
    if (rule.severity !== 'off') {
      result = [...result, rule];
    }
  }
  return result;
}

/**
 * Merges each `overrides` entry whose `match` patterns hit the current
 * repo's package.json "name" into `rules`. Rules are upserted by identity
 * (`patterns`, or `range` for `engine_version`) — a matching identity
 * replaces the base rule instead of adding a duplicate, and severity 'off'
 * replaces it with nothing (removes it), same as ESLint's per-rule 'off'.
 * `codeowners` only ever holds one rule, so a matching override replaces
 * the base entirely (severity 'off' clears it).
 */
export function applyOverrides(
  config: HermexConfig,
  repoPath: string,
): HermexConfig {
  if (config.overrides.length === 0) return config;

  const pkg = readPackageJson(repoPath);
  const repoName = typeof pkg?.name === 'string' ? pkg.name : undefined;
  if (!repoName) return config;

  const matching = config.overrides.filter((override) =>
    micromatch.isMatch(repoName, override.match),
  );
  if (matching.length === 0) return config;

  const rules: RulesConfig = { ...config.rules };

  for (const override of matching) {
    const o = override.rules;
    if (o.detect_files !== undefined) {
      rules.detect_files = upsertPatternRules(
        toArray(rules.detect_files),
        toArray(o.detect_files),
      ) as RulesConfig['detect_files'];
    }
    if (o.require_files !== undefined) {
      rules.require_files = upsertPatternRules(
        toArray(rules.require_files),
        toArray(o.require_files),
      ) as RulesConfig['require_files'];
    }
    if (o.forbid_packages !== undefined) {
      rules.forbid_packages = upsertPatternRules(
        toArray(rules.forbid_packages),
        toArray(o.forbid_packages),
      ) as RulesConfig['forbid_packages'];
    }
    if (o.require_packages !== undefined) {
      rules.require_packages = upsertPatternRules(
        toArray(rules.require_packages),
        toArray(o.require_packages),
      ) as RulesConfig['require_packages'];
    }
    if (o.require_scripts !== undefined) {
      rules.require_scripts = upsertPatternRules(
        toArray(rules.require_scripts),
        toArray(o.require_scripts),
      ) as RulesConfig['require_scripts'];
    }
    if (o.require_package_fields !== undefined) {
      rules.require_package_fields = upsertPatternRules(
        toArray(rules.require_package_fields),
        toArray(o.require_package_fields),
      ) as RulesConfig['require_package_fields'];
    }
    if (o.forbid_package_fields !== undefined) {
      rules.forbid_package_fields = upsertPatternRules(
        toArray(rules.forbid_package_fields),
        toArray(o.forbid_package_fields),
      ) as RulesConfig['forbid_package_fields'];
    }
    if (o.engine_version !== undefined) {
      rules.engine_version = upsertEngineVersionRules(
        toArray(rules.engine_version),
        toArray(o.engine_version),
      ) as RulesConfig['engine_version'];
    }
    if (o.codeowners !== undefined) {
      rules.codeowners =
        o.codeowners.severity === 'off'
          ? undefined
          : (o.codeowners as RulesConfig['codeowners']);
    }
  }

  return { ...config, rules };
}
