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

const ROOT_DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];

/**
 * The names the root manifest actually declares, read from the lockfile's
 * own `packages[""]` entry.
 *
 * Depth in `packages` cannot answer this. npm hoists: a transitive
 * dependency with no version conflict is installed at
 * `node_modules/<name>`, exactly where a direct dependency lives, so
 * "depth 1" describes where a package ended up, not whether this repo
 * asked for it. Returns null when the lockfile records no root manifest —
 * then depth is the only signal there is.
 */
function declaredRootNames(lockData: {
  packages?: Record<string, unknown>;
}): Set<string> | null {
  const root = lockData.packages?.[''];
  if (typeof root !== 'object' || root === null) return null;

  const names = new Set<string>();
  for (const field of ROOT_DEPENDENCY_FIELDS) {
    const bucket = (root as Record<string, unknown>)[field];
    if (typeof bucket !== 'object' || bucket === null || Array.isArray(bucket))
      continue;
    for (const name of Object.keys(bucket)) names.add(name);
  }
  return names.size > 0 ? names : null;
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
          const declared = declaredRootNames(lockData);

          Object.entries(lockData.packages).forEach(
            ([pkgPath, pkgData]: [string, any]) => {
              if (!pkgPath || pkgPath === '') return;
              const version = pkgData?.version;
              if (!version) return;

              sawPackages = true;
              const pkgName = canonicalPackageName(pkgPath);
              acc.addVersion(pkgName, version);

              const atTopLevel = pkgPath.split('node_modules/').length <= 2;
              if (!atTopLevel) return;

              // A workspace entry ("packages/app") is part of the project
              // itself, not something hoisted into it, so it is root
              // regardless of what the manifest declares.
              const isWorkspace = !pkgPath.includes('node_modules/');
              // Without a declared set, depth is all there is (#94). With
              // one, it decides: npm's hoisting puts transitive packages at
              // the same depth as direct ones, and treating those as direct
              // made a repo look like it owned — and could be told to
              // remove — packages it never asked for.
              const isRoot =
                isWorkspace || declared === null || declared.has(pkgName);
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
