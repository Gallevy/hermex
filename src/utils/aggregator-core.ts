import type { UsageReport } from '../swc-parser';
import type { ResolvedHermexConfig } from '../config/types';
import type { LockfileResolutionMap, MultiVersionMap } from '../lock-parser';
import type { RuleViolation } from '../rules/evaluator';
import type {
  ComponentUsage,
  PackageDistribution,
} from './package-distribution';
import {
  calculatePackageDistribution,
  findComponentSource,
} from './package-distribution';
import type {
  DeclaredPackages,
  PackageInventoryEntry,
} from './package-inventory';
import { buildPackageInventory } from './package-inventory';
import {
  detectForbiddenPackages,
  detectRequiredPackages,
} from './package-rules';
import type { PatternCount } from './pattern-counter';
import { countPatterns, getPatternDisplayName } from './pattern-counter';
import type { VersusResult } from './versus';
import { calculateVersusResults } from './versus';

export interface AggregatedReport {
  filesAnalyzed: number;
  totalImports: number;
  totalComponents: number;
  totalUsagePatterns: number;
  patternCounts: PatternCount[];
  componentUsage: Map<string, ComponentUsage>;
  topComponents: ComponentUsage[];
  allComponents: string[];
  /** Every package known to this run, on all three axes — the list every rule and view below is derived from. */
  packageInventory: PackageInventoryEntry[];
  packageDistribution: PackageDistribution[];
  versusResults: VersusResult[];
  /** Every rule hit, `forbid_packages` included (#77) — one list, no second field to remember to read. */
  ruleViolations: RuleViolation[];
  reports: UsageReport[];
}

export function aggregateReports(
  reports: UsageReport[],
  versions: Record<string, string> = {},
  config?: ResolvedHermexConfig,
  multiVersions: MultiVersionMap = {},
  resolutions: LockfileResolutionMap = {},
  declaredPackages: DeclaredPackages = {},
): AggregatedReport {
  const componentUsageMap = new Map<string, ComponentUsage>();
  let totalImports = 0;
  let totalUsagePatterns = 0;
  const patternCountMap = new Map<string, number>();

  const availablePackages = Object.keys(versions);

  for (const report of reports) {
    totalImports += report.summary.totalImports;
    totalUsagePatterns += report.summary.totalUsagePatterns;

    for (const jsx of report.patterns.usage.jsx) {
      // Keyed by (source, name), not name alone — the same component name
      // (e.g. `Button`) can be imported from two different packages across
      // a repo, and a name-only key would collapse them into one entry,
      // silently attributing every usage to whichever source was seen
      // first.
      const source = findComponentSource(
        jsx.component,
        report,
        availablePackages,
      );
      // For a named/aliased import, `jsx.component` is the local JSX
      // identifier (e.g. `ArcCard`), not the package's actual export name
      // (e.g. `Card`) — resolve back to the canonical export so the same
      // export used under different local aliases aggregates as one
      // component instead of fragmenting into several. Default imports have
      // no canonical export name (the module path is the real identity), so
      // they never have an `aliased` entry and pass through unchanged.
      const aliasedImport = report.patterns.imports.aliased.find(
        (imp) => imp.local === jsx.component,
      );
      const canonicalName = aliasedImport
        ? aliasedImport.imported
        : jsx.component;
      const key = `${source}::${canonicalName}`;
      const existing = componentUsageMap.get(key);

      if (existing) {
        existing.count++;
        existing.files.add(report.filePath);
      } else {
        componentUsageMap.set(key, {
          name: canonicalName,
          source,
          count: 1,
          files: new Set([report.filePath]),
        });
      }
    }

    countPatterns(report, patternCountMap);
  }

  const topComponents = Array.from(componentUsageMap.values()).sort(
    (a, b) => b.count - a.count,
  );

  const allComponents = Array.from(
    new Set(Array.from(componentUsageMap.values()).map((c) => c.name)),
  ).sort();

  const patternCounts = Array.from(patternCountMap.entries())
    .map(([type, count]) => ({
      patternType: type,
      displayName: getPatternDisplayName(type),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Built once, here: every package rule and every reported view below
  // reads this same list, differing only in which axis it selects.
  const packageInventory = buildPackageInventory({
    versions,
    multiVersions,
    resolutions,
    declared: declaredPackages,
    componentUsage: componentUsageMap,
    config,
  });

  const packageDistribution = calculatePackageDistribution(
    packageInventory,
    config,
  );

  const versusResults = calculateVersusResults(
    packageDistribution,
    config?.versus ?? [],
  );
  const forbiddenPackageViolations = detectForbiddenPackages(
    packageInventory,
    config,
  );

  const requiredPackageViolations = detectRequiredPackages(
    packageInventory,
    config,
  );

  return {
    filesAnalyzed: reports.length,
    totalImports,
    totalComponents: componentUsageMap.size,
    totalUsagePatterns,
    patternCounts,
    componentUsage: componentUsageMap,
    topComponents,
    allComponents,
    packageInventory,
    packageDistribution,
    versusResults,
    // Detection order: package rules here, then the file/script/manifest
    // evaluators appended by the pipeline.
    ruleViolations: [
      ...forbiddenPackageViolations,
      ...requiredPackageViolations,
    ],
    reports,
  };
}
