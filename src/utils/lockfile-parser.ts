import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import lockfile from '@yarnpkg/lockfile';

/**
 * Lockfile parse result
 */
export interface LockfileResult {
  versions: Record<string, string>;
  lockfileType: 'npm' | 'yarn' | 'pnpm' | null;
  lockfilePath: string | null;
  supportedVersions: string[];
  found: boolean;
}

/**
 * Base adapter interface for lockfile parsing
 */
interface LockfileAdapter {
  name: string;
  supportedVersions: string[];
  detect(projectPath: string): string | null;
  parse(lockfilePath: string): Record<string, string>;
}

/**
 * Adapter for npm package-lock.json
 * Supports: lockfileVersion 2, 3 (npm v7+)
 */
class NpmLockfileAdapter implements LockfileAdapter {
  name = 'npm';
  supportedVersions = ['v2', 'v3'];

  detect(projectPath: string): string | null {
    const lockfilePath = path.join(projectPath, 'package-lock.json');
    return fs.existsSync(lockfilePath) ? lockfilePath : null;
  }

  parse(lockFilePath: string): Record<string, string> {
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      const lockData = JSON.parse(content);
      const versions: Record<string, string> = {};

      // npm v7+ uses "packages" field (lockfileVersion 2, 3)
      if (lockData.packages) {
        Object.entries(lockData.packages).forEach(
          ([pkgPath, pkgData]: [string, any]) => {
            if (!pkgPath || pkgPath === '') return; // Skip root

            // Remove leading "node_modules/"
            const pkgName = pkgPath.replace(/^node_modules\//, '');

            if (pkgData.version) {
              versions[pkgName] = pkgData.version;
            }
          },
        );
      }

      // npm v6 uses "dependencies" field (fallback)
      if (lockData.dependencies && Object.keys(versions).length === 0) {
        function extractVersions(deps: any, prefix = ''): void {
          Object.entries(deps).forEach(([name, data]: [string, any]) => {
            const fullName = prefix ? `${prefix}/${name}` : name;
            if (data.version) {
              versions[fullName] = data.version;
            }
            if (data.dependencies) {
              extractVersions(data.dependencies, fullName);
            }
          });
        }
        extractVersions(lockData.dependencies);
      }

      return versions;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Could not parse package-lock.json: ${message}`);
      return {};
    }
  }
}

/**
 * Adapter for yarn.lock
 * Supports: v1 (classic), v2+ (berry)
 */
class YarnLockfileAdapter implements LockfileAdapter {
  name = 'yarn';
  supportedVersions = ['v1', 'v2+'];

  detect(projectPath: string): string | null {
    const lockfilePath = path.join(projectPath, 'yarn.lock');
    return fs.existsSync(lockfilePath) ? lockfilePath : null;
  }

  parse(lockFilePath: string): Record<string, string> {
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      const parsed = lockfile.parse(content);

      if (parsed.type !== 'success') {
        console.warn('Warning: Failed to parse yarn.lock');
        return {};
      }

      const versions: Record<string, string> = {};

      Object.entries(parsed.object).forEach(([key, value]: [string, any]) => {
        // Key format: "package@^1.0.0" or "@scope/package@^1.0.0"
        // Extract package name (without version specifier)
        let pkgName = key;

        // Handle scoped packages
        if (key.startsWith('@')) {
          const match = key.match(/^(@[^@]+\/[^@]+)@/);
          if (match) {
            pkgName = match[1];
          }
        } else {
          const match = key.match(/^([^@]+)@/);
          if (match) {
            pkgName = match[1];
          }
        }

        if (value.version && (!versions[pkgName] || value.version)) {
          versions[pkgName] = value.version;
        }
      });

      return versions;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Could not parse yarn.lock: ${message}`);
      return {};
    }
  }
}

/**
 * Adapter for pnpm-lock.yaml
 * Supports: v5, v6-8, v9+
 */
class PnpmLockfileAdapter implements LockfileAdapter {
  name = 'pnpm';
  supportedVersions = ['v5', 'v6', 'v9'];

  detect(projectPath: string): string | null {
    const lockfilePath = path.join(projectPath, 'pnpm-lock.yaml');
    return fs.existsSync(lockfilePath) ? lockfilePath : null;
  }

  parse(lockFilePath: string): Record<string, string> {
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      const lockData = yaml.load(content) as any;
      const versions: Record<string, string> = {};

      // pnpm v9+ uses "importers" field
      if (lockData.importers) {
        const rootImporter = lockData.importers['.'];
        if (rootImporter) {
          // Parse dependencies
          if (rootImporter.dependencies) {
            Object.entries(rootImporter.dependencies).forEach(
              ([name, data]: [string, any]) => {
                if (typeof data === 'object' && data.version) {
                  versions[name] = data.version;
                }
              },
            );
          }
          // Parse devDependencies
          if (rootImporter.devDependencies) {
            Object.entries(rootImporter.devDependencies).forEach(
              ([name, data]: [string, any]) => {
                if (typeof data === 'object' && data.version) {
                  versions[name] = data.version;
                }
              },
            );
          }
        }
      }

      // pnpm v6-8 uses "packages" field
      if (lockData.packages && Object.keys(versions).length === 0) {
        Object.keys(lockData.packages).forEach((key) => {
          // Key format: "/@babel/core/7.22.5" or "/package/1.0.0"
          const match = key.match(/\/(.+?)\/(\d+\.\d+\.\d+.*?)(?:_|$)/);
          if (match) {
            const [, pkgName, version] = match;
            versions[pkgName] = version;
          }
        });
      }

      // pnpm v5 uses "dependencies" and "specifiers"
      if (lockData.dependencies && Object.keys(versions).length === 0) {
        Object.entries(lockData.dependencies).forEach(
          ([name, versionSpec]: [string, any]) => {
            // versionSpec format: "1.0.0" or "link:../package"
            if (
              typeof versionSpec === 'string' &&
              !versionSpec.startsWith('link:')
            ) {
              versions[name] = versionSpec;
            } else if (typeof versionSpec === 'object' && versionSpec.version) {
              versions[name] = versionSpec.version;
            }
          },
        );
      }

      return versions;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Could not parse pnpm-lock.yaml: ${message}`);
      return {};
    }
  }
}

/**
 * Registry of all supported lockfile adapters
 */
const LOCKFILE_ADAPTERS: LockfileAdapter[] = [
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
        found: true,
      };
    }
  }

  return {
    versions: {},
    lockfileType: null,
    lockfilePath: null,
    supportedVersions: [],
    found: false,
  };
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

/**
 * Format component name with package version
 * @param componentName - Name of the component
 * @param packageName - Name of the package
 * @param projectPath - Path to the project directory
 * @returns Formatted string like "Button from @mui/material@5.14.0"
 */
export function formatComponentWithVersion(
  componentName: string,
  packageName: string,
  projectPath: string,
): string {
  const version = getPackageVersion(projectPath, packageName);

  if (version) {
    return `${componentName} from ${packageName}@${version}`;
  }

  return `${componentName} from ${packageName}`;
}
