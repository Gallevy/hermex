# Plan 012: Split aggregator.ts into focused modules

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 36699c4..HEAD -- src/utils/aggregator.ts src/utils/`
> If `aggregator.ts` changed since this plan was written, compare before proceeding.

## Status

- **Priority**: P3
- **Effort**: L
- **Risk**: MED
- **Depends on**: `plans/006-test-aggregator.md` (tests must exist before refactoring)
- **Category**: tech-debt / architecture
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

`src/utils/aggregator.ts` is 471 lines handling six distinct concerns: main
aggregation, package distribution calculation, versus result computation, banned
package detection, required package detection, and pattern counting. This makes
it hard to test individual functions in isolation, hard to review changes, and
high-cognitive-load to extend.

**Do not start this plan unless Plan 006 (aggregator tests) is DONE.** The tests
are the safety net that makes this refactor safe to execute.

## Current state

`src/utils/aggregator.ts` (471 lines) exports and contains:

**Exported types** (must remain importable from the same path or update all callers):
- `ComponentUsage`, `PackageDistribution`, `PatternCount`, `VersusEntry`, `VersusResult`, `BannedPackageViolation`, `AggregatedReport`

**Exported function**:
- `aggregateReports(reports, versions?, config?, multiVersions?)` → `AggregatedReport`

**Private functions** (grouped by concern):
```
Pattern counting:
  countPatterns(report, patternMap)
  increment(map, key, value)
  getPatternDisplayName(patternType)

Package version lookup:
  getPackageVersion(packageName, versions)

Package distribution:
  calculatePackageDistribution(componentUsageMap, versions, config, multiVersions)
  resolvePackageFromImportPath(importPath, availablePackages)
  findComponentSource(componentName, report, availablePackages)

Versus results:
  calculateVersusResults(distribution, versusConfigs)

Package rules:
  detectBannedPackages(distribution, config?)
  detectRequiredPackages(distribution, versions, config?)
```

**All current consumers of `src/utils/aggregator.ts`** (these must keep working):
```
src/commands/scan.ts        → import { aggregateReports }
src/utils/print-*.ts (many) → import { AggregatedReport, PackageDistribution, ... }
src/utils/print-json.ts     → import { AggregatedReport }
tests/utils/aggregator.test.ts (after Plan 006)
```

## Target structure

```
src/utils/
  aggregator.ts           ← keep; re-exports everything for backward compat
  aggregator-core.ts      ← aggregateReports() + types (AggregatedReport, ComponentUsage)
  package-distribution.ts ← calculatePackageDistribution, resolvePackageFromImportPath,
                             findComponentSource, getPackageVersion, PackageDistribution
  package-rules.ts        ← detectBannedPackages, detectRequiredPackages,
                             BannedPackageViolation
  pattern-counter.ts      ← countPatterns, increment, getPatternDisplayName, PatternCount
  versus.ts               ← calculateVersusResults, VersusEntry, VersusResult
```

`aggregator.ts` becomes a pure re-export barrel so no consumers break:
```ts
export * from './aggregator-core';
export * from './package-distribution';
export * from './package-rules';
export * from './pattern-counter';
export * from './versus';
```

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0, no errors   |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope**:
- `src/utils/aggregator.ts` — becomes a re-export barrel
- `src/utils/aggregator-core.ts` — new
- `src/utils/package-distribution.ts` — new
- `src/utils/package-rules.ts` — new
- `src/utils/pattern-counter.ts` — new
- `src/utils/versus.ts` — new

**Out of scope** (do NOT touch):
- Any consumer of `src/utils/aggregator.ts` — the barrel re-export ensures backward compat
- Any test file except `tests/utils/aggregator.test.ts` if import paths need updating

## Git workflow

- Branch: `advisor/012-aggregator-split`
- Commit message: `refactor: split aggregator.ts into focused modules`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create src/utils/pattern-counter.ts

Move these functions and types from `aggregator.ts` to the new file. Copy them exactly:

```ts
import type { UsageReport } from '../swc-parser';

