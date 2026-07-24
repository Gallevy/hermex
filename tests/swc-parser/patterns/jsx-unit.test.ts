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

  test('spread props are flagged with hasSpread and a warning', () => {
    const code = `${PREAMBLE}function App() { return <Button {...props} />; }`;

    const report = parseCode(code, 'file.tsx');

    const analysis = report.patterns.usage.jsx[0].propsAnalysis;
    expect(analysis.hasSpread).toBe(true);
    expect(analysis.hasComplexProps).toBe(true);
    const spreadDetail = analysis.propDetails.find((p) => p.isSpread);
    expect(spreadDetail?.warning).toBe(
      'Spread props cannot be statically analyzed',
    );
  });

  test('a component with only named props does not get hasSpread', () => {
    const code = `${PREAMBLE}function App() { return <Button variant="primary" />; }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.jsx[0].propsAnalysis.hasSpread).toBe(false);
  });

  test('an object-expression prop value is flagged as complex', () => {
    const code = `${PREAMBLE}function App() { return <Button config={{ a: 1 }} />; }`;

    const report = parseCode(code, 'file.tsx');

    const analysis = report.patterns.usage.jsx[0].propsAnalysis;
    expect(analysis.hasComplexProps).toBe(true);
    const configDetail = analysis.propDetails.find((p) => p.name === 'config');
    expect(configDetail?.isComplex).toBe(true);
    expect(configDetail?.type).toBe('object');
  });

  test('an array-expression prop value is flagged as complex', () => {
    const code = `${PREAMBLE}function App() { return <Button items={[1, 2]} />; }`;

    const report = parseCode(code, 'file.tsx');

    const itemsDetail =
      report.patterns.usage.jsx[0].propsAnalysis.propDetails.find(
        (p) => p.name === 'items',
      );
    expect(itemsDetail?.isComplex).toBe(true);
    expect(itemsDetail?.type).toBe('array');
  });

  test('a call-expression prop value is flagged as complex', () => {
    const code = `${PREAMBLE}function App() { return <Button value={compute()} />; }`;

    const report = parseCode(code, 'file.tsx');

    const valueDetail =
      report.patterns.usage.jsx[0].propsAnalysis.propDetails.find(
        (p) => p.name === 'value',
      );
    expect(valueDetail?.isComplex).toBe(true);
  });

  test('a conditional-expression prop value is flagged as complex', () => {
    const code = `${PREAMBLE}function App() { return <Button x={cond ? a : b} />; }`;

    const report = parseCode(code, 'file.tsx');

    const xDetail = report.patterns.usage.jsx[0].propsAnalysis.propDetails.find(
      (p) => p.name === 'x',
    );
    expect(xDetail?.isComplex).toBe(true);
  });

  test('a string-literal prop value is not flagged as complex', () => {
    const code = `${PREAMBLE}function App() { return <Button label="hi" />; }`;

    const report = parseCode(code, 'file.tsx');

    const labelDetail =
      report.patterns.usage.jsx[0].propsAnalysis.propDetails.find(
        (p) => p.name === 'label',
      );
    expect(labelDetail?.isComplex).toBe(false);
    expect(report.patterns.usage.jsx[0].propsAnalysis.hasComplexProps).toBe(
      false,
    );
  });
});
