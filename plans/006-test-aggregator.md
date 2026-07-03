# Plan 006: Test coverage — aggregator.ts unit tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 36699c4..HEAD -- src/utils/aggregator.ts tests/utils/`
> If `aggregator.ts` changed since this plan was written, compare the
> "Current state" excerpts before proceeding.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: `plans/005-test-mock-factory.md`
- **Category**: tests
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

`src/utils/aggregator.ts` is 471 lines and the final processing stage of every
scan — it produces the `AggregatedReport` that all print utilities consume.
It has zero test coverage. Bugs in package distribution calculation, pattern
counting, versus result computation, or banned/required package detection
produce wrong output that users trust.

## Current state

**`src/utils/aggregator.ts`** exports (verified by reading the file):

- `aggregateReports(reports, versions, config, multiVersions)` → `AggregatedReport`
- `ComponentUsage`, `PackageDistribution`, `PatternCount`, `VersusEntry`, `VersusResult`, `BannedPackageViolation`, `AggregatedReport` (types)

Key internal functions (private, tested indirectly via `aggregateReports`):
- `calculateVersusResults(distribution, versusConfigs)` — called by `aggregateReports`
- `detectBannedPackages(distribution, config)` — called by `aggregateReports`
- `detectRequiredPackages(distribution, versions, config)` — called by `aggregateReports`
- `countPatterns(report, patternMap)` — tallies pattern counts per report
- `calculatePackageDistribution(componentUsageMap, versions, config, multiVersions)` — builds per-package breakdown

**Key behavior to test:**

`aggregateReports` with JSX usage:
```ts
// If report has jsx: [{ component: 'Button', ... }] and versions has 'react'
// and report.patterns.imports.named has { name: 'Button', source: 'react' }
// then componentUsage has 'Button' with source='react'
// and packageDistribution has an entry for 'react'
```

Package resolution (`resolvePackageFromImportPath`):
- `'react'` → `'react'`
- `'react/something'` → `'react'`
- `'./local'` → `'local'`
- `'/absolute'` → `'local'`
- `'unknown-pkg'` (not in availablePackages) → `'unknown'`
- `'@scope/pkg/sub'` → `'@scope/pkg'`

**`tests/helpers/mock-reports.ts`** (created in Plan 005):
```ts
import { createMockReport, createMockPackage } from '../helpers/mock-reports';
```

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0, no errors   |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope** (only file to create):
- `tests/utils/aggregator.test.ts`

**Out of scope** (do NOT touch):
- `src/utils/aggregator.ts` — no source changes
- Any other file

## Git workflow

- Branch: `advisor/006-test-aggregator`
- Commit message: `test: add aggregator unit tests`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create tests/utils/aggregator.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { aggregateReports } from '../../src/utils/aggregator';
import { createMockReport } from '../helpers/mock-reports';

describe('aggregateReports — empty input', () => {
  it('returns zeroed counts for empty reports array', () => {
    const result = aggregateReports([]);
    expect(result.filesAnalyzed).toBe(0);
    expect(result.totalImports).toBe(0);
    expect(result.totalComponents).toBe(0);
    expect(result.packageDistribution).toEqual([]);
    expect(result.patternCounts).toEqual([]);
    expect(result.versusResults).toEqual([]);
    expect(result.bannedPackageViolations).toEqual([]);
    expect(result.ruleViolations).toEqual([]);
  });
});

describe('aggregateReports — component counting', () => {
  it('counts JSX component usage across reports', () => {
    const report = createMockReport({
      summary: { totalImports: 1, totalComponents: 1, totalUsagePatterns: 1 },
      patterns: {
        imports: {
          default: [],
          named: [{ name: 'Button', source: 'react', line: 1 }],
          namespace: [],
          aliased: [],
        },
        usage: {
          jsx: [{ component: 'Button', props: [], propsAnalysis: { namedProps: [], hasSpread: false, hasComplexProps: false, hasEventHandlers: false, propDetails: [] } }],
          variables: [], destructuring: [], conditional: [], arrays: [], objects: [],
        },
        advanced: { lazy: [], dynamic: [], hoc: [], memo: [], forwardRef: [], portal: [] },
        props: [],
      },
      components: ['Button'],
    });

    const result = aggregateReports([report], { react: '18.0.0' });
    expect(result.filesAnalyzed).toBe(1);
    expect(result.totalComponents).toBe(1);
    expect(result.topComponents[0].name).toBe('Button');
    expect(result.topComponents[0].count).toBe(1);
  });

  it('aggregates the same component used across multiple reports', () => {
    const makeReport = () => createMockReport({
      summary: { totalImports: 1, totalComponents: 1, totalUsagePatterns: 1 },
      patterns: {
        imports: { default: [], named: [{ name: 'Button', source: 'react' }], namespace: [], aliased: [] },
        usage: {
          jsx: [{ component: 'Button', props: [], propsAnalysis: { namedProps: [], hasSpread: false, hasComplexProps: false, hasEventHandlers: false, propDetails: [] } }],
          variables: [], destructuring: [], conditional: [], arrays: [], objects: [],
        },
        advanced: { lazy: [], dynamic: [], hoc: [], memo: [], forwardRef: [], portal: [] },
        props: [],
      },
      components: ['Button'],
    });

    const result = aggregateReports([makeReport(), makeReport()], { react: '18.0.0' });
    expect(result.filesAnalyzed).toBe(2);
    expect(result.topComponents[0].name).toBe('Button');
    expect(result.topComponents[0].count).toBe(2);
  });
});

