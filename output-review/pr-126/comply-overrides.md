---
layout: default
title: "comply-overrides — output review"
---

{% raw %}
[← all cases](./index.html)

# `comply-overrides`

_changed_

**Asserts** — Repo-scoped overrides re-scope severities: one rule downgraded to warn, one switched off and gone from the table.

**Ran** `hermex comply --config configs/overrides.config.ts` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/configs/overrides.config.ts`](https://github.com/Gallevy/hermex/blob/f2199f556fd66b23e3a3183c44943f03f9c57c29/fixtures/configs/overrides.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/f2199f556fd66b23e3a3183c44943f03f9c57c29/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/f2199f556fd66b23e3a3183c44943f03f9c57c29/fixtures/README.md)) · **Case** [`comply-overrides`](https://github.com/Gallevy/hermex/blob/f2199f556fd66b23e3a3183c44943f03f9c57c29/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/f2199f556fd66b23e3a3183c44943f03f9c57c29/fixtures/cases/comply-overrides.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-overrides`</sub>

## Config

[`fixtures/configs/overrides.config.ts`](https://github.com/Gallevy/hermex/blob/f2199f556fd66b23e3a3183c44943f03f9c57c29/fixtures/configs/overrides.config.ts)

```ts
import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * Repo-scoped rule adjustments. `match` is checked against the current
 * repo's package.json "name", which for the primary fixture repo is
 * `hermex-fixtures`, so both entries below apply and the rules table has to
 * show the *resolved* severities rather than the ones authored in the base
 * config:
 *
 * - `no-packages` on `moment` drops from error to warn.
 * - `require-files` on `.editorconfig` is switched off entirely and must
 *   disappear from the output, not appear greyed out.
 *
 * The remaining error-severity rules are left alone on purpose — an
 * override that made the repo compliant would prove the rules vanished, not
 * that they were re-scoped.
 */
export default {
  ...base,
  overrides: [
    {
      match: ['hermex-fixtures'],
      rules: {
        'no-packages': {
          severity: 'warn',
          patterns: ['moment'],
          message: 'Use date-fns or dayjs (scheduled for removal)',
        },
        'require-files': { severity: 'off', patterns: ['.editorconfig'] },
      },
    },
  ],
} satisfies HermexConfigInput;
```

## Diff against the committed baseline

<sub>Diffs are unified format: `-` is the committed baseline, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the baseline and 9 lines from line 12 of this run — which is where to look in `tests/__output_baselines__/`.</sub>

```diff
--- baseline/stdout.txt
+++ current/stdout.txt
@@ -22,11 +22,11 @@
 ┌──────────────────┬────────────────────────────────────────────────────────────────────────┐
 │ Rule             │ Description                                                            │
 ├──────────────────┼────────────────────────────────────────────────────────────────────────┤
-│ forbid_packages  │ 🟡 moment is forbidden — Use date-fns or dayjs (scheduled for removal) │
+│ no-packages      │ 🟡 moment is forbidden — Use date-fns or dayjs (scheduled for removal) │
 ├──────────────────┼────────────────────────────────────────────────────────────────────────┤
-│ require_packages │ 🔴 typescript not installed — TypeScript is required                   │
+│ require-packages │ 🔴 typescript not installed — TypeScript is required                   │
 ├──────────────────┼────────────────────────────────────────────────────────────────────────┤
-│ require_files    │ 🔴 .nvmrc not found                                                    │
+│ require-files    │ 🔴 .nvmrc not found                                                    │
 └──────────────────┴────────────────────────────────────────────────────────────────────────┘
 
 2 errors, 1 warning
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


🔍 Rules

┌──────────────────┬────────────────────────────────────────────────────────────────────────┐
│ Rule             │ Description                                                            │
├──────────────────┼────────────────────────────────────────────────────────────────────────┤
│ no-packages      │ 🟡 moment is forbidden — Use date-fns or dayjs (scheduled for removal) │
├──────────────────┼────────────────────────────────────────────────────────────────────────┤
│ require-packages │ 🔴 typescript not installed — TypeScript is required                   │
├──────────────────┼────────────────────────────────────────────────────────────────────────┤
│ require-files    │ 🔴 .nvmrc not found                                                    │
└──────────────────┴────────────────────────────────────────────────────────────────────────┘

2 errors, 1 warning

⚖️ Versus

  Design System Migration
  ──────────────────────────────────────────────────
  @design-system/foundation  ██████████████████████████████ 100.0% (33 usages)
  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (0 usages)


🔴 NOT COMPLIANT
  2 mandatory violations found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}