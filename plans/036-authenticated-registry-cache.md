# Plan 036: Cache authenticated registry responses instead of refetching every run

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 688c481..HEAD -- src/npm-registry/ tests/npm-registry/`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED — writes registry metadata for private packages to disk
- **Depends on**: none. If plan 035 is queued, run **035 first** — it changes
  `client.ts`'s return type, and rebasing this on top is easier than the reverse.
- **Category**: perf
- **Planned at**: commit `688c481`, 2026-08-15
- **Map ticket**: [#112 Performance baseline](https://github.com/Gallevy/hermex/issues/112)

> ### Assumptions this plan encodes
>
> 1. **Caching authenticated responses is acceptable** when the cache is
>    scoped per-token and the files are user-readable only. That is a security
>    tradeoff [#112](https://github.com/Gallevy/hermex/issues/112) should
>    confirm — the current `!authToken` guard is not obviously an oversight, it
>    may be a deliberate "never persist anything from a private registry".
> 2. **Measurement comes first.** #112's whole point is that nothing is measured.
>    Step 1 of this plan *is* a measurement; if it shows the authed path is not
>    dominant, stop and report rather than shipping the fix.
>
> If assumption 1 is rejected, the fallback is an **in-process** cache (Step 6),
> which persists nothing and still removes duplicate lookups within one run.

## Why this matters

`getPackageInfo` disables the cache entirely whenever an auth token is present.
Any run against a private registry — configured via `releaseAge.authToken` or
`HERMEX_REGISTRY_AUTH_TOKEN` — refetches **every** package on **every** run,
forever.

That is precisely the enterprise user hermex is aimed at, running `comply` on
every PR. With `CONCURRENCY = 8` and a 10-second per-request timeout, the authed
path can plausibly dominate total wall-clock while the public path is nearly
free from cache. Any performance target set without separating the two would be
measuring the wrong thing.

## Current state

**`src/npm-registry/cache.ts:91-109`** — the guard:

```ts
export async function getPackageInfo(
  packageName: string,
  registryUrl: string,
  authToken?: string,
  options?: CacheOptions,
): Promise<RegistryPackageInfo | null> {
  const cacheEnabled = !authToken && !options?.disabled;

  if (cacheEnabled) {
    const cached = await readCache(registryUrl, packageName, options);
    if (cached) return cached;
  }

  const info = await fetchPackageInfo(packageName, registryUrl, authToken);
  if (info && cacheEnabled) {
    await writeCache(registryUrl, packageName, info, options);
  }
  return info;
}
```

**`src/npm-registry/cache.ts:27-36`** — the path scheme, keyed by registry host
and package name but **not** by token:

```ts
function cachePathFor(registryUrl: string, packageName: string, options?: CacheOptions): string {
  const root = options?.cacheDir ?? DEFAULT_CACHE_DIR;
  const host = new URL(registryUrl).host.replace(/:/g, '_');
  const fileName = `${encodeURIComponent(packageName)}.json`;
  return join(root, host, fileName);
}
```

`DEFAULT_CACHE_DIR` is `join(homedir(), '.hermex', 'cache', 'npm')`
(`cache.ts:9`). The write is atomic (temp file + `rename`, `cache.ts:63-89`) and
the read validates `registryUrl` and `packageName` against the entry before
trusting it (`cache.ts:49-55`) — both good patterns to preserve.

**`src/npm-registry/enricher.ts:369-375`** — the cache options built per run:

```ts
  const envTtl = Number(process.env['HERMEX_REGISTRY_CACHE_TTL_MS']);
  const cacheOptions: CacheOptions = {
    ttlMs: Number.isFinite(envTtl) && envTtl > 0 ? envTtl : config.cacheTtlMs,
    disabled:
      process.env['HERMEX_REGISTRY_CACHE_DISABLED'] === '1' ||
      config.cacheDisabled === true,
  };
