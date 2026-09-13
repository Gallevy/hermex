# Plan 037: Add an imported axis to the package inventory

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 688c481..HEAD -- src/utils/package-inventory.ts src/utils/aggregator-core.ts src/utils/package-distribution.ts`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED — adds a field and a resolver; does not change existing fields
- **Depends on**: none. Run **before** any work on
  [#108](https://github.com/Gallevy/hermex/issues/108) or
  [#105](https://github.com/Gallevy/hermex/issues/105) — both need this data.
- **Category**: bug / gap
- **Planned at**: commit `688c481`, 2026-08-15
- **Map ticket**: [#108 no-undeclared-dependency](https://github.com/Gallevy/hermex/issues/108), [#105 explain](https://github.com/Gallevy/hermex/issues/105)

> ### Assumptions this plan encodes
>
> [#108](https://github.com/Gallevy/hermex/issues/108) is an **open grilling
> ticket** and owns the matching semantics. This plan builds the *axis* and
> takes defensible positions so there is something to react to. It deliberately
> **does not build the `no-undeclared-dependency` rule** — that is #108's output.
>
> 1. Node builtins and `node:`-prefixed specifiers are recorded but flagged
>    `builtin: true`, not dropped — dropping loses information #105 wants.
> 2. Type-only imports (`import type`) are counted, with a separate
>    `typeOnlyCount`, so a consumer can exclude them without hermex deciding.
> 3. Subpath imports (`@scope/pkg/sub`) fold to the base package, matching the
>    existing `getPackageVersion` fallback (`package-inventory.ts:92-110`).
> 4. `workspace:` and self-references are recorded as normal packages; deciding
>    they are exempt is a rule concern, not an inventory concern.
> 5. `usageCount` **keeps its current JSX-only meaning.** Renaming it is a
>    breaking JSON change and #115's call. The new axis is additive.

## Why this matters

`PackageInventoryEntry` claims three axes — declared, installed, used. The
"used" axis measures **JSX component rendering only**. A package imported and
called as a function (`lodash`, `date-fns`, `zod`) reads `usageCount: 0` and
`isUsed()` returns false for it.

The code already knows: `src/utils/package-distribution.ts:104-108` documents
the symptom, and #78 worked around it by switching the packages *table* to
`isOwnedByRepo`. That made the table honest without adding the missing data.

Consequences today:

- `no-undeclared-dependency` ([#108](https://github.com/Gallevy/hermex/issues/108))
  has no signal to run on — its ticket says "both sides of the comparison
  exist", and one side does not.
- `explain package`'s headline answer ("installed, pulled in transitively by B,
  **imported in 0 files**") is unanswerable.
- `no-unused-dependency` sits in the map's Not-yet-specified behind the same gap.

## Current state

**`src/utils/aggregator-core.ts:59-104`** — the aggregation loop reads
**only** `report.patterns.usage.jsx`:

```ts
  for (const report of reports) {
    totalImports += report.summary.totalImports;
    totalUsagePatterns += report.summary.totalUsagePatterns;

    for (const jsx of report.patterns.usage.jsx) {
      const source = findComponentSource(jsx.component, report, availablePackages);
      ...
      const key = `${source}::${canonicalName}`;
      ...
    }
    countPatterns(report, patternCountMap);
  }
```

`report.patterns.imports` is consulted only inside `findComponentSource`, to
attribute a JSX component back to a source.

**`src/utils/package-distribution.ts:45-63`** — the only import-path resolver,
longest-prefix against lockfile keys:

```ts
function resolvePackageFromImportPath(importPath: string, availablePackages: string[]): string {
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return 'local';
  }
  const sortedPackages = [...availablePackages].sort((a, b) => b.length - a.length);
  for (const pkg of sortedPackages) {
    if (importPath === pkg) return pkg;
    if (importPath.startsWith(`${pkg}/`)) return pkg;
  }
  return 'unknown';
}
```

**This is the load-bearing limitation.** `availablePackages` is
`Object.keys(versions)` — the lockfile. An **undeclared, uninstalled** package
is not in the lockfile, so it resolves to `'unknown'` — exactly the case #108
needs to detect. The new resolver must not depend on the lockfile for identity.

**`src/utils/package-inventory.ts:37-60`** — the entry to extend. Note the
existing doc comment already describes the three axes and calls a phantom
dependency "used but neither declared nor installed" — which the code cannot
currently detect.

**`src/swc-parser/types.ts:117-123`** — what is available per file:

```ts
    imports: {
      default: ImportPattern[];    // { name, source, line? }
      named: ImportPattern[];
      namespace: ImportPattern[];
      aliased: AliasedImport[];
    };
