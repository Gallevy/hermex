---
layout: default
title: "release-age-tree-scope — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `release-age-tree-scope`

_unchanged_

**Asserts** — scope: tree enforces every resolved copy, so the nested version becomes the mandatory failure and the reported installed version follows it.

**Ran** `hermex comply --config tree.config.ts` in `fixtures/repos/version-conflict` → exit 1, as asserted

**Config** [`fixtures/repos/version-conflict/tree.config.ts`](https://github.com/Gallevy/hermex/blob/615674aae008717fdb3396c0c709dfe22ba5261d/fixtures/repos/version-conflict/tree.config.ts) · **Fixture** [`fixtures/repos/version-conflict`](https://github.com/Gallevy/hermex/blob/615674aae008717fdb3396c0c709dfe22ba5261d/fixtures/repos/version-conflict) ([overview](https://github.com/Gallevy/hermex/blob/615674aae008717fdb3396c0c709dfe22ba5261d/fixtures/repos/version-conflict/README.md)) · **Case** [`release-age-tree-scope`](https://github.com/Gallevy/hermex/blob/615674aae008717fdb3396c0c709dfe22ba5261d/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/615674aae008717fdb3396c0c709dfe22ba5261d/fixtures/cases/release-age-tree-scope.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter release-age-tree-scope`</sub>

## Config

[`fixtures/repos/version-conflict/tree.config.ts`](https://github.com/Gallevy/hermex/blob/615674aae008717fdb3396c0c709dfe22ba5261d/fixtures/repos/version-conflict/tree.config.ts) — resolved, as the loader sees it

```json
{
  "releaseAge": {
    "enabled": true,
    "registry": "<fixture registry>",
    "cacheDisabled": true,
    "thresholds": {
      "patch": 30,
      "minor": 45,
      "major": 60
    },
    "enforceOn": [
      "react"
    ],
    "scope": "tree"
  },
  "output": {
    "components": false,
    "patterns": false,
    "versus": false
  }
}
```

## Full output

<details markdown="1"><summary><code>stdout.txt</code></summary>

```text
hermex v<version>
- Parsing lockfile...
✔ Found pnpm lockfile (supports: v5, v6, v9) - 2 packages
✔ Found 3 files
✔ Analysis complete! Analyzed 3/3 files
✔ Release age fetched

📦 Packages

┌───────────────────────┬───────────┬──────────────────────────────────────────────────┐
│ Package               │ Installed │ Target                                           │
├───────────────────────┼───────────┼──────────────────────────────────────────────────┤
│ @hermex/legacy-widget │ 1.0.0     │ 🟡 major 2.1.0 (240 days overdue) [not enforced] │
├───────────────────────┼───────────┼──────────────────────────────────────────────────┤
│ react                 │ 17.0.2    │ 🔴 major 19.1.0 (640 days overdue)               │
└───────────────────────┴───────────┴──────────────────────────────────────────────────┘

Notes:
  🔵 react → 2 versions installed (bundle impact): 17.0.2, 18.3.1

Total: 2 packages

🔴 Not compliant
  1 mandatory violation found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}