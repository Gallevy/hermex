declare module '@yarnpkg/lockfile' {
  export interface LockfileParseResult {
    type: 'success' | 'merge' | 'conflict';
    object: Record<string, { version?: string; [key: string]: unknown }>;
  }
  export function parse(content: string): LockfileParseResult;
  export function stringify(json: unknown): string;
  const lockfile: { parse: typeof parse; stringify: typeof stringify };
  export default lockfile;
}
