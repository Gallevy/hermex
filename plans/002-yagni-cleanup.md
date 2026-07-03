# Plan 002: Remove dead state fields, duplicate types, and unused utility file

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 36699c4..HEAD -- src/swc-parser/types.ts src/swc-parser/core/state.ts src/config/types.ts src/utils/date-utils.ts`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt / YAGNI
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

**Dead state fields**: Four fields in the core `UsagePatterns` interface
(`directImports`, `componentMappings`, `renderProps`, `contextUsage`) are
initialized in `createState()` and then never written to by any visitor, never
read back, and never included in the generated `UsageReport`. They appear in
the central type definition and state object, adding cognitive load every time
a developer reads or extends the code.

**Duplicate type**: `UpgradeLevel` is defined in both `src/config/types.ts`
(never used from there) and `src/npm-registry/types.ts` (the actual consumer).
Two definitions create silent drift risk. `OutputMode` in `src/config/types.ts`
has no consumer anywhere in the codebase.

**Dead file**: `src/utils/date-utils.ts` is a 5-line file whose single export
`generateUnixTimestamp()` is never imported anywhere. It is dead code.

## Current state

**`src/swc-parser/types.ts` — `UsagePatterns` interface** (lines 75–97), four dead fields:
```ts
directImports: Set<string>;      // line 76 — never written in any visitor
componentMappings: Set<string>;  // line 82 — never written in any visitor
renderProps: Set<string>;        // line 89 — never written in any visitor
contextUsage: Set<string>;       // line 90 — never written in any visitor
```

**`src/swc-parser/core/state.ts` — `createState()`** (lines 3–33), same four initialized:
```ts
directImports: new Set(),     // line 5
componentMappings: new Set(), // line 11
renderProps: new Set(),       // line 18
contextUsage: new Set(),      // line 19
```

**`src/config/types.ts`** (lines 1–3):
```ts
export type OutputMode = 'table' | 'chart' | 'log';   // no consumer in codebase
export type UpgradeLevel = 'needs_upgrade' | 'mandatory_upgrade';  // duplicate of npm-registry/types.ts:1
```
The canonical `UpgradeLevel` with actual consumers is in `src/npm-registry/types.ts:1`.

**`src/utils/date-utils.ts`** (entire file):
```ts
export function generateUnixTimestamp() {
  const unixTimestamp = Math.floor(Date.now() / 1000);
  return unixTimestamp;
}
```
Confirmed: no file imports `date-utils` or `generateUnixTimestamp`.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0, no errors   |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope** (the only files to modify or delete):
- `src/swc-parser/types.ts`
- `src/swc-parser/core/state.ts`
- `src/config/types.ts`
- `src/utils/date-utils.ts` (delete)

**Out of scope** (do NOT touch):
- `src/swc-parser/core/report.ts` — `calculateTotalPatterns` iterates `usagePatterns` dynamically; removing the four fields is safe (they were always empty), but do not change that function.
- Any file in `src/swc-parser/patterns/` — none write to the dead fields.
- `src/npm-registry/types.ts` — the canonical `UpgradeLevel` stays there.

## Git workflow

- Branch: `advisor/002-yagni-cleanup`
- Commit message: `refactor: remove dead state fields, duplicate types, and unused date-utils`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Remove the four dead fields from UsagePatterns interface

In `src/swc-parser/types.ts`, delete these four lines from the `UsagePatterns` interface:
```ts
directImports: Set<string>;
componentMappings: Set<string>;
renderProps: Set<string>;
contextUsage: Set<string>;
```
Leave all other interface fields untouched.

**Verify**: `pnpm run typecheck` will fail with errors in `state.ts` (expected — the interface no longer has the fields that `createState()` still sets). This is intentional; proceed to Step 2.

### Step 2: Remove the four dead fields from createState()

In `src/swc-parser/core/state.ts`, delete these four lines from the `usagePatterns` object literal:
```ts
directImports: new Set(),
componentMappings: new Set(),
renderProps: new Set(),
contextUsage: new Set(),
```

**Verify**: `pnpm run typecheck` → exits 0, no errors.

### Step 3: Remove OutputMode and duplicate UpgradeLevel from config/types.ts

In `src/config/types.ts`, delete lines 1–3:
```ts
// Primitive types not represented in the config schema
export type OutputMode = 'table' | 'chart' | 'log';
export type UpgradeLevel = 'needs_upgrade' | 'mandatory_upgrade';
```
The `export type { ... } from './schema'` re-export block below stays unchanged.

If the comment "// Primitive types not represented in the config schema" becomes orphaned and misleading, remove it too.

**Verify**:
```
grep -rn "OutputMode\|UpgradeLevel" src/config/
```
→ no matches.

```
pnpm run typecheck
```
→ exits 0. If TypeScript reports `Cannot find name 'OutputMode'` or similar in any other file, grep for the import, identify the file, and remove the import from that file (there should be no consumers — confirmed at audit time).

### Step 4: Delete date-utils.ts

Delete the file `src/utils/date-utils.ts`.

**Verify**:
```
grep -rn "date-utils\|generateUnixTimestamp" src/ tests/
```
→ no matches.

```
pnpm run typecheck
```
→ exits 0.

### Step 5: Final validation

```
pnpm run build && pnpm run test:ci && pnpm run lint
```

All must exit 0.

## Test plan

No new tests needed — the removed code was dead (unused) and never executed. The existing suite confirms no regressions.

## Done criteria

- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm run test:ci` exits 0
- [ ] `grep -rn "directImports\|componentMappings\|renderProps\|contextUsage" src/` → no matches
- [ ] `grep -rn "OutputMode\|UpgradeLevel" src/config/` → no matches
- [ ] `ls src/utils/date-utils.ts` → "No such file or directory"
- [ ] Only the four in-scope files are modified/deleted (`git diff --name-only`)
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- After Step 1, `pnpm run typecheck` fails in a file OTHER than `state.ts` (a consumer was missed). Stop and report the file name.
- After Step 3, `pnpm run typecheck` reports `Cannot find name 'OutputMode'` or `UpgradeLevel` in any file outside `src/config/types.ts`. Stop and report the file name.
- Any test failure after deletions.

## Maintenance notes

- When new pattern detection fields are added to `UsagePatterns`, they must also appear in `generateReport()` in `src/swc-parser/core/report.ts`, or they become dead fields again. The `calculateTotalPatterns` function picks them up automatically via `Object.values()`.
- `UpgradeLevel` lives in `src/npm-registry/types.ts` — import from there, not from `config/types.ts`.
