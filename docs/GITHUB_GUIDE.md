# GitHub Repository Analysis Guide

Complete guide for analyzing GitHub repositories and microfrontends with React Usage Analyzer.

## 🚀 Quick Start

### Analyze Single Repository

```bash
node cli.js github owner/repo -l @mui/material
```

### Analyze Multiple Repositories

```bash
node cli.js github owner/repo1 owner/repo2 owner/repo3 -l @mui/material
```

### Using Config File (Recommended for Microfrontends)

```bash
node cli.js github --config examples/microfrontends-config.json
```

## 📋 Supported URL Formats

The analyzer accepts multiple GitHub URL formats:

```bash
# Shorthand (recommended)
node cli.js github facebook/react

# Full HTTPS URL
node cli.js github https://github.com/facebook/react

# HTTPS with .git extension
node cli.js github https://github.com/facebook/react.git

# SSH URL
node cli.js github git@github.com:facebook/react.git
```

## 🎯 Use Cases

### 1. Microfrontends Analysis

Analyze all your microfrontend applications in one command:

```bash
node cli.js github \
  your-org/mfe-shell \
  your-org/mfe-products \
  your-org/mfe-checkout \
  your-org/mfe-dashboard \
  -l @company/design-system \
  -o microfrontends-report.json
```

**What you get:**
- Component usage across all microfrontends
- Shared component adoption rates
- Inconsistencies between apps
- Combined usage statistics
- Per-repo breakdowns

### 2. Design System Adoption

Track how teams are using your design system:

```bash
node cli.js github \
  team-a/app1 \
  team-b/app2 \
  team-c/app3 \
  -l @company/design-system \
  --branch production
```

**Insights:**
- Which components are most/least used
- Teams not using certain components
- Component version mismatches
- Props usage patterns

### 3. Migration Tracking

Compare component usage before and after migration:

```bash
# Before migration (old branch)
node cli.js github org/app --branch old-ui -l old-library -o before.json

# After migration (new branch)
node cli.js github org/app --branch new-ui -l new-library -o after.json
```

### 4. Multi-Team Analysis

Analyze repositories from different teams:

```bash
node cli.js github --config teams-analysis.json
```

**teams-analysis.json:**
```json
{
  "repositories": [
    "frontend-team/app1",
    "mobile-team/app2",
    "platform-team/shared-libs"
  ]
}
```

### 5. Monorepo Analysis

Analyze specific packages in a monorepo:

```bash
node cli.js github org/monorepo \
  -p "packages/*/src/**/*.{tsx,jsx}" \
  -l @mui/material
```

## 🔧 Command Options

### Required

- `<repos...>` - One or more repository URLs (or use `--config`)

### Optional

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --library <name>` | Library to analyze | `@design-system/foundation` |
| `-b, --branch <name>` | Branch to analyze | `main` |
| `-p, --pattern <glob>` | File pattern | `**/*.{tsx,jsx,ts,js}` |
| `-o, --output <file>` | Output JSON file | `github-analysis.json` |
| `-f, --format <type>` | Output format: json, console, both | `both` |
| `--keep-repos` | Keep cloned repos after analysis | `false` |
| `--depth <number>` | Clone depth | `1` |
| `-c, --complexity` | Include complexity analysis | `false` |
| `--config <file>` | Load repos from config file | - |

## 📄 Config File Format

### Basic Config

```json
{
  "repositories": [
    "owner/repo1",
    "owner/repo2",
    "owner/repo3"
  ]
}
```

### Advanced Config

```json
{
  "name": "My Analysis",
  "description": "Analyzing component usage across our microfrontends",
  "repositories": [
    "org/mfe-shell",
    "org/mfe-products",
    "org/mfe-checkout"
  ],
  "options": {
    "library": "@company/design-system",
    "branch": "main",
    "pattern": "src/**/*.{tsx,jsx}",
    "depth": 1
  },
  "metadata": {
    "team": "Platform Engineering",
    "purpose": "Q1 component audit",
    "lastUpdated": "2024-01-15"
  }
}
```

## 📊 Output Format

### Console Output

```
🚀 GITHUB REPOSITORIES ANALYSIS REPORT
════════════════════════════════════════════════════════════

📈 SUMMARY:
  Library: @mui/material
  Repositories Analyzed: 3
  Total Components Found: 45
  Total Imports Found: 28

🏆 TOP COMPONENTS (Across All Repos):
  🥇 1. Button: 234 uses
  🥈 2. TextField: 156 uses
  🥉 3. Card: 89 uses

