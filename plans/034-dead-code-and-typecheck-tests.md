# Plan 034: Delete verified-dead exports, retire the unused docs generator, type-check tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 688c481..HEAD -- src/lock-parser/index.ts src/utils/file-utils.ts tsconfig.json docs-templates/ scripts/update-docs.js`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW for Steps 1–3, MED for Step 4 (may surface pre-existing type errors)
- **Depends on**: none. **Coordinate with plan 022** — it removes the dead
  `AggregatedReport.reports` field and the enricher `findIndex`; this plan
  removes a different, non-overlapping set. Either order works.
- **Category**: tech-debt
- **Planned at**: commit `688c481`, 2026-08-15
- **Map ticket**: [#116 Dead code removal and simplification pass](https://github.com/Gallevy/hermex/issues/116)

> ### Assumption this plan encodes
>
> Step 3 assumes `docs-templates/` + `scripts/update-docs.js` should be
> **deleted** rather than wired up. [#116](https://github.com/Gallevy/hermex/issues/116)
> frames this as "decide what is genuinely dead versus merely unused-for-now",
> and it is the one item here where "wire it up instead" is a live alternative.
> Steps 1, 2 and 4 encode no assumption.

## Why this matters

Four items, each verified by grepping for readers rather than inferred:

- Two exported lock-parser helpers with **no production caller**, each of which
  re-parses the entire lockfile per call — a performance trap for anyone who
  does adopt them.
- One exported utility whose only caller is its own test.
- A documentation generator nothing runs, whose outputs are committed anyway —
  so the templates and the committed docs can disagree with no signal.
- A required CI typecheck gate that never looks at `tests/`.

None is urgent alone. Together they are the "v3 is the release that is allowed
to delete" pass, and the last one closes a real hole: test files can carry type
errors indefinitely and CI stays green.

## Current state

### 1 — `getPackageVersion` / `getPackageVersions`

```ts
// src/lock-parser/index.ts:73-107
/**
 * Get the version of a specific package from lockfile
 */
export function getPackageVersion(
  projectPath: string,
  packageName: string,
): string | null {
  const { versions } = findAndParseLockfile(projectPath);
  return versions[packageName] || null;
}

/**
 * Get versions for multiple packages
 */
export function getPackageVersions(
  projectPath: string,
  packageNames: string[],
): Record<string, string> {
  const { versions } = findAndParseLockfile(projectPath);
  const result: Record<string, string> = {};

  packageNames.forEach((pkgName) => {
    if (versions[pkgName]) {
      result[pkgName] = versions[pkgName];
    }
  });

  return result;
}
```

Verified: no caller in `src/`. The only references are
`tests/lock-parser/lock-parser.test.ts:12-13` (imports) and `:512-525` (a
`describe` block testing them). Each call re-runs `findAndParseLockfile`, i.e.
reads and parses the whole lockfile.

Neither is re-exported from `src/index.ts`, so **removing them is not a public
API break** — confirm this yourself in Step 1.

### 2 — `readFile`

```ts
// src/utils/file-utils.ts:28-35
/**
 * Read file content
 * @param filePath - Path to file
 * @returns File content
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}
```

Only caller is `tests/utils/file-utils.test.ts:3,18`. `findFiles` in the same
file is genuinely used (`src/commands/pipeline.ts:49`) and stays.

### 3 — the docs generator

```
docs-templates/__README.md
docs-templates/__examples.md
docs-templates/__patterns.md
scripts/update-docs.js
```

No npm script in `package.json` runs `update-docs.js`; no workflow under
`.github/workflows/` references it. Its outputs (`README.md`, `docs/examples.md`,
`docs/patterns.md`) are committed and edited directly.

Note `tsconfig.json` has `include: ["src/**/*", "scripts/**/*"]`, so
`scripts/update-docs.js` is nominally in the typecheck set (it is `.js`, so
`allowJs` governs whether it is actually checked — it is not set, so it is not).

### 4 — tests are not type-checked

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    ...
  },
  "include": ["src/**/*", "scripts/**/*"],
  "exclude": ["node_modules", "dist", "examples", "docs", "fixtures"]
}
```

`pnpm run typecheck` is `tsc --noEmit` and is a required PR gate
(`.github/workflows/pull-request.yaml`). It never sees `tests/`.

`fixtures/` is deliberately excluded (it contains intentionally-broken source
for the parse-error cases) and must stay excluded.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm run test:ci` | all pass |
| Lint | `pnpm run lint:ci` | exit 0 |
| Format check | `pnpm run format:ci` | exit 0 |
| Build | `pnpm run build:ci` | exit 0 |
| Output review | `pnpm run test:output` | 0 changed |

