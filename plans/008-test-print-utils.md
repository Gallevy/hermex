# Plan 008: Test coverage — print utility functions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 36699c4..HEAD -- src/utils/print-*.ts src/utils/format-utils.ts src/utils/chart-renderer.ts tests/utils/`
> If any print utility files changed since this plan was written, compare before proceeding.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: `plans/005-test-mock-factory.md`
- **Category**: tests
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

14 print utility files have zero test coverage. While print bugs don't break
scans, they produce wrong or garbled output that users see directly. The most
common failures — null reference on empty data, wrong table headers, broken
JSON shape — are cheap to catch with a handful of tests per function.

The strategy here is **smoke tests** (does it call console.log without throwing?)
plus **targeted assertions** on the JSON output path and any function with
non-trivial branching logic.

## Current state

**Print utility files** (all under `src/utils/`):
- `print-summary.ts` — `printSummary(aggregated)`
- `print-packages.ts` — `printPackages(aggregated, mode: 'table'|'chart')`
- `print-components.ts` — `printComponents(aggregated, mode)`
- `print-patterns.ts` — `printPatterns(aggregated, mode)`
- `print-details.ts` — `printDetails(aggregated)`
- `print-versus.ts` — `printVersus(aggregated)`
- `print-rules.ts` — `printRules(aggregated)`
- `print-errors.ts` — `printErrors(errors: ParseError[])`
- `print-json.ts` — `printJson(aggregated)` — emits JSON to stdout
- `format-utils.ts` — `formatCount(n)` etc.
- `chart-renderer.ts` — `renderChart(...)` etc.

**`print-json.ts`** — highest-value test target (parses to verify JSON shape):
```ts
export function printJson(aggregated: AggregatedReport): void {
  console.log(JSON.stringify({ summary, packages, components, patterns, rules, ... }));
}
```

**`tests/helpers/mock-reports.ts`** (from Plan 005) — provides:
```ts
createMockPackage(name, overrides?)  // PackageDistribution
```
and we need a full `AggregatedReport` — construct inline or extend the factory.

