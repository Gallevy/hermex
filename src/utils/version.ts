import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

let cachedVersion: string | undefined;

/**
 * Walks up from `dir` to find the nearest package.json.
 * Needed because this module's own path differs between the tsdown-bundled
 * single-file `dist/cli.mjs` and the unbundled source used by tests.
 */
function findPackageJson(dir: string): string {
  let current = dir;
  while (true) {
    const candidate = path.join(current, 'package.json');
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Could not locate package.json above ${dir}`);
    }
    current = parent;
  }
}

export function getVersion(): string {
  if (cachedVersion) return cachedVersion;

  const dir = path.dirname(fileURLToPath(import.meta.url));
  const pkgPath = findPackageJson(dir);
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };

  cachedVersion = pkg.version;
  return cachedVersion;
}
