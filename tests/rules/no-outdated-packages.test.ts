import { describe, expect, it } from 'vitest';
import {
  assessPackage,
  evaluateOutdatedPackages,
  releaseAgeConnection,
} from '../../src/rules/no-outdated-packages';
import type { ResolvedReleaseAgeRuleConfig } from '../../src/config/types';
import type { PackageReleases, SemverBump } from '../../src/npm-registry/types';
import {
  createMockCopy,
  createMockPackage,
  createMockRelease,
  createMockReleases,
} from '../helpers/mock-reports';

const THRESHOLDS = { patch: 30, minor: 45, major: 60 };
const ROOT = { thresholds: THRESHOLDS, scope: 'root' as const };
const TREE = { thresholds: THRESHOLDS, scope: 'tree' as const };

function rule(
  severity: ResolvedReleaseAgeRuleConfig['severity'],
  patterns: string[] = ['**'],
  scope: 'root' | 'tree' = 'root',
): ResolvedReleaseAgeRuleConfig {
  return { severity, patterns, thresholds: THRESHOLDS, scope };
}

/** One root copy at 1.0.0 with a single newer release. */
function withNewer(
  version: string,
  daysAgo: number,
  bump: SemverBump = 'major',
): PackageReleases {
  return createMockReleases({
    resolved: [
      createMockCopy('1.0.0', [createMockRelease(version, daysAgo, bump)]),
    ],
  });
}

describe('releaseAgeConnection', () => {
  it('passes through the connection fields', () => {
    expect(
      releaseAgeConnection({
        authToken: 'tok',
        cacheTtlMs: 1000,
        cacheDisabled: true,
      }),
    ).toEqual({ authToken: 'tok', cacheTtlMs: 1000, cacheDisabled: true });
  });

  it('leaves the optional fields undefined when the block omits them', () => {
    expect(releaseAgeConnection({ cacheDisabled: false })).toEqual({
      authToken: undefined,
      cacheTtlMs: undefined,
      cacheDisabled: false,
    });
  });
});

describe('assessPackage — tiers', () => {
  it('reports nothing overdue when every newer release is inside its window', () => {
    const assessment = assessPackage(withNewer('2.0.0', 10), ROOT);
    expect(assessment.overdueTier).toBeNull();
    expect(assessment.daysOverdue).toBe(0);
  });

  it('reports the major tier overdue past its threshold', () => {
    const assessment = assessPackage(withNewer('2.0.0', 100), ROOT);
    expect(assessment.overdueTier).toBe('major');
    expect(assessment.daysOverdue).toBe(40);
  });

  // `OverdueTier` has no 'patch' member: the tier names how far the upgrade
  // moves you, and patch and minor are the same answer to "is this breaking".
  it('reports a breached patch tier as minor', () => {
    const assessment = assessPackage(withNewer('1.0.1', 100, 'patch'), ROOT);
    expect(assessment.overdueTier).toBe('minor');
    expect(assessment.daysOverdue).toBe(70);
  });

  it('lets a major tier outrank a breached minor one', () => {
    const releases = createMockReleases({
      resolved: [
        createMockCopy('1.0.0', [
          createMockRelease('1.1.0', 100, 'minor'),
          createMockRelease('2.0.0', 200, 'major'),
        ]),
      ],
    });
    expect(assessPackage(releases, ROOT).overdueTier).toBe('major');
  });

  // A tier's breach is measured from its OLDEST waiting release, while the
  // version named is its newest — how long it has gone unclaimed, not how
  // old the thing you would adopt is (#24).
  it('measures days overdue from the oldest release in the tier', () => {
    const releases = createMockReleases({
      resolved: [
        createMockCopy('1.0.0', [
          createMockRelease('2.0.0', 400, 'major'),
          createMockRelease('2.5.0', 5, 'major'),
        ]),
      ],
    });
    const assessment = assessPackage(releases, ROOT);
    expect(assessment.daysOverdue).toBe(340);
    expect(assessment.target?.version).toBe('2.5.0');
  });
});

describe('assessPackage — target', () => {
  // The oldest still-in-window release: the most battle-tested thing you
  // could adopt and still be compliant (#21).
  it('recommends the oldest release still inside its window', () => {
    const releases = createMockReleases({
      resolved: [
        createMockCopy('1.0.0', [
          createMockRelease('2.0.0', 400, 'major'),
          createMockRelease('2.4.0', 50, 'major'),
          createMockRelease('2.5.0', 5, 'major'),
        ]),
      ],
    });
    const assessment = assessPackage(releases, ROOT);
    expect(assessment.target).toMatchObject({
      version: '2.4.0',
      semverBump: 'major',
    });
    expect(assessment.targetClearsBreach).toBe(true);
  });

  // No fallback to latest dressed up as a recommendation: when nothing
  // clears the breach, the target is simply the breached tier's newest and
  // `targetClearsBreach` says so (#26).
  it('falls back to the breached tier newest, flagged as not clearing', () => {
    const releases = createMockReleases({
      resolved: [
        createMockCopy('1.0.0', [
          createMockRelease('2.0.0', 400, 'major'),
          createMockRelease('2.5.0', 100, 'major'),
        ]),
      ],
    });
    const assessment = assessPackage(releases, ROOT);
    expect(assessment.target).toMatchObject({
      version: '2.5.0',
      semverBump: 'major',
    });
    expect(assessment.targetClearsBreach).toBe(false);
  });

  // The compliant target may live in a tier that never breached at all.
  it('crosses tiers to find a compliant target (#57)', () => {
    const releases = createMockReleases({
      resolved: [
        createMockCopy('0.3.30', [
          createMockRelease('0.5.7', 200, 'minor'),
          createMockRelease('1.0.0', 50, 'major'),
        ]),
      ],
    });
    const assessment = assessPackage(releases, ROOT);
    expect(assessment.target).toMatchObject({
      version: '1.0.0',
      semverBump: 'major',
    });
    expect(assessment.targetClearsBreach).toBe(true);
  });

  it('surfaces a coming-due upgrade only while nothing has breached', () => {
    const pending = assessPackage(withNewer('1.0.1', 20, 'patch'), ROOT);
    expect(pending.overdueTier).toBeNull();
    expect(pending.pendingUpgrade).toMatchObject({
      version: '1.0.1',
      daysRemaining: 10,
    });

    const breached = assessPackage(withNewer('2.0.0', 100), ROOT);
    expect(breached.pendingUpgrade).toBeUndefined();
  });
});

