# TypeScript Migration & Build Strategy

**Date:** November 29, 2024  
**Status:** Planning Phase  
**Priority:** 🟡 Medium

---

## Why NOT Vite?

**Vite is for web applications, NOT for Node.js CLI tools.**

### What Vite Is For:
- ❌ Frontend applications (React, Vue, Svelte)
- ❌ Browser-based apps
- ❌ Hot module reloading for UI
- ❌ Web bundling with dev server

### What This Project Is:
- ✅ Node.js CLI tool
- ✅ Server-side library
- ✅ Command-line binary
- ✅ npm package for Node.js

**Conclusion:** Vite would be completely wrong for this project.

---

## Recommended Build Tools

### Option 1: tsup (RECOMMENDED) ⭐

**Why tsup:**
- ✅ Zero-config for most cases
- ✅ Built for libraries and CLI tools
- ✅ Uses esbuild (very fast)
- ✅ Generates both CJS and ESM
- ✅ Creates .d.ts files automatically
- ✅ Minification support
- ✅ Great DX (developer experience)

**Install:**
```bash
pnpm add -D tsup typescript @types/node
```

**tsup.config.ts:**
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    parser: 'src/parser.ts',
    'analyze-usage': 'src/analyze-usage.ts',
    'github-analysis': 'src/github-analysis.ts',
  },
  format: ['cjs'], // CommonJS for Node.js
  dts: true, // Generate .d.ts files
  clean: true, // Clean dist before build
  sourcemap: true,
  shims: true, // Add __dirname, __filename shims
  target: 'node14',
  splitting: false,
});
```

**package.json:**
```json
{
  "main": "./dist/parser.js",
  "types": "./dist/parser.d.ts",
  "bin": {
    "react-usage-analyzer": "./dist/cli.js",
    "rua": "./dist/cli.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "prepublishOnly": "pnpm run build"
  }
}
```

---

### Option 2: TypeScript Compiler (tsc) - Simple

**Why tsc:**
- ✅ Official TypeScript compiler
- ✅ No extra dependencies
- ✅ Simple and predictable
- ✅ Good for straightforward projects

**Cons:**
- ❌ Slower than esbuild/tsup
- ❌ Only outputs what you specify (CJS or ESM, not both)
- ❌ More configuration needed

**Install:**
```bash
pnpm add -D typescript @types/node
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**package.json:**
```json
{
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "prepublishOnly": "pnpm run build"
  }
}
```

---

### Option 3: esbuild - Fastest

**Why esbuild:**
- ✅ Extremely fast
- ✅ Native binary (written in Go)
- ✅ Bundle or transpile
- ✅ Minification built-in

**Cons:**
- ❌ Doesn't type-check (need tsc separately)
- ❌ Doesn't emit .d.ts files
- ❌ Need wrapper script

**Install:**
```bash
pnpm add -D esbuild typescript @types/node
```

**build.js:**
```javascript
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/cli.ts', 'src/parser.ts'],
  bundle: false,
  platform: 'node',
  target: 'node14',
  format: 'cjs',
  outdir: 'dist',
  sourcemap: true,
}).catch(() => process.exit(1));
```

**package.json:**
```json
{
  "scripts": {
    "build": "tsc --noEmit && node build.js",
    "prepublishOnly": "pnpm run build"
  }
}
```

---

## Recommendation: Use tsup ⭐

**Why tsup is best for this project:**

1. **CLI-focused** - Designed for tools like ours
2. **Zero config** - Works out of the box
3. **Fast** - Uses esbuild under the hood
4. **Type definitions** - Generates .d.ts automatically
5. **Shims** - Handles __dirname/__filename
6. **Watch mode** - Great for development
7. **One command** - `pnpm run build` does everything

---

## Migration Plan

### Phase 1: Setup TypeScript (1 hour)

**Step 1: Install dependencies**
```bash
pnpm add -D tsup typescript @types/node
```

