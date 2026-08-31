---
layout: default
title: "parse-errors — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `parse-errors`

_unchanged_

**Asserts** — The parse-error report, scoped to a repo of nothing but an unparseable file so the block is not buried (#13).

**Ran** `hermex scan --config configs/parse-errors.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/parse-errors.config.ts`](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/configs/parse-errors.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/README.md)) · **Case** [`parse-errors`](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/cases/parse-errors.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter parse-errors`</sub>

## Config

[`fixtures/configs/parse-errors.config.ts`](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/configs/parse-errors.config.ts) — resolved, as the loader sees it

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
    "packages": false,
    "components": false,
    "patterns": false,
    "details": false,
    "versus": false,
    "rules": false
  },
  "includes": [
    "broken/**/*.{tsx,jsx,ts,js}"
  ]
}
```

## Full output

<details markdown="1"><summary><code>stdout.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 5 packages
✔ Found 1 files
✔ Analysis complete! Analyzed 0/1 files

⚠ 1 file(s) failed to parse:
  broken/unparseable.tsx
      x Expression expected
   ,----
 1 | export const Broken = ( : : :;
   :                         ^
   `----


Caused by:
    Syntax Error


📊 Summary

┌─────────────────────┬───────┐
│ Metric              │ Count │
├─────────────────────┼───────┤
│ Files Analyzed      │ 0     │
├─────────────────────┼───────┤
│ Packages            │ 5     │
├─────────────────────┼───────┤
│ External Components │ 0     │
├─────────────────────┼───────┤
│ Total Usages        │ 0     │
└─────────────────────┴───────┘
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}