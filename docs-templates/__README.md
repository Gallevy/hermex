# <!-- @package name -->

<!-- @package description -->

## Quick Start

```bash
# No installation required - use npx (scans current directory)
npx <!-- @package name --> scan

# Or install globally
npm install -g <!-- @package name -->
<!-- @package name --> scan

# Scan specific directory
npx <!-- @package name --> scan "src/**/*.tsx"
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
npm install -g <!-- @package name -->

# Or with pnpm
pnpm add -g <!-- @package name -->

# Or with yarn
yarn global add <!-- @package name -->
```

## CLI Usage

### Main CLI

```bash
<!-- @cli --help -->
```

### Scan Command

The `scan` command analyzes local files for React component usage patterns.

```bash
<!-- @cli scan --help -->
```

## Example Output

Running a basic scan (uses default pattern `**/*.{tsx,jsx,ts,js}`):

```bash
<!-- @cli scan -->
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

<!-- @package license --> License - see [LICENSE.md](./LICENSE.md)

## Links

- [GitHub Repository](<!-- @package repository.url -->)
- [npm Package](https://www.npmjs.com/package/<!-- @package name -->)
- [Report Issues](<!-- @package repository.url -->/issues)
