import micromatch from 'micromatch';
import type { ResolvedHermexConfig } from '../config/types';
import type { LockfileResolutionMap, MultiVersionMap } from '../lock-parser';

/** A `package.json` field that declares dependencies. */
export type DependencyBucket =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies';

/** Package name → the manifest buckets that declare it. */
export type DeclaredPackages = Record<string, DependencyBucket[]>;

export interface ComponentUsage {
  name: string;
  source: string;
  count: number;
  files: Set<string>;
}

/**
 * One package, with every axis hermex knows about it. A package can be
 * present on any combination of the three:
 *
 * - **declared** — listed in this repo's `package.json` (`declaredIn`).
 * - **installed** — present in the lockfile, as a direct dependency
 *   (`rootVersion`) and/or as one or more resolved copies (`allVersions`).
 *   This is the `root` vs `tree` distinction `releaseAge.scope` already
 *   exposes to users.
 * - **used** — imported by scanned source (`usageCount` > 0).
 *
 * A transitive dependency is installed but neither declared nor used; a
 * build tool run via `npx` is declared and installed but not used; a phantom
 * dependency is used but neither declared nor installed.
 */
export interface PackageInventoryEntry {
  packageName: string;
  /** Manifest buckets declaring this package; empty when undeclared. */
  declaredIn: DependencyBucket[];
  /** Effective installed version — `rootVersion` when known, else the highest resolved copy. `null` when not installed. */
  version: string | null;
  /** Version of the direct/root dependency declaration; `null` when the package is purely transitive. */
  rootVersion: string | null;
  /** Every resolved copy in the lockfile — the `tree` axis. */
  allVersions: string[];
  hasVersionConflict: boolean;
  /** Matches `packages.internal`. */
  internal: boolean;
  /** Matches `packages.ignore`. Kept in the inventory rather than filtered out at construction so each consumer can decide — the packages table and forbid rules skip these, `require_packages` deliberately does not. */
  ignored: boolean;
  usageCount: number;
  componentCount: number;
  components: string[];
}

export interface BuildInventoryInput {
  /** Effective installed version per package, from the lockfile layer. */
  versions?: Record<string, string>;
  multiVersions?: MultiVersionMap;
  resolutions?: LockfileResolutionMap;
  /** Manifest declarations, from `collectDeclaredPackages`. */
  declared?: DeclaredPackages;
  /** Component usage keyed by `source::component`, from the aggregator. */
  componentUsage?: Map<string, ComponentUsage>;
  config?: ResolvedHermexConfig;
}

/**
 * Sources that are not packages at all — a relative import, or one that
 * could not be resolved against any known package name.
 */
const NON_PACKAGE_SOURCES = new Set(['local', 'unknown']);

/**
 * Compiles a glob list once and reuses it. `micromatch.isMatch` re-parses its
 * patterns on every call, which is fine for a handful of packages but not
 * when the inventory spans an entire lockfile (thousands of entries × every
 * configured pattern).
 */
function createGlobMatcher(patterns: string[]): (name: string) => boolean {
  if (patterns.length === 0) return () => false;
  const matchers = patterns.map((pattern) => micromatch.matcher(pattern));
  return (name) => matchers.some((match) => match(name));
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

/**
 * The single list of packages every downstream consumer reads.
 *
 * Before this existed, each feature answered "what packages are in this
 * repo?" for itself — the packages table and `forbid_packages` from import
 * analysis, `require_packages` from the lockfile, `forbid_package_fields`
 * from the manifest — so a package could be visible to one rule and
 * invisible to another (#75). Merging the three axes once, here, means the
 * features differ only in which axis they *select*, not in what they can
 * see.
 */
export function buildPackageInventory(
  input: BuildInventoryInput = {},
): PackageInventoryEntry[] {
  const {
    versions = {},
    multiVersions = {},
    resolutions = {},
    declared = {},
    componentUsage,
    config,
  } = input;

  const isIgnored = createGlobMatcher(config?.packages.ignore ?? []);
  const isInternal = createGlobMatcher(config?.packages.internal ?? []);

  // Fold component usage up to one record per package first — several
  // components can come from the same source.
  const usage = new Map<
    string,
    { usageCount: number; componentCount: number; components: string[] }
  >();
  for (const component of componentUsage?.values() ?? []) {
    if (NON_PACKAGE_SOURCES.has(component.source)) continue;

    const existing = usage.get(component.source);
    if (existing) {
      existing.usageCount += component.count;
      existing.componentCount++;
      existing.components.push(component.name);
    } else {
      usage.set(component.source, {
        usageCount: component.count,
        componentCount: 1,
        components: [component.name],
      });
    }
  }

  // Used packages first so the inventory (and every view derived from it)
  // stays usage-ordered; declared-only and transitive packages follow.
  const names = new Set<string>([
    ...usage.keys(),
    ...Object.keys(declared),
    ...Object.keys(versions),
    ...Object.keys(resolutions),
  ]);

  const entries: PackageInventoryEntry[] = [];
  for (const packageName of names) {
    const packageUsage = usage.get(packageName);
    const allVersions = multiVersions[packageName] ?? [];

    entries.push({
      packageName,
      declaredIn: declared[packageName] ?? [],
      version: getPackageVersion(packageName, versions),
      rootVersion: getRootVersion(packageName, resolutions),
      allVersions,
      hasVersionConflict: allVersions.length > 1,
      internal: isInternal(packageName),
      ignored: isIgnored(packageName),
      usageCount: packageUsage?.usageCount ?? 0,
      componentCount: packageUsage?.componentCount ?? 0,
      components: packageUsage?.components ?? [],
    });
  }

  // Stable sort — equal usage keeps insertion order, so the usage-ranked
  // head is deterministic and the tail stays in discovery order.
  return entries.sort((a, b) => b.usageCount - a.usageCount);
}

/** Declared in this repo's `package.json`, in any dependency bucket. */
export function isDeclared(entry: PackageInventoryEntry): boolean {
  return entry.declaredIn.length > 0;
}

/** Imported by scanned source. */
export function isUsed(entry: PackageInventoryEntry): boolean {
  return entry.usageCount > 0;
}

/**
 * Present in the lockfile. `root` counts only direct dependencies; `tree`
 * counts any resolved copy, including purely transitive ones — the same
 * axis `releaseAge.scope` exposes.
 */
export function isInstalled(
  entry: PackageInventoryEntry,
  scope: 'root' | 'tree' = 'tree',
): boolean {
  if (scope === 'root') return entry.rootVersion !== null;
  return entry.version !== null || entry.allVersions.length > 0;
}

/**
 * Packages this repo owns — the ones it can actually add or remove. Excludes
 * purely transitive dependencies (nothing the repo can do about those short
 * of dropping the parent) and anything under `packages.ignore`.
 *
 * "Declared" is taken from two independent sources: `package.json`, and the
 * lockfile's own record of the root project's direct dependencies (pnpm's
 * `importers`, npm's root `packages` entry, yarn's ranges read back from the
 * manifest). They normally agree, and either one alone is enough — so a repo
 * whose manifest cannot be read still gets its direct dependencies checked,
 * and a manifest entry missing from the lockfile is still checked too.
 *
 * The used axis is included because a package can be imported without being
 * declared anywhere (a phantom dependency), and that is still the repo's to
 * remove.
 */
export function isOwnedByRepo(entry: PackageInventoryEntry): boolean {
  return (
    !entry.ignored &&
    (isDeclared(entry) || isInstalled(entry, 'root') || isUsed(entry))
  );
}
