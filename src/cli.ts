#!/usr/bin/env node

import { Command } from 'commander';
import { registerScanCommand } from './commands/scan';
import packageJson from '../package.json';

export const program = new Command();

program
  .name('hermex')
  .description('Analyze React component usage patterns in your codebase')
  .version(packageJson.version);

registerScanCommand(program);

program.parse(process.argv);
