# Plan 032: Sort `allVersions` by semver, not lexicographically

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 688c481..HEAD -- src/lock-parser/ tests/lock-parser/`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `688c481`, 2026-08-15
- **Map ticket**: [#115 JSON output contract](https://github.com/Gallevy/hermex/issues/115)

No assumption encoded — semver versions sorted as strings is wrong under any
decision #115 could reach.

## Why this matters

`allVersions` is the list of every version of a package resolved anywhere in
the lockfile. It is sorted with `Array.prototype.sort()` and no comparator, so
it sorts lexicographically: a package resolved at 1.9.0 and 1.10.0 reports
`["1.10.0", "1.9.0"]`. Every consumer that reads the list positionally — or a
human scanning the version-conflict output — sees the versions in the wrong
order.

This is the list [`explain package`](https://github.com/Gallevy/hermex/issues/105)
is specified to print for coexisting versions, so fixing it now avoids baking
the wrong order into a new command.

## Current state

**`src/lock-parser/lock-file-adapter.ts:56-82`** — the accumulator every
adapter (npm, yarn, pnpm) builds its result through:

```ts
export function createResolutionAccumulator(): {
  addVersion(pkgName: string, version: string): void;
  setRoot(pkgName: string, version: string): void;
  build(): LockfileResolutionMap;
} {
  const versionSets: Record<string, Set<string>> = {};
  const roots: Record<string, string> = {};

  return {
    addVersion(pkgName, version) {
      (versionSets[pkgName] ??= new Set()).add(version);
    },
    setRoot(pkgName, version) {
      roots[pkgName] = version;
    },
    build() {
      const result: LockfileResolutionMap = {};
      for (const [pkgName, versions] of Object.entries(versionSets)) {
        result[pkgName] = {
          rootVersion: roots[pkgName] ?? null,
          allVersions: Array.from(versions).sort(),   // ← line 76, the bug
        };
      }
      return result;
    },
  };
}
```

`semver` is already a direct dependency (`package.json`) and already imported in
this exact file:

```ts
// src/lock-parser/lock-file-adapter.ts:1-2
import fs from 'fs';
import semver from 'semver';
```

and used correctly a few lines below, which is the pattern to match:

```ts
// src/lock-parser/lock-file-adapter.ts:84-90
/** Highest valid semver among `versions`, or `undefined` if none are valid. */
export function maxSemver(versions: string[]): string | undefined {
  return versions
    .filter((v) => semver.valid(v))
    .sort(semver.compare)
    .at(-1);
}
```

**Important**: `maxSemver` filters to *valid* semver before sorting, because
lockfiles can carry non-semver version strings (git URLs, `file:` links,
workspace protocol). `build()` must not simply swap in `semver.compare` — that
throws on an invalid version. The fix has to handle both kinds.

Where `allVersions` surfaces:
- `src/lock-parser/index.ts:52-57` — copied into `multiVersions`
- `src/utils/package-inventory.ts:198,205-206` — `allVersions` and
  `hasVersionConflict`
- `src/utils/package-distribution.ts:154` — into the reported `packages[]`
- `src/npm-registry/enricher.ts:258-262` — the release-age candidate set
  (order-independent there; it builds a `Set`)

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm run test:ci` | all pass |
| Single test file | `pnpm run test:ci -- tests/lock-parser/lock-parser.test.ts` | all pass |
| Lint | `pnpm run lint:ci` | exit 0 |
| Format check | `pnpm run format:ci` | exit 0 |
| Build | `pnpm run build:ci` | exit 0 |
| Output review | `pnpm run test:output` | see Step 3 |

## Scope

**In scope**:
- `src/lock-parser/lock-file-adapter.ts`
- `tests/lock-parser/lock-parser.test.ts`
- `tests/__output_baselines__/` — only via `pnpm run test:output -- --update`

**Out of scope** (do NOT touch):
- The three adapters (`src/lock-parser/patterns/{npm,yarn,pnpm}.ts`) — they all
  feed the accumulator, so fixing it once fixes all three. Editing them
  duplicates the fix.
- `maxSemver` — already correct.
- `src/npm-registry/enricher.ts` — consumes `allVersions` as a set; order does
  not affect it.

## Git workflow

- Branch: `advisor/032-allversions-semver-order`
- Conventional commits, e.g. `fix(lock-parser): sort allVersions by semver, not as strings`
- Do NOT push or open a PR unless the operator instructed it.
- User-facing output change → `pnpm changeset add --patch hermex -m "..."`.

## Steps

### Step 1: Add a semver-aware comparator and use it in `build()`

