# `repos/compliant/`

The mirror image of the primary fixture repo: **the same rule set, every
rule satisfied.**

## What it proves

`comply` prints a clean verdict and exits **0**. That is the only fixture
where it does, so this is the sole cover for the pass wording, the empty
rules table, and the exit code a green CI job depends on.

The contrast only means something while the *policy* is identical and the
*repo* is not. `hermex.config.ts` here is a deliberate copy of
`fixtures/hermex.config.ts` — if a rule is added there, add it here too and
satisfy it, or the pass/fail pair stops proving anything.

## How each rule is satisfied

| Rule | Satisfied by |
| --- | --- |
| `detect_files` (`jest.config.*`, `.babelrc`) | Neither file exists. |
| `require_files` (`.nvmrc`, `.editorconfig`) | Both present. |
| `forbid_packages` (`moment`) | Not declared. |
| `require_packages` (`typescript`) | In `devDependencies`. |
| `require_scripts` (`build`, `test`) | Both in `scripts`. |
| `require_package_fields` (`engines`, `license`) | Both set. |
| `engine_version` (`>=20`) | `engines.node` is `>=20`. |

## Cases that use it

| Case | Command | Expects |
| --- | --- | --- |
| `comply-human-pass` | `hermex comply` | exit 0, clean verdict |

## Layout

```
.editorconfig      required file
.nvmrc             required file
hermex.config.ts   the primary repo's rules, verbatim
package.json       engines, license, build + test scripts, typescript
src/app.tsx        one component so the scan has something to report
```
