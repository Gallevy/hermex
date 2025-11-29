# React Usage Analyzer - CLI Guide

A powerful command-line tool to analyze React component usage patterns across your entire codebase using glob patterns.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Analyze all TypeScript React files in src directory
node cli.js analyze "src/**/*.tsx" -l @mui/material

# Quick summary of component usage
node cli.js summary "src/**/*.tsx" --top 10

# Show detailed statistics with charts
node cli.js stats "src/**/*.tsx" --chart

# List all detected patterns
node cli.js patterns "src/**/*.tsx" --sort complexity

# Compare multiple libraries
node cli.js compare "src/**/*.tsx" -l @mui/material antd @chakra-ui/react
```

## 📋 Commands

### `analyze` - Full Analysis

Analyze component usage patterns across multiple files.

```bash
node cli.js analyze <pattern> [options]
```

**Arguments:**
- `<pattern>` - Glob pattern for files (e.g., `"src/**/*.tsx"`)

**Options:**
- `-l, --library <name>` - Library to analyze (default: `@design-system/foundation`)
- `-o, --output <file>` - Output JSON file path (default: `analysis-report.json`)
- `-f, --format <type>` - Output format: `json`, `console`, or `both` (default: `both`)
- `-c, --complexity` - Include complexity analysis
- `-s, --summary-only` - Show only summary without detailed patterns
- `--ignore <patterns...>` - Glob patterns to ignore
- `--max-files <number>` - Maximum files to analyze (default: `1000`)

**Examples:**

```bash
# Basic analysis
node cli.js analyze "src/**/*.tsx" -l @mui/material

# With complexity scoring
node cli.js analyze "src/**/*.tsx" -l @mui/material -c

# Save JSON only
node cli.js analyze "src/**/*.tsx" -l react-bootstrap -f json -o bootstrap-report.json

# Ignore test files
node cli.js analyze "src/**/*.tsx" --ignore "**/*.test.tsx" "**/*.spec.tsx"

# Summary only view
node cli.js analyze "components/**/*.jsx" -s
```

**Output:**

```
✔ Found 42 files to analyze
✔ Analysis complete! Analyzed 42 files

📄 JSON report saved to: analysis-report.json

════════════════════════════════════════════════════════════════════════════════
  📊 AGGREGATED ANALYSIS REPORT
════════════════════════════════════════════════════════════════════════════════

📈 SUMMARY:
  Library: @mui/material
  Files Analyzed: 42 / 42
  Total Components: 25
  Total Imports: 156
  Total Usage Patterns: 387

🎯 TOP COMPONENTS:
  🥇 1. Button: 89 uses
  🥈 2. TextField: 45 uses
  🥉 3. Card: 34 uses
  ...

🔍 PATTERN FREQUENCY:
  1. usage.jsx: 145
  2. imports.named: 78
  3. usage.objects: 45
  ...
```

---

### `summary` - Quick Summary

Generate a quick overview of component usage.

```bash
node cli.js summary <pattern> [options]
```

**Options:**
- `-l, --library <name>` - Library to analyze
- `--top <number>` - Number of top components to show (default: `10`)

**Examples:**

```bash
# Top 10 components
node cli.js summary "src/**/*.tsx"

# Top 5 components for Ant Design
node cli.js summary "src/**/*.tsx" -l antd --top 5
```

**Output:**

```
📊 COMPONENT USAGE SUMMARY

Library: @mui/material
Files analyzed: 42

Top 10 Components:
🥇 1. Button: 89 uses in 28 files
🥈 2. TextField: 45 uses in 15 files
🥉 3. Card: 34 uses in 12 files
   4. Typography: 28 uses in 18 files
   5. Box: 25 uses in 20 files
   ...
```

---

### `patterns` - Pattern Analysis

List all detected usage patterns with details.

```bash
node cli.js patterns <pattern> [options]
```

**Options:**
- `-l, --library <name>` - Library to analyze
- `--sort <by>` - Sort by: `frequency`, `complexity`, or `name` (default: `frequency`)

**Examples:**

```bash
# Sort by frequency (most common first)
node cli.js patterns "src/**/*.tsx" --sort frequency

