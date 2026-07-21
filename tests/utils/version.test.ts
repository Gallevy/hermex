import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getVersion } from '../../src/utils/version';

describe('getVersion', () => {
  it('returns the version from the repo package.json', () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { version: string };

    expect(getVersion()).toBe(pkg.version);
  });

  it('returns the same cached value on repeated calls', () => {
    expect(getVersion()).toBe(getVersion());
  });
});
