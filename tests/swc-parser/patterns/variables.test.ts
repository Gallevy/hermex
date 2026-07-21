import { describe, test, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

describe('Parser - variable assignments and destructuring', () => {
  test('assigning a known component to a variable is tracked in patterns.usage.variables', () => {
    const code = `import { Button } from '@ui/components';\nconst Btn = Button;`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.variables).toHaveLength(1);
    expect(report.patterns.usage.variables[0].variable).toBe('Btn');
    expect(report.patterns.usage.variables[0].assignment).toContain('Button');
  });

  test('assigning a non-component value is not tracked', () => {
    const code = `const x = 42;`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.variables).toEqual([]);
  });

  test('destructuring from a namespace import is tracked in patterns.usage.destructuring', () => {
    const code = `import * as UI from '@ui/components';\nconst { Button } = UI;`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.destructuring).toHaveLength(1);
    expect(report.patterns.usage.destructuring[0]).toMatchObject({
      property: 'Button',
      source: 'UI',
    });
  });
});
