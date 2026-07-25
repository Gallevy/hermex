import { describe, it, expect, vi } from 'vitest';
import { join } from 'node:path';
import { writeFileSync, rmSync } from 'node:fs';
import semver from 'semver';
import lockfileLib from '@yarnpkg/lockfile';
import { PnpmLockfileAdapter } from '../../src/lock-parser/patterns/pnpm';
import { NpmLockfileAdapter } from '../../src/lock-parser/patterns/npm';
import { YarnLockfileAdapter } from '../../src/lock-parser/patterns/yarn';
import { readAndParseLockfile } from '../../src/lock-parser/lock-file-adapter';

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

  it('parseMultiVersion warns and returns empty object on a corrupt lockfile', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const corrupt = join(FIXTURES, 'corrupt-pnpm-lock.yaml');
    writeFileSync(corrupt, ': not valid yaml: [', 'utf8');
    try {
      const multiVersions = adapter.parseMultiVersion(corrupt);
      expect(multiVersions).toEqual({});
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('pnpm-lock.yaml (multi-version)'),
      );
    } finally {
      warnSpy.mockRestore();
      rmSync(corrupt);
    }
  });

  it('falls back to the v6-8 "packages" field when there is no "importers" field', () => {
    const versions = adapter.parse(join(FIXTURES, 'pnpm-lock-v6.yaml'));
    expect(versions['chalk']).toBe('5.3.0');
    expect(versions['lodash']).toBe('4.17.21');
    expect(versions['badkey']).toBeUndefined();
  });

  it('falls back to v5 "dependencies" (string, link:, and object forms) when there is no "importers" or "packages" field', () => {
    const versions = adapter.parse(join(FIXTURES, 'pnpm-lock-v5.yaml'));
    expect(versions['chalk']).toBe('5.3.0');
    expect(versions['vitest']).toBe('1.6.0');
    expect(versions['local-pkg']).toBeUndefined();
  });

  it('parsePackageKey resolves the legacy pnpm v5/v6 slash-separated key format', () => {
    const multiVersions = adapter.parseMultiVersion(
      join(FIXTURES, 'pnpm-lock-legacy.yaml'),
    );
    expect(multiVersions['@babel/core']).toEqual(['7.22.5']);
  });

  it('returns no versions when "importers" is present but has no root "." entry', () => {
    const versions = adapter.parse(
      join(FIXTURES, 'pnpm-lock-no-root-importer.yaml'),
    );
    expect(versions).toEqual({});
  });

  it('parses an importer that has only "dependencies" (no "devDependencies" key)', () => {
    const versions = adapter.parse(join(FIXTURES, 'pnpm-lock-deps-only.yaml'));
    expect(versions['chalk']).toBe('5.3.0');
  });

  it('parses an importer that has only "devDependencies" (no "dependencies" key)', () => {
    const versions = adapter.parse(
      join(FIXTURES, 'pnpm-lock-devdeps-only.yaml'),
    );
    expect(versions['vitest']).toBe('1.6.0');
  });

  it('skips importer dependency/devDependency entries that are not a well-formed {version} object', () => {
    const versions = adapter.parse(
      join(FIXTURES, 'pnpm-lock-malformed-importer.yaml'),
    );
    expect(versions['chalk']).toBe('5.3.0');
    expect(versions['bare-string-dep']).toBeUndefined();
    expect(versions['no-version-dep']).toBeUndefined();
    expect(versions['bare-string-dev-dep']).toBeUndefined();
    expect(versions['no-version-dev-dep']).toBeUndefined();
  });

  it('parsePackageKey skips a key that matches neither the modern nor legacy format', () => {
    const multiVersions = adapter.parseMultiVersion(
      join(FIXTURES, 'pnpm-lock-legacy.yaml'),
    );
    expect(Object.keys(multiVersions)).not.toContain('invalidkey');
    expect(Object.keys(multiVersions)).toEqual(['@babel/core']);
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

  it('detect returns null when no package-lock.json is present', () => {
    const result = adapter.detect(join(FIXTURES, 'does-not-exist'));
    expect(result).toBeNull();
  });

  it('falls back to the v6 "dependencies" field (recursing into nested dependencies) when there is no "packages" field', () => {
    const versions = adapter.parse(join(FIXTURES, 'package-lock-v6.json'));
    expect(versions['chalk']).toBe('5.3.0');
    expect(versions['no-version-pkg']).toBeUndefined();
    expect(versions['parent-pkg']).toBe('1.0.0');
    expect(versions['parent-pkg/nested-pkg']).toBe('2.0.0');
  });

  it('filters out nested node_modules entries and skips packages without a version', () => {
    const versions = adapter.parse(join(FIXTURES, 'package-lock-nested.json'));
    expect(versions['foo']).toBe('1.0.0');
    expect(versions['bar']).toBeUndefined();
    expect(versions['no-version']).toBeUndefined();
  });

  it('canonicalPackageName returns the path unchanged when it contains no "node_modules/" segment (e.g. a workspace path)', () => {
    const versions = adapter.parse(join(FIXTURES, 'package-lock-nested.json'));
    expect(versions['packages/workspace-a']).toBe('1.0.0');
  });

  it('parseMultiVersion skips packages entries without a version', () => {
    const multiVersions = adapter.parseMultiVersion(
      join(FIXTURES, 'package-lock-nested.json'),
    );
    expect(multiVersions['foo']).toEqual(['1.0.0']);
    expect(multiVersions['no-version']).toBeUndefined();
  });

  it('parseMultiVersion collects multiple versions when two different paths canonicalize to the same package name', () => {
    // "node_modules/dupe" (1.0.0) and "node_modules/foo/node_modules/dupe"
    // (2.0.0) both canonicalize to "dupe" — parseMultiVersion (unlike parse)
    // doesn't filter out nested node_modules paths, so both must be tracked.
    const multiVersions = adapter.parseMultiVersion(
      join(FIXTURES, 'package-lock-nested.json'),
    );
    expect(multiVersions['dupe']).toEqual(['1.0.0', '2.0.0']);
  });

  it('parseMultiVersion warns and returns empty object on a corrupt lockfile', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const corrupt = join(FIXTURES, 'corrupt-package-lock.json');
    writeFileSync(corrupt, '{ not valid json', 'utf8');
    try {
      const multiVersions = adapter.parseMultiVersion(corrupt);
      expect(multiVersions).toEqual({});
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('package-lock.json (multi-version)'),
      );
    } finally {
      warnSpy.mockRestore();
      rmSync(corrupt);
    }
  });
});

