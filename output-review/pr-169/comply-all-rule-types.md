---
layout: default
title: "comply-all-rule-types — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-all-rule-types`

_changed_

**Asserts** — Every one of the ten rule types in one table, at three severities — the only case that renders require-engine-version, codeowners, require-repo-name-match and both package-field shapes.

**Ran** `hermex comply` in `fixtures/repos/all-rule-types` → exit 1, as asserted

**Config** [`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/9d2870727e95cde1b1e21c72833e7f3258e98429/fixtures/repos/all-rule-types/hermex.config.ts) · **Fixture** [`fixtures/repos/all-rule-types`](https://github.com/Gallevy/hermex/blob/9d2870727e95cde1b1e21c72833e7f3258e98429/fixtures/repos/all-rule-types) ([overview](https://github.com/Gallevy/hermex/blob/9d2870727e95cde1b1e21c72833e7f3258e98429/fixtures/repos/all-rule-types/README.md)) · **Case** [`comply-all-rule-types`](https://github.com/Gallevy/hermex/blob/9d2870727e95cde1b1e21c72833e7f3258e98429/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/9d2870727e95cde1b1e21c72833e7f3258e98429/fixtures/cases/comply-all-rule-types.md))

**Sandboxed** — runs against a copy of the fixture directory with `.git/config` created first, because git cannot track those paths

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-all-rule-types`</sub>

## Config

[`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/9d2870727e95cde1b1e21c72833e7f3258e98429/fixtures/repos/all-rule-types/hermex.config.ts) — resolved, as the loader sees it

```json
{
  "includes": [
    "src/**/*.{tsx,jsx,ts,js}"
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
    "require-files": [
      {
        "severity": "error",
        "patterns": [
          ".nvmrc"
        ]
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
          "license"
        ]
      }
    ],
    "no-package-fields": [
      {
        "severity": "warn",
        "patterns": [
          "publishConfig.registry"
        ],
        "message": "Publish to the public registry"
      }
    ],
    "require-engine-version": {
      "severity": "error",
      "range": ">=20",
      "message": "Minimum Node 20 required"
    },
    "require-codeowners": {
      "severity": "info",
      "requiredOwners": [
        "@org/platform"
      ],
      "message": "Every file needs a platform owner"
    },
    "require-repo-name-match": {
      "severity": "warn",
      "message": "Package name must match the repository"
    }
  },
  "output": {
    "packages": false,
    "components": false,
    "patterns": false,
    "versus": false
  }
}
```

## Diff against the target branch

<sub>Diffs are unified format: `-` is the target branch, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the target branch and 9 lines from line 12 of this run.</sub>

```diff
--- target/stdout.txt
+++ current/stdout.txt
@@ -0,0 +1,40 @@
+hermex v<version>
+- Parsing lockfile...
+✔ Found pnpm lockfile (supports: v5, v6, v9) - 2 packages
+✔ Found 3 files
+✔ Analysis complete! Analyzed 3/3 files
+
+🔍 Rules
+
+┌─────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
+│ Rule                    │ Description                                                                                                                │
+├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
+│ no-packages             │ 🔴 moment is forbidden — Use date-fns or dayjs                                                                             │
+├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
+│ require-packages        │ 🔴 typescript not installed — TypeScript is required                                                                       │
+├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
+│ no-files                │ 🔴 jest.config.*, .babelrc detected (jest.config.js, .babelrc) — Use vitest + Vite                                         │
+├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
+│ require-files           │ 🔴 .nvmrc not found                                                                                                        │
+├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
+│ require-scripts         │ 🔴 script build, test missing in package.json — Required npm scripts                                                       │
+├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
+│ require-engine-version  │ 🔴 engines.node is >=16, required >=20 — Minimum Node 20 required                                                          │
+├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
+│ package-fields          │ 🟡 field license missing in package.json                                                                                   │
+├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
+│ package-fields          │ 🟡 field publishConfig.registry is forbidden in package.json — Publish to the public registry                              │
+├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
+│ require-repo-name-match │ 🟡 package.json name is hermex-fixture-all-rule-types, repository is checkout-web — Package name must match the repository │
+├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
+│ require-codeowners      │ 🔵 1 scanned file(s) have no owner: src/orphan.tsx — Every file needs a platform owner                                     │
+├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
+│ require-codeowners      │ 🔵 1 scanned file(s) have no owner: src/legacy.tsx — Every file needs a platform owner                                     │
+└─────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
+
+6 errors, 3 warnings, 2 info
+
+🔴 Not compliant
+  6 mandatory violations found
+
+

--- target/stderr.txt
+++ current/stderr.txt
@@ -1,22 +0,0 @@
-file://<repo>/.output-review/reference/a36ae3d0fb5d7664d092c045ab56751d6799a942/dist/cli.mjs:824
-		return HermexConfigSchema.parse(mod.default);
-		                          ^
-
-ZodError: [
-  {
-    "code": "unrecognized_keys",
-    "keys": [
-      "require-repo-name-match"
-    ],
-    "path": [
-      "rules"
-    ],
-    "message": "Unrecognized key: /"require-repo-name-match/""
-  }
-]
-    at loadConfig (file://<repo>/.output-review/reference/a36ae3d0fb5d7664d092c045ab56751d6799a942/dist/cli.mjs:824:29)
-    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
-    at async Command.<anonymous> (file://<repo>/.output-review/reference/a36ae3d0fb5d7664d092c045ab56751d6799a942/dist/cli.mjs:2495:23)
-
-Node.js v26.8.1
-
```

## Full output

<details markdown="1"><summary><code>stdout.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 2 packages
✔ Found 3 files
✔ Analysis complete! Analyzed 3/3 files

🔍 Rules

┌─────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Rule                    │ Description                                                                                                                │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ no-packages             │ 🔴 moment is forbidden — Use date-fns or dayjs                                                                             │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-packages        │ 🔴 typescript not installed — TypeScript is required                                                                       │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ no-files                │ 🔴 jest.config.*, .babelrc detected (jest.config.js, .babelrc) — Use vitest + Vite                                         │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-files           │ 🔴 .nvmrc not found                                                                                                        │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-scripts         │ 🔴 script build, test missing in package.json — Required npm scripts                                                       │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-engine-version  │ 🔴 engines.node is >=16, required >=20 — Minimum Node 20 required                                                          │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ package-fields          │ 🟡 field license missing in package.json                                                                                   │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ package-fields          │ 🟡 field publishConfig.registry is forbidden in package.json — Publish to the public registry                              │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-repo-name-match │ 🟡 package.json name is hermex-fixture-all-rule-types, repository is checkout-web — Package name must match the repository │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-codeowners      │ 🔵 1 scanned file(s) have no owner: src/orphan.tsx — Every file needs a platform owner                                     │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-codeowners      │ 🔵 1 scanned file(s) have no owner: src/legacy.tsx — Every file needs a platform owner                                     │
└─────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

6 errors, 3 warnings, 2 info

🔴 Not compliant
  6 mandatory violations found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}