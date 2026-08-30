---
layout: default
title: "scan-human-charts — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `scan-human-charts`

_unchanged_

**Asserts** — The bar-chart renderer: bar scaling and label alignment for packages, components and patterns.

**Ran** `hermex scan --config configs/charts.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/charts.config.ts`](https://github.com/Gallevy/hermex/blob/8d52322e5bae42e0cd975dbf6d5d297b95bc6a1f/fixtures/configs/charts.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/8d52322e5bae42e0cd975dbf6d5d297b95bc6a1f/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/8d52322e5bae42e0cd975dbf6d5d297b95bc6a1f/fixtures/README.md)) · **Case** [`scan-human-charts`](https://github.com/Gallevy/hermex/blob/8d52322e5bae42e0cd975dbf6d5d297b95bc6a1f/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/8d52322e5bae42e0cd975dbf6d5d297b95bc6a1f/fixtures/cases/scan-human-charts.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-human-charts`</sub>

## Config

[`fixtures/configs/charts.config.ts`](https://github.com/Gallevy/hermex/blob/8d52322e5bae42e0cd975dbf6d5d297b95bc6a1f/fixtures/configs/charts.config.ts)

```ts
import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * The bar-chart renderer instead of tables, for all three sections that
 * can render either way. Bar widths are derived from the largest value in
 * each section, so this is the case that catches scaling and label
 * alignment regressions.
 */
export default {
  ...base,
  output: {
    summary: 'log',
    packages: 'chart',
    components: 'chart',
    patterns: 'chart',
    details: false,
    versus: true,
    rules: true,
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


📦 Packages

@design-system/foundation ████████████████████████████████████████ 91.7% (33)
react                     ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 8.3% (3)

⚖️ Versus

  Design System Migration
  ──────────────────────────────────────────────────
  @design-system/foundation  ██████████████████████████████ 100.0% (33 usages)
  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (0 usages)


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

⚛️ Components

Button              ██████████████████████████████████████████████████ 6

Input               ██████████████████████████████████████████░░░░░░░░ 5

Card                █████████████████████████████████░░░░░░░░░░░░░░░░░ 4

Typography          █████████████████████████████████░░░░░░░░░░░░░░░░░ 4

Suspense            █████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░ 3

Icon                ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

Modal               ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseChild           ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseCond            ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseMap             ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseVar             ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseReturn          ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

Child               ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseAttr            ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseAttrSelfClosing ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseAttrCond        ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseAttrHost        ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseAttrFragment    ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1

CaseBoth            ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1


🧩 Code Patterns

JSX Usage               ██████████████████████████████████████████████████ 64

Props Analyzed          ██████████████████████████████████████████████████ 64

Default Imports         ██████████████████████████████░░░░░░░░░░░░░░░░░░░░ 39

Named Imports           █████████████████████████████░░░░░░░░░░░░░░░░░░░░░ 37

Object Mappings         ███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 19

Dynamic Imports         ███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 19

Variable Assignments    ███████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9

Conditional Usage       █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 7

Named Imports (aliased) █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 6

Lazy Loading            █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 6

Higher-Order Components ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 5

Namespace Imports       ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 4

Destructuring           ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2

Array Mappings          ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2

Portal Usage            █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1


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