import chalk from 'chalk';
import ora from 'ora';
import { ReactComponentUsageAnalyzer } from '../parser';
import { FocusedUsageAnalyzer } from '../analyze-usage';
import {
  analyzeGitHubRepositories,
  loadRepositoriesFromConfig,
  createGitHubAnalysisReport,
} from '../github-analysis';
import { formatGitHubReport, saveJsonReport } from '../utils/formatters';
import { saveReport } from './shared';

interface GithubOptions {
  library: string;
  config?: string;
  output?: string;
  format: 'json' | 'console' | 'both';
  complexity?: boolean;
  branch?: string;
  pattern?: string;
  depth?: string;
  keepRepos?: boolean;
}

export async function githubCommand(
  repos: string[],
  options: GithubOptions,
): Promise<void> {
  const spinner = ora('Initializing GitHub analyzer...').start();

  try {
    // Load repositories from config file or arguments
    let repoList = repos || [];

    if (options.config) {
      spinner.text = `Loading repositories from ${options.config}...`;
      try {
        repoList = loadRepositoriesFromConfig(options.config);
        spinner.succeed(
          chalk.green(`Loaded ${repoList.length} repositories from config`),
        );
        spinner.start();
      } catch (error: any) {
        spinner.fail(chalk.red(`Failed to load config file: ${error.message}`));
        process.exit(1);
      }
    }

    if (repoList.length === 0) {
      spinner.fail(
        chalk.red(
          'No repositories specified. Use arguments or --config <file>',
        ),
      );
      console.log(
        chalk.yellow('\nExample: node cli.js github owner/repo1 owner/repo2'),
      );
      console.log(chalk.yellow('Or: node cli.js github --config repos.json'));
      process.exit(1);
    }

    spinner.succeed(chalk.green('GitHub analyzer initialized'));

    // Create analyzer instance
    const analyzer = options.complexity
      ? new FocusedUsageAnalyzer(options.library)
      : new ReactComponentUsageAnalyzer(options.library);

    // Analyze repositories
    const results = await analyzeGitHubRepositories(repoList, analyzer, {
      branch: options.branch,
      pattern: options.pattern,
      depth: parseInt(options.depth || '1'),
      keepRepos: options.keepRepos,
    });

    // Create full report with enhanced data
    const fullReport = createGitHubAnalysisReport(results, options.library);

    // Add command type to metadata
    fullReport.metadata = {
      ...fullReport.metadata,
      commandType: 'github',
      timestamp: new Date().toISOString(),
    };

    // Save JSON if requested
    if (options.format === 'json' || options.format === 'both') {
      saveReport({
        data: fullReport,
        commandType: 'github',
        outputPath: options.output,
        format: options.format,
      });
    }

    // Display console output
    if (options.format === 'console' || options.format === 'both') {
      formatGitHubReport(fullReport, options);
    }
  } catch (error: any) {
    spinner.fail(chalk.red('GitHub analysis failed: ' + error.message));
    console.error(error);
    process.exit(1);
  }
}
