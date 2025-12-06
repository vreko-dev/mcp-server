# Testing & Automation Strategy: MSW + Faker.js + Playwright Integration

**Last Updated:** Dec 6, 2025  
**Status:** Production Ready for Turborepo  
**Authority:** Architecture + Context7 Research

---

## Executive Summary

SnapBack uses a **3-layer testing pyramid** integrated with Turborepo for maximum efficiency:

| Layer | Tool | Purpose | Count | Integration |
|-------|------|---------|-------|-------------|
| **Unit** | Vitest | Pure functions, validation logic | ~50 | `pnpm test:unit` |
| **Integration** | Vitest + MSW | API clients, service logic, handlers | ~40 | `pnpm test:integration` |
| **E2E** | Playwright + Faker | Real user journeys, friction detection | ~20 | `pnpm test:e2e` |

---

## Part 1: MSW Best Practices in Turborepo

### Why MSW Over Alternatives

**Context7 Research:** MSW (94.8 benchmark, 422 code snippets) vs alternatives:
- ✅ Network-level interception (works with fetch, axios, XMLHttpRequest)
- ✅ Zero app code changes needed
- ✅ Works in Node.js tests AND Playwright browsers
- ✅ Shared handlers across unit/integration/E2E (DRY principle)
- ✅ Turborepo-friendly: handlers live in `@snapback/testing` package

### Directory Structure for Shared Handlers

```
packages/testing/
├── src/
│   ├── msw/
│   │   ├── handlers/
│   │   │   ├── auth.ts          # Session, login, logout
│   │   │   ├── api-keys.ts      # API key CRUD operations
│   │   │   ├── snapshots.ts     # Snapshot operations
│   │   │   └── index.ts         # Combined handler export
│   │   ├── server.ts            # setupServer for Node.js tests
│   │   └── worker.ts            # setupWorker for browser tests
│   └── fixtures/
│       ├── factories.ts         # Faker-powered test data factories
│       └── builders.ts          # Test data builders for complex objects
```

### Shared Handler Pattern (Turborepo-Friendly)

**File:** `packages/testing/src/msw/handlers/api-keys.ts`

```typescript
import { http, HttpResponse } from "msw";
import { faker } from "@faker-js/faker";

const API_URL = process.env.API_URL || "http://localhost:3000";

/**
 * MSW handlers for API key operations
 * Shared across apps/web integration tests and Playwright E2E tests
 * Safe for OSS: Uses generic placeholder values, no proprietary logic
 */

// Test data factory using Faker (reproducible across tests)
function createMockApiKey(overrides = {}) {
  return {
    id: `key_${faker.string.uuid()}`,
    fullKey: `sk_live_${faker.string.alphaNumeric(32)}`,
    preview: `sk_live_...${faker.string.alphaNumeric(4)}`,
    name: faker.commerce.productName(),
    scopes: ["snapshots:read", "snapshots:write"],
    rateLimit: faker.number.int({ min: 100, max: 10000 }),
    createdAt: faker.date.past().toISOString(),
    ...overrides,
  };
}

// Happy path: Create API key
export const apiKeyCreateHandler = http.post(
  `${API_URL}/api/api-keys`,
  async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(createMockApiKey({
      name: body.name,
      scopes: body.scopes,
      rateLimit: body.rateLimit,
    }));
  }
);

// Error case: Validation failure
export const apiKeyValidationErrorHandler = http.post(
  `${API_URL}/api/api-keys`,
  () => {
    return HttpResponse.json(
      { error: "Missing required field: name" },
      { status: 400 }
    );
  }
);

// Error case: Rate limiting
export const apiKeyRateLimitHandler = http.post(
  `${API_URL}/api/api-keys`,
  () => {
    return HttpResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }
);

// Export all handlers
export const apiKeyHandlers = [apiKeyCreateHandler];
```

### Sharing Handlers with E2E Tests

**Benefits:**
- ✅ Single source of truth for mock behavior
- ✅ Consistency between unit/integration/E2E tests
- ✅ Fast iteration on handler logic

**Usage in Playwright:**

```typescript
// apps/web/test/e2e/api-keys.spec.ts
import { test, expect } from "@playwright/test";
import { apiKeyHandlers } from "@snapback/testing/msw/handlers";

test.describe("API Key Creation (E2E)", () => {
  test.use({
    serviceWorkers: apiKeyHandlers, // Reuse same handlers!
  });

  test("should create key with form validation", async ({ page }) => {
    await page.goto("/settings/api-keys");
    await page.fill("[name=keyName]", "My Key");
    await page.click("button:has-text('Create')");
    
    // MSW intercepts the POST, returns mocked response
    await expect(page.locator("[data-testid=keyCreated]")).toBeVisible();
  });
});
```

---

