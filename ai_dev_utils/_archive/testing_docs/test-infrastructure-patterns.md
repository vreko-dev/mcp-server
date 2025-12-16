# Deterministic Testing Infrastructure Patterns (2025)

**Applies to:** All test files in `packages/*/test/`, `apps/*/test/`
**Authority:** Workspace-wide testing standards
**Enforcement:** Required for integration tests, recommended for all tests
**Package:** `@snapback/testing`

---

## 📦 Overview

The `@snapback/testing` package provides deterministic testing infrastructure to eliminate flaky tests and ensure consistent, reliable test execution. This document describes the patterns and utilities available.

**Installation:**
```json
{
  "devDependencies": {
    "@snapback/testing": "workspace:*"
  }
}
```

---

## 🧹 TestCleanupManager

### Purpose
Manages test cleanup callbacks in LIFO (Last In, First Out) order to prevent resource leaks and ensure proper teardown even when tests fail.

### Pattern: Resource Cleanup

```typescript
import { TestCleanupManager } from "@snapback/testing/utils/TestCleanupManager";

describe("DatabaseIntegration", () => {
  let cleanup: TestCleanupManager;

  beforeEach(() => {
    cleanup = new TestCleanupManager();
  });

  afterEach(async () => {
    await cleanup.runAll();
  });

  it("should create and cleanup database connection", async () => {
    // Arrange: Create resource
    const db = await createDatabase();
    cleanup.register(async () => {
      await db.close();
    });

    const transaction = await db.beginTransaction();
    cleanup.register(async () => {
      await transaction.rollback();
    });

    // Act: Use resource
    await transaction.execute("INSERT INTO users ...");

    // Assert
    const users = await transaction.query("SELECT * FROM users");
    expect(users).toHaveLength(1);

    // Cleanup happens automatically in afterEach (LIFO order)
    // 1. transaction.rollback() - registered second, runs first
    // 2. db.close() - registered first, runs second
  });
});
```

### API Reference

**Constructor:**
```typescript
const cleanup = new TestCleanupManager();
```

**Methods:**

| Method | Description | Returns |
|--------|-------------|---------|
| `register(callback)` | Register cleanup callback | `void` |
| `runAll()` | Execute all cleanups in LIFO order | `Promise<void>` |

**Error Handling:**
- Collects all errors during cleanup
- Throws `AggregateError` if any cleanup fails
- Continues executing remaining cleanups even if one fails
- Prevents registration after `runAll()` has been called

### Real-World Examples

#### Example 1: File System Operations

```typescript
import { TestCleanupManager } from "@snapback/testing/utils/TestCleanupManager";
import * as fs from "node:fs/promises";

describe("SnapshotStorage", () => {
  let cleanup: TestCleanupManager;

  beforeEach(() => {
    cleanup = new TestCleanupManager();
  });

  afterEach(async () => {
    await cleanup.runAll();
  });

  it("should store snapshot to temporary directory", async () => {
    // Create temp directory
    const tempDir = await fs.mkdtemp("/tmp/snapback-test-");
    cleanup.register(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    // Create snapshot file
    const snapshotPath = `${tempDir}/snapshot.json`;
    await fs.writeFile(snapshotPath, JSON.stringify({ id: "test" }));

    // Assert
    const content = await fs.readFile(snapshotPath, "utf-8");
    expect(JSON.parse(content).id).toBe("test");

    // Cleanup automatically removes tempDir
  });
});
```

#### Example 2: HTTP Server Cleanup

