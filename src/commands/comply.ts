import { Command, Option } from 'commander';
import chalk from 'chalk';
import { printJson } from '../utils/print-json';
import { printRules } from '../utils/print-rules';
import { printPackages } from '../utils/print-packages';
import { printVersus } from '../utils/print-versus';
import { printComplianceVerdict } from '../utils/print-compliance';
import { computeCompliance } from '../utils/compliance';
import {
  writeSummaryFile,
  DEFAULT_SUMMARY_TITLE,
} from '../utils/write-summary-file';
import { loadConfig } from '../config/loader';
import { runPipeline } from './pipeline';
import { createCommandContext } from './command-context';
import type { CommandContextOptions } from './command-context';
import type { HermexConfig } from '../config/types';

export function registerComplyCommand(program: Command) {
  program
    .command('comply')
    .description(
      'Check compliance with hermex.config.ts rules and release-age policy (exits non-zero if not compliant)',
    )
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
    .option(
      '--summary-file <path>',
      'Write a concise, ANSI-free markdown summary (rules, flagged packages, verdict) to this path, for a CI job summary or PR comment',
    )
    .option(
      '--summary-title <text>',
      'Title/heading for the --summary-file markdown output',
      DEFAULT_SUMMARY_TITLE,
    )
    .action(
      async (options: {
        config?: string;
        format?: 'human' | 'json';
        color?: boolean;
        summaryFile?: string;
        summaryTitle: string;
      }) => {
        const config = await loadConfig(process.cwd(), options.config);
        await executeComply(
          config,
          {
            format: options.format,
            color: options.color,
          },
          options.summaryFile,
          options.summaryTitle,
        );
      },
    );
}

export async function executeComply(
  config: HermexConfig,
  contextOptions: CommandContextOptions = {},
  summaryFile?: string,
  summaryTitle: string = DEFAULT_SUMMARY_TITLE,
) {
  const { isJson, spinner } = createCommandContext(config, contextOptions);

  try {
    // Runs the full pipeline to completion regardless of violations found —
    // comply must report everything in one pass, not fail on the first issue.
    const result = await runPipeline(config, spinner, isJson);
    if (!result) {
      process.exitCode = 2;
      return;
    }
    const { aggregated, resolvedConfig } = result;
    const rules = resolvedConfig.rules['no-outdated-packages'];

    const compliance = computeCompliance(aggregated);

    if (isJson) {
      printJson(aggregated, config.output, compliance);
    } else {
      printRules(aggregated);
      // Whether release-age actually ran for this repo — `rules['no-outdated-packages']`
      // being non-empty in the base config isn't enough on its own, since a
      // per-repo `overrides[]` entry can turn it on even when the base is
      // empty (and vice versa can't happen: overrides only add rules here).
      // Checking the enriched data directly is what's actually true.
      if (aggregated.packageDistribution.some((p) => p.releases)) {
        printPackages(aggregated, 'table', rules);
      }
      if (config.output.versus) {
        printVersus(aggregated);
      }
      printComplianceVerdict(compliance);
    }

    if (summaryFile) {
      writeSummaryFile(
        summaryFile,
        aggregated,
        compliance,
        summaryTitle,
        rules,
      );
    }

    process.exitCode = compliance.compliant ? 0 : 1;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    spinner.fail(chalk.red('Compliance check failed: ' + message));
    process.exitCode = 2;
  }
}