# Sort by complexity (most complex first)
node cli.js patterns "src/**/*.tsx" --sort complexity

# Sort alphabetically
node cli.js patterns "src/**/*.tsx" --sort name
```

**Output:**

```
🔍 USAGE PATTERNS DETECTED

🔴 Portal Usage
   Complexity: 8/10
   Instances: 5
   Files: 3

🟠 Object Mapping
   Complexity: 5/10
   Instances: 45
   Files: 18

🟡 Conditional Assignment
   Complexity: 4/10
   Instances: 23
   Files: 12
   ...
```

---

### `stats` - Detailed Statistics

Show comprehensive statistics about component usage.

```bash
node cli.js stats <pattern> [options]
```

**Options:**
- `-l, --library <name>` - Library to analyze
- `--chart` - Show ASCII charts for distributions

**Examples:**

```bash
# Basic statistics
node cli.js stats "src/**/*.tsx"

# With visual charts
node cli.js stats "src/**/*.tsx" --chart
```

**Output:**

```
📈 DETAILED STATISTICS

Overview:
  Total Files: 42
  Analyzed Files: 42
  Unique Components: 25
  Total Patterns: 387
  Average Complexity: 45.20

Complexity Distribution:
  Simple                  12 (28.6%) ████████░░░░░░░░░░░░░░░░░░░░
  Moderate                18 (42.9%) █████████████░░░░░░░░░░░░░░░
  Complex                 10 (23.8%) ███████░░░░░░░░░░░░░░░░░░░░░
  Very Complex             2 (4.8%)  █░░░░░░░░░░░░░░░░░░░░░░░░░░░

Top 5 Components:
  1. Button                         89 uses
  2. TextField                      45 uses
  3. Card                           34 uses
  4. Typography                     28 uses
  5. Box                            25 uses

Top 5 Patterns:
  1. Object Mapping                 45 instances
  2. Direct Import & Usage          38 instances
  3. Variable Assignment            23 instances
  4. Named Import with Alias        19 instances
  5. Conditional Assignment         15 instances
```

---

### `compare` - Library Comparison

Compare usage patterns across multiple libraries.

```bash
node cli.js compare <pattern> [options]
```

**Options:**
- `-l, --libraries <names...>` - Libraries to compare (default: `@mui/material antd @chakra-ui/react`)
- `-o, --output <file>` - Output file path (default: `comparison-report.json`)
- `-f, --format <type>` - Output format: `json`, `console`, or `both`

**Examples:**

```bash
# Compare Material-UI, Ant Design, and Chakra UI
node cli.js compare "src/**/*.tsx" -l @mui/material antd @chakra-ui/react

# Compare custom libraries
node cli.js compare "src/**/*.tsx" -l @company/ui-kit @company/legacy-ui

# Save comparison to file
node cli.js compare "src/**/*.tsx" -l @mui/material antd -o comparison.json
```

**Output:**

```
════════════════════════════════════════════════════════════════════════════════
  🏆 LIBRARY COMPARISON REPORT
════════════════════════════════════════════════════════════════════════════════

📊 RANKING BY COMPONENT USAGE:
  🥇 1. @mui/material
     Components: 25
     Usage Patterns: 387
     Top Components: Button, TextField, Card

  🥈 2. antd
     Components: 12
     Usage Patterns: 156
     Top Components: Button, Input, Table

  🥉 3. @chakra-ui/react
     Components: 5
     Usage Patterns: 45
     Top Components: Button, Input, Box
```

---

## 🎨 Glob Pattern Examples

### Basic Patterns

```bash
# All TypeScript files
"**/*.ts"

# All TypeScript React files
"**/*.tsx"

# All JavaScript React files
"**/*.jsx"

# All React files (TS and JS)
"**/*.{tsx,jsx}"

# All files in specific directory
"src/components/**/*.tsx"
```

### Advanced Patterns

```bash
# Multiple directories
"{src,lib,components}/**/*.tsx"

# Exclude specific directories (use --ignore)
"src/**/*.tsx" --ignore "src/test/**" "src/__tests__/**"

# Specific subdirectories only
"src/*/components/*.tsx"