```

**Existing tests**: `tests/npm-registry/cache.test.ts` exercises the cache with
an overridden `cacheDir`. Follow its style — never let a test write to the real
`~/.hermex`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm run test:ci` | all pass |
| Cache tests | `pnpm run test:ci -- tests/npm-registry/cache.test.ts` | all pass |
| Lint | `pnpm run lint:ci` | exit 0 |
| Format check | `pnpm run format:ci` | exit 0 |
| Build | `pnpm run build:ci` | exit 0 |
| Output review | `pnpm run test:output` | 0 changed |

## Scope

**In scope**:
- `src/npm-registry/cache.ts`
- `src/npm-registry/enricher.ts` — only if the token has to be threaded further
- `src/config/schema.ts` — the opt-out flag in Step 4
- `tests/npm-registry/cache.test.ts`
- `README.md` / `docs/examples.md` — document the new flag and cache location

**Out of scope** (do NOT touch):
- `src/npm-registry/client.ts` — the fetch itself is fine.
- `computeReleaseAge` and everything below it in `enricher.ts` — dense,
  heavily-documented policy logic.
- Cache eviction / size limits. The TTL already bounds staleness; a reaper is a
  separate concern.
- **Never log or write the token value itself.** Only its hash (Step 2).

## Steps

### Step 1: Measure before changing anything

