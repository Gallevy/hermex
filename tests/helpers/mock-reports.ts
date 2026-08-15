import type { UsageReport } from '../../src/swc-parser/types';
import type {
  PackageDistribution,
  PackageInventoryEntry,
} from '../../src/utils/aggregator';
import type { ReleaseAgeEntry } from '../../src/npm-registry/types';

/**
 * Creates a minimal UsageReport with all required fields.
 * Override specific fields via the partial argument.
 */
export function createMockReport(
  overrides: Partial<UsageReport> = {},
): UsageReport {
  return {
    filePath: 'mock.tsx',
    summary: { totalImports: 0, totalComponents: 0, totalUsagePatterns: 0 },
    patterns: {
      imports: { default: [], named: [], namespace: [], aliased: [] },
      usage: {
        jsx: [],
        variables: [],
        destructuring: [],
        conditional: [],
        arrays: [],
        objects: [],
      },
      advanced: {
        lazy: [],
        dynamic: [],
        hoc: [],
        memo: [],
        forwardRef: [],
        portal: [],
      },
      props: [],
    },
    components: [],
    ...overrides,
  };
}

/**
 * Creates a minimal PackageDistribution entry.
 * Override specific fields via the partial argument.
 */
export function createMockPackage(
  packageName: string,
  overrides: Partial<PackageDistribution> = {},
): PackageDistribution {
  const version = overrides.version !== undefined ? overrides.version : '1.0.0';
  return {
    packageName,
    version,
    // Defaults to matching `version` — i.e. "yes, this is a root
    // dependency" — since that's what most tests intend by just setting
    // `version`. Override explicitly with `rootVersion: null` to test the
    // "confirmed transitive-only, not a root dependency" case (#62).
    rootVersion: version,
    componentCount: 1,
    usageCount: 1,
    percentage: 100,
    declaredIn: ['dependencies'],
    hasVersionConflict: false,
    // Defaults to a single-entry array matching `version` (not a fixed
    // '1.0.0') so overriding just `version` doesn't silently produce a
    // package whose only "resolved copy" doesn't match its own installed
    // version — override `allVersions` explicitly for multi-version tests.
    allVersions: version ? [version] : [],
    ...overrides,
  };
}

/**
 * Creates a minimal PackageInventoryEntry — by default a package that is
 * declared, installed as a direct dependency, and used once, i.e. present
 * on all three axes. Override to test a single axis in isolation (e.g.
 * `{ usageCount: 0, componentCount: 0 }` for declared-but-never-imported,
 * or `{ declaredIn: [], rootVersion: null }` for purely transitive).
 */
export function createMockInventoryEntry(
  packageName: string,
  overrides: Partial<PackageInventoryEntry> = {},
): PackageInventoryEntry {
  const version = overrides.version !== undefined ? overrides.version : '1.0.0';
  return {
    packageName,
    declaredIn: ['dependencies'],
    version,
    rootVersion: version,
    allVersions: version ? [version] : [],
    hasVersionConflict: false,
    ignored: false,
    usageCount: 1,
    componentCount: 1,
    ...overrides,
  };
}

/**
 * Creates a minimal ReleaseAgeEntry.
 * Override specific fields via the partial argument.
 */
export function createMockReleaseAge(
  overrides: Partial<ReleaseAgeEntry> = {},
): ReleaseAgeEntry {
  return {
    installedVersion: '1.0.0',
    upgrades: [],
    worstLevel: null,
    severity: 'error',
    scope: 'root',
    ...overrides,
  };
}
