import ora from "ora";
import chalk from "chalk";
import {
  createTempDir,
  cloneRepositories,
  findFilesInRepos,
  getRepoStats,
  generateCombinedReport,
  cleanupTempDir,
  GitHubRepoInfo,
  RepoStats,
} from "./utils/git-utils";
import {
  findAndParseLockfile,
  LockfileResult,
} from "./utils/lockfile-parser";
import { readJsonFile } from "./utils/file-utils";

/**
 * Analysis options
 */
export interface AnalysisOptions {
  branch?: string;
  pattern?: string;
  depth?: number;
  keepRepos?: boolean;
}

/**
 * Analyzer interface (duck typing for compatibility with existing analyzers)
 */
export interface Analyzer {
  analyzeFile(filePath: string): AnalysisReport | null;
}

/**
 * Analysis report from a file
 */
export interface AnalysisReport {
  components: string[];
  patterns: {
    usage: {
      jsx: Array<{ component: string; count: number }>;
    };
    imports: {
      default: Array<{ name?: string; local?: string; from?: string; source?: string }>;
      named: Array<{ name?: string; local?: string; from?: string; source?: string }>;
    };
  };
}

/**
 * Repository analysis results
 */
export interface RepositoryAnalysisResult {
  files: string[];
  stats: RepoStats;
  lockfile: LockfileResult;
  analysis: {
    components: string[];
    imports: Record<
      string,
      {
        count: number;
        files: string[];
        source?: string;
      }
    >;
    componentUsage: Record<
      string,
      {
        count: number;
        files: string[];
      }
    >;
    errors: Array<{ file: string; error: string }>;
  };
}

/**
 * GitHub analysis results
 */
export interface GitHubAnalysisResults {
  repositories: Record<string, RepositoryAnalysisResult>;
  metadata: {
    analyzedAt: string;
    totalRepositories: number;
    failedClones: number;
    pattern: string;
    branch: string;
    repoStats: Record<string, RepoStats>;
    lockfiles: Record<string, LockfileResult>;
  };
  cloneErrors: Array<{ url: string; error: string }>;
}

/**
 * Enhanced component data
 */
export interface EnhancedComponentData {
  component: string;
  library: string;
  version: string;
  count: number;
  repos: Array<{ name: string; count: number }>;
}

/**
 * Full GitHub analysis report
 */
export interface GitHubAnalysisReport {
  metadata: {
    analyzedAt: string;
    totalRepositories: number;
    failedClones: number;
    pattern: string;
    branch: string;
    repoStats: Record<string, RepoStats>;
    lockfiles: Record<string, LockfileResult>;
    library: string;
    repositories: string[];
  };
  combined: {
    totalComponents: string[];
    totalImports: string[];
    componentsByRepo: Record<string, string[]>;
    componentFrequency: Record<string, number>;
    importFrequency: Record<string, number>;
    repoSummaries: Array<{
      name: string;
      components: number;
      files: number;
      errors: number;
      topComponents: Array<{ component: string; uses: number }>;
    }>;
    enhancedComponentFrequency: Record<string, EnhancedComponentData>;
  };
  repositories: Record<string, RepositoryAnalysisResult>;
  cloneErrors: Array<{ url: string; error: string }>;
}

/**
 * Config file structure
 */
export interface RepositoriesConfig {
  repositories: string[];
}

/**
 * Analyze multiple GitHub repositories
 * @param repoUrls - Array of repository URLs
 * @param analyzer - Analyzer instance
 * @param options - Analysis options
 * @returns Analysis results
 */
