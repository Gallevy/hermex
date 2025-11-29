import chalk from "chalk";
import ora from "ora";
import path from "path";
import { ReactComponentUsageAnalyzer } from "../parser";
import { FocusedUsageAnalyzer } from "../analyze-usage";
import { findFiles, saveReport, getRankEmoji } from "./shared";

interface AnalyzeOptions {
  library: string;
  output?: string;
  format: "json" | "console" | "both";
  complexity?: boolean;
  ignore?: string[];
  maxFiles?: number;
  summaryOnly?: boolean;
}

export async function analyzeCommand(
  pattern: string,
  options: AnalyzeOptions,
): Promise<void> {
  const spinner = ora("Finding files to analyze...").start();

  try {
    // Find matching files
    const files = await findFiles(pattern, options.ignore, options.maxFiles);

    if (files.length === 0) {
      spinner.fail(chalk.red("No files found matching pattern: " + pattern));
      return;
    }

    spinner.succeed(chalk.green(`Found ${files.length} files to analyze`));

    // Analyze files
    spinner.start("Analyzing files...");
    const analyzer = options.complexity
      ? new FocusedUsageAnalyzer(options.library)
      : new ReactComponentUsageAnalyzer(options.library);

    const aggregatedReport = {
      metadata: {
        timestamp: new Date().toISOString(),
        commandType: "analyze",
        library: options.library,
        pattern: pattern,
        filesAnalyzed: 0,
        filesWithErrors: 0,
        totalFiles: files.length,
      },
      files: [],
      aggregated: {
        allComponents: new Set(),
        totalImports: 0,
        totalUsagePatterns: 0,
        patternFrequency: {},
        componentFrequency: {},
        fileComplexity: [],
        errors: [],
      },
    };

    // Analyze each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      spinner.text = `Analyzing files... (${i + 1}/${files.length}) ${path.basename(file)}`;

      try {
        const report = analyzer.analyzeFile(file);

        if (report) {
          aggregatedReport.metadata.filesAnalyzed++;

          const fileResult: any = {
            path: file,
            components: report.components,
            summary: report.summary,
            patterns: report.patterns,
          };

          if (options.complexity) {
            const analysis = analyzer.classifyUsage(report);
            const complexity = analyzer.generateComplexityScore(
              analysis.foundPatterns,
            );
            fileResult.complexity = complexity;
            aggregatedReport.aggregated.fileComplexity.push({
              file: file,
              score: complexity.score,
              level: complexity.level,
            });
          }

          aggregatedReport.files.push(fileResult);

          // Aggregate data
          report.components.forEach((comp: string) =>
            aggregatedReport.aggregated.allComponents.add(comp),
          );
          aggregatedReport.aggregated.totalImports +=
            report.summary.totalImports;
          aggregatedReport.aggregated.totalUsagePatterns +=
            report.summary.totalUsagePatterns;

          // Count component usage
          report.patterns.usage.jsx.forEach((usage: any) => {
            aggregatedReport.aggregated.componentFrequency[usage.component] =
              (aggregatedReport.aggregated.componentFrequency[
                usage.component
              ] || 0) + usage.count;
          });

          // Count pattern types
          Object.keys(report.patterns).forEach((category) => {
            Object.keys(report.patterns[category]).forEach((patternType) => {
              const pattern = report.patterns[category][patternType];
              const count = Array.isArray(pattern) ? pattern.length : 0;
              if (count > 0) {
                const key = `${category}.${patternType}`;
                aggregatedReport.aggregated.patternFrequency[key] =
                  (aggregatedReport.aggregated.patternFrequency[key] || 0) +
                  count;
              }
            });
          });
        }
      } catch (error: any) {
        aggregatedReport.metadata.filesWithErrors++;
        aggregatedReport.aggregated.errors.push({
          file: file,
          error: error.message,
        });
      }
    }

    // Convert Set to Array for JSON serialization
    aggregatedReport.aggregated.allComponents = Array.from(
      aggregatedReport.aggregated.allComponents,
    ) as any;

    spinner.succeed(
      chalk.green(
        `Analysis complete! Analyzed ${aggregatedReport.metadata.filesAnalyzed} files`,
      ),
    );

    // Generate output
    if (options.format === "json" || options.format === "both") {
      saveReport({
        data: aggregatedReport,
        commandType: "analyze",
        outputPath: options.output,
        format: options.format,
      });
    }

    if (options.format === "console" || options.format === "both") {
      printAggregatedReport(aggregatedReport, options);
    }
  } catch (error: any) {
    spinner.fail(chalk.red("Analysis failed: " + error.message));
    console.error(error);
  }
}

