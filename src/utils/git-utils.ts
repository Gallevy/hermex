import simpleGit from 'simple-git';
import tmp from 'tmp';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import ora from 'ora';

/**
 * GitHub repository information
 */
export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  url: string;
  shorthand: string;
  localPath?: string;
  branch?: string;
  success?: boolean;
}

/**
 * Temporary directory result
 */
export interface TempDirResult {
  path: string;
  cleanup: () => void;
}

/**
 * Clone options
 */
export interface CloneOptions {
  branch?: string;
  depth?: number;
}

/**
 * Clone result
 */
export interface CloneResult {
  clonedRepos: GitHubRepoInfo[];
  errors: Array<{ url: string; error: string }>;
}

/**
 * Files by repository
 */
export interface FilesByRepo {
  [repoShorthand: string]: {
    repo: GitHubRepoInfo;
    files: string[];
    count: number;
  };
}

/**
 * Repository statistics
 */
export interface RepoStats {
  packageJson?: any;
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  totalFiles: number;
  fileTypes: {
    tsx: number;
    jsx: number;
    ts: number;
    js: number;
  };
  error?: string;
}

/**
 * Combined report
 */
export interface CombinedReport {
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
}

/**
 * Analysis results structure
 */
export interface AnalysisResults {
  repositories: Record<
    string,
    {
      analysis: {
        components: string[];
        imports: Record<string, { count: number }>;
        componentUsage: Record<string, number>;
        errors: any[];
      };
      files: string[];
    }
  >;
}

/**
 * Parse GitHub URL to extract owner and repo name
 * Supports:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 * - owner/repo (shorthand)
 */
