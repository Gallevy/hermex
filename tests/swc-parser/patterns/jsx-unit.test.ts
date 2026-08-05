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

// Regression tests for https://github.com/Gallevy/hermex/issues/64
// JSX nested inside a prop value was never visited, so components used
// exclusively in attribute positions were dropped from usage tracking.
describe('Parser - JSX nested inside attribute values (issue #64)', () => {
  const CHILD_PREAMBLE = `import { Child } from '@ui/components';\n`;

  test('a component in a prop value is tracked', () => {
    const code = `${CHILD_PREAMBLE}import { Attr } from '@ui/components';\nfunction App() { return <Child subtitle={<Attr>x</Attr>} />; }`;

    const report = parseCode(code, 'file.tsx');

    const components = report.patterns.usage.jsx.map((u) => u.component);
    expect(components).toContain('Child');
    expect(components).toContain('Attr');
  });

  test('a self-closing component in a prop value is tracked', () => {
    const code = `${CHILD_PREAMBLE}import { Attr } from '@ui/components';\nfunction App() { return <Child subtitle={<Attr />} />; }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.jsx.map((u) => u.component)).toContain('Attr');
  });

  test('a conditionally-rendered component in a prop value is tracked', () => {
    const code = `${CHILD_PREAMBLE}import { Attr } from '@ui/components';\nfunction App() { return <Child subtitle={cond && <Attr />} />; }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.jsx.map((u) => u.component)).toContain('Attr');
  });

  test('a component in a prop value on an unknown host element is tracked', () => {
    const code = `import { Attr } from '@ui/components';\nfunction App() { return <div title={<Attr />}>x</div>; }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.jsx.map((u) => u.component)).toContain('Attr');
  });

  test('a fragment-wrapped component in a prop value is tracked', () => {
    const code = `${CHILD_PREAMBLE}import { Attr } from '@ui/components';\nfunction App() { return <Child subtitle={<><Attr /></>} />; }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.jsx.map((u) => u.component)).toContain('Attr');
  });

  test('a component used only in a prop position is not double-counted when also used as a child elsewhere', () => {
    const code = `${CHILD_PREAMBLE}import { Both } from '@ui/components';\nfunction App() { return <div><Both /><Child subtitle={<Both />} /></div>; }`;

    const report = parseCode(code, 'file.tsx');

    const bothEntries = report.patterns.usage.jsx.filter(
      (u) => u.component === 'Both',
    );
    expect(bothEntries).toHaveLength(1);
  });

  test('a component imported but never rendered (including in props) stays untracked', () => {
    const code = `${CHILD_PREAMBLE}import { Unused } from '@ui/components';\nfunction App() { return <Child />; }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.jsx.map((u) => u.component)).not.toContain(
      'Unused',
    );
  });
});
