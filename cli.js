#!/usr/bin/env node

const { Command } = require("commander");
const { glob } = require("glob");
const chalk = require("chalk");
const ora = require("ora");
const fs = require("fs");
const path = require("path");
const Table = require("cli-table3");
const { ReactComponentUsageAnalyzer } = require("./parser");
const { FocusedUsageAnalyzer } = require("./analyze-usage");
const GitHubAnalyzer = require("./github-analyzer");

const program = new Command();

// CLI Configuration
program
  .name("react-usage-analyzer")
  .description("Analyze React component usage patterns in your codebase")
  .version("1.0.0");

// Analyze command
program
  .command("analyze")
  .description(
    "Analyze component usage patterns in files matching a glob pattern",
  )
  .argument(
    "<pattern>",
    'Glob pattern for files to analyze (e.g., "src/**/*.tsx")',
  )
  .option(
    "-l, --library <name>",
    "Library name to analyze (e.g., @mui/material)",
    "@design-system/foundation",
  )
  .option(
    "-o, --output <file>",
    "Output file path for JSON report",
    "analysis-report.json",
  )
  .option(
    "-f, --format <type>",
    "Output format: json, console, or both",
    "both",
  )
  .option("-c, --complexity", "Include complexity analysis", false)
  .option(
    "-s, --summary-only",
    "Show only summary, not detailed patterns",
    false,
  )
  .option(
    "--ignore <patterns...>",
    'Glob patterns to ignore (e.g., "**/*.test.tsx")',
    [],
  )
  .option("--max-files <number>", "Maximum number of files to analyze", "1000")
  .action(async (pattern, options) => {
    await analyzeCommand(pattern, options);
  });

// Compare command
program
  .command("compare")
  .description("Compare usage patterns across multiple libraries")
  .argument("<pattern>", "Glob pattern for files to analyze")
  .option("-l, --libraries <names...>", "Library names to compare", [
    "@mui/material",
    "antd",
    "@chakra-ui/react",
  ])
  .option(
    "-o, --output <file>",
    "Output file path for comparison report",
    "comparison-report.json",
  )
  .option(
    "-f, --format <type>",
    "Output format: json, console, or both",
    "both",
  )
  .action(async (pattern, options) => {
    await compareCommand(pattern, options);
  });

// Summary command
program
  .command("summary")
  .description("Generate a quick summary of component usage")
  .argument("<pattern>", "Glob pattern for files to analyze")
  .option(
    "-l, --library <name>",
    "Library name to analyze",
    "@design-system/foundation",
  )
  .option("--top <number>", "Number of top components to show", "10")
  .action(async (pattern, options) => {
    await summaryCommand(pattern, options);
  });

// Patterns command
program
  .command("patterns")
  .description("List all detected usage patterns")
  .argument("<pattern>", "Glob pattern for files to analyze")
  .option(
    "-l, --library <name>",
    "Library name to analyze",
    "@design-system/foundation",
  )
  .option("--sort <by>", "Sort by: frequency, complexity, or name", "frequency")
  .action(async (pattern, options) => {
    await patternsCommand(pattern, options);
  });

// Stats command
program
  .command("stats")
  .description("Show detailed statistics about component usage")
  .argument("<pattern>", "Glob pattern for files to analyze")
  .option(
    "-l, --library <name>",
    "Library name to analyze",
    "@design-system/foundation",
  )
  .option("--chart", "Show ASCII charts", false)
  .action(async (pattern, options) => {
    await statsCommand(pattern, options);
  });

// Table command
program
  .command("table")
  .description("Show components and imports in table format")
  .argument("<pattern>", "Glob pattern for files to analyze")
  .option(
    "-l, --library <name>",
    "Library name to analyze",
    "@design-system/foundation",
  )
  .option("-s, --sort <by>", "Sort by: uses, name, files, or props", "uses")
  .option("-t, --top <number>", "Number of top items to show", "20")
  .option("--props", "Show props analysis", false)
  .action(async (pattern, options) => {
    await tableCommand(pattern, options);
  });

