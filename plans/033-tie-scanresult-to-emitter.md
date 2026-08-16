# Plan 033: Make the compiler enforce that `printJson` emits `HermexScanResult`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 688c481..HEAD -- src/index.ts src/utils/print-json.ts`
> If either changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (but if 031 is also queued, run 031 first — both touch
  the summary shape, and doing this second means the type is written once)
- **Category**: tech-debt / dx
- **Planned at**: commit `688c481`, 2026-08-15
- **Map ticket**: [#115 JSON output contract](https://github.com/Gallevy/hermex/issues/115), [#104 Public API](https://github.com/Gallevy/hermex/issues/104)

No assumption encoded — this changes no runtime behaviour and no output. It
only makes an existing, already-intended relationship checkable.

## Why this matters

`HermexScanResult` in `src/index.ts` is the **published** type describing
`hermex scan --format json`. It is hand-written. `printJson` builds the actual
payload as an untyped object literal. Nothing makes the compiler compare them,
so the type and the emitter can drift silently — and the plan history records
that this exact pair *has* drifted before (plan 029's notes: a
`HermexScanResult` field-coverage gap that had to be checked by a manual
line-by-line comparison).

v3 turns this payload into a semver-promised contract. A contract nobody can
mechanically check is a contract that will be broken by accident.

One `satisfies` annotation makes every future field rename, addition, or type
change a `pnpm run typecheck` failure instead of a silent break.

## Current state

**`src/utils/print-json.ts:26-57`** — the emitter. Note there is no type
annotation on `result`:

```ts
export function printJson(
  aggregated: AggregatedReport,
  compliance: ComplianceResult = computeCompliance(aggregated),
): void {
  const result = {
    version: getVersion(),
    summary: {
      filesAnalyzed: aggregated.filesAnalyzed,
      totalImports: aggregated.totalImports,
      totalComponents: aggregated.totalComponents,
      totalUsagePatterns: aggregated.totalUsagePatterns,
      patternCounts: aggregated.patternCounts,
    },
    packages: aggregated.packageDistribution,
    components: aggregated.topComponents.map((c) => ({
      ...c,
      files: [...c.files],
    })),
    versus: aggregated.versusResults,
    ruleViolations: aggregated.ruleViolations,
    compliance: {
      status: compliance.status,
      compliant: compliance.compliant,
      counts: {
        errorRuleViolations: compliance.errorRuleViolations.length,
        releaseAgeViolations: compliance.releaseAgeViolations.length,
        warningRuleViolations: compliance.warningRuleViolations.length,
      },
    },
  };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
```

**`src/index.ts:44-93`** — the published type, declared entirely independently:

```ts
/** Shape of a single entry in `components` — same as `ComponentUsage`, but with `files` as an array (JSON has no `Set`) */
export interface HermexScanComponent extends Omit<
  import('./utils/package-distribution').ComponentUsage,
  'files'
> {
  files: string[];
}

/** Shape of the JSON emitted by `hermex scan --format json` (see `printJson`) */
export interface HermexScanResult {
  version: string;
  summary: {
    filesAnalyzed: number;
    totalImports: number;
    totalComponents: number;
    totalUsagePatterns: number;
    patternCounts: import('./utils/pattern-counter').PatternCount[];
  };
  packages: import('./utils/package-distribution').PackageDistribution[];
  components: HermexScanComponent[];
  versus: import('./utils/versus').VersusResult[];
  ruleViolations: import('./rules/evaluator').RuleViolation[];
  compliance: {
    status: import('./utils/compliance').ComplianceStatus;
    compliant: boolean;
    counts: {
      errorRuleViolations: number;
      releaseAgeViolations: number;
      warningRuleViolations: number;
    };
  };
}
```

**The import-direction constraint.** `src/index.ts` is documented as the
library entry point that must **not** pull in CLI runtime code:

```ts
// src/index.ts:1-3
// Library entry point — safe to import from `hermex.config.ts` without
// pulling in any CLI runtime code (parsing, SWC, registry calls, etc.).
// `defineConfig` is the one runtime export; everything else is type-only.
```

So `print-json.ts` may import a **type** from `index.ts`, but `index.ts` must
never import a value from `print-json.ts`. A `import type` is erased at compile
time and does not violate this — that is the direction this plan uses.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm run test:ci` | all pass |
| Lint | `pnpm run lint:ci` | exit 0 |
| Format check | `pnpm run format:ci` | exit 0 |
| Build | `pnpm run build:ci` | exit 0 |
| Output review | `pnpm run test:output` | 0 changed |

## Scope

**In scope**:
- `src/utils/print-json.ts`
- `src/index.ts` — only if Step 2 reveals a genuine mismatch

**Out of scope** (do NOT touch):
- The emitted JSON. This plan must produce a **zero-diff** output review. If a
  baseline changes, something is wrong — see STOP conditions.
- `src/utils/compliance.ts`, `src/utils/aggregator-core.ts` — the source types.
- Adding new fields to the payload. Coverage fields are plan 036 /
  [#129](https://github.com/Gallevy/hermex/issues/129).

## Git workflow

- Branch: `advisor/033-tie-scanresult-to-emitter`
- Conventional commits, e.g. `refactor(json): make printJson satisfy HermexScanResult`
- Do NOT push or open a PR unless the operator instructed it.
- No changeset — no user-facing change.

## Steps

### Step 1: Annotate the emitter with `satisfies`

In `src/utils/print-json.ts`, add a type-only import and a `satisfies` clause.

Use `satisfies`, **not** a type annotation (`const result: HermexScanResult =`).
`satisfies` checks the literal against the type while preserving the literal's
own narrower inferred type, and — the reason it matters here — it reports
**excess** properties. A plain annotation would let the emitter add an
undeclared field silently, which is exactly one of the two drift directions this
plan is closing.

```ts
import type { HermexScanResult } from '../index';
```

and at the end of the object literal:

```ts
  } satisfies HermexScanResult;
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
```

**Verify**: `pnpm run typecheck`.

- **Exit 0** → the type and emitter already agree. Skip Step 2.
- **Errors** → a real drift exists. Go to Step 2. Record the errors verbatim in
  your report; they are the finding.

### Step 2: Resolve any mismatch the compiler reports

For each error, decide which side is wrong. The rule: **the emitter is the
truth about what ships**, so a field the emitter produces and the type omits
means the *type* is wrong; a field the type declares and the emitter never
produces means the *type* is wrong too (it promises something absent).

Fix `src/index.ts` to match `printJson`, not the other way round — changing the
emitter changes the published output, which this plan has scoped out.

The one exception: if the emitter is producing something clearly accidental
(a debug field, a leaked internal), STOP and report rather than blessing it in
the type.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 3: Prove the guard actually catches drift

Temporarily add a field to the emitter's literal that the type does not
declare:

```ts
    // TEMPORARY — remove before committing
    debugScratch: 1,
