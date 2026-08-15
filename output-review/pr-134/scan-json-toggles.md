---
layout: default
title: "scan-json-toggles — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `scan-json-toggles`

_changed_

**Asserts** — What output.* toggles do to --format json: today, nothing (#91). The payload below is emitted with every section switched off, yet still carries packages, components, versus and ruleViolations in full. Pair it with scan-human-minimal to see the two formats diverge; when #91 lands, this baseline shrinking is the proof.

**Ran** `hermex scan --format json --config configs/minimal.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/minimal.config.ts`](https://github.com/Gallevy/hermex/blob/3a39f70cc20bcb28a281f078eb587b7c34212c6f/fixtures/configs/minimal.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/3a39f70cc20bcb28a281f078eb587b7c34212c6f/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/3a39f70cc20bcb28a281f078eb587b7c34212c6f/fixtures/README.md)) · **Case** [`scan-json-toggles`](https://github.com/Gallevy/hermex/blob/3a39f70cc20bcb28a281f078eb587b7c34212c6f/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/3a39f70cc20bcb28a281f078eb587b7c34212c6f/fixtures/cases/scan-json-toggles.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-json-toggles`</sub>

## Config

[`fixtures/configs/minimal.config.ts`](https://github.com/Gallevy/hermex/blob/3a39f70cc20bcb28a281f078eb587b7c34212c6f/fixtures/configs/minimal.config.ts)

```ts
import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * Every output section off except the summary. Regression cover for #63:
 * a section that is switched off must actually be absent, not rendered
 * empty or rendered anyway. Used twice — once as human output, once as
 * `--format json`, since the JSON payload has to honour the same toggles.
 */
export default {
  ...base,
  output: {
    summary: 'log',
    packages: false,
    components: false,
    patterns: false,
    details: false,
    versus: false,
    rules: false,
  },
} satisfies HermexConfigInput;
```

## Diff against the target branch

<sub>Diffs are unified format: `-` is the target branch, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the target branch and 9 lines from line 12 of this run.</sub>

```diff
--- target/stdout.json
+++ current/stdout.json
@@ -4,499 +4,8 @@
     "filesAnalyzed": 17,
     "totalImports": 80,
     "totalComponents": 35,
-    "totalUsagePatterns": 284,
-    "patternCounts": [
-      {
-        "patternType": "usage.jsx",
-        "displayName": "JSX Usage",
-        "count": 64
-      },
-      {
-        "patternType": "imports.default",
-        "displayName": "Default Imports",
-        "count": 39
-      },
-      {
-        "patternType": "imports.named",
-        "displayName": "Named Imports",
-        "count": 37
-      },
-      {
-        "patternType": "usage.objects",
-        "displayName": "Object Mappings",
-        "count": 19
-      },
-      {
-        "patternType": "advanced.dynamic",
-        "displayName": "Dynamic Imports",
-        "count": 19
-      },
-      {
-        "patternType": "usage.variables",
-        "displayName": "Variable Assignments",
-        "count": 9
-      },
-      {
-        "patternType": "usage.conditional",
-        "displayName": "Conditional Usage",
-        "count": 7
-      },
-      {
-        "patternType": "imports.aliased",
-        "displayName": "Aliased Imports",
-        "count": 6
-      },
-      {
-        "patternType": "advanced.lazy",
-        "displayName": "Lazy Loading",
-        "count": 6
-      },
-      {
-        "patternType": "advanced.hoc",
-        "displayName": "Higher-Order Components",
-        "count": 5
-      },
-      {
-        "patternType": "imports.namespace",
-        "displayName": "Namespace Imports",
-        "count": 4
-      },
-      {
-        "patternType": "usage.destructuring",
-        "displayName": "Destructuring",
-        "count": 2
-      },
-      {
-        "patternType": "usage.arrays",
-        "displayName": "Array Mappings",
-        "count": 2
-      },
-      {
-        "patternType": "advanced.portal",
-        "displayName": "Portal Usage",
-        "count": 1
-      },
-      {
-        "patternType": "advanced.memo",
-        "displayName": "Memoized Components",
-        "count": 0
-      },
-      {
-        "patternType": "advanced.forwardRef",
-        "displayName": "Forward Refs",
-        "count": 0
-      }
-    ]
+    "totalUsagePatterns": 284
   },
-  "packages": [
-    {
-      "packageName": "@design-system/foundation",
-      "version": "2.5.3",
-      "rootVersion": "2.5.3",
-      "declaredIn": [
-        "dependencies"
-      ],
-      "componentCount": 18,
-      "usageCount": 33,
-      "percentage": 91.66666666666666,
-      "internal": true,
-      "hasVersionConflict": false,
-      "allVersions": [
-        "2.5.3"
-      ]
-    },
-    {
-      "packageName": "react",
-      "version": "18.3.1",
-      "rootVersion": "18.3.1",
-      "declaredIn": [
-        "dependencies"
-      ],
-      "componentCount": 1,
-      "usageCount": 3,
-      "percentage": 8.333333333333332,
-      "internal": false,
-      "hasVersionConflict": false,
-      "allVersions": [
-        "18.3.1"
-      ]
-    },
-    {
-      "packageName": "eslint",
-      "version": null,
-      "rootVersion": null,
-      "declaredIn": [
-        "devDependencies"
-      ],
-      "componentCount": 0,
-      "usageCount": 0,
-      "percentage": 0,
-      "internal": false,
-      "hasVersionConflict": false,
-      "allVersions": []
-    },
-    {
-      "packageName": "moment",
-      "version": "2.29.4",
-      "rootVersion": "2.29.4",
-      "declaredIn": [
-        "devDependencies"
-      ],
-      "componentCount": 0,
-      "usageCount": 0,
-      "percentage": 0,
-      "internal": false,
-      "hasVersionConflict": false,
-      "allVersions": [
-        "2.29.4"
-      ]
-    },
-    {
-      "packageName": "react-dom",
-      "version": "18.3.1",
-      "rootVersion": "18.3.1",
-      "declaredIn": [],
-      "componentCount": 0,
-      "usageCount": 0,
-      "percentage": 0,
-      "internal": false,
-      "hasVersionConflict": false,
-      "allVersions": [
-        "18.3.1"
-      ]
-    }
-  ],
-  "components": [
-    {
-      "name": "Button",
-      "source": "@design-system/foundation",
-      "count": 6,
-      "files": [
-        "patterns/01-direct-usage.tsx",
-        "patterns/03-object-mapping.tsx",
-        "patterns/04-lazy-loading.tsx",
-        "patterns/06-common-patterns.tsx",
-        "patterns/07-comprehensive-usage.tsx"
-      ]
-    },
-    {
-      "name": "Card",
-      "source": "unknown",
-      "count": 5,
-      "files": [
-        "aliasing/01-plain.tsx",
-        "aliasing/02-alias.tsx",
-        "aliasing/03-alias-again.tsx",
-        "aliasing/04-plain-again.tsx",
-        "patterns/05-namespace-imports.tsx"
-      ]
-    },
-    {
-      "name": "Input",
-      "source": "@design-system/foundation",
-      "count": 5,
-      "files": [
-        "patterns/01-direct-usage.tsx",
-        "patterns/03-object-mapping.tsx",
-        "patterns/06-common-patterns.tsx",
-        "patterns/07-comprehensive-usage.tsx"
-      ]
-    },
-    {
-      "name": "Card",
-      "source": "@design-system/foundation",
-      "count": 4,
-      "files": [
-        "patterns/01-direct-usage.tsx",
-        "patterns/03-object-mapping.tsx",
-        "patterns/06-common-patterns.tsx",
-        "patterns/07-comprehensive-usage.tsx"
-      ]
-    },
-    {
-      "name": "Typography",
-      "source": "@design-system/foundation",
-      "count": 4,
-      "files": [
-        "patterns/01-direct-usage.tsx",
-        "patterns/04-lazy-loading.tsx",
-        "patterns/06-common-patterns.tsx",
-        "patterns/07-comprehensive-usage.tsx"
-      ]
-    },
-    {
-      "name": "Suspense",
-      "source": "react",
-      "count": 3,
-      "files": [
-        "patterns/04-lazy-loading.tsx",
-        "patterns/06-common-patterns.tsx",
-        "patterns/07-comprehensive-usage.tsx"
-      ]
-    },
-    {
-      "name": "Foundation.Button",
-      "source": "unknown",
-      "count": 3,
-      "files": [
-        "patterns/05-namespace-imports.tsx",
-        "patterns/06-common-patterns.tsx",
-        "patterns/07-comprehensive-usage.tsx"
-      ]
-    },
-    {
-      "name": "Foundation.Input",
-      "source": "unknown",
-      "count": 3,
-      "files": [
-        "patterns/05-namespace-imports.tsx",
-        "patterns/06-common-patterns.tsx",
-        "patterns/07-comprehensive-usage.tsx"
-      ]
-    },
-    {
-      "name": "Foundation.Card",
-      "source": "unknown",
-      "count": 3,
-      "files": [
-        "patterns/05-namespace-imports.tsx",
-        "patterns/06-common-patterns.tsx",
-        "patterns/07-comprehensive-usage.tsx"
-      ]
-    },
-    {
-      "name": "Foundation.Typography",
-      "source": "unknown",
-      "count": 2,
-      "files": [
-        "patterns/05-namespace-imports.tsx",
-        "patterns/06-common-patterns.tsx"
-      ]
-    },
-    {
-      "name": "Button",
-      "source": "unknown",
-      "count": 2,
-      "files": [
-        "versus/01-collision-classic-button.tsx",
-        "versus/02-collision-pulse-button.tsx"
-      ]
-    },
-    {
-      "name": "Doc",
-      "source": "local",
-      "count": 1,
-      "files": [
-        "declarations/consumer.tsx"
-      ]
-    },
-    {
-      "name": "PrimaryButton",
-      "source": "unknown",
-      "count": 1,
-      "files": [
-        "patterns/02-variable-assignment.tsx"
-      ]
-    },
-    {
-      "name": "UserInput",
-      "source": "unknown",
-      "count": 1,
-      "files": [
-        "patterns/02-variable-assignment.tsx"
-      ]
-    },
-    {
-      "name": "InfoCard",
-      "source": "unknown",
-      "count": 1,
-      "files": [
-        "patterns/02-variable-assignment.tsx"
-      ]
-    },
-    {
-      "name": "Typography",
-      "source": "unknown",
-      "count": 1,
-      "files": [
-        "patterns/05-namespace-imports.tsx"
-      ]
-    },
-    {
-      "name": "FoundationComponents.Button",
-      "source": "unknown",
-      "count": 1,
-      "files": [
-        "patterns/05-namespace-imports.tsx"
-      ]
-    },
-    {
-      "name": "Icon",
-      "source": "@design-system/foundation",
-      "count": 1,
-      "files": [
-        "patterns/06-common-patterns.tsx"
-      ]
-    },
-    {
-      "name": "SaveButton",
-      "source": "unknown",
-      "count": 1,
-      "files": [
-        "patterns/06-common-patterns.tsx"
-      ]
-    },
-    {
-      "name": "UserCard",
-      "source": "unknown",
-      "count": 1,
-      "files": [
-        "patterns/06-common-patterns.tsx"
-      ]
-    },
-    {
-      "name": "MyButton",
-      "source": "unknown",
-      "count": 1,
-      "files": [
-        "patterns/07-comprehensive-usage.tsx"
-      ]
-    },
-    {
-      "name": "MyInput",
-      "source": "unknown",
-      "count": 1,
-      "files": [
-        "patterns/07-comprehensive-usage.tsx"
-      ]
-    },
-    {
-      "name": "Modal",
-      "source": "@design-system/foundation",
-      "count": 1,
-      "files": [
-        "patterns/07-comprehensive-usage.tsx"
-      ]
-    },
-    {
-      "name": "CaseChild",
-      "source": "@design-system/foundation",
-      "count": 1,
-      "files": [
-        "patterns/09-jsx-in-attributes.tsx"
-      ]
-    },
-    {
-      "name": "CaseCond",
-      "source": "@design-system/foundation",
-      "count": 1,
-      "files": [
-        "patterns/09-jsx-in-attributes.tsx"
-      ]
-    },
-    {
-      "name": "CaseMap",
-      "source": "@design-system/foundation",
-      "count": 1,
-      "files": [
-        "patterns/09-jsx-in-attributes.tsx"
-      ]
-    },
-    {
-      "name": "CaseVar",
-      "source": "@design-system/foundation",
-      "count": 1,
-      "files": [
-        "patterns/09-jsx-in-attributes.tsx"
-      ]
-    },
-    {
-      "name": "CaseReturn",
-      "source": "@design-system/foundation",
-      "count": 1,
-      "files": [
-        "patterns/09-jsx-in-attributes.tsx"
-      ]
-    },
-    {
-      "name": "Child",
-      "source": "@design-system/foundation",
-      "count": 1,
-      "files": [
-        "patterns/09-jsx-in-attributes.tsx"
-      ]
-    },
-    {
-      "name": "CaseAttr",
-      "source": "@design-system/foundation",
-      "count": 1,
-      "files": [
-        "patterns/09-jsx-in-attributes.tsx"
-      ]
-    },
-    {
-      "name": "CaseAttrSelfClosing",
-      "source": "@design-system/foundation",
-      "count": 1,
-      "files": [
-        "patterns/09-jsx-in-attributes.tsx"
-      ]
-    },
-    {
-      "name": "CaseAttrCond",
-      "source": "@design-system/foundation",
-      "count": 1,
-      "files": [
-        "patterns/09-jsx-in-attributes.tsx"
-      ]
-    },
-    {
-      "name": "CaseAttrHost",
-      "source": "@design-system/foundation",
-      "count": 1,
-      "files": [
-        "patterns/09-jsx-in-attributes.tsx"
-      ]
-    },
-    {
-      "name": "CaseAttrFragment",
-      "source": "@design-system/foundation",
-      "count": 1,
-      "files": [
-        "patterns/09-jsx-in-attributes.tsx"
-      ]
-    },
-    {
-      "name": "CaseBoth",
-      "source": "@design-system/foundation",
-      "count": 1,
-      "files": [
-        "patterns/09-jsx-in-attributes.tsx"
-      ]
-    }
-  ],
-  "versus": [
-    {
-      "name": "Design System Migration",
-      "packages": [
-        "@design-system/foundation",
-        "@new-system/arc"
-      ],
-      "entries": [
-        {
-          "packageName": "@design-system/foundation",
-          "count": 33,
-          "percentage": 100
-        },
-        {
-          "packageName": "@new-system/arc",
-          "count": 0,
-          "percentage": 0
-        }
-      ],
-      "totalCount": 33
-    }
-  ],
   "ruleViolations": [
     {
       "ruleId": "no-packages",
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
      "ruleId": "require-files",
      "severity": "error",
      "patterns": [
        ".nvmrc"
      ],
      "matchedFiles": []
    },
    {
      "ruleId": "require-files",
      "severity": "warn",
      "patterns": [
        ".editorconfig"
      ],
      "matchedFiles": []
    }
  ],
  "compliance": {
    "status": "non-compliant",
    "compliant": false,
    "counts": {
      "errorRuleViolations": 3,
      "releaseAgeViolations": 0,
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