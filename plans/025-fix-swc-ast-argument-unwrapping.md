# Plan 025: Fix dead pattern detection — unwrap SWC argument/element wrappers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 19a4695..HEAD -- src/swc-parser/patterns/ src/swc-parser/core/`
> If these paths changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition. (Changes under `tests/swc-parser/` are
> expected — Plan 015 adds files there — and are NOT drift for this plan.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (mechanical unwrap; one deliberate behavior expansion, see
  "Behavior notes")
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `19a4695`, 2026-07-10 (found during execution of
  Plan 015; independently verified by the reviewer against the live AST)

## Why this matters

Five of the parser's advertised pattern detections are dead code — they can
never fire on any input:

- `advanced.lazy` (React.lazy imports)
- `advanced.dynamic` (dynamic `import()` calls)
- `advanced.hoc` (higher-order component wrapping)
- `advanced.memo` (`React.memo` usage)
- `usage.arrays` (arrays of components)

Root cause: in the `@swc/core` AST, `CallExpression.arguments[i]` and
`ArrayExpression.elements[i]` are **wrapper objects**
`{ spread: null, expression: <the actual node> }` — the real node sits under
`.expression`. The analyzers read `.type` / `.value` directly off the wrapper,
so every check is permanently false. Verified empirically at `19a4695`:

```
$ node -e "const {parseSync}=require('@swc/core'); const ast=parseSync('withAuth(Button); const a=[X,Y];'); console.log(JSON.stringify(ast.body[0].expression.arguments[0]))"
{"spread":null,"expression":{"type":"Identifier","span":{...},"ctxt":1,"value":"Button","optional":false}}
```

The dispatch gates in `src/swc-parser/core/visitor.ts:119-152` are correct
(callees are NOT wrapped — only arguments/elements are); the bug is entirely
inside the five analyzer functions below.

## Current state (all excerpts verified at `19a4695`)

**Broken site 1+2** — `src/swc-parser/patterns/lazy-dynamic.ts` (whole file):

```ts
export function analyzeLazyImport(node: any, state: ParserState): void {
  const arg = node.arguments?.[0];                    // ← wrapper, has no .type
  if (
    arg?.type === 'ArrowFunctionExpression' &&        // ← always false
    arg.body?.type === 'CallExpression'
  ) {
    const importCall = arg.body;
    if (importCall.callee?.type === 'Import') {
      const source = importCall.arguments?.[0]?.value; // ← wrapper, no .value
      ...
```

```ts
export function analyzeDynamicImport(node: any, state: ParserState): void {
  const source = node.arguments?.[0]?.value;          // ← wrapper, always undefined
  ...
```

**Broken sites 3+4+5** — `src/swc-parser/patterns/advanced.ts`:

```ts
export function analyzeHOCUsage(node: any, state: ParserState): void {
  state.usagePatterns.hocUsage.add({
    function: node.callee?.value || '[unknown]',
    component: node.arguments?.[0]?.value || '[unknown]', // ← wrapper (site 3)
    ...
```

```ts
export function analyzeMemoUsage(node: any, state: ParserState): void {
  const component = node.arguments?.[0];              // ← wrapper (site 4)
  if (
    component?.type === 'Identifier' &&               // ← always false
    state.componentNames.has(component.value)
  ) {
    ...
```

```ts
export function isHOCPattern(node: any, state: ParserState): boolean {
  return (
    node.callee?.type === 'Identifier' &&
    node.arguments?.some(
      (arg: any) =>
        arg.type === 'Identifier' && state.componentNames.has(arg.value),
        // ↑ wrapper (site 5) — always false, so analyzeHOCUsage is never called
    )
  );
}
```

**Broken site 6** — `src/swc-parser/patterns/collections.ts`,
`analyzeArrayExpression`:

```ts
  const hasComponents = node.elements?.some((elem: any) => {
    if (elem?.type === 'Identifier') {                // ← wrapper, always false
      return state.componentNames.has(elem.value);
    }
    return false;
  });

  if (hasComponents) {
    state.usagePatterns.arrayMappings.add({
      components: node.elements
        ?.map((elem: any) => elem?.value)             // ← wrapper, always undefined
        .filter(Boolean),
      ...
```

**NOT broken (do not touch)**: `analyzeObjectExpression` in the same
`collections.ts` file works — `ObjectExpression.properties` entries are
`KeyValueProperty` nodes, not wrappers. `analyzeForwardRefUsage` and
`analyzePortalUsage` in `advanced.ts` work — they don't inspect arguments.
`analyzeConditionalExpression` in `conditionals.ts` inspects
`consequent`/`alternate`, which are plain expressions (not wrapped) — its
identifier-only limitation is by design for now (recorded in
`plans/README.md`, unplanned findings).

**The report shape you assert against** — `UsageReport` from
`src/swc-parser/types.ts` via the public API
(`import { parseCode } from '../../../src/swc-parser'`). Relevant paths:
`report.patterns.advanced.{lazy,dynamic,hoc,memo,forwardRef}` and
`report.patterns.usage.{arrays,objects}`. Entry shapes:
`lazy`/`dynamic`: `{ source, line? }`; `hoc`: `{ function, component, line? }`;
`memo`: `{ component }`; `arrays`: `{ components: string[], line? }`;
`objects`: `{ mappings: { key, component }[] }`.

**Test conventions**: vitest, `import { describe, test, expect } from
'vitest';`, relative imports into `src/`. Model after
`tests/swc-parser/patterns/imports.test.ts` if it exists on your branch
(Plan 015), otherwise `tests/swc-parser/patterns/js-jsx.test.ts`.

**Detection precondition**: usage detection only fires for *known* components
(registered by import analysis). Usage tests need an import preamble such as
`import { Button, Card } from '@ui/components';`.

## Behavior notes (read before writing tests)

1. **`line` fields are SWC byte offsets, not line numbers** (Plan 013, not
   yet landed). Assert `line` is `> 0` at most; never assert exact values.
2. **HOC heuristic is broad by design**: once `isHOCPattern` is fixed, ANY
   call `someFunc(KnownComponent)` with an identifier callee registers as
   HOC — including bare `memo(Button)`. That is the analyzer's original
   intent (a heuristic), not a regression. Use `withAuth(Button)` in HOC
   tests; do not assert that non-HOC-named calls are excluded.
3. **`React.lazy(() => import('./x'))` also populates `advanced.dynamic`**:
   the visitor descends into children, and the inner `import()` call fires
   `analyzeDynamicImport` too. Do not assert `dynamic` is empty in lazy tests.
4. **The existing snapshot must not change**: the snapshot fixture
   `fixtures/patterns/01-direct-usage.tsx` contains none of the affected
   patterns (verified by grep at `19a4695`). If
   `tests/swc-parser/patterns/jsx.test.tsx` fails after your fix, that is a
   STOP condition — do not regenerate the snapshot.

## Commands you will need

| Purpose       | Command                                | Expected on success |
|---------------|----------------------------------------|---------------------|
| Run tests     | `pnpm run test:ci`                     | all pass            |
| Single file   | `pnpm exec vitest run <path> --reporter=verbose` | listed tests pass |
| Typecheck     | `pnpm run typecheck`                   | exit 0              |
| Lint          | `pnpm run lint`                        | exit 0              |
| Format        | `pnpm run format`                      | writes in place     |

(If working in a fresh worktree: `pnpm install` first — this project uses
pnpm ONLY. `@swc/core` ships a prebuilt binary; no build-script approval is
needed for tests to run.)

## Scope

**In scope**:
- `src/swc-parser/patterns/lazy-dynamic.ts` (both functions)
- `src/swc-parser/patterns/advanced.ts` (ONLY `analyzeHOCUsage`,
  `analyzeMemoUsage`, `isHOCPattern`)
- `src/swc-parser/patterns/collections.ts` (ONLY `analyzeArrayExpression`)
- New test files: `tests/swc-parser/patterns/advanced.test.ts`,
  `tests/swc-parser/patterns/collections.test.ts`

**Out of scope** (do NOT touch):
- `analyzeObjectExpression`, `analyzeForwardRefUsage`, `analyzePortalUsage`,
  `analyzeMemberExpression` — they work today
- `src/swc-parser/core/visitor.ts` — the dispatch gates are correct
- `src/swc-parser/patterns/conditionals.ts` — identifier-only is by design
- `tests/swc-parser/patterns/jsx.test.tsx` and its snapshot
- Any line-number computation (Plan 013's territory)

## Git workflow

- Branch: `advisor/025-fix-swc-ast-argument-unwrapping`
- Commit message: `fix: unwrap SWC argument/element expression wrappers in pattern analyzers`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Confirm the wrapper shape and the excerpts

Read the three source files in scope and confirm they match the "Current
state" excerpts. Then run the probe from "Why this matters" and confirm the
`{"spread":null,"expression":{...}}` output. On any mismatch: STOP.

### Step 2: Write the failing tests first

Create `tests/swc-parser/patterns/advanced.test.ts` asserting through
`parseCode` on `report.patterns.advanced.*`:

- `React.lazy(() => import('./Button'))` → `advanced.lazy.length > 0` and
  `advanced.lazy[0].source === './Button'`
- bare `lazy(() => import('./Card'))` with `import { lazy } from 'react';` →
  `advanced.lazy.length > 0`
- `await import('./module')` inside an async function →
  `advanced.dynamic.length > 0` and `advanced.dynamic[0].source === './module'`
- `React.memo(Button)` with Button imported → `advanced.memo` contains an
  entry with `component: 'Button'`
- `React.forwardRef((props, ref) => null)` → `advanced.forwardRef.length > 0`
  (this one passes even before the fix — it characterizes working behavior)
- `withAuth(Button)` with Button imported → `advanced.hoc` contains an entry
  with `function: 'withAuth'` and `component: 'Button'`

Create `tests/swc-parser/patterns/collections.test.ts`:

- `const tabs = [Button, Card];` (both imported) →
  `patterns.usage.arrays[0].components` contains `'Button'` and `'Card'`
- `const nums = [1, 2, 3];` → `patterns.usage.arrays` empty
- `const map = { primary: Button, card: Card };` →
  `patterns.usage.objects[0].mappings` includes keys `'primary'` and `'card'`
  (passes before the fix — objects analyzer works)

**Verify**: `pnpm exec vitest run tests/swc-parser/patterns/advanced.test.ts
tests/swc-parser/patterns/collections.test.ts --reporter=verbose` → the
lazy/dynamic/memo/hoc/arrays tests FAIL (empty arrays); forwardRef and
objects tests PASS. If any lazy/dynamic/memo/hoc/arrays test passes before
the fix, STOP — the premise of this plan is wrong.

### Step 3: Apply the unwrap fix

In each broken site, read the node from `<wrapper>.expression`:

`src/swc-parser/patterns/lazy-dynamic.ts`:
```ts
export function analyzeLazyImport(node: any, state: ParserState): void {
  const arg = node.arguments?.[0]?.expression;
  if (
    arg?.type === 'ArrowFunctionExpression' &&
    arg.body?.type === 'CallExpression'
  ) {
    const importCall = arg.body;
    if (importCall.callee?.type === 'Import') {
      const source = importCall.arguments?.[0]?.expression?.value;
      ...
```

```ts
export function analyzeDynamicImport(node: any, state: ParserState): void {
  const source = node.arguments?.[0]?.expression?.value;
  ...
```

`src/swc-parser/patterns/advanced.ts`:
```ts
    component: node.arguments?.[0]?.expression?.value || '[unknown]',
```
```ts
  const component = node.arguments?.[0]?.expression;
```
```ts
      (arg: any) =>
        arg.expression?.type === 'Identifier' &&
        state.componentNames.has(arg.expression.value),
```

`src/swc-parser/patterns/collections.ts`, `analyzeArrayExpression`:
```ts
  const hasComponents = node.elements?.some((elem: any) => {
    if (elem?.expression?.type === 'Identifier') {
      return state.componentNames.has(elem.expression.value);
    }
    return false;
  });
```
```ts
      components: node.elements
        ?.map((elem: any) => elem?.expression?.value)
        .filter(Boolean),
```

Keep everything else in those functions byte-identical.

**Verify**: re-run the Step 2 command → ALL tests in both files now pass.

### Step 4: Full suite

```
pnpm run test:ci && pnpm run typecheck && pnpm run lint
```

All exit 0. Explicitly confirm `tests/swc-parser/patterns/jsx.test.tsx`
(snapshot) still passes with NO snapshot update.

### Step 5: Format and commit

`pnpm run format`, re-check `git status` shows only the five in-scope files,
then commit per the git workflow section.

## Test plan

The Step 2 tests ARE the plan (~9 tests, 2 files). The
lazy/dynamic/memo/hoc/arrays tests are regression tests for this fix; the
forwardRef/objects tests characterize the already-working neighbors so the
files are complete units.

## Done criteria

- [ ] Step 2 tests fail before Step 3 and pass after (both observed)
- [ ] `pnpm run test:ci` exits 0; existing snapshot unchanged
- [ ] `pnpm run typecheck` and `pnpm run lint` exit 0
- [ ] `git diff --stat` shows exactly: 3 files under `src/swc-parser/patterns/`,
      2 new files under `tests/swc-parser/patterns/`
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- The Step 1 probe does not show the `{spread, expression}` wrapper shape.
- Any lazy/dynamic/memo/hoc/arrays test PASSES before the fix (Step 2).
- The snapshot test fails after the fix — do not regenerate it; report the
  snapshot diff instead.
- Any test outside the two new files breaks.
- The fix requires touching `visitor.ts` or any out-of-scope function.

## Maintenance notes

- Plan 013 (line numbers) touches the same `line: node.span?.start || 0`
  expressions in these functions — land order doesn't matter, but rebase
  carefully if both are in flight.
- Plan 015's remaining test files (conditionals/variables/matchers) are
  independent of this fix.
- The broad HOC heuristic (any identifier call with a known-component arg)
  will now actually fire; if users report false positives (e.g. bare
  `memo(Button)` counted as HOC), that is a new finding for a future audit —
  not a bug in this fix.
