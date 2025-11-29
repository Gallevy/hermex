# Project Structure

Clean, organized architecture following functional programming principles.

## Directory Structure

```
swc-parser/
├── README.md                    # Main documentation (minimal)
├── package.json                 # Dependencies
├── package-lock.json            # Lock file
│
├── cli.js                       # CLI entry point
├── parser.js                    # SWC AST parser
├── analyze-usage.js             # Pattern analysis
├── github-analysis.js           # GitHub repo analysis (functional)
│
├── utils/                       # Utility modules (functional)
│   ├── formatters.js            # Output formatting (console, JSON, table)
│   ├── git-utils.js             # Git operations (clone, find files)
│   ├── lockfile-parser.js       # Version extraction (npm, yarn, pnpm)
│   └── file-utils.js            # File operations
│
├── docs/                        # Documentation (4 essential files)
│   ├── README.md                # Documentation index
│   ├── EXAMPLES.md              # Common usage examples
│   ├── CLI_GUIDE.md             # Complete CLI reference
│   ├── GITHUB_GUIDE.md          # GitHub analysis guide
│   └── USAGE_PATTERNS_GUIDE.md  # Pattern detection details
│
├── code-examples/               # Pattern examples (01-07)
│   ├── 01-direct-usage.tsx
│   ├── 02-variable-assignment.tsx
│   ├── 03-object-mapping.tsx
│   ├── 04-lazy-loading.tsx
│   ├── 05-namespace-imports.tsx
│   ├── 06-common-patterns.tsx
│   └── 07-comprehensive-usage.tsx
│
├── examples/                    # Config examples and test files
│   ├── repos-config.json        # GitHub repos config example
│   ├── microfrontends-config.json
│   ├── different-libraries.tsx
│   └── examples-cli.sh          # CLI usage examples
│
├── reports-outputs/             # Generated reports (.gitignored)
│   ├── *.json                   # Analysis reports
│   └── (dev docs)               # Internal progress docs
│
└── tests/                       # Test files
    ├── test.js
    └── test-libraries.js
```

## Core Modules

### CLI (`cli.js`)
Main entry point with Commander.js providing 7 commands:
- `analyze` - Full analysis with patterns
- `summary` - Quick component overview
- `stats` - Detailed statistics with charts
- `patterns` - List usage patterns
- `table` - Component and import tables
- `compare` - Multi-library comparison
- `github` - Repository analysis

### Parser (`parser.js`)
SWC-based AST parser for React components:
- Parses .tsx, .jsx, .ts, .js files
- Detects imports and JSX usage
- Tracks component references
- Props analysis

### Analysis (`analyze-usage.js`)
Pattern detection and complexity scoring:
- 16+ usage pattern types
- Complexity calculation
- Pattern classification
- Recommendations

### GitHub Analysis (`github-analysis.js`)
Functional repository analysis:
- Multi-repo support
- Version tracking from lockfiles
- Aggregated reporting
- Config file support

## Utilities (`utils/`)

### Formatters (`formatters.js`)
Output formatting functions:
- `formatConsoleReport()` - Colored console output
- `formatGitHubReport()` - GitHub analysis output
- `formatComponentTable()` - Table views
- `saveJsonReport()` - JSON file export

### Git Utils (`git-utils.js`)
Git operations (functional):
- `cloneRepository()` - Clone single repo
- `cloneRepositories()` - Clone multiple repos
- `findFilesInRepos()` - Find matching files
- `generateCombinedReport()` - Aggregate results

### Lockfile Parser (`lockfile-parser.js`)
Version extraction:
- `parsePackageLock()` - npm support
- `parseYarnLock()` - Yarn support
- `parsePnpmLock()` - pnpm support
- `findAndParseLockfile()` - Auto-detect

### File Utils (`file-utils.js`)
File operations:
- `findFiles()` - Glob pattern matching
- `readFile()` / `writeFile()` - File I/O
- `normalizePath()` - Cross-platform paths
- `readJsonFile()` / `writeJsonFile()` - JSON ops

## Documentation (`docs/`)

Only 4 essential files:

1. **EXAMPLES.md** - Quick reference with copy-paste commands
2. **CLI_GUIDE.md** - Complete CLI command reference
3. **GITHUB_GUIDE.md** - GitHub repository analysis
4. **USAGE_PATTERNS_GUIDE.md** - Pattern detection details

## Code Examples (`code-examples/`)

7 numbered examples following naming convention:
- `01-` through `07-` prefix for easy identification
- Each demonstrates specific pattern types
- Used for testing and documentation

## Reports (`reports-outputs/`)

Generated outputs:
- JSON analysis reports
- Test outputs
- Internal development docs (progress, improvements)
- `.gitignored` to keep repo clean

## Key Principles

### Functional Programming
- ✅ No classes (all functions)
- ✅ Pure functions where possible
- ✅ Composable utilities
- ✅ Single responsibility

### Organization
- ✅ Clear separation of concerns
- ✅ Utils folder for reusable code
- ✅ Docs folder for documentation
- ✅ Reports folder for outputs
- ✅ Minimal root directory

### Code Quality
- ✅ Modular design
- ✅ Consistent naming
- ✅ Cross-platform support
- ✅ Graceful error handling

### Documentation
- ✅ Less is more (only 4 essential docs)
- ✅ Examples over explanations
- ✅ Quick reference focused
- ✅ No duplication

## File Count Summary

- **Root**: 6 essential JS files + README.md
- **Utils**: 4 modules (1,425 lines)
- **Docs**: 4 essential guides + index
- **Examples**: 7 numbered patterns + 3 configs
- **Total**: Clean, organized, maintainable

## Architecture Benefits

1. **Easy Navigation** - Know where everything is
2. **Easy Extension** - Add utils without touching core
3. **Easy Testing** - Pure functions are testable
4. **Easy Maintenance** - Modular, single responsibility
5. **Easy Onboarding** - Clear structure and minimal docs