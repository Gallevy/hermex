import { describe, test, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

describe('Parser - advanced patterns', () => {
  test('React.lazy(() => import(...)) is tracked in patterns.advanced.lazy', () => {
    const code = `const Button = React.lazy(() => import('./Button'));`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.advanced.lazy.length).toBeGreaterThan(0);
    expect(report.patterns.advanced.lazy[0].source).toBe('./Button');
  });

  test('bare lazy(() => import(...)) is tracked in patterns.advanced.lazy', () => {
    const code = `
      import { lazy } from 'react';
      const Card = lazy(() => import('./Card'));
    `;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.advanced.lazy.length).toBeGreaterThan(0);
  });

  test('await import(...) is tracked in patterns.advanced.dynamic', () => {
    const code = `
      async function loadModule() {
        const mod = await import('./module');
        return mod;
      }
    `;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.advanced.dynamic.length).toBeGreaterThan(0);
    expect(report.patterns.advanced.dynamic[0].source).toBe('./module');
  });

  test('React.memo(Button) is tracked in patterns.advanced.memo', () => {
    const code = `
      import { Button } from '@ui/components';
      const MemoButton = React.memo(Button);
    `;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.advanced.memo).toContainEqual(
      expect.objectContaining({ component: 'Button' }),
    );
  });

  test('React.forwardRef(...) is tracked in patterns.advanced.forwardRef', () => {
    const code = `const Input = React.forwardRef((props, ref) => null);`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.advanced.forwardRef.length).toBeGreaterThan(0);
  });

  test('withAuth(Button) is tracked in patterns.advanced.hoc', () => {
    const code = `
      import { Button } from '@ui/components';
      const AuthButton = withAuth(Button);
    `;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.advanced.hoc).toContainEqual(
      expect.objectContaining({ function: 'withAuth', component: 'Button' }),
    );
  });
});
