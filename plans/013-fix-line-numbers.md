# Plan 013: Fix line numbers — span.start is a byte offset, not a line number

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 36699c4..HEAD -- src/swc-parser/`
> If the swc-parser directory changed since this plan was written, compare
> "Current state" excerpts before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug / correctness
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

Every pattern analyzer stores component line numbers using `node.span?.start || 0`.
In SWC, `span.start` is a **byte offset from the start of the source file**, not a
line number. A component on line 10 of a typical file has a span.start in the
hundreds (byte position), not `10`. This means every `line` field in every
`JSXUsage`, `LazyComponentUsage`, `PropsAnalysis`, etc. is completely wrong.

Affected fields include:
- `JSXUsage.line` — `src/swc-parser/patterns/jsx.ts:46`
- `ArrayMappingEntry.line` — `src/swc-parser/patterns/collections.ts:20`
- `ObjectMappingEntry.line` — `src/swc-parser/patterns/collections.ts:44`
- `VariableAssignment.line` — `src/swc-parser/patterns/variables.ts:23`
- `DestructuredUsage.line` — `src/swc-parser/patterns/variables.ts:59`
- `LazyComponentUsage.line` — `src/swc-parser/patterns/lazy-dynamic.ts:17`
- `DynamicImportUsage.line` — `src/swc-parser/patterns/lazy-dynamic.ts:34`
- `HOCUsage.line` — `src/swc-parser/patterns/advanced.ts:26`
- `MemoUsage.line` — `src/swc-parser/patterns/advanced.ts:37`
- `ForwardRefUsage.line` — `src/swc-parser/patterns/advanced.ts:47`
- `PortalUsage.line` — `src/swc-parser/patterns/advanced.ts:65`
- `ConditionalComponent.line` — `src/swc-parser/patterns/conditionals.ts:22`
- `PropsAnalysis.line` — `src/swc-parser/patterns/props.ts:20`

## Current state

**`src/swc-parser/index.ts`** — entry point that creates state, visits AST, returns report:
```ts
export function parseCode(code: string, filePath = 'file.tsx'): UsageReport {
  const state = createState();
  const ast = parseSync(code, swcOptionsForFile(filePath));
  visitNode(ast, state);
  return generateReport(state);
}
```

**`src/swc-parser/types.ts`** — `ParserState` includes:
```ts
export interface ParserState {
  filePath: string;
  componentNames: Set<string>;
  allIdentifiers: Set<string>;
  usagePatterns: UsagePatterns;
}
```

**Usage in a pattern file** (jsx.ts:46):
```ts
line: node.span?.start || 0,
```

## The fix

**Step A** — Create `src/swc-parser/utils/line-map.ts` with two pure functions:

```ts
/** Build an array of byte offsets where each line begins. Index 0 = line 1. */
export function buildLineOffsets(source: string): number[] {
  const offsets = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') offsets.push(i + 1);
  }
  return offsets;
}

/** Convert a byte offset to a 1-based line number using binary search. */
export function byteOffsetToLine(offset: number, lineOffsets: number[]): number {
  let lo = 0;
  let hi = lineOffsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineOffsets[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1; // 1-based
}
```

**Step B** — Add `lineOffsets` to `ParserState` so pattern functions can access it
without needing extra parameters.

**Step C** — Populate `lineOffsets` in `parseCode()` before visiting.

**Step D** — Update every pattern function that uses `node.span?.start` to call
`byteOffsetToLine(node.span?.start ?? 0, state.lineOffsets)`.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0, no errors   |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope**:
- `src/swc-parser/utils/line-map.ts` — create new
- `src/swc-parser/types.ts` — add `lineOffsets: number[]` to `ParserState`
- `src/swc-parser/core/state.ts` — initialize `lineOffsets: []`
- `src/swc-parser/index.ts` — populate `lineOffsets` before `visitNode`
- `src/swc-parser/patterns/jsx.ts` — update line extraction
- `src/swc-parser/patterns/collections.ts` — update line extraction
- `src/swc-parser/patterns/variables.ts` — update line extraction
- `src/swc-parser/patterns/lazy-dynamic.ts` — update line extraction
- `src/swc-parser/patterns/advanced.ts` — update line extraction
- `src/swc-parser/patterns/conditionals.ts` — update line extraction
- `src/swc-parser/patterns/props.ts` — update line extraction

**Out of scope** (do NOT touch):
- `src/swc-parser/core/visitor.ts` — visitor does not store line numbers
- `src/swc-parser/core/report.ts` — reads state fields, not raw spans
- `src/swc-parser/patterns/imports.ts` — imports do not store line numbers; confirm this before skipping
- Any test or fixture file

## Git workflow

- Branch: `advisor/013-fix-line-numbers`
- Commit message: `fix: convert SWC byte offsets to real line numbers`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create src/swc-parser/utils/line-map.ts

Create a new file with exactly this content:

```ts
export function buildLineOffsets(source: string): number[] {
  const offsets = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') offsets.push(i + 1);
  }
  return offsets;
}

