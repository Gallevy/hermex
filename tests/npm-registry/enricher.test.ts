import { beforeEach, describe, expect, it, vi } from 'vitest';
import semver from 'semver';
import { enrichWithReleaseAge } from '../../src/npm-registry/enricher';
import { createMockPackage } from '../helpers/mock-reports';

// Mock the cache module — no network or disk I/O in tests
vi.mock('../../src/npm-registry/cache', () => ({
  getPackageInfo: vi.fn(),
}));

import { getPackageInfo } from '../../src/npm-registry/cache';

const mockFetch = getPackageInfo as ReturnType<typeof vi.fn>;

const DEFAULT_THRESHOLDS = { patch: 30, minor: 45, major: 60 };
const BASE_CONFIG = {
  enabled: true,
  registry: 'https://registry.npmjs.org',
  thresholds: DEFAULT_THRESHOLDS,
  enforceOn: [],
};

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('enrichWithReleaseAge — skipped packages', () => {
  it('skips packages with no version', async () => {
    const pkg = createMockPackage('react', { version: null });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(enriched[0].releaseAge).toBeUndefined();
  });

  it('skips internal packages', async () => {
    const pkg = createMockPackage('@company/ui', {
      internal: true,
      version: '1.0.0',
    });
    await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('increments skipped counter when registry returns null', async () => {
    const pkg = createMockPackage('react', { version: '18.0.0' });
    mockFetch.mockResolvedValueOnce(null);
    const { skipped } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(skipped).toBe(1);
  });

  it('increments skipped counter when registry returns no time field', async () => {
    const pkg = createMockPackage('react', { version: '18.0.0' });
    mockFetch.mockResolvedValueOnce({
      name: 'react',
      time: null,
      versions: {},
    });
    const { skipped } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(skipped).toBe(1);
  });
});

describe('enrichWithReleaseAge — upgrade detection', () => {
  it('no upgrade when all newer versions are within threshold', async () => {
    const pkg = createMockPackage('react', { version: '18.0.0' });
    mockFetch.mockResolvedValueOnce({
      name: 'react',
      time: { '18.0.0': daysAgo(100), '18.0.1': daysAgo(10) },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.worstLevel).toBeNull();
    expect(enriched[0].releaseAge?.upgrades).toHaveLength(0);
  });

  it('detects needs_upgrade when patch version exceeds threshold', async () => {
    const pkg = createMockPackage('react', { version: '18.0.0' });
    mockFetch.mockResolvedValueOnce({
      name: 'react',
      time: { '18.0.0': daysAgo(200), '18.0.1': daysAgo(35) },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.worstLevel).toBe('needs_upgrade');
    expect(enriched[0].releaseAge?.upgrades[0].semverBump).toBe('patch');
  });

  it('detects mandatory_upgrade when major version exceeds threshold', async () => {
    const pkg = createMockPackage('react', { version: '17.0.0' });
    mockFetch.mockResolvedValueOnce({
      name: 'react',
      time: { '17.0.0': daysAgo(500), '18.0.0': daysAgo(90) },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.worstLevel).toBe('mandatory_upgrade');
  });

  it('surfaces deprecation notice from versions field', async () => {
    const pkg = createMockPackage('old-pkg', { version: '1.0.0' });
    mockFetch.mockResolvedValueOnce({
      name: 'old-pkg',
      time: { '1.0.0': daysAgo(500) },
      versions: { '1.0.0': { deprecated: 'Use new-pkg instead' } },
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.deprecated).toBe('Use new-pkg instead');
  });
});

describe('enrichWithReleaseAge — batching', () => {
  it('processes multiple packages and returns all enriched', async () => {
    const packages = [
      createMockPackage('react', { version: '18.0.0' }),
      createMockPackage('lodash', { version: '4.17.0' }),
    ];
    mockFetch.mockResolvedValue({
      name: 'pkg',
      time: { created: daysAgo(500), modified: daysAgo(1) },
      versions: {},
    });
    const { enriched, skipped } = await enrichWithReleaseAge(
      packages,
      BASE_CONFIG,
    );
    expect(enriched).toHaveLength(2);
    expect(skipped).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('enrichWithReleaseAge — latest version reporting (#14)', () => {
  it('surfaces the newest stable release per tier, not the original alpha/rc', async () => {
    const pkg = createMockPackage('react-router-dom', { version: '5.3.4' });
    mockFetch.mockResolvedValueOnce({
      name: 'react-router-dom',
      time: {
        '5.3.4': daysAgo(2000),
        '6.0.0': daysAgo(90),
        '6.30.1-rc.0': daysAgo(5),
        '6.30.1': daysAgo(12),
      },
      'dist-tags': { latest: '6.30.1' },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    const upgrade = enriched[0].releaseAge?.upgrades.find(
      (u) => u.semverBump === 'major',
    );
    expect(upgrade?.version).toBe('6.30.1');
    expect(upgrade?.releasedDaysAgo).toBe(12);
    expect(upgrade?.isLatest).toBe(true);
  });

  it('reflects dist-tags.latest exactly via latestVersion/latestReleasedDaysAgo', async () => {
    const pkg = createMockPackage('lucide-react', { version: '0.545.0' });
    mockFetch.mockResolvedValueOnce({
      name: 'lucide-react',
      time: {
        '0.545.0': daysAgo(300),
        '1.0.0-rc.0': daysAgo(104),
        '1.2.0': daysAgo(2),
      },
      'dist-tags': { latest: '1.2.0' },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.latestVersion).toBe('1.2.0');
    expect(enriched[0].releaseAge?.latestReleasedDaysAgo).toBe(2);
  });

  it('latestVersion is always >= any version in upgrades (semver order)', async () => {
    const pkg = createMockPackage('react', { version: '17.0.0' });
    mockFetch.mockResolvedValueOnce({
      name: 'react',
      time: {
        '17.0.0': daysAgo(900),
        '18.0.0': daysAgo(500),
        '19.0.0': daysAgo(90),
      },
      'dist-tags': { latest: '19.0.0' },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    const entry = enriched[0].releaseAge!;
    for (const upgrade of entry.upgrades) {
      expect(semver.gte(entry.latestVersion!, upgrade.version)).toBe(true);
    }
  });
});

describe('enrichWithReleaseAge — prerelease exclusion (#20)', () => {
  it('minCompliantVersion skips a prerelease even when it is the most recent qualifying version', async () => {
    const pkg = createMockPackage('@guestyci/localize', { version: '4.1.12' });
    mockFetch.mockResolvedValueOnce({
      name: '@guestyci/localize',
      time: {
        '4.1.12': daysAgo(200),
        '4.1.16-alpha.218.0': daysAgo(5),
        '4.1.16': daysAgo(10),
      },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.minCompliantVersion).toBe('4.1.16');
    expect(enriched[0].releaseAge?.minCompliantReleasedDaysAgo).toBe(10);
  });

  it('upgrades[] never targets a prerelease as the newest-in-tier version', async () => {
    const pkg = createMockPackage('react', { version: '18.0.0' });
    mockFetch.mockResolvedValueOnce({
      name: 'react',
      time: {
        '18.0.0': daysAgo(200),
        '18.0.1': daysAgo(40),
        '18.0.2-alpha.0': daysAgo(5),
      },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    const upgrade = enriched[0].releaseAge?.upgrades.find(
      (u) => u.semverBump === 'patch',
    );
    expect(upgrade?.version).toBe('18.0.1');
  });

  it('does not fall back to a prerelease when no stable version is within threshold', async () => {
    const pkg = createMockPackage('react', { version: '18.0.0' });
    mockFetch.mockResolvedValueOnce({
      name: 'react',
      time: {
        '18.0.0': daysAgo(200),
        '18.0.1-alpha.0': daysAgo(5),
      },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.minCompliantVersion).toBeUndefined();
    expect(enriched[0].releaseAge?.minCompliantReleasedDaysAgo).toBeUndefined();
  });
});

describe('enrichWithReleaseAge — minCompliantVersion for all bump tiers (#21)', () => {
  it('finds a compliant release inside an intermediate major line, not just the latest', async () => {
    // Mirrors the @guestyci/foundation example from the issue: installed
    // 10.x. 11.0.0 is old enough (400d) to breach the 60-day major
    // threshold and drive worstLevel to mandatory_upgrade; 12.0.0 (55d) is
    // still within that threshold and should become minCompliantVersion —
    // the whole point of #21 is that this doesn't have to be the newest
    // release (13.5.5, 10d) to count as compliant.
    const pkg = createMockPackage('@guestyci/foundation', {
      version: '10.0.43',
    });
    mockFetch.mockResolvedValueOnce({
      name: '@guestyci/foundation',
      time: {
        '10.0.43': daysAgo(900),
        '11.0.0': daysAgo(400),
        '12.0.0': daysAgo(55),
        '13.5.5': daysAgo(10),
      },
      'dist-tags': { latest: '13.5.5' },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.worstLevel).toBe('mandatory_upgrade');
    expect(enriched[0].releaseAge?.minCompliantVersion).toBe('12.0.0');
    expect(enriched[0].releaseAge?.minCompliantReleasedDaysAgo).toBe(55);
  });

  it('leaves minCompliantVersion undefined when every major-line candidate has already aged past the threshold', async () => {
    const pkg = createMockPackage('react', { version: '17.0.0' });
    mockFetch.mockResolvedValueOnce({
      name: 'react',
      time: {
        '17.0.0': daysAgo(900),
        '18.0.0': daysAgo(90), // the only candidate, and it's past the 60-day threshold
      },
      'dist-tags': { latest: '18.0.0' },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.worstLevel).toBe('mandatory_upgrade');
    expect(enriched[0].releaseAge?.minCompliantVersion).toBeUndefined();
  });

  it('prefers the oldest still-compliant major-line release over a newer compliant one', async () => {
    const pkg = createMockPackage('@guestyci/arc', { version: '0.15.1' });
    mockFetch.mockResolvedValueOnce({
      name: '@guestyci/arc',
      time: {
        '0.15.1': daysAgo(900),
        '1.0.0': daysAgo(400), // breaches the 60-day threshold, drives mandatory_upgrade
        '1.5.0': daysAgo(55), // compliant, oldest of the compliant set — should win
        '1.10.0': daysAgo(30), // compliant, but newer than 1.5.0
        '1.17.1': daysAgo(5), // latest, compliant, newest of all
      },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.worstLevel).toBe('mandatory_upgrade');
    expect(enriched[0].releaseAge?.minCompliantVersion).toBe('1.5.0');
    expect(enriched[0].releaseAge?.minCompliantReleasedDaysAgo).toBe(55);
  });

  it('finds a compliant release for a minor-only bump (previously unhandled — no bug report, but same gap)', async () => {
    const pkg = createMockPackage('some-lib', { version: '2.1.0' });
    mockFetch.mockResolvedValueOnce({
      name: 'some-lib',
      time: {
        '2.1.0': daysAgo(300),
        '2.5.0': daysAgo(50), // breaches the 45-day minor threshold, drives needs_upgrade
        '2.3.0': daysAgo(40), // within the 45-day minor threshold — compliant
      },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.worstLevel).toBe('needs_upgrade');
    expect(enriched[0].releaseAge?.minCompliantVersion).toBe('2.3.0');
    expect(enriched[0].releaseAge?.minCompliantReleasedDaysAgo).toBe(40);
  });

  it('minCompliantVersion can come from whichever tier has the oldest compliant candidate, spanning tiers', async () => {
    // A minor candidate at 40d (within its 45-day threshold) and a major
    // candidate at 55d (within its 60-day threshold) are both compliant;
    // the major one is older overall (55 > 40) and should win, even though
    // it's a different tier from the minor candidate. 3.0.0 at 400d is
    // there only to breach the major threshold and give this scenario a
    // realistic worstLevel.
    const pkg = createMockPackage('mixed-tier-lib', { version: '1.0.0' });
    mockFetch.mockResolvedValueOnce({
      name: 'mixed-tier-lib',
      time: {
        '1.0.0': daysAgo(900),
        '1.5.0': daysAgo(40), // minor, compliant
        '2.0.0': daysAgo(55), // major, compliant, oldest compliant overall — should win
        '3.0.0': daysAgo(400), // major, breaches the threshold, drives mandatory_upgrade
      },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], BASE_CONFIG);
    expect(enriched[0].releaseAge?.worstLevel).toBe('mandatory_upgrade');
    expect(enriched[0].releaseAge?.minCompliantVersion).toBe('2.0.0');
    expect(enriched[0].releaseAge?.minCompliantReleasedDaysAgo).toBe(55);
  });

  it('respects thresholds.minor === false by never treating minor candidates as compliant', async () => {
    const pkg = createMockPackage('some-lib', { version: '2.1.0' });
    mockFetch.mockResolvedValueOnce({
      name: 'some-lib',
      time: {
        '2.1.0': daysAgo(300),
        '2.3.0': daysAgo(40),
      },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge([pkg], {
      ...BASE_CONFIG,
      thresholds: { ...DEFAULT_THRESHOLDS, minor: false },
    });
    expect(enriched[0].releaseAge?.minCompliantVersion).toBeUndefined();
  });
});

describe('enrichWithReleaseAge — enforceOn severity scoping (#18)', () => {
  it('marks matched packages error and everything else warn when enforceOn is set', async () => {
    const packages = [
      createMockPackage('@my-org/internal-pkg', { version: '1.0.0' }),
      createMockPackage('react', { version: '17.0.0' }),
    ];
    mockFetch.mockResolvedValue({
      name: 'pkg',
      time: { '2.0.0': daysAgo(90) },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge(packages, {
      ...BASE_CONFIG,
      enforceOn: ['@my-org/*'],
    });
    const internal = enriched.find(
      (p) => p.packageName === '@my-org/internal-pkg',
    );
    const external = enriched.find((p) => p.packageName === 'react');
    expect(internal?.releaseAge?.severity).toBe('error');
    expect(external?.releaseAge?.severity).toBe('warn');
  });

  it('defaults everything to error severity when enforceOn is not set', async () => {
    const packages = [
      createMockPackage('@my-org/internal-pkg', { version: '1.0.0' }),
      createMockPackage('react', { version: '17.0.0' }),
    ];
    mockFetch.mockResolvedValue({
      name: 'pkg',
      time: { '2.0.0': daysAgo(90) },
      versions: {},
    });
    const { enriched } = await enrichWithReleaseAge(packages, BASE_CONFIG);
    for (const pkg of enriched) {
      expect(pkg.releaseAge?.severity).toBe('error');
    }
  });
});
