# <!-- @package name --> - Examples Guide

Comprehensive examples demonstrating how to use <!-- @package name --> for analyzing React component usage patterns.

## Table of Contents

- [Basic Usage](#basic-usage)
- [File Filtering](#file-filtering)
- [Package Filtering](#package-filtering)
- [Output Customization](#output-customization)
- [Visualization Modes](#visualization-modes)
- [Real-World Examples](#real-world-examples)

## Basic Usage

### Scan Current Directory

Scan all TypeScript and JavaScript files in the current directory and subdirectories:

```bash
$ npx <!-- @package name --> scan
<!-- @cli scan -->
```

### Scan Specific Directory

Target a specific directory with a glob pattern:

```bash
# Scan only src directory
npx <!-- @package name --> scan "src/**/*.tsx"

# Scan multiple directories
npx <!-- @package name --> scan "src/**/*.{tsx,jsx}"
npx <!-- @package name --> scan "{src,components}/**/*.tsx"
```

### Scan Specific File Types

```bash
# Only TypeScript files
npx <!-- @package name --> scan "**/*.tsx"

# Only JavaScript files
npx <!-- @package name --> scan "**/*.jsx"

# Both TypeScript and JavaScript (default)
npx <!-- @package name --> scan
```

**Note:** The default pattern is `**/*.{tsx,jsx,ts,js}`, so you don't need to specify it.

## File Filtering

### Ignore Patterns

Exclude specific directories or files from analysis:

```bash
# Ignore test files
npx <!-- @package name --> scan --ignore "**/*.test.tsx"

# Ignore multiple patterns
npx <!-- @package name --> scan --ignore "**/*.test.tsx" --ignore "**/*.spec.tsx"

# Ignore specific directories
npx <!-- @package name --> scan --ignore "**/test/**" --ignore "**/mocks/**"
```

**Default ignored patterns:**
- `**/node_modules/**`
- `**/dist/**`
- `**/build/**`

### Custom File Patterns

```bash
# Only component files
npx <!-- @package name --> scan "src/components/**/*.tsx"

# Only page files
npx <!-- @package name --> scan "src/pages/**/*.tsx"

# Specific subdirectories
npx <!-- @package name --> scan "src/{components,pages,layouts}/**/*.tsx"
```

## Package Filtering

### Allow Specific Packages

Only analyze components from specific packages:

```bash
# Only Material-UI components
npx <!-- @package name --> scan --allow-packages "@mui/*"

# Only design system components
npx <!-- @package name --> scan --allow-packages "@company/design-system"

# Multiple package patterns
npx <!-- @package name --> scan --allow-packages "@mui/*" --allow-packages "react-router-dom"
```

### Ignore Specific Packages

Exclude certain packages from analysis:

```bash
# Ignore all React internal packages
npx <!-- @package name --> scan --ignore-packages "react" --ignore-packages "react-dom"

# Ignore testing libraries
npx <!-- @package name --> scan --ignore-packages "@testing-library/*"
```

### Combine Allow and Ignore

```bash
# Allow all @mui packages except @mui/lab
npx <!-- @package name --> scan --allow-packages "@mui/*" --ignore-packages "@mui/lab"
```

## Output Customization

### Show Only Specific Views

Show only components table:

```bash
$ npx <!-- @package name --> scan --no-packages --no-patterns --no-summary
<!-- @cli scan --no-packages --no-patterns --no-summary -->
```

Show only packages table:

```bash
$ npx <!-- @package name --> scan --no-components --no-patterns --no-summary
<!-- @cli scan --no-components --no-patterns --no-summary -->
```

Show only patterns table:

```bash
$ npx <!-- @package name --> scan --no-components --no-packages --no-summary
<!-- @cli scan --no-components --no-packages --no-summary -->
```

### Hide Specific Views

Hide the summary statistics:

```bash
$ npx <!-- @package name --> scan --no-summary
<!-- @cli scan --no-summary -->
```

### Minimal Output

Show only components with minimal output (no packages, patterns, or summary):

```bash
$ npx <!-- @package name --> scan --no-packages --no-patterns --no-summary
<!-- @cli scan --no-packages --no-patterns --no-summary -->
```

## Visualization Modes

### Table Mode (Default)

Display results in table format (default behavior):

```bash
$ npx <!-- @package name --> scan
<!-- @cli scan -->
```

### Chart Mode

Display all results as bar charts:

```bash
$ npx <!-- @package name --> scan --components chart --packages chart --patterns chart
<!-- @cli scan --components chart --packages chart --patterns chart -->
```

Display only components as a chart:

```bash
$ npx <!-- @package name --> scan --components chart --no-packages --no-patterns
<!-- @cli scan --components chart --no-packages --no-patterns -->
```

### Mixed Visualization

Combine different visualization modes - packages as chart, components and patterns as tables:

```bash
$ npx <!-- @package name --> scan --packages chart --components table --patterns table
<!-- @cli scan --packages chart --components table --patterns table -->
```

## Real-World Examples

### Pre-Migration Analysis

Before migrating from one UI library to another:

```bash
# Analyze current Material-UI usage
npx <!-- @package name --> scan "src/**/*.tsx" --allow-packages "@mui/*"
```

**Use case:** Understand which Material-UI components are used and how frequently before planning a migration to another UI library.

### Design System Audit

Audit usage of your company's design system:

```bash
# Analyze design system components only
npx <!-- @package name --> scan --allow-packages "@company/design-system"
```

**Use case:** Track which design system components are most popular and identify components that may need improvement.

### Component Library Health Check

Check overall component library usage:

```bash
# Full analysis with charts
npx <!-- @package name --> scan "src/**/*.tsx" --components chart --packages chart
```

**Use case:** Get visual insights into component distribution across packages.

### Dependency Version Tracking

Identify exact versions of components in use:

```bash
$ npx <!-- @package name --> scan --no-components --no-patterns --no-summary
<!-- @cli scan --no-components --no-patterns --no-summary -->
```

**Use case:** Before upgrading a package, see exactly which version is currently in use and where.

### Pattern Analysis

Understand how components are being used:

```bash
$ npx <!-- @package name --> scan --no-packages --no-components --no-summary
<!-- @cli scan --no-packages --no-components --no-summary -->
```

**Use case:** Identify complex usage patterns that may indicate code smells or refactoring opportunities.

### Quick Component Count

Get a quick count of component usage:

```bash
$ npx <!-- @package name --> scan --no-packages --no-patterns --no-summary
<!-- @cli scan --no-packages --no-patterns --no-summary -->
```

**Use case:** Quick check to see which components are being used in a specific directory.

### Full Analysis Report

Generate a comprehensive report with all details:

```bash
# Everything in table mode
npx <!-- @package name --> scan "src/**/*.tsx"
```

**Use case:** Complete analysis for documentation or reporting purposes.

### Testing Library Analysis

Analyze test files separately:

```bash
# Only test files
npx <!-- @package name --> scan "**/*.test.tsx" --allow-packages "@testing-library/*"
```

**Use case:** Understand testing library usage patterns across test files.

### Monorepo Analysis

Analyze specific packages in a monorepo:

```bash
# Specific package
npx <!-- @package name --> scan "packages/app/**/*.tsx"

# All packages
npx <!-- @package name --> scan "packages/**/src/**/*.tsx"
```

**Use case:** Analyze component usage per package in a monorepo.

## Advanced Examples

### Filtering Build Output

```bash
# Ignore all build and generated files
npx <!-- @package name --> scan \
  --ignore "**/dist/**" \
  --ignore "**/build/**" \
  --ignore "**/.next/**" \
  --ignore "**/coverage/**"
```

### CI/CD Integration

```bash
# Minimal output for CI/CD pipelines
npx <!-- @package name --> scan \
  "src/**/*.tsx" \
  --no-summary \
  --components table \
  --no-patterns
```

### Custom Analysis Workflow

```bash
# Step 1: Analyze design system usage
npx <!-- @package name --> scan --allow-packages "@company/design-system"

# Step 2: Analyze third-party libraries
npx <!-- @package name --> scan --ignore-packages "@company/*" --ignore-packages "react"
```

## Tips and Best Practices

1. **Start broad, then narrow**: Begin with a full scan, then use filters to focus on specific packages or patterns.

2. **Use glob patterns effectively**: Leverage glob patterns to target exactly the files you want to analyze.

3. **Combine filters**: Use `--allow-packages` and `--ignore-packages` together for precise package filtering.

4. **Choose the right visualization**: Use tables for detailed data, charts for quick visual insights.

5. **Ignore what you don't need**: Use `--no-*` flags to hide irrelevant views and reduce noise.

6. **Version tracking**: Always check the packages view to see exact versions of dependencies.

7. **Pattern analysis**: Use pattern detection to identify refactoring opportunities and code quality issues.

## Getting Help

```bash
<!-- @cli --help -->
```

```bash
<!-- @cli scan --help -->
```

For more information, see:
- [Main README](./README.md)
- [Patterns Guide](./PATTERNS.md)
- [GitHub Repository](<!-- @package repository.url -->)