```typescript
import { TestCleanupManager } from "@snapback/testing/utils/TestCleanupManager";
import { createServer } from "node:http";

describe("APIClient", () => {
  let cleanup: TestCleanupManager;

  beforeEach(() => {
    cleanup = new TestCleanupManager();
  });

  afterEach(async () => {
    await cleanup.runAll();
  });

  it("should connect to test server", async () => {
    // Start test server
    const server = createServer((req, res) => {
      res.writeHead(200);
      res.end(JSON.stringify({ status: "ok" }));
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });

    cleanup.register(async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    });

    // Get dynamic port
    const address = server.address();
    const port = typeof address === "object" ? address?.port : null;

    // Test API client
    const client = new APIClient(`http://localhost:${port}`);
    const response = await client.healthCheck();

    expect(response.status).toBe("ok");

    // Server closed automatically in afterEach
  });
});
```

#### Example 3: Event Bus Subscriptions

```typescript
import { TestCleanupManager } from "@snapback/testing/utils/TestCleanupManager";
import { SnapBackEventBus } from "@snapback/events";

describe("EventBusIntegration", () => {
  let cleanup: TestCleanupManager;
  let eventBus: SnapBackEventBus;

  beforeEach(async () => {
    cleanup = new TestCleanupManager();
    eventBus = new SnapBackEventBus();
    await eventBus.initialize();

    cleanup.register(async () => {
      await eventBus.shutdown();
    });
  });

  afterEach(async () => {
    await cleanup.runAll();
  });

  it("should receive snapshot.created event", async () => {
    const events: string[] = [];

    // Subscribe to event
    const unsubscribe = await eventBus.subscribe("snapshot.created", (data) => {
      events.push(data.id);
    });

    cleanup.register(() => {
      unsubscribe();
    });

    // Publish event
    await eventBus.publish("snapshot.created", { id: "snap_123" });

    // Wait for event processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events).toContain("snap_123");

    // Cleanup unsubscribes and shuts down event bus
  });
});
```

---

## ⏱️ DeterministicTime

### Purpose
Controls async timing in tests using Vitest fake timers, eliminating flakiness caused by `setTimeout`, `setInterval`, and `Date.now()` calls.

### Pattern: Fake Timers with Helper Functions

```typescript
import { DeterministicTime, toTimestamp, addTime } from "@snapback/testing/utils/DeterministicTime";
import { vi } from "vitest";

