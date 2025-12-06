import type { UsageReport } from '../swc-parser';

export interface ComponentUsage {
  name: string;
  source: string;
  count: number;
  files: Set<string>;
}

export interface PackageDistribution {
  packageName: string;
  version: string | null;
  componentCount: number;
  usageCount: number;
  percentage: number;
  components: string[];
}

export interface PatternCount {
  patternType: string;
  displayName: string;
  count: number;
}

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
  reports: UsageReport[];
}

export function aggregateReports(
  reports: UsageReport[],
  versions: Record<string, string> = {},
): AggregatedReport {
  const componentUsageMap = new Map<string, ComponentUsage>();
  let totalImports = 0;
  let totalUsagePatterns = 0;
  const patternCountMap = new Map<string, number>();

  // Create package resolver with available packages from lockfile
  const availablePackages = Object.keys(versions);

  // Aggregate data from all reports
  for (const report of reports) {
    totalImports += report.summary.totalImports;
    totalUsagePatterns += report.summary.totalUsagePatterns;

    // Aggregate component usage from JSX patterns
    for (const jsx of report.patterns.usage.jsx) {
      const key = jsx.component;
      const existing = componentUsageMap.get(key);

      if (existing) {
        existing.count++;
      } else {
        // Try to find the source from imports
        const source = findComponentSource(jsx.component, report, availablePackages);
        componentUsageMap.set(key, {
          name: jsx.component,
          source,
          count: 1,
          files: new Set(),
        });
      }
    }

    // Count patterns
    countPatterns(report, patternCountMap);
  }

  // Convert to arrays and sort
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
    totalUsagePatterns,
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
    reports,
  };
}

function resolvePackageFromImportPath(
  importPath: string,
  availablePackages: string[],
): string {
  // If it's a relative import, return 'local'
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return 'local';
  }

  // Try to find a matching package from available packages
  // Sort by length (descending) to match most specific package first
  // e.g., '@design-system/foundation' before '@design-system'
  const sortedPackages = [...availablePackages].sort((a, b) => b.length - a.length);

  for (const pkg of sortedPackages) {
    // Exact match
    if (importPath === pkg) {
      return pkg;
    }

    // Subpath import match (e.g., '@design-system/foundation/button' matches '@design-system/foundation')
    if (importPath.startsWith(`${pkg}/`)) {
      return pkg;
    }
  }

  // If no package matches, it's likely not in the lockfile
  return 'unknown';
}

function findComponentSource(
  componentName: string,
  report: UsageReport,
  availablePackages: string[],
): string {
  // Check named imports
  const namedImport = report.patterns.imports.named.find(
    (imp) => imp.name === componentName,
  );
  if (namedImport) return resolvePackageFromImportPath(namedImport.source, availablePackages);

  // Check default imports
  const defaultImport = report.patterns.imports.default.find(
    (imp) => imp.name === componentName,
  );
  if (defaultImport) return resolvePackageFromImportPath(defaultImport.source, availablePackages);

  // Check aliased imports
  const aliasedImport = report.patterns.imports.aliased.find(
    (imp) => imp.local === componentName,
  );
  if (aliasedImport) return resolvePackageFromImportPath(aliasedImport.source, availablePackages);

  return 'unknown';
}

