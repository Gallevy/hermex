import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { LockfileAdapter } from '../lock-file-adapter';

export class PnpmLockfileAdapter implements LockfileAdapter {
  name = 'pnpm';
  supportedVersions = ['v5', 'v6', 'v9'];

  detect(projectPath: string): string | null {
    const lockfilePath = path.join(projectPath, 'pnpm-lock.yaml');
    return fs.existsSync(lockfilePath) ? lockfilePath : null;
  }

  parse(lockFilePath: string): Record<string, string> {
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      const lockData = yaml.load(content) as any;
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
                versions[name] = (data as any).version;
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
                versions[name] = (data as any).version;
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
            versions[pkgName] = version;
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
              versions[name] = versionSpec;
            } else if (typeof versionSpec === 'object' && versionSpec.version) {
              versions[name] = versionSpec.version;
            }
          },
        );
      }

      return versions;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Could not parse pnpm-lock.yaml: ${message}`);
      return {};
    }
  }
}