describe("SessionExpiration", () => {
  let time: DeterministicTime;

  beforeEach(() => {
    time = new DeterministicTime(toTimestamp("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    time.restore();
  });

  it("should expire session after 30 minutes", () => {
    const sessionManager = new SessionManager();
    const session = sessionManager.create({ userId: "user_123" });

    // Session created at 00:00:00
    expect(session.isExpired()).toBe(false);

    // Advance time by 29 minutes
    time.advanceBy(29 * 60 * 1000);
    expect(session.isExpired()).toBe(false);

    // Advance time by 1 more minute (total 30 minutes)
    time.advanceBy(60 * 1000);
    expect(session.isExpired()).toBe(true);
  });

  it("should handle timestamp calculations", () => {
    const now = toTimestamp("2025-01-01T12:00:00Z");

    // Add various time units
    const futureTime = addTime(now, {
      hours: 2,
      minutes: 30,
      seconds: 15,
    });

    const expected = toTimestamp("2025-01-01T14:30:15Z");
    expect(futureTime).toBe(expected);
  });
});
```

### API Reference

**Constructor:**
```typescript
// Start at current time
const time = new DeterministicTime();

// Start at specific timestamp
const time = new DeterministicTime(toTimestamp("2025-01-01T00:00:00Z"));
```

**Methods:**

| Method | Description | Returns |
|--------|-------------|---------|
| `advanceBy(ms)` | Advance timers by milliseconds | `void` |
| `advanceTo(timestamp)` | Advance to specific timestamp | `void` |
| `runPendingTimers()` | Run all pending setTimeout/setInterval | `void` |
| `restore()` | Restore real timers | `void` |

**Helper Functions:**

| Function | Description | Example |
|----------|-------------|---------|
| `toTimestamp(isoString)` | Convert ISO string to timestamp | `toTimestamp("2025-01-01T00:00:00Z")` |
| `addTime(timestamp, duration)` | Add time to timestamp | `addTime(now, { hours: 2, minutes: 30 })` |

**Duration Object:**
```typescript
interface Duration {
  ms?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
  weeks?: number;
}
```

### Real-World Examples

#### Example 1: Debounce Logic

```typescript
import { DeterministicTime } from "@snapback/testing/utils/DeterministicTime";

describe("SearchDebounce", () => {
  let time: DeterministicTime;

  beforeEach(() => {
    time = new DeterministicTime();
  });

  afterEach(() => {
    time.restore();
  });

  it("should debounce search requests", async () => {
    const searchFn = vi.fn();
    const debouncedSearch = debounce(searchFn, 300);

    // Type quickly (3 calls within 300ms)
    debouncedSearch("a");
    time.advanceBy(100);

    debouncedSearch("ab");
    time.advanceBy(100);

    debouncedSearch("abc");

    // Before debounce timeout - no calls yet
    expect(searchFn).not.toHaveBeenCalled();

    // Advance past debounce timeout
    time.advanceBy(300);

    // Only last call executed
    expect(searchFn).toHaveBeenCalledTimes(1);
    expect(searchFn).toHaveBeenCalledWith("abc");
  });
});
```

#### Example 2: Retry Logic with Exponential Backoff

```typescript
import { DeterministicTime } from "@snapback/testing/utils/DeterministicTime";

describe("RetryWithBackoff", () => {
  let time: DeterministicTime;

  beforeEach(() => {
    time = new DeterministicTime();
  });

  afterEach(() => {
    time.restore();
  });

  it("should retry with exponential backoff", async () => {
    let attempts = 0;
    const operation = vi.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error("Temporary failure");
      return "success";
    });

    const retryPromise = retryWithBackoff(operation, {
      maxAttempts: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
    });

    // First attempt fails immediately
    await time.advanceBy(0);
    expect(attempts).toBe(1);

    // Second attempt after 1000ms
    await time.advanceBy(1000);
    expect(attempts).toBe(2);

    // Third attempt after 2000ms (exponential backoff)
    await time.advanceBy(2000);
    expect(attempts).toBe(3);

    const result = await retryPromise;
    expect(result).toBe("success");
  });
});
```

#### Example 3: Rate Limiting

```typescript
import { DeterministicTime, toTimestamp } from "@snapback/testing/utils/DeterministicTime";

describe("RateLimiter", () => {
  let time: DeterministicTime;

  beforeEach(() => {
    time = new DeterministicTime(toTimestamp("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    time.restore();
  });

  it("should enforce rate limit of 10 requests per minute", () => {
    const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });

    // Make 10 requests - all should succeed
    for (let i = 0; i < 10; i++) {
      expect(limiter.tryAcquire()).toBe(true);
    }

    // 11th request should be rate limited
    expect(limiter.tryAcquire()).toBe(false);

    // Advance time by 60 seconds (window reset)
    time.advanceBy(60000);

    // Should be able to make requests again
    expect(limiter.tryAcquire()).toBe(true);
  });
});
```

#### Example 4: Polling with Timeout

```typescript
import { DeterministicTime } from "@snapback/testing/utils/DeterministicTime";

describe("PollingWithTimeout", () => {
  let time: DeterministicTime;

  beforeEach(() => {
    time = new DeterministicTime();
  });

  afterEach(() => {
    time.restore();
  });

  it("should poll until condition met or timeout", async () => {
    let callCount = 0;
    const checkStatus = vi.fn(() => {
      callCount++;
      return callCount >= 3 ? "ready" : "pending";
    });

    const pollPromise = pollUntil(checkStatus, {
      interval: 1000,
      timeout: 5000,
    });

    // First poll
    await time.advanceBy(0);
    expect(checkStatus).toHaveBeenCalledTimes(1);

    // Second poll after 1s
    await time.advanceBy(1000);
    expect(checkStatus).toHaveBeenCalledTimes(2);

    // Third poll after 1s - condition met
    await time.advanceBy(1000);
    expect(checkStatus).toHaveBeenCalledTimes(3);

    const result = await pollPromise;
    expect(result).toBe("ready");
  });

  it("should timeout if condition not met", async () => {
    const checkStatus = vi.fn(() => "pending");

    const pollPromise = pollUntil(checkStatus, {
      interval: 1000,
      timeout: 3000,
    });

    // Advance past timeout
    await time.advanceBy(3000);

    await expect(pollPromise).rejects.toThrow("Polling timeout");
  });
});
```

---

## 🏭 Test Data Factories

### Purpose
Generate IP-safe, generic test data using `@faker-js/faker`. Prevents exposure of proprietary logic in OSS packages.

### Pattern: Factory Functions with Overrides

```typescript
import {
  createTestUser,
  createTestSnapshot,
  createTestOrganization,
  createTestApiKey,
  createTestRiskAnalysis
} from "@snapback/testing/fixtures/factories";

