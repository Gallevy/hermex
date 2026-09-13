---
layout: default
title: "scan-deprecated-packages — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `scan-deprecated-packages`

_unchanged_

**Asserts** — `scan` with a registry-backed rule that is NOT `no-outdated-packages` — the one combination no case covered, and the cell a real bug lived in. `scan` gates the Packages table on `output.packages` rather than on any rule, so it is the only path where registry facts reach the renderer without `no-outdated-packages` being configured. The table must therefore show the plain `Version` column and the `deprecated` badge, never the Installed/Minimum target pair, which belongs to a rule this config does not enable. Every other `scan` case runs a config with no registry rules at all, and every registry case runs `comply`, whose own gate hides this path entirely.

**Ran** `hermex scan --config configs/deprecated-packages.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/deprecated-packages.config.ts`](https://github.com/Gallevy/hermex/blob/84d5b4bc01dbcaa0390ce3e46e57182d6f95ef39/fixtures/configs/deprecated-packages.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/84d5b4bc01dbcaa0390ce3e46e57182d6f95ef39/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/84d5b4bc01dbcaa0390ce3e46e57182d6f95ef39/fixtures/README.md)) · **Case** [`scan-deprecated-packages`](https://github.com/Gallevy/hermex/blob/84d5b4bc01dbcaa0390ce3e46e57182d6f95ef39/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/84d5b4bc01dbcaa0390ce3e46e57182d6f95ef39/fixtures/cases/scan-deprecated-packages.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-deprecated-packages`</sub>

## Config

[`fixtures/configs/deprecated-packages.config.ts`](https://github.com/Gallevy/hermex/blob/84d5b4bc01dbcaa0390ce3e46e57182d6f95ef39/fixtures/configs/deprecated-packages.config.ts) — resolved, as the loader sees it

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
    },
    "no-deprecated-packages": [
      {
        "severity": "error",
        "patterns": [
          "**"
        ]
      }
    ]
  },
  "output": {
    "details": false,
    "patterns": false
  },
  "releaseAge": {
    "cacheDisabled": true
  }
}
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

✔ Registry checked (3 packages skipped — registry unreachable or not found)

📦 Packages

┌───────────────────────────┬─────────┬────────────────────────────┐
│ Package                   │ Version │ Flags                      │
├───────────────────────────┼─────────┼────────────────────────────┤
│ @design-system/foundation │ 2.5.3   │                            │
├───────────────────────────┼─────────┼────────────────────────────┤
│ react                     │ 18.3.1  │                            │
├───────────────────────────┼─────────┼────────────────────────────┤
│ react-dom                 │ 18.3.1  │                            │
├───────────────────────────┼─────────┼────────────────────────────┤
│ lodash                    │ 4.17.21 │                            │
├───────────────────────────┼─────────┼────────────────────────────┤
│ es-toolkit                │ 1.39.10 │                            │
├───────────────────────────┼─────────┼────────────────────────────┤
│ eslint                    │ N/A     │                            │
├───────────────────────────┼─────────┼────────────────────────────┤
│ moment                    │ 2.29.4  │ 🔴 forbidden 🔴 deprecated │
└───────────────────────────┴─────────┴────────────────────────────┘

Notes:
  🔵 moment → deprecated: Moment is in maintenance mode — prefer date-fns or dayjs

⚖️ Versus

  Design System Migration
  ──────────────────────────────────────────────────
  @design-system/foundation  ██████████████████████████████ 100.0% (8 files, 33 renders)
  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (not found in this repo)

  Utility Library Migration
  ──────────────────────────────────────────────────
  lodash      ███████████████████████░░░░░░░ 75.0% (3 files)
  es-toolkit  ████████░░░░░░░░░░░░░░░░░░░░░░ 25.0% (1 file)


🔍 Rules

┌────────────────────────┬────────────────────────────────────────────────────────────────────────────────────┐
│ Rule                   │ Description                                                                        │
├────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ no-packages            │ 🔴 moment is forbidden — Use date-fns or dayjs                                     │
├────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ require-packages       │ 🔴 typescript not installed — TypeScript is required                               │
├────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ require-files          │ 🔴 .nvmrc not found                                                                │
├────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ no-deprecated-packages │ 🔴 moment is deprecated — Moment is in maintenance mode — prefer date-fns or dayjs │
├────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ require-files          │ 🟡 .editorconfig not found                                                         │
└────────────────────────┴────────────────────────────────────────────────────────────────────────────────────┘

4 errors, 1 warning

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