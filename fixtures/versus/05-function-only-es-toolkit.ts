// The migrated half of the same group: the file 03 would become. Counting
// files rather than bound symbols is what keeps the two sides comparable —
// this file pulls in two helpers and 03 pulls in two, and either could be
// refactored to one without that looking like migration progress.
import { groupBy, uniqBy } from 'es-toolkit';

import type { Row } from './03-function-only-lodash';

export function byTeamMigrated(rows: Row[]): Record<string, Row[]> {
  return groupBy(uniqBy(rows, (row) => row.id), (row) => row.team);
}
