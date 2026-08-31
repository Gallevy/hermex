---
layout: default
title: "comply-human-fail — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-human-fail`

_unchanged_

**Asserts** — The rules table on a failing repo: row ordering, severity badges, the error/warning tally, and exit 1.

**Ran** `hermex comply` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/4a6fac7928d27fb34fc4ec6cf8baae7ca6fc057b/fixtures/hermex.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/4a6fac7928d27fb34fc4ec6cf8baae7ca6fc057b/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/4a6fac7928d27fb34fc4ec6cf8baae7ca6fc057b/fixtures/README.md)) · **Case** [`comply-human-fail`](https://github.com/Gallevy/hermex/blob/4a6fac7928d27fb34fc4ec6cf8baae7ca6fc057b/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/4a6fac7928d27fb34fc4ec6cf8baae7ca6fc057b/fixtures/cases/comply-human-fail.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-human-fail`</sub>

## Config

[`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/4a6fac7928d27fb34fc4ec6cf8baae7ca6fc057b/fixtures/hermex.config.ts) — resolved, as the loader sees it

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
    "details": false,
    "patterns": false
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

⚖️ Versus

  Design System Migration
  ──────────────────────────────────────────────────
  @design-system/foundation  ██████████████████████████████ 100.0% (33 usages)
  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (0 usages)


🔴 Not compliant
  3 mandatory violations found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}