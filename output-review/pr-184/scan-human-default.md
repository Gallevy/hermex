---
layout: default
title: "scan-human-default — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `scan-human-default`

_changed_

**Asserts** — Baseline human output: the sections a repo gets with no output config of its own. Includes both Versus groups — a component pair and a function-only one — which is where #174 is visible: the function-only group reports a real split off files-that-import, where it used to read 0 vs 0 off JSX renders, and the package named by no lockfile entry says so instead of reporting a confident 0%.

**Ran** `hermex scan` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/21a0e6f64d98b1fc35d3157f4d9206a3ad9b208a/fixtures/hermex.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/21a0e6f64d98b1fc35d3157f4d9206a3ad9b208a/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/21a0e6f64d98b1fc35d3157f4d9206a3ad9b208a/fixtures/README.md)) · **Case** [`scan-human-default`](https://github.com/Gallevy/hermex/blob/21a0e6f64d98b1fc35d3157f4d9206a3ad9b208a/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/21a0e6f64d98b1fc35d3157f4d9206a3ad9b208a/fixtures/cases/scan-human-default.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-human-default`</sub>

## Config

[`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/21a0e6f64d98b1fc35d3157f4d9206a3ad9b208a/fixtures/hermex.config.ts) — resolved, as the loader sees it

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
    "details": false,
    "patterns": false
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
@@ -26,21 +26,30 @@
 ├───────────────────────────┼─────────┤
 │ react                     │ 18.3.1  │
 ├───────────────────────────┼─────────┤
+│ react-dom                 │ 18.3.1  │
+├───────────────────────────┼─────────┤
+│ lodash                    │ 4.17.21 │
+├───────────────────────────┼─────────┤
+│ es-toolkit                │ 1.39.10 │
+├───────────────────────────┼─────────┤
 │ eslint                    │ N/A     │
 ├───────────────────────────┼─────────┤
 │ [BANNED] moment           │ 2.29.4  │
-├───────────────────────────┼─────────┤
-│ react-dom                 │ 18.3.1  │
 └───────────────────────────┴─────────┘
 
 ⚖️ Versus
 
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
@@ -106,9 +115,9 @@
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

┌───────────────────────────┬─────────┐
│ Package                   │ Version │
├───────────────────────────┼─────────┤
│ @design-system/foundation │ 2.5.3   │
├───────────────────────────┼─────────┤
│ react                     │ 18.3.1  │
├───────────────────────────┼─────────┤
│ react-dom                 │ 18.3.1  │
├───────────────────────────┼─────────┤
│ lodash                    │ 4.17.21 │
├───────────────────────────┼─────────┤
│ es-toolkit                │ 1.39.10 │
├───────────────────────────┼─────────┤
│ eslint                    │ N/A     │
├───────────────────────────┼─────────┤
│ [BANNED] moment           │ 2.29.4  │
└───────────────────────────┴─────────┘

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