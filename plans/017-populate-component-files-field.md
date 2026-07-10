# Plan 017: Populate ComponentUsage.files instead of shipping an always-empty field

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 19a4695..HEAD -- src/utils/aggregator-core.ts src/utils/package-distribution.ts src/swc-parser/ src/index.ts src/utils/print-json.ts`
> If these files changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (coordinate with Plans 013/016/019 — all touch `src/swc-parser/index.ts`; apply after 013/016 if queued together)
- **Category**: bug / tech-debt
- **Planned at**: commit `19a4695`, 2026-07-04 (**reverses the direction of the 2026-06-27 version**, which proposed removing the field)

## Why this matters

`ComponentUsage.files` is initialized empty and never written. The original
plan proposed deleting it as YAGNI. Since then the field became part of the
**published contract**: `printJson` emits `files: [...c.files]` (always `[]`)
for every component in `hermex scan --format json`, and the library entry
point exposes it as `HermexScanComponent.files: string[]`
(`src/index.ts:27-33`). Shipping a documented, typed field that is silently
always empty is worse than either removing or filling it — and filling it is
now trivial and genuinely useful (which files use which component is exactly
what a usage-analysis tool should answer). This plan threads the source file
path into `UsageReport` and populates `files` during aggregation.

## Current state

**`src/swc-parser/index.ts:42-47`** — `parseCode` receives the path but
discards it after choosing syntax options:
```ts
export function parseCode(code: string, filePath = 'file.tsx'): UsageReport {
  const state = createState();
  const ast = parseSync(code, swcOptionsForFile(filePath));
  visitNode(ast, state);
  return generateReport(state);
}
```

**`src/swc-parser/types.ts:110-142`** — `UsageReport` has `summary`,
`patterns`, `components` — no file identity.

**`src/utils/package-distribution.ts:7-12`** — the interface:
```ts
export interface ComponentUsage {
  name: string;
  source: string;
  count: number;
  files: Set<string>;
}
```

**`src/utils/aggregator-core.ts:49-72`** — the aggregation loop; `files` is
created empty and never added to:
```ts
for (const report of reports) {
  ...
  for (const jsx of report.patterns.usage.jsx) {
    const key = jsx.component;
    const existing = componentUsageMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      ...
      componentUsageMap.set(key, {
        name: jsx.component,
        source,
        count: 1,
        files: new Set(),
      });
    }
  }
  ...
}
```

**`src/utils/print-json.ts:14-17`** — serialization already handles the Set:
```ts
components: aggregated.topComponents.map((c) => ({
  ...c,
  files: [...c.files],
})),
```

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0              |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |
| Manual    | `pnpm run dev:scan`  | scan completes      |

## Scope

**In scope**:
- `src/swc-parser/types.ts` — add `filePath: string` to `UsageReport`
- `src/swc-parser/core/report.ts` — accept and set `filePath`
- `src/swc-parser/index.ts` — pass `filePath` through `parseCode`
- `src/utils/aggregator-core.ts` — populate `files`
- `tests/helpers/mock-reports.ts` — add `filePath` to `createMockReport`
- `tests/utils/aggregator.test.ts` — add coverage for `files`

**Out of scope** (do NOT touch):
- `src/utils/print-json.ts` — already serializes correctly
- `src/index.ts` — `HermexScanComponent` already types `files: string[]`
- Print utilities — displaying per-file lists in table output is a separate
  product decision

## Git workflow

- Branch: `advisor/017-populate-component-files`
- Commit message: `feat: populate ComponentUsage.files with the files using each component`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add filePath to UsageReport

In `src/swc-parser/types.ts`, add to the `UsageReport` interface (top level,
before `summary`):

```ts
export interface UsageReport {
  filePath: string;
  summary: { ... };  // unchanged
  ...
}
```

**Verify**: `pnpm run typecheck` → errors in `report.ts` and
`tests/helpers/mock-reports.ts` (expected — both construct `UsageReport`).

### Step 2: Thread the path through generateReport and parseCode

`src/swc-parser/core/report.ts` — change the signature and set the field:

```ts
export function generateReport(state: ParserState, filePath: string): UsageReport {
  const report: UsageReport = {
    filePath,
    summary: { ... },  // unchanged
    ...
  };
```

`src/swc-parser/index.ts` — pass it:

```ts
return generateReport(state, filePath);
```

**Verify**: `pnpm run typecheck` → only `tests/helpers/mock-reports.ts` should
still error.

### Step 3: Update the mock factory

In `tests/helpers/mock-reports.ts`, add `filePath: 'mock.tsx',` to the object
returned by `createMockReport` (before `summary`), keeping the
`...overrides` spread last so callers can override it.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 4: Populate files in the aggregator

In `src/utils/aggregator-core.ts`, inside the jsx loop:

```ts
if (existing) {
  existing.count++;
  existing.files.add(report.filePath);
} else {
  ...
  componentUsageMap.set(key, {
    name: jsx.component,
    source,
    count: 1,
    files: new Set([report.filePath]),
  });
}
```

**Verify**: `pnpm run typecheck` → exit 0.

### Step 5: Add tests

In `tests/utils/aggregator.test.ts`, following the file's existing style, add:

- two mock reports (`createMockReport({ filePath: 'a.tsx', ... })`,
  `createMockReport({ filePath: 'b.tsx', ... })`) that both use component
  `Button` → the aggregated `componentUsage.get('Button')!.files` equals
  `new Set(['a.tsx', 'b.tsx'])`
- a component used twice in the same file → `files` has size 1, `count` is 2

**Verify**: `pnpm run test:ci` → all pass. If an e2e JSON assertion pinned
`files: []`, update that expectation to the fixture's real relative path —
that change is the point of this plan; mention it in the commit body.

### Step 6: Manual smoke check

```
pnpm run dev:scan
```

Completes without error. Optionally set `format: json` behavior aside — the
table output does not show files, so no visible change is expected here.

### Step 7: Full suite

```
pnpm run build && pnpm run test:ci && pnpm run lint && pnpm run typecheck
```

All exit 0.

## Test plan

Step 5's two aggregator tests (cross-file accumulation, same-file dedupe) plus
the existing suite. E2E `cli.test.ts` exercises the JSON path end to end.

## Done criteria

- [ ] `UsageReport.filePath` exists and is set by `parseCode`/`generateReport`
- [ ] `componentUsage.get(name)!.files` contains real file paths after aggregation
- [ ] New aggregator tests pass; full suite green
- [ ] `pnpm run typecheck`, `pnpm run build`, `pnpm run test:ci`, `pnpm run lint` all exit 0
- [ ] Only in-scope files modified, plus any e2e expectation legitimately updated (`git status`)
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- `generateReport` has more callers than `parseCode`
  (`grep -rn "generateReport" src/ tests/`) — report them before changing the
  signature.
- Typecheck errors after Step 3 in files not listed in scope.
- An e2e test asserts on `files` in a way that is not a simple `[]` →
  real-paths update — report it.

## Maintenance notes

- `files` holds the paths as passed to `parseFile` (project-relative as
  produced by `findFiles`). If path normalization (absolute vs relative)
  changes in `file-utils.ts`, these values change too — that was fixed once
  before (commit 2cbb495 "absolute paths in output"); keep them relative.
- Follow-up product option (not in scope): show a `files` column or a
  per-component file list in the details/components table views.
- `UsageReport.filePath` also unlocks better parse-error attribution and
  future per-file breakdowns; prefer it over re-threading paths ad hoc.
