import micromatch from 'micromatch';
import type { UsageReport } from '../swc-parser';
import type { HermexConfig } from '../config/types';
import type { LockfileResolutionMap, MultiVersionMap } from '../lock-parser';
import type { ReleaseAgeEntry } from '../npm-registry/types';

export interface ComponentUsage {
  name: string;
  source: string;
  count: number;
  files: Set<string>;
}

export interface PackageDistribution {
  packageName: string;
  version: string | null;
  componentCount: number;
  usageCount: number;
  percentage: number;
  components: string[];
  internal: boolean;
  hasVersionConflict: boolean;
  allVersions: string[];
  /**
   * The version resolved for this package's root/direct dependency
   * declaration (from the lockfile layer's `PackageResolution.rootVersion`),
   * or `null` when the package is confirmed NOT a direct dependency (purely
   * transitive). `undefined` (the value if never set — e.g. a hand-built
   * `PackageDistribution` in a test) is treated as "unknown, assume root"
   * for backward compatibility — only an explicit `null` marks a package as
   * definitively non-root, which is what makes `scope: 'root'` correctly
   * decline to enforce it (releaseAge would otherwise silently fall back to
   * the highest resolved version and enforce THAT, wrongly treating a
   * transitive-only package as if it were a root dependency).
   */
  rootVersion?: string | null;
  releaseAge?: ReleaseAgeEntry;
}

function resolvePackageFromImportPath(
  importPath: string,
  availablePackages: string[],
): string {
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return 'local';
  }

  const sortedPackages = [...availablePackages].sort(
    (a, b) => b.length - a.length,
  );

  for (const pkg of sortedPackages) {
    if (importPath === pkg) return pkg;
    if (importPath.startsWith(`${pkg}/`)) return pkg;
  }

  return 'unknown';
}

export function findComponentSource(
  componentName: string,
  report: UsageReport,
  availablePackages: string[],
): string {
  const namedImport = report.patterns.imports.named.find(
    (imp) => imp.name === componentName,
  );
  if (namedImport)
    return resolvePackageFromImportPath(namedImport.source, availablePackages);

  const defaultImport = report.patterns.imports.default.find(
    (imp) => imp.name === componentName,
  );
  if (defaultImport)
    return resolvePackageFromImportPath(
      defaultImport.source,
      availablePackages,
    );

  const aliasedImport = report.patterns.imports.aliased.find(
    (imp) => imp.local === componentName,
  );
  if (aliasedImport)
    return resolvePackageFromImportPath(
      aliasedImport.source,
      availablePackages,
    );

  return 'unknown';
}

function getPackageVersion(
  packageName: string,
  versions: Record<string, string>,
): string | null {
  if (versions[packageName]) return versions[packageName];

  if (packageName.includes('/')) {
    const parts = packageName.split('/');
    if (packageName.startsWith('@') && parts.length > 2) {
      const basePackage = `${parts[0]}/${parts[1]}`;
      if (versions[basePackage]) return versions[basePackage];
    }
    if (!packageName.startsWith('@') && parts.length > 1) {
      if (versions[parts[0]]) return versions[parts[0]];
    }
  }

  return null;
}

// Same base-package fallback as getPackageVersion (a subpath import like
// `@scope/pkg/sub` resolves to `@scope/pkg`'s data), but reading the true
// root/direct-dependency version from the lockfile layer's resolutions
// rather than the `rootVersion ?? maxSemver(allVersions)` fallback baked
// into `versions`. `null` here (as opposed to `versions` being silently
// absent) is the signal `scope: 'root'` needs to correctly decline to
// enforce a package that was never a direct dependency in the first place.
function getRootVersion(
  packageName: string,
  resolutions: LockfileResolutionMap,
): string | null {
  if (resolutions[packageName]) return resolutions[packageName].rootVersion;

  if (packageName.includes('/')) {
    const parts = packageName.split('/');
    if (packageName.startsWith('@') && parts.length > 2) {
      const basePackage = `${parts[0]}/${parts[1]}`;
      if (resolutions[basePackage]) return resolutions[basePackage].rootVersion;
    }
    if (!packageName.startsWith('@') && parts.length > 1) {
      if (resolutions[parts[0]]) return resolutions[parts[0]].rootVersion;
    }
  }

  return null;
}