```

`ImportPattern.source` is the raw specifier. **There is no `typeOnly` flag** —
`analyzeImportDeclaration` (`src/swc-parser/patterns/imports.ts:11-32`) does not
read SWC's `typeOnly` field on `ImportDeclaration` or `ImportSpecifier`.
Assumption 2 requires adding it.

Also note: `report.patterns.imports` records **specifiers**, not declarations.
A side-effect-only import (`import '@acme/styles/button.css'`) has no
specifiers, so it appears in **none** of the four lists — it is invisible today.

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
- `src/swc-parser/patterns/imports.ts`, `src/swc-parser/types.ts`,
  `src/swc-parser/core/report.ts` — Step 1 only (side-effect imports + typeOnly)
- `src/utils/package-inventory.ts` — the new axis
- `src/utils/aggregator-core.ts` — populate it
- `src/utils/package-distribution.ts` — the new resolver
- `src/utils/print-json.ts`, `src/index.ts` — expose it
- `tests/`, `fixtures/cases.ts`, `tests/__output_baselines__/`

**Out of scope** (do NOT touch):
- **The `no-undeclared-dependency` rule itself.** That is
  [#108](https://github.com/Gallevy/hermex/issues/108)'s decision — this plan
  supplies its input and stops.
- `usageCount`, `componentCount`, `isUsed()` semantics — assumption 5.
  Changing them breaks `isOwnedByRepo`, `calculatePackageDistribution` and
  `isReleaseAgeTarget`, which are load-bearing and heavily documented (#78, #79).
- `findComponentSource` — JSX attribution, works, leave it.
- Alias resolution (`tsconfig` paths, webpack/vite aliases) — that is
  [#120](https://github.com/Gallevy/hermex/issues/120)'s research and its own
  implementation. Unresolvable specifiers are recorded, not resolved.

## Steps

### Step 1: Record what the parser currently drops

In `src/swc-parser/patterns/imports.ts`:

- **Side-effect imports.** `analyzeImportDeclaration` iterates
  `node.specifiers`; when that array is empty the declaration is dropped
  entirely. Add a `sideEffectImports: Set<ImportPattern>` to `UsagePatterns`
  (`src/swc-parser/types.ts:75-93`, initialised in
  `src/swc-parser/core/state.ts`), populate it when `node.specifiers.length === 0`,
  and surface it in `generateReport` (`src/swc-parser/core/report.ts:20-26`) as
  `patterns.imports.sideEffect`.
- **Type-only.** SWC's `ImportDeclaration` has `typeOnly: boolean`, and
  `ImportSpecifier` has its own `isTypeOnly`. Add `typeOnly?: boolean` to
  `ImportPattern` (`src/swc-parser/types.ts:4-8`) and set it from
  `node.typeOnly || spec.isTypeOnly`.

**Note for plan 031**: adding `sideEffect` means adding an `increment()` call in
`src/utils/pattern-counter.ts` too, or the partition assertion 031 introduces
will fail. If 031 has landed, add the bucket; if not, note it for whoever runs it.

**Verify**: `pnpm run typecheck` → exit 0; add a parser unit test in
`tests/swc-parser/patterns/imports.test.ts` for `import './styles.css'` and
`import type { Foo } from 'bar'`.

### Step 2: Write a lockfile-independent specifier resolver

Add to `src/utils/package-distribution.ts`, next to
`resolvePackageFromImportPath` (which stays — Step 5's out-of-scope note):

```ts
export interface ResolvedSpecifier {
  /** The package name, or null for a relative/absolute path import. */
  packageName: string | null;
  builtin: boolean;
}