describe("SnapshotCreation", () => {
  it("should create snapshot with generated data", () => {
    const user = createTestUser();
    const snapshot = createTestSnapshot({ userId: user.id });

    expect(snapshot.id).toMatch(/^snap_[a-zA-Z0-9]{12}$/);
    expect(snapshot.userId).toBe(user.id);
  });

  it("should support custom overrides", () => {
    const snapshot = createTestSnapshot({
      filePath: "/custom/path.ts",
      content: "// Custom content",
    });

    expect(snapshot.filePath).toBe("/custom/path.ts");
    expect(snapshot.content).toBe("// Custom content");
  });
});
```

### Available Factories

#### `createTestUser(overrides?)`
```typescript
const user = createTestUser({
  email: "custom@example.com",
  tier: "pro",
});

// Returns:
{
  id: "user_abc123def456",
  email: "test-a1b2c3d4@example.com",
  tier: "free",
  createdAt: 1704067200000,
  updatedAt: 1704067200000
}
```

**Fields:**
- `id` - Prefixed with `user_` + 12 random chars
- `email` - Format: `test-{random}@example.com`
- `tier` - One of: `"free"`, `"pro"`, `"enterprise"`
- `createdAt` - Timestamp in last 90 days
- `updatedAt` - Timestamp >= createdAt

#### `createTestApiKey(overrides?)`
```typescript
const apiKey = createTestApiKey({ mode: "test" });

// Returns:
{
  key: "sk_test_abc123def456ghi789jkl012mno345",
  mode: "test",
  createdAt: 1704067200000
}
```

**Fields:**
- `key` - Format: `sk_{mode}_{32 random chars}`
- `mode` - One of: `"test"`, `"live"`
- `createdAt` - Timestamp in last 90 days

#### `createTestSnapshot(overrides?)`
```typescript
const snapshot = createTestSnapshot({
  filePath: "/src/index.ts",
});

// Returns:
{
  id: "snap_abc123def456",
  filePath: "/test/file.ts",
  content: "// Test file\nconst x = 42;",
  hash: "sha256_abc123def456...",
  size: 1024,
  createdAt: 1704067200000,
  userId: "user_xyz789abc123"
}
```

**Fields:**
- `id` - Prefixed with `snap_` + 12 random chars
- `filePath` - Random test file path
- `content` - Generic code content
- `hash` - Prefixed with `sha256_`
- `size` - Random size 100-100,000 bytes
- `createdAt` - Timestamp
- `userId` - Random user ID

#### `createTestOrganization(overrides?)`
```typescript
const org = createTestOrganization({
  name: "Test Corp",
});

// Returns:
{
  id: "org_abc123def456",
  name: "Test Org 1234",
  slug: "test-org-1234",
  tier: "enterprise",
  createdAt: 1704067200000
}
```

**Fields:**
- `id` - Prefixed with `org_` + 12 random chars
- `name` - Format: `Test Org {number}`
- `slug` - Format: `test-org-{number}`
- `tier` - One of: `"free"`, `"pro"`, `"enterprise"`
- `createdAt` - Timestamp

#### `createTestRiskAnalysis(overrides?)`
```typescript
const analysis = createTestRiskAnalysis({
  severity: "high",
});

