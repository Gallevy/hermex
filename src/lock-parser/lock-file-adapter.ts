import fs from 'fs';
import semver from 'semver';

export type MultiVersionMap = Record<string, string[]>;

export interface PackageResolution {
  /**
   * The version resolved for this package's root/direct dependency
   * declaration. `null` when the package isn't a direct dependency of the
   * root project (purely transitive), or root resolution genuinely
   * couldn't be determined (e.g. yarn without a readable package.json).
   */
  rootVersion: string | null;
  /**
   * Every distinct version resolved anywhere in the lockfile for this
   * package, sorted. Always includes `rootVersion` when it is non-null.
   */
  allVersions: string[];
}

export type LockfileResolutionMap = Record<string, PackageResolution>;

export interface LockfileAdapter {
  name: string;
  supportedVersions: string[];
  detect(projectPath: string): string | null;
  resolve(lockfilePath: string, projectPath: string): LockfileResolutionMap;
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

/**
 * Accumulates per-package resolution data (every resolved version, plus
 * which one — if any — is the root/direct dependency's version) while an
 * adapter walks its lockfile in a single pass, then builds the final
 * `LockfileResolutionMap` with sorted, deduplicated version lists.
 */
export function createResolutionAccumulator(): {
  addVersion(pkgName: string, version: string): void;
  setRoot(pkgName: string, version: string): void;
  build(): LockfileResolutionMap;
} {
  const versionSets: Record<string, Set<string>> = {};
  const roots: Record<string, string> = {};

  return {
    addVersion(pkgName, version) {
      (versionSets[pkgName] ??= new Set()).add(version);
    },
    setRoot(pkgName, version) {
      roots[pkgName] = version;
    },
    build() {
      const result: LockfileResolutionMap = {};
      for (const [pkgName, versions] of Object.entries(versionSets)) {
        result[pkgName] = {
          rootVersion: roots[pkgName] ?? null,
          allVersions: Array.from(versions).sort(),
        };
      }
      return result;
    },
  };
}

/** Highest valid semver among `versions`, or `undefined` if none are valid. */
export function maxSemver(versions: string[]): string | undefined {
  return versions
    .filter((v) => semver.valid(v))
    .sort(semver.compare)
    .at(-1);
}
