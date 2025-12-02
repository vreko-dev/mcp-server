# Testing Strategy & Coverage

**Last Updated:** December 2, 2025  
**Status:** Reference document for testing standards

---

## Overview

This document outlines the comprehensive testing strategy for SnapBack, including coverage targets, test types, and quality gates.

---

## Test Coverage Summary

### Current Coverage (As of November 2025)

**Unit Tests:**
- `@snapback/core`: 72% coverage (detection logic, Guardian)
- `@snapback/auth`: 55% coverage (authentication, API keys)
- `@snapback/events`: 60% coverage (event bus, telemetry)
- `@snapback/infrastructure`: 50% coverage (logging, metrics)
- `@snapback/contracts`: 20% coverage (mostly type tests)

**Integration Tests:**
- API routes: ~40% coverage
- File watching: 7 integration tests
- MCP enhanced: 10 tests

**E2E Tests:**
- See [e2e-guide.md](./e2e-guide.md) for comprehensive E2E testing guide
- Full user journey coverage
- Cross-service integration tests

### Target Coverage

| Package | Current | Target | Priority |
|---------|---------|--------|----------|
| @snapback/core | 72% | 85% | HIGH |
| @snapback/auth | 55% | 80% | HIGH |
| @snapback/api | 40% | 75% | HIGH |
| @snapback/events | 60% | 75% | MEDIUM |
| @snapback/infrastructure | 50% | 70% | MEDIUM |

---

## Test Types & Hierarchy

### 1. Unit Tests (Fastest)

**Purpose:** Test individual functions and classes in isolation

**Location:** `packages/*/tests/` or `apps/*/tests/`

**Framework:** Vitest

**Examples:**
```typescript
// packages/core/__tests__/detection/mock-replacement.test.ts
describe('MockReplacementPlugin', () => {
  it('detects console.log mocks', () => {
    const code = 'console.log = jest.fn();';
    const result = plugin.analyze(code);
    expect(result.issues).toHaveLength(1);
  });
});
```

**Coverage Target:** 70%+ per package

---

### 2. Integration Tests (Medium)

**Purpose:** Test interactions between modules and external services

**Location:** `packages/*/__tests__/integration/`

**Framework:** Vitest

**Examples:**
```typescript
// packages/core/__tests__/integration/file-watching.test.ts
describe('File Watching Integration', () => {
  it('triggers snapshot on file save', async () => {
    const watcher = createFileWatcher(testDir);
    await watcher.start();
    
    // Trigger file save
    await writeFile(testFile, 'new content');
    
    // Verify snapshot created
    const snapshots = await listSnapshots();
    expect(snapshots).toHaveLength(1);
  });
});
```

**Coverage Target:** 50%+ for critical flows

---

### 3. E2E Tests (Slowest)

**Purpose:** Test complete user workflows across all services

**Location:** `tests/e2e/`

**Framework:** Playwright

**See:** [e2e-guide.md](./e2e-guide.md) for comprehensive guide

**Coverage Target:** 100% of critical user journeys

---

## Performance Budgets

All performance metrics are enforced as test assertions:

### API Response Times
- Health check: < 100ms
- Risk analysis: < 200ms
- Snapshot creation: < 500ms
- Policy evaluation: < 200ms

### Bundle Sizes
- VSCode extension: < 5MB (current: ~3MB)
- Web app initial load: < 500KB
- MCP server: < 2MB

### Build Times
- Full monorepo: < 60 seconds (current: ~45s)
- Single package: < 10 seconds
- Type checking: < 15 seconds (current: ~12s)

---

## Quality Gates

All gates must pass before merge to `main`:

### Pre-commit (Lefthook)
- Linting (Biome)
- Type checking (TypeScript)
- Unit tests for changed files
- Format checking

### Pre-push
- All unit tests pass
- Build succeeds
- Type checking passes

