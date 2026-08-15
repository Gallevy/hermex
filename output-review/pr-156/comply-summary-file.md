---
layout: default
title: "comply-summary-file — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-summary-file`

_unchanged_

**Asserts** — The markdown a consumer pastes into a PR comment or job summary — ANSI-free, rules + flagged packages + verdict.

**Ran** `hermex comply --summary-file $OUT/summary.md` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/b00e786b8709f4e455cdf3b0b27bb75ca754f2cd/fixtures/hermex.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/b00e786b8709f4e455cdf3b0b27bb75ca754f2cd/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/b00e786b8709f4e455cdf3b0b27bb75ca754f2cd/fixtures/README.md)) · **Case** [`comply-summary-file`](https://github.com/Gallevy/hermex/blob/b00e786b8709f4e455cdf3b0b27bb75ca754f2cd/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/b00e786b8709f4e455cdf3b0b27bb75ca754f2cd/fixtures/cases/comply-summary-file.md))

**Writes** `summary.md` into `$OUT` — captured and diffed the same as stdout

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-summary-file`</sub>

## Config

[`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/b00e786b8709f4e455cdf3b0b27bb75ca754f2cd/fixtures/hermex.config.ts)

```ts
import type { HermexConfigInput } from '../src/config/types.ts';

/**
 * The primary fixture repo's config: a deliberately non-compliant policy
 * over a deliberately messy repo, so `scan` and `comply` both have
 * something to say. Variants that change one thing at a time live in
 * `./configs/` and spread this object — see `fixtures/README.md`.
 */
export default {
  // Spelled out rather than left to the schema defaults because this repo
  // now contains fixture *machinery* alongside the code under analysis:
  // the case manifest, the alternate configs, the recorded registry
  // timelines, and the secondary repos that cases scan with their own cwd.
  // None of it is code this repo "uses", and without these entries the
  // primary output would grow rows every time a case is added.
  excludes: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    'cases.ts',
    'configs/**',
    'registry/**',
    'repos/**',
  ],
  versus: [
    {
      name: 'Design System Migration',
      packages: ['@design-system/foundation', '@new-system/arc'],
    },
  ],
  rules: {
    'no-files': [
      {
        severity: 'error',
        patterns: ['jest.config.*', '.babelrc'],
        message: 'Use vitest + Vite',
      },
    ],
    'no-packages': [
      { severity: 'error', patterns: ['moment'], message: 'Use date-fns or dayjs' },
    ],
    'require-files': [
      { severity: 'error', patterns: ['.nvmrc'] },
      { severity: 'warn', patterns: ['.editorconfig'] },
    ],
    'require-packages': [
      {
        severity: 'error',
        patterns: ['typescript'],
        message: 'TypeScript is required',
      },
    ],
    'require-scripts': [
      {
        severity: 'error',
        patterns: ['build', 'test'],
        message: 'Required npm scripts',
      },
    ],
    'require-package-fields': [{ severity: 'warn', patterns: ['engines', 'license'] }],
    'require-engine-version': { severity: 'warn', range: '>=20', message: 'Minimum Node 20 required' },
  },
  output: {
    details: false,
    patterns: false,
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
│ no-packages      │ 🔴 moment is forbidden — Use date-fns or dayjs       │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require-packages │ 🔴 typescript not installed — TypeScript is required │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require-files    │ 🔴 .nvmrc not found                                  │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require-files    │ 🟡 .editorconfig not found                           │
└──────────────────┴──────────────────────────────────────────────────────┘

3 errors, 1 warning

⚖️ Versus

  Design System Migration
  ──────────────────────────────────────────────────
  @design-system/foundation  ██████████████████████████████ 100.0% (33 usages)
  @new-system/arc            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.0% (0 usages)


🔴 NOT COMPLIANT
  3 mandatory violations found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

<details markdown="1"><summary><code>summary.md</code></summary>

```markdown
# Hermex Compliance Report

### Rules

| | Rule | Description |
|---|---|---|
| 🔴 | no-packages | moment is forbidden — Use date-fns or dayjs |
| 🔴 | require-packages | typescript not installed — TypeScript is required |
| 🔴 | require-files | .nvmrc not found |
| 🟡 | require-files | .editorconfig not found |

3 errors, 1 warning

### 🔴 NOT COMPLIANT

3 mandatory violations found
```

</details>

{% endraw %}