# Plan 001: Move release dependencies to devDependencies; remove dead @types/tmp

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 36699c4..HEAD -- package.json`
> If `package.json` changed since this plan was written, compare the
> "Current state" excerpts against the live file before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt / security
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

`@semantic-release/github` is a release automation tool that runs only during
CI publishing — never at user runtime. Having it in `dependencies` means every
consumer who installs hermex also pulls in its entire transitive dependency
tree, which carries 37 vulnerabilities including a **critical** Handlebars
JavaScript-injection (AST type confusion via `conventional-changelog-writer`).
Moving it to `devDependencies` removes this entire exposure from the published
package.

`@types/tmp` is a TypeScript types package for the `tmp` runtime library.
Neither `tmp` nor `@types/tmp` is imported anywhere in `src/` or `tests/`.
It is a dead devDependency adding noise to the manifest.

## Current state

`package.json` `dependencies` block currently contains (line 47):
```json
"@semantic-release/github": "^12.0.8",
```

`package.json` `devDependencies` block currently contains (line 67):
```json
"@types/tmp": "^0.2.6",
```

The other `@semantic-release/*` packages are already correctly in `devDependencies`:
`@semantic-release/changelog`, `@semantic-release/commit-analyzer`,
`@semantic-release/git`, `@semantic-release/npm`, `@semantic-release/release-notes-generator`.

## Commands you will need

| Purpose   | Command                             | Expected on success               |
|-----------|-------------------------------------|-----------------------------------|
| Install   | `pnpm install`                      | exit 0                            |
| Typecheck | `pnpm run typecheck`                | exit 0, no errors                 |
| Build     | `pnpm run build`                    | exit 0                            |
| Tests     | `pnpm run test:ci`                  | all pass                          |
| Lint      | `pnpm run lint`                     | exit 0                            |

## Scope

**In scope** (the only file to modify):
- `package.json`

**Out of scope** (do NOT touch):
- `pnpm-lock.yaml` — pnpm regenerates this automatically on `pnpm install`
- `release.config.mjs` — no changes needed; semantic-release config is separate
- Any `src/` or `tests/` files

## Git workflow

- Branch: `advisor/001-dep-hygiene`
- Commit message: `fix: move @semantic-release/github to devDependencies, remove unused @types/tmp`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Move @semantic-release/github to devDependencies

In `package.json`:
1. Remove `"@semantic-release/github": "^12.0.8"` from the `dependencies` block.
2. Add `"@semantic-release/github": "^12.0.8"` to the `devDependencies` block, keeping the `@semantic-release/*` entries in alphabetical order.

**Verify**:
```
node -e "const p = require('./package.json'); console.log('in deps:', '@semantic-release/github' in (p.dependencies ?? {}), 'in devDeps:', '@semantic-release/github' in (p.devDependencies ?? {}))"
```
Expected: `in deps: false in devDeps: true`

### Step 2: Remove @types/tmp from devDependencies

In `package.json`, remove the line `"@types/tmp": "^0.2.6"` from `devDependencies` entirely.

**Verify**:
```
node -e "const p = require('./package.json'); console.log('@types/tmp' in (p.devDependencies ?? {}))"
```
Expected: `false`

### Step 3: Run pnpm install

```
pnpm install
```

Expected: exit 0, `pnpm-lock.yaml` updated.

### Step 4: Verify no regressions

```
pnpm run typecheck && pnpm run build && pnpm run test:ci && pnpm run lint
```

All must exit 0.

## Test plan

No new tests needed — this is a manifest-only change. The existing suite is the regression check.

## Done criteria

- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm run test:ci` exits 0
- [ ] `node -e "const p=require('./package.json');console.log('@semantic-release/github' in (p.dependencies??{}))"` → `false`
- [ ] `node -e "const p=require('./package.json');console.log('@types/tmp' in (p.devDependencies??{}))"` → `false`
- [ ] Only `package.json` and `pnpm-lock.yaml` modified (`git diff --name-only`)
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- `pnpm install` fails after the edit.
- Any typecheck, build, or test failure introduced by this change (there should be none — this is manifest-only).

## Maintenance notes

- Any future `@semantic-release/*` plugin additions belong in `devDependencies`.
- The `release.config.mjs` file runs only in CI — no code changes required there.
