# Action Plan: Fix CLI and Move to /src/

## Current Situation

**Problem:** cli.js references deleted `github-analyzer.js` (line 12)
**Reality:** We have `github-analysis.js` (new functional version)
**Impact:** GitHub command is broken

## Step-by-Step Plan

### Phase 1: Fix CLI (CRITICAL - Do First)
1. Update cli.js line 12 import
2. Refactor github command to use functional approach
3. Test that CLI works

### Phase 2: Move to /src/
1. Create /src/ and /src/utils/ directories
2. Move 8 source files
3. Update package.json
4. Update test imports
5. Test everything

---

## Phase 1: Fix CLI Import (Detailed)

### Files to Analyze
- ✅ All 8 files identified and analyzed
- ✅ All are actively used
- ✅ Dependencies mapped
- ❌ CLI has broken import

### What Needs Fixing

**File:** cli.js  
**Line 12:** Currently broken

**Change From:**
```javascript
const GitHubAnalyzer = require("./github-analyzer"); // DELETED FILE
```

**Change To:**
```javascript
const {
  analyzeGitHubRepositories,
  createGitHubAnalysisReport,
  loadRepositoriesFromConfig
} = require("./github-analysis");

const { formatGitHubReport, saveJsonReport } = require("./utils/formatters");
```

This is the CRITICAL blocker preventing us from moving forward.

---

## Phase 2: Move to /src/ (After CLI Fixed)

### New Structure
```
swc-parser/
├── src/
│   ├── cli.js                  # Main entry
│   ├── parser.js               # AST parser
│   ├── analyze-usage.js        # Pattern analysis
│   ├── github-analysis.js      # GitHub analysis
│   └── utils/
│       ├── formatters.js       # Output formatting
│       ├── git-utils.js        # Git operations
│       ├── file-utils.js       # File operations
│       └── lockfile-parser.js  # Version extraction
├── tests/                      # Optional
│   ├── test.js
│   └── test-libraries.js
└── (root files remain as-is)
```

### Files to Move (8 total)

**Core (4 files):**
1. cli.js → src/cli.js
2. parser.js → src/parser.js
3. analyze-usage.js → src/analyze-usage.js
4. github-analysis.js → src/github-analysis.js

**Utils (4 files):**
5. utils/formatters.js → src/utils/formatters.js
6. utils/git-utils.js → src/utils/git-utils.js
7. utils/file-utils.js → src/utils/file-utils.js
8. utils/lockfile-parser.js → src/utils/lockfile-parser.js

### package.json Updates

**Change bin paths:**
```json
"bin": {
  "react-usage-analyzer": "./src/cli.js",
  "rua": "./src/cli.js"
}
```

**Optional - add main:**
```json
"main": "./src/parser.js"
```

### Test File Imports

**If tests stay in root:**
```javascript
// test.js and test-libraries.js
const { ReactComponentUsageAnalyzer } = require("./src/parser");
const { FocusedUsageAnalyzer } = require("./src/analyze-usage");
```

**Or move tests to /tests/:**
```javascript
// tests/test.js
const { ReactComponentUsageAnalyzer } = require("../src/parser");
const { FocusedUsageAnalyzer } = require("../src/analyze-usage");
```

---

## Execution Order

### ✅ Step 1: Verify Current State
```bash
ls -la *.js              # Check root files
ls -la utils/            # Check utils files
cat cli.js | head -20    # Check imports
```

### 🔴 Step 2: Fix CLI Import (CRITICAL)
This must be done manually or with careful refactoring because:
- Need to understand github command implementation
- Need to replace class instantiation with functional calls
- Need to integrate formatters

**Estimated Time:** 2-3 hours

### ✅ Step 3: Test Fixed CLI
```bash
node cli.js --help
node cli.js github --help
node cli.js github owner/repo -l library --help
```

### ✅ Step 4: Create /src/ Structure
```bash
mkdir -p src/utils
```

### ✅ Step 5: Move Files
```bash
# Move core files
mv cli.js parser.js analyze-usage.js github-analysis.js src/

# Move utils
mv utils/*.js src/utils/

# Remove empty utils/ folder
rmdir utils/
```

### ✅ Step 6: Update package.json
Edit bin paths to point to src/cli.js

### ✅ Step 7: Update Test Imports (if needed)
Edit test.js and test-libraries.js imports

### ✅ Step 8: Test Everything
```bash
npm test
node src/cli.js --help
node src/cli.js analyze "code-examples/**/*.tsx" -l @mui/material
```

---

## Risks & Mitigation

### Risk 1: Broken Imports After Move
**Mitigation:** Test each step, keep git history

### Risk 2: CLI Refactoring Complexity
**Mitigation:** Do this BEFORE moving to /src/, test thoroughly

### Risk 3: Package.json bin Path
**Mitigation:** Test with `npm link` after changes

---

## Success Criteria

✅ CLI import fixed and working
✅ All 8 files moved to /src/
✅ package.json updated
✅ All tests passing
✅ All CLI commands working
✅ Clean project structure

---

## Timeline Estimate

- Fix CLI: 2-3 hours
- Move to /src/: 30 minutes
- Testing: 1 hour
**Total: 3.5-4.5 hours**

---

## Next Action

**IMMEDIATE:** Need to decide:
1. Should I fix the CLI import now? (2-3 hours)
2. Or just document it and let you handle it?

The CLI fix is complex because it requires understanding the github command's usage of the old class and converting it to functional calls.
