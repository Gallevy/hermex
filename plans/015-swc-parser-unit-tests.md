# Plan 015: SWC parser unit tests — patterns, utilities, and edge cases

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 36699c4..HEAD -- src/swc-parser/ tests/swc-parser/`
> If the swc-parser directory changed since this plan was written, compare
> before proceeding.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (standalone; complements but does not require Plans 004–008)
- **Category**: tests
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

The entire SWC parser has exactly one test: `tests/swc-parser/patterns/jsx.test.tsx`,
which runs a single snapshot over one fixture. The snapshot captures everything
together — imports, jsx, props, advanced patterns, variables — making it
impossible to tell which pattern function broke when the snapshot fails.

Every pattern file (`imports.ts`, `jsx.ts`, `props.ts`, `advanced.ts`,
`collections.ts`, `conditionals.ts`, `lazy-dynamic.ts`, `variables.ts`) and
both utility files (`jsx-helpers.ts`, `matchers.ts`) are untested in isolation.

The approach here is to test through `parseCode()` (the public API) with small,
focused TypeScript/TSX strings. This avoids constructing raw SWC AST nodes
(brittle, internal) while still isolating each pattern type.

## Current state

**`src/swc-parser/index.ts`** — public API:
```ts
export function parseCode(code: string, filePath = 'file.tsx'): UsageReport
export function parseFile(filePath: string): UsageReport | null
```

**`src/swc-parser/types.ts`** — `UsageReport` output shape (what tests assert on):
- `imports: ImportInfo[]` — imports found
- `jsxUsage: JSXUsage[]` — JSX component usages
- `lazyComponents: LazyComponentUsage[]`
- `dynamicImports: DynamicImportUsage[]`
- `variableAssignments: VariableAssignment[]`
- `destructuredUsage: DestructuredUsage[]`
- `arrayMappings: ArrayMappingEntry[]`
- `objectMappings: ObjectMappingEntry[]`
- `conditionalComponents: ConditionalComponent[]`
- `hocUsages: HOCUsage[]`
- `memoUsages: MemoUsage[]`
- `forwardRefUsages: ForwardRefUsage[]`
- `portalUsages: PortalUsage[]`
- `totalPatterns: number`

**Existing snapshot** — `tests/swc-parser/patterns/__snapshots__/jsx.test.tsx.snap`:
A 244-line snapshot of the full report from `fixtures/01-direct-usage.tsx`. Any
new tests must not conflict with this file (they use separate test IDs).

**Existing test pattern** — from `tests/e2e/cli.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
```

## Commands you will need

| Purpose        | Command                           | Expected on success        |
|----------------|-----------------------------------|----------------------------|
| Typecheck      | `pnpm run typecheck`              | exit 0, no errors          |
| Run new tests  | `pnpm run test:ci --reporter=verbose` | new tests listed and pass |
| Lint           | `pnpm run lint`                   | exit 0                     |

## Scope

**In scope** (files to create):
- `tests/swc-parser/patterns/imports.test.ts`
- `tests/swc-parser/patterns/jsx.unit.test.tsx`
- `tests/swc-parser/patterns/props.test.tsx`
- `tests/swc-parser/patterns/advanced.test.tsx`
- `tests/swc-parser/patterns/collections.test.tsx`
- `tests/swc-parser/patterns/conditionals.test.tsx`
- `tests/swc-parser/patterns/lazy-dynamic.test.tsx`
- `tests/swc-parser/patterns/variables.test.tsx`
- `tests/swc-parser/utils/matchers.test.ts`

**Out of scope** (do NOT touch):
- `tests/swc-parser/patterns/jsx.test.tsx` — the existing snapshot test; don't modify it
- `tests/swc-parser/patterns/__snapshots__/jsx.test.tsx.snap` — don't touch
- Any `src/` file
- `tests/helpers/read-fixture.ts`

## Git workflow

- Branch: `advisor/015-swc-parser-unit-tests`
- Commit message: `test: add swc-parser pattern and utility unit tests`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Read the source types before writing tests

Before writing any test, read `src/swc-parser/types.ts` to confirm the exact
field names on `UsageReport`, `ImportInfo`, `JSXUsage`, `LazyComponentUsage`,
`DynamicImportUsage`, etc. Use these exact field names in assertions.

Also confirm the field names in `src/swc-parser/utils/matchers.ts` — used
for the matchers test.

### Step 2: Create tests/swc-parser/patterns/imports.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

describe('import pattern detection', () => {
  it('detects a named import from a library', () => {
    const report = parseCode(`import { Button } from '@ui/button';`, 'test.tsx');
    expect(report.imports).toHaveLength(1);
    expect(report.imports[0].source).toBe('@ui/button');
    expect(report.imports[0].specifiers).toContain('Button');
  });

  it('detects a default import', () => {
    const report = parseCode(`import React from 'react';`, 'test.tsx');
    expect(report.imports).toHaveLength(1);
    expect(report.imports[0].specifiers).toContain('React');
  });

  it('detects multiple named imports from one source', () => {
    const report = parseCode(
      `import { Card, CardHeader, CardBody } from '@ui/card';`,
      'test.tsx',
    );
    expect(report.imports[0].specifiers).toEqual(
      expect.arrayContaining(['Card', 'CardHeader', 'CardBody']),
    );
  });

  it('detects aliased import under the alias name', () => {
    const report = parseCode(
      `import { Button as Btn } from '@ui/button';`,
      'test.tsx',
    );
    // The alias 'Btn' is what the component is known as at use-site
    const specifiers = report.imports[0].specifiers;
    // Accept either original or alias — read src/swc-parser/patterns/imports.ts
    // to confirm which one is stored, then adjust this assertion.
    expect(specifiers.length).toBeGreaterThan(0);
  });

  it('returns empty imports for a file with no imports', () => {
    const report = parseCode(`const x = 1;`, 'test.ts');
    expect(report.imports).toHaveLength(0);
  });

  it('detects side-effect imports (no specifiers)', () => {
    const report = parseCode(`import './styles.css';`, 'test.ts');
    expect(report.imports).toHaveLength(1);
    expect(report.imports[0].specifiers).toHaveLength(0);
  });
});
```

