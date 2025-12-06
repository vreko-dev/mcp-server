# Phase 1: Test Stabilization Analysis
**Generated:** 2025-12-05
**Research Base:** 2025 Industry Best Practices (Vitest, MSW, Deterministic Testing)

---

## Executive Summary

**Total FIX-Flagged Tests:** 143 tests across 9 packages
**Breakdown by Package:**
- `packages/api`: 71 tests (50% of total) - **P1 Priority**
- `packages/auth`: 29 tests (20%) - **P0 CRITICAL (OSS)**
- `apps/web`: 21 tests (15%) - **P2 Priority**
- `apps/vscode`: 10 tests (7%) - **P2 Priority**
- `apps/mcp-server`: 5 tests - **P1 Priority**
- `packages/sdk`: 4 tests - **P0 CRITICAL (OSS)**
- `packages/core`: 1 test - **P0 CRITICAL (OSS)**
- `apps/cli`: 1 test - **P2 Priority**
- `packages/auth-mock`: 1 test - **P3 Priority**

**Environment Dependencies:** 13 tests use environment variables
**Integration Tests:** 37 tests require API/DB integration

---

## Root Cause Categorization

### 1. Weak Assertions (~40 tests)
**Pattern:** Tests that only verify function existence, not behavior

**Example (packages/auth/__tests__/snapback-auth.test.ts:117-130):**
```typescript
// ❌ BAD - No actual behavior testing
it("should create API key with all required fields", async () => {
  expect(typeof createApiKey).toBe("function");
});

// ✅ GOOD - Test actual behavior with MSW
it("should create API key with all required fields", async () => {
  const userId = "user_123";
  const name = "Production API Key";

  const result = await createApiKey(userId, name);

  expect(result.success).toBe(true);
  expect(result.value.id).toBeDefined();
  expect(result.value.keyPreview).toMatch(/^sk_live_/);
  expect(result.value.name).toBe(name);
});
```

**Fix Strategy:** Replace with proper MSW handlers + behavioral assertions

---

### 2. Missing MSW Integration (~35 tests)
**Pattern:** Manual fetch mocking instead of network-level MSW handlers

**Example (apps/cli/test/unit/services/api-client.test.ts:4-6):**
```typescript
// ❌ BAD - Manual fetch mocking
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ✅ GOOD - MSW feature-specific handlers
// test/msw/api-handlers.ts
import { http, HttpResponse } from "msw";

export const apiHandlers = {
  success: [
    http.post("https://api.snapback.dev/api/analyze/fast", () => {
      return HttpResponse.json({
        riskLevel: "medium",
        score: 0.5,
        factors: ["test factor"],
      });
    }),
  ],
  errors: {
    serverError: [
      http.post("https://api.snapback.dev/api/analyze/fast", () => {
        return HttpResponse.json(
          { error: "Internal Server Error" },
          { status: 500 }
        );
      }),
    ],
  },
};
```

**Fix Strategy:** Create feature-specific MSW handlers by package

---

### 3. Non-Deterministic Timing (~20 tests)
**Pattern:** Tests using `setTimeout`, `Date.now()`, or `new Date()` without control

**Example (packages/auth/__tests__/snapback-auth.test.ts:231):**
```typescript
// ❌ BAD - Flaky timing
await new Promise((resolve) => setTimeout(resolve, 150));

// ✅ GOOD - Deterministic time control
import { vi } from "vitest";

vi.useFakeTimers();
vi.advanceTimersByTime(150);
```

**Fix Strategy:** Implement DeterministicTime helper utility

---

### 4. Missing Test Cleanup (~25 tests)
**Pattern:** No `afterEach` cleanup, causing state leaks

**Example (apps/cli/test/unit/services/api-client.test.ts:8-11):**
```typescript
// ❌ BAD - No cleanup
describe("ApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  // Missing afterEach cleanup!
});

// ✅ GOOD - Proper cleanup
describe("ApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SNAPBACK_API_URL = "https://test-api.snapback.dev";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SNAPBACK_API_URL;
    delete process.env.SNAPBACK_API_KEY;
  });
});
```

**Fix Strategy:** Add afterEach cleanup to all test suites

---

### 5. Import Errors (~10 tests)
**Pattern:** Missing imports for test utilities

