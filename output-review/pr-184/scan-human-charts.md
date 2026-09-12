---
layout: default
title: "scan-human-charts — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `scan-human-charts`

_changed_

**Asserts** — The bar-chart renderer: bar scaling and label alignment for packages, components and patterns.

**Ran** `hermex scan --config configs/charts.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/charts.config.ts`](https://github.com/Gallevy/hermex/blob/e9c52e1ea3750fbc1eebc813cfa864330c1358c3/fixtures/configs/charts.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/e9c52e1ea3750fbc1eebc813cfa864330c1358c3/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/e9c52e1ea3750fbc1eebc813cfa864330c1358c3/fixtures/README.md)) · **Case** [`scan-human-charts`](https://github.com/Gallevy/hermex/blob/e9c52e1ea3750fbc1eebc813cfa864330c1358c3/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/e9c52e1ea3750fbc1eebc813cfa864330c1358c3/fixtures/cases/scan-human-charts.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-human-charts`</sub>

## Config

[`fixtures/configs/charts.config.ts`](https://github.com/Gallevy/hermex/blob/e9c52e1ea3750fbc1eebc813cfa864330c1358c3/fixtures/configs/charts.config.ts) — resolved, as the loader sees it

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
    },
    {
      "name": "Utility Library Migration",
      "packages": [
        "lodash",
        "es-toolkit"
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

## Diff against the target branch

<sub>Diffs are unified format: `-` is the target branch, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the target branch and 9 lines from line 12 of this run.</sub>

```diff
--- target/stdout.txt
+++ current/stdout.txt
@@ -1,8 +1,8 @@
 hermex v<version>
 - Parsing lockfile...
-✔ Found pnpm lockfile (supports: v5, v6, v9) - 5 packages
-✔ Found 18 files
-✔ Analysis complete! Analyzed 17/18 files
+✔ Found pnpm lockfile (supports: v5, v6, v9) - 7 packages
+✔ Found 22 files
+✔ Analysis complete! Analyzed 21/22 files
 
 ⚠ 1 file(s) failed to parse:
   broken/unparseable.tsx
@@ -26,10 +26,15 @@
 
   Design System Migration
   ──────────────────────────────────────────────────
-  @design-system/foundation  ██████████████████████████████ 100.0% (33 usages)
-  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (0 usages)
+  @design-system/foundation  ██████████████████████████████ 100.0% (8 files)
+  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (not found in this repo)
 
+  Utility Library Migration
+  ──────────────────────────────────────────────────
+  lodash      ███████████████████████░░░░░░░ 75.0% (3 files)
+  es-toolkit  ████████░░░░░░░░░░░░░░░░░░░░░░ 25.0% (1 file)
 
+
 🔍 Rules
 
 ┌──────────────────┬──────────────────────────────────────────────────────┐
@@ -93,13 +98,13 @@
 
 Props Analyzed          ██████████████████████████████████████████████████ 64
 
-Default Imports         ██████████████████████████████░░░░░░░░░░░░░░░░░░░░ 39
+Named Imports           █████████████████████████████████░░░░░░░░░░░░░░░░░ 42
 
-Named Imports           █████████████████████████████░░░░░░░░░░░░░░░░░░░░░ 37
+Default Imports         ███████████████████████████████░░░░░░░░░░░░░░░░░░░ 40
 
-Object Mappings         ███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 19
+Dynamic Imports         ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 20
 
-Dynamic Imports         ███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 19
+Object Mappings         ███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 19
 
 Variable Assignments    ███████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9
 
@@ -125,9 +130,9 @@
 ┌─────────────────────┬───────┐
 │ Metric              │ Count │
 ├─────────────────────┼───────┤
-│ Files Analyzed      │ 17    │
+│ Files Analyzed      │ 21    │
 ├─────────────────────┼───────┤
-│ Packages            │ 5     │
+│ Packages            │ 7     │
 ├─────────────────────┼───────┤
 │ External Components │ 19    │
 ├─────────────────────┼───────┤
```

## Full output

<details markdown="1"><summary><code>stdout.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 7 packages
✔ Found 22 files
✔ Analysis complete! Analyzed 21/22 files

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
  @design-system/foundation  ██████████████████████████████ 100.0% (8 files)
  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (not found in this repo)

  Utility Library Migration
  ──────────────────────────────────────────────────
  lodash      ███████████████████████░░░░░░░ 75.0% (3 files)
  es-toolkit  ████████░░░░░░░░░░░░░░░░░░░░░░ 25.0% (1 file)


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

Named Imports           █████████████████████████████████░░░░░░░░░░░░░░░░░ 42

Default Imports         ███████████████████████████████░░░░░░░░░░░░░░░░░░░ 40

Dynamic Imports         ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 20

Object Mappings         ███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 19

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
│ Files Analyzed      │ 21    │
├─────────────────────┼───────┤
│ Packages            │ 7     │
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