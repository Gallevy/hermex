# Project Context
This is an open source static analysis tool for frontend code called **hermex**. Prioritize code quality, comprehensive error reporting, accurate analysis, and adherence to community standards.

## Package Manager
- This project uses **pnpm** as its package manager
- ALWAYS use pnpm commands, never npm or yarn

## Tech Stack
- Runtime: Node.js 24
- Language: TypeScript 
- Build tool: tsup
- Test framework: vitest
- Linting: oxlint
- Formatter: biome
- Release: semantic-release
- CI/CD: GitHub Actions

## Project Structure
- `/src` - Core analysis engine
- `/src/commands` - Commander commands
- `/src/swc-parser` - SWC static analysis parsing engine
- `/src/utils` - Utility functions
- `/docs` - Documentation
- `/fixtures` - Code fixtures to demonstrate static analysis
- `/tests` - All tests

## Development Workflow

### Available Commands
```bash
# Building
pnpm run build          # Build the project with tsup
pnpm run build:ci       # Clean build for CI

# Testing
pnpm run test           # Run tests in watch mode
pnpm run test:ci        # Run tests once (for CI)

# Linting & Formatting
pnpm run lint           # Lint code with oxlint
pnpm run lint:ci        # Lint for CI
pnpm run format         # Format code with biome
pnpm run format:ci      # Check formatting for CI
pnpm run check          # Run biome checks

# Development
pnpm run dev:scan       # Build and run scan on fixtures
```

### Feedback Loop - IMPORTANT
After making code changes, ALWAYS run the appropriate validation commands:

1. **After writing code**: Run `pnpm run build` to ensure it compiles
2. **After fixing bugs**: Run `pnpm run test` to verify tests pass
3. **Before committing**: Run `pnpm run lint` and `pnpm run format`
4. **To run the CLI**: Run `pnpm run dev:scan`

If any command fails, FIX the issues before considering the task complete.

## Code Quality Standards

### TypeScript/JavaScript
- Use TypeScript for type safety where applicable
- Prefer functional programming patterns when appropriate
- Avoid mutation; prefer immutable data structures
- Use async/await over raw promises for better readability
- Handle errors explicitly; don't let them fail silently
- Write code that is easy to debug and maintain

### Best Practices
- Write clean, readable, and well-documented code
- Follow existing code patterns and conventions in the repository
- Prioritize simplicity and clarity over cleverness
- Consider performance implications, especially for build tooling
- Keep functions small and focused on a single responsibility

## Testing
- Write tests for new features and bug fixes
- Run tests before committing: `pnpm run test:ci`
- Ensure all tests pass before marking work as complete
- Tests should be clear, focused, and test one thing at a time

## Documentation
- Update relevant documentation when making changes
- Update README.md if user-facing features change
- Add JSDoc comments for public APIs and complex functions

## Commits
- Write clear, descriptive commit messages
- Follow conventional commit format (feat:, fix:, docs:, etc.)
- Keep commits focused and atomic
- Reference issue numbers where applicable

## Security
- Never commit secrets, tokens, or credentials
- Sanitize user inputs
- Validate data at boundaries
- Never use eval() and similar dynamic code execution
- Keep dependencies up to date for security
- Consider security implications of dependencies
