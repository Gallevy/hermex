# Plan 035: Record why every file was skipped, and let `comply` fail on degraded coverage

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 688c481..HEAD -- src/commands/ src/utils/print-json.ts src/utils/print-errors.ts src/config/schema.ts`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH — changes exit codes; a repo that passes CI today can start failing
- **Depends on**: none. If plan 033 is queued, run **033 first** — this plan adds
  fields to the JSON payload and 033 makes the compiler enforce the type, so
  doing 033 first means the new fields are type-checked as they are added.
- **Category**: bug / contract
- **Planned at**: commit `688c481`, 2026-08-15
- **Map ticket**: [#129 Degradation contract](https://github.com/Gallevy/hermex/issues/129), [#105 explain](https://github.com/Gallevy/hermex/issues/105)

> ### Assumptions this plan encodes
>
> [#129](https://github.com/Gallevy/hermex/issues/129) is an **open grilling
> ticket** — none of this is decided. This plan picks defensible defaults so
> there is something concrete to react to; treat every one as overturnable:
>
> 1. **Coverage is a separate axis from the verdict.** `ComplianceStatus` does
>    **not** gain a fourth state. A new `coverage` block sits beside
>    `compliance` in the JSON.
> 2. **Failing on degraded coverage is opt-in, default off.** New config
>    `coverage.failOn: ('parseError' | 'registryError')[]`, default `[]`. This
>    keeps every currently-passing repo passing.
> 3. **A new exit code 3** means "could not evaluate", distinct from 1
>    ("evaluated and failed") and 2 ("hermex itself errored").
> 4. **The per-file disposition record is always built**, not only under
>    `explain`. It is cheap (one entry per discovered file) and #105 needs the
>    same data.
>
> If #129 decides differently, Steps 1–2 (the record) almost certainly survive;
> Steps 3–5 (the verdict) are the parts that would be rewritten.

## Why this matters

hermex is a compliance gate that currently exits 0 when it could not read the
code it was asked to check. Three verified ways:

1. **Unparseable files.** The committed baseline
   `tests/__output_baselines__/parse-errors/` records `Analyzed 0/1 files` with
   **exit code 0**. Every rule then evaluates against zero files and passes.
2. **Registry failures.** `fetchPackageInfo` swallows timeouts, 404s and network
   errors alike into `null`; they become a `skipped` count mentioned only on the
   spinner. A registry outage silently turns every release-age rule into a no-op.
3. **Files never offered to the parser.** Declaration files are filtered out
   before parsing with nothing recorded.

None of it reaches `--format json`, so a CI consumer cannot tell a clean run
from one that read nothing.

## Current state

**`src/commands/pipeline.ts:49-92`** — discovery, the `.d.ts` filter, and the
parse loop. Note `discovered` is filtered into `files` and the difference is
discarded:

```ts
  const discovered = await findFiles(resolvedConfig.includes, resolvedConfig.excludes);
  const files = discovered.filter((f) => !isDeclarationFile(f));

  if (files.length === 0) {
    spinner.fail(chalk.red(`No files found matching includes: ${resolvedConfig.includes.join(', ')}`));
    return null;
  }
  ...
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    ...
    try {
      const report = parseFile(file);
      if (report) { reports.push(report); }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      parseErrors.push({ file, message });
    }
  }
  spinner.succeed(chalk.green(`Analysis complete! Analyzed ${reports.length}/${files.length} files`));
  printErrors(parseErrors, isJson);
```

`parseErrors` is printed and then **dropped** — it never reaches
`aggregateReports` or the returned `AggregatedReport`.

**`src/commands/pipeline.ts:114-127`** — the registry skip count, also dropped:

```ts
  if (resolvedConfig.releaseAge.enabled) {
    const { enriched, skipped } = await enrichWithReleaseAge(...);
    aggregated.packageDistribution = enriched;
    spinner.succeed(chalk.blue(`Release age fetched${skipped > 0 ? chalk.gray(` (${skipped} packages skipped — registry unreachable or not found)`) : ''}`));
  }
```

**`src/npm-registry/client.ts:27-34`** — every failure mode collapses to `null`:

```ts
    if (!response.ok) return null;
    const data = (await response.json()) as RegistryPackageInfo;
    return data;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
```

**`src/commands/comply.ts:103-108`** — the exit codes today: 0 compliant,
1 non-compliant, 2 hermex error.

**`src/utils/print-json.ts:30-55`** — no coverage information in the payload.

**Convention**: `ParseError` is `{ file: string; message: string }`
(`src/swc-parser/types.ts:145-148`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm run test:ci` | all pass |
| Lint | `pnpm run lint:ci` | exit 0 |
| Format check | `pnpm run format:ci` | exit 0 |
| Build | `pnpm run build:ci` | exit 0 |
| Output review | `pnpm run test:output` | see Step 6 |

