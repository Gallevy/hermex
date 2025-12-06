import { NpmLockfileAdapter } from './patterns/npm';
import { PnpmLockfileAdapter } from './patterns/pnpm';
import { YarnLockfileAdapter } from './patterns/yarn';

/**
 * Lockfile parse result
 */
export interface LockfileResult {
  versions: Record<string, string>;
  lockfileType: 'npm' | 'yarn' | 'pnpm' | null;
  lockfilePath: string | null;
  supportedVersions: string[];
}

const LOCKFILE_ADAPTERS = [
  new NpmLockfileAdapter(),
  new YarnLockfileAdapter(),
  new PnpmLockfileAdapter(),
];

/**
 * Find and parse the appropriate lockfile in a directory
 * @param projectPath - Path to the project directory
 * @returns Object with versions map and lockfile type
 */
export function findAndParseLockfile(projectPath: string): LockfileResult {
  for (const adapter of LOCKFILE_ADAPTERS) {
    const lockfilePath = adapter.detect(projectPath);
    if (lockfilePath) {
      const versions = adapter.parse(lockfilePath);
      return {
        versions,
        lockfileType: adapter.name as 'npm' | 'yarn' | 'pnpm',
        lockfilePath,
        supportedVersions: adapter.supportedVersions,
      };
    }
  }

  throw new Error('No supported lockfile found');
}

/**
 * Get the version of a specific package from lockfile
 * @param projectPath - Path to the project directory
 * @param packageName - Name of the package
 * @returns Version string or null if not found
 */
export function getPackageVersion(
  projectPath: string,
  packageName: string,
): string | null {
  const { versions } = findAndParseLockfile(projectPath);
  return versions[packageName] || null;
}

/**
 * Get versions for multiple packages
 * @param projectPath - Path to the project directory
 * @param packageNames - Array of package names
 * @returns Map of package names to versions
 */
export function getPackageVersions(
  projectPath: string,
  packageNames: string[],
): Record<string, string> {
  const { versions } = findAndParseLockfile(projectPath);
  const result: Record<string, string> = {};

  packageNames.forEach((pkgName) => {
    if (versions[pkgName]) {
      result[pkgName] = versions[pkgName];
    }
  });

  return result;
}
