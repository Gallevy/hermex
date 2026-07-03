import type { UsageReport } from '../../src/swc-parser/types';
import type { PackageDistribution } from '../../src/utils/aggregator';
import type { ReleaseAgeEntry } from '../../src/npm-registry/types';

/**
 * Creates a minimal UsageReport with all required fields.
 * Override specific fields via the partial argument.
 */
export function createMockReport(
  overrides: Partial<UsageReport> = {},
): UsageReport {
  return {
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
  return {
    packageName,
    version: '1.0.0',
    componentCount: 1,
    usageCount: 1,
    percentage: 100,
    components: [],
    internal: false,
    hasVersionConflict: false,
    allVersions: ['1.0.0'],
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
    ...overrides,
  };
}
