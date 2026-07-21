# Plan 022: Small cleanups — dead reports field, enricher lookup, config-v2 orphan, docs sync

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 19a4695..HEAD -- src/utils/aggregator-core.ts src/npm-registry/enricher.ts src/lock-parser/patterns/yarn.ts config-v2/ README.md`
> If these files changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (touches `tests/utils/compliance.test.ts` trivially; fine to run before or after Plan 021)
- **Category**: tech-debt / docs
- **Planned at**: commit `19a4695`, 2026-07-04

## Why this matters

Four independent, verified, low-risk cleanups batched to save executor
overhead. Each is small enough that a standalone plan would be mostly
boilerplate:

1. **`AggregatedReport.reports` is dead weight** — every parsed
   `UsageReport` is retained in the aggregate but nothing reads the field
   (verified: `grep -rn "\.reports\b" src/` matches nothing outside its own
   definition). For library consumers (`src/index.ts` shipped in 2.0.0-beta)
   holding the aggregate alive, that pins every file's full report in memory.
2. **Enricher reconciliation is O(N×M)** — `findIndex` over the whole
   `enriched` array per fetched package. Trivial Map fix.
3. **`config-v2/.hermex.json` is an orphan** — uses fields (`$schema2`,
   `imports`, `ignoreImports`, `summary`) that exist nowhere in the current
   zod schema; nothing references the directory.
4. **Docs omit shipped env vars** — `HERMEX_REGISTRY_CACHE_TTL_MS` and
   `HERMEX_REGISTRY_CACHE_DISABLED` (read in `enricher.ts:150-155`) are
   undocumented; the yarn adapter also advertises `supportedVersions: ['v1',
   'v2+']` while its parser (`@yarnpkg/lockfile`, v1-format-only) returns an
   empty version map for yarn berry lockfiles — the label overpromises.

## Current state

**1 — `src/utils/aggregator-core.ts`**: interface field at line 33
(`reports: UsageReport[];`), populated at line 126 (`reports,`), parameter of
the same name at line 37 (the *parameter* stays — only the returned field
goes). `tests/utils/compliance.test.ts:27` constructs `reports: []` in its
local `makeAggregated` helper and must be updated.

**2 — `src/npm-registry/enricher.ts:196-202`**:
```ts
for (const { pkg, entry } of results) {
  if (!entry) continue;
  const idx = enriched.findIndex((p) => p.packageName === pkg.packageName);
  if (idx !== -1) {
    enriched[idx] = { ...enriched[idx], releaseAge: entry };
  }
}
```
(`enriched` is built once at line 147: `const enriched = [...packages];`)

**3 — `config-v2/.hermex.json`**: sole file in the directory; content uses a
config dialect that predates the current `src/config/schema.ts`.

**4 — `README.md`**: documents `HERMEX_REGISTRY_AUTH_TOKEN` (environment
section around lines 116–122) but not the two cache vars.
**`src/lock-parser/patterns/yarn.ts:17`**: `supportedVersions = ['v1', 'v2+'];`.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0              |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope**:
- `src/utils/aggregator-core.ts` — remove the `reports` field (interface + return)
- `tests/utils/compliance.test.ts` — remove `reports: []` from `makeAggregated`
- `src/npm-registry/enricher.ts` — Map-based reconciliation
- `config-v2/` — delete the directory
- `README.md` — document the two cache env vars
- `src/lock-parser/patterns/yarn.ts` — `supportedVersions = ['v1'];`

**Out of scope** (do NOT touch):
- `src/commands/pipeline.ts` — its local `reports` variable is the input to
  `aggregateReports` and stays
- Actual yarn berry parsing support — that is a feature decision recorded in
  `plans/README.md` under direction options
- `docs-templates/`/`scripts/update-docs.js` — the docs-generation flow has
  its own README note; only edit `README.md` directly if the environment
  section is NOT inside a template-generated region (check
  `docs-templates/__README.md` first — if the env section lives in the
  template, edit the template and run `node scripts/update-docs.js` instead)

## Git workflow

- Branch: `advisor/022-small-cleanups`
- Commit message: `chore: drop dead reports field, O(1) enricher lookup, remove config-v2, docs sync`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Remove the dead reports field

In `src/utils/aggregator-core.ts` delete line 33 (`reports: UsageReport[];`
in the interface) and the `reports,` entry in the returned object (line 126).
In `tests/utils/compliance.test.ts` delete the `reports: [],` line from
`makeAggregated`.

**Verify**: `pnpm run typecheck` → exit 0;
`grep -rn "\.reports" src/ tests/` → no matches on `AggregatedReport`
(matches on `report.patterns` etc. are fine).

### Step 2: Map-based enricher reconciliation

Replace the `findIndex` loop with an index map built once:

```ts
const indexByName = new Map(enriched.map((p, i) => [p.packageName, i]));
...
for (const { pkg, entry } of results) {
  if (!entry) continue;
  const idx = indexByName.get(pkg.packageName);
  if (idx !== undefined) {
    enriched[idx] = { ...enriched[idx], releaseAge: entry };
  }
}
```

Build `indexByName` right after `const enriched = [...packages];` (line 147)
so it is constructed once, not per batch.

**Verify**: `pnpm run test:ci` → enricher tests pass unchanged.

### Step 3: Delete config-v2

```
git rm -r config-v2
```

**Verify**: `grep -rn "config-v2" src/ tests/ scripts/ docs/ package.json` →
no matches.

### Step 4: Honest yarn version label

In `src/lock-parser/patterns/yarn.ts:17` change to
`supportedVersions = ['v1'];`. If any test asserts the old value
(`grep -rn "v2+" tests/`), update that assertion in the same commit.

**Verify**: `pnpm run test:ci` → all pass.

### Step 5: Document the cache env vars

Per the scope note, first check whether README's environment section is
generated from `docs-templates/__README.md`. Edit the correct source and add,
alongside the existing `HERMEX_REGISTRY_AUTH_TOKEN` entry:

- `HERMEX_REGISTRY_CACHE_TTL_MS` — overrides the registry cache TTL
  (milliseconds; default 1 hour, config: `releaseAge.cacheTtlMs`)
- `HERMEX_REGISTRY_CACHE_DISABLED` — set to `1` to bypass the on-disk
  registry cache (config: `releaseAge.cacheDisabled`)

If you edited the template, run `node scripts/update-docs.js` and commit both
files.

**Verify**: `grep -n "HERMEX_REGISTRY_CACHE" README.md` → 2 matches.

### Step 6: Full suite

```
pnpm run build && pnpm run test:ci && pnpm run lint && pnpm run typecheck
```

All exit 0.

## Test plan

No new tests: Step 1 is covered by compile + existing aggregator/compliance
tests; Step 2 by `tests/npm-registry/enricher.test.ts`; Steps 3–5 are
non-code.

## Done criteria

- [ ] `AggregatedReport` has no `reports` field; typecheck green
- [ ] `enricher.ts` contains no `findIndex` (grep it)
- [ ] `config-v2/` does not exist
- [ ] `supportedVersions` for yarn is `['v1']`
- [ ] README documents both cache env vars
- [ ] `pnpm run typecheck`, `pnpm run build`, `pnpm run test:ci`, `pnpm run lint` all exit 0
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- Removing `reports` breaks a consumer the grep missed (typecheck error
  outside the two in-scope files) — report the consumer; it means the field
  is not dead after all.
- Anything in the repo references `config-v2` (Step 3's grep) — report
  instead of deleting.
- The lockfile-type spinner line (`pipeline.ts:26-30`) interpolates
  `supportedVersions` — after Step 4 it will print `(supports: v1)`. That is
  the intended output; if an e2e test pins the old string, update the
  expectation and say so in the commit body.

## Maintenance notes

- If someone later needs per-file data downstream of aggregation, prefer
  passing what's needed explicitly over resurrecting the kitchen-sink
  `reports` field.
- Yarn berry (v2+) lockfile support is a real gap now honestly labeled; the
  berry lockfile is YAML and `js-yaml` is already a dependency — see the
  direction notes in `plans/README.md` if the maintainer wants it built.