export function parseGitHubUrl(url: string): GitHubRepoInfo {
  // Handle shorthand: owner/repo
  if (/^[\w-]+\/[\w-]+$/.test(url)) {
    const [owner, repo] = url.split('/');
    return {
      owner,
      repo: repo.replace('.git', ''),
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
    `Invalid GitHub URL: ${url}. Expected format: https://github.com/owner/repo or owner/repo`,
  );
}

/**
 * Create temporary directory for cloning repositories
 * @returns Promise with temp directory info
 */
export function createTempDir(): Promise<TempDirResult> {
  return new Promise((resolve, reject) => {
    tmp.dir(
      { unsafeCleanup: true, prefix: 'react-analyzer-' },
      (err, dirPath, cleanup) => {
        if (err) reject(err);
        resolve({ path: dirPath, cleanup });
      },
    );
  });
}

/**
 * Clone a single repository
 * @param repoUrl - GitHub repository URL or shorthand
 * @param targetDir - Target directory for cloning
 * @param options - Clone options
 * @returns Repository info
 */
export async function cloneRepository(
  repoUrl: string,
  targetDir: string,
  options: CloneOptions = {},
): Promise<GitHubRepoInfo> {
  const { branch = 'main', depth = 1 } = options;
  const repoInfo = parseGitHubUrl(repoUrl);
  const localPath = path.join(targetDir, `${repoInfo.owner}-${repoInfo.repo}`);

  const git = simpleGit();

  const cloneOptions = [
    '--depth',
    depth.toString(),
    '--branch',
    branch,
    '--single-branch',
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
    if (
      error instanceof Error &&
      error.message.includes('not found') &&
      branch === 'main'
    ) {
      try {
        const fallbackOptions = [
          '--depth',
          '1',
          '--branch',
          'master',
          '--single-branch',
        ];
        await git.clone(repoInfo.url, localPath, fallbackOptions);
        return {
          ...repoInfo,
          localPath,
          branch: 'master',
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
 * @param repoUrls - Array of repository URLs
 * @param targetDir - Target directory for cloning
 * @param options - Clone options
 * @returns Cloned repositories and errors
 */
export async function cloneRepositories(
  repoUrls: string[],
  targetDir: string,
  options: CloneOptions = {},
): Promise<CloneResult> {
  const spinner = ora('Cloning repositories...').start();
  const clonedRepos: GitHubRepoInfo[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  for (const repoUrl of repoUrls) {
    try {
      spinner.text = `Cloning ${repoUrl}...`;
      const repoInfo = await cloneRepository(repoUrl, targetDir, options);
      clonedRepos.push(repoInfo);
      spinner.succeed(
        chalk.green(
          `✓ Cloned ${repoInfo.shorthand} (${repoInfo.branch} branch)`,
        ),
      );
      spinner.start();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({
        url: repoUrl,
        error: message,
      });
      spinner.fail(chalk.red(`✗ Failed to clone ${repoUrl}: ${message}`));
      spinner.start();
    }
  }

  spinner.stop();

  if (clonedRepos.length === 0) {
    throw new Error('No repositories were successfully cloned');
  }

  console.log(
    chalk.green(
      `\nSuccessfully cloned ${clonedRepos.length} of ${repoUrls.length} repositories\n`,
    ),
  );

  return { clonedRepos, errors };
}

/**
 * Find files in a repository
 * @param repo - Repository info
 * @param pattern - Glob pattern
 * @returns Array of file paths
 */
export async function findFilesInRepo(
  repo: GitHubRepoInfo,
  pattern: string = '**/*.{tsx,jsx,ts,js}',
): Promise<string[]> {
  if (!repo.localPath) {
    throw new Error('Repository localPath is not defined');
  }

  // Normalize path separators for glob (use forward slashes)
  const normalizedPath = repo.localPath.replace(/\\/g, '/');
  const searchPattern = `${normalizedPath}/${pattern}`;

  const files = await glob(searchPattern, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
    nodir: true,
    windowsPathsNoEscape: true,
  });

  return files;
}

/**
 * Find files in multiple repositories
 * @param repos - Array of repository info objects
 * @param pattern - Glob pattern
 * @returns Map of repo shorthand to files
 */
export async function findFilesInRepos(
  repos: GitHubRepoInfo[],
  pattern: string = '**/*.{tsx,jsx,ts,js}',
): Promise<FilesByRepo> {
  const filesByRepo: FilesByRepo = {};

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
 * @param repoPath - Path to repository
 * @returns Repository stats
 */
export async function getRepoStats(repoPath: string): Promise<RepoStats> {
  try {
    const packageJsonPath = path.join(repoPath, 'package.json');
    let packageJson: any = null;

    if (fs.existsSync(packageJsonPath)) {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    }

    // Count files by type - normalize path for glob
    const normalizedPath = repoPath.replace(/\\/g, '/');
    const files = await glob(`${normalizedPath}/**/*.{tsx,jsx,ts,js}`, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
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
      const ext = path.extname(file).slice(1) as keyof typeof fileTypes;
      if (fileTypes.hasOwnProperty(ext)) {
        fileTypes[ext]++;
      }
    });

    return {
      packageJson,
      name: packageJson?.name || 'unknown',
      version: packageJson?.version || 'unknown',
      dependencies: packageJson?.dependencies || {},
      devDependencies: packageJson?.devDependencies || {},
      totalFiles: files.length,
      fileTypes,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: message,
      name: 'unknown',
      version: 'unknown',
      dependencies: {},
      devDependencies: {},
      totalFiles: 0,
      fileTypes: { tsx: 0, jsx: 0, ts: 0, js: 0 },
    };
  }
}

/**
 * Generate combined report from multiple repository analyses
 * @param analysisResults - Results from analyzing multiple repos
 * @returns Combined report
 */
export function generateCombinedReport(
  analysisResults: AnalysisResults,
): CombinedReport {
  const combined: CombinedReport = {
    totalComponents: [],
    totalImports: [],
    componentsByRepo: {},
    componentFrequency: {},
    importFrequency: {},
    repoSummaries: [],
  };

  const totalComponentsSet = new Set<string>();
  const totalImportsSet = new Set<string>();

  Object.entries(analysisResults.repositories).forEach(
    ([repoName, repoData]) => {
      // Add to totals
      repoData.analysis.components.forEach((comp) =>
        totalComponentsSet.add(comp),
      );
      Object.keys(repoData.analysis.imports).forEach((imp) =>
        totalImportsSet.add(imp),
      );

      // Track components by repo
      combined.componentsByRepo[repoName] = repoData.analysis.components;

      // Aggregate component usage
      Object.entries(repoData.analysis.componentUsage).forEach(
        ([comp, count]) => {
          combined.componentFrequency[comp] =
            (combined.componentFrequency[comp] || 0) + count;
        },
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
    },
  );

  combined.totalComponents = Array.from(totalComponentsSet);
  combined.totalImports = Array.from(totalImportsSet);

  return combined;
}

/**
 * Cleanup temporary directory
 * @param cleanup - Cleanup function from tmp
 * @param tmpDir - Temporary directory path
 * @param keepRepos - Whether to keep the repositories
 */
export function cleanupTempDir(
  cleanup: (() => void) | null,
  tmpDir: string,
  keepRepos: boolean = false,
): void {
  if (!keepRepos && cleanup) {
    try {
      cleanup();
      console.log(chalk.gray('\n🧹 Cleaned up temporary directory'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(chalk.yellow(`Warning: Failed to cleanup: ${message}`));
    }
  } else if (keepRepos && tmpDir) {
    console.log(chalk.blue(`\n📁 Repositories kept in: ${tmpDir}`));
  }
}