describe('YarnLockfileAdapter', () => {
  const adapter = new YarnLockfileAdapter();

  it('parses yarn v1 lockfile and returns package versions', () => {
    const versions = adapter.parse(join(FIXTURES, 'yarn.lock'));
    expect(versions['chalk']).toBe('5.3.0');
    expect(versions['vitest']).toBe('1.6.0');
  });

  it('extracts a scoped package name from its key', () => {
    const versions = adapter.parse(join(FIXTURES, 'yarn.lock'));
    expect(versions['@scope/pkg']).toBe('1.0.0');
  });

  it('detect returns the lockfile path when yarn.lock is present', () => {
    const result = adapter.detect(FIXTURES);
    expect(result).toBe(join(FIXTURES, 'yarn.lock'));
  });

  it('detect returns null when no yarn.lock is present', () => {
    const result = adapter.detect(join(FIXTURES, 'does-not-exist'));
    expect(result).toBeNull();
  });

  it('extractPackageName falls back to the raw key when it does not match the expected @-delimited shape', () => {
    // Real yarn.lock keys always have a name@range shape, so these
    // fallback branches exist purely as defensive guards — reachable only
    // by feeding the parser's output shape directly, hence mocking parse().
    const parseSpy = vi.spyOn(lockfileLib, 'parse').mockReturnValue({
      type: 'success',
      object: {
        '@scope-no-slash': { version: '1.0.0' },
        'no-at-sign-key': { version: '2.0.0' },
      },
    });
    try {
      const versions = adapter.parse(join(FIXTURES, 'yarn.lock'));
      expect(versions['@scope-no-slash']).toBe('1.0.0');
      expect(versions['no-at-sign-key']).toBe('2.0.0');
    } finally {
      parseSpy.mockRestore();
    }
  });

  it('parseMultiVersion skips an entry with no version', () => {
    const parseSpy = vi.spyOn(lockfileLib, 'parse').mockReturnValue({
      type: 'success',
      object: {
        'no-version-pkg@^1.0.0': { resolved: 'https://example.com/x.tgz' },
        'chalk@^5.0.0': { version: '5.3.0' },
      },
    });
    try {
      const multiVersions = adapter.parseMultiVersion(
        join(FIXTURES, 'yarn.lock'),
      );
      expect(multiVersions['no-version-pkg']).toBeUndefined();
      expect(multiVersions['chalk']).toEqual(['5.3.0']);
    } finally {
      parseSpy.mockRestore();
    }
  });

  it('parse keeps the first-seen version for a duplicate package name (dedup guard)', () => {
    // yarn.lock fixture has both `lodash@^3.0.0` (3.10.1) and `lodash@^4.0.0`
    // (4.17.21) resolving to the same package name "lodash".
    const versions = adapter.parse(join(FIXTURES, 'yarn.lock'));
    expect(versions['lodash']).toBe('3.10.1');
  });

  it('parse warns and returns empty object when the parser reports a non-success result', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const parseSpy = vi
      .spyOn(lockfileLib, 'parse')
      .mockReturnValue({ type: 'merge', object: {} });
    try {
      const versions = adapter.parse(join(FIXTURES, 'yarn.lock'));
      expect(versions).toEqual({});
      expect(warnSpy).toHaveBeenCalledWith(
        'Warning: Failed to parse yarn.lock',
      );
    } finally {
      parseSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('returns empty object when file does not exist', () => {
    const versions = adapter.parse(join(FIXTURES, 'nonexistent.lock'));
    expect(versions).toEqual({});
  });

  it('parseMultiVersion warns and returns empty object when the parser reports a non-success result', () => {
    // parseMultiVersion's non-success branch throws internally (unlike
    // parse(), which returns {} directly) — readAndParseLockfile catches
    // that throw and converts it into the same warn+fallback behavior.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const parseSpy = vi
      .spyOn(lockfileLib, 'parse')
      .mockReturnValue({ type: 'merge', object: {} });
    try {
      const multiVersions = adapter.parseMultiVersion(
        join(FIXTURES, 'yarn.lock'),
      );
      expect(multiVersions).toEqual({});
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('yarn.lock (multi-version)'),
      );
    } finally {
      parseSpy.mockRestore();
      warnSpy.mockRestore();
    }
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

  it('parseMultiVersion warns and returns empty object on a corrupt lockfile', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const corrupt = join(FIXTURES, 'corrupt-yarn.lock');
    // @yarnpkg/lockfile's parser is lenient about plain text (it doesn't
    // reliably return `type: 'error'`), but an unexpected token throws
    // synchronously and fast — unlike some other malformed inputs, which
    // this parser can take several seconds to reject.
    writeFileSync(corrupt, '{{{ not yaml-ish at all }}}', 'utf8');
    try {
      const multiVersions = adapter.parseMultiVersion(corrupt);
      expect(multiVersions).toEqual({});
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('yarn.lock (multi-version)'),
      );
    } finally {
      warnSpy.mockRestore();
      rmSync(corrupt);
    }
  });
});

describe('readAndParseLockfile', () => {
  it('stringifies a thrown non-Error value in the warning message', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = readAndParseLockfile(
        join(FIXTURES, 'yarn.lock'),
        () => {
          // eslint-disable-next-line no-throw-literal
          throw 'plain string failure';
        },
        {},
        'test-label',
      );
      expect(result).toEqual({});
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('plain string failure'),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});
