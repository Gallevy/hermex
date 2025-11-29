# Examples

Quick reference for common usage scenarios.

## Local File Analysis

### Basic Analysis
```bash
node cli.js analyze "src/**/*.tsx" -l @mui/material
```

### With JSON Output
```bash
node cli.js analyze "src/**/*.tsx" -l @mui/material -f json -o report.json
```

### Quick Summary
```bash
node cli.js summary "src/**/*.tsx" -l @mui/material --top 10
```

### Statistics with Charts
```bash
node cli.js stats "src/**/*.tsx" -l @mui/material --chart
```

### Component Table
```bash
node cli.js table "src/**/*.tsx" -l @mui/material --props --top 20
```

### Pattern Analysis
```bash
node cli.js patterns "src/**/*.tsx" -l @mui/material --sort complexity
```

### Compare Libraries
```bash
node cli.js compare "src/**/*.tsx" -l @mui/material antd @chakra-ui/react
```

## GitHub Repository Analysis

### Single Repository
```bash
node cli.js github owner/repo -l @mui/material
```

### Multiple Repositories
```bash
node cli.js github owner/repo1 owner/repo2 owner/repo3 -l @design-system
```

### With Config File
```bash
# Create repos.json:
# {
#   "repositories": [
#     "owner/repo1",
#     "owner/repo2"
#   ]
# }

node cli.js github --config repos.json -l @design-system
```

### Custom Options
```bash
# Specific branch
node cli.js github owner/repo -l @mui/material --branch develop

# Custom file pattern
node cli.js github owner/repo -l @mui/material --pattern "src/**/*.tsx"

# Keep cloned repositories
node cli.js github owner/repo -l @mui/material --keep-repos

# Both console and JSON output
node cli.js github owner/repo -l @mui/material -f both -o report.json
```

## Expected Output

Components are reported with exact versions from lockfiles:

```
🏆 TOP COMPONENTS:
  🥇 1. Button from @mui/material@5.14.0: 45 uses
  🥈 2. TextField from @mui/material@5.14.0: 32 uses
  🥉 3. Grid from @mui/material@5.14.0: 28 uses

📦 Lockfile: package-lock.json (npm)
```

## Use Cases

### Dependency Audit
Before upgrading or migrating:
```bash
node cli.js github your-org/app -l @material-ui/core -f json -o pre-migration.json
```

### Track Component Usage
Identify most-used components:
```bash
node cli.js github your-org/app -l @your/design-system -f console
```

### Analyze Microservices
Check usage across multiple repositories:
```bash
node cli.js github --config microfrontends.json -l @design-system
```

### Migration Planning
Compare old vs new library:
```bash
node cli.js compare "src/**/*.tsx" -l @material-ui/core @mui/material
```

## Output Formats

### Console
- Color-coded output
- Ranked component lists
- Complexity distributions
- Version information

### JSON
- Complete analysis data
- Version mappings
- Per-file breakdowns
- Machine-readable format

### Table
- Structured view
- Sortable columns
- Props analysis
- Import tracking

## Lockfile Support

The analyzer automatically detects and parses:
- `package-lock.json` (npm)
- `yarn.lock` (Yarn)
- `pnpm-lock.yaml` (pnpm)

Components are reported with exact versions extracted from the lockfile.