# TypeScript strict-mode migration: blast-radius assessment

**Status**: measurement spike (plan 044) — no code or `tsconfig.json` changes
shipped as part of this document.

**Measured against**: `typescript@7.0.2` (TS7 Go-based RC), commit `b655b89`
(main at time of measurement, 2026-07-24). `tsconfig.json` was unchanged
since the plan was written (`a3b8f02`); `CONTRIBUTING.md` had already
picked up plan 035's correction ("strict mode is not enabled"), which does
not affect these measurements.

**Re-measure before acting on this report if `typescript` is upgraded from
7.0.2** — TS7's diagnostics may differ from stable TS 5.x for the same
source.

## Method

`tsconfig.json` currently pins `strict: false` plus five explicit `false`
overrides (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`,
`noFallthroughCasesInSwitch`, `noImplicitAny`). For each of the 8 flags
`strict: true` would turn on, and each of the 4 independent flags already
present as explicit `false` overrides, `tsconfig.json` was edited locally
(never committed) to enable exactly that one flag, `pnpm run typecheck`
(`tsc --noEmit`) was run, and `error TS` occurrences were counted from the
output. `tsconfig.json` was reverted to its committed state
(`git checkout -- tsconfig.json`) after every measurement; `git diff
tsconfig.json` was confirmed empty at the end. All 12 flags were measured
individually — no batching was needed since the codebase is small (63
source files) and each `tsc` run completes in a few seconds.

Baseline (`pnpm run typecheck` against the committed, unmodified
`tsconfig.json`): **exit 0, 0 errors** — confirmed at the start and again
at the end of this spike.

## Results: full per-flag error counts

### `strict`'s 8 sub-flags

| Flag | Error count (isolated) | Notes |
|---|---|---|
| `noImplicitAny` | **5** | 4 distinct locations (see below); the 5th count is a wrapped 2-line message counted once per code site — see breakdown |
| `strictNullChecks` | **0** | clean |
| `strictFunctionTypes` | **0** | clean |
| `strictBindCallApply` | **0** | clean |
| `strictPropertyInitialization` | **0** | TS requires `strictNullChecks` to also be on to enable this flag (`error TS5052` otherwise); measured with both on together — contributes 0 beyond `strictNullChecks`'s own 0. Confirms empirically (not just by convention) that the "no classes" rule in `CONTRIBUTING.md`/`CLAUDE.md` holds — there are no class property-initialization sites in `src/` to flag. |
| `noImplicitThis` | **0** | clean |
| `alwaysStrict` | **0** | clean (codebase is already all ES modules, implicitly strict) |
| `useUnknownInCatchVariables` | **0** | clean — no `catch` blocks access properties on the caught value without a type guard |

**Combined `strict: true`** (with the explicit `"noImplicitAny": false`
line removed, per the precedence rule): **1 error total** — *not* the sum
of the sub-flags above (5 + 0×7 = 5). Enabling `strictNullChecks`
alongside `noImplicitAny` changes control-flow-based type inference enough
that 4 of the 5 isolated `noImplicitAny` sites are inferred without error
when null-checking is also active, leaving only the third-party
missing-declaration error (`yarn.ts`, below). This is the kind of
non-additive interaction the plan anticipated ("won't be a simple sum, due
to overlapping errors").

### 4 independent (non-`strict`-umbrella) flags

| Flag | Error count (isolated) |
|---|---|
| `noUnusedLocals` | **0** |
| `noUnusedParameters` | **0** |
| `noImplicitReturns` | **0** |
| `noFallthroughCasesInSwitch` | **0** |

All four are already vacuously satisfied by the current code.

## Categorization (Step 4)

Only one flag (`noImplicitAny`) produced any errors at all, so the "sample
~15 per flag" instruction doesn't apply in the usual sense — instead, all
5 `noImplicitAny` errors (4 distinct code sites) are categorized
exhaustively below, and the `strict: true` combined run's 1 error is the
same `yarn.ts` site.

| # | Location | Category | Why |
|---|---|---|---|
| 1 | `src/config/schema.ts:56` — `internal: z.array(z.string()).default(() => ({ internal: [], ignore: [] }))` (two errors on this line: `internal` and `ignore` properties) | **Trivial** | The arrow function's returned object literal has empty-array properties (`[]`) that TS can't widen against the outer Zod schema without help; fix is a one-line type hint (e.g. move the default to a plain object literal `.default({ internal: [], ignore: [] })` instead of a thunk, or annotate the arrow's return type). No behavior at risk. |
| 2 | `src/config/schema.ts:134` — `enforceOn: []` inside a `.default(() => ({ ... }))` block | **Trivial** | Same pattern as #1 — empty-array property in an object-literal default. |
| 3 | `src/rules/script-rules.ts:32` — `matchedFiles: []` inside a `.map((rule) => ({ ... }))` return | **Trivial** | Same empty-array-literal pattern, this time in a `.map` callback's returned object rather than a Zod default. One-line annotation (e.g. `matchedFiles: [] as string[]`) resolves it. |
| 4 | `src/lock-parser/patterns/yarn.ts:3` — `import lockfile from '@yarnpkg/lockfile'` (`TS7016`, missing declaration file) | **Trivial** (mechanical, not a one-liner) | `@yarnpkg/lockfile` ships no types and no `@types/yarnpkg__lockfile` package exists. Fix is either a small local `declare module '@yarnpkg/lockfile'` ambient declaration file, or leaving it and instead adding a targeted `// @ts-expect-error` / narrower `any` cast at the one import site. Slightly more setup than #1-3 but still mechanical — no logic changes. This is the one error that survives into the combined `strict: true` run. |

**Real fix needed (null/undefined bugs)**: **none found.** `strictNullChecks`
measured 0 errors in isolation across all 63 files, and none of the other
7 `strict` sub-flags surfaced anything either. This spike found **no
evidence of a latent null/undefined bug** that strict mode would catch —
the strongest argument *for* strict mode (a real bug is caught) does not
apply here. This is a legitimate, checked-for outcome, not a gap in the
sample: it isn't a 15-error sample where null-handling issues might be
hiding, it's the *complete* population of `strictNullChecks` errors (zero).

**Structural**: none. Every error found requires only a local, one-line
(or one-file, for the `yarn.ts` ambient-declaration case) change; nothing
requires changing a function signature in a way that would propagate to
callers.

## Recommendation

**Recommend proceeding, but only for specific flags** — enable
`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`,
`strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`,
`alwaysStrict`, `useUnknownInCatchVariables`, `noUnusedLocals`,
`noUnusedParameters`, `noImplicitReturns`, and `noFallthroughCasesInSwitch`
— i.e., proceed with **all 12 measured flags**, because the measured cost
is genuinely tiny: 4 code sites total across the entire 63-file codebase,
all categorized Trivial, zero Structural, and zero Real-fix-needed. There
is no flag here where the cost is disproportionate to the value, because
the cost is close to zero everywhere except `noImplicitAny` (5 errors, 4
sites), which is itself trivial.

Suggested order for a follow-up implementation plan (cheapest and
highest-value first, per the plan's ordering guidance), even though in
this case nearly every flag ties at "zero cost":

1. **The 4 independent flags** (`noUnusedLocals`, `noUnusedParameters`,
   `noImplicitReturns`, `noFallthroughCasesInSwitch`) and **7 of the 8**
   `strict` sub-flags (`strictNullChecks`, `strictFunctionTypes`,
   `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`,
   `alwaysStrict`, `useUnknownInCatchVariables`) — all measured 0 errors,
   so enabling them is a zero-risk, zero-effort change. `strict: true`
   cannot be flipped as the umbrella and get all 8 "for free," though: the
   explicit `"noImplicitAny": false` line still needs its own decision
   (below), and `strictPropertyInitialization` still needs
   `strictNullChecks` on alongside it (a `tsc` hard requirement, not a
   choice).
2. **`noImplicitAny`** — 5 errors / 4 sites, all Trivial. Fix the 3
   empty-array-literal sites (`schema.ts:56` ×2, `schema.ts:134`,
   `script-rules.ts:32`) with a one-line annotation each, and resolve the
   `yarn.ts` third-party-types gap with a small ambient declaration file.
   Then enable.
3. Once all of the above are individually enabled and green, `strict:
   true` can replace the itemized sub-flags in `tsconfig.json` (removing
   the now-redundant explicit `false`/`true` lines for its 8 sub-flags),
   confirmed by re-running `pnpm run typecheck` at 0 errors — matching
   this spike's earlier finding that the combined run only ever surfaced
   the single `yarn.ts` site once `noImplicitAny`'s other 3 sites are also
   fixed.

**Note for the follow-up plan**: if it ships `strict: true` (or the
equivalent set of individual flags), it must flip `CONTRIBUTING.md`'s
type-safety paragraph — corrected by plan 035 to say strict mode is *not*
enabled — back to accurately describe whatever subset of strictness ships,
per this plan's maintenance notes.
