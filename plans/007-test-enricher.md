# Plan 007: Test coverage — npm-registry enricher unit tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 36699c4..HEAD -- src/npm-registry/enricher.ts src/npm-registry/client.ts src/npm-registry/types.ts tests/npm-registry/`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts before proceeding.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: `plans/005-test-mock-factory.md`
- **Category**: tests
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

`enrichWithReleaseAge()` handles network failures, batches concurrent registry
requests, computes days-since-release, and classifies upgrade urgency. All of
this logic is untested. Because `fetchPackageInfo` is a module-level function,
vitest's `vi.mock` can replace it cleanly — no test touches the network.

## Current state

**`src/npm-registry/enricher.ts`** — key exports and helpers:

```ts
// Private helpers (tested indirectly):
function daysSince(dateStr: string): number   // days from date string to now
function classifyBump(installed, candidate): SemverBump | null  // 'patch'|'minor'|'major'
function upgradeLevel(daysAgo, bump, thresholds): UpgradeLevel | null
function computeReleaseAge(installedVersion, timeMap, deprecated, thresholds): ReleaseAgeEntry

// Public export:
export async function enrichWithReleaseAge(
  packages: PackageDistribution[],
  config: ReleaseAgeConfig,
): Promise<{ enriched: PackageDistribution[]; skipped: number }>
```

**`src/npm-registry/client.ts`** — the dependency to mock:
```ts
export async function fetchPackageInfo(
  name: string, registryUrl: string, authToken?: string
): Promise<RegistryPackageInfo | null>
```

**`src/npm-registry/types.ts`** — key types:
```ts
export interface ReleaseAgeEntry {
  installedVersion: string;
  upgrades: AvailableUpgrade[];
  worstLevel: UpgradeLevel | null;
  deprecated?: string;
}
export interface RegistryPackageInfo {
  name: string;
  time: Record<string, string>;   // version -> ISO date string
  deprecated?: string;
  versions: Record<string, { deprecated?: string }>;
}
```

**`tests/helpers/mock-reports.ts`** (from Plan 005):
```ts
import { createMockPackage, createMockReleaseAge } from '../helpers/mock-reports';
```

**Default thresholds** (from `src/config/schema.ts`):
```ts
{ patch: 30, minor: 45, major: 60 }
```
A package version released more than `threshold` days ago triggers the corresponding level.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0, no errors   |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope** (only file to create):
- `tests/npm-registry/enricher.test.ts`

**Out of scope** (do NOT touch):
- `src/npm-registry/enricher.ts` — no source changes
- `src/npm-registry/client.ts` — mocked in tests, not modified
- Any other file

## Git workflow

- Branch: `advisor/007-test-enricher`
- Commit message: `test: add npm-registry enricher unit tests`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create tests/npm-registry/enricher.test.ts

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrichWithReleaseAge } from '../../src/npm-registry/enricher';
import { createMockPackage } from '../helpers/mock-reports';

// Mock the client module — no network in tests
vi.mock('../../src/npm-registry/client', () => ({
  fetchPackageInfo: vi.fn(),
}));

import { fetchPackageInfo } from '../../src/npm-registry/client';
const mockFetch = fetchPackageInfo as ReturnType<typeof vi.fn>;

const DEFAULT_THRESHOLDS = { patch: 30, minor: 45, major: 60 };
const BASE_CONFIG = {
  enabled: true,
  registry: 'https://registry.npmjs.org',
  thresholds: DEFAULT_THRESHOLDS,
};

