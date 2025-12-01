# MCP Server Test Strategy

## Overview

This document outlines the comprehensive testing strategy for the MCP (Model Context Protocol) server, designed to prevent regressions and ensure production reliability.

## Problem Statement

**What Happened**: Between Oct 5-26, real `FileSystemStorage` was replaced with mock storage that returned fake data. The production code appeared to work but never actually persisted snapshots.

**Why Tests Didn't Catch It**: Existing tests used mocks to validate behavior, never verifying real persistence. Tests passed with fake storage because they tested mock behavior, not reality.

**Lesson Learned**: Mocking can hide critical bugs. E2E tests with real dependencies are essential for catching integration failures.

## Test Pyramid

```
        /\
       /  \  E2E Tests (test/e2e/)
      /____\  - Real FileSystemStorage
     /      \  - Real EventBus
    /________\ - No mocks
   /          \
  /____________\ Integration Tests (test/)
 /              \ - Partial mocks
/________________\ - Tool handler validation

        Unit Tests (test/*.test.ts)
        - Fast, focused
        - Mock external dependencies
        - Business logic validation

    Smoke Tests (test/smoke/)
    - Build validation
    - Dependency verification
    - Module resolution
```

## Test Layers

### 1. Smoke Tests (`test/smoke/`)

**Purpose**: Fast feedback on build and dependency issues

**What They Catch**:

-   Missing dependencies in package.json
-   TypeScript compilation errors
-   Module resolution failures
-   Import/export configuration issues

**Example**: `build.smoke.test.ts`

```typescript
// Would have caught missing @snapback/events dependency
it("should have all imported packages in dependencies", async () => {
	const imports = [...indexFile.matchAll(importRegex)];
	const missing = imports.filter((imp) => !allDeps[imp]);
	if (missing.length > 0) {
		throw new Error(`Missing dependencies: ${missing.join(", ")}`);
	}
});
```

**When They Run**:

-   Pre-push hook (via lefthook)
-   Only if MCP server files changed
-   ~10-20 seconds

### 2. E2E Tests (`test/e2e/`)

**Purpose**: Validate real system integration with ZERO mocks

**What They Catch**:

-   Mock storage being used instead of real FileSystemStorage
-   Event bus failures
-   Real file system persistence issues
-   Data corruption or serialization bugs

**Example**: `storage.e2e.test.ts`

```typescript
// CRITICAL: Would have caught the mock storage bug
it("CRITICAL: create() must not return fake data", async () => {
	const snapshot = await storage.create({ trigger: "test" });

	// If storage was fake, this would fail because:
	// - Mock returns { id: "snap-fake" }
	// - But retrieve() returns null (no real file)
	const retrieved = await storage.retrieve(snapshot.id);
	expect(retrieved).not.toBeNull(); // ← Catches mock!
});
```

**When They Run**:

-   Pre-push hook (via lefthook)
-   Only if MCP server files changed
-   ~5-10 seconds

### 3. Integration Tests (`test/`)

**Purpose**: Validate tool handlers and MCP protocol compliance

**What They Catch**:

-   Tool input/output validation
-   JSON-RPC protocol violations
-   Error handling and sanitization
-   Performance budget violations

**Example**: `server.test.ts`

```typescript
// Validate tool contracts
it("analyze_suggestion should validate input", async () => {
	const result = await server.callTool("snapback.analyze_suggestion", {
		code: "test",
		// Missing required file_path
	});

	expect(result.isError).toBe(true);
	expect(result.content[0].text).toContain("validation failed");
});
```

**When They Run**:

-   Pre-push hook via `pnpm turbo test --filter=[HEAD^]`
-   ~3-5 seconds

### 4. Unit Tests (`test/`)

**Purpose**: Fast feedback on business logic

**What They Catch**:

-   Zod schema validation
-   Error message formatting
-   Performance tracking logic

**When They Run**:

-   Pre-push hook
-   Part of standard test suite

## CI/CD Integration

### Lefthook Hooks

#### Pre-Commit (<5s)

-   Lint staged files
-   Type check staged packages
-   Security checks (secrets, console.log)
-   Import boundary validation

**Does NOT include**: Smoke or E2E tests (too slow for pre-commit)

#### Pre-Push (15-30s)

-   Type check affected packages
-   **Smoke tests** (if MCP server changed)
-   **E2E tests** (if MCP server changed)
-   Unit tests on affected packages
-   Lint affected packages

**MCP Server Smoke Tests**:

```yaml
mcp-server-smoke:
    tags: [smoke, mcp]
    glob: "apps/mcp-server/**/*.{ts,json}"
    run: |
        MCP_FILES=$(git diff --cached --name-only | grep "^apps/mcp-server/" || true)
        if [ -n "$MCP_FILES" ]; then
          pnpm --filter @snapback/mcp-server test test/smoke --run
        fi
```

**MCP Server E2E Tests**:

```yaml
mcp-server-e2e:
    tags: [e2e, mcp]
    glob: "apps/mcp-server/**/*.{ts,json}"
    run: |
        MCP_FILES=$(git diff --cached --name-only | grep "^apps/mcp-server/" || true)
        if [ -n "$MCP_FILES" ]; then
          pnpm --filter @snapback/mcp-server test test/e2e --run
        fi
```

#### CI Pipeline (5-15min)

