import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { globSync } from 'glob';
import { parseCode as parseWithSwc } from '../../src/swc-parser';
import { parseCode as parseWithOxc } from '../../src/oxc-parser';

const ROOT = resolve(__dirname, '../..');

/**
 * The experimental oxc front-end is only defensible if it reaches the same
 * conclusions as SWC, so the proof is differential: parse the same source with
 * both and require the two `UsageReport`s to be identical — every import,
 * every JSX usage, every prop detail, every advanced pattern, and the `line`
 * offsets attached to them.
 */
function expectParity(code: string, filePath: string): void {
  expect(parseWithOxc(code, filePath)).toEqual(parseWithSwc(code, filePath));
}

// ── Corpus 1: every real source file in fixtures/ ─────────────────────────────

const FIXTURE_FILES = globSync('fixtures/**/*.{tsx,jsx,ts,js,mjs,cjs}', {
  cwd: ROOT,
  ignore: ['**/node_modules/**', '**/*.d.ts'],
  posix: true,
})
  // The broken fixture exists to fail parsing; parity for it is asserted
  // separately, below, as "both front-ends throw".
  .filter((file) => !file.includes('fixtures/broken/'))
  .sort();

describe('oxc-experimental parity — fixture corpus', () => {
  test('the corpus is non-empty (a bad glob must not vacuously pass)', () => {
    expect(FIXTURE_FILES.length).toBeGreaterThan(20);
  });

  test.each(FIXTURE_FILES)('%s produces an identical report', (file) => {
    const absolute = resolve(ROOT, file);
    expectParity(readFileSync(absolute, 'utf8'), relative(ROOT, absolute));
  });
});

// ── Corpus 2: one snippet per analyzer ────────────────────────────────────────

const IMPORTS = `import { Button, Card } from '@ui/components';\n`;

