---
layout: default
title: "scan-human-all-sections — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `scan-human-all-sections`

_unchanged_

**Asserts** — Every human section rendered at once, including details and patterns, which the default config leaves off.

**Ran** `hermex scan --config configs/all-sections.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/all-sections.config.ts`](https://github.com/Gallevy/hermex/blob/90c860852e70ca8d1c518db2ec2f8a40bea63bff/fixtures/configs/all-sections.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/90c860852e70ca8d1c518db2ec2f8a40bea63bff/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/90c860852e70ca8d1c518db2ec2f8a40bea63bff/fixtures/README.md)) · **Case** [`scan-human-all-sections`](https://github.com/Gallevy/hermex/blob/90c860852e70ca8d1c518db2ec2f8a40bea63bff/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/90c860852e70ca8d1c518db2ec2f8a40bea63bff/fixtures/cases/scan-human-all-sections.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-human-all-sections`</sub>

## Config

[`fixtures/configs/all-sections.config.ts`](https://github.com/Gallevy/hermex/blob/90c860852e70ca8d1c518db2ec2f8a40bea63bff/fixtures/configs/all-sections.config.ts) — resolved, as the loader sees it

```json
{
  "excludes": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "cases.ts",
    "configs/**",
    "registry/**",
    "repos/**"
  ],
  "versus": [
    {
      "name": "Design System Migration",
      "packages": [
        "@design-system/foundation",
        "@new-system/arc"
      ]
    }
  ],
  "rules": {
    "no-files": [
      {
        "severity": "error",
        "patterns": [
          "jest.config.*",
          ".babelrc"
        ],
        "message": "Use vitest + Vite"
      }
    ],
    "no-packages": [
      {
        "severity": "error",
        "patterns": [
          "moment"
        ],
        "message": "Use date-fns or dayjs"
      }
    ],
    "require-files": [
      {
        "severity": "error",
        "patterns": [
          ".nvmrc"
        ]
      },
      {
        "severity": "warn",
        "patterns": [
          ".editorconfig"
        ]
      }
    ],
    "require-packages": [
      {
        "severity": "error",
        "patterns": [
          "typescript"
        ],
        "message": "TypeScript is required"
      }
    ],
    "require-scripts": [
      {
        "severity": "error",
        "patterns": [
          "build",
          "test"
        ],
        "message": "Required npm scripts"
      }
    ],
    "require-package-fields": [
      {
        "severity": "warn",
        "patterns": [
          "engines",
          "license"
        ]
      }
    ],
    "require-engine-version": {
      "severity": "warn",
      "range": ">=20",
      "message": "Minimum Node 20 required"
    }
  },
  "output": {
    "summary": "log",
    "packages": "table",
    "components": "table",
    "patterns": "table",
    "details": true,
    "versus": true,
    "rules": true
  }
}
```

## Full output

<details markdown="1"><summary><code>stdout.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 5 packages
✔ Found 18 files
✔ Analysis complete! Analyzed 17/18 files

⚠ 1 file(s) failed to parse:
  broken/unparseable.tsx
      x Expression expected
   ,----
 1 | export const Broken = ( : : :;
   :                         ^
   `----


Caused by:
    Syntax Error


📦 Packages

┌───────────────────────────┬─────────┐
│ Package                   │ Version │
├───────────────────────────┼─────────┤
│ @design-system/foundation │ 2.5.3   │
├───────────────────────────┼─────────┤
│ react                     │ 18.3.1  │
├───────────────────────────┼─────────┤
│ eslint                    │ N/A     │
├───────────────────────────┼─────────┤
│ [BANNED] moment           │ 2.29.4  │
├───────────────────────────┼─────────┤
│ react-dom                 │ 18.3.1  │
└───────────────────────────┴─────────┘

Total: 5 packages

⚖️ Versus

  Design System Migration
  ──────────────────────────────────────────────────
  @design-system/foundation  ██████████████████████████████ 100.0% (33 usages)
  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (0 usages)


🔍 Rules

┌──────────────────┬──────────────────────────────────────────────────────┐
│ Rule             │ Description                                          │
├──────────────────┼──────────────────────────────────────────────────────┤
│ no-packages      │ 🔴 moment is forbidden — Use date-fns or dayjs       │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require-packages │ 🔴 typescript not installed — TypeScript is required │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require-files    │ 🔴 .nvmrc not found                                  │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require-files    │ 🟡 .editorconfig not found                           │
└──────────────────┴──────────────────────────────────────────────────────┘

3 errors, 1 warning

📋 Details

  Total usage patterns: 284
  JSX Usage: 64
  Props Analyzed: 64
  Default Imports: 39
  Named Imports: 37
  Object Mappings: 19
  Dynamic Imports: 19
  Variable Assignments: 9
  Conditional Usage: 7
  Named Imports (aliased): 6
  Lazy Loading: 6
  Higher-Order Components: 5
  Namespace Imports: 4
  Destructuring: 2
  Array Mappings: 2
  Portal Usage: 1

⚛️ Components

┌─────────────────────┬───────────────────────────┬───────┐
│ Component           │ Package                   │ Count │
├─────────────────────┼───────────────────────────┼───────┤
│ Button              │ @design-system/foundation │ 6     │
├─────────────────────┼───────────────────────────┼───────┤
│ Input               │ @design-system/foundation │ 5     │
├─────────────────────┼───────────────────────────┼───────┤
│ Card                │ @design-system/foundation │ 4     │
├─────────────────────┼───────────────────────────┼───────┤
│ Typography          │ @design-system/foundation │ 4     │
├─────────────────────┼───────────────────────────┼───────┤
│ Suspense            │ react                     │ 3     │
├─────────────────────┼───────────────────────────┼───────┤
│ Icon                │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ Modal               │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseChild           │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseCond            │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseMap             │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseVar             │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseReturn          │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ Child               │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseAttr            │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseAttrSelfClosing │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseAttrCond        │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseAttrHost        │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseAttrFragment    │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseBoth            │ @design-system/foundation │ 1     │
└─────────────────────┴───────────────────────────┴───────┘

🧩 Code Patterns

┌─────────────────────────┬───────┐
│ Pattern                 │ Count │
├─────────────────────────┼───────┤
│ JSX Usage               │ 64    │
├─────────────────────────┼───────┤
│ Props Analyzed          │ 64    │
├─────────────────────────┼───────┤
│ Default Imports         │ 39    │
├─────────────────────────┼───────┤
│ Named Imports           │ 37    │
├─────────────────────────┼───────┤
│ Object Mappings         │ 19    │
├─────────────────────────┼───────┤
│ Dynamic Imports         │ 19    │
├─────────────────────────┼───────┤
│ Variable Assignments    │ 9     │
├─────────────────────────┼───────┤
│ Conditional Usage       │ 7     │
├─────────────────────────┼───────┤
│ Named Imports (aliased) │ 6     │
├─────────────────────────┼───────┤
│ Lazy Loading            │ 6     │
├─────────────────────────┼───────┤
│ Higher-Order Components │ 5     │
├─────────────────────────┼───────┤
│ Namespace Imports       │ 4     │
├─────────────────────────┼───────┤
│ Destructuring           │ 2     │
├─────────────────────────┼───────┤
│ Array Mappings          │ 2     │
├─────────────────────────┼───────┤
│ Portal Usage            │ 1     │
└─────────────────────────┴───────┘

Total: 284 patterns detected

📊 Summary

┌─────────────────────┬───────┐
│ Metric              │ Count │
├─────────────────────┼───────┤
│ Files Analyzed      │ 17    │
├─────────────────────┼───────┤
│ Packages            │ 5     │
├─────────────────────┼───────┤
│ External Components │ 19    │
├─────────────────────┼───────┤
│ Total Usages        │ 36    │
└─────────────────────┴───────┘
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}