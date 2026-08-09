import { describe, it, expect, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ResolvedRulesConfig } from '../../src/config/types';
import {
  codeownersPatternToGlobs,
  fileIsOwned,
  parseCodeowners,
  evaluateCodeowners,
} from '../../src/rules/codeowners';
import type { CodeownersEntry } from '../../src/rules/codeowners';

const emptyRules: ResolvedRulesConfig = {
  detect_files: [],
  require_files: [],
  forbid_packages: [],
  require_packages: [],
  require_scripts: [],
  require_package_fields: [],
  forbid_package_fields: [],
  engine_version: [],
  codeowners: undefined,
};

describe('codeownersPatternToGlobs', () => {
  it('translates `*` to match everything', () => {
    expect(codeownersPatternToGlobs('*')).toEqual(['**']);
  });

  it('translates a no-slash extension pattern to a `**/` prefix', () => {
    expect(codeownersPatternToGlobs('*.ts')).toEqual(['**/*.ts']);
  });

  it('translates a bare name to a file match and a directory match', () => {
    expect(codeownersPatternToGlobs('foo')).toEqual(['**/foo', '**/foo/**']);
  });

  it('translates a leading+trailing-slash pattern to an anchored directory glob', () => {
    expect(codeownersPatternToGlobs('/build/logs/')).toEqual(['build/logs/**']);
  });

  it('translates a trailing-slash-only pattern to an unanchored directory glob', () => {
    expect(codeownersPatternToGlobs('docs/')).toEqual(['**/docs/**']);
  });

  it('translates a leading-slash glob to an anchored glob', () => {
    expect(codeownersPatternToGlobs('/scripts/*.sh')).toEqual(['scripts/*.sh']);
  });

  it('translates a mid-pattern-slash glob to an anchored glob', () => {
    expect(codeownersPatternToGlobs('apps/**')).toEqual(['apps/**']);
  });
});

describe('parseCodeowners', () => {
  it('skips blank lines and comments', () => {
    const entries = parseCodeowners(
      ['# top comment', '', '*.ts @a', '', '# another comment'].join('\n'),
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].pattern).toBe('*.ts');
    expect(entries[0].owners).toEqual(['@a']);
  });

  it('splits owners on multiple spaces and tabs', () => {
    const entries = parseCodeowners('src/  @a   @b\t@c');
    expect(entries).toHaveLength(1);
    expect(entries[0].pattern).toBe('src/');
    expect(entries[0].owners).toEqual(['@a', '@b', '@c']);
  });
});

describe('fileIsOwned', () => {
  it('last matching rule wins', () => {
    const entries: CodeownersEntry[] = [
      {
        pattern: '*.ts',
        globs: codeownersPatternToGlobs('*.ts'),
        owners: ['@a'],
      },
      {
        pattern: 'src/generated.ts',
        globs: codeownersPatternToGlobs('src/generated.ts'),
        owners: [],
      },
    ];
    expect(fileIsOwned('src/generated.ts', entries)).toBe(false);
    expect(fileIsOwned('src/other.ts', entries)).toBe(true);
  });

  it('a no-slash directory name owns nested files', () => {
    const entries: CodeownersEntry[] = [
      {
        pattern: 'docs',
        globs: codeownersPatternToGlobs('docs'),
        owners: ['@a'],
      },
    ];
    expect(fileIsOwned('docs/guide/x.md', entries)).toBe(true);
  });

  it('precompiled-matcher cache produces identical results across repeated calls with the same entries array', () => {
    // Covers a bare-name pattern, an anchored pattern, and an unowned
    // override pattern — mirrors "last matching rule wins" above, but calls
    // fileIsOwned multiple times against the same entries array reference
    // to exercise the internal per-array matcher cache in findOwningEntry.
    const entries: CodeownersEntry[] = [
      {
        pattern: 'docs',
        globs: codeownersPatternToGlobs('docs'),
        owners: ['@a'],
      },
      {
        pattern: '/packages/core/',
        globs: codeownersPatternToGlobs('/packages/core/'),
        owners: ['@b'],
      },
      {
        pattern: 'packages/core/generated.ts',
        globs: codeownersPatternToGlobs('packages/core/generated.ts'),
        owners: [],
      },
    ];

    // Call twice for each file with the same entries array reference — the
    // second call must hit the cache and still return the same result.
    for (let i = 0; i < 2; i++) {
      expect(fileIsOwned('docs/guide/x.md', entries)).toBe(true);
      expect(fileIsOwned('packages/core/util.ts', entries)).toBe(true);
      expect(fileIsOwned('packages/core/generated.ts', entries)).toBe(false);
      expect(fileIsOwned('unrelated/file.txt', entries)).toBe(false);
    }
  });
});