**Example (apps/cli/test/unit/services/api-client.test.ts:1):**
```typescript
// ❌ BAD - beforeEach used on line 9 but not imported
import { describe, expect, it, vi } from "vitest";

// ✅ GOOD - Complete imports
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
```

**Fix Strategy:** Add missing imports, verify with type-check

---

### 6. Environment Dependencies (~13 tests)
**Pattern:** Tests setting process.env without cleanup or validation

**Example:**
```typescript
// ❌ BAD - No cleanup, hardcoded values
process.env.SNAPBACK_API_URL = "https://test-api.snapback.dev";

// ✅ GOOD - Fixtures with cleanup
// test/fixtures/env.ts
export function withTestEnv(overrides = {}) {
  const original = { ...process.env };

  Object.assign(process.env, {
    SNAPBACK_API_URL: "https://test-api.snapback.dev",
    SNAPBACK_API_KEY: "sk_test_12345",
    ...overrides,
  });

  return () => {
    process.env = original;
  };
}
```

**Fix Strategy:** Create environment fixture utilities

---

## Priority Matrix

### P0 - CRITICAL (Week 1-2) - **OSS Packages Must Be IP-Safe**
**Target:** 34 tests fixed, IP-safe patterns established

| Package | Tests | Criticality | OSS? | Business Impact |
|---------|-------|-------------|------|-----------------|
| `packages/auth` | 29 | 3 | ✅ Yes | Authentication blocks all features |
| `packages/sdk` | 4 | 2-3 | ✅ Yes | Public API contract |
| `packages/core` | 1 | 3 | ✅ Yes | Security validator critical path |

**Why First:**
- Public packages cannot expose proprietary logic
- Authentication failures block entire product
- Establishes IP-safe testing patterns for OSS sync

**IP-Safe Requirements:**
- ❌ No subscription/tier logic in tests
- ❌ No PostHog event names
- ❌ No Stripe integration patterns
- ❌ No database schema details
- ✅ Generic test identifiers (test-org-123, test-key)
- ✅ Placeholder values for all sensitive data

---

### P1 - HIGH (Week 2-3) - **Backend Integration**
**Target:** 76 tests fixed, MSW patterns established

| Package | Tests | Criticality | OSS? | Business Impact |
|---------|-------|-------------|------|-----------------|
| `packages/api` | 71 | 2-3 | ❌ No | Backend endpoints, integrations |
| `apps/mcp-server` | 5 | 2-3 | ❌ No | Developer tool integration |

**Why Second:**
- Largest test count (71 API tests)
- Proprietary package (can reference internal implementation)
- Establishes MSW patterns for all integration tests

---

### P2 - MEDIUM (Week 3-4) - **Developer Tools + UI**
**Target:** 32 tests fixed, cleanup patterns established

| Package | Tests | Criticality | OSS? | Business Impact |
|---------|-------|-------------|------|-----------------|
| `apps/web` | 21 | 3 | ❌ No | UI tests, often flaky |
| `apps/vscode` | 10 | 3 | Partial | IDE extension |
| `apps/cli` | 1 | 2 | Partial | Developer CLI |

**Why Third:**
- Developer-facing tools (lower urgency than auth)
- UI tests typically require different patterns (Playwright)
- Can apply lessons from P0/P1

---

### P3 - LOW (Week 4) - **Test Utilities**
**Target:** 1 test fixed

| Package | Tests | Criticality | OSS? | Business Impact |
|---------|-------|-------------|------|-----------------|
| `packages/auth-mock` | 1 | 3 | ❌ No | Test utility only |

---

## 2025 Industry Best Practices Applied

### 1. Test Isolation & Cleanup (Vitest 2025)
**Source:** Vitest documentation, November 2025

**Key Principles:**
- **Function-level fixtures** for maximum isolation (setup/teardown per test)
- **Global state management** via `globalThis` flags to prevent redundant setup
- **Explicit cleanup** in `afterEach` for all resources (servers, DBs, file handles)

**Implementation:**
```typescript
// test/helpers/TestCleanupManager.ts
export class TestCleanupManager {
  private cleanups: (() => void | Promise<void>)[] = [];

  register(cleanup: () => void | Promise<void>): void {
    this.cleanups.push(cleanup);
  }

  async runAll(): Promise<void> {
    for (const cleanup of this.cleanups.reverse()) {
      await cleanup();
    }
    this.cleanups = [];
  }
}

// Usage in tests
let cleanup: TestCleanupManager;

beforeEach(() => {
  cleanup = new TestCleanupManager();
});

afterEach(async () => {
  await cleanup.runAll();
});
```

