import { describe, test, expect } from 'vitest';
import { parseCode } from '../../src/oxc-parser';

/**
 * `parity.test.ts` proves the oxc front-end agrees with SWC. On its own that
 * is satisfiable by two parsers that both find nothing, so this file asserts
 * the analysis positively: run through oxc, every pattern category still comes
 * out with the values it is supposed to have. These mirror the assertions in
 * `tests/swc-parser/patterns/*`.
 */

const IMPORTS = `import { Button, Card } from '@ui/components';\n`;

describe('oxc-experimental — imports', () => {
  test('named imports are tracked with their source', () => {
    const report = parseCode(`${IMPORTS}const B = Button;`, 'file.tsx');

    expect(report.patterns.imports.named).toEqual([
      expect.objectContaining({ name: 'Button', source: '@ui/components' }),
      expect.objectContaining({ name: 'Card', source: '@ui/components' }),
    ]);
    expect(report.summary.totalImports).toBe(2);
  });

  test('a default import is tracked separately from named ones', () => {
    const report = parseCode(`import React from 'react';`, 'file.tsx');

    expect(report.patterns.imports.default).toEqual([
      expect.objectContaining({ name: 'React', source: 'react' }),
    ]);
  });

  test('an aliased import records both the imported and local name', () => {
    const report = parseCode(
      `import { Button as Btn } from '@ui/components';\nconst X = Btn;`,
      'file.tsx',
    );

    expect(report.patterns.imports.aliased).toEqual([
      expect.objectContaining({
        imported: 'Button',
        local: 'Btn',
        source: '@ui/components',
      }),
    ]);
  });

  test('a namespace import is tracked as a namespace, not a component', () => {
    const report = parseCode(
      `import * as UI from '@ui/components';`,
      'file.tsx',
    );

    expect(report.patterns.imports.namespace).toEqual([
      expect.objectContaining({ name: 'UI', source: '@ui/components' }),
    ]);
    expect(report.components).not.toContain('UI');
  });

  test('import positions are 1-based byte offsets, not zero', () => {
    const report = parseCode(`${IMPORTS}const B = Button;`, 'file.tsx');

    expect(report.patterns.imports.named[0].line).toBe(1);
  });
});

describe('oxc-experimental — JSX usage', () => {
  test('a known component element is tracked', () => {
    const report = parseCode(
      `${IMPORTS}function App() { return <Button />; }`,
      'file.tsx',
    );

    expect(report.patterns.usage.jsx).toHaveLength(1);
    expect(report.patterns.usage.jsx[0].component).toBe('Button');
  });

  test('host elements are not tracked', () => {
    const report = parseCode(
      `${IMPORTS}function App() { return <div><span /></div>; }`,
      'file.tsx',
    );

    expect(report.patterns.usage.jsx).toEqual([]);
  });

  test('namespace member usage keeps the dotted name', () => {
    const report = parseCode(
      `import * as UI from '@ui/components';\nfunction App() { return <UI.Button />; }`,
      'file.tsx',
    );

    expect(report.patterns.usage.jsx[0].component).toBe('UI.Button');
  });

  test('JSX nested in a prop value is tracked (issue #64)', () => {
    const report = parseCode(
      `${IMPORTS}function App() { return <Card subtitle={<Button />} />; }`,
      'file.tsx',
    );

    expect(report.patterns.usage.jsx.map((u) => u.component)).toEqual(
      expect.arrayContaining(['Card', 'Button']),
    );
  });

  test('an imported but never rendered component stays untracked', () => {
    const report = parseCode(
      `${IMPORTS}function App() { return <Button />; }`,
      'file.tsx',
    );

    expect(report.patterns.usage.jsx.map((u) => u.component)).not.toContain(
      'Card',
    );
  });
});

describe('oxc-experimental — props analysis', () => {
  test('named props are captured with their inferred types', () => {
    const report = parseCode(
      `${IMPORTS}function App() { return <Button label="hi" count={2} open={true} onClick={() => {}} data={{ a: 1 }} items={[1]} ref={x} />; }`,
      'file.tsx',
    );

    const { propDetails, hasEventHandlers, hasComplexProps, hasSpread } =
      report.patterns.usage.jsx[0].propsAnalysis;
    const typeOf = (name: string) =>
      propDetails.find((p) => p.name === name)?.type;

    expect(typeOf('label')).toBe('string');
    expect(typeOf('count')).toBe('number');
    expect(typeOf('open')).toBe('boolean');
    expect(typeOf('onClick')).toBe('function');
    expect(typeOf('data')).toBe('object');
    expect(typeOf('items')).toBe('array');
    expect(typeOf('ref')).toBe('variable');
    expect(hasEventHandlers).toBe(true);
    expect(hasComplexProps).toBe(true);
    expect(hasSpread).toBe(false);
  });

  test('a valueless prop is a boolean', () => {
    const report = parseCode(
      `${IMPORTS}function App() { return <Button disabled />; }`,
      'file.tsx',
    );

    expect(
      report.patterns.usage.jsx[0].propsAnalysis.propDetails[0],
    ).toMatchObject({ name: 'disabled', type: 'boolean' });
  });

  test('spread props are flagged with a warning', () => {
    const report = parseCode(
      `${IMPORTS}function App() { return <Button {...props} />; }`,
      'file.tsx',
    );

    const analysis = report.patterns.usage.jsx[0].propsAnalysis;
    expect(analysis.hasSpread).toBe(true);
    expect(analysis.propDetails.find((p) => p.isSpread)?.warning).toBe(
      'Spread props cannot be statically analyzed',
    );
  });
});

