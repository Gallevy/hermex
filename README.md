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
- **Pattern Detection**: Identifies 16+ React usage patterns including:
  - Direct imports and JSX usage
  - Variable assignments and destructuring
  - Conditional usage and object mappings
  - Lazy loading and dynamic imports
  - HOC wrapping and memoization
  - Portal usage and context integration
- **Version Tracking**: Components reported with exact package versions from lockfiles
- **Multi-Lockfile Support**: Parses package-lock.json, yarn.lock, and pnpm-lock.yaml
- **Flexible Output**: Console, table, and chart formats
- **Complexity Scoring**: Categorizes usage patterns by complexity
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
| `--verbose` | Show detailed file-by-file analysis | `true`/`false` | `false` |
| `--summary [mode]` | Show summary statistics | `log`, `false` | `log` |
| `--details` | Show detailed pattern counts | `true`/`false` | `false` |
| `--top-components [mode]` | Show top components | `log`, `table`, `chart` | `log` |
| `--components-usage [mode]` | Show components usage table/chart | `table`, `chart` | `table` |
| `--patterns [mode]` | Show patterns table/chart | `table`, `chart` | `table` |

#### Examples

```bash
# Basic scan with defaults
hermex scan

# Scan specific directory
hermex scan "src/**/*.tsx"

# Verbose output
hermex scan "src/**/*.tsx" --verbose

# Show only summary and top components
hermex scan "src/**/*.tsx" --components-usage false --patterns false

# Chart visualization
hermex scan "src/**/*.tsx" --top-components chart --components-usage chart

# Detailed analysis
hermex scan "src/**/*.tsx" --details --verbose
```

## 🎯 Example Output

### Summary Statistics
```
[SUMMARY] Analysis completed successfully in 0.1s
[SUMMARY] Files analyzed: 42
[SUMMARY] Total imports: 156
[SUMMARY] Total components: 38
```

### Top Components
```
🏆 Top Components

[TOP-COMPONENTS] 🥇 1. Button from @design-system/button: 45 uses
[TOP-COMPONENTS] 🥈 2. Card from @design-system/card: 32 uses
[TOP-COMPONENTS] 🥉 3. Input from @design-system/input: 28 uses
```

### Components Usage Table
```
⚛️ Components Usage

┌────────────┬──────────────────────────┬─────────┬───────┐
│ Component  │ Source                   │ Version │ Count │
├────────────┼──────────────────────────┼─────────┼───────┤
│ Button     │ @design-system/button    │ 2.1.5   │ 45    │
│ Card       │ @design-system/card      │ 1.8.3   │ 32    │
│ Input      │ @design-system/input     │ 2.0.1   │ 28    │
└────────────┴──────────────────────────┴─────────┴───────┘
```

### Code Patterns
```
🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ JSX Usage            │ 145   │
│ Named Imports        │ 89    │
│ Default Imports      │ 67    │
│ Variable Assignments │ 23    │
│ Object Mappings      │ 15    │
│ Conditional Usage    │ 12    │
│ Lazy Loading         │ 8     │
└──────────────────────┴───────┘
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

Hermex detects 16+ React component usage patterns with varying complexity levels:

| Pattern | Complexity | Examples |
|---------|------------|----------|
| Direct Import & Usage | 1/10 | `import Button from '@lib/button'` |
| Named Import with Alias | 2/10 | `import { Button as Btn } from '@lib'` |
| Variable Assignment | 3/10 | `const MyButton = Button` |
| Destructuring Usage | 4/10 | `const { Button } = Foundation` |
| Object Mapping | 5/10 | `const map = { btn: Button }` |
| Lazy Loading | 6/10 | `lazy(() => import('@lib/button'))` |
| Dynamic Import | 7/10 | `await import('@lib/button')` |
| HOC Wrapping | 7/10 | `withWrapper(Button)` |
| Context Integration | 7/10 | `useContext(ComponentContext)` |
| Portal Usage | 8/10 | `createPortal(<Button />)` |

See the [Patterns Guide](./docs/PATTERNS.md) for complete details.

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
