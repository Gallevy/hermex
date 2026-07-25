# Plan 041 (design/spike): Programmatic API surface for a GitHub Action integration

> **Executor instructions**: This is a **design/spike plan**, not a
> build-everything plan. Its job is to produce a written design and a
> working prototype of the missing piece, not a published GitHub Action.
> Do not create a `.github/actions/` directory or publish anything. If
> anything in "STOP conditions" occurs, stop and report.
>
> **Drift check (run first)**:
> `git diff --stat a3b8f02..HEAD -- src/index.ts src/commands/pipeline.ts src/commands/command-context.ts`
> If these files changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P3 (direction — maintainer-optional)
- **Effort**: L (design spike) — a full published Action is a separate,
  larger follow-up
- **Risk**: LOW (spike adds an opt-in export, doesn't change CLI behavior)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `a3b8f02`, 2026-07-24

## Why this matters (product framing, not a bug)

**Correction to the framing this direction item carried from prior audits**:
earlier notes described this as "the library entry point and typed JSON
result exist but nothing consumes them" — that undersells the actual gap.
Reading `src/index.ts` directly (see "Current state") shows it exports
**only types and `defineConfig`** — there is no exported function that
actually *runs* a scan and returns a `HermexScanResult`. The real pipeline
(`runPipeline` in `src/commands/pipeline.ts`) requires an `Ora` spinner
instance (`command-context.ts:24-40` constructs one, tied to
stdout/stderr and color handling) — it's CLI-shaped, not library-shaped.
So the actual missing piece for a GitHub Action (or any other programmatic
consumer) isn't packaging or publishing — it's a spinner-free, promise-based
`runScan(config): Promise<HermexScanResult>` function that doesn't exist
yet. This spike's job is to design and prototype that function; a published
Action is real but secondary follow-up work once the library surface
actually supports being called without a terminal attached.

## Current state

**`src/index.ts`** (full file, 66 lines) — today's entire public surface:
```ts
export type { HermexConfig, HermexConfigInput, /* ...9 more types... */ } from './config/types';
export function defineConfig(config: HermexConfigInput): HermexConfigInput {
  return config;
}
export type { PatternCount } from './utils/pattern-counter';
export type { ComponentUsage, PackageDistribution } from './utils/package-distribution';
export type { VersusResult, VersusEntry } from './utils/versus';
export type { RuleViolation } from './rules/evaluator';
export type { BannedPackageViolation } from './utils/package-rules';
export interface HermexScanComponent extends Omit</* ... */> { files: string[]; }
export interface HermexScanResult {
  version: string;
  summary: { /* ... */ };
  packages: PackageDistribution[];
  components: HermexScanComponent[];
  patterns: PatternCount[];
  versus: VersusResult[];
  ruleViolations: RuleViolation[];
  bannedPackageViolations: BannedPackageViolation[];
}
```
No function anywhere in this file produces a `HermexScanResult` — it's a
type contract with no implementation exposed.

**`src/commands/pipeline.ts:26-30`** (`runPipeline`'s signature) — the
actual pipeline, CLI-coupled:
```ts
export async function runPipeline(
  config: HermexConfig,
  spinner: Ora,
  isJson: boolean,
): Promise<AggregatedReport | null>
```
Requires a live `Ora` spinner (writes progress text to it throughout) and
returns `AggregatedReport` (the CLI-internal aggregate shape, which
currently still has the dead `reports` field — see plan 022 — and is a
different shape than the public `HermexScanResult`).

**`src/utils/print-json.ts`** — where `AggregatedReport` → the JSON shape
conversion already happens (see plan 040's "Current state" for the exact
mapping) — this is the closest existing code to what a
`AggregatedReport → HermexScanResult` converter would do, but it writes to
stdout rather than returning a value.

**`src/commands/scan.ts:48-68`** (`executeScan`) — shows the full current
call chain: `createCommandContext` (spinner) → `runPipeline` (spinner) →
`printJson`/`printScanResults` (stdout). A programmatic caller needs an
equivalent chain with the spinner and stdout writes replaced by nothing
(silent) or an injectable logger.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0              |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |

## Scope

**In scope for this spike**:
- A written design document (`docs/design/programmatic-api.md`) answering
  the open questions in Step 1.
- A prototype export from `src/index.ts` (or a new `src/programmatic.ts`
  re-exported from it — see Step 1 Q1) implementing a spinner-free
  `runScan`/`runComply`-style function, built by extracting the
  spinner-independent parts of `runPipeline` rather than duplicating pipeline
  logic.
- Unit tests proving the prototype produces a `HermexScanResult` for a
  representative fixture directory, with no spinner/stdout side effects.

**Explicitly out of scope for this spike** (follow-up plan territory):
- Publishing an actual GitHub Action (`.github/actions/`, `action.yml`,
  a separate npm package or Docker image).
- Changing `runPipeline`'s existing CLI-facing signature/behavior — the
  spike should *extract* shared logic, not break the CLI's current spinner
  UX.
- SARIF output for Action annotations — that's plan 040's territory; note
  the connection in the design doc but don't implement it here.

## Git workflow

- Branch: `advisor/041-programmatic-api-spike`
- Commit message: `docs+spike: design a spinner-free programmatic scan API for library consumers`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Answer these design questions in `docs/design/programmatic-api.md`

1. **Where does the split happen?** `runPipeline` interleaves pipeline logic
   (parse → aggregate → evaluate rules → enrich) with spinner progress
   calls (`spinner.start(...)`, `spinner.succeed(...)`) at ~6 points. Design
   options: (a) thread an optional, injectable progress callback
   `(event: PipelineEvent) => void` through `runPipeline` and have the CLI's
   `Ora`-based caller be one implementation, with a programmatic caller
   passing a no-op; or (b) extract a spinner-free `runPipelineCore` that
   `runPipeline` wraps with spinner calls around each stage. Recommend one,
   with reasoning — (a) is less invasive to `pipeline.ts`'s current
   structure, (b) is cleaner separation but touches more call sites.
2. **What does the programmatic function return?** `AggregatedReport` (the
   CLI-internal shape, currently has the dead `reports` field addressed by
   plan 022) or `HermexScanResult` (the already-public, JSON-shaped type)?
   Recommend `HermexScanResult` — it's already the intended public contract
   and doesn't leak CLI-internal fields; the conversion logic already
   exists in `print-json.ts` and should be extracted into a reusable
   `toScanResult(aggregated: AggregatedReport): HermexScanResult` function
   both `printJson` and the new programmatic API call.
3. **Rule violations and compliance**: does this new export cover `scan`
   only, or also `comply`'s exit-code semantics (`computeCompliance` in
   `src/utils/compliance.ts`)? A GitHub Action wrapping `comply` needs the
   compliant/non-compliant verdict, not just the raw violations list —
   recommend exposing both a `runScan(config): Promise<HermexScanResult>`
   and a `runComply(config): Promise<{ result: HermexScanResult; compliant:
   boolean }>` (or similar), reusing `computeCompliance`.
4. **Config loading**: does the caller pass an already-loaded
   `HermexConfig`, or a path/cwd for the new function to call `loadConfig`
   itself? Recommend accepting a pre-loaded `HermexConfig` (via
   `defineConfig`'s existing type) so a GitHub Action's `action.yml` inputs
   can be mapped directly into config fields without requiring a
   `hermex.config.ts` file to exist in the target repo — note this as an
   open question about whether `loadConfig` needs a variant that accepts
   inline config instead of only file discovery.
5. **Error handling contract**: `executeScan`'s CLI version catches
   pipeline errors and sets `process.exitCode = 1` with a printed message.
   What should the programmatic version do — throw, or return a
   discriminated-union result (`{ ok: true, result } | { ok: false, error
   }`)? Recommend throwing (idiomatic for a library function; the caller —
   e.g. an Action's `main.ts` — wraps it in its own try/catch), but record
   the alternative and why it was rejected.

### Step 2: Extract `toScanResult`

In `src/utils/print-json.ts` (or a new `src/utils/to-scan-result.ts` if
cleaner — your call, note which in the design doc), extract the
`AggregatedReport → HermexScanResult`-shaped object construction currently
inlined in `printJson` into a standalone, exported, pure function. Have
`printJson` call it and `JSON.stringify` the result, so behavior is
unchanged.

**Verify**: `pnpm run test:ci -- print-json` (or wherever existing
print-json tests live — check `tests/utils/print-utils.test.ts`) → passes
unchanged.

### Step 3: Prototype the programmatic entry point

Based on the Step 1 Q1 decision, implement a prototype `runScan(config:
HermexConfig): Promise<HermexScanResult>` (exported from a new
`src/programmatic.ts`, NOT yet re-exported from `src/index.ts` — keep it
addressable directly for the prototype/tests without changing the public
surface yet, pending maintainer review of the design). It should call
through to the real parsing/aggregation/rules pipeline with no spinner and
no stdout writes.

**Verify**: calling `runScan` against `fixtures/` (the repo's own test
fixture directory) returns a `HermexScanResult` with `summary.filesAnalyzed
> 0` and no console output.

### Step 4: Add prototype tests

Create `tests/programmatic.test.ts` with 2-3 tests: `runScan` against a
known fixture set returns the expected shape; it produces zero
`console.log`/`console.warn` output when the fixtures parse cleanly (spy on
`console.log`/`console.warn`, assert not called); it throws on truly
unrecoverable input (per Step 1 Q5's decision) rather than silently
returning a partial result.

**Verify**: `pnpm run test:ci -- programmatic` → all pass.

### Step 5: Full check

```
pnpm run build && pnpm run test:ci && pnpm run typecheck
```

All exit 0.

## Test plan

2-3 unit tests (Step 4) covering the prototype's shape, silence (no
spinner/console output), and error behavior. Plus Step 2's extraction must
not regress existing `print-json`-adjacent test coverage.

## Done criteria

- [ ] `docs/design/programmatic-api.md` exists and answers all 5 design
      questions in Step 1 with concrete decisions
- [ ] `toScanResult` (or equivalently named) is extracted and reused by
      `printJson`, with existing tests passing unchanged
- [ ] `src/programmatic.ts` (or wherever Step 1 Q1 decided) has a working
      `runScan` prototype with passing tests
- [ ] `pnpm run build`, `pnpm run test:ci`, `pnpm run typecheck` all exit 0
- [ ] `src/index.ts`'s current exports are UNCHANGED — this spike does not
      expand the shipped public API yet
- [ ] `plans/README.md` status row updated to DONE, noting this was a
      design spike and whether a follow-up implementation + Action
      publishing plan should be written

## STOP conditions

- Extracting spinner-free pipeline logic from `runPipeline` turns out to
  require touching more than the 6 spinner call sites (e.g. spinner state
  is read, not just written, somewhere in the pipeline logic) — STOP and
  report the actual coupling found; the design doc's Q1 answer may need
  revision.
- `computeCompliance` (for the `runComply`-equivalent from Q3) turns out to
  depend on CLI-only state not available to a programmatic caller — STOP
  and report what's missing.

## Maintenance notes

- If this design is approved, the follow-up plan should: re-export
  `runScan`/`runComply` from `src/index.ts` (moving them out of the
  internal `src/programmatic.ts` staging location), update
  `runPipeline`/`executeScan`/`executeComply` to reuse the extracted
  spinner-free core instead of duplicating pipeline logic, and only then
  build the actual GitHub Action wrapper (a thin `action.yml` +
  entrypoint script mapping Action inputs to `HermexConfig` and Action
  outputs/annotations to `HermexScanResult`).
- This connects to plan 040 (SARIF): a GitHub Action's most useful output
  format for PR annotations is SARIF, not the raw `HermexScanResult` JSON —
  the two follow-up plans (SARIF export, Action publishing) will likely
  want to land together or in SARIF-then-Action order.
