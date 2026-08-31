---
layout: default
title: "comply-all-rule-types-json — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-all-rule-types-json`

_unchanged_

**Asserts** — The machine-readable shape of every rule type: fieldPath and actualValue on package-field hits, installedRange/requiredRange on require-engine-version, matchedFiles on codeowners. Also where #95 is visible — the two codeowners entries are byte-identical apart from matchedFiles.

**Ran** `hermex comply --format json` in `fixtures/repos/all-rule-types` → exit 1, as asserted

**Config** [`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/396bac3f00fae3f409c495bc3f4df42edcf8715b/fixtures/repos/all-rule-types/hermex.config.ts) · **Fixture** [`fixtures/repos/all-rule-types`](https://github.com/Gallevy/hermex/blob/396bac3f00fae3f409c495bc3f4df42edcf8715b/fixtures/repos/all-rule-types) ([overview](https://github.com/Gallevy/hermex/blob/396bac3f00fae3f409c495bc3f4df42edcf8715b/fixtures/repos/all-rule-types/README.md)) · **Case** [`comply-all-rule-types-json`](https://github.com/Gallevy/hermex/blob/396bac3f00fae3f409c495bc3f4df42edcf8715b/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/396bac3f00fae3f409c495bc3f4df42edcf8715b/fixtures/cases/comply-all-rule-types-json.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-all-rule-types-json`</sub>

## Config

[`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/396bac3f00fae3f409c495bc3f4df42edcf8715b/fixtures/repos/all-rule-types/hermex.config.ts) — resolved, as the loader sees it

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

<details markdown="1"><summary><code>stdout.json</code></summary>

```json
{
  "version": "<version>",
  "summary": {
    "filesAnalyzed": 3,
    "totalImports": 3,
    "totalComponents": 1,
    "totalUsagePatterns": 5
  },
  "ruleViolations": [
    {
      "ruleId": "no-packages",
      "severity": "error",
      "patterns": [
        "moment"
      ],
      "message": "Use date-fns or dayjs",
      "matchedFiles": [],
      "packageName": "moment"
    },
    {
      "ruleId": "require-packages",
      "severity": "error",
      "patterns": [
        "typescript"
      ],
      "message": "TypeScript is required",
      "matchedFiles": []
    },
    {
      "ruleId": "no-files",
      "severity": "error",
      "patterns": [
        "jest.config.*",
        ".babelrc"
      ],
      "message": "Use vitest + Vite",
      "matchedFiles": [
        "jest.config.js",
        ".babelrc"
      ]
    },
    {
      "ruleId": "require-files",
      "severity": "error",
      "patterns": [
        ".nvmrc"
      ],
      "matchedFiles": []
    },
    {
      "ruleId": "require-scripts",
      "severity": "error",
      "patterns": [
        "build",
        "test"
      ],
      "message": "Required npm scripts",
      "matchedFiles": []
    },
    {
      "ruleId": "require-engine-version",
      "severity": "error",
      "patterns": [],
      "message": "Minimum Node 20 required",
      "matchedFiles": [],
      "installedRange": ">=16",
      "requiredRange": ">=20"
    },
    {
      "ruleId": "require-package-fields",
      "severity": "warn",
      "patterns": [
        "license"
      ],
      "matchedFiles": []
    },
    {
      "ruleId": "no-package-fields",
      "severity": "warn",
      "patterns": [
        "publishConfig.registry"
      ],
      "message": "Publish to the public registry",
      "matchedFiles": [],
      "fieldPath": "publishConfig.registry",
      "actualValue": "https://npm.internal.example.com"
    },
    {
      "ruleId": "require-codeowners",
      "severity": "info",
      "patterns": [
        "CODEOWNERS"
      ],
      "message": "Every file needs a platform owner",
      "matchedFiles": [
        "src/orphan.tsx"
      ]
    },
    {
      "ruleId": "require-codeowners",
      "severity": "info",
      "patterns": [
        "CODEOWNERS"
      ],
      "message": "Every file needs a platform owner",
      "matchedFiles": [
        "src/legacy.tsx"
      ]
    }
  ],
  "compliance": {
    "status": "non-compliant",
    "compliant": false,
    "counts": {
      "errorRuleViolations": 6,
      "releaseAgeViolations": 0,
      "warningRuleViolations": 2
    }
  }
}
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 2 packages
✔ Found 3 files
✔ Analysis complete! Analyzed 3/3 files
```

</details>

{% endraw %}