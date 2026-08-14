import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { scrub, unifiedDiff } from '../../scripts/output-review';

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
  it('reports nothing but context markers when the text is unchanged', () => {
    const text = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
    const diff = unifiedDiff('stdout.txt', text, text);
    expect(diff.split('\n').filter((l) => l.startsWith('+line'))).toEqual([]);
    expect(diff.split('\n').filter((l) => l.startsWith('-line'))).toEqual([]);
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
    expect(diff).toContain('@@');
    expect(diff).not.toContain(' line 0');
    expect(diff).toContain(' line 19');
  });
});