// Scope is applied here and nowhere upstream: the facts list every copy
// neutrally, so the same payload serves both settings (#57, #189).
describe('assessPackage — scope', () => {
  const rootCompliantNestedOverdue = createMockReleases({
    resolved: [
      createMockCopy('2.0.0', [createMockRelease('2.1.0', 5, 'minor')], true),
      createMockCopy(
        '1.0.0',
        [createMockRelease('2.0.0', 400, 'major')],
        false,
      ),
    ],
  });

  it('root: judges only the root copy, and files the nested breach as advisory', () => {
    const assessment = assessPackage(rootCompliantNestedOverdue, ROOT);
    expect(assessment.measuredVersion).toBe('2.0.0');
    expect(assessment.overdueTier).toBeNull();
    expect(assessment.advisoryBreaches).toEqual([
      { version: '1.0.0', tier: 'major' },
    ]);
  });

  it('tree: judges every copy, so the nested breach governs and nothing is advisory', () => {
    const assessment = assessPackage(rootCompliantNestedOverdue, TREE);
    expect(assessment.measuredVersion).toBe('1.0.0');
    expect(assessment.overdueTier).toBe('major');
    expect(assessment.advisoryBreaches).toEqual([]);
  });

  // The identical facts produce both answers above — which is the property
  // that lets `packages[]` stay policy-free.
  it('reads the same facts for both scopes', () => {
    expect(assessPackage(rootCompliantNestedOverdue, ROOT)).not.toEqual(
      assessPackage(rootCompliantNestedOverdue, TREE),
    );
  });

  // `scope: 'root'` on a package that is not a direct dependency has no
  // enforced baseline at all — it can never be mandatory (#62).
  it('root: a transitive-only package is never overdue, only advisory', () => {
    const releases = createMockReleases({
      resolved: [
        createMockCopy('1.0.0', [createMockRelease('2.0.0', 400)], false),
      ],
    });
    const assessment = assessPackage(releases, ROOT);
    expect(assessment.overdueTier).toBeNull();
    expect(assessment.advisoryBreaches).toEqual([
      { version: '1.0.0', tier: 'major' },
    ]);
  });
});

describe('evaluateOutdatedPackages', () => {
  const overdue = () =>
    createMockPackage('acme', {
      version: '1.0.0',
      releases: withNewer('2.0.0', 100),
    });

  it('emits nothing when the rule is not configured for the repo', () => {
    expect(evaluateOutdatedPackages([overdue()], [])).toEqual([]);
  });

  it('emits nothing for a package the registry never answered for', () => {
    const pkg = createMockPackage('acme', { version: '1.0.0' });
    expect(evaluateOutdatedPackages([pkg], [rule('error')])).toEqual([]);
  });

  it('emits nothing for a package with no breached tier', () => {
    const pkg = createMockPackage('acme', {
      version: '1.0.0',
      releases: withNewer('2.0.0', 10),
    });
    expect(evaluateOutdatedPackages([pkg], [rule('error')])).toEqual([]);
  });

  it('carries the verdict, measured version, days overdue and scope', () => {
    const violations = evaluateOutdatedPackages(
      [overdue()],
      [rule('error', ['**'], 'tree')],
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      ruleId: 'no-outdated-packages',
      severity: 'error',
      packageName: 'acme',
      measuredVersion: '1.0.0',
      overdueTier: 'major',
      daysOverdue: 40,
      scope: 'tree',
    });
  });

  // Severity comes from the governing entry, never from the facts. An 'off'
  // entry still leaves full release facts on the package for the table.
  it('stays silent for an off-severity entry while the facts survive', () => {
    const pkg = overdue();
    expect(evaluateOutdatedPackages([pkg], [rule('off')])).toEqual([]);
    expect(pkg.releases?.resolved[0].newer).toHaveLength(1);
  });

  it.each(['error', 'warn', 'info'] as const)(
    'passes through %s severity from the governing entry',
    (severity) => {
      const violations = evaluateOutdatedPackages(
        [overdue()],
        [rule(severity)],
      );
      expect(violations[0].severity).toBe(severity);
    },
  );

  // Last match wins, the same ordering `resolveReleaseAgeRule` applies
  // everywhere else — a later entry governs the packages it names.
  it('lets a later entry govern a package the baseline also matches', () => {
    const packages = [
      createMockPackage('@acme/ui', {
        version: '1.0.0',
        releases: withNewer('2.0.0', 100),
      }),
      createMockPackage('lodash', {
        version: '1.0.0',
        releases: withNewer('2.0.0', 100),
      }),
    ];
    const violations = evaluateOutdatedPackages(packages, [
      rule('warn', ['**']),
      rule('error', ['@acme/*']),
    ]);

    const byName = (name: string) =>
      violations.find((v) => 'packageName' in v && v.packageName === name);
    expect(byName('@acme/ui')?.severity).toBe('error');
    expect(byName('lodash')?.severity).toBe('warn');
  });
});
