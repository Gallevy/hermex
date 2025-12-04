import { describe, test, expect } from 'vitest';
import { ReactComponentUsageAnalyzer } from '../../../src/parser';

const code = '';

describe('Parser - Direct Import', () => {
  test('should parse direct import', () => {
    const parser = new ReactComponentUsageAnalyzer();
    const ast = parser.parse(`
      <Button />
    `);

    expect(ast).toMatchSnapshot();
  });

  test.skip('should parse direct import with alias', () => {
    // const ast = parse(code);
    // expect(ast).toMatchSnapshot();
  });
});
