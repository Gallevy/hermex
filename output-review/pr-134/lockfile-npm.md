---
layout: default
title: "lockfile-npm — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `lockfile-npm`

_unchanged_

**Asserts** — package-lock.json produces the same inventory as its siblings.

**Ran** `hermex scan --format json` in `fixtures/repos/lockfile-npm` → exit 0, as asserted

**Config** _none — the loader found no `hermex.config.ts` in the cwd, so this ran on schema defaults_ · **Fixture** [`fixtures/repos/lockfile-npm`](https://github.com/Gallevy/hermex/blob/21319cfe654e412b3395a3c9bd75fd1204420175/fixtures/repos/lockfile-npm) ([overview](https://github.com/Gallevy/hermex/blob/21319cfe654e412b3395a3c9bd75fd1204420175/fixtures/repos/lockfile-npm/README.md)) · **Case** [`lockfile-npm`](https://github.com/Gallevy/hermex/blob/21319cfe654e412b3395a3c9bd75fd1204420175/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/21319cfe654e412b3395a3c9bd75fd1204420175/fixtures/cases/lockfile-npm.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter lockfile-npm`</sub>

## Config

None. `src/config/loader.ts` looks for `hermex.config.ts` in the working directory and does not walk up, so this case runs on the built-in schema defaults.

## Full output

<details markdown="1"><summary><code>stdout.json</code></summary>

```json
{
  "version": "<version>",
  "summary": {
    "filesAnalyzed": 1,
    "totalImports": 4,
    "totalComponents": 3,
    "totalUsagePatterns": 10,
    "patternCounts": [
      {
        "patternType": "imports.named",
        "displayName": "Named Imports",
        "count": 4
      },
      {
        "patternType": "usage.jsx",
        "displayName": "JSX Usage",
        "count": 3
      },
      {
        "patternType": "imports.default",
        "displayName": "Default Imports",
        "count": 0
      },
      {
        "patternType": "imports.namespace",
        "displayName": "Namespace Imports",
        "count": 0
      },
      {
        "patternType": "imports.aliased",
        "displayName": "Aliased Imports",
        "count": 0
      },
      {
        "patternType": "usage.variables",
        "displayName": "Variable Assignments",
        "count": 0
      },
      {
        "patternType": "usage.destructuring",
        "displayName": "Destructuring",
        "count": 0
      },
      {
        "patternType": "usage.conditional",
        "displayName": "Conditional Usage",
        "count": 0
      },
      {
        "patternType": "usage.arrays",
        "displayName": "Array Mappings",
        "count": 0
      },
      {
        "patternType": "usage.objects",
        "displayName": "Object Mappings",
        "count": 0
      },
      {
        "patternType": "advanced.lazy",
        "displayName": "Lazy Loading",
        "count": 0
      },
      {
        "patternType": "advanced.dynamic",
        "displayName": "Dynamic Imports",
        "count": 0
      },
      {
        "patternType": "advanced.hoc",
        "displayName": "Higher-Order Components",
        "count": 0
      },
      {
        "patternType": "advanced.memo",
        "displayName": "Memoized Components",
        "count": 0
      },
      {
        "patternType": "advanced.forwardRef",
        "displayName": "Forward Refs",
        "count": 0
      },
      {
        "patternType": "advanced.portal",
        "displayName": "Portal Usage",
        "count": 0
      }
    ]
  },
  "packages": [
    {
      "packageName": "@design-system/foundation",
      "version": "2.5.0",
      "rootVersion": "2.5.0",
      "declaredIn": [
        "dependencies"
      ],
      "componentCount": 2,
      "usageCount": 2,
      "percentage": 66.66666666666666,
      "internal": false,
      "hasVersionConflict": false,
      "allVersions": [
        "2.5.0"
      ]
    },
    {
      "packageName": "@old-system/ui",
      "version": "1.2.3",
      "rootVersion": "1.2.3",
      "declaredIn": [
        "dependencies"
      ],
      "componentCount": 1,
      "usageCount": 1,
      "percentage": 33.33333333333333,
      "internal": false,
      "hasVersionConflict": false,
      "allVersions": [
        "1.2.3"
      ]
    },
    {
      "packageName": "react",
      "version": "18.2.0",
      "rootVersion": "18.2.0",
      "declaredIn": [
        "dependencies"
      ],
      "componentCount": 0,
      "usageCount": 0,
      "percentage": 0,
      "internal": false,
      "hasVersionConflict": false,
      "allVersions": [
        "18.2.0"
      ]
    },
    {
      "packageName": "react-dom",
      "version": "18.2.0",
      "rootVersion": "18.2.0",
      "declaredIn": [
        "dependencies"
      ],
      "componentCount": 0,
      "usageCount": 0,
      "percentage": 0,
      "internal": false,
      "hasVersionConflict": false,
      "allVersions": [
        "18.2.0"
      ]
    }
  ],
  "components": [
    {
      "name": "Card",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "src/usage.tsx"
      ]
    },
    {
      "name": "LegacyBanner",
      "source": "@old-system/ui",
      "count": 1,
      "files": [
        "src/usage.tsx"
      ]
    },
    {
      "name": "Button",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "src/usage.tsx"
      ]
    }
  ],
  "versus": [],
  "ruleViolations": [],
  "compliance": {
    "status": "compliant",
    "compliant": true,
    "counts": {
      "errorRuleViolations": 0,
      "releaseAgeViolations": 0,
      "warningRuleViolations": 0
    }
  }
}
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found npm lockfile (supports: v2, v3) - 7 packages
✔ Found 1 files
✔ Analysis complete! Analyzed 1/1 files
```

</details>

{% endraw %}