// Returns:
{
  id: "risk_abc123def456",
  score: 0.75,
  severity: "high",
  factors: ["secret-detection", "large-change"],
  timestamp: 1704067200000,
  snapshotId: "snap_xyz789abc123"
}
```

**Fields:**
- `id` - Prefixed with `risk_` + 12 random chars
- `score` - Random 0.0-1.0
- `severity` - One of: `"low"`, `"medium"`, `"high"`, `"critical"`
- `factors` - Array of generic risk factor strings
- `timestamp` - Timestamp
- `snapshotId` - Random snapshot ID

### Helper Functions

#### `createMany<T>(factory, count, overrides?)`
```typescript
import { createMany, createTestUser } from "@snapback/testing/fixtures/factories";

// Create 5 test users
const users = createMany(createTestUser, 5);

// Create 3 users with shared override
const proUsers = createMany(createTestUser, 3, { tier: "pro" });

expect(users).toHaveLength(5);
expect(proUsers.every(u => u.tier === "pro")).toBe(true);
```

### IP-Safety Guidelines

**✅ Factories MUST:**
- Use generic identifiers (`user_XXX`, `org_XXX`, `test-XXX`)
- Use `@example.com` for emails
- Avoid exposing subscription/tier logic
- Use generic risk factors (no proprietary scoring)
- Generate random data with `@faker-js/faker`

**❌ Factories MUST NOT:**
- Expose real customer data or patterns
- Include proprietary algorithms
- Reference Stripe, PostHog, or other services
- Include database schema details
- Expose enterprise feature flags

---

## 🔧 Integration Patterns

### Pattern: Combining All Utilities

```typescript
import { TestCleanupManager } from "@snapback/testing/utils/TestCleanupManager";
import { DeterministicTime, toTimestamp, addTime } from "@snapback/testing/utils/DeterministicTime";
import { createTestUser, createTestSnapshot } from "@snapback/testing/fixtures/factories";
import { setupServer } from "msw/node";
import { snapshotHandlers } from "@snapback/testing/msw/handlers";

describe("Full Integration Test", () => {
  let cleanup: TestCleanupManager;
  let time: DeterministicTime;
  const server = setupServer(...snapshotHandlers.success);

  beforeEach(() => {
    cleanup = new TestCleanupManager();
    time = new DeterministicTime(toTimestamp("2025-01-01T00:00:00Z"));

    server.listen();
    cleanup.register(() => server.close());
  });

  afterEach(async () => {
    time.restore();
    await cleanup.runAll();
  });

  it("should create and expire snapshot session", async () => {
    // Arrange: Create test data
    const user = createTestUser({ tier: "pro" });
    const snapshot = createTestSnapshot({ userId: user.id });

    // Create session
    const sessionManager = new SessionManager();
    const session = await sessionManager.create(user.id, snapshot.id);

    cleanup.register(async () => {
      await sessionManager.destroy(session.id);
    });

    // Act: Advance time to expiration
    time.advanceBy(addTime(0, { minutes: 30 }));

    // Assert
    const expired = await sessionManager.get(session.id);
    expect(expired).toBeNull(); // Session expired and cleaned up

    // All cleanup happens automatically
  });
});
```

---

## 📊 Best Practices

### 1. Always Use TestCleanupManager for Resources
```typescript
// ✅ GOOD: Automatic cleanup
let cleanup: TestCleanupManager;

beforeEach(() => {
  cleanup = new TestCleanupManager();
});

afterEach(async () => {
  await cleanup.runAll();
});

it("test", async () => {
  const resource = await createResource();
  cleanup.register(() => resource.destroy());
});

// ❌ BAD: Manual cleanup (easy to forget)
it("test", async () => {
  const resource = await createResource();
  try {
    // test logic
  } finally {
    await resource.destroy(); // What if test throws before this?
  }
});
```

### 2. Use DeterministicTime for All Timing Tests
```typescript
// ✅ GOOD: Deterministic
let time: DeterministicTime;