const PATTERN_SNIPPETS: Record<string, string> = {
  'default import': `import React from 'react';\nfunction App() { return <React.Fragment />; }`,
  'named imports': `${IMPORTS}function App() { return <Button />; }`,
  'aliased import': `import { Button as Btn } from '@ui/components';\nfunction App() { return <Btn />; }`,
  'namespace import': `import * as UI from '@ui/components';\nfunction App() { return <UI.Button />; }`,
  'side-effect import': `import '@ui/components/styles.css';`,
  'type-only import': `import type { ButtonProps } from '@ui/components';`,
  'string-named import': `import { "kebab-case" as Kebab } from '@ui/components';\nconst X = Kebab;`,

  'jsx host elements': `${IMPORTS}function App() { return <div><span /></div>; }`,
  'jsx props by name': `${IMPORTS}function App() { return <Button variant="primary" disabled />; }`,
  'jsx spread props': `${IMPORTS}function App() { return <Button {...props} />; }`,
  'jsx object prop': `${IMPORTS}function App() { return <Button config={{ a: 1 }} />; }`,
  'jsx array prop': `${IMPORTS}function App() { return <Button items={[1, 2]} />; }`,
  'jsx call prop': `${IMPORTS}function App() { return <Button value={compute()} />; }`,
  'jsx conditional prop': `${IMPORTS}function App() { return <Button x={cond ? a : b} />; }`,
  'jsx event handler prop': `${IMPORTS}function App() { return <Button onClick={() => {}} />; }`,
  'jsx numeric/boolean/identifier props': `${IMPORTS}function App() { return <Button n={1} b={true} v={ref} s={\`t\`} />; }`,
  'jsx nested in an attribute (#64)': `${IMPORTS}function App() { return <Card subtitle={<Button />} />; }`,
  'jsx in a fragment inside an attribute': `${IMPORTS}function App() { return <Card subtitle={<><Button /></>} />; }`,
  'jsx member expression': `import * as UI from '@ui/components';\nfunction App() { return <UI.Button.Icon />; }`,
  'jsx namespaced name': `${IMPORTS}function App() { return <svg:rect />; }`,
  'jsx children and text': `${IMPORTS}function App() { return <Button>hello {name}</Button>; }`,
  'jsx empty expression container': `${IMPORTS}function App() { return <Button>{/* nothing */}</Button>; }`,

  'variable assignment': `${IMPORTS}const Btn = Button;`,
  'variable assignment from member expression': `import * as UI from '@ui/components';\nconst Btn = UI.Button;`,
  'variable assignment from a ternary': `${IMPORTS}const Btn = flag ? Button : Card;`,
  'non-component variable': `const x = 42;`,
  'destructuring a namespace': `import * as UI from '@ui/components';\nconst { Button } = UI;`,
  'destructuring with a default': `import * as UI from '@ui/components';\nconst { Button = Fallback } = UI;`,
  'destructuring with a rename': `import * as UI from '@ui/components';\nconst { Button: Renamed } = UI;`,
  'destructuring with a rest element': `import * as UI from '@ui/components';\nconst { Button, ...rest } = UI;`,
  'array destructuring': `${IMPORTS}const [first, second] = [Button, Card];`,

  'conditional identifiers': `${IMPORTS}const Display = show ? Button : Card;`,
  'conditional jsx branches': `${IMPORTS}function App() { return show ? <Button /> : null; }`,

  'array of components': `${IMPORTS}const tabs = [Button, Card];`,
  'array with a hole': `${IMPORTS}const tabs = [Button, , Card];`,
  'array with a spread': `${IMPORTS}const tabs = [Button, ...others];`,
  'array of non-components': `const nums = [1, 2, 3];`,
  'object component map': `${IMPORTS}const map = { primary: Button, card: Card };`,
  'object shorthand property': `${IMPORTS}const map = { Button, Card };`,
  'object computed key': `${IMPORTS}const map = { [key]: Button };`,
  'object string key': `${IMPORTS}const map = { 'primary': Button };`,
  'object with getter/setter/method': `${IMPORTS}const o = { get a() { return Button; }, set a(v) {}, m() { return Card; } };`,
  'object with a spread': `${IMPORTS}const map = { ...base, primary: Button };`,

  'React.lazy': `const Button = React.lazy(() => import('./Button'));`,
  'bare lazy': `import { lazy } from 'react';\nconst Card = lazy(() => import('./Card'));`,
  'await import': `async function load() { return await import('./module'); }`,
  'import with attributes': `const data = await import('./data.json', { with: { type: 'json' } });`,
  'React.memo': `${IMPORTS}const MemoButton = React.memo(Button);`,
  'React.forwardRef': `const Input = React.forwardRef((props, ref) => null);`,
  createPortal: `import { createPortal } from 'react-dom';\ncreatePortal(children, node);`,
  'ReactDOM.createPortal': `import ReactDOM from 'react-dom';\nReactDOM.createPortal(children, node);`,
  'HOC call': `${IMPORTS}const AuthButton = withAuth(Button);`,
  'HOC call with a spread argument': `${IMPORTS}const AuthButton = withAuth(Button, ...opts);`,

  'namespace member access': `import * as UI from '@ui/components';\nconst el = UI.Button;`,
  'namespace computed member access': `import * as UI from '@ui/components';\nconst el = UI['Button'];`,
  'optional chaining member access': `import * as UI from '@ui/components';\nconst el = UI?.Button;`,

  // SWC's `ClassMethod` stores its function in an untyped `function` object
  // that `visitChildren` skips, so class method bodies go unanalyzed on the
  // SWC path. The oxc front-end reproduces that rather than quietly seeing
  // more than the default parser does — these snippets pin the behaviour so a
  // future fix has to move both front-ends together.
  'class method body': `${IMPORTS}class W extends React.Component { render() { return <Button variant="a" />; } }`,
  'class getter body': `${IMPORTS}class W { get el() { return <Button />; } }`,
  'class constructor body': `${IMPORTS}class W { constructor() { this.el = <Button variant="a" />; } }`,
  'class property arrow': `${IMPORTS}class W { render = () => <Button variant="a" />; }`,
  'class static block': `${IMPORTS}class W { static { const el = Button; } }`,
  'class computed method name': `${IMPORTS}class W { [key]() { return <Button />; } }`,

  'literals of every kind': `const s = 'a', n = 1, b = true, nul = null, re = /x/g, big = 1n;`,
  'template literal with a member expression': `import * as UI from '@ui/components';\nconst s = \`\${UI.Button}\`;`,
  'class with a decorator': `@sealed class Widget { render() { return null; } }`,
  'export forms': `${IMPORTS}export default Button;\nexport { Card };\nexport const Named = Button;`,
};

