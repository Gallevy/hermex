import { describe, test, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

const PREAMBLE = `import { Button, Card } from '@ui/components';\n`;

describe('Parser - conditional usage', () => {
  test('identifier ternary with known components is tracked with exact branch names', () => {
    const code = `${PREAMBLE}const show = true;\nconst Display = show ? Button : Card;`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.conditional).toHaveLength(1);
    expect(report.patterns.usage.conditional[0]).toMatchObject({
      consequent: 'Button',
      alternate: 'Card',
    });
  });

  test('JSX-branch ternaries are not tracked as conditional usage, only as jsx usage', () => {
    // JSX branches are JSXElement nodes, not Identifier nodes, so the
    // conditional pattern does not fire; the component is tracked via jsx usage instead.
    const code = `${PREAMBLE}const show = true;\nfunction App() { return show ? <Button /> : null; }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.conditional).toEqual([]);
    expect(
      report.patterns.usage.jsx.some((usage) => usage.component === 'Button'),
    ).toBe(true);
  });
});
