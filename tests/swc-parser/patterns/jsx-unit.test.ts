import { describe, test, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

const PREAMBLE = `import { Button, Card } from '@ui/components';\n`;

describe('Parser - JSX usage', () => {
  test('a known component element is tracked in patterns.usage.jsx', () => {
    const code = `${PREAMBLE}function App() { return <Button />; }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.jsx).toHaveLength(1);
    expect(report.patterns.usage.jsx[0].component).toBe('Button');
  });

  test('unknown host elements (div, span) are not tracked', () => {
    const code = `${PREAMBLE}function App() { return <div><span /></div>; }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.jsx).toEqual([]);
  });

  test('props on a known component are captured by name', () => {
    const code = `${PREAMBLE}function App() { return <Button variant="primary" disabled />; }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.jsx).toHaveLength(1);
    expect(report.patterns.usage.jsx[0].props).toContain('variant');
    expect(report.patterns.usage.jsx[0].props).toContain('disabled');
  });

  test('jsx usage entries carry a positive line number', () => {
    const code = `${PREAMBLE}function App() { return <Button />; }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.jsx).toHaveLength(1);
    expect(report.patterns.usage.jsx[0].line).toBeGreaterThan(0);
  });

  test('namespace member JSX usage (UI.Button) is tracked with a dotted component name', () => {
    const code = `import * as UI from '@ui/components';\nfunction App() { return <UI.Button />; }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.jsx).toHaveLength(1);
    expect(report.patterns.usage.jsx[0].component).toContain('.');
    expect(report.patterns.usage.jsx[0].component).toBe('UI.Button');
  });
});
