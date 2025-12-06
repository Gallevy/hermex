# hermex - Examples Guide

Comprehensive examples demonstrating how to use hermex for analyzing React component usage patterns.

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
$ npx hermex scan
📦 Packages

  No packages found

⚛️ Components

  No external components found

🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ Named Imports        │ 126   │
├──────────────────────┼───────┤
│ Default Imports      │ 49    │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Object Mappings      │ 19    │
├──────────────────────┼───────┤
│ Variable Assignments │ 9     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 7     │
├──────────────────────┼───────┤
│ Namespace Imports    │ 4     │
├──────────────────────┼───────┤
│ Aliased Imports      │ 4     │
├──────────────────────┼───────┤
│ Destructuring        │ 2     │
├──────────────────────┼───────┤
│ Portal Usage         │ 1     │
└──────────────────────┴───────┘

Total: 266 patterns detected

📊 Summary

┌─────────────────────┬───────┐
│ Metric              │ Count │
├─────────────────────┼───────┤
│ Files Analyzed      │ 45    │
├─────────────────────┼───────┤
│ External Packages   │ 0     │
├─────────────────────┼───────┤
│ External Components │ 0     │
├─────────────────────┼───────┤
│ Total Usages        │ 0     │
└─────────────────────┴───────┘
```

### Scan Specific Directory

Target a specific directory with a glob pattern:

```bash
# Scan only src directory
npx hermex scan "src/**/*.tsx"

# Scan multiple directories
npx hermex scan "src/**/*.{tsx,jsx}"
npx hermex scan "{src,components}/**/*.tsx"
```

### Scan Specific File Types

```bash
# Only TypeScript files
npx hermex scan "**/*.tsx"

# Only JavaScript files
npx hermex scan "**/*.jsx"

# Both TypeScript and JavaScript (default)
npx hermex scan
```

**Note:** The default pattern is `**/*.{tsx,jsx,ts,js}`, so you don't need to specify it.

## File Filtering

### Ignore Patterns

Exclude specific directories or files from analysis:

```bash
# Ignore test files
npx hermex scan --ignore "**/*.test.tsx"

# Ignore multiple patterns
npx hermex scan --ignore "**/*.test.tsx" --ignore "**/*.spec.tsx"

# Ignore specific directories
npx hermex scan --ignore "**/test/**" --ignore "**/mocks/**"
```

**Default ignored patterns:**
- `**/node_modules/**`
- `**/dist/**`
- `**/build/**`

### Custom File Patterns

```bash
# Only component files
npx hermex scan "src/components/**/*.tsx"

# Only page files
npx hermex scan "src/pages/**/*.tsx"

# Specific subdirectories
npx hermex scan "src/{components,pages,layouts}/**/*.tsx"
```

## Package Filtering

### Allow Specific Packages

Only analyze components from specific packages:

```bash
# Only Material-UI components
npx hermex scan --allow-packages "@mui/*"

# Only design system components
npx hermex scan --allow-packages "@company/design-system"

# Multiple package patterns
npx hermex scan --allow-packages "@mui/*" --allow-packages "react-router-dom"
```

### Ignore Specific Packages

Exclude certain packages from analysis:

```bash
# Ignore all React internal packages
npx hermex scan --ignore-packages "react" --ignore-packages "react-dom"

# Ignore testing libraries
npx hermex scan --ignore-packages "@testing-library/*"
```

### Combine Allow and Ignore

```bash
# Allow all @mui packages except @mui/lab
npx hermex scan --allow-packages "@mui/*" --ignore-packages "@mui/lab"
```

## Output Customization

### Show Only Specific Views

Show only components table:

```bash
$ npx hermex scan --no-packages --no-patterns --no-summary
📦 Packages

  No packages found

⚛️ Components

  No external components found

🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ Named Imports        │ 126   │
├──────────────────────┼───────┤
│ Default Imports      │ 49    │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Object Mappings      │ 19    │
├──────────────────────┼───────┤
│ Variable Assignments │ 9     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 7     │
├──────────────────────┼───────┤
│ Namespace Imports    │ 4     │
├──────────────────────┼───────┤
│ Aliased Imports      │ 4     │
├──────────────────────┼───────┤
│ Destructuring        │ 2     │
├──────────────────────┼───────┤
│ Portal Usage         │ 1     │
└──────────────────────┴───────┘

Total: 266 patterns detected
```

Show only packages table:

```bash
$ npx hermex scan --no-components --no-patterns --no-summary
📦 Packages

  No packages found

⚛️ Components

  No external components found

🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ Named Imports        │ 126   │
├──────────────────────┼───────┤
│ Default Imports      │ 49    │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Object Mappings      │ 19    │
├──────────────────────┼───────┤
│ Variable Assignments │ 9     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 7     │
├──────────────────────┼───────┤
│ Namespace Imports    │ 4     │
├──────────────────────┼───────┤
│ Aliased Imports      │ 4     │
├──────────────────────┼───────┤
│ Destructuring        │ 2     │
├──────────────────────┼───────┤
│ Portal Usage         │ 1     │
└──────────────────────┴───────┘

Total: 266 patterns detected
```

Show only patterns table:

```bash
$ npx hermex scan --no-components --no-packages --no-summary
📦 Packages

  No packages found

⚛️ Components

  No external components found

🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ Named Imports        │ 126   │
├──────────────────────┼───────┤
│ Default Imports      │ 49    │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Object Mappings      │ 19    │
├──────────────────────┼───────┤
│ Variable Assignments │ 9     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 7     │
├──────────────────────┼───────┤
│ Namespace Imports    │ 4     │
├──────────────────────┼───────┤
│ Aliased Imports      │ 4     │
├──────────────────────┼───────┤
│ Destructuring        │ 2     │
├──────────────────────┼───────┤
│ Portal Usage         │ 1     │
└──────────────────────┴───────┘

Total: 266 patterns detected
```

### Hide Specific Views

Hide the summary statistics:

```bash
$ npx hermex scan --no-summary
📦 Packages

  No packages found

⚛️ Components

  No external components found

🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ Named Imports        │ 126   │
├──────────────────────┼───────┤
│ Default Imports      │ 49    │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Object Mappings      │ 19    │
├──────────────────────┼───────┤
│ Variable Assignments │ 9     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 7     │
├──────────────────────┼───────┤
│ Namespace Imports    │ 4     │
├──────────────────────┼───────┤
│ Aliased Imports      │ 4     │
├──────────────────────┼───────┤
│ Destructuring        │ 2     │
├──────────────────────┼───────┤
│ Portal Usage         │ 1     │
└──────────────────────┴───────┘

Total: 266 patterns detected
```

### Minimal Output

Show only components with minimal output (no packages, patterns, or summary):

```bash
$ npx hermex scan --no-packages --no-patterns --no-summary
📦 Packages

  No packages found

⚛️ Components

  No external components found

🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ Named Imports        │ 126   │
├──────────────────────┼───────┤
│ Default Imports      │ 49    │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Object Mappings      │ 19    │
├──────────────────────┼───────┤
│ Variable Assignments │ 9     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 7     │
├──────────────────────┼───────┤
│ Namespace Imports    │ 4     │
├──────────────────────┼───────┤
│ Aliased Imports      │ 4     │
├──────────────────────┼───────┤
│ Destructuring        │ 2     │
├──────────────────────┼───────┤
│ Portal Usage         │ 1     │
└──────────────────────┴───────┘

Total: 266 patterns detected
```

## Visualization Modes

### Table Mode (Default)

Display results in table format (default behavior):

```bash
$ npx hermex scan
📦 Packages

  No packages found

⚛️ Components

  No external components found

🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ Named Imports        │ 126   │
├──────────────────────┼───────┤
│ Default Imports      │ 49    │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Object Mappings      │ 19    │
├──────────────────────┼───────┤
│ Variable Assignments │ 9     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 7     │
├──────────────────────┼───────┤
│ Namespace Imports    │ 4     │
├──────────────────────┼───────┤
│ Aliased Imports      │ 4     │
├──────────────────────┼───────┤
│ Destructuring        │ 2     │
├──────────────────────┼───────┤
│ Portal Usage         │ 1     │
└──────────────────────┴───────┘

Total: 266 patterns detected

📊 Summary

┌─────────────────────┬───────┐
│ Metric              │ Count │
├─────────────────────┼───────┤
│ Files Analyzed      │ 45    │
├─────────────────────┼───────┤
│ External Packages   │ 0     │
├─────────────────────┼───────┤
│ External Components │ 0     │
├─────────────────────┼───────┤
│ Total Usages        │ 0     │
└─────────────────────┴───────┘
```

### Chart Mode

Display all results as bar charts:

```bash
$ npx hermex scan --components chart --packages chart --patterns chart
📦 Packages

  No packages found

⚛️ Components

  No external components found

🔍 Code Patterns

Named Imports        ██████████████████████████████████████████████████ 126

Default Imports      ███████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 49

JSX Usage            ██████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 45

Object Mappings      ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 19

Variable Assignments ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9

Conditional Usage    ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 7

Namespace Imports    ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 4

