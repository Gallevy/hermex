import type { VersusConfig } from '../config/types';
import type { PackageDistribution } from './package-distribution';

function toPercentage(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

export interface VersusEntry {
  packageName: string;
  count: number;
  percentage: number;
}

export interface VersusResult {
  name: string;
  packages: string[];
  entries: VersusEntry[];
  totalCount: number;
}

export function calculateVersusResults(
  distribution: PackageDistribution[],
  versusConfigs: VersusConfig[],
): VersusResult[] {
  const distMap = new Map(distribution.map((p) => [p.packageName, p]));

  return versusConfigs.map((vc) => {
    const entries: VersusEntry[] = vc.packages.map((pkgName) => {
      const pkg = distMap.get(pkgName);
      return {
        packageName: pkgName,
        count: pkg?.usageCount ?? 0,
        percentage: 0,
      };
    });

    const totalCount = entries.reduce((sum, e) => sum + e.count, 0);

    for (const entry of entries) {
      entry.percentage = toPercentage(entry.count, totalCount);
    }

    entries.sort((a, b) => b.count - a.count);

    return { name: vc.name, packages: vc.packages, entries, totalCount };
  });
}
