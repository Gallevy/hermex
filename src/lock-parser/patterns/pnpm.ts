import fs from 'fs';
import path from 'path';
import { load } from 'js-yaml';
import {
  parse as parseDependencyPath,
  removeSuffix,
} from '@pnpm/dependency-path';
import {
  readAndParseLockfile,
  createResolutionAccumulator,
  type LockfileAdapter,
  type LockfileResolutionMap,
} from '../lock-file-adapter';

function parsePackageKey(
  rawKey: string,
): { name: string; version: string } | null {
  const key = rawKey.startsWith('/') ? rawKey.slice(1) : rawKey;

  const parsed = parseDependencyPath(key);
  if (parsed.name && parsed.version) {
    return { name: parsed.name, version: parsed.version };
  }

  // Legacy pnpm v5/v6 slash-separated format (e.g. "/@babel/core/7.22.5"),
  // which @pnpm/dependency-path's `parse` — built for the newer
  // `name@version(...)` scheme — doesn't recognize.
  const slashMatch = key.match(/^(.+?)\/(\d+\.\d+\.\d+.*)$/);
  if (slashMatch) return { name: slashMatch[1], version: slashMatch[2] };

  return null;
}

export class PnpmLockfileAdapter implements LockfileAdapter {
  name = 'pnpm';
  supportedVersions = ['v5', 'v6', 'v9'];

  detect(projectPath: string): string | null {
    const lockfilePath = path.join(projectPath, 'pnpm-lock.yaml');
    return fs.existsSync(lockfilePath) ? lockfilePath : null;
  }

  resolve(lockFilePath: string): LockfileResolutionMap {
    return readAndParseLockfile(
      lockFilePath,
      (content) => {
        const lockData = load(content) as any;
        const acc = createResolutionAccumulator();

        // Every resolved copy anywhere in the lockfile (v6+ flat "packages"
        // key namespace) — this is allVersions, regardless of scope.
        if (lockData.packages) {
          Object.keys(lockData.packages).forEach((key) => {
            const parsed = parsePackageKey(key);
            if (!parsed) return;
            acc.addVersion(parsed.name, parsed.version);
          });
        }

        // Root resolution: pnpm v9+ "importers" field is authoritative —
        // the root workspace importer's own resolved version.
        let hasImporterRoot = false;
        const rootImporter = lockData.importers?.['.'];
        if (rootImporter) {
          for (const depsField of ['dependencies', 'devDependencies']) {
            const deps = rootImporter[depsField];
            if (!deps) continue;
            for (const [name, data] of Object.entries(deps)) {
              if (
                typeof data === 'object' &&
                data !== null &&
                'version' in data
              ) {
                const version = removeSuffix((data as any).version);
                acc.setRoot(name, version);
                acc.addVersion(name, version);
                hasImporterRoot = true;
              }
            }
          }
        }

        // Legacy pnpm v5/v6-8 lockfiles have no "importers" field at all —
        // these formats don't retain a root/nested distinction, so whatever
        // single resolution they produce is treated as root too (accepted
        // gap, documented).
        if (!hasImporterRoot) {
          // pnpm v6-8 uses "packages" field
          if (lockData.packages) {
            Object.keys(lockData.packages).forEach((key) => {
              // Key format: "/@babel/core/7.22.5" or "/package/1.0.0"
              const match = key.match(/\/(.+?)\/(\d+\.\d+\.\d+.*?)(?:_|$)/);
              if (match) {
                const [, pkgName, version] = match;
                const resolved = removeSuffix(version);
                acc.setRoot(pkgName, resolved);
                acc.addVersion(pkgName, resolved);
              }
            });
          }

          // pnpm v5 uses "dependencies" and "specifiers"
          if (lockData.dependencies) {
            Object.entries(lockData.dependencies).forEach(
              ([name, versionSpec]: [string, any]) => {
                // versionSpec format: "1.0.0" or "link:../package"
                let version: string | undefined;
                if (
                  typeof versionSpec === 'string' &&
                  !versionSpec.startsWith('link:')
                ) {
                  version = removeSuffix(versionSpec);
                } else if (
                  typeof versionSpec === 'object' &&
                  versionSpec.version
                ) {
                  version = removeSuffix(versionSpec.version);
                }
                if (version) {
                  acc.setRoot(name, version);
                  acc.addVersion(name, version);
                }
              },
            );
          }
        }

        return acc.build();
      },
      {},
      'pnpm-lock.yaml',
    );
  }
}
