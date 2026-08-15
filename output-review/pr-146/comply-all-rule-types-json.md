---
layout: default
title: "comply-all-rule-types-json — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-all-rule-types-json`

_changed_

**Asserts** — The machine-readable shape of every rule type: fieldPath and actualValue on package-field hits, installedRange/requiredRange on require-engine-version, matchedFiles on codeowners. Also where #95 is visible — the two codeowners entries are byte-identical apart from matchedFiles.

**Ran** `hermex comply --format json` in `fixtures/repos/all-rule-types` → exit 1, as asserted

**Config** [`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/c4158dbfe815952becdc52a8f4a7df4e756b462f/fixtures/repos/all-rule-types/hermex.config.ts) · **Fixture** [`fixtures/repos/all-rule-types`](https://github.com/Gallevy/hermex/blob/c4158dbfe815952becdc52a8f4a7df4e756b462f/fixtures/repos/all-rule-types) ([overview](https://github.com/Gallevy/hermex/blob/c4158dbfe815952becdc52a8f4a7df4e756b462f/fixtures/repos/all-rule-types/README.md)) · **Case** [`comply-all-rule-types-json`](https://github.com/Gallevy/hermex/blob/c4158dbfe815952becdc52a8f4a7df4e756b462f/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/c4158dbfe815952becdc52a8f4a7df4e756b462f/fixtures/cases/comply-all-rule-types-json.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-all-rule-types-json`</sub>

## Config

[`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/c4158dbfe815952becdc52a8f4a7df4e756b462f/fixtures/repos/all-rule-types/hermex.config.ts)

```ts
import type { HermexConfigInput } from '../../../src/config/types.ts';

/**
 * Every rule type hermex has, all firing at once, at three different
 * severities. The primary fixture repo only ever trips three of the nine —
 * so without this repo the rules table has never been reviewed with an
 * `require-engine-version` row, a `require-codeowners` row, or either of the
 * package-field shapes in it, and nothing would catch a renderer that
 * mishandles `fieldPath` / `installedRange` / a long `matchedFiles` list.
 *
 * Scoped to `src/` so `jest.config.js` is found by `no-files` without
 * also being parsed as source.
 */
export default {
  includes: ['src/**/*.{tsx,jsx,ts,js}'],
  rules: {
    'no-files': [
      {
        severity: 'error',
        patterns: ['jest.config.*', '.babelrc'],
        message: 'Use vitest + Vite',
      },
    ],
    'require-files': [{ severity: 'error', patterns: ['.nvmrc'] }],
    'no-packages': [
      { severity: 'error', patterns: ['moment'], message: 'Use date-fns or dayjs' },
    ],
    'require-packages': [
      { severity: 'error', patterns: ['typescript'], message: 'TypeScript is required' },
    ],
    'require-scripts': [
      { severity: 'error', patterns: ['build', 'test'], message: 'Required npm scripts' },
    ],
    // Missing outright, so the violation reports the absence.
    'require-package-fields': [{ severity: 'warn', patterns: ['license'] }],
    // Present, so the violation reports the offending value — the other
    // half of the package-field renderer.
    'no-package-fields': [
      {
        severity: 'warn',
        patterns: ['publishConfig.registry'],
        message: 'Publish to the public registry',
      },
    ],
    // engines.node is ">=16", so this reports both ranges rather than the
    // "not specified" shape.
    'require-engine-version': { severity: 'error', range: '>=20', message: 'Minimum Node 20 required' },
    // CODEOWNERS covers two of the three scanned files, and one of those
    // belongs to a team outside `requiredOwners` — so this produces both
    // codeowners violations, unowned and wrong-owner.
    //
    // The baseline currently describes both as "have no owner", which is
    // wrong for src/legacy.tsx: it has an owner, just not a required one.
    // That is #95, left unfixed on purpose — the recorded output is the
    // evidence, and refreshing this baseline is how the fix gets reviewed.
    'require-codeowners': {
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

## Diff against the target branch

<sub>Diffs are unified format: `-` is the target branch, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the target branch and 9 lines from line 12 of this run.</sub>

```diff
--- target/stdout.json
+++ current/stdout.json
@@ -58,6 +58,15 @@
       "matchedFiles": []
     },
     {
+      "ruleId": "require-engine-version",
+      "severity": "error",
+      "patterns": [],
+      "message": "Minimum Node 20 required",
+      "matchedFiles": [],
+      "installedRange": ">=16",
+      "requiredRange": ">=20"
+    },
+    {
       "ruleId": "require-package-fields",
       "severity": "warn",
       "patterns": [
@@ -77,15 +86,6 @@
       "actualValue": "https://npm.internal.example.com"
     },
     {
-      "ruleId": "require-engine-version",
-      "severity": "error",
-      "patterns": [],
-      "message": "Minimum Node 20 required",
-      "matchedFiles": [],
-      "installedRange": ">=16",
-      "requiredRange": ">=20"
-    },
-    {
       "ruleId": "require-codeowners",
       "severity": "info",
       "patterns": [
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