---

### 2. MSW Feature-Specific Handlers (2025 Pattern)
**Source:** Callstack MSW Best Practices, Turborepo Monorepo Guide

**Key Principles:**
- **Feature-based organization** (not monolithic handlers)
- **Helper functions** for clean test setup
- **Success + error scenarios** separated
- **Network-level mocking** (superior to mocking fetch/axios)

**Implementation:**
```typescript
// packages/auth/test/msw/auth-handlers.ts
import { http, HttpResponse } from "msw";

export const authHandlers = {
  success: [
    http.post("https://api.snapback.dev/auth/verify", ({ request }) => {
      return HttpResponse.json({
        valid: true,
        userId: "user_123",
        tier: "solo",
      });
    }),
  ],

  errors: {
    expired: [
      http.post("https://api.snapback.dev/auth/verify", () => {
        return HttpResponse.json(
          { error: "API key expired" },
          { status: 401 }
        );
      }),
    ],
  },
};

// Helper functions
export function useAuthHandlers(server) {
  server.use(...authHandlers.success);
}

export function useAuthError(server, errorType) {
  server.use(...authHandlers.errors[errorType]);
}
```

---

### 3. Deterministic Testing (2025 Flaky Test Prevention)
**Source:** FlakyGuard, Playwright 2026 Guide, DST Primer

**Key Principles:**
- **Auto-waiting mechanisms** (wait for elements ready)
- **Resilient assertions** with retry
- **Fake timers** for time-dependent code
- **Deterministic Simulation Testing** for concurrent code

**Implementation:**
```typescript
// test/helpers/DeterministicTime.ts
import { vi } from "vitest";

export class DeterministicTime {
  constructor() {
    vi.useFakeTimers();
  }

  advanceBy(ms: number): void {
    vi.advanceTimersByTime(ms);
  }

  advanceTo(timestamp: number): void {
    vi.setSystemTime(timestamp);
  }

  restore(): void {
    vi.useRealTimers();
  }
}

// Usage
it("should reset rate limit after window expires", async () => {
  const time = new DeterministicTime();

  // Use up limit
  await rateLimiter.checkLimit("user_123", 2, 60000);
  await rateLimiter.checkLimit("user_123", 2, 60000);

  // Should be blocked
  let result = await rateLimiter.checkLimit("user_123", 2, 60000);
  expect(result.allowed).toBe(false);

  // Advance time deterministically
  time.advanceBy(60000);

  // Should be allowed again
  result = await rateLimiter.checkLimit("user_123", 2, 60000);
  expect(result.allowed).toBe(true);

  time.restore();
});
```

---

### 4. Test Data Management (2025 Patterns)
**Source:** Test Data Fabric, @faker-js/faker Guide

**Key Principles:**
- **Test Data Fabric** for auto-generating relational data
- **@faker-js/faker** for contextual fake data
- **Factory pattern** with sensible defaults
- **JSON fixtures** for shared data

**Implementation:**
```typescript
// test/factories/user.factory.ts
import { faker } from "@faker-js/faker";

export function createTestUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: `test-${faker.string.alphanumeric(8)}@example.com`, // Generic domain
    tier: "solo",
    createdAt: new Date(),
    ...overrides,
  };
}

export function createTestApiKey(overrides = {}) {
  return {
    id: faker.string.uuid(),
    userId: "user_123", // Generic ID
    key: "sk_test_" + faker.string.alphanumeric(32),
    keyPreview: "sk_test_",
    name: "Test API Key",
    createdAt: new Date(),
    permissions: {},
    ...overrides,
  };
}

// Usage - IP-safe for OSS packages
it("should create API key with all required fields", async () => {
  const user = createTestUser(); // Generic test data
  const name = "Production API Key";

  const result = await createApiKey(user.id, name);

  expect(result.success).toBe(true);
  expect(result.value.keyPreview).toMatch(/^sk_test_/);
});
```

---

## Recommended Fix Sequence

### Week 1.1: Deterministic Infrastructure (Task: `deterministic_patterns`)
1. Create `test/helpers/TestCleanupManager.ts`
2. Create `test/helpers/DeterministicTime.ts`
3. Create `test/factories/` directory with user/apiKey factories
4. Install `@faker-js/faker`: `pnpm add -D @faker-js/faker`
5. Add to `@snapback/core/package.json` and build

