import { describe, it, expect, vi } from 'vitest';
import { join } from 'node:path';
import { writeFileSync, rmSync } from 'node:fs';
import semver from 'semver';
import lockfileLib from '@yarnpkg/lockfile';
import { PnpmLockfileAdapter } from '../../src/lock-parser/patterns/pnpm';
import { NpmLockfileAdapter } from '../../src/lock-parser/patterns/npm';
import { YarnLockfileAdapter } from '../../src/lock-parser/patterns/yarn';
import { readAndParseLockfile } from '../../src/lock-parser/lock-file-adapter';
import {
  findAndParseLockfile,
  getPackageVersion,
  getPackageVersions,
} from '../../src/lock-parser';

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

  it('parses pnpm v9 lockfile and returns dependency and devDependency root versions', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'pnpm-lock.yaml'),
      FIXTURES,
    );
    expect(resolutions['chalk'].rootVersion).toBe('5.3.0');
    expect(resolutions['vitest'].rootVersion).toBe('1.6.0');
  });

  it('strips the pnpm peer-dependency suffix from a dependency version (#25)', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'pnpm-lock.yaml'),
      FIXTURES,
    );
    expect(resolutions['react-redux'].rootVersion).toBe('8.0.5');
    // Must be usable by `semver` downstream (the enricher passes this
    // straight into semver.lte/semver.diff) — never the raw peer-suffixed
    // string that crashed release-age enrichment in #25.
    expect(semver.valid(resolutions['react-redux'].rootVersion!)).toBeTruthy();
  });

  it('returns empty object when file does not exist', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'nonexistent.yaml'),
      FIXTURES,
    );
    expect(resolutions).toEqual({});
  });

  it('detect returns the lockfile path when pnpm-lock.yaml is present', () => {
    const result = adapter.detect(FIXTURES);
    expect(result).toBe(join(FIXTURES, 'pnpm-lock.yaml'));
  });

  it('detect returns null when no pnpm-lock.yaml is present', () => {
    const result = adapter.detect(join(FIXTURES, 'does-not-exist'));
    expect(result).toBeNull();
  });

  it('collects all distinct versions per package into allVersions', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'pnpm-lock.yaml'),
      FIXTURES,
    );
    expect(resolutions['lodash'].allVersions).toEqual(['3.10.1', '4.17.21']);
    expect(resolutions['chalk'].allVersions).toEqual(['5.3.0']);
    expect(resolutions['vitest'].allVersions).toEqual(['1.6.0']);
    expect(resolutions['@scope/pkg'].allVersions).toEqual(['1.0.0']);
  });

  it('warns and returns empty object on a corrupt lockfile', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const corrupt = join(FIXTURES, 'corrupt-pnpm-lock.yaml');
    writeFileSync(corrupt, ': not valid yaml: [', 'utf8');
    try {
      const resolutions = adapter.resolve(corrupt, FIXTURES);
      expect(resolutions).toEqual({});
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('pnpm-lock.yaml'),
      );
    } finally {
      warnSpy.mockRestore();
      rmSync(corrupt);
    }
  });

  it('falls back to the v6-8 "packages" field for root resolution when there is no "importers" field', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'pnpm-lock-v6.yaml'),
      FIXTURES,
    );
    expect(resolutions['chalk'].rootVersion).toBe('5.3.0');
    expect(resolutions['lodash'].rootVersion).toBe('4.17.21');
    expect(resolutions['badkey']).toBeUndefined();
  });

  it('falls back to v5 "dependencies" (string, link:, and object forms) when there is no "importers" or "packages" field', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'pnpm-lock-v5.yaml'),
      FIXTURES,
    );
    expect(resolutions['chalk'].rootVersion).toBe('5.3.0');
    expect(resolutions['vitest'].rootVersion).toBe('1.6.0');
    expect(resolutions['local-pkg']).toBeUndefined();
  });

  it('parsePackageKey resolves the legacy pnpm v5/v6 slash-separated key format into allVersions', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'pnpm-lock-legacy.yaml'),
      FIXTURES,
    );
    expect(resolutions['@babel/core'].allVersions).toEqual(['7.22.5']);
  });

  it('returns no resolutions when "importers" is present but has no root "." entry, and no "packages"/"dependencies" fallback exists', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'pnpm-lock-no-root-importer.yaml'),
      FIXTURES,
    );
    expect(resolutions).toEqual({});
  });

  it('parses an importer that has only "dependencies" (no "devDependencies" key)', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'pnpm-lock-deps-only.yaml'),
      FIXTURES,
    );
    expect(resolutions['chalk'].rootVersion).toBe('5.3.0');
  });

  it('parses an importer that has only "devDependencies" (no "dependencies" key)', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'pnpm-lock-devdeps-only.yaml'),
      FIXTURES,
    );
    expect(resolutions['vitest'].rootVersion).toBe('1.6.0');
  });

  it('skips importer dependency/devDependency entries that are not a well-formed {version} object', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'pnpm-lock-malformed-importer.yaml'),
      FIXTURES,
    );
    expect(resolutions['chalk'].rootVersion).toBe('5.3.0');
    expect(resolutions['bare-string-dep']).toBeUndefined();
    expect(resolutions['no-version-dep']).toBeUndefined();
    expect(resolutions['bare-string-dev-dep']).toBeUndefined();
    expect(resolutions['no-version-dev-dep']).toBeUndefined();
  });

  it('parsePackageKey skips a key that matches neither the modern nor legacy format', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'pnpm-lock-legacy.yaml'),
      FIXTURES,
    );
    expect(Object.keys(resolutions)).not.toContain('invalidkey');
    expect(Object.keys(resolutions)).toEqual(['@babel/core']);
  });
});