📦 REPOSITORY SUMMARIES:

  1. org/mfe-shell
     Components: 25
     Files: 45
     Top Components:
       - Button: 89 uses
       - AppBar: 12 uses

  2. org/mfe-products
     Components: 18
     Files: 32
     Top Components:
       - Button: 78 uses
       - Card: 45 uses
```

### JSON Output

```json
{
  "metadata": {
    "analyzedAt": "2024-01-15T10:30:00.000Z",
    "totalRepositories": 3,
    "library": "@mui/material",
    "repositories": ["org/repo1", "org/repo2", "org/repo3"]
  },
  "combined": {
    "totalComponents": ["Button", "TextField", "Card", ...],
    "componentFrequency": {
      "Button": 234,
      "TextField": 156,
      "Card": 89
    },
    "componentsByRepo": {
      "org/repo1": ["Button", "TextField", ...],
      "org/repo2": ["Button", "Card", ...]
    }
  },
  "repositories": {
    "org/repo1": {
      "metadata": {
        "owner": "org",
        "repo": "repo1",
        "url": "https://github.com/org/repo1"
      },
      "stats": {
        "name": "repo1",
        "version": "1.2.3",
        "totalFiles": 45
      },
      "analysis": {
        "components": ["Button", "TextField", ...],
        "componentUsage": {
          "Button": 89,
          "TextField": 45
        }
      }
    }
  }
}
```

## 🎨 Real-World Examples

### Example 1: Microfrontends Audit

**Scenario**: You have 5 microfrontends and want to see how each uses your design system.

```bash
node cli.js github \
  company/mfe-home \
  company/mfe-products \
  company/mfe-cart \
  company/mfe-checkout \
  company/mfe-account \
  -l @company/design-system \
  -o mfe-audit.json \
  --complexity
```

**Analysis Focus**:
- Which microfrontend uses which components
- Consistency across teams
- Complex usage patterns
- Shared vs unique components

### Example 2: Team Comparison

**Scenario**: Compare how different teams use the same library.

**teams-config.json:**
```json
{
  "repositories": [
    "team-alpha/app",
    "team-beta/app",
    "team-gamma/app"
  ]
}
```

```bash
node cli.js github --config teams-config.json -l @mui/material
```

### Example 3: Migration Progress

**Scenario**: Track migration from old to new library.

```bash
# Check current usage
node cli.js github org/app --branch main \
  -l old-library \
  -o current-state.json

# Check feature branch
node cli.js github org/app --branch feature/new-library \
  -l new-library \
  -o migrated-state.json

# Compare the two JSON files
```

### Example 4: Monorepo Package Analysis

**Scenario**: Analyze specific packages in a monorepo.

```bash
node cli.js github org/monorepo \
  -p "packages/{app1,app2,shared}/**/*.tsx" \
  -l @mui/material \
  --keep-repos
```

### Example 5: Multiple Libraries

**Scenario**: Analyze usage of multiple libraries across repos.

```bash
# Analyze Material-UI
node cli.js github org/app1 org/app2 -l @mui/material -o mui-usage.json

# Analyze Ant Design
node cli.js github org/app1 org/app2 -l antd -o antd-usage.json

# Analyze Chakra UI
node cli.js github org/app1 org/app2 -l @chakra-ui/react -o chakra-usage.json

# Compare the three JSON files
```

## 🔐 Authentication

### Private Repositories

For private repositories, ensure you have:

1. **SSH Keys configured** (if using SSH URLs)
2. **Git credentials cached** (if using HTTPS)
3. **GitHub token** (for API access)

```bash
# Set up GitHub token (if needed)
export GITHUB_TOKEN=your_token_here

# Use SSH URLs for private repos
node cli.js github git@github.com:org/private-repo.git
```

### Troubleshooting Authentication

If cloning fails:

1. Test manual clone: `git clone <url>`
2. Check credentials: `git credential approve`
3. Use SSH instead of HTTPS
4. Verify repository access

## 💡 Best Practices

### 1. Use Config Files for Multiple Repos

Instead of:
```bash
node cli.js github repo1 repo2 repo3 repo4 repo5
```

Use:
```bash
node cli.js github --config repos.json
```

### 2. Specify Patterns for Large Repos

```bash
node cli.js github large/repo -p "src/components/**/*.tsx"
```

### 3. Save JSON for Later Analysis

```bash
node cli.js github org/app -o report-$(date +%Y-%m-%d).json
```

### 4. Keep Repos for Deep Inspection

```bash
node cli.js github org/app --keep-repos
# Repos are kept in temp directory for manual inspection
```

### 5. Use Shallow Clones (Default)

```bash
# Fast: only latest commit
node cli.js github org/app --depth 1