## Scope

**In scope**:
- `src/lock-parser/index.ts`
- `src/utils/file-utils.ts`
- `tests/lock-parser/lock-parser.test.ts`
- `tests/utils/file-utils.test.ts`
- `tsconfig.json`
- `docs-templates/` (delete)
- `scripts/update-docs.js` (delete)
- `README.md` / `CONTRIBUTING.md` — only if they reference the docs generator
- Any `tests/**/*.ts` file needing a type fix as a consequence of Step 4

**Out of scope** (do NOT touch):
- `AggregatedReport.reports` and the enricher `findIndex` — **plan 022 owns
  both.** Touching them here creates a conflict.
- `findFiles` in `src/utils/file-utils.ts` — used by the pipeline.
- `findAndParseLockfile` — the real entry point; only its two thin wrappers go.
- `docs/examples.md`, `docs/patterns.md`, `README.md` **content** — the
  committed docs stay exactly as they are. Only the unused generator goes.
- `fixtures/` in `tsconfig.json`'s exclude list — it must stay excluded.
- `src/rules/__type-tests__/off-severity.type-test.ts` — an intentional
  type-level test using `@ts-expect-error`; it is already under `src/` and
  already checked. Leave it alone.

## Git workflow

- Branch: `advisor/034-dead-code-and-typecheck-tests`
- One commit per step; conventional commits, e.g.
  `chore(lock-parser): remove unused getPackageVersion helpers`
- Do NOT push or open a PR unless the operator instructed it.
- No changeset for Steps 1–4 **unless** Step 1 finds the helpers are publicly
  exported (they should not be — verify).

## Steps

### Step 1: Remove the two dead lock-parser helpers

First, confirm they are not public API:

```bash
grep -n "getPackageVersion" src/index.ts
```

