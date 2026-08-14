---
layout: default
title: "scan-no-files — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `scan-no-files`

_changed_

**Asserts** — The same pipeline failure under `scan` reports the problem and exits 0 — the deliberate asymmetry with comply-exit-2, kept visible so it cannot drift unnoticed.

**Ran** `hermex scan --config configs/no-files.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/no-files.config.ts`](https://github.com/Gallevy/hermex/blob/bed06809083bc7a4ca07fdffb9bf7d1ac6a72a58/fixtures/configs/no-files.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/bed06809083bc7a4ca07fdffb9bf7d1ac6a72a58/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/bed06809083bc7a4ca07fdffb9bf7d1ac6a72a58/fixtures/README.md)) · **Case** [`scan-no-files`](https://github.com/Gallevy/hermex/blob/bed06809083bc7a4ca07fdffb9bf7d1ac6a72a58/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/bed06809083bc7a4ca07fdffb9bf7d1ac6a72a58/fixtures/cases/scan-no-files.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-no-files`</sub>

## Config

[`fixtures/configs/no-files.config.ts`](https://github.com/Gallevy/hermex/blob/bed06809083bc7a4ca07fdffb9bf7d1ac6a72a58/fixtures/configs/no-files.config.ts)

```ts
import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * `includes` that match nothing. The pipeline bails before analysis, which
 * `comply` reports as exit **2** — pipeline failure, distinct from exit 1
 * (non-compliant). A consumer that treats any non-zero exit as "policy
 * violation" would report a clean repo as failing, so the two codes need to
 * stay distinguishable and reviewed.
 *
 * `scan` takes the same path and exits 0. That asymmetry is deliberate but
 * easy to break, which is why both halves are cases.
 */
export default {
  ...base,
  includes: ['no-such-directory/**/*.{tsx,jsx,ts,js}'],
} satisfies HermexConfigInput;
```

## Diff against the committed baseline

<sub>Diffs are unified format: `-` is the committed baseline, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the baseline and 9 lines from line 12 of this run — which is where to look in `tests/__output_baselines__/`.</sub>

```diff
--- baseline/stdout.txt
+++ current/stdout.txt
@@ -2,5 +2,4 @@
 - Parsing lockfile...
 ✔ Found pnpm lockfile (supports: v5, v6, v9) - 5 packages
 ✖ No files found matching includes: no-such-directory/**/*.{tsx,jsx,ts,js}
-test line for gate verification
 
```

## Full output

<details markdown="1"><summary><code>stdout.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 5 packages
✖ No files found matching includes: no-such-directory/**/*.{tsx,jsx,ts,js}
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}