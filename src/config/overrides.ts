import micromatch from 'micromatch';
import { readPackageJson, toArray, isEnabled } from '../rules/shared';
import type {
  HermexConfig,
  RulesConfig,
  RuleConfig,
  PackageFieldRule,
  MaxFileSizeRule,
  EngineVersionRule,
  CodeownersRule,
  ReleaseAgeRuleConfig,
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
export type ResolvedMaxFileSizeRule = Resolved<MaxFileSizeRule>;
export type ResolvedEngineVersionRule = Resolved<EngineVersionRule>;
export type ResolvedCodeownersRule = Resolved<CodeownersRule>;
/**
 * NOT `Resolved<ReleaseAgeRuleConfig>` — unlike every other rule, release-age
 * needs `'off'` to survive resolution as a real, matchable entry rather than
 * being dropped. Every other rule fires independently per matching entry, so
 * a dropped 'off' entry simply never fires — correct. Release-age instead
 * picks exactly one governing entry per package via pattern matching
 * against the whole resolved array plus an implicit `['**']` baseline
 * (`resolveReleaseAgeRule` below); if an 'off' entry were dropped the way
 * `upsertPatternRules` drops it for other rules, a package meant to be
 * exempted would just fall through to the next-best match (often the
 * baseline) instead of being exempted — the opposite of what 'off' means.
 * `upsertGoverningRules` (below) is `upsertPatternRules` without the
 * `isEnabled` filter, so 'off' entries are upserted like any other.
 */
export type ResolvedReleaseAgeRuleConfig = ReleaseAgeRuleConfig;

/**
 * NOT `Resolved<RuleConfig>`, for exactly the reason spelled out on
 * `ResolvedReleaseAgeRuleConfig` above: `no-deprecated-packages` is the
 * other family resolved by last-match-wins governance against an implicit
 * `['**']` baseline (`resolveDeprecatedPackagesRule` below), so an 'off'
 * entry has to survive resolution in order to exempt a package. Drop it the
 * way `upsertPatternRules` does for the ordinary families and the package
 * falls through to the baseline instead — silently turning 'off' into a
 * no-op.
 */
export type ResolvedDeprecatedPackagesRuleConfig = RuleConfig;

/** The shape `RulesConfig` resolves to after `applyOverrides` — see `ResolvedRuleConfig`. */
export interface ResolvedRulesConfig {
  'no-files': ResolvedRuleConfig[];
  'require-files': ResolvedRuleConfig[];
  'max-file-size': ResolvedMaxFileSizeRule[];
  'no-packages': ResolvedRuleConfig[];
  'no-deprecated-packages': ResolvedDeprecatedPackagesRuleConfig[];
  'require-packages': ResolvedRuleConfig[];
  'require-scripts': ResolvedRuleConfig[];
  'require-package-fields': ResolvedPackageFieldRule[];
  'no-package-fields': ResolvedPackageFieldRule[];
  'require-engine-version': ResolvedEngineVersionRule[];
  'require-codeowners': ResolvedCodeownersRule | undefined;
  'release-age': ResolvedReleaseAgeRuleConfig[];
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

/**
 * Same identity/replacement semantics as {@link upsertPatternRules} (keyed
 * by `patterns`), but never drops an 'off' entry — for the two families
 * resolved by last-match-wins governance against an implicit baseline
 * (`release-age`, `no-deprecated-packages`). See
 * `ResolvedReleaseAgeRuleConfig` above for why those need 'off' to remain a
 * real, resolvable entry instead of vanishing from the array.
 */
function upsertGoverningRules<T extends { patterns: string[] }>(
  base: T[],
  overrides: T[],
): T[] {
  let result = base;
  for (const rule of overrides) {
    result = result.filter((r) => !patternsMatch(r.patterns, rule.patterns));
    result = [...result, rule];
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
    'max-file-size': upsertPatternRules([], toArray(rules['max-file-size'])),
    'no-packages': upsertPatternRules([], toArray(rules['no-packages'])),
    'no-deprecated-packages': upsertGoverningRules(
      [],
      toArray(rules['no-deprecated-packages']),
    ),
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
    'release-age': upsertGoverningRules([], toArray(rules['release-age'])),
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
        if (o['max-file-size'] !== undefined) {
          rules['max-file-size'] = upsertPatternRules(
            rules['max-file-size'],
            toArray(o['max-file-size']),
          );
        }
        if (o['no-packages'] !== undefined) {
          rules['no-packages'] = upsertPatternRules(
            rules['no-packages'],
            toArray(o['no-packages']),
          );
        }
        if (o['no-deprecated-packages'] !== undefined) {
          rules['no-deprecated-packages'] = upsertGoverningRules(
            rules['no-deprecated-packages'],
            toArray(o['no-deprecated-packages']),
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
        if (o['release-age'] !== undefined) {
          rules['release-age'] = upsertGoverningRules(
            rules['release-age'],
            toArray(o['release-age']),
          );
        }
      }
    }
  }

  return { ...config, rules };
}

/**
 * The default policy for any package no authored `rules['release-age']`
 * entry matches: checked, advisory-only, at the schema's own default
 * thresholds/scope. This is what makes "check everything" the zero-config
 * behavior once release-age is on for a repo (i.e. `rules['release-age']`
 * is non-empty) — an author only needs a `['**']` entry of their own to
 * override this, never to opt into checking in the first place.
 */
const RELEASE_AGE_BASELINE: ResolvedReleaseAgeRuleConfig = {
  severity: 'warn',
  patterns: ['**'],
  thresholds: { patch: 30, minor: 45, major: 60 },
  scope: 'root',
};

/**
 * Resolves which single `release-age` rule entry governs `packageName`,
 * among `resolvedRules` (from `ResolvedRulesConfig['release-age']`, already
 * upserted through `resolveRules`/`applyOverrides` above) plus the implicit
 * `['**']` baseline. Unlike every other rule family — where every matching
 * entry fires independently — release-age needs exactly one governing
 * entry per package (a package can't be simultaneously 'error' under one
 * entry and 'warn' under another), so this picks a winner: **last match
 * wins**, mirroring ESLint's `overrides`/flat-config semantics. This falls
 * out of the same upsert mechanic every other rule already uses: an
 * override always lands at the end of the resolved array (see
 * `upsertPatternRules`), so it naturally wins here with no extra
 * machinery — the same array position that means "replaces the base rule"
 * for `no-packages` etc. means "governs this package" here.
 *
 * Only call this once you've confirmed release-age is actually on for the
 * repo (`resolvedRules.length > 0`) — the baseline is not itself a reason
 * to run release-age; an empty `rules['release-age']` means off, not "check
 * everything by default."
 */
export function resolveReleaseAgeRule(
  packageName: string,
  resolvedRules: ResolvedReleaseAgeRuleConfig[],
): ResolvedReleaseAgeRuleConfig {
  let winner = RELEASE_AGE_BASELINE;
  for (const rule of [RELEASE_AGE_BASELINE, ...resolvedRules]) {
    if (micromatch.isMatch(packageName, rule.patterns)) winner = rule;
  }
  return winner;
}

/**
 * The default policy for any package no authored
 * `rules['no-deprecated-packages']` entry matches: reported, never
 * enforced. 'info' is what preserves the long-standing behavior that a
 * deprecated package is always *visible* once hermex has registry data for
 * it, while keeping it out of the compliance verdict — an author opts into
 * enforcement with an 'error' entry, and silences it with 'off'.
 *
 * Like `RELEASE_AGE_BASELINE`, this sets *severity*, not *enablement*: it
 * only ever applies to packages the registry was already consulted about.
 * An empty `rules['no-deprecated-packages']` with release-age also off
 * means no registry call is made at all, so nothing reaches this.
 */
const DEPRECATED_PACKAGES_BASELINE: ResolvedDeprecatedPackagesRuleConfig = {
  severity: 'info',
  patterns: ['**'],
};

/**
 * Resolves which single `no-deprecated-packages` entry governs
 * `packageName` — last match wins against the implicit `['**']` baseline,
 * identical in mechanic and rationale to `resolveReleaseAgeRule` above. A
 * package can't be simultaneously 'error' under one entry and 'off' under
 * another, so one entry has to win rather than every match firing.
 */
export function resolveDeprecatedPackagesRule(
  packageName: string,
  resolvedRules: ResolvedDeprecatedPackagesRuleConfig[],
): ResolvedDeprecatedPackagesRuleConfig {
  let winner = DEPRECATED_PACKAGES_BASELINE;
  for (const rule of [DEPRECATED_PACKAGES_BASELINE, ...resolvedRules]) {
    if (micromatch.isMatch(packageName, rule.patterns)) winner = rule;
  }
  return winner;
}
