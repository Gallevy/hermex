import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPackageInfo } from '../../src/npm-registry/client';

const REGISTRY = 'https://registry.npmjs.org';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchPackageInfo', () => {
  it('requests the encoded package name from the registry', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'react', time: {}, versions: {} }),
    });

    await fetchPackageInfo('react', REGISTRY);

    expect(fetchMock).toHaveBeenCalledWith(
      `${REGISTRY}/react`,
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('encodes scoped package names but keeps the leading @ literal', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: '@company/ui', time: {}, versions: {} }),
    });

    await fetchPackageInfo('@company/ui', REGISTRY);

    expect(fetchMock).toHaveBeenCalledWith(
      `${REGISTRY}/@company%2Fui`,
      expect.anything(),
    );
  });

  it('sends a Bearer authorization header when an authToken is provided', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'react', time: {}, versions: {} }),
    });

    await fetchPackageInfo('react', REGISTRY, 'secret-token');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer secret-token',
        },
      }),
    );
  });

  it('returns null on a non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    const result = await fetchPackageInfo('react', REGISTRY);
    expect(result).toBeNull();
  });

  it('returns null when the fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network error'));
    const result = await fetchPackageInfo('react', REGISTRY);
    expect(result).toBeNull();
  });
});