export function calculatePackageDistribution(
  componentUsageMap: Map<string, ComponentUsage>,
  versions: Record<string, string>,
  config?: HermexConfig,
  multiVersions: MultiVersionMap = {},
  resolutions: LockfileResolutionMap = {},
): PackageDistribution[] {
  const ignorePatterns = config?.packages.ignore ?? [];
  const internalPatterns = config?.packages.internal ?? [];

  const packageMap = new Map<string, PackageDistribution>();

  for (const component of componentUsageMap.values()) {
    if (component.source === 'unknown' || component.source === 'local')
      continue;

    if (
      ignorePatterns.length > 0 &&
      micromatch.isMatch(component.source, ignorePatterns)
    ) {
      continue;
    }

    const existing = packageMap.get(component.source);
    if (existing) {
      existing.componentCount++;
      existing.usageCount += component.count;
      existing.components.push(component.name);
    } else {
      const isInternal =
        internalPatterns.length > 0
          ? micromatch.isMatch(component.source, internalPatterns)
          : false;

      const allVersions = multiVersions[component.source] ?? [];
      const hasVersionConflict = allVersions.length > 1;

      packageMap.set(component.source, {
        packageName: component.source,
        version: getPackageVersion(component.source, versions),
        rootVersion: getRootVersion(component.source, resolutions),
        componentCount: 1,
        usageCount: component.count,
        percentage: 0,
        components: [component.name],
        internal: isInternal,
        hasVersionConflict,
        allVersions,
      });
    }
  }

  // A dependency can be installed and listed in the lockfile yet never
  // imported as a component — e.g. a CSS/side-effect-only import like
  // `import '@guestyci/arc-styles/button.css'` has no specifiers, so the
  // usage scan above never sees it. That makes it invisible to releaseAge
  // even when it's explicitly enforced. Surface any lockfile package that
  // matches `releaseAge.enforceOn` so compliance can still see it, with
  // zero usage/component counts (#27). Scoped to enforceOn matches (not
  // the whole lockfile) to avoid firing a registry lookup for every
  // transitive dependency when enforceOn is left at its default `[]`.
  const enforceOnPatterns = config?.releaseAge.enforceOn ?? [];
  if (config?.releaseAge.enabled && enforceOnPatterns.length > 0) {
    for (const packageName of Object.keys(versions)) {
      if (packageMap.has(packageName)) continue;
      if (!micromatch.isMatch(packageName, enforceOnPatterns)) continue;
      if (
        ignorePatterns.length > 0 &&
        micromatch.isMatch(packageName, ignorePatterns)
      ) {
        continue;
      }

      const isInternal =
        internalPatterns.length > 0
          ? micromatch.isMatch(packageName, internalPatterns)
          : false;

      const allVersions = multiVersions[packageName] ?? [];
      const hasVersionConflict = allVersions.length > 1;

      packageMap.set(packageName, {
        packageName,
        version: getPackageVersion(packageName, versions),
        rootVersion: getRootVersion(packageName, resolutions),
        componentCount: 0,
        usageCount: 0,
        percentage: 0,
        components: [],
        internal: isInternal,
        hasVersionConflict,
        allVersions,
      });
    }
  }

  const distribution = Array.from(packageMap.values());
  const totalExternalUsage = distribution.reduce(
    (sum, pkg) => sum + pkg.usageCount,
    0,
  );

  for (const pkg of distribution) {
    pkg.percentage =
      totalExternalUsage > 0 ? (pkg.usageCount / totalExternalUsage) * 100 : 0;
  }

  return distribution.sort((a, b) => b.usageCount - a.usageCount);
}
