import { describe, test, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

describe('Parser - imports', () => {
  test('named import is tracked in patterns.imports.named', () => {
    const code = `import { Button } from '@ui/button';`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.imports.named).toHaveLength(1);
    expect(report.patterns.imports.named[0]).toMatchObject({
      name: 'Button',
      source: '@ui/button',
    });
  });

  test('default import is tracked in patterns.imports.default', () => {
    const code = `import Button from '@ui/button';`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.imports.default).toHaveLength(1);
    expect(report.patterns.imports.default[0]).toMatchObject({
      name: 'Button',
      source: '@ui/button',
    });
  });

  test('namespace import is tracked in patterns.imports.namespace', () => {
    const code = `import * as UI from '@ui/namespace';`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.imports.namespace).toHaveLength(1);
    expect(report.patterns.imports.namespace[0]).toMatchObject({
      name: 'UI',
      source: '@ui/namespace',
    });
  });

  test('aliased named import is tracked in patterns.imports.aliased with imported/local names', () => {
    const code = `import { Button as Btn } from '@ui/button';`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.imports.aliased).toHaveLength(1);
    expect(report.patterns.imports.aliased[0]).toMatchObject({
      imported: 'Button',
      local: 'Btn',
      source: '@ui/button',
    });
  });

  test('aliased import also appears in patterns.imports.named under its original name', () => {
    const code = `import { Button as Btn } from '@ui/button';`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.imports.named).toHaveLength(1);
    expect(report.patterns.imports.named[0]).toMatchObject({
      name: 'Button',
      source: '@ui/button',
    });
  });

  test('no imports results in empty import arrays and zero totalImports', () => {
    const code = `const x = 42;`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.imports.default).toEqual([]);
    expect(report.patterns.imports.named).toEqual([]);
    expect(report.patterns.imports.namespace).toEqual([]);
    expect(report.patterns.imports.aliased).toEqual([]);
    expect(report.summary.totalImports).toBe(0);
  });

  test('summary.totalImports counts default + named + namespace but not aliased separately', () => {
    const code = `
      import Button from '@ui/button';
      import { Card, Icon as Ico } from '@ui/card';
      import * as UI from '@ui/namespace';
    `;

    const report = parseCode(code, 'file.tsx');

    // default: Button (1), named: Card + Icon (2), namespace: UI (1) = 4
    expect(report.summary.totalImports).toBe(4);
    expect(report.patterns.imports.aliased).toHaveLength(1);
  });
});