## Part 2: Faker.js Integration Strategy

### Why Faker.js in Tests

**Context7 Research:** Faker.js (82 snippets, High reputation) provides:
- ✅ Realistic test data (user names, emails, timestamps)
- ✅ Randomized without being random (reproducible with `faker.seed()`)
- ✅ Type-safe factory functions for complex objects
- ✅ Works seamlessly with MSW handlers and Playwright tests

### Factory Pattern with Faker

**File:** `packages/testing/src/fixtures/factories.ts`

```typescript
import { faker } from "@faker-js/faker";

/**
 * Test data factories using Faker.js
 * Supports seeding for reproducible tests with `faker.seed()`
 */

export function createMockUser(overrides = {}) {
  return {
    id: `user_${faker.string.uuid()}`,
    email: faker.internet.email(),
    name: faker.person.fullName(),
    createdAt: faker.date.past().toISOString(),
    ...overrides,
  };
}

export function createMockSession(userId: string) {
  return {
    user: createMockUser({ id: userId }),
    accessToken: `token_${faker.string.alphaNumeric(32)}`,
    expiresAt: Date.now() + 3600000, // 1 hour
  };
}

export function createMockApiKey(overrides = {}) {
  return {
    id: `key_${faker.string.uuid()}`,
    fullKey: `sk_live_${faker.string.alphaNumeric(32)}`,
    preview: `sk_live_...${faker.string.alphaNumeric(4)}`,
    name: `${faker.word.adjective()}-${faker.word.noun()}`,
    scopes: faker.helpers.arrayElements(
      ["snapshots:read", "snapshots:write", "snapshots:*"],
      { min: 1, max: 3 }
    ),
    rateLimit: faker.number.int({ min: 100, max: 10000 }),
    createdAt: faker.date.past().toISOString(),
    ...overrides,
  };
}

// Snapshot with realistic change patterns
export function createMockSnapshot(overrides = {}) {
  return {
    id: `snap_${faker.string.uuid()}`,
    filePath: faker.system.filePath(),
    fileSize: faker.number.int({ min: 1000, max: 100000 }),
    content: faker.lorem.paragraphs(3),
    hash: faker.git.commitSha(),
    createdAt: faker.date.recent().toISOString(),
    detectedRisk: faker.helpers.arrayElement(["low", "medium", "high"]),
    ...overrides,
  };
}
```

### Using Factories in Tests

**Integration Tests (Vitest + MSW):**

```typescript
import { createMockApiKey, createMockUser } from "@snapback/testing/fixtures";
import { apiKeyCreateHandler } from "@snapback/testing/msw/handlers/api-keys";

test("should create API key with user-specific scopes", async () => {
  const user = createMockUser();
  const expectedKey = createMockApiKey({ name: "CI/CD Pipeline" });

  server.use(apiKeyCreateHandler);

  const response = await fetch("/api/api-keys", {
    method: "POST",
    body: JSON.stringify({
      name: expectedKey.name,
      scopes: expectedKey.scopes,
    }),
  });

  const result = await response.json();
  expect(result.id).toBeDefined();
  expect(result.scopes).toEqual(expectedKey.scopes);
});
```

**Seeded Tests (Reproducible):**

```typescript
test("should generate consistent data", () => {
  faker.seed(1234); // Fixed seed for reproducibility

  const user1 = createMockUser();
  const key1 = createMockApiKey();

  faker.seed(1234); // Reset to same seed
  const user2 = createMockUser();
  const key2 = createMockApiKey();

  // Same seed = same data
  expect(user1.email).toBe(user2.email);
  expect(key1.id).toBe(key2.id);
});
```

---

## Part 3: Playwright E2E Strategy for Friction Prevention

### What Playwright Should Test

**Context7 Research:** Playwright (89.4 benchmark, 2623+ snippets) excels at:
- ✅ Real browser interactions (clicks, form fills, navigation)
- ✅ User journey validation (Happy → Error → Recovery)
- ✅ Friction detection (missing error messages, confusing UX)
- ✅ Visual regression detection
- ✅ Network timing (slow API responses, timeouts)

### Friction-Reducing Test Patterns

#### Pattern 1: Error Message Visibility (Anti-Friction)

```typescript
test("should show clear error when API key name is empty", async ({ page }) => {
  // ARRANGE: User on API key creation page
  await page.goto("/settings/api-keys");
  
  // ACT: User tries to submit empty form
  await page.click("button:has-text('Create Key')");
  
  // ASSERT: Clear, actionable error is visible immediately
  const errorMessage = page.locator("[role=alert]");
  await expect(errorMessage).toContainText("Name is required");
  
  // User can read the error without confusion
  await expect(errorMessage).toHaveCSS("color", /red|error/i);
  
  // Error is accessible to screen readers
  const alert = page.locator("[role=alert]");
  await expect(alert).toBeVisible();
});
```