export async function analyzeGitHubRepositories(
  repoUrls: string[],
  analyzer: Analyzer,
  options: AnalysisOptions = {}
): Promise<GitHubAnalysisResults> {
  const {
    branch = "main",
    pattern = "**/*.{tsx,jsx,ts,js}",
    depth = 1,
    keepRepos = false,
  } = options;

  console.log(chalk.bold.cyan("\n🔍 GitHub Repository Analysis\n"));
  console.log(chalk.gray(`Repositories to analyze: ${repoUrls.length}`));
  console.log(chalk.gray(`Pattern: ${pattern}`));
  console.log(chalk.gray(`Branch: ${branch}\n`));

  // Create temporary directory
  const { path: tmpDir, cleanup } = await createTempDir();

  try {
    // Clone repositories
    const { clonedRepos, errors: cloneErrors } = await cloneRepositories(
      repoUrls,
      tmpDir,
      { branch, depth }
    );

    // Find files in repositories
    console.log(chalk.bold("\n📁 Finding files in repositories...\n"));
    const filesByRepo = await findFilesInRepos(clonedRepos, pattern);

    // Display file counts
    Object.entries(filesByRepo).forEach(([repoName, data]) => {
      console.log(`  ${chalk.cyan(repoName)}: ${data.count} files`);
    });

    // Get repository statistics and parse lockfiles
    console.log(chalk.bold("\n📊 Gathering repository statistics...\n"));
    const repoStats: Record<string, RepoStats> = {};
    const lockfileData: Record<string, LockfileResult> = {};

    for (const repo of clonedRepos) {
      if (!repo.localPath) continue;

      const stats = await getRepoStats(repo.localPath);
      repoStats[repo.shorthand] = stats;

      // Parse lockfile for version information
      const lockfileInfo = findAndParseLockfile(repo.localPath);
      lockfileData[repo.shorthand] = lockfileInfo;

      console.log(
        `  ${chalk.cyan(repo.shorthand)}: ${stats.name}@${stats.version} (${stats.totalFiles} files)`
      );

      if (lockfileInfo.found) {
        console.log(
          chalk.gray(
            `    Lockfile: ${lockfileInfo.lockfileType} (${Object.keys(lockfileInfo.versions).length} packages)`
          )
        );
      }
    }

    // Analyze each repository
    console.log(chalk.bold("\n🔬 Analyzing repositories...\n"));
    const results: Record<string, RepositoryAnalysisResult> = {};
    const spinner = ora("Analyzing...").start();

    for (const [repoName, repoData] of Object.entries(filesByRepo)) {
      spinner.text = `Analyzing ${repoName}...`;

      const repoResults: RepositoryAnalysisResult = {
        files: repoData.files,
        stats: repoStats[repoName],
        lockfile: lockfileData[repoName],
        analysis: {
          components: [],
          imports: {},
          componentUsage: {},
          errors: [],
        },
      };

      const componentsSet = new Set<string>();
      const componentUsageTemp = new Map<
        string,
        { count: number; files: Set<string> }
      >();
      const importsTemp = new Map<
        string,
        { count: number; files: Set<string>; source?: string }
      >();

      // Analyze each file
      for (const file of repoData.files) {
        try {
          const report = analyzer.analyzeFile(file);
          if (report) {
            // Aggregate components
            report.components.forEach((comp) => componentsSet.add(comp));

            // Aggregate component usage with version info
            report.patterns.usage.jsx.forEach((usage) => {
              const existing = componentUsageTemp.get(usage.component);
              if (!existing) {
                componentUsageTemp.set(usage.component, {
                  count: usage.count,
                  files: new Set([file]),
                });
              } else {
                existing.count += usage.count;
                existing.files.add(file);
              }
            });

            // Track imports with source
            [
              ...report.patterns.imports.default,
              ...report.patterns.imports.named,
            ].forEach((imp) => {
              const name = imp.name || imp.local || "";
              const source = imp.source || imp.from;

              const existing = importsTemp.get(name);
              if (!existing) {
                importsTemp.set(name, {
                  count: 1,
                  files: new Set([file]),
                  source: source,
                });
              } else {
                existing.count++;
                existing.files.add(file);
              }
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          repoResults.analysis.errors.push({
            file: file,
            error: message,
          });
        }
      }

      // Convert Sets to Arrays for JSON serialization
      repoResults.analysis.components = Array.from(componentsSet);

      componentUsageTemp.forEach((value, key) => {
        repoResults.analysis.componentUsage[key] = {
          count: value.count,
          files: Array.from(value.files),
        };
      });

      importsTemp.forEach((value, key) => {
        repoResults.analysis.imports[key] = {
          count: value.count,
          files: Array.from(value.files),
          source: value.source,
        };
      });

      results[repoName] = repoResults;
      spinner.succeed(
        chalk.green(
          `✓ Analyzed ${repoName}: ${repoResults.analysis.components.length} components found`
        )
      );
      spinner.start();
    }

    spinner.stop();

    // Return comprehensive results
    const analysisResults: GitHubAnalysisResults = {
      repositories: results,
      metadata: {
        analyzedAt: new Date().toISOString(),
        totalRepositories: clonedRepos.length,
        failedClones: cloneErrors.length,
        pattern: pattern,
        branch: branch,
        repoStats: repoStats,
        lockfiles: lockfileData,
      },
      cloneErrors,
    };

    // Cleanup
    cleanupTempDir(cleanup, tmpDir, keepRepos);

    return analysisResults;
  } catch (error) {
    // Cleanup on error
    cleanupTempDir(cleanup, tmpDir, false);
    throw error;
  }
}

/**
 * Load repositories from config file
 * @param configPath - Path to config file
 * @returns Array of repository URLs
 */
export function loadRepositoriesFromConfig(configPath: string): string[] {
  try {
    const config = readJsonFile<RepositoriesConfig>(configPath);
    return config.repositories || [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load config file: ${message}`);
  }
}

/**
 * Enhance component data with version information
 * @param componentUsage - Component usage data
 * @param lockfileData - Lockfile version data
 * @param libraryName - Name of the library
 * @returns Enhanced component data
 */
export function enhanceComponentsWithVersions(
  componentUsage: Record<string, { count: number; files: string[] }>,
  lockfileData: LockfileResult,
  libraryName: string
): Record<string, any> {
  const enhanced: Record<string, any> = {};

  Object.entries(componentUsage).forEach(([componentName, usage]) => {
    const version = lockfileData.versions?.[libraryName];
    const displayName = version
      ? `${componentName} from ${libraryName}@${version}`
      : `${componentName} from ${libraryName}`;

    enhanced[displayName] = {
      component: componentName,
      library: libraryName,
      version: version || "unknown",
      ...usage,
    };
  });

  return enhanced;
}

/**
 * Create full GitHub analysis report
 * @param analysisResults - Results from repository analysis
 * @param libraryName - Name of the library being analyzed
 * @returns Full report with enhanced data
 */
export function createGitHubAnalysisReport(
  analysisResults: GitHubAnalysisResults,
  libraryName: string
): GitHubAnalysisReport {
  // Generate combined report
  const combined = generateCombinedReport(analysisResults);

  // Enhance components with version information from each repo
  const enhancedComponentFrequency: Record<string, EnhancedComponentData> = {};

  Object.entries(analysisResults.repositories).forEach(
    ([repoName, repoData]) => {
      const lockfileData = repoData.lockfile || {};
      const version = lockfileData.versions?.[libraryName];

      Object.entries(repoData.analysis.componentUsage).forEach(
        ([component, usage]) => {
          const key = version
            ? `${component} from ${libraryName}@${version}`
            : `${component} from ${libraryName}`;

          if (!enhancedComponentFrequency[key]) {
            enhancedComponentFrequency[key] = {
              component,
              library: libraryName,
              version: version || "unknown",
              count: 0,
              repos: [],
            };
          }

          enhancedComponentFrequency[key].count += usage.count || 0;
          enhancedComponentFrequency[key].repos.push({
            name: repoName,
            count: usage.count || 0,
          });
        }
      );
    }
  );

  return {
    metadata: {
      ...analysisResults.metadata,
      library: libraryName,
      repositories: Object.keys(analysisResults.repositories),
    },
    combined: {
      ...combined,
      enhancedComponentFrequency,
    },
    repositories: analysisResults.repositories,
    cloneErrors: analysisResults.cloneErrors,
  };
}