**Note on the aliased import test**: Read `src/swc-parser/patterns/imports.ts`
to confirm whether the adapter stores the original name, the alias, or both.
Adjust the assertion accordingly.

**Verify**: `pnpm run test:ci --reporter=verbose` — all imports tests pass.

### Step 3: Create tests/swc-parser/patterns/jsx.unit.test.tsx

This is a separate file from the existing `jsx.test.tsx` (which uses snapshots).
These tests assert specific fields without snapshots.

```ts
import { describe, it, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

const PREAMBLE = `import { Button, Card } from '@ui/components';\n`;

describe('JSX usage detection', () => {
  it('detects a known component in JSX', () => {
    const report = parseCode(
      PREAMBLE + `export default function App() { return <Button />; }`,
    );
    const usage = report.jsxUsage.find((u) => u.component === 'Button');
    expect(usage).toBeDefined();
  });

  it('does not detect native HTML elements as component usage', () => {
    const report = parseCode(
      PREAMBLE + `export default function App() { return <div><span /></div>; }`,
    );
    const htmlElements = report.jsxUsage.filter((u) =>
      ['div', 'span', 'p'].includes(u.component),
    );
    expect(htmlElements).toHaveLength(0);
  });

  it('captures props on JSX usage', () => {
    const report = parseCode(
      PREAMBLE +
        `export default function App() { return <Button variant="primary" disabled />; }`,
    );
    const usage = report.jsxUsage.find((u) => u.component === 'Button');
    expect(usage?.props).toEqual(expect.arrayContaining(['variant', 'disabled']));
  });

  it('reports line number greater than 0 for JSX usage', () => {
    const report = parseCode(
      PREAMBLE + `export default function App() { return <Button />; }`,
    );
    const usage = report.jsxUsage.find((u) => u.component === 'Button');
    expect(usage?.line).toBeGreaterThan(0);
  });

  it('detects member expression components (Namespace.Component)', () => {
    const code = `
      import * as UI from '@ui/components';
      export default function App() { return <UI.Button />; }
    `;
    const report = parseCode(code);
    // UI is an identifier; UI.Button is a member expression component
    const memberUsage = report.jsxUsage.find((u) => u.component.includes('.'));
    expect(memberUsage).toBeDefined();
  });
});
```

