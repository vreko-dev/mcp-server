# Phase 0: Testing Library Reference Guide
**Quick Reference for Testing Infrastructure**
**Authority:** @TDD_CORE.md + Industry Best Practices 2025**

---

## Quick Start: Testing Setup in SnapBack

### 1. Test File Location Convention
```
Feature → Test Location
────────────────────────
apps/api/modules/FEATURE/procedures/action.ts
  → apps/api/modules/FEATURE/tests/action.test.ts

apps/vscode/src/commands/action.ts
  → apps/vscode/src/commands/action.test.ts

packages/PACKAGE/src/module.ts
  → packages/PACKAGE/tests/module.test.ts
```

### 2. Running Tests

```bash
# Run all tests
pnpm test

# Run specific package
pnpm test --run packages/sdk

# Run with coverage
pnpm test:cov

# Watch mode
pnpm test --watch
```

---

## Testing Library Quick Reference

### VITEST - Unit & Integration Tests

#### Basic Test Structure
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("FeatureName", () => {
  let cleanup: TestCleanupManager;

  beforeEach(() => {
    cleanup = new TestCleanupManager();
  });

  afterEach(async () => {
    await cleanup.runAll();
  });

  // HAPPY PATH ✅
  it("should do expected behavior", async () => {
    // ARRANGE
    const input = createTestData();

    // ACT
    const result = await functionUnderTest(input);

    // ASSERT
    expect(result.success).toBe(true);
    expect(result.data).toEqual(expectedData);
  });

  // SAD PATH ✅
  it("should handle invalid input gracefully", async () => {
    const input = { invalid: "data" };
    expect(() => functionUnderTest(input)).toThrow(ValidationError);
  });

  // EDGE PATH ✅
  it("should handle boundary conditions", async () => {
    const input = createEdgeCaseData();
    const result = await functionUnderTest(input);
    expect(result.warnings).toHaveLength(1);
  });

  // ERROR PATH ✅
  it("should recover from failures", async () => {
    vi.mock("external-service", () => ({
      fetch: vi.fn().mockRejectedValue(new Error("Network error")),
    }));
    const result = await functionUnderTest(input);
    expect(result.fallback).toBeDefined();
  });
});
```

#### Mocking Patterns

**Pattern 1: Module Mocking**
```typescript
// Mock entire module
vi.mock("@snapback/infrastructure", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Usage in test
const { logger } = await import("@snapback/infrastructure");
expect(logger.info).toHaveBeenCalledWith("expected message");
```

**Pattern 2: Function Mocking**
```typescript
// Create mock function
const mockCallback = vi.fn();
mockCallback.mockReturnValue(expectedValue);
mockCallback.mockResolvedValue(asyncValue);
mockCallback.mockRejectedValue(new Error("error"));

// Spy on existing function
const spy = vi.spyOn(obj, "method");
expect(spy).toHaveBeenCalledWith(args);
```

**Pattern 3: Partial Mocking**
```typescript
// Mock only specific function in module
const { functionToTest } = await import("module");
vi.mock("dependency", () => ({
  realFunction: vi.importActual("dependency").realFunction,
  mockFunction: vi.fn(),
}));
```

#### Testing Utilities

**TestCleanupManager - Resource Cleanup**
```typescript
import { TestCleanupManager } from "@snapback/testing/utils/TestCleanupManager";

let cleanup: TestCleanupManager;

beforeEach(() => {
  cleanup = new TestCleanupManager();
});

afterEach(async () => {
  await cleanup.runAll();
});

it("should cleanup resources", async () => {
  // Create server
  const server = createServer();
  cleanup.register(() => server.close());

  // Connect to DB
  const db = await connectDatabase();
  cleanup.register(async () => await db.close());

  // When afterEach runs, cleanup is called in LIFO order
  // - DB closes first
  // - Server closes second
});
```

**DeterministicTime - Fake Timers**
```typescript
import { DeterministicTime } from "@snapback/testing/utils/DeterministicTime";

it("should expire rate limit after window", async () => {
  const time = new DeterministicTime();

  // Use up limit
  const result1 = await rateLimiter.check("user", 5);
  expect(result1.allowed).toBe(true);

  const result2 = await rateLimiter.check("user", 5);
  expect(result2.allowed).toBe(true); // 2/5

  const result3 = await rateLimiter.check("user", 5);
  expect(result3.allowed).toBe(false); // Limit exceeded

  // Jump time forward 60 seconds
  time.advanceBy(60 * 1000);

  // Should be allowed again
  const result4 = await rateLimiter.check("user", 5);
  expect(result4.allowed).toBe(true);

  time.restore();
});
```

#### Coverage Requirements

```typescript
// vitest.config.ts requirements:
// Lines: 80%
// Functions: 80%
// Branches: 75%
// Statements: 80%

// ✅ GOOD - Specific assertion
expect(result.count).toBe(3);

// ✅ GOOD - Testing behavior
expect(logger.info).toHaveBeenCalledWith("message");

// ❌ BAD - Vague assertion
expect(result).toBeDefined();  // Too vague!
expect(result).toBeTruthy();   // Too vague!
```

---

### PLAYWRIGHT - End-to-End Tests

#### Basic E2E Test Structure
```typescript
import { test, expect } from "@playwright/test";

test.describe("User Authentication Flow", () => {
  test("should login with valid credentials", async ({ page }) => {
    // ARRANGE
    await page.goto("http://snapback.dev/login");

    // ACT
    await page.fill("input[name='email']", "user@example.com");
    await page.fill("input[name='password']", "password123");
    await page.click("button:has-text('Sign In')");

    // ASSERT
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("text=Welcome")).toBeVisible();
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.goto("http://snapback.dev/login");
    await page.fill("input[name='email']", "user@example.com");
    await page.fill("input[name='password']", "wrong");
    await page.click("button:has-text('Sign In')");

    await expect(page.locator("text=Invalid credentials")).toBeVisible();
  });

  test("should handle network timeout", async ({ page }) => {
    // Simulate network failure
    await page.route("**/api/login", route => route.abort());

    await page.goto("http://snapback.dev/login");
    await page.fill("input[name='email']", "user@example.com");
    await page.fill("input[name='password']", "password");
    await page.click("button:has-text('Sign In')");

    await expect(page.locator("text=Network error")).toBeVisible();
  });
});
```

#### Page Object Model Pattern
```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.page.fill("input[name='email']", email);
    await this.page.fill("input[name='password']", password);
    await this.page.click("button:has-text('Sign In')");
  }

  async getErrorMessage() {
    return this.page.locator("[role='alert']").textContent();
  }
}

