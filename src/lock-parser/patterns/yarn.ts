import fs from 'fs';
import path from 'path';
import lockfile from '@yarnpkg/lockfile';
import type { LockfileAdapter, MultiVersionMap } from '../lock-file-adapter';

function extractPackageName(key: string): string {
  if (key.startsWith('@')) {
    const match = key.match(/^(@[^@]+\/[^@]+)@/);
    return match ? match[1] : key;
  }
  const match = key.match(/^([^@]+)@/);
  return match ? match[1] : key;
}

export class YarnLockfileAdapter implements LockfileAdapter {
  name = 'yarn';
  supportedVersions = ['v1', 'v2+'];

  detect(projectPath: string): string | null {
    const lockfilePath = path.join(projectPath, 'yarn.lock');
    return fs.existsSync(lockfilePath) ? lockfilePath : null;
  }

  parse(lockFilePath: string): Record<string, string> {
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      const parsed = lockfile.parse(content);

      if (parsed.type !== 'success') {
        console.warn('Warning: Failed to parse yarn.lock');
        return {};
      }

      const versions: Record<string, string> = {};

      Object.entries(parsed.object).forEach(([key, value]: [string, any]) => {
        const pkgName = extractPackageName(key);

        if (value.version && !versions[pkgName]) {
          versions[pkgName] = value.version;
        }
      });

      return versions;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Could not parse yarn.lock: ${message}`);
      return {};
    }
  }

  parseMultiVersion(lockFilePath: string): MultiVersionMap {
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      const parsed = lockfile.parse(content);

      if (parsed.type !== 'success') {
        return {};
      }

      const versionSets: Record<string, Set<string>> = {};

      Object.entries(parsed.object).forEach(([key, value]: [string, any]) => {
        if (!value.version) return;
        const pkgName = extractPackageName(key);
        if (!versionSets[pkgName]) versionSets[pkgName] = new Set();
        versionSets[pkgName].add(value.version);
      });

      const result: MultiVersionMap = {};
      for (const [pkg, vers] of Object.entries(versionSets)) {
        result[pkg] = Array.from(vers).sort();
      }
      return result;
    } catch {
      return {};
    }
  }
}
