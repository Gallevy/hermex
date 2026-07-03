# Plan 005: Create mock report factory for aggregator/enricher tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 36699c4..HEAD -- src/swc-parser/types.ts src/utils/aggregator.ts tests/helpers/`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests / DX
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

Plans 006 (aggregator tests) and 007 (enricher tests) both need to construct
`UsageReport` and `PackageDistribution` objects. Without a factory, every test
must inline a full object literal — these types have 10+ nested fields, making
test files verbose and fragile when types evolve.

A small factory module in `tests/helpers/` solves this once. It is a
prerequisite for Plans 006 and 007.

## Current state

**`src/swc-parser/types.ts`** — `UsageReport` shape (lines 114–146):
```ts
export interface UsageReport {
  summary: { totalImports: number; totalComponents: number; totalUsagePatterns: number };
  patterns: {
    imports: { default: ImportPattern[]; named: ImportPattern[]; namespace: ImportPattern[]; aliased: AliasedImport[] };
    usage: { jsx: JSXUsage[]; variables: ...; destructuring: ...; conditional: ...; arrays: ...; objects: ... };
    advanced: { lazy: ...; dynamic: ...; hoc: ...; memo: ...; forwardRef: ...; portal: ... };
    props: Array<{ component: string; analysis: PropsAnalysis }>;
  };
  components: string[];
}
```

**`src/utils/aggregator.ts`** — `PackageDistribution` shape (lines 21–31):
```ts
export interface PackageDistribution {
  packageName: string; version: string | null; componentCount: number;
  usageCount: number; percentage: number; components: string[];
  internal: boolean; hasVersionConflict: boolean; allVersions: string[];
  releaseAge?: ReleaseAgeEntry;
}
```

**`tests/helpers/read-fixture.ts`** — existing helper pattern to follow:
```ts
export async function readFixture(fixtureName: string) {
  const path = join(__dirname, '../..', 'fixtures', fixtureName);
  return readFileSync(path, 'utf8');
}
```

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0, no errors   |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope** (only file to create):
- `tests/helpers/mock-reports.ts`

**Out of scope** (do NOT touch):
- Any file under `src/`
- `tests/helpers/read-fixture.ts`
- Any existing test file

## Git workflow

- Branch: `advisor/005-test-mock-factory`
- Commit message: `test: add mock report factory helpers for unit tests`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create tests/helpers/mock-reports.ts

```ts
import type { UsageReport } from '../../src/swc-parser/types';
import type { PackageDistribution } from '../../src/utils/aggregator';
import type { ReleaseAgeEntry } from '../../src/npm-registry/types';

/**
 * Creates a minimal UsageReport with all required fields.
 * Override specific fields via the partial argument.
 */
export function createMockReport(overrides: Partial<UsageReport> = {}): UsageReport {
  return {
    summary: { totalImports: 0, totalComponents: 0, totalUsagePatterns: 0 },
    patterns: {
      imports: { default: [], named: [], namespace: [], aliased: [] },
      usage: { jsx: [], variables: [], destructuring: [], conditional: [], arrays: [], objects: [] },
      advanced: { lazy: [], dynamic: [], hoc: [], memo: [], forwardRef: [], portal: [] },
      props: [],
    },
    components: [],
    ...overrides,
  };
}

/**
 * Creates a minimal PackageDistribution entry.
 * Override specific fields via the partial argument.
 */
export function createMockPackage(
  packageName: string,
  overrides: Partial<PackageDistribution> = {},
): PackageDistribution {
  return {
    packageName,
    version: '1.0.0',
    componentCount: 1,
    usageCount: 1,
    percentage: 100,
    components: [],
    internal: false,
    hasVersionConflict: false,
    allVersions: ['1.0.0'],
    ...overrides,
  };
}

/**
 * Creates a minimal ReleaseAgeEntry.
 */
export function createMockReleaseAge(overrides: Partial<ReleaseAgeEntry> = {}): ReleaseAgeEntry {
  return {
    installedVersion: '1.0.0',
    upgrades: [],
    worstLevel: null,
    ...overrides,
  };
}
```

**Verify**: `pnpm run typecheck` → exits 0 (the factory types must align with the source interfaces; if not, adjust the factory to match the actual interface shapes).

### Step 2: Validate with a smoke test

Create a temporary file `tests/helpers/mock-reports.test.ts` to confirm the factory compiles and runs:

```ts
import { describe, it, expect } from 'vitest';
import { createMockReport, createMockPackage, createMockReleaseAge } from './mock-reports';

describe('mock report factory', () => {
  it('createMockReport returns a valid UsageReport', () => {
    const report = createMockReport();
    expect(report.summary.totalImports).toBe(0);
    expect(report.patterns.imports.named).toEqual([]);
  });

  it('createMockReport accepts overrides', () => {
    const report = createMockReport({ components: ['Button', 'Icon'] });
    expect(report.components).toEqual(['Button', 'Icon']);
  });

  it('createMockPackage returns a valid PackageDistribution', () => {
    const pkg = createMockPackage('react');
    expect(pkg.packageName).toBe('react');
    expect(pkg.internal).toBe(false);
  });

  it('createMockReleaseAge returns a valid ReleaseAgeEntry', () => {
    const entry = createMockReleaseAge({ worstLevel: 'needs_upgrade' });
    expect(entry.worstLevel).toBe('needs_upgrade');
  });
});
```

**Verify**:
```
pnpm run test:ci -- --reporter=verbose
```
→ all 4 factory smoke tests pass.

### Step 3: Lint

```
pnpm run lint
```
→ exits 0.

## Test plan

The smoke test in Step 2 validates the factory. The real test value comes from Plans 006 and 007 which consume this factory.

## Done criteria

- [ ] `tests/helpers/mock-reports.ts` exists
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run test:ci` exits 0 with the 4 smoke tests passing
- [ ] `pnpm run lint` exits 0
- [ ] Only the two new test files created (`git diff --name-only`)
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- `pnpm run typecheck` fails because `UsageReport` or `PackageDistribution` fields don't match. Read the actual interface definition in `src/swc-parser/types.ts` and `src/utils/aggregator.ts` and align the factory to match — do not change the source interfaces.

## Maintenance notes

- When new fields are added to `UsageReport`, `PackageDistribution`, or `ReleaseAgeEntry`, update the factory defaults. TypeScript will error on any consumer of the factory until you do.
- Plans 006 and 007 both `import { createMockReport, createMockPackage } from '../helpers/mock-reports'`.
