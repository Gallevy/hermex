---
layout: default
title: "Output Review"
---

{% raw %}
# Output Review

29 cases · 2 changed · 0 invariant breach(es)

Reference: `fda8b4b` — reused from cache.

## Changed

| Case | Status | Proves |
| --- | --- | --- |
| [`comply-release-age-json`](./comply-release-age-json.html) | **changed** <span class="or-add">+53</span> <span class="or-del">−57</span> | The machine-readable shape of hermex's most consequential rule, against the same recorded registry as comply-release-age — which until #189 no case pinned at all, since the only JSON case that reached this rule (comply-all-rule-types-json) covers a single package on a single path. Here the whole surface is visible at once: `packages[].releases` as policy-free facts (every resolved copy, what was published after each, `latest`) and `ruleViolations[]` as the verdict (`overdueTier`, `daysOverdue`, `measuredVersion`, `scope`). Between them these packages cover an overdue package with no in-window target (#26), one with a real cross-tier target (#57), one merely coming due, one at an 'off' entry that carries full facts and no violation, and a version conflict whose nested copy is overdue but out of scope. The split is the thing to read: identical `releases` would be produced under any thresholds, and every threshold-derived answer sits on the violation instead. |
| [`comply-all-rule-types-json`](./comply-all-rule-types-json.html) | **changed** <span class="or-add">+37</span> <span class="or-del">−39</span> | The machine-readable shape of every rule type: fieldPath and actualValue on package-field hits, maxSizeBytes/oversizeFile on max-file-size, installedRange/requiredRange on require-engine-version, matchedFile on codeowners, packageName/worstLevel/scope on release-age. Also where the #95 fix is visible — the two codeowners entries now differ by `reason` ('unowned' vs 'wrong-owner'), not just matchedFile. |

## Unchanged (27)