describe('aggregateReports — package distribution', () => {
  it('resolves component to its package', () => {
    const report = createMockReport({
      patterns: {
        imports: { default: [], named: [{ name: 'Button', source: 'react' }], namespace: [], aliased: [] },
        usage: {
          jsx: [{ component: 'Button', props: [], propsAnalysis: { namedProps: [], hasSpread: false, hasComplexProps: false, hasEventHandlers: false, propDetails: [] } }],
          variables: [], destructuring: [], conditional: [], arrays: [], objects: [],
        },
        advanced: { lazy: [], dynamic: [], hoc: [], memo: [], forwardRef: [], portal: [] },
        props: [],
      },
      summary: { totalImports: 1, totalComponents: 1, totalUsagePatterns: 1 },
      components: ['Button'],
    });

    const result = aggregateReports([report], { react: '18.0.0' });
    const reactPkg = result.packageDistribution.find((p) => p.packageName === 'react');
    expect(reactPkg).toBeDefined();
    expect(reactPkg?.version).toBe('18.0.0');
    expect(reactPkg?.components).toContain('Button');
  });

  it('excludes local and unknown sources from package distribution', () => {
    const report = createMockReport({
      patterns: {
        imports: {
          default: [],
          named: [
            { name: 'Button', source: './components/Button' },
            { name: 'Icon', source: 'unknown-lib' },
          ],
          namespace: [], aliased: [],
        },
        usage: {
          jsx: [
            { component: 'Button', props: [], propsAnalysis: { namedProps: [], hasSpread: false, hasComplexProps: false, hasEventHandlers: false, propDetails: [] } },
            { component: 'Icon', props: [], propsAnalysis: { namedProps: [], hasSpread: false, hasComplexProps: false, hasEventHandlers: false, propDetails: [] } },
          ],
          variables: [], destructuring: [], conditional: [], arrays: [], objects: [],
        },
        advanced: { lazy: [], dynamic: [], hoc: [], memo: [], forwardRef: [], portal: [] },
        props: [],
      },
      summary: { totalImports: 2, totalComponents: 2, totalUsagePatterns: 2 },
      components: ['Button', 'Icon'],
    });

    const result = aggregateReports([report], {});
    expect(result.packageDistribution).toHaveLength(0);
  });

  it('marks packages matching internal patterns as internal', () => {
    const report = createMockReport({
      patterns: {
        imports: { default: [], named: [{ name: 'Button', source: '@company/ui' }], namespace: [], aliased: [] },
        usage: {
          jsx: [{ component: 'Button', props: [], propsAnalysis: { namedProps: [], hasSpread: false, hasComplexProps: false, hasEventHandlers: false, propDetails: [] } }],
          variables: [], destructuring: [], conditional: [], arrays: [], objects: [],
        },
        advanced: { lazy: [], dynamic: [], hoc: [], memo: [], forwardRef: [], portal: [] },
        props: [],
      },
      summary: { totalImports: 1, totalComponents: 1, totalUsagePatterns: 1 },
      components: ['Button'],
    });

    const result = aggregateReports(
      [report],
      { '@company/ui': '2.0.0' },
      { includes: [], excludes: [], packages: { internal: ['@company/*'], ignore: [] }, versus: [], rules: { forbid_files: [], require_files: [], allow_files: [], forbid_packages: [], require_packages: [], require_scripts: [], require_package_fields: [] }, output: { summary: 'log', components: 'table', packages: 'table', patterns: 'table', details: false, versus: true, rules: true, format: 'human' }, releaseAge: { enabled: false, registry: 'https://registry.npmjs.org', thresholds: { patch: 30, minor: 45, major: 60 } } },
    );

    const pkg = result.packageDistribution.find((p) => p.packageName === '@company/ui');
    expect(pkg?.internal).toBe(true);
  });
});

describe('aggregateReports — banned packages', () => {
  it('reports a banned package violation', () => {
    const report = createMockReport({
      patterns: {
        imports: { default: [], named: [{ name: 'moment', source: 'moment' }], namespace: [], aliased: [] },
        usage: {
          jsx: [{ component: 'moment', props: [], propsAnalysis: { namedProps: [], hasSpread: false, hasComplexProps: false, hasEventHandlers: false, propDetails: [] } }],
          variables: [], destructuring: [], conditional: [], arrays: [], objects: [],
        },
        advanced: { lazy: [], dynamic: [], hoc: [], memo: [], forwardRef: [], portal: [] },
        props: [],
      },
      summary: { totalImports: 1, totalComponents: 1, totalUsagePatterns: 1 },
      components: ['moment'],
    });

    const result = aggregateReports(
      [report],
      { moment: '2.29.0' },
      { includes: [], excludes: [], packages: { internal: [], ignore: [] }, versus: [], rules: { forbid_files: [], require_files: [], allow_files: [], forbid_packages: [{ severity: 'error', patterns: ['moment'] }], require_packages: [], require_scripts: [], require_package_fields: [] }, output: { summary: 'log', components: 'table', packages: 'table', patterns: 'table', details: false, versus: true, rules: true, format: 'human' }, releaseAge: { enabled: false, registry: 'https://registry.npmjs.org', thresholds: { patch: 30, minor: 45, major: 60 } } },
    );

    expect(result.bannedPackageViolations).toHaveLength(1);
    expect(result.bannedPackageViolations[0].packageName).toBe('moment');
    expect(result.bannedPackageViolations[0].severity).toBe('error');
  });
});

