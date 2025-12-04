import type { ParserState, UsageReport } from '../types';

/**
 * Generates a comprehensive usage report from parser state
 */
export function generateReport(state: ParserState): UsageReport {
  const report: UsageReport = {
    summary: {
      totalImports:
        state.usagePatterns.defaultImports.size +
        state.usagePatterns.namedImports.size +
        state.usagePatterns.namespaceImports.size,
      totalComponents: state.componentNames.size,
      totalUsagePatterns: calculateTotalPatterns(state),
    },
    patterns: {
      imports: {
        default: Array.from(state.usagePatterns.defaultImports),
        named: Array.from(state.usagePatterns.namedImports),
        namespace: Array.from(state.usagePatterns.namespaceImports),
        aliased: Array.from(state.usagePatterns.aliasedImports.values()),
      },
      usage: {
        jsx: Array.from(state.usagePatterns.jsxUsage.values()),
        variables: Array.from(
          state.usagePatterns.variableAssignments.entries(),
        ).map(([key, value]) => ({
          variable: key,
          assignment: value.assignment,
        })),
        destructuring: Array.from(state.usagePatterns.destructuredUsage),
        conditional: Array.from(state.usagePatterns.conditionalUsage),
        arrays: Array.from(state.usagePatterns.arrayMappings),
        objects: Array.from(state.usagePatterns.objectMappings),
      },
      advanced: {
        lazy: Array.from(state.usagePatterns.lazyImports),
        dynamic: Array.from(state.usagePatterns.dynamicImports),
        hoc: Array.from(state.usagePatterns.hocUsage),
        memo: Array.from(state.usagePatterns.memoizedComponents),
        forwardRef: Array.from(state.usagePatterns.forwardedRefs),
        portal: Array.from(state.usagePatterns.portalUsage),
      },
      props: Array.from(state.usagePatterns.propsAnalysis.entries()).map(
        ([component, analysis]) => ({
          component,
          analysis,
        }),
      ),
    },
    components: Array.from(state.componentNames).sort(),
  };

  return report;
}

/**
 * Calculates total number of usage patterns found
 */
function calculateTotalPatterns(state: ParserState): number {
  let sum = 0;
  const patterns = state.usagePatterns;

  for (const key in patterns) {
    const pattern = (patterns as any)[key];
    if (pattern instanceof Set) {
      sum += pattern.size;
    } else if (pattern instanceof Map) {
      sum += pattern.size;
    }
  }

  return sum;
}
