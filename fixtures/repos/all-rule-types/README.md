# `repos/all-rule-types/`

A repo engineered so **every one of the nine rule types fires at once**, at
three different severities.

## What it proves

The primary fixture repo only ever trips three of the nine. Without this
repo the rules table has never been reviewed with an `require-engine-version` row, a
`codeowners` row, or either of the two package-field shapes in it — so
nothing would catch a renderer that mishandles `fieldPath`,
`installedRange`, or a long `matchedFiles` list.

It also covers both halves of the package-field renderer, which are
different shapes: a **missing** field reports the absence, a **forbidden**
field reports the offending value.

## What trips what

| Rule | Severity | Tripped by |
| --- | --- | --- |
| `no-files` | error | `jest.config.js` and `.babelrc` exist |
| `require-files` | error | `.nvmrc` does not exist |
| `no-packages` | error | `moment` is declared |
| `require-packages` | error | `typescript` is not declared |
| `require-scripts` | error | no `build`, no `test` — only `lint` |
| `require-package-fields` | warn | `license` is missing |
| `no-package-fields` | warn | `publishConfig.registry` points at an internal registry |
| `require-engine-version` | error | `engines.node` is `>=16`, below the required `>=20` |
| `codeowners` | info | fires **twice** — see below |

`includes` is scoped to `src/` so `jest.config.js` is found by
`no-files` without also being parsed as source.

## The CODEOWNERS trap

`.github/CODEOWNERS` covers two of the three scanned files, and one of those
belongs to a team outside `requiredOwners`:

| File | Owner | Outcome |
| --- | --- | --- |
| `src/owned.tsx` | `@org/platform` | required owner — no violation |
| `src/legacy.tsx` | `@org/legacy` | owned, but by the **wrong** team |
| `src/orphan.tsx` | — | matches nothing, **unowned** |

**Known-wrong baseline.** The recorded output describes both violations as
"have no owner", which is false for `src/legacy.tsx` — it has an owner, just
not a required one. That is [#95](https://github.com/Gallevy/hermex/issues/95),
left unfixed on purpose: the recorded output is the evidence, and refreshing
this baseline is how the fix gets reviewed. A diff here that collapses the
two rows into one distinct wording is the fix landing, not a regression.

## Cases that use it

| Case | Command | Expects |
| --- | --- | --- |
| `comply-all-rule-types` | `hermex comply` | exit 1, all nine rows in the human table |
| `comply-all-rule-types-json` | `hermex comply --format json` | exit 1, the machine-readable shape of each rule type |

## Layout

```
.babelrc                 no-files hit
.github/CODEOWNERS       two of three src files covered
hermex.config.ts         all nine rules, three severities
jest.config.js           no-files hit
package.json             engines >=16, no license, publishConfig.registry, moment
src/legacy.tsx           owned by the wrong team
src/orphan.tsx           owned by nobody
src/owned.tsx            correctly owned
```
