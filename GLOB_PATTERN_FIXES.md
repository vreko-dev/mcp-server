# Glob Pattern Fixes for Audit Scripts

**Status**: ✅ All audit scripts fixed
**Date**: 2025-11-04
**Issue**: Invalid glob patterns causing `TypeError: invalid pattern`

---

## Problem

The audit scripts were using `glob.sync()` incorrectly by passing arrays of patterns directly. The glob library (v11+) doesn't accept arrays of patterns as the first argument.

### Error Message:
```
TypeError: invalid pattern
    at assertValidPattern (minimatch.js:275:11)
```

---

## Root Cause

```javascript
// ❌ WRONG - glob.sync doesn't accept arrays
const files = glob.sync([
  "test/**/*.spec.ts",
  "apps/*/test/**/*.spec.ts",
  "packages/*/test/**/*.spec.ts"
], { ... });
```

---

## Solution

Loop through patterns individually and collect results:

```javascript
// ✅ CORRECT - iterate through patterns
const patterns = [
  "test/**/*.{spec,test}.ts",
  "apps/*/test/**/*.{spec,test}.ts",
  "packages/*/test/**/*.{spec,test}.ts"
];

const allFiles: string[] = [];
for (const pattern of patterns) {
  const files = glob.sync(pattern, { ignore: ["node_modules/**"], cwd });
  allFiles.push(...files.map(file => path.resolve(cwd, file)));
}
```

**Bonus**: Used brace expansion `*.{spec,test}.ts` to match both patterns in one go.

---

## Fixed Files

### 1. `scripts/audit/analyze-mocks.ts` ✅
**Function**: `findTestFiles()`
- Fixed unit test file discovery
- Fixed integration test file discovery
- **Before**: 0 files found
- **After**: 238 unit + 59 integration = 297 test files

### 2. `scripts/audit/detect-test-smells.ts` ✅
**Function**: `findTestFiles()`
- Fixed test file discovery
- Changed from async glob array to loop
- **Before**: 0 files found
- **After**: 390 test files found

### 3. `scripts/audit/generate-mapping.ts` ✅
**Functions**: `findDocumentationFiles()` + `findTestFiles()`
- Fixed documentation file discovery
- Fixed test file discovery
- **Before**: 0 docs, 0 tests
- **After**: 230 docs + 390 tests

---

## Test Results

### ✅ audit:mocks (Working)
```bash
Found 238 unit test files
Found 59 integration test files
Mock Analysis Results:
  Unit tests: 1855 mocks in 238 files (ratio: 7.79)
  Integration tests: 506 mocks in 59 files (ratio: 8.58)
```

### ✅ audit:smells (Working)
```bash
Found 390 test files
Errors found: 21 empty tests, 1 exclusive test
```

### ✅ audit:mapping (Working)
```bash
Found 230 documentation files
Found 390 test files
Extracted 4 requirements
```

### ✅ audit:api (Already Working)
```bash
Found 13 exported APIs
13 lack test coverage
```

### ⚠️ audit:coverage (Needs Tests)
```bash
Coverage 0% - No coverage data generated yet
```

---

## Key Insights from Results

### 1. **High Mock Ratios** 🚨
- Unit tests: **7.79 mocks/file** (target: <0.5)
- Integration tests: **8.58 mocks/file** (target: <0.1)
- **Action**: Replace mocks with real subsystems using `test/setup/noNetwork.ts`

### 2. **Empty Tests** 🚨
- **21 empty test bodies** found
- **1 `.only()` exclusive test** found
- **Action**: Fill with assertions or remove

### 3. **API Coverage Gap** 🚨
- **13/13 exported APIs** lack test coverage (100% uncovered)
- APIs: FeatureManager, SnapbackClient, ProtectionClient, etc.
- **Action**: Add integration tests for each exported API

### 4. **Network Mocks** ⚠️
- **36 network mocks** found (policy forbids them)
- **Action**: Use `startTelemetrySpy()` from test/setup/noNetwork.ts

---

## Recommendations

### High Priority (Do Now)
1. ✅ **Glob patterns fixed** - All audit scripts working
2. 🔄 **Remove `.only()` test** - Check [apps/vscode/test/extension.test.ts:28](apps/vscode/test/extension.test.ts#L28)
3. 🔄 **Fill empty tests** - 21 tests with no assertions
4. 🔄 **API test coverage** - Add tests for all 13 exported APIs

### Medium Priority (Next Sprint)
1. **Reduce mock ratios**
   - Target unit: 7.79 → 0.5
   - Target integration: 8.58 → 0.1
   - Use real git/fs/vscode subsystems

2. **Replace network mocks**
   - Remove 36 network mocks
   - Use telemetry spy helper instead

### Low Priority (Backlog)
1. **Generate coverage** - Run `pnpm test:coverage` to get baseline
2. **REQ-#### tagging** - Tag tests with requirement IDs

---

## Commands Reference

```bash
# Run all audits
pnpm audit:mocks      # Mock usage analysis
pnpm audit:smells     # Test quality issues
pnpm audit:api        # API surface coverage
pnpm audit:mapping    # Requirements traceability
pnpm audit:coverage   # Coverage analysis (needs test run first)

# Generate coverage first
pnpm test:coverage    # Run tests with coverage

# Full audit sweep
pnpm test:coverage && \
  pnpm audit:coverage && \
  pnpm audit:mocks && \
  pnpm audit:smells && \
  pnpm audit:api && \
  pnpm audit:mapping
```

---

## Success Metrics

### Before Fixes
- ❌ audit:mocks: 0 files found
- ❌ audit:smells: 0 files found
- ❌ audit:mapping: 0 docs, 0 tests found
- ✅ audit:api: Working (13 APIs found)

### After Fixes
- ✅ audit:mocks: 297 test files found
- ✅ audit:smells: 390 test files found
- ✅ audit:mapping: 230 docs + 390 tests found
- ✅ audit:api: Working (13 APIs found)

### Quality Metrics (Current State)
- Mock ratio (unit): **7.79** (target: <0.5) 🚨
- Mock ratio (integration): **8.58** (target: <0.1) 🚨
- Empty tests: **21** (target: 0) 🚨
- Exclusive tests: **1** (target: 0) 🚨
- API coverage: **0%** (target: 100%) 🚨
- Network mocks: **36** (target: 0) ⚠️

---

**Status**: Audit tooling fixed, quality issues identified and ready to address
**Next**: Remove `.only()`, fill empty tests, add API coverage
