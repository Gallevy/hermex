# Plan 019: Parse files concurrently with SWC's async parse()

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 19a4695..HEAD -- src/commands/pipeline.ts src/swc-parser/index.ts`
> If these files changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition. In particular, if Plans 013/016/017 have
> landed, the excerpts will differ slightly (lineOffsets, null handling,
> filePath) — that exact drift is expected and described inline below.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 013, 016, 017 (all touch the same two files; land them first so this refactor doesn't conflict)
- **Category**: perf
- **Planned at**: commit `19a4695`, 2026-07-04

## Why this matters

The scan hot path parses files strictly one at a time on the main thread:
`readFileSync` + `parseSync` per file in a serial loop. `@swc/core` also
exports an async `parse()` that runs the Rust parser on a background thread
(napi async task), so a batched concurrent loop parallelizes the CPU-bound
work across cores with no worker-thread machinery. On multi-hundred-file
codebases this is the difference between seconds and a fraction of them.

**Important — a plausible-looking wrong fix**: wrapping the existing
`parseSync` calls in `Promise.all` parallelizes nothing (synchronous work
still blocks the event loop one file at a time). The fix must switch to the
async `parse()` API and async file reads.

**Verified on the installed `@swc/core@1.15.43`**: concurrent `parse()` calls
each get spans starting at 1 (no cross-call span accumulation), so line
numbers from Plan 013 stay correct under concurrency. Plan 013's
"second file parsed in one process" test is the regression guard.

## Current state

**`src/commands/pipeline.ts:46-63`** — the serial loop (after Plan 016 it
also records null reports as errors; preserve that):
```ts
spinner.start('Analyzing files...');
const reports: UsageReport[] = [];
const parseErrors: ParseError[] = [];

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  spinner.text = `Analyzing files... (${i + 1}/${files.length})`;
  try {
    const report = parseFile(file);
    if (report) {
      reports.push(report);
    }
    // (after Plan 016: else parseErrors.push({ file, message: 'Could not read file' });)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    parseErrors.push({ file, message });
  }
}
```

**`src/swc-parser/index.ts`** — `parseCode` (sync, used by tests and any
library consumers) and `parseFile` (sync read + parseCode). `swcOptionsForFile`
maps extension → SWC options; reuse it unchanged.

**Batching convention already in the repo** — `src/npm-registry/enricher.ts:159-194`
processes work in slices of `CONCURRENCY = 8` with `Promise.all`. Match that
pattern rather than adding a p-limit dependency.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0              |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |
| Smoke     | `pnpm run dev:scan`  | scan completes, sensible counts |

## Scope

**In scope**:
- `src/swc-parser/index.ts` — add `parseCodeAsync` and `parseFileAsync`
- `src/commands/pipeline.ts` — batched concurrent loop
- `tests/swc-parser/parse-file.test.ts` — extend with async-variant tests
  (file exists if Plan 016 ran; create the async describe block regardless)

**Out of scope** (do NOT touch):
- The sync `parseCode`/`parseFile` exports — they stay (tests and library
  consumers use them); the async variants are additions
- `src/swc-parser/core/*`, pattern files
- Enricher concurrency, spinner styling

## Git workflow

- Branch: `advisor/019-parallel-file-parsing`
- Commit message: `perf: parse files concurrently with async SWC parse`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add async variants to src/swc-parser/index.ts

```ts
import { parse, parseSync } from '@swc/core';
import fsp from 'node:fs/promises';

export async function parseCodeAsync(
  code: string,
  filePath = 'file.tsx',
): Promise<UsageReport> {
  const state = createState();
  state.lineOffsets = buildLineOffsets(code); // present if Plan 013 landed; omit the line if not
  const ast = await parse(code, swcOptionsForFile(filePath));
  visitNode(ast, state);
  return generateReport(state, filePath); // (state) if Plan 017 has not landed
}

export async function parseFileAsync(
  filePath: string,
): Promise<UsageReport | null> {
  let code: string;
  try {
    code = await fsp.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
  return parseCodeAsync(code, filePath);
}
```

Mirror whatever the sync functions look like at HEAD — the async variants
must produce byte-identical reports to their sync counterparts.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 2: Convert the pipeline loop to batches

In `src/commands/pipeline.ts`, replace the serial loop with the enricher's
batching pattern (batch size 8; a `const PARSE_CONCURRENCY = 8;` at module
top):

```ts
const reports: UsageReport[] = [];
const parseErrors: ParseError[] = [];
let done = 0;

for (let i = 0; i < files.length; i += PARSE_CONCURRENCY) {
  const batch = files.slice(i, i + PARSE_CONCURRENCY);
  const results = await Promise.all(
    batch.map(async (file) => {
      try {
        return { file, report: await parseFileAsync(file), error: null };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { file, report: null, error: message };
      }
    }),
  );
  for (const r of results) {
    done++;
    if (r.error) parseErrors.push({ file: r.file, message: r.error });
    else if (r.report) reports.push(r.report);
    else parseErrors.push({ file: r.file, message: 'Could not read file' });
  }
  spinner.text = `Analyzing files... (${done}/${files.length})`;
}
```

Note the ordering guarantee this preserves: `reports` stays in `files` order
within and across batches (Promise.all preserves input order), so aggregated
output remains deterministic.

**Verify**: `pnpm run typecheck && pnpm run build` → exit 0.

### Step 3: Async-variant tests

Add to `tests/swc-parser/parse-file.test.ts` (create the file if Plan 016 has
not run — model on `tests/utils/compliance.test.ts` conventions):

```ts
describe('parseCodeAsync parity', () => {
  it('produces the same report as parseCode', async () => {
    const code = `import { Button } from '@ui/b';\nexport const A = () => <Button x="1" />;`;
    const sync = parseCode(code, 'p.tsx');
    const async_ = await parseCodeAsync(code, 'p.tsx');
    expect(async_).toEqual(sync);
  });

  it('concurrent parses do not corrupt each other', async () => {
    const mk = (n: number) =>
      `import { C${n} } from '@ui/c';\nexport const A${n} = () => <C${n} />;`;
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, n) => parseCodeAsync(mk(n), `f${n}.tsx`)),
    );
    results.forEach((r, n) => {
      expect(r.patterns.usage.jsx[0]?.component).toBe(`C${n}`);
    });
  });

  it('parseFileAsync returns null for a missing file', async () => {
    expect(await parseFileAsync('definitely/not/here.tsx')).toBeNull();
  });
});
```

If Plan 013 landed, also assert the concurrent results report correct small
`line` values.

**Verify**: `pnpm run test:ci` → all pass.

### Step 4: Smoke test and rough timing

```
pnpm run dev:scan
```

Completes with the same file/component counts as before the change (compare
against a `git stash`-free run on main if unsure). Note: fixtures are few, so
don't expect a visible speedup here — correctness is what's being checked.

### Step 5: Full suite

```
pnpm run build && pnpm run test:ci && pnpm run lint && pnpm run typecheck
```

All exit 0.

## Test plan

Step 3: sync/async parity, 12-way concurrency isolation, null contract. The
e2e CLI tests plus Plan 013's second-file test cover the integrated path.

## Done criteria

- [ ] `parseCodeAsync`/`parseFileAsync` exported; sync exports unchanged
- [ ] `pipeline.ts` contains no direct `parseFile(` call (grep it) and batches with `Promise.all`
- [ ] Parity + concurrency tests pass
- [ ] `pnpm run dev:scan` reports the same counts as before the change
- [ ] `pnpm run typecheck`, `pnpm run build`, `pnpm run test:ci`, `pnpm run lint` all exit 0
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- The concurrency-isolation test fails (component names or line numbers cross
  files): the installed @swc/core does not isolate parse calls as verified at
  planning time. STOP — do not ship concurrency on top of that.
- The parity test fails: `parse()` and `parseSync()` return differing ASTs
  for the same options. Report the difference.
- Async conversion appears to require changing `aggregateReports`, print
  utilities, or any out-of-scope file.

## Maintenance notes

- Batch size 8 matches the enricher's convention. If someone later wants it
  configurable, do it for both in one pass (a rejected finding — see
  `plans/README.md` — deemed it YAGNI for now).
- The sync `parseCode` remains the API tests use; keep parity whenever parser
  behavior changes (the parity test enforces this).
- If a future SWC upgrade changes span behavior, Plan 013's regression tests
  fail first; fix there, not here.
