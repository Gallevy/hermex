---
layout: default
title: "comply-exit-2 — output review"
---

{% raw %}
[← all cases](./index.html)

# `comply-exit-2`

**unchanged**

**Asserts** — A pipeline failure (nothing matched `includes`) exits 2, not 1 — a consumer must be able to tell "could not run" from "not compliant".

**Ran** `hermex comply --config configs/no-files.config.ts` in `fixtures/` → exit 2, as asserted

**Config** [`fixtures/configs/no-files.config.ts`](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/configs/no-files.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/README.md)) · **Case** [`comply-exit-2`](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/cases/comply-exit-2.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-exit-2`</sub>

## Config

[`fixtures/configs/no-files.config.ts`](https://github.com/Gallevy/hermex/blob/8ee70b5ab91187f54976f1274c2479e5f8b1a78a/fixtures/configs/no-files.config.ts)

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

## Full output

<details><summary><code>stdout.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 5 packages
✖ No files found matching includes: no-such-directory/**/*.{tsx,jsx,ts,js}
```

</details>

<details><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}