| Case | Status | Proves |
| --- | --- | --- |
| [`scan-human-default`](./scan-human-default.html) | unchanged | Baseline human output: the sections a repo gets with no output config of its own. Includes both Versus groups — a component pair and a function-only one — which is where #174 is visible: the function-only group reports a real split off files-that-import, where it used to read 0 vs 0 off JSX renders, and the package named by no lockfile entry says so instead of reporting a confident 0%. |
| [`scan-human-all-sections`](./scan-human-all-sections.html) | unchanged | Every human section rendered at once, including details and patterns, which the default config leaves off. |
| [`scan-human-charts`](./scan-human-charts.html) | unchanged | The bar-chart renderer: bar scaling and label alignment for packages, components and patterns. |
| [`scan-human-minimal`](./scan-human-minimal.html) | unchanged | Section toggles actually suppress output — every section off except the summary (#63). |
| [`scan-json`](./scan-json.html) | unchanged | The full JSON contract: summary.patternCounts (#80), every owned package in packages[], de-duplicated components (#78, #79), and the compliance block (#55). Also the imported axis (#174): packages[].importingFileCount beside usageCount — lodash and es-toolkit read non-zero on the first and 0 on the second — and versus[].count keyed on it, with present:false marking a configured package the repo does not have. |
| [`scan-json-toggles`](./scan-json-toggles.html) | unchanged | What output.* toggles do to --format json: today, nothing (#91). The payload below is emitted with every section switched off, yet still carries packages, components, versus and ruleViolations in full. Pair it with scan-human-minimal to see the two formats diverge; when #91 lands, this baseline shrinking is the proof. |
| [`comply-human-pass`](./comply-human-pass.html) | unchanged | A repo that satisfies every rule: the clean verdict wording and exit 0. |
| [`comply-human-fail`](./comply-human-fail.html) | unchanged | The rules table on a failing repo: row ordering, severity badges, the error/warning tally, and exit 1. |
| [`comply-human-warn-only`](./comply-human-warn-only.html) | unchanged | Warn and info findings are reported but do not fail the build — verdict wording plus exit 0. |
| [`comply-json`](./comply-json.html) | unchanged | The compliance block as machine-readable output on a failing repo. |
| [`comply-summary-file`](./comply-summary-file.html) | unchanged | The markdown a consumer pastes into a PR comment or job summary — ANSI-free, rules + flagged packages + verdict. |
| [`comply-release-age`](./comply-release-age.html) | unchanged | The flagged-packages table, against a recorded registry: an overdue package with no in-window target (#26), one with a real target, and one merely coming due. `rules['release-age']` names two of them at severity error, so the same three packages split across both severity tiers via the implicit `['**']` baseline for everything else — pair it with comply-release-age-unscoped, where the identical repo is checked with nothing enforced. |
| [`comply-release-age-unscoped`](./comply-release-age-unscoped.html) | unchanged | An authored catch-all at severity `warn` (no package-specific `error` entry) enforces nothing, rather than enforcing everything: every installed package is still fetched and reported, every release-age row is advisory, and the exit code comes from rule violations alone. Includes moment — declared, installed, never imported — which release age never even looked up before #171. The only case covering the nothing-enforced path, which is the one path where #171 can move a verdict. |
| [`comply-deprecated-packages`](./comply-deprecated-packages.html) | unchanged | Deprecation detection with release-age switched off entirely — the #107 case. Before, deprecation was a by-product of release-age enrichment, so this configuration found nothing at all and this run would have been silently compliant on that axis. Now the registry is consulted for deprecation alone: a no-deprecated-packages row appears in the Rules table carrying npm own notice, and at severity error it fails comply on its own. The only case where the registry is reached without release-age, which is exactly the path that did not exist before. |
| [`comply-all-rule-types`](./comply-all-rule-types.html) | unchanged | Every one of the twelve rule types in one run, at three severities — the only case that renders max-file-size, require-engine-version, codeowners, both package-field shapes, release-age and no-deprecated-packages together. release-age itself never gets a Rules-table row (its display is the Packages table) — that split is what this case pins, along with the only multi-badge Status cell in the fixtures (moment is both forbidden and deprecated). |
| [`comply-summary-title`](./comply-summary-title.html) | unchanged | --summary-title replaces the default heading, so a consumer embedding the markdown can name it after the policy rather than the tool. |
| [`comply-exit-2`](./comply-exit-2.html) | unchanged | A pipeline failure (nothing matched `includes`) exits 2, not 1 — a consumer must be able to tell "could not run" from "not compliant". |
| [`scan-no-files`](./scan-no-files.html) | unchanged | The same pipeline failure under `scan` reports the problem and exits 0 — the deliberate asymmetry with comply-exit-2, kept visible so it cannot drift unnoticed. |
| [`release-age-root-scope`](./release-age-root-scope.html) | unchanged | scope: root enforces only the direct copy, and still surfaces the overdue nested copy as an advisory breach rather than hiding it. |
| [`release-age-tree-scope`](./release-age-tree-scope.html) | unchanged | scope: tree enforces every resolved copy, so the nested version becomes the mandatory failure and the reported installed version follows it. |
| [`comply-overrides`](./comply-overrides.html) | unchanged | Repo-scoped overrides re-scope severities: one rule downgraded to warn, one switched off and gone from the table. |
| [`lockfile-npm`](./lockfile-npm.html) | unchanged | package-lock.json produces the same inventory as its siblings. |
| [`lockfile-yarn`](./lockfile-yarn.html) | unchanged | yarn.lock produces the same inventory as its siblings. |
| [`lockfile-pnpm`](./lockfile-pnpm.html) | unchanged | pnpm-lock.yaml produces the same inventory as its siblings. |
| [`parse-errors`](./parse-errors.html) | unchanged | The parse-error report, scoped to a repo of nothing but an unparseable file so the block is not buried (#13). |
| [`comply-color`](./comply-color.html) | unchanged | The coloured path a developer actually sees in a terminal. Captured raw, so escape sequences are part of the diff. |
| [`comply-no-color-flag`](./comply-no-color-flag.html) | unchanged | --no-color wins over FORCE_COLOR, so the CI-facing output carries no escape sequences even on a colour-capable runner. |

{% endraw %}