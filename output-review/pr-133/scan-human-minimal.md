---
layout: default
title: "scan-human-minimal — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `scan-human-minimal`

_unchanged_

**Asserts** — Section toggles actually suppress output — every section off except the summary (#63).

**Ran** `hermex scan --config configs/minimal.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/minimal.config.ts`](https://github.com/Gallevy/hermex/blob/8d6fbb64fb79dac5a3a70043f27c911174885231/fixtures/configs/minimal.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/8d6fbb64fb79dac5a3a70043f27c911174885231/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/8d6fbb64fb79dac5a3a70043f27c911174885231/fixtures/README.md)) · **Case** [`scan-human-minimal`](https://github.com/Gallevy/hermex/blob/8d6fbb64fb79dac5a3a70043f27c911174885231/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/8d6fbb64fb79dac5a3a70043f27c911174885231/fixtures/cases/scan-human-minimal.md))

**Must not appear anywhere in stdout** `📦 Packages`, `⚛️ Components`, `🔍 Rules`, `⚖️ Versus`

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-human-minimal`</sub>

## Config

[`fixtures/configs/minimal.config.ts`](https://github.com/Gallevy/hermex/blob/8d6fbb64fb79dac5a3a70043f27c911174885231/fixtures/configs/minimal.config.ts) — resolved, as the loader sees it

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
  }
}
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


📊 Summary

┌─────────────────────┬───────┐
│ Metric              │ Count │
├─────────────────────┼───────┤
│ Files Analyzed      │ 17    │
├─────────────────────┼───────┤
│ Packages            │ 5     │
├─────────────────────┼───────┤
│ External Components │ 19    │
├─────────────────────┼───────┤
│ Total Usages        │ 36    │
└─────────────────────┴───────┘
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}