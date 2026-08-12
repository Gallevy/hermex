import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { collectDeclaredPackages } from '../../src/rules/shared';

let tempDir: string;

/** Writes a package.json into a fresh temp dir and returns that dir. */
function withManifest(content: string): string {
  const dir = mkdtempSync(join(tempDir, 'repo-'));
  writeFileSync(join(dir, 'package.json'), content);
  return dir;
}

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'hermex-declared-test-'));
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('collectDeclaredPackages', () => {
  it('collects names from all four dependency buckets', () => {
    const dir = withManifest(
      JSON.stringify({
        dependencies: { react: '^18.0.0' },
        devDependencies: { vitest: '^4.0.0' },
        peerDependencies: { 'react-dom': '^18.0.0' },
        optionalDependencies: { fsevents: '^2.3.0' },
      }),
    );

    expect(collectDeclaredPackages(dir).sort()).toEqual([
      'fsevents',
      'react',
      'react-dom',
      'vitest',
    ]);
  });

  it('reports a package listed in two buckets exactly once', () => {
    const dir = withManifest(
      JSON.stringify({
        peerDependencies: { react: '^18.0.0' },
        devDependencies: { react: '^18.0.0' },
      }),
    );

    expect(collectDeclaredPackages(dir)).toEqual(['react']);
  });

  it('returns an empty array when the manifest declares no dependencies', () => {
    const dir = withManifest(JSON.stringify({ name: 'test-project' }));

    expect(collectDeclaredPackages(dir)).toEqual([]);
  });

  it('returns an empty array when package.json is missing', () => {
    const dir = mkdtempSync(join(tempDir, 'empty-'));

    expect(collectDeclaredPackages(dir)).toEqual([]);
  });

  it('returns an empty array when package.json is not valid JSON', () => {
    const dir = withManifest('{ not json');

    expect(collectDeclaredPackages(dir)).toEqual([]);
  });

  it('skips a malformed bucket without dropping the well-formed ones', () => {
    const dir = withManifest(
      JSON.stringify({
        dependencies: 'oops',
        peerDependencies: ['react'],
        devDependencies: { vitest: '^4.0.0' },
      }),
    );

    expect(collectDeclaredPackages(dir)).toEqual(['vitest']);
  });
});
