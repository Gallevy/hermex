import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { minimatch } from 'minimatch';
import { parseFile } from '../swc-parser';
import type { UsageReport, ParseError } from '../swc-parser/types';
import { aggregateReports } from '../utils/aggregator';
import { printSummary } from '../utils/print-summary';
import { printComponents } from '../utils/print-components';
import { printPatterns } from '../utils/print-patterns';
import { printPackages } from '../utils/print-packages';
import { printErrors } from '../utils/print-errors';
import { findFiles } from '../utils/file-utils';
import { findAndParseLockfile } from '../lock-parser';
import { formatDuration } from '../utils/format-utils';

interface ScanOptions {
  verbose?: boolean;
  summary?: string | boolean;
  noSummary?: boolean;
  components?: string;
  noComponents?: boolean;
  noPackages?: boolean;
  noPatterns?: boolean;
  packages?: string;
  patterns?: string;
  ignore?: string | string[];
  allowPackages?: string | string[];
  ignorePackages?: string | string[];
  ignoreErrors?: boolean;
}

interface NormalizedScanOptions {
  verbose: boolean;
  summary: 'log' | false;
  noSummary?: boolean;
  components: 'table' | 'chart' | false;
  noComponents?: boolean;
  noPackages?: boolean;
  noPatterns?: boolean;
  packages: 'table' | 'chart' | false;
  patterns: 'table' | 'chart';
  ignore: string[];
  allowPackages: string[];
  ignorePackages: string[];
  ignoreErrors: boolean;
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
      '**',
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
    .option(
      '--ignore-errors',
      'Continue scanning even if some files fail to parse',
    )
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
    ignorePackages: normalizeArray(options.ignorePackages),
    ignoreErrors: options.ignoreErrors || false,
  };
}

async function executeScan(pattern: string, options: NormalizedScanOptions) {
  const startTime = Date.now();
  const spinner = ora('Parsing lockfile...').start();

  try {
    // Parse lockfile - start from current directory
    const lockfileResult = findAndParseLockfile(process.cwd());

    // Filter packages based on allow/ignore patterns
    const allPackages = Object.keys(lockfileResult.versions);
    const filteredPackages = allPackages.filter((pkg) => {
      // Must match allow patterns (default ['*'] = all)
      const allowed = options.allowPackages.some((p) => minimatch(pkg, p));

      // Must NOT match ignore patterns
      const ignored = options.ignorePackages.some((p) => minimatch(pkg, p));

      return allowed && !ignored;
    });

    // Create filtered versions object
    const filteredVersions: Record<string, string> = {};
    for (const pkg of filteredPackages) {
      filteredVersions[pkg] = lockfileResult.versions[pkg];
    }

    spinner.succeed(
      `Found ${lockfileResult.lockfileType} lockfile (supports: ${lockfileResult.supportedVersions.join(', ')}) - ${filteredPackages.length}/${allPackages.length} packages`,
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
    const errors: ParseError[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!options.verbose) {
        spinner.text = `Analyzing files... (${i + 1}/${files.length})`;
      }

      try {
        const report = parseFile(file, { ignoreErrors: options.ignoreErrors });
        if (report) {
          reports.push(report);
        } else if (options.ignoreErrors) {
          // parseFile returned null due to error (ignoreErrors mode)
          errors.push({
            file,
            message: 'Failed to parse file',
          });
        }
      } catch (error: any) {
        // Error thrown (default mode, ignoreErrors=false)
        if (options.ignoreErrors) {
          errors.push({
            file,
            message: error.message || 'Unknown error',
          });
        } else {
          // Re-throw to maintain default crash behavior
          throw error;
        }
      }
    }

    // Calculate elapsed time
    const elapsedTime = (Date.now() - startTime) / 1000;

    // Aggregate reports using filtered versions and errors
    const aggregated = aggregateReports(reports, filteredVersions, errors);

    // Print errors first if any exist
    printErrors(aggregated);

    if (options.packages && !options.noPackages) {
      printPackages(aggregated, options.packages);
    }

    if (options.components && !options.noComponents) {
      printComponents(aggregated, options.components);
    }

    if (options.patterns && !options.noPatterns) {
      printPatterns(aggregated, options.patterns);
    }

    if (options.summary && !options.noSummary) {
      printSummary(aggregated);
    }

    console.log('');

    const successMessage =
      aggregated.errors.length > 0
        ? ` Analysis complete with ${aggregated.errors.length} error(s)! Analyzed ${reports.length}/${files.length} files in ${formatDuration(elapsedTime)}\n`
        : ` Analysis complete! Analyzed ${reports.length} files in ${formatDuration(elapsedTime)}\n`;

    if (aggregated.errors.length > 0) {
      spinner.warn(chalk.yellow.bold(successMessage));
      // Exit with error code if errors were found
      process.exit(1);
    } else {
      spinner.succeed(chalk.green.bold(successMessage));
    }
  } catch (error: any) {
    spinner.fail(chalk.red('Analysis failed: ' + error.message));
    console.error(error);

    process.exit(1);
  }
}
