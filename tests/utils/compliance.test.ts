import { describe, it, expect } from 'vitest';
import type { AggregatedReport } from '../../src/utils/aggregator';
import type { RuleViolation } from '../../src/rules/evaluator';
import type { BannedPackageViolation } from '../../src/utils/package-rules';
import { computeCompliance } from '../../src/utils/compliance';
import {
  createMockPackage,
  createMockReleaseAge,
} from '../helpers/mock-reports';

function makeAggregated(
  overrides: Partial<AggregatedReport> = {},
): AggregatedReport {
  return {
    filesAnalyzed: 1,
    totalImports: 1,
    totalComponents: 1,
    totalUsagePatterns: 1,
    patternCounts: [],
    componentUsage: new Map(),
    topComponents: [],
    allComponents: [],
    packageDistribution: [],
    versusResults: [],
    ruleViolations: [],
    bannedPackageViolations: [],
    reports: [],
    ...overrides,
  };
}

describe('computeCompliance', () => {
  it('is compliant when there are no violations of any kind', () => {
    const result = computeCompliance(makeAggregated());
    expect(result.compliant).toBe(true);
    expect(result.errorRuleViolations).toHaveLength(0);
    expect(result.errorBannedPackageViolations).toHaveLength(0);
    expect(result.mandatoryReleaseAgeViolations).toHaveLength(0);
  });

  it('is non-compliant when an error-severity rule violation is present', () => {
    const violation: RuleViolation = {
      type: 'require_files',
      severity: 'error',
      patterns: ['.nvmrc'],
      matchedFiles: [],
    };
    const result = computeCompliance(
      makeAggregated({ ruleViolations: [violation] }),
    );
    expect(result.compliant).toBe(false);
    expect(result.errorRuleViolations).toEqual([violation]);
  });

  it('warn and info severity rule violations do not affect compliance', () => {
    const warnViolation: RuleViolation = {
      type: 'require_files',
      severity: 'warn',
      patterns: ['.editorconfig'],
      matchedFiles: [],
    };
    const infoViolation: RuleViolation = {
      type: 'detect_files',
      severity: 'info',
      patterns: ['orbis.config.*'],
      matchedFiles: ['orbis.config.ts'],
    };
    const result = computeCompliance(
      makeAggregated({ ruleViolations: [warnViolation, infoViolation] }),
    );
    expect(result.compliant).toBe(true);
  });

  it('is non-compliant when an error-severity banned package violation is present', () => {
    const violation: BannedPackageViolation = {
      packageName: 'moment',
      severity: 'error',
      message: 'Use date-fns',
    };
    const result = computeCompliance(
      makeAggregated({ bannedPackageViolations: [violation] }),
    );
    expect(result.compliant).toBe(false);
    expect(result.errorBannedPackageViolations).toEqual([violation]);
  });

  it('warn-severity banned package violations do not affect compliance', () => {
    const violation: BannedPackageViolation = {
      packageName: 'lodash',
      severity: 'warn',
    };
    const result = computeCompliance(
      makeAggregated({ bannedPackageViolations: [violation] }),
    );
    expect(result.compliant).toBe(true);
  });

  it('is non-compliant when an enforced package has a mandatory_upgrade', () => {
    const pkg = createMockPackage('@my-org/internal', {
      releaseAge: createMockReleaseAge({
        worstLevel: 'mandatory_upgrade',
        severity: 'error',
      }),
    });
    const result = computeCompliance(
      makeAggregated({ packageDistribution: [pkg] }),
    );
    expect(result.compliant).toBe(false);
    expect(result.mandatoryReleaseAgeViolations).toEqual([pkg]);
  });

  it('a mandatory_upgrade on a warn-severity (not enforced) package does not affect compliance', () => {
    const pkg = createMockPackage('react', {
      releaseAge: createMockReleaseAge({
        worstLevel: 'mandatory_upgrade',
        severity: 'warn',
      }),
    });
    const result = computeCompliance(
      makeAggregated({ packageDistribution: [pkg] }),
    );
    expect(result.compliant).toBe(true);
  });

  it('a needs_upgrade on an enforced package does not affect compliance (only mandatory_upgrade does)', () => {
    const pkg = createMockPackage('@my-org/internal', {
      releaseAge: createMockReleaseAge({
        worstLevel: 'needs_upgrade',
        severity: 'error',
      }),
    });
    const result = computeCompliance(
      makeAggregated({ packageDistribution: [pkg] }),
    );
    expect(result.compliant).toBe(true);
  });
});
