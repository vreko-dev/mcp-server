# Testing Guide

Comprehensive testing guide for SnapBack monorepo following 2025 best practices with MSW, Vitest, and TDD methodology.

## Table of Contents

- [Overview](#overview)
- [Testing Architecture](#testing-architecture)
- [MSW Configuration](#msw-configuration)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Organization](#test-organization)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Test Coverage Goals
- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical user flows
- **E2E Tests**: Key user journeys
- **Performance Tests**: < 500ms activation, < 100ms saves

### Technology Stack
- **Test Runner**: Vitest 3.2.4
- **API Mocking**: MSW (Mock Service Worker) v2
- **React Testing**: React Testing Library
- **Assertions**: Vitest expect + @testing-library/jest-dom

---

## Testing Architecture

### Monorepo Structure

```
SnapBack-Site/
├── apps/
│   ├── vscode/          # VS Code extension tests
│   │   ├── test/
│   │   │   ├── unit/          # Component & logic tests
│   │   │   ├── integration/   # Flow integration tests
│   │   │   ├── e2e/           # End-to-end tests
│   │   │   └── performance/   # Performance benchmarks
│   │   └── vitest.config.mts
│   ├── mcp-server/      # MCP server tests
│   │   ├── test/
│   │   │   ├── unit/          # Tool & service tests
│   │   │   ├── integration/   # Protocol integration tests
│   │   │   └── setup.ts       # MSW configuration
│   │   └── vitest.config.ts
│   └── web/             # Web app tests
│       ├── test/
│       │   ├── unit/          # Hook & component tests
│       │   ├── integration/   # API integration tests
│       │   └── e2e/           # Playwright tests
│       ├── vitest.config.ts
│       └── vitest.setup.ts    # MSW configuration
└── packages/
    └── testing/         # Shared test utilities
        ├── src/
        │   ├── msw/           # MSW handlers & server
        │   ├── fixtures/      # Test data
        │   └── utils/         # Test helpers
        └── package.json
```

---

## MSW Configuration

### Web App Setup (Next.js + React)

**File**: `apps/web/vitest.setup.ts`

```typescript
import "@testing-library/jest-dom";
import { server } from "@snapback/testing/msw/server";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: "error", // Fail on unmocked requests
  });
});

// Reset handlers after each test for isolation
afterEach(() => {
  server.resetHandlers();
  cleanup(); // Cleanup React Testing Library
});

// Clean up after all tests
afterAll(() => {
  server.close();
});
```

### MCP Server Setup (Node.js)

**File**: `apps/mcp-server/test/setup.ts`

```typescript
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./setup"; // Local MSW server

beforeAll(() => {
  server.listen({
    onUnhandledRequest: "warn", // Warn on unmocked requests
  });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
```

### VS Code Extension Setup

**File**: `apps/vscode/test/unit/setup.ts`

- Uses vi.mock() for VSCode API mocking
- No MSW needed (no network calls in extension)
- Mocks: window, workspace, commands, etc.

---

## Running Tests

### Run All Tests

```bash
# From workspace root
pnpm test

# Specific app
cd apps/web && pnpm test
cd apps/mcp-server && pnpm test
cd apps/vscode && pnpm test
```

### Run Specific Test Files

```bash
# Pattern matching
pnpm test activation-flow

# Specific file
pnpm test test/integration/save-flow.integration.test.ts

# Watch mode
pnpm test --watch
```

### Run with Coverage

```bash
pnpm test --coverage

# Specific threshold
pnpm test --coverage --coverage.lines=80
```

### Run Integration Tests Only

```bash
# VS Code
pnpm test test/integration/**/*.integration.test.ts

# MCP Server
pnpm test test/integration/

# Web
pnpm test test/integration/
```

---

## Writing Tests

### TDD Red-Green-Refactor Cycle

**ALWAYS follow this cycle:**

1. **🔴 RED**: Write failing test
2. **🟢 GREEN**: Implement minimal code to pass
3. **🔵 REFACTOR**: Clean up and add documentation

### Test Structure (AAA Pattern)

```typescript
import { describe, it, expect, beforeEach } from "vitest";

describe("FeatureName", () => {
  let mockDependency: MockType;

  beforeEach(() => {
    // Setup mocks
    mockDependency = createMockDependency();
  });

  describe("Component/Function", () => {
    // Test ID: FEATURE-COMPONENT-001-001
    it("should [verb] [result] when [condition]", async () => {
      // ARRANGE: Setup test data and mocks
      const input = { /* ... */ };
      const expected = { /* ... */ };

      // ACT: Execute the code under test
      const result = await functionUnderTest(input);

      // ASSERT: Verify expectations
      expect(result).toEqual(expected);
    });
  });
});
```

### Using MSW in Tests

#### Override Default Handlers

```typescript
import { http, HttpResponse } from "msw";
import { server } from "@snapback/testing/msw/server";

it("handles API errors", async () => {
  // Override default handler for this test
  server.use(
    http.post("/api/analyze", () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  // Test error handling...
  await expect(analyzeCode()).rejects.toThrow();
});
```

#### Add Custom Handlers

```typescript
import { addHandlers } from "@snapback/testing/msw/server";
import { http, HttpResponse } from "msw";

it("handles rate limiting", async () => {
  addHandlers(
    http.post("/api/analyze", () => {
      return HttpResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    })
  );

  const result = await analyzeCode();
  expect(result.error).toBe("Rate limit exceeded");
});
```

### Concurrent Test Isolation

```typescript
import { boundary } from "../setup";

// Each concurrent test has isolated handlers
it.concurrent("test 1", boundary(async () => {
  server.use(
    http.get("/api/user", () => HttpResponse.json({ id: 1 }))
  );
  // Test logic...
}));

it.concurrent("test 2", boundary(async () => {
  server.use(
    http.get("/api/user", () => HttpResponse.json({ id: 2 }))
  );
  // Test logic...
}));
```

---

## Test Organization

### File Naming Conventions (2025 Standard)

- **Unit Tests**: `[feature].test.ts`
- **Integration Tests**: `[feature].integration.test.ts`
- **E2E Tests**: `[feature].e2e.test.ts`
- **Performance Tests**: `[feature].perf.test.ts`

### Describe Block Structure (BDD-Style)

```typescript
describe("Feature Name", () => {           // Feature level
  describe("Component/Function", () => {  // Component level
    it("should...", () => {});            // Scenario level
  });
});
```

**Max 3 levels** - Keep it flat and focused.

### Test IDs for Traceability

```typescript
// Format: [APP]-[FEATURE]-[TYPE]-[NUMBER]-[SUBTEST]
// Test ID: MCP-RISK-001-004
it("should detect API key exposure", async () => {
  // ...
});

// Test ID: VSCODE-SAVE-INT-001-003
it("should create snapshot when decision requires it", async () => {
  // ...
});
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module 'msw/node'"

**Solution**: Install MSW as dev dependency

```bash
pnpm add -D msw@latest
```

#### 2. "Unmocked request detected"

**Solution**: Add handler or change policy

```typescript
// In setup file
beforeAll(() => {
  server.listen({
    onUnhandledRequest: "warn", // Change from 'error'
  });
});

// Or add handler
server.use(
  http.get("https://example.com/api", () => {
    return HttpResponse.json({ mock: "data" });
  })
);
```

#### 3. "Tests pass individually but fail together"

**Solution**: Ensure handler reset in afterEach

```typescript
afterEach(() => {
  server.resetHandlers(); // Critical for test isolation
});
```

#### 4. "VSCode API mock not working"

**Solution**: Check mock is hoisted before imports

```typescript
// WRONG: Mock after import
import { activate } from "./extension";
vi.mock("vscode", () => ({ /* ... */ }));

// CORRECT: Mock before import
vi.mock("vscode", () => ({ /* ... */ }));
import { activate } from "./extension";
```

#### 5. "Database connection error in tests"

**Solution**: Set DATABASE_URL in vitest.config.ts

```typescript
export default defineConfig({
  test: {
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    },
  },
});
```

---

## Best Practices

### ✅ DO

- Follow TDD Red-Green-Refactor cycle
- Use MSW for all HTTP mocking
- Reset handlers after each test
- Use `onUnhandledRequest: "error"` in strict mode
- Add test IDs for traceability
- Test critical user flows in integration tests
- Mock external services (GitHub, PostHog, etc.)

### ❌ DON'T

- Create filler/placeholder tests
- Mock internal modules (test real implementations)
- Skip `resetHandlers()` in afterEach
- Use fake timers without cleanup
- Mix test types in same file
- Commit .only or .skip tests
- Test implementation details

---

## Resources

- **MSW Documentation**: https://mswjs.io
- **Vitest Documentation**: https://vitest.dev
- **Testing Library**: https://testing-library.com
- **Test Coverage Spec**: `/gold_plating/test_coverage.md`

---

## Support

For testing issues or questions:
1. Check this guide
2. Review test_coverage.md specification
3. Check existing test patterns in codebase
4. Ask in team Slack #testing channel
