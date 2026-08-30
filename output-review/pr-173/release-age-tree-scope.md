---
layout: default
title: "release-age-tree-scope — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `release-age-tree-scope`

_changed_

**Asserts** — scope: tree enforces every resolved copy, so the nested version becomes the mandatory failure and the reported installed version follows it.

**Ran** `hermex comply --config tree.config.ts` in `fixtures/repos/version-conflict` → exit 1, as asserted

**Config** [`fixtures/repos/version-conflict/tree.config.ts`](https://github.com/Gallevy/hermex/blob/12b6cf0f26fefa195673664f01b7e1658337f8bb/fixtures/repos/version-conflict/tree.config.ts) · **Fixture** [`fixtures/repos/version-conflict`](https://github.com/Gallevy/hermex/blob/12b6cf0f26fefa195673664f01b7e1658337f8bb/fixtures/repos/version-conflict) ([overview](https://github.com/Gallevy/hermex/blob/12b6cf0f26fefa195673664f01b7e1658337f8bb/fixtures/repos/version-conflict/README.md)) · **Case** [`release-age-tree-scope`](https://github.com/Gallevy/hermex/blob/12b6cf0f26fefa195673664f01b7e1658337f8bb/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/12b6cf0f26fefa195673664f01b7e1658337f8bb/fixtures/cases/release-age-tree-scope.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter release-age-tree-scope`</sub>

## Config

[`fixtures/repos/version-conflict/tree.config.ts`](https://github.com/Gallevy/hermex/blob/12b6cf0f26fefa195673664f01b7e1658337f8bb/fixtures/repos/version-conflict/tree.config.ts)

```ts
import type { HermexConfigInput } from '../../../src/config/types.ts';
import base from './hermex.config.ts';

/**
 * `scope: 'tree'` — every resolved copy is enforced, so the ancient nested
 * react 17.0.2 becomes a mandatory failure rather than advisory context,
 * and the reported installed version is the worst copy rather than the
 * direct one. Everything else is identical to `./hermex.config.ts`, so the
 * diff between the two baselines is exactly what `scope` does.
 */
export default {
  ...base,
  releaseAge: { ...base.releaseAge, scope: 'tree' },
} satisfies HermexConfigInput;
```

## Diff against the target branch

<sub>Diffs are unified format: `-` is the target branch, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the target branch and 9 lines from line 12 of this run.</sub>

```diff
--- target/stdout.txt
+++ current/stdout.txt
@@ -3,7 +3,7 @@
 ✔ Found pnpm lockfile (supports: v5, v6, v9) - 2 packages
 ✔ Found 3 files
 ✔ Analysis complete! Analyzed 3/3 files
-✔ Release age fetched
+✔ Release age fetched (1 packages skipped — registry unreachable or not found)
 
 📦 Packages
 
```

## Full output

<details markdown="1"><summary><code>stdout.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 2 packages
✔ Found 3 files
✔ Analysis complete! Analyzed 3/3 files
✔ Release age fetched (1 packages skipped — registry unreachable or not found)

📦 Packages

┌───────────────┬───────────┬────────────────────────────────────┐
│ Package       │ Installed │ Target                             │
├───────────────┼───────────┼────────────────────────────────────┤
│ legacy-widget │ 1.0.0     │                                    │
├───────────────┼───────────┼────────────────────────────────────┤
│ react         │ 17.0.2    │ 🔴 major 19.1.0 (640 days overdue) │
└───────────────┴───────────┴────────────────────────────────────┘

Notes:
  🔵 react → 2 versions installed (bundle impact): 17.0.2, 18.3.1

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