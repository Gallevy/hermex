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
 * Upserts each rule into `base`, keyed by an exact (order-independent)
 * match on `patterns` — mirrors ESLint's per-rule override: a rule whose
 * patterns match an existing one replaces it (severity 'off' replaces it
 * with nothing, i.e. cancels it); patterns with no existing match are
 * appended as a new rule.
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

/** `codeowners` only ever holds one rule, so 'off' simply clears it. */
function resolveCodeowners<T extends { severity: string }>(
  rule: T | undefined,
): T | undefined {
  if (rule === undefined || rule.severity === 'off') return undefined;
  return rule;
}

/**
 * Resolves `rules` to its final, evaluator-ready form by upserting each
 * list against itself: a rule authored with severity 'off' — directly in
 * the base config, not only via `overrides` — is dropped, and rules
 * sharing an identity (patterns, or range for engine_version) collapse to
 * the last one. This is the same upsert primitive `applyOverrides` uses
 * for `overrides`, just seeded from an empty base — so a rule authored
 * once in `rules` and a rule layered in via `overrides` behave
 * identically. It's what a future shared/extends-style base config would
 * need too: 'off' isn't an overrides-only concept, it's how any layer
 * disables a rule, same as ESLint/oxlint.
 */
function resolveRules(rules: RulesConfig): RulesConfig {
  return {
    detect_files: upsertPatternRules(
      [],
      toArray(rules.detect_files),
    ) as RulesConfig['detect_files'],
    require_files: upsertPatternRules(
      [],
      toArray(rules.require_files),
    ) as RulesConfig['require_files'],
    forbid_packages: upsertPatternRules(
      [],
      toArray(rules.forbid_packages),
    ) as RulesConfig['forbid_packages'],
    require_packages: upsertPatternRules(
      [],
      toArray(rules.require_packages),
    ) as RulesConfig['require_packages'],
    require_scripts: upsertPatternRules(
      [],
      toArray(rules.require_scripts),
    ) as RulesConfig['require_scripts'],
    require_package_fields: upsertPatternRules(
      [],
      toArray(rules.require_package_fields),
    ) as RulesConfig['require_package_fields'],
    forbid_package_fields: upsertPatternRules(
      [],
      toArray(rules.forbid_package_fields),
    ) as RulesConfig['forbid_package_fields'],
    engine_version: upsertEngineVersionRules(
      [],
      toArray(rules.engine_version),
    ) as RulesConfig['engine_version'],
    codeowners: resolveCodeowners(rules.codeowners),
  };
}

/**
 * Resolves the final `rules` for the repo at `repoPath`: first `rules`
 * itself is resolved against itself (severity 'off' and duplicate
 * identities collapse — see `resolveRules`), then every `overrides` entry
 * whose `match` patterns hit the repo's package.json "name" is upserted on
 * top, in array order. `codeowners` only ever holds one rule, so a
 * matching override replaces the base entirely (severity 'off' clears it).
 */
export function applyOverrides(
  config: HermexConfig,
  repoPath: string,
): HermexConfig {
  const rules = resolveRules(config.rules);

  if (config.overrides.length > 0) {
    const pkg = readPackageJson(repoPath);
    const repoName = typeof pkg?.name === 'string' ? pkg.name : undefined;

    if (repoName) {
      const matching = config.overrides.filter((override) =>
        micromatch.isMatch(repoName, override.match),
      );

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
          rules.codeowners = resolveCodeowners(o.codeowners);
        }
      }
    }
  }

  return { ...config, rules };
}
