import { describe, it, expect } from 'vitest';
import {
  createMockReport,
  createMockPackage,
  createMockReleaseAge,
} from './mock-reports';

describe('mock report factory', () => {
  it('createMockReport returns a valid UsageReport', () => {
    const report = createMockReport();
    expect(report.summary.totalImports).toBe(0);
    expect(report.patterns.imports.named).toEqual([]);
  });

  it('createMockReport accepts overrides', () => {
    const report = createMockReport({ components: ['Button', 'Icon'] });
    expect(report.components).toEqual(['Button', 'Icon']);
  });

  it('createMockPackage returns a valid PackageDistribution', () => {
    const pkg = createMockPackage('react');
    expect(pkg.packageName).toBe('react');
    expect(pkg.internal).toBe(false);
  });

  it('createMockReleaseAge returns a valid ReleaseAgeEntry', () => {
    const entry = createMockReleaseAge({ worstLevel: 'minor_overdue' });
    expect(entry.worstLevel).toBe('minor_overdue');
  });
});
