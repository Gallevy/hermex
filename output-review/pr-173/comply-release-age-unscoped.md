---
layout: default
title: "comply-release-age-unscoped — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-release-age-unscoped`

_changed_

**Asserts** — An empty enforceOn names no mandatory packages and so enforces none, rather than enforcing everything: every installed package is still fetched and reported, every release-age row is advisory, and the exit code comes from rule violations alone. Includes moment — declared, installed, never imported — which release age never even looked up before #171. The only case covering the empty-enforceOn path, which is the one path where #171 can move a verdict.

**Ran** `hermex comply --config configs/release-age-unscoped.config.ts` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/configs/release-age-unscoped.config.ts`](https://github.com/Gallevy/hermex/blob/8caf9cb2bebf5f80e69e5eaeb1e269930b8e5e18/fixtures/configs/release-age-unscoped.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/8caf9cb2bebf5f80e69e5eaeb1e269930b8e5e18/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/8caf9cb2bebf5f80e69e5eaeb1e269930b8e5e18/fixtures/README.md)) · **Case** [`comply-release-age-unscoped`](https://github.com/Gallevy/hermex/blob/8caf9cb2bebf5f80e69e5eaeb1e269930b8e5e18/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/8caf9cb2bebf5f80e69e5eaeb1e269930b8e5e18/fixtures/cases/comply-release-age-unscoped.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-release-age-unscoped`</sub>

## Config

[`fixtures/configs/release-age-unscoped.config.ts`](https://github.com/Gallevy/hermex/blob/8caf9cb2bebf5f80e69e5eaeb1e269930b8e5e18/fixtures/configs/release-age-unscoped.config.ts) — resolved, as the loader sees it

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
  },
  "releaseAge": {
    "enabled": true,
    "registry": "<fixture registry>",
    "cacheDisabled": true,
    "thresholds": {
      "patch": 30,
      "minor": 45,
      "major": 60
    },
    "enforceOn": []
  }
}
```

## Diff against the target branch

<sub>Diffs are unified format: `-` is the target branch, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the target branch and 9 lines from line 12 of this run.</sub>

```diff
--- target/stdout.txt
+++ current/stdout.txt
@@ -36,19 +36,19 @@
 
 📦 Packages
 
-┌───────────────────────────┬───────────┬────────────────────────────────────┐
-│ Package                   │ Installed │ Target                             │
-├───────────────────────────┼───────────┼────────────────────────────────────┤
-│ @design-system/foundation │ 2.5.3     │                                    │
-├───────────────────────────┼───────────┼────────────────────────────────────┤
-│ react                     │ 18.3.1    │ 🔴 major 19.1.0 (340 days overdue) │
-├───────────────────────────┼───────────┼────────────────────────────────────┤
-│ eslint                    │ N/A       │                                    │
-├───────────────────────────┼───────────┼────────────────────────────────────┤
-│ [BANNED] moment           │ 2.29.4    │                                    │
-├───────────────────────────┼───────────┼────────────────────────────────────┤
-│ react-dom                 │ 18.3.1    │                                    │
-└───────────────────────────┴───────────┴────────────────────────────────────┘
+┌──────────────────────────────┬───────────┬─────────────────────────────────────────────────────────────────┐
+│ Package                      │ Installed │ Target                                                          │
+├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
+│ @design-system/foundation    │ 2.5.3     │                                                                 │
+├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
+│ react                        │ 18.3.1    │ 🟡 major 19.1.0 (340 days overdue) [not enforced]               │
+├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
+│ eslint                       │ N/A       │                                                                 │
+├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
+│ [DEPRECATED] [BANNED] moment │ 2.29.4    │ 🟡 minor 2.30.1 (no compliant release available) [not enforced] │
+├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
+│ react-dom                    │ 18.3.1    │ 🔵 patch 18.3.2 (20 days remaining)                             │
+└──────────────────────────────┴───────────┴─────────────────────────────────────────────────────────────────┘
 
 Total: 5 packages
 
@@ -61,6 +61,6 @@
 
 
 🔴 Not compliant
-  4 mandatory violations found
+  3 mandatory violations found
 
 
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

┌──────────────────────────────┬───────────┬─────────────────────────────────────────────────────────────────┐
│ Package                      │ Installed │ Target                                                          │
├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ @design-system/foundation    │ 2.5.3     │                                                                 │
├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ react                        │ 18.3.1    │ 🟡 major 19.1.0 (340 days overdue) [not enforced]               │
├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ eslint                       │ N/A       │                                                                 │
├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ [DEPRECATED] [BANNED] moment │ 2.29.4    │ 🟡 minor 2.30.1 (no compliant release available) [not enforced] │
├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ react-dom                    │ 18.3.1    │ 🔵 patch 18.3.2 (20 days remaining)                             │
└──────────────────────────────┴───────────┴─────────────────────────────────────────────────────────────────┘

Total: 5 packages

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