import type { RegistryPackageInfo } from './types';

export async function fetchPackageInfo(
  name: string,
  registryUrl: string,
  authToken?: string,
): Promise<RegistryPackageInfo | null> {
  const url = `${registryUrl.replace(/\/$/, '')}/${encodeURIComponent(name).replace('%40', '@')}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = (await response.json()) as RegistryPackageInfo;
    return data;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
