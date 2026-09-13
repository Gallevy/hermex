# `/improve` audit — 2026-08-15, commit `688c481`

Resolves [#111](https://github.com/Gallevy/hermex/issues/111) on the
[hermex v3 wayfinder map](https://github.com/Gallevy/hermex/issues/100).

Read-only audit of the whole repository, performed directly rather than via
subagents. Every finding below was vetted by re-reading the cited code before
being triaged; measured numbers were taken from committed baselines or from a
live run of the named dependency, not inferred.

No source code was modified. `node_modules` was not installed in the audit
worktree, so no build or test run was performed — the two findings that would
have needed one are marked MED confidence with their verification step stated.

**Triage outcome:** 13 findings — 1 graduated into a new ticket, 12 folded onto
existing tickets, 6 rejected (one of them a retraction of half of finding 9 —
see the correction there). Full per-finding disposition in the
[resolution comment](https://github.com/Gallevy/hermex/issues/111#issuecomment-5298721028).

**Plans.** Nine of these findings were subsequently written up as executor plans
under [`plans/`](../../plans/README.md) — 030 to 038 — at the maintainer's
request. Six of the nine encode an **assumption** about a decision the owning
map ticket has not made yet; each states it in an "Assumptions this plan
encodes" box in its header. Read that box before executing, and treat a merged
plan as a first draft with tests, not as the owning ticket being resolved.

---

## Graduated

### [#129] Degradation contract: when is a run untrustworthy, and does comply say so

hermex degrades silently in three independent places, and `comply` exits 0 in
all three. For a governance gate, a green run over a repo hermex could not read
is worse than a red one.

1. **Unparseable files.** `src/commands/pipeline.ts:75-84` catches every parse
   failure into `parseErrors`, prints them, and continues. The committed
   baseline `tests/__output_baselines__/parse-errors/` records
   `Analyzed 0/1 files` with **exit code 0**. Every rule then evaluates against
   zero files and passes.
2. **Registry failures.** `src/npm-registry/client.ts:31-34` swallows timeouts,
   404s and network errors alike into `null`; `enricher.ts:388-391` counts them
   as `skipped`; `pipeline.ts:122-126` mentions the count on the spinner only.
   A registry outage turns every release-age rule into a no-op.
3. **Files never offered to the parser.** `pipeline.ts:53` drops
   `.d.ts`/`.d.mts`/`.d.cts` before parsing and records nothing.

None of it reaches the JSON: `src/utils/print-json.ts` emits neither
`parseErrors` nor `skipped`, and `summary.filesAnalyzed` is `reports.length`
with no `filesDiscovered` / `filesFailed` beside it.

Nothing on the map owned this. [#105](https://github.com/Gallevy/hermex/issues/105)
makes coverage *diagnosable*; this decides whether it is *enforced*.

---

## Folded onto existing tickets

### 1 — Config typos are silently stripped → [#114](https://github.com/Gallevy/hermex/issues/114)

`HermexConfigSchema` (`src/config/schema.ts:76`) is a plain `z.object()` with no
`.strict()`, so zod strips anything it does not recognise. Verified against the
installed `zod@4.4.3`:

```
S.safeParse({ rulez: { forbid_packagez: [...] } })
  → success: true, data: { rules: { forbid_packages: [] } }
```

A misspelled rule key parses clean, yields defaults, and `comply` exits 0 having
enforced nothing.

Same class one level up: `src/config/loader.ts:21` does
`HermexConfigSchema.parse(mod.default ?? mod)`, so a config authored as
`export const config = {...}` (no default export) hands zod the module namespace
object, which strips to **all defaults** rather than erroring.

Related, same ticket:

- **The supported-extension table lives in three places and they disagree.**
  Default `includes` is `**/*.{tsx,jsx,ts,js}` (`schema.ts:77`); parser options
  cover `.ts`/`.tsx`/`.jsx` and fall through to ECMAScript
  (`src/swc-parser/index.ts:10-40`); the declaration-file skip knows about
  `.mts`/`.cts` (`pipeline.ts:17`). A user who adds `.mts` to `includes` gets
  every such file parsed as ECMAScript, so any TypeScript syntax in them fails.
- **`src/config/loader.ts` has zero test coverage.** `loadConfig` is imported by
  no test in `tests/`.

### 2 — No imported axis in the inventory → [#108](https://github.com/Gallevy/hermex/issues/108)

The ticket's premise — "hermex already resolves imports to packages, so both
sides of the comparison exist" — is half true.

The declared side exists (`collectDeclaredPackages`, `src/rules/shared.ts:99-120`).
The used side does not: `aggregateReports` builds `componentUsageMap`
exclusively from `report.patterns.usage.jsx`
(`src/utils/aggregator-core.ts:63-101`), and `report.patterns.imports` is
consulted only to attribute a *JSX component* back to a source
(`findComponentSource`, `src/utils/package-distribution.ts:65-95`).

So `usageCount` and `componentCount` measure **JSX rendering**, not importing:

- `lodash`, `date-fns`, `zod` all read `usageCount: 0`; `isUsed()` returns false
  (`src/utils/package-inventory.ts:225-227`).
- A repo with no JSX produces an inventory whose entire used axis is empty.
- The code already knows — `package-distribution.ts:104-108` documents this
  exact symptom, and #78 worked around it by switching the packages *table* to
  `isOwnedByRepo`. That made the table honest; it did not add the axis.

The same missing axis is what `explain package` needs for its headline answer
("imported in 0 files") and what would make `no-unused-dependency` evaluable.

### 3 — `summary` does not add up, twice → [#115](https://github.com/Gallevy/hermex/issues/115)

Measured against the committed baseline
`tests/__output_baselines__/scan-json/stdout.json`:

| | value |
|---|---|
| `summary.totalUsagePatterns` | **284** |
| Σ `summary.patternCounts[].count` | **220** |
| `summary.totalImports` | **80** |
| Σ the four `imports.*` pattern counts | **86** |

- **284 vs 220** — `calculateTotalPatterns` (`src/swc-parser/core/report.ts:64-71`)
  sums the size of *every* collection on `state.usagePatterns`, which includes
  `propsAnalysis`; `countPatterns` (`src/utils/pattern-counter.ts:9-65`)
  enumerates sixteen buckets and does not count props. The gap is exactly
  `propsAnalysis.size`.
- **80 vs 86** — `analyzeNamedImport` (`src/swc-parser/patterns/imports.ts:77-91`)
  adds an aliased import to **both** `namedImports` and `aliasedImports`.
  `totalImports` correctly excludes aliased; `patternCounts` reports
  `imports.named` and `imports.aliased` as if disjoint.

### 4 — Props are computed every file and thrown away → [#103](https://github.com/Gallevy/hermex/issues/103)

`generateReport` builds `patterns.props` (`src/swc-parser/core/report.ts:48-53`),
but nothing consumes it: not `aggregateReports`, not `countPatterns`, not
`printJson`. Its only escape route is `AggregatedReport.reports`, which is
itself dead and slated for deletion in #116.

So the current answer to "what do we store" is **nothing** — the prototype
starts from zero, not from a shape to extend.

Two further constraints on the redesign:

- **Last-usage-wins within a file.** `analyzePropsInDetail` ends with
  `state.usagePatterns.propsAnalysis.set(componentName, analysis)`
  (`src/swc-parser/patterns/props.ts:58`), keyed by component *name*. Two
  `<Button>` elements in one file leave only the second one's props. Per-usage
  records do not exist anywhere in parser state.
- **No values captured at all.** `getPropType` (`props.ts:66-98`) returns a
  coarse type string and never records the value. A `TemplateLiteral` — which
  #119 found resolves exactly when it has zero interpolations — falls through to
  `'expression'`.

`JSXUsage` also carries both `props: string[]` and `propsAnalysis.namedProps`,
which are the same list (`src/swc-parser/types.ts:17-31`).

There is no `tests/swc-parser/patterns/props.test.ts`.

### 5 — Every `line` is a byte offset → [#115](https://github.com/Gallevy/hermex/issues/115)

Each analyzer stores `node.span?.start || 0` (e.g.
`src/swc-parser/patterns/imports.ts:45,62,80,89`). SWC's `span.start` is a
**1-based UTF-8 byte offset**, so a component on line 10 reports a `line` in the
hundreds. `plans/013-fix-line-numbers.md` carries the verified fix (offsets must
be computed over `Buffer.from(source,'utf8')`, not the JS string).

### 6 — `allVersions` sorted lexicographically → [#115](https://github.com/Gallevy/hermex/issues/115)

`createResolutionAccumulator().build()` does `Array.from(versions).sort()`
(`src/lock-parser/lock-file-adapter.ts:76`), so a package resolved at 1.9.0 and
1.10.0 reports `["1.10.0","1.9.0"]`. `maxSemver` is correct; only the published
ordering is wrong. This is the list `explain package` will print for coexisting
versions.

### 7 — `HermexScanResult` is untied to its emitter → [#115](https://github.com/Gallevy/hermex/issues/115)

`src/index.ts:52-93` declares the JSON shape; `src/utils/print-json.ts:30-55`
builds an untyped object literal. Nothing makes the compiler compare them, and
the plan history records this pair having drifted before.

### 8 — Verified dead-code list → [#116](https://github.com/Gallevy/hermex/issues/116)

Each checked for readers, not inferred:

| What | Where | Note |
|---|---|---|
| `getPackageVersion`, `getPackageVersions` | `src/lock-parser/index.ts:79-107` | No production caller; only `tests/lock-parser/lock-parser.test.ts:512-525`. Each re-parses the whole lockfile per call. |
| `readFile` | `src/utils/file-utils.ts:33-35` | Only caller is its own test. |
| `AggregatedReport.reports` | `src/utils/aggregator-core.ts:41,165` | Known (plan 022). Confirmed still unread. |
| `docs-templates/` + `scripts/update-docs.js` | repo root | No npm script, no CI step, outputs committed. |

Deleting `reports` makes props detection provably unreachable rather than merely
unused — correct, but worth knowing.

### 9 — File rules re-glob once per pattern → [#112](https://github.com/Gallevy/hermex/issues/112)

`findMatches` (`src/rules/shared.ts:58-69`) runs `globSync` once per pattern per
rule against the repo root, while `runPipeline` already holds a resolved file
list from a single `findFiles` call (`src/commands/pipeline.ts:49-53`). On a
large repo with a dozen file rules that is a dozen extra directory walks.

Cost only, and modest — file rules typically carry a handful of patterns. Worth
a number from the perf baseline before anyone optimises it.

> **Correction (2026-08-15, same day).** This finding was first written with a
> second half claiming the divergence between the file-rule glob and the scan's
> file list was a bug — "one repo has two different notions of the files hermex
> looked at". **That was wrong, and it is retracted.** File rules glob the whole
> repo *by design*: they target `.nvmrc`, `.babelrc`, `.editorconfig`,
> `jest.config.*` — files the scan deliberately never parses. The fixture's own
> config says so at `fixtures/repos/all-rule-types/hermex.config.ts:11-12`:
> *"Scoped to `src/` so `jest.config.js` is found by `detect_files` without also
> being parsed as source."* Restricting file rules to `includes` would be a
> capability regression. Only the per-pattern glob cost above stands.

### 10 — `tsconfig.json` does not type-check tests → [#116](https://github.com/Gallevy/hermex/issues/116)

`include: ["src/**/*", "scripts/**/*"]`. `pnpm run typecheck` is a required CI
gate that never sees `tests/`.

### 11 — `js-yaml` type/runtime major mismatch → [#116](https://github.com/Gallevy/hermex/issues/116)

`js-yaml@5.2.1` runtime against `@types/js-yaml@4.0.9` (`package.json`,
`pnpm-lock.yaml:1456,968`). If v5 bundles its own types the `@types` package is
also shadowing them.

**MED confidence** — read off the lockfile; `node_modules` was not installed in
the audit worktree. Verify against the installed package before acting.

### 12 — Authenticated registry runs get no cache at all → [#112](https://github.com/Gallevy/hermex/issues/112)

`getPackageInfo` sets `cacheEnabled = !authToken && !options?.disabled`
(`src/npm-registry/cache.ts:97`). Any run with `releaseAge.authToken` or
`HERMEX_REGISTRY_AUTH_TOKEN` set skips both read and write, so **every run
re-fetches every package** — precisely the private-registry enterprise user
hermex is aimed at. With `CONCURRENCY = 8` and a 10s per-request timeout, the
authed path could dominate everything else the perf baseline measures.

Whether caching authed responses to `~/.hermex/cache` is acceptable is a real
decision, but it should be made against a number.

### 13 — `explain file`'s "skipped and why" data is not recorded → [#105](https://github.com/Gallevy/hermex/issues/105)

Three ways a file disappears from a run; one leaves a trace:

1. **Declaration files** — filtered at `pipeline.ts:53`, nothing recorded, and
   the "Found N files" line reports the post-filter count. A repo whose
   `includes` matched only `.d.ts` files gets
   `No files found matching includes: …`, which is false.
2. **Parse failures** — recorded in `parseErrors`, printed, then dropped: not in
   the aggregate, not in the JSON.
3. **Excluded by config** — never materialised; `findFiles` passes `excludes`
   straight to `glob` (`src/utils/file-utils.ts:14-18`), so nothing knows which
   files an exclude removed or which pattern did it.

`explain file` needs a per-file disposition record that does not exist yet, and
it is the same data #129 needs for the coverage verdict.

---

## Considered and rejected — do not resurface

- **`enricher.ts:428` O(N×M) `findIndex`** — real, but already covered by plan
  022 and #116's own seed list. Not a new finding.
- **`visitChildren` uses `for...in`** — standard visitor pattern; settled as
  by-design in the 2026-06-27 audit and unchanged.
- **`minCompliantVersion` can recommend a major over a patch** — it tracks the
  *oldest* in-window release across tiers. That is the documented intent of #21
  ("oldest = most battle-tested"), a deliberate tradeoff, not a bug.
- **`client.ts:8` `encodeURIComponent(name).replace('%40','@')` replaces only the
  first match** — a package name contains at most one `@`, so single-replace is
  correct.
- **`Set<ImportPattern>` never dedupes** (object identity, so two identical
  imports both land) — that is the intended per-site record, not a dedup failure.
- **"File rules see a different file set than the scan"** — retracted the same
  day; see the correction in finding 9. File rules glob the whole repo by
  design, because they target files the scan deliberately never parses.

### Retired

The previous audit's "enable TypeScript strict mode" finding is **done**.
`tsconfig.json` now has `strict: true`, `noUnusedLocals`, `noUnusedParameters`,
`noImplicitReturns`, `noFallthroughCasesInSwitch`, and `CONTRIBUTING.md`'s claim
is now accurate.

---

## Not audited

- **`scripts/output-review.ts`** (1,948 lines) — read only for its invariant
  model. [#110](https://github.com/Gallevy/hermex/issues/110) is actively
  rewriting it and an audit against a moving file would be stale on arrival.
- **`fixtures/`** — treated as test data throughout.
- **No build, test or `pnpm audit` run** — `node_modules` is not installed in
  the audit worktree and installing would have mutated it.
