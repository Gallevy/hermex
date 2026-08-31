import { describe, test, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

const PREAMBLE = `import { Button, Card } from '@ui/components';\n`;

/**
 * Sources that reach a pattern analyzer but should not produce a match.
 * These are the guards that keep the report free of false positives, and
 * only a near-miss source exercises the rejecting side of them.
 */

describe('Parser - lazy imports that are not lazy imports', () => {
  test('React.lazy called with a bare identifier is not tracked', () => {
    const code = `${PREAMBLE}const C = React.lazy(Button);`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.advanced.lazy).toEqual([]);
  });

  test('React.lazy wrapping a call that is not import() is not tracked', () => {
    const code = `${PREAMBLE}const C = React.lazy(() => load('./Button'));`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.advanced.lazy).toEqual([]);
  });

  test('React.lazy over an interpolated specifier is not tracked', () => {
    const code =
      `${PREAMBLE}const C = React.lazy(() => import(` +
      '`./widgets/${name}`' +
      `));`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.advanced.lazy).toEqual([]);
  });
});

describe('Parser - dynamic imports without a static specifier', () => {
  test('an interpolated specifier is not tracked, having no static source', () => {
    const code =
      `async function load(name) { return await import(` +
      '`./locales/${name}.js`' +
      `); }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.advanced.dynamic).toEqual([]);
  });

  // A bare identifier specifier is recorded under the *variable's* name
  // rather than a module path — `Identifier` nodes carry the name in `.value`,
  // which is the same field a `StringLiteral` specifier uses.
  test('a bare identifier specifier is recorded under the variable name', () => {
    const code = `async function load(target) { return await import(target); }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.advanced.dynamic).toContainEqual(
      expect.objectContaining({ source: 'target' }),
    );
  });
});

describe('Parser - createPortal', () => {
  test('ReactDOM.createPortal is tracked in patterns.advanced.portal', () => {
    const code = `${PREAMBLE}
      function Modal() {
        return ReactDOM.createPortal(<Card />, document.body);
      }
    `;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.advanced.portal).toHaveLength(1);
  });
});

describe('Parser - conditionals with one non-component branch', () => {
  test('a ternary falling back to null records an empty consequent', () => {
    const code = `${PREAMBLE}function App({ flag }) { return flag ? null : Button; }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.conditional).toContainEqual(
      expect.objectContaining({ consequent: '', alternate: 'Button' }),
    );
  });

  test('a ternary falling back from a component records an empty alternate', () => {
    const code = `${PREAMBLE}function App({ flag }) { return flag ? Button : null; }`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.conditional).toContainEqual(
      expect.objectContaining({ consequent: 'Button', alternate: '' }),
    );
  });
});

describe('Parser - object mappings with a computed key', () => {
  test('a computed key is reported as [computed]', () => {
    const code = `${PREAMBLE}const map = { [key]: Button };`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.objects).toContainEqual(
      expect.objectContaining({
        mappings: [{ key: '[computed]', component: 'Button' }],
      }),
    );
  });
});

describe('Parser - sparse arrays', () => {
  test('holes in an array of components are skipped', () => {
    const code = `${PREAMBLE}const list = [Button, , Card];`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.arrays).toHaveLength(1);
  });
});
