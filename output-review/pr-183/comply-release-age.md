---
layout: default
title: "comply-release-age — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-release-age`

_changed_

**Asserts** — The flagged-packages table, against a recorded registry: an overdue package with no in-window target (#26), one with a real target, and one merely coming due. `rules['release-age']` names two of them at severity error, so the same three packages split across both severity tiers via the implicit `['**']` baseline for everything else — pair it with comply-release-age-unscoped, where the identical repo is checked with nothing enforced.

**Ran** `hermex comply --config configs/release-age.config.ts` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/configs/release-age.config.ts`](https://github.com/Gallevy/hermex/blob/75d369edb73abc463673e8a23dc17572bcf44370/fixtures/configs/release-age.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/75d369edb73abc463673e8a23dc17572bcf44370/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/75d369edb73abc463673e8a23dc17572bcf44370/fixtures/README.md)) · **Case** [`comply-release-age`](https://github.com/Gallevy/hermex/blob/75d369edb73abc463673e8a23dc17572bcf44370/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/75d369edb73abc463673e8a23dc17572bcf44370/fixtures/cases/comply-release-age.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-release-age`</sub>

## Config

[`fixtures/configs/release-age.config.ts`](https://github.com/Gallevy/hermex/blob/75d369edb73abc463673e8a23dc17572bcf44370/fixtures/configs/release-age.config.ts) — resolved, as the loader sees it

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

## Diff against the target branch

<sub>Diffs are unified format: `-` is the target branch, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the target branch and 9 lines from line 12 of this run.</sub>

```diff
--- target/stdout.txt
+++ current/stdout.txt
@@ -50,7 +50,7 @@
 │ react-dom                    │ 18.3.1    │ 🔵 patch 18.3.2 (20 days remaining)               │
 └──────────────────────────────┴───────────┴───────────────────────────────────────────────────┘
 
-Total: 5 packages
+1 error, 1 warning
 
 ⚖️ Versus
 
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

✔ Release age fetched (1 packages skipped — registry unreachable or not found)

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
│ eslint                       │ N/A       │                                                   │
├──────────────────────────────┼───────────┼───────────────────────────────────────────────────┤
│ [DEPRECATED] [BANNED] moment │ 2.29.4    │ 🔴 minor 2.30.1 (no compliant release available)  │
├──────────────────────────────┼───────────┼───────────────────────────────────────────────────┤
│ react-dom                    │ 18.3.1    │ 🔵 patch 18.3.2 (20 days remaining)               │
└──────────────────────────────┴───────────┴───────────────────────────────────────────────────┘

1 error, 1 warning

⚖️ Versus

  Design System Migration
  ──────────────────────────────────────────────────
  @design-system/foundation  ██████████████████████████████ 100.0% (33 usages)
  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (0 usages)


🔴 Not compliant
  4 mandatory violations found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}