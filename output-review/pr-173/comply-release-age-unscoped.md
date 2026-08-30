---
layout: default
title: "comply-release-age-unscoped — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-release-age-unscoped`

_changed_

**Asserts** — An empty enforceOn enforces nothing rather than everything: every installed package is still fetched and reported, every release-age row is advisory, and the exit code comes from rule violations alone. Includes moment — declared, installed, never imported — which was invisible to release age before #171.

**Ran** `hermex comply --config configs/release-age-unscoped.config.ts` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/configs/release-age-unscoped.config.ts`](https://github.com/Gallevy/hermex/blob/7583d938f0f63304b219558ba789a91b0ed97036/fixtures/configs/release-age-unscoped.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/7583d938f0f63304b219558ba789a91b0ed97036/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/7583d938f0f63304b219558ba789a91b0ed97036/fixtures/README.md)) · **Case** [`comply-release-age-unscoped`](https://github.com/Gallevy/hermex/blob/7583d938f0f63304b219558ba789a91b0ed97036/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/7583d938f0f63304b219558ba789a91b0ed97036/fixtures/cases/comply-release-age-unscoped.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-release-age-unscoped`</sub>

## Config

[`fixtures/configs/release-age-unscoped.config.ts`](https://github.com/Gallevy/hermex/blob/7583d938f0f63304b219558ba789a91b0ed97036/fixtures/configs/release-age-unscoped.config.ts)

```ts
import type { HermexConfigInput } from '../../src/config/types.ts';
import base from './release-age.config.ts';

/**
 * The same release-age policy as `./release-age.config.ts`, with `enforceOn`
 * emptied — the default.
 *
 * `enforceOn` is a plain glob list of the mandatory packages, so an empty
 * one matches nothing and enforces nothing. Every installed package is
 * still fetched and still reported; none of them can fail `comply`. The
 * case therefore exits 1 purely on its rule violations, with every
 * release-age row advisory.
 *
 * The diff against `./release-age.config.ts`'s baseline is exactly what
 * naming a package buys you: the same packages checked either way, split
 * across two severity tiers there and all advisory here.
 *
 * This is also the only case covering the empty-`enforceOn` path at all,
 * which is where #171 could have changed a verdict — enrichment used to be
 * gated on JSX component usage, so `moment` (declared, installed, never
 * imported) was never looked up. It is looked up now, and stays advisory
 * because nothing names it.
 */
export default {
  ...base,
  releaseAge: { ...base.releaseAge, enforceOn: [] },
} satisfies HermexConfigInput;
```

## Diff against the target branch

<sub>Diffs are unified format: `-` is the target branch, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the target branch and 9 lines from line 12 of this run.</sub>

```diff
--- target/stdout.txt
+++ current/stdout.txt
@@ -36,19 +36,19 @@
 
 📦 Packages
 
-┌───────────────────────────┬───────────┬────────────────────────────────────┐
-│ Package                   │ Installed │ Target                             │
-├───────────────────────────┼───────────┼────────────────────────────────────┤
-│ @design-system/foundation │ 2.5.3     │                                    │
-├───────────────────────────┼───────────┼────────────────────────────────────┤
-│ react                     │ 18.3.1    │ 🔴 major 19.1.0 (340 days overdue) │
-├───────────────────────────┼───────────┼────────────────────────────────────┤
-│ eslint                    │ N/A       │                                    │
-├───────────────────────────┼───────────┼────────────────────────────────────┤
-│ [BANNED] moment           │ 2.29.4    │                                    │
-├───────────────────────────┼───────────┼────────────────────────────────────┤
-│ react-dom                 │ 18.3.1    │                                    │
-└───────────────────────────┴───────────┴────────────────────────────────────┘
+┌──────────────────────────────┬───────────┬─────────────────────────────────────────────────────────────────┐
+│ Package                      │ Installed │ Target                                                          │
+├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
+│ @design-system/foundation    │ 2.5.3     │                                                                 │
+├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
+│ react                        │ 18.3.1    │ 🟡 major 19.1.0 (340 days overdue) [not enforced]               │
+├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
+│ eslint                       │ N/A       │                                                                 │
+├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
+│ [DEPRECATED] [BANNED] moment │ 2.29.4    │ 🟡 minor 2.30.1 (no compliant release available) [not enforced] │
+├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
+│ react-dom                    │ 18.3.1    │ 🔵 patch 18.3.2 (20 days remaining)                             │
+└──────────────────────────────┴───────────┴─────────────────────────────────────────────────────────────────┘
 
 Total: 5 packages
 
@@ -61,6 +61,6 @@
 
 
 🔴 Not compliant
-  4 mandatory violations found
+  3 mandatory violations found
 
 
```

## Full output

<details markdown="1"><summary><code>stdout.txt</code></summary>

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

✔ Release age fetched (1 packages skipped — registry unreachable or not found)

🔍 Rules

┌──────────────────┬──────────────────────────────────────────────────────┐
│ Rule             │ Description                                          │
├──────────────────┼──────────────────────────────────────────────────────┤
│ no-packages      │ 🔴 moment is forbidden — Use date-fns or dayjs       │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require-packages │ 🔴 typescript not installed — TypeScript is required │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require-files    │ 🔴 .nvmrc not found                                  │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require-files    │ 🟡 .editorconfig not found                           │
└──────────────────┴──────────────────────────────────────────────────────┘

3 errors, 1 warning

📦 Packages

┌──────────────────────────────┬───────────┬─────────────────────────────────────────────────────────────────┐
│ Package                      │ Installed │ Target                                                          │
├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ @design-system/foundation    │ 2.5.3     │                                                                 │
├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ react                        │ 18.3.1    │ 🟡 major 19.1.0 (340 days overdue) [not enforced]               │
├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ eslint                       │ N/A       │                                                                 │
├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ [DEPRECATED] [BANNED] moment │ 2.29.4    │ 🟡 minor 2.30.1 (no compliant release available) [not enforced] │
├──────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────────┤
│ react-dom                    │ 18.3.1    │ 🔵 patch 18.3.2 (20 days remaining)                             │
└──────────────────────────────┴───────────┴─────────────────────────────────────────────────────────────────┘

Total: 5 packages

⚖️ Versus

  Design System Migration
  ──────────────────────────────────────────────────
  @design-system/foundation  ██████████████████████████████ 100.0% (33 usages)
  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (0 usages)


🔴 Not compliant
  3 mandatory violations found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}