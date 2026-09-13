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
  /**
   * How many scanned files import this package — the axis that stays
   * meaningful for a package used only as a function (#174). See
   * `PackageInventoryEntry.importingFileCount` for why it counts files.
   */
  importingFileCount: number;
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

/**
 * The package name an import path belongs to, or `null` when the path names
 * no package at all.
 *
 * An npm package name is exactly one path segment, or two when scoped
 * (`@scope/name`) — everything after that is a subpath export. So the name is
 * read straight off the path rather than prefix-matched against every known
 * package, which is what lets the caller resolve with a single hash probe
 * instead of a scan of the whole lockfile per JSX element.
 */
function packageNameFromImportPath(importPath: string): string | null {
  if (importPath.length === 0) return null;

  const firstSlash = importPath.indexOf('/');
  // Bare specifier (`react`), or a lone `@scope` — the latter is not a valid
  // specifier and simply falls out as a miss against the package set.
  if (firstSlash === -1) return importPath;

  if (importPath.charCodeAt(0) === 64 /* @ */) {
    const secondSlash = importPath.indexOf('/', firstSlash + 1);
    // `@scope/name` exactly; there is no subpath to trim.
    return secondSlash === -1 ? importPath : importPath.slice(0, secondSlash);
  }

  return importPath.slice(0, firstSlash);
}

/**
 * Sources that name no package at all — a relative import, or one that
 * resolved against no known package name.
 */
const LOCAL_SOURCE = 'local';
const UNKNOWN_SOURCE = 'unknown';

export function resolvePackageFromImportPath(
  importPath: string,
  availablePackages: ReadonlySet<string>,
): string {
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return LOCAL_SOURCE;
  }

  const packageName = packageNameFromImportPath(importPath);
  if (packageName !== null && availablePackages.has(packageName)) {
    return packageName;
  }

  return UNKNOWN_SOURCE;
}

/**
 * The packages one file imports, deduplicated — the unit the imported count
 * is measured in (see `PackageInventoryEntry.importingFileCount`).
 *
 * Every specifier carrying a source is folded in: the three static import
 * forms, plus `React.lazy(() => import(...))` and bare dynamic `import()`, so
 * a package pulled in only on a code-split path still counts as depended on.
 * `aliased` is deliberately skipped — it is a second view of entries already
 * in `named`, not a fourth import form.
 *
 * A specifier only resolves when its package name is already known to the
 * lockfile layer; anything else lands on `unknown` and is dropped here. So
 * this can never surface a package the inventory has not already seen, which
 * is what keeps the imported count purely additive — `isOwnedByRepo`, and
 * therefore the packages table and every package rule, is untouched by it.
 */
export function collectImportedPackages(
  report: UsageReport,
  availablePackages: ReadonlySet<string>,
): Set<string> {
  const imported = new Set<string>();

  const add = (source: string): void => {
    const resolved = resolvePackageFromImportPath(source, availablePackages);
    if (resolved === LOCAL_SOURCE || resolved === UNKNOWN_SOURCE) return;
    imported.add(resolved);
  };

  for (const imp of report.patterns.imports.default) add(imp.source);
  for (const imp of report.patterns.imports.named) add(imp.source);
  for (const imp of report.patterns.imports.namespace) add(imp.source);
  for (const imp of report.patterns.advanced.lazy) add(imp.source);
  for (const imp of report.patterns.advanced.dynamic) add(imp.source);

  return imported;
}

export function findComponentSource(
  componentName: string,
  report: UsageReport,
  availablePackages: ReadonlySet<string>,
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
 * lockfile. The one exception is a transitive package explicitly matched by
 * an `error`-severity `rules['release-age']` entry — installed and
 * deliberately made mandatory, yet owned by nobody. Dropping it here would
 * silently exempt it from compliance, so it is surfaced with zero usage.
 * Deliberately narrower than "any non-off entry": a `warn`/`info` catch-all
 * like `{ severity: 'warn', patterns: ['**'] }` (or the implicit `['**']`
 * baseline itself, `resolveReleaseAgeRule` in `src/config/overrides.ts`)
 * must not reach into the whole transitive lockfile and flood this table
 * with every package nobody owns — only a pattern the author wrote
 * specifically to make something mandatory does that.
 *
 * This is also exactly the set release-age enrichment operates on: every
 * package here with an installed version is looked up when release-age is
 * on for this repo. It was once narrower — gated on `usageCount > 0` plus
 * `enforceOn` matches — but usage counts JSX component rendering, which has
 * nothing to do with whether an installed dependency is stale (#171).
 */
export function calculatePackageDistribution(
  inventory: PackageInventoryEntry[],
  config?: ResolvedHermexConfig,
): PackageDistribution[] {
  const releaseAgeRules = config?.rules['release-age'] ?? [];
  const releaseAgePatterns = releaseAgeRules
    .filter((r) => r.severity === 'error')
    .flatMap((r) => r.patterns);
  const enforcesUnownedPackages = releaseAgePatterns.length > 0;

  const distribution = inventory
    .filter((entry) => {
      if (entry.ignored) return false;
      if (isOwnedByRepo(entry)) return true;
      // Transitive, but explicitly named by an authored release-age rule.
      // Requires an installed version: there is no release date to check
      // without one.
      return (
        enforcesUnownedPackages &&
        isInstalled(entry) &&
        micromatch.isMatch(entry.packageName, releaseAgePatterns)
      );
    })
    .map((entry) => ({
      packageName: entry.packageName,
      version: entry.version,
      rootVersion: entry.rootVersion,
      declaredIn: entry.declaredIn,
      componentCount: entry.componentCount,
      usageCount: entry.usageCount,
      importingFileCount: entry.importingFileCount,
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
