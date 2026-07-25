# Plan 040 (design/spike): SARIF output format for `comply`

> **Executor instructions**: This is a **design/spike plan**, not a
> build-everything plan. Its job is to produce a written design (API shape,
> open questions, a working prototype behind a flag or in a scratch branch)
> that the maintainer can review before committing to shipping it. Do not
> wire the new format into the default CLI surface or update docs presenting
> it as a shipped feature — that's a follow-up plan once the design is
> approved. If anything in "STOP conditions" occurs, stop and report.
>
> **Drift check (run first)**:
> `git diff --stat a3b8f02..HEAD -- src/utils/print-json.ts src/config/schema.ts src/commands/comply.ts`
> If these files changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P3 (direction — maintainer-optional)
- **Effort**: L (design spike) — a full implementation is a separate,
  larger follow-up once this spike's design is reviewed
- **Risk**: LOW (spike produces a design + prototype, not shipped behavior)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `a3b8f02`, 2026-07-24

## Why this matters (product framing, not a bug)

`hermex comply` already gates CI and reports structured violations
(`RuleViolation[]`, `BannedPackageViolation[]`, release-age breaches) with a
JSON output mode (`output.format: 'json'`). Teams running `comply` in
GitHub Actions today get pass/fail + a text/JSON report, but not native
GitHub code-scanning annotations — that requires SARIF
(Static Analysis Results Interchange Format), the standard GitHub Actions'
`upload-sarif` action consumes to turn violations into inline PR
annotations and the Security tab's code-scanning alerts. This would let
`comply` violations show up exactly where a human reviewer is already
looking (the PR diff), without a team writing their own glue script to
translate JSON into annotations. This is a **maintainer-optional feature
idea**, not a confirmed requirement — no user has requested it in an issue;
it's grounded in the fact that hermex already has a structured violation
model that maps naturally onto SARIF's `results` array.

## Current state

**`src/config/schema.ts:84-99`** (`output` schema) — `format` is currently
a closed enum:
```ts
  output: z
    .object({
      // ...
      format: z.enum(['human', 'json']).default('human'),
    })
```

**`src/utils/print-json.ts`** (full file, 24 lines) — the existing JSON
output shape, the closest analog to what a SARIF exporter would consume:
```ts
export function printJson(aggregated: AggregatedReport): void {
  const result = {
    version: getVersion(),
    summary: { /* ... */ },
    packages: aggregated.packageDistribution,
    components: aggregated.topComponents.map(/* ... */),
    patterns: aggregated.patternCounts,
    versus: aggregated.versusResults,
    ruleViolations: aggregated.ruleViolations,
    bannedPackageViolations: aggregated.bannedPackageViolations,
  };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
```