# Slower: full history (not recommended)
node cli.js github org/app --depth 0
```

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Component Usage Analysis

on:
  schedule:
    - cron: '0 0 * * 0' # Weekly
  workflow_dispatch:

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd swc-parser
          npm install
      
      - name: Analyze repositories
        run: |
          cd swc-parser
          node cli.js github --config repos-config.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Upload report
        uses: actions/upload-artifact@v2
        with:
          name: analysis-report
          path: swc-parser/github-analysis.json
```

### GitLab CI Example

```yaml
analyze-components:
  stage: analyze
  script:
    - cd swc-parser
    - npm install
    - node cli.js github --config repos.json
  artifacts:
    paths:
      - swc-parser/github-analysis.json
    expire_in: 1 week
  only:
    - schedules
```

## 📈 Analyzing Results

### Compare Reports Over Time

```bash
# Week 1
node cli.js github org/app -o week1.json

# Week 2
node cli.js github org/app -o week2.json

# Compare (using jq or custom script)
jq -s '.[0].combined.totalComponents - .[1].combined.totalComponents' week1.json week2.json
```

### Find Most Used Components

```bash
node cli.js github org/app -f json -o report.json
jq '.combined.componentFrequency | to_entries | sort_by(.value) | reverse | .[0:10]' report.json
```

### Check Specific Component Usage

```bash
jq '.repositories | to_entries[] | {repo: .key, button_uses: .value.analysis.componentUsage.Button}' report.json
```

## 🐛 Troubleshooting

### Clone Fails

**Error**: `Failed to clone repository`

**Solutions**:
1. Check repository exists and is accessible
2. Verify branch name: try `--branch master` if `main` fails
3. Check authentication for private repos
4. Try manual clone: `git clone <url>`

### Out of Memory

**Error**: JavaScript heap out of memory

**Solutions**:
```bash
NODE_OPTIONS="--max-old-space-size=4096" node cli.js github ...
```

### Pattern Matches No Files

**Error**: No files found

**Solutions**:
1. Check pattern: `--pattern "src/**/*.tsx"`
2. Verify files exist in repo
3. Use `--keep-repos` to inspect cloned repo

### Slow Analysis

**Solutions**:
1. Use shallow clone: `--depth 1` (default)
2. Limit file pattern: `--pattern "src/**/*.tsx"`
3. Analyze repos sequentially instead of in config
4. Exclude large directories

## 🎓 Advanced Usage

### Custom Analysis Script

```javascript
const GitHubAnalyzer = require('./github-analyzer');
const { ReactComponentUsageAnalyzer } = require('./parser');

async function customAnalysis() {
  const analyzer = new GitHubAnalyzer({
    branch: 'main',
    pattern: 'src/**/*.tsx'
  });
  
  const repos = ['org/repo1', 'org/repo2'];
  const componentAnalyzer = new ReactComponentUsageAnalyzer('@mui/material');
  
  const results = await analyzer.analyzeRepositories(repos, componentAnalyzer);
  
  // Custom processing
  console.log(results);
  
  await analyzer.cleanup();
}

customAnalysis();
```

### Programmatic Usage

```javascript
const { exec } = require('child_process');
const fs = require('fs');

// Analyze and process
exec('node cli.js github org/app -f json -o temp.json', (err) => {
  if (err) throw err;
  
  const report = JSON.parse(fs.readFileSync('temp.json'));
  
  // Your custom processing
  const buttonUsage = report.combined.componentFrequency.Button;
  console.log(`Button used ${buttonUsage} times`);
});
```

## 📝 Tips & Tricks

1. **Use descriptive output names**: `node cli.js github ... -o 2024-01-q1-audit.json`
2. **Keep old reports**: Compare trends over time
3. **Use --keep-repos for debugging**: Inspect why certain patterns weren't found
4. **Combine with other commands**: `node cli.js github ... && node cli.js table ...`
5. **Schedule regular audits**: Use CI/CD for weekly/monthly analysis
6. **Share configs with team**: Version control your config files
7. **Document patterns**: Note which patterns you're tracking

## 🎉 Summary

The GitHub analysis feature enables:

- ✅ Analyzing multiple repositories in one command
- ✅ Perfect for microfrontends/microservices architectures
- ✅ Combined reports across all repositories
- ✅ Config file support for easy management
- ✅ CI/CD integration for automated analysis
- ✅ Private repository support
- ✅ Flexible patterns and branch selection

**Get started:**
```bash
node cli.js github owner/repo1 owner/repo2 -l @your-library
```

For more examples, see `examples/` directory!
