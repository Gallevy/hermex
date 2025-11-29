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
  found: boolean;
}

/**
 * Parse package-lock.json (npm/npm v7+)
 * @param lockFilePath - Path to package-lock.json
 * @returns Map of package names to versions
 */
export function parsePackageLock(lockFilePath: string): Record<string, string> {
  try {
    const content = fs.readFileSync(lockFilePath, 'utf8');
    const lockData = JSON.parse(content);
    const versions: Record<string, string> = {};

    // npm v7+ uses "packages" field
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

    // npm v6 uses "dependencies" field
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

/**
 * Parse yarn.lock
 * @param lockFilePath - Path to yarn.lock
 * @returns Map of package names to versions
 */
export function parseYarnLock(lockFilePath: string): Record<string, string> {
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

/**
 * Parse pnpm-lock.yaml
 * @param lockFilePath - Path to pnpm-lock.yaml
 * @returns Map of package names to versions
 */
export function parsePnpmLock(lockFilePath: string): Record<string, string> {
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

/**
 * Find and parse the appropriate lockfile in a directory
 * @param projectPath - Path to the project directory
 * @returns Object with versions map and lockfile type
 */
export function findAndParseLockfile(projectPath: string): LockfileResult {
  const lockfiles = [
    {
      name: 'package-lock.json',
      parser: parsePackageLock,
      type: 'npm' as const,
    },
    { name: 'yarn.lock', parser: parseYarnLock, type: 'yarn' as const },
    { name: 'pnpm-lock.yaml', parser: parsePnpmLock, type: 'pnpm' as const },
  ];

  for (const { name, parser, type } of lockfiles) {
    const lockfilePath = path.join(projectPath, name);
    if (fs.existsSync(lockfilePath)) {
      const versions = parser(lockfilePath);
      return {
        versions,
        lockfileType: type,
        lockfilePath,
        found: true,
      };
    }
  }

  return {
    versions: {},
    lockfileType: null,
    lockfilePath: null,
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