// Helper: produce an ISO date string N days in the past
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('enrichWithReleaseAge — skipped packages', () => {
  it('skips packages with no version', async () => {
    const pkg = createMockPackage('react', { version: null });
    const { enriched, skipped } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(skipped).toBe(0);
    expect(enriched[0].releaseAge).toBeUndefined();
  });

  it('skips internal packages', async () => {
    const pkg = createMockPackage('@company/ui', { internal: true, version: '1.0.0' });
    await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('increments skipped counter when registry returns null', async () => {
    const pkg = createMockPackage('react', { version: '18.0.0' });
    mockFetch.mockResolvedValueOnce(null);
    const { skipped } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(skipped).toBe(1);
  });

  it('increments skipped counter when registry returns no time field', async () => {
    const pkg = createMockPackage('react', { version: '18.0.0' });
    mockFetch.mockResolvedValueOnce({ name: 'react', time: null, versions: {} });
    const { skipped } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(skipped).toBe(1);
  });
});

describe('enrichWithReleaseAge — upgrade detection', () => {
  it('no upgrade when all newer versions are within threshold', async () => {
    const pkg = createMockPackage('react', { version: '18.0.0' });
    // 18.0.1 released 10 days ago — within patch threshold (30 days)
    mockFetch.mockResolvedValueOnce({
      name: 'react',
      time: { '18.0.0': daysAgo(100), '18.0.1': daysAgo(10) },
      versions: {},
    });

    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.worstLevel).toBeNull();
    expect(enriched[0].releaseAge?.upgrades).toHaveLength(0);
  });

  it('detects needs_upgrade when patch version exceeds threshold', async () => {
    const pkg = createMockPackage('react', { version: '18.0.0' });
    // 18.0.1 released 35 days ago — past patch threshold (30 days)
    mockFetch.mockResolvedValueOnce({
      name: 'react',
      time: { '18.0.0': daysAgo(200), '18.0.1': daysAgo(35) },
      versions: {},
    });

    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.worstLevel).toBe('needs_upgrade');
    expect(enriched[0].releaseAge?.upgrades[0].semverBump).toBe('patch');
  });

  it('detects mandatory_upgrade when major version exceeds threshold', async () => {
    const pkg = createMockPackage('react', { version: '17.0.0' });
    // 18.0.0 released 90 days ago — past major threshold (60 days)
    mockFetch.mockResolvedValueOnce({
      name: 'react',
      time: { '17.0.0': daysAgo(500), '18.0.0': daysAgo(90) },
      versions: {},
    });

    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.worstLevel).toBe('mandatory_upgrade');
  });

  it('surfaces deprecation notice from versions field', async () => {
    const pkg = createMockPackage('old-pkg', { version: '1.0.0' });
    mockFetch.mockResolvedValueOnce({
      name: 'old-pkg',
      time: { '1.0.0': daysAgo(500) },
      versions: { '1.0.0': { deprecated: 'Use new-pkg instead' } },
    });

    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.deprecated).toBe('Use new-pkg instead');
  });
});

describe('enrichWithReleaseAge — batching', () => {
  it('processes multiple packages and returns all enriched', async () => {
    const packages = [
      createMockPackage('react', { version: '18.0.0' }),
      createMockPackage('lodash', { version: '4.17.0' }),
    ];

    // Both return valid time data with no upgrades past threshold
    mockFetch.mockResolvedValue({
      name: 'pkg',
      time: { created: daysAgo(500), modified: daysAgo(1) },
      versions: {},
    });

    const { enriched, skipped } = await enrichWithReleaseAge(packages, BASE_CONFIG);
    expect(enriched).toHaveLength(2);
    expect(skipped).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
```

**Verify**:
```
pnpm run test:ci -- --reporter=verbose
```
→ all enricher tests pass.

### Step 2: Typecheck and lint

```
pnpm run typecheck && pnpm run lint
```

Both exit 0.

## Test plan

Tests cover:
- Skip conditions (no version, internal, registry null, no time field)
- Upgrade detection: within threshold (no upgrade), patch threshold exceeded, major threshold exceeded
- Deprecation notice propagation
- Multi-package batching

Not covered (out of scope):
- The CONCURRENCY=8 batching boundary (would need 9+ packages; low value vs complexity)
- `classifyBump` edge cases for pre-release versions (low priority)

## Done criteria

- [ ] `tests/npm-registry/enricher.test.ts` exists
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run test:ci` exits 0 with new tests passing
- [ ] `pnpm run lint` exits 0
- [ ] No `src/` files modified
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- `vi.mock('../../src/npm-registry/client', ...)` doesn't intercept the import (vitest hoisting issue). Try moving the `vi.mock` call to the top of the file before any imports. If still failing, see vitest docs on `vi.mock` hoisting.
- Plan 005 (mock factory) is not complete — `createMockPackage` doesn't exist yet. Complete Plan 005 first.
- A test for upgrade detection fails because the `daysAgo` helper has off-by-one behavior around threshold boundaries. Adjust the days-ago value (use 35 instead of 31 for a 30-day threshold, etc.).

## Maintenance notes

- When thresholds in the config schema change defaults, the `DEFAULT_THRESHOLDS` constant in the test file needs updating to match.
- When `RegistryPackageInfo` adds new fields, the mock return values may need updating.
- `fetchPackageInfo` is mocked at the module boundary — tests never touch the network.
