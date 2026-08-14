import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import {
  buildSite,
  caseDoc,
  diffHunks,
  scrub,
  unifiedDiff,
} from '../../scripts/output-review';
import type { CaseResult, FixtureCase } from '../../scripts/output-review';

const ROOT = resolve(__dirname, '../..');

/**
 * The scrubber decides what a baseline records. A gap in it makes every run
 * differ and the review unusable; an over-broad rule silently erases a real
 * regression from the diff. Both failure modes are invisible from the
 * runner's own output, which is why they're pinned here.
 */
describe('scrub', () => {
  it("replaces hermex's own version so a release does not touch every baseline", () => {
    expect(scrub('hermex v2.11.0\n')).toBe('hermex v<version>\n');
    expect(scrub('hermex v3.0.0-beta.1\n')).toBe('hermex v<version>\n');
  });

  it('leaves package versions in the tables alone', () => {
    const row = '│ react                           │ 18.3.1  │';
    expect(scrub(row)).toBe(row);
  });

  it('replaces the top-level JSON version but not a package entry version', () => {
    const payload = [
      '{',
      '  "version": "2.11.0",',
      '  "packages": [',
      '    {',
      '      "packageName": "react",',
      '      "version": "18.3.1"',
      '    }',
      '  ]',
      '}',
    ].join('\n');
    const scrubbed = scrub(payload);
    expect(scrubbed).toContain('  "version": "<version>"');
    expect(scrubbed).toContain('      "version": "18.3.1"');
  });

  it('makes absolute repo paths relative and normalizes separators', () => {
    expect(scrub(`${ROOT}/fixtures/broken/unparseable.tsx`)).toBe(
      '<repo>/fixtures/broken/unparseable.tsx',
    );
    expect(scrub('broken\\unparseable.tsx')).toBe('broken/unparseable.tsx');
  });

  it('replaces the process id a Node warning would carry', () => {
    expect(scrub('(node:12345) Warning')).toBe('(node:<pid>) Warning');
  });

  it('normalizes CRLF, so a Windows capture matches a Linux one', () => {
    expect(scrub('a\r\nb\r\n')).toBe('a\nb\n');
  });
});

describe('unifiedDiff', () => {
  it('emits nothing at all when the text is unchanged', () => {
    const text = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
    expect(unifiedDiff('stdout.txt', text, text)).toBe('');
  });

  it('labels the two sides baseline and current rather than a and b', () => {
    const diff = unifiedDiff('stdout.txt', 'a', 'b');
    expect(diff.split('\n').slice(0, 2)).toEqual([
      '--- baseline/stdout.txt',
      '+++ current/stdout.txt',
    ]);
  });

  it('marks a changed line and keeps surrounding context', () => {
    const before = ['a', 'b', 'c', 'd', 'e'].join('\n');
    const after = ['a', 'b', 'X', 'd', 'e'].join('\n');
    const diff = unifiedDiff('stdout.txt', before, after);
    expect(diff).toContain('-c');
    expect(diff).toContain('+X');
    expect(diff).toContain(' b');
    expect(diff).toContain(' d');
  });

  it('treats an empty side as no lines rather than one blank line', () => {
    const diff = unifiedDiff('summary.md', '', 'only line');
    expect(diff).toContain('+only line');
    expect(diff.split('\n').filter((l) => l === '-')).toEqual([]);
  });

  it('elides unchanged regions far from any change', () => {
    const before = Array.from({ length: 40 }, (_, i) => `line ${i}`);
    const after = [...before];
    after[20] = 'changed';
    const diff = unifiedDiff('stdout.txt', before.join('\n'), after.join('\n'));
    expect(diff).not.toContain(' line 0\n');
    expect(diff).toContain(' line 19');
  });

  /**
   * The bare `@@` this used to emit said only "something was skipped". The
   * numbers are the part that lets a reviewer find the changed line in the
   * baseline file instead of counting from the top — so they are pinned.
   */
  describe('hunk headers', () => {
    const hunks = (diff: string) =>
      diff.split('\n').filter((line) => line.startsWith('@@'));

    it('states where the hunk starts and how many lines it covers', () => {
      const before = Array.from({ length: 40 }, (_, i) => `line ${i}`);
      const after = [...before];
      after[20] = 'changed';
      const diff = unifiedDiff(
        'stdout.txt',
        before.join('\n'),
        after.join('\n'),
      );
      // Line 21 is `line 20` 1-based; three lines of context either side
      // makes a seven-line hunk starting at line 18 on both sides.
      expect(hunks(diff)).toEqual(['@@ -18,7 +18,7 @@']);
    });

    it('counts the two sides separately when lines are added', () => {
      const before = ['a', 'b', 'c'].join('\n');
      const after = ['a', 'b', 'b2', 'b3', 'c'].join('\n');
      expect(hunks(unifiedDiff('stdout.txt', before, after))).toEqual([
        '@@ -1,3 +1,5 @@',
      ]);
    });

    it('opens one hunk per change region rather than one for the file', () => {
      const before = Array.from({ length: 60 }, (_, i) => `line ${i}`);
      const after = [...before];
      after[10] = 'first';
      after[50] = 'second';
      const diff = unifiedDiff(
        'stdout.txt',
        before.join('\n'),
        after.join('\n'),
      );
      expect(hunks(diff)).toEqual(['@@ -8,7 +8,7 @@', '@@ -48,7 +48,7 @@']);
    });

    it('starts at 0 on the side where the file does not exist', () => {
      const added = unifiedDiff('summary.md', '', ['x', 'y'].join('\n'));
      expect(hunks(added)).toEqual(['@@ -0,0 +1,2 @@']);

      const removed = unifiedDiff('summary.md', ['x', 'y'].join('\n'), '');
      expect(hunks(removed)).toEqual(['@@ -1,2 +0,0 @@']);
    });
  });
});

