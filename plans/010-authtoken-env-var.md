# Plan 010: Support HERMEX_REGISTRY_AUTH_TOKEN environment variable

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 36699c4..HEAD -- src/config/schema.ts src/npm-registry/enricher.ts src/npm-registry/client.ts README.md`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts before proceeding.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction / security / DX
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

The `releaseAge.authToken` config field accepts an auth token as a plain string.
Storing tokens in config files risks accidental commits. The ecosystem precedent
is environment variables: npm uses `NPM_TOKEN`, pnpm uses `.npmrc` env
interpolation. Hermex should follow this pattern by reading
`HERMEX_REGISTRY_AUTH_TOKEN` as a fallback when `authToken` is not set in
the config file.

This is an **additive** change — the config file field is kept for backward
compatibility; the env var is checked only when the config field is absent.

## Current state

**`src/npm-registry/enricher.ts`** — `enrichWithReleaseAge` reads token from config:
```ts
export async function enrichWithReleaseAge(
  packages: PackageDistribution[],
  config: ReleaseAgeConfig,
): Promise<{ enriched: PackageDistribution[]; skipped: number }> {
  const registryUrl = config.registry;
  // ...
  const info = await fetchPackageInfo(
    pkg.packageName,
    registryUrl,
    config.authToken,  // ← token comes only from config
  );
```

**`src/npm-registry/client.ts`** — `fetchPackageInfo` accepts optional authToken:
```ts
export async function fetchPackageInfo(
  name: string,
  registryUrl: string,
  authToken?: string,
): Promise<RegistryPackageInfo | null>
```

**`src/config/schema.ts`** — `authToken` field (line 100):
```ts
releaseAge: z.object({
  // ...
  authToken: z.string().optional(),
  // ...
})
```

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0, no errors   |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope**:
- `src/npm-registry/enricher.ts` — resolve token from config or env var
- `README.md` — document the env var

**Out of scope** (do NOT touch):
- `src/config/schema.ts` — the `authToken` field stays as-is for backward compat
- `src/npm-registry/client.ts` — no changes needed; already accepts optional token
- Any test file (the env-var behavior is tested by integration; a unit test here would mock `process.env` which is fragile)

## Git workflow

- Branch: `advisor/010-authtoken-env-var`
- Commit message: `feat: support HERMEX_REGISTRY_AUTH_TOKEN environment variable`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Resolve token from env var as fallback in enricher

In `src/npm-registry/enricher.ts`, change the token resolution inside
`enrichWithReleaseAge`. Find the line:
```ts
const registryUrl = config.registry;
```

Add the env var fallback immediately after:
```ts
const registryUrl = config.registry;
const authToken = config.authToken ?? process.env['HERMEX_REGISTRY_AUTH_TOKEN'];
```

Then find the `fetchPackageInfo` call:
```ts
const info = await fetchPackageInfo(
  pkg.packageName,
  registryUrl,
  config.authToken,
);
```

Change to:
```ts
const info = await fetchPackageInfo(
  pkg.packageName,
  registryUrl,
  authToken,
);
```

**Verify**:
```
pnpm run typecheck
```
→ exits 0. The type of `authToken` is `string | undefined`, which matches `fetchPackageInfo`'s third parameter.

### Step 2: Update README.md

Find the section documenting `releaseAge` configuration (search for `authToken`
or `releaseAge` in `README.md`). Add a note that the token can also be supplied
via environment variable:

```markdown
> **Tip**: Instead of storing `authToken` in your config file, set the
> `HERMEX_REGISTRY_AUTH_TOKEN` environment variable. The config field takes
> precedence if both are set.
```

Place this tip immediately after the `authToken` field description.

If no `releaseAge` documentation section exists in `README.md`, add the env var
name to the CLI usage section or a "Configuration" section.

**Verify**: `grep -n "HERMEX_REGISTRY_AUTH_TOKEN" README.md` → at least 1 match.

### Step 3: Final validation

```
pnpm run build && pnpm run test:ci && pnpm run lint
```

All must exit 0.

## Test plan

No new automated tests for this change. The env var resolution is a single
`??` expression; testing it would require mocking `process.env` per-test which
is more fragile than the code itself. The E2E test (`pnpm run dev:scan`) with
`HERMEX_REGISTRY_AUTH_TOKEN=test` set in the environment is sufficient manual
verification.

If you want an automated test, add a case to Plan 007's enricher test that
sets `process.env['HERMEX_REGISTRY_AUTH_TOKEN'] = 'test-token'` and verifies
`fetchPackageInfo` is called with that token. Clean up `process.env` in `afterEach`.

## Done criteria

- [ ] `grep -n "HERMEX_REGISTRY_AUTH_TOKEN" src/npm-registry/enricher.ts` → 1 match
- [ ] `grep -n "HERMEX_REGISTRY_AUTH_TOKEN" README.md` → ≥1 match
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm run test:ci` exits 0
- [ ] Only `src/npm-registry/enricher.ts` and `README.md` modified
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- `pnpm run typecheck` reports a type error on `process.env['HERMEX_REGISTRY_AUTH_TOKEN']`. The type of that expression is `string | undefined`, which matches. If it errors, check if the `@types/node` version in devDependencies provides `process.env` typings.
- `README.md` has no section mentioning `authToken` or `releaseAge`. In that case, add a new section rather than placing the tip in an unrelated location.

## Maintenance notes

- Precedence: config file `authToken` → `HERMEX_REGISTRY_AUTH_TOKEN` env var → undefined (no auth).
- If the config schema ever makes `authToken` required, this fallback becomes the only escape hatch for CI environments — keep it.
- Document this env var in any CI setup guides or GitHub Action examples in the README.
