import type { UsageReport } from '../swc-parser';
import type { HermexConfig } from '../config/types';
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
import type { BannedPackageViolation } from './package-rules';
import { detectBannedPackages, detectRequiredPackages } from './package-rules';
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
  packageDistribution: PackageDistribution[];
  versusResults: VersusResult[];
  ruleViolations: RuleViolation[];
  bannedPackageViolations: BannedPackageViolation[];
  reports: UsageReport[];
}

export function aggregateReports(
  reports: UsageReport[],
  versions: Record<string, string> = {},
  config?: HermexConfig,
  multiVersions: MultiVersionMap = {},
  resolutions: LockfileResolutionMap = {},
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
      const key = jsx.component;
      const existing = componentUsageMap.get(key);

      if (existing) {
        existing.count++;
        existing.files.add(report.filePath);
      } else {
        const source = findComponentSource(
          jsx.component,
          report,
          availablePackages,
        );
        componentUsageMap.set(key, {
          name: jsx.component,
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

  const allComponents = Array.from(componentUsageMap.keys()).sort();

  const patternCounts = Array.from(patternCountMap.entries())
    .map(([type, count]) => ({
      patternType: type,
      displayName: getPatternDisplayName(type),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const packageDistribution = calculatePackageDistribution(
    componentUsageMap,
    versions,
    config,
    multiVersions,
    resolutions,
  );

  const versusResults = calculateVersusResults(
    packageDistribution,
    config?.versus ?? [],
  );
  const bannedPackageViolations = detectBannedPackages(
    packageDistribution,
    config,
  );

  const requiredPackageViolations = detectRequiredPackages(
    packageDistribution,
    versions,
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
    packageDistribution,
    versusResults,
    ruleViolations: requiredPackageViolations,
    bannedPackageViolations,
    reports,
  };
}
