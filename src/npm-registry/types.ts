/**
 * Which semver tier a package is overdue on — the `no-outdated-packages`
 * verdict. It rides on the violation (`src/rules/shared.ts`) and nowhere
 * else: a tier is overdue only relative to a configured threshold, which is
 * policy, and policy never reaches the facts below (#189).
 *
 * A breached *patch* tier reports `'minor'`. There is no `'patch'` member on
 * purpose — the tier names how far the upgrade moves you, and patch and
 * minor are the same answer to "is this breaking".
 */
export type OverdueTier = 'minor' | 'major';

export type SemverBump = 'patch' | 'minor' | 'major';

/** One published release, newer than the installed copy it hangs off. */
export interface ReleaseInfo {
  version: string;
  releasedDaysAgo: number;
  /** Relative to the resolved copy this sits under, not to any other. */
  semverBump: SemverBump;
  isLatest?: boolean;
}

/**
 * One installed copy of a package, with everything published after it.
 *
 * Every resolved copy is listed, root and nested alike, with no judgment
 * about which ones *count* — that is the `scope` decision, and it belongs to
 * the rule (#189). A consumer reading this sees the same thing whether the
 * repo enforces `root`, `tree`, or nothing at all.
 */
export interface ResolvedCopy {
  version: string;
  /** Whether this is the version the root/direct dependency resolved to.
   * `false` for a nested duplicate reachable only transitively (#62). */
  isRoot: boolean;
  /**
   * Every published release newer than `version`, oldest-first.
   *
   * Prereleases are excluded — not as policy, but because they are not
   * upgrade candidates by npm convention, the same reason `semver.gt`
   * ordering alone would not be enough here.
   */
  newer: ReleaseInfo[];
}

/**
 * What the registry says about one package, measured against what is
 * installed. **Facts only, and policy-free in the strict sense**: this
 * object is byte-identical whatever the repo's thresholds, severity or
 * scope say, because none of them are inputs to producing it (#189).
 *
 * It is absent entirely when no registry-backed rule ran, since nothing
 * fetched it — absent or present is the only way config can affect it. The
 * verdict derived from it lives on the violation; the arithmetic that gets
 * there is `assessPackage` in `src/rules/no-outdated-packages.ts`, and both
 * the rule and the Packages table call that one function rather than
 * caching its answer here.
 */
export interface PackageReleases {
  /** Every distinct installed copy, the root one first when there is one. */
  resolved: ResolvedCopy[];
  latestVersion?: string;
  latestReleasedDaysAgo?: number;
}

export interface RegistryPackageInfo {
  name: string;
  time: Record<string, string>;
  deprecated?: string;
  versions: Record<string, { deprecated?: string }>;
  'dist-tags'?: Record<string, string>;
}