describe('NpmLockfileAdapter', () => {
  const adapter = new NpmLockfileAdapter();

  it('parses npm v3 lockfile and returns root package versions', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'package-lock.json'),
      FIXTURES,
    );
    expect(resolutions['chalk'].rootVersion).toBe('5.3.0');
    expect(resolutions['vitest'].rootVersion).toBe('1.6.0');
  });

  it('returns empty object when file does not exist', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'nonexistent.json'),
      FIXTURES,
    );
    expect(resolutions).toEqual({});
  });

  it('detect returns the lockfile path when package-lock.json is present', () => {
    const result = adapter.detect(FIXTURES);
    expect(result).toBe(join(FIXTURES, 'package-lock.json'));
  });

  it('detect returns null when no package-lock.json is present', () => {
    const result = adapter.detect(join(FIXTURES, 'does-not-exist'));
    expect(result).toBeNull();
  });

  it('falls back to the v6 "dependencies" field (recursing into nested dependencies) when there is no "packages" field, keyed by real package name', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'package-lock-v6.json'),
      FIXTURES,
    );
    expect(resolutions['chalk'].rootVersion).toBe('5.3.0');
    expect(resolutions['no-version-pkg']).toBeUndefined();
    expect(resolutions['parent-pkg'].rootVersion).toBe('1.0.0');
    // Nested copies are keyed by their real package name (not a
    // depth-prefixed compound key like the old "parent-pkg/nested-pkg") so
    // duplicate copies of the same package always share one allVersions
    // entry — a latent bug fixed while unifying resolution (#57).
    expect(resolutions['nested-pkg'].rootVersion).toBeNull();
    expect(resolutions['nested-pkg'].allVersions).toEqual(['2.0.0']);
    expect(resolutions['parent-pkg/nested-pkg']).toBeUndefined();
  });

  it('treats only manifest-declared packages as direct, not everything npm hoisted to the top level', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'package-lock-hoisted.json'),
      FIXTURES,
    );

    // Declared across all four dependency buckets — every one is direct.
    expect(resolutions['react'].rootVersion).toBe('18.3.1');
    expect(resolutions['vitest'].rootVersion).toBe('1.6.0');
    expect(resolutions['fsevents'].rootVersion).toBe('2.3.3');
    expect(resolutions['typescript'].rootVersion).toBe('5.9.2');

    // Hoisted to node_modules/<name> — the same depth as a direct
    // dependency — but declared by nobody. Reading depth as "direct" made
    // the repo look like it owned packages it never asked for, so
    // no-packages could demand the removal of something only a
    // transitive parent pulls in.
    expect(resolutions['loose-envify'].rootVersion).toBeNull();
    expect(resolutions['loose-envify'].allVersions).toEqual(['1.4.0']);
    expect(resolutions['js-tokens'].rootVersion).toBeNull();

    // Genuinely nested copies are unaffected.
    expect(resolutions['chai'].rootVersion).toBeNull();
  });

  it('falls back to depth when the lockfile records no root manifest dependencies', () => {
    // package-lock-nested.json has a `packages[""]` entry carrying only a
    // name, so there is no declared set to filter by and depth is the only
    // signal available.
    const resolutions = adapter.resolve(
      join(FIXTURES, 'package-lock-nested.json'),
      FIXTURES,
    );
    expect(resolutions['foo'].rootVersion).toBe('1.0.0');
  });

  it('filters out nested node_modules entries from rootVersion and skips packages without a version', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'package-lock-nested.json'),
      FIXTURES,
    );
    expect(resolutions['foo'].rootVersion).toBe('1.0.0');
    expect(resolutions['bar'].rootVersion).toBeNull();
    expect(resolutions['no-version']).toBeUndefined();
  });

  it('canonicalPackageName returns the path unchanged when it contains no "node_modules/" segment (e.g. a workspace path)', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'package-lock-nested.json'),
      FIXTURES,
    );
    expect(resolutions['packages/workspace-a'].rootVersion).toBe('1.0.0');
  });

  it('allVersions skips packages entries without a version', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'package-lock-nested.json'),
      FIXTURES,
    );
    expect(resolutions['foo'].allVersions).toEqual(['1.0.0']);
    expect(resolutions['no-version']).toBeUndefined();
  });

  it('collects multiple versions when two different paths canonicalize to the same package name', () => {
    // "node_modules/dupe" (1.0.0) and "node_modules/foo/node_modules/dupe"
    // (2.0.0) both canonicalize to "dupe" — allVersions (unlike rootVersion)
    // doesn't filter out nested node_modules paths, so both must be tracked.
    const resolutions = adapter.resolve(
      join(FIXTURES, 'package-lock-nested.json'),
      FIXTURES,
    );
    expect(resolutions['dupe'].allVersions).toEqual(['1.0.0', '2.0.0']);
    expect(resolutions['dupe'].rootVersion).toBe('1.0.0');
  });

  it('warns and returns empty object on a corrupt lockfile', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const corrupt = join(FIXTURES, 'corrupt-package-lock.json');
    writeFileSync(corrupt, '{ not valid json', 'utf8');
    try {
      const resolutions = adapter.resolve(corrupt, FIXTURES);
      expect(resolutions).toEqual({});
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('package-lock.json'),
      );
    } finally {
      warnSpy.mockRestore();
      rmSync(corrupt);
    }
  });
});