describe('oxc-experimental — variables, conditionals and collections', () => {
  test('a component assigned to a variable is tracked', () => {
    const report = parseCode(`${IMPORTS}const Btn = Button;`, 'file.tsx');

    expect(report.patterns.usage.variables).toEqual([
      { variable: 'Btn', assignment: 'Button' },
    ]);
  });

  test('destructuring a namespace import is tracked', () => {
    const report = parseCode(
      `import * as UI from '@ui/components';\nconst { Button } = UI;`,
      'file.tsx',
    );

    expect(report.patterns.usage.destructuring[0]).toMatchObject({
      property: 'Button',
      source: 'UI',
    });
  });

  test('an identifier ternary records both branches', () => {
    const report = parseCode(
      `${IMPORTS}const Display = show ? Button : Card;`,
      'file.tsx',
    );

    expect(report.patterns.usage.conditional[0]).toMatchObject({
      consequent: 'Button',
      alternate: 'Card',
    });
  });

  test('an array of components is tracked', () => {
    const report = parseCode(
      `${IMPORTS}const tabs = [Button, Card];`,
      'file.tsx',
    );

    expect(report.patterns.usage.arrays[0].components).toEqual([
      'Button',
      'Card',
    ]);
  });

  test('an object component map is tracked by key', () => {
    const report = parseCode(
      `${IMPORTS}const map = { primary: Button, card: Card };`,
      'file.tsx',
    );

    expect(report.patterns.usage.objects[0].mappings).toEqual([
      { key: 'primary', component: 'Button' },
      { key: 'card', component: 'Card' },
    ]);
  });

  test('a computed object key falls back to [computed], as under SWC', () => {
    const report = parseCode(
      `${IMPORTS}const map = { [k]: Button };`,
      'file.tsx',
    );

    expect(report.patterns.usage.objects[0].mappings).toEqual([
      { key: '[computed]', component: 'Button' },
    ]);
  });
});

describe('oxc-experimental — advanced patterns', () => {
  test('React.lazy(() => import(...)) records the source', () => {
    const report = parseCode(
      `const B = React.lazy(() => import('./Button'));`,
      'file.tsx',
    );

    expect(report.patterns.advanced.lazy[0].source).toBe('./Button');
  });

  test('await import(...) records the source', () => {
    const report = parseCode(
      `async function load() { return await import('./module'); }`,
      'file.tsx',
    );

    expect(report.patterns.advanced.dynamic[0].source).toBe('./module');
  });

  test('React.memo(Component) is tracked', () => {
    const report = parseCode(
      `${IMPORTS}const M = React.memo(Button);`,
      'file.tsx',
    );

    expect(report.patterns.advanced.memo).toContainEqual(
      expect.objectContaining({ component: 'Button' }),
    );
  });

  test('React.forwardRef is tracked', () => {
    const report = parseCode(
      `const Input = React.forwardRef((props, ref) => null);`,
      'file.tsx',
    );

    expect(report.patterns.advanced.forwardRef.length).toBeGreaterThan(0);
  });

  test('createPortal is tracked', () => {
    const report = parseCode(
      `import { createPortal } from 'react-dom';\ncreatePortal(children, node);`,
      'file.tsx',
    );

    expect(report.patterns.advanced.portal.length).toBeGreaterThan(0);
  });

  test('an HOC call records the wrapper and the component', () => {
    const report = parseCode(
      `${IMPORTS}const AuthButton = withAuth(Button);`,
      'file.tsx',
    );

    expect(report.patterns.advanced.hoc).toContainEqual(
      expect.objectContaining({ function: 'withAuth', component: 'Button' }),
    );
  });
});

describe('oxc-experimental — file extensions', () => {
  test.each(['file.tsx', 'file.jsx', 'file.js', 'file.mjs', 'file.cjs'])(
    'JSX parses in %s',
    (file) => {
      const report = parseCode(
        `${IMPORTS}export function App() { return <Button />; }`,
        file,
      );

      expect(report.patterns.usage.jsx[0].component).toBe('Button');
    },
  );

  test('TypeScript syntax parses in .ts', () => {
    const report = parseCode(
      `${IMPORTS}interface P { a: string }\nconst B: typeof Button = Button;`,
      'file.ts',
    );

    expect(report.patterns.usage.variables).toEqual([
      { variable: 'B', assignment: 'Button' },
    ]);
  });
});

describe('oxc-experimental — parse errors', () => {
  test('a syntax error throws rather than returning an empty report', () => {
    expect(() =>
      parseCode(`export const Broken = ( : : :;`, 'file.tsx'),
    ).toThrow();
  });

  test('the thrown message describes the failure', () => {
    expect(() => parseCode(`const = ;`, 'file.tsx')).toThrow(
      /expect|unexpected/i,
    );
  });
});
