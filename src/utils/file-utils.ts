import fs from 'fs';
import { glob } from 'glob';

/**
 * Find files matching a glob pattern
 * @param pattern - Glob pattern
 * @param ignorePatterns - Glob pattenrs to ignore
 * @returns Array of file paths
 */
export async function findFiles(
  pattern: string | string[],
  ignorePatterns: string[],
): Promise<string[]> {
  const files = await glob(pattern, {
    ignore: ignorePatterns,
    nodir: true,
    windowsPathsNoEscape: true,
  });

  // Sorted because glob returns directory-walk order, which varies by
  // filesystem and platform. Everything downstream inherits this order —
  // component tie-breaks, `components[].files`, the order parse errors are
  // reported in — so leaving it unsorted makes hermex's own output differ
  // between two machines analyzing the identical repo.
  return files.map((f) => f.replace(/\\/g, '/')).sort();
}

/**
 * Read file content
 * @param filePath - Path to file
 * @returns File content
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}
