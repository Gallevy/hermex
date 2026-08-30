---
layout: default
title: "release-age-root-scope — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `release-age-root-scope`

_changed_

**Asserts** — scope: root enforces only the direct copy, and still surfaces the overdue nested copy as an advisory breach rather than hiding it.

**Ran** `hermex comply` in `fixtures/repos/version-conflict` → exit 1, as asserted

**Config** [`fixtures/repos/version-conflict/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/7583d938f0f63304b219558ba789a91b0ed97036/fixtures/repos/version-conflict/hermex.config.ts) · **Fixture** [`fixtures/repos/version-conflict`](https://github.com/Gallevy/hermex/blob/7583d938f0f63304b219558ba789a91b0ed97036/fixtures/repos/version-conflict) ([overview](https://github.com/Gallevy/hermex/blob/7583d938f0f63304b219558ba789a91b0ed97036/fixtures/repos/version-conflict/README.md)) · **Case** [`release-age-root-scope`](https://github.com/Gallevy/hermex/blob/7583d938f0f63304b219558ba789a91b0ed97036/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/7583d938f0f63304b219558ba789a91b0ed97036/fixtures/cases/release-age-root-scope.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter release-age-root-scope`</sub>

## Config

[`fixtures/repos/version-conflict/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/7583d938f0f63304b219558ba789a91b0ed97036/fixtures/repos/version-conflict/hermex.config.ts)

```ts
import type { HermexConfigInput } from '../../../src/config/types.ts';

/**
 * `scope: 'root'` — the default. Only the direct dependency's own
 * resolution (react 18.3.1) counts toward the verdict; the nested
 * react 17.0.2 that `@hermex/legacy-widget` resolves for itself is still surfaced,
 * as an advisory breach, because an overdue nested copy must never be
 * silently invisible just because it cannot be fixed from here (#57).
 *
 * `./tree.config.ts` is the same repo under `scope: 'tree'`. The pair is
 * the only place the scope setting visibly changes a verdict.
 */
export default {
  releaseAge: {
    enabled: true,
    registry:
      process.env['HERMEX_FIXTURE_REGISTRY'] ?? 'https://registry.npmjs.org',
    cacheDisabled: true,
    thresholds: { patch: 30, minor: 45, major: 60 },
    // Only `react` is mandatory. `@hermex/legacy-widget` is looked up too
    // — every installed package is, since #171 — but lands at severity
    // 'warn', so it cannot affect the verdict and the diff against
    // `./tree.config.ts` stays purely about `scope`.
    enforceOn: ['react'],
    scope: 'root',
  },
  output: {
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
@@ -7,13 +7,13 @@
 
 📦 Packages
 
-┌───────────────────────┬───────────┬────────────────────────────────────┐
-│ Package               │ Installed │ Target                             │
-├───────────────────────┼───────────┼────────────────────────────────────┤
-│ @hermex/legacy-widget │ 1.0.0     │                                    │
-├───────────────────────┼───────────┼────────────────────────────────────┤
-│ react                 │ 18.3.1    │ 🔴 major 19.1.0 (340 days overdue) │
-└───────────────────────┴───────────┴────────────────────────────────────┘
+┌───────────────────────┬───────────┬──────────────────────────────────────────────────┐
+│ Package               │ Installed │ Target                                           │
+├───────────────────────┼───────────┼──────────────────────────────────────────────────┤
+│ @hermex/legacy-widget │ 1.0.0     │ 🟡 major 2.1.0 (240 days overdue) [not enforced] │
+├───────────────────────┼───────────┼──────────────────────────────────────────────────┤
+│ react                 │ 18.3.1    │ 🔴 major 19.1.0 (340 days overdue)               │
+└───────────────────────┴───────────┴──────────────────────────────────────────────────┘
 
 Notes:
   🔵 react → 2 versions installed (bundle impact): 17.0.2, 18.3.1 → 1 nested copy overdue, not enforced but recommended to resolve
```

## Full output

<details markdown="1"><summary><code>stdout.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 2 packages
✔ Found 3 files
✔ Analysis complete! Analyzed 3/3 files
✔ Release age fetched

📦 Packages

┌───────────────────────┬───────────┬──────────────────────────────────────────────────┐
│ Package               │ Installed │ Target                                           │
├───────────────────────┼───────────┼──────────────────────────────────────────────────┤
│ @hermex/legacy-widget │ 1.0.0     │ 🟡 major 2.1.0 (240 days overdue) [not enforced] │
├───────────────────────┼───────────┼──────────────────────────────────────────────────┤
│ react                 │ 18.3.1    │ 🔴 major 19.1.0 (340 days overdue)               │
└───────────────────────┴───────────┴──────────────────────────────────────────────────┘

Notes:
  🔵 react → 2 versions installed (bundle impact): 17.0.2, 18.3.1 → 1 nested copy overdue, not enforced but recommended to resolve

Total: 2 packages

🔴 Not compliant
  1 mandatory violation found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}