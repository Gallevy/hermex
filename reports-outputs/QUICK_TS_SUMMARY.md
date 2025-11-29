# TypeScript Migration - Quick Summary

## ❌ NOT Vite!

**Vite = Web apps (React, Vue)**  
**This = Node.js CLI tool**

Vite is completely wrong for this project.

---

## ✅ Use tsup (Recommended)

**Why tsup:**
- Built for CLI tools and libraries
- Zero config
- Fast (uses esbuild)
- Generates .d.ts files
- One command: `pnpm run build`

**Install:**
```bash
pnpm add -D tsup typescript @types/node @types/js-yaml
```

**Config (tsup.config.ts):**
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    parser: 'src/parser.ts',
    // ... other files
  },
  format: ['cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node14',
});
```

**Build:**
```bash
pnpm run build
# Output: dist/*.js + dist/*.d.ts
```

---

## Project Structure

**Before:**
```
swc-parser/
├── cli.js
├── parser.js
├── utils/
│   └── *.js
```

**After:**
```
swc-parser/
├── src/              # TypeScript source
│   ├── cli.ts
│   ├── parser.ts
│   └── utils/
│       └── *.ts
├── dist/             # Compiled JS
│   ├── cli.js
│   ├── cli.d.ts
│   └── ...
├── package.json      # Points to dist/
└── tsup.config.ts
```

---

## Publishing

**package.json:**
```json
{
  "main": "./dist/parser.js",
  "types": "./dist/parser.d.ts",
  "bin": {
    "react-usage-analyzer": "./dist/cli.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "prepublishOnly": "pnpm run build"
  }
}
```

**Publish:**
```bash
# Build happens automatically
pnpm publish
```

---

## Timeline

- Install & setup: 1 hour
- Move to src/: 30 min
- Add types: 4-6 hours
- Test & publish: 1 hour
**Total: 7-9 hours**

---

## Next Steps

1. Install tsup + TypeScript
2. Create tsup.config.ts
3. Create src/ folder
4. Move & rename .js → .ts
5. Add type annotations
6. Build and test
7. Publish to npm

Ready to start?
