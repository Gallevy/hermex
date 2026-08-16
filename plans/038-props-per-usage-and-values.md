# Plan 038: Record props per JSX usage, capture statically-resolvable values, and surface them

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 688c481..HEAD -- src/swc-parser/ src/utils/aggregator-core.ts src/utils/print-json.ts`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED — new data, unbounded in principle; Step 4's cap is the control
- **Depends on**: **plan 022** (it deletes `AggregatedReport.reports`; this plan
  replaces the path props would have escaped through, so running 022 first
  avoids a merge conflict in `aggregator-core.ts`)
- **Category**: gap / feature
- **Planned at**: commit `688c481`, 2026-08-15
- **Map ticket**: [#103 Props and prop values](https://github.com/Gallevy/hermex/issues/103)

> ### Assumptions this plan encodes
>
> [#103](https://github.com/Gallevy/hermex/issues/103) is an **open prototype
> ticket** whose entire job is to find this boundary against real fixtures
> rather than guess it. This plan guesses, so there is something concrete to
> react to. Every number and shape below is a starting position:
>
> 1. **Per-usage records replace per-component-name records.** The current
>    last-write-wins behaviour is not a design, it is a bug.
> 2. **Values are captured only where they resolve exactly** — string, numeric
>    and boolean literals, and template literals with zero interpolations (per
>    [#119](https://github.com/Gallevy/hermex/issues/119)'s finding). Everything
>    else records a kind, not a value.
> 3. **Value cardinality is capped at 20 distinct values per (component, prop)**,
>    after which the set is marked `truncated` and stops growing. #103 names
>    "a prop with 10,000 distinct values must not blow up the inventory" as a
>    requirement; 20 is a guess at the useful ceiling.
> 4. **Prop *values* are aggregated; per-usage records are not emitted in JSON.**
>    Emitting one record per JSX element would multiply payload size by usage
>    count. `explain component` ([#105](https://github.com/Gallevy/hermex/issues/105))
>    can query them; `scan --format json` gets the aggregate.
>
> [#113](https://github.com/Gallevy/hermex/issues/113) (`min-adoption`,
> `no-deprecated-prop-usage`) is blocked on this being **accurate**, not merely
> present — that was explicit while charting. Step 6 is where accuracy is proven.

## Why this matters

hermex computes a props analysis for every JSX element and then throws it away.
`generateReport` builds `patterns.props`, but nothing reads it: not
`aggregateReports`, not `countPatterns`, not `printJson`. Its only escape route
is `AggregatedReport.reports`, which is itself dead and being deleted by plan
022.

Worse, what it computes is wrong at the shape level: `propsAnalysis` is a `Map`
keyed by **component name**, so within one file the last `<Button>` overwrites
every earlier one. And no prop *values* are captured at all — only a coarse type
string.

v3 tracks props and prop values as a headline capability, and two rules
([#113](https://github.com/Gallevy/hermex/issues/113)) are blocked on it.

## Current state

**`src/swc-parser/patterns/props.ts:6-61`** — note the final line:

```ts
export function analyzePropsInDetail(
  attributes: any[],
  componentName: string,
  state: ParserState,
): PropsAnalysis {
  const analysis: PropsAnalysis = {
    namedProps: [], hasSpread: false, hasComplexProps: false,
    hasEventHandlers: false, propDetails: [],
  };
  if (!attributes) return analysis;

  for (const attr of attributes) {
    if (attr.type === 'JSXAttribute') {
      const propName = attr.name?.value || attr.name?.name?.value;
      if (propName) {
        analysis.namedProps.push(propName);
        const propDetail: PropDetail = {
          name: propName,
          type: getPropType(attr.value),
          isEventHandler: propName.startsWith('on'),
          isComplex: isComplexProp(attr.value),
        };
        ...
      }
    } else if (attr.type === 'SpreadElement') {
      analysis.hasSpread = true;
      ...
    }
  }

  // Store in state
  state.usagePatterns.propsAnalysis.set(componentName, analysis);  // ← line 58
  return analysis;
}
```

`state.usagePatterns.propsAnalysis` is `Map<string, PropsAnalysis>`
(`src/swc-parser/types.ts:92`) — keyed by name, hence last-write-wins.

**`src/swc-parser/patterns/props.ts:66-98`** — `getPropType` returns a kind and
never a value. A `TemplateLiteral` falls through to `'expression'`, even though
[#119](https://github.com/Gallevy/hermex/issues/119) established that a template
with zero interpolations resolves exactly.

**`src/swc-parser/core/report.ts:48-53`** — the data reaches the report:

```ts
      props: Array.from(state.usagePatterns.propsAnalysis.entries()).map(
        ([component, analysis]) => ({ component, analysis }),
      ),
