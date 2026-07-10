import ora from 'ora';
import type { Ora } from 'ora';
import chalk from 'chalk';
import { getVersion } from '../utils/version';
import type { HermexConfig } from '../config/types';

export interface CommandContext {
  isJson: boolean;
  spinner: Ora;
}

/**
 * Shared command preamble: routes human-readable chrome (version line,
 * spinner) to stderr when the command emits JSON on stdout.
 */
export function createCommandContext(config: HermexConfig): CommandContext {
  const isJson = config.output.format === 'json';
  const stream = isJson ? process.stderr : process.stdout;
  stream.write(chalk.gray(`hermex v${getVersion()}\n`));
  const spinner = ora({ text: 'Parsing lockfile...', stream }).start();
  return { isJson, spinner };
}
