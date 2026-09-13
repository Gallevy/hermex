import { describe, expect, it } from 'vitest';
import {
  deriveOverdueTier,
  evaluateOutdatedPackages,
} from '../../src/rules/no-outdated-packages';
import type { ResolvedReleaseAgeRuleConfig } from '../../src/config/types';
import type { AvailableUpgrade } from '../../src/npm-registry/types';
import {
  createMockPackage,
  createMockReleaseAge,
} from '../helpers/mock-reports';

const THRESHOLDS = { patch: 30, minor: 45, major: 60 };

function upgrade(
  semverBump: AvailableUpgrade['semverBump'],
  version = '9.9.9',
): AvailableUpgrade {
  return {
    version,
    releasedDaysAgo: 10,
    breachReleasedDaysAgo: 400,
    semverBump,
    thresholdDays: THRESHOLDS[semverBump],
  };
}

function rule(
  severity: ResolvedReleaseAgeRuleConfig['severity'],
  patterns: string[] = ['**'],
  scope: 'root' | 'tree' = 'root',
): ResolvedReleaseAgeRuleConfig {
  return { severity, patterns, thresholds: THRESHOLDS, scope };
}

function overduePackage(
  name = 'acme',
  bump: AvailableUpgrade['semverBump'] = 'major',
) {
  return createMockPackage(name, {
    version: '1.0.0',
    releaseAge: createMockReleaseAge({
      measuredVersion: '1.0.0',
      upgrades: [upgrade(bump)],
    }),
  });
}

// The verdict is derived from the facts, never stored beside them (#189).
describe('deriveOverdueTier', () => {
  it('is null when no tier breached', () => {
    expect(deriveOverdueTier([])).toBeNull();
  });

  it('is major when any breached tier is a major bump', () => {
    expect(deriveOverdueTier([upgrade('minor'), upgrade('major')])).toBe(
      'major',
    );
  });

  it('is minor for a breached minor tier', () => {
    expect(deriveOverdueTier([upgrade('minor')])).toBe('minor');
  });

  // `OverdueTier` has no 'patch' member: the tier names how far the upgrade
  // moves you, and patch and minor are the same answer to "is this breaking".
  it('reports a breached patch tier as minor', () => {
    expect(deriveOverdueTier([upgrade('patch')])).toBe('minor');
  });

  // Order-independent: `upgrades` is sorted by release age, not by tier, so
  // a major sitting last must still win.
  it('does not depend on the order of upgrades', () => {
    expect(deriveOverdueTier([upgrade('major'), upgrade('patch')])).toBe(
      'major',
    );
    expect(deriveOverdueTier([upgrade('patch'), upgrade('major')])).toBe(
      'major',
    );
  });
});

describe('evaluateOutdatedPackages', () => {
  it('emits nothing when the rule is not configured for the repo', () => {
    expect(evaluateOutdatedPackages([overduePackage()], [])).toEqual([]);
  });

  it('emits nothing for a package with no breached tier', () => {
    const pkg = createMockPackage('acme', {
      version: '1.0.0',
      releaseAge: createMockReleaseAge({ upgrades: [] }),
    });
    expect(evaluateOutdatedPackages([pkg], [rule('error')])).toEqual([]);
  });

  it('emits nothing for a package the registry never answered for', () => {
    const pkg = createMockPackage('acme', { version: '1.0.0' });
    expect(evaluateOutdatedPackages([pkg], [rule('error')])).toEqual([]);
  });

  // The verdict, the measured version and the scope all ride on the
  // violation — this is the contract the Packages table joins against.
  it('carries the verdict, measured version and scope on the violation', () => {
    const violations = evaluateOutdatedPackages(
      [overduePackage()],
      [rule('error', ['**'], 'tree')],
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      ruleId: 'no-outdated-packages',
      severity: 'error',
      packageName: 'acme',
      measuredVersion: '1.0.0',
      overdueTier: 'major',
      scope: 'tree',
    });
  });

  // Severity comes from the governing entry, not from the facts. An 'off'
  // entry still leaves a full `releaseAge` on the package for the table to
  // render — it just never becomes a violation.
  it('stays silent for an off-severity entry while the facts survive', () => {
    const pkg = overduePackage();
    expect(evaluateOutdatedPackages([pkg], [rule('off')])).toEqual([]);
    expect(pkg.releaseAge?.upgrades).toHaveLength(1);
  });

  it.each(['error', 'warn', 'info'] as const)(
    'passes through %s severity from the governing entry',
    (severity) => {
      const violations = evaluateOutdatedPackages(
        [overduePackage()],
        [rule(severity)],
      );
      expect(violations[0].severity).toBe(severity);
    },
  );

  // Last match wins, the same ordering `resolveReleaseAgeRule` applies
  // everywhere else — a later entry governs the packages it names.
  it('lets a later entry govern a package the baseline also matches', () => {
    const violations = evaluateOutdatedPackages(
      [overduePackage('@acme/ui'), overduePackage('lodash')],
      [rule('warn', ['**']), rule('error', ['@acme/*'])],
    );

    const byName = (name: string) =>
      violations.find((v) => 'packageName' in v && v.packageName === name);
    expect(byName('@acme/ui')?.severity).toBe('error');
    expect(byName('lodash')?.severity).toBe('warn');
  });
});
