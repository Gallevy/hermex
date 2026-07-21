import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function readFixture(fixtureName: string): Promise<string> {
  const fixturePath = join(__dirname, '../..', 'fixtures', fixtureName);

  try {
    return readFileSync(fixturePath, 'utf8');
  } catch {
    throw new Error(
      `Fixture not found: "${fixtureName}" — expected at ${fixturePath}`,
    );
  }
}
