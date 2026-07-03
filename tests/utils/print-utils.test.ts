import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AggregatedReport } from '../../src/utils/aggregator';
import type { RuleViolation } from '../../src/rules/evaluator';
import type { ParseError } from '../../src/swc-parser/types';
import { printSummary } from '../../src/utils/print-summary';
import { printPackages } from '../../src/utils/print-packages';
import { printComponents } from '../../src/utils/print-components';
import { printPatterns } from '../../src/utils/print-patterns';
import { printDetails } from '../../src/utils/print-details';
import { printVersus } from '../../src/utils/print-versus';
import { printRules } from '../../src/utils/print-rules';
import { printErrors } from '../../src/utils/print-errors';
import { printJson } from '../../src/utils/print-json';
import { printComplianceVerdict } from '../../src/utils/print-compliance';
import { computeCompliance } from '../../src/utils/compliance';
import {
  createMockPackage,
  createMockReleaseAge,
} from '../helpers/mock-reports';

/**
 * Creates a minimal AggregatedReport with all required fields.
 * Override specific fields via the partial argument.
 */
function makeAggregated(
  overrides: Partial<AggregatedReport> = {},
): AggregatedReport {
  return {
    filesAnalyzed: 5,
    totalImports: 10,
    totalComponents: 3,
    totalUsagePatterns: 7,
    patternCounts: [
      { patternType: 'usage.jsx', displayName: 'JSX Usage', count: 5 },
    ],
    componentUsage: new Map(),
    topComponents: [],
    allComponents: ['Button', 'Icon', 'Modal'],
    packageDistribution: [],
    versusResults: [],
    ruleViolations: [],
    bannedPackageViolations: [],
    reports: [],
    ...overrides,
  };
}

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
});