```

**`src/utils/aggregator-core.ts:59-104`** — and stops there. The loop reads
`report.summary`, `report.patterns.usage.jsx` and `report.patterns.imports`.
Never `report.patterns.props`.

**`src/swc-parser/types.ts:17-31`** — `JSXUsage` carries **both**
`props: string[]` and `propsAnalysis: PropsAnalysis` whose `namedProps` is the
same list. Duplicated.

**`state.usagePatterns.jsxUsage` is `Map<string, JSXUsage>`**
(`types.ts:90`) — also keyed by component name, so per-usage records do not
exist anywhere in parser state. Both maps have to change together.

**Prior art to honour** — from
[`docs/research/swc-jsx-prop-values.md`](../docs/research/swc-jsx-prop-values.md)
(#119): `JSXAttrOrSpread` is a tagged enum, so JSX attributes do **not** repeat
the `{spread, expression}` wrapper bug that plan 025 fixed for call arguments
and array elements. Literals and zero-interpolation templates resolve exactly;
**bindings are the hard wall**; conditionals and `&&`/`??` are enumerable as a
candidate set; a non-inline spread makes the prop set open. Read that document
before Step 2.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm run test:ci` | all pass |
| Parser tests | `pnpm run test:ci -- tests/swc-parser/` | all pass |
| Lint | `pnpm run lint:ci` | exit 0 |
| Format check | `pnpm run format:ci` | exit 0 |
| Build | `pnpm run build:ci` | exit 0 |
| Output review | `pnpm run test:output` | see Step 5 |

## Scope

**In scope**:
- `src/swc-parser/patterns/props.ts`, `src/swc-parser/patterns/jsx.ts`
- `src/swc-parser/types.ts`, `src/swc-parser/core/{state,report}.ts`
- `src/utils/aggregator-core.ts`, `src/utils/pattern-counter.ts`
- `src/utils/print-json.ts`, `src/index.ts`
- `tests/swc-parser/patterns/props.test.ts` (create — none exists)
- `fixtures/` — new prop-value fixtures, `fixtures/cases.ts`
- `tests/__output_baselines__/` via `--update`

