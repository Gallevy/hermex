# Plan 032: Remove parseFile's dead `| null` return type and the unreachable check in pipeline.ts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat a3b8f02..HEAD -- src/swc-parser/index.ts src/commands/pipeline.ts`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (touches the same two files as Plan 013's Step 3/4 —
  no line overlap, but run after 013 to avoid parallel-edit conflicts if
  both are queued together)
- **Category**: bug / correctness
- **Planned at**: commit `a3b8f02`, 2026-07-24

## Why this matters

**This plan replaces the deleted Plan 016** ("parseFile returns null on I/O
error; pipeline records skipped files"). That plan's premise was wrong and
was rejected during this session's audit reconciliation, not carried
forward: it assumed unreadable files could be **silently dropped** by
`pipeline.ts`'s `if (report) { reports.push(report); }` check. They can't —
`parseFile` calls `fs.readFileSync`, which **throws** (doesn't return
anything) on any I/O error, and the surrounding `try/catch` in
`pipeline.ts` already catches that throw and records it in `parseErrors`
with its real message (e.g. `ENOENT: no such file or directory...`). There
is no code path today where `parseFile` returns `null` — `parseCode`'s only
return statement always produces a `UsageReport`. So `parseFile`'s
`UsageReport | null` return type is a dead contract, and the `if (report)`
check in `pipeline.ts` is unreachable dead code.

Plan 016 proposed making `parseFile` **actually** return `null` on I/O
errors (wrapping `readFileSync` in its own try/catch) and having
`pipeline.ts` push a generic `'Could not read file'` message. That would be
a **behavior regression**: today's real, specific error message
(`ENOENT: ...`, `EACCES: ...`, etc.) would be replaced with a generic string
that loses information a user debugging a scan failure would want. This
plan instead tightens the type to match actual behavior: `parseFile`
returns `UsageReport`, never `null`, and the dead check in `pipeline.ts` is
removed. The existing `try/catch` remains the sole, correct error path —
nothing about runtime behavior changes, only the type signature and the
removal of unreachable code.

## Current state

**`src/swc-parser/index.ts:49-52`**:
```ts
export function parseFile(filePath: string): UsageReport | null {
  const code = fs.readFileSync(filePath, 'utf8');
  return parseCode(code, filePath);
}
```
`parseCode` (same file, lines 42-47) has exactly one return statement and it
always returns a `UsageReport` — there is no path to `null` anywhere in this
function or in `parseCode`.

**`src/commands/pipeline.ts:63-71`** — the only call site of `parseFile` in
the entire repo (confirmed via repo-wide grep for `parseFile`):
```ts
    try {
      const report = parseFile(file);
      if (report) {
        reports.push(report);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      parseErrors.push({ file, message });
    }
```
The `if (report)` branch's `else` (implicitly: do nothing) is unreachable —
`parseFile` cannot return a falsy value without having already thrown, which
would have skipped past the `if` entirely into the `catch`.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0              |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope**:
- `src/swc-parser/index.ts` — change `parseFile`'s return type
- `src/commands/pipeline.ts` — remove the dead `if (report)` check

**Out of scope** (do NOT touch):
- The `try/catch` block itself in `pipeline.ts` — it already correctly
  handles both `readFileSync` errors and `parseCode` (parse) errors; no
  change needed.
- `src/swc-parser/core/*`, any pattern file — unrelated.
- Do NOT implement Plan 016's original "make parseFile return null on I/O
  error" approach — it was explicitly rejected during reconciliation (see
  "Why this matters" above) as a behavior regression, not just superseded.

## Git workflow

- Branch: `advisor/032-remove-dead-parsefile-null-type`
- Commit message: `fix: tighten parseFile's return type, remove unreachable null check in pipeline`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Tighten parseFile's return type

In `src/swc-parser/index.ts`, change:
```ts
export function parseFile(filePath: string): UsageReport | null {
  const code = fs.readFileSync(filePath, 'utf8');
  return parseCode(code, filePath);
}
```
to:
```ts
export function parseFile(filePath: string): UsageReport {
  const code = fs.readFileSync(filePath, 'utf8');
  return parseCode(code, filePath);
}
```
(Only the return type annotation changes — the function body is identical.)

**Verify**: `pnpm run typecheck` → exit 0.

### Step 2: Remove the dead null check in pipeline.ts

In `src/commands/pipeline.ts`, change:
```ts
    try {
      const report = parseFile(file);
      if (report) {
        reports.push(report);
      }
    } catch (error: unknown) {
```
to:
```ts
    try {
      reports.push(parseFile(file));
    } catch (error: unknown) {
```

**Verify**: `pnpm run typecheck` → exit 0. Then
`grep -n "if (report)" src/commands/pipeline.ts` → no matches.

### Step 3: Full suite

```
pnpm run build && pnpm run test:ci && pnpm run lint && pnpm run typecheck
```

All exit 0. No test should change behavior — this is a pure type-tightening
and dead-code removal with identical runtime behavior for every existing
input (readable file → pushed; unreadable/unparsable file → caught and
recorded in `parseErrors`, exactly as before).

## Test plan

No new tests required — there is no new behavior to cover. The existing
`tests/e2e/cli.test.ts` suite already exercises the "some files fail to
parse" path end-to-end (via `parseErrors` reaching `printErrors`) and
continues to do so unchanged; this plan doesn't touch that path, only the
now-provably-unreachable `null` branch around it.

## Done criteria

- [ ] `src/swc-parser/index.ts`'s `parseFile` returns `UsageReport` (not
      `UsageReport | null`)
- [ ] `grep -n "if (report)" src/commands/pipeline.ts` → no matches
- [ ] `pnpm run typecheck`, `pnpm run build`, `pnpm run test:ci`,
      `pnpm run lint` all exit 0
- [ ] Only the two in-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- `fs.readFileSync` or `parseCode` gains a path that can return/produce a
  falsy value some other way (i.e. the "Current state" excerpts don't match
  what you find) — STOP, this plan's premise (parseFile can never return
  null) would no longer hold.
- A test somewhere asserts `parseFile(...)` returns `null` for some input —
  STOP and report; it means there's a consumer or contract this plan missed
  despite the repo-wide grep finding none.

## Maintenance notes

- `parseFile`'s contract is now: returns a `UsageReport` on success, throws
  on any failure (unreadable file or unparsable content) — both are caught
  identically by `pipeline.ts`'s `try/catch` and recorded in `parseErrors`.
  Any future caller should follow the same pattern, not reintroduce a
  null-checking convention.
- If a genuine "skip this file silently, no error" need arises later (e.g.
  an opt-in `--ignore-errors`-style feature that swallows certain failures
  without recording them), that should be a new, deliberately-designed
  return path — not a resurrection of the old unreachable `null`.