/**
 * Resolves an import specifier to a package name **by shape**, not by lookup —
 * unlike `resolvePackageFromImportPath`, which matches against lockfile keys and
 * therefore returns 'unknown' for exactly the undeclared packages #108 needs to
 * find.
 */
export function resolveSpecifier(specifier: string): ResolvedSpecifier
```

Rules, in order:

1. Starts with `.` or `/` → `{ packageName: null, builtin: false }` (local).
2. Starts with `node:` → `{ packageName: specifier.slice(5), builtin: true }`.
3. Is in Node's builtin list → `{ packageName: specifier, builtin: true }`.
   Use `module.builtinModules` from `node:module` — do **not** hand-maintain a list.
4. Starts with `@` → first two segments (`@scope/pkg`).
5. Otherwise → first segment.

Subpaths fold to the base package by construction (rules 4 and 5), satisfying
assumption 3.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 3: Extend the inventory entry

In `src/utils/package-inventory.ts`, add to `PackageInventoryEntry`:

```ts
  /**
   * The **imported** axis: how many scanned files import this package, by any
   * import form. Distinct from `usageCount`, which counts JSX component
   * rendering only — a package used purely as a function has `importedIn > 0`
   * and `usageCount === 0`.
   */
  importedIn: number;
  /** Of `importedIn`, how many are `import type` only. */
  typeOnlyImportedIn: number;
  /** A Node builtin (`fs`, `node:path`) rather than a package. */
  builtin: boolean;
```

Add a matching predicate beside `isUsed`:

```ts
/** Imported by scanned source, in any form. */
export function isImported(entry: PackageInventoryEntry): boolean {
  return entry.importedIn > 0;
}
```

**Do not change `isOwnedByRepo`.** Adding `isImported` to it would expand
`packages[]` to include every builtin and every transitive package that happens
to be imported, changing `calculatePackageDistribution`'s output and the
release-age target set. That is #108's call.

**Verify**: `pnpm run typecheck` → exit 0 (expect errors where
`PackageInventoryEntry` is constructed — fix by supplying the new fields).

### Step 4: Populate it in the aggregator

In `src/utils/aggregator-core.ts`, add a second pass over each report's imports,
alongside the existing JSX pass. Count **distinct files per package**, not
specifiers — a file importing three named exports from `lodash` is one importing
file.

```ts
  // packageName -> { files: Set<string>, typeOnlyFiles: Set<string>, builtin: boolean }
  const importedBy = new Map<string, { files: Set<string>; typeOnly: Set<string>; builtin: boolean }>();
