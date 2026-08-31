import { describe, test, expect } from 'vitest';
import { lineOf } from '../../../src/swc-parser/utils/span';

describe('span - lineOf', () => {
  test('returns the start offset of a node span', () => {
    expect(lineOf({ span: { start: 42, end: 57 } })).toBe(42);
  });

  test('falls back to 0 for nodes assembled without a span', () => {
    expect(lineOf({})).toBe(0);
    expect(lineOf(undefined)).toBe(0);
  });
});
