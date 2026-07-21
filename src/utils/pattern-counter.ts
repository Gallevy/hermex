import type { UsageReport } from '../swc-parser';

export interface PatternCount {
  patternType: string;
  displayName: string;
  count: number;
}

export function countPatterns(
  report: UsageReport,
  patternMap: Map<string, number>,
) {
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

export function getPatternDisplayName(patternType: string): string {
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
