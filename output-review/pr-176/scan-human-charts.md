---
layout: default
title: "scan-human-charts — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `scan-human-charts`

_unchanged_

**Asserts** — The bar-chart renderer: bar scaling and label alignment for packages, components and patterns.

**Ran** `hermex scan --config configs/charts.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/charts.config.ts`](https://github.com/Gallevy/hermex/blob/f5e3daa7f5403e6571b3da57ad2c22fc3042c4b8/fixtures/configs/charts.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/f5e3daa7f5403e6571b3da57ad2c22fc3042c4b8/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/f5e3daa7f5403e6571b3da57ad2c22fc3042c4b8/fixtures/README.md)) · **Case** [`scan-human-charts`](https://github.com/Gallevy/hermex/blob/f5e3daa7f5403e6571b3da57ad2c22fc3042c4b8/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/f5e3daa7f5403e6571b3da57ad2c22fc3042c4b8/fixtures/cases/scan-human-charts.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-human-charts`</sub>

## Config

[`fixtures/configs/charts.config.ts`](https://github.com/Gallevy/hermex/blob/f5e3daa7f5403e6571b3da57ad2c22fc3042c4b8/fixtures/configs/charts.config.ts) — resolved, as the loader sees it

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
    "packages": "chart",
    "components": "chart",
    "patterns": "chart",
    "details": false,
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

@design-system/foundation ████████████████████████████████████████ 91.7% (33)
react                     ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 8.3% (3)

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

⚛️ Components

Button              ██████████████████████████████████████████████████ 6

Input               ██████████████████████████████████████████░░░░░░░░ 5

Card                █████████████████████████████████░░░░░░░░░░░░░░░░░ 4

Typography          █████████████████████████████████░░░░░░░░░░░░░░░░░ 4

Suspense            █████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░ 3

Icon                ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

Modal               ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseChild           ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseCond            ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseMap             ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseVar             ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseReturn          ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

Child               ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseAttr            ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseAttrSelfClosing ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseAttrCond        ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseAttrHost        ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseAttrFragment    ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseBoth            ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1


🧩 Code Patterns

JSX Usage               ██████████████████████████████████████████████████ 64

Props Analyzed          ██████████████████████████████████████████████████ 64

Default Imports         ██████████████████████████████░░░░░░░░░░░░░░░░░░░░ 39

Named Imports           █████████████████████████████░░░░░░░░░░░░░░░░░░░░░ 37

Object Mappings         ███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 19

Dynamic Imports         ███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 19

Variable Assignments    ███████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9

Conditional Usage       █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 7

Named Imports (aliased) █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 6

Lazy Loading            █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 6

Higher-Order Components ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 5

Namespace Imports       ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 4

Destructuring           ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2

Array Mappings          ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2

Portal Usage            █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1


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