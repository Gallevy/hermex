import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function readFixture(fixtureName: string) {
  const path = join(__dirname, '../..', 'fixtures', fixtureName);

  return readFileSync(path, 'utf8');
}
