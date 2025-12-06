# Hermex

A powerful SWC-based tool for analyzing React component usage patterns across codebases. Understand how UI library components are used, track dependencies with exact versions, and generate comprehensive reports.

Made with AI 🤖

## 🚀 Quick Start

```bash
# No installation required - use npx
npx hermex scan "src/**/*.tsx"

# Or install globally
npm install -g hermex
hermex scan "src/**/*.tsx"

# Or install locally
npm install hermex
npx hermex scan "src/**/*.tsx"
```

## 📦 Requirements
- Node.js 24+

## 📊 Key Features

- **Fast SWC-based Parsing**: Lightning-fast static analysis using SWC's Rust-based parser
- **Pattern Detection**: Identifies 10+ React usage patterns including:
  - Direct imports and JSX usage
  - Variable assignments and destructuring
  - Conditional usage and object mappings
  - Namespace imports and aliased imports
  - Portal usage
- **Version Tracking**: Components reported with exact package versions from lockfiles
- **Multi-Lockfile Support**: Parses package-lock.json, yarn.lock, and pnpm-lock.yaml
- **Flexible Output**: Table and chart visualization formats
- **Zero Configuration**: Works out of the box with sensible defaults

## 📋 Commands

### `scan` Command

Scan and analyze local files for React component usage patterns.

```bash
hermex scan [pattern] [options]
```

#### Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `[pattern]` | Glob pattern for files to analyze | `**/*.{tsx,jsx,ts,js}` |

#### Options

| Option | Description | Values | Default |
|--------|-------------|--------|---------|
| `--ignore <pattern>` | Glob pattern for files to ignore | Any glob pattern | `**/node_modules/**`, `**/dist/**`, `**/build/**` |
| `--allow-packages <pattern>` | Glob pattern for packages to scan | Any glob pattern | `ALL` |
| `--ignore-packages <pattern>` | Glob pattern for packages to ignore | Any glob pattern | None |
| `--summary [mode]` | Show summary statistics | `log`, `false` | `log` |
| `--no-summary` | Do not show summary stats | - | - |
| `--details` | Show detailed pattern counts | - | `false` |
| `--components [mode]` | Show components table/chart | `table`, `chart` | `table` |
| `--no-components` | Do not show components | - | - |
| `--packages [mode]` | Show packages table/chart | `table`, `chart` | `table` |
| `--no-packages` | Do not show packages | - | - |
| `--patterns [mode]` | Show patterns table/chart | `table`, `chart` | `table` |
| `--no-patterns` | Do not show patterns | - | - |

#### Examples

```bash
# Basic scan with defaults
hermex scan

# Scan specific directory
hermex scan "src/**/*.tsx"

# Show only summary and components
hermex scan --no-patterns --no-packages

# Chart visualization
hermex scan --components chart --patterns chart

# Minimal output
hermex scan --no-summary --no-patterns
```

## 🎯 Example Output

### Lockfile Detection
```
✔ 📦 Found pnpm lockfile (supports: v5, v6, v9) - 156 packages
```

### File Analysis
```
✔  Found 42 files
✔ Analysis complete! Analyzed 42 files
```

### Packages Table
```
📦 Packages

┌───────────────────────────┬─────────┬────────────┬───────┬────────────┐
│ Package                   │ Version │ Components │ Usage │ Percentage │
├───────────────────────────┼─────────┼────────────┼───────┼────────────┤
│ @design-system/foundation │ 2.5.3   │ 9          │ 23    │ 88.5%      │
├───────────────────────────┼─────────┼────────────┼───────┼────────────┤
│ react                     │ 18.3.1  │ 1          │ 3     │ 11.5%      │
└───────────────────────────┴─────────┴────────────┴───────┴────────────┘

Total: 2 packages | 10 unique components | 26 total usages
```

### Components Table
```
⚛️  Components

┌────────────┬───────────────────────────┬───────┐
│ Component  │ Package                   │ Count │
├────────────┼───────────────────────────┼───────┤
│ Button     │ @design-system/foundation │ 5     │
├────────────┼───────────────────────────┼───────┤
│ Card       │ @design-system/foundation │ 5     │
├────────────┼───────────────────────────┼───────┤
│ Input      │ @design-system/foundation │ 4     │
├────────────┼───────────────────────────┼───────┤
│ Typography │ @design-system/foundation │ 4     │
└────────────┴───────────────────────────┴───────┘
```

### Code Patterns
```
🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ JSX Usage            │ 145   │
├──────────────────────┼───────┤
│ Named Imports        │ 89    │
├──────────────────────┼───────┤
│ Default Imports      │ 67    │
├──────────────────────┼───────┤
│ Variable Assignments │ 23    │
├──────────────────────┼───────┤
│ Object Mappings      │ 15    │
├──────────────────────┼───────┤
│ Conditional Usage    │ 12    │
└──────────────────────┴───────┘

Total: 146 patterns detected
```

### Summary Statistics
```
📊 Summary

┌─────────────────────┬───────┐
│ Metric              │ Count │
├─────────────────────┼───────┤
│ Files Analyzed      │ 8     │
├─────────────────────┼───────┤
│ External Packages   │ 2     │
├─────────────────────┼───────┤
│ External Components │ 10    │
├─────────────────────┼───────┤
│ Total Usages        │ 26    │
└─────────────────────┴───────┘

Analysis completed successfully in 0.1s
```

## 📚 Documentation

- **[Examples](./docs/EXAMPLES.md)** - Comprehensive examples and command usage
- **[Patterns Guide](./docs/PATTERNS.md)** - All detectable React usage patterns
- **[Project Milestones](./docs/MILESTONES.md)** - Roadmap and future features

## 🎯 Use Cases

1. **Dependency Audits** - Understand library usage before migrations
2. **Version Tracking** - Know exactly which component versions are in use
3. **Migration Planning** - Identify components that need updating when migrating UI libraries
4. **Component Analytics** - Track most-used components and usage patterns
5. **Code Quality** - Identify complex usage patterns that may need refactoring
6. **Team Insights** - Understand how your team uses component libraries
7. **Documentation** - Generate usage reports for component library documentation

## 🔍 Pattern Detection

Hermex detects 10+ React component usage patterns.
See the [Patterns](./docs/PATTERNS.md) for complete details.

## 🛠️ Tech Stack
- **Runtime**: Node.js 24
- **Parser**: [@swc/core](https://swc.rs/)
- **CLI**: [Commander.js](https://github.com/tj/commander.js)
- **Build**: [tsup](https://tsup.egoist.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Formatter**: [Biome](https://biomejs.dev/)
- **Linter**: [oxlint](https://oxc-project.github.io/)
- **Tests**: [Vitest](https://vitest.dev/)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE.md](./LICENSE.md)

## 🔗 Links

- [GitHub Repository](https://github.com/Gallevy/hermex)
- [npm Package](https://www.npmjs.com/package/hermex)
- [Report Issues](https://github.com/Gallevy/hermex/issues)
