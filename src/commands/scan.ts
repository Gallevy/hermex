import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { parseFile } from '../swc-parser';
import type { UsageReport } from '../swc-parser';
import { aggregateReports } from '../utils/aggregator';
import { printSummary } from '../utils/print-summary';
import { printDetails } from '../utils/print-details';
import { printComponents } from '../utils/print-components';
import { printPatterns } from '../utils/print-patterns';
import { printPackages } from '../utils/print-packages';
import { printVersus } from '../utils/print-versus';
import { printRules } from '../utils/print-rules';
import { findFiles } from '../utils/file-utils';
import { findAndParseLockfile } from '../lock-parser';
import { loadConfig } from '../config/loader';
import { evaluateRules } from '../rules/evaluator';
import { enrichWithReleaseAge } from '../npm-registry/enricher';
import type { HermexConfig } from '../config/types';

export function registerScanCommand(program: Command) {
  program
    .command('scan')
    .description('Scan and analyze local files')
    .argument(
      '[pattern]',
      'Glob pattern for files to analyze (overrides config includes)',
    )
    .action(async (patternArg: string | undefined) => {
      const config = await loadConfig(process.cwd());
      await executeScan(config, patternArg);
    });
}

export async function executeScan(
  config: HermexConfig,
  patternOverride?: string,
) {
  const startTime = Date.now();
  const spinner = ora('Parsing lockfile...').start();

  try {
    const lockfileResult = findAndParseLockfile(process.cwd());

    spinner.succeed(
      chalk.blue(
        `📦 Found ${lockfileResult.lockfileType} lockfile (supports: ${lockfileResult.supportedVersions.join(', ')}) - ${Object.keys(lockfileResult.versions).length} packages`,
      ),
    );

    const pattern =
      patternOverride ?? config.includes[0] ?? '**/*.{tsx,jsx,ts,js}';
    const ignorePatterns = config.excludes;

    spinner.start('Finding files...');
    const files = await findFiles(pattern, ignorePatterns);

    if (files.length === 0) {
      spinner.fail(chalk.red(`No files found matching pattern: ${pattern}`));
      return;
    }

    spinner.succeed(chalk.green(` Found ${files.length} files`));

    spinner.start('Analyzing files...');
    const reports: UsageReport[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      spinner.text = `Analyzing files... (${i + 1}/${files.length})`;

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

    const elapsedTime = (Date.now() - startTime) / 1000;

    const aggregated = aggregateReports(
      reports,
      lockfileResult.versions,
      config,
      lockfileResult.multiVersions,
    );

    const ruleViolations = evaluateRules(process.cwd(), config.rules);
    aggregated.ruleViolations = ruleViolations;

    if (config.releaseAge.enabled) {
      spinner.start('Fetching release age from registry...');
      const { enriched, skipped } = await enrichWithReleaseAge(
        aggregated.packageDistribution,
        config.releaseAge,
      );
      aggregated.packageDistribution = enriched;
      spinner.succeed(
        chalk.blue(
          `📅 Release age fetched${skipped > 0 ? chalk.gray(` (${skipped} packages skipped — registry unreachable or not found)`) : ''}`,
        ),
      );
    }

    printScanResults(aggregated, config, elapsedTime);
  } catch (error: any) {
    spinner.fail(chalk.red('Analysis failed: ' + error.message));
    console.error(error);
    process.exit(1);
  }
}

function printScanResults(
  aggregated: ReturnType<typeof aggregateReports>,
  config: HermexConfig,
  elapsedTime: number,
) {
  if (config.output.packages) {
    printPackages(aggregated, config.output.packages);
  }

  if (config.output.versus && aggregated.versusResults.length > 0) {
    printVersus(aggregated);
  }

  if (config.output.rules) {
    printRules(aggregated);
  }

  if (config.output.details) {
    printDetails(aggregated);
  }

  if (config.output.components) {
    printComponents(aggregated, config.output.components);
  }

  if (config.output.patterns) {
    printPatterns(aggregated, config.output.patterns);
  }

  if (config.output.summary) {
    printSummary(aggregated, elapsedTime);
  }
}
