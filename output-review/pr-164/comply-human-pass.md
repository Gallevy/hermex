---
layout: default
title: "comply-human-pass — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `comply-human-pass`

_changed_

**Asserts** — A repo that satisfies every rule: the clean verdict wording and exit 0.

**Ran** `hermex comply` in `fixtures/repos/compliant` → exit 0, as asserted

**Config** [`fixtures/repos/compliant/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/573336675ad0e66edc80bbca896966fc2f7db0e0/fixtures/repos/compliant/hermex.config.ts) · **Fixture** [`fixtures/repos/compliant`](https://github.com/Gallevy/hermex/blob/573336675ad0e66edc80bbca896966fc2f7db0e0/fixtures/repos/compliant) ([overview](https://github.com/Gallevy/hermex/blob/573336675ad0e66edc80bbca896966fc2f7db0e0/fixtures/repos/compliant/README.md)) · **Case** [`comply-human-pass`](https://github.com/Gallevy/hermex/blob/573336675ad0e66edc80bbca896966fc2f7db0e0/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/573336675ad0e66edc80bbca896966fc2f7db0e0/fixtures/cases/comply-human-pass.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter comply-human-pass`</sub>

## Config

[`fixtures/repos/compliant/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/573336675ad0e66edc80bbca896966fc2f7db0e0/fixtures/repos/compliant/hermex.config.ts)

```ts
import type { HermexConfigInput } from '../../../src/config/types.ts';

/**
 * Deliberately the same rule set as `fixtures/hermex.config.ts` — the only
 * thing that differs is the repo underneath it. Keeping the rules identical
 * is what makes the `comply-pass` / `comply-fail` pair a real contrast:
 * every difference in their output comes from the repo, never from the
 * policy. If a rule is added to the primary config, add it here too and
 * satisfy it, or the pair stops proving anything.
 */
export default {
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
} satisfies HermexConfigInput;
```

## Diff against the target branch

<sub>Diffs are unified format: `-` is the target branch, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the target branch and 9 lines from line 12 of this run.</sub>

```diff
--- target/stdout.txt
+++ current/stdout.txt
@@ -4,6 +4,6 @@
 ✔ Found 2 files
 ✔ Analysis complete! Analyzed 2/2 files
 
-🟢 COMPLIANT
+🟢 Compliant
 
 
```

## Full output

<details markdown="1"><summary><code>stdout.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 2 packages
✔ Found 2 files
✔ Analysis complete! Analyzed 2/2 files

🟢 Compliant
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}