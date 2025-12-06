import fs from 'fs';
import path from 'path';
import lockfile from '@yarnpkg/lockfile';
import type { LockfileAdapter } from '../lock-file-adapter';

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
        // Key format: "package@^1.0.0" or "@scope/package@^1.0.0"
        // Extract package name (without version specifier)
        let pkgName = key;

        // Handle scoped packages
        if (key.startsWith('@')) {
          const match = key.match(/^(@[^@]+\/[^@]+)@/);
          if (match) {
            pkgName = match[1];
          }
        } else {
          const match = key.match(/^([^@]+)@/);
          if (match) {
            pkgName = match[1];
          }
        }

        if (value.version && (!versions[pkgName] || value.version)) {
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
}
