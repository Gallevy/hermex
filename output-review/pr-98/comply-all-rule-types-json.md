---
layout: default
title: "comply-all-rule-types-json — output review"
---

{% raw %}
[← all cases](./index.html)

# `comply-all-rule-types-json`

_unchanged_

**Asserts** — The machine-readable shape of every rule type: fieldPath and actualValue on package-field hits, installedRange/requiredRange on engine_version, matchedFiles on codeowners. Also where #95 is visible — the two codeowners entries are byte-identical apart from matchedFiles.

**Ran** `hermex comply --format json` in `fixtures/repos/all-rule-types` → exit 1, as asserted

**Config** [`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/c304bd2a3ce58f52f2a38ce49a358f2325ff3395/fixtures/repos/all-rule-types/hermex.config.ts) · **Fixture** [`fixtures/repos/all-rule-types`](https://github.com/Gallevy/hermex/blob/c304bd2a3ce58f52f2a38ce49a358f2325ff3395/fixtures/repos/all-rule-types) ([overview](https://github.com/Gallevy/hermex/blob/c304bd2a3ce58f52f2a38ce49a358f2325ff3395/fixtures/repos/all-rule-types/README.md)) · **Case** [`comply-all-rule-types-json`](https://github.com/Gallevy/hermex/blob/c304bd2a3ce58f52f2a38ce49a358f2325ff3395/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/c304bd2a3ce58f52f2a38ce49a358f2325ff3395/fixtures/cases/comply-all-rule-types-json.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-all-rule-types-json`</sub>

## Config

[`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/c304bd2a3ce58f52f2a38ce49a358f2325ff3395/fixtures/repos/all-rule-types/hermex.config.ts)

```ts
import type { HermexConfigInput } from '../../../src/config/types.ts';

/**
 * Every rule type hermex has, all firing at once, at three different
 * severities. The primary fixture repo only ever trips three of the nine —
 * so without this repo the rules table has never been reviewed with an
 * `engine_version` row, a `codeowners` row, or either of the
 * package-field shapes in it, and nothing would catch a renderer that
 * mishandles `fieldPath` / `installedRange` / a long `matchedFiles` list.
 *
 * Scoped to `src/` so `jest.config.js` is found by `detect_files` without
 * also being parsed as source.
 */
export default {
  includes: ['src/**/*.{tsx,jsx,ts,js}'],
  rules: {
    detect_files: [
      {
        severity: 'error',
        patterns: ['jest.config.*', '.babelrc'],
        message: 'Use vitest + Vite',
      },
    ],
    require_files: [{ severity: 'error', patterns: ['.nvmrc'] }],
    forbid_packages: [
      { severity: 'error', patterns: ['moment'], message: 'Use date-fns or dayjs' },
    ],
    require_packages: [
      { severity: 'error', patterns: ['typescript'], message: 'TypeScript is required' },
    ],
    require_scripts: [
      { severity: 'error', patterns: ['build', 'test'], message: 'Required npm scripts' },
    ],
    // Missing outright, so the violation reports the absence.
    require_package_fields: [{ severity: 'warn', patterns: ['license'] }],
    // Present, so the violation reports the offending value — the other
    // half of the package-field renderer.
    forbid_package_fields: [
      {
        severity: 'warn',
        patterns: ['publishConfig.registry'],
        message: 'Publish to the public registry',
      },
    ],
    // engines.node is ">=16", so this reports both ranges rather than the
    // "not specified" shape.
    engine_version: { severity: 'error', range: '>=20', message: 'Minimum Node 20 required' },
    // CODEOWNERS covers two of the three scanned files, and one of those
    // belongs to a team outside `requiredOwners` — so this produces both
    // codeowners violations, unowned and wrong-owner.
    //
    // The baseline currently describes both as "have no owner", which is
    // wrong for src/legacy.tsx: it has an owner, just not a required one.
    // That is #95, left unfixed on purpose — the recorded output is the
    // evidence, and refreshing this baseline is how the fix gets reviewed.
    codeowners: {
      severity: 'info',
      requiredOwners: ['@org/platform'],
      message: 'Every file needs a platform owner',
    },
  },
  output: {
    packages: false,
    components: false,
    patterns: false,
    versus: false,
  },
} satisfies HermexConfigInput;
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
    "totalUsagePatterns": 5,
    "patternCounts": [
      {
        "patternType": "imports.named",
        "displayName": "Named Imports",
        "count": 3
      },
      {
        "patternType": "usage.jsx",
        "displayName": "JSX Usage",
        "count": 1
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
      "packageName": "react",
      "version": "18.3.1",
      "rootVersion": "18.3.1",
      "declaredIn": [
        "dependencies"
      ],
      "componentCount": 1,
      "usageCount": 1,
      "percentage": 100,
      "internal": false,
      "hasVersionConflict": false,
      "allVersions": [
        "18.3.1"
      ]
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
      "percentage": 0,
      "internal": false,
      "hasVersionConflict": false,
      "allVersions": [
        "2.29.4"
      ]
    }
  ],
  "components": [
    {
      "name": "Fragment",
      "source": "react",
      "count": 1,
      "files": [
        "src/orphan.tsx"
      ]
    }
  ],
  "versus": [],
  "ruleViolations": [
    {
      "type": "forbid_packages",
      "severity": "error",
      "patterns": [
        "moment"
      ],
      "message": "Use date-fns or dayjs",
      "matchedFiles": [],
      "packageName": "moment"
    },
    {
      "type": "require_packages",
      "severity": "error",
      "patterns": [
        "typescript"
      ],
      "message": "TypeScript is required",
      "matchedFiles": []
    },
    {
      "type": "detect_files",
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
      "type": "require_files",
      "severity": "error",
      "patterns": [
        ".nvmrc"
      ],
      "matchedFiles": []
    },
    {
      "type": "require_scripts",
      "severity": "error",
      "patterns": [
        "build",
        "test"
      ],
      "message": "Required npm scripts",
      "matchedFiles": []
    },
    {
      "type": "require_package_fields",
      "severity": "warn",
      "patterns": [
        "license"
      ],
      "matchedFiles": []
    },
    {
      "type": "forbid_package_fields",
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
      "type": "engine_version",
      "severity": "error",
      "patterns": [],
      "message": "Minimum Node 20 required",
      "matchedFiles": [],
      "installedRange": ">=16",
      "requiredRange": ">=20"
    },
    {
      "type": "codeowners",
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
      "type": "codeowners",
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