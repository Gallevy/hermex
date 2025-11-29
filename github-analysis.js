const ora = require("ora");
const chalk = require("chalk");
const {
  createTempDir,
  cloneRepositories,
  findFilesInRepos,
  getRepoStats,
  generateCombinedReport,
  cleanupTempDir,
} = require("./utils/git-utils");
const { findAndParseLockfile } = require("./utils/lockfile-parser");
const { readJsonFile } = require("./utils/file-utils");

/**
 * Analyze multiple GitHub repositories
 * @param {string[]} repoUrls - Array of repository URLs
 * @param {Object} analyzer - Analyzer instance
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeGitHubRepositories(repoUrls, analyzer, options = {}) {
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
    const repoStats = {};
    const lockfileData = {};

    for (const repo of clonedRepos) {
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
          chalk.gray(`    Lockfile: ${lockfileInfo.lockfileType} (${Object.keys(lockfileInfo.versions).length} packages)`)
        );
      }
    }

    // Analyze each repository
    console.log(chalk.bold("\n🔬 Analyzing repositories...\n"));
    const results = {};
    const spinner = ora("Analyzing...").start();

    for (const [repoName, repoData] of Object.entries(filesByRepo)) {
      spinner.text = `Analyzing ${repoName}...`;

      const repoResults = {
        files: repoData.files,
        stats: repoStats[repoName],
        lockfile: lockfileData[repoName],
        analysis: {
          components: new Set(),
          imports: {},
          componentUsage: {},
          errors: [],
        },
      };

      // Analyze each file
      for (const file of repoData.files) {
        try {
          const report = analyzer.analyzeFile(file);
          if (report) {
            // Aggregate components
            report.components.forEach((comp) =>
              repoResults.analysis.components.add(comp)
            );

            // Aggregate component usage with version info
            report.patterns.usage.jsx.forEach((usage) => {
              if (!repoResults.analysis.componentUsage[usage.component]) {
                repoResults.analysis.componentUsage[usage.component] = {
                  count: 0,
                  files: new Set(),
                };
              }
              repoResults.analysis.componentUsage[usage.component].count +=
                usage.count;
              repoResults.analysis.componentUsage[usage.component].files.add(
                file
              );
            });

            // Track imports with source
            [
              ...report.patterns.imports.default,
              ...report.patterns.imports.named,
            ].forEach((imp) => {
              const name = imp.name || imp.local;
              const source = imp.source || imp.from;

              if (!repoResults.analysis.imports[name]) {
                repoResults.analysis.imports[name] = {
                  count: 0,
                  files: new Set(),
                  source: source,
                };
              }
              repoResults.analysis.imports[name].count++;
              repoResults.analysis.imports[name].files.add(file);
            });
          }
        } catch (error) {
          repoResults.analysis.errors.push({
            file: file,
            error: error.message,
          });
        }
      }

      // Convert Sets to Arrays for JSON serialization
      repoResults.analysis.components = Array.from(
        repoResults.analysis.components
      );

      Object.keys(repoResults.analysis.imports).forEach((key) => {
        repoResults.analysis.imports[key].files = Array.from(
          repoResults.analysis.imports[key].files
        );
      });

      Object.keys(repoResults.analysis.componentUsage).forEach((key) => {
        repoResults.analysis.componentUsage[key].files = Array.from(
          repoResults.analysis.componentUsage[key].files
        );
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
    const analysisResults = {
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
 * @param {string} configPath - Path to config file
 * @returns {string[]} Array of repository URLs
 */
function loadRepositoriesFromConfig(configPath) {
  try {
    const config = readJsonFile(configPath);
    return config.repositories || [];
  } catch (error) {
    throw new Error(`Failed to load config file: ${error.message}`);
  }
}

/**
 * Enhance component data with version information
 * @param {Object} componentUsage - Component usage data
 * @param {Object} lockfileData - Lockfile version data
 * @param {string} libraryName - Name of the library
 * @returns {Object} Enhanced component data
 */
function enhanceComponentsWithVersions(
  componentUsage,
  lockfileData,
  libraryName
) {
  const enhanced = {};

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
 * @param {Object} analysisResults - Results from repository analysis
 * @param {string} libraryName - Name of the library being analyzed
 * @returns {Object} Full report with enhanced data
 */
function createGitHubAnalysisReport(analysisResults, libraryName) {
  // Generate combined report
  const combined = generateCombinedReport(analysisResults);

  // Enhance components with version information from each repo
  const enhancedComponentFrequency = {};

  Object.entries(analysisResults.repositories).forEach(([repoName, repoData]) => {
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

        enhancedComponentFrequency[key].count += usage.count || usage;
        enhancedComponentFrequency[key].repos.push({
          name: repoName,
          count: usage.count || usage,
        });
      }
    );
  });

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

module.exports = {
  analyzeGitHubRepositories,
  loadRepositoriesFromConfig,
  enhanceComponentsWithVersions,
  createGitHubAnalysisReport,
};
