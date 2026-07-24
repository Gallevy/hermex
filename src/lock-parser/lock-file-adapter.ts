import fs from 'fs';

export type MultiVersionMap = Record<string, string[]>;

export interface LockfileAdapter {
  name: string;
  supportedVersions: string[];
  detect(projectPath: string): string | null;
  parse(lockfilePath: string): Record<string, string>;
  parseMultiVersion?(lockfilePath: string): MultiVersionMap;
}

/**
 * Reads a lockfile and parses it with `parseFn`, returning `fallback` and
 * warning to the console if the file can't be read or `parseFn` throws.
 */
export function readAndParseLockfile<T>(
  lockFilePath: string,
  parseFn: (content: string) => T,
  fallback: T,
  warnLabel: string,
): T {
  try {
    const content = fs.readFileSync(lockFilePath, 'utf8');
    return parseFn(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Could not parse ${warnLabel}: ${message}`);
    return fallback;
  }
}

/** Converts `{ pkg: Set<version> }` into a `MultiVersionMap` with sorted, deduplicated version arrays. */
export function toSortedMultiVersionMap(
  versionSets: Record<string, Set<string>>,
): MultiVersionMap {
  const result: MultiVersionMap = {};
  for (const [pkg, versions] of Object.entries(versionSets)) {
    result[pkg] = Array.from(versions).sort();
  }
  return result;
}
