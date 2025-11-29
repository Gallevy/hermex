const simpleGit = require("simple-git");
const tmp = require("tmp");
const fs = require("fs");
const path = require("path");
const { glob } = require("glob");
const chalk = require("chalk");
const ora = require("ora");

/**
 * Parse GitHub URL to extract owner and repo name
 * Supports:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 * - owner/repo (shorthand)
 */
function parseGitHubUrl(url) {
  // Handle shorthand: owner/repo
  if (/^[\w-]+\/[\w-]+$/.test(url)) {
    const [owner, repo] = url.split("/");
    return {
      owner,
      repo: repo.replace(".git", ""),
      url: `https://github.com/${owner}/${repo}`,
      shorthand: url,
    };
  }

  // Handle https://github.com/owner/repo
  const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (httpsMatch) {
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2],
      url: url,
      shorthand: `${httpsMatch[1]}/${httpsMatch[2]}`,
    };
  }

  throw new Error(
    `Invalid GitHub URL: ${url}. Expected format: https://github.com/owner/repo or owner/repo`
  );
}

/**
 * Create temporary directory for cloning repositories
 * @returns {Promise<{path: string, cleanup: Function}>}
 */
function createTempDir() {
  return new Promise((resolve, reject) => {
    tmp.dir(
      { unsafeCleanup: true, prefix: "react-analyzer-" },
      (err, dirPath, cleanup) => {
        if (err) reject(err);
        resolve({ path: dirPath, cleanup });
      }
    );
  });
}

/**
 * Clone a single repository
 * @param {string} repoUrl - GitHub repository URL or shorthand
 * @param {string} targetDir - Target directory for cloning
 * @param {Object} options - Clone options
 * @returns {Promise<Object>} Repository info
 */
async function cloneRepository(repoUrl, targetDir, options = {}) {
  const { branch = "main", depth = 1 } = options;
  const repoInfo = parseGitHubUrl(repoUrl);
  const localPath = path.join(targetDir, `${repoInfo.owner}-${repoInfo.repo}`);

  const git = simpleGit();

  const cloneOptions = [
    "--depth",
    depth.toString(),
    "--branch",
    branch,
    "--single-branch",
  ];

  try {
    await git.clone(repoInfo.url, localPath, cloneOptions);
    return {
      ...repoInfo,
      localPath,
      branch,
      success: true,
    };
  } catch (error) {
    // Try alternative branch if main fails
    if (error.message.includes("not found") && branch === "main") {
      try {
        const fallbackOptions = [
          "--depth",
          "1",
          "--branch",
          "master",
          "--single-branch",
        ];
        await git.clone(repoInfo.url, localPath, fallbackOptions);
        return {
          ...repoInfo,
          localPath,
          branch: "master",
          success: true,
        };
      } catch (retryError) {
        throw retryError;
      }
    }
    throw error;
  }
}

/**
 * Clone multiple repositories
 * @param {string[]} repoUrls - Array of repository URLs
 * @param {string} targetDir - Target directory for cloning
 * @param {Object} options - Clone options
 * @returns {Promise<{clonedRepos: Array, errors: Array}>}
 */
async function cloneRepositories(repoUrls, targetDir, options = {}) {
  const spinner = ora("Cloning repositories...").start();
  const clonedRepos = [];
  const errors = [];

  for (const repoUrl of repoUrls) {
    try {
      spinner.text = `Cloning ${repoUrl}...`;
      const repoInfo = await cloneRepository(repoUrl, targetDir, options);
      clonedRepos.push(repoInfo);
      spinner.succeed(
        chalk.green(
          `✓ Cloned ${repoInfo.shorthand} (${repoInfo.branch} branch)`
        )
      );
      spinner.start();
    } catch (error) {
      errors.push({
        url: repoUrl,
        error: error.message,
      });
      spinner.fail(chalk.red(`✗ Failed to clone ${repoUrl}: ${error.message}`));
      spinner.start();
    }
  }

  spinner.stop();

  if (clonedRepos.length === 0) {
    throw new Error("No repositories were successfully cloned");
  }

  console.log(
    chalk.green(
      `\nSuccessfully cloned ${clonedRepos.length} of ${repoUrls.length} repositories\n`
    )
  );

  return { clonedRepos, errors };
}

/**
 * Find files in a repository
 * @param {Object} repo - Repository info
 * @param {string} pattern - Glob pattern
 * @returns {Promise<string[]>} Array of file paths
 */
