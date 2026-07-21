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
