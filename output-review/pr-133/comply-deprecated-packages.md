---
layout: default
title: "comply-deprecated-packages — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-deprecated-packages`

_unchanged_

**Asserts** — Deprecation detection with release-age switched off entirely — the #107 case. Before, deprecation was a by-product of release-age enrichment, so this configuration found nothing at all and this run would have been silently compliant on that axis. Now the registry is consulted for deprecation alone: a no-deprecated-packages row appears in the Rules table carrying npm own notice, and at severity error it fails comply on its own. The only case where the registry is reached without release-age, which is exactly the path that did not exist before.

**Ran** `hermex comply --config configs/deprecated-packages.config.ts` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/configs/deprecated-packages.config.ts`](https://github.com/Gallevy/hermex/blob/01f79d1aa84312d05b74bb7c3b0a1c8ac2fb499a/fixtures/configs/deprecated-packages.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/01f79d1aa84312d05b74bb7c3b0a1c8ac2fb499a/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/01f79d1aa84312d05b74bb7c3b0a1c8ac2fb499a/fixtures/README.md)) · **Case** [`comply-deprecated-packages`](https://github.com/Gallevy/hermex/blob/01f79d1aa84312d05b74bb7c3b0a1c8ac2fb499a/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/01f79d1aa84312d05b74bb7c3b0a1c8ac2fb499a/fixtures/cases/comply-deprecated-packages.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-deprecated-packages`</sub>

## Config

[`fixtures/configs/deprecated-packages.config.ts`](https://github.com/Gallevy/hermex/blob/01f79d1aa84312d05b74bb7c3b0a1c8ac2fb499a/fixtures/configs/deprecated-packages.config.ts) — resolved, as the loader sees it

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