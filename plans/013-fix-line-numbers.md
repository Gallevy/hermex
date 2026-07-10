# Plan 013: Fix line numbers — SWC span.start is a 1-based UTF-8 byte offset, not a line number

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 19a4695..HEAD -- src/swc-parser/`
> If the swc-parser directory changed since this plan was written, compare
> the "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug / correctness
- **Planned at**: commit `19a4695`, 2026-07-04 (rewrites the 2026-06-27 version of this plan, which had drifted)

## Why this matters

Every pattern analyzer stores component "line numbers" as `node.span?.start || 0`.
In SWC, `span.start` is **not a line number** — it is a **1-based byte offset**
into the UTF-8 encoding of the source file. A component on line 10 of a typical
file gets a `line` value in the hundreds. Every `line` field in every
`JSXUsage`, `LazyImport`, `HOCUsage`, etc. that hermex reports is wrong today.

Three facts were verified against the installed `@swc/core@1.15.43` (do not
skip these — they shape the fix):

1. **Offsets are 1-based**: parsing `const x = 1;` yields `span.start === 1`
   for the first token, not 0.
2. **Offsets are UTF-8 bytes, not JS string indices**: for the source
   `'// hi 😀\nconst x = 1;'`, `code.indexOf('const')` is 9 (UTF-16 chars) but
   SWC reports `span.start === 12` (1-based byte offset — the emoji is 4 bytes).
   Line offsets must therefore be computed over `Buffer.from(source, 'utf8')`,
   not over the string.
3. **Spans reset per parse call** in this version (both `parseSync` and
   concurrent async `parse` calls start each module at offset 1). Older SWC
   versions accumulated spans globally across calls — the test plan below adds
   a two-file regression test so an SWC upgrade that reintroduces accumulation
   fails loudly instead of silently corrupting line numbers.

## Current state

**`src/swc-parser/index.ts:42-47`** — entry point:
```ts
export function parseCode(code: string, filePath = 'file.tsx'): UsageReport {
  const state = createState();
  const ast = parseSync(code, swcOptionsForFile(filePath));
  visitNode(ast, state);
  return generateReport(state);
}
```

**`src/swc-parser/types.ts:95-99`** — `ParserState` (note: no `filePath` field
exists; an older version of this plan claimed one did):
```ts
export interface ParserState {
  usagePatterns: UsagePatterns;
  componentNames: Set<string>;
  allIdentifiers: Set<string>;
}
```

**All 16 occurrences of the bug** (verified at the planned-at commit with
`grep -rn "span?.start" src/swc-parser/patterns/`):

| File | Lines |
|------|-------|
| `src/swc-parser/patterns/advanced.ts` | 10, 25, 35, 44 |
| `src/swc-parser/patterns/imports.ts` | 45, 62, 80, 89 |
| `src/swc-parser/patterns/jsx.ts` | 46 |
| `src/swc-parser/patterns/variables.ts` | 23, 58 |
| `src/swc-parser/patterns/conditionals.ts` | 22 |
| `src/swc-parser/patterns/lazy-dynamic.ts` | 18, 33 |
| `src/swc-parser/patterns/collections.ts` | 20, 43 |

Each looks like `line: node.span?.start || 0,` (variables.ts:58 uses
`pattern.span?.start || 0`). `props.ts` no longer stores line numbers — do not
modify it.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0              |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope**:
- `src/swc-parser/utils/line-map.ts` — create new
- `src/swc-parser/types.ts` — add `lineOffsets: number[]` to `ParserState`
- `src/swc-parser/core/state.ts` — initialize `lineOffsets: []`
- `src/swc-parser/index.ts` — populate `lineOffsets` in `parseCode` before `visitNode`
- The 7 pattern files listed in the table above
- `tests/swc-parser/utils/line-map.test.ts` — create new
- `tests/swc-parser/patterns/__snapshots__/jsx.test.tsx.snap` — regenerate only

**Out of scope** (do NOT touch):
- `src/swc-parser/patterns/props.ts` — stores no line numbers
- `src/swc-parser/core/visitor.ts`, `src/swc-parser/core/report.ts`
- Any file outside `src/swc-parser/` and `tests/swc-parser/`

## Git workflow

- Branch: `advisor/013-fix-line-numbers`
- Commit message: `fix: convert SWC byte-offset spans to real line numbers`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create src/swc-parser/utils/line-map.ts

```ts
/**
 * Byte offsets (0-based, UTF-8) at which each line begins. Index 0 = line 1.
 * SWC spans count UTF-8 bytes, so offsets must be computed over the encoded
 * source, not over JS string indices (which are UTF-16 code units).
 */
