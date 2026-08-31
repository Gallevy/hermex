---
layout: default
title: "scan-no-files — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `scan-no-files`

_unchanged_

**Asserts** — The same pipeline failure under `scan` reports the problem and exits 0 — the deliberate asymmetry with comply-exit-2, kept visible so it cannot drift unnoticed.

**Ran** `hermex scan --config configs/no-files.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/no-files.config.ts`](https://github.com/Gallevy/hermex/blob/396bac3f00fae3f409c495bc3f4df42edcf8715b/fixtures/configs/no-files.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/396bac3f00fae3f409c495bc3f4df42edcf8715b/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/396bac3f00fae3f409c495bc3f4df42edcf8715b/fixtures/README.md)) · **Case** [`scan-no-files`](https://github.com/Gallevy/hermex/blob/396bac3f00fae3f409c495bc3f4df42edcf8715b/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/396bac3f00fae3f409c495bc3f4df42edcf8715b/fixtures/cases/scan-no-files.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-no-files`</sub>

## Config

[`fixtures/configs/no-files.config.ts`](https://github.com/Gallevy/hermex/blob/396bac3f00fae3f409c495bc3f4df42edcf8715b/fixtures/configs/no-files.config.ts) — resolved, as the loader sees it

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