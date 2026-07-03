import { describe, test, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';

describe('Parser - JSX in .js files', () => {
  test('parses JSX syntax in a .js file without throwing', () => {
    const code = `
      import Button from "@design-system/foundation/button";

      export function Example() {
        return <Button variant="primary">Click me</Button>;
      }
    `;

    expect(() => parseCode(code, 'Example.js')).not.toThrow();
  });

  test('reports JSX usage found in a .js file', () => {
    const code = `
      import Button from "@design-system/foundation/button";

      export function Example() {
        return <Button variant="primary">Click me</Button>;
      }
    `;

    const report = parseCode(code, 'Example.js');
    expect(report.components).toContain('Button');
    expect(report.patterns.usage.jsx).toHaveLength(1);
    expect(report.patterns.usage.jsx[0].component).toBe('Button');
  });
});
