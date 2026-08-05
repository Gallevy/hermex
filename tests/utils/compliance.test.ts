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
    expect(result.releaseAgeViolations).toHaveLength(0);
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

  it('is non-compliant when an enforced package has a major_overdue breach', () => {
    const pkg = createMockPackage('@my-org/internal', {
      releaseAge: createMockReleaseAge({
        worstLevel: 'major_overdue',
        severity: 'error',
      }),
    });
    const result = computeCompliance(
      makeAggregated({ packageDistribution: [pkg] }),
    );
    expect(result.compliant).toBe(false);
    expect(result.releaseAgeViolations).toEqual([pkg]);
  });

  it('a major_overdue on a warn-severity (not enforced) package does not affect compliance', () => {
    const pkg = createMockPackage('react', {
      releaseAge: createMockReleaseAge({
        worstLevel: 'major_overdue',
        severity: 'warn',
      }),
    });
    const result = computeCompliance(
      makeAggregated({ packageDistribution: [pkg] }),
    );
    expect(result.compliant).toBe(true);
  });

  it('is non-compliant when an enforced package has a minor_overdue breach', () => {
    const pkg = createMockPackage('@my-org/internal', {
      releaseAge: createMockReleaseAge({
        worstLevel: 'minor_overdue',
        severity: 'error',
      }),
    });
    const result = computeCompliance(
      makeAggregated({ packageDistribution: [pkg] }),
    );
    expect(result.compliant).toBe(false);
    expect(result.releaseAgeViolations).toEqual([pkg]);
  });

  it('a minor_overdue on a warn-severity (not enforced) package does not affect compliance', () => {
    const pkg = createMockPackage('react', {
      releaseAge: createMockReleaseAge({
        worstLevel: 'minor_overdue',
        severity: 'warn',
      }),
    });
    const result = computeCompliance(
      makeAggregated({ packageDistribution: [pkg] }),
    );
    expect(result.compliant).toBe(true);
  });
});

describe('computeCompliance — status (#55)', () => {
  it("status is 'compliant' when there are no violations of any kind", () => {
    const result = computeCompliance(makeAggregated());
    expect(result.status).toBe('compliant');
    expect(result.compliant).toBe(true);
  });

  it("status is 'non-compliant' when an error-severity rule violation is present", () => {
    const violation: RuleViolation = {
      type: 'require_files',
      severity: 'error',
      patterns: ['.nvmrc'],
      matchedFiles: [],
    };
    const result = computeCompliance(
      makeAggregated({ ruleViolations: [violation] }),
    );
    expect(result.status).toBe('non-compliant');
    expect(result.compliant).toBe(false);
  });

  it("status is 'non-compliant' when an enforced package is overdue, regardless of any warn-severity rules present", () => {
    const pkg = createMockPackage('@my-org/internal', {
      releaseAge: createMockReleaseAge({
        worstLevel: 'major_overdue',
        severity: 'error',
      }),
    });
    const warnRule: RuleViolation = {
      type: 'require_files',
      severity: 'warn',
      patterns: ['.editorconfig'],
      matchedFiles: [],
    };
    const result = computeCompliance(
      makeAggregated({
        packageDistribution: [pkg],
        ruleViolations: [warnRule],
      }),
    );
    // Error trumps warn — an error-level release-age breach is non-compliant,
    // never merely a warning, even with warn-severity rules also present.
    expect(result.status).toBe('non-compliant');
  });

  it("status is 'warning' when only a warn-severity rule violation is present", () => {
    const violation: RuleViolation = {
      type: 'require_files',
      severity: 'warn',
      patterns: ['.editorconfig'],
      matchedFiles: [],
    };
    const result = computeCompliance(
      makeAggregated({ ruleViolations: [violation] }),
    );
    expect(result.status).toBe('warning');
    expect(result.compliant).toBe(true);
    expect(result.warningRuleViolations).toEqual([violation]);
  });

  it("status is 'warning' when only a warn-severity banned package violation is present", () => {
    const violation: BannedPackageViolation = {
      packageName: 'lodash',
      severity: 'warn',
    };
    const result = computeCompliance(
      makeAggregated({ bannedPackageViolations: [violation] }),
    );
    expect(result.status).toBe('warning');
    expect(result.compliant).toBe(true);
    expect(result.warningBannedPackageViolations).toEqual([violation]);
  });

  it("status stays 'compliant' for a mixed shape: info signal + non-enforced overdues + pending-only, no warn/error rules", () => {
    // Reproduces a mix that was wrongly demoted to Warning by consumers: an
    // `info` detect_files signal (Orbis), overdue react-* at severity 'warn'
    // (not enforced), and pending-only @acme-ui/* entries (worstLevel null).
    // None of these are warn-severity *rules* or *banned* packages, so the
    // official status must remain 'compliant'.
    const infoSignal: RuleViolation = {
      type: 'detect_files',
      severity: 'info',
      patterns: ['orbis.config.*'],
      matchedFiles: ['orbis.config.ts'],
    };
    const nonEnforcedOverdue = createMockPackage('react-instantsearch', {
      releaseAge: createMockReleaseAge({
        worstLevel: 'major_overdue',
        severity: 'warn',
      }),
    });
    const anotherNonEnforcedOverdue = createMockPackage('react-router-dom', {
      releaseAge: createMockReleaseAge({
        worstLevel: 'minor_overdue',
        severity: 'warn',
      }),
    });
    const pendingOnly = createMockPackage('@acme-ui/pulse', {
      releaseAge: createMockReleaseAge({
        worstLevel: null,
        severity: 'error',
        pendingUpgrade: {
          version: '2.0.0',
          semverBump: 'major',
          releasedDaysAgo: 3,
          thresholdDays: 30,
          daysRemaining: 27,
        },
      }),
    });

    const result = computeCompliance(
      makeAggregated({
        ruleViolations: [infoSignal],
        packageDistribution: [
          nonEnforcedOverdue,
          anotherNonEnforcedOverdue,
          pendingOnly,
        ],
      }),
    );

    expect(result.status).toBe('compliant');
    expect(result.compliant).toBe(true);
    expect(result.warningRuleViolations).toHaveLength(0);
    expect(result.warningBannedPackageViolations).toHaveLength(0);
    expect(result.releaseAgeViolations).toHaveLength(0);
  });
});
