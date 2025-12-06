import { beforeAll, describe, test, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';
import { readFixture } from '../../helpers/read-fixture';

describe('Parser - Direct Import', () => {
  let code: string;

  beforeAll(async () => {
    code = await readFixture('patterns/01-direct-usage.tsx');

    console.log('COPDE', code);
  });

  test('should parse direct import', () => {
    const ast = parseCode(code);

    expect(ast).toMatchSnapshot();
  });
});
