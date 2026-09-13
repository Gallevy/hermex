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
  collectImportedPackages,
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
  /** Every package known to this run, on all three axes — the list every rule and view below is derived from. */
  packageInventory: PackageInventoryEntry[];
  packageDistribution: PackageDistribution[];
  versusResults: VersusResult[];
  /** Every rule hit, `no-packages` included (#77) — one list, no second field to remember to read. */
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
  // Package name → how many scanned files import it. One increment per file
  // per package, so a file pulling in five date-fns helpers counts once.
  const importingFileCounts = new Map<string, number>();
  let totalImports = 0;
  let totalUsagePatterns = 0;
  const patternCountMap = new Map<string, number>();

  // A Set, not the key array: `findComponentSource` runs once per JSX
  // element and resolves with a single hash probe against it.
  const availablePackages = new Set(Object.keys(versions));

  for (const report of reports) {
    totalImports += report.summary.totalImports;
    totalUsagePatterns += report.summary.totalUsagePatterns;

    // The imported axis, counted alongside the rendered one below rather than
    // derived from it: the two answer different questions, and for a package
    // consumed as a function or a hook only this one has an answer (#174).
    for (const packageName of collectImportedPackages(
      report,
      availablePackages,
    )) {
      importingFileCounts.set(
        packageName,
        (importingFileCounts.get(packageName) ?? 0) + 1,
      );
    }

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
    importingFiles: importingFileCounts,
    config,
  });

  const packageDistribution = calculatePackageDistribution(
    packageInventory,
    config,
  );

  // The inventory, not `packageDistribution`: versus selects the imported
  // axis, and the distribution is the packages-table view — see
  // `calculateVersusResults` for why routing through it is wrong (#174).
  const versusResults = calculateVersusResults(
    packageInventory,
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
