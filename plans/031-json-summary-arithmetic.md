# Plan 031: Make `summary.patternCounts` a true partition of `totalUsagePatterns`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 688c481..HEAD -- src/swc-parser/core/report.ts src/utils/pattern-counter.ts src/swc-parser/patterns/imports.ts`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW — changes reported numbers, not analysis behaviour
- **Depends on**: none
- **Category**: bug / contract
- **Planned at**: commit `688c481`, 2026-08-15
- **Map ticket**: [#115 JSON output contract and versioning](https://github.com/Gallevy/hermex/issues/115)

> ### Assumption this plan encodes
>
> That `patternCounts` **should** be a partition of `totalUsagePatterns` — i.e.
> the counts add up to the total. [#115](https://github.com/Gallevy/hermex/issues/115)
> could instead decide the two are deliberately different measures and document
> that. If so, this plan is replaced by a docs change. The numbers not adding up
> *silently* is the defect either way.

## Why this matters

A consumer reading `hermex scan --format json` sees a `summary` block whose
numbers contradict each other. Measured on the committed baseline
`tests/__output_baselines__/scan-json/stdout.json`:

| Field | Value |
|---|---|
| `summary.totalUsagePatterns` | **284** |
| Σ `summary.patternCounts[].count` | **220** |
| `summary.totalImports` | **80** |
| Σ the four `imports.*` entries in `patternCounts` | **86** |

Anyone building a dashboard on this picks one number and is wrong. v3 is where
this payload becomes a contract, so freezing it as-is freezes the contradiction.

## Current state

There are **two independent causes**.

### Cause A — props inflate the total but are not counted (284 vs 220)

`calculateTotalPatterns` sums the size of *every* collection on
`state.usagePatterns`, whatever it is:

```ts
// src/swc-parser/core/report.ts:64-71
function calculateTotalPatterns(state: ParserState): number {
  return Object.values(state.usagePatterns).reduce((sum, collection) => {
    if (collection instanceof Set || collection instanceof Map) {
      return sum + collection.size;
    }
    return sum;
  }, 0);
}
```

`state.usagePatterns` includes `propsAnalysis` (`src/swc-parser/core/state.ts:21`,
declared at `src/swc-parser/types.ts:92`), so props are in the total.

`countPatterns` enumerates sixteen buckets explicitly and props is not among
them:

```ts
// src/utils/pattern-counter.ts:9-65 — abridged; sixteen increment() calls
export function countPatterns(report: UsageReport, patternMap: Map<string, number>) {
  increment(patternMap, 'imports.default', report.patterns.imports.default.length);
  increment(patternMap, 'imports.named', report.patterns.imports.named.length);
  increment(patternMap, 'imports.namespace', report.patterns.imports.namespace.length);
  increment(patternMap, 'imports.aliased', report.patterns.imports.aliased.length);
  increment(patternMap, 'usage.jsx', report.patterns.usage.jsx.length);
  // ... usage.variables, usage.destructuring, usage.conditional, usage.arrays,
  //     usage.objects, advanced.lazy, advanced.dynamic, advanced.hoc,
  //     advanced.memo, advanced.forwardRef, advanced.portal
}
```

The 284 − 220 = **64** gap is exactly `propsAnalysis.size` in that fixture.

### Cause B — aliased imports are double-counted (80 vs 86)

`analyzeNamedImport` adds an aliased import to **two** collections:

```ts
// src/swc-parser/patterns/imports.ts:68-94
function analyzeNamedImport(spec, source, node, state): void {
  const importedName = spec.imported ? spec.imported.value : spec.local.value;
  const localName = spec.local.value;

  state.usagePatterns.namedImports.add({ name: importedName, source, line: node.span?.start || 0 });

  // Track aliases
  if (importedName !== localName) {
    state.usagePatterns.aliasedImports.set(localName, {
      imported: importedName, local: localName, source, line: node.span?.start || 0,
    });
  }

  state.componentNames.add(localName);
}
```

`totalImports` correctly adds only three sets, excluding aliased:

```ts
// src/swc-parser/core/report.ts:13-16
totalImports:
  state.usagePatterns.defaultImports.size +
  state.usagePatterns.namedImports.size +
  state.usagePatterns.namespaceImports.size,
```

But `patternCounts` reports `imports.named` and `imports.aliased` as if they
were disjoint buckets. In the fixture: 39 + 37 + 4 = 80 for `totalImports`,
while the four pattern counts sum to 39 + 37 + 4 + 6 = 86. The 6 aliased
imports are inside the 37 named ones.

**Aliased is a property of a named import, not a separate import.** That is the
fact both fixes follow from.

### Convention

`getPatternDisplayName` (`src/utils/pattern-counter.ts:71-91`) maps each
`patternType` to a human label for the terminal table. Any bucket added or
renamed must be added there too, or it falls back to the raw key.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm run test:ci` | all pass |
| Single test file | `pnpm run test:ci -- tests/utils/pattern-counter.test.ts` | all pass |
| Lint | `pnpm run lint:ci` | exit 0 |
| Format check | `pnpm run format:ci` | exit 0 |
| Build | `pnpm run build:ci` | exit 0 |
| Output review | `pnpm run test:output` | see Step 4 |

## Scope

**In scope**:
- `src/utils/pattern-counter.ts`
- `src/swc-parser/core/report.ts`
- `tests/utils/pattern-counter.test.ts`
- `tests/__output_baselines__/` — only via `pnpm run test:output -- --update`

**Out of scope** (do NOT touch):
- `src/swc-parser/patterns/imports.ts` — **do not stop recording aliased
  imports separately.** `src/utils/aggregator-core.ts:81-86` reads
  `report.patterns.imports.aliased` to resolve a local JSX alias back to its
  canonical export name. Removing or changing that collection breaks component
  aggregation. Only the *counting* is wrong, not the data.
- `src/utils/print-json.ts` — it passes `patternCounts` through unchanged.
- Anything under `src/swc-parser/patterns/props.ts` — props redesign is
  [#103](https://github.com/Gallevy/hermex/issues/103).

## Git workflow

- Branch: `advisor/031-json-summary-arithmetic`
- Conventional commits, e.g. `fix(json): make patternCounts sum to totalUsagePatterns`
- Do NOT push or open a PR unless the operator instructed it.
- User-facing output change → `pnpm changeset add --minor hermex -m "..."`.

## Steps

### Step 1: Stop double-counting aliased imports

In `src/utils/pattern-counter.ts`, change the `imports.aliased` bucket so it no
longer participates in the sum, while remaining visible as the informational
number it is.

Rename the bucket key from `imports.aliased` to `imports.named.aliased` and
subtract it from `imports.named`, so the four import buckets partition cleanly:

```ts
increment(patternMap, 'imports.named',
  report.patterns.imports.named.length - report.patterns.imports.aliased.length);
increment(patternMap, 'imports.named.aliased', report.patterns.imports.aliased.length);
```

`named.length - aliased.length` is safe: every aliased import is also a named
import (see Cause B above), so the subtraction cannot go negative. Add that
sentence as a code comment — it is the non-obvious invariant.

Add the display name in `getPatternDisplayName`:

```ts
'imports.named.aliased': 'Named Imports (aliased)',
```

**Verify**: `pnpm run typecheck` → exit 0.

### Step 2: Count props in `patternCounts`, or exclude them from the total

Pick **one**, and record which in the commit message:

**2a (preferred) — count props.** Add a bucket to `countPatterns`:

```ts
increment(patternMap, 'usage.props', report.patterns.props.length);
```

and `'usage.props': 'Props Analyzed'` to `getPatternDisplayName`. This keeps
`totalUsagePatterns` unchanged and makes the buckets add up to it.

**2b — exclude props from the total.** Change `calculateTotalPatterns` in
`src/swc-parser/core/report.ts` to enumerate the same sixteen collections
`countPatterns` does, rather than reflecting over every field. This lowers
`totalUsagePatterns` from 284 to 220 in the fixture.

Prefer **2a**: it is additive, it does not lower a published number, and
reflecting over `usagePatterns` means any future collection is automatically in
the total — the reflection is not the bug, the missing bucket is.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 3: Add the arithmetic as a test

In `tests/utils/pattern-counter.test.ts`, add a test that builds a
`UsageReport` exercising all bucket types (reuse the helpers already in that
file; if it has none, `tests/helpers/mock-reports.ts` provides report builders)
and asserts:

```ts
expect(sumOfCounts).toBe(report.summary.totalUsagePatterns);
```

Add a second test asserting the import buckets partition:

```ts
expect(importBucketSum).toBe(report.summary.totalImports);
```

with at least one aliased import present, so the case that was broken is
covered.

**Verify**: `pnpm run test:ci -- tests/utils/pattern-counter.test.ts` → all
pass, 2 new tests.

### Step 4: Refresh the output-review baselines

`summary.patternCounts` appears in three JSON baselines (`scan-json`,
`scan-json-toggles`, and the `comply-*-json` cases) and in the human patterns
table.

```bash
pnpm run test:output
```

Cases **will** change — that is expected here. Inspect the diff and confirm:
- `imports.aliased` is gone, `imports.named.aliased` present
- `imports.named` dropped by exactly the aliased count
- `usage.props` present (if you chose 2a)

Then refresh: `pnpm run test:output -- --update` and commit the baselines.

**Verify**: after the update, re-run `pnpm run test:output` → `0 changed`,
`0 unexpected`, no invariant breaches.

### Step 5: Confirm the numbers now agree

```bash
node -e "
const d=JSON.parse(require('fs').readFileSync('tests/__output_baselines__/scan-json/stdout.json','utf8'));
const s=d.summary;
const total=s.patternCounts.reduce((a,p)=>a+p.count,0);
const imports=s.patternCounts.filter(p=>p.patternType.startsWith('imports.')&&p.patternType!=='imports.named.aliased').reduce((a,p)=>a+p.count,0);
console.log('totalUsagePatterns', s.totalUsagePatterns, '=== sum', total, s.totalUsagePatterns===total);
console.log('totalImports', s.totalImports, '=== importSum', imports, s.totalImports===imports);
"
```

**Verify**: both lines print `true`.

## Test plan

- 2 new tests in `tests/utils/pattern-counter.test.ts` (Step 3): the total
  partition and the imports partition, the latter with an aliased import.
- Structural pattern: the existing tests in that same file.
- The output-review baselines act as the integration-level proof — Step 5 is the
  machine check.

## Done criteria

ALL must hold:

- [ ] `pnpm run format:ci` exits 0
- [ ] `pnpm run lint:ci` exits 0
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run test:ci` exits 0 with 2 new pattern-counter tests
- [ ] `pnpm run build:ci` exits 0
- [ ] `pnpm run test:output` → 0 changed, 0 unexpected, no invariant breaches
- [ ] Step 5's script prints `true` on both lines
- [ ] `grep -rn "'imports.aliased'" src/` returns no matches
- [ ] `git status` shows no modified files outside the Scope list
- [ ] `plans/README.md` status row for 031 updated

## STOP conditions

Stop and report back if:

- The excerpts in "Current state" do not match the live code.
- `named.length - aliased.length` goes negative for any fixture (would mean an
  aliased import exists that is not also a named import — the invariant this
  plan relies on is false).
- Output-review cases change in ways unrelated to `patternCounts` or the
  patterns table.
- Removing `imports.aliased` from the counts breaks a test in
  `tests/utils/aggregator.test.ts` — that would mean something reads the
  *count* rather than the collection, and the plan's scope boundary is wrong.
- Any step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- **The renamed key is a breaking change for JSON consumers** who read
  `patternType === 'imports.aliased'`. It belongs in 3.0.0 and in
  [#117](https://github.com/Gallevy/hermex/issues/117)'s migration notes.
- A reviewer should check that `getPatternDisplayName` gained an entry for every
  key added or renamed — a missing entry silently falls back to the raw key in
  the terminal table, which is easy to miss in review and obvious to a user.
- If [#103](https://github.com/Gallevy/hermex/issues/103) redesigns props into
  per-usage records, `usage.props` from Step 2a will count a different thing.
  Revisit the bucket then; the partition assertion from Step 3 will catch it.
- The reflection in `calculateTotalPatterns` means **any** new collection added
  to `UsagePatterns` lands in `totalUsagePatterns` automatically but needs a
  matching `increment()` call. The Step 3 assertion is what makes that failure
  loud instead of silent.
