import fs from 'fs';
import path from 'path';
import { load } from 'js-yaml';
import {
  parse as parseDependencyPath,
  removeSuffix,
} from '@pnpm/dependency-path';
import {
  readAndParseLockfile,
  toSortedMultiVersionMap,
  type LockfileAdapter,
  type MultiVersionMap,
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

  parse(lockFilePath: string): Record<string, string> {
    return readAndParseLockfile(
      lockFilePath,
      (content) => {
        const lockData = load(content) as any;
        const versions: Record<string, string> = {};

        // pnpm v9+ uses "importers" field
        if (lockData.importers) {
          const rootImporter = lockData.importers['.'];
          if (rootImporter) {
            // Parse dependencies
            if (rootImporter.dependencies) {
              for (const [name, data] of Object.entries(
                rootImporter.dependencies,
              )) {
                if (
                  typeof data === 'object' &&
                  data !== null &&
                  'version' in data
                ) {
                  versions[name] = removeSuffix((data as any).version);
                }
              }
            }
            // Parse devDependencies
            if (rootImporter.devDependencies) {
              for (const [name, data] of Object.entries(
                rootImporter.devDependencies,
              )) {
                if (
                  typeof data === 'object' &&
                  data !== null &&
                  'version' in data
                ) {
                  versions[name] = removeSuffix((data as any).version);
                }
              }
            }
          }
        }

        // pnpm v6-8 uses "packages" field
        if (lockData.packages && Object.keys(versions).length === 0) {
          Object.keys(lockData.packages).forEach((key) => {
            // Key format: "/@babel/core/7.22.5" or "/package/1.0.0"
            const match = key.match(/\/(.+?)\/(\d+\.\d+\.\d+.*?)(?:_|$)/);
            if (match) {
              const [, pkgName, version] = match;
              versions[pkgName] = removeSuffix(version);
            }
          });
        }

        // pnpm v5 uses "dependencies" and "specifiers"
        if (lockData.dependencies && Object.keys(versions).length === 0) {
          Object.entries(lockData.dependencies).forEach(
            ([name, versionSpec]: [string, any]) => {
              // versionSpec format: "1.0.0" or "link:../package"
              if (
                typeof versionSpec === 'string' &&
                !versionSpec.startsWith('link:')
              ) {
                versions[name] = removeSuffix(versionSpec);
              } else if (
                typeof versionSpec === 'object' &&
                versionSpec.version
              ) {
                versions[name] = removeSuffix(versionSpec.version);
              }
            },
          );
        }

        return versions;
      },
      {},
      'pnpm-lock.yaml',
    );
  }

  parseMultiVersion(lockFilePath: string): MultiVersionMap {
    return readAndParseLockfile(
      lockFilePath,
      (content) => {
        const lockData = load(content) as any;
        const versionSets: Record<string, Set<string>> = {};

        if (lockData.packages) {
          Object.keys(lockData.packages).forEach((key) => {
            const parsed = parsePackageKey(key);
            if (!parsed) return;
            if (!versionSets[parsed.name]) versionSets[parsed.name] = new Set();
            versionSets[parsed.name].add(parsed.version);
          });
        }

        return toSortedMultiVersionMap(versionSets);
      },
      {},
      'pnpm-lock.yaml (multi-version)',
    );
  }
}
