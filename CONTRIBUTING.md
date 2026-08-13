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

### When to apply the `output-review` label

CI applies it automatically when a PR touches anything that can change what
a user sees — `src/commands/**`, the `src/utils/print-*` renderers,
`write-summary-file`, `chart-renderer`, `compliance`, `severity-format`,
`src/config/schema.ts`, `fixtures/**`, or the baselines themselves. Add it
by hand when you have changed output in a way those paths do not capture
(an aggregator change that alters counts, say). The job is advisory: it
renders the diff and comments one row per case, and a human decides.

### Adding a case

One entry in `fixtures/cases.ts` plus, usually, one config in
`fixtures/configs/`. Nothing else knows the list — the runner, the CI job
and the PR comment all read it from there. `fixtures/README.md` explains
what each existing fixture proves; say the same for yours.

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

## Submission Process

1. Fork the repository and create a feature branch
2. Make your changes following these guidelines
3. Write or update tests as needed
4. Update documentation if applicable
5. Ensure all tests pass and code meets style requirements
6. Submit a pull request with a clear description of the changes

## Questions?

If you have questions about these guidelines or need clarification on contribution requirements, please open an issue for discussion.