**Deliverable:** Reusable test utilities for all packages

---

### Week 1.2-2.2: Fix P0 Packages (Auth, SDK, Core)
**packages/auth (29 tests):**
1. Replace weak assertions with MSW + behavioral tests
2. Create `test/msw/auth-handlers.ts` (IP-safe, no tier logic exposed)
3. Use `DeterministicTime` for rate limit tests (line 231)
4. Add `afterEach` cleanup for all suites
5. Activate commented-out Redis tests with proper mocks
6. Verify IP-safe: No subscription logic, no Stripe references

**packages/sdk (4 tests):**
1. Create `test/msw/sdk-handlers.ts` for API endpoints
2. Replace manual fetch mocking
3. Add cleanup for environment variables
4. Verify IP-safe: Generic test data only

**packages/core (1 test):**
1. Fix security validator test with MSW
2. Ensure edge cases covered

**Deliverable:** 34 OSS tests passing, IP-safe patterns documented

---

### Week 2.1-3.1: Fix P1 Packages (API, MCP-Server)
**packages/api (71 tests):**
1. Create `test/msw/api-handlers.ts` by feature:
   - `api-keys-handlers.ts`
   - `error-handling-handlers.ts`
   - `rate-limiting-handlers.ts`
   - `stripe-handlers.ts` (proprietary OK)
2. Replace database mocks with MSW + transaction rollback
3. Add `afterEach` cleanup for all suites
4. Fix environment variable dependencies (8 tests)

**apps/mcp-server (5 tests):**
1. Create `test/msw/mcp-handlers.ts`
2. Fix API integration tests with MSW

**Deliverable:** 76 tests passing, MSW patterns established

---

### Week 3.1-4.0: Fix P2/P3 Packages
**apps/web (21 tests):**
1. Visual regression tests may need Playwright adjustments
2. Apply MSW patterns from API package
3. Add state cleanup in `afterEach`

**apps/vscode (10 tests):**
1. Extension-specific test patterns
2. MSW for API calls

**apps/cli (1 test):**
1. Fix import error (add `beforeEach`)
2. MSW for API client

**packages/auth-mock (1 test):**
1. Simple utility test fix

**Deliverable:** All 143 tests passing, zero flaky tests

---

## Success Criteria

### Week 1-2 (P0 Completion)
- [ ] 34 OSS tests passing (auth, SDK, core)
- [ ] All tests run 100 consecutive times without failure
- [ ] IP-safe validation passing (no proprietary logic exposed)
- [ ] Test utilities created (TestCleanupManager, DeterministicTime, factories)
- [ ] MSW handlers organized by feature

### Week 2-3 (P1 Completion)
- [ ] 110 total tests passing (P0 + P1)
- [ ] API integration tests use MSW (not manual mocks)
- [ ] Environment variable cleanup 100%
- [ ] Zero setTimeout/setInterval in tests

### Week 3-4 (Full Completion)
- [ ] All 143 tests passing
- [ ] Zero flaky tests (100 consecutive runs)
- [ ] Cleanup coverage 100% (all afterEach implemented)
- [ ] Type-check passing (no import errors)

---

## Risk Mitigation

### Risk: Breaking Existing Functionality
**Mitigation:**
- Fix tests incrementally (one package at a time)
- Run full test suite after each package fix
- Keep KEEP-flagged tests (544) stable during fixes

### Risk: MSW Learning Curve
**Mitigation:**
- Start with simple handlers (auth package)
- Establish patterns before scaling to API package (71 tests)
- Reference 2025 MSW best practices documentation

### Risk: Time Budget Overrun
**Mitigation:**
- Focus on P0 first (34 tests, 1 week max)
- Weak assertions are quick wins (~40 tests, 2-3 days)
- Defer P3 if time-constrained (1 test, low impact)

---

## Next Steps

1. **User Approval Required:** Review priority matrix and fix sequence
2. **Task Update:** Mark `test_audit_analysis` COMPLETE, `deterministic_patterns` IN_PROGRESS
3. **Implementation Start:** Create test utility infrastructure (Week 1.1)
4. **Continuous Verification:** Run tests after each fix
5. **Documentation:** Update code-review-standards.md with patterns

---

**Analysis Complete** ✅
**Ready for Phase 1 Implementation** 🚀