export interface PatternCount {
  patternType: string;
  displayName: string;
  count: number;
}

export function countPatterns(report: UsageReport, patternMap: Map<string, number>): void {
  // [copy the full function body from aggregator.ts]
}

export function increment(map: Map<string, number>, key: string, value: number): void {
  map.set(key, (map.get(key) || 0) + value);
}

export function getPatternDisplayName(patternType: string): string {
  // [copy the full function body from aggregator.ts]
}
```

**Verify**: `pnpm run typecheck` — will fail (aggregator.ts still has the old definitions). Proceed to Step 2.

### Step 2: Create src/utils/versus.ts

```ts
import type { PackageDistribution } from './package-distribution';
import type { VersusConfig } from '../config/types';

export interface VersusEntry {
  packageName: string;
  count: number;
  percentage: number;
  components: string[];
}

export interface VersusResult {
  name: string;
  packages: string[];
  entries: VersusEntry[];
  totalCount: number;
}

function toPercentage(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

export function calculateVersusResults(
  distribution: PackageDistribution[],
  versusConfigs: VersusConfig[],
): VersusResult[] {
  // [copy the full function body from aggregator.ts]
}
```

### Step 3: Create src/utils/package-distribution.ts

```ts
import type { UsageReport } from '../swc-parser';
import type { HermexConfig } from '../config/types';
import type { MultiVersionMap } from '../lock-parser';
import type { ReleaseAgeEntry } from '../npm-registry/types';
import type { ComponentUsage } from './aggregator-core';

export interface PackageDistribution {
  packageName: string;
  version: string | null;
  componentCount: number;
  usageCount: number;
  percentage: number;
  components: string[];
  internal: boolean;
  hasVersionConflict: boolean;
  allVersions: string[];
  releaseAge?: ReleaseAgeEntry;
}

export function resolvePackageFromImportPath(
  importPath: string,
  availablePackages: string[],
): string {
  // [copy the full function body from aggregator.ts]
}

export function findComponentSource(
  componentName: string,
  report: UsageReport,
  availablePackages: string[],
): string {
  // [copy using resolvePackageFromImportPath from this file]
}

function getPackageVersion(packageName: string, versions: Record<string, string>): string | null {
  // [copy the full function body from aggregator.ts]
}

export function calculatePackageDistribution(
  componentUsageMap: Map<string, ComponentUsage>,
  versions: Record<string, string>,
  config?: HermexConfig,
  multiVersions: MultiVersionMap = {},
): PackageDistribution[] {
  // [copy the full function body from aggregator.ts]
}
```

**Note**: `ComponentUsage` is defined in `aggregator-core.ts` (created in Step 5).
If TypeScript complains about a circular dependency, move `ComponentUsage` into
`package-distribution.ts` and import it in `aggregator-core.ts` instead.

### Step 4: Create src/utils/package-rules.ts

```ts
import micromatch from 'micromatch';
import type { HermexConfig } from '../config/types';
import type { RuleViolation } from '../rules/evaluator';
import { toArray } from '../rules/evaluator';
import type { PackageDistribution } from './package-distribution';

export interface BannedPackageViolation {
  packageName: string;
  severity: 'error' | 'warn';
  message?: string;
}

export function detectBannedPackages(
  distribution: PackageDistribution[],
  config?: HermexConfig,
): BannedPackageViolation[] {
  // [copy the full function body from aggregator.ts]
}

export function detectRequiredPackages(
  distribution: PackageDistribution[],
  versions: Record<string, string>,
  config?: HermexConfig,
): RuleViolation[] {
  // [copy the full function body from aggregator.ts]
}
```

### Step 5: Create src/utils/aggregator-core.ts

```ts
import type { UsageReport } from '../swc-parser';
import type { HermexConfig } from '../config/types';
import type { MultiVersionMap } from '../lock-parser';
import type { RuleViolation } from '../rules/evaluator';
import { countPatterns, getPatternDisplayName, type PatternCount } from './pattern-counter';
import { calculatePackageDistribution, findComponentSource, type PackageDistribution } from './package-distribution';
import { calculateVersusResults, type VersusResult } from './versus';
import { detectBannedPackages, detectRequiredPackages, type BannedPackageViolation } from './package-rules';

export interface ComponentUsage {
  name: string;
  source: string;
  count: number;
  files: Set<string>;
}

export interface AggregatedReport {
  filesAnalyzed: number;
  totalImports: number;
  totalComponents: number;
  totalUsagePatterns: number;
  patternCounts: PatternCount[];
  componentUsage: Map<string, ComponentUsage>;
  topComponents: ComponentUsage[];
  allComponents: string[];
  packageDistribution: PackageDistribution[];
  versusResults: VersusResult[];
  ruleViolations: RuleViolation[];
  bannedPackageViolations: BannedPackageViolation[];
  reports: UsageReport[];
}

export function aggregateReports(
  reports: UsageReport[],
  versions: Record<string, string> = {},
  config?: HermexConfig,
  multiVersions: MultiVersionMap = {},
): AggregatedReport {
  // [copy the full function body from aggregator.ts, updating internal calls to use imported functions]
}
```

**Verify**: `pnpm run typecheck` — should now be closer to passing.

### Step 6: Replace aggregator.ts with a barrel re-export

Replace the entire content of `src/utils/aggregator.ts` with:

```ts
export * from './aggregator-core';
export * from './package-distribution';
export * from './package-rules';
export * from './pattern-counter';
export * from './versus';
```

**Verify**:
```
pnpm run typecheck
```
→ exits 0. If there are duplicate export errors (e.g. `PatternCount` exported from both barrel and a consumer), resolve by removing the duplicate from the consumer.

### Step 7: Run the full suite

```
pnpm run build && pnpm run test:ci && pnpm run lint
```

All must exit 0. The aggregator tests from Plan 006 serve as the regression net.

## Test plan

No new tests needed — Plan 006's aggregator tests are the regression check.
If those tests pass before and after the refactor, behavior is preserved.

If `tests/utils/aggregator.test.ts` imports from `../../src/utils/aggregator`,
it continues to work because `aggregator.ts` is now a barrel that re-exports everything.

## Done criteria

- [ ] `src/utils/aggregator-core.ts` exists
- [ ] `src/utils/package-distribution.ts` exists
- [ ] `src/utils/package-rules.ts` exists
- [ ] `src/utils/pattern-counter.ts` exists
- [ ] `src/utils/versus.ts` exists
- [ ] `src/utils/aggregator.ts` is a pure re-export barrel (≤10 lines)
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm run test:ci` exits 0 (Plan 006 tests pass)
- [ ] `pnpm run lint` exits 0
- [ ] No consumer files outside `src/utils/` modified
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- Plan 006 (aggregator tests) is not DONE. Do not proceed — you need a safety net.
- TypeScript reports a circular dependency between the new modules. Reorganize by moving the shared type (`ComponentUsage`) into `package-distribution.ts` and importing it from there in `aggregator-core.ts`.
- `pnpm run typecheck` produces more than 5 errors after Step 6. Stop and report the first 5; the barrel re-export approach may have a name conflict.
- Any test in Plan 006 fails after the refactor. The refactor must be behavior-preserving — if tests fail, something was transcribed incorrectly.

## Maintenance notes

- New aggregation concerns go into their own focused file, not back into `aggregator-core.ts`.
- All external consumers import from `'./aggregator'` (the barrel) — this remains the stable import path.
- The barrel approach trades a small runtime cost (one extra module hop) for zero consumer changes — acceptable for a CLI tool.
