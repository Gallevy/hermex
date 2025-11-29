# File Usage Analysis

**Date:** November 28, 2024  
**Purpose:** Analyze each JS file to determine if it's used before moving to /src/

---

## Root JS Files Analysis

### 1. `cli.js` ✅ USED - NEEDS FIX
**Status:** Primary entry point, actively used  
**Used by:** 
- package.json bin entries: `react-usage-analyzer`, `rua`
- npm scripts: `cli`, `test-cli`, `test-compare`, etc.

**Dependencies:**
- ✅ `./parser` - ReactComponentUsageAnalyzer
- ✅ `./analyze-usage` - FocusedUsageAnalyzer
- ❌ `./github-analyzer` - **BROKEN! File deleted, references old class**

**Issues:**
- Line 12 references deleted `github-analyzer.js`
- Should use `./github-analysis` (new functional version)

**Action:** FIX IMPORT, then move to `/src/cli.js`

---

### 2. `parser.js` ✅ USED
**Status:** Core module, actively used  
**Used by:**
- `cli.js` - ReactComponentUsageAnalyzer
- `analyze-usage.js` - extends ReactComponentUsageAnalyzer
- `test.js` - testing

**Dependencies:**
- External: `@swc/core`, `fs`, `path`
- No internal dependencies

**Action:** Move to `/src/parser.js`

---

### 3. `analyze-usage.js` ✅ USED
**Status:** Core module, actively used  
**Used by:**
- `cli.js` - FocusedUsageAnalyzer
- `test.js` - testing
- `test-libraries.js` - testing

**Dependencies:**
- `./parser` - extends ReactComponentUsageAnalyzer
- External: `fs`, `path`

**Action:** Move to `/src/analyze-usage.js`

---

### 4. `github-analysis.js` ✅ USED (but NOT imported yet)
**Status:** New functional module, ready to use  
**Used by:**
- **NONE YET** - cli.js still uses old github-analyzer

**Dependencies:**
- `./utils/git-utils` - Git operations
- `./utils/lockfile-parser` - Version extraction
- `./utils/file-utils` - File operations
- External: `ora`, `chalk`

**Issues:**
- Not being used yet because cli.js still references old file
- Ready to replace github-analyzer once cli.js is fixed

**Action:** Move to `/src/github-analysis.js`, update cli.js imports

---

### 5. `test.js` ⚠️ TESTING ONLY
**Status:** Test file  
**Used by:**
- npm scripts: `test`

**Dependencies:**
- `./parser` - ReactComponentUsageAnalyzer
- `./analyze-usage` - FocusedUsageAnalyzer

**Action:** Keep in root or move to `/tests/test.js`

---

### 6. `test-libraries.js` ⚠️ TESTING ONLY
**Status:** Test file  
**Used by:**
- Manual execution only

**Dependencies:**
- `./analyze-usage` - FocusedUsageAnalyzer

**Action:** Keep in root or move to `/tests/test-libraries.js`

---

## Utils Files Analysis

### 1. `utils/formatters.js` ✅ USED (will be)
**Status:** Ready to use, not imported yet  
**Used by:**
- **FUTURE:** cli.js (after refactoring)
- **FUTURE:** github-analysis.js

**Dependencies:**
- External: `chalk`, `cli-table3`, `fs`, `path`

**Action:** Move to `/src/utils/formatters.js`

---

### 2. `utils/git-utils.js` ✅ USED
**Status:** Actively used  
**Used by:**
- `github-analysis.js` - All git operations

**Dependencies:**
- External: `simple-git`, `tmp`, `fs`, `path`, `glob`, `chalk`, `ora`

**Action:** Move to `/src/utils/git-utils.js`

---

### 3. `utils/file-utils.js` ✅ USED
**Status:** Actively used  
**Used by:**
- `github-analysis.js` - readJsonFile

**Dependencies:**
- External: `fs`, `path`, `glob`

**Action:** Move to `/src/utils/file-utils.js`

---

