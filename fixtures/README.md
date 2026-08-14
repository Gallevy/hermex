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
| [`configs/`](./configs/README.md) | Config variants over the primary repo. Each spreads `../hermex.config.ts` and changes one thing, so the difference between two outputs is never a difference between two policies. |
| `repos/` | Secondary mini-repos that cases run against with their own `cwd`. Each has its own README. |
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

Each links to its own README, which the output review puts one click away
from every diff — a reviewer looking at a changed case should not have to
reconstruct what it was run against.

| Repo | Proves |
| --- | --- |
| [`repos/compliant/`](./repos/compliant/README.md) | The mirror of the primary repo: the same rules, all satisfied. `comply` prints a clean verdict and exits 0. Keep its rules in step with `hermex.config.ts` — the pass/fail pair only means something while the policy is identical and the repo is not. |
| [`repos/all-rule-types/`](./repos/all-rule-types/README.md) | All nine rule types firing at once, at three severities. The only fixture that renders an `engine_version`, `codeowners`, or package-field row, so it is the one that covers those renderers at all. Its CODEOWNERS deliberately leaves one file unowned and gives another to a team outside `requiredOwners` — which is how it surfaced #95. |
| [`repos/version-conflict/`](./repos/version-conflict/README.md) | One package resolved at two versions (react 18.3.1 at the root, 17.0.2 nested). The only fixture where `releaseAge.scope` changes the verdict — `root` enforces the direct copy and reports the nested one as advisory, `tree` enforces both (#57). |
| [`repos/lockfile-npm/`](./repos/lockfile-npm/README.md), [`-yarn/`](./repos/lockfile-yarn/README.md), [`-pnpm/`](./repos/lockfile-pnpm/README.md) | One resolved dependency tree in three lock formats, with identical manifests and identical source. `scan --format json` must produce identical output for all three; the `lockfile-parity` invariant enforces it. |

The lock-file trio found a real bug the first time it ran: the npm arm
reported the hoisted transitive packages (`js-tokens`, `loose-envify`,
`scheduler`) as direct dependencies, because npm installs a conflict-free
transitive dependency at `node_modules/<name>` — exactly where a direct one
lives — and the adapter read that depth as "root". The adapter now reads the
declared set from the lockfile's own `packages[""]` entry, and the three
arms agree.

## Invariants

A baseline records what happened. It cannot record what must *never*
happen — and because `--update` rewrites every baseline at once, a rule
encoded only in the recorded bytes is absorbed silently the moment those
bytes change together. Three lock formats can drift apart in one commit; a
gap in the scrubber gets faithfully re-recorded.

So some claims live outside the baselines, in `scripts/output-review.ts`.
Each is named, says what it guarantees, and is reported separately from the
per-case diffs:

| Invariant | Guarantees |
| --- | --- |
| `lockfile-parity` | The same dependency tree parses to the same inventory whichever lock format records it. |
| `ansi-purity` | Nothing but a deliberately coloured case emits escape sequences — and a file written with `--summary-file` never does, whatever the colour settings. |
| `exit-code-agrees-with-verdict` | A script reading the exit code and a human reading the verdict reach the same conclusion. Covers both the human wording and `compliance.compliant` in JSON. |
| `json-stdout-is-only-json` | `--format json` puts nothing but the payload on stdout, so it can be piped straight into a parser — progress chrome belongs on stderr (#55). |
| `no-unscrubbed-volatiles` | No baseline records an absolute path, a process id or a released version, any of which would make the next run differ for reasons that are not code changes. |
| `suppressed-sections-stay-absent` | A section switched off in config leaves no trace (#63). Driven by each case's `absent` list, because an absence nobody states is an absence nobody notices. |
| `no-orphaned-baselines` | Every committed baseline belongs to a live case, so a renamed case cannot leave a directory nobody reads behind. |

All of them are **blocking**: they fail the run even under `--update`,
because they describe things no baseline should ever be allowed to record.
An invariant can be marked advisory instead, and `lockfile-parity` was while
the npm adapter genuinely disagreed with its siblings — but that is a
holding position for a breach already understood and being fixed, not a
place to leave one. A permanently amber check is one nobody reads.

Worth adding later: re-running each case and requiring identical output
(determinism as an assertion rather than a convention), and a check that
every rule type and every `output.*` value appears in at least one case, so
the matrix cannot silently fall behind the config schema.

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

### Where the review shows up

Two views, deliberately not the same view:

| Where | Shows | For |
| --- | --- | --- |
| **The sticky PR comment** | Only the cases that **changed**: what each asserts, the config and fixture it ran against, per-artifact `+/-` counts, and a link to each changed line range. | Review, and triage — which cases moved, by how much, and is that the set you expected? |
| **The job summary** (Actions → the run) | Every case, changed or not, with its full diff, stdout, stderr and written files. | Reading the change itself, and browsing what a case emits at all. |

The comment does **not** carry the diffs. An output change is rarely one
line in one case — swapping a table border character rewrites every row of
sixteen cases at once, which is 60 KB of comment against GitHub's 65,536
limit, and unreadable long before it is rejected. So the comment shows a
bounded excerpt of the first hunk per case while it has room for one, and
degrades to counts and links when it does not.

Diffs are unified format. `-` is the committed baseline, `+` is this run,
and `@@ -12,7 +12,9 @@` is a hunk header: unchanged lines were skipped, and
the hunk below covers 7 lines starting at line 12 of the baseline and 9
lines starting at line 12 of this run.

Those numbers are also what the comment's links are built from. Each hunk
becomes a `…/tests/__output_baselines__/<case>/stdout.txt#L19-L119` link —
a blob range, which is the one form of deep link GitHub honours exactly. It
points at the **committed baseline**, so it works before anyone runs
`--update`: it shows what the output used to be, at the lines that stopped
being true.

Both reports are written locally too, as `.output-review/comment.md` and
`.output-review/summary.md`, so the CI rendering can be checked without
pushing.
