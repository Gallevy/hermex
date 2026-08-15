# `configs/`

Config variants over the **primary fixture repo** (`fixtures/`). Every one
of them spreads `../hermex.config.ts` and changes exactly one thing, so the
difference between two outputs is never a difference between two policies.

Each file carries a doc comment explaining why it exists; this table is the
index. A case names one of these with `--config`, which
`src/config/loader.ts` resolves relative to the case's working directory.

| Config | Changes | Expected output | Cases |
| --- | --- | --- | --- |
| [`all-sections.config.ts`](./all-sections.config.ts) | Every `output.*` section on, including `details` and `patterns`, which the default leaves off. | Every human renderer at once — the only cover the details and patterns renderers get. | `scan-human-all-sections` |
| [`charts.config.ts`](./charts.config.ts) | `packages`, `components`, `patterns` set to `chart` instead of `table`. | Bar charts. Widths are derived from the largest value per section, so this is what catches scaling and label-alignment regressions. | `scan-human-charts` |
| [`minimal.config.ts`](./minimal.config.ts) | Every section off except `summary`. | Summary only. Switched-off sections must be **absent**, not empty and not rendered anyway ([#63](https://github.com/Gallevy/hermex/issues/63)) — the case's `absent` list enforces it. | `scan-human-minimal`, `scan-json-toggles` |
| [`no-files.config.ts`](./no-files.config.ts) | `includes` that match nothing. | A pipeline failure before analysis. `comply` exits **2** (could not run), `scan` exits **0**. That asymmetry is deliberate and both halves are cases. | `comply-exit-2`, `scan-no-files` |
| [`overrides.config.ts`](./overrides.config.ts) | An `overrides[]` entry matching `hermex-fixtures`. | Resolved severities, not authored ones: `no-packages` on `moment` drops error → warn, and `require-files` on `.editorconfig` is off and **gone from the table**, not greyed out. Remaining error rules are untouched on purpose — an override that made the repo compliant would prove the rules vanished. | `comply-overrides` |
| [`parse-errors.config.ts`](./parse-errors.config.ts) | `includes` scoped to `broken/`, every section off. | The parse-error report as the whole output instead of three lines buried above the packages table ([#13](https://github.com/Gallevy/hermex/issues/13)). | `parse-errors` |
| [`release-age.config.ts`](./release-age.config.ts) | `releaseAge.enabled`, pointed at the offline registry. | The flagged-packages table across both severity tiers — see below. | `comply-release-age` |
| [`warn-only.config.ts`](./warn-only.config.ts) | The same rules, none at `error`. | Every finding printed, exit **0**, and a verdict that says "compliant" without pretending the repo is clean. That wording is the point of the case. | `comply-human-warn-only` |

## `release-age.config.ts` in detail

Release age is the only part of hermex that reaches the network, so this
config reads `HERMEX_FIXTURE_REGISTRY` — set by `scripts/output-review.ts`,
which serves `../registry/timelines.ts` on localhost — and falls back to the
real registry so the config is still runnable by hand. The cache is disabled
deliberately: a warm `~/.hermex` entry from an earlier run against the real
registry would otherwise decide the output.

`enforceOn` names three packages so that all three are looked up *and* split
across both severity tiers, since a looked-up package that does not match
`enforceOn` is advisory:

| Package | Enforced | Age | Reported as |
| --- | --- | --- | --- |
| `moment` | yes | overdue | mandatory failure |
| `react-dom` | yes | coming due | advisory, "N days remaining" |
| `react` | no | overdue | warning, does not fail `comply` |

Without `enforceOn` only packages with measured usage are looked up at all,
which in this repo is `react` alone — `moment` and `react-dom` are installed
but never imported.
