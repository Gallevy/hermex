---
layout: default
title: "scan-json-toggles — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `scan-json-toggles`

_unchanged_

**Asserts** — What output.* toggles do to --format json: today, nothing (#91). The payload below is emitted with every section switched off, yet still carries packages, components, versus and ruleViolations in full. Pair it with scan-human-minimal to see the two formats diverge; when #91 lands, this baseline shrinking is the proof.

**Ran** `hermex scan --format json --config configs/minimal.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/minimal.config.ts`](https://github.com/Gallevy/hermex/blob/034b5ecbfd187d9ffc4d99aaebe2b48ce4384efe/fixtures/configs/minimal.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/034b5ecbfd187d9ffc4d99aaebe2b48ce4384efe/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/034b5ecbfd187d9ffc4d99aaebe2b48ce4384efe/fixtures/README.md)) · **Case** [`scan-json-toggles`](https://github.com/Gallevy/hermex/blob/034b5ecbfd187d9ffc4d99aaebe2b48ce4384efe/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/034b5ecbfd187d9ffc4d99aaebe2b48ce4384efe/fixtures/cases/scan-json-toggles.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-json-toggles`</sub>

## Config

[`fixtures/configs/minimal.config.ts`](https://github.com/Gallevy/hermex/blob/034b5ecbfd187d9ffc4d99aaebe2b48ce4384efe/fixtures/configs/minimal.config.ts) — resolved, as the loader sees it

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

<details markdown="1"><summary><code>stdout.json</code></summary>

```json
{
  "version": "<version>",
  "summary": {
    "filesAnalyzed": 21,
    "totalImports": 86,
    "totalComponents": 35,
    "totalUsagePatterns": 291
  },
  "ruleViolations": [
    {
      "ruleId": "no-packages",
      "severity": "error",
      "patterns": [
        "moment"
      ],
      "message": "Use date-fns or dayjs",
      "packageName": "moment"
    },
    {
      "ruleId": "require-packages",
      "severity": "error",
      "patterns": [
        "typescript"
      ],
      "message": "TypeScript is required"
    },
    {
      "ruleId": "require-files",
      "severity": "error",
      "patterns": [
        ".nvmrc"
      ]
    },
    {
      "ruleId": "require-files",
      "severity": "warn",
      "patterns": [
        ".editorconfig"
      ]
    }
  ],
  "compliance": {
    "status": "non-compliant",
    "compliant": false,
    "counts": {
      "errorRuleViolations": 3,
      "warningRuleViolations": 1
    }
  }
}
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

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
```

</details>

{% endraw %}