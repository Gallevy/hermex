---
layout: default
title: "comply-all-rule-types-json — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-all-rule-types-json`

_changed_

**Asserts** — The machine-readable shape of every rule type: fieldPath and actualValue on package-field hits, installedRange/requiredRange on require-engine-version, matchedFiles on codeowners, expectedName/actualName on require-repo-name-match. Also where #95 is visible — the two codeowners entries are byte-identical apart from matchedFiles.

**Ran** `hermex comply --format json` in `fixtures/repos/all-rule-types` → exit 1, as asserted

**Config** [`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/9d2870727e95cde1b1e21c72833e7f3258e98429/fixtures/repos/all-rule-types/hermex.config.ts) · **Fixture** [`fixtures/repos/all-rule-types`](https://github.com/Gallevy/hermex/blob/9d2870727e95cde1b1e21c72833e7f3258e98429/fixtures/repos/all-rule-types) ([overview](https://github.com/Gallevy/hermex/blob/9d2870727e95cde1b1e21c72833e7f3258e98429/fixtures/repos/all-rule-types/README.md)) · **Case** [`comply-all-rule-types-json`](https://github.com/Gallevy/hermex/blob/9d2870727e95cde1b1e21c72833e7f3258e98429/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/9d2870727e95cde1b1e21c72833e7f3258e98429/fixtures/cases/comply-all-rule-types-json.md))

**Sandboxed** — runs against a copy of the fixture directory with `.git/config` created first, because git cannot track those paths

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-all-rule-types-json`</sub>

## Config

[`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/9d2870727e95cde1b1e21c72833e7f3258e98429/fixtures/repos/all-rule-types/hermex.config.ts) — resolved, as the loader sees it

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
    },
    "require-repo-name-match": {
      "severity": "warn",
      "message": "Package name must match the repository"
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

## Diff against the target branch

<sub>Diffs are unified format: `-` is the target branch, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the target branch and 9 lines from line 12 of this run.</sub>

```diff
--- target/stdout.json
+++ current/stdout.json
@@ -0,0 +1,130 @@
+{
+  "version": "<version>",
+  "summary": {
+    "filesAnalyzed": 3,
+    "totalImports": 3,
+    "totalComponents": 1,
+    "totalUsagePatterns": 5
+  },
+  "ruleViolations": [
+    {
+      "ruleId": "no-packages",
+      "severity": "error",
+      "patterns": [
+        "moment"
+      ],
+      "message": "Use date-fns or dayjs",
+      "matchedFiles": [],
+      "packageName": "moment"
+    },
+    {
+      "ruleId": "require-packages",
+      "severity": "error",
+      "patterns": [
+        "typescript"
+      ],
+      "message": "TypeScript is required",
+      "matchedFiles": []
+    },
+    {
+      "ruleId": "no-files",
+      "severity": "error",
+      "patterns": [
+        "jest.config.*",
+        ".babelrc"
+      ],
+      "message": "Use vitest + Vite",
+      "matchedFiles": [
+        "jest.config.js",
+        ".babelrc"
+      ]
+    },
+    {
+      "ruleId": "require-files",
+      "severity": "error",
+      "patterns": [
+        ".nvmrc"
+      ],
+      "matchedFiles": []
+    },
+    {
+      "ruleId": "require-scripts",
+      "severity": "error",
+      "patterns": [
+        "build",
+        "test"
+      ],
+      "message": "Required npm scripts",
+      "matchedFiles": []
+    },
+    {
+      "ruleId": "require-engine-version",
+      "severity": "error",
+      "patterns": [],
+      "message": "Minimum Node 20 required",
+      "matchedFiles": [],
+      "installedRange": ">=16",
+      "requiredRange": ">=20"
+    },
+    {
+      "ruleId": "require-package-fields",
+      "severity": "warn",
+      "patterns": [
+        "license"
+      ],
+      "matchedFiles": []
+    },
+    {
+      "ruleId": "no-package-fields",
+      "severity": "warn",
+      "patterns": [
+        "publishConfig.registry"
+      ],
+      "message": "Publish to the public registry",
+      "matchedFiles": [],
+      "fieldPath": "publishConfig.registry",
+      "actualValue": "https://npm.internal.example.com"
+    },
+    {
+      "ruleId": "require-repo-name-match",
+      "severity": "warn",
+      "patterns": [],
+      "message": "Package name must match the repository",
+      "matchedFiles": [],
+      "expectedName": "checkout-web",
+      "actualName": "hermex-fixture-all-rule-types"
+    },
+    {
+      "ruleId": "require-codeowners",
+      "severity": "info",
+      "patterns": [
+        "CODEOWNERS"
+      ],
+      "message": "Every file needs a platform owner",
+      "matchedFiles": [
+        "src/orphan.tsx"
+      ]
+    },
+    {
+      "ruleId": "require-codeowners",
+      "severity": "info",
+      "patterns": [
+        "CODEOWNERS"
+      ],
+      "message": "Every file needs a platform owner",
+      "matchedFiles": [
+        "src/legacy.tsx"
+      ]
+    }
+  ],
+  "compliance": {
+    "status": "non-compliant",
+    "compliant": false,
+    "counts": {
+      "errorRuleViolations": 6,
+      "releaseAgeViolations": 0,
+      "warningRuleViolations": 3
+    }
+  }
+}
+

--- target/stderr.txt
+++ current/stderr.txt
@@ -1,22 +1,6 @@
-file://<repo>/.output-review/reference/a36ae3d0fb5d7664d092c045ab56751d6799a942/dist/cli.mjs:824
-		return HermexConfigSchema.parse(mod.default);
-		                          ^
-
-ZodError: [
-  {
-    "code": "unrecognized_keys",
-    "keys": [
-      "require-repo-name-match"
-    ],
-    "path": [
-      "rules"
-    ],
-    "message": "Unrecognized key: /"require-repo-name-match/""
-  }
-]
-    at loadConfig (file://<repo>/.output-review/reference/a36ae3d0fb5d7664d092c045ab56751d6799a942/dist/cli.mjs:824:29)
-    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
-    at async Command.<anonymous> (file://<repo>/.output-review/reference/a36ae3d0fb5d7664d092c045ab56751d6799a942/dist/cli.mjs:2495:23)
-
-Node.js v26.8.1
+hermex v<version>
+- Parsing lockfile...
+✔ Found pnpm lockfile (supports: v5, v6, v9) - 2 packages
+✔ Found 3 files
+✔ Analysis complete! Analyzed 3/3 files
 


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
      "ruleId": "require-repo-name-match",
      "severity": "warn",
      "patterns": [],
      "message": "Package name must match the repository",
      "matchedFiles": [],
      "expectedName": "checkout-web",
      "actualName": "hermex-fixture-all-rule-types"
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
      "warningRuleViolations": 3
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