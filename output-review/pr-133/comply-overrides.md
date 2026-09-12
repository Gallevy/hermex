---
layout: default
title: "comply-overrides — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-overrides`

_unchanged_

**Asserts** — Repo-scoped overrides re-scope severities: one rule downgraded to warn, one switched off and gone from the table.

**Ran** `hermex comply --config configs/overrides.config.ts` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/configs/overrides.config.ts`](https://github.com/Gallevy/hermex/blob/1de6195494f8836b4ec0c178615b297530836ec5/fixtures/configs/overrides.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/1de6195494f8836b4ec0c178615b297530836ec5/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/1de6195494f8836b4ec0c178615b297530836ec5/fixtures/README.md)) · **Case** [`comply-overrides`](https://github.com/Gallevy/hermex/blob/1de6195494f8836b4ec0c178615b297530836ec5/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/1de6195494f8836b4ec0c178615b297530836ec5/fixtures/cases/comply-overrides.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-overrides`</sub>

## Config

[`fixtures/configs/overrides.config.ts`](https://github.com/Gallevy/hermex/blob/1de6195494f8836b4ec0c178615b297530836ec5/fixtures/configs/overrides.config.ts) — resolved, as the loader sees it

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
  },
  "overrides": [
    {
      "match": [
        "hermex-fixtures"
      ],
      "rules": {
        "no-packages": {
          "severity": "warn",
          "patterns": [
            "moment"
          ],
          "message": "Use date-fns or dayjs (scheduled for removal)"
        },
        "require-files": {
          "severity": "off",
          "patterns": [
            ".editorconfig"
          ]
        }
      }
    }
  ]
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

┌──────────────────┬────────────────────────────────────────────────────────────────────────┐
│ Rule             │ Description                                                            │
├──────────────────┼────────────────────────────────────────────────────────────────────────┤
│ require-packages │ 🔴 typescript not installed — TypeScript is required                   │
├──────────────────┼────────────────────────────────────────────────────────────────────────┤
│ require-files    │ 🔴 .nvmrc not found                                                    │
├──────────────────┼────────────────────────────────────────────────────────────────────────┤
│ no-packages      │ 🟡 moment is forbidden — Use date-fns or dayjs (scheduled for removal) │
└──────────────────┴────────────────────────────────────────────────────────────────────────┘

2 errors, 1 warning

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
  2 mandatory violations found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}