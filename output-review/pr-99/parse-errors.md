---
layout: default
title: "parse-errors — output review"
---

{% raw %}
[← all cases](./index.html)

# `parse-errors`

**changed: stdout.txt**

**Asserts** — The parse-error report, scoped to a repo of nothing but an unparseable file so the block is not buried (#13).

**Ran** `hermex scan --config configs/parse-errors.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/parse-errors.config.ts`](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/configs/parse-errors.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/README.md)) · **Case** [`parse-errors`](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/cases/parse-errors.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter parse-errors`</sub>

## Config

[`fixtures/configs/parse-errors.config.ts`](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/configs/parse-errors.config.ts)

```ts
import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * Scopes the scan to `fixtures/broken/` so the parse-error report is the
 * whole output instead of three lines buried above the packages table
 * (#13). Everything else is off for the same reason.
 */
export default {
  ...base,
  includes: ['broken/**/*.{tsx,jsx,ts,js}'],
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

## Diff against the committed baseline

<sub>Diffs are unified format: `-` is the committed baseline, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the baseline and 9 lines from line 12 of this run — which is where to look in `tests/__output_baselines__/`.</sub>

```diff
--- baseline/stdout.txt
+++ current/stdout.txt
@@ -17,6 +17,24 @@
     Syntax Error
 
 
+📦 Packages
+
+┌─────────────────────────────────┬─────────┐
+│ Package                         │ Version │
+├─────────────────────────────────┼─────────┤
+│ [int] @design-system/foundation │ 2.5.3   │
+├─────────────────────────────────┼─────────┤
+│ react                           │ 18.3.1  │
+├─────────────────────────────────┼─────────┤
+│ eslint                          │ N/A     │
+├─────────────────────────────────┼─────────┤
+│ [BANNED] moment                 │ 2.29.4  │
+├─────────────────────────────────┼─────────┤
+│ react-dom                       │ 18.3.1  │
+└─────────────────────────────────┴─────────┘
+
+Total: 5 packages
+
 📊 Summary
 
 ┌─────────────────────┬───────┐
```

## Full output

<details><summary><code>stdout.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 5 packages
✔ Found 1 files
✔ Analysis complete! Analyzed 0/1 files

⚠ 1 file(s) failed to parse:
  broken/unparseable.tsx
      x Expression expected
   ,----
 1 | export const Broken = ( : : :;
   :                         ^
   `----


Caused by:
    Syntax Error


📦 Packages

┌─────────────────────────────────┬─────────┐
│ Package                         │ Version │
├─────────────────────────────────┼─────────┤
│ [int] @design-system/foundation │ 2.5.3   │
├─────────────────────────────────┼─────────┤
│ react                           │ 18.3.1  │
├─────────────────────────────────┼─────────┤
│ eslint                          │ N/A     │
├─────────────────────────────────┼─────────┤
│ [BANNED] moment                 │ 2.29.4  │
├─────────────────────────────────┼─────────┤
│ react-dom                       │ 18.3.1  │
└─────────────────────────────────┴─────────┘

Total: 5 packages

📊 Summary

┌─────────────────────┬───────┐
│ Metric              │ Count │
├─────────────────────┼───────┤
│ Files Analyzed      │ 0     │
├─────────────────────┼───────┤
│ Packages            │ 5     │
├─────────────────────┼───────┤
│ External Components │ 0     │
├─────────────────────┼───────┤
│ Total Usages        │ 0     │
└─────────────────────┴───────┘
```

</details>

<details><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}