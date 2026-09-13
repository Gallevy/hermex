---
layout: default
title: "comply-summary-file — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-summary-file`

_unchanged_

**Asserts** — The markdown a consumer pastes into a PR comment or job summary — ANSI-free, rules + flagged packages + verdict.

**Ran** `hermex comply --summary-file $OUT/summary.md` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/8bbb88a1c70535a49b55b5e0f6b6d9fd9fa9fdc6/fixtures/hermex.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/8bbb88a1c70535a49b55b5e0f6b6d9fd9fa9fdc6/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/8bbb88a1c70535a49b55b5e0f6b6d9fd9fa9fdc6/fixtures/README.md)) · **Case** [`comply-summary-file`](https://github.com/Gallevy/hermex/blob/8bbb88a1c70535a49b55b5e0f6b6d9fd9fa9fdc6/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/8bbb88a1c70535a49b55b5e0f6b6d9fd9fa9fdc6/fixtures/cases/comply-summary-file.md))

**Writes** `summary.md` into `$OUT` — captured and diffed the same as stdout

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-summary-file`</sub>

## Config

[`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/8bbb88a1c70535a49b55b5e0f6b6d9fd9fa9fdc6/fixtures/hermex.config.ts) — resolved, as the loader sees it

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
  @design-system/foundation  ██████████████████████████████ 100.0% (8 files, 33 renders)
  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (not found in this repo)

  Utility Library Migration
  ──────────────────────────────────────────────────
  lodash      ███████████████████████░░░░░░░ 75.0% (3 files)
  es-toolkit  ████████░░░░░░░░░░░░░░░░░░░░░░ 25.0% (1 file)


🔴 Not compliant
  3 mandatory violations found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

<details markdown="1"><summary><code>summary.md</code></summary>

```markdown
# Hermex Compliance Report

### Rules

| | Rule | Description |
|---|---|---|
| 🔴 | no-packages | moment is forbidden — Use date-fns or dayjs |
| 🔴 | require-packages | typescript not installed — TypeScript is required |
| 🔴 | require-files | .nvmrc not found |
| 🟡 | require-files | .editorconfig not found |

3 errors, 1 warning

### 🔴 Not compliant

3 mandatory violations found
```

</details>

{% endraw %}