#### Pattern 2: Loading State Feedback (Anti-Friction)

```typescript
test("should show loading spinner while creating API key", async ({ page }) => {
  await page.goto("/settings/api-keys");
  await page.fill("[name=keyName]", "Production Key");
  
  // ACT: Click create (MSW will have 100ms delay)
  const createButton = page.locator("button:has-text('Create')");
  await createButton.click();
  
  // ASSERT: Loading state appears immediately
  const spinner = page.locator("[data-testid=loading-spinner]");
  await expect(spinner).toBeVisible();
  
  // After MSW response, spinner disappears
  await expect(spinner).not.toBeVisible({ timeout: 2000 });
});
```

#### Pattern 3: Recovery from Failure (Anti-Friction)

```typescript
test("should recover cleanly from rate limit error", async ({ page }) => {
  // Override handler to simulate rate limit
  page.context().addInitScript(() => {
    // Inject rate limit behavior in browser
  });

  await page.goto("/settings/api-keys");
  await page.fill("[name=keyName]", "New Key");
  await page.click("button:has-text('Create')");
  
  // ASSERT: Rate limit error is shown
  const retryButton = page.locator("button:has-text('Retry')");
  await expect(retryButton).toBeVisible();
  
  // User can retry without manual refresh
  await retryButton.click();
  
  // Success on retry (MSW no longer returns 429)
  await expect(page.locator("[data-testid=keyCreated]")).toBeVisible();
});
```

#### Pattern 4: Accessibility Under Stress (Anti-Friction)

```typescript
test("keyboard users can create API key without mouse", async ({ page }) => {
  await page.goto("/settings/api-keys");
  
  // ACT: All keyboard navigation
  await page.keyboard.press("Tab"); // Focus name input
  await page.keyboard.type("My Key");
  await page.keyboard.press("Tab"); // Focus scope selector
  await page.keyboard.press("Space"); // Open dropdown
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space"); // Select option
  await page.keyboard.press("Tab"); // Focus create button
  await page.keyboard.press("Enter"); // Submit
  
  // ASSERT: Key created successfully via keyboard only
  await expect(page.locator("[data-testid=keyCreated]")).toBeVisible();
});
```

### Complete Friction-Prevention Test Suite

See `/apps/web/test/e2e/api-keys-friction-prevention.spec.ts` for full implementation.

---

## Part 4: Turborepo Integration & Automation

### Task Definition in turbo.json

```json
{
  "pipeline": {
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": false
    },
    "test:unit": {
      "dependsOn": [],
      "cache": false
    },
    "test:integration": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "test:e2e": {
      "dependsOn": ["build", "^build"],
      "cache": false,
      "inputs": ["test/e2e/**", "src/**", ".env.test"]
    }
  }
}
```

### Pnpm Scripts for Testing

```json
{
  "scripts": {
    "test": "turbo test",
    "test:unit": "turbo test:unit",
    "test:integration": "turbo test:integration",
    "test:e2e": "turbo test:e2e --filter='apps/web'",
    "test:coverage": "turbo test -- --coverage",
    "test:watch": "turbo test -- --watch"
  }
}
```

### Pre-commit Hook Validation

**Lefthook Configuration (.lefthook.yml):**

```yaml
test-quality:
  commands:
    unit-tests:
      run: pnpm test:unit
      stage: commit
    no-friction-tests-skipped:
      glob: "apps/web/test/e2e/friction-prevention/**"
      run: grep -L "^test.skip" {staged_files} || echo "All friction tests are active"
      stage: commit
```

---

## Part 5: Best Practices Checklist

### MSW Handler Quality

- [ ] Handlers live in `@snapback/testing` (shared across tests)
- [ ] Each handler has a single responsibility (create, read, error)
- [ ] Error handlers defined for common failures (400, 429, 500)
- [ ] Realistic response data using Faker factories
- [ ] Request/response logging for debugging

### Faker Factory Quality

- [ ] Factories support overrides for specific test cases
- [ ] Faker seeding used for reproducible tests
- [ ] No hardcoded values in factories (use Faker methods)
- [ ] Type-safe factory functions with TypeScript
- [ ] Factory documentation with usage examples

### Playwright E2E Quality

- [ ] Tests focus on user journeys, not implementation details
- [ ] Error messages verified for clarity and actionability
- [ ] Loading states tested for UX feedback
- [ ] Keyboard navigation tested (accessibility)
- [ ] Recovery paths tested (retry, fallback)
- [ ] No hardcoded waits (use `waitFor` conditions)
- [ ] Tests isolated from each other (no shared state)

### OSS Safety (Public Packages)