describe('YarnLockfileAdapter', () => {
  const adapter = new YarnLockfileAdapter();

  it('parses yarn v1 lockfile and collects all resolved versions', () => {
    const resolutions = adapter.resolve(join(FIXTURES, 'yarn.lock'), FIXTURES);
    expect(resolutions['chalk'].allVersions).toEqual(['5.3.0']);
    expect(resolutions['vitest'].allVersions).toEqual(['1.6.0']);
  });

  it('extracts a scoped package name from its key', () => {
    const resolutions = adapter.resolve(join(FIXTURES, 'yarn.lock'), FIXTURES);
    expect(resolutions['@scope/pkg'].allVersions).toEqual(['1.0.0']);
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
      const resolutions = adapter.resolve(
        join(FIXTURES, 'yarn.lock'),
        FIXTURES,
      );
      expect(resolutions['@scope-no-slash'].allVersions).toEqual(['1.0.0']);
      expect(resolutions['no-at-sign-key'].allVersions).toEqual(['2.0.0']);
    } finally {
      parseSpy.mockRestore();
    }
  });

  it('skips an entry with no version', () => {
    const parseSpy = vi.spyOn(lockfileLib, 'parse').mockReturnValue({
      type: 'success',
      object: {
        'no-version-pkg@^1.0.0': { resolved: 'https://example.com/x.tgz' },
        'chalk@^5.0.0': { version: '5.3.0' },
      },
    });
    try {
      const resolutions = adapter.resolve(
        join(FIXTURES, 'yarn.lock'),
        FIXTURES,
      );
      expect(resolutions['no-version-pkg']).toBeUndefined();
      expect(resolutions['chalk'].allVersions).toEqual(['5.3.0']);
    } finally {
      parseSpy.mockRestore();
    }
  });

  // Root-resolution (#57): yarn.lock retains no root/nested distinction on
  // its own, so root version is found by matching the root package.json's
  // declared range string exactly against the lockfile's parsed keys.
  it('resolves the root version by matching the root package.json range against the lockfile key', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'yarn.lock'),
      join(FIXTURES, 'yarn-with-pkgjson'),
    );
    // yarn-with-pkgjson/package.json declares lodash@^4.0.0, matching the
    // `lodash@^4.0.0` lockfile key (4.17.21) — NOT the older `lodash@^3.0.0`
    // entry (3.10.1), even though that one appears first in the lockfile.
    expect(resolutions['lodash'].rootVersion).toBe('4.17.21');
    expect(resolutions['lodash'].allVersions).toEqual(['3.10.1', '4.17.21']);
  });

  it('leaves rootVersion null for a package that is not a direct dependency in package.json (purely transitive)', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'yarn.lock'),
      join(FIXTURES, 'yarn-with-pkgjson'),
    );
    // yarn-with-pkgjson/package.json only declares "lodash" — chalk isn't a
    // direct dependency there, so root can't be determined from it.
    expect(resolutions['chalk'].rootVersion).toBeNull();
    expect(resolutions['chalk'].allVersions).toEqual(['5.3.0']);
  });

  it('leaves rootVersion null for every package when the root package.json is missing or unreadable', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'yarn.lock'),
      join(FIXTURES, 'does-not-exist'),
    );
    expect(resolutions['lodash'].rootVersion).toBeNull();
    expect(resolutions['lodash'].allVersions).toEqual(['3.10.1', '4.17.21']);
  });

  it('skips a package.json dependency value that is not a string range (defensive guard) but still resolves string-valued siblings', () => {
    // yarn-malformed-pkgjson/package.json declares lodash as a non-string
    // object value (atypical/malformed) alongside a normal string range for
    // chalk — the malformed entry must be ignored, not crash resolution.
    const resolutions = adapter.resolve(
      join(FIXTURES, 'yarn.lock'),
      join(FIXTURES, 'yarn-malformed-pkgjson'),
    );
    expect(resolutions['lodash'].rootVersion).toBeNull();
    expect(resolutions['chalk'].rootVersion).toBe('5.3.0');
  });

  it('warns and returns empty object when the parser reports a non-success result', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const parseSpy = vi
      .spyOn(lockfileLib, 'parse')
      .mockReturnValue({ type: 'merge', object: {} });
    try {
      const resolutions = adapter.resolve(
        join(FIXTURES, 'yarn.lock'),
        FIXTURES,
      );
      expect(resolutions).toEqual({});
      expect(warnSpy).toHaveBeenCalledWith(
        'Warning: Failed to parse yarn.lock',
      );
    } finally {
      parseSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('returns empty object when file does not exist', () => {
    const resolutions = adapter.resolve(
      join(FIXTURES, 'nonexistent.lock'),
      FIXTURES,
    );
    expect(resolutions).toEqual({});
  });

  it('warns and returns empty object on a corrupt lockfile', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const corrupt = join(FIXTURES, 'corrupt-yarn.lock');
    // @yarnpkg/lockfile's parser is lenient about plain text (it doesn't
    // reliably return `type: 'error'`), but an unexpected token throws
    // synchronously and fast — unlike some other malformed inputs, which
    // this parser can take several seconds to reject.
    writeFileSync(corrupt, '{{{ not yaml-ish at all }}}', 'utf8');
    try {
      const resolutions = adapter.resolve(corrupt, FIXTURES);
      expect(resolutions).toEqual({});
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('yarn.lock'),
      );
    } finally {
      warnSpy.mockRestore();
      rmSync(corrupt);
    }
  });
});

