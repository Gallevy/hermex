import { ReactComponentUsageAnalyzer } from './parser';
import fs from 'fs';
import path from 'path';

class FocusedUsageAnalyzer extends ReactComponentUsageAnalyzer {
  constructor(libraryName = '@design-system/foundation') {
    super(libraryName);
    this.patternMap = new Map();
    this.componentFrequency = new Map();
    this.usageComplexity = new Map();
  }

  analyzePatterns() {
    // Define pattern categories
    const patterns = {
      'Direct Import & Usage': {
        weight: 1,
        description: 'Simple import and direct JSX usage',
        examples: ['import Button from "lib"; <Button />'],
      },
      'Named Import with Alias': {
        weight: 2,
        description: 'Named import with renaming',
        examples: ['import { Button as MyButton } from "lib"; <MyButton />'],
      },
      'Namespace Import': {
        weight: 2,
        description: 'Import entire namespace',
        examples: ['import * as Lib from "lib"; <Lib.Button />'],
      },
      'Variable Assignment': {
        weight: 3,
        description: 'Assigning components to variables',
        examples: ['const MyButton = Button; <MyButton />'],
      },
      'Conditional Assignment': {
        weight: 4,
        description: 'Conditional component selection',
        examples: ['const Comp = condition ? Button : Input; <Comp />'],
      },
      'Object Mapping': {
        weight: 5,
        description: 'Components stored in objects',
        examples: ['const map = {btn: Button}; <map.btn />'],
      },
      'Array Mapping': {
        weight: 5,
        description: 'Components in arrays',
        examples: ['[Button, Input].map(Comp => <Comp />)'],
      },
      'Dynamic Mapping': {
        weight: 6,
        description: 'Runtime component selection',
        examples: ['components[type]'],
      },
      'HOC Wrapping': {
        weight: 7,
        description: 'Higher-order component patterns',
        examples: ['withProps(Button)'],
      },
      'Lazy Loading': {
        weight: 6,
        description: 'Lazy-loaded components',
        examples: ['lazy(() => import("lib/Button"))'],
      },
      'Dynamic Import': {
        weight: 7,
        description: 'Runtime dynamic imports',
        examples: ['await import("lib/Button")'],
      },
      'Destructuring Usage': {
        weight: 4,
        description: 'Destructured from objects',
        examples: ['const {Button} = Foundation; <Button />'],
      },
      'Memoized Components': {
        weight: 5,
        description: 'React.memo wrapped components',
        examples: ['memo(Button)'],
      },
      'Forward Ref': {
        weight: 6,
        description: 'forwardRef wrapped components',
        examples: ['forwardRef((props, ref) => <Button ref={ref} />)'],
      },
      'Portal Usage': {
        weight: 8,
        description: 'Components rendered in portals',
        examples: ['createPortal(<Button />, document.body)'],
      },
      'Context Integration': {
        weight: 7,
        description: 'Components from React context',
        examples: ['const {Button} = useContext(ThemeContext)'],
      },
    };

    return patterns;
  }