describe('printSummary', () => {
  it('prints without throwing on minimal data', () => {
    expect(() => printSummary(makeAggregated())).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe('printPackages', () => {
  it('prints table mode without throwing on empty distribution', () => {
    expect(() => printPackages(makeAggregated(), 'table')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('prints chart mode without throwing on empty distribution', () => {
    expect(() => printPackages(makeAggregated(), 'chart')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('prints table mode with a populated package entry', () => {
    const aggregated = makeAggregated({
      packageDistribution: [
        createMockPackage('react', {
          componentCount: 2,
          usageCount: 8,
          percentage: 100,
          components: ['Button', 'Icon'],
        }),
      ],
    });
    expect(() => printPackages(aggregated, 'table')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('react');
  });
});

describe('printComponents', () => {
  it('prints table mode without throwing on empty components', () => {
    expect(() => printComponents(makeAggregated(), 'table')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('prints chart mode without throwing on empty components', () => {
    expect(() => printComponents(makeAggregated(), 'chart')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe('printPatterns', () => {
  it('prints table mode without throwing', () => {
    expect(() => printPatterns(makeAggregated(), 'table')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('prints chart mode without throwing', () => {
    expect(() => printPatterns(makeAggregated(), 'chart')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe('printDetails', () => {
  it('prints without throwing on minimal data', () => {
    expect(() => printDetails(makeAggregated())).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe('printRules', () => {
  it('prints a passing message when there are no violations', () => {
    expect(() => printRules(makeAggregated())).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('All compliance checks passed');
  });

  it('prints violations when present', () => {
    const violation: RuleViolation = {
      type: 'require_packages',
      severity: 'error',
      patterns: ['eslint'],
      message: 'eslint is required',
      matchedFiles: [],
    };
    const aggregated = makeAggregated({ ruleViolations: [violation] });
    expect(() => printRules(aggregated)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('eslint');
    expect(output).toContain('not installed');
  });

  it('info-severity violations do not affect errorCount/warnCount in the summary line', () => {
    const infoViolation: RuleViolation = {
      type: 'detect_files',
      severity: 'info',
      patterns: ['orbis.config.*'],
      message: 'Orbis detected',
      matchedFiles: ['orbis.config.ts'],
    };
    const aggregated = makeAggregated({ ruleViolations: [infoViolation] });
    expect(() => printRules(aggregated)).not.toThrow();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).not.toContain('error');
    expect(output).not.toContain('warning');
  });

  it('renders info-severity violations with a distinct tag from warn/error', () => {
    const infoViolation: RuleViolation = {
      type: 'detect_files',
      severity: 'info',
      patterns: ['orbis.config.*'],
      matchedFiles: ['orbis.config.ts'],
    };
    const aggregated = makeAggregated({ ruleViolations: [infoViolation] });
    printRules(aggregated);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('[INFO]');
    expect(output).not.toContain('[ERROR]');
    expect(output).not.toContain('[WARN]');
  });
});

describe('printComplianceVerdict', () => {
  it('prints COMPLIANT when there are no mandatory violations', () => {
    const compliance = computeCompliance(makeAggregated());
    expect(() => printComplianceVerdict(compliance)).not.toThrow();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('COMPLIANT');
    expect(output).not.toContain('NOT COMPLIANT');
  });

  it('prints NOT COMPLIANT with a count when mandatory violations are present', () => {
    const errorViolation: RuleViolation = {
      type: 'require_files',
      severity: 'error',
      patterns: ['.nvmrc'],
      matchedFiles: [],
    };
    const pkg = createMockPackage('@my-org/internal', {
      releaseAge: createMockReleaseAge({
        worstLevel: 'mandatory_upgrade',
        severity: 'error',
        upgrades: [
          {
            version: '2.0.0',
            releasedDaysAgo: 90,
            semverBump: 'major',
            level: 'mandatory_upgrade',
          },
        ],
      }),
    });
    const aggregated = makeAggregated({
      ruleViolations: [errorViolation],
      packageDistribution: [pkg],
    });
    const compliance = computeCompliance(aggregated);
    expect(compliance.compliant).toBe(false);
    printComplianceVerdict(compliance);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('NOT COMPLIANT');
    expect(output).toContain('2 mandatory violations');
    expect(output).toContain('@my-org/internal');
  });
});

describe('printVersus', () => {
  it('prints nothing when there are no versus results', () => {
    expect(() => printVersus(makeAggregated())).not.toThrow();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('prints a populated versus result', () => {
    const aggregated = makeAggregated({
      versusResults: [
        {
          name: 'ui-kits',
          packages: ['react', 'vue'],
          entries: [
            {
              packageName: 'react',
              count: 3,
              percentage: 100,
              components: ['Button'],
            },
            { packageName: 'vue', count: 0, percentage: 0, components: [] },
          ],
          totalCount: 3,
        },
      ],
    });
    expect(() => printVersus(aggregated)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('ui-kits');
    expect(output).toContain('react');
  });
});

describe('printErrors', () => {
  it('prints nothing on an empty error list', () => {
    expect(() => printErrors([])).not.toThrow();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('prints file and message for each error', () => {
    const errors: ParseError[] = [
      { file: 'src/App.tsx', message: 'Unexpected token' },
    ];
    expect(() => printErrors(errors)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('src/App.tsx');
    expect(output).toContain('Unexpected token');
  });
});

describe('printJson', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('writes parseable JSON with the expected top-level shape', () => {
    printJson(makeAggregated());

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const written = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(written);

    expect(Object.keys(parsed)).toEqual([
      'version',
      'summary',
      'packages',
      'components',
      'patterns',
      'versus',
      'ruleViolations',
      'bannedPackageViolations',
    ]);
    expect(parsed.summary.filesAnalyzed).toBe(5);
    expect(parsed.summary.totalImports).toBe(10);
    expect(parsed.summary.totalComponents).toBe(3);
    expect(parsed.summary.totalUsagePatterns).toBe(7);
  });

  it('serializes component file sets as arrays', () => {
    const aggregated = makeAggregated({
      topComponents: [
        {
          name: 'Button',
          source: 'react',
          count: 4,
          files: new Set(['a.tsx', 'b.tsx']),
        },
      ],
    });
    printJson(aggregated);

    const written = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(written);
    expect(parsed.components).toHaveLength(1);
    expect(parsed.components[0].name).toBe('Button');
    expect(parsed.components[0].files).toEqual(['a.tsx', 'b.tsx']);
  });
});
