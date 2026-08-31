import { describe, test, expect } from 'vitest';
import {
  analyzeHOCUsage,
  analyzeMemoUsage,
  analyzeMemberExpression,
} from '../../../src/swc-parser/patterns/advanced';
import { createState } from '../../../src/swc-parser/core/state';

describe('advanced - analyzeHOCUsage', () => {
  test('records the callee and wrapped component names', () => {
    const state = createState();

    analyzeHOCUsage(
      {
        callee: { value: 'withAuth' },
        arguments: [{ expression: { value: 'Button' } }],
        span: { start: 12 },
      },
      state,
    );

    expect([...state.usagePatterns.hocUsage]).toEqual([
      { function: 'withAuth', component: 'Button', line: 12 },
    ]);
  });

  test('falls back to placeholders when the call shape is unreadable', () => {
    const state = createState();

    analyzeHOCUsage({}, state);

    expect([...state.usagePatterns.hocUsage]).toEqual([
      { function: '[unknown]', component: '[unknown]', line: 0 },
    ]);
  });
});

describe('advanced - analyzeMemoUsage', () => {
  test('ignores a memo call wrapping something that is not a known component', () => {
    const state = createState();

    analyzeMemoUsage(
      { arguments: [{ expression: { type: 'Identifier', value: 'helper' } }] },
      state,
    );

    expect(state.usagePatterns.memoizedComponents.size).toBe(0);
  });

  test('records a memo call wrapping a known component', () => {
    const state = createState();
    state.componentNames.add('Button');

    analyzeMemoUsage(
      {
        arguments: [{ expression: { type: 'Identifier', value: 'Button' } }],
        span: { start: 4 },
      },
      state,
    );

    expect([...state.usagePatterns.memoizedComponents]).toEqual([
      { component: 'Button', line: 4 },
    ]);
  });
});

describe('advanced - analyzeMemberExpression', () => {
  test('registers the property of a namespace access as a component', () => {
    const state = createState();
    state.allIdentifiers.add('Foundation');

    analyzeMemberExpression(
      {
        object: { type: 'Identifier', value: 'Foundation' },
        property: { value: 'Button' },
      },
      state,
    );

    expect(state.componentNames.has('Button')).toBe(true);
  });

  test('registers nothing when the namespace property has no name', () => {
    const state = createState();
    state.allIdentifiers.add('Foundation');

    analyzeMemberExpression(
      { object: { type: 'Identifier', value: 'Foundation' }, property: {} },
      state,
    );

    expect(state.componentNames.size).toBe(0);
  });

  test('ignores member access on an unknown object', () => {
    const state = createState();

    analyzeMemberExpression(
      {
        object: { type: 'Identifier', value: 'lodash' },
        property: { value: 'map' },
      },
      state,
    );

    expect(state.componentNames.size).toBe(0);
  });
});
