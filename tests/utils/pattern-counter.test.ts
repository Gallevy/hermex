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
    expect(patternMap.size).toBe(16);
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
