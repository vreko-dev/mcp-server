# SnapBack Test Audit System

This directory contains a comprehensive test audit system for the SnapBack project, implementing all requirements from the provided audit runlist version 1.0.

## System Overview

The audit system performs comprehensive code review and testing validation across multiple dimensions:

1. **Static Analysis** - Type checking, linting, dependency hygiene
2. **Test Quality** - Smell detection, coverage analysis, mock usage
3. **Requirements Traceability** - Mapping between requirements and tests
4. **API Validation** - Ensuring new APIs have proper test coverage

## Audit Scripts

All audit scripts are located in the `scripts/audit/` directory:

### Main Audit Runner
- `scripts/run-full-audit.ts` - Executes all audit checks
- `scripts/audit/run-audit.ts` - Core audit implementation

### Individual Audit Components
- `scripts/audit/detect-test-smells.ts` - Finds test smells and anti-patterns
- `scripts/audit/analyze-coverage.ts` - Analyzes test coverage against policies
- `scripts/audit/analyze-mocks.ts` - Analyzes mock usage in tests
- `scripts/audit/check-api-changes.ts` - Detects API surface changes requiring tests
- `scripts/audit/generate-mapping.ts` - Maps requirements to tests

## Usage

### Run Full Audit
```bash
pnpm audit
```

### Run Individual Audit Components
```bash
# Test smell detection
pnpm audit:smells

# Coverage analysis
pnpm audit:coverage

# Mock usage analysis
pnpm audit:mocks

# API change detection
pnpm audit:api

# Requirements to tests mapping
pnpm audit:mapping
```

## Audit Policies Enforced

### Coverage Requirements
- **Global minimums**: 85% statements, 80% branches, 85% functions, 85% lines
- **Per-file minimums**: 70% statements, 65% branches, 70% functions, 70% lines

### Test Quality Policies
- **Mock ratios**: ≤50% for unit tests, ≤10% for integration tests
- **Exclusive tests**: Forbidden (no .only or .skip allowed)
- **Skipped tests**: ≤5% of total tests allowed
- **Assertions**: Minimum 1 assertion per test

### Performance Budgets
- **Activation time**: P95 < 500ms
- **Diff parsing**: 10k lines < 150ms
- **Memory usage**: Steady state < 50MB, Peak < 200MB

## Output Reports

Audit results are saved to `test/.audit-reports/`:

- `AUDIT_SUMMARY.md` - Main audit report with findings and recommendations
- `test_smells.json` - Detailed test smells in JSON format
- `requirements_to_tests.csv` - Requirements to tests mapping
- `coverage/` - Coverage reports directory

## Integration with Existing Tools

The audit system integrates with the project's existing tooling:

- **TypeScript**: Uses `pnpm typecheck` for type validation
- **Biome**: Uses `pnpm lint` for code quality checks (replaces ESLint)
- **Vitest**: Uses existing test infrastructure for coverage analysis
- **Turbo**: Leverages monorepo task orchestration

## Key Findings Summary

The initial audit run identified several areas for improvement:

1. **Test Quality**: 137 test smells detected including empty tests and exclusive tests
2. **Coverage Gaps**: Current coverage significantly below policy thresholds
3. **Code Quality**: Biome linting errors throughout the codebase
4. **Dependency Issues**: Unused dependencies that should be removed

## Next Steps

1. Review the detailed audit reports in `test/.audit-reports/`
2. Address the identified test smells and quality issues
3. Improve test coverage to meet policy requirements
4. Fix code quality issues identified by Biome
5. Integrate audit scripts into CI/CD pipeline for ongoing validation

## Customization

The audit system can be customized by modifying the policy thresholds in each script file. All policies are clearly defined at the top of each audit component for easy adjustment.