#!/usr/bin/env node
import { Command } from 'commander';
import { registerScanCommand } from './commands/scan';
import packageJson from '../package.json';
import type { HermexConfig } from './config/types';

export const program = new Command();

export function defineConfig(
  config: Partial<HermexConfig>,
): Partial<HermexConfig> {
  return config;
}

program
  .name('hermex')
  .description('Analyze React component usage patterns in your codebase')
  .version(packageJson.version);

registerScanCommand(program);

program.parse(process.argv);
