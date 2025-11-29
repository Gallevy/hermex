const { FocusedUsageAnalyzer } = require("./analyze-usage");
const fs = require("fs");

console.log("🔬 Multi-Library Analysis Test Suite");
console.log("=".repeat(60));

// Test different library configurations
const libraryConfigs = [
  {
    name: "Material-UI",
    pattern: "@mui",
    file: "examples/different-libraries.tsx",
  },
  {
    name: "Ant Design",
    pattern: "antd",
    file: "examples/different-libraries.tsx",
  },
  {
    name: "Chakra UI",
    pattern: "@chakra-ui",
    file: "examples/different-libraries.tsx",
  },
  {
    name: "Custom UI Kit",
    pattern: "@mycompany/ui-kit",
    file: "examples/different-libraries.tsx",
  },
  {
    name: "Foundation (Original)",
    pattern: "@design-system/foundation",
    file: "code-examples/comprehensive-usage.tsx",
  },
  {
    name: "Foundation (Common Patterns)",
    pattern: "@design-system/foundation",
    file: "code-examples/common-patterns.tsx",
  },
];

async function runMultiLibraryAnalysis() {
  const results = [];

  for (const config of libraryConfigs) {
    console.log(`\n📦 Analyzing ${config.name} (${config.pattern})`);
    console.log("-".repeat(50));

    try {
      if (!fs.existsSync(config.file)) {
        console.log(`❌ File not found: ${config.file}`);
        continue;
      }

      const analyzer = new FocusedUsageAnalyzer(config.pattern);
      const report = analyzer.analyzeFile(config.file);

      if (!report) {
        console.log(`❌ Failed to analyze ${config.file}`);
        continue;
      }

      // Run focused analysis
      const analysis = analyzer.classifyUsage(report);
      const complexity = analyzer.generateComplexityScore(
        analysis.foundPatterns,
      );
      const recommendations = analyzer.generateRecommendations(
        analysis.foundPatterns,
        complexity,
      );

      // Store results
      const result = {
        library: config.name,
        pattern: config.pattern,
        file: config.file,
        summary: {
          totalComponents: report.summary.totalComponents,
          totalUsagePatterns: report.summary.totalUsagePatterns,
          complexityLevel: complexity.level,
          complexityScore: complexity.score,
          patternsDetected: analysis.foundPatterns.size,
          recommendations: recommendations.length,
        },
        topComponents: report.patterns.usage.jsx
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map((usage) => ({ component: usage.component, count: usage.count })),
        patterns: Array.from(analysis.foundPatterns.keys()),
        complexity: complexity,
      };

      results.push(result);

      // Print summary for this library
      console.log(`✅ Analysis Complete:`);
      console.log(`   Components Found: ${result.summary.totalComponents}`);
      console.log(`   Usage Patterns: ${result.summary.totalUsagePatterns}`);
      console.log(
        `   Complexity: ${result.summary.complexityLevel} (${result.summary.complexityScore} points)`,
      );
      console.log(
        `   Top Component: ${result.topComponents[0]?.component || "None"} (${result.topComponents[0]?.count || 0} uses)`,
      );
      console.log(
        `   Patterns: ${result.patterns.slice(0, 3).join(", ")}${result.patterns.length > 3 ? "..." : ""}`,
      );
    } catch (error) {
      console.log(`❌ Error analyzing ${config.name}: ${error.message}`);
    }
  }

  return results;
}

