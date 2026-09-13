---
layout: default
title: "release-age-root-scope — Output Review"
---

{% raw %}
[← all cases](./index.html)

# `release-age-root-scope`

_changed_

**Asserts** — scope: root enforces only the direct copy, and still surfaces the overdue nested copy as an advisory breach rather than hiding it.

**Ran** `hermex comply` in `fixtures/repos/version-conflict` → exit 1, as asserted

**Config** [`fixtures/repos/version-conflict/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/8cba6db5eaf4546cb9a2a702aa7cc08086222a3e/fixtures/repos/version-conflict/hermex.config.ts) · **Fixture** [`fixtures/repos/version-conflict`](https://github.com/Gallevy/hermex/blob/8cba6db5eaf4546cb9a2a702aa7cc08086222a3e/fixtures/repos/version-conflict) ([overview](https://github.com/Gallevy/hermex/blob/8cba6db5eaf4546cb9a2a702aa7cc08086222a3e/fixtures/repos/version-conflict/README.md)) · **Case** [`release-age-root-scope`](https://github.com/Gallevy/hermex/blob/8cba6db5eaf4546cb9a2a702aa7cc08086222a3e/fixtures/cases.ts) ([dossier](https://github.com/Gallevy/hermex/blob/8cba6db5eaf4546cb9a2a702aa7cc08086222a3e/fixtures/cases/release-age-root-scope.md))

**Registry** offline, served from `fixtures/registry/timelines.ts` — no network

<sub>Reproduce locally: `pnpm run test:output -- --filter release-age-root-scope`</sub>

## Config

[`fixtures/repos/version-conflict/hermex.config.ts`](https://github.com/Gallevy/hermex/blob/8cba6db5eaf4546cb9a2a702aa7cc08086222a3e/fixtures/repos/version-conflict/hermex.config.ts) — resolved, as the loader sees it

```json
{
  "releaseAge": {
    "cacheDisabled": true
  },
  "rules": {
    "release-age": [
      {
        "severity": "error",
        "patterns": [
          "react"
        ],
        "scope": "root"
      }
    ]
  },
  "output": {
    "components": false,
    "patterns": false,
    "versus": false
  }
}
```

## Diff against the target branch

<sub>Diffs are unified format: `-` is the target branch, `+` is this run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, and the hunk below covers 7 lines from line 12 of the target branch and 9 lines from line 12 of this run.</sub>

```diff
--- target/stdout.txt
+++ current/stdout.txt
@@ -7,13 +7,13 @@
 
 📦 Packages
 
-┌───────────────────────┬───────────┬──────────────────────────────────────────────────┐
-│ Package               │ Installed │ Target                                           │
-├───────────────────────┼───────────┼──────────────────────────────────────────────────┤
-│ react                 │ 18.3.1    │ 🔴 major 19.1.0 (340 days overdue)               │
-├───────────────────────┼───────────┼──────────────────────────────────────────────────┤
-│ @hermex/legacy-widget │ 1.0.0     │ 🟡 major 2.1.0 (240 days overdue) [not enforced] │
-└───────────────────────┴───────────┴──────────────────────────────────────────────────┘
+┌───────────────────────┬───────────┬─────────────────────────────────────┐
+│ Package               │ Installed │ Minimum target                      │
+├───────────────────────┼───────────┼─────────────────────────────────────┤
+│ react                 │ 18.3.1    │ 🔴 19.1.0 (major, 340 days overdue) │
+├───────────────────────┼───────────┼─────────────────────────────────────┤
+│ @hermex/legacy-widget │ 1.0.0     │ 🟡 2.1.0 (major, 240 days overdue)  │
+└───────────────────────┴───────────┴─────────────────────────────────────┘
 
 Notes:
   🔵 react → 2 versions installed (bundle impact): 17.0.2, 18.3.1 → 1 nested copy overdue, not enforced but recommended to resolve
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

┌───────────────────────┬───────────┬─────────────────────────────────────┐
│ Package               │ Installed │ Minimum target                      │
├───────────────────────┼───────────┼─────────────────────────────────────┤
│ react                 │ 18.3.1    │ 🔴 19.1.0 (major, 340 days overdue) │
├───────────────────────┼───────────┼─────────────────────────────────────┤
│ @hermex/legacy-widget │ 1.0.0     │ 🟡 2.1.0 (major, 240 days overdue)  │
└───────────────────────┴───────────┴─────────────────────────────────────┘

Notes:
  🔵 react → 2 versions installed (bundle impact): 17.0.2, 18.3.1 → 1 nested copy overdue, not enforced but recommended to resolve

1 error, 1 warning

🔴 Not compliant
  1 mandatory violation found
```

</details>

<details markdown="1"><summary><code>stderr.txt</code></summary>

```text

```

</details>

{% endraw %}