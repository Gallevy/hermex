import { beforeAll, describe, test, expect } from 'vitest';
import { parseCode } from '../../../src/swc-parser';
import { readFixture } from '../../helpers/read-fixture';

// Fixture-level regression test for https://github.com/Gallevy/hermex/issues/64
// Mirrors the position matrix from the issue: components rendered inside
// JSX attribute values must be tracked exactly like components rendered
// as children.
describe('Parser - JSX in attributes fixture', () => {
  let code: string;

  beforeAll(async () => {
    code = await readFixture('patterns/09-jsx-in-attributes.tsx');
  });

  test('detects components used exclusively in prop positions', () => {
    const report = parseCode(code, '09-jsx-in-attributes.tsx');
    const components = report.patterns.usage.jsx.map((u) => u.component);

    expect(components).toContain('CaseAttr');
    expect(components).toContain('CaseAttrSelfClosing');
    expect(components).toContain('CaseAttrCond');
    expect(components).toContain('CaseAttrHost');
    expect(components).toContain('CaseAttrFragment');
  });

  test('still detects components used in the pre-existing child positions', () => {
    const report = parseCode(code, '09-jsx-in-attributes.tsx');
    const components = report.patterns.usage.jsx.map((u) => u.component);

    expect(components).toContain('CaseChild');
    expect(components).toContain('CaseCond');
    expect(components).toContain('CaseMap');
    expect(components).toContain('CaseVar');
    expect(components).toContain('CaseReturn');
  });

  test('a component used in both a child and a prop position is tracked exactly once', () => {
    const report = parseCode(code, '09-jsx-in-attributes.tsx');
    const bothEntries = report.patterns.usage.jsx.filter(
      (u) => u.component === 'CaseBoth',
    );

    expect(bothEntries).toHaveLength(1);
  });

  test('a component imported but never rendered stays untracked', () => {
    const report = parseCode(code, '09-jsx-in-attributes.tsx');
    const components = report.patterns.usage.jsx.map((u) => u.component);

    expect(components).not.toContain('CaseUnused');
  });

  test('all case components are reflected in the flat components list', () => {
    const report = parseCode(code, '09-jsx-in-attributes.tsx');

    // report.components lists every imported component, used or not, so
    // this only confirms the import side; usage is asserted above.
    expect(report.components).toContain('CaseAttr');
    expect(report.components).toContain('CaseUnused');
  });
});
