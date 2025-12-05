import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { parseFile } from '../swc-parser';
import type { UsageReport } from '../swc-parser';
import { aggregateReports } from '../utils/aggregator';
import { printVerbose } from '../utils/print-verbose';
import { printSummary } from '../utils/print-summary';
import { printDetails } from '../utils/print-details';
import { printTopComponents } from '../utils/print-top-components';
import { printComponentsUsage } from '../utils/print-components-usage';
import { printPatterns } from '../utils/print-patterns';
import { findFiles } from '../utils/file-utils';
import { findAndParseLockfile } from '../utils/lockfile-parser';
import { printPackages } from '../utils/print-packages';

interface ScanOptions {
  verbose?: boolean;
  summary?: string | boolean;
  details?: boolean;
  componentsUsage?: string;
  packages?: string;
  patterns?: string;
  ignore?: string | string[];
}

interface NormalizedScanOptions {
  verbose: boolean;
  summary: 'log' | false;
  details: boolean;
  componentsUsage: 'table' | 'chart' | false;
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
      'ALL',
    )
    .option(
      '--ignore-packages <pattern>',
      'Glob pattern for what packages to ignore',
      [],
    )
    .option('--summary [mode]', 'Show summary stats (log, false)', 'log')
    .option('--details', 'Show detailed pattern counts')
    .option(
      '--components-usage [mode]',
      'Show components table/chart (table, chart)',
      'table',
    )
    .option(
      '--packages [mode]',
      'Show packages table/chart (table, chart)',
      'table',
    )
    .option(
      '--patterns [mode]',
      'Show patterns table/chart (table, chart)',
      'table',
    )

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
    topComponents: (options.topComponents as any) || 'log',
    componentsUsage: (options.componentsUsage as any) || 'table',
    packages: (options.packages as any) || 'table',
    patterns: (options.patterns as any) || 'table',
    ignore: normalizeIgnorePatterns(options.ignore),
  };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeScan(pattern: string, options: NormalizedScanOptions) {
  const startTime = Date.now();
  const spinner = ora('Parsing lockfile...').start();

  try {
    // Parse lockfile once at the beginning
    const projectPath = process.cwd();
    const lockfileResult = findAndParseLockfile(projectPath);

    if (!lockfileResult.found) {
      spinner.warn(
        chalk.yellow(
          '⚠️  No lockfile found. Version information will not be available.',
        ),
      );
    } else {
      spinner.succeed(
        chalk.blue(
          `📦 Found ${lockfileResult.lockfileType} lockfile (supports: ${lockfileResult.supportedVersions.join(', ')}) - ${Object.keys(lockfileResult.versions).length} packages`,
        ),
      );
    }

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

    // Print outputs based on options
    console.log(''); // Empty line before output sections

    if (options.summary) {
      printSummary(aggregated, elapsedTime);
    }

    if (options.details) {
      console.log(''); // Empty line between sections
      printDetails(aggregated);
    }

    if (options.topComponents) {
      console.log(''); // Empty line between sections
      printTopComponents(aggregated, options.topComponents);
    }

    if (options.componentsUsage) {
      console.log(''); // Empty line between sections
      printComponentsUsage(aggregated, options.componentsUsage);
    }

    if (options.packages) {
      console.log(''); // Empty line between sections
      printPackages(aggregated, options.packages);
    }

    if (options.patterns) {
      console.log(''); // Empty line between sections
      printPatterns(aggregated, options.patterns);
    }
  } catch (error: any) {
    spinner.fail(chalk.red('Analysis failed: ' + error.message));
    console.error(error);

    process.exit(1);
  }
}
