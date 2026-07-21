import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { RegistryPackageInfo } from './types';
import { fetchPackageInfo } from './client';

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_CACHE_DIR = join(homedir(), '.hermex', 'cache', 'npm');

export interface CacheOptions {
  /** Time-to-live for cache entries, in milliseconds. Default: 1 hour. */
  ttlMs?: number;
  /** Override the cache root directory — primarily for tests. */
  cacheDir?: string;
  /** Fully disable cache reads and writes (falls straight through to a live fetch). */
  disabled?: boolean;
}

interface CacheEntry {
  cachedAt: number;
  registryUrl: string;
  packageName: string;
  data: RegistryPackageInfo;
}

function cachePathFor(
  registryUrl: string,
  packageName: string,
  options?: CacheOptions,
): string {
  const root = options?.cacheDir ?? DEFAULT_CACHE_DIR;
  const host = new URL(registryUrl).host.replace(/:/g, '_');
  const fileName = `${encodeURIComponent(packageName)}.json`;
  return join(root, host, fileName);
}

export async function readCache(
  registryUrl: string,
  packageName: string,
  options?: CacheOptions,
): Promise<RegistryPackageInfo | null> {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  try {
    const path = cachePathFor(registryUrl, packageName, options);
    const raw = await readFile(path, 'utf8');
    const entry = JSON.parse(raw) as CacheEntry;

    if (
      entry.registryUrl !== registryUrl ||
      entry.packageName !== packageName
    ) {
      return null;
    }
    if (Date.now() - entry.cachedAt >= ttlMs) return null;

    return entry.data;
  } catch {
    return null;
  }
}

export async function writeCache(
  registryUrl: string,
  packageName: string,
  data: RegistryPackageInfo,
  options?: CacheOptions,
): Promise<void> {
  const finalPath = cachePathFor(registryUrl, packageName, options);
  const tmpPath = `${finalPath}.tmp-${randomUUID()}`;

  try {
    await mkdir(dirname(finalPath), { recursive: true });
    const entry: CacheEntry = {
      cachedAt: Date.now(),
      registryUrl,
      packageName,
      data,
    };
    await writeFile(tmpPath, JSON.stringify(entry), 'utf8');
    await rename(tmpPath, finalPath);
  } catch {
    try {
      await unlink(tmpPath);
    } catch {
      // best-effort cleanup only
    }
  }
}

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