beforeEach(() => {
  time = new DeterministicTime();
});

afterEach(() => {
  time.restore();
});

it("test", () => {
  time.advanceBy(1000);
  expect(callback).toHaveBeenCalled();
});

// ❌ BAD: Non-deterministic (flaky)
it("test", async () => {
  setTimeout(callback, 1000);
  await new Promise(r => setTimeout(r, 1100)); // Race condition!
  expect(callback).toHaveBeenCalled();
});
```

### 3. Use Factories for All Test Data
```typescript
// ✅ GOOD: IP-safe, maintainable
it("test", () => {
  const user = createTestUser({ tier: "pro" });
  const snapshot = createTestSnapshot({ userId: user.id });
});

// ❌ BAD: Hardcoded, exposes patterns
it("test", () => {
  const user = {
    id: "user_cus_real_customer_id", // ❌ Real pattern
    email: "customer@realcompany.com", // ❌ Real data
    tier: "enterprise_custom_plan", // ❌ Exposes tiers
  };
});
```

### 4. Combine Utilities for Complex Tests
```typescript
describe("ComplexIntegration", () => {
  let cleanup: TestCleanupManager;
  let time: DeterministicTime;

  beforeEach(() => {
    cleanup = new TestCleanupManager();
    time = new DeterministicTime();
  });

  afterEach(async () => {
    time.restore();
    await cleanup.runAll();
  });

  it("should handle resource lifecycle with timing", async () => {
    const user = createTestUser();
    const resource = await createResource(user.id);
    cleanup.register(() => resource.destroy());

    time.advanceBy(5000);

    expect(resource.isExpired()).toBe(true);
  });
});
```

---

## 🚀 Migration Guide

### Migrating from Manual Cleanup

**Before:**
```typescript
describe("Test", () => {
  const resources: Resource[] = [];

  afterEach(async () => {
    for (const resource of resources) {
      try {
        await resource.cleanup();
      } catch (err) {
        console.error(err);
      }
    }
    resources.length = 0;
  });

  it("test", async () => {
    const resource = await create();
    resources.push(resource);
  });
});
```

**After:**
```typescript
import { TestCleanupManager } from "@snapback/testing/utils/TestCleanupManager";

describe("Test", () => {
  let cleanup: TestCleanupManager;

  beforeEach(() => {
    cleanup = new TestCleanupManager();
  });

  afterEach(async () => {
    await cleanup.runAll();
  });

  it("test", async () => {
    const resource = await create();
    cleanup.register(() => resource.cleanup());
  });
});
```

### Migrating from setTimeout in Tests

**Before:**
```typescript
it("debounce test", async () => {
  const callback = vi.fn();
  const debounced = debounce(callback, 300);

  debounced();
  await new Promise(r => setTimeout(r, 400)); // ❌ Flaky

  expect(callback).toHaveBeenCalled();
});
```

**After:**
```typescript
import { DeterministicTime } from "@snapback/testing/utils/DeterministicTime";

it("debounce test", () => {
  const time = new DeterministicTime();
  const callback = vi.fn();
  const debounced = debounce(callback, 300);

  debounced();
  time.advanceBy(300); // ✅ Deterministic

  expect(callback).toHaveBeenCalled();
  time.restore();
});
```

---

## 📚 References

- **Package Location:** `packages/testing/`
- **MSW Patterns:** See `code-review-standards.md` § MSW Integration
- **Test Organization:** See `code-review-standards.md` § Test Organization & Naming
- **IP Safety:** See `code-review-standards.md` § Open Core Testing Strategy
- **Vitest Fake Timers:** https://vitest.dev/guide/features.html#timer-mocking

**Last Updated:** 2025-12-05
**Reviewed By:** Testing infrastructure team
**Phase 1 Status:** ✅ Complete - Infrastructure ready for use
