import type { AggregatedReport } from './aggregator';

export function printJson(aggregated: AggregatedReport): void {
  const result = {
    summary: {
      filesAnalyzed: aggregated.filesAnalyzed,
      totalImports: aggregated.totalImports,
      totalComponents: aggregated.totalComponents,
      totalUsagePatterns: aggregated.totalUsagePatterns,
    },
    packages: aggregated.packageDistribution,
    components: aggregated.topComponents.map((c) => ({
      ...c,
      files: [...c.files],
    })),
    patterns: aggregated.patternCounts,
    versus: aggregated.versusResults,
    ruleViolations: aggregated.ruleViolations,
    bannedPackageViolations: aggregated.bannedPackageViolations,
  };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
