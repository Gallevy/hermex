---
layout: default
title: "comply-json — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-json`

_unchanged_

**Asserts** — The compliance block as machine-readable output on a failing repo.

**Ran** `hermex comply --format json` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/hermex.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/README.md)) · **Case** [`comply-json`](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/cases/comply-json.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-json`</sub>

## Config

[`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/a5d716c12dd56032374342b9ad6eb459aeb31fb7/fixtures/hermex.config.ts) — resolved, as the loader sees it

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
  }
}
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
    "totalUsagePatterns": 284
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
      "files": [
        "patterns/09-jsx-in-attributes.tsx"
      ]
    },
    {
      "name": "CaseVar",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "patterns/09-jsx-in-attributes.tsx"
      ]
    },
    {
      "name": "CaseReturn",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "patterns/09-jsx-in-attributes.tsx"
      ]
    },
    {
      "name": "Child",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "patterns/09-jsx-in-attributes.tsx"
      ]
    },
    {
      "name": "CaseAttr",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "patterns/09-jsx-in-attributes.tsx"
      ]
    },
    {
      "name": "CaseAttrSelfClosing",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "patterns/09-jsx-in-attributes.tsx"
      ]
    },
    {
      "name": "CaseAttrCond",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "patterns/09-jsx-in-attributes.tsx"
      ]
    },
    {
      "name": "CaseAttrHost",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "patterns/09-jsx-in-attributes.tsx"
      ]
    },
    {
      "name": "CaseAttrFragment",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "patterns/09-jsx-in-attributes.tsx"
      ]
    },
    {
      "name": "CaseBoth",
      "source": "@design-system/foundation",
      "count": 1,
      "files": [
        "patterns/09-jsx-in-attributes.tsx"
      ]
    }
  ],
  "versus": [
    {
      "name": "Design System Migration",
      "packages": [
        "@design-system/foundation",
        "@new-system/arc"
      ],
      "entries": [
        {
          "packageName": "@design-system/foundation",
… 59 more line(s) — re-run locally for the full text.
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