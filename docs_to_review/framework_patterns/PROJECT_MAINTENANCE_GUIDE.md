# Project Maintenance Guide

This guide provides instructions for maintaining the health and quality of the SnapBack web application.

## Scripts Overview

### 1. Dependency Cleanup
**File**: `scripts/cleanup-unused-deps.js`
**Purpose**: Identifies and helps remove unused dependencies
**Usage**: 
```bash
node scripts/cleanup-unused-deps.js
```

### 2. TODO Tracking
**File**: `scripts/track-todos.js`
**Purpose**: Finds and tracks TODO/FIXME/XXX comments in the codebase
**Usage**: 
```bash
node scripts/track-todos.js
```

### 3. Test Coverage Improvement
**File**: `scripts/improve-test-coverage.js`
**Purpose**: Analyzes test coverage and suggests improvements
**Usage**: 
```bash
node scripts/improve-test-coverage.js
```

### 4. Project Health Check
**File**: `scripts/project-health-check.js`
**Purpose**: Performs a comprehensive health check of the project
**Usage**: 
```bash
node scripts/project-health-check.js
```

## Regular Maintenance Schedule

### Daily
- Run tests to ensure no regressions
- Check for new TODO comments

### Weekly
- Run dependency cleanup script
- Run project health check
- Review test coverage

### Monthly
- Run TODO tracking script
- Review and update project documentation
- Perform security audit

## Issue Resolution Priority

### Critical (Fix Immediately)
1. Build failures
2. Runtime errors
3. Security vulnerabilities

### High (Fix Within 1 Week)
1. Unused dependencies
2. Broken tests
3. Performance issues

### Medium (Fix Within 1 Month)
1. TODO/FIXME comments
2. Missing tests
3. Code quality issues

### Low (Fix Within 3 Months)
1. Minor code smells
2. Documentation improvements
3. Technical debt reduction

## Best Practices

### Dependency Management
- Regularly audit dependencies with `pnpm audit`
- Remove unused dependencies promptly
- Keep dependencies up to date
- Use exact versions for critical dependencies

### Code Quality
- Follow established coding standards
- Run linters before committing
- Maintain test coverage above 70%
- Address TODO comments promptly

### Testing
- Write tests for new features
- Maintain existing test suites
- Add integration tests for critical flows
- Monitor test execution times

### Documentation
- Update documentation with code changes
- Maintain clear README files
- Document complex logic and decisions
- Keep API documentation current

## Troubleshooting Common Issues

### "@tailwindcss/postcss" Module Not Found
**Solution**: Ensure you're using the correct Tailwind CSS v4 configuration:
1. Use `@import "tailwindcss"` in CSS files instead of `@tailwind` directives
2. Remove `autoprefixer` from PostCSS configuration
3. Verify `@tailwindcss/postcss` is in dependencies

### Build Failures
**Solution**: 
1. Check for circular dependencies with `npx madge --circular`
2. Verify all dependencies are installed with `pnpm install`
3. Check for TypeScript errors with `pnpm type-check`

### Test Failures
**Solution**:
1. Ensure all required dependencies are installed
2. Check test configuration files
3. Verify test environment setup

## Contact Information

For questions about this maintenance guide, contact the project maintainers.