Aliased Imports      ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 4

Destructuring        █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2

Portal Usage         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1


📊 Summary

┌─────────────────────┬───────┐
│ Metric              │ Count │
├─────────────────────┼───────┤
│ Files Analyzed      │ 45    │
├─────────────────────┼───────┤
│ External Packages   │ 0     │
├─────────────────────┼───────┤
│ External Components │ 0     │
├─────────────────────┼───────┤
│ Total Usages        │ 0     │
└─────────────────────┴───────┘
```

Display only components as a chart:

```bash
$ npx hermex scan --components chart --no-packages --no-patterns
📦 Packages

  No packages found

⚛️ Components

  No external components found

🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ Named Imports        │ 126   │
├──────────────────────┼───────┤
│ Default Imports      │ 49    │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Object Mappings      │ 19    │
├──────────────────────┼───────┤
│ Variable Assignments │ 9     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 7     │
├──────────────────────┼───────┤
│ Namespace Imports    │ 4     │
├──────────────────────┼───────┤
│ Aliased Imports      │ 4     │
├──────────────────────┼───────┤
│ Destructuring        │ 2     │
├──────────────────────┼───────┤
│ Portal Usage         │ 1     │
└──────────────────────┴───────┘

Total: 266 patterns detected

📊 Summary

┌─────────────────────┬───────┐
│ Metric              │ Count │
├─────────────────────┼───────┤
│ Files Analyzed      │ 45    │
├─────────────────────┼───────┤
│ External Packages   │ 0     │
├─────────────────────┼───────┤
│ External Components │ 0     │
├─────────────────────┼───────┤
│ Total Usages        │ 0     │
└─────────────────────┴───────┘
```

### Mixed Visualization

Combine different visualization modes - packages as chart, components and patterns as tables:

```bash
$ npx hermex scan --packages chart --components table --patterns table
📦 Packages

  No packages found

⚛️ Components

  No external components found

🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ Named Imports        │ 126   │
├──────────────────────┼───────┤
│ Default Imports      │ 49    │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Object Mappings      │ 19    │
├──────────────────────┼───────┤
│ Variable Assignments │ 9     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 7     │
├──────────────────────┼───────┤
│ Namespace Imports    │ 4     │
├──────────────────────┼───────┤
│ Aliased Imports      │ 4     │
├──────────────────────┼───────┤
│ Destructuring        │ 2     │
├──────────────────────┼───────┤
│ Portal Usage         │ 1     │
└──────────────────────┴───────┘

Total: 266 patterns detected

📊 Summary

┌─────────────────────┬───────┐
│ Metric              │ Count │
├─────────────────────┼───────┤
│ Files Analyzed      │ 45    │
├─────────────────────┼───────┤
│ External Packages   │ 0     │
├─────────────────────┼───────┤
│ External Components │ 0     │
├─────────────────────┼───────┤
│ Total Usages        │ 0     │
└─────────────────────┴───────┘
```

## Real-World Examples

### Pre-Migration Analysis

Before migrating from one UI library to another:

```bash
# Analyze current Material-UI usage
npx hermex scan "src/**/*.tsx" --allow-packages "@mui/*"
```

**Use case:** Understand which Material-UI components are used and how frequently before planning a migration to another UI library.

### Design System Audit

Audit usage of your company's design system:

```bash
# Analyze design system components only
npx hermex scan --allow-packages "@company/design-system"
```

**Use case:** Track which design system components are most popular and identify components that may need improvement.

### Component Library Health Check

Check overall component library usage:

```bash
# Full analysis with charts
npx hermex scan "src/**/*.tsx" --components chart --packages chart
```

**Use case:** Get visual insights into component distribution across packages.

### Dependency Version Tracking

Identify exact versions of components in use:

```bash
$ npx hermex scan --no-components --no-patterns --no-summary
📦 Packages

  No packages found

⚛️ Components

  No external components found

🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ Named Imports        │ 126   │
├──────────────────────┼───────┤
│ Default Imports      │ 49    │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Object Mappings      │ 19    │
├──────────────────────┼───────┤
│ Variable Assignments │ 9     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 7     │
├──────────────────────┼───────┤
│ Namespace Imports    │ 4     │
├──────────────────────┼───────┤
│ Aliased Imports      │ 4     │
├──────────────────────┼───────┤
│ Destructuring        │ 2     │
├──────────────────────┼───────┤
│ Portal Usage         │ 1     │
└──────────────────────┴───────┘

Total: 266 patterns detected
```

**Use case:** Before upgrading a package, see exactly which version is currently in use and where.

### Pattern Analysis

Understand how components are being used:

```bash
$ npx hermex scan --no-packages --no-components --no-summary
📦 Packages

  No packages found

