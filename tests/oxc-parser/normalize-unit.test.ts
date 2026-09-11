import { describe, test, expect } from 'vitest';
import { normalizeProgram } from '../../src/oxc-parser/normalize';
import { parseCode } from '../../src/oxc-parser';

/**
 * `normalize` reads an oxc AST through untyped index access, so each node it
 * reshapes carries a fallback for a collection that is not an array or a node
 * built without positions. oxc never emits those shapes, which leaves the
 * fallbacks unreachable from a real parse — they are pinned here directly.
 */

const normalize = (program: unknown) =>
  normalizeProgram(program, '') as Record<string, any>;

describe('normalize - normalizeProgram guards', () => {
  test('a program that is not a node is passed through untouched', () => {
    expect(normalizeProgram(null, '')).toBeNull();
    expect(normalizeProgram('not-a-program', '')).toBe('not-a-program');
  });

  test('a node with no start/end normalizes to a zero-based span', () => {
    const out = normalize({ type: 'Identifier', name: 'Button' });

    expect(out['span']).toEqual({ start: 1, end: 1, ctxt: 0 });
  });
});

describe('normalize - non-array collections fall back to empty', () => {
  test.each([
    ['CallExpression', 'arguments'],
    ['NewExpression', 'arguments'],
    ['ArrayExpression', 'elements'],
    ['ObjectExpression', 'properties'],
    ['ObjectPattern', 'properties'],
  ])('%s with a non-array %s yields []', (type, field) => {
    const out = normalize({ type, [field]: undefined });

    expect(out[field]).toEqual([]);
  });
});

describe('normalize - class methods', () => {
  test('a non-constructor method becomes a ClassMethod, not a Constructor', () => {
    const out = normalize({
      type: 'MethodDefinition',
      kind: 'method',
      static: false,
      computed: false,
      key: { type: 'Identifier', name: 'render' },
      value: { type: 'FunctionExpression', params: [], body: null },
    });

    expect(out['type']).toBe('ClassMethod');
    expect(out['kind']).toBe('method');
  });

  test('a method with no function value still becomes a ClassMethod', () => {
    const out = normalize({
      type: 'MethodDefinition',
      kind: 'method',
      computed: false,
      key: { type: 'Identifier', name: 'render' },
      value: undefined,
    });

    expect(out['type']).toBe('ClassMethod');
    expect(out['function']).toBeUndefined();
  });

  test('a class with a plain method parses without being treated as a constructor', () => {
    const report = parseCode(
      `import { Button } from '@ui/components';
       class Panel { render() { return Button; } }`,
      'file.tsx',
    );

    expect(report.components).toContain('Button');
  });
});
