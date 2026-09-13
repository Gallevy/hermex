import { describe, expect, it } from 'vitest';
import {
  countPatterns,
  getPatternDisplayName,
} from '../../src/utils/pattern-counter';
import type { JSXUsage } from '../../src/swc-parser/types';
import { createMockReport } from '../helpers/mock-reports';

/** Create a minimal JSXUsage entry for a component. */
function jsxUsage(component: string): JSXUsage {
  return {
    component,
    props: [],
    propsAnalysis: {
      namedProps: [],
      hasSpread: false,
      hasComplexProps: false,
      hasEventHandlers: false,
      propDetails: [],
    },
  };
}

describe('countPatterns', () => {
  it('increments the pattern map keys from a report with one named import and two jsx usages', () => {
    const report = createMockReport();
    report.patterns.imports.named.push({ name: 'Button', source: 'antd' });
    report.patterns.usage.jsx.push(jsxUsage('Button'), jsxUsage('Button'));

    const patternMap = new Map<string, number>();
    countPatterns(report, patternMap);

    expect(patternMap.get('imports.named')).toBe(1);
    expect(patternMap.get('usage.jsx')).toBe(2);
  });

  it('accumulates counts across multiple calls with the same map', () => {
    const report = createMockReport();
    report.patterns.imports.named.push({ name: 'Button', source: 'antd' });

    const patternMap = new Map<string, number>();
    countPatterns(report, patternMap);
    countPatterns(report, patternMap);

    expect(patternMap.get('imports.named')).toBe(2);
  });

  it('sets every known pattern key, including zero counts, on the first call', () => {
    const report = createMockReport();
    const patternMap = new Map<string, number>();

    countPatterns(report, patternMap);

    expect(patternMap.get('imports.default')).toBe(0);
    expect(patternMap.get('advanced.portal')).toBe(0);
    expect(patternMap.size).toBe(17);
  });

  it('sums to summary.totalUsagePatterns, including props', () => {
    const report = createMockReport();
    report.patterns.imports.default.push({ name: 'A', source: 'a' });
    report.patterns.imports.named.push(
      { name: 'B', source: 'b' },
      { name: 'C', source: 'c' },
    );
    report.patterns.imports.aliased.push({
      imported: 'C',
      local: 'CAlias',
      source: 'c',
    });
    report.patterns.usage.jsx.push(jsxUsage('B'));
    report.patterns.props.push({
      component: 'B',
      analysis: {
        namedProps: [],
        hasSpread: false,
        hasComplexProps: false,
        hasEventHandlers: false,
        propDetails: [],
      },
    });
    // Mirrors calculateTotalPatterns: a naive sum of every collection's
    // size, aliased counted alongside named since it is its own collection.
    report.summary.totalUsagePatterns =
      report.patterns.imports.default.length +
      report.patterns.imports.named.length +
      report.patterns.imports.namespace.length +
      report.patterns.imports.aliased.length +
      report.patterns.usage.jsx.length +
      report.patterns.props.length;

    const patternMap = new Map<string, number>();
    countPatterns(report, patternMap);
    const sumOfCounts = [...patternMap.values()].reduce((a, b) => a + b, 0);

    expect(sumOfCounts).toBe(report.summary.totalUsagePatterns);
  });

  it('partitions the import buckets to sum to summary.totalImports, with an aliased import present', () => {
    const report = createMockReport();
    report.patterns.imports.default.push({ name: 'A', source: 'a' });
    report.patterns.imports.named.push(
      { name: 'B', source: 'b' },
      { name: 'C', source: 'c' },
    );
    report.patterns.imports.aliased.push({
      imported: 'C',
      local: 'CAlias',
      source: 'c',
    });
    report.summary.totalImports =
      report.patterns.imports.default.length +
      report.patterns.imports.named.length +
      report.patterns.imports.namespace.length;

    const patternMap = new Map<string, number>();
    countPatterns(report, patternMap);
    const importBucketSum =
      (patternMap.get('imports.default') ?? 0) +
      (patternMap.get('imports.named') ?? 0) +
      (patternMap.get('imports.namespace') ?? 0);

    expect(importBucketSum).toBe(report.summary.totalImports);
  });
});

describe('getPatternDisplayName', () => {
  it('maps a known pattern key to its display name', () => {
    expect(getPatternDisplayName('usage.jsx')).toBe('JSX Usage');
  });

  it('falls back to the key itself for an unknown pattern type', () => {
    expect(getPatternDisplayName('not.a.real.key')).toBe('not.a.real.key');
  });
});
