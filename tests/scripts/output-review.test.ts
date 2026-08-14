import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { diffHunks, scrub, unifiedDiff } from '../../scripts/output-review';

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
 * The PR comment links at `…/stdout.txt#L12-L19` rather than inlining the
 * diff, and those line numbers come from here. A hunk whose `oldStart` is
 * off by one sends every reviewer to the wrong line of the baseline — a
 * failure that looks like a working link, which is the worst kind.
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
