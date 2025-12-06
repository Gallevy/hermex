# hermex

SWC-based AST parser for analyzing code and React component usage patterns across entire codebases

## Quick Start

```bash
# No installation required - use npx (scans current directory)
npx hermex scan

# Or install globally
npm install -g hermex
hermex scan

# Scan specific directory
npx hermex scan "src/**/*.tsx"
```

## Requirements

- Node.js 20+

## Key Features

- **Fast SWC-based Parsing**: Lightning-fast static analysis using SWC's Rust-based parser
- **Comprehensive Pattern Detection**: Identifies 10+ React usage patterns including:
  - Direct imports (default, named, namespace, aliased)
  - JSX element usage
  - Variable assignments and destructuring
  - Conditional usage (ternary operators)
  - Collection mappings (arrays and objects)
  - Lazy and dynamic imports
  - Advanced patterns (HOC, memo, forwardRef, portals)
- **Version Tracking**: Components reported with exact package versions from lockfiles
- **Multi-Lockfile Support**: Parses package-lock.json, yarn.lock, and pnpm-lock.yaml
- **Flexible Output**: Table and chart visualization formats
- **Zero Configuration**: Works out of the box with sensible defaults

## Installation

```bash
# Global installation
npm install -g hermex

# Or with pnpm
pnpm add -g hermex

# Or with yarn
yarn global add hermex
```

## CLI Usage

### Main CLI

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

### Scan Command

The `scan` command analyzes local files for React component usage patterns.

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
                               ["**"])
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

## Example Output

Running a basic scan (uses default pattern `**/*.{tsx,jsx,ts,js}`):

```bash
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

## Use Cases

1. **Dependency Audits** - Understand library usage before migrations
2. **Version Tracking** - Know exactly which component versions are in use
3. **Migration Planning** - Identify components that need updating when migrating UI libraries
4. **Component Analytics** - Track most-used components and usage patterns
5. **Code Quality** - Identify complex usage patterns that may need refactoring
6. **Team Insights** - Understand how your team uses component libraries
7. **Documentation** - Generate usage reports for component library documentation

## Documentation

- **[Examples](./docs/examples.md)** - Comprehensive examples and command usage
- **[Patterns Guide](./docs/patterns.md)** - All detectable React usage patterns

## Tech Stack

- **Runtime**: Node.js 24
- **Parser**: [@swc/core](https://swc.rs/)
- **CLI**: [Commander.js](https://github.com/tj/commander.js)
- **Build**: [tsup](https://tsup.egoist.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Formatter**: [Biome](https://biomejs.dev/)
- **Linter**: [oxlint](https://oxc-project.github.io/)
- **Tests**: [Vitest](https://vitest.dev/)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE.md](./LICENSE.md)

## Links

- [GitHub Repository](https://github.com/Gallevy/hermex.git)
- [npm Package](https://www.npmjs.com/package/hermex)
- [Report Issues](https://github.com/Gallevy/hermex.git/issues)