function countPatterns(report: UsageReport, patternMap: Map<string, number>) {
  // Count import patterns
  increment(
    patternMap,
    'imports.default',
    report.patterns.imports.default.length,
  );
  increment(patternMap, 'imports.named', report.patterns.imports.named.length);
  increment(
    patternMap,
    'imports.namespace',
    report.patterns.imports.namespace.length,
  );
  increment(
    patternMap,
    'imports.aliased',
    report.patterns.imports.aliased.length,
  );

  // Count usage patterns
  increment(patternMap, 'usage.jsx', report.patterns.usage.jsx.length);
  increment(
    patternMap,
    'usage.variables',
    report.patterns.usage.variables.length,
  );
  increment(
    patternMap,
    'usage.destructuring',
    report.patterns.usage.destructuring.length,
  );
  increment(
    patternMap,
    'usage.conditional',
    report.patterns.usage.conditional.length,
  );
  increment(patternMap, 'usage.arrays', report.patterns.usage.arrays.length);
  increment(patternMap, 'usage.objects', report.patterns.usage.objects.length);

  // Count advanced patterns
  increment(patternMap, 'advanced.lazy', report.patterns.advanced.lazy.length);
  increment(
    patternMap,
    'advanced.dynamic',
    report.patterns.advanced.dynamic.length,
  );
  increment(patternMap, 'advanced.hoc', report.patterns.advanced.hoc.length);
  increment(patternMap, 'advanced.memo', report.patterns.advanced.memo.length);
  increment(
    patternMap,
    'advanced.forwardRef',
    report.patterns.advanced.forwardRef.length,
  );
  increment(
    patternMap,
    'advanced.portal',
    report.patterns.advanced.portal.length,
  );
}

function increment(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) || 0) + value);
}

function getPatternDisplayName(patternType: string): string {
  const displayNames: Record<string, string> = {
    'imports.default': 'Default Imports',
    'imports.named': 'Named Imports',
    'imports.namespace': 'Namespace Imports',
    'imports.aliased': 'Aliased Imports',
    'usage.jsx': 'JSX Usage',
    'usage.variables': 'Variable Assignments',
    'usage.destructuring': 'Destructuring',
    'usage.conditional': 'Conditional Usage',
    'usage.arrays': 'Array Mappings',
    'usage.objects': 'Object Mappings',
    'advanced.lazy': 'Lazy Loading',
    'advanced.dynamic': 'Dynamic Imports',
    'advanced.hoc': 'Higher-Order Components',
    'advanced.memo': 'Memoized Components',
    'advanced.forwardRef': 'Forward Refs',
    'advanced.portal': 'Portal Usage',
  };
  return displayNames[patternType] || patternType;
}

function getPackageVersion(
  packageName: string,
  versions: Record<string, string>,
): string | null {
  // First try exact match
  if (versions[packageName]) {
    return versions[packageName];
  }

  // Handle subpath imports like '@design-system/foundation/button'
  // Try to find the base package '@design-system/foundation'
  if (packageName.includes('/')) {
    const parts = packageName.split('/');

    // For scoped packages like '@scope/package/subpath'
    if (packageName.startsWith('@') && parts.length > 2) {
      const basePackage = `${parts[0]}/${parts[1]}`;
      if (versions[basePackage]) {
        return versions[basePackage];
      }
    }

    // For non-scoped packages like 'package/subpath'
    if (!packageName.startsWith('@') && parts.length > 1) {
      const basePackage = parts[0];
      if (versions[basePackage]) {
        return versions[basePackage];
      }
    }
  }

  return null;
}

function calculatePackageDistribution(
  componentUsageMap: Map<string, ComponentUsage>,
  versions: Record<string, string>,
  totalUsagePatterns: number,
): PackageDistribution[] {
  const packageMap = new Map<string, PackageDistribution>();

  // Group components by package
  for (const component of componentUsageMap.values()) {
    if (component.source === 'unknown') continue;

    const existing = packageMap.get(component.source);
    if (existing) {
      existing.componentCount++;
      existing.usageCount += component.count;
      existing.components.push(component.name);
    } else {
      packageMap.set(component.source, {
        packageName: component.source,
        version: getPackageVersion(component.source, versions),
        componentCount: 1,
        usageCount: component.count,
        percentage: 0,
        components: [component.name],
      });
    }
  }

  // Calculate percentages based on total external package usage (not all patterns)
  const distribution = Array.from(packageMap.values());
  const totalExternalUsage = distribution.reduce((sum, pkg) => sum + pkg.usageCount, 0);

  for (const pkg of distribution) {
    pkg.percentage =
      totalExternalUsage > 0 ? (pkg.usageCount / totalExternalUsage) * 100 : 0;
  }

  return distribution.sort((a, b) => b.usageCount - a.usageCount);
}
