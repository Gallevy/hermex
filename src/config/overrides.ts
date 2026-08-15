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
  'no-files': ResolvedRuleConfig[];
  'require-files': ResolvedRuleConfig[];
  'no-packages': ResolvedRuleConfig[];
  'require-packages': ResolvedRuleConfig[];
  'require-scripts': ResolvedRuleConfig[];
  'require-package-fields': ResolvedPackageFieldRule[];
  'no-package-fields': ResolvedPackageFieldRule[];
  'require-engine-version': ResolvedEngineVersionRule[];
  'require-codeowners': ResolvedCodeownersRule | undefined;
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

/** Same upsert semantics as {@link upsertPatternRules}, keyed by `range` instead of `patterns` (require-engine-version has no patterns). */
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

/** `require-codeowners` only ever holds one rule, so 'off' simply clears it. */
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
 * sharing an identity (patterns, or range for require-engine-version) collapse to
 * the last one. This is the same upsert primitive `applyOverrides` uses
 * for `overrides`, just seeded from an empty base — so a rule authored
 * once in `rules` and a rule layered in via `overrides` behave
 * identically. It's what a future shared/extends-style base config would
 * need too: 'off' isn't an overrides-only concept, it's how any layer
 * disables a rule, same as ESLint/oxlint.
 */
function resolveRules(rules: RulesConfig): ResolvedRulesConfig {
  return {
    'no-files': upsertPatternRules([], toArray(rules['no-files'])),
    'require-files': upsertPatternRules([], toArray(rules['require-files'])),
    'no-packages': upsertPatternRules([], toArray(rules['no-packages'])),
    'require-packages': upsertPatternRules(
      [],
      toArray(rules['require-packages']),
    ),
    'require-scripts': upsertPatternRules(
      [],
      toArray(rules['require-scripts']),
    ),
    'require-package-fields': upsertPatternRules(
      [],
      toArray(rules['require-package-fields']),
    ),
    'no-package-fields': upsertPatternRules(
      [],
      toArray(rules['no-package-fields']),
    ),
    'require-engine-version': upsertEngineVersionRules(
      [],
      toArray(rules['require-engine-version']),
    ),
    'require-codeowners': resolveCodeowners(rules['require-codeowners']),
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
        if (o['no-files'] !== undefined) {
          rules['no-files'] = upsertPatternRules(
            rules['no-files'],
            toArray(o['no-files']),
          );
        }
        if (o['require-files'] !== undefined) {
          rules['require-files'] = upsertPatternRules(
            rules['require-files'],
            toArray(o['require-files']),
          );
        }
        if (o['no-packages'] !== undefined) {
          rules['no-packages'] = upsertPatternRules(
            rules['no-packages'],
            toArray(o['no-packages']),
          );
        }
        if (o['require-packages'] !== undefined) {
          rules['require-packages'] = upsertPatternRules(
            rules['require-packages'],
            toArray(o['require-packages']),
          );
        }
        if (o['require-scripts'] !== undefined) {
          rules['require-scripts'] = upsertPatternRules(
            rules['require-scripts'],
            toArray(o['require-scripts']),
          );
        }
        if (o['require-package-fields'] !== undefined) {
          rules['require-package-fields'] = upsertPatternRules(
            rules['require-package-fields'],
            toArray(o['require-package-fields']),
          );
        }
        if (o['no-package-fields'] !== undefined) {
          rules['no-package-fields'] = upsertPatternRules(
            rules['no-package-fields'],
            toArray(o['no-package-fields']),
          );
        }
        if (o['require-engine-version'] !== undefined) {
          rules['require-engine-version'] = upsertEngineVersionRules(
            rules['require-engine-version'],
            toArray(o['require-engine-version']),
          );
        }
        if (o['require-codeowners'] !== undefined) {
          rules['require-codeowners'] = resolveCodeowners(
            o['require-codeowners'],
          );
        }
      }
    }
  }

  return { ...config, rules };
}
