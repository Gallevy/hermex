# Plan 023: package.json standards — forbid fields, field-value assertions, dot-paths

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 19a4695..HEAD -- src/rules/ src/config/ src/utils/print-rules.ts tests/rules/`
> If these files changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (but execute BEFORE Plan 024 — both extend the same `RuleViolation` union, `evaluator.ts`, `print-rules.ts`, and `evaluator.test.ts`)
- **Category**: direction / feature
- **Planned at**: commit `19a4695`, 2026-07-05

## Why this matters

Users want to enforce a "package.json standard" across repos: a pinned
`packageManager`, an `engines` field, required/forbidden manifest fields.
hermex already covers part of this — the gap analysis (verified against the
code) is:

| Wanted | Today | Gap |
|--------|-------|-----|
| engines field + range | `engine_version` rule (`src/rules/engine-version.ts`) | none — already covered |
| required scripts | `require_scripts` (`src/rules/script-rules.ts`, glob on script names) | none |
| missing fields | `require_package_fields` — **top-level key presence only**, exact string match | no nested paths, no value checks |
| forbidden fields | — | rule type does not exist |
| `packageManager` field | presence via `require_package_fields` | cannot assert the *value* (e.g. must be `pnpm@…`) |

This plan closes the three gaps with minimal, backward-compatible extensions:
dot-path field addressing, an optional `values` assertion (micromatch patterns
against the field's stringified value), and a new `forbid_package_fields`
rule. After it lands, this config expresses the full standard:

```ts
rules: {
  require_package_fields: [
    { severity: 'error', patterns: ['packageManager'], values: ['pnpm@*'] },
    { severity: 'error', patterns: ['engines.node'] },
    { severity: 'warn',  patterns: ['type'], values: ['module'] },
  ],
  forbid_package_fields: [
    { severity: 'error', patterns: ['eslintConfig', 'jest', 'prettier'],
      message: 'use standalone config files, not package.json embeds' },
  ],
},
```

## Current state

**`src/rules/package-field-rules.ts`** (entire evaluator):
```ts
export function evaluatePackageFieldRules(
  repoPath: string,
  rulesConfig: RulesConfig,
): RuleViolation[] {
  const rules = toArray(rulesConfig.require_package_fields);
  if (rules.length === 0) {
    return [];
  }

  const pkg = readPackageJson(repoPath);
  const fieldKeys = pkg ? Object.keys(pkg) : [];

  return rules
    .filter((rule) => !rule.patterns.some((p) => fieldKeys.includes(p)))
    .map((rule) => ({
      type: 'require_package_fields' as const,
      severity: rule.severity,
      patterns: rule.patterns,
      message: rule.message,
      matchedFiles: [],
    }));
}
```

**`src/config/schema.ts`** — `RuleConfigSchema` is
`{ severity, patterns: string[], message? }`; the `rules` object (lines 45–64)
lists each rule type with `RuleConfigOrArraySchema.default([])` and a
`.default(() => ({ ... }))` for the whole object. `engine_version` shows the
precedent for a rule with its own schema shape.

**`src/rules/shared.ts:5-21`** — `RuleViolation` is a closed union of `type`
literals plus optional `installedRange`/`requiredRange` (the precedent for
rule-specific optional fields). `readPackageJson(repoPath)` returns
`Record<string, unknown> | null`.

**`src/rules/evaluator.ts`** — aggregates the four evaluators; new checks are
added to its returned array.

**`src/utils/print-rules.ts`** — `formatRuleType` is an exhaustive switch
(`require_package_fields` → `'pkg_fields'`); `describeViolation` has one
branch per type. Both must gain the new type or typecheck fails (the switch
has no default — good, it forces the update).

**`tests/rules/evaluator.test.ts:14-22`** — `emptyRules: RulesConfig` literal
must gain any new key. Temp-dir + `writeFileSync(package.json)` is the test
pattern to copy; the fixture package.json is at lines 29–37.

**`src/index.ts`** — the library entry re-exports config types; new exported
types must be added there and to `src/config/types.ts` (a pure re-export
barrel of `./schema`).

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0              |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope**:
- `src/config/schema.ts` — `PackageFieldRuleSchema`, `forbid_package_fields`, type exports
- `src/config/types.ts`, `src/index.ts` — re-export `PackageFieldRule`
- `src/rules/shared.ts` — extend `RuleViolation`
- `src/rules/package-field-rules.ts` — dot-paths, values, forbid evaluator
- `src/rules/evaluator.ts` — wire the forbid evaluator
- `src/utils/print-rules.ts` — display the new type and value mismatches
- `tests/rules/evaluator.test.ts` — extend `emptyRules` + new tests

**Out of scope** (do NOT touch):
- `src/rules/engine-version.ts`, `script-rules.ts`, `file-rules.ts` — already
  cover their part of the standard
- `src/utils/package-rules.ts` — `forbid_packages` (dependency bans) is a
  different axis; do not merge them
- Monorepo/workspace support (multiple package.json files) — deferred; the
  evaluator reads the repo-root manifest only, as all package rules do today
- `docs/examples.md` / templates — documentation of the new rules is a
  follow-up; note it in the commit body

## Git workflow

- Branch: `advisor/023-package-json-standards`
- Commit message: `feat(rules): forbid_package_fields, dot-path fields, and value assertions`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Schema

In `src/config/schema.ts`, below `RuleConfigOrArraySchema`:

```ts
const PackageFieldRuleSchema = RuleConfigSchema.extend({
  /** Optional micromatch patterns the field's stringified value must match */
  values: z.array(z.string()).optional(),
});

