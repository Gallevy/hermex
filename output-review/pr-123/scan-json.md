---
layout: default
title: "scan-json — output review"
---

{% raw %}
[← all cases](./index.html)

# `scan-json`

_unchanged_

**Asserts** — The full JSON contract: summary.patternCounts (#80), every owned package in packages[], de-duplicated components (#78, #79), and the compliance block (#55).

**Ran** `hermex scan --format json` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/72e033e06a9bfdc05ebb9b5566f472d1bf89f8c8/fixtures/hermex.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/72e033e06a9bfdc05ebb9b5566f472d1bf89f8c8/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/72e033e06a9bfdc05ebb9b5566f472d1bf89f8c8/fixtures/README.md)) · **Case** [`scan-json`](https://github.com/Gallevy/hermex/blob/72e033e06a9bfdc05ebb9b5566f472d1bf89f8c8/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/72e033e06a9bfdc05ebb9b5566f472d1bf89f8c8/fixtures/cases/scan-json.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-json`</sub>

## Config

[`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/72e033e06a9bfdc05ebb9b5566f472d1bf89f8c8/fixtures/hermex.config.ts)

```ts
import type { HermexConfigInput } from '../src/config/types.ts';

/**
 * The primary fixture repo's config: a deliberately non-compliant policy
 * over a deliberately messy repo, so `scan` and `comply` both have
 * something to say. Variants that change one thing at a time live in
 * `./configs/` and spread this object — see `fixtures/README.md`.
 */
export default {
  // Spelled out rather than left to the schema defaults because this repo
  // now contains fixture *machinery* alongside the code under analysis:
  // the case manifest, the alternate configs, the recorded registry
  // timelines, and the secondary repos that cases scan with their own cwd.
  // None of it is code this repo "uses", and without these entries the
  // primary output would grow rows every time a case is added.
  excludes: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    'cases.ts',
    'configs/**',
    'registry/**',
    'repos/**',
  ],
  packages: {
    internal: ['@design-system/*'],
  },
  versus: [
    {
      name: 'Design System Migration',
      packages: ['@design-system/foundation', '@new-system/arc'],
    },
  ],
  rules: {
    detect_files: [
      {
        severity: 'error',
        patterns: ['jest.config.*', '.babelrc'],
        message: 'Use vitest + Vite',
      },
    ],
    forbid_packages: [
      { severity: 'error', patterns: ['moment'], message: 'Use date-fns or dayjs' },
    ],
    require_files: [
      { severity: 'error', patterns: ['.nvmrc'] },
      { severity: 'warn', patterns: ['.editorconfig'] },
    ],
    require_packages: [
      {
        severity: 'error',
        patterns: ['typescript'],
        message: 'TypeScript is required',
      },
    ],
    require_scripts: [
      {
        severity: 'error',
        patterns: ['build', 'test'],
        message: 'Required npm scripts',
      },
    ],
    require_package_fields: [{ severity: 'warn', patterns: ['engines', 'license'] }],
    engine_version: { severity: 'warn', range: '>=20', message: 'Minimum Node 20 required' },
  },
  output: {
    details: false,
    patterns: false,
  },
} satisfies HermexConfigInput;
```

## Full output

<details markdown="1"><summary><code>stdout.json</code></summary>

```json
{
  "version": "<version>",
  "summary": {
    "filesAnalyzed": 17,
    "totalImports": 80,
    "totalComponents": 35,
    "totalUsagePatterns": 284,
    "patternCounts": [
      {
        "patternType": "usage.jsx",
        "displayName": "JSX Usage",
        "count": 64
      },
      {
        "patternType": "imports.default",
        "displayName": "Default Imports",
        "count": 39
      },
      {
        "patternType": "imports.named",
        "displayName": "Named Imports",
        "count": 37
      },
      {
        "patternType": "usage.objects",
        "displayName": "Object Mappings",
        "count": 19
      },
      {
        "patternType": "advanced.dynamic",
        "displayName": "Dynamic Imports",
        "count": 19
      },
      {
        "patternType": "usage.variables",
        "displayName": "Variable Assignments",
        "count": 9
      },
      {
        "patternType": "usage.conditional",
        "displayName": "Conditional Usage",
        "count": 7
      },
      {
        "patternType": "imports.aliased",
        "displayName": "Aliased Imports",
        "count": 6
      },
      {
        "patternType": "advanced.lazy",
        "displayName": "Lazy Loading",
        "count": 6
      },
      {
        "patternType": "advanced.hoc",
        "displayName": "Higher-Order Components",
        "count": 5
      },
      {
        "patternType": "imports.namespace",
        "displayName": "Namespace Imports",
        "count": 4
      },
      {
        "patternType": "usage.destructuring",
        "displayName": "Destructuring",
        "count": 2
      },
      {
        "patternType": "usage.arrays",
        "displayName": "Array Mappings",
        "count": 2
      },
      {
        "patternType": "advanced.portal",
        "displayName": "Portal Usage",
        "count": 1
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
      }
    ]
  },
  "packages": [
    {
      "packageName": "@design-system/foundation",
      "version": "2.5.3",
      "rootVersion": "2.5.3",
      "declaredIn": [
        "dependencies"
      ],
      "componentCount": 18,
      "usageCount": 33,
      "percentage": 91.66666666666666,
      "internal": true,
      "hasVersionConflict": false,
      "allVersions": [
        "2.5.3"
      ]
    },
    {
      "packageName": "react",
      "version": "18.3.1",
      "rootVersion": "18.3.1",
      "declaredIn": [
        "dependencies"
      ],
      "componentCount": 1,
      "usageCount": 3,
      "percentage": 8.333333333333332,
      "internal": false,
      "hasVersionConflict": false,
      "allVersions": [
        "18.3.1"
      ]
    },
    {
      "packageName": "eslint",
      "version": null,
      "rootVersion": null,
      "declaredIn": [
        "devDependencies"
      ],
      "componentCount": 0,
      "usageCount": 0,
      "percentage": 0,
      "internal": false,
      "hasVersionConflict": false,
      "allVersions": []
    },
    {
      "packageName": "moment",
      "version": "2.29.4",
      "rootVersion": "2.29.4",
      "declaredIn": [
        "devDependencies"
      ],
      "componentCount": 0,
      "usageCount": 0,
      "percentage": 0,
      "internal": false,
      "hasVersionConflict": false,
      "allVersions": [
        "2.29.4"
      ]
    },
    {
      "packageName": "react-dom",
      "version": "18.3.1",
      "rootVersion": "18.3.1",
      "declaredIn": [],
      "componentCount": 0,
      "usageCount": 0,
      "percentage": 0,
      "internal": false,
      "hasVersionConflict": false,
      "allVersions": [
        "18.3.1"
      ]
    }
  ],
  "components": [
    {
      "name": "Button",
      "source": "@design-system/foundation",
      "count": 6,
      "files": [
        "patterns/01-direct-usage.tsx",
        "patterns/03-object-mapping.tsx",
        "patterns/04-lazy-loading.tsx",
        "patterns/06-common-patterns.tsx",
        "patterns/07-comprehensive-usage.tsx"
      ]
    },
    {
      "name": "Card",
      "source": "unknown",
      "count": 5,
      "files": [
        "aliasing/01-plain.tsx",
        "aliasing/02-alias.tsx",
        "aliasing/03-alias-again.tsx",
        "aliasing/04-plain-again.tsx",
        "patterns/05-namespace-imports.tsx"
      ]
    },
    {
      "name": "Input",
      "source": "@design-system/foundation",
      "count": 5,
      "files": [
        "patterns/01-direct-usage.tsx",
        "patterns/03-object-mapping.tsx",
        "patterns/06-common-patterns.tsx",
        "patterns/07-comprehensive-usage.tsx"
      ]
    },
    {
      "name": "Card",
      "source": "@design-system/foundation",
      "count": 4,
      "files": [
        "patterns/01-direct-usage.tsx",
        "patterns/03-object-mapping.tsx",
        "patterns/06-common-patterns.tsx",
        "patterns/07-comprehensive-usage.tsx"
      ]
    },
    {
      "name": "Typography",
      "source": "@design-system/foundation",
      "count": 4,
      "files": [
        "patterns/01-direct-usage.tsx",
        "patterns/04-lazy-loading.tsx",
        "patterns/06-common-patterns.tsx",
        "patterns/07-comprehensive-usage.tsx"
      ]
    },
    {
      "name": "Suspense",
      "source": "react",
      "count": 3,
      "files": [
        "patterns/04-lazy-loading.tsx",
        "patterns/06-common-patterns.tsx",
        "patterns/07-comprehensive-usage.tsx"
      ]
    },
    {
      "name": "Foundation.Button",
      "source": "unknown",
      "count": 3,
      "files": [
        "patterns/05-namespace-imports.tsx",
        "patterns/06-common-patterns.tsx",
        "patterns/07-comprehensive-usage.tsx"
      ]
    },
    {
      "name": "Foundation.Input",
      "source": "unknown",
      "count": 3,
      "files": [
        "patterns/05-namespace-imports.tsx",
        "patterns/06-common-patterns.tsx",
        "patterns/07-comprehensive-usage.tsx"
      ]
    },
    {
      "name": "Foundation.Card",
      "source": "unknown",
      "count": 3,
      "files": [
        "patterns/05-namespace-imports.tsx",
        "patterns/06-common-patterns.tsx",
        "patterns/07-comprehensive-usage.tsx"
      ]
    },
    {
      "name": "Foundation.Typography",
      "source": "unknown",
      "count": 2,
      "files": [
        "patterns/05-namespace-imports.tsx",
        "patterns/06-common-patterns.tsx"
      ]
    },
    {
      "name": "Button",
      "source": "unknown",
      "count": 2,
      "files": [
        "versus/01-collision-classic-button.tsx",
        "versus/02-collision-pulse-button.tsx"
      ]
    },
    {
      "name": "Doc",
      "source": "local",
      "count": 1,
      "files": [
        "declarations/consumer.tsx"
      ]
    },
    {
      "name": "PrimaryButton",
      "source": "unknown",
      "count": 1,
      "files": [
        "patterns/02-variable-assignment.tsx"
      ]
    },
    {
      "name": "UserInput",
      "source": "unknown",
      "count": 1,
      "files": [
        "patterns/02-variable-assignment.tsx"
      ]
    },
    {
      "name": "InfoCard",
      "source": "unknown",
      "count": 1,
      "files": [
        "patterns/02-variable-assignment.tsx"
      ]
    },
    {
      "name": "Typography",
      "source": "unknown",
      "count": 1,
      "files": [
        "patterns/05-namespace-imports.tsx"
      ]
    },
    {
      "name": "FoundationComponents.Button",
      "source": "unknown",
      "count": 1,
      "files": [
        "patterns/05-namespace-imports.tsx"
      ]
    },
    {
      "name": "Icon",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "patterns/06-common-patterns.tsx"
      ]
    },
    {
      "name": "SaveButton",
      "source": "unknown",
      "count": 1,
      "files": [
        "patterns/06-common-patterns.tsx"
      ]
    },
    {
      "name": "UserCard",
      "source": "unknown",
      "count": 1,
      "files": [
        "patterns/06-common-patterns.tsx"
      ]
    },
    {
      "name": "MyButton",
      "source": "unknown",
      "count": 1,
      "files": [
        "patterns/07-comprehensive-usage.tsx"
      ]
    },
    {
      "name": "MyInput",
      "source": "unknown",
      "count": 1,
      "files": [
        "patterns/07-comprehensive-usage.tsx"
      ]
    },
    {
      "name": "Modal",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "patterns/07-comprehensive-usage.tsx"
      ]
    },
    {
      "name": "CaseChild",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "patterns/09-jsx-in-attributes.tsx"
      ]
    },
    {
      "name": "CaseCond",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "patterns/09-jsx-in-attributes.tsx"
      ]
    },
    {
      "name": "CaseMap",
      "source": "@design-system/foundation",
      "count": 1,
… 146 more line(s) — full text in tests/__output_baselines__/
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

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
```

</details>

{% endraw %}