**Step 2: Add type definitions for dependencies**
```bash
pnpm add -D @types/js-yaml
```

**Step 3: Create tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create tsup.config.ts**
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    parser: 'src/parser.ts',
    'analyze-usage': 'src/analyze-usage.ts',
    'github-analysis': 'src/github-analysis.ts',
    'utils/formatters': 'src/utils/formatters.ts',
    'utils/git-utils': 'src/utils/git-utils.ts',
    'utils/file-utils': 'src/utils/file-utils.ts',
    'utils/lockfile-parser': 'src/utils/lockfile-parser.ts',
  },
  format: ['cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  shims: true,
  target: 'node14',
});
```

---

### Phase 2: Move Files to src/ (30 minutes)

```bash
# Create src directory
mkdir -p src/utils

# Move source files
mv cli.js src/cli.ts
mv parser.js src/parser.ts
mv analyze-usage.js src/analyze-usage.ts
mv github-analysis.js src/github-analysis.ts

# Move utils
mv utils/*.js src/utils/
rename 's/\.js$/.ts/' src/utils/*.js
```

---

### Phase 3: Add Type Annotations (4-6 hours)

**Priority order:**
1. Start with utility files (easier)
2. Then parser.js
3. Then analyze-usage.js
4. Finally cli.js

**Example conversion:**

**Before (JS):**
```javascript
function parsePackageLock(lockFilePath) {
  try {
    const content = fs.readFileSync(lockFilePath, 'utf8');
    const lockData = JSON.parse(content);
    const versions = {};
    // ...
    return versions;
  } catch (error) {
    console.warn(`Warning: ${error.message}`);
    return {};
  }
}
```

**After (TS):**
```typescript
interface VersionMap {
  [packageName: string]: string;
}

function parsePackageLock(lockFilePath: string): VersionMap {
  try {
    const content = fs.readFileSync(lockFilePath, 'utf8');
    const lockData = JSON.parse(content);
    const versions: VersionMap = {};
    // ...
    return versions;
  } catch (error) {
    console.warn(`Warning: ${(error as Error).message}`);
    return {};
  }
}
```

---

### Phase 4: Update package.json (15 minutes)

```json
{
  "name": "react-usage-analyzer",
  "version": "1.0.0",
  "description": "SWC-based React component usage analyzer with version tracking",
  "main": "./dist/parser.js",
  "types": "./dist/parser.d.ts",
  "bin": {
    "react-usage-analyzer": "./dist/cli.js",
    "rua": "./dist/cli.js"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "node dist/test.js",
    "prepublishOnly": "pnpm run build"
  },
  "keywords": [
    "react",
    "typescript",
    "ast",
    "parser",
    "swc",
    "cli",
    "analyzer"
  ],
  "engines": {
    "node": ">=14.0.0"
  },
  "dependencies": {
    "@swc/core": "^1.3.107",
    "@swc/types": "^0.1.5",
    "@yarnpkg/lockfile": "^1.1.0",
    "chalk": "^4.1.2",
    "cli-table3": "^0.6.5",
    "commander": "^14.0.2",
    "glob": "^13.0.0",
    "js-yaml": "^4.1.1",
    "ora": "^5.4.1",
    "simple-git": "^3.30.0",
    "tmp": "^0.2.5"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.5",
    "@types/node": "^20.10.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.3"
  }
}
```

---

### Phase 5: Build & Test (1 hour)

```bash
# Build
pnpm run build

# Check output
ls -la dist/

# Test CLI
node dist/cli.js --help
node dist/cli.js analyze "code-examples/**/*.tsx" -l @mui/material

# Run tests
pnpm test
```

---

## Publishing Strategy

### Step 1: Prepare for Publish

**Add .npmignore:**
```
src/
*.ts
tsconfig.json
tsup.config.ts
tests/
reports-outputs/
.git/
.gitignore
```

**Or use "files" in package.json (better):**
```json
{
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ]
}
```

---

### Step 2: Version & Publish

```bash
# Test the package locally
pnpm pack
# Creates react-usage-analyzer-1.0.0.tgz

