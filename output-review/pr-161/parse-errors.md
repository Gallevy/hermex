---
layout: default
title: "parse-errors — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `parse-errors`

_unchanged_

**Asserts** — The parse-error report, scoped to a repo of nothing but an unparseable file so the block is not buried (#13).

**Ran** `hermex scan --config configs/parse-errors.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/parse-errors.config.ts`](https://github.com/Gallevy/hermex/blob/6c9b1964afc8bf2720b4b8172ef0a905f0d0cb6a/fixtures/configs/parse-errors.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/6c9b1964afc8bf2720b4b8172ef0a905f0d0cb6a/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/6c9b1964afc8bf2720b4b8172ef0a905f0d0cb6a/fixtures/README.md)) · **Case** [`parse-errors`](https://github.com/Gallevy/hermex/blob/6c9b1964afc8bf2720b4b8172ef0a905f0d0cb6a/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/6c9b1964afc8bf2720b4b8172ef0a905f0d0cb6a/fixtures/cases/parse-errors.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter parse-errors`</sub>

## Config

[`fixtures/configs/parse-errors.config.ts`](https://github.com/Gallevy/hermex/blob/6c9b1964afc8bf2720b4b8172ef0a905f0d0cb6a/fixtures/configs/parse-errors.config.ts)

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

## Full output

<details markdown="1"><summary><code>stdout.txt</code></summary>

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

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}