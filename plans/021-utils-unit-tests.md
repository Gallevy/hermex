# Plan 021: Unit tests for package-distribution, versus, pattern-counter, package-rules

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 19a4695..HEAD -- src/utils/package-distribution.ts src/utils/versus.ts src/utils/pattern-counter.ts src/utils/package-rules.ts tests/utils/`
> If these files changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `19a4695`, 2026-07-04

## Why this matters

The aggregator refactor (commit 9996f9e) split four modules out of
`aggregator.ts`. They are exercised only *through* `aggregateReports` in
`tests/utils/aggregator.test.ts` — none has a dedicated test file. These
modules carry the product's judgment calls (how imports resolve to packages,
how versus percentages are computed, which packages violate rules); a
behavior change in any of them currently surfaces, at best, as a confusing
aggregator-test failure, and at worst not at all.

## Current state

All four are pure, stateless functions — the easiest kind to test.

- `src/utils/package-distribution.ts` — exports `ComponentUsage`,
  `PackageDistribution`, `calculatePackageDistribution(componentUsageMap,
  versions, config?, multiVersions?)` and `findComponentSource(componentName,
  report, availablePackages)`. Also contains the private
  `resolvePackageFromImportPath` (paths starting `.`/`/` → `'local'`;
  read the file for the full resolution rules before writing assertions).
- `src/utils/versus.ts:22-49` — `calculateVersusResults(distribution,
  versusConfigs)`; entries get `count` from `usageCount`, percentage of the
  versus total, sorted descending; missing packages get `count: 0`.
- `src/utils/pattern-counter.ts` — `countPatterns(report, patternMap)`
  increments 16 keys like `'usage.jsx'` from `report.patterns.*` lengths;
  `getPatternDisplayName(type)` maps keys to display names, falling back to
  the key itself.
- `src/utils/package-rules.ts:13-68` — `detectBannedPackages(distribution,
  config?)` (first matching forbid rule wins per package, `break` on match)
  and `detectRequiredPackages(distribution, versions, config?)` (a require
  rule is satisfied if any pattern matches any installed name; violation has
  `type: 'require_packages'` and `matchedFiles: []`).

**Test conventions and helpers**:
- `tests/helpers/mock-reports.ts` — `createMockReport(overrides)`,
  `createMockPackage(name, overrides)` (returns a full
  `PackageDistribution`), `createMockReleaseAge(overrides)`.
- Style exemplar: `tests/utils/compliance.test.ts` (vitest,
  `describe`/`it`/`expect`, local `make*` helper for larger composites).
- Config shape: build minimal `HermexConfig`-typed objects only where needed;
  `detectBannedPackages` reads `config?.rules.forbid_packages`,
  `detectRequiredPackages` reads `config?.rules.require_packages`. Rules are
  `{ patterns: string[], severity: 'error'|'warn'|'info', message? }` —
  confirm exact rule fields in `src/config/types.ts` before writing (STOP if
  they differ materially from this description).

## Commands you will need

| Purpose   | Command                                  | Expected on success |
|-----------|------------------------------------------|---------------------|
| Tests     | `pnpm run test:ci -- --reporter=verbose` | new files listed, all pass |
| Typecheck | `pnpm run typecheck`                     | exit 0              |
| Lint      | `pnpm run lint`                          | exit 0              |

## Scope

**In scope** (create only):
- `tests/utils/package-distribution.test.ts`
- `tests/utils/versus.test.ts`
- `tests/utils/pattern-counter.test.ts`
- `tests/utils/package-rules.test.ts`

**Out of scope** (do NOT touch):
- Any `src/` file — characterization tests; on a surprising behavior, pin it
  and flag it in the commit message rather than "fixing" the source
- `tests/utils/aggregator.test.ts` — the integration layer stays as is
- `tests/helpers/mock-reports.ts` — extend only if a helper is genuinely
  missing, and keep additions additive

## Git workflow

- Branch: `advisor/021-utils-unit-tests`
- Commit message: `test: add unit tests for package-distribution, versus, pattern-counter, package-rules`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: package-distribution.test.ts

Read `src/utils/package-distribution.ts` fully first. Then cover at minimum:

- `findComponentSource`: component imported from a named import resolves to
  its package; unknown component → whatever the file's documented fallback is
  (read and pin it)
- `calculatePackageDistribution`: two components from the same package
  aggregate `componentCount`/`usageCount`; percentages sum to ~100 for
  external packages; relative-path imports land in `'local'` with
  `internal: true` (verify the flag's actual semantics in the file)
- version wiring: a package present in `versions` gets its version; absent →
  `version: null`
- multi-version: a package with 2 entries in `multiVersions` gets
  `hasVersionConflict: true` and `allVersions` populated (this behavior was
  fixed in commit 19a4695 — it is exactly the kind of regression these tests
  should pin)

### Step 2: versus.test.ts

- two packages with usage 30/10 → entries sorted [30, 10], percentages 75/25,
  `totalCount: 40`
- a configured package absent from the distribution → `count: 0`,
  `components: []`
- empty versus config → `[]`
- zero total usage → all percentages 0 (guards the `toPercentage` division)

### Step 3: pattern-counter.test.ts

- a `createMockReport` with one named import and two jsx usages →
  `patternMap` gets `imports.named: 1`, `usage.jsx: 2`
- calling `countPatterns` twice accumulates (Map values increment)
- `getPatternDisplayName('usage.jsx')` → `'JSX Usage'`; unknown key returns
  the key itself

### Step 4: package-rules.test.ts

- `detectBannedPackages`: pattern `'moment'` flags a `moment` package with
  the rule's severity/message; glob pattern (`'@legacy/*'`) matches scoped
  packages; first matching rule wins when two rules match; no config → `[]`
- `detectRequiredPackages`: rule satisfied by lockfile `versions` key even if
  not in distribution; satisfied by distribution packageName even if not in
  versions; unsatisfied rule yields a violation with `type:
  'require_packages'`, the rule's patterns, and `matchedFiles: []`

### Step 5: Full suite

```
pnpm run test:ci && pnpm run typecheck && pnpm run lint
```

All exit 0.

## Test plan

The steps above ARE the plan: ~20 tests across 4 files, all pure-function
characterization, using `createMockPackage`/`createMockReport` where a full
composite is needed.

## Done criteria

- [ ] The 4 test files exist under `tests/utils/`
- [ ] `pnpm run test:ci` exits 0; new tests listed and passing; none skipped
- [ ] `pnpm run typecheck` and `pnpm run lint` exit 0
- [ ] No `src/` files modified (`git status`)
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- The rule config shape in `src/config/types.ts` differs materially from the
  description in "Current state" (e.g. `patterns` is not an array) — report
  before guessing.
- A behavior you must pin looks like a genuine bug (e.g. percentages that
  don't sum, a rule matching that ignores severity). Pin the current behavior
  in the test, and STOP to report the suspected bug — do not fix the source.

## Maintenance notes

- These are the safety net for future changes to distribution/rules logic —
  the next refactor of these modules should run them first.
- If Plan 017 landed, `ComponentUsage.files` is populated; these tests don't
  assert on `files` (that's covered in aggregator tests) — keep it that way
  to avoid coupling.
