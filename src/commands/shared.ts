import { glob } from 'glob';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export interface FileSearchOptions {
  ignore?: string[];
  maxFiles?: number;
}

export interface SaveReportOptions {
  data: any;
  commandType: string;
  outputPath?: string;
  format?: 'json' | 'console' | 'both';
}

/**
 * Find files matching a glob pattern
 */
export async function findFiles(
  pattern: string,
  ignorePatterns?: string[],
  maxFiles?: number,
): Promise<string[]> {
  const allFiles = await glob(pattern, {
    ignore: ignorePatterns || [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
    ],
    nodir: true,
    absolute: true,
    // Only match React/JS/TS files
    matchBase: true,
  });

  // Filter for React component files
  const reactFiles = allFiles.filter((file) => {
    const ext = file.split('.').pop()?.toLowerCase();
    return ['tsx', 'jsx', 'ts', 'js'].includes(ext || '');
  });

  return maxFiles ? reactFiles.slice(0, maxFiles) : reactFiles;
}

/**
 * Generate a timestamped filename for reports
 */
export function generateReportFilename(
  commandType: string,
  extension: string = 'json',
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${commandType}-report-${timestamp}.${extension}`;
}

/**
 * Add metadata to a report
 */
export function addReportMetadata(
  data: any,
  commandType: string,
  additionalMetadata: Record<string, any> = {},
): any {
  return {
    ...data,
    metadata: {
      ...data.metadata,
      timestamp: new Date().toISOString(),
      commandType,
      ...additionalMetadata,
    },
  };
}

/**
 * Save a report to the reports-outputs directory
 */
export function saveReport(options: SaveReportOptions): string {
  const { data, commandType, outputPath, format = 'both' } = options;

  if (format === 'console') {
    return '';
  }

  // Generate filename with timestamp and command type
  const filename = outputPath || generateReportFilename(commandType);

  // Ensure reports-outputs directory exists
  const reportsDir = path.join(process.cwd(), 'reports-outputs');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Save to reports-outputs directory if not absolute path
  const finalPath = path.isAbsolute(filename)
    ? filename
    : path.join(reportsDir, filename);

  // Add metadata before saving
  const reportWithMetadata = addReportMetadata(data, commandType);

  fs.writeFileSync(finalPath, JSON.stringify(reportWithMetadata, null, 2));

  console.log(chalk.blue(`\n📄 JSON report saved to: ${finalPath}`));

  return finalPath;
}

/**
 * Get complexity icon based on level
 */
export function getComplexityIcon(level: string): string {
  switch (level) {
    case 'Simple':
      return '🟢';
    case 'Moderate':
      return '🟡';
    case 'Complex':
      return '🟠';
    case 'Very Complex':
      return '🔴';
    case 'Extremely Complex':
      return '⚫';
    default:
      return '⚪';
  }
}

/**
 * Create a visual bar for progress/stats
 */
export function createBar(percentage: number, length: number = 20): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Get emoji for ranking
 */
export function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return '📍';
  }
}
