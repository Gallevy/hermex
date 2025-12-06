import fs from 'fs';
import path from 'path';
import type { LockfileAdapter } from '../lock-file-adapter';

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
            if (!pkgPath || pkgPath === '') return; // Skip root

            // Remove leading "node_modules/"
            const pkgName = pkgPath.replace(/^node_modules\//, '');

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
      return {}; // why?
    }
  }
}
