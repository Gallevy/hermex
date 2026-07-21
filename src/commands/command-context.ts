import ora from 'ora';
import type { Ora } from 'ora';
import chalk from 'chalk';
import { getVersion } from '../utils/version';
import { applyColorLevel, resolveColorLevel } from '../utils/severity-format';
import type { HermexConfig } from '../config/types';

export interface CommandContext {
  isJson: boolean;
  spinner: Ora;
}

export interface CommandContextOptions {
  /** Overrides config.output.format when set (from --format). */
  format?: 'human' | 'json';
  /** Set to false when --no-color is passed. */
  color?: boolean;
}

/**
 * Shared command preamble: routes human-readable chrome (version line,
 * spinner) to stderr when the command emits JSON on stdout.
 */
export function createCommandContext(
  config: HermexConfig,
  options: CommandContextOptions = {},
): CommandContext {
  applyColorLevel(
    resolveColorLevel({
      colorFlag: options.color === false ? false : undefined,
      noColorEnv: process.env['NO_COLOR'],
    }),
  );

  const isJson = (options.format ?? config.output.format) === 'json';
  const stream = isJson ? process.stderr : process.stdout;
  stream.write(chalk.gray(`hermex v${getVersion()}\n`));
  const spinner = ora({ text: 'Parsing lockfile...', stream }).start();
  return { isJson, spinner };
}
