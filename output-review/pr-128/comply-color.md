---
layout: default
title: "comply-color — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-color`

_unchanged_

**Asserts** — The coloured path a developer actually sees in a terminal. Captured raw, so escape sequences are part of the diff.

**Ran** `hermex comply` in `fixtures/` → exit 1, as asserted

**Config** [`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/87f87aa56bbc9274b142737d001961e4bda7309f/fixtures/hermex.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/87f87aa56bbc9274b142737d001961e4bda7309f/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/87f87aa56bbc9274b142737d001961e4bda7309f/fixtures/README.md)) · **Case** [`comply-color`](https://github.com/Gallevy/hermex/blob/87f87aa56bbc9274b142737d001961e4bda7309f/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/87f87aa56bbc9274b142737d001961e4bda7309f/fixtures/cases/comply-color.md))

**Environment** `NO_COLOR` unset, `FORCE_COLOR=3`

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-color`</sub>

## Config

[`fixtures/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/87f87aa56bbc9274b142737d001961e4bda7309f/fixtures/hermex.config.ts)

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
[90mhermex v<version>
[90m[39m- Parsing lockfile...
[32m✔[39m [34mFound pnpm lockfile (supports: v5, v6, v9) - 5 packages[39m
[32m✔[39m [32mFound 18 files[39m
[32m✔[39m [32mAnalysis complete! Analyzed 17/18 files[39m
[33m[39m
[33m⚠ 1 file(s) failed to parse:[39m
[33m[39m[33m  broken/unparseable.tsx[39m
[33m[39m[90m      x Expression expected[39m
[90m   ,----[39m
[90m 1 | export const Broken = ( : : :;[39m
[90m   :                         ^[39m
[90m   `----[39m
[90m[39m
[90m[39m
[90mCaused by:[39m
[90m    Syntax Error[39m
[90m[39m
[94m[1m[22m[39m
[94m[1m🔍 Rules[22m[39m
[94m[1m[22m[39m
[90m┌──────────────────[39m[90m┬──────────────────────────────────────────────────────┐[39m
[90m│[39m[36m Rule             [39m[90m│[39m[36m Description                                          [39m[90m│[39m
[90m├──────────────────[39m[90m┼──────────────────────────────────────────────────────┤[39m
[90m│[39m forbid_packages  [90m│[39m 🔴 moment is forbidden[90m — Use date-fns or dayjs[39m       [90m│[39m
[90m├──────────────────[39m[90m┼──────────────────────────────────────────────────────┤[39m
[90m│[39m require_packages [90m│[39m 🔴 typescript not installed[90m — TypeScript is required[39m [90m│[39m
[90m├──────────────────[39m[90m┼──────────────────────────────────────────────────────┤[39m
[90m│[39m require_files    [90m│[39m 🔴 .nvmrc not found                                  [90m│[39m
[90m├──────────────────[39m[90m┼──────────────────────────────────────────────────────┤[39m
[90m│[39m require_files    [90m│[39m 🟡 .editorconfig not found                           [90m│[39m
[90m└──────────────────[39m[90m┴──────────────────────────────────────────────────────┘[39m
[90m[39m
[90m[31m3 errors[39m[90m, [33m1 warning[39m[90m[39m
[95m[1m[22m[39m
[95m[1m⚖️ Versus[22m[39m
[95m[1m[22m[39m
[1m  Design System Migration[22m
[90m  ──────────────────────────────────────────────────[39m
  @design-system/foundation  [36m██████████████████████████████[39m [1m100.0%[22m [90m(33 usages)[39m
  @new-system/arc            [90m░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░[39m [1m0.0%[22m [90m(0 usages)[39m

[91m[1m[22m[39m
[91m[1m🔴 NOT COMPLIANT[22m[39m
[31m  3 mandatory violations found[39m
```

</details>

{% endraw %}