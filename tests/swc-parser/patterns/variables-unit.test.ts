import { describe, test, expect } from 'vitest';
import {
  analyzeVariableDeclaration,
  analyzeDestructuringPattern,
} from '../../../src/swc-parser/patterns/variables';
import { createState } from '../../../src/swc-parser/core/state';

describe('variables - analyzeVariableDeclaration', () => {
  test('does nothing for a declaration node with no declarator list', () => {
    const state = createState();

    analyzeVariableDeclaration({}, state);

    expect(state.usagePatterns.variableAssignments.size).toBe(0);
  });

  test('ignores a declarator with no initialiser', () => {
    const state = createState();

    analyzeVariableDeclaration(
      { declarations: [{ id: { type: 'Identifier', value: 'Alias' } }] },
      state,
    );

    expect(state.usagePatterns.variableAssignments.size).toBe(0);
  });

  test('resolves a member expression initialiser to a dotted assignment', () => {
    const state = createState();
    state.componentNames.add('Foundation.Button');

    analyzeVariableDeclaration(
      {
        span: { start: 7 },
        declarations: [
          {
            id: { type: 'Identifier', value: 'Alias' },
            init: {
              type: 'MemberExpression',
              object: { type: 'Identifier', value: 'Foundation' },
              property: { value: 'Button' },
            },
          },
        ],
      },
      state,
    );

    expect(state.usagePatterns.variableAssignments.get('Alias')).toEqual({
      assignment: 'Foundation.Button',
      line: 7,
    });
    expect(state.componentNames.has('Alias')).toBe(true);
  });
});

describe('variables - analyzeDestructuringPattern', () => {
  test('does nothing for a pattern with no properties', () => {
    const state = createState();

    analyzeDestructuringPattern({}, null, state);

    expect(state.usagePatterns.destructuredUsage.size).toBe(0);
  });

  test('skips rest elements and properties whose source is not a known namespace', () => {
    const state = createState();

    analyzeDestructuringPattern(
      {
        properties: [
          { type: 'RestElement' },
          {
            type: 'AssignmentPatternProperty',
            key: { type: 'Identifier', value: 'Button' },
          },
        ],
      },
      null,
      state,
    );

    expect(state.usagePatterns.destructuredUsage.size).toBe(0);
  });

  test('records a property destructured off a known namespace', () => {
    const state = createState();
    state.allIdentifiers.add('Foundation');

    analyzeDestructuringPattern(
      {
        span: { start: 3 },
        properties: [
          {
            type: 'AssignmentPatternProperty',
            key: { type: 'Identifier', value: 'Button' },
          },
        ],
      },
      { type: 'Identifier', value: 'Foundation' },
      state,
    );

    expect([...state.usagePatterns.destructuredUsage]).toEqual([
      { property: 'Button', source: 'Foundation', line: 3 },
    ]);
  });
});