// test.spec.ts
import { LoginPage } from "./pages/LoginPage";

test("should login", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("user@example.com", "password");
  // ...
});
```

#### Avoiding Flaky Tests
```typescript
// ✅ GOOD - Explicit waits
await expect(page.locator("button")).toBeEnabled();
await page.click("button");

// ❌ BAD - Implicit/no waits
await page.click("button"); // May fail if button not ready

// ✅ GOOD - Polling
await expect(page.locator(".loading")).not.toBeVisible({ timeout: 30000 });

// ✅ GOOD - Wait for condition
await page.waitForFunction(() => {
  return document.querySelectorAll(".item").length === 5;
});

// ✅ GOOD - Retry on CI
// Already configured in playwright.config.ts: retries: 2
```

---

## MSW (Mock Service Worker) - HTTP Mocking

### Setup
```typescript
import { server } from "@snapback/testing/msw/server";
import { http, HttpResponse } from "msw";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Adding Handlers
```typescript
import { server } from "@snapback/testing/msw/server";
import { http, HttpResponse } from "msw";

it("should handle API success", async () => {
  server.use(
    http.get("/api/users/:id", () => {
      return HttpResponse.json({ id: 1, name: "User" });
    })
  );

  const response = await fetch("/api/users/1");
  const data = await response.json();
  expect(data.name).toBe("User");
});

it("should handle API errors", async () => {
  server.use(
    http.get("/api/users/:id", () => {
      return HttpResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    })
  );

  const response = await fetch("/api/users/999");
  expect(response.status).toBe(404);
});
```

---

## Test Factories - Creating Test Data

