---
layout: default
title: "comply-exit-2 — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-exit-2`

_unchanged_

**Asserts** — A pipeline failure (nothing matched `includes`) exits 2, not 1 — a consumer must be able to tell "could not run" from "not compliant".

**Ran** `hermex comply --config configs/no-files.config.ts` in `fixtures/` → exit 2, as asserted

**Config** [`fixtures/configs/no-files.config.ts`](https://github.com/Gallevy/hermex/blob/8caf9cb2bebf5f80e69e5eaeb1e269930b8e5e18/fixtures/configs/no-files.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/8caf9cb2bebf5f80e69e5eaeb1e269930b8e5e18/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/8caf9cb2bebf5f80e69e5eaeb1e269930b8e5e18/fixtures/README.md)) · **Case** [`comply-exit-2`](https://github.com/Gallevy/hermex/blob/8caf9cb2bebf5f80e69e5eaeb1e269930b8e5e18/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/8caf9cb2bebf5f80e69e5eaeb1e269930b8e5e18/fixtures/cases/comply-exit-2.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-exit-2`</sub>

## Config

[`fixtures/configs/no-files.config.ts`](https://github.com/Gallevy/hermex/blob/8caf9cb2bebf5f80e69e5eaeb1e269930b8e5e18/fixtures/configs/no-files.config.ts) — resolved, as the loader sees it

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
  "includes": [
    "no-such-directory/**/*.{tsx,jsx,ts,js}"
  ]
}
```

## Full output

<details markdown="1"><summary><code>stdout.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 5 packages
✖ No files found matching includes: no-such-directory/**/*.{tsx,jsx,ts,js}
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}