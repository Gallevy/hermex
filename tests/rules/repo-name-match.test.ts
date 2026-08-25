import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { evaluateRepoNameMatch } from '../../src/rules/repo-name-match';
import type { ResolvedRulesConfig } from '../../src/config/types';

const emptyRules: ResolvedRulesConfig = {
  'no-files': [],
  'require-files': [],
  'no-packages': [],
  'require-packages': [],
  'require-scripts': [],
  'require-package-fields': [],
  'no-package-fields': [],
  'require-engine-version': [],
  'require-codeowners': undefined,
  'require-repo-name-match': undefined,
};

const enabled = {
  severity: 'error' as const,
  remote: 'origin',
};

const tempDirs: string[] = [];

interface RepoOptions {
  /** Written verbatim as package.json; omitted entirely when undefined. */
  manifest?: string;
  /** Written to .git/config; omitted entirely when undefined. */
  remoteUrl?: string;
  remoteName?: string;
}

function makeRepo({
  manifest,
  remoteUrl,
  remoteName = 'origin',
}: RepoOptions): string {
  const dir = mkdtempSync(join(tmpdir(), 'hermex-repo-name-'));
  tempDirs.push(dir);

  if (manifest !== undefined) {
    writeFileSync(join(dir, 'package.json'), manifest);
  }
  if (remoteUrl !== undefined) {
    mkdirSync(join(dir, '.git'));
    writeFileSync(
      join(dir, '.git', 'config'),
      `[remote "${remoteName}"]\n\turl = ${remoteUrl}\n`,
    );
  }

  return dir;
}