Add a module-level helper next to `maxSemver` in
`src/lock-parser/lock-file-adapter.ts`, and use it at line 76.

Target shape:

```ts
/**
 * Orders versions by semver, with non-semver strings (git URLs, `file:` links,
 * workspace protocol) collated last in stable lexicographic order. A plain
 * `.sort()` here put 1.10.0 before 1.9.0; `semver.compare` alone throws on the
 * non-semver strings lockfiles legitimately contain.
 */
export function compareVersions(a: string, b: string): number {
  const aValid = semver.valid(a);
  const bValid = semver.valid(b);
  if (aValid && bValid) return semver.compare(a, b);
  if (aValid) return -1;
  if (bValid) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}
```

Then in `build()`:

```ts
allVersions: Array.from(versions).sort(compareVersions),
```

**Verify**: `pnpm run typecheck` → exit 0.

### Step 2: Test the ordering

Add to `tests/lock-parser/lock-parser.test.ts` (match the existing `describe`
style in that file):

1. **The regression case** — a package resolved at `1.9.0` and `1.10.0` yields
   `['1.9.0', '1.10.0']`. This must fail against the pre-plan code.
2. **Mixed valid/invalid** — `['2.0.0', 'workspace:*', '1.0.0']` yields
   `['1.0.0', '2.0.0', 'workspace:*']` — semver first, in order; non-semver
   last.
3. **All invalid** — does not throw, and returns a stable order.
4. **Prerelease ordering** — `['1.0.0', '1.0.0-beta.1']` yields
   `['1.0.0-beta.1', '1.0.0']`.

Test cases 1 and 4 through a real lockfile fixture if the file's existing tests
work that way; otherwise unit-test `compareVersions` directly (it is exported,
which is why Step 1 exports it).

**Verify**: `pnpm run test:ci -- tests/lock-parser/lock-parser.test.ts` → all
pass, 4 new tests.

Confirm case 1 is a real regression test: revert Step 1 locally
(`git stash push src/lock-parser/lock-file-adapter.ts`), re-run — case 1 must
**fail** — then `git stash pop`.

### Step 3: Refresh the output-review baselines

`allVersions` appears in the JSON baselines and in the version-conflict human
output. The `version-conflict` fixture repo (`fixtures/repos/version-conflict/`)
is the one most likely to move.

```bash
pnpm run test:output
```

If cases changed, confirm the only difference is version ordering, then
`pnpm run test:output -- --update` and commit the baselines.

**Verify**: re-run `pnpm run test:output` → `0 changed`, `0 unexpected`, no
invariant breaches.

## Test plan

4 new tests in `tests/lock-parser/lock-parser.test.ts` as listed in Step 2.
Structural pattern: the existing `describe` blocks in that file.

Case 1 (1.9.0 before 1.10.0) is the load-bearing one and must fail against the
pre-plan code. Case 2 is the one that catches a naive `sort(semver.compare)`
fix, which throws.

## Done criteria

ALL must hold:

- [ ] `pnpm run format:ci` exits 0
- [ ] `pnpm run lint:ci` exits 0
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run test:ci` exits 0 with 4 new lock-parser tests
- [ ] `pnpm run build:ci` exits 0
- [ ] `pnpm run test:output` → 0 changed, 0 unexpected, no invariant breaches
- [ ] `grep -n "Array.from(versions).sort()" src/` returns no matches
- [ ] `git status` shows no modified files outside the Scope list
- [ ] `plans/README.md` status row for 032 updated

## STOP conditions

Stop and report back if:

- The excerpts in "Current state" do not match the live code.
- Any test outside `tests/lock-parser/` fails after Step 1 — that means
  something depends on the lexicographic order, which would be a hidden
  coupling this plan did not account for.
- Output-review cases change in ways other than version ordering.
- `semver.compare` throws during the test run despite the validity guard — the
  guard is wrong and needs reporting, not patching around.
- Any step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- `compareVersions` is exported so it can be reused. If
  [#105](https://github.com/Gallevy/hermex/issues/105) builds `explain package`,
  its coexisting-versions list should use this rather than re-sorting.
- The non-semver tail is deliberately collated **last**: those entries are
  usually workspace or git links, and burying them below the real releases is
  the more useful reading order. If a reviewer disagrees, the change is one line
  (swap the two `return` signs), but update the doc comment with it.
- A reviewer should check the doc comment survived — it records *why* the naive
  `sort(semver.compare)` fix is wrong, which is the thing a future contributor
  will otherwise "simplify" back into a bug.
