import { Command } from 'commander';
import chalk from 'chalk';
import { printJson } from '../utils/print-json';
import { printRules } from '../utils/print-rules';
import { printPackages } from '../utils/print-packages';
import { printComplianceVerdict } from '../utils/print-compliance';
import { computeCompliance } from '../utils/compliance';
import { loadConfig } from '../config/loader';
import { runPipeline } from './pipeline';
import { createCommandContext } from './command-context';
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
    .action(async (options: { config?: string }) => {
      const config = await loadConfig(process.cwd(), options.config);
      await executeComply(config);
    });
}

export async function executeComply(config: HermexConfig) {
  const { isJson, spinner } = createCommandContext(config);

  try {
    // Runs the full pipeline to completion regardless of violations found —
    // comply must report everything in one pass, not fail on the first issue.
    const aggregated = await runPipeline(config, spinner, isJson);
    if (!aggregated) {
      process.exitCode = 2;
      return;
    }

    const compliance = computeCompliance(aggregated);

    if (isJson) {
      printJson(aggregated);
    } else {
      printRules(aggregated);
      if (config.releaseAge.enabled) {
        printPackages(aggregated, 'table');
      }
      printComplianceVerdict(compliance);
    }

    process.exitCode = compliance.compliant ? 0 : 1;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    spinner.fail(chalk.red('Compliance check failed: ' + message));
    process.exitCode = 2;
  }
}
