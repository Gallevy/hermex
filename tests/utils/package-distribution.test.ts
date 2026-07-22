import { describe, expect, it } from 'vitest';
import {
  calculatePackageDistribution,
  findComponentSource,
} from '../../src/utils/package-distribution';
import type { ComponentUsage } from '../../src/utils/package-distribution';
import { HermexConfigSchema } from '../../src/config/schema';
import type { HermexConfigInput } from '../../src/config/schema';
import { createMockReport } from '../helpers/mock-reports';

/** Parse a partial config through the real schema so all defaults apply. */
function createConfig(input: HermexConfigInput = {}) {
  return HermexConfigSchema.parse(input);
}

/** Build a ComponentUsage entry for calculatePackageDistribution's input map. */
function makeComponent(
  name: string,
  source: string,
  count = 1,
): ComponentUsage {
  return { name, source, count, files: new Set() };
}

describe('findComponentSource', () => {
  it('resolves a component from a named import to its package', () => {
    const report = createMockReport();
    report.patterns.imports.named.push({ name: 'Button', source: 'antd' });

    expect(findComponentSource('Button', report, ['antd'])).toBe('antd');
  });

  it('resolves a component from a default import to its package', () => {
    const report = createMockReport();
    report.patterns.imports.default.push({ name: 'React', source: 'react' });

    expect(findComponentSource('React', report, ['react'])).toBe('react');
  });

  it('resolves a component from an aliased import to its package', () => {
    const report = createMockReport();
    report.patterns.imports.aliased.push({
      imported: 'Button',
      local: 'AliasedButton',
      source: 'antd',
    });

    expect(findComponentSource('AliasedButton', report, ['antd'])).toBe('antd');
  });

  it('resolves a relative-path import source to "local"', () => {
    const report = createMockReport();
    report.patterns.imports.named.push({
      name: 'Header',
      source: './Header',
    });

    expect(findComponentSource('Header', report, [])).toBe('local');
  });

  it('falls back to "unknown" for a component with no matching import', () => {
    const report = createMockReport();

    expect(findComponentSource('Ghost', report, ['antd'])).toBe('unknown');
  });
});

