const chalk = require('chalk');
const Table = require('cli-table3');

/**
 * Format aggregated report for console output
 * @param {Object} report - The aggregated report data
 * @param {Object} options - Formatting options
 */
function formatConsoleReport(report, options = {}) {
  const { metadata, aggregated } = report;

  console.log(chalk.bold.cyan('\n' + '='.repeat(80)));
  console.log(chalk.bold.cyan('  📊 REACT COMPONENT USAGE ANALYSIS REPORT'));
  console.log(chalk.bold.cyan('='.repeat(80) + '\n'));

  // Metadata
  console.log(chalk.bold('📋 ANALYSIS SUMMARY:'));
  console.log(
    chalk.gray(`  Timestamp: ${new Date(metadata.timestamp).toLocaleString()}`),
  );
  console.log(chalk.gray(`  Library: ${chalk.cyan(metadata.library)}`));
  console.log(chalk.gray(`  Files Analyzed: ${metadata.filesAnalyzed}`));
  if (metadata.filesWithErrors > 0) {
    console.log(
      chalk.yellow(`  Files with Errors: ${metadata.filesWithErrors}`),
    );
  }

  // Top components
  const topComponents = Object.entries(aggregated.componentFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, options.top || 10);

  if (topComponents.length > 0) {
    console.log(chalk.bold('\n🏆 TOP COMPONENTS:'));
    topComponents.forEach(([comp, count], idx) => {
      const rank = idx + 1;
      const emoji =
        rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
      console.log(
        `  ${emoji} ${rank}. ${chalk.green(comp)}: ${chalk.yellow(count)} uses`,
      );
    });
  }

  // Pattern frequency
  const topPatterns = Object.entries(aggregated.patternFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topPatterns.length > 0 && !options.summaryOnly) {
    console.log(chalk.bold('\n🔍 USAGE PATTERNS:'));
    topPatterns.forEach(([pattern, count]) => {
      console.log(`  ${chalk.cyan(pattern)}: ${count} occurrences`);
    });
  }

  // Complexity distribution
  if (
    aggregated.fileComplexity &&
    Object.keys(aggregated.fileComplexity).length > 0
  ) {
    console.log(chalk.bold('\n💡 COMPLEXITY DISTRIBUTION:'));
    const complexityLevels = {
      Simple: 0,
      Moderate: 0,
      Complex: 0,
      'Very Complex': 0,
      'Extremely Complex': 0,
    };

    Object.values(aggregated.fileComplexity).forEach((data) => {
      if (complexityLevels.hasOwnProperty(data.level)) {
        complexityLevels[data.level]++;
      }
    });

    Object.entries(complexityLevels).forEach(([level, count]) => {
      if (count > 0) {
        const percentage = Math.round((count / metadata.filesAnalyzed) * 100);
        const bar = createBar(percentage, 20);
        console.log(`  ${level.padEnd(18)} ${bar} ${percentage}%`);
      }
    });
  }

  // Errors
  if (aggregated.errors && aggregated.errors.length > 0) {
    console.log(chalk.bold.red('\n⚠️  ERRORS:'));
    aggregated.errors.slice(0, 5).forEach((error) => {
      console.log(chalk.red(`  ${error.file}: ${error.error}`));
    });
    if (aggregated.errors.length > 5) {
      console.log(
        chalk.gray(`  ... and ${aggregated.errors.length - 5} more errors`),
      );
    }
  }

  console.log(chalk.bold.cyan('\n' + '='.repeat(80) + '\n'));
}

/**
 * Format GitHub analysis report for console output
 * @param {Object} report - The GitHub analysis report
 * @param {Object} options - Formatting options
 */
function formatGitHubReport(report, options = {}) {
  const { metadata, combined, repositories } = report;

  console.log(chalk.bold.cyan('\n' + '='.repeat(80)));
  console.log(chalk.bold.cyan('  🚀 GITHUB REPOSITORIES ANALYSIS REPORT'));
  console.log(chalk.bold.cyan('='.repeat(80) + '\n'));

  // Summary
  console.log(chalk.bold('📈 SUMMARY:'));
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
    console.log(chalk.bold('\n🏆 TOP COMPONENTS (Across All Repos):'));
    topComponents.forEach(([comp, count], idx) => {
      const rank = idx + 1;
      const emoji =
        rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
      console.log(
        `  ${emoji} ${rank}. ${chalk.green(comp)}: ${chalk.yellow(count)} uses`,
      );
    });
  }

  // Repository summaries
  if (combined.repoSummaries && combined.repoSummaries.length > 0) {
    console.log(chalk.bold('\n📦 REPOSITORY SUMMARIES:\n'));
    combined.repoSummaries.forEach((summary, idx) => {
      console.log(`  ${chalk.bold(idx + 1 + '.')} ${chalk.cyan(summary.name)}`);
      console.log(`     Components: ${summary.components}`);
      console.log(`     Files: ${summary.files}`);
      if (summary.topComponents && summary.topComponents.length > 0) {
        console.log(`     Top Components:`);
        summary.topComponents.slice(0, 3).forEach((comp) => {
          console.log(`       - ${comp.component}: ${comp.uses} uses`);
        });
      }
      console.log('');
    });
  }

  // Component distribution
  console.log(chalk.bold('🔍 COMPONENT DISTRIBUTION:'));
  Object.entries(combined.componentsByRepo).forEach(([repo, components]) => {
    console.log(
      `  ${chalk.cyan(repo)}: ${components.length} unique components`,
    );
  });

  console.log(chalk.bold.cyan('\n' + '='.repeat(80)));

  // Tips
  console.log(chalk.bold('\n💡 TIPS:'));
  console.log('  • Use --keep-repos to inspect cloned repositories locally');
  console.log('  • Use --branch <name> to analyze different branches');
  console.log('  • Use --pattern to customize which files to analyze');
  console.log('  • Use --config <file> to load repositories from JSON file');
  console.log('  • JSON report contains detailed per-repo analysis');

  // Config example
  console.log(chalk.bold('\n📝 CONFIG FILE FORMAT:'));
  console.log(
    chalk.gray(`  {
    "repositories": [
      "owner/repo1",
      "owner/repo2",
      "https://github.com/owner/repo3"
    ]
  }`),
  );

  console.log('');
}

