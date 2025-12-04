#!/usr/bin/env node

import { Command } from 'commander';

export const program = new Command();

// CLI Configuration
program
  .name('hermex')
  .description('Analyze React component usage patterns in your codebase')
  .version('0.0.1');
