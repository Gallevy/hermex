# Contributing Guidelines

Thank you for your interest in contributing to this project. Please review the following guidelines before submitting your contributions.

## Getting Started

This project uses **pnpm** — always use pnpm commands, not npm or yarn.

```bash
pnpm install             # install dependencies

pnpm run build            # build with tsdown
pnpm run typecheck        # type-check with tsc --noEmit
pnpm run test:ci           # run the test suite once
pnpm run lint              # lint with oxlint
pnpm run format            # format with oxfmt (writes in place)
```

All of the above (`typecheck`, `test:ci`, `lint:ci`, `format:ci`, `build:ci`)
run in CI on every pull request — run them locally before submitting.

### Code Quality Standards

- **Incremental Changes**: Submit small, focused changes that maintain project stability. Avoid large, monolithic pull requests that combine multiple unrelated features or fixes.
- **Type Safety**: All code must be written in TypeScript with strict type checking enabled (`tsconfig.json`'s `strict: true`, plus `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, and `noFallthroughCasesInSwitch`). Avoid using `any` types unless absolutely necessary and well-documented.
- **Functional Programming**: Use functional programming paradigms. Classes are not permitted; prefer pure functions, composition, and immutability.
- **Code Clarity**: Write clear, self-documenting code. Variable and function names should be descriptive and follow established naming conventions.

### Testing and Documentation

- **Test Coverage**: All new features and bug fixes must include appropriate test coverage.
- **Documentation**: Update relevant documentation for any changes that affect public APIs, functionality, or user-facing behavior.
- **Code Comments**: Add comments for complex logic or non-obvious implementation decisions.

## Project Structure

All contributions must adhere to the following directory structure:

| Directory           | Purpose                              |
| ------------------- | ------------------------------------- |
| `/src`               | Source code                           |
| `/src/commands`      | CLI command implementations           |
| `/src/config`        | Config loading and zod schema         |
| `/src/rules`         | Compliance rules engine               |
| `/src/swc-parser`    | SWC-based AST parsing engine          |
| `/src/npm-registry`  | Registry client, cache, release-age enrichment |
| `/src/lock-parser`   | npm/yarn/pnpm lockfile adapters       |
| `/src/utils`         | Shared utilities and output formatting |
| `/tests`             | All tests (mirrors `/src`), plus the committed output baselines |
| `/docs`              | Project documentation                 |
| `/fixtures`          | Fixture repos hermex analyzes, and the output-review matrix — see `fixtures/README.md` |
| `/scripts`           | Repo tooling that is not part of the published package |

## Style Guide

- Follow the existing code style and formatting conventions used throughout the project
- Run linting and formatting tools before submitting contributions
- Ensure consistency with the established patterns in the codebase

## Reviewing Output Changes

Hermex's value is what it prints and the verdict it returns, and the unit
suite does not look at either. The **output review** closes that gap: it
runs the real CLI over `fixtures/` across a matrix of commands, formats,
section toggles, severities and lock formats, then diffs everything each
case emitted — stdout, stderr, exit code, `--summary-file` output — against
a committed baseline.

```bash
pnpm run test:output                  # compare against the baselines
pnpm run test:output -- --update      # refresh them after an intended change
pnpm run test:output -- --filter comply
```

Baselines live in `tests/__output_baselines__/<case>/`. They are committed
on purpose: **refreshing a baseline is part of your PR diff**, which is what
makes "is this change intended?" answerable in review.

The check never trusts the committed file on its own — it re-runs the real
CLI and diffs live output against whatever is checked in, so a stale
baseline and a hand-typed, incorrect one are caught the same way: neither
can pass unless it's byte-identical to what the code actually prints.
What review adds on top is the one thing CI can't check mechanically —
whether the new output is the output you actually want.

### It runs on every PR, and it has to pass

The job runs on every pull request, posts a sticky comment with a row and a
link per case, and is a **required check**.

If it is red, one of two things happened:

1. **The output changed and the baselines did not.** Read the comment or the
   job summary, confirm every diff is what you meant, then run
   `pnpm run test:output -- --update` and commit the result. The refreshed
   baselines are the record of what you approved.
2. **An invariant broke.** No baseline refresh fixes that — an invariant
   describes what must never happen, so the check stays red until the
   behaviour changes.

### Getting a baseline change past the `output:approved` gate

`review` (above) proves the committed baseline is *true* — it can't tell you
whether anyone actually looked at it. A required approving review doesn't
either: a reviewer can approve a PR on the code alone without ever opening
the output-review comment. `.github/workflows/output-approval.yaml` is the
gate for that specifically:

- It diffs `tests/__output_baselines__/` against `main`. No difference, no
  gate — the check passes on its own.
- A difference requires the `output:approved` label, applied by someone
  **other than the PR author** (GitHub doesn't block self-labeling the way
  it blocks self-approving a review, so this is enforced in the workflow).
- A later push that touches the baselines again removes the label — an old
  approval can't silently cover a different diff than the one it was given
  for.

So: open the PR with your refreshed baselines already committed, point a
reviewer at the output-review comment, and ask them to apply
`output:approved` once they've read it.

### Adding a case

One entry in `fixtures/cases.ts` plus, usually, one config in
`fixtures/configs/`. Nothing else knows the list — the runner, the CI job
and the PR comment all read it from there. `fixtures/README.md` explains
what each existing fixture proves; say the same for yours.

### Invariants

Some claims cannot live in a baseline: `--update` rewrites every baseline at
once, so a rule encoded only in the recorded bytes is absorbed the moment
those bytes change together. Those claims are named invariants in
`scripts/output-review.ts` — ANSI purity, exit code agreeing with the
printed verdict, `--format json` putting nothing but JSON on stdout, no
unscrubbed absolute paths or versions, suppressed sections staying absent,
and no orphaned baseline directories. `fixtures/README.md` lists them with
what each one guarantees.

A **blocking** invariant fails the run even under `--update`. Mark one
**advisory** only when the breach is known, understood and tracked
elsewhere — a permanently red advisory job is one nobody reads.

### Keeping output deterministic

A case that differs between two runs of identical code makes the whole
review worthless, so anything volatile has to be pinned at the source
rather than papered over:

- Release ages are recorded as **days before now**, not dates, and served
  from a local fixture registry — never the network.
- File discovery is sorted in `src/utils/file-utils.ts`, not sorted after
  the fact, so a real ordering regression still shows up.
- Colour, the registry cache and every `HERMEX_*` variable are pinned per
  case by the runner rather than inherited.

If you add something time-, path- or environment-dependent to the output,
pin it before you add a case that renders it.

## Describing Your Change

hermex versions and publishes with [Changesets](https://changesets.dev). If your
PR changes anything a user of hermex would notice, add a changeset to it:

```bash
pnpm changeset
```

Pick the bump type, then write the summary. Two things to get right:

- **Pick the bump from the user's point of view.** `patch` for a fix, `minor`
  for a new rule, option or output field, `major` for anything that breaks an
  existing config or changes the shape of existing output. Renaming or removing
  a field in the scan JSON is a breaking change even when the code change is
  small — people parse that output.
- **Write the summary for someone upgrading, not for a reviewer.** It goes
  straight into the changelog and the GitHub Release, so say what changed for
  them and what they need to do about it. "Report `forbid_packages` hits under
  `ruleViolations`" is useful; "refactor rule plumbing" is not.

This writes a Markdown file to `.changeset/`. Commit it with your change — a
bot comments on every PR saying whether one is present.

Not every PR needs one. Docs, CI, refactors and test-only changes release
nothing, so they legitimately carry no changeset and CI will not fail without
one. If you want to be explicit that a change is deliberately unreleasable, run
`pnpm changeset add --empty`.

## How Releases Happen

You do not need to do anything beyond adding a changeset — releases are not cut
by hand and versions are never edited directly.

1. Merging a PR that carries a changeset opens (or updates) a **Version
   Packages** PR. It applies the pending changesets: bumps the version in
   `package.json` and writes the new `CHANGELOG.md` entries.
2. That PR is the release gate. Reviewing it means reviewing the exact version
   and the exact release notes before anything is published.
3. Merging it publishes to npm with provenance, tags the commit `vX.Y.Z`, and
   cuts a GitHub Release from the changelog entry.

Changesets accumulate, so several merged PRs batch into one release rather than
publishing once per merge.

## Submission Process

1. Fork the repository and create a feature branch
2. Make your changes following these guidelines
3. Write or update tests as needed
4. Update documentation if applicable
5. Add a changeset if the change is user-facing (see above)
6. Ensure all tests pass and code meets style requirements
7. Submit a pull request with a clear description of the changes

## Questions?

If you have questions about these guidelines or need clarification on contribution requirements, please open an issue for discussion.