## Scope

**In scope**:
- `src/commands/pipeline.ts`, `src/commands/comply.ts`, `src/commands/scan.ts`
- `src/utils/aggregator-core.ts` (add the coverage field to `AggregatedReport`)
- `src/utils/print-json.ts`, `src/index.ts` (the published type)
- `src/config/schema.ts` (the `coverage` config block)
- `src/npm-registry/{client,enricher}.ts` (distinguish 404 from transport failure)
- `tests/` — new and updated tests
- `fixtures/cases.ts` + `fixtures/configs/` — new output-review cases
- `tests/__output_baselines__/` via `pnpm run test:output -- --update`

**Out of scope** (do NOT touch):
- `ComplianceStatus` and `computeCompliance` (`src/utils/compliance.ts`) —
  assumption 1 keeps coverage off the verdict axis. Changing it is #129's call.
- `explain` — the command does not exist yet. This plan builds the data #105
  will need; it does not build the command.
- Retrying failed registry requests. Distinguishing failure kinds is in scope;
  a retry policy is a separate decision.
- The `.d.ts` skip itself — it stays; only the *recording* is added.

## Git workflow

- Branch: `advisor/035-coverage-record-and-verdict`
- One commit per step; conventional commits, e.g.
  `feat(coverage): record why each discovered file was not analyzed`
- Do NOT push or open a PR unless the operator instructed it.
- Breaking (new exit code, new config) → `pnpm changeset add --major hermex -m "..."`.

## Steps

### Step 1: Define the coverage record

Add to `src/swc-parser/types.ts` (next to `ParseError`) or a new
`src/utils/coverage.ts` — prefer the latter, it is a new concern:

```ts
export type SkipReason = 'declaration-file' | 'parse-error' | 'read-error';

export interface SkippedFile {
  file: string;
  reason: SkipReason;
  /** Present for 'parse-error' and 'read-error'. */
  message?: string;
}

export interface CoverageReport {
  filesDiscovered: number;
  filesAnalyzed: number;
  filesSkipped: SkippedFile[];
  /** Packages whose registry lookup did not return usable data. */
  registrySkipped: { packageName: string; reason: 'not-found' | 'unreachable' }[];
}
```

**Verify**: `pnpm run typecheck` → exit 0.

### Step 2: Populate it in the pipeline

In `src/commands/pipeline.ts`:

- Keep `discovered`; for each file filtered out by `isDeclarationFile`, push
  `{ file, reason: 'declaration-file' }`.
- In the parse loop's `catch`, push `{ file, reason: 'parse-error', message }`
  **in addition to** the existing `parseErrors.push` (keep `printErrors`
  working unchanged).
- Fix the misleading empty-files message: when `discovered.length > 0` but
  `files.length === 0`, say so — every discovered file was a declaration file,
  which is not "no files found matching includes".
- Add `coverage` to the returned `AggregatedReport`
  (`src/utils/aggregator-core.ts` interface + `aggregateReports` return, or set
  it in the pipeline after aggregation — prefer setting it in the pipeline,
  since that is where the numbers live).

**Verify**: `pnpm run typecheck` → exit 0; `pnpm run test:ci` → all pass.

### Step 3: Distinguish registry failure kinds

In `src/npm-registry/client.ts`, return a discriminated result instead of
`null`:

```ts
export type FetchResult =
  | { ok: true; data: RegistryPackageInfo }
  | { ok: false; reason: 'not-found' | 'unreachable' };
```

`response.status === 404` → `not-found`; any other non-ok status, a thrown
error, or an abort → `unreachable`.

Thread it through `getPackageInfo` (`src/npm-registry/cache.ts:91-109`) and
`enrichWithReleaseAge` (`src/npm-registry/enricher.ts:378-433`), so the enricher
returns the per-package reasons rather than a bare `skipped` number. Keep the
`skipped` count for the existing spinner line.

**This changes internal signatures.** `tests/npm-registry/client.test.ts` and
`tests/npm-registry/enricher.test.ts` will need updating.

**Verify**: `pnpm run test:ci -- tests/npm-registry/` → all pass.

### Step 4: Emit coverage in the JSON

In `src/utils/print-json.ts`, add a `coverage` block beside `compliance`, and
mirror it in `HermexScanResult` (`src/index.ts`). Keep `summary.filesAnalyzed`
where it is — removing it is a gratuitous break.

```ts
    coverage: {
      filesDiscovered: aggregated.coverage.filesDiscovered,
      filesAnalyzed: aggregated.coverage.filesAnalyzed,
      filesSkipped: aggregated.coverage.filesSkipped,
      registrySkipped: aggregated.coverage.registrySkipped,
      degraded: aggregated.coverage.filesSkipped.some((s) => s.reason !== 'declaration-file')
        || aggregated.coverage.registrySkipped.length > 0,
    },
```

