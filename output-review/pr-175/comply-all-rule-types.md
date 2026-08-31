---
layout: default
title: "comply-all-rule-types — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-all-rule-types`

_unchanged_

**Asserts** — Every one of the nine rule types in one table, at three severities — the only case that renders require-engine-version, codeowners and both package-field shapes.

**Ran** `hermex comply` in `fixtures/repos/all-rule-types` → exit 1, as asserted

**Config** [`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/repos/all-rule-types/hermex.config.ts) · **Fixture** [`fixtures/repos/all-rule-types`](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/repos/all-rule-types) ([overview](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/repos/all-rule-types/README.md)) · **Case** [`comply-all-rule-types`](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/cases/comply-all-rule-types.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-all-rule-types`</sub>

## Config

[`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/repos/all-rule-types/hermex.config.ts) — resolved, as the loader sees it

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

## Full output

<details markdown="1"><summary><code>stdout.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 2 packages
✔ Found 3 files
✔ Analysis complete! Analyzed 3/3 files

🔍 Rules

┌────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────┐
│ Rule                   │ Description                                                                                   │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ no-packages            │ 🔴 moment is forbidden — Use date-fns or dayjs                                                │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-packages       │ 🔴 typescript not installed — TypeScript is required                                          │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ no-files               │ 🔴 jest.config.*, .babelrc detected (jest.config.js, .babelrc) — Use vitest + Vite            │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-files          │ 🔴 .nvmrc not found                                                                           │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-scripts        │ 🔴 script build, test missing in package.json — Required npm scripts                          │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-engine-version │ 🔴 engines.node is >=16, required >=20 — Minimum Node 20 required                             │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ package-fields         │ 🟡 field license missing in package.json                                                      │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ package-fields         │ 🟡 field publishConfig.registry is forbidden in package.json — Publish to the public registry │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-codeowners     │ 🔵 1 scanned file(s) have no owner: src/orphan.tsx — Every file needs a platform owner        │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-codeowners     │ 🔵 1 scanned file(s) have no owner: src/legacy.tsx — Every file needs a platform owner        │
└────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────┘

6 errors, 2 warnings, 2 info

🔴 Not compliant
  6 mandatory violations found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}