/**
 * Every `@@` header a reviewer reads is built from these numbers, and they
 * are what turn an elision into something navigable — "the changed line is
 * near line 18 of the baseline" rather than "some lines were skipped". A
 * hunk whose `oldStart` is off by one sends the reader to the wrong place
 * while looking entirely correct, which is the worst kind of wrong.
 */
describe('diffHunks', () => {
  it('reports no hunks when the two sides are identical', () => {
    expect(diffHunks('a\nb\nc', 'a\nb\nc')).toEqual([]);
  });

  it('anchors a hunk at its first baseline line', () => {
    const before = Array.from({ length: 40 }, (_, i) => `line ${i}`);
    const after = [...before];
    after[20] = 'changed';
    const [hunk, ...rest] = diffHunks(before.join('\n'), after.join('\n'));
    expect(rest).toEqual([]);
    expect(hunk.oldStart).toBe(18);
    expect(hunk.oldCount).toBe(7);
    // The linked range is oldStart..oldStart+oldCount-1, and `line 20` sits
    // at baseline line 21 — inside it.
    expect(hunk.oldStart + hunk.oldCount - 1).toBe(24);
  });

  it('counts additions and deletions separately per hunk', () => {
    const [hunk] = diffHunks('a\nb\nc', 'a\nb\nb2\nb3\nc');
    expect(hunk.rows.filter((row) => row.sign === '+')).toHaveLength(2);
    expect(hunk.rows.filter((row) => row.sign === '-')).toHaveLength(0);
  });

  it('leaves no baseline lines to link at for a newly written file', () => {
    const [hunk] = diffHunks('', 'x\ny');
    expect(hunk.oldCount).toBe(0);
    expect(hunk.oldStart).toBe(0);
  });

  it('keeps distant changes in separate hunks so each gets its own link', () => {
    const before = Array.from({ length: 60 }, (_, i) => `line ${i}`);
    const after = [...before];
    after[10] = 'first';
    after[50] = 'second';
    const found = diffHunks(before.join('\n'), after.join('\n'));
    expect(found.map((hunk) => hunk.oldStart)).toEqual([8, 48]);
  });
});

function fixtureCase(
  overrides: Partial<FixtureCase> & { name: string },
): FixtureCase {
  return {
    proves: 'a thing worth proving',
    cwd: '.',
    args: ['scan'],
    expectExit: 0,
    ...overrides,
  };
}

function caseResult(
  fixture: FixtureCase,
  artifacts: Record<string, string> = {},
  diff = '',
): CaseResult {
  return {
    fixture,
    artifacts: { 'exit-code.txt': `${fixture.expectExit}\n`, ...artifacts },
    raw: { stdout: '', stderr: '' },
    changed: diff ? ['stdout.txt'] : [],
    added: [],
    removed: [],
    fileDiffs: [],
    diff,
  };
}

/**
 * The dossier is what the PR comment sends a reviewer to, and it is
 * generated — so a field that silently stops being rendered produces a page
 * that looks complete and is not. The `case-docs-are-current` invariant
 * catches drift between the file and the generator; these pin what the
 * generator is supposed to say in the first place.
 */
