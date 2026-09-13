---
layout: default
title: "comply-all-rule-types-json — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-all-rule-types-json`

_unchanged_

**Asserts** — The machine-readable shape of every rule type: fieldPath and actualValue on package-field hits, maxSizeBytes/oversizeFile on max-file-size, installedRange/requiredRange on require-engine-version, matchedFile on codeowners, packageName/worstLevel/scope on release-age. Also where the #95 fix is visible — the two codeowners entries now differ by `reason` ('unowned' vs 'wrong-owner'), not just matchedFile.

**Ran** `hermex comply --format json` in `fixtures/repos/all-rule-types` → exit 1, as asserted

**Config** [`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/6c3640fbb646ed849900d2a893986034a84f2ca0/fixtures/repos/all-rule-types/hermex.config.ts) · **Fixture** [`fixtures/repos/all-rule-types`](https://github.com/Gallevy/hermex/blob/6c3640fbb646ed849900d2a893986034a84f2ca0/fixtures/repos/all-rule-types) ([overview](https://github.com/Gallevy/hermex/blob/6c3640fbb646ed849900d2a893986034a84f2ca0/fixtures/repos/all-rule-types/README.md)) · **Case** [`comply-all-rule-types-json`](https://github.com/Gallevy/hermex/blob/6c3640fbb646ed849900d2a893986034a84f2ca0/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/6c3640fbb646ed849900d2a893986034a84f2ca0/fixtures/cases/comply-all-rule-types-json.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-all-rule-types-json`</sub>

## Config

[`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/6c3640fbb646ed849900d2a893986034a84f2ca0/fixtures/repos/all-rule-types/hermex.config.ts) — resolved, as the loader sees it

```json
{
  "includes": [
    "src/**/*.{tsx,jsx,ts,js}"
  ],
  "releaseAge": {
    "cacheDisabled": true
  },
  "rules": {
    "release-age": [
      {
        "severity": "error",
        "patterns": [
          "react"
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
  "packages": [
    {
      "packageName": "react",
      "version": "18.3.1",
      "rootVersion": "18.3.1",
      "declaredIn": [
        "dependencies"
      ],
      "componentCount": 1,
      "usageCount": 1,
      "importingFileCount": 3,
      "percentage": 100,
      "hasVersionConflict": false,
      "allVersions": [
        "18.3.1"
      ],
      "releaseAge": {
        "installedVersion": "18.3.1",
        "upgrades": [
          {
            "version": "19.1.0",
            "releasedDaysAgo": 10,
            "breachReleasedDaysAgo": 400,
            "semverBump": "major",
            "level": "major_overdue",
            "thresholdDays": 60,
            "isLatest": true
          }
        ],
        "worstLevel": "major_overdue",
        "latestVersion": "19.1.0",
        "latestReleasedDaysAgo": 10,
        "minCompliantVersion": "19.1.0",
        "minCompliantReleasedDaysAgo": 10,
        "minCompliantInWindow": true,
        "minCompliantBump": "major",
        "severity": "error",
        "scope": "root"
      }
    },
    {
      "packageName": "moment",
      "version": "2.29.4",
      "rootVersion": "2.29.4",
      "declaredIn": [
        "dependencies"
      ],
      "componentCount": 0,
      "usageCount": 0,
      "importingFileCount": 0,
      "percentage": 0,
      "hasVersionConflict": false,
      "allVersions": [
        "2.29.4"
      ],
      "releaseAge": {
        "installedVersion": "2.29.4",
        "upgrades": [
          {
            "version": "2.30.1",
            "releasedDaysAgo": 500,
            "breachReleasedDaysAgo": 500,
            "semverBump": "minor",
            "level": "minor_overdue",
            "thresholdDays": 45,
            "isLatest": true
          }
        ],
        "worstLevel": "minor_overdue",
        "deprecated": "Moment is in maintenance mode — prefer date-fns or dayjs",
        "latestVersion": "2.30.1",
        "latestReleasedDaysAgo": 500,
        "minCompliantVersion": "2.30.1",
        "minCompliantReleasedDaysAgo": 500,
        "minCompliantInWindow": false,
        "severity": "warn",
        "scope": "root"
      }
    }
  ],
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
      "ruleId": "no-files",
      "severity": "error",
      "patterns": [
        "jest.config.*",
        ".babelrc"
      ],
      "message": "Use vitest + Vite",
      "matchedFile": "jest.config.js"
    },
    {
      "ruleId": "no-files",
      "severity": "error",
      "patterns": [
        "jest.config.*",
        ".babelrc"
      ],
      "message": "Use vitest + Vite",
      "matchedFile": ".babelrc"
    },
    {
      "ruleId": "require-files",
      "severity": "error",
      "patterns": [
        ".nvmrc"
      ]
    },
    {
      "ruleId": "require-scripts",
      "severity": "error",
      "patterns": [
        "build",
        "test"
      ],
      "message": "Required npm scripts"
    },
    {
      "ruleId": "require-engine-version",
      "severity": "error",
      "patterns": [],
      "message": "Minimum Node 20 required",
      "installedRange": ">=16",
      "requiredRange": ">=20"
    },
    {
      "ruleId": "release-age",
      "severity": "error",
      "patterns": [
        "react"
      ],
      "packageName": "react",
      "installedVersion": "18.3.1",
      "worstLevel": "major_overdue",
      "scope": "root"
    },
    {
      "ruleId": "max-file-size",
      "severity": "warn",
      "patterns": [
        "assets/**/*.svg"
      ],
      "message": "Compress it or serve it from the CDN",
      "maxSizeBytes": 1024,
      "oversizeFile": {
        "file": "assets/logo.svg",
        "sizeBytes": 1410
      }
    },
    {
      "ruleId": "require-package-fields",
      "severity": "warn",
      "patterns": [
        "license"
      ]
    },
    {
      "ruleId": "no-package-fields",
      "severity": "warn",
      "patterns": [
        "publishConfig.registry"
      ],
      "message": "Publish to the public registry",
      "fieldPath": "publishConfig.registry",
      "actualValue": "https://npm.internal.example.com"
    },
    {
      "ruleId": "release-age",
      "severity": "warn",
      "patterns": [
        "**"
      ],
      "packageName": "moment",
      "installedVersion": "2.29.4",
      "worstLevel": "minor_overdue",
      "scope": "root",
      "deprecated": "Moment is in maintenance mode — prefer date-fns or dayjs"
    },
    {
      "ruleId": "require-codeowners",
      "severity": "info",
      "patterns": [
        "CODEOWNERS"
      ],
      "message": "Every file needs a platform owner",
      "reason": "unowned",
      "matchedFile": "src/orphan.tsx"
    },
    {
      "ruleId": "require-codeowners",
      "severity": "info",
      "patterns": [
        "CODEOWNERS"
      ],
      "message": "Every file needs a platform owner",
      "reason": "wrong-owner",
      "matchedFile": "src/legacy.tsx"
    }
  ],
  "compliance": {
    "status": "non-compliant",
    "compliant": false,
    "counts": {
      "errorRuleViolations": 8,
      "warningRuleViolations": 4
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
✔ Release age fetched
```

</details>

{% endraw %}