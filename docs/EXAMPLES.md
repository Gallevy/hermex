# Hermex Examples

This document provides practical examples of using `hermex` to analyze React component usage patterns in your codebase with real command outputs.

## Table of Contents

- [Quick Start](#quick-start)
- [Basic Usage](#basic-usage)
- [Command Options Reference](#command-options-reference)
- [Output Customization Examples](#output-customization-examples)
- [Real-World Use Cases](#real-world-use-cases)
- [Understanding Output](#understanding-output)

## Quick Start

No installation required! Use `npx` to run hermex directly:

```bash
npx hermex scan "src/**/*.tsx"
```

## Basic Usage

### 1. Scan with Default Settings

The simplest way to analyze your code - shows summary, top components, components usage table, and patterns table.

```bash
hermex scan "code-examples/patterns/01-direct-usage.tsx"
```

**Output:**

```
✔  Found 1 files
✔  Analysis complete! Analyzed 1 files


📊 Summary

  Analysis completed successfully in 0.1s
  Files analyzed: 1
  Total imports: 5
  Total components: 4


🏆 Top Components
--------------------------------------------------------
1. Button from @design-system/foundation/button: 1 uses
2. Input from @design-system/foundation/input: 1 uses
3. Card from @design-system/foundation/card: 1 uses
4. Typography from @design-system/foundation: 1 uses
--------------------------------------------------------


⚛️  Components Usage

┌────────────┬──────────────────────────────────┬─────────┬───────┐
│ Component  │ Source                           │ Version │ Count │
├────────────┼──────────────────────────────────┼─────────┼───────┤
│ Button     │ @design-system/foundation/button │ 0.0.0   │ 1     │
├────────────┼──────────────────────────────────┼─────────┼───────┤
│ Input      │ @design-system/foundation/input  │ 0.0.0   │ 1     │
├────────────┼──────────────────────────────────┼─────────┼───────┤
│ Card       │ @design-system/foundation/card   │ 0.0.0   │ 1     │
├────────────┼──────────────────────────────────┼─────────┼───────┤
│ Typography │ @design-system/foundation        │ 0.0.0   │ 1     │
└────────────┴──────────────────────────────────┴─────────┴───────┘


🔍 Code Patterns

┌─────────────────┬───────┐
│ Pattern         │ Count │
├─────────────────┼───────┤
│ Default Imports │ 4     │
├─────────────────┼───────┤
│ JSX Usage       │ 4     │
├─────────────────┼───────┤
│ Named Imports   │ 1     │
└─────────────────┴───────┘
```

### 2. Scan Multiple Files

Analyze an entire directory or pattern of files.

```bash
hermex scan "code-examples/patterns/*.tsx"
```

**Output:**

```
✔  Found 8 files
✔  Analysis complete! Analyzed 8 files


📊 Summary

  Analysis completed successfully in 0.2s
  Files analyzed: 8
  Total imports: 59
  Total components: 22


🏆 Top Components
--------------------------------------------------------
1. Button from @design-system/foundation: 5 uses
2. Card from @design-system/foundation/card: 5 uses
3. Input from @design-system/foundation: 4 uses
4. Typography from @design-system/foundation: 4 uses
5. Suspense from react: 3 uses
[... and more]
--------------------------------------------------------


⚛️  Components Usage

┌─────────────────────────────┬─────────────────────────────────┬─────────┬───────┐
│ Component                   │ Source                          │ Version │ Count │
├─────────────────────────────┼─────────────────────────────────┼─────────┼───────┤
│ Button                      │ @design-system/foundation       │ 0.0.0   │ 5     │
├─────────────────────────────┼─────────────────────────────────┼─────────┼───────┤
│ Card                        │ @design-system/foundation/card  │ 0.0.0   │ 5     │
├─────────────────────────────┼─────────────────────────────────┼─────────┼───────┤
│ Input                       │ @design-system/foundation       │ 0.0.0   │ 4     │
[... additional rows]
└─────────────────────────────┴─────────────────────────────────┴─────────┴───────┘


🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Named Imports        │ 30    │
├──────────────────────┼───────┤
│ Default Imports      │ 25    │
├──────────────────────┼───────┤
│ Object Mappings      │ 19    │
├──────────────────────┼───────┤
│ Variable Assignments │ 9     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 7     │
└──────────────────────┴───────┘
```

## Command Options Reference

### Get Help

Display all available options:

```bash
hermex scan --help
```

**Output:**

```
Usage: hermex scan [options] [pattern]

Scan and analyze local files

Arguments:
  pattern                    Glob pattern for files to analyze (default: "**/*.{tsx,jsx,ts,js}")

Options:
  --ignore <pattern>         Glob pattern for files to ignore (default: ["**/node_modules/**","**/dist/**","**/build/**"])
  --verbose                  Show detailed file-by-file analysis with every pattern found (default: false)
  --summary [mode]           Show summary stats (log, false) (default: "log")
  --details                  Show detailed pattern counts
  --top-components [mode]    Show top components (log, table, chart) (default: "log")
  --components-usage [mode]  Show components table/chart (table, chart) (default: "table")
  --patterns [mode]          Show patterns table/chart (table, chart) (default: "table")
  -h, --help                 display help for command
```

## Output Customization Examples

### 3. Show Details

Get detailed pattern counts with the `--details` flag:

```bash
hermex scan "code-examples/patterns/02-variable-assignment.tsx" --details
```

**Output:**

```
✔  Found 1 files
✔  Analysis complete! Analyzed 1 files


📊 Summary

  Analysis completed successfully in 0.1s
  Files analyzed: 1
  Total imports: 6
  Total components: 3


📋 Details

  Total usage patterns: 17
  Default Imports: 5
  JSX Usage: 3
  Variable Assignments: 3
  Conditional Usage: 2
  Named Imports: 1


🏆 Top Components
--------------------------------------------------------
1. PrimaryButton: 1 uses
2. UserInput: 1 uses
3. InfoCard: 1 uses
--------------------------------------------------------


⚛️  Components Usage

┌───────────────┬─────────┬─────────┬───────┐
│ Component     │ Source  │ Version │ Count │
├───────────────┼─────────┼─────────┼───────┤
│ PrimaryButton │ unknown │ 0.0.0   │ 1     │
├───────────────┼─────────┼─────────┼───────┤
│ UserInput     │ unknown │ 0.0.0   │ 1     │
├───────────────┼─────────┼─────────┼───────┤
│ InfoCard      │ unknown │ 0.0.0   │ 1     │
└───────────────┴─────────┴─────────┴───────┘


🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ Default Imports      │ 5     │
├──────────────────────┼───────┤
│ JSX Usage            │ 3     │
├──────────────────────┼───────┤
│ Variable Assignments │ 3     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 2     │
├──────────────────────┼───────┤
│ Named Imports        │ 1     │
└──────────────────────┴───────┘
```

Notice the new **📋 Details** section showing pattern breakdown.

### 4. Top Components as Table

Display top components in a table format instead of a list:

```bash
hermex scan "code-examples/patterns/*.tsx" --top-components table
```

**Output:**

```
✔  Found 8 files
✔  Analysis complete! Analyzed 8 files


📊 Summary

  Analysis completed successfully in 0.2s
  Files analyzed: 8
  Total imports: 59
  Total components: 22


🏆 Top Components
--------------------------------------------------------
┌──────┬───────────────────────┬────────────────────────────────┬───────┐
│ Rank │ Component             │ Source                         │ Count │
├──────┼───────────────────────┼────────────────────────────────┼───────┤
│ 🥇   │ Button                │ @design-system/foundation      │ 5     │
├──────┼───────────────────────┼────────────────────────────────┼───────┤
│ 🥈   │ Card                  │ @design-system/foundation/card │ 5     │
├──────┼───────────────────────┼────────────────────────────────┼───────┤
│ 🥉   │ Input                 │ @design-system/foundation      │ 4     │
├──────┼───────────────────────┼────────────────────────────────┼───────┤
│ 4.   │ Typography            │ @design-system/foundation      │ 4     │
├──────┼───────────────────────┼────────────────────────────────┼───────┤
│ 5.   │ Suspense              │ react                          │ 3     │
├──────┼───────────────────────┼────────────────────────────────┼───────┤
│ 6.   │ Foundation.Button     │ unknown                        │ 3     │
├──────┼───────────────────────┼────────────────────────────────┼───────┤
│ 7.   │ Foundation.Input      │ unknown                        │ 3     │
├──────┼───────────────────────┼────────────────────────────────┼───────┤
│ 8.   │ Foundation.Card       │ unknown                        │ 3     │
├──────┼───────────────────────┼────────────────────────────────┼───────┤
│ 9.   │ Foundation.Typography │ unknown                        │ 2     │
├──────┼───────────────────────┼────────────────────────────────┼───────┤
│ 10.  │ MyButton              │ unknown                        │ 1     │
└──────┴───────────────────────┴────────────────────────────────┴───────┘

[... rest of output]
```

### 5. Chart Visualization

Display data as ASCII charts for quick visual analysis:

```bash
hermex scan "code-examples/patterns/03-object-mapping.tsx" --components-usage chart --patterns chart
```

**Output:**

```
✔  Found 1 files
✔  Analysis complete! Analyzed 1 files


📊 Summary

  Analysis completed successfully in 0.1s
  Files analyzed: 1
  Total imports: 7
  Total components: 3


🏆 Top Components
--------------------------------------------------------
1. Button from @design-system/foundation/button: 1 uses
2. Input from @design-system/foundation/input: 1 uses
3. Card from @design-system/foundation/card: 1 uses
--------------------------------------------------------


⚛️  Components Usage

Button ██████████████████████████████████████████████████ 1

Input  ██████████████████████████████████████████████████ 1

Card   ██████████████████████████████████████████████████ 1



🔍 Code Patterns

Object Mappings ██████████████████████████████████████████████████ 6

Default Imports ██████████████████████████████████████████░░░░░░░░ 5

JSX Usage       █████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░ 3

Named Imports   █████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2
```

Great for quick visual comparison of usage patterns!

### 6. Minimal Output

Disable all sections to get just the analysis (useful for CI/CD):

```bash
hermex scan "code-examples/patterns/01-direct-usage.tsx" --summary false --top-components false --components-usage false --patterns false
```

**Output:**

```
✔  Found 1 files
✔  Analysis complete! Analyzed 1 files
```

Clean output showing only that the analysis completed successfully.

### 7. Custom Combination

Mix and match options to get exactly what you need:

```bash
hermex scan "src/**/*.tsx" --details --top-components table --patterns chart
```

This shows:

- ✅ Summary statistics
- ✅ Detailed pattern breakdown
- ✅ Top components as a table
- ✅ Components usage as a table (default)
- ✅ Patterns as a chart

## Real-World Use Cases

### 8. Pre-Migration Analysis

Before migrating from one UI library to another, understand current usage:

```bash
# Analyze all component usage
hermex scan "src/**/*.tsx" --details

# Focus on specific library
hermex scan "src/**/*.tsx" | grep "@old-ui-library"
```

**Use this to:**

- Identify all components that need migration
- Understand usage patterns (simple vs complex)
- Estimate migration effort based on pattern complexity

### 9. Component Library Audit

Audit which components from your design system are actually used:

```bash
# Get overview of all components
hermex scan "src/**/*.tsx" --top-components table

# Export to file for reporting
hermex scan "src/**/*.tsx" > component-audit-report.txt
```

**Use this to:**

- Identify unused components (candidates for deprecation)
- Find most-used components (prioritize for optimization)
- Track adoption of new components over time

### 10. Code Quality Assessment

Identify complex usage patterns that may need refactoring:

```bash
# Focus on patterns
hermex scan "src/**/*.tsx" --summary false --top-components false --components-usage false
```

**Look for:**

- High counts of conditional usage (may indicate over-abstraction)
- Many object mappings (could be simplified)
- Excessive variable assignments (naming inconsistency)

### 11. Monorepo Analysis

Analyze different packages in a monorepo:

```bash
# Analyze each workspace
hermex scan "packages/app1/src/**/*.tsx" > reports/app1-analysis.txt
hermex scan "packages/app2/src/**/*.tsx" > reports/app2-analysis.txt
hermex scan "packages/shared/src/**/*.tsx" > reports/shared-analysis.txt

# Compare component usage across packages
```

**Use this to:**

- Identify shared components used differently across apps
- Find opportunities for consolidation
- Track component library consistency

### 12. Specific File Deep Dive

Investigate a specific file in detail:

```bash
hermex scan "src/components/ComplexForm.tsx" --verbose --details
```

The `--verbose` flag is not shown in the output above, but it provides file-by-file pattern detection as the analysis runs, showing:

- 📦 Import discoveries
- 🎨 JSX usage
- 📝 Variable assignments
- 🗺️ Object mappings
- 🔀 Conditional usage
- And more...

### 13. CI/CD Integration

Use in continuous integration for tracking component usage:

```bash
# Minimal output for CI logs
hermex scan "src/**/*.tsx" --summary log --details false --top-components false --components-usage false --patterns false
```

**Output:**

```
✔  Found 42 files
✔  Analysis complete! Analyzed 42 files


📊 Summary

  Analysis completed successfully in 1.2s
  Files analyzed: 42
  Total imports: 156
  Total components: 38
```

Perfect for tracking metrics over time in your CI pipeline.

## Understanding Output

### Summary Section

```
📊 Summary

  Analysis completed successfully in 0.1s
  Files analyzed: 1
  Total imports: 5
  Total components: 4
```

- **Analysis time**: How long the scan took
- **Files analyzed**: Number of files successfully processed
- **Total imports**: Count of all import statements from UI libraries
- **Total components**: Unique components discovered

### Details Section (with `--details`)

```
📋 Details

  Total usage patterns: 17
  Default Imports: 5
  JSX Usage: 3
  Variable Assignments: 3
  Conditional Usage: 2
  Named Imports: 1
```

Breaks down the total pattern count by type, helping you understand the complexity of component usage.

### Top Components Section

**List format (default):**

```
🏆 Top Components
--------------------------------------------------------
1. Button from @design-system/foundation/button: 5 uses
2. Card from @design-system/foundation/card: 4 uses
3. Input from @design-system/foundation: 3 uses
--------------------------------------------------------
```

**Table format (`--top-components table`):**

```
┌──────┬───────────┬──────────────────────────┬───────┐
│ Rank │ Component │ Source                   │ Count │
├──────┼───────────┼──────────────────────────┼───────┤
│ 🥇   │ Button    │ @design-system/button    │ 5     │
├──────┼───────────┼──────────────────────────┼───────┤
│ 🥈   │ Card      │ @design-system/card      │ 4     │
└──────┴───────────┴──────────────────────────┴───────┘
```

Shows the most frequently used components across your codebase.

### Components Usage Table

```
⚛️  Components Usage

┌────────────┬──────────────────────┬─────────┬───────┐
│ Component  │ Source               │ Version │ Count │
├────────────┼──────────────────────┼─────────┼───────┤
│ Button     │ @design-system/button│ 2.1.5   │ 45    │
└────────────┴──────────────────────┴─────────┴───────┘
```

- **Component**: Component name as used in code
- **Source**: NPM package it's imported from
- **Version**: Exact version from lockfile (0.0.0 if not found)
- **Count**: Number of times component appears

### Code Patterns

**Table format (default):**

```
🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Named Imports        │ 30    │
└──────────────────────┴───────┘
```

**Chart format (`--patterns chart`):**

```
🔍 Code Patterns

Object Mappings ██████████████████████████████████ 19
Default Imports ████████████████████████████░░░░░░ 25
JSX Usage       ██████████████████████████████████ 45
```

Shows how components are being used - simple imports, complex mappings, conditional usage, etc.

## Tips & Best Practices

### Start Simple

Begin with default options to get an overview:

```bash
hermex scan "src/**/*.tsx"
```

### Add Details When Investigating

Use `--details` flag when you need to understand patterns:

```bash
hermex scan "src/**/*.tsx" --details
```

### Use Charts for Quick Visual Analysis

Charts are great for presentations or quick comparisons:

```bash
hermex scan "src/**/*.tsx" --components-usage chart --patterns chart
```

### Combine Options for Custom Reports

Mix and match to get exactly what you need:

```bash
hermex scan "src/**/*.tsx" --details --top-components table --patterns chart
```

### Be Specific with Patterns

Narrow down your glob pattern for faster, more focused analysis:

```bash
# Good - Specific
hermex scan "src/features/dashboard/**/*.tsx"

# Less ideal - Too broad
hermex scan "**/*.tsx"
```

### Export Results

Save analysis for later review or comparison:

```bash
hermex scan "src/**/*.tsx" > analysis-$(date +%Y%m%d).txt
```

## Pattern Detection in Action

Hermex automatically detects various React usage patterns. Here are the patterns you'll see in the output:

| Pattern                  | What It Detects                        | Example                         |
| ------------------------ | -------------------------------------- | ------------------------------- |
| **Default Imports**      | `import Button from '@lib/button'`     | Direct default imports          |
| **Named Imports**        | `import { Button } from '@lib'`        | Named exports                   |
| **Aliased Imports**      | `import { Button as Btn } from '@lib'` | Renamed imports                 |
| **Namespace Imports**    | `import * as UI from '@lib'`           | Wildcard imports                |
| **JSX Usage**            | `<Button>Click</Button>`               | Component rendering             |
| **Variable Assignments** | `const MyBtn = Button`                 | Component aliasing              |
| **Conditional Usage**    | `const C = flag ? A : B`               | Conditional component selection |
| **Object Mappings**      | `const map = { btn: Button }`          | Components in objects           |
| **Destructuring**        | `const { Button } = UI`                | Destructuring patterns          |
| **Portal Usage**         | `createPortal(<Modal />)`              | React portals                   |

See [PATTERNS.md](./PATTERNS.md) for complete pattern documentation with complexity ratings.

## Next Steps

- Explore the [Patterns Guide](./PATTERNS.md) for all 16+ detectable patterns
- Check [MILESTONES.md](./MILESTONES.md) for upcoming features
- See the main [README.md](../README.md) for installation and overview