This plan exists to serve [#112](https://github.com/Gallevy/hermex/issues/112),
whose premise is that nothing is measured. Produce a number first.

Add a temporary timing harness (do **not** commit it) that runs
`enrichWithReleaseAge` over a realistic package list twice — once with a token
set, once without — against a local stub registry, and reports wall-clock for
each.

Record: cold public, warm public (cache hit), cold authed, warm authed.

**Verify**: you have four numbers. If warm-authed is not meaningfully slower
than warm-public, **STOP and report** — the premise of this plan is wrong and
the fix is not worth its security tradeoff.

### Step 2: Key the cache path by token identity

An authed cache must never serve a response fetched under a different token, or
serve private data to an unauthenticated run.

In `cachePathFor`, add a token-derived path segment:

```ts
import { createHash } from 'node:crypto';

/**
 * Cache entries are partitioned by credential, not just by registry: two tokens
 * may be entitled to different views of the same private package, and an
 * unauthenticated run must never read an authenticated entry. The token is
 * hashed — the value itself is never written to disk or logged.
 */
function tokenScope(authToken?: string): string {
  if (!authToken) return 'anon';
  return createHash('sha256').update(authToken).digest('hex').slice(0, 16);
}
```

and include it in the path: `join(root, host, tokenScope(authToken), fileName)`.

This means `cachePathFor`, `readCache` and `writeCache` all take `authToken`.
Thread it through.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 3: Enable the cache for authenticated runs

Change the guard:

```ts
  const cacheEnabled = !options?.disabled;
```

and pass `authToken` into `readCache` / `writeCache`.

**Verify**: `pnpm run typecheck` → exit 0; `pnpm run test:ci -- tests/npm-registry/` → all pass.

### Step 4: Restrict cache file permissions, and add the opt-out

Private registry metadata should not be world-readable. In `writeCache`, pass
`{ mode: 0o600 }` to `writeFile`, and create the directory with `{ mode: 0o700 }`.

Note: file modes are advisory on Windows. Do not gate behaviour on them; just
set them.

Add an opt-out to `src/config/schema.ts` inside the `releaseAge` object, for
users whose policy forbids persisting private metadata at all:

```ts
      cacheAuthenticated: z.boolean().default(true),
```

and honour it in the `cacheEnabled` expression, alongside a
`HERMEX_REGISTRY_CACHE_AUTHENTICATED=0` env override matching the existing
`HERMEX_REGISTRY_CACHE_DISABLED` convention (`enricher.ts:369-375`).

**Verify**: `pnpm run typecheck` → exit 0.

### Step 5: Test the isolation properties

Add to `tests/npm-registry/cache.test.ts`, using an overridden `cacheDir`:

1. An entry written under token A is **not** returned for token B.
2. An entry written under token A is **not** returned for an unauthenticated read.
3. An entry written unauthenticated is **not** returned for an authed read.
4. An entry written under token A **is** returned for a second read with token A
   (the actual win).
5. `cacheAuthenticated: false` disables read and write for authed calls while
   leaving unauthenticated caching working.
6. No file anywhere under the test cache dir contains the token string —
   walk the directory and assert.

Test 6 is the one that matters most; write it even though it feels paranoid.

**Verify**: `pnpm run test:ci -- tests/npm-registry/cache.test.ts` → all pass,
6 new tests.

### Step 6: Fallback if assumption 1 is rejected

Only if a reviewer rejects on-disk caching of authed responses: replace Steps
2–4 with a per-process `Map<string, RegistryPackageInfo>` inside
`enrichWithReleaseAge`, cleared when the function returns. It persists nothing
and still removes duplicate lookups within one run.

Do not implement this speculatively — it is the documented fallback, not the
default path.

### Step 7: Document it

`README.md` and/or `docs/examples.md`: the cache location
(`~/.hermex/cache/npm`), the TTL default (1 hour), the existing
`HERMEX_REGISTRY_CACHE_TTL_MS` / `HERMEX_REGISTRY_CACHE_DISABLED` env vars —
which are **currently undocumented**, per plan 022 step 4 — and the new
`cacheAuthenticated` flag.

**Verify**: `pnpm run format:ci` → exit 0.

## Test plan

6 new tests in `tests/npm-registry/cache.test.ts` as listed in Step 5.
Structural pattern: the existing tests in that file, which already override
`cacheDir` — **every** new test must do the same. A test that writes to the real
`~/.hermex` is a bug in the test.

Report the Step 1 numbers in the PR description; they are the justification and
they feed #112.

## Done criteria

ALL must hold:

- [ ] `pnpm run format:ci`, `lint:ci`, `typecheck`, `test:ci`, `build:ci` all exit 0
- [ ] `pnpm run test:output` → **0 changed** (no user-visible output change)
- [ ] 6 new cache tests pass, including the "token never appears on disk" walk
- [ ] `grep -n "!authToken" src/npm-registry/cache.ts` returns no matches
- [ ] Step 1's four measurements are recorded in the PR description
- [ ] `README.md` documents the cache location, TTL, env vars and new flag
- [ ] A changeset exists (`--minor`)
- [ ] `git status` shows no modified files outside the Scope list, and the
      temporary timing harness from Step 1 is **not** committed
- [ ] `plans/README.md` status row for 036 updated

## STOP conditions

Stop and report back if:

- The excerpts in "Current state" do not match the live code.
- **Step 1 shows the authed path is not meaningfully slower than the cached
  public path.** The plan's premise is then false; do not ship the tradeoff.
- Any test in Step 5 fails in a way that suggests cross-token leakage is
  possible — that is a security property, not a bug to iterate on.
- `pnpm run test:output` shows any change. This plan must be invisible in output.
- Threading `authToken` into `readCache`/`writeCache` requires changing
  `enrichWithReleaseAge`'s batching loop structure.

## Maintenance notes

- The token hash is a **cache partition key, not a security boundary**. Anyone
  who can read `~/.hermex` can read the cached metadata; the 0600 mode and the
  partitioning stop accidental cross-token reuse, not a determined local
  attacker. Say this in review rather than letting the hash imply more.
- If a token is rotated, its old partition is orphaned and expires by TTL. That
  is acceptable; a reaper is deliberately out of scope.
- `cacheAuthenticated` is a new config key — if plan 030's `.strict()` step has
  landed, adding it to the schema is mandatory or every config using it fails.
- Whoever executes [#112](https://github.com/Gallevy/hermex/issues/112) should
  fold Step 1's numbers into the baseline rather than re-measuring.
