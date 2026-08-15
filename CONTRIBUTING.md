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
| `/tests`             | All tests (mirrors `/src`) |
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
runs the real CLI over `fixtures/` twice — once from your branch, once from
a fresh build of the target branch — across a matrix of commands, formats,
section toggles, severities and lock formats, and diffs what the two
actually printed: stdout, stderr, exit code, `--summary-file` output.

```bash
pnpm run test:output                    # compare against origin/main
pnpm run test:output -- --against beta  # compare against another branch
pnpm run test:output -- --filter comply
```

Nothing is committed for this to work against. Both sides of every
comparison are always the real, current output of real, current code, so
there is no baseline file to refresh, forget to refresh, or hand-edit —
`--against` just resolves and builds the branch you're naming, in an
isolated git worktree, and diffs your tree's output against it.

An output diff on its own is informational, not a failure: a changed output
isn't necessarily a bug, so `pnpm run test:output` exits 0 even when cases
differ. What does fail it is a genuine defect — an exit code that doesn't
match what a case asserts in `fixtures/cases.ts`, or a broken invariant (see
below).

### It runs on every PR, and it has to pass

The job runs on every pull request, posts a sticky comment with a row and a
link per case, and is a **required check** (`review`). If it's red, an
invariant broke or a case's exit code doesn't match its assertion — read the
comment or the job summary, and fix the behaviour; no local action makes
this pass on its own if the defect is real.

### Getting an output change past the `output:approved` gate

`review` only proves an output diff is *real* — it can't tell you whether
anyone looked at it, and merging a PR doesn't require that either. A second
required check in the same workflow, `output-approval`, is the gate for
that specifically:

- If nothing differs from the target branch, it passes on its own.
- If something does, it requires the `output:approved` label before merge —
  a deliberate act, separate from opening or approving the PR, that says "I
  read this diff."
- Any later push removes the label again, the same way GitHub dismisses a
  stale review on a new commit — an old approval can't silently cover a
  diff nobody re-read.

So: open the PR, read the output-review comment yourself (or have someone
else read it — either way works, this repo doesn't require a second
person), and apply `output:approved` once you're satisfied with the diff.

### Adding a case

One entry in `fixtures/cases.ts` plus, usually, one config in
`fixtures/configs/`. Nothing else knows the list — the runner, the CI job
and the PR comment all read it from there. `fixtures/README.md` explains
what each existing fixture proves; say the same for yours.

### Invariants

Some claims can't be settled by a diff: a diff records what changed, not
what must never happen. Those claims are named invariants in
`scripts/output-review.ts` — ANSI purity, exit code agreeing with the
printed verdict, `--format json` putting nothing but JSON on stdout, no
unscrubbed absolute paths or versions, suppressed sections staying absent,
and no orphaned case dossiers. `fixtures/README.md` lists them with what
each one guarantees.

A **blocking** invariant always fails the run. Mark one **advisory** only
when the breach is known, understood and tracked elsewhere — a permanently
red advisory job is one nobody reads.

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
  them and what they need to do about it. "Report `no-packages` hits under
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
