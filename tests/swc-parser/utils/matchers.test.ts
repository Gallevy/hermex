import { describe, test, expect } from 'vitest';
import {
  isHOCPattern,
  isHOCFunction,
  looksLikeComponent,
  isFromLibrary,
} from '../../../src/swc-parser/utils/matchers';

describe('matchers - isHOCPattern', () => {
  test('returns true for names starting with HOC prefixes', () => {
    expect(isHOCPattern('withAuth')).toBe(true);
    expect(isHOCPattern('connectToStore')).toBe(true);
    expect(isHOCPattern('createForm')).toBe(true);
  });

  test('returns false for non-HOC names', () => {
    expect(isHOCPattern('renderButton')).toBe(false);
    expect(isHOCPattern('Button')).toBe(false);
  });
});

describe('matchers - looksLikeComponent', () => {
  test('returns true for capitalized names', () => {
    expect(looksLikeComponent('Button')).toBe(true);
    expect(looksLikeComponent('MyComponent')).toBe(true);
  });

  test('returns false for lowercase names', () => {
    expect(looksLikeComponent('button')).toBe(false);
    expect(looksLikeComponent('myComponent')).toBe(false);
  });
});

describe('matchers - isFromLibrary', () => {
  test('returns true when the source starts with the library name', () => {
    expect(isFromLibrary('@ui/button', '@ui')).toBe(true);
    expect(isFromLibrary('react-dom/client', 'react-dom')).toBe(true);
  });

  test('returns false when the source does not match the library', () => {
    expect(isFromLibrary('@other/button', '@ui')).toBe(false);
  });
});

describe('matchers - isHOCFunction', () => {
  test('returns true for an Identifier callee with an HOC-pattern name', () => {
    expect(isHOCFunction({ type: 'Identifier', value: 'withAuth' })).toBe(true);
  });

  test('returns false for null and non-HOC identifiers', () => {
    expect(isHOCFunction(null)).toBe(false);
    expect(isHOCFunction({ type: 'Identifier', value: 'render' })).toBe(false);
  });

  test('matches an HOC-pattern name behind a member expression', () => {
    expect(
      isHOCFunction({
        type: 'MemberExpression',
        object: { type: 'Identifier', value: 'hocs' },
        property: { value: 'withTheme' },
      }),
    ).toBe(true);
  });

  test('rejects a member expression whose property is not an HOC name', () => {
    expect(
      isHOCFunction({
        type: 'MemberExpression',
        object: { type: 'Identifier', value: 'lodash' },
        property: { value: 'map' },
      }),
    ).toBe(false);
  });

  // NB: returns `undefined` rather than `false` — the `prop?.value &&`
  // short-circuit yields the falsy operand, and `callee` being `any` hides it
  // from the declared `boolean` return type.
  test('is falsy for a member expression with an unnamed property', () => {
    expect(
      isHOCFunction({ type: 'MemberExpression', property: {} }),
    ).toBeFalsy();
  });

  test('returns false for a callee that is neither identifier nor member', () => {
    expect(isHOCFunction({ type: 'CallExpression' })).toBe(false);
  });
});
