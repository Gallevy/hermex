---
layout: default
title: "comply-release-age-json — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-release-age-json`

_changed_

**Asserts** — The machine-readable shape of hermex's most consequential rule, against the same recorded registry as comply-release-age — which until #189 no case pinned at all, since the only JSON case that reached this rule (comply-all-rule-types-json) covers a single package on a single path. Here the whole surface is visible at once: `packages[].releases` as policy-free facts (every resolved copy, what was published after each, `latest`) and `ruleViolations[]` as the verdict (`overdueTier`, `daysOverdue`, `measuredVersion`, `scope`). Between them these packages cover an overdue package with no in-window target (#26), one with a real cross-tier target (#57), one merely coming due, one at an 'off' entry that carries full facts and no violation, and a version conflict whose nested copy is overdue but out of scope. The split is the thing to read: identical `releases` would be produced under any thresholds, and every threshold-derived answer sits on the violation instead.

**Ran** `hermex comply --format json --config configs/release-age.config.ts` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/configs/release-age.config.ts`](https://github.com/Gallevy/hermex/blob/08a3bb0cba7276f9c5bcbb9aa5df09123941e6f2/fixtures/configs/release-age.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/08a3bb0cba7276f9c5bcbb9aa5df09123941e6f2/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/08a3bb0cba7276f9c5bcbb9aa5df09123941e6f2/fixtures/README.md)) · **Case** [`comply-release-age-json`](https://github.com/Gallevy/hermex/blob/08a3bb0cba7276f9c5bcbb9aa5df09123941e6f2/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/08a3bb0cba7276f9c5bcbb9aa5df09123941e6f2/fixtures/cases/comply-release-age-json.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-release-age-json`</sub>

## Config

[`fixtures/configs/release-age.config.ts`](https://github.com/Gallevy/hermex/blob/08a3bb0cba7276f9c5bcbb9aa5df09123941e6f2/fixtures/configs/release-age.config.ts) — resolved, as the loader sees it

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
    },
    "no-outdated-packages": [
      {
        "severity": "error",
        "patterns": [
          "moment",
          "react-dom"
        ]
      }
    ]
  },
  "output": {
    "details": false,
    "patterns": false
  },
  "releaseAge": {
    "cacheDisabled": true
  }
}
```

## Diff against the target branch

<sub>Diffs are unified format: `-` is the target branch, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the target branch and 9 lines from line 12 of this run.</sub>

```diff
--- target/stdout.json
+++ current/stdout.json
@@ -38,28 +38,28 @@
       "allVersions": [
         "18.3.1"
       ],
-      "releaseAge": {
-        "installedVersion": "18.3.1",
-        "upgrades": [
+      "releases": {
+        "resolved": [
           {
-            "version": "19.1.0",
-            "releasedDaysAgo": 10,
-            "breachReleasedDaysAgo": 400,
-            "semverBump": "major",
-            "level": "major_overdue",
-            "thresholdDays": 60,
-            "isLatest": true
+            "version": "18.3.1",
+            "isRoot": true,
+            "newer": [
+              {
+                "version": "19.0.0",
+                "releasedDaysAgo": 400,
+                "semverBump": "major"
+              },
+              {
+                "version": "19.1.0",
+                "releasedDaysAgo": 10,
+                "semverBump": "major",
+                "isLatest": true
+              }
+            ]
           }
         ],
-        "worstLevel": "major_overdue",
         "latestVersion": "19.1.0",
-        "latestReleasedDaysAgo": 10,
-        "minCompliantVersion": "19.1.0",
-        "minCompliantReleasedDaysAgo": 10,
-        "minCompliantInWindow": true,
-        "minCompliantBump": "major",
-        "severity": "warn",
-        "scope": "root"
+        "latestReleasedDaysAgo": 10
       }
     },
     {
@@ -75,25 +75,23 @@
       "allVersions": [
         "18.3.1"
       ],
-      "releaseAge": {
-        "installedVersion": "18.3.1",
-        "upgrades": [],
-        "worstLevel": null,
-        "pendingUpgrade": {
-          "version": "18.3.2",
-          "semverBump": "patch",
-          "releasedDaysAgo": 10,
-          "thresholdDays": 30,
-          "daysRemaining": 20
-        },
+      "releases": {
+        "resolved": [
+          {
+            "version": "18.3.1",
+            "isRoot": true,
+            "newer": [
+              {
+                "version": "18.3.2",
+                "releasedDaysAgo": 10,
+                "semverBump": "patch",
+                "isLatest": true
+              }
+            ]
+          }
+        ],
         "latestVersion": "18.3.2",
-        "latestReleasedDaysAgo": 10,
-        "minCompliantVersion": "18.3.2",
-        "minCompliantReleasedDaysAgo": 10,
-        "minCompliantInWindow": true,
-        "minCompliantBump": "patch",
-        "severity": "error",
-        "scope": "root"
+        "latestReleasedDaysAgo": 10
       }
     },
     {
@@ -158,27 +156,23 @@
         "2.29.4"
       ],
       "deprecated": "Moment is in maintenance mode — prefer date-fns or dayjs",
-      "releaseAge": {
-        "installedVersion": "2.29.4",
-        "upgrades": [
+      "releases": {
+        "resolved": [
           {
-            "version": "2.30.1",
-            "releasedDaysAgo": 500,
-            "breachReleasedDaysAgo": 500,
-            "semverBump": "minor",
-            "level": "minor_overdue",
-            "thresholdDays": 45,
-            "isLatest": true
+            "version": "2.29.4",
+            "isRoot": true,
+            "newer": [
+              {
+                "version": "2.30.1",
+                "releasedDaysAgo": 500,
+                "semverBump": "minor",
+                "isLatest": true
+              }
+            ]
           }
         ],
-        "worstLevel": "minor_overdue",
         "latestVersion": "2.30.1",
-        "latestReleasedDaysAgo": 500,
-        "minCompliantVersion": "2.30.1",
-        "minCompliantReleasedDaysAgo": 500,
-        "minCompliantInWindow": false,
-        "severity": "error",
-        "scope": "root"
+        "latestReleasedDaysAgo": 500
       }
     }
   ],
@@ -574,8 +568,9 @@
         "react-dom"
       ],
       "packageName": "moment",
-      "installedVersion": "2.29.4",
-      "worstLevel": "minor_overdue",
+      "measuredVersion": "2.29.4",
+      "overdueTier": "minor",
+      "daysOverdue": 455,
       "scope": "root"
     },
     {
@@ -592,8 +587,9 @@
         "**"
       ],
       "packageName": "react",