function generateComparisonReport(results) {
  console.log("\n" + "🏆".repeat(60));
  console.log("🏆 MULTI-LIBRARY COMPARISON REPORT");
  console.log("🏆".repeat(60));

  // Sort by complexity score
  const sortedByComplexity = [...results].sort(
    (a, b) => b.summary.complexityScore - a.summary.complexityScore,
  );

  console.log("\n📊 COMPLEXITY RANKING:");
  sortedByComplexity.forEach((result, index) => {
    const rank = index + 1;
    const emoji =
      rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "📍";
    console.log(
      `   ${emoji} ${rank}. ${result.library}: ${result.summary.complexityLevel} (${result.summary.complexityScore} points)`,
    );
  });

  // Component usage stats
  console.log("\n🎯 COMPONENT USAGE STATS:");
  results.forEach((result) => {
    console.log(`   ${result.library}:`);
    console.log(
      `     Most Used: ${result.topComponents.map((c) => `${c.component}(${c.count})`).join(", ")}`,
    );
    console.log(`     Total Components: ${result.summary.totalComponents}`);
  });

  // Pattern adoption
  console.log("\n🔍 PATTERN ADOPTION:");
  const allPatterns = new Set();
  results.forEach((result) => {
    result.patterns.forEach((pattern) => allPatterns.add(pattern));
  });

  Array.from(allPatterns).forEach((pattern) => {
    const adoptedBy = results.filter((r) => r.patterns.includes(pattern));
    console.log(
      `   ${pattern}: ${adoptedBy.length}/${results.length} libraries (${adoptedBy.map((r) => r.library).join(", ")})`,
    );
  });

  // Recommendations summary
  console.log("\n💡 RECOMMENDATIONS SUMMARY:");
  const recommendationCounts = {};
  results.forEach((result) => {
    const key = `${result.summary.recommendations} recommendations`;
    recommendationCounts[key] = (recommendationCounts[key] || 0) + 1;
  });

  Object.entries(recommendationCounts).forEach(([key, count]) => {
    console.log(`   ${count} libraries have ${key}`);
  });

  // Best practices insights
  console.log("\n✨ INSIGHTS:");

  const avgComplexity =
    results.reduce((sum, r) => sum + r.summary.complexityScore, 0) /
    results.length;
  console.log(
    `   Average Complexity Score: ${Math.round(avgComplexity)} points`,
  );

  const mostCommonPattern = Array.from(allPatterns)
    .map((pattern) => ({
      pattern,
      count: results.filter((r) => r.patterns.includes(pattern)).length,
    }))
    .sort((a, b) => b.count - a.count)[0];
  console.log(
    `   Most Common Pattern: ${mostCommonPattern.pattern} (${mostCommonPattern.count}/${results.length} libraries)`,
  );

  const simplestLibrary = sortedByComplexity[sortedByComplexity.length - 1];
  const complexLibrary = sortedByComplexity[0];
  console.log(
    `   Simplest Usage: ${simplestLibrary.library} (${simplestLibrary.summary.complexityLevel})`,
  );
  console.log(
    `   Most Complex: ${complexLibrary.library} (${complexLibrary.summary.complexityLevel})`,
  );

  return {
    ranking: sortedByComplexity,
    patterns: Array.from(allPatterns),
    insights: {
      averageComplexity: avgComplexity,
      mostCommonPattern: mostCommonPattern.pattern,
      simplest: simplestLibrary.library,
      mostComplex: complexLibrary.library,
    },
  };
}

// Main execution
async function main() {
  console.log("🚀 Starting multi-library analysis...\n");

  const results = await runMultiLibraryAnalysis();

  if (results.length === 0) {
    console.log("❌ No results to analyze");
    return;
  }

  const comparison = generateComparisonReport(results);

  // Save comprehensive report
  const timestamp = Date.now();
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      librariesAnalyzed: results.length,
      totalPatterns: comparison.patterns.length,
      averageComplexity: comparison.insights.averageComplexity,
    },
    results: results,
    comparison: comparison,
    recommendations: {
      forDevelopers: [
        "Use consistent patterns across similar libraries",
        "Consider complexity when choosing component usage styles",
        "Implement TypeScript for complex patterns",
        "Document advanced usage patterns in team guidelines",
      ],
      forLibraryAuthors: [
        "Provide usage examples for all supported patterns",
        "Consider the complexity burden on developers",
        "Optimize for common use cases",
        "Provide migration guides for complex patterns",
      ],
    },
  };

  const reportPath = `multi-library-analysis-${timestamp}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

  console.log(`\n💾 Comprehensive report saved to: ${reportPath}`);
  console.log(
    `\n🎉 Analysis complete! Analyzed ${results.length} library configurations.`,
  );

  // Quick command reference
  console.log("\n📚 QUICK REFERENCE:");
  console.log(
    "   node test-libraries.js              - Run this multi-library analysis",
  );
  console.log(
    "   node parser.js [file] [library]     - Analyze specific library",
  );
  console.log(
    "   node analyze-usage.js [file]        - Focused pattern analysis",
  );
  console.log("   npm test                           - Run all tests");
}

// Export for use as module
module.exports = { runMultiLibraryAnalysis, generateComparisonReport };

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Analysis failed:", error.message);
    process.exit(1);
  });
}