// GitHub command
program
  .command("github")
  .description("Analyze GitHub repositories")
  .argument(
    "[repos...]",
    "GitHub repository URLs or owner/repo format (or use --config)",
  )
  .option(
    "-l, --library <name>",
    "Library name to analyze",
    "@design-system/foundation",
  )
  .option("-b, --branch <name>", "Branch to analyze", "main")
  .option(
    "-p, --pattern <glob>",
    "File pattern to analyze",
    "**/*.{tsx,jsx,ts,js}",
  )
  .option("-o, --output <file>", "Output JSON file", "github-analysis.json")
  .option(
    "-f, --format <type>",
    "Output format: json, console, or both",
    "both",
  )
  .option("--keep-repos", "Keep cloned repositories after analysis", false)
  .option("--depth <number>", "Clone depth", "1")
  .option("-c, --complexity", "Include complexity analysis", false)
  .option("--config <file>", "Path to config file with repository list")
  .action(async (repos, options) => {
    await githubCommand(repos, options);
  });

// Main analyze command implementation
async function analyzeCommand(pattern, options) {
  const spinner = ora("Finding files to analyze...").start();

  try {
    // Find matching files
    const files = await findFiles(
      pattern,
      options.ignore,
      parseInt(options.maxFiles),
    );

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

          const fileResult = {
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
          report.components.forEach((comp) =>
            aggregatedReport.aggregated.allComponents.add(comp),
          );
          aggregatedReport.aggregated.totalImports +=
            report.summary.totalImports;
          aggregatedReport.aggregated.totalUsagePatterns +=
            report.summary.totalUsagePatterns;

          // Count component usage
          report.patterns.usage.jsx.forEach((usage) => {
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
      } catch (error) {
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
    );

    spinner.succeed(
      chalk.green(
        `Analysis complete! Analyzed ${aggregatedReport.metadata.filesAnalyzed} files`,
      ),
    );

    // Generate output
    if (options.format === "json" || options.format === "both") {
      fs.writeFileSync(
        options.output,
        JSON.stringify(aggregatedReport, null, 2),
      );
      console.log(chalk.blue(`\n📄 JSON report saved to: ${options.output}`));
    }

    if (options.format === "console" || options.format === "both") {
      printAggregatedReport(aggregatedReport, options);
    }
  } catch (error) {
    spinner.fail(chalk.red("Analysis failed: " + error.message));
    console.error(error);
  }
}

// Compare command implementation
async function compareCommand(pattern, options) {
  const spinner = ora("Finding files to analyze...").start();

  try {
    const files = await findFiles(pattern, [], 1000);

    if (files.length === 0) {
      spinner.fail(chalk.red("No files found matching pattern: " + pattern));
      return;
    }

    spinner.succeed(chalk.green(`Found ${files.length} files`));

    const comparisonResults = {
      metadata: {
        timestamp: new Date().toISOString(),
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
      const components = new Set();

      for (const file of files) {
        try {
          const report = analyzer.analyzeFile(file);
          if (report) {
            componentsFound += report.summary.totalComponents;
            usagePatterns += report.summary.totalUsagePatterns;
            report.components.forEach((comp) => components.add(comp));
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
      (a, b) => b.componentsFound - a.componentsFound,
    );

    // Save and display
    if (options.format === "json" || options.format === "both") {
      fs.writeFileSync(
        options.output,
        JSON.stringify(comparisonResults, null, 2),
      );
      console.log(
        chalk.blue(`\n📄 Comparison report saved to: ${options.output}`),
      );
    }

    if (options.format === "console" || options.format === "both") {
      printComparisonReport(comparisonResults);
    }
  } catch (error) {
    spinner.fail(chalk.red("Comparison failed: " + error.message));
    console.error(error);
  }
}

// Summary command implementation
async function summaryCommand(pattern, options) {
  const spinner = ora("Generating summary...").start();

  try {
    const files = await findFiles(pattern, [], 1000);

    if (files.length === 0) {
      spinner.fail(chalk.red("No files found"));
      return;
    }

    const analyzer = new ReactComponentUsageAnalyzer(options.library);
    const componentUsage = {};
    let totalFiles = 0;

    for (const file of files) {
      try {
        const report = analyzer.analyzeFile(file);
        if (report) {
          totalFiles++;
          report.patterns.usage.jsx.forEach((usage) => {
            if (!componentUsage[usage.component]) {
              componentUsage[usage.component] = { count: 0, files: new Set() };
            }
            componentUsage[usage.component].count += usage.count;
            componentUsage[usage.component].files.add(file);
          });
        }
      } catch (error) {
        // Skip
      }
    }

    spinner.succeed(chalk.green("Summary generated"));

    console.log(chalk.bold("\n📊 COMPONENT USAGE SUMMARY\n"));
    console.log(chalk.gray(`Library: ${options.library}`));
    console.log(chalk.gray(`Files analyzed: ${totalFiles}\n`));

    const topN = parseInt(options.top);
    const sorted = Object.entries(componentUsage)
      .map(([comp, data]) => ({
        comp,
        count: data.count,
        files: data.files.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);

    console.log(chalk.bold(`Top ${topN} Components:`));
    sorted.forEach((item, index) => {
      const rank = index + 1;
      const emoji =
        rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "  ";
      console.log(
        `${emoji} ${rank}. ${chalk.cyan(item.comp)}: ${chalk.yellow(item.count)} uses in ${chalk.green(item.files)} files`,
      );
    });
  } catch (error) {
    spinner.fail(chalk.red("Summary failed: " + error.message));
  }
}

// Patterns command implementation
async function patternsCommand(pattern, options) {
  const spinner = ora("Analyzing patterns...").start();

  try {
    const files = await findFiles(pattern, [], 1000);

    if (files.length === 0) {
      spinner.fail(chalk.red("No files found"));
      return;
    }

    const analyzer = new FocusedUsageAnalyzer(options.library);
    const patternStats = {};

    for (const file of files) {
      try {
        const report = analyzer.analyzeFile(file);
        if (report) {
          const analysis = analyzer.classifyUsage(report);

          analysis.foundPatterns.forEach((data, patternName) => {
            if (!patternStats[patternName]) {
              patternStats[patternName] = {
                count: 0,
                complexity: data.complexity,
                files: new Set(),
              };
            }
            patternStats[patternName].count += data.count;
            patternStats[patternName].files.add(file);
          });
        }
      } catch (error) {
        // Skip
      }
    }

    spinner.succeed(chalk.green("Pattern analysis complete"));

    console.log(chalk.bold("\n🔍 USAGE PATTERNS DETECTED\n"));

    let sorted = Object.entries(patternStats);

    if (options.sort === "complexity") {
      sorted = sorted.sort((a, b) => b[1].complexity - a[1].complexity);
    } else if (options.sort === "frequency") {
      sorted = sorted.sort((a, b) => b[1].count - a[1].count);
    } else {
      sorted = sorted.sort((a, b) => a[0].localeCompare(b[0]));
    }

    sorted.forEach(([name, stats]) => {
      const icon = getComplexityIcon(stats.complexity);
      console.log(`${icon} ${chalk.bold(name)}`);
      console.log(`   Complexity: ${stats.complexity}/10`);
      console.log(`   Instances: ${chalk.yellow(stats.count)}`);
      console.log(`   Files: ${chalk.green(stats.files.size)}`);
      console.log("");
    });
  } catch (error) {
    spinner.fail(chalk.red("Pattern analysis failed: " + error.message));
  }
}

// Stats command implementation
async function statsCommand(pattern, options) {
  const spinner = ora("Generating statistics...").start();

  try {
    const files = await findFiles(pattern, [], 1000);

    if (files.length === 0) {
      spinner.fail(chalk.red("No files found"));
      return;
    }

    const analyzer = new FocusedUsageAnalyzer(options.library);
    const stats = {
      totalFiles: files.length,
      analyzedFiles: 0,
      totalComponents: new Set(),
      totalPatterns: 0,
      complexityDistribution: {
        Simple: 0,
        Moderate: 0,
        Complex: 0,
        "Very Complex": 0,
        "Extremely Complex": 0,
      },
      avgComplexity: 0,
      topComponents: {},
      topPatterns: {},
    };

    let totalComplexityScore = 0;

    for (const file of files) {
      try {
        const report = analyzer.analyzeFile(file);
        if (report) {
          stats.analyzedFiles++;
          report.components.forEach((comp) => stats.totalComponents.add(comp));
          stats.totalPatterns += report.summary.totalUsagePatterns;

          const analysis = analyzer.classifyUsage(report);
          const complexity = analyzer.generateComplexityScore(
            analysis.foundPatterns,
          );

          stats.complexityDistribution[complexity.level]++;
          totalComplexityScore += complexity.score;

          // Track component usage
          report.patterns.usage.jsx.forEach((usage) => {
            stats.topComponents[usage.component] =
              (stats.topComponents[usage.component] || 0) + usage.count;
          });

          // Track pattern usage
          analysis.foundPatterns.forEach((data, patternName) => {
            stats.topPatterns[patternName] =
              (stats.topPatterns[patternName] || 0) + data.count;
          });
        }
      } catch (error) {
        // Skip
      }
    }

    stats.avgComplexity =
      stats.analyzedFiles > 0 ? totalComplexityScore / stats.analyzedFiles : 0;
    stats.totalComponents = stats.totalComponents.size;

    spinner.succeed(chalk.green("Statistics generated"));

    // Print stats
    console.log(chalk.bold("\n📈 DETAILED STATISTICS\n"));
    console.log(chalk.cyan("Overview:"));
    console.log(`  Total Files: ${stats.totalFiles}`);
    console.log(`  Analyzed Files: ${chalk.green(stats.analyzedFiles)}`);
    console.log(`  Unique Components: ${chalk.yellow(stats.totalComponents)}`);
    console.log(`  Total Patterns: ${chalk.yellow(stats.totalPatterns)}`);
    console.log(
      `  Average Complexity: ${chalk.yellow(stats.avgComplexity.toFixed(2))}`,
    );

    console.log(chalk.cyan("\nComplexity Distribution:"));
    Object.entries(stats.complexityDistribution).forEach(([level, count]) => {
      if (count > 0) {
        const percentage = ((count / stats.analyzedFiles) * 100).toFixed(1);
        const bar = options.chart
          ? createBar(count, stats.analyzedFiles, 30)
          : "";
        console.log(
          `  ${level.padEnd(20)} ${count.toString().padStart(4)} (${percentage}%) ${bar}`,
        );
      }
    });

    console.log(chalk.cyan("\nTop 5 Components:"));
    Object.entries(stats.topComponents)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([comp, count], index) => {
        console.log(
          `  ${index + 1}. ${comp.padEnd(30)} ${chalk.yellow(count)} uses`,
        );
      });

    console.log(chalk.cyan("\nTop 5 Patterns:"));
    Object.entries(stats.topPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([pattern, count], index) => {
        console.log(
          `  ${index + 1}. ${pattern.padEnd(30)} ${chalk.yellow(count)} instances`,
        );
      });
  } catch (error) {
    spinner.fail(chalk.red("Stats generation failed: " + error.message));
  }
}

// Table command implementation
async function tableCommand(pattern, options) {
  const spinner = ora("Generating table...").start();

  try {
    const files = await findFiles(pattern, [], 1000);

    if (files.length === 0) {
      spinner.fail(chalk.red("No files found"));
      return;
    }

    const analyzer = new ReactComponentUsageAnalyzer(options.library);
    const componentData = {};
    const importData = {};

    for (const file of files) {
      try {
        const report = analyzer.analyzeFile(file);
        if (report) {
          // Aggregate component usage
          report.patterns.usage.jsx.forEach((usage) => {
            if (!componentData[usage.component]) {
              componentData[usage.component] = {
                uses: 0,
                files: new Set(),
                props: new Set(),
                spreadProps: 0,
                propsDetails: [],
              };
            }
            componentData[usage.component].uses += usage.count;
            componentData[usage.component].files.add(file);

            // Aggregate props data
            usage.usages.forEach((u) => {
              if (u.propsAnalysis) {
                u.propsAnalysis.namedProps.forEach((prop) =>
                  componentData[usage.component].props.add(prop),
                );
                if (u.propsAnalysis.hasSpread) {
                  componentData[usage.component].spreadProps++;
                }
              }
            });
          });

          // Aggregate import data
          [
            ...report.patterns.imports.default,
            ...report.patterns.imports.named,
          ].forEach((imp) => {
            const name = imp.name || imp.local;
            if (!importData[name]) {
              importData[name] = {
                files: new Set(),
                type: imp.imported ? "named" : "default",
              };
            }
            importData[name].files.add(file);
          });
        }
      } catch (error) {
        // Skip
      }
    }

    spinner.succeed(chalk.green("Table generated"));

    // Convert sets to counts
    Object.keys(componentData).forEach((key) => {
      componentData[key].filesCount = componentData[key].files.size;
      componentData[key].propsCount = componentData[key].props.size;
      componentData[key].propsList = Array.from(componentData[key].props);
    });

    Object.keys(importData).forEach((key) => {
      importData[key].filesCount = importData[key].files.size;
    });

    // Sort data
    const sortedComponents = Object.entries(componentData)
      .sort((a, b) => {
        switch (options.sort) {
          case "name":
            return a[0].localeCompare(b[0]);
          case "files":
            return b[1].filesCount - a[1].filesCount;
          case "props":
            return b[1].propsCount - a[1].propsCount;
          case "uses":
          default:
            return b[1].uses - a[1].uses;
        }
      })
      .slice(0, parseInt(options.top));

    const sortedImports = Object.entries(importData)
      .sort((a, b) => {
        if (options.sort === "name") {
          return a[0].localeCompare(b[0]);
        }
        return b[1].filesCount - a[1].filesCount;
      })
      .slice(0, parseInt(options.top));

    // Display components table
    console.log(chalk.bold("\n📊 COMPONENT USAGE TABLE\n"));

    const componentTable = new Table({
      head: [
        chalk.cyan("Component"),
        chalk.cyan("Uses"),
        chalk.cyan("Files"),
        ...(options.props ? [chalk.cyan("Props"), chalk.cyan("Spread")] : []),
      ],
      colWidths: [30, 10, 10, ...(options.props ? [40, 10] : [])],
      style: { head: [], border: [] },
    });

    sortedComponents.forEach(([component, data]) => {
      const row = [
        component,
        chalk.yellow(data.uses),
        chalk.green(data.filesCount),
      ];

      if (options.props) {
        const propsDisplay =
          data.propsCount > 0
            ? data.propsList.slice(0, 5).join(", ") +
              (data.propsCount > 5 ? "..." : "")
            : "-";
        const spreadDisplay =
          data.spreadProps > 0
            ? chalk.red(`⚠ ${data.spreadProps}`)
            : chalk.gray("0");
        row.push(propsDisplay, spreadDisplay);
      }

      componentTable.push(row);
    });

    console.log(componentTable.toString());

    // Display imports table
    console.log(chalk.bold("\n📦 IMPORTS TABLE\n"));

    const importTable = new Table({
      head: [chalk.cyan("Import"), chalk.cyan("Type"), chalk.cyan("Files")],
      colWidths: [30, 15, 10],
      style: { head: [], border: [] },
    });

    sortedImports.forEach(([name, data]) => {
      importTable.push([
        name,
        data.type === "named" ? chalk.blue("named") : chalk.green("default"),
        chalk.yellow(data.filesCount),
      ]);
    });

    console.log(importTable.toString());

    // Props details if requested
    if (options.props) {
      console.log(chalk.bold("\n🔧 PROPS ANALYSIS\n"));

      sortedComponents.forEach(([component, data]) => {
        if (data.propsCount > 0 || data.spreadProps > 0) {
          console.log(chalk.cyan(`${component}:`));
          console.log(`  Props: ${data.propsList.join(", ")}`);
          if (data.spreadProps > 0) {
            console.log(
              chalk.yellow(
                `  ⚠ Warning: ${data.spreadProps} usage(s) with spread props (cannot analyze statically)`,
              ),
            );
          }
          console.log("");
        }
      });
    }

    // Summary
    console.log(chalk.bold("📈 SUMMARY"));
    console.log(`  Total Components: ${Object.keys(componentData).length}`);
    console.log(`  Total Imports: ${Object.keys(importData).length}`);
    console.log(`  Files Analyzed: ${files.length}`);
    console.log(`  Sort: ${options.sort}`);
  } catch (error) {
    spinner.fail(chalk.red("Table generation failed: " + error.message));
  }
}

// GitHub command implementation
async function githubCommand(repos, options) {
  const spinner = ora("Initializing GitHub analyzer...").start();

  try {
    // Load repositories from config file or arguments
    let repoList = repos || [];

    if (options.config) {
      spinner.text = `Loading repositories from ${options.config}...`;
      try {
        const configContent = fs.readFileSync(options.config, "utf8");
        const config = JSON.parse(configContent);
        repoList = config.repositories || [];
        spinner.succeed(
          chalk.green(`Loaded ${repoList.length} repositories from config`),
        );
        spinner.start();
      } catch (error) {
        spinner.fail(chalk.red(`Failed to load config file: ${error.message}`));
        process.exit(1);
      }
    }

    if (repoList.length === 0) {
      spinner.fail(
        chalk.red(
          "No repositories specified. Use arguments or --config <file>",
        ),
      );
      console.log(
        chalk.yellow("\nExample: node cli.js github owner/repo1 owner/repo2"),
      );
      console.log(chalk.yellow("Or: node cli.js github --config repos.json"));
      process.exit(1);
    }

    const githubAnalyzer = new GitHubAnalyzer({
      branch: options.branch,
      pattern: options.pattern,
      depth: parseInt(options.depth),
      keepRepos: options.keepRepos,
    });

    spinner.succeed(chalk.green("GitHub analyzer initialized"));

    // Create analyzer instance
    const analyzer = options.complexity
      ? new FocusedUsageAnalyzer(options.library)
      : new ReactComponentUsageAnalyzer(options.library);

    // Analyze repositories
    const results = await githubAnalyzer.analyzeRepositories(
      repoList,
      analyzer,
    );

    // Generate combined report
    const combined = githubAnalyzer.generateCombinedReport(results);

    // Create full report
    const fullReport = {
      metadata: {
        ...results.metadata,
        library: options.library,
        repositories: repoList,
      },
      combined: combined,
      repositories: results.repositories,
      cloneErrors: results.cloneErrors,
    };

    // Save JSON if requested
    if (options.format === "json" || options.format === "both") {
      fs.writeFileSync(options.output, JSON.stringify(fullReport, null, 2));
      console.log(chalk.blue(`\n📄 JSON report saved to: ${options.output}`));
    }

    // Display console output
    if (options.format === "console" || options.format === "both") {
      printGitHubReport(fullReport, options);
    }

    // Cleanup
    await githubAnalyzer.cleanup();
  } catch (error) {
    spinner.fail(chalk.red("GitHub analysis failed: " + error.message));
    console.error(error);
    process.exit(1);
  }
}

function printGitHubReport(report, options) {
  console.log("\n" + chalk.bold.blue("═".repeat(80)));
  console.log(chalk.bold.blue("  🚀 GITHUB REPOSITORIES ANALYSIS REPORT"));
  console.log(chalk.bold.blue("═".repeat(80)));

  console.log(chalk.bold("\n📈 SUMMARY:"));
  console.log(`  Library: ${chalk.cyan(report.metadata.library)}`);
  console.log(
    `  Repositories Analyzed: ${chalk.green(report.metadata.totalRepositories)}`,
  );
  if (report.metadata.failedClones > 0) {
    console.log(`  Failed Clones: ${chalk.red(report.metadata.failedClones)}`);
  }
  console.log(
    `  Total Components Found: ${chalk.yellow(report.combined.totalComponents.length)}`,
  );
  console.log(
    `  Total Imports Found: ${chalk.yellow(report.combined.totalImports.length)}`,
  );

  console.log(chalk.bold("\n🏆 TOP COMPONENTS (Across All Repos):"));
  const topComponents = Object.entries(report.combined.componentFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  topComponents.forEach(([comp, count], index) => {
    const rank = index + 1;
    const emoji =
      rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "  ";
    console.log(
      `  ${emoji} ${rank}. ${chalk.cyan(comp)}: ${chalk.yellow(count)} uses`,
    );
  });

  console.log(chalk.bold("\n📦 REPOSITORY SUMMARIES:"));
  report.combined.repoSummaries.forEach((summary, index) => {
    console.log(`\n  ${index + 1}. ${chalk.bold.cyan(summary.name)}`);
    console.log(`     Components: ${chalk.yellow(summary.components)}`);
    console.log(`     Files: ${chalk.green(summary.files)}`);
    if (summary.errors > 0) {
      console.log(`     Errors: ${chalk.red(summary.errors)}`);
    }
    if (summary.topComponents.length > 0) {
      console.log(`     Top Components:`);
      summary.topComponents.forEach((comp) => {
        console.log(
          `       - ${comp.component}: ${chalk.yellow(comp.uses)} uses`,
        );
      });
    }
  });

  console.log(chalk.bold("\n🔍 COMPONENT DISTRIBUTION:"));
  Object.entries(report.combined.componentsByRepo).forEach(
    ([repoName, components]) => {
      console.log(
        `  ${chalk.cyan(repoName)}: ${chalk.yellow(components.length)} unique components`,
      );
    },
  );

  if (report.cloneErrors.length > 0) {
    console.log(chalk.bold.red("\n⚠️  CLONE ERRORS:"));
    report.cloneErrors.forEach((error) => {
      console.log(`  ${chalk.red("✗")} ${error.url}: ${error.error}`);
    });
  }

  console.log("\n" + chalk.bold.blue("═".repeat(80)));

  // Display helpful tips
  console.log(chalk.bold("\n💡 TIPS:"));
  console.log("  • Use --keep-repos to inspect cloned repositories locally");
  console.log("  • Use --branch <name> to analyze different branches");
  console.log("  • Use --pattern to customize which files to analyze");
  console.log("  • Use --config <file> to load repositories from JSON file");
  console.log("  • JSON report contains detailed per-repo analysis");

  // Show example config format
  console.log(chalk.bold("\n📝 CONFIG FILE FORMAT:"));
  console.log(
    chalk.gray(`  {
    "repositories": [
      "owner/repo1",
      "owner/repo2",
      "https://github.com/owner/repo3"
    ]
  }`),
  );
}

// Helper functions
async function findFiles(pattern, ignorePatterns, maxFiles) {
  const allFiles = await glob(pattern, {
    ignore: ["node_modules/**", "dist/**", "build/**", ...ignorePatterns],
    nodir: true,
    // Support all React file types
    matchBase: true,
  });

  // Filter for React file types: tsx, jsx, ts, js
  const reactFiles = allFiles.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return [".tsx", ".jsx", ".ts", ".js"].includes(ext);
  });

  return reactFiles.slice(0, maxFiles);
}

function printAggregatedReport(report, options) {
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
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    topComponents.forEach(([comp, count], index) => {
      const rank = index + 1;
      const emoji =
        rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "  ";
      console.log(
        `  ${emoji} ${rank}. ${chalk.cyan(comp)}: ${chalk.yellow(count)} uses`,
      );
    });

    console.log(chalk.bold("\n🔍 PATTERN FREQUENCY:"));
    const topPatterns = Object.entries(report.aggregated.patternFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    topPatterns.forEach(([pattern, count], index) => {
      console.log(`  ${index + 1}. ${pattern}: ${chalk.yellow(count)}`);
    });

    if (report.aggregated.fileComplexity.length > 0) {
      console.log(chalk.bold("\n📊 COMPLEXITY ANALYSIS:"));
      const avgComplexity =
        report.aggregated.fileComplexity.reduce((sum, f) => sum + f.score, 0) /
        report.aggregated.fileComplexity.length;
      console.log(
        `  Average Complexity: ${chalk.yellow(avgComplexity.toFixed(2))}`,
      );

      const mostComplex = report.aggregated.fileComplexity
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      console.log(chalk.bold("\n  Most Complex Files:"));
      mostComplex.forEach((file, index) => {
        console.log(
          `  ${index + 1}. ${path.basename(file.file)}: ${chalk.yellow(file.score)} (${file.level})`,
        );
      });
    }
  }

  if (report.aggregated.errors.length > 0) {
    console.log(chalk.bold.red("\n⚠️  ERRORS:"));
    report.aggregated.errors.slice(0, 5).forEach((error) => {
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

function printComparisonReport(results) {
  console.log("\n" + chalk.bold.magenta("═".repeat(80)));
  console.log(chalk.bold.magenta("  🏆 LIBRARY COMPARISON REPORT"));
  console.log(chalk.bold.magenta("═".repeat(80)));

  console.log(chalk.bold("\n📊 RANKING BY COMPONENT USAGE:"));
  results.libraries.forEach((lib, index) => {
    const rank = index + 1;
    const emoji =
      rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "📍";
    console.log(`  ${emoji} ${rank}. ${chalk.cyan(lib.name)}`);
    console.log(`     Components: ${chalk.yellow(lib.componentsFound)}`);
    console.log(`     Usage Patterns: ${chalk.yellow(lib.totalUsagePatterns)}`);
    console.log(
      `     Top Components: ${lib.topComponents.slice(0, 3).join(", ")}`,
    );
    console.log("");
  });

  console.log(chalk.bold.magenta("═".repeat(80)) + "\n");
}

function getComplexityIcon(complexity) {
  if (complexity <= 2) return chalk.green("🟢");
  if (complexity <= 4) return chalk.yellow("🟡");
  if (complexity <= 6) return chalk.hex("#FFA500")("🟠");
  return chalk.red("🔴");
}

function createBar(value, max, width) {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  return chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
}

// Parse arguments and execute
program.parse(process.argv);

// Show help if no command provided
if (process.argv.length < 3) {
  program.help();
}
