---
layout: default
title: "scan-human-minimal — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `scan-human-minimal`

_unchanged_

**Asserts** — Section toggles actually suppress output — every section off except the summary (#63).

**Ran** `hermex scan --config configs/minimal.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/minimal.config.ts`](https://github.com/Gallevy/hermex/blob/d1546ffa23fdcf454c023617372e500ba3f06aa8/fixtures/configs/minimal.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/d1546ffa23fdcf454c023617372e500ba3f06aa8/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/d1546ffa23fdcf454c023617372e500ba3f06aa8/fixtures/README.md)) · **Case** [`scan-human-minimal`](https://github.com/Gallevy/hermex/blob/d1546ffa23fdcf454c023617372e500ba3f06aa8/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/d1546ffa23fdcf454c023617372e500ba3f06aa8/fixtures/cases/scan-human-minimal.md))

**Must not appear anywhere in stdout** `📦 Packages`, `⚛️ Components`, `🔍 Rules`, `⚖️ Versus`

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-human-minimal`</sub>

## Config

[`fixtures/configs/minimal.config.ts`](https://github.com/Gallevy/hermex/blob/d1546ffa23fdcf454c023617372e500ba3f06aa8/fixtures/configs/minimal.config.ts)

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

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}