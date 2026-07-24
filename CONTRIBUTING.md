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
| `/tests`             | All tests (mirrors `/src`)            |
| `/docs`              | Project documentation                 |
| `/fixtures`          | Code fixtures used by tests           |

## Style Guide

- Follow the existing code style and formatting conventions used throughout the project
- Run linting and formatting tools before submitting contributions
- Ensure consistency with the established patterns in the codebase

## Submission Process

1. Fork the repository and create a feature branch
2. Make your changes following these guidelines
3. Write or update tests as needed
4. Update documentation if applicable
5. Ensure all tests pass and code meets style requirements
6. Submit a pull request with a clear description of the changes

## Questions?

If you have questions about these guidelines or need clarification on contribution requirements, please open an issue for discussion.
