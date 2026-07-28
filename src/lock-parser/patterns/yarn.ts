import fs from 'fs';
import path from 'path';
import lockfile from '@yarnpkg/lockfile';
import {
  readAndParseLockfile,
  createResolutionAccumulator,
  type LockfileAdapter,
  type LockfileResolutionMap,
} from '../lock-file-adapter';
import { readPackageJson } from '../../rules/shared';

const ROOT_DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

function extractPackageName(key: string): string {
  if (key.startsWith('@')) {
    const match = key.match(/^(@[^@]+\/[^@]+)@/);
    return match ? match[1] : key;
  }
  const match = key.match(/^([^@]+)@/);
  return match ? match[1] : key;
}

/**
 * Merges every declared dependency range from the root package.json into a
 * single `name -> range` map, so a yarn.lock entry's exact key (`name@range`)
 * can be matched against it to find the root-resolved version — yarn.lock
 * itself retains no root/nested distinction, unlike npm's and pnpm's
 * lockfile formats (#57).
 */
function collectRootRanges(
  pkgJson: Record<string, unknown> | null,
): Record<string, string> {
  const ranges: Record<string, string> = {};
  if (!pkgJson) return ranges;

  for (const field of ROOT_DEPENDENCY_FIELDS) {
    const deps = pkgJson[field];
    if (!deps || typeof deps !== 'object') continue;
    for (const [name, range] of Object.entries(
      deps as Record<string, unknown>,
    )) {
      if (typeof range === 'string') ranges[name] = range;
    }
  }

  return ranges;
}

export class YarnLockfileAdapter implements LockfileAdapter {
  name = 'yarn';
  supportedVersions = ['v1', 'v2+'];

  detect(projectPath: string): string | null {
    const lockfilePath = path.join(projectPath, 'yarn.lock');
    return fs.existsSync(lockfilePath) ? lockfilePath : null;
  }

  resolve(lockFilePath: string, projectPath: string): LockfileResolutionMap {
    const rootRanges = collectRootRanges(readPackageJson(projectPath));

    return readAndParseLockfile(
      lockFilePath,
      (content) => {
        const parsed = lockfile.parse(content);

        if (parsed.type !== 'success') {
          console.warn('Warning: Failed to parse yarn.lock');
          return {};
        }

        const acc = createResolutionAccumulator();

        // `@yarnpkg/lockfile`'s parse() has already decoded the lockfile —
        // we only correlate its already-parsed keys against package.json
        // ranges here, not re-implementing any lockfile parsing ourselves.
        Object.entries(parsed.object).forEach(([key, value]: [string, any]) => {
          if (!value.version) return;
          const pkgName = extractPackageName(key);
          acc.addVersion(pkgName, value.version);

          const range = rootRanges[pkgName];
          if (range && key === `${pkgName}@${range}`) {
            acc.setRoot(pkgName, value.version);
          }
        });

        return acc.build();
      },
      {},
      'yarn.lock',
    );
  }
}