const PackageFieldRuleOrArraySchema = z.union([
  PackageFieldRuleSchema,
  z.array(PackageFieldRuleSchema),
]);
```

In the `rules` object: change `require_package_fields` to
`PackageFieldRuleOrArraySchema.default([])`, add
`forbid_package_fields: PackageFieldRuleOrArraySchema.default([])`, and add
`forbid_package_fields: [] as PackageFieldRule[]` plus the adjusted
`require_package_fields` entry to the `.default(() => ({...}))` factory.

Add to the derived types section:
`export type PackageFieldRule = z.infer<typeof PackageFieldRuleSchema>;`
Re-export `PackageFieldRule` from `src/config/types.ts` and `src/index.ts`
(both are one-line additions to existing export lists).

**Verify**: `pnpm run typecheck` — expect errors only in
`tests/rules/evaluator.test.ts` (`emptyRules` lacks the new key). Add
`forbid_package_fields: [],` there; typecheck → exit 0.

### Step 2: Shared violation type

In `src/rules/shared.ts`, add `'forbid_package_fields'` to the `type` union
and two optional fields below the engine_version ones:

```ts
  // package-field rules only
  fieldPath?: string;
  actualValue?: string;
```

**Verify**: `pnpm run typecheck` — errors expected in `print-rules.ts`
(non-exhaustive switch). Proceed to Step 4 knowing that.

### Step 3: Evaluators

Rewrite `src/rules/package-field-rules.ts`:

```ts
import micromatch from 'micromatch';
import type { RulesConfig } from '../config/types';
import { toArray, readPackageJson } from './shared';
import type { RuleViolation } from './shared';

interface FieldLookup {
  exists: boolean;
  value: unknown;
}

/** Resolves a dot-path like "engines.node" against the manifest object. */
function getFieldAtPath(
  pkg: Record<string, unknown> | null,
  path: string,
): FieldLookup {
  let current: unknown = pkg;
  for (const key of path.split('.')) {
    if (
      current === null ||
      typeof current !== 'object' ||
      !(key in (current as Record<string, unknown>))
    ) {
      return { exists: false, value: undefined };
    }
    current = (current as Record<string, unknown>)[key];
  }
  return { exists: true, value: current };
}

/** Primitives compare by string form; objects/arrays never match a value pattern. */
function valueMatches(value: unknown, valuePatterns: string[]): boolean {
  if (value === null || typeof value === 'object') return false;
  return micromatch.isMatch(String(value), valuePatterns);
}

