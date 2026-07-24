# hermex

SWC-based AST parser for analyzing code and React component usage patterns across entire codebases

## Quick Start

```bash
# No installation required - use npx (scans current directory)
npx hermex scan
```

hermex is fully config-driven — see [docs/examples.md](docs/examples.md) for
`hermex.config.ts` options (file targeting, rules, output control). There
are no CLI flags for scan behavior; `scan`/`comply` only take `--config`,
`--format`, and `--no-color` (see [CLI Usage](#cli-usage) below).

## Requirements

- Node.js 24.11.1+

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
  scan [options]             Scan and analyze local files
  comply [options]           Check compliance with hermex.config.ts rules and
                              release-age policy (exits non-zero if not
                              compliant)
  help [command]              display help for command
```

Both `scan` and `comply` share the same options:

| Option | Description |
|---|---|
| `--config <path>` | Path to a hermex config file, overriding CWD discovery |
| `--format <human\|json>` | Overrides `output.format` from the config file |
| `--no-color` | Disable colored output (see also the `NO_COLOR` env var) |

All scan behavior — which files to include/exclude, which output sections
to show, compliance rules, release-age thresholds — is controlled by
`hermex.config.ts`, not CLI flags. See
[docs/examples.md](docs/examples.md) for the full config reference.

### Comply Command

`scan` is informational and always exits `0`. Use `comply` to gate CI — it
runs the same pipeline, reports every violation, then exits `0` (compliant),
`1` (not compliant), or `2` (couldn't run the check). `comply` additionally
supports `--summary-file <path>` (and `--summary-title <title>`) to write a
CI-friendly markdown summary suitable for a GitHub Actions job summary or PR
comment. See [docs/examples.md](docs/examples.md#compliance-checking) for
details and a full CI usage example.

## Configuration

### Environment variables

- `HERMEX_REGISTRY_AUTH_TOKEN` — auth token used when querying the npm registry
  for release age analysis (`releaseAge`). Used as a fallback when
  `releaseAge.authToken` is not set in the config file.

> **Tip**: Instead of storing `authToken` in your config file, set the
> `HERMEX_REGISTRY_AUTH_TOKEN` environment variable. The config field takes
> precedence if both are set.

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
│ Named Imports        │ 130   │
├──────────────────────┼───────┤
│ Default Imports      │ 51    │
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

Total: 272 patterns detected

📊 Summary

┌─────────────────────┬───────┐
│ Metric              │ Count │
├─────────────────────┼───────┤
│ Files Analyzed      │ 46    │
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

- **Runtime**: Node.js 24.11.1+
- **Parser**: [@swc/core](https://swc.rs/)
- **CLI**: [Commander.js](https://github.com/tj/commander.js)
- **Build**: [tsdown](https://tsdown.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Formatter**: [oxfmt](https://oxc-project.github.io/)
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
