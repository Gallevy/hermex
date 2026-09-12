import { describe, expect, it } from 'vitest';
import { parseCode } from '../../src/swc-parser';
import { aggregateReports } from '../../src/utils/aggregator';
import { HermexConfigSchema } from '../../src/config/schema';
import { applyOverrides } from '../../src/config/overrides';
import { readFixture } from '../helpers/read-fixture';

/**
 * The imported axis, end to end through the real parser over the real
 * fixtures — #174.
 *
 * `usageCount` counts JSX component renders, so for a package consumed as a
 * function it is 0 no matter how much of the repo depends on it, and a
 * `versus` group over two such packages read 0 vs 0 whatever the state of the
 * migration. `importingFileCount` is the axis that has an answer for them,
 * and these fixtures are function-only precisely so that the two axes cannot
 * be confused for one another: every expectation below asserts both.
 */
const VERSIONS = {
  lodash: '4.17.21',
  'es-toolkit': '1.39.10',
  '@design-system/foundation': '2.5.3',
};

const LODASH_FILES = [
  'versus/03-function-only-lodash.ts',
  'versus/04-function-only-lodash-subpath.ts',
  'versus/06-function-only-dynamic.ts',
];
const ES_TOOLKIT_FILES = ['versus/05-function-only-es-toolkit.ts'];

async function aggregateFixtures(paths: string[]) {
  const reports = await Promise.all(
    paths.map(async (path) => parseCode(await readFixture(path), path)),
  );
  return aggregateReports(reports, VERSIONS);
}

/**
 * Reads the **inventory**, which is where the axis lives and what versus
 * selects from. `packageDistribution` is the packages-table view and drops
 * anything `isOwnedByRepo` rejects — with no lockfile resolutions passed
 * here, a function-only package is exactly that, since the clause that would
 * keep an undeclared package in counts renders. The last test below passes
 * resolutions and asserts the distribution carries the axis too.
 */
function inventoryFor(
  result: Awaited<ReturnType<typeof aggregateFixtures>>,
  packageName: string,
) {
  return result.packageInventory.find((p) => p.packageName === packageName);
}

describe('aggregateReports — the imported axis, through the full parse pipeline', () => {
  it('counts the files importing a function-only package, while its render count stays zero', async () => {
    const result = await aggregateFixtures([
      ...LODASH_FILES,
      ...ES_TOOLKIT_FILES,
    ]);

    const lodash = inventoryFor(result, 'lodash');
    expect(lodash?.importingFileCount).toBe(3);
    // The axis this fixture exists to distinguish: nothing here renders.
    expect(lodash?.usageCount).toBe(0);
    expect(lodash?.componentCount).toBe(0);

    const esToolkit = inventoryFor(result, 'es-toolkit');
    expect(esToolkit?.importingFileCount).toBe(1);
    expect(esToolkit?.usageCount).toBe(0);
  });

  it('resolves a subpath import back to its package rather than dropping it', async () => {
    // `import debounce from 'lodash/debounce'` — the package is the first
    // path segment, everything after it is a subpath export.
    const result = await aggregateFixtures([
      'versus/04-function-only-lodash-subpath.ts',
    ]);

    expect(inventoryFor(result, 'lodash')?.importingFileCount).toBe(1);
  });

  it('counts a package reached only through a dynamic import', async () => {
    // A code-split path is still a dependency, so `collectImportedPackages`
    // folds lazy and dynamic sources in beside the static import forms.
    const result = await aggregateFixtures([
      'versus/06-function-only-dynamic.ts',
    ]);

    expect(inventoryFor(result, 'lodash')?.importingFileCount).toBe(1);
  });

  it('counts a file once however many symbols it imports from the same package', async () => {
    // `import { groupBy, uniqBy } from 'lodash'` is one file depending on
    // lodash, not two. Counting bound symbols would make collapsing that
    // import to one helper look like migration progress.
    const result = await aggregateFixtures([
      'versus/03-function-only-lodash.ts',
    ]);

    expect(inventoryFor(result, 'lodash')?.importingFileCount).toBe(1);
  });

  it('does not count relative imports, or specifiers naming no known package', async () => {
    // 05 imports a type from 03 by relative path, and neither file mentions
    // a package outside VERSIONS — so nothing but es-toolkit may appear.
    const result = await aggregateFixtures(ES_TOOLKIT_FILES);

    const counted = result.packageInventory
      .filter((p) => p.importingFileCount > 0)
      .map((p) => p.packageName);
    expect(counted).toEqual(['es-toolkit']);
  });

  it('drives the versus split off the imported axis, so a function-only migration reads its real progress', async () => {
    const reports = await Promise.all(
      [...LODASH_FILES, ...ES_TOOLKIT_FILES].map(async (path) =>
        parseCode(await readFixture(path), path),
      ),
    );
    const config = applyOverrides(
      HermexConfigSchema.parse({
        versus: [
          {
            name: 'Utility Library Migration',
            packages: ['lodash', 'es-toolkit'],
          },
        ],
      }),
      process.cwd(),
    );

    const result = aggregateReports(reports, VERSIONS, config);

    const [group] = result.versusResults;
    expect(group.totalCount).toBe(4);
    expect(group.entries).toEqual([
      {
        packageName: 'lodash',
        count: 3,
        percentage: 75,
        present: true,
      },
      {
        packageName: 'es-toolkit',
        count: 1,
        percentage: 25,
        present: true,
      },
    ]);
  });

  it('carries the axis into packages[] for a package the lockfile records as a root dependency', async () => {
    // The real pipeline's shape: with resolutions present, lodash clears
    // `isOwnedByRepo` and reaches the packages table — where the two axes sit
    // side by side and read 3 and 0 for the same package.
    const reports = await Promise.all(
      LODASH_FILES.map(async (path) =>
        parseCode(await readFixture(path), path),
      ),
    );

    const result = aggregateReports(
      reports,
      VERSIONS,
      undefined,
      {},
      {
        lodash: { rootVersion: '4.17.21', allVersions: ['4.17.21'] },
      },
    );

    const lodash = result.packageDistribution.find(
      (p) => p.packageName === 'lodash',
    );
    expect(lodash?.importingFileCount).toBe(3);
    expect(lodash?.usageCount).toBe(0);
  });

  it('still counts a component package by renders and by files independently', async () => {
    // The pair versus already worked for. Both axes stay populated and they
    // are not the same number — 33 renders across 8 files — which is what
    // makes reading the wrong one a silent error rather than an obvious one.
    const result = await aggregateFixtures([
      'versus/03-function-only-lodash.ts',
      'patterns/01-direct-usage.tsx',
    ]);

    const foundation = inventoryFor(result, '@design-system/foundation');
    expect(foundation?.importingFileCount).toBe(1);
    expect(foundation?.usageCount).toBeGreaterThan(1);
  });
});
