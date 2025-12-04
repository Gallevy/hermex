import chalk from "chalk";

/**
 * Formatting options for console reports
 */
export interface ConsoleReportOptions {
  top?: number;
  summaryOnly?: boolean;
}

/**
 * Aggregated report structure
 */
export interface AggregatedReport {
  metadata: {
    timestamp: string;
    library: string;
    filesAnalyzed: number;
    filesWithErrors?: number;
    pattern?: string;
    totalFiles?: number;
  };
  aggregated: {
    componentFrequency: Record<string, number>;
    patternFrequency: Record<string, number>;
    fileComplexity?: Record<string, { score: number; level: string }>;
    errors?: Array<{ file: string; error: string }>;
  };
}

/**
 * GitHub report structure
 */
export interface GitHubReport {
  metadata: {
    library: string;
    repositories: string[];
  };
  combined: {
    totalComponents: string[];
    totalImports: string[];
    componentFrequency: Record<string, number>;
    componentsByRepo: Record<string, string[]>;
    repoSummaries: Array<{
      name: string;
      components: number;
      files: number;
      errors: number;
      topComponents: Array<{ component: string; uses: number }>;
    }>;
  };
  repositories: Record<string, any>;
}

/**
 * Comparison report structure
 */
export interface ComparisonReport {
  metadata: {
    timestamp: string;
    pattern: string;
    filesAnalyzed: number;
    libraries: string[];
  };
  libraries: Array<{
    name: string;
    componentsFound: number;
    totalUsagePatterns: number;
    topComponents?: Array<{ component: string; uses: number }>;
  }>;
}

/**
 * Component data structure
 */
export interface ComponentData {
  [componentName: string]: {
    uses: number;
    files: string[];
    props?: number;
    spreadProps?: boolean;
    propsDetails?: Record<string, any>;
  };
}

/**
 * Import data structure
 */
export interface ImportData {
  [importName: string]: {
    count: number;
    files: string[];
    type?: string;
  };
}

/**
 * Table formatting options
 */
export interface TableOptions {
  componentData?: ComponentData;
  sortBy?: "uses" | "files" | "props" | "name";
  top?: number;
  showProps?: boolean;
}

export function formatGitHubReport(
  report: GitHubReport,
  options: ConsoleReportOptions = {},
): void {
  const { metadata, combined, repositories } = report;

  console.log(chalk.bold.cyan("\n" + "=".repeat(80)));
  console.log(chalk.bold.cyan("  🚀 GITHUB REPOSITORIES ANALYSIS REPORT"));
  console.log(chalk.bold.cyan("=".repeat(80) + "\n"));

  // Summary
  console.log(chalk.bold("📈 SUMMARY:"));
  console.log(chalk.gray(`  Library: ${chalk.cyan(metadata.library)}`));
  console.log(
    chalk.gray(`  Repositories Analyzed: ${metadata.repositories.length}`),
  );
  console.log(
    chalk.gray(`  Total Components Found: ${combined.totalComponents.length}`),
  );
  console.log(
    chalk.gray(`  Total Imports Found: ${combined.totalImports.length}`),
  );

  // Top components across all repos
  const topComponents = Object.entries(combined.componentFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (topComponents.length > 0) {
    console.log(chalk.bold("\n🏆 TOP COMPONENTS (Across All Repos):"));
    topComponents.forEach(([comp, count], idx) => {
      const rank = idx + 1;
      const emoji =
        rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "  ";
      console.log(
        `  ${emoji} ${rank}. ${chalk.green(comp)}: ${chalk.yellow(count)} uses`,
      );
    });
  }

  // Repository summaries
  if (combined.repoSummaries && combined.repoSummaries.length > 0) {
    console.log(chalk.bold("\n📦 REPOSITORY SUMMARIES:\n"));
    combined.repoSummaries.forEach((summary, idx) => {
      console.log(`  ${chalk.bold(idx + 1 + ".")} ${chalk.cyan(summary.name)}`);
      console.log(`     Components: ${summary.components}`);
      console.log(`     Files: ${summary.files}`);
      if (summary.topComponents && summary.topComponents.length > 0) {
        console.log(`     Top Components:`);
        summary.topComponents.slice(0, 3).forEach((comp) => {
          console.log(`       - ${comp.component}: ${comp.uses} uses`);
        });
      }
      console.log("");
    });
  }

  // Component distribution
  console.log(chalk.bold("🔍 COMPONENT DISTRIBUTION:"));
  Object.entries(combined.componentsByRepo).forEach(([repo, components]) => {
    console.log(
      `  ${chalk.cyan(repo)}: ${components.length} unique components`,
    );
  });

  console.log(chalk.bold.cyan("\n" + "=".repeat(80)));
}

function createBar(percentage: number, width: number = 20): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
}
