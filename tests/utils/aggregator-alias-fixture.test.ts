import { describe, expect, it } from 'vitest';
import { parseCode } from '../../src/swc-parser';
import { aggregateReports } from '../../src/utils/aggregator';
import { readFixture } from '../helpers/read-fixture';

const VERSIONS = { '@acme-ui/pulse': '1.0.0' };

const FIXTURE_FILES = [
  'aliasing/01-plain.tsx',
  'aliasing/02-alias.tsx',
  'aliasing/03-alias-again.tsx',
  'aliasing/04-plain-again.tsx',
];

// Regression test: a single package export (`Card`) imported under a plain
// name in some files and under different local aliases in others must
// aggregate as one component, not fragment into one entry per alias.
describe('aggregateReports — aliased import canonicalization, through the full parse pipeline', () => {
  it('reports one Card component used 4 times, not three fragmented components', async () => {
    const reports = await Promise.all(
      FIXTURE_FILES.map(async (path) => {
        const code = await readFixture(path);
        return parseCode(code, path);
      }),
    );

    const result = aggregateReports(reports, VERSIONS);

    expect(result.totalComponents).toBe(1);
    expect(result.topComponents).toHaveLength(1);

    const card = result.topComponents[0];
    expect(card.name).toBe('Card');
    expect(card.source).toBe('@acme-ui/pulse');
    expect(card.count).toBe(4);
    expect(card.files).toEqual(new Set(FIXTURE_FILES));

    const dist = result.packageDistribution.find(
      (p) => p.packageName === '@acme-ui/pulse',
    );
    expect(dist?.componentCount).toBe(1);
    expect(dist?.usageCount).toBe(4);
    // Neither local alias leaks into the reported identity.
    const names = result.topComponents.map((c) => c.name);
    expect(names).toEqual(['Card']);
    expect(names).not.toContain('PulseCard');
    expect(names).not.toContain('UiCard');
  });
});
