import fs from 'fs';
import path from 'path';
import {
  readAndParseLockfile,
  createResolutionAccumulator,
  type LockfileAdapter,
  type LockfileResolutionMap,
} from '../lock-file-adapter';

function canonicalPackageName(pkgPath: string): string {
  // pkgPath examples:
  //   "node_modules/react"
  //   "node_modules/@scope/pkg"
  //   "node_modules/react/node_modules/scheduler"
  //   "node_modules/@scope/a/node_modules/@scope/b"
  // We want the last segment after the last "node_modules/"
  const idx = pkgPath.lastIndexOf('node_modules/');
  if (idx === -1) return pkgPath;
  return pkgPath.slice(idx + 'node_modules/'.length);
}

export class NpmLockfileAdapter implements LockfileAdapter {
  name = 'npm';
  supportedVersions = ['v2', 'v3'];

  detect(projectPath: string): string | null {
    const lockfilePath = path.join(projectPath, 'package-lock.json');
    return fs.existsSync(lockfilePath) ? lockfilePath : null;
  }

  resolve(lockFilePath: string): LockfileResolutionMap {
    return readAndParseLockfile(
      lockFilePath,
      (content) => {
        const lockData = JSON.parse(content);
        const acc = createResolutionAccumulator();
        let sawPackages = false;

        // npm v7+ uses "packages" field (lockfileVersion 2, 3). Every entry
        // (any depth) contributes to allVersions; only depth-1 entries (no
        // nested "node_modules/" in the path) are the root/direct
        // dependency's resolution.
        if (lockData.packages) {
          Object.entries(lockData.packages).forEach(
            ([pkgPath, pkgData]: [string, any]) => {
              if (!pkgPath || pkgPath === '') return;
              const version = pkgData?.version;
              if (!version) return;

              sawPackages = true;
              const pkgName = canonicalPackageName(pkgPath);
              acc.addVersion(pkgName, version);

              const isRoot = pkgPath.split('node_modules/').length <= 2;
              if (isRoot) acc.setRoot(pkgName, version);
            },
          );
        }

        // npm v6 uses "dependencies" field (fallback). Keyed strictly by
        // real package name (not a depth-prefixed compound key) so nested
        // copies of the same package share one allVersions entry.
        if (lockData.dependencies && !sawPackages) {
          function extractVersions(deps: any, depth = 0): void {
            Object.entries(deps).forEach(([name, data]: [string, any]) => {
              if (data.version) {
                acc.addVersion(name, data.version);
                if (depth === 0) acc.setRoot(name, data.version);
              }
              if (data.dependencies) {
                extractVersions(data.dependencies, depth + 1);
              }
            });
          }
          extractVersions(lockData.dependencies);
        }

        return acc.build();
      },
      {},
      'package-lock.json',
    );
  }
}
