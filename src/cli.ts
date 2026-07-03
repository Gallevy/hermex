#!/usr/bin/env node
import { Command } from 'commander';
import { registerScanCommand } from './commands/scan';
import { getVersion } from './utils/version';

export const program = new Command();

program
  .name('hermex')
  .description('Analyze React component usage patterns in your codebase')
  .version(getVersion());

registerScanCommand(program);

program.parse(process.argv);
