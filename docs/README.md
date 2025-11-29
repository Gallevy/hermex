# Documentation

Essential documentation for the React Usage Analyzer.

## Getting Started

1. **[Examples](./EXAMPLES.md)** - Quick reference for common commands and use cases
2. **[CLI Guide](./CLI_GUIDE.md)** - Complete CLI command reference
3. **[GitHub Guide](./GITHUB_GUIDE.md)** - Analyzing GitHub repositories
4. **[Usage Patterns](./USAGE_PATTERNS_GUIDE.md)** - Pattern detection details

## Quick Start

```bash
# Install
npm install

# Analyze local files
node cli.js analyze "src/**/*.tsx" -l @mui/material

# Analyze GitHub repository
node cli.js github owner/repo -l @mui/material
```

## Key Features

- **Version Tracking** - Components reported with exact versions from lockfiles
- **Multi-Lockfile Support** - npm, yarn, pnpm
- **Pattern Detection** - 16+ React usage patterns
- **GitHub Analysis** - Clone and analyze remote repositories
- **Multiple Output Formats** - Console, JSON, table

## Documentation Overview

### [Examples](./EXAMPLES.md)
Common usage scenarios with copy-paste commands for:
- Local file analysis
- GitHub repository analysis
- Different output formats
- Use cases (audits, migrations, tracking)

### [CLI Guide](./CLI_GUIDE.md)
Complete reference for all CLI commands:
- `analyze` - Detailed analysis
- `summary` - Quick overview
- `stats` - Statistics with charts
- `patterns` - Pattern listing
- `table` - Component tables
- `compare` - Library comparison
- `github` - Repository analysis

### [GitHub Guide](./GITHUB_GUIDE.md)
Everything about analyzing GitHub repositories:
- Single and multiple repositories
- Config file format
- Branch selection
- Pattern filtering
- Version tracking

### [Usage Patterns Guide](./USAGE_PATTERNS_GUIDE.md)
Detailed explanation of detected patterns:
- Direct imports and usage
- Lazy loading
- HOC patterns
- Dynamic imports
- And 12+ more patterns

## Need Help?

Run any command with `--help`:
```bash
node cli.js --help
node cli.js analyze --help
node cli.js github --help
```
