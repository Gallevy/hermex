import micromatch from 'micromatch';
import type { UsageReport } from '../swc-parser';
import type { HermexConfig } from '../config/types';
import type { MultiVersionMap } from '../lock-parser';
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
  releaseAge?: ReleaseAgeEntry;
}

function resolvePackageFromImportPath(
  importPath: string,
  availablePackages: string[],
): string {
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return 'local';
  }

  let longestMatch: string | null = null;
  for (const pkg of availablePackages) {
    const isMatch = importPath === pkg || importPath.startsWith(`${pkg}/`);
    if (
      isMatch &&
      (longestMatch === null || pkg.length > longestMatch.length)
    ) {
      longestMatch = pkg;
    }
  }

  return longestMatch ?? 'unknown';
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

export function calculatePackageDistribution(
  componentUsageMap: Map<string, ComponentUsage>,
  versions: Record<string, string>,
  config?: HermexConfig,
  multiVersions: MultiVersionMap = {},
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