describe('calculatePackageDistribution', () => {
  it('aggregates componentCount and usageCount for multiple components from the same package', () => {
    const componentUsageMap = new Map<string, ComponentUsage>([
      ['Button', makeComponent('Button', 'antd', 3)],
      ['Modal', makeComponent('Modal', 'antd', 2)],
    ]);

    const distribution = calculatePackageDistribution(componentUsageMap, {});

    expect(distribution).toHaveLength(1);
    expect(distribution[0].packageName).toBe('antd');
    expect(distribution[0].componentCount).toBe(2);
    expect(distribution[0].usageCount).toBe(5);
    expect(distribution[0].components).toEqual(['Button', 'Modal']);
  });

  it('computes percentages that sum to ~100 across external packages', () => {
    const componentUsageMap = new Map<string, ComponentUsage>([
      ['Button', makeComponent('Button', 'antd', 3)],
      ['DatePicker', makeComponent('DatePicker', 'moment', 1)],
    ]);

    const distribution = calculatePackageDistribution(componentUsageMap, {});

    const totalPercentage = distribution.reduce(
      (sum, pkg) => sum + pkg.percentage,
      0,
    );
    expect(totalPercentage).toBeCloseTo(100);
    const antd = distribution.find((p) => p.packageName === 'antd');
    const moment = distribution.find((p) => p.packageName === 'moment');
    expect(antd?.percentage).toBeCloseTo(75);
    expect(moment?.percentage).toBeCloseTo(25);
  });

  it('excludes components whose source resolved to "local" from the distribution', () => {
    const componentUsageMap = new Map<string, ComponentUsage>([
      ['Header', makeComponent('Header', 'local', 1)],
      ['Button', makeComponent('Button', 'antd', 1)],
    ]);

    const distribution = calculatePackageDistribution(componentUsageMap, {});

    expect(distribution).toHaveLength(1);
    expect(distribution[0].packageName).toBe('antd');
  });

  it('excludes components whose source resolved to "unknown" from the distribution', () => {
    const componentUsageMap = new Map<string, ComponentUsage>([
      ['Ghost', makeComponent('Ghost', 'unknown', 1)],
    ]);

    const distribution = calculatePackageDistribution(componentUsageMap, {});

    expect(distribution).toEqual([]);
  });

  it('assigns a version when the package is present in the versions map', () => {
    const componentUsageMap = new Map<string, ComponentUsage>([
      ['Button', makeComponent('Button', 'antd', 1)],
    ]);

    const distribution = calculatePackageDistribution(componentUsageMap, {
      antd: '5.0.0',
    });

    expect(distribution[0].version).toBe('5.0.0');
  });

  it('leaves version null when the package is absent from the versions map', () => {
    const componentUsageMap = new Map<string, ComponentUsage>([
      ['Button', makeComponent('Button', 'antd', 1)],
    ]);

    const distribution = calculatePackageDistribution(componentUsageMap, {});

    expect(distribution[0].version).toBeNull();
  });

  it('flags hasVersionConflict and populates allVersions when multiVersions has 2+ entries for a package', () => {
    const componentUsageMap = new Map<string, ComponentUsage>([
      ['Button', makeComponent('Button', 'antd', 1)],
    ]);

    const distribution = calculatePackageDistribution(
      componentUsageMap,
      { antd: '5.0.0' },
      undefined,
      { antd: ['4.24.0', '5.0.0'] },
    );

    expect(distribution[0].hasVersionConflict).toBe(true);
    expect(distribution[0].allVersions).toEqual(['4.24.0', '5.0.0']);
  });

  it('does not flag hasVersionConflict when multiVersions has a single entry for a package', () => {
    const componentUsageMap = new Map<string, ComponentUsage>([
      ['Button', makeComponent('Button', 'antd', 1)],
    ]);

    const distribution = calculatePackageDistribution(
      componentUsageMap,
      { antd: '5.0.0' },
      undefined,
      { antd: ['5.0.0'] },
    );

    expect(distribution[0].hasVersionConflict).toBe(false);
    expect(distribution[0].allVersions).toEqual(['5.0.0']);
  });

  it('marks a package as internal when it matches a configured internal pattern', () => {
    const componentUsageMap = new Map<string, ComponentUsage>([
      ['Widget', makeComponent('Widget', '@my-org/ui', 1)],
    ]);
    const config = createConfig({ packages: { internal: ['@my-org/*'] } });

    const distribution = calculatePackageDistribution(
      componentUsageMap,
      {},
      config,
    );

    expect(distribution[0].internal).toBe(true);
  });

  it('excludes a package matched by a configured ignore pattern', () => {
    const componentUsageMap = new Map<string, ComponentUsage>([
      ['Button', makeComponent('Button', 'antd', 1)],
    ]);
    const config = createConfig({ packages: { ignore: ['antd'] } });

    const distribution = calculatePackageDistribution(
      componentUsageMap,
      {},
      config,
    );

    expect(distribution).toEqual([]);
  });
});

