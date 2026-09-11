import { describe, test, expect } from 'vitest';
import { join } from 'node:path';
import { parseCode, parseFile } from '../../src/swc-parser';

const FIXTURE = join(
  __dirname,
  '../..',
  'fixtures',
  'patterns',
  '01-direct-usage.tsx',
);

describe('swc-parser - syntax selection by file extension', () => {
  test('a .ts file is parsed as TypeScript without JSX', () => {
    const code = `
      import { Button } from '@ui/components';
      const label: string = 'go';
      const Alias = Button;
    `;

    const report = parseCode(code, 'module.ts');

    expect(report.filePath).toBe('module.ts');
    expect(report.components).toContain('Alias');
  });

  test('a .jsx file is parsed as ECMAScript with JSX', () => {
    const code = `
      import { Button } from '@ui/components';
      export function App() { return <Button variant="primary" />; }
    `;

    const report = parseCode(code, 'App.jsx');

    expect(report.patterns.usage.jsx).toHaveLength(1);
    expect(report.patterns.usage.jsx[0].component).toBe('Button');
  });

  test('a .tsx file supports both type annotations and JSX', () => {
    const code = `
      import { Button } from '@ui/components';
      export function App(): JSX.Element { return <Button />; }
    `;

    const report = parseCode(code, 'App.tsx');

    expect(report.patterns.usage.jsx).toHaveLength(1);
  });
});

describe('swc-parser - parseFile', () => {
  test('reads a file from disk and reports against its path', () => {
    const report = parseFile(FIXTURE);

    expect(report?.filePath).toBe(FIXTURE);
    expect(report?.summary.totalImports).toBeGreaterThan(0);
  });
});
