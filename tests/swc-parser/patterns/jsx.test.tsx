import { beforeAll, describe, test, expect } from 'vitest';

describe('Parser - Direct Import', () => {
  let code: string;

  beforeAll(async () => {
    code = await readFixture('jsx.tsx');
  });

  test('should parse direct import', () => {
    const ast = parseCode(code);

    expect(ast).toMatchSnapshot();
  });
});
