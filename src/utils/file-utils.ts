import fs from 'fs';
import { glob } from 'glob';

/**
 * Find files matching a glob pattern
 * @param pattern - Glob pattern
 * @param ignorePatterns - Glob pattenrs to ignore
 * @returns Array of file paths
 */
export async function findFiles(
  pattern: string,
  ignorePatterns: string[],
): Promise<string[]> {
  const files = await glob(pattern, {
    ignore: ignorePatterns,
    nodir: true,
    absolute: true,
    windowsPathsNoEscape: true,
  });

  return files;
}

/**
 * Read file content
 * @param filePath - Path to file
 * @returns File content
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}
