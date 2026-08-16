# Plan 030: Reject silently-ignored config — unknown keys and missing default export

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 688c481..HEAD -- src/config/ tests/config/`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — Step 3 is a breaking change for configs carrying extra keys
- **Depends on**: none
- **Category**: bug / dx
- **Planned at**: commit `688c481`, 2026-08-15 (source unchanged through `0089d95`, which is docs-only)
- **Map ticket**: [#114 Config schema v3](https://github.com/Gallevy/hermex/issues/114)

> ### Assumption this plan encodes
>
> Step 3 (`.strict()`) assumes v3 **rejects** unknown config keys rather than
> warning about them or accepting them. That is [#114](https://github.com/Gallevy/hermex/issues/114)'s
> decision to make and it has not been made. If #114 lands on "warn, don't
> reject", Step 3's implementation changes (collect unknown keys and print a
> warning instead of throwing) but Steps 1, 2 and 4 are unaffected.
>
> **Steps 1–2 encode no assumption** — a config file with no default export
> silently becoming an all-defaults config is a bug under any decision #114
> could reach. If you only have appetite for the uncontroversial part, execute
> Steps 1, 2 and 4 and stop.

## Why this matters

hermex is a compliance gate. Today a misspelled rule key in `hermex.config.ts`
parses cleanly, produces an all-defaults config, and `comply` exits 0 having
enforced nothing — the user believes a rule is running and it is not. The same
silent-default outcome happens when a config file forgets `export default`.

Both are the worst available failure mode for this tool: policy silently weaker
than the author believes, with a green CI check confirming it. Neither is
detectable by reading the output.

After this plan, a config that hermex cannot fully honor fails loudly at load
time with a message naming the offending key or the missing export.

## Current state

**`src/config/loader.ts`** — the whole file (25 lines); the only entry point for
user configs:

```ts
// src/config/loader.ts:1-25
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HermexConfigSchema } from './schema';
import type { HermexConfig } from './schema';

