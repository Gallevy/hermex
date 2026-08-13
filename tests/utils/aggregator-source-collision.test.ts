import { describe, expect, it } from 'vitest';
import { parseCode } from '../../src/swc-parser';
import { aggregateReports } from '../../src/utils/aggregator';
import { HermexConfigSchema } from '../../src/config/schema';
import type { HermexConfigInput } from '../../src/config/schema';
import { applyOverrides } from '../../src/config/overrides';
import { readFixture } from '../helpers/read-fixture';

/**
 * Parse a partial config through the real schema, then resolve it exactly
 * like the real pipeline does before aggregateReports ever sees it. None of
 * these tests configure `overrides`, so the repo path is never read.
 */
function createConfig(input: HermexConfigInput = {}) {
  return applyOverrides(HermexConfigSchema.parse(input), process.cwd());
}

const VERSIONS = {
  '@acme-ui/classic': '5.0.0',
  '@acme-ui/pulse': '1.0.0',
};

const VERSUS_CONFIG = createConfig({
  versus: [
    {
      name: 'Classic to Pulse',
      packages: ['@acme-ui/classic', '@acme-ui/pulse'],
    },
  ],
});

// The same component name imported from two different packages must not
// be collapsed into a single (name-only) usage entry — that silently
// attributes every usage to whichever source is aggregated first.
describe('aggregateReports — component source collisions', () => {
  it('keeps `Button` usages split by source across two real files, through the full parse pipeline', async () => {
    const classicCode = await readFixture(
      'versus/01-collision-classic-button.tsx',
    );
    const pulseCode = await readFixture('versus/02-collision-pulse-button.tsx');

    const classicReport = parseCode(
      classicCode,
      'versus/01-collision-classic-button.tsx',
    );
    const pulseReport = parseCode(
      pulseCode,
      'versus/02-collision-pulse-button.tsx',
    );

    const result = aggregateReports(
      [classicReport, pulseReport],
      VERSIONS,
      VERSUS_CONFIG,
    );

    // Both sources are distinct components for aggregation purposes, even
    // though they share the JSX name `Button`.
    expect(result.totalComponents).toBe(2);
    expect(result.topComponents).toHaveLength(2);
    expect(result.topComponents.every((c) => c.name === 'Button')).toBe(true);
    expect(result.topComponents.map((c) => c.source).sort()).toEqual([
      '@acme-ui/classic',
      '@acme-ui/pulse',
    ]);
    expect(result.topComponents.every((c) => c.count === 1)).toBe(true);

    const versus = result.versusResults[0];
    expect(versus.totalCount).toBe(2);
    const classic = versus.entries.find(
      (e) => e.packageName === '@acme-ui/classic',
    );
    const pulse = versus.entries.find(
      (e) => e.packageName === '@acme-ui/pulse',
    );
    expect(classic?.count).toBe(1);
    expect(classic?.percentage).toBe(50);
    expect(pulse?.count).toBe(1);
    expect(pulse?.percentage).toBe(50);

    const classicDist = result.packageDistribution.find(
      (p) => p.packageName === '@acme-ui/classic',
    );
    const pulseDist = result.packageDistribution.find(
      (p) => p.packageName === '@acme-ui/pulse',
    );
    // One Button component per package — the names themselves are asserted
    // on topComponents above (#79 removed the per-package copy).
    expect(classicDist?.componentCount).toBe(1);
    expect(pulseDist?.componentCount).toBe(1);
  });

  it('still merges the same name imported from the same source across files', () => {
    const code = `import Button from '@acme-ui/classic/Button';\nfunction App() { return <Button />; }`;
    const reportA = parseCode(code, 'a.tsx');
    const reportB = parseCode(code, 'b.tsx');

    const result = aggregateReports([reportA, reportB], VERSIONS);

    expect(result.totalComponents).toBe(1);
    expect(result.topComponents).toHaveLength(1);
    expect(result.topComponents[0].count).toBe(2);
    expect(result.topComponents[0].files).toEqual(new Set(['a.tsx', 'b.tsx']));
  });
});
