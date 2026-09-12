---
layout: default
title: "Output Review"
---

{% raw %}
# Output Review

27 cases · 25 changed · 0 invariant breach(es)

Reference: `dbbb737` — reused from cache.

## Changed

| Case | Status | Proves |
| --- | --- | --- |
| [`scan-human-default`](./scan-human-default.html) | **changed** <span class="or-add">+18</span> <span class="or-del">−9</span> | Baseline human output: the sections a repo gets with no output config of its own. Includes both Versus groups — a component pair and a function-only one — which is where #174 is visible: the function-only group reports a real split off files-that-import, where it used to read 0 vs 0 off JSX renders, and the package named by no lockfile entry says so instead of reporting a confident 0%. |
| [`scan-human-all-sections`](./scan-human-all-sections.html) | **changed** <span class="or-add">+27</span> <span class="or-del">−18</span> | Every human section rendered at once, including details and patterns, which the default config leaves off. |
| [`scan-human-charts`](./scan-human-charts.html) | **changed** <span class="or-add">+16</span> <span class="or-del">−11</span> | The bar-chart renderer: bar scaling and label alignment for packages, components and patterns. |
| [`scan-human-minimal`](./scan-human-minimal.html) | **changed** <span class="or-add">+5</span> <span class="or-del">−5</span> | Section toggles actually suppress output — every section off except the summary (#63). |
| [`scan-json`](./scan-json.html) | **changed** <span class="or-add">+88</span> <span class="or-del">−23</span> | The full JSON contract: summary.patternCounts (#80), every owned package in packages[], de-duplicated components (#78, #79), and the compliance block (#55). Also the imported axis (#174): packages[].importingFileCount beside usageCount — lodash and es-toolkit read non-zero on the first and 0 on the second — and versus[].count keyed on it, with present:false marking a configured package the repo does not have. |
| [`scan-json-toggles`](./scan-json-toggles.html) | **changed** <span class="or-add">+6</span> <span class="or-del">−6</span> | What output.* toggles do to --format json: today, nothing (#91). The payload below is emitted with every section switched off, yet still carries packages, components, versus and ruleViolations in full. Pair it with scan-human-minimal to see the two formats diverge; when #91 lands, this baseline shrinking is the proof. |
| [`comply-human-fail`](./comply-human-fail.html) | **changed** <span class="or-add">+10</span> <span class="or-del">−5</span> | The rules table on a failing repo: row ordering, severity badges, the error/warning tally, and exit 1. |
| [`comply-human-warn-only`](./comply-human-warn-only.html) | **changed** <span class="or-add">+10</span> <span class="or-del">−5</span> | Warn and info findings are reported but do not fail the build — verdict wording plus exit 0. |
| [`comply-json`](./comply-json.html) | **changed** <span class="or-add">+88</span> <span class="or-del">−23</span> | The compliance block as machine-readable output on a failing repo. |
| [`comply-summary-file`](./comply-summary-file.html) | **changed** <span class="or-add">+10</span> <span class="or-del">−5</span> | The markdown a consumer pastes into a PR comment or job summary — ANSI-free, rules + flagged packages + verdict. |
| [`comply-release-age`](./comply-release-age.html) | **changed** <span class="or-add">+17</span> <span class="or-del">−8</span> | The flagged-packages table, against a recorded registry: an overdue package with no in-window target (#26), one with a real target, and one merely coming due. `rules['release-age']` names two of them at severity error, so the same three packages split across both severity tiers via the implicit `['**']` baseline for everything else — pair it with comply-release-age-unscoped, where the identical repo is checked with nothing enforced. |
| [`comply-release-age-unscoped`](./comply-release-age-unscoped.html) | **changed** <span class="or-add">+17</span> <span class="or-del">−8</span> | An authored catch-all at severity `warn` (no package-specific `error` entry) enforces nothing, rather than enforcing everything: every installed package is still fetched and reported, every release-age row is advisory, and the exit code comes from rule violations alone. Includes moment — declared, installed, never imported — which release age never even looked up before #171. The only case covering the nothing-enforced path, which is the one path where #171 can move a verdict. |
| [`comply-all-rule-types-json`](./comply-all-rule-types-json.html) | **changed** <span class="or-add">+2</span> <span class="or-del">−0</span> | The machine-readable shape of every rule type: fieldPath and actualValue on package-field hits, maxSizeBytes/oversizeFile on max-file-size, installedRange/requiredRange on require-engine-version, matchedFile on codeowners, packageName/worstLevel/scope on release-age. Also where the #95 fix is visible — the two codeowners entries now differ by `reason` ('unowned' vs 'wrong-owner'), not just matchedFile. |
| [`comply-summary-title`](./comply-summary-title.html) | **changed** <span class="or-add">+10</span> <span class="or-del">−5</span> | --summary-title replaces the default heading, so a consumer embedding the markdown can name it after the policy rather than the tool. |
| [`comply-exit-2`](./comply-exit-2.html) | **changed** <span class="or-add">+1</span> <span class="or-del">−1</span> | A pipeline failure (nothing matched `includes`) exits 2, not 1 — a consumer must be able to tell "could not run" from "not compliant". |
| [`scan-no-files`](./scan-no-files.html) | **changed** <span class="or-add">+1</span> <span class="or-del">−1</span> | The same pipeline failure under `scan` reports the problem and exits 0 — the deliberate asymmetry with comply-exit-2, kept visible so it cannot drift unnoticed. |
| [`release-age-root-scope`](./release-age-root-scope.html) | **changed** <span class="or-add">+2</span> <span class="or-del">−2</span> | scope: root enforces only the direct copy, and still surfaces the overdue nested copy as an advisory breach rather than hiding it. |
| [`release-age-tree-scope`](./release-age-tree-scope.html) | **changed** <span class="or-add">+2</span> <span class="or-del">−2</span> | scope: tree enforces every resolved copy, so the nested version becomes the mandatory failure and the reported installed version follows it. |
| [`comply-overrides`](./comply-overrides.html) | **changed** <span class="or-add">+10</span> <span class="or-del">−5</span> | Repo-scoped overrides re-scope severities: one rule downgraded to warn, one switched off and gone from the table. |
| [`lockfile-npm`](./lockfile-npm.html) | **changed** <span class="or-add">+4</span> <span class="or-del">−0</span> | package-lock.json produces the same inventory as its siblings. |
| [`lockfile-yarn`](./lockfile-yarn.html) | **changed** <span class="or-add">+4</span> <span class="or-del">−0</span> | yarn.lock produces the same inventory as its siblings. |
| [`lockfile-pnpm`](./lockfile-pnpm.html) | **changed** <span class="or-add">+4</span> <span class="or-del">−0</span> | pnpm-lock.yaml produces the same inventory as its siblings. |
| [`parse-errors`](./parse-errors.html) | **changed** <span class="or-add">+2</span> <span class="or-del">−2</span> | The parse-error report, scoped to a repo of nothing but an unparseable file so the block is not buried (#13). |
| [`comply-color`](./comply-color.html) | **changed** <span class="or-add">+20</span> <span class="or-del">−10</span> | The coloured path a developer actually sees in a terminal. Captured raw, so escape sequences are part of the diff. |
| [`comply-no-color-flag`](./comply-no-color-flag.html) | **changed** <span class="or-add">+20</span> <span class="or-del">−10</span> | --no-color wins over FORCE_COLOR, so the CI-facing output carries no escape sequences even on a colour-capable runner. |

## Unchanged (2)

| Case | Status | Proves |
| --- | --- | --- |
| [`comply-human-pass`](./comply-human-pass.html) | unchanged | A repo that satisfies every rule: the clean verdict wording and exit 0. |
| [`comply-all-rule-types`](./comply-all-rule-types.html) | unchanged | Every one of the eleven rule types in one run, at three severities — the only case that renders max-file-size, require-engine-version, codeowners, both package-field shapes, and release-age together. release-age itself never gets a Rules-table row (its display is the Packages table) — that split is what this case pins. |

{% endraw %}