  classifyUsage(report) {
    const patterns = this.analyzePatterns();
    const foundPatterns = new Map();

    // Analyze each pattern type
    if (report.patterns.imports.default.length > 0) {
      foundPatterns.set('Direct Import & Usage', {
        count: report.patterns.imports.default.length,
        complexity: 1,
        examples: report.patterns.imports.default.slice(0, 3),
      });
    }

    if (report.patterns.imports.aliased.length > 0) {
      foundPatterns.set('Named Import with Alias', {
        count: report.patterns.imports.aliased.length,
        complexity: 2,
        examples: report.patterns.imports.aliased.slice(0, 3),
      });
    }

    if (report.patterns.imports.namespace.length > 0) {
      foundPatterns.set('Namespace Import', {
        count: report.patterns.imports.namespace.length,
        complexity: 2,
        examples: report.patterns.imports.namespace.slice(0, 3),
      });
    }

    if (report.patterns.usage.variables.length > 0) {
      foundPatterns.set('Variable Assignment', {
        count: report.patterns.usage.variables.length,
        complexity: 3,
        examples: report.patterns.usage.variables.slice(0, 3),
      });
    }

    if (report.patterns.usage.conditional.length > 0) {
      foundPatterns.set('Conditional Assignment', {
        count: report.patterns.usage.conditional.length,
        complexity: 4,
        examples: report.patterns.usage.conditional.slice(0, 3),
      });
    }

    if (report.patterns.usage.objects.length > 0) {
      foundPatterns.set('Object Mapping', {
        count: report.patterns.usage.objects.length,
        complexity: 5,
        examples: report.patterns.usage.objects.slice(0, 3),
      });
    }

    if (report.patterns.usage.arrays.length > 0) {
      foundPatterns.set('Array Mapping', {
        count: report.patterns.usage.arrays.length,
        complexity: 5,
        examples: report.patterns.usage.arrays.slice(0, 3),
      });
    }

    if (report.patterns.advanced.lazy.length > 0) {
      foundPatterns.set('Lazy Loading', {
        count: report.patterns.advanced.lazy.length,
        complexity: 6,
        examples: report.patterns.advanced.lazy.slice(0, 3),
      });
    }

    if (report.patterns.advanced.dynamic.length > 0) {
      foundPatterns.set('Dynamic Import', {
        count: report.patterns.advanced.dynamic.length,
        complexity: 7,
        examples: report.patterns.advanced.dynamic.slice(0, 3),
      });
    }

    if (report.patterns.usage.destructuring.length > 0) {
      foundPatterns.set('Destructuring Usage', {
        count: report.patterns.usage.destructuring.length,
        complexity: 4,
        examples: report.patterns.usage.destructuring.slice(0, 3),
      });
    }

    if (report.patterns.advanced.memo.length > 0) {
      foundPatterns.set('Memoized Components', {
        count: report.patterns.advanced.memo.length,
        complexity: 5,
        examples: report.patterns.advanced.memo.slice(0, 3),
      });
    }

    if (report.patterns.advanced.forwardRef.length > 0) {
      foundPatterns.set('Forward Ref', {
        count: report.patterns.advanced.forwardRef.length,
        complexity: 6,
        examples: report.patterns.advanced.forwardRef.slice(0, 3),
      });
    }

    if (report.patterns.advanced.portal.length > 0) {
      foundPatterns.set('Portal Usage', {
        count: report.patterns.advanced.portal.length,
        complexity: 8,
        examples: report.patterns.advanced.portal.slice(0, 3),
      });
    }

    return { patterns, foundPatterns };
  }

  generateComplexityScore(foundPatterns) {
    let totalScore = 0;
    let maxPossibleScore = 0;

    foundPatterns.forEach((data, patternName) => {
      const weight = data.complexity;
      const score = weight * data.count;
      totalScore += score;
      maxPossibleScore += weight * 10; // Assume max 10 instances per pattern
    });

    return {
      score: totalScore,
      maxPossible: maxPossibleScore,
      percentage: Math.round(
        (totalScore / Math.max(maxPossibleScore, 1)) * 100,
      ),
      level: this.getComplexityLevel(totalScore),
    };
  }

  getComplexityLevel(score) {
    if (score <= 10) return 'Simple';
    if (score <= 30) return 'Moderate';
    if (score <= 60) return 'Complex';
    if (score <= 100) return 'Very Complex';
    return 'Extremely Complex';
  }