describe('caseDoc', () => {
  it('records the command with the scratch directory left symbolic', () => {
    const doc = caseDoc(
      fixtureCase({
        name: 'comply-summary-file',
        args: ['comply', '--summary-file', '{OUT}/summary.md'],
        writes: ['summary.md'],
      }),
    );
    // The resolved path is a temp directory that differs every run — naming
    // it would be both meaningless and a scrubber leak.
    expect(doc).toContain('hermex comply --summary-file $OUT/summary.md');
    expect(doc).not.toContain('{OUT}');
  });

  it('says a case runs on schema defaults when no config is loaded', () => {
    // Mirrors src/config/loader.ts, which does not walk up: the lock-file
    // repos have no hermex.config.ts of their own, so claiming they use the
    // primary one would be a lie a reviewer might act on.
    const doc = caseDoc(
      fixtureCase({ name: 'lockfile-npm', cwd: 'repos/lockfile-npm' }),
    );
    expect(doc).toContain('schema defaults');
  });

  it('links the explicit config a case names', () => {
    const doc = caseDoc(
      fixtureCase({
        name: 'scan-human-minimal',
        args: ['scan', '--config', 'configs/minimal.config.ts'],
      }),
    );
    expect(doc).toContain('(../configs/minimal.config.ts)');
  });

  it('states the absences a reviewer would otherwise have to notice', () => {
    const doc = caseDoc(
      fixtureCase({ name: 'minimal', absent: ['📦 Packages', '🔍 Rules'] }),
    );
    expect(doc).toContain('Must not appear in stdout');
    expect(doc).toContain('`📦 Packages`');
    expect(doc).toContain('`🔍 Rules`');
  });

  it('carries the hand-written notes the generator cannot derive', () => {
    const doc = caseDoc(
      fixtureCase({ name: 'noted', notes: 'Look at the ordering first.' }),
    );
    expect(doc).toContain('Look at the ordering first.');
  });

  it('is a pure function of the case, so the freshness check is stable', () => {
    const fixture = fixtureCase({ name: 'stable' });
    expect(caseDoc(fixture)).toBe(caseDoc(fixture));
  });
});

/**
 * One page per case is the point of the site: two cases cannot be confused
 * for each other if they were never on the same page.
 */
describe('buildSite', () => {
  const results = [
    caseResult(fixtureCase({ name: 'alpha' }), { 'stdout.txt': 'a\n' }),
    caseResult(
      fixtureCase({ name: 'beta' }),
      { 'stdout.txt': 'b\n' },
      [
        '--- baseline/stdout.txt',
        '+++ current/stdout.txt',
        '@@ -1,1 +1,1 @@',
        '-a',
        '+b',
      ].join('\n'),
    ),
  ];

  it('writes Markdown — an index plus one page per case', () => {
    const site = buildSite(results, [], null);
    expect([...site.keys()].sort()).toEqual([
      'alpha.md',
      'beta.md',
      'index.md',
    ]);
  });

  it('links every case from the index at its rendered .html path', () => {
    // Jekyll turns foo.md into foo.html, so the links have to name the
    // rendered page rather than the source that produced it.
    const index = buildSite(results, [], null).get('index.md') ?? '';
    expect(index).toContain('(./alpha.html)');
    expect(index).toContain('(./beta.html)');
  });

  it('keeps a case page to its own case', () => {
    const alpha = buildSite(results, [], null).get('alpha.md') ?? '';
    expect(alpha).toContain('alpha');
    expect(alpha).not.toContain('beta.html');
  });

  it('gives every page front matter so the theme applies', () => {
    for (const page of buildSite(results, [], null).values()) {
      expect(page.startsWith('---\nlayout: default\n')).toBe(true);
    }
  });

  it('escapes quotes in a title so the front matter stays valid YAML', () => {
    const page =
      buildSite([caseResult(fixtureCase({ name: 'has"quote' }))], [], null).get(
        'has"quote.md',
      ) ?? '';
    expect(page).toContain('title: "has\\"quote — output review"');
  });

  /**
   * Jekyll runs Liquid before Markdown, so a stray `{{` anywhere in captured
   * CLI output would fail the build — for every PR at once, not only the one
   * that introduced it. Every page body is wrapped for that reason, and this
   * is the test that stops someone removing the wrapper as noise.
   */
  it('wraps page bodies so Liquid never parses captured output', () => {
    const hostile = [
      caseResult(fixtureCase({ name: 'hostile' }), {
        'stdout.txt': 'a {{ template }} and a {% tag %}\n',
      }),
    ];
    const page = buildSite(hostile, [], null).get('hostile.md') ?? '';
    expect(page).toContain('{% raw %}');
    expect(page.trimEnd().endsWith('{% endraw %}')).toBe(true);
    expect(page.indexOf('{% raw %}')).toBeLessThan(
      page.indexOf('a {{ template }}'),
    );
  });

  it('puts the diff in a diff fence, so colouring comes from the theme', () => {
    const beta = buildSite(results, [], null).get('beta.md') ?? '';
    expect(beta).toContain('```diff');
    expect(beta).toContain('-a');
    expect(beta).toContain('+b');
  });

  it('inlines the config a case ran under, not merely a link to it', () => {
    // "What policy produced this output?" is the one question a diff cannot
    // answer, and a reviewer who has to open another tab mostly does not.
    const page =
      buildSite(
        [
          caseResult(
            fixtureCase({
              name: 'configured',
              args: ['scan', '--config', 'configs/minimal.config.ts'],
            }),
          ),
        ],
        [],
        null,
      ).get('configured.md') ?? '';
    expect(page).toContain('## Config');
    expect(page).toContain('HermexConfigInput');
  });

  it('says so plainly when a case runs on schema defaults', () => {
    const page =
      buildSite(
        [caseResult(fixtureCase({ name: 'bare', cwd: 'repos/lockfile-npm' }))],
        [],
        null,
      ).get('bare.md') ?? '';
    expect(page).toContain('schema defaults');
  });
});