export async function loadConfig(
  cwd: string,
  explicitPath?: string,
): Promise<HermexConfig> {
  const configPath = explicitPath
    ? resolve(explicitPath)
    : join(cwd, 'hermex.config.ts');

  if (explicitPath && !existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  if (existsSync(configPath)) {
    const mod = await import(pathToFileURL(configPath).href);
    return HermexConfigSchema.parse(mod.default ?? mod);
  }

  return HermexConfigSchema.parse({});
}
```

The bug is `mod.default ?? mod`. When the config file has no default export,
`mod` is the ES module namespace object. It is an object, so
`HermexConfigSchema.parse` accepts it, strips every property it does not
recognise, and returns a fully-defaulted config. No error, no warning.

**`src/config/schema.ts:76`** — the root schema is a plain `z.object()`:

```ts
// src/config/schema.ts:76-77
export const HermexConfigSchema = z.object({
  includes: z.array(z.string()).default(['**/*.{tsx,jsx,ts,js}']),
```

zod's default object behaviour is **strip**, not reject. Verified against the
installed `zod@4.4.3`:

```
S.safeParse({ rulez: { forbid_packagez: [...] } })
  → success: true, data: { rules: { forbid_packages: [] } }
```

Every nested sub-schema in this file (`RuleConfigSchema`,
`PackageFieldRuleSchema`, `EngineVersionRuleSchema`, `CodeownersRuleSchema`,
`OverrideSchema`, `OverrideRulesSchema`, and the inline `packages` / `versus` /
`rules` / `output` / `releaseAge` objects) has the same behaviour.

**`src/config/loader.ts` has zero test coverage.** `loadConfig` is imported by
no file under `tests/`. The only references anywhere are comments in
`scripts/output-review.ts:1132,1664` and `tests/scripts/output-review.test.ts:257`.

**Convention to match**: this repo throws plain `Error` with a message that
names the offending path — see the existing `Config file not found: ${configPath}`
above. Commands catch and format it (`src/commands/scan.ts:63-67`,
`src/commands/comply.ts:104-108`), so a thrown `Error` already produces a clean
`Analysis failed: <message>` line and a non-zero exit. Do not add a new error
class.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Typecheck | `pnpm run typecheck` | exit 0, no errors |
| Tests | `pnpm run test:ci` | all pass |
| Single test file | `pnpm run test:ci -- tests/config/loader.test.ts` | all pass |
| Lint | `pnpm run lint:ci` | exit 0 |
| Format check | `pnpm run format:ci` | exit 0 |
| Build | `pnpm run build:ci` | exit 0 |
| Output review | `pnpm run test:output` | see Step 5 |

**All six of format / lint / typecheck / test / build / output-review are CI
gates** (`.github/workflows/pull-request.yaml`,
`.github/workflows/output-review.yaml`). `format:ci` in particular has been
missed by past plans — run it.

## Scope

**In scope**:
- `src/config/loader.ts`
- `src/config/schema.ts`
- `tests/config/loader.test.ts` (create)
- `fixtures/` — only if Step 5 shows an output-review case needs a config fixed
- `tests/__output_baselines__/` — only via `pnpm run test:output -- --update`

**Out of scope** (do NOT touch):
- `src/config/overrides.ts` — resolution logic, unrelated to loading/validation.
- `src/config/types.ts` — a re-export barrel.
- Any rename of config keys. Kebab-case rule ids are
  [#101](https://github.com/Gallevy/hermex/issues/101)'s decision and a separate
  migration; this plan only changes *validation strictness*, never key names.
- `src/commands/*.ts` — they already catch and format thrown errors correctly.

## Git workflow

- Branch: `advisor/030-config-loader-hardening`
- Conventional commits, matching `git log` style. Example from this repo:
  `fix(config): reject a config file with no default export`
- Do NOT push or open a PR unless the operator instructed it.
- User-facing behaviour change → add a changeset:
  `pnpm changeset add --minor hermex -m "..."` (major if Step 3 is included —
  it breaks existing configs).

## Steps

### Step 1: Detect a config module with no usable default export

In `src/config/loader.ts`, replace the `mod.default ?? mod` expression with an
explicit check. A module namespace object must not be accepted as a config.

Target shape:

```ts
const mod = (await import(pathToFileURL(configPath).href)) as Record<string, unknown>;

if (mod.default === undefined) {
  throw new Error(
    `Config file has no default export: ${configPath}\n` +
      `hermex reads the default export. Add \`export default { ... }\`, or ` +
      `\`export default defineConfig({ ... })\` for type inference.`,
  );
}

return HermexConfigSchema.parse(mod.default);
```

Note `=== undefined`, not `??` — a config whose default export is `null` or `0`
should reach zod and fail there with a type error, not be silently replaced.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 2: Write the loader tests that do not exist

Create `tests/config/loader.test.ts`. Model its structure on
`tests/config/overrides.test.ts` (same directory, same import style: relative
paths into `../../src/`).

Write temp config files into a scratch directory created with
`fs.mkdtempSync(path.join(os.tmpdir(), 'hermex-loader-'))` and remove it in
`afterEach`. Do **not** write fixtures into the repo.

Because `loadConfig` uses a dynamic `import()`, each test needs a **uniquely
named** config file — Node caches ES modules by URL, so reusing one filename
across tests returns the first module forever. Name them
`config-${crypto.randomUUID()}.ts` or append a counter.

Cases to cover:

1. No config file at the path and no `explicitPath` → returns the all-defaults
   config (assert `result.includes` equals `['**/*.{tsx,jsx,ts,js}']`).
2. `explicitPath` pointing at a missing file → throws, message matches
   `/Config file not found/`.
3. A valid config with `export default { includes: ['a/**'] }` → returns it,
   `result.includes` equals `['a/**']`.
4. **A config with only a named export** (`export const config = { includes: ['a/**'] }`)
   → throws, message matches `/no default export/`. *This is the regression
   test for Step 1 — before Step 1 it returned all-defaults.*
5. A config whose value fails the schema (e.g. `includes: 'not-an-array'`) →
   throws (zod error).

**Verify**: `pnpm run test:ci -- tests/config/loader.test.ts` → all 5 pass.

Then confirm case 4 is a real regression test by reverting Step 1 locally
(`git stash push src/config/loader.ts`), re-running — case 4 must **fail** —
then restoring (`git stash pop`).

### Step 3: Reject unknown keys in the schema

> Re-read the "Assumption this plan encodes" box before starting this step.

In `src/config/schema.ts`, convert every `z.object({...})` to reject unknown
keys. In zod 4 that is `.strict()` on the object, applied to **all** of:

- `RuleConfigSchema` (line 13)
- `PackageFieldRuleSchema` (line 24, via `.extend` — apply `.strict()` after the
  `.extend()` call)
- `EngineVersionRuleSchema` (line 34)
- `CodeownersRuleSchema` (line 40)
- `OverrideRulesSchema` (line 52 — apply `.strict()` **before** `.default()`)
- `OverrideSchema` (line 68)
- the inline `packages`, `versus` element, `rules`, `output`, `releaseAge`
  objects, and the root `HermexConfigSchema` (line 76)

Order matters for the chained ones: `.strict()` must come before `.default()`
and before `.optional()`, because those wrap the object in a different schema
type that has no `.strict()` method. If TypeScript reports `.strict` does not
exist on the value, that is the cause.

**Verify**:
- `pnpm run typecheck` → exit 0.
- Add a sixth case to `tests/config/loader.test.ts`: a config with
  `export default { rulez: {} }` throws, message matches
  `/[Uu]nrecognized|unknown/`. Run
  `pnpm run test:ci -- tests/config/loader.test.ts` → all 6 pass.

### Step 4: Confirm the repo's own configs still load

Every `hermex.config.ts` in this repo is a real input to the loader. Check them
all against the tightened schema:

```bash
git ls-files '*hermex*.config.ts' 'fixtures/configs/*.config.ts'
```

For each, read it and confirm every key it sets exists in
`src/config/schema.ts`. Any key that does not is either a genuine bug this plan
just caught (fix the config) or a schema gap (STOP — see STOP conditions).

**Verify**: `pnpm run test:ci` → all pass. The e2e suite
(`tests/e2e/cli.test.ts`) loads many of these configs, so a schema/config
mismatch surfaces here.

### Step 5: Refresh the output-review baselines

The output review runs the real CLI over `fixtures/` and diffs against
committed baselines. If Step 3 rejects a key any fixture config uses, cases will
change or fail.

```bash
pnpm run test:output
```

- If it reports `0 changed` and no invariant breaches → nothing to do.
- If cases changed, inspect the diff. A changed baseline here means user-visible
  output changed. Confirm the change is intended (a config that should now be
  rejected), then refresh: `pnpm run test:output -- --update`, and commit the
  updated baselines.
- If a fixture config was simply wrong, prefer fixing the fixture over accepting
  a new baseline.

**Verify**: `pnpm run test:output` → `0 unexpected`, no invariant breaches.

## Test plan

New file `tests/config/loader.test.ts`, 6 cases as listed in Steps 2 and 3.
Structural pattern: `tests/config/overrides.test.ts`.

The load-bearing ones are **case 4** (no default export) and **case 6** (unknown
key) — those two are the bugs this plan exists to fix, and each must fail
against the pre-plan code.

No existing test should need changing. If one does, that is a signal the change
is broader than intended — read it carefully before editing.

## Done criteria

ALL must hold:

- [ ] `pnpm run format:ci` exits 0
- [ ] `pnpm run lint:ci` exits 0
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run test:ci` exits 0, with 6 new tests in `tests/config/loader.test.ts`
- [ ] `pnpm run build:ci` exits 0
- [ ] `pnpm run test:output` reports 0 unexpected changes and no invariant breaches
- [ ] `grep -n "mod.default ?? mod" src/config/loader.ts` returns no matches
- [ ] A changeset exists under `.changeset/`
- [ ] `git status` shows no modified files outside the Scope list
- [ ] `plans/README.md` status row for 030 updated

## STOP conditions

Stop and report back — do not improvise — if:

- The excerpts in "Current state" do not match the live code.
- Step 4 finds a repo config using a key that is **not** in the schema and the
  key looks intentional (i.e. it is a real feature the schema forgot). That is a
  schema gap, not a config bug, and fixing it is [#114](https://github.com/Gallevy/hermex/issues/114)'s
  business, not this plan's.
- Step 5 shows output-review cases changing in ways unrelated to config
  validation.
- `.strict()` causes more than a handful of failures across `fixtures/` and
  `tests/` — that suggests unknown keys are load-bearing somewhere and the
  "reject" assumption is wrong. Report the list and stop.
- Any step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- **Steps 1–2 and Step 3 are separable.** If a reviewer wants only the
  uncontroversial half, Steps 1, 2 and 4 stand alone and are non-breaking.
- **Step 3 is a breaking change.** It belongs in the 3.0.0 release, and
  [#117](https://github.com/Gallevy/hermex/issues/117) (migration story) needs
  to mention it: configs with stray keys that worked in 2.x will now fail.
- Reviewers should check that `.strict()` was applied to **every** object in
  `schema.ts`, not just the root — a nested object left permissive means a typo
  inside `rules` or `overrides` is still silently dropped, which is the more
  likely place for one.
- If [#114](https://github.com/Gallevy/hermex/issues/114) later decides on
  warn-instead-of-reject, the change is localised: replace `.strict()` with a
  `superRefine` that collects unrecognised keys and prints them, keeping Steps
  1, 2 and 4 as they are.
- `defineConfig` (`src/index.ts:30`) is an identity function and does **not**
  validate. It gives editor-time inference only. Users who bypass it get no
  compile-time warning, which is exactly why the runtime check in Step 1
  matters.
