# Plan 018: CI runs lint + typecheck, caches pnpm, and the picomatch advisory is resolved

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 19a4695..HEAD -- .github/workflows/ package.json pnpm-lock.yaml`
> If these files changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx / security
- **Planned at**: commit `19a4695`, 2026-07-04

## Why this matters

Three cheap, high-leverage gaps:

1. **CI never runs the linter or the type-checker.** Both workflows run
   `format:ci`, `test:ci`, `build:ci` — but not `lint:ci` or `typecheck`.
   The build script (`tsdown`) does not type-check ("fast, no type-check"
   per CLAUDE.md), so type errors and lint violations can merge and even
   release unnoticed. For a code-quality tool, that's an embarrassing gap.
2. **No dependency caching** — every CI run reinstalls from scratch.
   `actions/setup-node` has first-class pnpm cache support.
3. **`pnpm audit --prod` reports two advisories** (verified 2026-07-04):
   picomatch < 2.3.2 via `micromatch>picomatch@2.3.1` — HIGH (ReDoS,
   GHSA-c2c7-rcm5-vvqj) and MODERATE (GHSA-3v7f-55p6-f55p). micromatch 4.x
   accepts `picomatch@^2.3.1`, so `2.3.2+` satisfies the range — a lockfile
   bump fixes it with no manifest change.

## Current state

**`.github/workflows/pull-request.yaml`** (steps, in order): checkout,
setup-node@v6 (`node-version: 24`, no cache), pnpm/action-setup@v4
(`version: 10`), `pnpm install --frozen-lockfile`, `pnpm run format:ci`,
`pnpm run test:ci`, `pnpm run build:ci`. No lint, no typecheck, no cache.

**`.github/workflows/push-release.yaml`**: same validation steps followed by
`npx semantic-release`. Same gaps.

**`package.json` scripts** (relevant): `"lint:ci": "oxlint"`,
`"typecheck": "tsc --noEmit"`.

**`pnpm-lock.yaml`**: contains `picomatch@2.3.1` resolved for micromatch
(other consumers already use picomatch 4.x).

**Convention note**: `actions/setup-node`'s `cache: 'pnpm'` requires the pnpm
CLI to exist before setup-node runs, so the pnpm/action-setup step must be
**moved above** the setup-node step in both workflows.

## Commands you will need

| Purpose        | Command                                        | Expected on success            |
|----------------|------------------------------------------------|--------------------------------|
| Lint           | `pnpm run lint:ci`                             | exit 0                         |
| Typecheck      | `pnpm run typecheck`                           | exit 0                         |
| Tests          | `pnpm run test:ci`                             | all pass                       |
| Audit          | `pnpm audit --prod`                            | "No known vulnerabilities" / exit 0 |
| Targeted bump  | `pnpm update picomatch@^2.3.2 --depth Infinity` | lockfile updated              |

## Scope

**In scope**:
- `.github/workflows/pull-request.yaml`
- `.github/workflows/push-release.yaml`
- `pnpm-lock.yaml` (via the pnpm update command only — no hand edits)

**Out of scope** (do NOT touch):
- `package.json` — no manifest change is needed for the picomatch fix; if you
  find yourself editing dependency ranges, STOP
- Release configuration (`release.config.mjs`), workflow permissions/secrets
- tsconfig strictness — a separate concern, tracked in `plans/README.md`

## Git workflow

- Branch: `advisor/018-ci-gates-cache-audit`
- Commit message: `ci: add lint and typecheck gates, pnpm caching; fix picomatch advisory`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Verify the gates pass locally first

```
pnpm run lint:ci && pnpm run typecheck
```

Both must exit 0 **before** you wire them into CI. If either fails, STOP —
report the failures instead of adding a gate that breaks every PR.

### Step 2: Update pull-request.yaml

Reorder pnpm setup before node setup, enable caching, add the two gates
after formatting:

```yaml
      - name: Checkout repository
        uses: actions/checkout@v6

      - name: Setup pnpm CLI
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run format
        run: pnpm run format:ci

      - name: Run lint
        run: pnpm run lint:ci

      - name: Run typecheck
        run: pnpm run typecheck

      - name: Run tests
        run: pnpm run test:ci

      - name: Build project
        run: pnpm run build:ci
```

Keep the file's existing `name:`/`on:` header and job structure untouched.

### Step 3: Apply the same change to push-release.yaml

Same reorder, same `cache: 'pnpm'`, same two new steps in the same position.
Leave the semantic-release step and the `permissions`/`env` blocks exactly as
they are.

**Verify** both files parse: `node -e "const yaml=require('js-yaml'),fs=require('fs');['.github/workflows/pull-request.yaml','.github/workflows/push-release.yaml'].forEach(f=>yaml.load(fs.readFileSync(f,'utf8')));console.log('ok')"` → prints `ok` (js-yaml is a project dependency).

### Step 4: Fix the picomatch advisory

```
pnpm update picomatch@^2.3.2 --depth Infinity
```

**Verify**: `pnpm audit --prod` → no known vulnerabilities (exit 0), and
`grep -n "picomatch@2.3.1" pnpm-lock.yaml` → no matches.

If pnpm refuses because micromatch's range excludes 2.3.2 (it should not —
micromatch@4.0.8 declares `picomatch@^2.3.1`), STOP and report; the fallback
is a `pnpm.overrides` entry, which needs a maintainer decision.

### Step 5: Full local suite

```
pnpm install --frozen-lockfile && pnpm run test:ci && pnpm run build
```

All exit 0 (confirms the lockfile change is consistent and nothing broke).

## Test plan

No new test files. The verification is: local gates green (Step 1), YAML
parses (Step 3), audit clean (Step 4), suite green (Step 5).

## Done criteria

- [ ] Both workflows contain `Run lint` and `Run typecheck` steps
- [ ] Both workflows use `cache: 'pnpm'` with pnpm/action-setup ordered before setup-node
- [ ] `pnpm audit --prod` exits 0 with no findings
- [ ] `pnpm run test:ci` and `pnpm run build` exit 0
- [ ] `git status` shows only the two workflow files and `pnpm-lock.yaml` modified
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- Step 1 fails: the codebase does not currently pass its own lint/typecheck —
  report the errors; fixing them is not in this plan's scope.
- `pnpm update` modifies more of the lockfile than picomatch-related entries
  (inspect `git diff pnpm-lock.yaml` — a handful of hunks is fine, a rewrite
  is not). Revert and report.
- Any workflow edit would touch `permissions`, `secrets`, or the
  semantic-release invocation.

## Maintenance notes

- CI now enforces what CLAUDE.md already asks of contributors (lint + build
  before commit). If oxlint or TS upgrades introduce new violations, CI
  surfaces them at PR time — that is the point.
- The typecheck gate uses the TS 7 Go binary (`typescript@7.0.1-rc`, an
  intentional pin). If the RC misbehaves in CI, report rather than unpinning.
- Consider `pnpm audit --prod --audit-level high` as a future non-blocking CI
  step; deferred to keep this plan minimal.
