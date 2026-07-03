# Plan 017: YAGNI — remove unused ComponentUsage.files field

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 36699c4..HEAD -- src/utils/aggregator.ts`
> If aggregator.ts changed since this plan was written, compare the
> "Current state" excerpt before proceeding.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (but coordinate with Plan 012 — if 012 executes first,
  the relevant code will be in `src/utils/aggregator-core.ts` instead)
- **Category**: tech-debt / YAGNI
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

`ComponentUsage.files` is a `Set<string>` that is initialized empty on every
`ComponentUsage` object and **never written to** anywhere in the codebase.
Any consumer that reads `.files` always gets an empty Set, making it an
unimplemented promise in the public API.

Per YAGNI, unused code that carries an implied contract (the field exists, it
looks like it should contain data) should be removed rather than kept
as "future work" infrastructure. If file-level tracking is ever needed, it can
be added at that point with real consumers.

## Current state

**`src/utils/aggregator.ts`** (search for `ComponentUsage`):
```ts
export interface ComponentUsage {
  name: string;
  source: string;
  count: number;
  files: Set<string>;   // ← always empty, never populated
}
```

The field is initialized at the creation point (within `aggregateReports`):
```ts
componentUsageMap.set(componentName, {
  name: componentName,
  source,
  count: 0,
  files: new Set<string>(),   // ← created empty, never written after
});
```

**Verify there are no writes to `.files`**:
```
grep -rn "\.files\." src/ 
grep -rn "\.files\.add\|\.files\.set" src/
```
Both must return zero matches (excluding files that are already identified as
read-only consumers).

**Consumers of `ComponentUsage`** (read-only, may read `.files`):
Run `grep -rn "ComponentUsage\|\.files" src/` to find all consumers. At the
planned-at commit, no print utility or output function reads `.files`. Confirm
this before proceeding.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0, no errors   |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope**:
- `src/utils/aggregator.ts` — remove `files` from `ComponentUsage` interface
  and from its initialization

**If Plan 012 is DONE** (aggregator was split):
- `src/utils/aggregator-core.ts` instead of `aggregator.ts` — same changes

**Out of scope** (do NOT touch):
- Any print utility that reads `ComponentUsage` — if none currently access
  `.files`, no changes are needed there
- `src/utils/aggregator.ts` re-export barrel (if Plan 012 is done)

## Git workflow

- Branch: `advisor/017-yagni-component-files`
- Commit message: `refactor: remove unused ComponentUsage.files dead field`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Confirm the field is never written

```
grep -rn "\.files\." src/
```
→ Should show zero matches writing to `.files` on a `ComponentUsage`.

If any match writes to `.files`, STOP — the field may be populated in a code
path not obvious from the interface. Report the file and line.

### Step 2: Confirm no consumer reads .files

```
grep -rn "componentUsage\|ComponentUsage" src/
```

Review each match. If any print utility, JSON serializer, or output file reads
`.files` on `ComponentUsage`, the removal will drop that data. Note which file
and what it does with the field before proceeding.

At the planned-at commit, no consumer reads `.files`. If you find one, STOP
and report.

### Step 3: Remove files from the interface

In `src/utils/aggregator.ts` (or `aggregator-core.ts` if Plan 012 is done),
find the `ComponentUsage` interface and remove the `files` line:

```ts
// Before:
export interface ComponentUsage {
  name: string;
  source: string;
  count: number;
  files: Set<string>;
}

// After:
export interface ComponentUsage {
  name: string;
  source: string;
  count: number;
}
```

**Verify**: `pnpm run typecheck` — will fail on the initialization site (expected).

### Step 4: Remove the initialization

In the same file, find where `ComponentUsage` objects are created and remove
`files: new Set<string>()`:

```ts
// Before:
componentUsageMap.set(componentName, {
  name: componentName,
  source,
  count: 0,
  files: new Set<string>(),
});

// After:
componentUsageMap.set(componentName, {
  name: componentName,
  source,
  count: 0,
});
```

**Verify**:
```
pnpm run typecheck
```
→ exits 0.

```
grep -rn "files: new Set" src/
```
→ no matches.

### Step 5: Run the full suite

```
pnpm run build && pnpm run test:ci && pnpm run lint
```

All must exit 0.

## Test plan

No new tests needed — this is a removal of dead code. The existing test suite
(and the aggregator tests from Plan 006 if available) confirm no regressions.

## Done criteria

- [ ] `ComponentUsage` interface has no `files` field
- [ ] No `files: new Set()` initialization in aggregator source
- [ ] `grep -rn "\.files" src/utils/aggregator*.ts` → no matches
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm run test:ci` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] Only aggregator file(s) modified
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- `grep -rn "\.files\." src/` shows a write to `.files` on a `ComponentUsage`
  object. The field may be populated in a code path missed during audit. Stop
  and report the location.
- Any print utility or JSON serializer reads `.files`. Check what it does — if
  it outputs file paths to users, removing `.files` would regress visible output.
  Stop and report.
- `pnpm run typecheck` after Step 4 shows errors in files outside
  `aggregator.ts` / `aggregator-core.ts`. This means some consumer imports and
  uses `.files`. Find the consumer from the error message, and check whether
  it actually uses the data or just spreads the object. If it only spreads,
  remove the `.files` access from the consumer too. If it uses the data, STOP.

## Maintenance notes

- If file-level tracking is ever added (which files use which component), add
  `files: Set<string>` back to `ComponentUsage` at that time AND populate it
  in the aggregation loop. Don't add it back without the population logic.
- Plan 012 (aggregator split) places `ComponentUsage` in `aggregator-core.ts`.
  If both plans 012 and 017 are executed, this change applies to
  `aggregator-core.ts`, not `aggregator.ts`.
