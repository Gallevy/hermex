import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { minimatch } from 'minimatch';
import { parseFile } from '../swc-parser';
import type { UsageReport } from '../swc-parser';
import { aggregateReports } from '../utils/aggregator';
import { printSummary } from '../utils/print-summary';
import { printComponents } from '../utils/print-components';
import { printPatterns } from '../utils/print-patterns';
import { printPackages } from '../utils/print-packages';
import { findFiles } from '../utils/file-utils';
import { findAndParseLockfile } from '../lock-parser';
import { formatDuration } from '../utils/format-utils';

interface ScanOptions {
  verbose?: boolean;
  summary?: string | boolean;
  noSummary?: boolean;
  components?: string;
  packages?: string;
  patterns?: string;
  ignore?: string | string[];
  allowPackages?: string | string[];
  ignorePackages?: string | string[];
}

interface NormalizedScanOptions {
  verbose: boolean;
  summary: 'log' | false;
  noSummary?: boolean;
  components: 'table' | 'chart' | false;
  packages: 'table' | 'chart' | false;
  patterns: 'table' | 'chart';
  ignore: string[];
  allowPackages: string[];
  ignorePackages: string[];
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
    .option('--allow-packages <pattern>', 'Pattern for what packages to scan', [
      '*',
    ])
    .option(
      '--ignore-packages <pattern>',
      'Pattern for what packages to ignore',
      [],
    )
    .option('--no-summary', 'Hide summary', 'table')
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

function normalizeArray(value?: string | string[]) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeOptions(options: ScanOptions): NormalizedScanOptions {
  return {
    verbose: options.verbose || false,
    summary:
      options.summary === false || options.summary === 'false' ? false : 'log',
    noSummary: options.noSummary || false,
    components: (options.components as any) || 'table',
    packages: (options.packages as any) || 'table',
    patterns: (options.patterns as any) || 'table',
    ignore: normalizeArray(options.ignore),
    allowPackages: normalizeArray(options.allowPackages),
    ignorePackages: normalizeArray(),
  };
}

async function executeScan(pattern: string, options: NormalizedScanOptions) {
  const startTime = Date.now();
  const spinner = ora('Parsing lockfile...').start();

  try {
    // Parse lockfile - start from current directory
    const lockfileResult = findAndParseLockfile(process.cwd());

    // const availablePackages = Object.keys(versions);

    // const filtered = lockfileResult.versions.filter((pkg) => {
    //   // Must match allow patterns (default ['*'] = all)
    //   const allowed = options.allowPackages.some((p) => minimatch(pkg, p));

    //   // Must NOT match ignore patterns
    //   const ignored = options.ignorePackages.some((p) => minimatch(pkg, p));

    //   return allowed && !ignored;
    // });

    spinner.succeed(
      `Found ${lockfileResult.lockfileType} lockfile (supports: ${lockfileResult.supportedVersions.join(', ')}) - ${Object.keys(lockfileResult.versions).length} packages`,
    );

    // Find files matching pattern
    spinner.start('Finding files...');
    const files = await findFiles(pattern, options.ignore);

    if (files.length === 0) {
      spinner.fail(`No files found matching pattern: ${pattern}`);

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

      const report = parseFile(file);
      if (report) {
        reports.push(report);
      }
    }

    // Calculate elapsed time
    const elapsedTime = (Date.now() - startTime) / 1000;

    // Aggregate reports
    const aggregated = aggregateReports(reports, lockfileResult.versions);

    if (options.packages) {
      printPackages(aggregated, options.packages);
    }

    if (options.components) {
      printComponents(aggregated, options.components);
    }

    if (options.patterns) {
      printPatterns(aggregated, options.patterns);
    }

    if (options.summary && !options.noSummary) {
      printSummary(aggregated);
    }

    console.log('');

    spinner.succeed(
      chalk.green.bold(
        ` Analysis complete! Analyzed ${reports.length} files in ${formatDuration(elapsedTime)}\n`,
      ),
    );
  } catch (error: any) {
    spinner.fail(chalk.red('Analysis failed: ' + error.message));
    console.error(error);

    process.exit(1);
  }
}