**Out of scope** (do NOT touch):
- **The `min-adoption` and `no-deprecated-prop-usage` rules.** Those are
  [#113](https://github.com/Gallevy/hermex/issues/113), explicitly blocked on
  this. Building them here pre-empts a ticket that has not been worked.
- `AggregatedReport.reports` — plan 022 deletes it. If 022 has not run, leave it.
- Resolving prop values through variable bindings. #119 calls bindings the hard
  wall; attempting them is a research project, not this plan.
- `findComponentSource` and component aggregation keying — plan 037 territory
  and #78/#79 decisions.

## Steps

### Step 1: Make JSX usage and props per-occurrence

Change `state.usagePatterns.jsxUsage` from `Map<string, JSXUsage>` to
`JSXUsage[]`, and delete `propsAnalysis` from `UsagePatterns` entirely —
`JSXUsage` already carries a `propsAnalysis` field, so per-usage props come for
free once usages are per-occurrence.

Also collapse the duplication: drop `JSXUsage.props: string[]` and keep
`propsAnalysis.namedProps` as the single list. Update every reader —
`grep -rn "\.props\b" src/ tests/` to find them.

`analyzePropsInDetail` stops writing to state (delete line 58) and simply
returns the analysis to its caller in `src/swc-parser/patterns/jsx.ts:37-45`.

**This changes `report.patterns.usage.jsx` from deduplicated-by-name to
one-entry-per-element**, which changes `patternCounts['usage.jsx']` and the
aggregator's component counts. Expect baseline movement in Step 5; confirm the
new numbers are *usages*, which is what the label already claims.

**Verify**: `pnpm run typecheck` → exit 0; `pnpm run test:ci -- tests/swc-parser/` →
update and pass.

### Step 2: Capture statically-resolvable values

In `src/swc-parser/patterns/props.ts`, extend `PropDetail`:

```ts
export interface PropDetail {
  name: string;
  type: string;
  isEventHandler: boolean;
  isComplex: boolean;
  isSpread?: boolean;
  warning?: string;
  /** Exact value, when it resolves statically. Absent otherwise. */
  value?: string | number | boolean;
  /** Candidate values when the expression is enumerable (ternary, `&&`, `??`). */
  candidates?: (string | number | boolean)[];
}
```

Resolution rules (follow `docs/research/swc-jsx-prop-values.md`):

- No value (`<Button disabled />`) → `value: true`, `type: 'boolean'`.
- `StringLiteral` → `value: <the string>`.
- `JSXExpressionContainer` wrapping `StringLiteral` / `NumericLiteral` /
  `BooleanLiteral` → `value`.
- `TemplateLiteral` with `expressions.length === 0` → `value: quasis[0].cooked`,
  `type: 'string'`. **This is the case currently mis-typed as `'expression'`.**
- `ConditionalExpression`, or `LogicalExpression` with `&&` / `??`, whose
  branches are all literals → `candidates: [...]`, no `value`.
- `Identifier`, `MemberExpression`, `CallExpression`, anything else → no `value`,
  no `candidates`. Keep the existing `type` string.

Do **not** attempt binding resolution.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 3: Aggregate values across files

In `src/utils/aggregator-core.ts`, add a pass over `report.patterns.usage.jsx`
building:

```ts
// `${source}::${componentName}` -> propName -> { values: Set, truncated: boolean, ... }
```

Reuse the same `source::canonicalName` key the component aggregation already
builds (`aggregator-core.ts:87`) so props attach to the same identity as
components — otherwise the same export under two aliases fragments.

Add to the aggregate a `componentProps` structure:

```ts
export interface PropSummary {
  name: string;
  /** Files in which this prop was passed. */
  usageCount: number;
  /** Distinct statically-resolved values, capped — see `truncated`. */
  values: (string | number | boolean)[];
  /** True when distinct values exceeded the cap and collection stopped. */
  truncated: boolean;
  /** Usages where the value could not be resolved statically. */
  dynamicCount: number;
}
```

**Verify**: `pnpm run typecheck` → exit 0.

### Step 4: Cap cardinality

Enforce assumption 3: at most **20** distinct values per (component, prop). On
the 21st distinct value, set `truncated: true` and stop adding. Keep counting
`usageCount` and `dynamicCount` — those are bounded numbers, not sets.

Define the cap as a named module constant with a comment explaining it is a
guess pending #103, not a tuned number.

**Verify**: a unit test in `tests/swc-parser/patterns/props.test.ts` (or
`tests/utils/aggregator.test.ts`) feeding 25 distinct values asserts
`values.length === 20 && truncated === true`.

### Step 5: Surface it, and refresh baselines

Add `componentProps` to the JSON payload (`src/utils/print-json.ts`) and to
`HermexScanResult` (`src/index.ts`). Add a `usage.props` bucket to
`src/utils/pattern-counter.ts` if plan 031 has not already added one.

Add fixtures under `fixtures/` covering: a literal string prop, a numeric prop,
a boolean shorthand, a zero-interpolation template, an interpolated template
(unresolvable), a ternary of two literals, a spread, and the same component used
twice in one file with **different** props — that last one is the regression
fixture for the last-write-wins bug.

Add a `fixtures/cases.ts` entry with a `proves` string naming what a reviewer
should confirm.

```bash
pnpm run test:output
```

Baselines **will** move — `usage.jsx` counts change (Step 1) and a new payload
section appears. Inspect carefully, confirm the jsx count now equals actual
element count in the fixtures, then `--update`.

**Verify**: re-run → `0 changed`, `0 unexpected`, no invariant breaches.

### Step 6: Prove accuracy, which is what #113 is blocked on

Write down, in the PR description, the measured accuracy against the fixture
corpus: how many props resolved to an exact value, how many to candidates, how
many were dynamic, and the categories of the dynamic ones.

[#113](https://github.com/Gallevy/hermex/issues/113) is blocked on props being
**accurate**, not merely present. A number a reviewer can argue with is the
deliverable of this step; "it works on the fixtures" is not.

**Verify**: the PR description contains the four counts.

## Test plan

New file `tests/swc-parser/patterns/props.test.ts` — **none exists today**;
props are only exercised incidentally via `jsx-unit.test.ts` and the
`jsx.test.tsx` snapshot. Structural pattern:
`tests/swc-parser/patterns/variables.test.ts`.

Cases: each resolution rule from Step 2 (one test each); the two-usages-in-one-file
regression; spread marks `hasSpread`; the 20-value cap; event-handler detection
survives the refactor.

`tests/swc-parser/patterns/__snapshots__/jsx.test.tsx.snap` will need updating
after Step 1 — review the snapshot diff rather than blind-accepting it.

## Done criteria

ALL must hold:

- [ ] `pnpm run format:ci`, `lint:ci`, `typecheck`, `test:ci`, `build:ci` all exit 0
- [ ] `pnpm run test:output` → 0 changed, 0 unexpected, no invariant breaches
- [ ] `tests/swc-parser/patterns/props.test.ts` exists and passes
- [ ] A test proves two different usages of one component in one file both survive
- [ ] A test proves the 20-value cap sets `truncated`
- [ ] `grep -n "propsAnalysis.set" src/` returns no matches
- [ ] `grep -n "propsAnalysis" src/swc-parser/types.ts` shows it gone from `UsagePatterns`
- [ ] No rule was added (`git diff --stat src/rules/` is empty)
- [ ] Step 6's four accuracy counts are in the PR description
- [ ] A changeset exists (`--minor`)
- [ ] `plans/README.md` status row for 038 updated

## STOP conditions

Stop and report back if:

- The excerpts in "Current state" do not match the live code.
- [#103](https://github.com/Gallevy/hermex/issues/103) has been worked since
  this plan was written — it is a prototype ticket whose whole purpose is to
  decide this shape. **Its outcome supersedes this plan entirely.**
- Step 1's change to `jsxUsage` breaks component aggregation counts in a way
  that changes `packages[]` or `components[]` semantics rather than just
  numbers. That is a #78/#79 decision boundary.
- Payload size grows more than ~2× on the fixture corpus. Assumption 4 was meant
  to prevent that; if it did not, report before shipping.
- Attempting Step 2 requires reading SWC node shapes that
  `docs/research/swc-jsx-prop-values.md` does not describe.

## Maintenance notes

- **This plan will most likely be superseded.** #103 is a prototype ticket —
  the point of a prototype is to react to something concrete, and this is the
  concrete thing. Treat merged code here as a first draft with tests, not as
  #103 being resolved.
- Step 1 changes `usage.jsx` from distinct-components to element-occurrences.
  Anyone reading `patternCounts` across the 3.0.0 boundary sees a jump; it
  belongs in [#117](https://github.com/Gallevy/hermex/issues/117)'s migration
  notes and [#115](https://github.com/Gallevy/hermex/issues/115)'s contract.
- The 20-value cap is arbitrary. Whoever works #103 should replace it with a
  number derived from real repos, and consider making it configurable.
- Spread props make the prop set **open** — `hasSpread` means "this list is
  incomplete". Any rule built on props (#113) must treat a spread as unknown
  rather than absent, or `no-deprecated-prop-usage` will report false passes.
  That is the single most important thing for #113 to get right, and it is a
  rule concern, not an inventory one.
