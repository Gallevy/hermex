import fs from 'fs';
import path from 'path';
import lockfile from '@yarnpkg/lockfile';
import {
  readAndParseLockfile,
  toSortedMultiVersionMap,
  type LockfileAdapter,
  type MultiVersionMap,
} from '../lock-file-adapter';

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
    return readAndParseLockfile(
      lockFilePath,
      (content) => {
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
      },
      {},
      'yarn.lock',
    );
  }

  parseMultiVersion(lockFilePath: string): MultiVersionMap {
    return readAndParseLockfile(
      lockFilePath,
      (content) => {
        const parsed = lockfile.parse(content);

        if (parsed.type !== 'success') {
          throw new Error('Failed to parse yarn.lock');
        }

        const versionSets: Record<string, Set<string>> = {};

        Object.entries(parsed.object).forEach(([key, value]: [string, any]) => {
          if (!value.version) return;
          const pkgName = extractPackageName(key);
          if (!versionSets[pkgName]) versionSets[pkgName] = new Set();
          versionSets[pkgName].add(value.version);
        });

        return toSortedMultiVersionMap(versionSets);
      },
      {},
      'yarn.lock (multi-version)',
    );
  }
}
