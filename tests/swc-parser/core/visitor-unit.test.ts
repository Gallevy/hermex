import { describe, test, expect } from 'vitest';
import { visitNode } from '../../../src/swc-parser/core/visitor';
import { analyzeJSXElement } from '../../../src/swc-parser/patterns/jsx';
import { createState } from '../../../src/swc-parser/core/state';

describe('visitor - visitNode guards', () => {
  test('an absent node is a no-op', () => {
    const state = createState();

    expect(() => visitNode(null, state)).not.toThrow();
    expect(state.componentNames.size).toBe(0);
  });

  test('a module with no body is a no-op', () => {
    const state = createState();

    visitNode({ type: 'Module' }, state);

    expect(state.componentNames.size).toBe(0);
    expect(state.usagePatterns.namedImports.size).toBe(0);
  });
});

describe('jsx - analyzeJSXElement guard', () => {
  test('an element with no opening tag is skipped', () => {
    const state = createState();

    analyzeJSXElement({ type: 'JSXElement' }, state);

    expect(state.usagePatterns.jsxUsage.size).toBe(0);
  });
});
