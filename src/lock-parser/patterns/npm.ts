import fs from 'fs';
import path from 'path';
import type { LockfileAdapter, MultiVersionMap } from '../lock-file-adapter';

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

  parse(lockFilePath: string): Record<string, string> {
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      const lockData = JSON.parse(content);
      const versions: Record<string, string> = {};

      // npm v7+ uses "packages" field (lockfileVersion 2, 3)
      if (lockData.packages) {
        Object.entries(lockData.packages).forEach(
          ([pkgPath, pkgData]: [string, any]) => {
            if (!pkgPath || pkgPath === '') return;

            // Only root-level packages (no nested node_modules in path)
            if (pkgPath.split('node_modules/').length > 2) return;

            const pkgName = canonicalPackageName(pkgPath);
            if (pkgData.version) {
              versions[pkgName] = pkgData.version;
            }
          },
        );
      }

      // npm v6 uses "dependencies" field (fallback)
      if (lockData.dependencies && Object.keys(versions).length === 0) {
        function extractVersions(deps: any, prefix = ''): void {
          Object.entries(deps).forEach(([name, data]: [string, any]) => {
            const fullName = prefix ? `${prefix}/${name}` : name;
            if (data.version) {
              versions[fullName] = data.version;
            }
            if (data.dependencies) {
              extractVersions(data.dependencies, fullName);
            }
          });
        }
        extractVersions(lockData.dependencies);
      }

      return versions;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Could not parse package-lock.json: ${message}`);
      return {};
    }
  }

  parseMultiVersion(lockFilePath: string): MultiVersionMap {
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      const lockData = JSON.parse(content);
      const versionSets: Record<string, Set<string>> = {};

      if (lockData.packages) {
        Object.entries(lockData.packages).forEach(
          ([pkgPath, pkgData]: [string, any]) => {
            if (!pkgPath || pkgPath === '') return;

            const pkgName = canonicalPackageName(pkgPath);
            const version = (pkgData as any).version;
            if (!version) return;

            if (!versionSets[pkgName]) versionSets[pkgName] = new Set();
            versionSets[pkgName].add(version);
          },
        );
      }

      const result: MultiVersionMap = {};
      for (const [pkg, versions] of Object.entries(versionSets)) {
        result[pkg] = Array.from(versions).sort();
      }
      return result;
    } catch {
      return {};
    }
  }
}