**`src/rules/shared.ts:5-25`** (`RuleViolation`) — the violation shape that
would need to map onto SARIF's `result` object (`ruleId`, `message`,
`locations[].physicalLocation.artifactLocation.uri`, `level`):
```ts
export interface RuleViolation {
  type: 'detect_files' | 'require_files' | /* ...7 more... */ | 'codeowners';
  severity: 'error' | 'warn' | 'info';
  patterns: string[];
  message?: string;
  matchedFiles: string[];
  installedRange?: string;
  requiredRange?: string;
  fieldPath?: string;
  actualValue?: string;
}
```
Note: `matchedFiles` is a flat array with no per-violation line/column —
SARIF's `physicalLocation` wants at least a file URI (`matchedFiles[i]`
maps directly) but has no natural line/column source from this shape (most
`hermex comply` violations are file- or package-level, not line-level,
unlike `hermex scan`'s per-occurrence `line` fields in `UsageReport`).

**`src/commands/comply.ts`** — where a `--format sarif` (or `output.format:
'sarif'`) branch would need to hook in, alongside the existing
`human`/`json` branches.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |

## Scope

**In scope for this spike**:
- A written design document (add it as `docs/design/sarif-output.md` — new
  file) covering the open questions in Step 2 below with concrete answers.
- A prototype `printSarif(aggregated: AggregatedReport): SarifLog` function
  in a scratch location (e.g. `src/utils/print-sarif.ts`) that produces
  valid SARIF 2.1.0 JSON for at least `ruleViolations`, validated against
  the official schema (Step 3).
- A handful of unit tests proving the prototype produces schema-valid
  output for representative violation types.

**Explicitly out of scope for this spike** (follow-up plan territory):
- Wiring `output.format: 'sarif'` into the zod schema as a shipped option.
- Wiring `printSarif` into `comply.ts`'s command handler.
- Documenting `sarif` as a supported format in README/docs/examples.md.
- `bannedPackageViolations` and release-age violations' SARIF mapping — the
  spike should note whether these map cleanly or need a different `ruleId`
  scheme (see Step 2), but doesn't have to implement all of them.

## Git workflow

- Branch: `advisor/040-sarif-spike`
- Commit message: `docs+spike: design SARIF output format for comply`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Read the SARIF 2.1.0 spec's minimal-conformance subset

Read (via WebFetch or your available tools) the SARIF 2.1.0 spec summary
sufficient to produce a minimally-conformant log: the top-level `$schema`/
`version`/`runs` structure, one `run` with a `tool.driver` (name, version,
`rules[]` — this is where hermex's rule *types*, e.g. `codeowners`,
`require_packages`, map to SARIF `reportingDescriptor`s), and `results[]`
(each with `ruleId`, `level`, `message.text`,
`locations[].physicalLocation.artifactLocation.uri`).

### Step 2: Answer these design questions in `docs/design/sarif-output.md`

Write the document covering, concretely (not "TBD"):
1. **Rule ID scheme**: what SARIF `ruleId` does each hermex `RuleViolation.type`
   map to? (e.g. `hermex/codeowners`, `hermex/require-packages` — must be
   stable across runs for GitHub's annotation deduplication to work.)
2. **Severity mapping**: hermex's `error`/`warn`/`info` → SARIF's
   `error`/`warning`/`note` (`level` field) — confirm this 1:1 mapping is
   right, or note any nuance (e.g. does `comply`'s exit-code semantics
   change what SARIF `level` should be used for a `warn`-severity
   violation that doesn't fail the build?).
3. **Location granularity**: for violations with only `matchedFiles` (no
   line/column — e.g. `require_package_fields`, `codeowners`), what's the
   SARIF-valid minimal `physicalLocation` (file URI, no region)? For
   `hermex scan`'s per-occurrence line data (unrelated to `comply` today,
   but worth noting for future scope) — is there a path to a line-level
   SARIF export later, or is that explicitly not planned?
4. **bannedPackageViolations and release-age violations**: these aren't
   `RuleViolation`s (different types — check
   `src/utils/package-rules.ts`'s `BannedPackageViolation` and
   `src/npm-registry/types.ts`'s `ReleaseAgeEntry`) — do they get their own
   `ruleId` namespace (e.g. `hermex/banned-package`,
   `hermex/release-age`), and what file do they attach to (there's no
   `matchedFiles` on these — `package.json`? nothing, tool-level only)?
5. **CLI surface**: `--format sarif` (matching the existing
   `--format human|json` option) vs. a new `output.format: 'sarif'` config
   value, or both? Recommend one, with reasoning.
6. **Where does the output go**: SARIF is typically written to a `.sarif`
   file for `upload-sarif`, not stdout — does this need a new
   `--sarif-file <path>` flag (mirroring `comply`'s existing
   `--summary-file`), or does the existing `--format` + stdout redirect
   pattern suffice? Recommend one.

### Step 3: Build the prototype and validate it

Implement `src/utils/print-sarif.ts` with a `buildSarifLog(aggregated:
AggregatedReport): object` function (pure, returns the SARIF object; do NOT
have it write to stdout/file — that's `comply.ts`'s job in the future
integration, out of scope here) covering `ruleViolations` per the mapping
decided in Step 2. Validate its output against the official SARIF 2.1.0
JSON schema (fetch the schema, or use an existing `ajv`-based validator if
one is easy to add as a **dev-only, temporary** dependency for this spike
— do not add a permanent runtime dependency for SARIF validation; if schema
validation requires a new package, note that as an open question for the
follow-up plan rather than adding it now).

**Verify**: a hand-constructed `AggregatedReport` with 2-3 representative
`ruleViolations` (one `codeowners`, one `require_package_fields` with a
`fieldPath`, one `engine_version`) produces SARIF output that validates
against the schema with zero errors.

### Step 4: Add prototype tests

Create `tests/utils/print-sarif.test.ts` (temporary — its fate depends on
whether the follow-up plan is written; leave it in place, it's harmless
dead-code-adjacent test coverage for the prototype either way) with 3-4
tests asserting the shape of `buildSarifLog`'s output for representative
inputs, following `tests/utils/compliance.test.ts`'s `makeAggregated`
helper pattern for constructing test input.

**Verify**: `pnpm run test:ci -- print-sarif` → all pass.

### Step 5: Full check

```
pnpm run typecheck && pnpm run test:ci && pnpm run lint
```

All exit 0.

## Test plan

3-4 unit tests (Step 4) proving the prototype produces schema-valid SARIF
for representative violation types. This is prototype-quality coverage, not
production-quality — the follow-up implementation plan should add real
coverage once the design is approved and the feature is actually wired in.

## Done criteria

- [ ] `docs/design/sarif-output.md` exists and answers all 6 design
      questions in Step 2 with concrete decisions (not open-ended "TBD")
- [ ] `src/utils/print-sarif.ts` exists with a working `buildSarifLog`
      prototype
- [ ] The prototype's output validates against the SARIF 2.1.0 schema for
      at least 3 representative violation types
- [ ] `pnpm run typecheck`, `pnpm run test:ci`, `pnpm run lint` all exit 0
- [ ] `output.format` in `src/config/schema.ts` is UNCHANGED (still
      `z.enum(['human', 'json'])`) — this spike does not ship the option
- [ ] `plans/README.md` status row updated to DONE, noting this was a
      design spike and whether a follow-up implementation plan should be
      written

## STOP conditions

- The SARIF schema validation step (Step 3) can't be completed without
  adding a permanent new runtime dependency — STOP and record this as an
  open question in the design doc rather than adding the dependency
  unilaterally; this is exactly the kind of decision the maintainer should
  make explicitly.
- You find that mapping `bannedPackageViolations`/release-age violations
  onto SARIF `results` requires a fundamentally different approach than
  `RuleViolation` (not just a different `ruleId` namespace) — document the
  difficulty in the design doc rather than forcing a mapping that doesn't
  fit.

## Maintenance notes

- If the maintainer approves this design, the follow-up implementation
  plan should: add `'sarif'` to the `output.format` zod enum, wire
  `buildSarifLog` into `comply.ts`, add a `--sarif-file` flag (or whatever
  Step 2 Q6 decided), and document it in `docs/examples.md` following the
  existing `--summary-file` documentation as a template.
- `docs/design/sarif-output.md` is new infrastructure for this repo (no
  `docs/design/` directory exists today) — if the maintainer likes this
  pattern, future direction spikes (plans 041-044 in this same batch) could
  adopt the same location.
