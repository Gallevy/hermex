# React Component Usage Analyzer

A powerful SWC-based tool for analyzing React component usage patterns across codebases. Understand how UI library components are used, track dependencies with exact versions, and generate comprehensive reports.

## ✅ Status: Production Ready

- ✅ **TypeScript** - Migrated to TypeScript with src/ structure
- ✅ Functional programming architecture
- ✅ Cross-platform support (Windows/Unix)
- ✅ Lockfile parsing (npm, yarn, pnpm)
- ✅ Version tracking from lockfiles
- ✅ GitHub repository analysis
- ✅ Multiple output formats
- ✅ Built with **tsup** for optimized distribution

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Build the project (TypeScript -> JavaScript)
pnpm run build

# Analyze local files
node dist/cli.js analyze "src/**/*.tsx" -l @mui/material

# Or use the npm scripts
pnpm run test-cli

# Analyze GitHub repository
node dist/cli.js github owner/repo -l @mui/material

# Generate reports with versions
node dist/cli.js github owner/repo -l @mui/material -f both -o reports-outputs/analysis.json
```

## 🛠️ Development

```bash
# Build in watch mode
pnpm run dev

# Run tests
pnpm test

# Clean build artifacts
pnpm run clean
```

## 📊 Key Features

- **Version Tracking**: Components reported with exact package versions from lockfiles
- **Multi-Lockfile Support**: Parses package-lock.json, yarn.lock, and pnpm-lock.yaml
- **Pattern Detection**: Identifies 16+ React usage patterns (imports, lazy loading, HOCs, etc.)
- **GitHub Analysis**: Clone and analyze multiple repositories
- **Flexible Output**: Console, JSON, and table formats
- **Complexity Scoring**: Categorizes usage patterns by complexity

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `analyze` | Analyze local files with detailed patterns |
| ` ` | Quick component usage overview |
| `stats` | Detailed statistics with charts |
| `patterns` | List all detected usage patterns |
| `table` | Component and import tables |
| `compare` | Compare usage across libraries |
| `github` | Analyze GitHub repositories |

## 🎯 Example Output

Components are reported with exact versions:

```
🏆 TOP COMPONENTS:
  🥇 1. Button from @mui/material@5.14.0: 45 uses
  🥈 2. TextField from @mui/material@5.14.0: 32 uses
  🥉 3. Grid from @mui/material@5.14.0: 28 uses
```

## 📚 Documentation

- [CLI Guide](./docs/CLI_GUIDE.md) - Complete command reference
- [GitHub Guide](./docs/GITHUB_GUIDE.md) - Repository analysis guide
- [Usage Patterns](./docs/USAGE_PATTERNS_GUIDE.md) - Pattern detection details
- [Demo Examples](./docs/DEMO.md) - Live examples and use cases
- [Test Results](./docs/TEST_RESULTS.md) - Validation and testing

## 🏗️ Project Structure

```
swc-parser/
├── cli.js                  # Main CLI entry point
├── parser.js               # SWC AST parser
├── analyze-usage.js        # Pattern analysis
├── github-analysis.js      # GitHub repository analysis
├── utils/
│   ├── formatters.js       # Output formatting
│   ├── git-utils.js        # Git operations
│   ├── lockfile-parser.js  # Version extraction
│   └── file-utils.js       # File operations
├── code-examples/          # Pattern examples (01-07)
├── docs/                   # Documentation
└── reports-outputs/        # Generated reports
```

## 🔧 Usage Examples

### Local Analysis
```bash
# Basic analysis
node cli.js analyze "src/**/*.tsx" -l @mui/material

# With complexity scoring
node cli.js analyze "src/**/*.tsx" -l @mui/material --complexity

# JSON output only
node cli.js analyze "src/**/*.tsx" -l @mui/material -f json -o report.json
```

### GitHub Analysis
```bash
# Single repository
node cli.js github owner/repo -l @mui/material

# Multiple repositories from config
node cli.js github --config repos.json -l @design-system

# Keep cloned repos for inspection
node cli.js github owner/repo -l @mui/material --keep-repos
```

### Summary Commands
```bash
# Quick summary
node cli.js summary "src/**/*.tsx" -l @mui/material --top 10

# Statistics with charts
node cli.js stats "src/**/*.tsx" -l @mui/material --chart

# Component table
node cli.js table "src/**/*.tsx" -l @mui/material --props --top 20
```

## 🎨 Output Formats

### Console Output
- Color-coded with emojis
- Ranked component lists
- Complexity distributions
- Version information

### JSON Output
- Complete analysis data
- Version mapping
- Per-file breakdowns
- Machine-readable

### Table Output
- Structured data view
- Sortable columns
- Props analysis
- Import tracking

## 🔍 Pattern Detection

Detects 16+ usage patterns including:
- Direct imports and JSX usage
- Named imports with aliases
- Namespace imports
- Lazy loading and code splitting
- HOC patterns
- Dynamic imports
- Context usage
- Portal usage

See [Usage Patterns Guide](./docs/USAGE_PATTERNS_GUIDE.md) for details.

## 📦 Requirements

- Node.js 24+
- Git (for GitHub analysis)

## 🤝 Contributing

[Contributing](Contributing.md)

## 📄 License

[MIT License](License.md)

## 🎯 Use Cases

1. **Dependency Audits** - Understand library usage before migrations
2. **Version Tracking** - Know exactly which versions are in use
3. **Migration Planning** - Identify components that need updating
4. **Component Analytics** - Track most-used components
5. **Multi-Repo Analysis** - Analyze microservices/microfrontends
6. **Code Quality** - Identify complex usage patterns
