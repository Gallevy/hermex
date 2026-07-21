import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RegistryPackageInfo } from '../../src/npm-registry/types';

vi.mock('../../src/npm-registry/client', () => ({
  fetchPackageInfo: vi.fn(),
}));

import { fetchPackageInfo } from '../../src/npm-registry/client';
import {
  getPackageInfo,
  readCache,
  writeCache,
} from '../../src/npm-registry/cache';

const mockFetchPackageInfo = fetchPackageInfo as ReturnType<typeof vi.fn>;

const REGISTRY = 'https://registry.npmjs.org';

function makeInfo(name: string): RegistryPackageInfo {
  return {
    name,
    time: { '1.0.0': new Date().toISOString() },
    versions: {},
  };
}

let cacheDir: string;

beforeEach(async () => {
  vi.clearAllMocks();
  cacheDir = await mkdtemp(join(tmpdir(), 'hermex-cache-test-'));
});

afterEach(async () => {
  await rm(cacheDir, { recursive: true, force: true });
});

describe('readCache / writeCache', () => {
  it('round-trips a written entry', async () => {
    const info = makeInfo('react');
    await writeCache(REGISTRY, 'react', info, { cacheDir });
    const result = await readCache(REGISTRY, 'react', { cacheDir });
    expect(result).toEqual(info);
  });

  it('returns null on a cache miss', async () => {
    const result = await readCache(REGISTRY, 'nonexistent-pkg', { cacheDir });
    expect(result).toBeNull();
  });

  it('returns null and does not throw on a corrupt cache file', async () => {
    const info = makeInfo('lodash');
    await writeCache(REGISTRY, 'lodash', info, { cacheDir });

    const path = join(cacheDir, 'registry.npmjs.org', 'lodash.json');
    await writeFile(path, 'not valid json {{{', 'utf8');

    const result = await readCache(REGISTRY, 'lodash', { cacheDir });
    expect(result).toBeNull();
  });

  it('returns null once the entry is past its TTL', async () => {
    const info = makeInfo('react');
    await writeCache(REGISTRY, 'react', info, { cacheDir });
    const result = await readCache(REGISTRY, 'react', { cacheDir, ttlMs: 0 });
    expect(result).toBeNull();
  });

  it('safely encodes scoped package names into a single filename', async () => {
    const info = makeInfo('@company/ui');
    await writeCache(REGISTRY, '@company/ui', info, { cacheDir });
    const result = await readCache(REGISTRY, '@company/ui', { cacheDir });
    expect(result).toEqual(info);
  });

  it('produces valid JSON after many concurrent writes to the same key', async () => {
    const writes = Array.from({ length: 10 }, (_, i) =>
      writeCache(REGISTRY, 'react', makeInfo(`react-${i}`), { cacheDir }),
    );
    await Promise.all(writes);

    const result = await readCache(REGISTRY, 'react', { cacheDir });
    expect(result).not.toBeNull();
    expect(result?.name).toMatch(/^react-\d$/);
  });
});

describe('getPackageInfo', () => {
  it('returns the cached value without calling fetchPackageInfo on a hit', async () => {
    const info = makeInfo('react');
    await writeCache(REGISTRY, 'react', info, { cacheDir });

    const result = await getPackageInfo('react', REGISTRY, undefined, {
      cacheDir,
    });

    expect(result).toEqual(info);
    expect(mockFetchPackageInfo).not.toHaveBeenCalled();
  });

  it('fetches live and populates the cache on a miss', async () => {
    const info = makeInfo('react');
    mockFetchPackageInfo.mockResolvedValueOnce(info);

    const result = await getPackageInfo('react', REGISTRY, undefined, {
      cacheDir,
    });

    expect(result).toEqual(info);
    expect(mockFetchPackageInfo).toHaveBeenCalledTimes(1);

    const cached = await readCache(REGISTRY, 'react', { cacheDir });
    expect(cached).toEqual(info);
  });

  it('bypasses the cache entirely when an authToken is present', async () => {
    const info = makeInfo('react');
    await writeCache(REGISTRY, 'react', info, { cacheDir });
    mockFetchPackageInfo.mockResolvedValueOnce(makeInfo('react-fresh'));

    const result = await getPackageInfo('react', REGISTRY, 'secret-token', {
      cacheDir,
    });

    expect(result?.name).toBe('react-fresh');
    expect(mockFetchPackageInfo).toHaveBeenCalledTimes(1);
  });

  it('bypasses the cache entirely when disabled is set', async () => {
    const info = makeInfo('react');
    await writeCache(REGISTRY, 'react', info, { cacheDir });
    mockFetchPackageInfo.mockResolvedValueOnce(makeInfo('react-fresh'));

    const result = await getPackageInfo('react', REGISTRY, undefined, {
      cacheDir,
      disabled: true,
    });

    expect(result?.name).toBe('react-fresh');
  });

  it('does not throw when the cache directory cannot be created', async () => {
    const blockerFile = join(cacheDir, 'blocker');
    await writeFile(blockerFile, 'x', 'utf8');
    const badCacheDir = join(blockerFile, 'npm');

    const info = makeInfo('react');
    mockFetchPackageInfo.mockResolvedValueOnce(info);

    const result = await getPackageInfo('react', REGISTRY, undefined, {
      cacheDir: badCacheDir,
    });

    expect(result).toEqual(info);
  });
});