/** A repo whose package.json declares only `name`. */
function named(name: string, remoteUrl: string): string {
  return makeRepo({ manifest: JSON.stringify({ name }), remoteUrl });
}

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe('evaluateRepoNameMatch', () => {
  it('no violation when the rule is not configured', () => {
    const dir = named('wrong-entirely', 'git@github.com:acme/checkout.git');
    expect(evaluateRepoNameMatch(dir, emptyRules)).toEqual([]);
  });

  it('no violation when the name matches the remote slug', () => {
    const dir = named('checkout', 'git@github.com:acme/checkout.git');
    expect(
      evaluateRepoNameMatch(dir, {
        ...emptyRules,
        'require-repo-name-match': enabled,
      }),
    ).toEqual([]);
  });

  // npm names must be lowercase, host repository names need not be, so a
  // case difference is not drift.
  it('no violation when the name matches case-insensitively', () => {
    const dir = named('checkout-web', 'git@github.com:acme/Checkout-Web.git');
    expect(
      evaluateRepoNameMatch(dir, {
        ...emptyRules,
        'require-repo-name-match': enabled,
      }),
    ).toEqual([]);
  });

  it('no violation when a scoped name matches the slug unscoped', () => {
    const dir = named('@acme/checkout', 'git@github.com:acme/checkout.git');
    expect(
      evaluateRepoNameMatch(dir, {
        ...emptyRules,
        'require-repo-name-match': enabled,
      }),
    ).toEqual([]);
  });

  it('violation when the name does not match, carrying both names', () => {
    const dir = named('legacy-cart', 'git@github.com:acme/checkout-web.git');
    const result = evaluateRepoNameMatch(dir, {
      ...emptyRules,
      'require-repo-name-match': enabled,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ruleId: 'require-repo-name-match',
      severity: 'error',
      patterns: [],
      matchedFiles: [],
      expectedName: 'checkout-web',
      actualName: 'legacy-cart',
    });
  });

  // The scope is stripped for comparison but reported verbatim, so the
  // message names the string actually written in package.json.
  it('reports a scoped name verbatim', () => {
    const dir = named('@acme/legacy-cart', 'git@github.com:acme/checkout.git');
    const result = evaluateRepoNameMatch(dir, {
      ...emptyRules,
      'require-repo-name-match': enabled,
    });

    expect(result[0]).toMatchObject({
      expectedName: 'checkout',
      actualName: '@acme/legacy-cart',
    });
  });

  it('carries the configured severity and message', () => {
    const dir = named('legacy-cart', 'git@github.com:acme/checkout.git');
    const result = evaluateRepoNameMatch(dir, {
      ...emptyRules,
      'require-repo-name-match': {
        severity: 'warn',
        remote: 'origin',
        message: 'Rename the package to match the repo',
      },
    });

    expect(result[0].severity).toBe('warn');
    expect(result[0].message).toBe('Rename the package to match the repo');
  });

  it('honours a non-default remote', () => {
    const dir = makeRepo({
      manifest: JSON.stringify({ name: 'legacy-cart' }),
      remoteUrl: 'git@github.com:acme/checkout.git',
      remoteName: 'upstream',
    });

    // Against `origin` there is nothing to compare, so the rule skips.
    expect(
      evaluateRepoNameMatch(dir, {
        ...emptyRules,
        'require-repo-name-match': enabled,
      }),
    ).toEqual([]);

    expect(
      evaluateRepoNameMatch(dir, {
        ...emptyRules,
        'require-repo-name-match': { severity: 'error', remote: 'upstream' },
      }),
    ).toHaveLength(1);
  });

  describe('skips silently when the repository cannot be identified', () => {
    const withRule = {
      ...emptyRules,
      'require-repo-name-match': enabled,
    };

    it('no .git at all', () => {
      const dir = makeRepo({ manifest: JSON.stringify({ name: 'anything' }) });
      expect(evaluateRepoNameMatch(dir, withRule)).toEqual([]);
    });

    it('no matching remote', () => {
      const dir = makeRepo({
        manifest: JSON.stringify({ name: 'anything' }),
        remoteUrl: 'git@github.com:acme/checkout.git',
        remoteName: 'upstream',
      });
      expect(evaluateRepoNameMatch(dir, withRule)).toEqual([]);
    });

    it('no package.json', () => {
      const dir = makeRepo({ remoteUrl: 'git@github.com:acme/checkout.git' });
      expect(evaluateRepoNameMatch(dir, withRule)).toEqual([]);
    });

    it('unparseable package.json', () => {
      const dir = makeRepo({
        manifest: '{ not json',
        remoteUrl: 'git@github.com:acme/checkout.git',
      });
      expect(evaluateRepoNameMatch(dir, withRule)).toEqual([]);
    });

    it('package.json with no name', () => {
      const dir = makeRepo({
        manifest: JSON.stringify({ version: '1.0.0' }),
        remoteUrl: 'git@github.com:acme/checkout.git',
      });
      expect(evaluateRepoNameMatch(dir, withRule)).toEqual([]);
    });

    it('name present but not a string', () => {
      const dir = makeRepo({
        manifest: JSON.stringify({ name: 42 }),
        remoteUrl: 'git@github.com:acme/checkout.git',
      });
      expect(evaluateRepoNameMatch(dir, withRule)).toEqual([]);
    });

    it('remote url with no recognisable slug', () => {
      const dir = makeRepo({
        manifest: JSON.stringify({ name: 'anything' }),
        remoteUrl: '/',
      });
      expect(evaluateRepoNameMatch(dir, withRule)).toEqual([]);
    });
  });

  // Resolution never walks up to a parent .git. This is what keeps a
  // monorepo's packages/* and every fixture repo checked into this repository
  // from inheriting the outer repo's remote — and it would break silently if
  // someone later "improved" resolution by walking up.
  it('does not inherit a parent directory .git', () => {
    const outer = mkdtempSync(join(tmpdir(), 'hermex-repo-name-outer-'));
    tempDirs.push(outer);
    mkdirSync(join(outer, '.git'));
    writeFileSync(
      join(outer, '.git', 'config'),
      '[remote "origin"]\n\turl = git@github.com:acme/outer.git\n',
    );

    const nested = join(outer, 'packages', 'app');
    mkdirSync(nested, { recursive: true });
    writeFileSync(
      join(nested, 'package.json'),
      JSON.stringify({ name: '@acme/app' }),
    );

    expect(
      evaluateRepoNameMatch(nested, {
        ...emptyRules,
        'require-repo-name-match': enabled,
      }),
    ).toEqual([]);
  });
});
