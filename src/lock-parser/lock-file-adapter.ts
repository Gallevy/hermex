export interface LockfileAdapter {
  name: string;
  supportedVersions: string[];
  detect(projectPath: string): string | null;
  parse(lockfilePath: string): Record<string, string>;
}
