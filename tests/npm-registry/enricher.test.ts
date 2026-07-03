import { beforeEach, describe, expect, it, vi } from 'vitest';
import semver from 'semver';
import { enrichWithReleaseAge } from '../../src/npm-registry/enricher';
import { createMockPackage } from '../helpers/mock-reports';

// Mock the client module — no network in tests
vi.mock('../../src/npm-registry/client', () => ({
  fetchPackageInfo: vi.fn(),
}));

import { fetchPackageInfo } from '../../src/npm-registry/client';

const mockFetch = fetchPackageInfo as ReturnType<typeof vi.fn>;

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
        '6.0.0-alpha.0': daysAgo(2344),
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
