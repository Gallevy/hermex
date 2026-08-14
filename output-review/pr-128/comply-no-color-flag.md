---
layout: default
title: "comply-no-color-flag — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-no-color-flag`

_unchanged_

**Asserts** — --no-color wins over FORCE_COLOR, so the CI-facing output carries no escape sequences even on a colour-capable runner.

**Ran** `hermex comply --no-color` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/bed06809083bc7a4ca07fdffb9bf7d1ac6a72a58/fixtures/hermex.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/bed06809083bc7a4ca07fdffb9bf7d1ac6a72a58/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/bed06809083bc7a4ca07fdffb9bf7d1ac6a72a58/fixtures/README.md)) · **Case** [`comply-no-color-flag`](https://github.com/Gallevy/hermex/blob/bed06809083bc7a4ca07fdffb9bf7d1ac6a72a58/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/bed06809083bc7a4ca07fdffb9bf7d1ac6a72a58/fixtures/cases/comply-no-color-flag.md))

**Environment** `NO_COLOR` unset, `FORCE_COLOR=3`

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-no-color-flag`</sub>

## Config

[`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/bed06809083bc7a4ca07fdffb9bf7d1ac6a72a58/fixtures/hermex.config.ts)

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
  packages: {
    internal: ['@design-system/*'],
  },
  versus: [
    {
      name: 'Design System Migration',
      packages: ['@design-system/foundation', '@new-system/arc'],
    },
  ],
  rules: {
    detect_files: [
      {
        severity: 'error',
        patterns: ['jest.config.*', '.babelrc'],
        message: 'Use vitest + Vite',
      },
    ],
    forbid_packages: [
      { severity: 'error', patterns: ['moment'], message: 'Use date-fns or dayjs' },
    ],
    require_files: [
      { severity: 'error', patterns: ['.nvmrc'] },
      { severity: 'warn', patterns: ['.editorconfig'] },
    ],
    require_packages: [
      {
        severity: 'error',
        patterns: ['typescript'],
        message: 'TypeScript is required',
      },
    ],
    require_scripts: [
      {
        severity: 'error',
        patterns: ['build', 'test'],
        message: 'Required npm scripts',
      },
    ],
    require_package_fields: [{ severity: 'warn', patterns: ['engines', 'license'] }],
    engine_version: { severity: 'warn', range: '>=20', message: 'Minimum Node 20 required' },
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
│ forbid_packages  │ 🔴 moment is forbidden — Use date-fns or dayjs       │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require_packages │ 🔴 typescript not installed — TypeScript is required │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require_files    │ 🔴 .nvmrc not found                                  │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require_files    │ 🟡 .editorconfig not found                           │
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

<details markdown="1"><summary><code>stdout.ansi.txt</code></summary>

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
│ forbid_packages  │ 🔴 moment is forbidden — Use date-fns or dayjs       │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require_packages │ 🔴 typescript not installed — TypeScript is required │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require_files    │ 🔴 .nvmrc not found                                  │
├──────────────────┼──────────────────────────────────────────────────────┤
│ require_files    │ 🟡 .editorconfig not found                           │
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

{% endraw %}