describe('findAndParseLockfile', () => {
  it('derives versions/multiVersions from resolutions, falling back to the highest resolved version when rootVersion is undeterminable', () => {
    // find-and-parse-yarn/ has a yarn.lock but no package.json, so no
    // package can have a determinable root — versions must fall back to
    // maxSemver(allVersions) for every package (#57).
    const result = findAndParseLockfile(join(FIXTURES, 'find-and-parse-yarn'));
    expect(result.lockfileType).toBe('yarn');
    expect(result.resolutions['lodash']).toEqual({
      rootVersion: null,
      allVersions: ['3.10.1', '4.17.21'],
    });
    expect(result.versions['lodash']).toBe('4.17.21');
    expect(result.versions['chalk']).toBe('5.3.0');
    expect(result.multiVersions['lodash']).toEqual(['3.10.1', '4.17.21']);
  });

  it('uses rootVersion directly (not the fallback) when it is determinable', () => {
    // yarn-with-pkgjson/ has no lockfile of its own, so point detect()/parse
    // at the shared yarn.lock fixture directory instead — reuse the FIXTURES
    // dir directly, which has an npm lockfile too, so assert via the yarn
    // adapter's own resolve() + the shared derivation logic instead of
    // findAndParseLockfile (which would pick npm first for FIXTURES).
    const adapter = new YarnLockfileAdapter();
    const resolutions = adapter.resolve(
      join(FIXTURES, 'yarn.lock'),
      join(FIXTURES, 'yarn-with-pkgjson'),
    );
    expect(resolutions['lodash'].rootVersion).toBe('4.17.21');
  });

  it('throws when no supported lockfile is found', () => {
    expect(() =>
      findAndParseLockfile(join(FIXTURES, 'does-not-exist')),
    ).toThrow('No supported lockfile found');
  });
});

describe('getPackageVersion / getPackageVersions', () => {
  it('getPackageVersion returns the resolved version for a known package', () => {
    expect(getPackageVersion(FIXTURES, 'chalk')).toBe('5.3.0');
  });

  it('getPackageVersion returns null for an unknown package', () => {
    expect(getPackageVersion(FIXTURES, 'does-not-exist-pkg')).toBeNull();
  });

  it('getPackageVersions returns only the entries that resolved, skipping unknown names', () => {
    const versions = getPackageVersions(FIXTURES, [
      'chalk',
      'vitest',
      'does-not-exist-pkg',
    ]);
    expect(versions).toEqual({ chalk: '5.3.0', vitest: '1.6.0' });
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
