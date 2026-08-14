---
layout: default
title: "scan-human-minimal — output review"
---

{% raw %}
[← all cases](./index.html)

# `scan-human-minimal`

**changed: stdout.txt**

**Asserts** — Section toggles actually suppress output — every section off except the summary (#63).

**Ran** `hermex scan --config configs/minimal.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/minimal.config.ts`](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/configs/minimal.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/README.md)) · **Case** [`scan-human-minimal`](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/cases/scan-human-minimal.md))

**Must not appear anywhere in stdout** `📦 Packages`, `⚛️ Components`, `🔍 Rules`, `⚖️ Versus`

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-human-minimal`</sub>

## Config

[`fixtures/configs/minimal.config.ts`](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/configs/minimal.config.ts)

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
│ Files Analyzed      │ 17    │
├─────────────────────┼───────┤
│ Packages            │ 5     │
├─────────────────────┼───────┤
│ External Components │ 19    │
├─────────────────────┼───────┤
│ Total Usages        │ 36    │
└─────────────────────┴───────┘
```

</details>

<details><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}