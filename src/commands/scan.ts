import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import { parseFile } from '../swc-parser';
import type { UsageReport } from '../swc-parser';
import { aggregateReports } from '../utils/aggregator';
import { printSummary } from '../utils/print-summary';
import { printDetails } from '../utils/print-details';
import { printComponents } from '../utils/print-components';
import { printPatterns } from '../utils/print-patterns';
import { printPackages } from '../utils/print-packages';
import { findFiles } from '../utils/file-utils';
import { findAndParseLockfile } from '../lock-parser';

interface ScanOptions {
  verbose?: boolean;
  summary?: string | boolean;
  details?: boolean;
  components?: string;
  packages?: string;
  patterns?: string;
  ignore?: string | string[];
}

interface NormalizedScanOptions {
  verbose: boolean;
  summary: 'log' | false;
  details: boolean;
  components: 'table' | 'chart' | false;
  packages: 'table' | 'chart' | false;
  patterns: 'table' | 'chart';
  ignore: string[];
}

export function registerScanCommand(program: Command) {
  program
    .command('scan')
    .description('Scan and analyze local files')
    .argument(
      '[pattern]',
      'Glob pattern for files to analyze (defaults to current directory recursively)',
      '**/*.{tsx,jsx,ts,js}',
    )
    .option('--ignore <pattern>', 'Glob pattern for files to ignore', [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
    ])
    .option(
      '--allow-packages <pattern>',
      'Glob pattern for what packages to scan',
      'ALL', // TO FIX
    )
    .option(
      '--ignore-packages <pattern>',
      'Glob pattern for what packages to ignore',
      [],
    )
    .option('--summary [mode]', 'Show summary stats (log, false)', 'log')
    .option('--no-summary', 'Do not show summary stats')
    .option('--details', 'Show detailed pattern counts')
    .option(
      '--components [mode]',
      'Show components table/chart (table, chart)',
      'table',
    )
    .option('--no-components', 'Do not show components')
    .option(
      '--packages [mode]',
      'Show packages table/chart (table, chart)',
      'table',
    )
    .option('--no-packages', 'Do not show packages')
    .option(
      '--patterns [mode]',
      'Show patterns table/chart (table, chart)',
      'table',
    )
    .option('--no-patterns', 'Do not show patterns')
    .action(async (pattern: string, options: ScanOptions) => {
      const normalizedOptions = normalizeOptions(options);

      await executeScan(pattern, normalizedOptions);
    });
}

function normalizeIgnorePatterns(ignore?: string | string[]) {
  if (!ignore) {
    return [];
  }

  return Array.isArray(ignore) ? ignore : [ignore];
}

function normalizeOptions(options: ScanOptions): NormalizedScanOptions {
  return {
    verbose: options.verbose || false,
    summary:
      options.summary === false || options.summary === 'false' ? false : 'log',
    details: options.details || false,
    components: (options.components as any) || 'table',
    packages: (options.packages as any) || 'table',
    patterns: (options.patterns as any) || 'table',
    ignore: normalizeIgnorePatterns(options.ignore),
  };
}

async function executeScan(pattern: string, options: NormalizedScanOptions) {
  const startTime = Date.now();
  const spinner = ora('Parsing lockfile...').start();

  try {
    // Parse lockfile once at the beginning
    // If scanning fixtures, look for lockfile in fixtures directory first
    let projectPath = process.cwd();
    if (pattern.includes('fixtures/')) {
      const fixturesPath = path.join(projectPath, 'fixtures');
      try {
        const fixtureResult = findAndParseLockfile(fixturesPath);
        projectPath = fixturesPath;
      } catch {
        // Fall back to project root if no fixtures lockfile found
      }
    }
    const lockfileResult = findAndParseLockfile(projectPath);

    spinner.succeed(
      chalk.blue(
        `📦 Found ${lockfileResult.lockfileType} lockfile (supports: ${lockfileResult.supportedVersions.join(', ')}) - ${Object.keys(lockfileResult.versions).length} packages`,
      ),
    );

    // Find files matching pattern
    spinner.start('Finding files...');
    const files = await findFiles(pattern, options.ignore);

    if (files.length === 0) {
      // spinner.color = 'red'; // It should be red but not working.
      spinner.fail('TEST');
      // spinner.fail(chalk.red(` No files found matching pattern: ${pattern}`));
      return;
    }

    spinner.succeed(chalk.green(` Found ${files.length} files`));

    // Analyze all files
    spinner.start('Analyzing files...');
    const reports: UsageReport[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!options.verbose) {
        spinner.text = `Analyzing files... (${i + 1}/${files.length})`;
      }

      try {
        const report = parseFile(file);
        if (report) {
          reports.push(report);
        }
      } catch (error: any) {
        spinner.stop();
        console.error(chalk.red(`Error analyzing ${file}: ${error.message}`));
        spinner.start();
      }
    }

    spinner.succeed(
      chalk.green(`Analysis complete! Analyzed ${reports.length} files`),
    );

    // Calculate elapsed time
    const elapsedTime = (Date.now() - startTime) / 1000;

    // Aggregate reports
    const aggregated = aggregateReports(reports, lockfileResult.versions);

    if (options.packages) {
      printPackages(aggregated, options.packages);
    }

    if (options.details) {
      printDetails(aggregated);
    }

    if (options.components) {
      printComponents(aggregated, options.components);
    }

    if (options.patterns) {
      printPatterns(aggregated, options.patterns);
    }

    if (options.summary) {
      printSummary(aggregated, elapsedTime);
    }
  } catch (error: any) {
    spinner.fail(chalk.red('Analysis failed: ' + error.message));
    console.error(error);

    process.exit(1);
  }
}