describe('calculatePackageDistribution — lockfile-only enforceOn deps (#27)', () => {
  it('surfaces a lockfile package with zero usage when it matches releaseAge.enforceOn', () => {
    const componentUsageMap = new Map<string, ComponentUsage>();
    const config = createConfig({
      releaseAge: { enabled: true, enforceOn: ['@guestyci/arc-styles'] },
    });

    const distribution = calculatePackageDistribution(
      componentUsageMap,
      { '@guestyci/arc-styles': '2.1.0' },
      config,
    );

    expect(distribution).toHaveLength(1);
    expect(distribution[0]).toMatchObject({
      packageName: '@guestyci/arc-styles',
      version: '2.1.0',
      componentCount: 0,
      usageCount: 0,
      percentage: 0,
      components: [],
      internal: false,
    });
  });

  it('does not surface lockfile-only packages when releaseAge is disabled', () => {
    const componentUsageMap = new Map<string, ComponentUsage>();
    const config = createConfig({
      releaseAge: { enabled: false, enforceOn: ['@guestyci/arc-styles'] },
    });

    const distribution = calculatePackageDistribution(
      componentUsageMap,
      { '@guestyci/arc-styles': '2.1.0' },
      config,
    );

    expect(distribution).toEqual([]);
  });

  it('does not surface lockfile-only packages when enforceOn is left empty (avoids pulling in the whole lockfile)', () => {
    const componentUsageMap = new Map<string, ComponentUsage>();
    const config = createConfig({ releaseAge: { enabled: true } });

    const distribution = calculatePackageDistribution(
      componentUsageMap,
      { '@guestyci/arc-styles': '2.1.0', lodash: '4.17.21' },
      config,
    );

    expect(distribution).toEqual([]);
  });

  it('does not duplicate or reset an entry that already has real component usage', () => {
    const componentUsageMap = new Map<string, ComponentUsage>([
      ['Button', makeComponent('Button', '@guestyci/arc-styles', 3)],
    ]);
    const config = createConfig({
      releaseAge: { enabled: true, enforceOn: ['@guestyci/arc-styles'] },
    });

    const distribution = calculatePackageDistribution(
      componentUsageMap,
      { '@guestyci/arc-styles': '2.1.0' },
      config,
    );

    expect(distribution).toHaveLength(1);
    expect(distribution[0].componentCount).toBe(1);
    expect(distribution[0].usageCount).toBe(3);
  });

  it('respects a configured ignore pattern for a lockfile-only enforceOn match', () => {
    const componentUsageMap = new Map<string, ComponentUsage>();
    const config = createConfig({
      packages: { ignore: ['@guestyci/arc-styles'] },
      releaseAge: { enabled: true, enforceOn: ['@guestyci/arc-styles'] },
    });

    const distribution = calculatePackageDistribution(
      componentUsageMap,
      { '@guestyci/arc-styles': '2.1.0' },
      config,
    );

    expect(distribution).toEqual([]);
  });

  it('marks a lockfile-only enforceOn match as internal when it matches an internal pattern', () => {
    const componentUsageMap = new Map<string, ComponentUsage>();
    const config = createConfig({
      packages: { internal: ['@guestyci/*'] },
      releaseAge: { enabled: true, enforceOn: ['@guestyci/arc-styles'] },
    });

    const distribution = calculatePackageDistribution(
      componentUsageMap,
      { '@guestyci/arc-styles': '2.1.0' },
      config,
    );

    expect(distribution[0].internal).toBe(true);
  });

  it('flags hasVersionConflict/allVersions for a lockfile-only enforceOn match', () => {
    const componentUsageMap = new Map<string, ComponentUsage>();
    const config = createConfig({
      releaseAge: { enabled: true, enforceOn: ['@guestyci/arc-styles'] },
    });

    const distribution = calculatePackageDistribution(
      componentUsageMap,
      { '@guestyci/arc-styles': '2.1.0' },
      config,
      { '@guestyci/arc-styles': ['2.0.0', '2.1.0'] },
    );

    expect(distribution[0].hasVersionConflict).toBe(true);
    expect(distribution[0].allVersions).toEqual(['2.0.0', '2.1.0']);
  });

  it('only surfaces lockfile packages matching enforceOn, leaving unmatched deps out', () => {
    const componentUsageMap = new Map<string, ComponentUsage>();
    const config = createConfig({
      releaseAge: { enabled: true, enforceOn: ['@guestyci/arc-styles'] },
    });

    const distribution = calculatePackageDistribution(
      componentUsageMap,
      { '@guestyci/arc-styles': '2.1.0', lodash: '4.17.21' },
      config,
    );

    expect(distribution).toHaveLength(1);
    expect(distribution[0].packageName).toBe('@guestyci/arc-styles');
  });

  it('does not affect percentage totals for packages with real usage', () => {
    const componentUsageMap = new Map<string, ComponentUsage>([
      ['Button', makeComponent('Button', 'antd', 3)],
      ['DatePicker', makeComponent('DatePicker', 'moment', 1)],
    ]);
    const config = createConfig({
      releaseAge: { enabled: true, enforceOn: ['@guestyci/arc-styles'] },
    });

    const distribution = calculatePackageDistribution(
      componentUsageMap,
      { '@guestyci/arc-styles': '2.1.0' },
      config,
    );

    const antd = distribution.find((p) => p.packageName === 'antd');
    const moment = distribution.find((p) => p.packageName === 'moment');
    const arcStyles = distribution.find(
      (p) => p.packageName === '@guestyci/arc-styles',
    );
    expect(antd?.percentage).toBeCloseTo(75);
    expect(moment?.percentage).toBeCloseTo(25);
    expect(arcStyles?.percentage).toBe(0);
  });
});
