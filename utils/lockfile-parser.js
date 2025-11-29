const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const lockfile = require('@yarnpkg/lockfile');

/**
 * Parse package-lock.json (npm/npm v7+)
 * @param {string} lockFilePath - Path to package-lock.json
 * @returns {Object} Map of package names to versions
 */
function parsePackageLock(lockFilePath) {
  try {
    const content = fs.readFileSync(lockFilePath, 'utf8');
    const lockData = JSON.parse(content);
    const versions = {};

    // npm v7+ uses "packages" field
    if (lockData.packages) {
      Object.entries(lockData.packages).forEach(([pkgPath, pkgData]) => {
        if (!pkgPath || pkgPath === '') return; // Skip root

        // Remove leading "node_modules/"
        const pkgName = pkgPath.replace(/^node_modules\//, '');

        if (pkgData.version) {
          versions[pkgName] = pkgData.version;
        }
      });
    }

    // npm v6 uses "dependencies" field
    if (lockData.dependencies && Object.keys(versions).length === 0) {
      function extractVersions(deps, prefix = '') {
        Object.entries(deps).forEach(([name, data]) => {
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
    console.warn(
      `Warning: Could not parse package-lock.json: ${error.message}`,
    );
    return {};
  }
}

/**
 * Parse yarn.lock
 * @param {string} lockFilePath - Path to yarn.lock
 * @returns {Object} Map of package names to versions
 */
function parseYarnLock(lockFilePath) {
  try {
    const content = fs.readFileSync(lockFilePath, 'utf8');
    const parsed = lockfile.parse(content);

    if (parsed.type !== 'success') {
      console.warn('Warning: Failed to parse yarn.lock');
      return {};
    }

    const versions = {};

    Object.entries(parsed.object).forEach(([key, value]) => {
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
    console.warn(`Warning: Could not parse yarn.lock: ${error.message}`);
    return {};
  }
}

/**
 * Parse pnpm-lock.yaml
 * @param {string} lockFilePath - Path to pnpm-lock.yaml
 * @returns {Object} Map of package names to versions
 */
function parsePnpmLock(lockFilePath) {
  try {
    const content = fs.readFileSync(lockFilePath, 'utf8');
    const lockData = yaml.load(content);
    const versions = {};

    // pnpm v9+ uses "importers" field
    if (lockData.importers) {
      const rootImporter = lockData.importers['.'];
      if (rootImporter) {
        // Parse dependencies
        if (rootImporter.dependencies) {
          Object.entries(rootImporter.dependencies).forEach(([name, data]) => {
            if (typeof data === 'object' && data.version) {
              versions[name] = data.version;
            }
          });
        }
        // Parse devDependencies
        if (rootImporter.devDependencies) {
          Object.entries(rootImporter.devDependencies).forEach(
            ([name, data]) => {
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
      Object.entries(lockData.dependencies).forEach(([name, versionSpec]) => {
        // versionSpec format: "1.0.0" or "link:../package"
        if (
          typeof versionSpec === 'string' &&
          !versionSpec.startsWith('link:')
        ) {
          versions[name] = versionSpec;
        } else if (typeof versionSpec === 'object' && versionSpec.version) {
          versions[name] = versionSpec.version;
        }
      });
    }

    return versions;
  } catch (error) {
    console.warn(`Warning: Could not parse pnpm-lock.yaml: ${error.message}`);
    return {};
  }
}

/**
 * Find and parse the appropriate lockfile in a directory
 * @param {string} projectPath - Path to the project directory
 * @returns {Object} Object with versions map and lockfile type
 */
function findAndParseLockfile(projectPath) {
  const lockfiles = [
    { name: 'package-lock.json', parser: parsePackageLock, type: 'npm' },
    { name: 'yarn.lock', parser: parseYarnLock, type: 'yarn' },
    { name: 'pnpm-lock.yaml', parser: parsePnpmLock, type: 'pnpm' },
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
 * @param {string} projectPath - Path to the project directory
 * @param {string} packageName - Name of the package
 * @returns {string|null} Version string or null if not found
 */
function getPackageVersion(projectPath, packageName) {
  const { versions } = findAndParseLockfile(projectPath);
  return versions[packageName] || null;
}

/**
 * Get versions for multiple packages
 * @param {string} projectPath - Path to the project directory
 * @param {string[]} packageNames - Array of package names
 * @returns {Object} Map of package names to versions
 */
function getPackageVersions(projectPath, packageNames) {
  const { versions } = findAndParseLockfile(projectPath);
  const result = {};

  packageNames.forEach((pkgName) => {
    if (versions[pkgName]) {
      result[pkgName] = versions[pkgName];
    }
  });

  return result;
}

/**
 * Format component name with package version
 * @param {string} componentName - Name of the component
 * @param {string} packageName - Name of the package
 * @param {string} projectPath - Path to the project directory
 * @returns {string} Formatted string like "Button from @mui/material@5.14.0"
 */
function formatComponentWithVersion(componentName, packageName, projectPath) {
  const version = getPackageVersion(projectPath, packageName);

  if (version) {
    return `${componentName} from ${packageName}@${version}`;
  }

  return `${componentName} from ${packageName}`;
}

module.exports = {
  parsePackageLock,
  parseYarnLock,
  parsePnpmLock,
  findAndParseLockfile,
  getPackageVersion,
  getPackageVersions,
  formatComponentWithVersion,
};