describe('evaluateCodeowners', () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('produces a violation with empty matchedFiles when CODEOWNERS is missing', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'hermex-codeowners-test-'));
    const result = evaluateCodeowners(
      tempDir,
      { ...emptyRules, codeowners: { severity: 'error' } },
      ['src/App.tsx'],
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('codeowners');
    expect(result[0].matchedFiles).toEqual([]);
  });

  it('no violation when full coverage via `* @org/frontend`', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'hermex-codeowners-test-'));
    mkdirSync(join(tempDir, '.github'));
    writeFileSync(join(tempDir, '.github', 'CODEOWNERS'), '* @org/frontend\n');
    const result = evaluateCodeowners(
      tempDir,
      { ...emptyRules, codeowners: { severity: 'error' } },
      ['src/App.tsx', 'lib/x.ts'],
    );
    expect(result).toHaveLength(0);
  });

  it('violation listing the unowned files for partial coverage', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'hermex-codeowners-test-'));
    mkdirSync(join(tempDir, '.github'));
    writeFileSync(join(tempDir, '.github', 'CODEOWNERS'), 'src/ @a\n');
    const result = evaluateCodeowners(
      tempDir,
      { ...emptyRules, codeowners: { severity: 'error' } },
      ['src/App.tsx', 'lib/x.ts'],
    );
    expect(result).toHaveLength(1);
    expect(result[0].matchedFiles).toEqual(['lib/x.ts']);
  });

  it('no violation when the rule is not configured, even without a CODEOWNERS file', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'hermex-codeowners-test-'));
    const result = evaluateCodeowners(tempDir, emptyRules, ['src/App.tsx']);
    expect(result).toHaveLength(0);
  });

  it('converts an absolute scanned-file path to repo-relative before matching', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'hermex-codeowners-test-'));
    mkdirSync(join(tempDir, '.github'));
    mkdirSync(join(tempDir, 'src'));
    writeFileSync(join(tempDir, '.github', 'CODEOWNERS'), 'src/ @a\n');
    const result = evaluateCodeowners(
      tempDir,
      { ...emptyRules, codeowners: { severity: 'error' } },
      [join(tempDir, 'src', 'App.tsx')],
    );
    expect(result).toHaveLength(0);
  });

  it('prefers .github/CODEOWNERS over root CODEOWNERS when both exist', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'hermex-codeowners-test-'));
    mkdirSync(join(tempDir, '.github'));
    writeFileSync(join(tempDir, '.github', 'CODEOWNERS'), '* @org/frontend\n');
    writeFileSync(join(tempDir, 'CODEOWNERS'), '');
    const result = evaluateCodeowners(
      tempDir,
      { ...emptyRules, codeowners: { severity: 'error' } },
      ['src/App.tsx'],
    );
    // Root CODEOWNERS is empty (no owners at all); if it were used instead,
    // src/App.tsx would be unowned and this would produce a violation.
    expect(result).toHaveLength(0);
  });
});

describe('evaluateCodeowners — requiredOwners', () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('flags a file owned by someone other than the required owner', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'hermex-codeowners-test-'));
    mkdirSync(join(tempDir, '.github'));
    writeFileSync(join(tempDir, '.github', 'CODEOWNERS'), 'src/ @other-team\n');
    const result = evaluateCodeowners(
      tempDir,
      {
        ...emptyRules,
        codeowners: { severity: 'error', requiredOwners: ['@platform-team'] },
      },
      ['src/App.tsx'],
    );
    expect(result).toHaveLength(1);
    expect(result[0].matchedFiles).toEqual(['src/App.tsx']);
  });

  it('does not flag a file owned by a required owner', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'hermex-codeowners-test-'));
    mkdirSync(join(tempDir, '.github'));
    writeFileSync(
      join(tempDir, '.github', 'CODEOWNERS'),
      'src/ @platform-team @other-team\n',
    );
    const result = evaluateCodeowners(
      tempDir,
      {
        ...emptyRules,
        codeowners: { severity: 'error', requiredOwners: ['@platform-team'] },
      },
      ['src/App.tsx'],
    );
    expect(result).toHaveLength(0);
  });

  it('reports unowned and wrong-owner files as separate violations', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'hermex-codeowners-test-'));
    mkdirSync(join(tempDir, '.github'));
    writeFileSync(join(tempDir, '.github', 'CODEOWNERS'), 'src/ @other-team\n');
    const result = evaluateCodeowners(
      tempDir,
      {
        ...emptyRules,
        codeowners: { severity: 'error', requiredOwners: ['@platform-team'] },
      },
      ['src/App.tsx', 'lib/x.ts'],
    );
    expect(result).toHaveLength(2);
    const unownedViolation = result.find((v) =>
      v.matchedFiles.includes('lib/x.ts'),
    );
    const wrongOwnerViolation = result.find((v) =>
      v.matchedFiles.includes('src/App.tsx'),
    );
    expect(unownedViolation).toBeDefined();
    expect(wrongOwnerViolation).toBeDefined();
    expect(unownedViolation).not.toBe(wrongOwnerViolation);
  });

  it('uses a custom message for a wrong-owner violation when one is configured', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'hermex-codeowners-test-'));
    mkdirSync(join(tempDir, '.github'));
    writeFileSync(join(tempDir, '.github', 'CODEOWNERS'), 'src/ @other-team\n');
    const result = evaluateCodeowners(
      tempDir,
      {
        ...emptyRules,
        codeowners: {
          severity: 'error',
          requiredOwners: ['@platform-team'],
          message: 'wrong owner for this path',
        },
      },
      ['src/App.tsx'],
    );
    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('wrong owner for this path');
  });

  it('is a no-op when requiredOwners is not set (existing behavior unchanged)', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'hermex-codeowners-test-'));
    mkdirSync(join(tempDir, '.github'));
    writeFileSync(join(tempDir, '.github', 'CODEOWNERS'), 'src/ @any-team\n');
    const result = evaluateCodeowners(
      tempDir,
      { ...emptyRules, codeowners: { severity: 'error' } },
      ['src/App.tsx'],
    );
    expect(result).toHaveLength(0);
  });
});
