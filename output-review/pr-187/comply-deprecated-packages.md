---
layout: default
title: "comply-deprecated-packages — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-deprecated-packages`

_no baseline_

**Asserts** — Deprecation detection with release-age switched off entirely — the #107 case. Before, deprecation was a by-product of release-age enrichment, so this configuration found nothing at all and this run would have been silently compliant on that axis. Now the registry is consulted for deprecation alone: a no-deprecated-packages row appears in the Rules table carrying npm own notice, and at severity error it fails comply on its own. The only case where the registry is reached without release-age, which is exactly the path that did not exist before.

**Ran** `hermex comply --config configs/deprecated-packages.config.ts` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/configs/deprecated-packages.config.ts`](https://github.com/Gallevy/hermex/blob/4d21502903ba13325b043c5f89b8870609586269/fixtures/configs/deprecated-packages.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/4d21502903ba13325b043c5f89b8870609586269/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/4d21502903ba13325b043c5f89b8870609586269/fixtures/README.md)) · **Case** [`comply-deprecated-packages`](https://github.com/Gallevy/hermex/blob/4d21502903ba13325b043c5f89b8870609586269/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/4d21502903ba13325b043c5f89b8870609586269/fixtures/cases/comply-deprecated-packages.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-deprecated-packages`</sub>

## Config

[`fixtures/configs/deprecated-packages.config.ts`](https://github.com/Gallevy/hermex/blob/4d21502903ba13325b043c5f89b8870609586269/fixtures/configs/deprecated-packages.config.ts) — resolved, as the loader sees it

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

## No baseline

The target branch's build ran this case and printed nothing to stdout (it exited 1). There is no baseline, so the diff below has no left-hand side: every added line is the whole output appearing, not changing, and the removed lines are the reference's own error output going away.

This is what a config key the target branch's schema does not recognise looks like, and it resolves itself the moment this merges. What it is not is an output change anyone can read from the diff.

The reference build's stderr:

```text
file://<repo>/.output-review/reference/<sha>/dist/cli.mjs:1180
	if (explicitPath && !existsSync(configPath)) throw new Error(`Config file not found: ${configPath}`);
	                                                   ^

Error: Config file not found: <repo>/.output-review/reference/<sha>/fixtures/configs/deprecated-packages.config.ts
    at loadConfig (file://<repo>/.output-review/reference/<sha>/dist/cli.mjs:1180:53)
    at Command.<anonymous> (file://<repo>/.output-review/reference/<sha>/dist/cli.mjs:3162:29)
    at Command.listener [as _actionHandler] (file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:569:17)
    at file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:1616:14
    at Command._chainOrCall (file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:1500:12)
    at Command._parseCommand (file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:1615:27)
    at file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:1379:27
    at Command._chainOrCall (file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:1500:12)
    at Command._dispatchSubcommand (file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:1375:25)
    at Command._parseCommand (file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:1571:19)

Node.js v26.8.2
```

## Diff against the target branch

<sub>Diffs are unified format: `-` is the target branch, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the target branch and 9 lines from line 12 of this run.</sub>

```diff
--- target/stdout.txt
+++ current/stdout.txt
@@ -0,0 +1,55 @@
+hermex v<version>
+- Parsing lockfile...
+✔ Found pnpm lockfile (supports: v5, v6, v9) - 7 packages
+✔ Found 22 files
+✔ Analysis complete! Analyzed 21/22 files
+
+⚠ 1 file(s) failed to parse:
+  broken/unparseable.tsx
+      x Expression expected
+   ,----
+ 1 | export const Broken = ( : : :;
+   :                         ^
+   `----
+
+
+Caused by:
+    Syntax Error
+
+✔ Registry checked (3 packages skipped — registry unreachable or not found)
+
+🔍 Rules
+
+┌────────────────────────┬────────────────────────────────────────────────────────────────────────────────────┐
+│ Rule                   │ Description                                                                        │
+├────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
+│ no-packages            │ 🔴 moment is forbidden — Use date-fns or dayjs                                     │
+├────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
+│ require-packages       │ 🔴 typescript not installed — TypeScript is required                               │
+├────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
+│ require-files          │ 🔴 .nvmrc not found                                                                │
+├────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
+│ no-deprecated-packages │ 🔴 moment is deprecated — Moment is in maintenance mode — prefer date-fns or dayjs │
+├────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
+│ require-files          │ 🟡 .editorconfig not found                                                         │
+└────────────────────────┴────────────────────────────────────────────────────────────────────────────────────┘
+
+4 errors, 1 warning
+
+⚖️ Versus
+
+  Design System Migration
+  ──────────────────────────────────────────────────
+  @design-system/foundation  ██████████████████████████████ 100.0% (8 files, 33 renders)
+  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (not found in this repo)
+
+  Utility Library Migration
+  ──────────────────────────────────────────────────
+  lodash      ███████████████████████░░░░░░░ 75.0% (3 files)
+  es-toolkit  ████████░░░░░░░░░░░░░░░░░░░░░░ 25.0% (1 file)
+
+
+🔴 Not compliant
+  4 mandatory violations found
+
+

--- target/stderr.txt
+++ current/stderr.txt
@@ -1,18 +0,0 @@
-file://<repo>/.output-review/reference/<sha>/dist/cli.mjs:1180
-	if (explicitPath && !existsSync(configPath)) throw new Error(`Config file not found: ${configPath}`);
-	                                                   ^
-
-Error: Config file not found: <repo>/.output-review/reference/<sha>/fixtures/configs/deprecated-packages.config.ts
-    at loadConfig (file://<repo>/.output-review/reference/<sha>/dist/cli.mjs:1180:53)
-    at Command.<anonymous> (file://<repo>/.output-review/reference/<sha>/dist/cli.mjs:3162:29)
-    at Command.listener [as _actionHandler] (file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:569:17)
-    at file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:1616:14
-    at Command._chainOrCall (file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:1500:12)
-    at Command._parseCommand (file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:1615:27)
-    at file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:1379:27
-    at Command._chainOrCall (file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:1500:12)
-    at Command._dispatchSubcommand (file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:1375:25)
-    at Command._parseCommand (file://<repo>/.output-review/reference/<sha>/node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js:1571:19)
-
-Node.js v26.8.2
-
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