function printAggregatedReport(report: any, options: AnalyzeOptions): void {
  console.log("\n" + chalk.bold.blue("═".repeat(80)));
  console.log(chalk.bold.blue("  📊 AGGREGATED ANALYSIS REPORT"));
  console.log(chalk.bold.blue("═".repeat(80)));

  console.log(chalk.bold("\n📈 SUMMARY:"));
  console.log(`  Library: ${chalk.cyan(report.metadata.library)}`);
  console.log(
    `  Files Analyzed: ${chalk.green(report.metadata.filesAnalyzed)} / ${report.metadata.totalFiles}`,
  );
  if (report.metadata.filesWithErrors > 0) {
    console.log(
      `  Files with Errors: ${chalk.red(report.metadata.filesWithErrors)}`,
    );
  }
  console.log(
    `  Total Components: ${chalk.yellow(report.aggregated.allComponents.length)}`,
  );
  console.log(
    `  Total Imports: ${chalk.yellow(report.aggregated.totalImports)}`,
  );
  console.log(
    `  Total Usage Patterns: ${chalk.yellow(report.aggregated.totalUsagePatterns)}`,
  );

  if (!options.summaryOnly) {
    console.log(chalk.bold("\n🎯 TOP COMPONENTS:"));
    const topComponents = Object.entries(report.aggregated.componentFrequency)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 10);

    topComponents.forEach(([comp, count]: [string, any], index: number) => {
      const rank = index + 1;
      const emoji = getRankEmoji(rank);
      console.log(
        `  ${emoji} ${rank}. ${chalk.cyan(comp)}: ${chalk.yellow(count)} uses`,
      );
    });

    console.log(chalk.bold("\n🔍 PATTERN FREQUENCY:"));
    const topPatterns = Object.entries(report.aggregated.patternFrequency)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 10);

    topPatterns.forEach(([pattern, count]: [string, any], index: number) => {
      console.log(`  ${index + 1}. ${pattern}: ${chalk.yellow(count)}`);
    });

    if (report.aggregated.fileComplexity.length > 0) {
      console.log(chalk.bold("\n📊 COMPLEXITY ANALYSIS:"));
      const avgComplexity =
        report.aggregated.fileComplexity.reduce(
          (sum: number, f: any) => sum + f.score,
          0,
        ) / report.aggregated.fileComplexity.length;
      console.log(
        `  Average Complexity: ${chalk.yellow(avgComplexity.toFixed(2))}`,
      );

      const mostComplex = report.aggregated.fileComplexity
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);
      console.log(chalk.bold("\n  Most Complex Files:"));
      mostComplex.forEach((file: any, index: number) => {
        console.log(
          `  ${index + 1}. ${path.basename(file.file)}: ${chalk.yellow(file.score)} (${file.level})`,
        );
      });
    }
  }

  if (report.aggregated.errors.length > 0) {
    console.log(chalk.bold.red("\n⚠️  ERRORS:"));
    report.aggregated.errors.slice(0, 5).forEach((error: any) => {
      console.log(
        `  ${chalk.red("✗")} ${path.basename(error.file)}: ${error.error}`,
      );
    });
    if (report.aggregated.errors.length > 5) {
      console.log(
        `  ... and ${report.aggregated.errors.length - 5} more errors`,
      );
    }
  }

  console.log("\n" + chalk.bold.blue("═".repeat(80)) + "\n");
}
