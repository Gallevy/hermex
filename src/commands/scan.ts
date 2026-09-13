import { Command, Option } from 'commander';
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
import { runPipeline } from './pipeline';
import { createCommandContext } from './command-context';
import type { CommandContextOptions } from './command-context';
import type {
  HermexConfig,
  ResolvedReleaseAgeRuleConfig,
} from '../config/types';

export function registerScanCommand(program: Command) {
  program
    .command('scan')
    .description('Scan and analyze local files')
    .option(
      '--config <path>',
      'Path to hermex config file (overrides CWD discovery)',
    )
    .addOption(
      new Option(
        '--format <format>',
        'Output format, overrides output.format in the config file',
      ).choices(['human', 'json']),
    )
    .option('--no-color', 'Disable colored output (see also NO_COLOR env var)')
    .action(
      async (options: {
        config?: string;
        format?: 'human' | 'json';
        color?: boolean;
      }) => {
        const config = await loadConfig(process.cwd(), options.config);
        await executeScan(config, {
          format: options.format,
          color: options.color,
        });
      },
    );
}

export async function executeScan(
  config: HermexConfig,
  contextOptions: CommandContextOptions = {},
) {
  const { isJson, spinner } = createCommandContext(config, contextOptions);

  try {
    const result = await runPipeline(config, spinner, isJson);
    if (!result) return;
    const { aggregated, resolvedConfig } = result;

    if (isJson) {
      printJson(aggregated, config.output);
    } else {
      printScanResults(
        aggregated,
        config,
        resolvedConfig.rules['no-outdated-packages'],
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    spinner.fail(chalk.red('Analysis failed: ' + message));
    process.exitCode = 1;
  }
}

function printScanResults(
  aggregated: ReturnType<typeof aggregateReports>,
  config: HermexConfig,
  rules: ResolvedReleaseAgeRuleConfig[],
) {
  if (config.output.packages) {
    // The rule entries reach the table because a row's recommendation is
    // policy-derived and no longer cached on the package (#189).
    printPackages(aggregated, config.output.packages, rules);
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
