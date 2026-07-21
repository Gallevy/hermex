import { describe, test, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

describe('Parser - collections', () => {
  test('array of known components is tracked in patterns.usage.arrays', () => {
    const code = `
      import { Button, Card } from '@ui/components';
      const tabs = [Button, Card];
    `;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.arrays.length).toBeGreaterThan(0);
    expect(report.patterns.usage.arrays[0].components).toContain('Button');
    expect(report.patterns.usage.arrays[0].components).toContain('Card');
  });

  test('array of non-component values is not tracked in patterns.usage.arrays', () => {
    const code = `const nums = [1, 2, 3];`;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.arrays).toEqual([]);
  });

  test('object mapping known components is tracked in patterns.usage.objects', () => {
    const code = `
      import { Button, Card } from '@ui/components';
      const map = { primary: Button, card: Card };
    `;

    const report = parseCode(code, 'file.tsx');

    expect(report.patterns.usage.objects.length).toBeGreaterThan(0);
    const keys = report.patterns.usage.objects[0].mappings.map((m) => m.key);
    expect(keys).toContain('primary');
    expect(keys).toContain('card');
  });
});
