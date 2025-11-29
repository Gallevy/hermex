import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * Options for finding files
 */
export interface FindFilesOptions {
  ignorePatterns?: string[];
  maxFiles?: number;
  cwd?: string;
}

/**
 * Find files matching a glob pattern
 * @param pattern - Glob pattern
 * @param options - Options for glob
 * @returns Array of file paths
 */
export async function findFiles(
  pattern: string,
  options: FindFilesOptions = {},
): Promise<string[]> {
  const { ignorePatterns = [], maxFiles = 1000, cwd = process.cwd() } = options;

  const allFiles = await glob(pattern, {
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      ...ignorePatterns,
    ],
    nodir: true,
    cwd,
    absolute: true,
    windowsPathsNoEscape: true,
  });

  // Filter to only React-related file types
  const reactFiles = allFiles.filter((file) => {
    const ext = path.extname(file);
    return ['.tsx', '.jsx', '.ts', '.js'].includes(ext);
  });

  // Limit number of files
  if (reactFiles.length > maxFiles) {
    console.warn(
      `Warning: Found ${reactFiles.length} files, limiting to ${maxFiles}`,
    );
    return reactFiles.slice(0, maxFiles);
  }

  return reactFiles;
}

/**
 * Read file content
 * @param filePath - Path to file
 * @returns File content
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Write file content
 * @param filePath - Path to file
 * @param content - Content to write
 */
export function writeFile(filePath: string, content: string): void {
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Check if file exists
 * @param filePath - Path to file
 * @returns True if file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Get file extension
 * @param filePath - Path to file
 * @returns File extension (without dot)
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).slice(1);
}

/**
 * Check if file is a React file type
 * @param filePath - Path to file
 * @returns True if React file type
 */
export function isReactFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return ['tsx', 'jsx', 'ts', 'js'].includes(ext);
}

/**
 * Ensure directory exists
 * @param dirPath - Path to directory
 */
export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get relative path from base directory
 * @param filePath - Absolute file path
 * @param basePath - Base directory path
 * @returns Relative path
 */
export function getRelativePath(filePath: string, basePath: string): string {
  return path.relative(basePath, filePath);
}

/**
 * Normalize path separators for cross-platform compatibility
 * @param filePath - Path to normalize
 * @returns Normalized path (forward slashes)
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Get files by type from a directory
 * @param dirPath - Directory path
 * @param extensions - Array of extensions (e.g., ['.tsx', '.jsx'])
 * @returns Array of file paths
 */
export async function getFilesByType(
  dirPath: string,
  extensions: string[] = ['.tsx', '.jsx', '.ts', '.js'],
): Promise<string[]> {
  const normalizedPath = normalizePath(dirPath);
  const pattern = `${normalizedPath}/**/*{${extensions.join(',')}}`;

  const files = await glob(pattern, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    nodir: true,
    windowsPathsNoEscape: true,
  });

  return files;
}

/**
 * Count files by extension in a directory
 * @param dirPath - Directory path
 * @returns Map of extensions to counts
 */
export async function countFilesByExtension(
  dirPath: string,
): Promise<Record<string, number>> {
  const files = await getFilesByType(dirPath);
  const counts: Record<string, number> = {};

  files.forEach((file) => {
    const ext = getFileExtension(file);
    counts[ext] = (counts[ext] || 0) + 1;
  });

  return counts;
}

/**
 * Read JSON file
 * @param filePath - Path to JSON file
 * @returns Parsed JSON object
 */
export function readJsonFile<T = any>(filePath: string): T {
  const content = readFile(filePath);
  return JSON.parse(content) as T;
}

/**
 * Write JSON file
 * @param filePath - Path to JSON file
 * @param data - Data to write
 */
export function writeJsonFile(filePath: string, data: any): void {
  const content = JSON.stringify(data, null, 2);
  writeFile(filePath, content);
}
