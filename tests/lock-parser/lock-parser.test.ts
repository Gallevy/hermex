import { describe, it, expect, vi } from 'vitest';
import { join } from 'node:path';
import semver from 'semver';
import { PnpmLockfileAdapter } from '../../src/lock-parser/patterns/pnpm';
import { NpmLockfileAdapter } from '../../src/lock-parser/patterns/npm';
import { YarnLockfileAdapter } from '../../src/lock-parser/patterns/yarn';

// @yarnpkg/lockfile is a CJS bundle that sets `__esModule: true` and exports a
// `default` that is NOT the module namespace (it's the Lockfile class). In
// production, Node's native ESM-CJS interop maps the default import to
// `module.exports`, so `lockfile.parse` works. Vitest's SSR interop instead
// resolves the default import to `exports.default`, which breaks the shape.
// Re-expose the REAL library functions under `default` to match Node runtime
// behavior — this is an interop shim, not a behavioral mock.
vi.mock('@yarnpkg/lockfile', async (importOriginal) => {
  const mod = await importOriginal<{ parse: unknown; stringify: unknown }>();
  return { default: { parse: mod.parse, stringify: mod.stringify } };
});

const FIXTURES = join(__dirname, 'fixtures');

describe('PnpmLockfileAdapter', () => {
  const adapter = new PnpmLockfileAdapter();

  it('parses pnpm v9 lockfile and returns dependency and devDependency versions', () => {
    const versions = adapter.parse(join(FIXTURES, 'pnpm-lock.yaml'));
    expect(versions['chalk']).toBe('5.3.0');
    expect(versions['vitest']).toBe('1.6.0');
  });

  it('strips the pnpm peer-dependency suffix from a dependency version (#25)', () => {
    const versions = adapter.parse(join(FIXTURES, 'pnpm-lock.yaml'));
    expect(versions['react-redux']).toBe('8.0.5');
    // Must be usable by `semver` downstream (the enricher passes this
    // straight into semver.lte/semver.diff) — never the raw peer-suffixed
    // string that crashed release-age enrichment in #25.
    expect(semver.valid(versions['react-redux'])).toBeTruthy();
  });

  it('returns empty object when file does not exist', () => {
    const versions = adapter.parse(join(FIXTURES, 'nonexistent.yaml'));
    expect(versions).toEqual({});
  });

  it('detect returns the lockfile path when pnpm-lock.yaml is present', () => {
    const result = adapter.detect(FIXTURES);
    expect(result).toBe(join(FIXTURES, 'pnpm-lock.yaml'));
  });

  it('detect returns null when no pnpm-lock.yaml is present', () => {
    const result = adapter.detect(join(FIXTURES, 'does-not-exist'));
    expect(result).toBeNull();
  });

  it('parseMultiVersion collects all distinct versions per package', () => {
    const multiVersions = adapter.parseMultiVersion(
      join(FIXTURES, 'pnpm-lock.yaml'),
    );
    expect(multiVersions['lodash']).toEqual(['3.10.1', '4.17.21']);
    expect(multiVersions['chalk']).toEqual(['5.3.0']);
    expect(multiVersions['vitest']).toEqual(['1.6.0']);
    expect(multiVersions['@scope/pkg']).toEqual(['1.0.0']);
  });

  it('parseMultiVersion returns empty object when file does not exist', () => {
    const multiVersions = adapter.parseMultiVersion(
      join(FIXTURES, 'nonexistent.yaml'),
    );
    expect(multiVersions).toEqual({});
  });
});

describe('NpmLockfileAdapter', () => {
  const adapter = new NpmLockfileAdapter();

  it('parses npm v3 lockfile and returns package versions', () => {
    const versions = adapter.parse(join(FIXTURES, 'package-lock.json'));
    expect(versions['chalk']).toBe('5.3.0');
    expect(versions['vitest']).toBe('1.6.0');
  });

  it('returns empty object when file does not exist', () => {
    const versions = adapter.parse(join(FIXTURES, 'nonexistent.json'));
    expect(versions).toEqual({});
  });

  it('detect returns the lockfile path when package-lock.json is present', () => {
    const result = adapter.detect(FIXTURES);
    expect(result).toBe(join(FIXTURES, 'package-lock.json'));
  });
});

describe('YarnLockfileAdapter', () => {
  const adapter = new YarnLockfileAdapter();

  it('parses yarn v1 lockfile and returns package versions', () => {
    const versions = adapter.parse(join(FIXTURES, 'yarn.lock'));
    expect(versions['chalk']).toBe('5.3.0');
    expect(versions['vitest']).toBe('1.6.0');
  });

  it('returns empty object when file does not exist', () => {
    const versions = adapter.parse(join(FIXTURES, 'nonexistent.lock'));
    expect(versions).toEqual({});
  });

  it('parseMultiVersion collects all distinct versions per package', () => {
    const multiVersions = adapter.parseMultiVersion(
      join(FIXTURES, 'yarn.lock'),
    );
    expect(multiVersions['lodash']).toEqual(['3.10.1', '4.17.21']);
    expect(multiVersions['chalk']).toEqual(['5.3.0']);
    expect(multiVersions['vitest']).toEqual(['1.6.0']);
  });

  it('parseMultiVersion returns empty object when file does not exist', () => {
    const multiVersions = adapter.parseMultiVersion(
      join(FIXTURES, 'nonexistent.lock'),
    );
    expect(multiVersions).toEqual({});
  });
});