⚛️ Components

  No external components found

🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ Named Imports        │ 126   │
├──────────────────────┼───────┤
│ Default Imports      │ 49    │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Object Mappings      │ 19    │
├──────────────────────┼───────┤
│ Variable Assignments │ 9     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 7     │
├──────────────────────┼───────┤
│ Namespace Imports    │ 4     │
├──────────────────────┼───────┤
│ Aliased Imports      │ 4     │
├──────────────────────┼───────┤
│ Destructuring        │ 2     │
├──────────────────────┼───────┤
│ Portal Usage         │ 1     │
└──────────────────────┴───────┘

Total: 266 patterns detected
```

**Use case:** Identify complex usage patterns that may indicate code smells or refactoring opportunities.

### Quick Component Count

Get a quick count of component usage:

```bash
$ npx hermex scan --no-packages --no-patterns --no-summary
📦 Packages

  No packages found

⚛️ Components

  No external components found

🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ Named Imports        │ 126   │
├──────────────────────┼───────┤
│ Default Imports      │ 49    │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Object Mappings      │ 19    │
├──────────────────────┼───────┤
│ Variable Assignments │ 9     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 7     │
├──────────────────────┼───────┤
│ Namespace Imports    │ 4     │
├──────────────────────┼───────┤
│ Aliased Imports      │ 4     │
├──────────────────────┼───────┤
│ Destructuring        │ 2     │
├──────────────────────┼───────┤
│ Portal Usage         │ 1     │
└──────────────────────┴───────┘

Total: 266 patterns detected
```

**Use case:** Quick check to see which components are being used in a specific directory.

### Full Analysis Report

Generate a comprehensive report with all details:

```bash
# Everything in table mode
npx hermex scan "src/**/*.tsx"
```

**Use case:** Complete analysis for documentation or reporting purposes.

### Testing Library Analysis

Analyze test files separately:

```bash
# Only test files
npx hermex scan "**/*.test.tsx" --allow-packages "@testing-library/*"
```

**Use case:** Understand testing library usage patterns across test files.

### Monorepo Analysis

Analyze specific packages in a monorepo:

```bash
# Specific package
npx hermex scan "packages/app/**/*.tsx"

# All packages
npx hermex scan "packages/**/src/**/*.tsx"
```

**Use case:** Analyze component usage per package in a monorepo.

## Advanced Examples

### Filtering Build Output

```bash
# Ignore all build and generated files
npx hermex scan \
  --ignore "**/dist/**" \
  --ignore "**/build/**" \
  --ignore "**/.next/**" \
  --ignore "**/coverage/**"
```

### CI/CD Integration

```bash
# Minimal output for CI/CD pipelines
npx hermex scan \
  "src/**/*.tsx" \
  --no-summary \
  --components table \
  --no-patterns
```

### Custom Analysis Workflow

```bash
# Step 1: Analyze design system usage
npx hermex scan --allow-packages "@company/design-system"

# Step 2: Analyze third-party libraries
npx hermex scan --ignore-packages "@company/*" --ignore-packages "react"
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
Usage: hermex [options] [command]

Analyze React component usage patterns in your codebase

Options:
  -V, --version             output the version number
  -h, --help                display help for command

Commands:
  scan [options] [pattern]  Scan and analyze local files
  help [command]            display help for command
```

```bash
Usage: hermex scan [options] [pattern]

Scan and analyze local files

Arguments:
  pattern                      Glob pattern for files to analyze (defaults to
                               current directory recursively) (default:
                               "**/*.{tsx,jsx,ts,js}")

Options:
  --ignore <pattern>           Glob pattern for files to ignore (default:
                               ["**/node_modules/**","**/dist/**","**/build/**"])
  --allow-packages <pattern>   Pattern for what packages to scan (default:
                               ["*"])
  --ignore-packages <pattern>  Pattern for what packages to ignore (default: [])
  --no-summary                 Hide summary
  --components [mode]          Show components table/chart (table, chart)
                               (default: "table")
  --no-components              Do not show components
  --packages [mode]            Show packages table/chart (table, chart)
                               (default: "table")
  --no-packages                Do not show packages
  --patterns [mode]            Show patterns table/chart (table, chart)
                               (default: "table")
  --no-patterns                Do not show patterns
  -h, --help                   display help for command
```

For more information, see:
- [Main README](./README.md)
- [Patterns Guide](./PATTERNS.md)
- [GitHub Repository](https://github.com/Gallevy/hermex.git)
