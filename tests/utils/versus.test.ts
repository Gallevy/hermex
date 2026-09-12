import { describe, expect, it } from 'vitest';
import { calculateVersusResults } from '../../src/utils/versus';
import type { VersusConfig } from '../../src/config/types';
import { createMockInventoryEntry } from '../helpers/mock-reports';

describe('calculateVersusResults', () => {
  it('sorts entries by count descending and computes percentages of the versus total', () => {
    const moment = createMockInventoryEntry('moment', {
      importingFileCount: 30,
    });
    const dayjs = createMockInventoryEntry('dayjs', { importingFileCount: 10 });
    const versusConfigs: VersusConfig[] = [
      { name: 'Date libraries', packages: ['dayjs', 'moment'] },
    ];

    const [result] = calculateVersusResults([moment, dayjs], versusConfigs);

    expect(result.totalCount).toBe(40);
    expect(result.entries.map((e) => e.packageName)).toEqual([
      'moment',
      'dayjs',
    ]);
    expect(result.entries[0].count).toBe(30);
    expect(result.entries[0].percentage).toBeCloseTo(75);
    expect(result.entries[1].count).toBe(10);
    expect(result.entries[1].percentage).toBeCloseTo(25);
  });

  // The bug #174 reports: every migration versus is actually used for is
  // function-only, and on the JSX axis both sides of one read 0 — a migration
  // 80% done was indistinguishable from one never started.
  it('scores a function-only pair from imports, not renders, so a migration in progress is visible', () => {
    const moment = createMockInventoryEntry('moment', {
      usageCount: 0,
      componentCount: 0,
      importingFileCount: 2,
    });
    const dateFns = createMockInventoryEntry('date-fns', {
      usageCount: 0,
      componentCount: 0,
      importingFileCount: 8,
    });
    const versusConfigs: VersusConfig[] = [
      { name: 'Date libraries', packages: ['moment', 'date-fns'] },
    ];

    const [result] = calculateVersusResults([moment, dateFns], versusConfigs);

    expect(result.totalCount).toBe(10);
    expect(result.entries[0]).toMatchObject({
      packageName: 'date-fns',
      count: 8,
    });
    expect(result.entries[0].percentage).toBeCloseTo(80);
    expect(result.entries[1].percentage).toBeCloseTo(20);
  });

  // Renders and imports diverge for any package used more than once per file,
  // which is most of them. This pins which of the two the entry reads.
  it('ignores usageCount entirely, even for a package that renders far more than it imports', () => {
    const chakra = createMockInventoryEntry('@chakra-ui/react', {
      usageCount: 90,
      importingFileCount: 1,
    });
    const mui = createMockInventoryEntry('@mui/material', {
      usageCount: 2,
      importingFileCount: 3,
    });

    const [result] = calculateVersusResults(
      [chakra, mui],
      [{ name: 'UI', packages: ['@chakra-ui/react', '@mui/material'] }],
    );

    expect(result.totalCount).toBe(4);
    expect(result.entries[0]).toMatchObject({
      packageName: '@mui/material',
      count: 3,
    });
  });

  it('gives a configured package absent from the distribution a zero count', () => {
    const moment = createMockInventoryEntry('moment', {
      importingFileCount: 5,
    });
    const versusConfigs: VersusConfig[] = [
      { name: 'Date libraries', packages: ['moment', 'dayjs'] },
    ];

    const [result] = calculateVersusResults([moment], versusConfigs);

    const dayjsEntry = result.entries.find((e) => e.packageName === 'dayjs');
    expect(dayjsEntry?.count).toBe(0);
    expect(dayjsEntry?.percentage).toBe(0);
  });

  // The second half of #174: `count: 0` alone cannot tell "a dependency
  // nobody has imported yet" from "not in this repo at all" (misspelled,
  // `packages.ignore`d, or purely transitive), and the two call for opposite
  // reactions from the reader.
  it('marks a package missing from the distribution as absent, and a present-but-unimported one as present', () => {
    const moment = createMockInventoryEntry('moment', {
      importingFileCount: 5,
    });
    const dayjs = createMockInventoryEntry('dayjs', {
      usageCount: 0,
      componentCount: 0,
      importingFileCount: 0,
    });

    const [result] = calculateVersusResults(
      [moment, dayjs],
      [{ name: 'Date libraries', packages: ['moment', 'dayjs', 'dat-fns'] }],
    );

    const byName = new Map(result.entries.map((e) => [e.packageName, e]));
    expect(byName.get('moment')).toMatchObject({ count: 5, present: true });
    // Installed and declared, simply not imported yet — a migration at 0%.
    expect(byName.get('dayjs')).toMatchObject({ count: 0, present: true });
    // Not a dependency at all; the 0 here means nothing about any migration.
    expect(byName.get('dat-fns')).toMatchObject({ count: 0, present: false });
  });

  // `packageDistribution` drops purely transitive packages, and the clause
  // that would otherwise keep an undeclared one in (`isUsed`) counts renders.
  // So a package imported as a function without being declared is missing
  // from that view while the repo demonstrably imports it — reading the
  // inventory instead is what stops versus reporting "not here" about
  // something it just counted three imports of.
  it('counts a package the repo imports as a function but never declares', () => {
    const phantom = createMockInventoryEntry('lodash', {
      declaredIn: [],
      rootVersion: null,
      usageCount: 0,
      componentCount: 0,
      importingFileCount: 3,
    });
    const esToolkit = createMockInventoryEntry('es-toolkit', {
      usageCount: 0,
      componentCount: 0,
      importingFileCount: 1,
    });

    const [result] = calculateVersusResults(
      [phantom, esToolkit],
      [{ name: 'Utilities', packages: ['lodash', 'es-toolkit'] }],
    );

    const lodash = result.entries.find((e) => e.packageName === 'lodash');
    expect(lodash).toMatchObject({ count: 3, present: true });
    expect(lodash?.percentage).toBeCloseTo(75);
  });

  // The one filter versus shares with the packages table: `packages.ignore`
  // takes a package out of the reported surface deliberately, so it must not
  // rejoin it through this section.
  it('treats a package under packages.ignore as absent rather than counting it', () => {
    const ignored = createMockInventoryEntry('lodash', {
      ignored: true,
      importingFileCount: 9,
    });
    const esToolkit = createMockInventoryEntry('es-toolkit', {
      importingFileCount: 1,
    });

    const [result] = calculateVersusResults(
      [ignored, esToolkit],
      [{ name: 'Utilities', packages: ['lodash', 'es-toolkit'] }],
    );

    expect(result.totalCount).toBe(1);
    expect(
      result.entries.find((e) => e.packageName === 'lodash'),
    ).toMatchObject({ count: 0, present: false });
  });

  it('returns an empty array when there is no versus config', () => {
    const moment = createMockInventoryEntry('moment', {
      importingFileCount: 5,
    });

    expect(calculateVersusResults([moment], [])).toEqual([]);
  });

  it('leaves all percentages at zero when total usage is zero', () => {
    const versusConfigs: VersusConfig[] = [
      { name: 'Date libraries', packages: ['moment', 'dayjs'] },
    ];

    const [result] = calculateVersusResults([], versusConfigs);

    expect(result.totalCount).toBe(0);
    for (const entry of result.entries) {
      expect(entry.percentage).toBe(0);
      expect(entry.count).toBe(0);
      expect(entry.present).toBe(false);
    }
  });
});
