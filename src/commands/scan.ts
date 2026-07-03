import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { aggregateReports } from '../utils/aggregator';
import { printSummary } from '../utils/print-summary';
import { printDetails } from '../utils/print-details';
import { printComponents } from '../utils/print-components';
import { printPatterns } from '../utils/print-patterns';
import { printPackages } from '../utils/print-packages';
import { printVersus } from '../utils/print-versus';
import { printRules } from '../utils/print-rules';
import { printJson } from '../utils/print-json';
import { loadConfig } from '../config/loader';
import { getVersion } from '../utils/version';
import { runPipeline } from './pipeline';
import type { HermexConfig } from '../config/types';

export function registerScanCommand(program: Command) {
  program
    .command('scan')
    .description('Scan and analyze local files')
    .option(
      '--config <path>',
      'Path to hermex config file (overrides CWD discovery)',
    )
    .action(async (options: { config?: string }) => {
      const config = await loadConfig(process.cwd(), options.config);
      await executeScan(config);
    });
}

export async function executeScan(config: HermexConfig) {
  const isJson = config.output.format === 'json';
  const versionStream = isJson ? process.stderr : process.stdout;
  versionStream.write(chalk.gray(`hermex v${getVersion()}\n`));
  const spinner = ora({
    text: 'Parsing lockfile...',
    stream: isJson ? process.stderr : process.stdout,
  }).start();

  try {
    const aggregated = await runPipeline(config, spinner);
    if (!aggregated) return;

    if (isJson) {
      printJson(aggregated);
    } else {
      printScanResults(aggregated, config);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    spinner.fail(chalk.red('Analysis failed: ' + message));
    console.error(error);
    process.exit(1);
  }
}

function printScanResults(
  aggregated: ReturnType<typeof aggregateReports>,
  config: HermexConfig,
) {
  if (config.output.packages) {
    printPackages(aggregated, config.output.packages);
  }

  if (config.output.versus) {
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
    printSummary(aggregated);
  }
}
