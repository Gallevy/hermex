import { describe, expect, it } from 'vitest';
import {
  buildPackageInventory,
  isDeclared,
  isInstalled,
  isOwnedByRepo,
  isUsed,
} from '../../src/utils/package-inventory';
import type {
  ComponentUsage,
  PackageInventoryEntry,
} from '../../src/utils/package-inventory';
import { HermexConfigSchema } from '../../src/config/schema';
import type { HermexConfigInput } from '../../src/config/schema';
import { applyOverrides } from '../../src/config/overrides';

function createConfig(input: HermexConfigInput = {}) {
  return applyOverrides(HermexConfigSchema.parse(input), process.cwd());
}

function usageMap(
  ...components: { name: string; source: string; count?: number }[]
): Map<string, ComponentUsage> {
  return new Map(
    components.map((c) => [
      `${c.source}::${c.name}`,
      { name: c.name, source: c.source, count: c.count ?? 1, files: new Set() },
    ]),
  );
}

function find(
  inventory: PackageInventoryEntry[],
  packageName: string,
): PackageInventoryEntry | undefined {
  return inventory.find((entry) => entry.packageName === packageName);
}

describe('buildPackageInventory — axes', () => {
  it('merges declared, installed and used packages into one list', () => {
    const inventory = buildPackageInventory({
      versions: { react: '18.0.0', oxlint: '1.0.0', 'lru-cache': '10.0.0' },
      declared: { react: ['dependencies'], oxlint: ['devDependencies'] },
      componentUsage: usageMap({ name: 'Button', source: 'react' }),
    });

    expect(inventory.map((e) => e.packageName).sort()).toEqual([
      'lru-cache',
      'oxlint',
      'react',
    ]);
  });

  it('records every bucket that declares a package', () => {
    const inventory = buildPackageInventory({
      declared: { react: ['peerDependencies', 'devDependencies'] },
    });

    expect(find(inventory, 'react')?.declaredIn).toEqual([
      'peerDependencies',
      'devDependencies',
    ]);
  });

  it('includes a package that is only imported, never declared or installed', () => {
    const inventory = buildPackageInventory({
      componentUsage: usageMap({ name: 'Button', source: '@acme/ui' }),
    });

    const entry = find(inventory, '@acme/ui');
    expect(entry).toBeDefined();
    expect(isUsed(entry!)).toBe(true);
    expect(isDeclared(entry!)).toBe(false);
    expect(isInstalled(entry!)).toBe(false);
  });

  it('excludes local and unresolved import sources', () => {
    const inventory = buildPackageInventory({
      componentUsage: usageMap(
        { name: 'Header', source: 'local' },
        { name: 'Mystery', source: 'unknown' },
      ),
    });

    expect(inventory).toEqual([]);
  });

  it('folds several components from one package into a single entry', () => {
    const inventory = buildPackageInventory({
      componentUsage: usageMap(
        { name: 'Button', source: 'antd', count: 3 },
        { name: 'Card', source: 'antd', count: 2 },
      ),
    });

    const entry = find(inventory, 'antd');
    expect(entry?.usageCount).toBe(5);
    expect(entry?.componentCount).toBe(2);
    expect(entry?.components).toEqual(['Button', 'Card']);
  });

  it('orders entries by usage, so every view derived from it is usage-ranked', () => {
    const inventory = buildPackageInventory({
      versions: { jest: '29.0.0' },
      componentUsage: usageMap(
        { name: 'Button', source: 'antd', count: 1 },
        { name: 'Moment', source: 'moment', count: 9 },
      ),
    });

    expect(inventory.map((e) => e.packageName)).toEqual([
      'moment',
      'antd',
      'jest',
    ]);
  });
});

describe('buildPackageInventory — version resolution', () => {
  it('carries the effective version, root version and every resolved copy', () => {
    const inventory = buildPackageInventory({
      versions: { antd: '5.0.0' },
      multiVersions: { antd: ['5.0.0', '4.0.0'] },
      resolutions: { antd: { rootVersion: '5.0.0', allVersions: ['5.0.0'] } },
      componentUsage: usageMap({ name: 'Button', source: 'antd' }),
    });

    const entry = find(inventory, 'antd');
    expect(entry?.version).toBe('5.0.0');
    expect(entry?.rootVersion).toBe('5.0.0');
    expect(entry?.allVersions).toEqual(['5.0.0', '4.0.0']);
    expect(entry?.hasVersionConflict).toBe(true);
  });

  it('resolves a scoped subpath import to its base package version', () => {
    const inventory = buildPackageInventory({
      versions: { '@my-org/ui': '2.0.0' },
      resolutions: {
        '@my-org/ui': { rootVersion: '2.0.0', allVersions: ['2.0.0'] },
      },
      componentUsage: usageMap({ name: 'Icon', source: '@my-org/ui/icons' }),
    });

    const entry = find(inventory, '@my-org/ui/icons');
    expect(entry?.version).toBe('2.0.0');
    expect(entry?.rootVersion).toBe('2.0.0');
  });

  it('marks a purely transitive dependency as installed on the tree axis only', () => {
    const inventory = buildPackageInventory({
      versions: { 'lru-cache': '10.0.0' },
      resolutions: {
        'lru-cache': { rootVersion: null, allVersions: ['10.0.0'] },
      },
    });

    const entry = find(inventory, 'lru-cache')!;
    expect(isInstalled(entry, 'tree')).toBe(true);
    expect(isInstalled(entry, 'root')).toBe(false);
  });
});

describe('buildPackageInventory — config flags', () => {
  it('flags packages matching packages.ignore instead of dropping them', () => {
    const config = createConfig({ packages: { ignore: ['react'] } });
    const inventory = buildPackageInventory({
      versions: { react: '18.0.0' },
      declared: { react: ['dependencies'] },
      config,
    });

    const entry = find(inventory, 'react');
    // Still present — `require_packages` must be able to see it — but
    // marked so reporting views and forbid rules can skip it.
    expect(entry).toBeDefined();
    expect(entry?.ignored).toBe(true);
    expect(isOwnedByRepo(entry!)).toBe(false);
  });

  it('flags packages matching packages.internal', () => {
    const config = createConfig({ packages: { internal: ['@my-org/*'] } });
    const inventory = buildPackageInventory({
      versions: { '@my-org/ui': '2.0.0', react: '18.0.0' },
      config,
    });

    expect(find(inventory, '@my-org/ui')?.internal).toBe(true);
    expect(find(inventory, 'react')?.internal).toBe(false);
  });
});

describe('inventory predicates', () => {
  it('isOwnedByRepo accepts declared-but-unused and used-but-undeclared packages', () => {
    const inventory = buildPackageInventory({
      versions: { oxlint: '1.0.0', 'lru-cache': '10.0.0' },
      resolutions: {
        oxlint: { rootVersion: '1.0.0', allVersions: ['1.0.0'] },
        'lru-cache': { rootVersion: null, allVersions: ['10.0.0'] },
      },
      declared: { oxlint: ['devDependencies'] },
      componentUsage: usageMap({ name: 'Button', source: '@acme/ui' }),
    });

    expect(
      inventory
        .filter(isOwnedByRepo)
        .map((e) => e.packageName)
        .sort(),
    ).toEqual(['@acme/ui', 'oxlint']);
  });
});