**Verify**: All new jsx.unit tests pass.

### Step 4: Create tests/swc-parser/patterns/props.test.tsx

```ts
import { describe, it, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

const PREAMBLE = `import { Button } from '@ui/button';\n`;

describe('props analysis', () => {
  it('marks string literal props as non-complex', () => {
    const report = parseCode(
      PREAMBLE + `function App() { return <Button label="click me" />; }`,
    );
    const usage = report.jsxUsage.find((u) => u.component === 'Button');
    const labelProp = usage?.propsAnalysis?.props?.find((p: any) => p.name === 'label');
    expect(labelProp?.isComplex).toBe(false);
  });

  it('marks boolean shorthand props as non-complex', () => {
    const report = parseCode(
      PREAMBLE + `function App() { return <Button disabled />; }`,
    );
    const usage = report.jsxUsage.find((u) => u.component === 'Button');
    const disabledProp = usage?.propsAnalysis?.props?.find((p: any) => p.name === 'disabled');
    expect(disabledProp?.isComplex).toBe(false);
  });

  it('marks function expression props as complex', () => {
    const report = parseCode(
      PREAMBLE + `function App() { return <Button onClick={() => {}} />; }`,
    );
    const usage = report.jsxUsage.find((u) => u.component === 'Button');
    const onClickProp = usage?.propsAnalysis?.props?.find((p: any) => p.name === 'onClick');
    expect(onClickProp?.isComplex).toBe(true);
  });

  it('marks object expression props as complex', () => {
    const report = parseCode(
      PREAMBLE + `function App() { return <Button style={{ color: 'red' }} />; }`,
    );
    const usage = report.jsxUsage.find((u) => u.component === 'Button');
    const styleProp = usage?.propsAnalysis?.props?.find((p: any) => p.name === 'style');
    expect(styleProp?.isComplex).toBe(true);
  });

  it('detects spread props', () => {
    const report = parseCode(
      PREAMBLE + `function App() { const props = {}; return <Button {...props} />; }`,
    );
    const usage = report.jsxUsage.find((u) => u.component === 'Button');
    const hasSpread = usage?.propsAnalysis?.props?.some((p: any) => p.isSpread);
    expect(hasSpread).toBe(true);
  });
});
```

**Verify**: All props tests pass. If `propsAnalysis?.props` field name differs
from what's in `types.ts`, read `src/swc-parser/types.ts` to find the correct
field names and adjust.

### Step 5: Create tests/swc-parser/patterns/advanced.test.tsx

```ts
import { describe, it, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

describe('lazy import detection', () => {
  it('detects React.lazy(() => import(...))', () => {
    const code = `
      import React from 'react';
      const LazyButton = React.lazy(() => import('./Button'));
    `;
    const report = parseCode(code);
    expect(report.lazyComponents.length).toBeGreaterThan(0);
  });

  it('detects bare lazy(() => import(...))', () => {
    const code = `
      import { lazy } from 'react';
      const LazyCard = lazy(() => import('./Card'));
    `;
    const report = parseCode(code);
    expect(report.lazyComponents.length).toBeGreaterThan(0);
  });
});

describe('dynamic import detection', () => {
  it('detects await import()', () => {
    const code = `
      async function load() { const mod = await import('./module'); }
    `;
    const report = parseCode(code);
    expect(report.dynamicImports.length).toBeGreaterThan(0);
  });
});

describe('React.memo detection', () => {
  it('detects React.memo wrapping a known component', () => {
    const code = `
      import { Button } from '@ui/button';
      import React from 'react';
      const MemoButton = React.memo(Button);
    `;
    const report = parseCode(code);
    expect(report.memoUsages.length).toBeGreaterThan(0);
  });
});

describe('React.forwardRef detection', () => {
  it('detects React.forwardRef', () => {
    const code = `
      import React from 'react';
      const FancyButton = React.forwardRef((props, ref) => <button ref={ref} />);
    `;
    const report = parseCode(code);
    expect(report.forwardRefUsages.length).toBeGreaterThan(0);
  });
});
```

