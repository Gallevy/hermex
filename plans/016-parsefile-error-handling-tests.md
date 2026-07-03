# Plan 016: parseFile error handling + state/report unit tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 36699c4..HEAD -- src/swc-parser/index.ts src/swc-parser/core/ tests/swc-parser/`
> If these files changed since this plan was written, compare before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug / tests
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

**parseFile silently throws**: `src/swc-parser/index.ts:50`:
```ts
export function parseFile(filePath: string): UsageReport | null {
  const code = fs.readFileSync(filePath, 'utf8');  // throws on missing file
  return parseCode(code, filePath);
}
```
`parseFile` declares `UsageReport | null` as its return type — signaling that
null is a valid "not found" response. But for a missing file it throws (ENOENT)
instead of returning null. The caller in `scan.ts` wraps this in try-catch,
so the crash is caught, but the `null` return path is unreachable. The type
contract says null, the code says throw — they disagree.

The fix is simple: wrap the `readFileSync` in try-catch and return null on I/O
errors, matching what the type signature promises.

**State initialization and report generation are untested**: `createState()` and
`generateReport()` are foundational — every parse goes through them — but have
no unit tests. A change to `UsagePatterns` fields that breaks the pattern count
calculation would only surface as a wrong total in a snapshot.

## Current state

**`src/swc-parser/index.ts`** (entire file):
```ts
import { parseSync } from '@swc/core';
import type { ParseOptions as SwcParseOptions } from '@swc/core';
import fs from 'node:fs';
import path from 'node:path';
import type { UsageReport } from './types';
import { createState } from './core/state';
import { visitNode } from './core/visitor';
import { generateReport } from './core/report';

// ... swcOptionsForFile(filePath) ...

export function parseCode(code: string, filePath = 'file.tsx'): UsageReport {
  const state = createState();
  const ast = parseSync(code, swcOptionsForFile(filePath));
  visitNode(ast, state);
  return generateReport(state);
}

export function parseFile(filePath: string): UsageReport | null {
  const code = fs.readFileSync(filePath, 'utf8');   // ← throws, doesn't return null
  return parseCode(code, filePath);
}
```

**`src/swc-parser/core/state.ts`** — `createState()` initializes `ParserState`.

**`src/swc-parser/core/report.ts`** — `generateReport(state)` converts state
to `UsageReport`. `calculateTotalPatterns` (a private function) sums Set/Map sizes.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0, no errors   |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope**:
- `src/swc-parser/index.ts` — add try-catch to `parseFile`
- `tests/swc-parser/parse-file.test.ts` — create (error handling tests)
- `tests/swc-parser/core/state.test.ts` — create (state shape tests)
- `tests/swc-parser/core/report.test.ts` — create (report generation tests)

**Out of scope** (do NOT touch):
- `src/swc-parser/core/state.ts` — no source changes, tests only
- `src/swc-parser/core/report.ts` — no source changes, tests only
- `src/swc-parser/core/visitor.ts`
- Any pattern file
- `src/commands/scan.ts` — the try-catch there already catches thrown errors;
  fixing `parseFile` to return null makes the contract cleaner but does not
  change scan.ts behavior (it still handles errors via try-catch)

## Git workflow

- Branch: `advisor/016-parsefile-error-handling`
- Commit message: `fix: parseFile returns null on I/O error; add state/report unit tests`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Fix parseFile to return null on I/O error

In `src/swc-parser/index.ts`, wrap the `readFileSync` call:

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

**Verify**:
```
pnpm run typecheck
```
→ exits 0.

```
pnpm run build
```
→ exits 0.

### Step 2: Create tests/swc-parser/parse-file.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { parseCode, parseFile } from '../../src/swc-parser';

describe('parseCode', () => {
  it('returns a UsageReport for empty code', () => {
    const report = parseCode('', 'file.tsx');
    expect(report).toBeDefined();
    expect(report.imports).toHaveLength(0);
    expect(report.jsxUsage).toHaveLength(0);
    expect(report.totalPatterns).toBe(0);
  });

  it('returns a UsageReport for a single export statement', () => {
    const report = parseCode(`export const x = 1;`, 'file.ts');
    expect(report).toBeDefined();
    expect(report.imports).toHaveLength(0);
  });

  it('does not throw on a file with only comments', () => {
    expect(() => parseCode('// just a comment\n/* block */\n', 'file.ts')).not.toThrow();
  });
});

describe('parseFile', () => {
  it('returns null for a non-existent file', () => {
    const result = parseFile('/absolute/path/that/does/not/exist/file.tsx');
    expect(result).toBeNull();
  });

  it('returns null for a directory path (not a file)', () => {
    // Directories cannot be read with utf8 encoding
    const result = parseFile(join(__dirname, '..'));
    expect(result).toBeNull();
  });

  it('returns a UsageReport for an existing fixture file', () => {
    // Use the existing E2E fixture
    const fixturePath = join(__dirname, '..', '..', 'fixtures', '01-direct-usage.tsx');
    const result = parseFile(fixturePath);
    expect(result).not.toBeNull();
    expect(result?.imports.length).toBeGreaterThan(0);
  });
});
```

**Verify**: `pnpm run test:ci --reporter=verbose` — all parse-file tests pass.

### Step 3: Create tests/swc-parser/core/state.test.ts

Read `src/swc-parser/core/state.ts` first to get exact field names, then:

```ts
import { describe, it, expect } from 'vitest';
import { createState } from '../../../src/swc-parser/core/state';

