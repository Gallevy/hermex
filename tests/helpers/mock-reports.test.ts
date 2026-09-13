import { describe, it, expect } from 'vitest';
import { assessPackage } from '../../src/rules/no-outdated-packages';
import {
  createMockReport,
  createMockPackage,
  createMockCopy,
  createMockRelease,
  createMockReleases,
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
  // The facts factory has nothing verdict-shaped to produce: "overdue" is
  // not a property of the fixture, it is what `assessPackage` concludes
  // once a threshold is applied to it (#189).
  it('createMockReleases returns policy-free registry facts', () => {
    const releases = createMockReleases();
    expect(releases.resolved).toEqual([
      { version: '1.0.0', isRoot: true, newer: [] },
    ]);

    const THRESHOLDS = { patch: 30, minor: 45, major: 60 };
    expect(
      assessPackage(releases, { thresholds: THRESHOLDS, scope: 'root' })
        .overdueTier,
    ).toBeNull();

    const withOldRelease = createMockReleases({
      resolved: [
        createMockCopy('1.0.0', [createMockRelease('1.1.0', 60, 'minor')]),
      ],
    });
    expect(
      assessPackage(withOldRelease, { thresholds: THRESHOLDS, scope: 'root' })
        .overdueTier,
    ).toBe('minor');
  });
});