### Step 6: Create tests/swc-parser/patterns/collections.test.tsx

```ts
import { describe, it, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

const PREAMBLE = `import { Button, Card } from '@ui/components';\n`;

describe('array mapping detection', () => {
  it('detects arrays containing known component identifiers', () => {
    const report = parseCode(
      PREAMBLE + `const tabs = [Button, Card];`,
    );
    expect(report.arrayMappings.length).toBeGreaterThan(0);
  });

  it('does not flag arrays of non-component values', () => {
    const report = parseCode(
      PREAMBLE + `const nums = [1, 2, 3];`,
    );
    expect(report.arrayMappings).toHaveLength(0);
  });
});

describe('object mapping detection', () => {
  it('detects object expressions mapping keys to known components', () => {
    const report = parseCode(
      PREAMBLE + `const map = { primary: Button, card: Card };`,
    );
    expect(report.objectMappings.length).toBeGreaterThan(0);
    const mapping = report.objectMappings[0];
    const keys = mapping.mappings.map((m: any) => m.key);
    expect(keys).toEqual(expect.arrayContaining(['primary', 'card']));
  });
});
```

### Step 7: Create tests/swc-parser/patterns/conditionals.test.tsx

```ts
import { describe, it, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

const PREAMBLE = `import { Button, Card } from '@ui/components';\n`;

describe('conditional component detection', () => {
  it('detects ternary with known component as consequent', () => {
    const report = parseCode(
      PREAMBLE +
        `function App({ show }: any) { return show ? <Button /> : null; }`,
    );
    expect(report.conditionalComponents.length).toBeGreaterThan(0);
  });

  it('detects ternary with known components in both branches', () => {
    const report = parseCode(
      PREAMBLE +
        `function App({ a }: any) { return a ? <Button /> : <Card />; }`,
    );
    const found = report.conditionalComponents.some(
      (c: any) => c.consequent || c.alternate,
    );
    expect(found).toBe(true);
  });
});
```

### Step 8: Create tests/swc-parser/patterns/variables.test.tsx

```ts
import { describe, it, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

describe('variable assignment detection', () => {
  it('detects direct component re-assignment', () => {
    const code = `
      import { Button } from '@ui/button';
      const Btn = Button;
    `;
    const report = parseCode(code);
    expect(report.variableAssignments.length).toBeGreaterThan(0);
    const assignment = report.variableAssignments[0];
    expect(assignment.assignment).toContain('Button');
  });

  it('does not flag assignment of non-component values', () => {
    const code = `
      import { Button } from '@ui/button';
      const x = 42;
    `;
    const report = parseCode(code);
    expect(report.variableAssignments).toHaveLength(0);
  });
});

describe('destructured usage detection', () => {
  it('detects destructured component from an imported namespace', () => {
    const code = `
      import * as UI from '@ui/components';
      const { Button } = UI;
    `;
    const report = parseCode(code);
    // UI is in allIdentifiers; destructuring from it tracks Button
    expect(report.destructuredUsage.length).toBeGreaterThan(0);
  });
});
```

### Step 9: Create tests/swc-parser/patterns/lazy-dynamic.test.tsx

Covered in Step 5 (advanced.test.tsx). If both `advanced.test.tsx` and
`lazy-dynamic.test.tsx` test the same things, keep only `advanced.test.tsx`
and skip this step to avoid duplication. Only create this file if you want
additional lazy/dynamic tests beyond what Step 5 covers.

### Step 10: Create tests/swc-parser/utils/matchers.test.ts

