# TODO: Future Improvements

This document tracks remaining work and future enhancements for the React Usage Analyzer.

## 🎯 High Priority

### 1. Type Safety Improvements
- [ ] Add proper types to `cli.ts` (replace `any` types)
- [ ] Add types to `ReactComponentUsageAnalyzer` class methods (Postponed because we dont want classes anyway)
- [ ] Add types to `FocusedUsageAnalyzer` class methods (Postponed because we dont want classes anyway)
- [ ] Enable TypeScript strict mode gradually
- [ ] Add return types to all functions

**Impact**: Better IDE support, catch bugs at compile time

### 2. Testing Infrastructure
- [ ] Set up testing framework (Vitest)
- [ ] Add unit tests for lockfile parsers
- [ ] Add unit tests for file utilities
- [ ] Add integration tests for CLI commands
- [ ] Add tests for GitHub analysis workflow
- [ ] Test cross-platform compatibility (Windows/Linux/MacOS)

**Impact**: Confidence in refactoring, prevent regressions

### 3. Documentation
- [ ] Add JSDoc comments to all public APIs
- [ ] Document all CLI options with examples
- [ ] Create API documentation (TypeDoc)
- [ ] Add troubleshooting guide
- [ ] Document architecture decisions

**Impact**: Better developer experience, easier onboarding

## 🔧 Medium Priority

### 4. Code Quality
- [ ] Add ESLint configuration for TypeScript
- [ ] Add Biome for code formatting
- [ ] Add OXlint for code linting
- [ ] Make sure we DON'T set up pre-commit or preinstall postinstall scripts
- [ ] Add GitHub Actions for CI/CD with lint step, test step and build step
- [ ] Configure code coverage reporting

**Impact**: Consistent code style, automated quality checks

### 6. Feature Enhancements
- [ ] Add HTML report generation
- [ ] Add comparison with previous analysis (diff mode)
- [ ] Add configuration file support (`.ruarc.json`)

**Impact**: More versatile tool, better user experience

## 📦 Nice to Have

### 7. Distribution
- [ ] Create Docker image (Why?)

**Impact**: Easier installation and usage

### 8. Visualization
- [ ] Component dependency graphs
- [ ] Usage trends over time
- [ ] Heatmaps of component usage

**Impact**: Better insights, easier to communicate findings

## 🐛 Known Issues

### To Fix
- [ ] Some CLI functions still have duplicate logic (e.g., `printGitHubReport`)
- [ ] Error handling could be more consistent
- [ ] Windows path handling needs more testing
- [ ] Large repositories may cause memory issues

### To Investigate
- [ ] Performance on repositories with 10,000+ files
- [ ] Handling of non-standard import patterns
- [ ] Support for webpack/vite aliases

## 🔄 Refactoring Opportunities

### 1. Remove Redundancies
- [ ] Consolidate duplicate report formatting logic

### 2. Architecture Improvements
- [ ] Consider converting analyzer classes to functional API
- [ ] Implement Result/Either types for error handling
- [ ] Add dependency injection for better testability
- [ ] Separate concerns: parsing, analysis, reporting

### 3. Configuration Management
- [ ] Create centralized config loader
- [ ] Support environment variables
- [ ] Add config validation with zod/yup
- [ ] Support multiple config formats (JSON, YAML, TOML)

## 📋 Migration Cleanup

### Documentation Updates Needed
- [ ] Update all import examples in docs
- [ ] Add TypeScript usage examples

## 🎓 Learning & Research

### Topics to Explore
- [ ] Alternative AST parsers (Babel, acorn)
- [ ] Graph analysis for component dependencies
- [ ] Machine learning for pattern detection
- [ ] Static analysis best practices
- [ ] Performance optimization techniques

### Benchmarking
- [ ] Compare performance with similar tools
- [ ] Measure impact of TypeScript migration
- [ ] Test scalability limits
- [ ] Profile memory usage patterns

## 📊 Metrics & Monitoring

### To Implement
- [ ] Track analysis time per file
- [ ] Log error rates and types
- [ ] Monitor memory usage
- [ ] Collect usage statistics (opt-in)
- [ ] Create performance baseline

## 🔐 Security & Quality

### Security
- [ ] Audit dependencies for vulnerabilities
- [ ] Add security policy (SECURITY.md)
- [ ] Implement safe file operations
- [ ] Validate user inputs
- [ ] Add rate limiting for API calls

### Quality Gates
- [ ] Minimum test coverage (80%+)
- [ ] No high-severity security issues
- [ ] All TypeScript errors fixed
- [ ] Documentation complete
- [ ] Performance benchmarks met

## 🚀 Version 2.0 Ideas

### Major Features
- [ ] Component migration assistant
- [ ] Automated refactoring suggestions
- [ ] Codemods which works by describing a transformation for example <Col /> to <Stack variant="horizontal" />

### Breaking Changes (consider for v2)
- [ ] Pure functional API (remove classes)
- [ ] ESM-only (drop CommonJS)
- [ ] New config format
- [ ] Renamed CLI commands for consistency
- [ ] New report structure

## 📝 Notes

### Development Philosophy
- **Incremental over rewrite**: Make small, testable changes
- **Types first**: Add types before adding features
- **Test-driven**: Write tests for new features
- **Document as you go**: Keep docs up-to-date
- **Performance matters**: Profile before optimizing

### Pull Request Checklist
When contributing:
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Types are correct
- [ ] No TypeScript errors
- [ ] Linting passes
- [ ] Commits are descriptive
- [ ] PR description explains changes

### Version Planning

**v1.1.0** (Next Minor)
- Full type coverage
- Test suite
- Performance improvements

**v1.2.0**
- HTML reports
- Configuration file support
- More UI libraries

**v2.0.0** (Future Major)
- Breaking changes
- New architecture
- Plugin system

---

**Last Updated**: Migration to TypeScript complete
**Priority**: Focus on testing and type safety next
