import chalk from 'chalk';
import ora from 'ora';
import { FocusedUsageAnalyzer } from '../analyze-usage';
import { findFiles, saveReport, getRankEmoji } from './shared';

interface CompareOptions {
  libraries: string[];
  output?: string;
  format: 'json' | 'console' | 'both';
}

export async function compareCommand(
  pattern: string,
  options: CompareOptions,
): Promise<void> {
  const spinner = ora('Finding files to analyze...').start();

  try {
    const files = await findFiles(pattern, [], 1000);

    if (files.length === 0) {
      spinner.fail(chalk.red('No files found matching pattern: ' + pattern));
      return;
    }

    spinner.succeed(chalk.green(`Found ${files.length} files`));

    const comparisonResults = {
      metadata: {
        timestamp: new Date().toISOString(),
        commandType: 'compare',
        pattern: pattern,
        filesAnalyzed: files.length,
        libraries: options.libraries,
      },
      libraries: [],
    };

    // Analyze for each library
    for (const library of options.libraries) {
      spinner.start(`Analyzing ${library}...`);

      const analyzer = new FocusedUsageAnalyzer(library);
      let componentsFound = 0;
      let usagePatterns = 0;
      const components = new Set<string>();

      for (const file of files) {
        try {
          const report = analyzer.analyzeFile(file);
          if (report) {
            componentsFound += report.summary.totalComponents;
            usagePatterns += report.summary.totalUsagePatterns;
            report.components.forEach((comp: string) => components.add(comp));
          }
        } catch (error) {
          // Skip files with errors
        }
      }

      const libraryResult = {
        name: library,
        componentsFound: components.size,
        totalUsagePatterns: usagePatterns,
        topComponents: Array.from(components).slice(0, 10),
      };

      comparisonResults.libraries.push(libraryResult);
      spinner.succeed(
        chalk.green(`${library}: ${components.size} components found`),
      );
    }

    // Sort by components found
    comparisonResults.libraries.sort(
      (a: any, b: any) => b.componentsFound - a.componentsFound,
    );

    // Save and display
    if (options.format === 'json' || options.format === 'both') {
      saveReport({
        data: comparisonResults,
        commandType: 'compare',
        outputPath: options.output,
        format: options.format,
      });
    }

    if (options.format === 'console' || options.format === 'both') {
      printComparisonReport(comparisonResults);
    }
  } catch (error: any) {
    spinner.fail(chalk.red('Comparison failed: ' + error.message));
    console.error(error);
  }
}

function printComparisonReport(results: any): void {
  console.log('\n' + chalk.bold.blue('═'.repeat(60)));
  console.log(chalk.bold.blue('  📊 LIBRARY COMPARISON REPORT'));
  console.log(chalk.bold.blue('═'.repeat(60)));

  console.log(chalk.bold('\n🏆 RESULTS:'));
  results.libraries.forEach((lib: any, index: number) => {
    const rank = index + 1;
    const emoji = getRankEmoji(rank);
    console.log(
      `  ${emoji} ${rank}. ${chalk.cyan(lib.name)}: ${chalk.yellow(lib.componentsFound)} components, ${chalk.yellow(lib.totalUsagePatterns)} usage patterns`,
    );
  });

  console.log('\n' + chalk.bold.blue('═'.repeat(60)) + '\n');
}
