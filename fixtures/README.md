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
| [`cases/`](./cases/) | One generated dossier per case — what it asserts, what it runs, and how to run it yourself. Regenerated every time `pnpm run test:output` runs. |

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
installed but never imported (`moment` — the `no-packages` case from
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
| [`repos/all-rule-types/`](./repos/all-rule-types/README.md) | All nine file- and manifest-based rule types firing at once, at three severities. `require-repo-name-match` is absent by necessity — it needs a `.git/config`, which git will not track inside this repo, so unit and e2e tests cover it. The only fixture that renders an `require-engine-version`, `codeowners`, or package-field row, so it is the one that covers those renderers at all. Its CODEOWNERS deliberately leaves one file unowned and gives another to a team outside `requiredOwners` — which is how it surfaced #95. |
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

A diff records what changed. It cannot record what must *never* happen —
three lock formats can drift apart in the same commit and still agree with
each other's *new* wrong answer; a gap in the scrubber carries through
unnoticed because both sides of the comparison share the same bug.

So some claims live outside the diff, in `scripts/output-review.ts`. Each is
named, says what it guarantees, and is reported separately from the
per-case diffs:

| Invariant | Guarantees |
| --- | --- |
| `lockfile-parity` | The same dependency tree parses to the same inventory whichever lock format records it. |
| `ansi-purity` | Nothing but a deliberately coloured case emits escape sequences — and a file written with `--summary-file` never does, whatever the colour settings. |
| `exit-code-agrees-with-verdict` | A script reading the exit code and a human reading the verdict reach the same conclusion. Covers both the human wording and `compliance.compliant` in JSON. |
| `json-stdout-is-only-json` | `--format json` puts nothing but the payload on stdout, so it can be piped straight into a parser — progress chrome belongs on stderr (#55). |
| `no-unscrubbed-volatiles` | No case's output records an absolute path, a process id or a released version, any of which would make the next run differ for reasons that are not code changes. |
| `suppressed-sections-stay-absent` | A section switched off in config leaves no trace (#63). Driven by each case's `absent` list, because an absence nobody states is an absence nobody notices. |
| `no-orphaned-case-docs` | Every dossier at `cases/<name>.md` belongs to a live case, so a renamed case cannot leave a page nobody reads behind. |

All of them are **blocking**: they always fail the run, because they
describe things that must never be true regardless of what changed.
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
pnpm run test:output                    # compare against origin/main
pnpm run test:output -- --against beta  # compare against another branch
pnpm run test:output -- --filter comply
```

Nothing is committed for this to compare against — `--against` resolves and
builds the named branch in an isolated git worktree, then diffs this tree's
stdout, stderr, exit code and any written file against that build's. Both
sides are always real output of real code, so changing hermex's output
shows up as a live diff in the same PR that causes it, without a baseline
file to remember to refresh.

Adding a case is one entry in `cases.ts` plus (usually) one config in
`configs/`. Nothing else knows the list — the runner, the CI job and the PR
comment all read it from there.

### Where the review shows up

Two views, deliberately not the same view:

Three surfaces, split by what stays put and what changes every run:

| Where | Shows | For |
| --- | --- | --- |
| [`cases/<name>.md`](./cases/) | The **case dossier** — what it asserts, its command, config, fixture, asserted exit code, and how to run it. Committed, and generated from `cases.ts`. | Answering "what is this case?" at any time, in git, without a CI run. |
| **The sticky PR comment** | One row per **changed** case: name, `+N −M`, and a single link. | Triage — which cases moved, by how much, is that the set you expected? |
| **A page per case** (`.output-review/site/`) | One Markdown page per case with its context, **the config it ran under, inlined**, the full diff, and complete stdout, stderr and written files. | Reading one case, without any chance of confusing it with another. |

The comment carries **no diffs at all**. An output change is rarely one line
in one case — swapping a table border character rewrites every row of
sixteen cases at once, which measured 60 KB against GitHub's
65,536-character limit and was unreadable long before it would be rejected.
The comment is bounded by construction: one row per case, one link each, and
the case page is where the reading happens.

Diffs are unified format. `-` is the target branch, `+` is this run, and
`@@ -12,7 +12,9 @@` is a hunk header: unchanged lines were skipped, and the
hunk below covers 7 lines starting at line 12 of the target branch's output
and 9 lines starting at line 12 of this run.

Everything is written locally too — `.output-review/comment.md`,
`summary.md` and `site/index.html` — so the CI rendering can be read
without pushing.

### Publishing the case pages

The pages are generated on every run regardless, and uploaded as the
`output-review-site` artifact. To have the PR comment link them directly:

1. Enable GitHub Pages for the repo, serving from the `gh-pages` branch.
2. Set a repository **variable** `OUTPUT_REVIEW_SITE` to the base URL, e.g.
   `https://gallevy.github.io/hermex/output-review`.

The workflow then publishes each PR's pages to `gh-pages` under
`output-review/pr-<number>/`, overwritten on each run so the branch does not
grow without bound. Leave the variable unset and nothing publishes — the
comment links the job summary instead. Hosting is a repository setting, not
a code change.

The pages are **Markdown**, rendered by Pages' own Jekyll build with
`jekyll-theme-primer` — GitHub's own theme, written to `_config.yml` at the
branch root by the publish step. That is deliberate: it is the same language
the job summary and the dossiers are written in, so all three come out of
one renderer, and there is no stylesheet for anyone to own. Diff colouring
comes from the ` ```diff ` fence rather than from CSS.

The one Jekyll sharp edge worth knowing: **Liquid runs before Markdown**, so
a stray `{{` in captured CLI output would fail the build for every PR at
once. Every page body is wrapped in `{% raw %}` for exactly that reason, and
there is a test that stops someone removing the wrapper as noise.

### Adding or changing a case

`cases/<name>.md` is **generated**, on every `pnpm run test:output` run —
there's no separate step to remember. Edit the case in `cases.ts` instead,
including its optional `notes`, which is the one part no generator can
derive; the dossier regenerates itself the next run. `no-orphaned-case-docs`
only has to catch the one thing regeneration can't fix on its own: a page
whose case was renamed or deleted.
