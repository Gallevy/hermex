---
layout: default
title: "scan-human-default — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `scan-human-default`

_unchanged_

**Asserts** — Baseline human output: the sections a repo gets with no output config of its own.

**Ran** `hermex scan` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/d4279729eb52bcc54c61d0261d6689de8924f185/fixtures/hermex.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/d4279729eb52bcc54c61d0261d6689de8924f185/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/d4279729eb52bcc54c61d0261d6689de8924f185/fixtures/README.md)) · **Case** [`scan-human-default`](https://github.com/Gallevy/hermex/blob/d4279729eb52bcc54c61d0261d6689de8924f185/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/d4279729eb52bcc54c61d0261d6689de8924f185/fixtures/cases/scan-human-default.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-human-default`</sub>

## Config

[`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/d4279729eb52bcc54c61d0261d6689de8924f185/fixtures/hermex.config.ts)

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


📦 Packages

┌───────────────────────────┬─────────┐
│ Package                   │ Version │
├───────────────────────────┼─────────┤
│ @design-system/foundation │ 2.5.3   │
├───────────────────────────┼─────────┤
│ react                     │ 18.3.1  │
├───────────────────────────┼─────────┤
│ eslint                    │ N/A     │
├───────────────────────────┼─────────┤
│ [BANNED] moment           │ 2.29.4  │
├───────────────────────────┼─────────┤
│ react-dom                 │ 18.3.1  │
└───────────────────────────┴─────────┘

Total: 5 packages

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

┌─────────────────────┬───────────────────────────┬───────┐
│ Component           │ Package                   │ Count │
├─────────────────────┼───────────────────────────┼───────┤
│ Button              │ @design-system/foundation │ 6     │
├─────────────────────┼───────────────────────────┼───────┤
│ Input               │ @design-system/foundation │ 5     │
├─────────────────────┼───────────────────────────┼───────┤
│ Card                │ @design-system/foundation │ 4     │
├─────────────────────┼───────────────────────────┼───────┤
│ Typography          │ @design-system/foundation │ 4     │
├─────────────────────┼───────────────────────────┼───────┤
│ Suspense            │ react                     │ 3     │
├─────────────────────┼───────────────────────────┼───────┤
│ Icon                │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ Modal               │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseChild           │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseCond            │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseMap             │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseVar             │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseReturn          │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ Child               │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseAttr            │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseAttrSelfClosing │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseAttrCond        │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseAttrHost        │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseAttrFragment    │ @design-system/foundation │ 1     │
├─────────────────────┼───────────────────────────┼───────┤
│ CaseBoth            │ @design-system/foundation │ 1     │
└─────────────────────┴───────────────────────────┴───────┘

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