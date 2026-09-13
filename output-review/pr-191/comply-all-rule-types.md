---
layout: default
title: "comply-all-rule-types — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-all-rule-types`

_unchanged_

**Asserts** — Every one of the twelve rule types in one run, at three severities — the only case that renders max-file-size, require-engine-version, codeowners, both package-field shapes, release-age and no-deprecated-packages together. release-age itself never gets a Rules-table row (its display is the Packages table) — that split is what this case pins, along with the only multi-badge Status cell in the fixtures (moment is both forbidden and deprecated).

**Ran** `hermex comply` in `fixtures/repos/all-rule-types` → exit 1, as asserted

**Config** [`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/201b37e5bed1664b66c5517dff147ca6077138f9/fixtures/repos/all-rule-types/hermex.config.ts) · **Fixture** [`fixtures/repos/all-rule-types`](https://github.com/Gallevy/hermex/blob/201b37e5bed1664b66c5517dff147ca6077138f9/fixtures/repos/all-rule-types) ([overview](https://github.com/Gallevy/hermex/blob/201b37e5bed1664b66c5517dff147ca6077138f9/fixtures/repos/all-rule-types/README.md)) · **Case** [`comply-all-rule-types`](https://github.com/Gallevy/hermex/blob/201b37e5bed1664b66c5517dff147ca6077138f9/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/201b37e5bed1664b66c5517dff147ca6077138f9/fixtures/cases/comply-all-rule-types.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-all-rule-types`</sub>

## Config

[`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/201b37e5bed1664b66c5517dff147ca6077138f9/fixtures/repos/all-rule-types/hermex.config.ts) — resolved, as the loader sees it

```json
{
  "includes": [
    "src/**/*.{tsx,jsx,ts,js}"
  ],
  "releaseAge": {
    "cacheDisabled": true
  },
  "rules": {
    "no-outdated-packages": [
      {
        "severity": "error",
        "patterns": [
          "react"
        ]
      }
    ],
    "no-deprecated-packages": [
      {
        "severity": "warn",
        "patterns": [
          "moment"
        ]
      }
    ],
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
    "max-file-size": [
      {
        "severity": "warn",
        "patterns": [
          "assets/**/*.svg"
        ],
        "maxSize": "1kb",
        "message": "Compress it or serve it from the CDN"
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
✔ Release age fetched

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
│ max-file-size          │ 🟡 assets/**/*.svg over 1 KB (logo.svg at 1.4 KB) — Compress it or serve it from the CDN      │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ package-fields         │ 🟡 field license missing in package.json                                                      │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ package-fields         │ 🟡 field publishConfig.registry is forbidden in package.json — Publish to the public registry │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ no-deprecated-packages │ 🟡 moment is deprecated — Moment is in maintenance mode — prefer date-fns or dayjs            │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-codeowners     │ 🔵 1 scanned file(s) have no owner: src/orphan.tsx — Every file needs a platform owner        │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-codeowners     │ 🔵 1 scanned file(s) have the wrong owner: src/legacy.tsx — Every file needs a platform owner │
└────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────┘

6 errors, 4 warnings, 2 info

📦 Packages

┌─────────┬───────────┬─────────────────────────────────────┬────────────────────────────┐
│ Package │ Installed │ Minimum target                      │ Flags                      │
├─────────┼───────────┼─────────────────────────────────────┼────────────────────────────┤
│ react   │ 18.3.1    │ 🔴 19.1.0 (major, 340 days overdue) │                            │
├─────────┼───────────┼─────────────────────────────────────┼────────────────────────────┤
│ moment  │ 2.29.4    │ 🟡 2.30.1 (minor, 455 days overdue) │ 🔴 forbidden 🟡 deprecated │
└─────────┴───────────┴─────────────────────────────────────┴────────────────────────────┘

Notes:
  🔵 moment → deprecated: Moment is in maintenance mode — prefer date-fns or dayjs

1 error, 1 warning

🔴 Not compliant
  8 mandatory violations found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}