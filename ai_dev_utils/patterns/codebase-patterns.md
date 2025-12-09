# SnapBack Codebase Patterns

**Auto-updated based on violation reports.**
**Query these patterns before starting related tasks.**

---

## Service Locations

| Domain | Canonical Location | Notes |
|--------|-------------------|-------|
| Dashboard metrics | `apps/api/src/services/metrics-aggregator.ts` | All dashboard data flows through here |
| User analytics | `apps/api/src/services/analytics-service.ts` | PostHog integration |
| Snapshots | `packages/core/src/snapshot/` | Core snapshot logic |
| API procedures | `apps/api/src/procedures/` | Thin orchestration only |

---

## Test Patterns

### Database Tests
```typescript
import { setupTestDatabase, TestCleanupManager } from '@/test-utils';

describe('ServiceName', () => {
  let cleanup: TestCleanupManager;

  beforeAll(async () => {
    cleanup = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanup.dispose();
  });

  afterEach(async () => {
    await cleanup.clear();
  });
});
```

### Time-Dependent Tests
```typescript
import { DeterministicTime } from '@/test-utils';

it('should handle time correctly', () => {
  const time = new DeterministicTime('2024-01-15T10:00:00Z');
  // Use time.now() instead of Date.now()
});
```

---

## Common Violations (Learned)

### 1. Service Bypass
**Seen:** 0 times
**Pattern:** Direct DB queries in procedure files
**Fix:** Move all business logic to service layer

### 2. Vague Assertions
**Seen:** 0 times
**Pattern:** Using `.toBeTruthy()` instead of `.toEqual()`
**Fix:** Always assert specific values

### 3. Missing Error Path
**Seen:** 0 times
**Pattern:** Only testing happy path
**Fix:** Always include error case test

---

## Recent Fixes

| Date | Violation | File | Fix Applied |
|------|-----------|------|-------------|
| | | | |

---

*Last updated: [Automatically updated by violation reports]*
