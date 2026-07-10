# Plan 016: parseFile returns null on I/O error, pipeline records skipped files

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 19a4695..HEAD -- src/swc-parser/index.ts src/commands/pipeline.ts tests/swc-parser/`
> If these files changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (coordinate with Plan 013 — both edit `src/swc-parser/index.ts`; run 013 first if both are queued)
- **Category**: bug / tests
- **Planned at**: commit `19a4695`, 2026-07-04 (rewrites the 2026-06-27 version: the caller moved from `scan.ts` into `pipeline.ts`, which changes the fix)

## Why this matters

`parseFile` declares `UsageReport | null` but never returns null — it throws
on any I/O error:

```ts
// src/swc-parser/index.ts:49-52
export function parseFile(filePath: string): UsageReport | null {
  const code = fs.readFileSync(filePath, 'utf8');
  return parseCode(code, filePath);
}
```

The type contract and the behavior disagree. Worse, the (currently
unreachable) null path in the caller **silently drops files**:

```ts
// src/commands/pipeline.ts:54-63
try {
  const report = parseFile(file);
  if (report) {
    reports.push(report);      // ← null would fall through with NO error recorded
  }
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  parseErrors.push({ file, message });
}
```

If `parseFile` is ever "fixed" to return null without also fixing the
pipeline, unreadable files would vanish from the report with no entry in
`parseErrors`. This plan fixes both ends coherently: `parseFile` returns null
on I/O errors (honoring its signature), and the pipeline records a
`ParseError` when it receives null.

## Current state

- `src/swc-parser/index.ts` — `parseFile` at lines 49–52 (excerpt above);
  `parseCode` at 42–47.
- `src/commands/pipeline.ts` — parse loop at lines 50–63 (excerpt above);
  `parseErrors: ParseError[]` is declared at line 48 and printed via
  `printErrors(parseErrors)` at line 71. `ParseError` is
  `{ file: string; message: string }` (`src/swc-parser/types.ts:144-147`).
- Fixture for a real-file test: `fixtures/patterns/01-direct-usage.tsx`
  (note: it moved — an older version of this plan cited `fixtures/01-direct-usage.tsx`).
- Test conventions: vitest, see `tests/utils/compliance.test.ts` for style.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0              |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope**:
- `src/swc-parser/index.ts` — wrap `readFileSync` in try/catch
- `src/commands/pipeline.ts` — record a `ParseError` on null report
- `tests/swc-parser/parse-file.test.ts` — create

**Out of scope** (do NOT touch):
- `src/swc-parser/core/*` — no changes
- `src/commands/scan.ts`, `src/commands/comply.ts` — their catch blocks are
  for pipeline-level failures, unrelated
- Any pattern file

## Git workflow

- Branch: `advisor/016-parsefile-error-handling`
- Commit message: `fix: parseFile returns null on I/O error; pipeline records skipped files`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Make parseFile honor its signature

In `src/swc-parser/index.ts`:

```ts
export function parseFile(filePath: string): UsageReport | null {
  let code: string;
  try {
    code = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
  return parseCode(code, filePath);
}
```

Parse errors (invalid syntax) from `parseCode` still throw — that is
intentional: the pipeline distinguishes "unreadable" (null) from "unparsable"
(throw), and both end up in `parseErrors`.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 2: Record null reports as errors in the pipeline

In `src/commands/pipeline.ts`, change the loop body:

```ts
try {
  const report = parseFile(file);
  if (report) {
    reports.push(report);
  } else {
    parseErrors.push({ file, message: 'Could not read file' });
  }
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  parseErrors.push({ file, message });
}
```

**Verify**: `pnpm run typecheck` → exit 0, `pnpm run build` → exit 0.

### Step 3: Create tests/swc-parser/parse-file.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { parseCode, parseFile } from '../../src/swc-parser';

describe('parseCode', () => {
  it('returns an empty report for empty code', () => {
    const report = parseCode('', 'file.tsx');
    expect(report.summary.totalImports).toBe(0);
    expect(report.patterns.usage.jsx).toHaveLength(0);
    expect(report.summary.totalUsagePatterns).toBe(0);
  });

  it('does not throw on comment-only input', () => {
    expect(() => parseCode('// c\n/* b */\n', 'file.ts')).not.toThrow();
  });
});

describe('parseFile', () => {
  it('returns null for a non-existent file', () => {
    expect(parseFile(join(__dirname, 'does-not-exist.tsx'))).toBeNull();
  });

  it('returns null for a directory path', () => {
    expect(parseFile(__dirname)).toBeNull();
  });

  it('parses an existing fixture file', () => {
    const fixture = join(
      __dirname, '..', '..', 'fixtures', 'patterns', '01-direct-usage.tsx',
    );
    const result = parseFile(fixture);
    expect(result).not.toBeNull();
    expect(result!.summary.totalImports).toBeGreaterThan(0);
  });
});
```

If `__dirname` is unavailable (ESM test context), use
`new URL('.', import.meta.url).pathname` or `import.meta.dirname` — match
whatever `tests/helpers/read-fixture.ts` already does.

**Verify**: `pnpm run test:ci` → all pass.

### Step 4: Full suite

```
pnpm run build && pnpm run test:ci && pnpm run lint && pnpm run typecheck
```

All exit 0.

## Test plan

Step 3: 2 `parseCode` edge tests + 3 `parseFile` contract tests. The
directory-path test may behave differently per OS — if reading a directory
does not throw on your platform, replace it with a second non-existent-path
variant and note that in the commit message.

## Done criteria

- [ ] `parseFile` returns null on unreadable input (verified by tests)
- [ ] `pipeline.ts` pushes a `ParseError` when `parseFile` returns null
- [ ] `tests/swc-parser/parse-file.test.ts` exists, all tests pass
- [ ] `pnpm run typecheck`, `pnpm run build`, `pnpm run test:ci`, `pnpm run lint` all exit 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- `pipeline.ts` no longer contains the excerpted loop (drift) — report.
- The fixture `fixtures/patterns/01-direct-usage.tsx` does not exist — check
  `ls fixtures/patterns/` and report what you find.
- Any existing e2e test fails after Step 2 — the "Could not read file"
  message may have leaked into expected output; report rather than adapting
  e2e expectations.

## Maintenance notes

- The contract is now: null = unreadable file, throw = unparsable content.
  Both are surfaced through `printErrors`. Keep new callers consistent.
- Plan 019 (parallel parsing) rewrites this loop — it must preserve the
  null-vs-throw handling added here; its plan references this one.
