# Plan 046: Deduplicate the pnpm importer dependency/devDependency extraction in `parse()`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat ac69a10..HEAD -- src/lock-parser/patterns/pnpm.ts`
> If this file changed since this plan was written, compare the "Current
> state" excerpt against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `ac69a10`, 2026-07-25

## Why this matters

`PnpmLockfileAdapter.parse()` contains two near-identical ~13-line blocks
that extract package versions from `rootImporter.dependencies` and
`rootImporter.devDependencies`. They differ only in which field they read.
Duplicated logic like this is a maintenance hazard: a future fix (e.g.
handling a new pnpm value shape, or adding `optionalDependencies`) has to be
made in two places and it's easy to update one and miss the other. Collapsing
them into a single small helper removes the duplication with zero behavior
change — the existing pnpm-adapter tests already exercise both a `dependencies`
entry (`chalk`) and a `devDependencies` entry (`vitest`), so the refactor is
fully covered. This is a pure readability/maintainability cleanup, not a
functional change.

## Current state

**`src/lock-parser/patterns/pnpm.ts`** — the `importers` branch of `parse()`,
lines 50–83 as of commit `ac69a10`:

```ts
        // pnpm v9+ uses "importers" field
        if (lockData.importers) {
          const rootImporter = lockData.importers['.'];
          if (rootImporter) {
            // Parse dependencies
            if (rootImporter.dependencies) {
              for (const [name, data] of Object.entries(
                rootImporter.dependencies,
              )) {
                if (
                  typeof data === 'object' &&
                  data !== null &&
                  'version' in data
                ) {
                  versions[name] = removeSuffix((data as any).version);
                }
              }
            }
            // Parse devDependencies
            if (rootImporter.devDependencies) {
              for (const [name, data] of Object.entries(
                rootImporter.devDependencies,
              )) {
                if (
                  typeof data === 'object' &&
                  data !== null &&
                  'version' in data
                ) {
                  versions[name] = removeSuffix((data as any).version);
                }
              }
            }
          }
        }
```

Facts the executor needs:

- `removeSuffix` is already imported at the top of the file (from
  `@pnpm/dependency-path`) — no new import is needed. It is already used on
  five lines in this file.
- This file uses `any` casts (`load(content) as any`, `(data as any).version`)
  and does **not** use the `node:` import prefix — match the file's existing
  style; do not "modernize" unrelated lines.
- The two blocks are byte-for-byte identical except for the field name
  (`rootImporter.dependencies` vs `rootImporter.devDependencies`).
- The pnpm v9 fixture at `tests/lock-parser/fixtures/pnpm-lock.yaml` has
  `chalk` under `dependencies` and `vitest` under `devDependencies`, and
  `react-redux` (with a peer-dependency suffix) under `dependencies`. The
  test `parses pnpm v9 lockfile and returns dependency and devDependency
  versions` asserts both `chalk` → `5.3.0` and `vitest` → `1.6.0`, and a
  separate test asserts the suffix on `react-redux` is stripped to `8.0.5`.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0, no errors   |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |
| Format    | `pnpm run format:ci` | exit 0 (no diff)    |

(These are the exact scripts from `package.json`; `format:ci` is a real CI
gate — a formatting violation will fail CI, so run it.)

## Scope

**In scope** (the only file you should modify):
- `src/lock-parser/patterns/pnpm.ts` — extract the shared extraction helper
  and call it for both `dependencies` and `devDependencies`.

**Out of scope** (do NOT touch, even though they look related):
- The `packages` and `dependencies`/`specifiers` fallback branches in the
  same `parse()` method (pnpm v6-8 and v5 formats) — they parse a different
  key shape and are not duplicated with the importers block. Leave them
  exactly as they are.
- `parseMultiVersion()` in the same file — different logic, not duplicated.
- `src/lock-parser/patterns/npm.ts` and `.../yarn.ts` — the npm v6 fallback
  has its own recursive `extractVersions`; do not try to unify across
  adapters, that is a larger design change and out of scope here.
- Any change to `removeSuffix` behavior or the `(data as any)` casts beyond
  moving them into the helper.

## Git workflow

- Branch: `advisor/046-dedup-pnpm-importer-extraction`
- Commit message (conventional-commit style, matching `git log`):
  `refactor: dedupe pnpm importer dependency/devDependency extraction`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a module-scoped helper

