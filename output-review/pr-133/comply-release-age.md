---
layout: default
title: "comply-release-age — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-release-age`

_unchanged_

**Asserts** — The flagged-packages table, against a recorded registry: an overdue package with no in-window target (#26), one with a real target, and one merely coming due.

**Ran** `hermex comply --config configs/release-age.config.ts` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/configs/release-age.config.ts`](https://github.com/Gallevy/hermex/blob/cc5de874b6912859fa1eed2baa77d421648f2639/fixtures/configs/release-age.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/cc5de874b6912859fa1eed2baa77d421648f2639/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/cc5de874b6912859fa1eed2baa77d421648f2639/fixtures/README.md)) · **Case** [`comply-release-age`](https://github.com/Gallevy/hermex/blob/cc5de874b6912859fa1eed2baa77d421648f2639/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/cc5de874b6912859fa1eed2baa77d421648f2639/fixtures/cases/comply-release-age.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-release-age`</sub>

## Config

[`fixtures/configs/release-age.config.ts`](https://github.com/Gallevy/hermex/blob/cc5de874b6912859fa1eed2baa77d421648f2639/fixtures/configs/release-age.config.ts)

```ts
import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * Turns on the release-age policy, which is the only part of hermex that
 * reaches the network. `HERMEX_FIXTURE_REGISTRY` points it at the offline
 * registry `scripts/output-review.ts` serves from
 * `fixtures/registry/timelines.ts`; without the env var it falls back to
 * the real registry so the config is still runnable by hand.
 *
 * The cache is disabled deliberately: a warm `~/.hermex` entry from an
 * earlier run against the real registry would otherwise decide the output.
 */
export default {
  ...base,
  releaseAge: {
    enabled: true,
    registry:
      process.env['HERMEX_FIXTURE_REGISTRY'] ?? 'https://registry.npmjs.org',
    cacheDisabled: true,
    thresholds: { patch: 30, minor: 45, major: 60 },
    // Without `enforceOn`, only packages with measured usage are looked up
    // at all, which in this repo is `react` alone — `moment` and
    // `react-dom` are installed but never imported. Naming them here makes
    // all three targets *and* splits them across both severity tiers, since
    // a looked-up package that does not match `enforceOn` is advisory:
    //
    //   moment     enforced, overdue          → mandatory failure
    //   react-dom  enforced, coming due       → advisory "N days remaining"
    //   react      not enforced, overdue      → warning, does not fail comply
    enforceOn: ['moment', 'react-dom'],
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

✔ Release age fetched

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

┌─────────────────────────────────┬───────────┬───────────────────────────────────────────────────┐
│ Package                         │ Installed │ Target                                            │
├─────────────────────────────────┼───────────┼───────────────────────────────────────────────────┤
│ [int] @design-system/foundation │ 2.5.3     │                                                   │
├─────────────────────────────────┼───────────┼───────────────────────────────────────────────────┤
│ react                           │ 18.3.1    │ 🟡 major 19.1.0 (340 days overdue) [not enforced] │
├─────────────────────────────────┼───────────┼───────────────────────────────────────────────────┤
│ eslint                          │ N/A       │                                                   │
├─────────────────────────────────┼───────────┼───────────────────────────────────────────────────┤
│ [DEPRECATED] [BANNED] moment    │ 2.29.4    │ 🔴 minor 2.30.1 (no compliant release available)  │
├─────────────────────────────────┼───────────┼───────────────────────────────────────────────────┤
│ react-dom                       │ 18.3.1    │ 🔵 patch 18.3.2 (20 days remaining)               │
└─────────────────────────────────┴───────────┴───────────────────────────────────────────────────┘

Total: 5 packages

⚖️ Versus

  Design System Migration
  ──────────────────────────────────────────────────
  @design-system/foundation  ██████████████████████████████ 100.0% (33 usages)
  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (0 usages)


🔴 NOT COMPLIANT
  4 mandatory violations found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}