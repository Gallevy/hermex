import { describe, expect, it } from 'vitest';
import type { RuleViolation } from '../../src/rules/evaluator';
import { stripAnsi } from '../../src/utils/severity-format';
import {
  collectPackageStatuses,
  describeStatusDetails,
  formatPackageStatus,
} from '../../src/utils/package-status';
import {
  createMockPackage,
  createMockDeprecatedViolation,
} from '../helpers/mock-reports';

/** A no-packages hit, the shape `detectForbiddenPackages` emits (#77). */
function forbidViolation(
  packageName: string,
  severity: RuleViolation['severity'] = 'error',
  message?: string,
): RuleViolation {
  return {
    ruleId: 'no-packages',
    severity,
    patterns: [packageName],
    message,
    packageName,
  };
}

describe('package status badges', () => {
  it('contributes nothing for a package no package rule flagged', () => {
    const pkg = createMockPackage('react');
    expect(collectPackageStatuses(pkg, [])).toEqual([]);
    expect(formatPackageStatus([])).toBe('');
  });

  it('badges a banned package as forbidden at the severity of its own violation', () => {
    const pkg = createMockPackage('moment');
    const statuses = collectPackageStatuses(pkg, [
      forbidViolation('moment', 'warn'),
    ]);
    expect(statuses).toEqual([
      { ruleId: 'no-packages', severity: 'warn', label: 'forbidden' },
    ]);
    expect(stripAnsi(formatPackageStatus(statuses))).toBe('🟡 forbidden');
  });

  // The single badge #86 asked for: one rule, one word, severity in the
  // icon. [RESTRICTED] named a config concept that never existed, and
  // collapsed warn and info into the same string.
  it('uses the same word at every severity, varying only the icon', () => {
    const pkg = createMockPackage('moment');
    const render = (severity: RuleViolation['severity']) =>
      stripAnsi(
        formatPackageStatus(
          collectPackageStatuses(pkg, [forbidViolation('moment', severity)]),
        ),
      );
    expect(render('error')).toBe('🔴 forbidden');
    expect(render('warn')).toBe('🟡 forbidden');
    expect(render('info')).toBe('🔵 forbidden');
  });

  it('badges a deprecated package and carries the publisher notice as detail', () => {
    const pkg = createMockPackage('request', {
      deprecated: 'request has been deprecated',
    });
    const statuses = collectPackageStatuses(pkg, [
      createMockDeprecatedViolation('request', {
        deprecated: 'request has been deprecated',
      }),
    ]);
    expect(statuses[0].label).toBe('deprecated');
    expect(statuses[0].severity).toBe('info');
    expect(statuses[0].detail).toBe('request has been deprecated');
    expect(stripAnsi(formatPackageStatus(statuses))).toBe('🔵 deprecated');
  });

  it('renders both badges in contributor order when a package is banned and deprecated', () => {
    const pkg = createMockPackage('moment', { deprecated: 'use dayjs' });
    const statuses = collectPackageStatuses(pkg, [
      createMockDeprecatedViolation('moment', { deprecated: 'use dayjs' }),
      forbidViolation('moment', 'error'),
    ]);
    // Declaration order in PACKAGE_STATUS_CONTRIBUTORS, not the order the
    // violations happened to arrive in.
    expect(stripAnsi(formatPackageStatus(statuses))).toBe(
      '🔴 forbidden 🔵 deprecated',
    );
  });

  it('never joins on a plugin finding, whose rule-id space is its own (#102)', () => {
    const pkg = createMockPackage('moment');
    const pluginFinding = {
      ruleId: 'no-packages',
      severity: 'error' as const,
      patterns: ['moment'],
      packageName: 'moment',
      message: 'from a plugin',
      plugin: 'some-plugin',
    } as unknown as RuleViolation;
    expect(collectPackageStatuses(pkg, [pluginFinding])).toEqual([]);
  });

  it('says nothing about a package the deprecation rule exempted', () => {
    // `severity: 'off'` is resolved away into "no violation", so there is
    // no badge at all — the fact stays on the package for JSON consumers.
    const pkg = createMockPackage('moment', { deprecated: 'use dayjs' });
    expect(collectPackageStatuses(pkg, [])).toEqual([]);
  });
});

describe('describeStatusDetails', () => {
  it('returns nothing for badges that carry no long-form context', () => {
    const pkg = createMockPackage('moment');
    const statuses = collectPackageStatuses(pkg, [forbidViolation('moment')]);
    expect(describeStatusDetails(statuses)).toEqual([]);
  });

  it('phrases a deprecation notice as a continuation of its own badge', () => {
    const pkg = createMockPackage('request', {
      deprecated: 'request has been deprecated',
    });
    const statuses = collectPackageStatuses(pkg, [
      createMockDeprecatedViolation('request', {
        deprecated: 'request has been deprecated',
      }),
    ]);
    expect(describeStatusDetails(statuses)).toEqual([
      'deprecated: request has been deprecated',
    ]);
  });
});