export function byteOffsetToLine(offset: number, lineOffsets: number[]): number {
  let lo = 0;
  let hi = lineOffsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineOffsets[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}
```

**Verify**: `pnpm run typecheck` — may pass or fail depending on whether types.ts
references `lineOffsets` yet. Either way, proceed.

### Step 2: Add lineOffsets to ParserState

In `src/swc-parser/types.ts`, add `lineOffsets: number[]` to the `ParserState`
interface. Find the existing interface and add the field:

```ts
export interface ParserState {
  filePath: string;
  componentNames: Set<string>;
  allIdentifiers: Set<string>;
  usagePatterns: UsagePatterns;
  lineOffsets: number[];   // ← add this
}
```

**Verify**: `pnpm run typecheck` — fails on `state.ts` (expected — `createState()` must be updated). Proceed.

### Step 3: Initialize lineOffsets in createState()

In `src/swc-parser/core/state.ts`, add `lineOffsets: []` to the object returned
by `createState()`:

```ts
export function createState(): ParserState {
  return {
    filePath: '',
    componentNames: new Set(),
    allIdentifiers: new Set(),
    lineOffsets: [],      // ← add this
    usagePatterns: {
      // ... existing fields unchanged
    },
  };
}
```

**Verify**: `pnpm run typecheck` → should now exit 0 (both interface and
implementation match). Fix any remaining type errors before proceeding.

### Step 4: Populate lineOffsets in parseCode()

In `src/swc-parser/index.ts`, populate `lineOffsets` after creating state and
before visiting the AST:

```ts
import { buildLineOffsets } from './utils/line-map';

export function parseCode(code: string, filePath = 'file.tsx'): UsageReport {
  const state = createState();
  state.lineOffsets = buildLineOffsets(code);   // ← add this line
  const ast = parseSync(code, swcOptionsForFile(filePath));
  visitNode(ast, state);
  return generateReport(state);
}
```

`parseFile` does not need changes — it calls `parseCode` which now handles this.

**Verify**: `pnpm run typecheck` → exits 0.

### Step 5: Update all pattern files to use byteOffsetToLine

In each of the following files, add this import at the top:
```ts
import { byteOffsetToLine } from '../utils/line-map';
```

Then replace every occurrence of `node.span?.start || 0` and `node.span?.start ?? 0`
with `byteOffsetToLine(node.span?.start ?? 0, state.lineOffsets)`.

**Files to update and their occurrences** (at the planned-at commit):

**`src/swc-parser/patterns/jsx.ts`** (1 occurrence — line 46):
```ts
// Before:
line: node.span?.start || 0,

// After:
line: byteOffsetToLine(node.span?.start ?? 0, state.lineOffsets),
```

**`src/swc-parser/patterns/collections.ts`** (2 occurrences — lines 20, 44):
```ts
// Both occurrences:
line: node.span?.start || 0,
// Replace with:
line: byteOffsetToLine(node.span?.start ?? 0, state.lineOffsets),
```

**`src/swc-parser/patterns/variables.ts`** (2 occurrences — lines 23, 59):
```ts
line: node.span?.start || 0,
// Replace with:
line: byteOffsetToLine(node.span?.start ?? 0, state.lineOffsets),
```

**`src/swc-parser/patterns/lazy-dynamic.ts`** (2 occurrences — lines 17, 34):
Same replacement.

**`src/swc-parser/patterns/advanced.ts`** (4 occurrences — lines 26, 37, 47, 65):
Same replacement.

**`src/swc-parser/patterns/conditionals.ts`** (1 occurrence — line 22):
Same replacement.

**`src/swc-parser/patterns/props.ts`** (1 occurrence — line 20):
Same replacement.

After updating all files, run:
```
grep -rn "span?.start" src/swc-parser/patterns/
```
→ should return no matches (all occurrences replaced).

**Verify**: `pnpm run typecheck` → exits 0.

### Step 6: Check imports.ts

Read `src/swc-parser/patterns/imports.ts` and confirm it does not store any
`span.start` as a line number. If it does, apply the same fix. If not, no change
needed.

### Step 7: Run the full suite

```
pnpm run build && pnpm run test:ci && pnpm run lint
```

All must exit 0.

**Note**: The snapshot test in `tests/swc-parser/patterns/jsx.test.tsx` will likely
FAIL because line numbers in the snapshot are now real line numbers (small integers)
instead of large byte offsets. Update the snapshot:
```
pnpm run test -- --update-snapshots
```
Then confirm the updated snapshot has small integers (1–100 range for a small
fixture file) instead of large offsets (100s–1000s).

## Test plan

The existing snapshot test at `tests/swc-parser/patterns/jsx.test.tsx` exercises
the `line` field. After running `--update-snapshots`, the snapshot values should
change to small integers. If they remain large integers, the fix did not work.

**Add one explicit unit test** to verify the utility functions, either in a new file
`tests/swc-parser/utils/line-map.test.ts` or inline in this step:

```ts
import { buildLineOffsets, byteOffsetToLine } from '../../../src/swc-parser/utils/line-map';
import { describe, it, expect } from 'vitest';

describe('buildLineOffsets', () => {
  it('single line has only offset 0', () => {
    expect(buildLineOffsets('hello')).toEqual([0]);
  });

  it('two lines returns two offsets', () => {
    expect(buildLineOffsets('hello\nworld')).toEqual([0, 6]);
  });
});

describe('byteOffsetToLine', () => {
  const offsets = [0, 6, 12]; // lines at: 0–5, 6–11, 12+

  it('byte 0 is line 1', () => {
    expect(byteOffsetToLine(0, offsets)).toBe(1);
  });

  it('byte 5 is still line 1', () => {
    expect(byteOffsetToLine(5, offsets)).toBe(1);
  });

  it('byte 6 is line 2', () => {
    expect(byteOffsetToLine(6, offsets)).toBe(2);
  });

  it('byte 15 is line 3', () => {
    expect(byteOffsetToLine(15, offsets)).toBe(3);
  });
});
```

## Done criteria

- [ ] `src/swc-parser/utils/line-map.ts` exists with `buildLineOffsets` and `byteOffsetToLine`
- [ ] `ParserState` has `lineOffsets: number[]`
- [ ] `parseCode()` calls `buildLineOffsets(code)` and sets `state.lineOffsets`
- [ ] `grep -rn "span?.start" src/swc-parser/patterns/` → no matches
- [ ] Snapshot test updated; line numbers are in the 1–200 range (not hundreds/thousands)
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm run test:ci` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- `pnpm run typecheck` after Step 5 reports errors in files OTHER than the 8 pattern files listed. Something else references `span.start` — read the error, fix it, and continue.
- The snapshot test shows line numbers still in the 100s–1000s range after `--update-snapshots`. This means `byteOffsetToLine` is not being called, or `state.lineOffsets` is empty. Check that Step 4 actually sets `state.lineOffsets` before `visitNode`.
- `buildLineOffsets` with empty string doesn't return `[0]` — this would break zero-byte files. If empty string produces `[]`, fix by initializing `const offsets = [0]` unconditionally.
- Any test OTHER than the snapshot test fails after the change. The fix is purely additive to existing data; this should not happen.

## Maintenance notes

- `lineOffsets` is computed per file in `parseCode()`. It is never written by the visitor — it is read-only during traversal.
- Future pattern files that store line numbers must use `byteOffsetToLine(node.span?.start ?? 0, state.lineOffsets)` — the utility is in `src/swc-parser/utils/line-map.ts`.
- The `byteOffsetToLine` binary search is O(log n) per call where n is the number of lines. For a 5000-line file this is ~13 operations per lookup — negligible.
- SWC also provides `column` information via `span.start` (same byte offset). Converting to column requires: `offset - lineOffsets[lineIndex - 1]`. Not in scope here, but the same line-map utility can support it.
