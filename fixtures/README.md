# Fixtures

Small, hand-written repos that hermex analyzes. They back the end-to-end
tests and, since #90, the **output review** — the check that runs the real
CLI over these repos and puts the result in front of a human on the PR that
changes it.

Every fixture exists to prove something specific. If you add one, say what
it proves — here, in its `package.json` description, or in a comment at the
top of the file. A fixture nobody can explain is a fixture nobody dares to
change.

## Layout

| Path | What it is |
| --- | --- |
| `hermex.config.ts`, `package.json`, `pnpm-lock.yaml` | The **primary fixture repo**: a deliberately messy app under a deliberately failing policy, so `scan` and `comply` both have something to say. Running `hermex` from `fixtures/` analyzes this. |
| `patterns/`, `aliasing/`, `versus/`, `declarations/`, `broken/` | The source it analyzes — see below. |
| `configs/` | Config variants over the primary repo. Each spreads `../hermex.config.ts` and changes one thing, so the difference between two outputs is never a difference between two policies. |
| `repos/` | Secondary mini-repos that cases run against with their own `cwd`. |
| `registry/` | Recorded npm release timelines, so release-age checks never touch the network. |
| `cases.ts` | The output-review matrix. |

`configs/`, `registry/`, `repos/` and `cases.ts` are fixture *machinery*,
not code under analysis — the primary config excludes them, so adding a
case does not silently add rows to the primary repo's output.

## What each source directory proves

| Directory | Proves |
| --- | --- |
| `patterns/` | Every import and usage shape the parser recognizes: direct usage, variable assignment, object mapping, lazy loading, namespace imports, JSX in attributes, and a kitchen-sink file combining them. |
| `aliasing/` | The same component imported under three names still aggregates to one canonical component (#67). |
| `versus/` | Two packages exporting the same component name stay attributed to their own source instead of collapsing into whichever file was parsed first. |
| `declarations/` | `.d.ts` files are skipped, not parsed and not reported as parse errors (#22). |
| `broken/` | An unparseable file is reported as a parse error without taking the run down (#13). |

The primary `package.json` and `pnpm-lock.yaml` are paired to cover every
package-inventory axis at once: declared + installed + used, declared and
installed but never imported (`moment` — the `forbid_packages` case from
#75), declared but not installed (`eslint`), installed as a root dependency
the manifest omits (`react-dom`), and installed transitively only
(`js-tokens`).

## The secondary repos

| Repo | Proves |
| --- | --- |
| `repos/compliant/` | The mirror of the primary repo: the same rules, all satisfied. `comply` prints a clean verdict and exits 0. Keep its rules in step with `hermex.config.ts` — the pass/fail pair only means something while the policy is identical and the repo is not. |
| `repos/lockfile-npm/`, `-yarn/`, `-pnpm/` | One resolved dependency tree in three lock formats, with identical manifests and identical source. `scan --format json` should produce identical output for all three; the runner checks that and reports any divergence. |

> **Known divergence:** the npm arm currently reports the hoisted transitive
> packages (`js-tokens`, `loose-envify`, `scheduler`) as direct
> dependencies, because npm's lockfile lists them at `node_modules/<name>`
> and the adapter reads that depth as "root". yarn and pnpm report only the
> four declared packages. The baselines record this as it is today; the
> runner reports it as advisory rather than failing on it.

## Release-age fixtures

`registry/timelines.ts` records release ages as **days before now**, never
as dates. A recorded date crosses a threshold at some point and the output
changes on its own — a diff meant to show a code change would show the
calendar instead. Expressed relatively, the same package is overdue by the
same number of days forever.

`scripts/output-review.ts` materializes those timelines into registry
documents and serves them on localhost; `configs/release-age.config.ts`
points at the server via `HERMEX_FIXTURE_REGISTRY` and falls back to the
real registry so it is still runnable by hand.

## Running the output review

```bash
pnpm run test:output                  # compare against the committed baselines
pnpm run test:output -- --update      # refresh them
pnpm run test:output -- --filter comply
```

Baselines live in `tests/__output_baselines__/<case>/` and hold each case's
stdout, stderr, exit code and any file it wrote. They are committed, so
changing hermex's output shows up as a reviewable diff in the same PR that
causes it.

Adding a case is one entry in `cases.ts` plus (usually) one config in
`configs/`. Nothing else knows the list — the runner, the CI job and the PR
comment all read it from there.
