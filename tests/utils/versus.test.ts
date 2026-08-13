import { describe, expect, it } from 'vitest';
import { calculateVersusResults } from '../../src/utils/versus';
import type { VersusConfig } from '../../src/config/types';
import { createMockPackage } from '../helpers/mock-reports';

describe('calculateVersusResults', () => {
  it('sorts entries by count descending and computes percentages of the versus total', () => {
    const moment = createMockPackage('moment', { usageCount: 30 });
    const dayjs = createMockPackage('dayjs', { usageCount: 10 });
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

  it('gives a configured package absent from the distribution a zero count', () => {
    const moment = createMockPackage('moment', { usageCount: 5 });
    const versusConfigs: VersusConfig[] = [
      { name: 'Date libraries', packages: ['moment', 'dayjs'] },
    ];

    const [result] = calculateVersusResults([moment], versusConfigs);

    const dayjsEntry = result.entries.find((e) => e.packageName === 'dayjs');
    expect(dayjsEntry?.count).toBe(0);
    expect(dayjsEntry?.percentage).toBe(0);
  });

  it('returns an empty array when there is no versus config', () => {
    const moment = createMockPackage('moment', { usageCount: 5 });

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
    }
  });
});
