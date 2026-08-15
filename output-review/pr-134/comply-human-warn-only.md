---
layout: default
title: "comply-human-warn-only — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-human-warn-only`

_unchanged_

**Asserts** — Warn and info findings are reported but do not fail the build — verdict wording plus exit 0.

**Ran** `hermex comply --config configs/warn-only.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/warn-only.config.ts`](https://github.com/Gallevy/hermex/blob/d1546ffa23fdcf454c023617372e500ba3f06aa8/fixtures/configs/warn-only.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/d1546ffa23fdcf454c023617372e500ba3f06aa8/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/d1546ffa23fdcf454c023617372e500ba3f06aa8/fixtures/README.md)) · **Case** [`comply-human-warn-only`](https://github.com/Gallevy/hermex/blob/d1546ffa23fdcf454c023617372e500ba3f06aa8/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/d1546ffa23fdcf454c023617372e500ba3f06aa8/fixtures/cases/comply-human-warn-only.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-human-warn-only`</sub>

## Config

[`fixtures/configs/warn-only.config.ts`](https://github.com/Gallevy/hermex/blob/d1546ffa23fdcf454c023617372e500ba3f06aa8/fixtures/configs/warn-only.config.ts)

```ts
import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * The same rules as the primary config, none of them at `error`. Nothing
 * here can fail a build, so `comply` must exit 0 while still printing every
 * finding — and the verdict has to say "compliant" without pretending the
 * repo is clean. That wording is the whole point of the case.
 */
export default {
  ...base,
  rules: {
    'no-files': [
      {
        severity: 'warn',
        patterns: ['jest.config.*', '.babelrc'],
        message: 'Use vitest + Vite',
      },
    ],
    'no-packages': [
      { severity: 'warn', patterns: ['moment'], message: 'Use date-fns or dayjs' },
    ],
    'require-files': [
      { severity: 'warn', patterns: ['.nvmrc'] },
      { severity: 'info', patterns: ['.editorconfig'] },
    ],
    'require-packages': [
      {
        severity: 'info',
        patterns: ['typescript'],
        message: 'TypeScript is required',
      },
    ],
    'require-scripts': [
      {
        severity: 'warn',
        patterns: ['build', 'test'],
        message: 'Required npm scripts',
      },
    ],
    'require-package-fields': [{ severity: 'warn', patterns: ['engines', 'license'] }],
    'require-engine-version': { severity: 'info', range: '>=20', message: 'Minimum Node 20 required' },
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


🔍 Rules

┌──────────────────┬──────────────────────────────────────────────────────┐
│ Rule             │ Description                                          │
├──────────────────┼──────────────────────────────────────────────────────┤
│ no-packages      │ 🟡 moment is forbidden — Use date-fns or dayjs       │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require-packages │ 🔵 typescript not installed — TypeScript is required │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require-files    │ 🟡 .nvmrc not found                                  │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require-files    │ 🔵 .editorconfig not found                           │
└──────────────────┴──────────────────────────────────────────────────────┘

2 warnings

⚖️ Versus

  Design System Migration
  ──────────────────────────────────────────────────
  @design-system/foundation  ██████████████████████████████ 100.0% (33 usages)
  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (0 usages)


🟢 COMPLIANT
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}