describe('aggregateReports — pattern counts', () => {
  it('counts patterns from reports', () => {
    const report = createMockReport({
      patterns: {
        imports: { default: [{ name: 'React', source: 'react' }], named: [], namespace: [], aliased: [] },
        usage: { jsx: [], variables: [], destructuring: [], conditional: [], arrays: [], objects: [] },
        advanced: { lazy: [], dynamic: [], hoc: [], memo: [], forwardRef: [], portal: [] },
        props: [],
      },
      summary: { totalImports: 1, totalComponents: 0, totalUsagePatterns: 0 },
      components: [],
    });

    const result = aggregateReports([report]);
    const defaultImportCount = result.patternCounts.find((p) => p.patternType === 'imports.default');
    expect(defaultImportCount?.count).toBe(1);
  });
});

describe('aggregateReports — versus results', () => {
  it('calculates versus percentages across two competing packages', () => {
    const makeReport = (componentName: string, source: string) => createMockReport({
      patterns: {
        imports: { default: [], named: [{ name: componentName, source }], namespace: [], aliased: [] },
        usage: {
          jsx: [{ component: componentName, props: [], propsAnalysis: { namedProps: [], hasSpread: false, hasComplexProps: false, hasEventHandlers: false, propDetails: [] } }],
          variables: [], destructuring: [], conditional: [], arrays: [], objects: [],
        },
        advanced: { lazy: [], dynamic: [], hoc: [], memo: [], forwardRef: [], portal: [] },
        props: [],
      },
      summary: { totalImports: 1, totalComponents: 1, totalUsagePatterns: 1 },
      components: [componentName],
    });

    const result = aggregateReports(
      [makeReport('moment', 'moment'), makeReport('dayjs', 'dayjs')],
      { moment: '2.29.0', dayjs: '1.11.0' },
      { includes: [], excludes: [], packages: { internal: [], ignore: [] }, versus: [{ name: 'Date libraries', packages: ['moment', 'dayjs'] }], rules: { forbid_files: [], require_files: [], allow_files: [], forbid_packages: [], require_packages: [], require_scripts: [], require_package_fields: [] }, output: { summary: 'log', components: 'table', packages: 'table', patterns: 'table', details: false, versus: true, rules: true, format: 'human' }, releaseAge: { enabled: false, registry: 'https://registry.npmjs.org', thresholds: { patch: 30, minor: 45, major: 60 } } },
    );

    expect(result.versusResults).toHaveLength(1);
    expect(result.versusResults[0].name).toBe('Date libraries');
    expect(result.versusResults[0].totalCount).toBe(2);
    const momentEntry = result.versusResults[0].entries.find((e) => e.packageName === 'moment');
    expect(momentEntry?.percentage).toBe(50);
  });
});
```

**Verify**:
```
pnpm run test:ci -- --reporter=verbose
```
→ all new aggregator tests pass.

### Step 2: Typecheck and lint

```
pnpm run typecheck && pnpm run lint
```

Both exit 0.

## Test plan

The tests above cover:
- Empty input (zero reports)
- Component counting (single and multiple reports)
- Package distribution (resolution, local/unknown exclusion, internal marking)
- Banned package detection
- Pattern counting
- Versus result calculation

Not covered (out of scope for this plan, low value-add):
- `getPatternDisplayName` (pure lookup, trivial)
- Multi-version conflict detection (complex fixture setup, deferred)

## Done criteria

- [ ] `tests/utils/aggregator.test.ts` exists
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run test:ci` exits 0 with new tests passing
- [ ] `pnpm run lint` exits 0
- [ ] Only `tests/utils/aggregator.test.ts` created (`git diff --name-only`)
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- `createMockReport` from Plan 005 is not yet available (Plan 005 not complete). Complete Plan 005 first.
- A test fails because `HermexConfig` shape passed inline doesn't match the actual type. Read `src/config/schema.ts` to get the exact shape and adjust the test's config literal.
- Any aggregator function throws unexpectedly for inputs that look valid. Stop and report the specific input and error.

## Maintenance notes

- When new fields are added to `AggregatedReport`, add test assertions for them.
- When `aggregateReports` signature changes, update the test calls accordingly.
- The config object inline in tests is verbose by design — avoids importing `HermexConfigSchema.parse({})` which has async concerns. If it becomes unmanageable, add a `createMockConfig(overrides?)` factory to `tests/helpers/mock-reports.ts`.
