import { describe, it, expect } from 'vitest';
import { isAbsolute } from 'node:path';
import { findFiles, readFile } from '../../src/utils/file-utils';

describe('findFiles', () => {
  it('returns paths relative to process.cwd(), not absolute', async () => {
    const files = await findFiles('fixtures/patterns/*.tsx', []);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(isAbsolute(file)).toBe(false);
    }
    expect(files).toContain('fixtures/patterns/01-direct-usage.tsx');
  });

  it('resolved relative paths can still be read from disk', async () => {
    const files = await findFiles('fixtures/patterns/01-direct-usage.tsx', []);
    expect(files).toHaveLength(1);
    const content = readFile(files[0]);
    expect(content).toContain('DirectUsageExample');
  });
});