Expected: **no matches**. If there are matches, STOP — removing them is a
breaking API change and needs a major changeset and a note on
[#104](https://github.com/Gallevy/hermex/issues/104).

Then confirm no production caller:

```bash
grep -rn "getPackageVersions\?\b" src/ scripts/
```

Expected: matches only in `src/lock-parser/index.ts` (the definitions) and in
`src/utils/package-inventory.ts`, which has its **own private**
`getPackageVersion` at line 92 — a different function with the same name, not
exported, and **not** in scope. Read the match to confirm which file it is in
before deleting anything.

Delete both functions and their JSDoc from `src/lock-parser/index.ts`
(lines 73-107). Delete the corresponding `describe` block and imports from
`tests/lock-parser/lock-parser.test.ts` (imports at lines 12-13, block at
512-525).

**Verify**:
- `pnpm run typecheck` → exit 0
- `pnpm run test:ci -- tests/lock-parser/lock-parser.test.ts` → all remaining pass
- `grep -rn "getPackageVersions" src/ tests/` → no matches

### Step 2: Remove `readFile`

Delete the function from `src/utils/file-utils.ts` and its test from
`tests/utils/file-utils.test.ts` (the import at line 3 and the assertion at
line 18 — keep the surrounding `findFiles` test, adjusting it so it no longer
calls `readFile`; use `fs.readFileSync` directly if the test needs content).

Check nothing else imports it first:

```bash
grep -rn "from.*file-utils" src/ tests/ scripts/
```

**Verify**:
- `pnpm run typecheck` → exit 0
- `pnpm run test:ci -- tests/utils/file-utils.test.ts` → all pass
- `grep -rn "\breadFile\b" src/utils/` → no matches
  (`src/npm-registry/cache.ts` imports `readFile` from `node:fs/promises` —
  that is unrelated and stays)

### Step 3: Delete the unused docs generator

> Re-read the "Assumption this plan encodes" box first.

Confirm nothing runs it:

```bash
grep -rn "update-docs\|docs-templates" package.json .github/ scripts/ README.md CONTRIBUTING.md
```

Expected: matches only inside `scripts/update-docs.js` itself, if any. **If a
workflow or npm script does reference it, STOP** — it is not dead.

Then:

```bash
git rm -r docs-templates scripts/update-docs.js
```

If `README.md` or `CONTRIBUTING.md` documents a "run the docs generator" step,
remove that paragraph — leaving instructions for a deleted script is worse than
either state.

**Verify**:
- `git status` shows only deletions plus any doc paragraph edit
- `pnpm run typecheck` → exit 0
- `pnpm run build:ci` → exit 0
- `grep -rn "docs-templates" . --exclude-dir=node_modules --exclude-dir=.git` →
  no matches outside `plans/`

### Step 4: Type-check the tests

Add `tests` to `tsconfig.json`'s `include`:

```json
"include": ["src/**/*", "scripts/**/*", "tests/**/*"],
```

Leave `exclude` untouched — `fixtures` must stay excluded.

Then:

```bash
pnpm run typecheck
```

**Expect this to fail the first time.** `strict`, `noUnusedLocals` and
`noUnusedParameters` have never been applied to these files.

Fix the errors in `tests/`. Guidance, in preference order:

1. A genuine type error → fix the test.
2. An unused variable or import → delete it.
3. A deliberate wrong-type argument (testing runtime validation) → narrow it
   with `as unknown as T` and a one-line comment saying what it is testing.
   Do **not** reach for `@ts-expect-error` unless the error is the point of the
   test; if you do, put it on the exact line and add a comment.
4. Do **not** loosen `tsconfig.json` to make errors go away. If an option has to
   be relaxed for `tests/`, that is a separate `tsconfig.test.json` and a
   decision — STOP and report.

**Verify**:
- `pnpm run typecheck` → exit 0
- `pnpm run test:ci` → all pass (fixing types must not change behaviour)
- Prove the gate works: add `const x: number = 'nope';` to any test file, run
  `pnpm run typecheck` → **must fail**; remove it.

### Step 5: Full gate sweep

```bash
pnpm run format:ci && pnpm run lint:ci && pnpm run typecheck && pnpm run test:ci && pnpm run build:ci && pnpm run test:output
```

**Verify**: all exit 0; output review reports `0 changed`, `0 unexpected`.

## Test plan

No new tests. This plan deletes code and widens a gate.

- Steps 1–2 **remove** tests along with the code they covered. That is correct —
  they were the only callers, so they tested nothing that ships.
- Step 4's proof is the temporary deliberate type error, which must fail the
  typecheck. State explicitly in your report that you ran it.
- `pnpm run test:output` must show **zero** change throughout. Nothing here
  touches runtime behaviour.

## Done criteria

ALL must hold:

- [ ] `pnpm run format:ci` exits 0
- [ ] `pnpm run lint:ci` exits 0
- [ ] `pnpm run typecheck` exits 0 **with `tests/**/*` in the include list**
- [ ] `pnpm run test:ci` exits 0
- [ ] `pnpm run build:ci` exits 0
- [ ] `pnpm run test:output` → 0 changed, 0 unexpected
- [ ] `grep -rn "getPackageVersions" src/ tests/` → no matches
- [ ] `grep -rn "docs-templates" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=plans` → no matches
- [ ] `git status` shows no modified files outside the Scope list
- [ ] Step 4's deliberate-error proof was performed — state this in your report
- [ ] `plans/README.md` status row for 034 updated

## STOP conditions

Stop and report back if:

- The excerpts in "Current state" do not match the live code.
- `grep -n "getPackageVersion" src/index.ts` finds a match — these are public
  API and removing them is a major-version decision.
- Anything in `package.json` or `.github/` references `update-docs.js` — it is
  not dead.
- Step 4 produces more than ~30 type errors, or any error that cannot be fixed
  without relaxing a compiler option. Report the list; a `tsconfig.test.json`
  is a decision, not an improvisation.
- Fixing a type error in `tests/` requires changing a file under `src/` — that
  means the test caught a real product bug, which is a finding worth reporting
  separately, not folding into this cleanup.
- Any output-review baseline changes.

## Maintenance notes

- **js-yaml deliberately deferred.** The audit flagged `js-yaml@5.2.1` running
  against `@types/js-yaml@4.0.9` — types a major behind the runtime. It is
  **not** in this plan because it was read off `pnpm-lock.yaml`, not the
  installed package, and needs verification first: check whether `js-yaml@5`
  ships its own types (in which case `@types/js-yaml` should be dropped, and it
  may currently be *shadowing* correct types) or genuinely needs an updated
  `@types` package. `src/lock-parser/patterns/pnpm.ts:3` is the only consumer
  (`import { load } from 'js-yaml'`). Do that as its own change.
- After Step 4, every new test file is type-checked. Contributors used to loose
  test typing will hit this; `CONTRIBUTING.md` may deserve a line.
- Step 3 removes the generator but **not** the generated docs. If someone later
  wants generated docs back, they are rebuilding from scratch — which is the
  right outcome, since the templates and the committed files had already been
  allowed to drift with nothing checking them.
- A reviewer should confirm the two same-named `getPackageVersion` functions
  were not confused: the private one in `src/utils/package-inventory.ts:92` is
  load-bearing and must survive.