# Install locally to test
pnpm add ./react-usage-analyzer-1.0.0.tgz -g

# Test the binary
react-usage-analyzer --help
rua --help

# If all works, publish
pnpm publish
```

---

### Step 3: Publish Workflow

```bash
# 1. Update version
npm version patch  # or minor, or major

# 2. Build (happens automatically with prepublishOnly)
pnpm run build

# 3. Publish to npm
pnpm publish --access public

# 4. Tag and push
git push --tags
```

---

## Project Structure After Migration

```
swc-parser/
├── src/                          # TypeScript source
│   ├── cli.ts                    # Main CLI
│   ├── parser.ts                 # AST parser
│   ├── analyze-usage.ts          # Pattern analyzer
│   ├── github-analysis.ts        # GitHub analyzer
│   └── utils/
│       ├── formatters.ts
│       ├── git-utils.ts
│       ├── file-utils.ts
│       └── lockfile-parser.ts
│
├── dist/                         # Compiled output (gitignored)
│   ├── cli.js
│   ├── cli.d.ts
│   ├── parser.js
│   ├── parser.d.ts
│   └── utils/
│       ├── formatters.js
│       ├── formatters.d.ts
│       └── ...
│
├── tests/
│   ├── test.ts
│   └── test-libraries.ts
│
├── docs/                         # Documentation
├── code-examples/                # Example files
├── examples/                     # Config examples
│
├── package.json                  # Points to dist/
├── tsconfig.json                 # TypeScript config
├── tsup.config.ts                # Build config
├── pnpm-lock.yaml                # Lock file
├── README.md
└── .gitignore
```

---

## Benefits of TypeScript

1. **Type Safety** ✅
   - Catch errors at compile time
   - Better IDE support
   - Refactoring confidence

2. **Better DX** ✅
   - Autocomplete everywhere
   - Inline documentation
   - Jump to definition

3. **Documentation** ✅
   - Types serve as docs
   - Generated .d.ts files
   - Better for library consumers

4. **Maintainability** ✅
   - Easier to understand code
   - Safer refactoring
   - Self-documenting

---

## Timeline Estimate

| Phase | Task | Time |
|-------|------|------|
| 1 | Setup TypeScript & tsup | 1 hour |
| 2 | Move files to src/ | 30 min |
| 3 | Add type annotations | 4-6 hours |
| 4 | Update package.json | 15 min |
| 5 | Build & test | 1 hour |
| 6 | Publish prep | 30 min |
| **Total** | | **7-9 hours** |

---

## Action Items

### Immediate (Before TypeScript):
1. ✅ Fix CLI import (github-analyzer issue)
2. ✅ Move files to src/ (optional, can do with TS migration)
3. ✅ Test everything works

### TypeScript Migration:
1. Install tsup & TypeScript
2. Create config files
3. Rename .js to .ts
4. Add type annotations incrementally
5. Build and test
6. Update documentation

### After TypeScript:
1. Test publishing locally
2. Publish to npm
3. Convert classes to functional (separate PR)

---

## Recommendation

**Do This Order:**

1. **Now:** Install tsup + TypeScript (15 min)
2. **Now:** Move files to src/ (30 min)
3. **Now:** Rename to .ts and add basic types (2 hours)
4. **Later:** Add comprehensive types (4-6 hours)
5. **Later:** Publish to npm

**Start with quick wins:**
- Install dependencies
- Move to src/
- Rename files
- Get it building with `any` types
- Refine types incrementally

---

## Summary

✅ **Use tsup** (NOT Vite)  
✅ **TypeScript** for better DX  
✅ **dist/ folder** for compiled output  
✅ **pnpm publish** when ready  
✅ **7-9 hours** estimated time  

**Next:** Install tsup and start migration?