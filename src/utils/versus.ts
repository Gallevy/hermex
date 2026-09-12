import type { VersusConfig } from '../config/types';
import type { PackageInventoryEntry } from './package-inventory';

function toPercentage(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

export interface VersusEntry {
  packageName: string;
  /**
   * How many scanned files import this package — `importingFileCount`, not
   * `usageCount`.
   *
   * Until #174 this read `usageCount`, which counts JSX component renders.
   * Every migration versus is actually used for is function-only — `moment` →
   * `date-fns`, `lodash` → `es-toolkit`, `redux` → `zustand` — and on that
   * axis both sides read 0, so a migration 80% finished rendered identically
   * to one never started. Component-library pairs were the only ones that
   * worked, which is exactly what the fixtures covered.
   *
   * Files also make the two sides commensurable, which renders alone never
   * were: one unit for every group, rather than a number that silently means
   * something different depending on how each package happens to be consumed.
   */
  count: number;
  percentage: number;
  /**
   * Whether hermex found this package in the repo at all — on any axis.
   *
   * `count: 0` conflates two answers that call for opposite reactions: a
   * package that is really here and nobody has imported yet (a migration at
   * 0%), and a package that is not here at all — misspelled in the config, or
   * excluded by `packages.ignore`. The lookup is an exact-name match, so both
   * land on 0 and the bar reports a confident number that means nothing
   * (#174). This separates them.
   */
  present: boolean;
}

export interface VersusResult {
  name: string;
  packages: string[];
  entries: VersusEntry[];
  totalCount: number;
}

/**
 * Each configured group's split across the packages it names.
 *
 * Reads the **inventory** rather than `packageDistribution`, which is the
 * packages-table view. Two reasons, and the second is a correctness one:
 *
 * - The inventory is the single list every consumer selects an axis from, and
 *   versus selects the imported one. Routing versus through the table's view
 *   is how it inherited that view's JSX-only axis to begin with (#174).
 * - `packageDistribution` drops purely transitive packages (`isOwnedByRepo`),
 *   and `isUsed` — the clause that keeps an undeclared package in — counts
 *   renders. So a package imported as a *function* without being declared is
 *   absent from the distribution while the repo demonstrably imports it, and
 *   versus would have reported the one thing it must never report: "not here"
 *   about something it just counted imports of.
 *
 * `packages.ignore` is the one filter versus does share with the table: an
 * ignored package is deliberately out of the reported surface, so it reads as
 * absent rather than silently rejoining it through this section.
 */
export function calculateVersusResults(
  inventory: PackageInventoryEntry[],
  versusConfigs: VersusConfig[],
): VersusResult[] {
  const known = new Map(
    inventory.filter((p) => !p.ignored).map((p) => [p.packageName, p]),
  );

  return versusConfigs.map((vc) => {
    const entries: VersusEntry[] = vc.packages.map((pkgName) => {
      const pkg = known.get(pkgName);
      return {
        packageName: pkgName,
        count: pkg?.importingFileCount ?? 0,
        percentage: 0,
        present: pkg !== undefined,
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