export function evaluatePackageFieldRules(
  repoPath: string,
  rulesConfig: RulesConfig,
): RuleViolation[] {
  const requireRules = toArray(rulesConfig.require_package_fields);
  const forbidRules = toArray(rulesConfig.forbid_package_fields);
  if (requireRules.length === 0 && forbidRules.length === 0) return [];

  const pkg = readPackageJson(repoPath);
  const violations: RuleViolation[] = [];

  for (const rule of requireRules) {
    const lookups = rule.patterns.map((p) => ({
      path: p,
      ...getFieldAtPath(pkg, p),
    }));
    const satisfied = lookups.some(
      (l) => l.exists && (!rule.values || valueMatches(l.value, rule.values)),
    );
    if (!satisfied) {
      // Prefer reporting a present-but-mismatched field over a missing one
      const mismatch = rule.values
        ? lookups.find((l) => l.exists)
        : undefined;
      violations.push({
        type: 'require_package_fields',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
        matchedFiles: [],
        fieldPath: mismatch?.path,
        actualValue:
          mismatch && typeof mismatch.value !== 'object'
            ? String(mismatch.value)
            : undefined,
      });
    }
  }

  for (const rule of forbidRules) {
    for (const pattern of rule.patterns) {
      const lookup = getFieldAtPath(pkg, pattern);
      const hit =
        lookup.exists &&
        (!rule.values || valueMatches(lookup.value, rule.values));
      if (hit) {
        violations.push({
          type: 'forbid_package_fields',
          severity: rule.severity,
          patterns: rule.patterns,
          message: rule.message,
          matchedFiles: [],
          fieldPath: pattern,
          actualValue:
            lookup.value !== null && typeof lookup.value !== 'object'
              ? String(lookup.value)
              : undefined,
        });
      }
    }
  }

  return violations;
}
```

Behavioral notes the implementation must preserve:
- **Backward compatible**: a rule with top-level patterns and no `values`
  behaves exactly as before (presence check, any-pattern-satisfies).
- Dot (`.`) is a path separator; keys that themselves contain dots (e.g.
  `exports` subpaths like `"./foo"`) are not addressable — documented
  limitation, fine for the standard-enforcement use case.
- `evaluateRules` in `src/rules/evaluator.ts` already calls
  `evaluatePackageFieldRules`; no wiring change is needed since forbid lives
  in the same function.

**Verify**: `pnpm run typecheck` — only `print-rules.ts` errors remain.

### Step 4: Printing

In `src/utils/print-rules.ts`:
- `formatRuleType`: add `case 'forbid_package_fields': return 'pkg_fields';`
- `describeViolation`: replace the `require_package_fields` branch and add
  the forbid branch:

```ts
if (v.type === 'require_package_fields') {
  if (v.fieldPath && v.actualValue !== undefined)
    return `field ${v.fieldPath} is ${chalk.yellow(v.actualValue)}, does not match required value${suffix}`;
  return `field ${patterns} missing in package.json${suffix}`;
}
if (v.type === 'forbid_package_fields')
  return `field ${v.fieldPath ?? patterns} is forbidden in package.json${suffix}`;
```

**Verify**: `pnpm run typecheck && pnpm run build` → exit 0.

### Step 5: Tests

Extend `tests/rules/evaluator.test.ts` (same temp-dir pattern; the fixture
manifest at lines 29–37 already has `engines`, `scripts`, `license`; extend
it with `"packageManager": "pnpm@10.12.0"` and `"jest": {}` in `beforeAll`).
Cover at minimum:

- require + dot-path present: `patterns: ['engines.node']` → no violation
- require + dot-path missing: `patterns: ['engines.npm']` → violation with
  `type: 'require_package_fields'`
- require + values match: `patterns: ['packageManager'], values: ['pnpm@*']`
  → no violation
- require + values mismatch: `values: ['yarn@*']` → violation with
  `fieldPath: 'packageManager'` and `actualValue: 'pnpm@10.12.0'`
- forbid hit: `patterns: ['jest']` → violation with `fieldPath: 'jest'`
- forbid miss: `patterns: ['eslintConfig']` → no violation
- forbid + values: `patterns: ['license'], values: ['GPL*']` → no violation
  (fixture is MIT); `values: ['MIT']` → violation
- no package.json (fresh empty temp dir): require rules violate, forbid rules
  do not

**Verify**: `pnpm run test:ci` → all pass.

### Step 6: Full suite

```
pnpm run build && pnpm run test:ci && pnpm run lint && pnpm run typecheck
```

All exit 0.

## Test plan

Step 5 (~9 evaluator tests). JSON output needs no test changes:
`ruleViolations` serializes as-is and the new optional fields ride along.

## Done criteria

- [ ] `forbid_package_fields` accepted by the config schema and evaluated
- [ ] `require_package_fields` supports dot-paths and `values` with full backward compatibility (existing tests untouched and green)
- [ ] `packageManager`-pinning config (the example in "Why this matters") produces the expected pass/fail in tests
- [ ] `PackageFieldRule` exported from `src/index.ts`
- [ ] `pnpm run typecheck`, `pnpm run build`, `pnpm run test:ci`, `pnpm run lint` all exit 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- Existing `require_package_fields` tests fail after Step 3 — backward
  compatibility broke; report instead of adjusting the old tests.
- The `formatRuleType` switch has gained a `default` branch since planning
  (exhaustiveness no longer enforced) — add the cases anyway and note it.
- You need to change `RuleConfig` itself (rather than extending it) —
  `RuleConfig` is a published library type; report first.

## Maintenance notes

- Plan 024 (CODEOWNERS) extends the same `RuleViolation` union and
  `print-rules.ts` — execute this plan first, 024 rebases cleanly on top.
- The `values` matcher is intentionally primitive-only. If someone later needs
  structural assertions (e.g. `pnpm.overrides` contents), that is a JSON-path
  feature — design it separately rather than growing `valueMatches`.
- When docs are next regenerated, add the "Why this matters" example config
  to `docs/examples.md` (via `docs-templates/` — see Plan 022's caveat about
  the generation flow).