/**
 * Positions are the one place the two parsers use different coordinate
 * systems: oxc counts UTF-16 units, SWC counts UTF-8 bytes. Anything
 * non-ASCII ahead of a tracked pattern exercises the conversion.
 */
const NON_ASCII_SNIPPETS: Record<string, string> = {
  'em-dash in a comment': `// a — dash\n${IMPORTS}function App() { return <Button />; }`,
  'accented identifier': `${IMPORTS}const café = 1;\nfunction App() { return <Button />; }`,
  'emoji (surrogate pair) in a string': `const s = '🎉';\n${IMPORTS}function App() { return <Button />; }`,
  'two-byte character': `const s = 'ß';\n${IMPORTS}function App() { return <Button />; }`,
  'mixed widths before every pattern': `// — ß 🎉\n${IMPORTS}const Btn = Button;\nconst map = { a: Card };\nconst L = React.lazy(() => import('./x'));\nfunction App() { return <Button variant="—" />; }`,
};

describe('oxc-experimental parity — per-analyzer snippets', () => {
  test.each(Object.entries(PATTERN_SNIPPETS))('%s', (_name, code) => {
    expectParity(code, 'snippet.tsx');
  });
});

describe('oxc-experimental parity — non-ASCII positions', () => {
  test.each(Object.entries(NON_ASCII_SNIPPETS))('%s', (_name, code) => {
    expectParity(code, 'snippet.tsx');
  });

  test('the conversion is doing real work (offsets are not simply equal)', () => {
    // Guards the guard: if oxc ever started reporting byte offsets itself,
    // the parity tests above would still pass while the mapper rotted.
    const code = `// —\nimport { Button } from '@ui/c';\nconst B = Button;`;
    const report = parseWithOxc(code, 'snippet.tsx');
    const line = report.patterns.imports.named[0].line ?? 0;
    expect(line).toBe(code.indexOf('import') + 2 + 1);
  });
});

// ── Corpus 3: per-extension parse configuration ───────────────────────────────

describe('oxc-experimental parity — file extensions', () => {
  const JSX_IN_JS = `${IMPORTS}export function App() { return <Button />; }`;

  test.each(['file.tsx', 'file.jsx', 'file.js', 'file.mjs', 'file.cjs'])(
    'JSX in %s parses under both front-ends',
    (file) => {
      expectParity(JSX_IN_JS, file);
    },
  );

  test('.ts is parsed without JSX by both front-ends', () => {
    const code = `${IMPORTS}const widen = <T,>(v: T): T => v;\nconst B = Button;`;
    expectParity(code, 'file.ts');
  });

  test('TypeScript-only syntax parses identically', () => {
    const code = [
      IMPORTS,
      `enum Kind { A, B }`,
      `interface Props { label: string }`,
      `type Alias = Props['label'];`,
      `declare module 'x' {}`,
      `const asserted = Button as unknown as Props;`,
      `const nonNull = Button!;`,
      `abstract class Base<T extends object = {}> { abstract render(): T; }`,
    ].join('\n');
    expectParity(code, 'file.ts');
  });
});

// ── Parse failures ────────────────────────────────────────────────────────────

describe('oxc-experimental parity — parse failures', () => {
  // The pipeline tells an unparseable file from a parsed one by the throw, so
  // the two front-ends have to agree on *that*, not on the message text.
  const BROKEN = readFileSync(
    resolve(ROOT, 'fixtures/broken/unparseable.tsx'),
    'utf8',
  );

  test('both front-ends throw on the broken fixture', () => {
    expect(() => parseWithSwc(BROKEN, 'unparseable.tsx')).toThrow();
    expect(() => parseWithOxc(BROKEN, 'unparseable.tsx')).toThrow();
  });

  test('JSX in a .ts file is a syntax error for both front-ends', () => {
    const code = `export const El = <Button />;`;
    expect(() => parseWithSwc(code, 'file.ts')).toThrow();
    expect(() => parseWithOxc(code, 'file.ts')).toThrow();
  });
});