```

Walk `report.patterns.imports.{default,named,namespace,aliased,sideEffect}`. For
each entry, `resolveSpecifier(entry.source)`; skip `packageName === null`
(local). Record `report.filePath` in `files`, and additionally in `typeOnly`
when the entry is type-only **and** no non-type import of the same package
exists in that file (resolve that at the end: `typeOnlyFiles = typeOnly \ files`
where `files` holds value imports).

Simpler and sufficient: track two sets — `valueFiles` and `typeFiles` — then
`importedIn = |valueFiles ∪ typeFiles|` and
`typeOnlyImportedIn = |typeFiles \ valueFiles|`.

Pass the map into `buildPackageInventory` via `BuildInventoryInput`
(`package-inventory.ts:62-72`) and include its keys in the `names` set
(`package-inventory.ts:188-193`) so an imported-but-uninstalled package gets an
entry at all — that is the phantom-dependency case.

**Verify**: `pnpm run typecheck` → exit 0; `pnpm run test:ci` → all pass.

### Step 5: Expose it in the JSON

Add `importedIn`, `typeOnlyImportedIn` and `builtin` to `PackageDistribution`
(`src/utils/package-distribution.ts:13-43`) and map them in
`calculatePackageDistribution`. Mirror in `HermexScanResult` (`src/index.ts`).

If plan 033 has landed, the `satisfies` clause enforces this automatically.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 6: Fixtures and baselines

`fixtures/` already contains function-only imports. Add a fixture case proving
the gap is closed: a package imported and called as a function reports
`usageCount: 0` **and** `importedIn > 0`. The `fixtures/repos/` set is the right
home; follow `fixtures/cases.ts`'s entry shape including a `proves` string.

```bash
pnpm run test:output
```

Every JSON baseline gains three fields per package — expected. Inspect, then
`pnpm run test:output -- --update`.

**Verify**: re-run → `0 changed`, `0 unexpected`, no invariant breaches.

## Test plan

- `tests/utils/package-inventory.test.ts` — `importedIn` counts distinct files
  not specifiers; a type-only import lands in `typeOnlyImportedIn`; a builtin is
  flagged; an imported-but-uninstalled package gets an entry.
- New unit tests for `resolveSpecifier`: relative, absolute, `node:fs`, `fs`,
  `lodash`, `lodash/merge`, `@scope/pkg`, `@scope/pkg/sub`, `workspace:x`.
- `tests/swc-parser/patterns/imports.test.ts` — side-effect and type-only
  imports (Step 1).
- `tests/utils/aggregator.test.ts` — the headline regression: a report importing
  `lodash` as a function yields `usageCount: 0`, `importedIn: 1`.
- Structural pattern: `tests/utils/package-inventory.test.ts` as it stands.

## Done criteria

ALL must hold:

- [ ] `pnpm run format:ci`, `lint:ci`, `typecheck`, `test:ci`, `build:ci` all exit 0
- [ ] `pnpm run test:output` → 0 changed, 0 unexpected, no invariant breaches
- [ ] A test asserts `usageCount === 0 && importedIn === 1` for a function-only
      import — the exact gap this plan closes
- [ ] `grep -n "importedIn" src/index.ts` returns a match (exposed publicly)
- [ ] `isOwnedByRepo` is **unchanged** (`git diff src/utils/package-inventory.ts`
      shows no edit to it)
- [ ] No `no-undeclared-dependency` rule was added
- [ ] A changeset exists (`--minor`)
- [ ] `git status` shows no modified files outside the Scope list
- [ ] `plans/README.md` status row for 037 updated

## STOP conditions

Stop and report back if:

- The excerpts in "Current state" do not match the live code.
- [#108](https://github.com/Gallevy/hermex/issues/108) has been resolved since
  this plan was written — read its resolution first; it supersedes the
  assumptions box.
- SWC's `ImportDeclaration` does not expose `typeOnly` in the installed
  `@swc/core` version. Verify against `node_modules/@swc/types` rather than
  assuming; if absent, drop assumption 2 and report.
- Adding imported packages to the inventory's `names` set changes
  `packages[]` in the baselines. It should **not** —
  `calculatePackageDistribution` filters on `isOwnedByRepo`, which this plan
  leaves alone. If `packages[]` grows, Step 3's boundary was violated.
- Release-age targeting changes (`isReleaseAgeTarget` reads `usageCount`) — it
  must not.

## Maintenance notes

- **This plan is deliberately incomplete by design.** It builds the axis and
  stops short of the rule, because the rule's matching semantics are #108's
  substance. Do not let review pressure expand it.
- The resolver is **shape-based, not resolution-based**. It cannot tell
  `@acme/ui` (real) from `@acme/typo` (a typo) — both look like packages. That
  is correct for #108's purpose: the *rule* compares against declared, the
  resolver just extracts a name.
- `tsconfig` path aliases and bundler aliases resolve to `'unknown'`-shaped
  names today. [#120](https://github.com/Gallevy/hermex/issues/120)'s research
  recommends `oxc-resolver` over `tsconfig` `paths` — when that lands, it plugs
  in ahead of `resolveSpecifier`, and an aliased import stops being mistaken for
  a package.
- Side-effect imports (Step 1) also matter to release-age targeting: the comment
  at `src/utils/package-distribution.ts:184-189` calls out
  `import '@acme-ui/pulse-styles/button.css'` as a case the usage scan cannot
  see. After this plan it can — but wiring it into `isReleaseAgeTarget` is a
  behaviour change and out of scope here.
