import { describe, test, expect } from 'vitest';
import { analyzePropsInDetail } from '../../../src/swc-parser/patterns/props';
import { createState } from '../../../src/swc-parser/core/state';

/**
 * `getPropType` and `isComplexProp` are private to the module and only
 * reachable through `analyzePropsInDetail`, so the attribute nodes are built
 * by hand here to pin every arm of their type mapping.
 */
function detailFor(value: any) {
  const state = createState();
  const analysis = analyzePropsInDetail(
    [{ type: 'JSXAttribute', name: { value: 'prop' }, value }],
    'Button',
    state,
  );

  return analysis.propDetails[0];
}

describe('props - analyzePropsInDetail attribute handling', () => {
  test('returns an empty analysis when the element has no attribute list', () => {
    const state = createState();

    const analysis = analyzePropsInDetail(undefined as any, 'Button', state);

    expect(analysis.namedProps).toEqual([]);
    expect(analysis.propDetails).toEqual([]);
    expect(analysis.hasSpread).toBe(false);
  });

  test('falls back to the inner identifier for a namespaced attribute name', () => {
    const state = createState();

    const analysis = analyzePropsInDetail(
      [
        {
          type: 'JSXAttribute',
          name: {
            type: 'JSXNamespacedName',
            ns: { value: 'xlink' },
            name: { value: 'href' },
          },
          value: { type: 'StringLiteral', value: '#icon' },
        },
      ],
      'Icon',
      state,
    );

    expect(analysis.namedProps).toEqual(['href']);
  });

  test('skips attributes with no resolvable name and unknown attribute nodes', () => {
    const state = createState();

    const analysis = analyzePropsInDetail(
      [
        { type: 'JSXAttribute', name: {}, value: null },
        { type: 'JSXText', value: 'stray' },
      ],
      'Button',
      state,
    );

    expect(analysis.namedProps).toEqual([]);
    expect(analysis.propDetails).toEqual([]);
  });

  test('records the analysis on the parser state under the component name', () => {
    const state = createState();

    analyzePropsInDetail(
      [{ type: 'JSXAttribute', name: { value: 'disabled' }, value: null }],
      'Button',
      state,
    );

    expect(state.usagePatterns.propsAnalysis.get('Button')?.namedProps).toEqual(
      ['disabled'],
    );
  });
});

describe('props - prop type mapping', () => {
  const container = (expression: any) => ({
    type: 'JSXExpressionContainer',
    expression,
  });

  test.each([
    ['a bare attribute', null, 'boolean'],
    ['a string literal', { type: 'StringLiteral', value: 'primary' }, 'string'],
    ['a numeric expression', container({ type: 'NumericLiteral' }), 'number'],
    ['a boolean expression', container({ type: 'BooleanLiteral' }), 'boolean'],
    ['a string expression', container({ type: 'StringLiteral' }), 'string'],
    [
      'an arrow function',
      container({ type: 'ArrowFunctionExpression' }),
      'function',
    ],
    [
      'a function expression',
      container({ type: 'FunctionExpression' }),
      'function',
    ],
    ['an object literal', container({ type: 'ObjectExpression' }), 'object'],
    ['an array literal', container({ type: 'ArrayExpression' }), 'array'],
    ['an identifier', container({ type: 'Identifier' }), 'variable'],
    [
      'any other expression',
      container({ type: 'TemplateLiteral' }),
      'expression',
    ],
    ['an empty container', container(undefined), 'unknown'],
    ['an unrecognised value node', { type: 'JSXElement' }, 'unknown'],
  ])('types %s as %s', (_label, value, expected) => {
    expect(detailFor(value).type).toBe(expected);
  });
});

describe('props - complex prop detection', () => {
  test.each([
    ['ObjectExpression', true],
    ['ArrayExpression', true],
    ['CallExpression', true],
    ['ConditionalExpression', true],
    ['Identifier', false],
  ])('treats a %s expression as complex=%s', (type, expected) => {
    expect(
      detailFor({ type: 'JSXExpressionContainer', expression: { type } })
        .isComplex,
    ).toBe(expected);
  });

  test('an expression container with no expression is not complex', () => {
    expect(
      detailFor({ type: 'JSXExpressionContainer', expression: undefined })
        .isComplex,
    ).toBe(false);
  });
});
