# SnapBack Code Review & Test Audit Suite

This directory contains scripts for comprehensive code review and testing audits based on the provided audit runlist.

## Overview

The audit suite performs the following checks:

1. **Static Integrity & Dependency Hygiene** - Type checking, linting, dependency analysis
2. **Requirements ↔ Tests Mapping** - Ensures requirements are covered by tests
3. **Coverage Authenticity** - Verifies test coverage meets thresholds
4. **Mock Boundary & Reality Checks** - Analyzes mock usage in tests
5. **Test Smells & Anti-Patterns** - Detects common testing issues
6. **API Surface Changes** - Ensures new APIs have test coverage

## Scripts

- `run-audit.ts` - Main audit runner
- `detect-test-smells.ts` - Finds test smells and anti-patterns
- `analyze-coverage.ts` - Analyzes test coverage against policies
- `analyze-mocks.ts` - Analyzes mock usage in tests
- `check-api-changes.ts` - Detects API surface changes requiring tests
- `generate-mapping.ts` - Maps requirements to tests
- `run-full-audit.ts` - Orchestrates all audit checks

## Usage

Run the full audit suite:

```bash
pnpm audit
```

Run individual audit checks:

```bash
pnpm audit:smells
pnpm audit:coverage
pnpm audit:mocks
pnpm audit:api
pnpm audit:mapping
```

## Output

Audit results are saved to `test/.audit-reports/`:

- `AUDIT_SUMMARY.md` - Main audit report
- `test_smells.json` - Detected test smells
- `requirements_to_tests.csv` - Requirements to tests mapping
- `coverage/` - Coverage reports

## Configuration

The audit suite uses policies defined in the original runlist:

- Coverage thresholds (85% statements, 80% branches, etc.)
- Mock usage limits (50% for unit tests, 10% for integration)
- Test value requirements (minimum assertions, no exclusive tests)
- Performance budgets
- API surface policies

## Dependencies

The audit scripts require:

- `tsx` for TypeScript execution
- `glob` for file pattern matching
- Standard project testing tools (Vitest, etc.)