- [ ] No `@snapback/auth` imports in public test files
- [ ] No `@snapback/infrastructure` imports in public tests
- [ ] No proprietary algorithm references in test data
- [ ] No Stripe, PostHog, or subscription tier logic exposed
- [ ] Generic placeholder values (test-123, user@example.com)
- [ ] Tests safe for community inspection

---

## Part 6: Example: API Key Lifecycle E2E Test

**File:** `apps/web/test/e2e/api-keys-friction-prevention.spec.ts`

```typescript
import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";

test.describe("API Key Lifecycle - Friction Prevention", () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Authenticated user ready to create API key
    await page.goto("/settings/api-keys");
    await expect(page.locator("text=API Keys")).toBeVisible();
  });

  test("F1: User creates first API key with clear form feedback", async ({ page }) => {
    const keyName = faker.commerce.productName();

    // Navigate to creation form
    await page.click("button:has-text('Create API Key')");
    await expect(page.locator("[role=dialog]")).toBeVisible();

    // Form validation: empty name shows error
    await page.click("button:has-text('Create')");
    await expect(page.locator("[role=alert]")).toContainText("Name is required");

    // User enters name
    await page.fill("[name=keyName]", keyName);
    
    // Loading feedback
    await page.click("button:has-text('Create')");
    await expect(page.locator("[data-testid=loading]")).toBeVisible();

    // Success: key displayed with copy option
    await expect(page.locator("text=Key created successfully")).toBeVisible();
    const copyButton = page.locator("button:has-text('Copy Full Key')");
    await expect(copyButton).toBeVisible();
  });

  test("F2: User recovers from rate limit with retry", async ({ page }) => {
    // Simulate rate limit on first attempt
    page.context().setOffline(false);
    
    await page.click("button:has-text('Create API Key')");
    await page.fill("[name=keyName]", "Test Key");
    await page.click("button:has-text('Create')");

    // Rate limit error with retry button
    await expect(page.locator("[role=alert]")).toContainText("Too many requests");
    const retryButton = page.locator("button:has-text('Retry')");
    await expect(retryButton).toBeVisible();

    // Retry succeeds
    await retryButton.click();
    await expect(page.locator("text=Key created successfully")).toBeVisible();
  });

  test("F3: Keyboard-only user can manage API keys", async ({ page }) => {
    // Tab through form
    await page.click("button:has-text('Create API Key')");
    
    // Focus and interact with keyboard only
    await page.keyboard.press("Tab");
    await page.keyboard.type("Keyboard Created Key");
    await page.keyboard.press("Tab"); // Scope selector
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab"); // Create button
    await page.keyboard.press("Enter");

    await expect(page.locator("text=Key created successfully")).toBeVisible();
  });

  test("F4: User sees clear next steps after key creation", async ({ page }) => {
    await page.click("button:has-text('Create API Key')");
    await page.fill("[name=keyName]", "New Key");
    await page.click("button:has-text('Create')");

    // Success modal shows clear next steps
    const successModal = page.locator("[data-testid=success-modal]");
    await expect(successModal).toContainText("Copy the key now");
    await expect(successModal).toContainText("You won't see it again");
    
    // CTA button is clear
    const copyButton = page.locator("button:has-text('Copy')");
    await expect(copyButton).toBeFocused(); // Auto-focus for keyboard users
  });
});
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create `packages/testing/src/msw/handlers/` structure
- [ ] Create `packages/testing/src/fixtures/factories.ts` with Faker
- [ ] Update `apps/web/test/integration/api-key-flow-msw.test.ts` with factories
- [ ] Commit: "feat: add Faker.js factory integration to MSW handlers"

### Phase 2: E2E Tests (Week 2)
- [ ] Create `apps/web/test/e2e/api-keys-friction-prevention.spec.ts`
- [ ] Implement 4+ friction-prevention test patterns
- [ ] Add MSW + Faker integration to E2E setup
- [ ] Commit: "test: add friction-prevention E2E tests with Playwright"

### Phase 3: Automation (Week 3)
- [ ] Update `turbo.json` with test task definitions
- [ ] Add pre-commit hooks for test validation
- [ ] Document in CONTRIBUTING.md
- [ ] Commit: "ci: integrate test automation in Turborepo workflow"

---

## References

- **MSW Documentation:** https://mswjs.io (Context7: 94.8 benchmark)
- **Faker.js Documentation:** https://faker.js.org (Context7: 82 snippets)
- **Playwright Documentation:** https://playwright.dev (Context7: 89.4 benchmark)
- **Turborepo Documentation:** https://turbo.build (Context7: 78.4 benchmark)
- **Testing Best Practices:** `/docs/testing-cleanup.md`
- **OSS Safety Guide:** `/docs/OSS_SYNC_PROTECTION.md`

---

**Last Reviewed:** Dec 6, 2025  
**Next Review:** Jan 6, 2026
