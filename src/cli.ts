#!/usr/bin/env node
import { Command } from 'commander';
import { registerScanCommand } from './commands/scan';
import { registerComplyCommand } from './commands/comply';
import { getVersion } from './utils/version';

export const program = new Command();

program
  .name('hermex')
  .description('Analyze React component usage patterns in your codebase')
  .version(getVersion());

registerScanCommand(program);
registerComplyCommand(program);

program.parse(process.argv);