/**
 * Format comparison report for console output
 * @param {Object} report - The comparison report
 */
function formatComparisonReport(report) {
  console.log(chalk.bold.cyan('\n📊 LIBRARY COMPARISON REPORT\n'));

  report.libraries.forEach((lib, idx) => {
    const rank = idx + 1;
    const emoji =
      rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';

    console.log(`${emoji} ${chalk.bold(lib.name)}`);
    console.log(`   Components Found: ${chalk.yellow(lib.componentsFound)}`);
    console.log(
      `   Total Usage Patterns: ${chalk.cyan(lib.totalUsagePatterns)}`,
    );

    if (lib.topComponents && lib.topComponents.length > 0) {
      console.log(`   Top Components:`);
      lib.topComponents.forEach((comp) => {
        console.log(`     - ${chalk.green(comp.component)}: ${comp.uses} uses`);
      });
    }
    console.log('');
  });
}

/**
 * Format table output for components
 * @param {Object} data - Component data
 * @param {Object} options - Table options
 */
function formatComponentTable(data, options = {}) {
  const {
    componentData,
    sortBy = 'uses',
    top = 20,
    showProps = false,
  } = options;

  const table = new Table({
    head: [
      chalk.cyan('Component'),
      chalk.cyan('Uses'),
      chalk.cyan('Files'),
      ...(showProps ? [chalk.cyan('Props'), chalk.cyan('Spread')] : []),
    ],
    colWidths: [30, 8, 8, ...(showProps ? [8, 8] : [])],
    style: { head: ['cyan'], border: ['gray'] },
  });

  // Sort data
  const sortedData = Object.entries(componentData)
    .sort((a, b) => {
      const [nameA, dataA] = a;
      const [nameB, dataB] = b;

      if (sortBy === 'uses') return dataB.uses - dataA.uses;
      if (sortBy === 'files') return dataB.files.length - dataA.files.length;
      if (sortBy === 'props') return (dataB.props || 0) - (dataA.props || 0);
      return nameA.localeCompare(nameB);
    })
    .slice(0, top);

  // Add rows
  sortedData.forEach(([name, data]) => {
    const row = [name, data.uses.toString(), data.files.length.toString()];

    if (showProps) {
      row.push((data.props || 0).toString());
      row.push(data.spreadProps ? chalk.yellow('Yes') : chalk.gray('No'));
    }

    table.push(row);
  });

  return table.toString();
}

/**
 * Format import table
 * @param {Object} importData - Import data
 * @param {Object} options - Table options
 */
function formatImportTable(importData, options = {}) {
  const { sortBy = 'count', top = 20 } = options;

  const table = new Table({
    head: [
      chalk.cyan('Import'),
      chalk.cyan('Count'),
      chalk.cyan('Files'),
      chalk.cyan('Type'),
    ],
    colWidths: [30, 8, 8, 12],
    style: { head: ['cyan'], border: ['gray'] },
  });

  const sortedData = Object.entries(importData)
    .sort((a, b) => {
      if (sortBy === 'count') return b[1].count - a[1].count;
      return a[0].localeCompare(b[0]);
    })
    .slice(0, top);

  sortedData.forEach(([name, data]) => {
    table.push([
      name,
      data.count.toString(),
      data.files.length.toString(),
      data.type || 'named',
    ]);
  });

  return table.toString();
}

/**
 * Create ASCII bar chart
 * @param {number} percentage - Percentage value (0-100)
 * @param {number} width - Width of the bar
 * @returns {string} ASCII bar
 */
function createBar(percentage, width = 20) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

/**
 * Get complexity icon
 * @param {string} level - Complexity level
 * @returns {string} Icon
 */
function getComplexityIcon(level) {
  const icons = {
    Simple: '✅',
    Moderate: '⚠️',
    Complex: '🔶',
    'Very Complex': '🔴',
    'Extremely Complex': '💀',
  };
  return icons[level] || '❓';
}

/**
 * Format JSON output with metadata
 * @param {Object} data - Data to format
 * @param {string} outputPath - Path to save JSON file
 */
function saveJsonReport(data, outputPath) {
  const fs = require('fs');
  const path = require('path');

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write JSON file
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(chalk.blue(`\n📄 JSON report saved to: ${outputPath}`));
}

module.exports = {
  formatConsoleReport,
  formatGitHubReport,
  formatComparisonReport,
  formatComponentTable,
  formatImportTable,
  createBar,
  getComplexityIcon,
  saveJsonReport,
};