At module scope in `src/lock-parser/patterns/pnpm.ts` (place it next to the
existing top-level `parsePackageKey` helper, above the class), add:

```ts
/**
 * Copies `{ name: { version } }` entries from a pnpm importer section
 * (dependencies or devDependencies) into `versions`, stripping the pnpm
 * peer-dependency suffix from each version.
 */
function collectImporterVersions(
  section: unknown,
  versions: Record<string, string>,
): void {
  if (typeof section !== 'object' || section === null) return;
  for (const [name, data] of Object.entries(section)) {
    if (typeof data === 'object' && data !== null && 'version' in data) {
      versions[name] = removeSuffix((data as any).version);
    }
  }
}
```

**Verify**: `pnpm run typecheck` → exit 0.

### Step 2: Replace both blocks with helper calls

Replace the entire importers block shown in "Current state" with:

```ts
        // pnpm v9+ uses "importers" field
        if (lockData.importers) {
          const rootImporter = lockData.importers['.'];
          if (rootImporter) {
            collectImporterVersions(rootImporter.dependencies, versions);
            collectImporterVersions(rootImporter.devDependencies, versions);
          }
        }
```

Do not change any other line of `parse()`. The two fallback branches
(`if (lockData.packages && ...)` and `if (lockData.dependencies && ...)`)
stay exactly as-is.

**Verify**: `pnpm run typecheck` → exit 0; then
`pnpm run test:ci` → all pass, specifically the `PnpmLockfileAdapter` suite
in `tests/lock-parser/lock-parser.test.ts` (the `chalk`/`vitest`/`react-redux`
assertions confirm both sections and the suffix strip still work).

### Step 3: Full verification suite

```
pnpm run build && pnpm run test:ci && pnpm run lint && pnpm run typecheck && pnpm run format:ci
```

All exit 0. This is a behavior-preserving refactor: every existing test must
pass unchanged.

## Test plan

No new tests required — this is a pure refactor with identical runtime
behavior, and the existing `PnpmLockfileAdapter` tests already cover both
code paths that were merged:

- `parses pnpm v9 lockfile and returns dependency and devDependency versions`
  — asserts a `dependencies` entry (`chalk`) and a `devDependencies` entry
  (`vitest`) are both extracted (this is exactly the duplication being
  collapsed).
- `strips the pnpm peer-dependency suffix from a dependency version (#25)` —
  asserts `removeSuffix` is still applied inside the helper.

If either of those tests fails after your change, the refactor is not
behavior-preserving — treat it as a STOP condition (see below).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `src/lock-parser/patterns/pnpm.ts` defines one `collectImporterVersions`
      helper, called twice inside the `importers` branch.
- [ ] The old inline `// Parse dependencies` / `// Parse devDependencies`
      duplicated blocks no longer exist:
      `grep -n "Parse devDependencies" src/lock-parser/patterns/pnpm.ts`
      returns no matches.
- [ ] `pnpm run typecheck`, `pnpm run build`, `pnpm run test:ci`,
      `pnpm run lint`, `pnpm run format:ci` all exit 0.
- [ ] Only `src/lock-parser/patterns/pnpm.ts` is modified (`git status`).
- [ ] `plans/README.md` status row for 046 updated to DONE.

## STOP conditions

Stop and report back (do not improvise) if:

- The "Current state" excerpt doesn't match the live code (the importers
  block has been refactored or changed since this plan was written).
- Either of the two named pnpm tests fails after the change — it means the
  extracted helper is not behavior-equivalent; do not "fix" the tests, report
  the mismatch.
- Making the change appears to require touching any file other than
  `src/lock-parser/patterns/pnpm.ts`.
- `removeSuffix` is no longer imported in the file (an unrelated change
  removed it) — STOP; the helper depends on it.

## Maintenance notes

- If pnpm ever adds another root importer section that should contribute
  versions (e.g. `optionalDependencies`), it's now a one-line
  `collectImporterVersions(rootImporter.optionalDependencies, versions)` call
  rather than a third copy-pasted block — that was the point of this refactor.
- A reviewer should confirm the diff is purely the extract-helper transform:
  no change to the `packages`/`dependencies` fallback branches, no change to
  the `(data as any)` casts' behavior, and no stylistic churn on unrelated
  lines (this file intentionally does not use the `node:` import prefix).
- Deliberately NOT unifying this with the npm/yarn adapters' extraction —
  those parse different key shapes; a cross-adapter abstraction would be a
  larger, separately-justified change.
