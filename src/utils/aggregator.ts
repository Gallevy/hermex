import micromatch from 'micromatch';
import type { UsageReport } from '../swc-parser';
import type { HermexConfig, VersusConfig } from '../config/types';
import type { MultiVersionMap } from '../lock-parser';
import type { RuleViolation } from '../rules/evaluator';
import type { ReleaseAgeEntry } from '../npm-registry/types';

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
  internal: boolean;
  hasVersionConflict: boolean;
  allVersions: string[];
  releaseAge?: ReleaseAgeEntry;
}

export interface PatternCount {
  patternType: string;
  displayName: string;
  count: number;
}

export interface VersusEntry {
  packageName: string;
  count: number;
  percentage: number;
  components: string[];
}

export interface VersusResult {
  name: string;
  packages: string[];
  entries: VersusEntry[];
  totalCount: number;
}

export interface BannedPackageViolation {
  packageName: string;
  severity: 'error' | 'warn';
  message?: string;
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
          files: new Set(),
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
  );

  const versusResults = calculateVersusResults(
    packageDistribution,
    config?.versus ?? [],
  );
  const bannedPackageViolations = detectBannedPackages(
    packageDistribution,
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
    ruleViolations: [],
    bannedPackageViolations,
    reports,
  };
}

function calculateVersusResults(
  distribution: PackageDistribution[],
  versusConfigs: VersusConfig[],
): VersusResult[] {
  const distMap = new Map(distribution.map((p) => [p.packageName, p]));

  return versusConfigs.map((vc) => {
    const entries: VersusEntry[] = vc.packages.map((pkgName) => {
      const pkg = distMap.get(pkgName);
      return {
        packageName: pkgName,
        count: pkg?.usageCount ?? 0,
        percentage: 0,
        components: pkg?.components ?? [],
      };
    });

    const totalCount = entries.reduce((sum, e) => sum + e.count, 0);

    for (const entry of entries) {
      entry.percentage = totalCount > 0 ? (entry.count / totalCount) * 100 : 0;
    }

    entries.sort((a, b) => b.count - a.count);

    return { name: vc.name, packages: vc.packages, entries, totalCount };
  });
}

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function detectBannedPackages(
  distribution: PackageDistribution[],
  config?: HermexConfig,
): BannedPackageViolation[] {
  const forbidRules = toArray(config?.rules.forbid_packages);
  if (forbidRules.length === 0) return [];

  const violations: BannedPackageViolation[] = [];
  for (const pkg of distribution) {
    for (const rule of forbidRules) {
      if (micromatch.isMatch(pkg.packageName, rule.patterns)) {
        violations.push({
          packageName: pkg.packageName,
          severity: rule.severity,
          message: rule.message,
        });
        break;
      }
    }
  }
  return violations;
}

function resolvePackageFromImportPath(
  importPath: string,
  availablePackages: string[],
): string {
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return 'local';
  }

  const sortedPackages = [...availablePackages].sort(
    (a, b) => b.length - a.length,
  );

  for (const pkg of sortedPackages) {
    if (importPath === pkg) return pkg;
    if (importPath.startsWith(`${pkg}/`)) return pkg;
  }

  return 'unknown';
}

function findComponentSource(
  componentName: string,
  report: UsageReport,
  availablePackages: string[],
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

function countPatterns(report: UsageReport, patternMap: Map<string, number>) {
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

function calculatePackageDistribution(
  componentUsageMap: Map<string, ComponentUsage>,
  versions: Record<string, string>,
  config?: HermexConfig,
  multiVersions: MultiVersionMap = {},
): PackageDistribution[] {
  const ignorePatterns = config?.packages.ignore ?? [];
  const internalPatterns = config?.packages.internal ?? [];

  const packageMap = new Map<string, PackageDistribution>();

  for (const component of componentUsageMap.values()) {
    if (component.source === 'unknown' || component.source === 'local')
      continue;

    if (
      ignorePatterns.length > 0 &&
      micromatch.isMatch(component.source, ignorePatterns)
    ) {
      continue;
    }

    const existing = packageMap.get(component.source);
    if (existing) {
      existing.componentCount++;
      existing.usageCount += component.count;
      existing.components.push(component.name);
    } else {
      const isInternal =
        internalPatterns.length > 0
          ? micromatch.isMatch(component.source, internalPatterns)
          : false;

      const allVersions = multiVersions[component.source] ?? [];
      const hasVersionConflict = allVersions.length > 1;

      packageMap.set(component.source, {
        packageName: component.source,
        version: getPackageVersion(component.source, versions),
        componentCount: 1,
        usageCount: component.count,
        percentage: 0,
        components: [component.name],
        internal: isInternal,
        hasVersionConflict,
        allVersions,
      });
    }
  }

  const distribution = Array.from(packageMap.values());
  const totalExternalUsage = distribution.reduce(
    (sum, pkg) => sum + pkg.usageCount,
    0,
  );

  for (const pkg of distribution) {
    pkg.percentage =
      totalExternalUsage > 0 ? (pkg.usageCount / totalExternalUsage) * 100 : 0;
  }

  return distribution.sort((a, b) => b.usageCount - a.usageCount);
}