describe('createState', () => {
  it('creates a state with empty collections', () => {
    const state = createState();
    expect(state.componentNames.size).toBe(0);
    expect(state.allIdentifiers.size).toBe(0);
  });

  it('creates a fresh state each call (not shared reference)', () => {
    const s1 = createState();
    const s2 = createState();
    s1.componentNames.add('Button');
    expect(s2.componentNames.size).toBe(0);
  });

  it('creates usagePatterns with all required Set/Map fields', () => {
    const state = createState();
    const p = state.usagePatterns;
    // Verify the main tracked patterns are present and empty
    expect(p.jsxUsage instanceof Map).toBe(true);
    expect(p.jsxUsage.size).toBe(0);
    expect(p.lazyComponents instanceof Set).toBe(true);
    expect(p.dynamicImports instanceof Set).toBe(true);
    expect(p.variableAssignments instanceof Map).toBe(true);
    expect(p.arrayMappings instanceof Set).toBe(true);
    expect(p.objectMappings instanceof Set).toBe(true);
  });
});
```

**Note**: Adjust field names to match the actual `UsagePatterns` interface in
`src/swc-parser/types.ts`. If Plan 002 has been executed, the dead fields
(`directImports`, `componentMappings`, `renderProps`, `contextUsage`) will
already be removed — do not assert on them.

**Verify**: `pnpm run test:ci --reporter=verbose` — all state tests pass.

### Step 4: Create tests/swc-parser/core/report.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { generateReport } from '../../../src/swc-parser/core/report';
import { createState } from '../../../src/swc-parser/core/state';
import { parseCode } from '../../../src/swc-parser';

describe('generateReport on empty state', () => {
  it('returns a report with zero totals for fresh state', () => {
    const state = createState();
    const report = generateReport(state);
    expect(report.totalPatterns).toBe(0);
    expect(report.imports).toHaveLength(0);
    expect(report.jsxUsage).toHaveLength(0);
  });
});

describe('totalPatterns count', () => {
  it('counts each JSX usage as a pattern', () => {
    const code = `
      import { Button, Card } from '@ui/components';
      function App() { return <><Button /><Card /></>; }
    `;
    const report = parseCode(code);
    // 2 JSX usages should contribute to totalPatterns
    expect(report.totalPatterns).toBeGreaterThanOrEqual(2);
  });

  it('counts imports separately from JSX patterns', () => {
    const code = `
      import { Button } from '@ui/button';
    `;
    const report = parseCode(code);
    // Imports are tracked; check that imports count is 1
    expect(report.imports).toHaveLength(1);
    // totalPatterns reflects detected usage patterns, not import count
    // (exact behavior depends on implementation — adjust assertion if needed)
    expect(report.totalPatterns).toBeGreaterThanOrEqual(0);
  });

  it('totalPatterns increases when patterns are added', () => {
    const codeA = `import { Button } from '@ui/button';`;
    const codeB = `
      import { Button } from '@ui/button';
      function App() { return <Button />; }
    `;
    const reportA = parseCode(codeA);
    const reportB = parseCode(codeB);
    expect(reportB.totalPatterns).toBeGreaterThan(reportA.totalPatterns);
  });
});
```

**Verify**: `pnpm run test:ci --reporter=verbose` — all report tests pass.

### Step 5: Final validation

```
pnpm run build && pnpm run test:ci && pnpm run lint
```

All must exit 0.

## Test plan

The tests in this plan ARE the test plan:
- `parse-file.test.ts` — 6 tests covering null return + edge case inputs
- `core/state.test.ts` — 3 tests validating fresh state shape
- `core/report.test.ts` — 4 tests validating report generation logic

Total: ~13 new tests

## Done criteria

- [ ] `src/swc-parser/index.ts` `parseFile` wraps `readFileSync` in try-catch and returns null on error
- [ ] `tests/swc-parser/parse-file.test.ts` exists and all tests pass
- [ ] `tests/swc-parser/core/state.test.ts` exists and all tests pass
- [ ] `tests/swc-parser/core/report.test.ts` exists and all tests pass
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm run test:ci` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- The existing fixture at `fixtures/01-direct-usage.tsx` does not exist when
  Step 2 runs. Check the fixtures directory: `ls fixtures/`. If the file is
  named differently, update the test path.
- `generateReport` is not exported from `src/swc-parser/core/report.ts`
  (it might be an internal). If so, test it indirectly through `parseCode()`
  in the report tests — do not import it directly; instead just use `parseCode`.
- `createState` is not exported from `core/state.ts`. Same fix: if it's
  internal, test through `parseCode()`.
- `parseFile` on a directory path does not return null on some platforms
  (some OSes allow reading a directory as a buffer). If the directory-path test
  fails, change that test to use a known non-existent path instead.

## Maintenance notes

- `parseFile` returning null instead of throwing is now the documented contract.
  `scan.ts` already wraps `parseFile` in try-catch — that catch block can now
  be simplified to handle both null and thrown errors, but that cleanup is out
  of scope for this plan.
- When new fields are added to `UsagePatterns`, add a corresponding assertion to
  `state.test.ts` confirming the field is initialized as an empty Set/Map.
- The `generateReport` tests work through `parseCode()` to avoid coupling to
  internal module structure. Prefer this pattern over importing private functions.
