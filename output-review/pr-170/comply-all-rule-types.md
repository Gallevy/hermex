---
layout: default
title: "comply-all-rule-types — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-all-rule-types`

_changed_

**Asserts** — Every one of the ten rule types in one table, at three severities — the only case that renders max-file-size, require-engine-version, codeowners and both package-field shapes.

**Ran** `hermex comply` in `fixtures/repos/all-rule-types` → exit 1, as asserted

**Config** [`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/8711e732c74ada2e469f633eb8958e91786af6ac/fixtures/repos/all-rule-types/hermex.config.ts) · **Fixture** [`fixtures/repos/all-rule-types`](https://github.com/Gallevy/hermex/blob/8711e732c74ada2e469f633eb8958e91786af6ac/fixtures/repos/all-rule-types) ([overview](https://github.com/Gallevy/hermex/blob/8711e732c74ada2e469f633eb8958e91786af6ac/fixtures/repos/all-rule-types/README.md)) · **Case** [`comply-all-rule-types`](https://github.com/Gallevy/hermex/blob/8711e732c74ada2e469f633eb8958e91786af6ac/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/8711e732c74ada2e469f633eb8958e91786af6ac/fixtures/cases/comply-all-rule-types.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-all-rule-types`</sub>

## Config

[`fixtures/repos/all-rule-types/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/8711e732c74ada2e469f633eb8958e91786af6ac/fixtures/repos/all-rule-types/hermex.config.ts)

```ts
import type { HermexConfigInput } from '../../../src/config/types.ts';

/**
 * Every rule type hermex has, all firing at once, at three different
 * severities. The primary fixture repo only ever trips three of the ten —
 * so without this repo the rules table has never been reviewed with an
 * `require-engine-version` row, a `require-codeowners` row, or either of the
 * package-field shapes in it, and nothing would catch a renderer that
 * mishandles `fieldPath` / `installedRange` / a long `matchedFiles` list.
 *
 * Scoped to `src/` so `jest.config.js` is found by `no-files` without
 * also being parsed as source — and so `assets/logo.svg`, which exists
 * purely to breach `max-file-size`, is never parsed either.
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
    // assets/logo.svg is 1410 bytes, so it clears the 1 KB ceiling. It is
    // written as a single line with no newline, which keeps its byte count
    // — and therefore the recorded size in this baseline — identical on
    // every checkout.
    'max-file-size': [
      {
        severity: 'warn',
        patterns: ['assets/**/*.svg'],
        maxSize: '1kb',
        message: 'Compress it or serve it from the CDN',
      },
    ],
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
--- target/stdout.txt
+++ current/stdout.txt
@@ -0,0 +1,40 @@
+hermex v<version>
+- Parsing lockfile...
+✔ Found pnpm lockfile (supports: v5, v6, v9) - 2 packages
+✔ Found 3 files
+✔ Analysis complete! Analyzed 3/3 files
+
+🔍 Rules
+
+┌────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────┐
+│ Rule                   │ Description                                                                                   │
+├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
+│ no-packages            │ 🔴 moment is forbidden — Use date-fns or dayjs                                                │
+├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
+│ require-packages       │ 🔴 typescript not installed — TypeScript is required                                          │
+├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
+│ no-files               │ 🔴 jest.config.*, .babelrc detected (jest.config.js, .babelrc) — Use vitest + Vite            │
+├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
+│ require-files          │ 🔴 .nvmrc not found                                                                           │
+├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
+│ require-scripts        │ 🔴 script build, test missing in package.json — Required npm scripts                          │
+├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
+│ require-engine-version │ 🔴 engines.node is >=16, required >=20 — Minimum Node 20 required                             │
+├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
+│ max-file-size          │ 🟡 assets/**/*.svg over 1 KB (logo.svg at 1.4 KB) — Compress it or serve it from the CDN      │
+├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
+│ package-fields         │ 🟡 field license missing in package.json                                                      │
+├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
+│ package-fields         │ 🟡 field publishConfig.registry is forbidden in package.json — Publish to the public registry │
+├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
+│ require-codeowners     │ 🔵 1 scanned file(s) have no owner: src/orphan.tsx — Every file needs a platform owner        │
+├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
+│ require-codeowners     │ 🔵 1 scanned file(s) have no owner: src/legacy.tsx — Every file needs a platform owner        │
+└────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────┘
+
+6 errors, 3 warnings, 2 info
+
+🔴 Not compliant
+  6 mandatory violations found
+
+

--- target/stderr.txt
+++ current/stderr.txt
@@ -1,22 +0,0 @@
-file://<repo>/.output-review/reference/99f0b37ed2b5e274d4a1fc8910e83e4da1acf41d/dist/cli.mjs:813
-		return HermexConfigSchema.parse(mod.default);
-		                          ^
-
-ZodError: [
-  {
-    "code": "unrecognized_keys",
-    "keys": [
-      "max-file-size"
-    ],
-    "path": [
-      "rules"
-    ],
-    "message": "Unrecognized key: /"max-file-size/""
-  }
-]
-    at loadConfig (file://<repo>/.output-review/reference/99f0b37ed2b5e274d4a1fc8910e83e4da1acf41d/dist/cli.mjs:813:29)
-    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
-    at async Command.<anonymous> (file://<repo>/.output-review/reference/99f0b37ed2b5e274d4a1fc8910e83e4da1acf41d/dist/cli.mjs:3130:23)
-
-Node.js v26.7.0
-
```

## Full output

<details markdown="1"><summary><code>stdout.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 2 packages
✔ Found 3 files
✔ Analysis complete! Analyzed 3/3 files

🔍 Rules

┌────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────┐
│ Rule                   │ Description                                                                                   │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ no-packages            │ 🔴 moment is forbidden — Use date-fns or dayjs                                                │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-packages       │ 🔴 typescript not installed — TypeScript is required                                          │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ no-files               │ 🔴 jest.config.*, .babelrc detected (jest.config.js, .babelrc) — Use vitest + Vite            │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-files          │ 🔴 .nvmrc not found                                                                           │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-scripts        │ 🔴 script build, test missing in package.json — Required npm scripts                          │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-engine-version │ 🔴 engines.node is >=16, required >=20 — Minimum Node 20 required                             │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ max-file-size          │ 🟡 assets/**/*.svg over 1 KB (logo.svg at 1.4 KB) — Compress it or serve it from the CDN      │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ package-fields         │ 🟡 field license missing in package.json                                                      │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ package-fields         │ 🟡 field publishConfig.registry is forbidden in package.json — Publish to the public registry │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-codeowners     │ 🔵 1 scanned file(s) have no owner: src/orphan.tsx — Every file needs a platform owner        │
├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
│ require-codeowners     │ 🔵 1 scanned file(s) have no owner: src/legacy.tsx — Every file needs a platform owner        │
└────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────┘

6 errors, 3 warnings, 2 info

🔴 Not compliant
  6 mandatory violations found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}