export function buildLineOffsets(source: string): number[] {
  const bytes = Buffer.from(source, 'utf8');
  const offsets = [0];
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0a) offsets.push(i + 1);
  }
  return offsets;
}

/**
 * Converts an SWC span start (1-based UTF-8 byte offset) to a 1-based line
 * number. Returns 0 for missing spans (spanStart <= 0).
 */
export function spanStartToLine(
  spanStart: number,
  lineOffsets: number[],
): number {
  if (spanStart <= 0 || lineOffsets.length === 0) return 0;
  const offset = spanStart - 1; // SWC offsets are 1-based
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

**Verify**: `pnpm run typecheck` → exit 0.

### Step 2: Add lineOffsets to ParserState and createState

In `src/swc-parser/types.ts`, extend the interface:

```ts
export interface ParserState {
  usagePatterns: UsagePatterns;
  componentNames: Set<string>;
  allIdentifiers: Set<string>;
  lineOffsets: number[];
}
```

In `src/swc-parser/core/state.ts`, add `lineOffsets: [],` to the object
returned by `createState()`.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 3: Populate lineOffsets in parseCode

In `src/swc-parser/index.ts`:

```ts
import { buildLineOffsets } from './utils/line-map';

export function parseCode(code: string, filePath = 'file.tsx'): UsageReport {
  const state = createState();
  state.lineOffsets = buildLineOffsets(code);
  const ast = parseSync(code, swcOptionsForFile(filePath));
  visitNode(ast, state);
  return generateReport(state);
}
```

**Verify**: `pnpm run typecheck` → exit 0.

### Step 4: Replace all 16 span usages in the 7 pattern files

In each file from the table in "Current state", add the import:

```ts
import { spanStartToLine } from '../utils/line-map';
```

and replace every `line: node.span?.start || 0,` (and the one
`line: pattern.span?.start || 0,` in variables.ts:58) with:

```ts
line: spanStartToLine(node.span?.start ?? 0, state.lineOffsets),
```

(using `pattern.span?.start ?? 0` at variables.ts:58). Every one of these
functions already receives `state` — if one does not, that is a STOP condition.

**Verify**: `grep -rn "span?.start" src/swc-parser/patterns/` → **no matches**.
Then `pnpm run typecheck` → exit 0.

### Step 5: Regenerate the snapshot

```
pnpm run test:ci
```

The snapshot test `tests/swc-parser/patterns/jsx.test.tsx` will fail because
line values changed from byte offsets to real lines. Regenerate:

```
pnpm run test:ci -- --update
```

Open `tests/swc-parser/patterns/__snapshots__/jsx.test.tsx.snap` and confirm
every `"line":` value is a small integer consistent with the fixture file's
actual line count (the fixture `fixtures/patterns/01-direct-usage.tsx` is under
100 lines), not in the hundreds/thousands.

### Step 6: Add unit + regression tests

Create `tests/swc-parser/utils/line-map.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  buildLineOffsets,
  spanStartToLine,
} from '../../../src/swc-parser/utils/line-map';
import { parseCode } from '../../../src/swc-parser';

describe('buildLineOffsets', () => {
  it('single line has only offset 0', () => {
    expect(buildLineOffsets('hello')).toEqual([0]);
  });
  it('two lines returns two offsets', () => {
    expect(buildLineOffsets('hello\nworld')).toEqual([0, 6]);
  });
  it('empty string returns [0]', () => {
    expect(buildLineOffsets('')).toEqual([0]);
  });
  it('counts bytes, not chars, for multibyte content', () => {
    // '😀' is 4 UTF-8 bytes; line 2 starts at byte 5, not char index 3
    expect(buildLineOffsets('😀\nx')).toEqual([0, 5]);
  });
});

describe('spanStartToLine', () => {
  const offsets = [0, 6, 12]; // three lines
  it('maps 1-based span 1 (byte 0) to line 1', () => {
    expect(spanStartToLine(1, offsets)).toBe(1);
  });
  it('maps span 7 (byte 6, first char of line 2) to line 2', () => {
    expect(spanStartToLine(7, offsets)).toBe(2);
  });
  it('maps span 16 to line 3', () => {
    expect(spanStartToLine(16, offsets)).toBe(3);
  });
  it('returns 0 for missing span', () => {
    expect(spanStartToLine(0, offsets)).toBe(0);
  });
});

describe('line numbers end to end', () => {
  const CODE = [
    `import { Button } from '@ui/button';`, // line 1
    ``, // line 2
    `export function App() {`, // line 3
    `  return <Button />;`, // line 4
    `}`, // line 5
  ].join('\n');

  it('reports the real line of a JSX usage', () => {
    const report = parseCode(CODE, 'test.tsx');
    const usage = report.patterns.usage.jsx.find(
      (u) => u.component === 'Button',
    );
    expect(usage?.line).toBe(4);
  });

  it('stays correct on the second file parsed in one process', () => {
    // Regression guard: some @swc/core versions accumulated span offsets
    // globally across parse calls. If an upgrade reintroduces that, the
    // second parse would report huge line numbers.
    parseCode(`const filler = 1;\n`.repeat(50), 'first.ts');
    const report = parseCode(CODE, 'second.tsx');
    const usage = report.patterns.usage.jsx.find(
      (u) => u.component === 'Button',
    );
    expect(usage?.line).toBe(4);
  });

  it('is not skewed by multibyte characters earlier in the file', () => {
    const report = parseCode(
      `// 😀😀😀\n` + CODE,
      'emoji.tsx',
    );
    const usage = report.patterns.usage.jsx.find(
      (u) => u.component === 'Button',
    );
    expect(usage?.line).toBe(5);
  });
});
```

**Verify**: `pnpm run test:ci` → all pass.

### Step 7: Full suite

```
pnpm run build && pnpm run test:ci && pnpm run lint && pnpm run typecheck
```

All exit 0.

## Test plan

Covered by Step 6: 4 `buildLineOffsets` unit tests, 4 `spanStartToLine` unit
tests, 3 end-to-end tests (real line, second-file regression, multibyte skew).
The regenerated snapshot from Step 5 is the characterization check for all
other pattern types.

## Done criteria

- [ ] `src/swc-parser/utils/line-map.ts` exists with `buildLineOffsets` and `spanStartToLine`
- [ ] `grep -rn "span?.start" src/swc-parser/patterns/` → no matches
- [ ] Snapshot line values are small integers (< 100 for the fixture)
- [ ] The three end-to-end tests in Step 6 pass, including the second-file regression test
- [ ] `pnpm run typecheck`, `pnpm run build`, `pnpm run test:ci`, `pnpm run lint` all exit 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- A pattern function using `span?.start` does not receive `state` — report it
  rather than threading new parameters ad hoc.
- The end-to-end test expects line 4 but gets a large number (hundreds): spans
  are accumulating across parses in your @swc/core version. STOP and report —
  the fix then requires a per-parse base offset, which is a design change.
- The multibyte test fails: `buildLineOffsets` is iterating the string instead
  of the UTF-8 buffer. Fix per Step 1 and re-run; if it still fails, STOP.
- Typecheck errors appear in files outside the in-scope list.

## Maintenance notes

- Future pattern files that store line numbers must use
  `spanStartToLine(node.span?.start ?? 0, state.lineOffsets)`.
- If a future plan converts file parsing to run concurrently (a prior plan
  for this, 019, was dropped by maintainer decision 2026-07-10 — not
  executed), the second-file regression test also guards the concurrent
  case — async `parse()` was verified to reset spans per call on 1.15.43,
  but keep the test.
- `line: 0` now consistently means "unknown position" (missing span).
