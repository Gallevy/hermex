import micromatch from 'micromatch';
import type { UsageReport } from '../swc-parser';
import type { ReleaseAgeEntry } from '../npm-registry/types';
import type { ResolvedHermexConfig } from '../config/types';
import type {
  DependencyBucket,
  PackageInventoryEntry,
} from './package-inventory';
import { isInstalled, isOwnedByRepo } from './package-inventory';

export type { ComponentUsage } from './package-inventory';

export interface PackageDistribution {
  packageName: string;
  version: string | null;
  /**
   * The `package.json` buckets declaring this package; empty when the repo
   * imports it without declaring it (a phantom dependency) or the lockfile
   * alone records it as a direct dependency.
   */
  declaredIn: DependencyBucket[];
  componentCount: number;
  usageCount: number;
  /** Share of total measured component usage. 0 for a package that is never rendered as a component — which includes every package used only as a function. */
  percentage: number;
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
 * The reported view of the package inventory: what the packages table and
 * the JSON `packages[]` array show.
 *
 * Selects the packages this repo *owns* (`isOwnedByRepo`) — declared in
 * `package.json`, recorded as a direct dependency by the lockfile, and/or
 * imported by scanned source. Before #78 this selected the *used* axis
 * instead, which made the name a lie: usage is measured from JSX component
 * rendering, so a package imported and called as a function (`lodash`,
 * `moment`) never appeared, and a repo with no JSX at all reported zero
 * packages while depending on dozens. "Does this repo depend on X?" is the
 * question the field's name promises to answer, and now does.
 *
 * Purely transitive dependencies stay out: `isOwnedByRepo` excludes them, so
 * this is still the repo's own dependency surface rather than the whole
 * lockfile. The one exception is a transitive package explicitly named by
 * `releaseAge.enforceOn` — installed and deliberately enforced, yet owned by
 * nobody. Dropping it here would silently exempt it from compliance, so it
 * is surfaced with zero usage.
 *
 * This is also exactly the set release-age enrichment operates on: every
 * package here with an installed version is looked up. It was once narrower
 * — gated on `usageCount > 0` plus `enforceOn` matches — but usage counts
 * JSX component rendering, which has nothing to do with whether an
 * installed dependency is stale (#171).
 */
export function calculatePackageDistribution(
  inventory: PackageInventoryEntry[],
  config?: ResolvedHermexConfig,
): PackageDistribution[] {
  const enforceOnPatterns = config?.releaseAge.enforceOn ?? [];
  const enforcesUnownedPackages =
    (config?.releaseAge.enabled ?? false) && enforceOnPatterns.length > 0;

  const distribution = inventory
    .filter((entry) => {
      if (entry.ignored) return false;
      if (isOwnedByRepo(entry)) return true;
      // Transitive, but explicitly enforced. Requires an installed version:
      // there is no release date to check without one.
      return (
        enforcesUnownedPackages &&
        isInstalled(entry) &&
        micromatch.isMatch(entry.packageName, enforceOnPatterns)
      );
    })
    .map((entry) => ({
      packageName: entry.packageName,
      version: entry.version,
      rootVersion: entry.rootVersion,
      declaredIn: entry.declaredIn,
      componentCount: entry.componentCount,
      usageCount: entry.usageCount,
      percentage: 0,
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
  // self-contained rather than silently depending on that. Equal usage keeps
  // insertion order, so the zero-usage tail stays in discovery order.
  return distribution.sort((a, b) => b.usageCount - a.usageCount);
}