-   Full test suite
-   Integration tests with PostgreSQL
-   E2E tests across all packages
-   Build validation
-   Deployment checks

## Test Requirements

### E2E Tests MUST:

1. **Use Zero Mocks**: Real FileSystemStorage, real EventBus, real dependencies
2. **Verify Persistence**: Create → Retrieve → Validate (not just create)
3. **Test Integration Points**: File system, event bus, error handling
4. **Clean Up**: Remove test data after each test

### Smoke Tests MUST:

1. **Validate Build**: Actual TypeScript compilation, not just imports
2. **Check Dependencies**: All imports have corresponding package.json entries
3. **Test Module Resolution**: Can actually import the main module
4. **Verify Exports**: All expected exports are available

### Integration Tests SHOULD:

1. **Validate Contracts**: Tool input/output schemas
2. **Test Error Paths**: Invalid inputs, missing data, edge cases
3. **Check Performance**: Performance budgets are respected
4. **Verify Protocol**: JSON-RPC compliance

## Preventing Future Regressions

### Critical Checks

**1. Storage Must Be Real**

```typescript
// E2E test that catches mock storage
it("must use real FileSystemStorage (not mock)", async () => {
	const snapshot = await storage.create({ trigger: "test" });
	const retrieved = await storage.retrieve(snapshot.id);

	// This fails with mock storage!
	expect(retrieved).not.toBeNull();
	expect(retrieved?.id).toBe(snapshot.id);
});
```

**2. Dependencies Must Exist**

```typescript
// Smoke test that catches missing dependencies
it("should have all imported packages in dependencies", async () => {
	const imports = extractImports(indexFile);
	const missing = imports.filter((imp) => !allDeps[imp]);

	expect(missing).toEqual([]); // Fails if @snapback/events missing
});
```

**3. Events Must Fire**

```typescript
// E2E test that catches broken event bus
it("should publish events when creating snapshots", async () => {
	const events: any[] = [];
	eventBus.subscribe(SnapBackEvent.SNAPSHOT_CREATED, (data) => {
		events.push(data);
	});

	await storage.create({ trigger: "test" });

	expect(events.length).toBe(1);
	expect(events[0].source).toBe("mcp");
});
```

## Test Execution

### Local Development

```bash
# Run all tests
pnpm --filter @snapback/mcp-server test

# Run smoke tests only
pnpm --filter @snapback/mcp-server test test/smoke

# Run E2E tests only
pnpm --filter @snapback/mcp-server test test/e2e

# Watch mode for development
pnpm --filter @snapback/mcp-server test --watch
```

### Git Workflow

```bash
# Pre-commit: Fast checks only
git add .
git commit -m "feat: add feature"  # Runs lint, typecheck, security

# Pre-push: Comprehensive validation
git push  # Runs smoke + E2E + unit tests if MCP files changed
```

### CI/CD

-   GitHub Actions runs full test suite on all PRs
-   Deployment blocked if any tests fail
-   Coverage reports generated and tracked

## Coverage Goals

-   **Smoke Tests**: 100% of build requirements
-   **E2E Tests**: 100% of critical paths (create, retrieve, list, delete)
-   **Integration Tests**: 90% of tool handlers
-   **Unit Tests**: 80% of business logic

## Test Data Management

### E2E Test Data

```typescript
// Create temporary directory for each test
beforeEach(() => {
	testDir = path.join(os.tmpdir(), `mcp-test-${Date.now()}`);
	fs.mkdirSync(testDir, { recursive: true });
});

// Clean up after each test
afterEach(() => {
	fs.rmSync(testDir, { recursive: true, force: true });
});
```

### Mock Data Guidelines

-   **Never mock storage** in E2E tests
-   **Never mock event bus** in E2E tests
-   **Do mock external APIs** (if any) with realistic responses
-   **Use factories** for test data generation

## Failure Scenarios

### What Each Test Layer Catches

| Scenario             | Smoke | E2E | Integration | Unit |
| -------------------- | ----- | --- | ----------- | ---- |
| Missing dependency   | ✅    | ❌  | ❌          | ❌   |
| Mock storage in prod | ❌    | ✅  | ❌          | ❌   |
| Event bus failure    | ❌    | ✅  | ⚠️          | ❌   |
| Invalid tool input   | ❌    | ❌  | ✅          | ⚠️   |
| Zod schema bug       | ❌    | ❌  | ✅          | ✅   |
| File corruption      | ❌    | ✅  | ❌          | ❌   |
| Build failure        | ✅    | ❌  | ❌          | ❌   |

## Summary

**The Oct 5-26 Regression Would Have Been Caught By**:

1. ✅ E2E tests (mock storage vs real storage)
2. ⚠️ Smoke tests (possibly, if testing imports)
3. ❌ Integration tests (used mocks)
4. ❌ Unit tests (used mocks)

**Current Protection**:

-   ✅ E2E tests run on every push (via lefthook)
-   ✅ Smoke tests validate dependencies (via lefthook)
-   ✅ Zero mocks in E2E tests (enforced by design)
-   ✅ Real FileSystemStorage validation
-   ✅ Event bus integration validation

**Future Improvements**:

-   [ ] Add contract tests for MCP protocol compliance
-   [ ] Add performance regression tests
-   [ ] Add snapshot content validation tests
-   [ ] Add multi-snapshot stress tests
-   [ ] Add error recovery tests