# Files starting with specific prefix
"src/**/Button*.tsx"
```

### Real-World Examples

```bash
# Analyze main source code
node cli.js analyze "src/**/*.{tsx,jsx}" -l @mui/material

# Analyze components only
node cli.js analyze "src/components/**/*.tsx" -l antd

# Analyze excluding tests and stories
node cli.js analyze "src/**/*.tsx" --ignore "**/*.test.tsx" "**/*.stories.tsx"

# Analyze multiple app directories
node cli.js analyze "{apps,packages}/*/src/**/*.tsx" -l @chakra-ui/react

# Analyze legacy and new code separately
node cli.js analyze "src/legacy/**/*.jsx" -l react-bootstrap -o legacy-report.json
node cli.js analyze "src/new/**/*.tsx" -l @mui/material -o new-report.json
```

## 📊 Output Formats

### JSON Output

Complete machine-readable analysis:

```json
{
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "library": "@mui/material",
    "pattern": "src/**/*.tsx",
    "filesAnalyzed": 42,
    "filesWithErrors": 0,
    "totalFiles": 42
  },
  "files": [
    {
      "path": "src/components/Button.tsx",
      "components": ["Button", "ButtonGroup"],
      "summary": {
        "totalComponents": 2,
        "totalImports": 3,
        "totalUsagePatterns": 8
      },
      "complexity": {
        "score": 15,
        "level": "Moderate"
      }
    }
  ],
  "aggregated": {
    "allComponents": ["Button", "TextField", "Card", ...],
    "totalImports": 156,
    "totalUsagePatterns": 387,
    "componentFrequency": {
      "Button": 89,
      "TextField": 45,
      ...
    },
    "patternFrequency": {
      "usage.jsx": 145,
      "imports.named": 78,
      ...
    }
  }
}
```

### Console Output

Human-readable with colors and formatting for immediate insights.

## 🔧 Configuration Tips

### For Large Codebases

```bash
# Process in batches
node cli.js analyze "src/section1/**/*.tsx" -o section1.json
node cli.js analyze "src/section2/**/*.tsx" -o section2.json

# Limit number of files
node cli.js analyze "src/**/*.tsx" --max-files 500

# Summary only for quick overview
node cli.js analyze "src/**/*.tsx" -s
```

### For CI/CD Integration

```bash
# JSON only output
node cli.js analyze "src/**/*.tsx" -f json -o analysis-report.json

# Exit on errors (add to script)
node cli.js analyze "src/**/*.tsx" || exit 1
```

### For Team Analysis

```bash
# Generate comprehensive report
node cli.js analyze "src/**/*.tsx" -c -o team-report.json

# Compare libraries for migration planning
node cli.js compare "src/**/*.tsx" -l @mui/material-ui @mui/material

# Track pattern adoption
node cli.js patterns "src/**/*.tsx" --sort frequency > patterns-report.txt
```

## 📈 Common Workflows

### 1. Initial Codebase Assessment

```bash
# Get overview
node cli.js summary "src/**/*.tsx"

# Check complexity
node cli.js stats "src/**/*.tsx" --chart

# List patterns
node cli.js patterns "src/**/*.tsx"
```

### 2. Library Migration

```bash
# Analyze current library usage
node cli.js analyze "src/**/*.tsx" -l old-library -o before.json

# Compare with target library
node cli.js compare "src/**/*.tsx" -l old-library new-library

# After migration, verify
node cli.js analyze "src/**/*.tsx" -l new-library -o after.json
```

### 3. Code Quality Review

```bash
# Find complex usage patterns
node cli.js patterns "src/**/*.tsx" --sort complexity

# Identify most used components
node cli.js summary "src/**/*.tsx" --top 20

# Check specific problematic areas
node cli.js analyze "src/legacy/**/*.tsx" -c
```

### 4. Dependency Analysis

```bash
# Check each library separately
node cli.js analyze "src/**/*.tsx" -l @mui/material -o mui.json
node cli.js analyze "src/**/*.tsx" -l antd -o antd.json
node cli.js analyze "src/**/*.tsx" -l @chakra-ui/react -o chakra.json

