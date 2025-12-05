# Examples

This document provides practical examples of using `hermex` to analyze React component usage patterns in your codebase.

## Table of Contents

- [Quick Start](#quick-start)
- [Basic Usage](#basic-usage)
- [Command Options](#command-options)
- [Output Control](#output-control)
- [Real-World Use Cases](#real-world-use-cases)
- [Pattern Detection](#pattern-detection)

## Quick Start

No installation required! Use `npx` to run hermex directly:

```bash
npx hermex scan "src/**/*.tsx"
```

<!-- test output with command: npx hermex scan "code-examples/patterns/01-direct-usage.tsx" -->

## Basic Usage

### Scan Files

```bash
# Scan with default pattern (all .tsx, .jsx, .ts, .js files)
npx hermex scan

# Scan specific directory
npx hermex scan "src/**/*.tsx"

# Scan specific file
npx hermex scan "src/components/Button.tsx"
```

<!-- test output with command: npx hermex scan "code-examples/**/*.tsx" -->

### With Verbose Output

Show detailed file-by-file analysis with every pattern found:

```bash
npx hermex scan "src/**/*.tsx" --verbose
```

<!-- test output with command: npx hermex scan "code-examples/patterns/01-direct-usage.tsx" --verbose -->

## Command Options

### Full Command Syntax

```
npx hermex scan [pattern] [options]
```

**Arguments:**
- `[pattern]` - Glob pattern for files to analyze
  - Default: `**/*.{tsx,jsx,ts,js}`
  - Automatically excludes: `node_modules/`, `dist/`, `build/`, `.git/` (TODO change this to be from --ignore)

**Options:**
- `--verbose` - Show detailed file-by-file analysis (default: false)
- `--summary [mode]` - Show summary stats: `log`, `false` (default: `log`)
- `--details` - Show detailed pattern counts (default: false)
- `--top-components [mode]` - Show top components: `log`, `table`, `chart` (default: `log`)
- `--components-usage [mode]` - Show components table/chart: `table`, `chart` (default: `table`)
- `--patterns [mode]` - Show patterns table/chart: `table`, `chart` (default: `table`)
- `-h, --help` - Display help

<!-- test output with command: npx hermex scan --help -->

### Default Output

By default, hermex shows:
- Summary statistics (files, imports, components)
- Top components (ranked list)
- Components usage table
- Code patterns table

## Output Control

### Disable Specific Sections

```bash
# Disable summary
npx hermex scan "src/**/*.tsx" --summary false

# Disable top components
npx hermex scan "src/**/*.tsx" --top-components false

# Show only components usage
npx hermex scan "src/**/*.tsx" --summary false --top-components false --patterns false
```

<!-- test output with command: npx hermex scan "code-examples/patterns/01-direct-usage.tsx" --summary false --top-components false -->

### Change Output Format

```bash
# Show top components as table
npx hermex scan "src/**/*.tsx" --top-components table

# Show top components as chart
npx hermex scan "src/**/*.tsx" --top-components chart

# Show components usage as chart
npx hermex scan "src/**/*.tsx" --components-usage chart

# Show patterns as chart
npx hermex scan "src/**/*.tsx" --patterns chart
```

<!-- test output with command: npx hermex scan "code-examples/**/*.tsx" --top-components table -->

### Enable Details

```bash
# Show detailed pattern counts
npx hermex scan "src/**/*.tsx" --details
```

<!-- test output with command: npx hermex scan "code-examples/patterns/01-direct-usage.tsx" --details -->

## Real-World Use Cases

### 1. Quick Component Usage Check

Get a quick overview of component usage:

```bash
npx hermex scan "src/**/*.tsx"
```

<!-- test output with command: npx hermex scan "code-examples/patterns/01-direct-usage.tsx" -->

### 2. Detailed File Analysis

See exactly what patterns are detected in each file:

```bash
npx hermex scan "src/**/*.tsx" --verbose
```

<!-- test output with command: npx hermex scan "code-examples/patterns/02-variable-assignment.tsx" --verbose -->

### 3. Focus on Top Components

Only show the most-used components:

```bash
npx hermex scan "src/**/*.tsx" --components-usage false --patterns false
```

<!-- test output with command: npx hermex scan "code-examples/**/*.tsx" --components-usage false --patterns false -->

### 4. Pattern Analysis Only

Focus on usage patterns:

```bash
npx hermex scan "src/**/*.tsx" --top-components false --components-usage false
```

<!-- test output with command: npx hermex scan "code-examples/**/*.tsx" --top-components false --components-usage false -->

### 5. Component Library Migration

Analyze usage before migration:

```bash
# Get overview
npx hermex scan "src/**/*.tsx"

# Detailed analysis
npx hermex scan "src/**/*.tsx" --verbose --details
```

<!-- test output with command: npx hermex scan "code-examples/patterns/01-direct-usage.tsx" --details -->

### 6. Monorepo Analysis

Analyze different packages:

```bash
# Analyze each package
npx hermex scan "packages/app1/src/**/*.tsx"
npx hermex scan "packages/app2/src/**/*.tsx"
npx hermex scan "packages/shared/src/**/*.tsx"
```

<!-- test output with command: npx hermex scan "code-examples/patterns/*.tsx" -->

### 7. Specific File Investigation

Analyze a single file in detail:

```bash
npx hermex scan "src/components/MyComponent.tsx" --verbose
```

<!-- test output with command: npx hermex scan "code-examples/patterns/07-comprehensive-usage.tsx" --verbose -->

## Pattern Detection

Hermex detects various React component usage patterns. The verbose output shows what's detected as it analyzes files.

### Import Patterns

**Default Imports**
```tsx
import Button from "@design-system/foundation/button";
```
Detected as: `📦 Found import: @design-system/foundation/button`

**Named Imports**
```tsx
import { Typography } from "@design-system/foundation";
```
Detected as: `📦 Found import: @design-system/foundation`

**Namespace Imports**
```tsx
import * as Foundation from "@design-system/foundation";
```
Detected as: `📦 Found import: @design-system/foundation`

<!-- test output with command: npx hermex scan "code-examples/patterns/01-direct-usage.tsx" --verbose -->

### JSX Usage

**Direct Usage**
```tsx
<Button variant="primary">Click me</Button>
```
Detected as: `🎨 JSX Usage: <Button>`

**Namespace Usage**
```tsx
<Foundation.Button>Click</Foundation.Button>
```
Detected as: `🎨 JSX Usage: <Foundation.Button>`

<!-- test output with command: npx hermex scan "code-examples/patterns/05-namespace-imports.tsx" --verbose -->

### Variable Assignments

```tsx
const PrimaryButton = Button;
<PrimaryButton>Click</PrimaryButton>
```
Detected as: `📝 Variable assignment: PrimaryButton = Button`

<!-- test output with command: npx hermex scan "code-examples/patterns/02-variable-assignment.tsx" --verbose -->

### Conditional Usage

```tsx
const Component = isLoading ? Spinner : Button;
```
Detected as: `🔀 Conditional component usage found`

<!-- test output with command: npx hermex scan "code-examples/patterns/02-variable-assignment.tsx" --verbose -->

### Object Mappings

```tsx
const components = {
  button: Button,
  input: Input,
};
```
Detected as: `🗺️  Object mapping with components found`

<!-- test output with command: npx hermex scan "code-examples/patterns/03-object-mapping.tsx" --verbose -->

### Lazy Loading

```tsx
const LazyCard = lazy(() => import("@design-system/foundation/card"));
```
Detected as lazy import pattern

<!-- test output with command: npx hermex scan "code-examples/patterns/04-lazy-loading.tsx" --verbose -->

### Portal Usage

```tsx
createPortal(<Modal />, document.body);
```
Detected as: `🌀 Portal usage found`

<!-- test output with command: npx hermex scan "code-examples/patterns/07-comprehensive-usage.tsx" --verbose -->

### Namespace Access

```tsx
const MyButton = Foundation.Button;
```
Detected as: `🔗 Namespace access: Foundation.Button`

<!-- test output with command: npx hermex scan "code-examples/patterns/05-namespace-imports.tsx" --verbose -->

### Destructuring

```tsx
const { Card } = Foundation;
```
Detected as: `🔧 Destructuring: Card from Foundation`

<!-- test output with command: npx hermex scan "code-examples/patterns/05-namespace-imports.tsx" --verbose -->

## Understanding Output

### Summary Section

```
[SUMMARY] Analysis completed successfully in 0.1s
[SUMMARY] Files analyzed: 8
[SUMMARY] Total imports: 59
[SUMMARY] Total components: 22
```

Shows:
- Analysis time
- Files successfully analyzed
- Total import statements
- Unique components discovered

### Top Components Section

```
🏆 Top Components

[TOP-COMPONENTS] 🥇 1. Button from @design-system/foundation/button: 5 uses
[TOP-COMPONENTS] 🥈 2. Card from @design-system/foundation/card: 4 uses
[TOP-COMPONENTS] 🥉 3. Input from @design-system/foundation: 3 uses
```

Ranked list of most-used components.

### Components Usage Table

```
⚛️ Components Usage

┌────────────┬──────────────────────────────────┬─────────┬───────┐
│ Component  │ Source                           │ Version │ Count │
├────────────┼──────────────────────────────────┼─────────┼───────┤
│ Button     │ @design-system/foundation/button │ 0.0.0   │ 5     │
│ Card       │ @design-system/foundation/card   │ 0.0.0   │ 4     │
│ Input      │ @design-system/foundation        │ 0.0.0   │ 3     │
└────────────┴──────────────────────────────────┴─────────┴───────┘
```

Shows component name, source package, version (from lockfile), and usage count.

### Code Patterns Table

```
🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
│ Named Imports        │ 30    │
│ Default Imports      │ 25    │
│ Object Mappings      │ 19    │
│ Variable Assignments │ 9     │
│ Conditional Usage    │ 7     │
│ Namespace Imports    │ 4     │
└──────────────────────┴───────┘
```

Shows counts of different usage patterns detected.

## Tips & Best Practices

### Start with Default Output

The default output provides a good overview:

```bash
npx hermex scan "src/**/*.tsx"
```

### Use Verbose for Investigation

When investigating specific files or patterns:

```bash
npx hermex scan "src/components/**/*.tsx" --verbose
```

### Use Details for Deep Analysis

Get comprehensive pattern counts:

```bash
npx hermex scan "src/**/*.tsx" --details
```

### Customize Output for Reports

Only show what you need:

```bash
# Only show summary and top components
npx hermex scan "src/**/*.tsx" --components-usage false --patterns false
```

### Use Specific Patterns

Be specific to avoid analyzing unnecessary files:

```bash
# Good - Specific directory
npx hermex scan "src/features/**/*.tsx"

# Less ideal - Too broad
npx hermex scan "**/*.tsx"
```

## Common Issues

### No Files Found

```bash
# Verify your glob pattern
npx hermex scan "src/**/*.tsx"  # Recursive
npx hermex scan "src/*.tsx"     # Only top-level
```

### Too Much Output

```bash
# Disable verbose sections
npx hermex scan "src/**/*.tsx" --summary false --details false
```

### Need More Details

```bash
# Enable verbose and details
npx hermex scan "src/**/*.tsx" --verbose --details
```

## Performance

The tool automatically excludes:
- `node_modules/`
- `dist/`
- `build/`
- `.git/`

This ensures fast analysis even in large codebases.

## Next Steps

- Explore the [pattern examples](../code-examples/patterns/) to see all detectable patterns
- Check [MILESTONES.md](./MILESTONES.md) for upcoming features
- See the main [README.md](../README.md) for project overview
