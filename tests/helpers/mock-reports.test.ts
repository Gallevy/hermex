import { describe, it, expect } from 'vitest';
import { deriveOverdueTier } from '../../src/rules/no-outdated-packages';
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
  });

  // The entry carries facts only — there is no verdict field to set. A
  // breached tier is expressed by the upgrade that breached it, and the
  // verdict is derived from that (#189).
  it('createMockReleaseAge returns a valid ReleaseAgeEntry', () => {
    const entry = createMockReleaseAge();
    expect(entry.measuredVersion).toBe('1.0.0');
    expect(deriveOverdueTier(entry.upgrades)).toBeNull();

    const overdue = createMockReleaseAge({
      upgrades: [
        {
          version: '1.1.0',
          releasedDaysAgo: 10,
          breachReleasedDaysAgo: 60,
          semverBump: 'minor',
          thresholdDays: 45,
        },
      ],
    });
    expect(deriveOverdueTier(overdue.upgrades)).toBe('minor');
  });
});
