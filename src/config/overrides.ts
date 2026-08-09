import micromatch from 'micromatch';
import { readPackageJson, toArray, isEnabled } from '../rules/shared';
import type {
  HermexConfig,
  RulesConfig,
  RuleConfig,
  PackageFieldRule,
  EngineVersionRule,
  CodeownersRule,
} from './schema';

/**
 * A rule with severity narrowed to 'error' | 'warn' | 'info' — 'off' is only
 * ever a valid *input* severity (authored in `rules` or `overrides[].rules`);
 * `resolveRules` below is the one place that resolves it away, so nothing
 * downstream (evaluators, aggregation, compliance) needs to account for it.
 */
type Resolved<T extends { severity: string }> = T & {
  severity: Exclude<T['severity'], 'off'>;
};

export type ResolvedRuleConfig = Resolved<RuleConfig>;
export type ResolvedPackageFieldRule = Resolved<PackageFieldRule>;
export type ResolvedEngineVersionRule = Resolved<EngineVersionRule>;
export type ResolvedCodeownersRule = Resolved<CodeownersRule>;

/** The shape `RulesConfig` resolves to after `applyOverrides` — see `ResolvedRuleConfig`. */
export interface ResolvedRulesConfig {
  detect_files: ResolvedRuleConfig[];
  require_files: ResolvedRuleConfig[];
  forbid_packages: ResolvedRuleConfig[];
  require_packages: ResolvedRuleConfig[];
  require_scripts: ResolvedRuleConfig[];
  require_package_fields: ResolvedPackageFieldRule[];
  forbid_package_fields: ResolvedPackageFieldRule[];
  engine_version: ResolvedEngineVersionRule[];
  codeowners: ResolvedCodeownersRule | undefined;
}

/** What `applyOverrides` returns: `HermexConfig` with `rules` resolved. */
export type ResolvedHermexConfig = Omit<HermexConfig, 'rules'> & {
  rules: ResolvedRulesConfig;
};

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
 * patterns match an existing one replaces it; patterns with no existing
 * match are appended as a new rule. Severity 'off' is resolved away right
 * here (via `isEnabled`) rather than replacing anything — this is the one
 * place in the whole pipeline that needs to know 'off' exists.
 */
function upsertPatternRules<T extends { severity: string; patterns: string[] }>(
  base: Resolved<T>[],
  overrides: T[],
): Resolved<T>[] {
  let result = base;
  for (const rule of overrides) {
    result = result.filter((r) => !patternsMatch(r.patterns, rule.patterns));
    if (isEnabled(rule)) {
      result = [...result, rule];
    }
  }
  return result;
}

/** Same upsert semantics as {@link upsertPatternRules}, keyed by `range` instead of `patterns` (engine_version has no patterns). */
function upsertEngineVersionRules<
  T extends { severity: string; range: string },
>(base: Resolved<T>[], overrides: T[]): Resolved<T>[] {
  let result = base;
  for (const rule of overrides) {
    result = result.filter((r) => r.range !== rule.range);
    if (isEnabled(rule)) {
      result = [...result, rule];
    }
  }
  return result;
}

/** `codeowners` only ever holds one rule, so 'off' simply clears it. */
function resolveCodeowners<T extends { severity: string }>(
  rule: T | undefined,
): Resolved<T> | undefined {
  if (rule === undefined) return undefined;
  if (!isEnabled(rule)) return undefined;
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
function resolveRules(rules: RulesConfig): ResolvedRulesConfig {
  return {
    detect_files: upsertPatternRules([], toArray(rules.detect_files)),
    require_files: upsertPatternRules([], toArray(rules.require_files)),
    forbid_packages: upsertPatternRules([], toArray(rules.forbid_packages)),
    require_packages: upsertPatternRules([], toArray(rules.require_packages)),
    require_scripts: upsertPatternRules([], toArray(rules.require_scripts)),
    require_package_fields: upsertPatternRules(
      [],
      toArray(rules.require_package_fields),
    ),
    forbid_package_fields: upsertPatternRules(
      [],
      toArray(rules.forbid_package_fields),
    ),
    engine_version: upsertEngineVersionRules([], toArray(rules.engine_version)),
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
 *
 * The return type guarantees no rule can have severity 'off' — nothing
 * downstream of this function (evaluators, aggregation, compliance) needs
 * to check for it.
 */
export function applyOverrides(
  config: HermexConfig,
  repoPath: string,
): ResolvedHermexConfig {
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
            rules.detect_files,
            toArray(o.detect_files),
          );
        }
        if (o.require_files !== undefined) {
          rules.require_files = upsertPatternRules(
            rules.require_files,
            toArray(o.require_files),
          );
        }
        if (o.forbid_packages !== undefined) {
          rules.forbid_packages = upsertPatternRules(
            rules.forbid_packages,
            toArray(o.forbid_packages),
          );
        }
        if (o.require_packages !== undefined) {
          rules.require_packages = upsertPatternRules(
            rules.require_packages,
            toArray(o.require_packages),
          );
        }
        if (o.require_scripts !== undefined) {
          rules.require_scripts = upsertPatternRules(
            rules.require_scripts,
            toArray(o.require_scripts),
          );
        }
        if (o.require_package_fields !== undefined) {
          rules.require_package_fields = upsertPatternRules(
            rules.require_package_fields,
            toArray(o.require_package_fields),
          );
        }
        if (o.forbid_package_fields !== undefined) {
          rules.forbid_package_fields = upsertPatternRules(
            rules.forbid_package_fields,
            toArray(o.forbid_package_fields),
          );
        }
        if (o.engine_version !== undefined) {
          rules.engine_version = upsertEngineVersionRules(
            rules.engine_version,
            toArray(o.engine_version),
          );
        }
        if (o.codeowners !== undefined) {
          rules.codeowners = resolveCodeowners(o.codeowners);
        }
      }
    }
  }

  return { ...config, rules };
}