`degraded` is deliberately false for declaration-file skips — those are expected
and not a coverage problem.

**Verify**: `pnpm run typecheck` → exit 0. If plan 033 has landed, the
`satisfies HermexScanResult` clause enforces this automatically.

### Step 5: Add the opt-in gate

Add to `src/config/schema.ts`:

```ts
  coverage: z
    .object({
      failOn: z.array(z.enum(['parseError', 'registryError'])).default([]),
    })
    .default(() => ({ failOn: [] })),
```

In `src/commands/comply.ts`, after computing compliance: if
`config.coverage.failOn` includes a category that has entries, set
`process.exitCode = 3` and print a distinct verdict line naming what could not
be evaluated. Exit 3 takes precedence over 0 but **not** over 1 — a repo that is
both non-compliant and degraded reports the non-compliance.

Document the exit codes in `README.md` (`0` pass, `1` violations, `2` hermex
error, `3` degraded coverage).

**Verify**: `pnpm run typecheck` → exit 0.

### Step 6: Output-review cases

The `parse-errors` case already exists and its exit code is currently 0. Add:

1. A new fixture config setting `coverage.failOn: ['parseError']` over the same
   `broken/` fixture, as a new case `comply-coverage-fail` with `expectExit: 3`.
2. Confirm the existing `parse-errors` case still exits 0 (default `failOn: []`
   preserves today's behaviour — this is the proof the change is opt-in).

Follow `fixtures/cases.ts`'s existing entry shape, including a `proves` string
written for someone who has not read the file.

```bash
pnpm run test:output
```

Existing baselines **will** change — every JSON case gains a `coverage` block.
Inspect, confirm, then `pnpm run test:output -- --update`.

**Verify**: re-run → `0 changed`, `0 unexpected`, no invariant breaches.

## Test plan

- `tests/commands/` (create if absent) — unit tests for the coverage record:
  declaration files recorded with reason `declaration-file`; a parse failure
  recorded with `parse-error` and a message; `filesDiscovered` ≥ `filesAnalyzed`.
- `tests/npm-registry/client.test.ts` — 404 yields `not-found`; a network
  failure and a timeout each yield `unreachable`.
- `tests/e2e/cli.test.ts` — a comply run with `coverage.failOn: ['parseError']`
  over the broken fixture exits 3; the same run without it exits 0.
- Structural pattern: `tests/rules/evaluator.test.ts` for unit style,
  `tests/e2e/cli.test.ts` for CLI style.

## Done criteria

ALL must hold:

- [ ] `pnpm run format:ci`, `lint:ci`, `typecheck`, `test:ci`, `build:ci` all exit 0
- [ ] `pnpm run test:output` → 0 changed, 0 unexpected, no invariant breaches
- [ ] `cat tests/__output_baselines__/parse-errors/exit-code.txt` still reads `0`
      (default behaviour unchanged)
- [ ] The new `comply-coverage-fail` baseline's `exit-code.txt` reads `3`
- [ ] Every JSON baseline contains a `coverage` block
- [ ] `README.md` documents exit codes 0/1/2/3
- [ ] A major changeset exists under `.changeset/`
- [ ] `git status` shows no modified files outside the Scope list
- [ ] `plans/README.md` status row for 035 updated

## STOP conditions

Stop and report back if:

- The excerpts in "Current state" do not match the live code.
- [#129](https://github.com/Gallevy/hermex/issues/129) has been resolved since
  this plan was written — **read its resolution first**; it supersedes the
  assumptions box and this plan may need rewriting before execution.
- Threading `FetchResult` through the enricher requires changing
  `computeReleaseAge`'s signature — that function is dense and heavily
  documented around #21/#26/#28/#29/#57/#62; report before touching it.
- The existing `parse-errors` baseline's exit code changes from 0. The gate is
  opt-in; if the default changed, Step 5 is wrong.
- More than a handful of existing tests need behavioural (not signature)
  changes.

## Maintenance notes

- **This is the plan most likely to be invalidated by its own ticket.** #129 is
  an open grilling ticket and the assumptions box exists so a reviewer can
  reject them cheaply. Do not treat merged code here as settling #129.
- `CoverageReport.filesSkipped` is the record [#105](https://github.com/Gallevy/hermex/issues/105)'s
  `explain file` needs. Building it once here is deliberate — building it twice
  would guarantee the two disagree.
- Config-excluded files are **not** recorded. `findFiles` passes `excludes`
  straight to `glob` (`src/utils/file-utils.ts:14-18`), so nothing knows which
  files a pattern removed. Answering "excluded by which pattern?" means globbing
  twice (with and without excludes) and diffing — real cost on a large repo, and
  a decision #105 should make rather than this plan.
- A reviewer should check that exit 3 never masks exit 1. A repo with both real
  violations and degraded coverage must report the violations.
