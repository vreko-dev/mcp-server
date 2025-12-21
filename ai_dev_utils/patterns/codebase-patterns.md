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
**Seen:** 1 time
**Pattern:** Direct DB queries in procedure files
**Fix:** Move all business logic to service layer

### 2. Vague Assertions ✅ PROMOTED (4x)
**Seen:** 4 times
**Pattern:** Using `.toBeTruthy()` instead of `.toEqual()`
**Fix:** Always assert specific values
**Detection:** `\.(toBeTruthy|toBeFalsy|toBeDefined|toBeUndefined)\(\)` in test files

### 3. Missing Error Path
**Seen:** 4 times (as INCOMPLETE_COVERAGE)
**Pattern:** Only testing happy path
**Fix:** Always include 4-path coverage: happy, sad, edge, error

### 4. Path Resolution Bug
**Seen:** 1 time
**Pattern:** Using `process.cwd()` for path resolution in ESM MCP tools
**Fix:** Use `fileURLToPath(import.meta.url)` + `path.dirname()` pattern

### 5. Ignored Router Instructions
**Seen:** 1 time
**Pattern:** Starting implementation without calling `codebase.get_context()` first
**Fix:** ALWAYS call `codebase.start_task()` or `codebase.get_context()` BEFORE coding

---


### AP-001: Missing Service Location 🤖 AUTOMATED
**Frequency:** 10 occurrences
**First Seen:** 2025-12-09
**Type:** `MISSING_SERVICE_LOCATION`

**Prevention:** Complete Step 3 in architecture audit and save to state file

**Files affected:**



---


### AP-002: Vague Assertion
**Frequency:** 4 occurrences
**First Seen:** 2025-12-09
**Type:** `VAGUE_ASSERTION`

**Prevention:** Use specific assertions: .toEqual(), .toBe(), .toMatchObject() with real values

**Files affected:**
- `apps/vscode/test/integration/telemetry-proxy-offline-queue.test.ts`
- `apps/vscode/test/unit/snapshot/sessionCoordinator.test.ts`


---


### AP-003: Incomplete Coverage
**Frequency:** 4 occurrences
**First Seen:** 2025-12-09
**Type:** `INCOMPLETE_COVERAGE`

**Prevention:** Add tests for all 4 paths before completing

**Files affected:**
- `apps/vscode/test/unit/telemetry-proxy-offline-queue.test.ts`
- `apps/vscode/test/unit/snapshot/sessionCoordinator.test.ts`
- `apps/api/modules/apikeys/tests/api-keys.test.ts`
- `packages/engine/test/transports/mcp.test.ts`


---

## Recent Fixes

| Date | Violation | File | Fix Applied |
|------|-----------|------|-------------|
| 2025-12-20 | path-resolution-bug | ai_dev_utils/mcp/prompt-cache.ts | Changed process.cwd() to fileURLToPath pattern |
| 2025-12-20 | onnxruntime-deps | packages/intelligence | Added onnxruntime-common, onnxruntime-node |
| 2025-12-20 | dual-use-mcp | apps/mcp-server | Wired customer MCP with snapback.* tools |

---

*Last updated: 2025-12-20 (Priorities 1-4 complete, dual-use MCP integrated)*