```ts
import { describe, it, expect } from 'vitest';
import {
  isHOCPattern,
  isHOCFunction,
  looksLikeComponent,
  isFromLibrary,
} from '../../../src/swc-parser/utils/matchers';

describe('isHOCPattern', () => {
  it('matches "with" prefix', () => {
    expect(isHOCPattern('withAuth')).toBe(true);
  });

  it('matches "connect" prefix', () => {
    expect(isHOCPattern('connectToStore')).toBe(true);
  });

  it('does not match unrelated names', () => {
    expect(isHOCPattern('renderButton')).toBe(false);
    expect(isHOCPattern('Button')).toBe(false);
  });
});

describe('looksLikeComponent', () => {
  it('returns true for PascalCase names', () => {
    expect(looksLikeComponent('Button')).toBe(true);
    expect(looksLikeComponent('MyComponent')).toBe(true);
  });

  it('returns false for camelCase names', () => {
    expect(looksLikeComponent('button')).toBe(false);
    expect(looksLikeComponent('myComponent')).toBe(false);
  });
});

describe('isFromLibrary', () => {
  it('matches exact library prefix', () => {
    expect(isFromLibrary('@ui/button', '@ui')).toBe(true);
  });

  it('matches library name within path', () => {
    expect(isFromLibrary('react-dom/client', 'react-dom')).toBe(true);
  });

  it('returns false for unrelated sources', () => {
    expect(isFromLibrary('@other/button', '@ui')).toBe(false);
  });
});

describe('isHOCFunction', () => {
  it('returns true for Identifier callee matching HOC pattern', () => {
    const callee = { type: 'Identifier', value: 'withAuth' };
    expect(isHOCFunction(callee)).toBe(true);
  });

  it('returns false for null callee', () => {
    expect(isHOCFunction(null)).toBe(false);
  });

  it('returns false for non-HOC Identifier', () => {
    const callee = { type: 'Identifier', value: 'render' };
    expect(isHOCFunction(callee)).toBe(false);
  });
});
```

### Step 11: Run all new tests

```
pnpm run test:ci --reporter=verbose
```

Look for all the new test files in the output. If any test fails:
1. Read the error carefully.
2. Check the actual `UsageReport` shape against `src/swc-parser/types.ts`.
3. Adjust field names in the assertions (NOT the source code).

The goal is tests that pass with the current code — these are characterization
tests, not aspirational specifications.

### Step 12: Typecheck and lint

```
pnpm run typecheck && pnpm run lint
```

Both must exit 0. If `pnpm run lint` warns about `any` types in test files,
that is acceptable — test files are allowed to use `any` when asserting
on complex nested types from SWC's AST output.

## Test plan

The tests in this plan ARE the test plan. Each step is a separate test file.

Summary:
- `imports.test.ts` — 6 tests
- `jsx.unit.test.tsx` — 5 tests
- `props.test.tsx` — 5 tests
- `advanced.test.tsx` — 5 tests (memo, forwardRef, lazy, dynamic)
- `collections.test.tsx` — 4 tests
- `conditionals.test.tsx` — 2 tests
- `variables.test.tsx` — 3 tests
- `matchers.test.ts` — 7 tests

Total: ~37 new tests

## Done criteria

- [ ] All 8 test files exist under `tests/swc-parser/`
- [ ] `pnpm run test:ci` exits 0 — all new tests pass
- [ ] No skipped tests in the new files
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] Existing `jsx.test.tsx` snapshot test still passes (no changes to it)
- [ ] No `src/` files modified
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- A test fails because the `UsageReport` shape differs from what's described
  in this plan. **Do not change the source.** Read `src/swc-parser/types.ts`
  and adjust the test assertion to match what the type actually says.
- `parseCode` throws on a test input. Check that the TSX/TS string is valid
  syntax — missing a closing tag, wrong brace nesting, etc. will cause SWC to
  throw a parse error. Fix the test input, not the source.
- `pnpm run lint` rejects the test files with errors (not warnings). Check for
  import paths that are one `../` too deep or too shallow.

## Maintenance notes

- These tests use `parseCode()` (the public API), not internal functions. If
  internals change but the API behavior is preserved, these tests do not break.
- When new pattern types are added to the parser, add a corresponding
  `*.test.tsx` or `*.test.ts` file following the same pattern: small focused
  code string → `parseCode()` → assert specific fields.
- The `PREAMBLE` pattern (importing `Button`, `Card` before each test) works
  because pattern detection only fires on *known* components (those in
  `state.componentNames`, populated by import analysis). Without the import
  preamble, `<Button />` would be ignored. Keep this pattern.
- If Plan 013 (fix line numbers) is executed before this plan, all `line`
  assertions expecting `> 0` will still pass since real line numbers are also > 0.
  If it hasn't been executed yet, the `> 0` assertion also passes for byte
  offsets, which are also > 0. No ordering dependency.
