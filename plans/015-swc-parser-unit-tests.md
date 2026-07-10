# Plan 015: SWC parser unit tests — patterns and matcher utilities

> **Amended 2026-07-10 during execution**: the executor discovered that
> lazy/dynamic/HOC/memo/array detection is dead code (SWC AST wrapper bug,
> confirmed by the reviewer). The original Steps 4–5 (`advanced.test.ts`,
> `collections.test.ts`) moved to Plan 025, which fixes the bug and adds
> those tests as its regression suite. Step 6 was rewritten: the conditional
> analyzer only matches identifier ternaries, never JSX branches. This plan
> now covers 5 test files instead of 7.

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 19a4695..HEAD -- src/swc-parser/ tests/swc-parser/`
> If these paths changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (if Plan 013 landed first, `line` assertions can be exact; otherwise assert `> 0`)
- **Category**: tests
- **Planned at**: commit `19a4695`, 2026-07-04 (rewrites the 2026-06-27 version, which described a flat `UsageReport` shape that does not exist)

## Why this matters

The entire SWC parser has two tests: a single snapshot over one fixture
(`tests/swc-parser/patterns/jsx.test.tsx`) and a JS/JSX syntax-options test
(`tests/swc-parser/patterns/js-jsx.test.ts`). The snapshot captures everything
at once, so when it fails nobody can tell which of the 8 pattern modules broke.
Focused characterization tests through the public `parseCode()` API make
parser regressions localizable and make refactors (like Plans 013/019) safe.

## Current state

**Public API** — `src/swc-parser/index.ts`:
```ts
export function parseCode(code: string, filePath = 'file.tsx'): UsageReport
export function parseFile(filePath: string): UsageReport | null
```

**The real `UsageReport` shape** — `src/swc-parser/types.ts:110-142`. This is
NESTED. All assertions must use these paths:

```ts
export interface UsageReport {
  summary: {
    totalImports: number;
    totalComponents: number;
    totalUsagePatterns: number;
  };
  patterns: {
    imports: {
      default: ImportPattern[];    // { name, source, line? }
      named: ImportPattern[];
      namespace: ImportPattern[];
      aliased: AliasedImport[];    // { imported, local, source, line? }
    };
    usage: {
      jsx: JSXUsage[];             // { component, props, propsAnalysis, line?, context? }
      variables: Array<{ variable: string; assignment: string }>;
      destructuring: Array<{ property: string; source: string }>;
      conditional: ConditionalUsage[];  // { consequent, alternate, line? }
      arrays: ArrayMapping[];           // { components: string[], line? }
      objects: Array<{ mappings: ObjectMapping[] }>;  // mappings: { key, component }
    };
    advanced: {
      lazy: LazyImport[];          // { source, line? }
      dynamic: LazyImport[];
      hoc: HOCUsage[];             // { function, component, line? }
      memo: Array<{ component: string }>;
      forwardRef: Array<{ line?: number }>;
      portal: Array<{ line?: number }>;
    };
    props: Array<{ component: string; analysis: PropsAnalysis }>;
    // PropsAnalysis: { namedProps, hasSpread, hasComplexProps, hasEventHandlers, propDetails }
  };
  components: string[];
}
```

**Matcher utilities** — `src/swc-parser/utils/matchers.ts` exports:
`isKnownComponent(name, state)`, `isHOCPattern(name)` (prefixes: `with`,
`enhance`, `wrap`, `connect`, `create`), `isHOCFunction(callee)`,
`looksLikeComponent(name)` (`/^[A-Z]/`), `isFromLibrary(source, libraryName)`.

**Existing test conventions** — vitest, `import { describe, it, expect } from
'vitest';`, relative imports into `src/`. Model file layout after
`tests/swc-parser/patterns/js-jsx.test.ts`.

**Detection precondition**: pattern detection only fires for *known*
components — names registered by import analysis. Every JSX/usage test needs
an import preamble such as `import { Button, Card } from '@ui/components';`.

## Commands you will need

| Purpose       | Command                                | Expected on success |
|---------------|----------------------------------------|---------------------|
| Run tests     | `pnpm run test:ci`                     | all pass            |
| Verbose tests | `pnpm run test:ci -- --reporter=verbose` | new files listed  |
| Typecheck     | `pnpm run typecheck`                   | exit 0              |
| Lint          | `pnpm run lint`                        | exit 0              |

## Scope

**In scope** (create only; all under `tests/swc-parser/`):
- `tests/swc-parser/patterns/imports.test.ts`
- `tests/swc-parser/patterns/jsx-unit.test.ts`
- `tests/swc-parser/patterns/conditionals.test.ts`
- `tests/swc-parser/patterns/variables.test.ts` (assignments, destructuring)
- `tests/swc-parser/utils/matchers.test.ts`

**Out of scope** (do NOT touch):
- `tests/swc-parser/patterns/advanced.test.ts` and
  `tests/swc-parser/patterns/collections.test.ts` — moved to Plan 025 (they
  test behavior that only exists after 025's source fix)
- `tests/swc-parser/patterns/jsx.test.tsx` and its snapshot
- `tests/swc-parser/patterns/js-jsx.test.ts`
- Any `src/` file — these are characterization tests; if a test fails, fix the
  test's expectation to match actual behavior, never the source

## Git workflow

- Branch: `advisor/015-swc-parser-unit-tests`
- Commit message: `test: add swc-parser import, jsx, conditional, variable and matcher unit tests`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Read the source before asserting

Read `src/swc-parser/types.ts` and `src/swc-parser/patterns/imports.ts` in
full. Confirm the `UsageReport` shape above and how aliased imports are stored
(which of `imported`/`local` holds the alias). Use exact field names.

### Step 2: imports.test.ts

Test through `parseCode`, asserting on `report.patterns.imports.*`:

- named import → `patterns.imports.named` has one entry with
  `source: '@ui/button'` and `name: 'Button'`
- default import → `patterns.imports.default` has one entry
- namespace import (`import * as UI from ...`) → `patterns.imports.namespace`
- aliased import (`import { Button as Btn }`) → `patterns.imports.aliased`
  entry with `imported: 'Button'`, `local: 'Btn'` (verify against source, per
  Step 1)
- no imports → all four arrays empty and `summary.totalImports === 0`
- `summary.totalImports` counts default + named + namespace (aliased are
  tracked separately — see `src/swc-parser/core/report.ts:9-12`)

**Verify**: `pnpm run test:ci -- --reporter=verbose` → imports tests pass.

### Step 3: jsx-unit.test.ts

Preamble `import { Button, Card } from '@ui/components';\n`. Assert on
`report.patterns.usage.jsx`:

- `<Button />` → entry with `component: 'Button'`
- `<div><span /></div>` → no entries for `div`/`span`
- `<Button variant="primary" disabled />` → entry `props` contains
  `'variant'` and `'disabled'`
- `line` is `> 0` (or the exact line if Plan 013 landed — check
  `plans/README.md` status)
- namespace member usage: `import * as UI ...; <UI.Button />` → an entry whose
  `component` contains `'.'` (verify actual stored format against behavior;
  adjust the assertion, not the source)

### Steps 4–5: MOVED to Plan 025

`advanced.test.ts` and `collections.test.ts` are now Plan 025's regression
suite — the behaviors they assert (lazy/dynamic/HOC/memo/array detection)
only exist after 025's source fix. Do not create them here.

### Step 6: conditionals.test.ts

The analyzer (`src/swc-parser/patterns/conditionals.ts`) only matches when
`consequent`/`alternate` are plain `Identifier` nodes; JSX branches never
match (by design for now — recorded in `plans/README.md`):

- `const Display = show ? Button : Card;` (both imported) → one
  `patterns.usage.conditional` entry with `consequent: 'Button'`,
  `alternate: 'Card'`
- `function App() { return show ? <Button /> : null; }` (Button imported) →
  `patterns.usage.conditional` is EMPTY, and `patterns.usage.jsx` still
  contains a `Button` entry (JSX-branch ternaries are tracked via jsx usage,
  not the conditional pattern — add a one-line comment saying so)

### Step 7: variables.test.ts

- `const Btn = Button;` (Button imported) → `patterns.usage.variables` entry
  with `variable: 'Btn'` and `assignment` containing `'Button'`
- `const x = 42;` → `patterns.usage.variables` empty
- `import * as UI ...; const { Button } = UI;` →
  `patterns.usage.destructuring` entry with `property: 'Button'`

### Step 8: matchers.test.ts

Import from `../../../src/swc-parser/utils/matchers`:

- `isHOCPattern`: true for `'withAuth'`, `'connectToStore'`, `'createForm'`;
  false for `'renderButton'`, `'Button'`
- `looksLikeComponent`: true for `'Button'`, `'MyComponent'`; false for
  `'button'`, `'myComponent'`
- `isFromLibrary`: true for `('@ui/button', '@ui')` and
  `('react-dom/client', 'react-dom')`; false for `('@other/button', '@ui')`
- `isHOCFunction`: true for `{ type: 'Identifier', value: 'withAuth' }`; false
  for `null` and `{ type: 'Identifier', value: 'render' }`

### Step 9: Full suite

```
pnpm run test:ci && pnpm run typecheck && pnpm run lint
```

All exit 0. Confirm the existing snapshot test still passes untouched.

## Test plan

The tests above ARE the plan (~30 tests across 7 files). They are
characterization tests: they pin current behavior, they do not specify new
behavior.

## Test plan note

~22 tests across 5 files (was ~30 across 7 before the Plan 025 split).

## Done criteria

- [ ] All 5 in-scope test files exist under `tests/swc-parser/`
- [ ] `pnpm run test:ci` exits 0, new tests listed and passing, none skipped
- [ ] `pnpm run typecheck` and `pnpm run lint` exit 0
- [ ] No `src/` files modified (`git status`)
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- An assertion fails because the report shape differs from the "Current state"
  excerpt — the codebase drifted; report the difference.
- `parseCode` throws on a test input: the TS/TSX string is invalid syntax —
  fix the test input, not the source. If valid input still throws, STOP and
  report (that is a parser bug worth its own finding).
- You feel the urge to modify a pattern file to make a test pass. Don't. STOP
  and report the behavior instead.

## Maintenance notes

- These tests use only the public `parseCode()` API, so internal refactors
  that preserve behavior won't break them.
- When a new pattern type is added to the parser, add a matching focused test
  file here following the same recipe: small code string → `parseCode` →
  assert one `patterns.*` path.