  generateRecommendations(foundPatterns, complexity) {
    const recommendations = [];

    if (
      foundPatterns.has('Dynamic Import') ||
      foundPatterns.has('Portal Usage')
    ) {
      recommendations.push({
        type: 'Performance',
        priority: 'High',
        message: 'Consider code splitting strategies for dynamic imports',
        action: 'Implement lazy loading boundaries',
      });
    }

    if (
      foundPatterns.has('Object Mapping') ||
      foundPatterns.has('Array Mapping')
    ) {
      recommendations.push({
        type: 'Maintainability',
        priority: 'Medium',
        message: 'Component mappings can be hard to track',
        action: 'Consider using TypeScript for better type safety',
      });
    }

    if (complexity.level === 'Extremely Complex') {
      recommendations.push({
        type: 'Architecture',
        priority: 'High',
        message: 'High complexity detected in component usage',
        action: 'Consider refactoring to simpler patterns',
      });
    }

    if (foundPatterns.size > 8) {
      recommendations.push({
        type: 'Consistency',
        priority: 'Medium',
        message: 'Many different usage patterns found',
        action: 'Standardize on 2-3 primary patterns',
      });
    }

    return recommendations;
  }

  printFocusedReport(report) {
    const { patterns, foundPatterns } = this.classifyUsage(report);
    const complexity = this.generateComplexityScore(foundPatterns);
    const recommendations = this.generateRecommendations(
      foundPatterns,
      complexity,
    );

    console.log('\n' + '🎯'.repeat(40));
    console.log('🎯 FOCUSED COMPONENT USAGE ANALYSIS');
    console.log('🎯'.repeat(40));

    console.log(`\n📊 COMPLEXITY ANALYSIS:`);
    console.log(
      `   Overall Score: ${complexity.score}/${complexity.maxPossible}`,
    );
    console.log(
      `   Complexity Level: ${complexity.level} (${complexity.percentage}%)`,
    );

    console.log(
      `\n🔍 PATTERNS DETECTED (${foundPatterns.size} of ${Object.keys(patterns).length}):`,
    );

    // Sort by complexity (highest first)
    const sortedPatterns = Array.from(foundPatterns.entries()).sort(
      (a, b) => b[1].complexity - a[1].complexity,
    );

    sortedPatterns.forEach(([patternName, data]) => {
      const patternInfo = patterns[patternName];
      console.log(
        `\n   ${this.getComplexityIcon(data.complexity)} ${patternName}:`,
      );
      console.log(`     Complexity: ${data.complexity}/10`);
      console.log(`     Instances: ${data.count}`);
      console.log(`     Description: ${patternInfo.description}`);

      if (data.examples.length > 0) {
        console.log(
          `     Examples: ${JSON.stringify(data.examples[0], null, '       ').slice(0, 100)}...`,
        );
      }
    });

    console.log(`\n📈 COMPONENT FREQUENCY:`);
    report.patterns.usage.jsx.forEach((usage) => {
      console.log(`   ${usage.component}: ${usage.count} uses`);
    });

    if (recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`);
      recommendations.forEach((rec, idx) => {
        console.log(`   ${idx + 1}. [${rec.priority}] ${rec.type}:`);
        console.log(`      Issue: ${rec.message}`);
        console.log(`      Action: ${rec.action}`);
      });
    }

    console.log(`\n📋 PATTERN COVERAGE:`);
    Object.keys(patterns).forEach((patternName) => {
      const found = foundPatterns.has(patternName);
      console.log(`   ${found ? '✅' : '❌'} ${patternName}`);
    });

    console.log(`\n🎯 USAGE DENSITY:`);
    const density = (foundPatterns.size / Object.keys(patterns).length) * 100;
    console.log(`   Pattern Coverage: ${Math.round(density)}%`);
    console.log(
      `   Usage Intensity: ${this.getUsageIntensity(complexity.score)}`,
    );

    return { foundPatterns, complexity, recommendations };
  }

  getComplexityIcon(complexity) {
    if (complexity <= 2) return '🟢';
    if (complexity <= 4) return '🟡';
    if (complexity <= 6) return '🟠';
    return '🔴';
  }

  getUsageIntensity(score) {
    if (score <= 10) return 'Light';
    if (score <= 30) return 'Moderate';
    if (score <= 60) return 'Heavy';
    return 'Intensive';
  }

  analyzeMultipleFiles(filePatterns) {
    const allReports = [];
    const combinedAnalysis = {
      totalFiles: 0,
      totalComponents: new Set(),
      patternFrequency: new Map(),
      complexityDistribution: [],
    };

    filePatterns.forEach((pattern) => {
      const files = this.findMatchingFiles(pattern);
      files.forEach((file) => {
        console.log(`\n📁 Analyzing: ${file}`);
        const report = this.analyzeFile(file);
        if (report) {
          allReports.push({ file, report });
          combinedAnalysis.totalFiles++;

          // Add components to global set
          report.components.forEach((comp) =>
            combinedAnalysis.totalComponents.add(comp),
          );

          // Analyze patterns in this file
          const { foundPatterns, complexity } = this.classifyUsage(report);
          combinedAnalysis.complexityDistribution.push({
            file,
            score: complexity.score,
            level: complexity.level,
          });

          // Count pattern frequency
          foundPatterns.forEach((data, pattern) => {
            const current = combinedAnalysis.patternFrequency.get(pattern) || 0;
            combinedAnalysis.patternFrequency.set(pattern, current + 1);
          });
        }
      });
    });

    return { allReports, combinedAnalysis };
  }

  findMatchingFiles(pattern) {
    const glob = require('glob');
    try {
      return glob.sync(pattern);
    } catch (e) {
      console.warn(`Warning: Could not process pattern ${pattern}`);
      return [];
    }
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'analyze';

  const analyzer = new FocusedUsageAnalyzer('@design-system/foundation');

  switch (command) {
    case 'analyze':
      const filePath = args[1] || 'code-examples/comprehensive-usage.tsx';
      console.log(`🎯 Focused analysis of: ${filePath}`);

      if (fs.existsSync(filePath)) {
        const report = analyzer.analyzeFile(filePath);
        if (report) {
          const analysis = analyzer.printFocusedReport(report);

          // Save focused report
          const outputPath = `focused-analysis-${Date.now()}.json`;
          fs.writeFileSync(
            outputPath,
            JSON.stringify(
              {
                file: filePath,
                report,
                analysis,
              },
              null,
              2,
            ),
          );
          console.log(`\n💾 Focused analysis saved to: ${outputPath}`);
        }
      } else {
        console.error(`❌ File not found: ${filePath}`);
      }
      break;

    case 'bulk':
      const patterns = args.slice(1) || [
        'code-examples/**/*.tsx',
        'src/**/*.tsx',
      ];
      console.log(`🎯 Bulk analysis of patterns: ${patterns.join(', ')}`);

      const { allReports, combinedAnalysis } =
        analyzer.analyzeMultipleFiles(patterns);

      console.log(`\n📊 BULK ANALYSIS SUMMARY:`);
      console.log(`   Files analyzed: ${combinedAnalysis.totalFiles}`);
      console.log(
        `   Unique components: ${combinedAnalysis.totalComponents.size}`,
      );
      console.log(`   Most common patterns:`);

      Array.from(combinedAnalysis.patternFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([pattern, count]) => {
          console.log(`     ${pattern}: ${count} files`);
        });

      break;

    case 'help':
    default:
      console.log('🎯 Focused Usage Analyzer Commands:');
      console.log('  analyze [file]     - Analyze a single file (default)');
      console.log(
        '  bulk [patterns...] - Analyze multiple files matching patterns',
      );
      console.log('  help              - Show this help');
      console.log('\nExamples:');
      console.log(
        '  node analyze-usage.js analyze code-examples/comprehensive-usage.tsx',
      );
      console.log(
        '  node analyze-usage.js bulk "src/**/*.tsx" "components/**/*.jsx"',
      );
      break;
  }
}

export { FocusedUsageAnalyzer };

// Run if called directly - Note: This works in CommonJS output from tsup
// In ESM, you'd use import.meta.url === `file://${process.argv[1]}`