### Factory Functions
```typescript
import { createTestUser, createTestSnapshot } from "@snapback/testing/fixtures/factories";

it("should process user snapshot", async () => {
  const user = createTestUser({
    email: "user@example.com",
    plan: "pro",
  });

  const snapshot = createTestSnapshot({
    userId: user.id,
    fileCount: 10,
  });

  const result = await processSnapshot(snapshot);
  expect(result.success).toBe(true);
});
```

### Custom Factory
```typescript
function createCustomUser(overrides: Partial<User> = {}): User {
  return {
    id: generateId(),
    email: "test@example.com",
    name: "Test User",
    plan: "free",
    createdAt: new Date(),
    ...overrides,
  };
}
```

---

## Test Environment Variables

```typescript
// In test file
process.env.TEST_VAR = "test_value";

// Or use from @snapback/testing
import { TEST_ENV_VARS } from "@snapback/testing/setup/hooks";

// TEST_ENV_VARS includes:
// - TEST_DATABASE_URL
// - TEST_API_URL
// - etc.
```

---

## Common Testing Scenarios

### Testing Async Code
```typescript
it("should resolve promise", async () => {
  const promise = functionReturnsPromise();
  await expect(promise).resolves.toEqual(expectedValue);
});

it("should reject promise", async () => {
  const promise = functionRejectPromise();
  await expect(promise).rejects.toThrow(ExpectedError);
});
```

### Testing Timers
```typescript
import { DeterministicTime } from "@snapback/testing/utils/DeterministicTime";

it("should fire after timeout", async () => {
  const time = new DeterministicTime();
  const callback = vi.fn();

  setTimeout(callback, 1000);

  time.advanceBy(1000);

  expect(callback).toHaveBeenCalled();
  time.restore();
});
```

### Testing Retries
```typescript
import { withRetry, RetryPresets } from "@snapback-oss/sdk";

it("should retry failed requests", async () => {
  const fetch = vi.fn()
    .mockRejectedValueOnce(new Error("Network error"))
    .mockResolvedValueOnce({ ok: true });

  const result = await withRetry(
    () => fetch(),
    RetryPresets.network
  );

  expect(result.ok).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(2);
});
```

---

## Best Practices Checklist

### Before Submitting Tests

- [ ] **4-Path Coverage:** Happy, Sad, Edge, Error paths covered
- [ ] **No Vague Assertions:** Every `expect()` is specific
  - ❌ `.toBeDefined()`, `.toBeTruthy()`
  - ✅ `.toBe(value)`, `.toEqual({})`, `.toHaveLength(n)`
- [ ] **Test Isolation:** Each test is independent
- [ ] **Cleanup:** Resources freed in `afterEach()`
- [ ] **Deterministic:** No flaky tests (use DeterministicTime)
- [ ] **Meaningful Names:** Test name explains what it tests
- [ ] **AAA Pattern:** Arrange, Act, Assert
- [ ] **No Implementation Details:** Testing behavior, not private state
- [ ] **Proper Mocking:** Only mock dependencies, not SUT
- [ ] **Coverage Threshold:** Meet 80% line / 75% branch

### Code Review Checklist

- [ ] All tests pass: `pnpm test`
- [ ] Coverage meets threshold: `pnpm test:cov`
- [ ] No console errors: `expectNoConsoleErrors()`
- [ ] No skipped tests: `it.skip()` only with `[GH-####]`
- [ ] No TODO tests: `it.todo()` only with `[GH-####]`
- [ ] Proper path fixtures: Tests in correct location

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Test times out | Increase timeout in test, check for infinite loops |
| Flaky test | Use DeterministicTime for timers, explicit waits for Playwright |
| Mock not working | Check vi.mock() is at module top level, not inside test |
| Cleanup error | All cleanup callbacks must be sync or properly await-able |
| Coverage failing | Add specific assertions, remove dead code paths |
| Import not found | Check canonical locations, verify aliases in tsconfig |

---

## Resources

- **Vitest Docs:** https://vitest.dev
- **Playwright Docs:** https://playwright.dev
- **MSW Docs:** https://mswjs.io
- **Testing Library:** https://testing-library.com
- **TDD_CORE.md:** `ai_dev_utils/TDD_CORE.md`
- **Phase Guides:** `ai_dev_utils/phases/`

---

**Last Updated:** 2025-12-10
**Authority:** @TDD_CORE.md + 2025 Web Research
**Status:** Reference guide for Phase 1+ development
