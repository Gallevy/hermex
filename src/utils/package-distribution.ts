import micromatch from 'micromatch';
import type { UsageReport } from '../swc-parser';
import type { ResolvedHermexConfig } from '../config/types';
import type { ReleaseAgeEntry } from '../npm-registry/types';
import type { PackageInventoryEntry } from './package-inventory';
import { isUsed } from './package-inventory';

export type { ComponentUsage } from './package-inventory';

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

/**
 * The reported view of the package inventory: what the packages table, the
 * JSON `packages[]` array and release-age enrichment operate on.
 *
 * Selects the *used* axis — a package with no measured usage has nothing to
 * report a percentage or component list for. The one exception is
 * `releaseAge.enforceOn`: a dependency can be installed and explicitly
 * enforced yet never imported as a component (a CSS/side-effect-only import
 * like `import '@acme-ui/pulse-styles/button.css'` has no specifiers, so the
 * usage scan never sees it), and dropping it here would silently exempt it
 * from compliance. Those are surfaced with zero usage/component counts.
 * Scoped to `enforceOn` matches rather than the whole inventory so a default
 * (empty) `enforceOn` does not fire a registry lookup for every transitive
 * dependency.
 */
export function calculatePackageDistribution(
  inventory: PackageInventoryEntry[],
  config?: ResolvedHermexConfig,
): PackageDistribution[] {
  const enforceOnPatterns = config?.releaseAge.enforceOn ?? [];
  const enforcesUnusedPackages =
    (config?.releaseAge.enabled ?? false) && enforceOnPatterns.length > 0;

  const distribution = inventory
    .filter((entry) => {
      if (entry.ignored) return false;
      if (isUsed(entry)) return true;
      return (
        enforcesUnusedPackages &&
        micromatch.isMatch(entry.packageName, enforceOnPatterns)
      );
    })
    .map((entry) => ({
      packageName: entry.packageName,
      version: entry.version,
      rootVersion: entry.rootVersion,
      componentCount: entry.componentCount,
      usageCount: entry.usageCount,
      percentage: 0,
      components: entry.components,
      internal: entry.internal,
      hasVersionConflict: entry.hasVersionConflict,
      allVersions: entry.allVersions,
    }));

  const totalExternalUsage = distribution.reduce(
    (sum, pkg) => sum + pkg.usageCount,
    0,
  );

  for (const pkg of distribution) {
    pkg.percentage =
      totalExternalUsage > 0 ? (pkg.usageCount / totalExternalUsage) * 100 : 0;
  }

  // The inventory is already usage-ordered; re-sorting keeps this view
  // self-contained rather than silently depending on that.
  return distribution.sort((a, b) => b.usageCount - a.usageCount);
}