-      "installedVersion": "18.3.1",
-      "worstLevel": "major_overdue",
+      "measuredVersion": "18.3.1",
+      "overdueTier": "major",
+      "daysOverdue": 340,
       "scope": "root"
     },
     {
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
      "importingFileCount": 8,
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
      "importingFileCount": 6,
      "percentage": 8.333333333333332,
      "hasVersionConflict": false,
      "allVersions": [
        "18.3.1"
      ],
      "releases": {
        "resolved": [
          {
            "version": "18.3.1",
            "isRoot": true,
            "newer": [
              {
                "version": "19.0.0",
                "releasedDaysAgo": 400,
                "semverBump": "major"
              },
              {
                "version": "19.1.0",
                "releasedDaysAgo": 10,
                "semverBump": "major",
                "isLatest": true
              }
            ]
          }
        ],
        "latestVersion": "19.1.0",
        "latestReleasedDaysAgo": 10
      }
    },
    {
      "packageName": "react-dom",
      "version": "18.3.1",
      "rootVersion": "18.3.1",
      "declaredIn": [],
      "componentCount": 0,
      "usageCount": 0,
      "importingFileCount": 1,
      "percentage": 0,
      "hasVersionConflict": false,
      "allVersions": [
        "18.3.1"
      ],
      "releases": {
        "resolved": [
          {
            "version": "18.3.1",
            "isRoot": true,
            "newer": [
              {
                "version": "18.3.2",
                "releasedDaysAgo": 10,
                "semverBump": "patch",
                "isLatest": true
              }
            ]
          }
        ],
        "latestVersion": "18.3.2",
        "latestReleasedDaysAgo": 10
      }
    },
    {
      "packageName": "lodash",
      "version": "4.17.21",
      "rootVersion": "4.17.21",
      "declaredIn": [
        "dependencies"
      ],
      "componentCount": 0,
      "usageCount": 0,
      "importingFileCount": 3,
      "percentage": 0,
      "hasVersionConflict": false,
      "allVersions": [
        "4.17.21"
      ]
    },
    {
      "packageName": "es-toolkit",
      "version": "1.39.10",
      "rootVersion": "1.39.10",
      "declaredIn": [
        "dependencies"
      ],
      "componentCount": 0,
      "usageCount": 0,
      "importingFileCount": 1,
      "percentage": 0,
      "hasVersionConflict": false,
      "allVersions": [
        "1.39.10"
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
      "importingFileCount": 0,
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
      "importingFileCount": 0,
      "percentage": 0,
      "hasVersionConflict": false,
      "allVersions": [
        "2.29.4"
      ],
      "deprecated": "Moment is in maintenance mode — prefer date-fns or dayjs",
      "releases": {
        "resolved": [
          {
            "version": "2.29.4",
            "isRoot": true,
            "newer": [
              {
                "version": "2.30.1",
                "releasedDaysAgo": 500,
                "semverBump": "minor",
                "isLatest": true
              }
            ]
          }
        ],
        "latestVersion": "2.30.1",
        "latestReleasedDaysAgo": 500
      }
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
… 213 more line(s) — re-run locally for the full text.
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

✔ Release age fetched (3 packages skipped — registry unreachable or not found)
```

</details>

{% endraw %}