async function findFilesInRepo(repo, pattern = "**/*.{tsx,jsx,ts,js}") {
  // Normalize path separators for glob (use forward slashes)
  const normalizedPath = repo.localPath.replace(/\\/g, "/");
  const searchPattern = `${normalizedPath}/${pattern}`;

  const files = await glob(searchPattern, {
    ignore: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.git/**",
    ],
    nodir: true,
    windowsPathsNoEscape: true,
  });

  return files;
}

/**
 * Find files in multiple repositories
 * @param {Array} repos - Array of repository info objects
 * @param {string} pattern - Glob pattern
 * @returns {Promise<Object>} Map of repo shorthand to files
 */
async function findFilesInRepos(repos, pattern = "**/*.{tsx,jsx,ts,js}") {
  const filesByRepo = {};

  for (const repo of repos) {
    const files = await findFilesInRepo(repo, pattern);
    filesByRepo[repo.shorthand] = {
      repo,
      files,
      count: files.length,
    };
  }

  return filesByRepo;
}

/**
 * Get repository statistics
 * @param {string} repoPath - Path to repository
 * @returns {Promise<Object>} Repository stats
 */
async function getRepoStats(repoPath) {
  try {
    const packageJsonPath = path.join(repoPath, "package.json");
    let packageJson = null;

    if (fs.existsSync(packageJsonPath)) {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    }

    // Count files by type - normalize path for glob
    const normalizedPath = repoPath.replace(/\\/g, "/");
    const files = await glob(`${normalizedPath}/**/*.{tsx,jsx,ts,js}`, {
      ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
      nodir: true,
      windowsPathsNoEscape: true,
    });

    const fileTypes = {
      tsx: 0,
      jsx: 0,
      ts: 0,
      js: 0,
    };

    files.forEach((file) => {
      const ext = path.extname(file).slice(1);
      if (fileTypes.hasOwnProperty(ext)) {
        fileTypes[ext]++;
      }
    });

    return {
      packageJson,
      name: packageJson?.name || "unknown",
      version: packageJson?.version || "unknown",
      dependencies: packageJson?.dependencies || {},
      devDependencies: packageJson?.devDependencies || {},
      totalFiles: files.length,
      fileTypes,
    };
  } catch (error) {
    return {
      error: error.message,
      totalFiles: 0,
      fileTypes: { tsx: 0, jsx: 0, ts: 0, js: 0 },
    };
  }
}

/**
 * Generate combined report from multiple repository analyses
 * @param {Object} analysisResults - Results from analyzing multiple repos
 * @returns {Object} Combined report
 */
function generateCombinedReport(analysisResults) {
  const combined = {
    totalComponents: new Set(),
    totalImports: new Set(),
    componentsByRepo: {},
    componentFrequency: {},
    importFrequency: {},
    repoSummaries: [],
  };

  Object.entries(analysisResults.repositories).forEach(
    ([repoName, repoData]) => {
      // Add to totals
      repoData.analysis.components.forEach((comp) =>
        combined.totalComponents.add(comp)
      );
      Object.keys(repoData.analysis.imports).forEach((imp) =>
        combined.totalImports.add(imp)
      );

      // Track components by repo
      combined.componentsByRepo[repoName] = repoData.analysis.components;

      // Aggregate component usage
      Object.entries(repoData.analysis.componentUsage).forEach(
        ([comp, count]) => {
          combined.componentFrequency[comp] =
            (combined.componentFrequency[comp] || 0) + count;
        }
      );

      // Aggregate import usage
      Object.entries(repoData.analysis.imports).forEach(([imp, data]) => {
        combined.importFrequency[imp] =
          (combined.importFrequency[imp] || 0) + data.count;
      });

      // Repo summary
      combined.repoSummaries.push({
        name: repoName,
        components: repoData.analysis.components.length,
        files: repoData.files.length,
        errors: repoData.analysis.errors.length,
        topComponents: Object.entries(repoData.analysis.componentUsage)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([comp, count]) => ({ component: comp, uses: count })),
      });
    }
  );

  combined.totalComponents = Array.from(combined.totalComponents);
  combined.totalImports = Array.from(combined.totalImports);

  return combined;
}

/**
 * Cleanup temporary directory
 * @param {Function} cleanup - Cleanup function from tmp
 * @param {string} tmpDir - Temporary directory path
 * @param {boolean} keepRepos - Whether to keep the repositories
 */
function cleanupTempDir(cleanup, tmpDir, keepRepos = false) {
  if (!keepRepos && cleanup) {
    try {
      cleanup();
      console.log(chalk.gray("\n🧹 Cleaned up temporary directory"));
    } catch (error) {
      console.warn(
        chalk.yellow(`Warning: Failed to cleanup: ${error.message}`)
      );
    }
  } else if (keepRepos && tmpDir) {
    console.log(chalk.blue(`\n📁 Repositories kept in: ${tmpDir}`));
  }
}

module.exports = {
  parseGitHubUrl,
  createTempDir,
  cloneRepository,
  cloneRepositories,
  findFilesInRepo,
  findFilesInRepos,
  getRepoStats,
  generateCombinedReport,
  cleanupTempDir,
};