```

Run `pnpm run typecheck`. It **must fail** with an excess-property error naming
`debugScratch`. If it passes, the `satisfies` clause is not attached where you
think it is — most likely it is on an inner object rather than the outer
literal.

Remove the temporary field.

**Verify**: `pnpm run typecheck` → exit 0, and `grep -n "debugScratch" src/`
returns no matches.

### Step 4: Confirm zero output change

```bash
pnpm run test:output
```

**Verify**: `0 changed`, `0 unexpected`, no invariant breaches. A changed
baseline means Step 2 altered the emitter, which is out of scope — STOP.

## Test plan

No new runtime tests. The verification for this plan is the type system: Step 3
is the test, and `pnpm run typecheck` is the permanent gate.

`pnpm run typecheck` already runs in CI (`.github/workflows/pull-request.yaml`),
so no workflow change is needed for the guard to be enforced on every PR.

Note for context: `tsconfig.json` currently has `include: ["src/**/*", "scripts/**/*"]`,
so tests are not type-checked — but both files in scope here are under `src/`,
so this guard is covered. (Extending the include to `tests/` is plan 034.)

## Done criteria

ALL must hold:

- [ ] `pnpm run format:ci` exits 0
- [ ] `pnpm run lint:ci` exits 0
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run test:ci` exits 0
- [ ] `pnpm run build:ci` exits 0
- [ ] `pnpm run test:output` → **0 changed**, 0 unexpected
- [ ] `grep -n "satisfies HermexScanResult" src/utils/print-json.ts` returns 1 match
- [ ] `grep -n "debugScratch" src/` returns no matches
- [ ] Step 3 was actually performed and the typecheck failed as expected —
      state this explicitly in your report
- [ ] `git status` shows no modified files outside the Scope list
- [ ] `plans/README.md` status row for 033 updated

## STOP conditions

Stop and report back if:

- The excerpts in "Current state" do not match the live code.
- Step 4 shows any baseline changing — the emitter was modified and it should
  not have been.
- The `import type { HermexScanResult } from '../index'` creates a circular
  import that `tsdown` or `vitest` complains about. It should not — the import
  is type-only and erased — but if it does, report it rather than restructuring
  the module graph.
- Step 2 reveals more than two or three mismatches. That is a bigger drift than
  this plan assumed and a reviewer should see the list before it is papered
  over.
- Step 3's typecheck **passes** with the temporary field present.

## Maintenance notes

- After this lands, **any** change to `printJson`'s payload is a compile error
  until `HermexScanResult` is updated in the same commit. That is the point —
  reviewers should treat a diff touching only one of the two files as suspicious.
- `comply --format json` calls the same `printJson`, so the guard covers both
  commands. If [#105](https://github.com/Gallevy/hermex/issues/105) gives
  `explain` its own emitter, it needs its own published type and its own
  `satisfies` clause; this plan does not generalise automatically.
- `PackageDistribution`, `RuleViolation`, `VersusResult` and `PatternCount` are
  re-exported from `src/index.ts` and referenced by `HermexScanResult`, so they
  are already part of the public surface. [#104](https://github.com/Gallevy/hermex/issues/104)
  decides what semver promise attaches to them; this plan does not change what
  is exported, only that the emitter is checked against it.
- Deferred deliberately: a snapshot test of the full public `.d.mts` surface
  (an api-extractor-style report). That is [#104](https://github.com/Gallevy/hermex/issues/104)'s
  call and a larger piece of tooling than this fix warrants.
