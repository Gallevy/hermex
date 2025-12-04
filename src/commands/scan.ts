import { Command, Option } from 'commander';
import { glob } from 'glob';
import ora from 'ora';
import chalk from 'chalk';
import { parseFile } from '../swc-parser';
import type { UsageReport } from '../swc-parser';

interface LocalOptions {
  output?: string;
  summary: boolean;
  charts: boolean;
  stats: boolean;
  top: boolean;
  patterns: boolean;
  versions: boolean;
  debug: boolean;
}

export function registerScanCommand(program: Command) {
  program
    .command('scan')
    .description('Scan and analyze local files')
    .argument(
      '[pattern]',
      'Glob pattern for files to analyze (defaults to current directory recursively)',
      '**/*.{tsx,jsx,ts,js}',
    )
    .option(
      '-o, --output <file>',
      'Output file path for report (defaults to timestamped filename)',
    )
    .addOption(new Option('-s, --summary', 'Show summary').default(true))
    .addOption(new Option('-c, --charts', 'Show charts').default(true))
    .addOption(new Option('-x, --stats', 'Show stats').default(true))
    .addOption(new Option('-t, --top', 'Show top usage').default(true))
    .addOption(new Option('-p, --patterns', 'Show patterns').default(true))
    .addOption(new Option('-v, --versions', 'Show versions').default(false))
    .addOption(new Option('-d, --debug', 'Debug mode').default(false))
    .action(async (pattern: string, options: LocalOptions) => {
      const spinner = ora('Finding files...').start();

      try {
        // Find files matching pattern
        const files = await glob(pattern, {
          ignore: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
          absolute: true,
        });

        if (files.length === 0) {
          spinner.fail(
            chalk.red(`No files found matching pattern: ${pattern}`),
          );
          return;
        }

        spinner.succeed(chalk.green(`Found ${files.length} files`));

        // Analyze all files
        spinner.start('Analyzing files...');
        const reports: UsageReport[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          spinner.text = `Analyzing files... (${i + 1}/${files.length})`;

          try {
            const report = parseFile(file);
            if (report) {
              reports.push(report);
            }
          } catch (error: any) {
            if (options.debug) {
              console.error(
                chalk.red(`Error analyzing ${file}: ${error.message}`),
              );
            }
          }
        }

        spinner.succeed(
          chalk.green(`Analysis complete! Analyzed ${reports.length} files`),
        );

        // Print each report (the print utilities will be called here when implemented)
        console.log('\n' + chalk.bold.cyan('═'.repeat(80)));
        console.log(chalk.bold.cyan('  📊 LOCAL ANALYSIS REPORT'));
        console.log(chalk.bold.cyan('═'.repeat(80)));

        // For now, just show basic summary
        console.log(chalk.bold('\n📈 SUMMARY:'));
        console.log(`  Files Analyzed: ${chalk.yellow(reports.length)}`);

        const totalComponents = new Set(reports.flatMap((r) => r.components))
          .size;
        const totalImports = reports.reduce(
          (sum, r) => sum + r.summary.totalImports,
          0,
        );
        const totalPatterns = reports.reduce(
          (sum, r) => sum + r.summary.totalUsagePatterns,
          0,
        );

        console.log(`  Total Components: ${chalk.yellow(totalComponents)}`);
        console.log(`  Total Imports: ${chalk.yellow(totalImports)}`);
        console.log(`  Total Usage Patterns: ${chalk.yellow(totalPatterns)}`);

        console.log('\n' + chalk.bold.cyan('═'.repeat(80)) + '\n');
      } catch (error: any) {
        spinner.fail(chalk.red('Analysis failed: ' + error.message));
        if (options.debug) {
          console.error(error);
        }
      }

      const mockTableData = [
        { Component: 'Component1', Imports: 10, Version: '1.0.23' },
        { Component: 'Component2', Imports: 15, Version: '1.0.23' },
        { Component: 'Component3', Imports: 8, Version: '1.0.66' },
      ];
      const obj = mockTableData.reduce((acc, c) => {
        acc[c.Component] = { Imports: c.Imports };
        return acc;
      }, {});
      console.table(obj);
    });
}
