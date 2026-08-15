---
layout: default
title: "scan-json-toggles — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `scan-json-toggles`

_unchanged_

**Asserts** — What output.* toggles do to --format json: today, nothing (#91). The payload below is emitted with every section switched off, yet still carries packages, components, versus and ruleViolations in full. Pair it with scan-human-minimal to see the two formats diverge; when #91 lands, this baseline shrinking is the proof.

**Ran** `hermex scan --format json --config configs/minimal.config.ts` in `fixtures/` → exit 0, as asserted

**Config** [`fixtures/configs/minimal.config.ts`](https://github.com/Gallevy/hermex/blob/1c0b8557e2719d4888dc7bf75d99587f7bc03fd9/fixtures/configs/minimal.config.ts) · **Fixture** [`fixtures`](https://github.com/Gallevy/hermex/blob/1c0b8557e2719d4888dc7bf75d99587f7bc03fd9/fixtures) ([overview](https://github.com/Gallevy/hermex/blob/1c0b8557e2719d4888dc7bf75d99587f7bc03fd9/fixtures/README.md)) · **Case** [`scan-json-toggles`](https://github.com/Gallevy/hermex/blob/1c0b8557e2719d4888dc7bf75d99587f7bc03fd9/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/1c0b8557e2719d4888dc7bf75d99587f7bc03fd9/fixtures/cases/scan-json-toggles.md))

<sub>Reproduce locally: `pnpm run test:output -- --filter scan-json-toggles`</sub>

## Config

[`fixtures/configs/minimal.config.ts`](https://github.com/Gallevy/hermex/blob/1c0b8557e2719d4888dc7bf75d99587f7bc03fd9/fixtures/configs/minimal.config.ts)

```ts
import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * Every output section off except the summary. Regression cover for #63:
 * a section that is switched off must actually be absent, not rendered
 * empty or rendered anyway. Used twice — once as human output, once as
 * `--format json`, since the JSON payload has to honour the same toggles.
 */
export default {
  ...base,
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

<details markdown="1"><summary><code>stdout.json</code></summary>

```json
{
  "version": "<version>",
  "summary": {
    "filesAnalyzed": 17,
    "totalImports": 80,
    "totalComponents": 35,
    "totalUsagePatterns": 284
  },
  "ruleViolations": [
    {
      "ruleId": "no-packages",
      "severity": "error",
      "patterns": [
        "moment"
      ],
      "message": "Use date-fns or dayjs",
      "matchedFiles": [],
      "packageName": "moment"
    },
    {
      "ruleId": "require-packages",
      "severity": "error",
      "patterns": [
        "typescript"
      ],
      "message": "TypeScript is required",
      "matchedFiles": []
    },
    {
      "ruleId": "require-files",
      "severity": "error",
      "patterns": [
        ".nvmrc"
      ],
      "matchedFiles": []
    },
    {
      "ruleId": "require-files",
      "severity": "warn",
      "patterns": [
        ".editorconfig"
      ],
      "matchedFiles": []
    }
  ],
  "compliance": {
    "status": "non-compliant",
    "compliant": false,
    "counts": {
      "errorRuleViolations": 3,
      "releaseAgeViolations": 0,
      "warningRuleViolations": 1
    }
  }
}
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

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
```

</details>

{% endraw %}