# Generate comparison
node cli.js compare "src/**/*.tsx" -l @mui/material antd @chakra-ui/react
```

## 🎯 Performance Tips

1. **Use Specific Patterns**: More specific glob patterns = faster analysis
   ```bash
   # Slower
   "**/*.tsx"
   
   # Faster
   "src/components/**/*.tsx"
   ```

2. **Ignore Unnecessary Files**: Exclude tests, stories, and build outputs
   ```bash
   --ignore "**/*.test.tsx" "**/*.stories.tsx" "dist/**" "build/**"
   ```

3. **Limit File Count**: Use `--max-files` for initial exploration
   ```bash
   node cli.js analyze "**/*.tsx" --max-files 100
   ```

4. **Summary for Quick Checks**: Use `summary` command for fast overview
   ```bash
   node cli.js summary "src/**/*.tsx"
   ```

## 🐛 Troubleshooting

### No Files Found

```bash
# Check your glob pattern
node cli.js analyze "src/**/*.tsx"  # ✓ Correct
node cli.js analyze src/**/*.tsx    # ✗ Wrong (missing quotes)
```

### Out of Memory

```bash
# Reduce batch size
node cli.js analyze "src/**/*.tsx" --max-files 500

# Or increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" node cli.js analyze "src/**/*.tsx"
```

### Files Being Skipped

```bash
# Check ignore patterns
node cli.js analyze "src/**/*.tsx" --ignore "**/*.test.tsx"

# Verify file extensions match pattern
```

### Slow Performance

```bash
# Use more specific patterns
node cli.js analyze "src/components/**/*.tsx"  # Instead of "**/*.tsx"

# Enable summary-only mode
node cli.js analyze "src/**/*.tsx" -s

# Skip complexity analysis
node cli.js analyze "src/**/*.tsx"  # Without -c flag
```

## 📝 Script Integration

### package.json Scripts

```json
{
  "scripts": {
    "analyze": "node cli.js analyze 'src/**/*.tsx' -l @mui/material",
    "analyze:summary": "node cli.js summary 'src/**/*.tsx'",
    "analyze:stats": "node cli.js stats 'src/**/*.tsx' --chart",
    "analyze:patterns": "node cli.js patterns 'src/**/*.tsx' --sort complexity",
    "analyze:compare": "node cli.js compare 'src/**/*.tsx' -l @mui/material antd",
    "analyze:ci": "node cli.js analyze 'src/**/*.tsx' -f json -o analysis-report.json"
  }
}
```

### GitHub Actions

```yaml
name: Analyze Component Usage

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run analyze:ci
      - uses: actions/upload-artifact@v2
        with:
          name: analysis-report
          path: analysis-report.json
```

## 🎓 Advanced Usage

### Custom Analyzers

Combine with other tools:

```bash
# Generate report and process with jq
node cli.js analyze "src/**/*.tsx" -f json | jq '.aggregated.topComponents'

# Compare before/after
node cli.js analyze "src/**/*.tsx" -o before.json
# ... make changes ...
node cli.js analyze "src/**/*.tsx" -o after.json
diff before.json after.json
```

### Automated Reporting

```bash
#!/bin/bash
# weekly-report.sh

DATE=$(date +%Y-%m-%d)
OUTPUT="reports/analysis-$DATE.json"

node cli.js analyze "src/**/*.tsx" -c -o "$OUTPUT"
node cli.js summary "src/**/*.tsx" > "reports/summary-$DATE.txt"
node cli.js stats "src/**/*.tsx" --chart > "reports/stats-$DATE.txt"

echo "Reports generated in reports/"
```

## 💡 Tips & Best Practices

1. **Start Simple**: Begin with `summary` command to get familiar with your codebase
2. **Use Complexity Analysis**: Add `-c` flag to identify refactoring opportunities
3. **Save Reports**: Always use `-o` to save JSON for later comparison
4. **Ignore Tests**: Exclude test files to focus on production code
5. **Regular Monitoring**: Run analysis weekly to track pattern evolution
6. **Team Standards**: Use pattern analysis to establish coding guidelines
7. **Migration Planning**: Use compare command before library migrations
8. **CI Integration**: Add analysis to your CI pipeline for automated monitoring

---

**Need Help?** Run any command with `--help` for detailed options:

```bash
node cli.js --help
node cli.js analyze --help
node cli.js summary --help
```