### 4. `utils/lockfile-parser.js` ✅ USED
**Status:** Actively used  
**Used by:**
- `github-analysis.js` - findAndParseLockfile

**Dependencies:**
- External: `fs`, `path`, `yaml`, `@yarnpkg/lockfile`

**Action:** Move to `/src/utils/lockfile-parser.js`

---

## Summary

### Files to Move to /src/

**Core Modules (4 files):**
- ✅ `cli.js` → `/src/cli.js` (AFTER FIXING IMPORT)
- ✅ `parser.js` → `/src/parser.js`
- ✅ `analyze-usage.js` → `/src/analyze-usage.js`
- ✅ `github-analysis.js` → `/src/github-analysis.js`

**Utils (4 files):**
- ✅ `utils/formatters.js` → `/src/utils/formatters.js`
- ✅ `utils/git-utils.js` → `/src/utils/git-utils.js`
- ✅ `utils/file-utils.js` → `/src/utils/file-utils.js`
- ✅ `utils/lockfile-parser.js` → `/src/utils/lockfile-parser.js`

**Total to move: 8 files**

### Files to Keep in Root/Tests

**Test Files (2 files):**
- ⚠️ `test.js` → Keep in root OR move to `/tests/test.js`
- ⚠️ `test-libraries.js` → Keep in root OR move to `/tests/test-libraries.js`

---

## Critical Issues to Fix BEFORE Moving

### 1. cli.js Import Issue 🔴 CRITICAL
**Line 12:**
```javascript
const GitHubAnalyzer = require("./github-analyzer"); // ❌ DELETED FILE
```

**Should be:**
```javascript
const {
  analyzeGitHubRepositories,
  createGitHubAnalysisReport,
  loadRepositoriesFromConfig,
} = require("./github-analysis");
```

### 2. Update package.json After Moving 🟡 IMPORTANT
**Current:**
```json
"bin": {
  "react-usage-analyzer": "./cli.js"
}
```

**After moving:**
```json
"bin": {
  "react-usage-analyzer": "./src/cli.js"
}
```

### 3. Update All Internal Imports 🟡 IMPORTANT
After moving to /src/, all relative imports need updating:
- `require("./parser")` → `require("./parser")` (stays same within src/)
- `require("./utils/formatters")` → `require("./utils/formatters")` (stays same)

Test files will need:
- `require("./parser")` → `require("./src/parser")` (if tests stay in root)

---

## Recommended Action Plan

### Step 1: Fix cli.js (CRITICAL)
1. Remove line 12: `const GitHubAnalyzer = require("./github-analyzer");`
2. Add proper imports from `./github-analysis`
3. Refactor github command to use functional approach
4. Test that CLI still works

### Step 2: Create /src/ Structure
```
src/
├── cli.js
├── parser.js
├── analyze-usage.js
├── github-analysis.js
└── utils/
    ├── formatters.js
    ├── git-utils.js
    ├── file-utils.js
    └── lockfile-parser.js
```

### Step 3: Move Files
1. Create `/src/` and `/src/utils/` directories
2. Move 8 source files to /src/
3. Update package.json bin path
4. Update test imports (if needed)

### Step 4: Test Everything
- Run `npm test`
- Test all CLI commands
- Verify imports work correctly

---

## Import Dependencies Graph

```
cli.js
├── parser.js
├── analyze-usage.js
│   └── parser.js
└── github-analysis.js (should be, currently broken)
    ├── utils/git-utils.js
    ├── utils/lockfile-parser.js
    └── utils/file-utils.js

test.js
├── parser.js
└── analyze-usage.js

test-libraries.js
└── analyze-usage.js
```

---

## Conclusion

**All files are needed** except the old `github-analyzer.js` which is already deleted.

**Critical blocker:** cli.js has broken import that must be fixed before moving anything.

**Recommendation:** 
1. Fix cli.js import first (1-2 hours)
2. Test that everything works
3. Then move to /src/ structure (30 minutes)
4. Update package.json and test again

**Status:** Ready to proceed after fixing cli.js import issue.