**`AggregatedReport` shape** (from `src/utils/aggregator.ts`):
```ts
interface AggregatedReport {
  filesAnalyzed: number; totalImports: number; totalComponents: number; totalUsagePatterns: number;
  patternCounts: PatternCount[]; componentUsage: Map<string, ComponentUsage>; topComponents: ComponentUsage[];
  allComponents: string[]; packageDistribution: PackageDistribution[]; versusResults: VersusResult[];
  ruleViolations: RuleViolation[]; bannedPackageViolations: BannedPackageViolation[];
  reports: UsageReport[];
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
- `tests/utils/print-utils.test.ts`

**Out of scope** (do NOT touch):
- Any file under `src/`
- `tests/helpers/mock-reports.ts` (extend if needed for `createMockAggregated`, but prefer inline construction here)

## Git workflow

- Branch: `advisor/008-test-print-utils`
- Commit message: `test: add print utility smoke tests and JSON output assertion`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create tests/utils/print-utils.test.ts

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printSummary } from '../../src/utils/print-summary';
import { printPackages } from '../../src/utils/print-packages';
import { printComponents } from '../../src/utils/print-components';
import { printPatterns } from '../../src/utils/print-patterns';
import { printErrors } from '../../src/utils/print-errors';
import { printJson } from '../../src/utils/print-json';
import { printRules } from '../../src/utils/print-rules';
import { printVersus } from '../../src/utils/print-versus';
import type { AggregatedReport } from '../../src/utils/aggregator';

// Minimal AggregatedReport satisfying all required fields
function makeAggregated(overrides: Partial<AggregatedReport> = {}): AggregatedReport {
  return {
    filesAnalyzed: 5,
    totalImports: 10,
    totalComponents: 3,
    totalUsagePatterns: 7,
    patternCounts: [{ patternType: 'usage.jsx', displayName: 'JSX Usage', count: 5 }],
    componentUsage: new Map(),
    topComponents: [],
    allComponents: ['Button', 'Icon', 'Modal'],
    packageDistribution: [],
    versusResults: [],
    ruleViolations: [],
    bannedPackageViolations: [],
    reports: [],
    ...overrides,
  };
}

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
});

describe('printSummary', () => {
  it('does not throw on minimal report', () => {
    expect(() => printSummary(makeAggregated())).not.toThrow();
  });

  it('calls console.log at least once', () => {
    printSummary(makeAggregated());
    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe('printPackages', () => {
  it('table mode: does not throw on empty packages', () => {
    expect(() => printPackages(makeAggregated({ packageDistribution: [] }), 'table')).not.toThrow();
  });

  it('chart mode: does not throw on empty packages', () => {
    expect(() => printPackages(makeAggregated({ packageDistribution: [] }), 'chart')).not.toThrow();
  });

  it('table mode: does not throw with packages', () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        {
          packageName: 'react', version: '18.0.0', componentCount: 2, usageCount: 5,
          percentage: 100, components: ['Button', 'Icon'], internal: false,
          hasVersionConflict: false, allVersions: ['18.0.0'],
        },
      ],
    });
    expect(() => printPackages(aggregated, 'table')).not.toThrow();
  });
});

describe('printComponents', () => {
  it('table mode: does not throw on empty components', () => {
    expect(() => printComponents(makeAggregated({ topComponents: [] }), 'table')).not.toThrow();
  });
});

describe('printPatterns', () => {
  it('table mode: does not throw with pattern counts', () => {
    expect(() => printPatterns(makeAggregated(), 'table')).not.toThrow();
  });
});

describe('printErrors', () => {
  it('does not throw with empty errors', () => {
    expect(() => printErrors([])).not.toThrow();
  });

  it('does not throw with parse errors', () => {
    expect(() => printErrors([{ file: 'src/App.tsx', message: 'Unexpected token' }])).not.toThrow();
  });
});

describe('printRules', () => {
  it('does not throw with no violations', () => {
    expect(() => printRules(makeAggregated())).not.toThrow();
  });

  it('does not throw with rule violations', () => {
    const aggregated = makeAggregated({
      ruleViolations: [{
        type: 'forbid_files', severity: 'error',
        patterns: ['src/legacy.js'], matchedFiles: ['src/legacy.js'],
      }],
    });
    expect(() => printRules(aggregated)).not.toThrow();
  });
});

describe('printVersus', () => {
  it('does not throw with no versus results', () => {
    expect(() => printVersus(makeAggregated({ versusResults: [] }))).not.toThrow();
  });
});

describe('printJson', () => {
  it('emits valid JSON to stdout', () => {
    let captured = '';
    consoleSpy.mockImplementation((str: string) => { captured = str; });

    printJson(makeAggregated());

    const parsed = JSON.parse(captured);
    expect(parsed).toHaveProperty('summary');
    expect(parsed).toHaveProperty('packages');
    expect(parsed).toHaveProperty('components');
    expect(parsed).toHaveProperty('patterns');
    expect(parsed.summary).toHaveProperty('filesAnalyzed');
    expect(parsed.summary.filesAnalyzed).toBe(5);
  });

  it('JSON output has no undefined values (all fields serializable)', () => {
    let captured = '';
    consoleSpy.mockImplementation((str: string) => { captured = str; });

    printJson(makeAggregated());

    expect(() => JSON.parse(captured)).not.toThrow();
    expect(captured).not.toContain('undefined');
  });
});
```

**Verify**:
```
pnpm run test:ci -- --reporter=verbose
```
→ all print-utils tests pass.

### Step 2: Typecheck and lint

```
pnpm run typecheck && pnpm run lint
```

Both exit 0.

## Test plan

The file above covers:
- Smoke test (no throw) for: `printSummary`, `printPackages` (table + chart), `printComponents`, `printPatterns`, `printErrors`, `printRules`, `printVersus`
- Behavioral assertions for `printJson`: valid JSON, correct shape, no undefined values

Not covered (low value):
- `chart-renderer.ts` internals — exercised indirectly via chart mode smoke tests
- `format-utils.ts` — pure functions; can be added trivially if desired
- `print-details.ts` — similar smoke test, add if desired

## Done criteria

- [ ] `tests/utils/print-utils.test.ts` exists
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run test:ci` exits 0 with all new tests passing
- [ ] `pnpm run lint` exits 0
- [ ] No `src/` files modified
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- `printJson` spy doesn't capture the output because it writes to a different stream. Read `src/utils/print-json.ts` to see whether it uses `console.log` or `process.stdout.write`; if the latter, mock `process.stdout.write` instead.
- `AggregatedReport` has changed fields since this plan was written (drift check fails). Read the current interface and update `makeAggregated()` to match.

## Maintenance notes

- When new print functions are added to `src/utils/`, add a corresponding smoke test to this file.
- The `makeAggregated()` helper in this test file is intentionally local (not from `tests/helpers/`) because it constructs a full `AggregatedReport` while the shared factory only handles parts. If it drifts from the real type, TypeScript will catch it.
