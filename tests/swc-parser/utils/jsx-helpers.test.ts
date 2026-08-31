import { describe, test, expect } from 'vitest';
import {
  getJSXElementName,
  extractJSXProps,
  extractJSXAttributeValue,
  extractExpressionValue,
  getUsageContext,
} from '../../../src/swc-parser/utils/jsx-helpers';

/**
 * These helpers take untyped SWC nodes and each fan out over a `switch` with
 * a fallback arm. Parsing real sources only ever reaches a handful of those
 * arms, so the mapping is pinned here directly against synthetic nodes.
 */

describe('jsx-helpers - getJSXElementName', () => {
  test('reads an identifier name', () => {
    expect(getJSXElementName({ type: 'Identifier', value: 'Button' })).toBe(
      'Button',
    );
  });

  test('joins a member expression into a dotted name', () => {
    expect(
      getJSXElementName({
        type: 'JSXMemberExpression',
        object: { type: 'Identifier', value: 'Foundation' },
        property: { value: 'Button' },
      }),
    ).toBe('Foundation.Button');
  });

  test('returns an empty name for a missing or unrecognised node', () => {
    expect(getJSXElementName(null)).toBe('');
    expect(getJSXElementName({ type: 'JSXNamespacedName' })).toBe('');
  });
});

describe('jsx-helpers - extractJSXProps', () => {
  test('returns no props when the element has no attribute list', () => {
    expect(extractJSXProps(undefined as any)).toEqual([]);
  });

  test('falls back to the inner identifier for a namespaced attribute', () => {
    const props = extractJSXProps([
      {
        type: 'JSXAttribute',
        name: {
          type: 'JSXNamespacedName',
          ns: { value: 'xlink' },
          name: { value: 'href' },
        },
        value: { type: 'StringLiteral', value: '#icon' },
      },
    ]);

    expect(props).toEqual([{ name: 'href', value: '#icon' }]);
  });

  test('marks spread attributes and drops anything else', () => {
    const props = extractJSXProps([
      { type: 'SpreadElement' },
      { type: 'JSXText', value: 'stray' },
    ]);

    expect(props).toEqual([{ name: '...', value: '[spread]', isSpread: true }]);
  });
});

describe('jsx-helpers - extractJSXAttributeValue', () => {
  test('treats a valueless attribute as a boolean prop', () => {
    expect(extractJSXAttributeValue(null)).toBe(true);
  });

  test('reads a string literal value', () => {
    expect(
      extractJSXAttributeValue({ type: 'StringLiteral', value: 'primary' }),
    ).toBe('primary');
  });

  test('unwraps an expression container', () => {
    expect(
      extractJSXAttributeValue({
        type: 'JSXExpressionContainer',
        expression: { type: 'Identifier', value: 'variant' },
      }),
    ).toBe('{variant}');
  });

  test('reports an unrecognised value node as complex', () => {
    expect(extractJSXAttributeValue({ type: 'JSXElement' })).toBe('[complex]');
  });
});

describe('jsx-helpers - extractExpressionValue', () => {
  test.each([
    ['StringLiteral', { type: 'StringLiteral', value: 'hi' }, 'hi'],
    ['NumericLiteral', { type: 'NumericLiteral', value: 3 }, 3],
    ['BooleanLiteral', { type: 'BooleanLiteral', value: true }, true],
    ['Identifier', { type: 'Identifier', value: 'label' }, '{label}'],
    [
      'ArrowFunctionExpression',
      { type: 'ArrowFunctionExpression' },
      '[function]',
    ],
    ['FunctionExpression', { type: 'FunctionExpression' }, '[function]'],
    ['ObjectExpression', { type: 'ObjectExpression' }, '[object]'],
    ['ArrayExpression', { type: 'ArrayExpression' }, '[array]'],
    ['TemplateLiteral', { type: 'TemplateLiteral' }, '[expression]'],
  ])('renders %s', (_label, expr, expected) => {
    expect(extractExpressionValue(expr)).toBe(expected);
  });

  test('reports a missing expression as unknown', () => {
    expect(extractExpressionValue(null)).toBe('[unknown]');
  });
});

describe('jsx-helpers - getUsageContext', () => {
  test.each([
    ['ConditionalExpression', 'conditional'],
    ['ArrayExpression', 'array'],
    ['ObjectExpression', 'object'],
    ['CallExpression', 'hoc'],
    ['VariableDeclarator', 'variable'],
    ['JSXElement', 'jsx'],
  ])('maps a %s parent to the %s context', (type, expected) => {
    expect(getUsageContext({ type })).toBe(expected);
  });

  test('reports a parentless element as a direct usage', () => {
    expect(getUsageContext(undefined)).toBe('direct');
  });
});
