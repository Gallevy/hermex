---
layout: default
title: "comply-release-age — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-release-age`

_unchanged_

**Asserts** — The flagged-packages table, against a recorded registry: an overdue package with no in-window target (#26), one with a real target, and one merely coming due. `rules['release-age']` names two of them at severity error, so the same three packages split across both severity tiers via the implicit `['**']` baseline for everything else — pair it with comply-release-age-unscoped, where the identical repo is checked with nothing enforced.

**Ran** `hermex comply --config configs/release-age.config.ts` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/configs/release-age.config.ts`](https://github.com/Gallevy/hermex/blob/6c3640fbb646ed849900d2a893986034a84f2ca0/fixtures/configs/release-age.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/6c3640fbb646ed849900d2a893986034a84f2ca0/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/6c3640fbb646ed849900d2a893986034a84f2ca0/fixtures/README.md)) · **Case** [`comply-release-age`](https://github.com/Gallevy/hermex/blob/6c3640fbb646ed849900d2a893986034a84f2ca0/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/6c3640fbb646ed849900d2a893986034a84f2ca0/fixtures/cases/comply-release-age.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-release-age`</sub>

## Config

[`fixtures/configs/release-age.config.ts`](https://github.com/Gallevy/hermex/blob/6c3640fbb646ed849900d2a893986034a84f2ca0/fixtures/configs/release-age.config.ts) — resolved, as the loader sees it

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
    "release-age": [
      {
        "severity": "error",
        "patterns": [
          "moment",
          "react-dom"
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

✔ Release age fetched (3 packages skipped — registry unreachable or not found)

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

📦 Packages

┌──────────────────────────────┬───────────┬───────────────────────────────────────────────────┐
│ Package                      │ Installed │ Target                                            │
├──────────────────────────────┼───────────┼───────────────────────────────────────────────────┤
│ @design-system/foundation    │ 2.5.3     │                                                   │
├──────────────────────────────┼───────────┼───────────────────────────────────────────────────┤
│ react                        │ 18.3.1    │ 🟡 major 19.1.0 (340 days overdue) [not enforced] │
├──────────────────────────────┼───────────┼───────────────────────────────────────────────────┤
│ react-dom                    │ 18.3.1    │ 🔵 patch 18.3.2 (20 days remaining)               │
├──────────────────────────────┼───────────┼───────────────────────────────────────────────────┤
│ lodash                       │ 4.17.21   │                                                   │
├──────────────────────────────┼───────────┼───────────────────────────────────────────────────┤
│ es-toolkit                   │ 1.39.10   │                                                   │
├──────────────────────────────┼───────────┼───────────────────────────────────────────────────┤
│ eslint                       │ N/A       │                                                   │
├──────────────────────────────┼───────────┼───────────────────────────────────────────────────┤
│ [DEPRECATED] [BANNED] moment │ 2.29.4    │ 🔴 minor 2.30.1 (no compliant release available)  │
└──────────────────────────────┴───────────┴───────────────────────────────────────────────────┘

1 error, 1 warning

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
  4 mandatory violations found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}