### CI/CD Pipeline
- All tests pass (unit + integration + E2E)
- Coverage threshold met (70%)
- Performance budgets met
- Bundle size within limits
- Security scan passes

---

## Test Stability

### Zero Flakiness Tolerance

All tests must be stable and deterministic:

**Stability Gate:** Tests run 3 times sequentially, must pass all 3 runs

**Flaky Test Protocol:**
1. Mark as `.skip` immediately
2. Create GitHub issue with reproduction steps
3. Fix within 1 sprint
4. Delete test if unable to stabilize

### Common Flakiness Causes
- Race conditions (use proper async/await)
- Timing dependencies (avoid `setTimeout`, use `waitFor`)
- Shared state (isolate test data)
- Network dependencies (mock external services)

---

## Testing Best Practices

### Unit Tests

**✅ DO:**
- Test one thing per test
- Use descriptive test names
- Mock external dependencies
- Test edge cases and error conditions
- Use fixtures for complex data

**❌ DON'T:**
- Test implementation details
- Rely on test execution order
- Share state between tests
- Skip error handling tests

### Integration Tests

**✅ DO:**
- Test realistic scenarios
- Use test containers for databases
- Clean up resources after tests
- Test failure modes

**❌ DON'T:**
- Test across network boundaries (use E2E instead)
- Mock too much (defeats purpose)
- Ignore cleanup

### E2E Tests

See [e2e-guide.md](./e2e-guide.md) for comprehensive guide.

---

## Test Organization

### Directory Structure
```
packages/
├── core/
│   ├── src/
│   └── __tests__/
│       ├── unit/           # Unit tests
│       ├── integration/    # Integration tests
│       └── fixtures/       # Test data
apps/
├── vscode/
│   ├── src/
│   └── tests/
│       ├── unit/
│       └── integration/
tests/
└── e2e/                    # End-to-end tests
    ├── helpers/
    └── *.spec.ts
```

### Naming Conventions
- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.spec.ts`

---

## Known Test Issues

### SDK Migration Test Failures (baseline-test-report.md)

**@snapback/sdk:**
- **Status:** 68 failed | 166 passed (234 total)
- **Issue:** Type mismatches after migration
- **Priority:** HIGH
- **Tracking:** See baseline test report for details

**Main Issues:**
1. Type imports not aligned with new architecture
2. Mock adapter missing implementations
3. Path resolution in bundled tests

---

## Running Tests

### All Tests
```bash
# Run all tests
pnpm test

# Run specific package
pnpm --filter @snapback/core test

# Watch mode
pnpm test --watch
```

### Coverage
```bash
# Generate coverage report
pnpm test --coverage

# View HTML report
open coverage/index.html
```

### E2E Tests
```bash
# Run E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Debug mode
pnpm playwright test --debug
```

---

## Test Fixtures & Helpers

### Common Test Utilities

**packages/core/__tests__/fixtures/:**
- `sample-code.ts` - Code samples for detection testing
- `mock-guardian.ts` - Guardian test doubles

**tests/e2e/helpers/:**
- `auth.ts` - Authentication helpers
- `api.ts` - API client for E2E tests
- `docker.ts` - Docker service management

---

## Continuous Improvement

### Coverage Trends
- Track coverage over time
- Set increasing targets per quarter
- Celebrate coverage milestones

### Test Performance
- Monitor test execution time
- Optimize slow tests
- Parallelize where possible

### Test Quality
- Review failed tests weekly
- Refactor brittle tests
- Update documentation

---

## References

- [E2E Testing Guide](./e2e-guide.md) - Comprehensive E2E test guide
- [Vitest Documentation](https://vitest.dev/) - Unit/integration test framework
- [Playwright Documentation](https://playwright.dev/) - E2E test framework
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**For Test Baseline Data:** See reports/baseline-test-report.md (historical)  
**For E2E Test Guide:** See [e2e-guide.md](./e2e-guide.md)  
**For CI/CD Integration:** See `.github/workflows/test.yml`
