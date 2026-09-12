// A function-only consumer: no JSX, no component, nothing for `usageCount`
// to count. Before #174 a file like this was invisible to Versus, so the
// lodash → es-toolkit group below read 0 vs 0 however far the migration had
// got — a migration 80% done rendered identically to one never started.
import { groupBy, uniqBy } from 'lodash';

export interface Row {
  id: string;
  team: string;
}

export function byTeam(rows: Row[]): Record<string, Row[]> {
  return groupBy(uniqBy(rows, 'id'), 'team');
}
