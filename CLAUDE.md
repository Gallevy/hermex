# Project Context
This is an open source static analysis tool for frontend code. Prioritize code quality, comprehensive error reporting, accurate analysis, and adherence to community standards.

## Code Quality
- Write clean, readable, and well-documented code
- Follow existing code patterns and conventions in the repository
- Prioritize simplicity and clarity over cleverness
- Consider performance implications, especially for build tooling
- Write code that is easy to debug and maintain

## TypeScript/JavaScript
- Use TypeScript for type safety where applicable
- Prefer functional programming patterns when appropriate
- Avoid mutation; prefer immutable data structures
- Use async/await over raw promises for better readability
- Handle errors explicitly; don't let them fail silently

### Package Manager
- This project uses pnpm as its package manager
- Always use pnpm commands, not alternatives

### Tech Stack
- Runtime: Node.js 24
- Language: TypeScript 
- Build tool: tsup
- Test framework: vitest
- Linting: oxlint
- Formatter: biome
- Release: semantic-release
- CI/CD: GitHub Actions

### Project Structure
- `/src` - Core analysis engine
- `/src/commands` - Commander comamnds
- `/src/swc-parser` - SWC Static analysis parsing engine
- `/docs` - Documentation
- `/code-examples` - Code examples to demonstrate static analysis

## Documentation
- Update relevant documentation when making changes
- Update README.md if user-facing features change

## TypeScript/JavaScript
- Use TypeScript for type safety where applicable
- Prefer functional programming patterns when appropriate
- Avoid mutation; prefer immutable data structures
- Use async/await over raw promises for better readability
- Handle errors explicitly; don't let them fail silently

## Commits
- Write clear, descriptive commit messages
- Follow conventional commit format
- Keep commits focused and atomic
- Reference issue numbers where applicable

## Security
- Never commit secrets, tokens, or credentials
- Sanitize user inputs
- Validate data at boundaries
- Neveruse eval() and similar dynamic code execution
- Keep dependencies up to date for security
- Consider security implications of dependencies
