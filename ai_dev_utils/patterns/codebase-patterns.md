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

### AP-004: Test File Location Error
**Frequency:** 2 occurrences
**First Seen:** 2025-12-21
**Type:** `TEST_FILE_LOCATION_ERROR`

**Prevention:** Always check vitest.config.ts test.include pattern before creating test files.
For VS Code extension: tests MUST be in `test/` directory, NEVER in `src/`.

**Detection:** File path contains `src/*.test.ts` or test not being picked up by vitest

**Files affected:**
- `apps/vscode/src/ui/VitalsIntegration.test.ts` (moved to test/)
- `apps/vscode/src/ui/StatusBarManager.test.ts` (moved to test/)


---

### AP-005: Path Resolution in ESM/MCP
**Frequency:** 1 occurrence
**First Seen:** 2025-12-21
**Type:** `PATH_RESOLUTION_BUG`

**Prevention:** In MCP servers launched with absolute paths, use `fileURLToPath(import.meta.url)` + `path.dirname()` instead of `process.cwd()`.

**Pattern:**
```typescript
// WRONG - process.cwd() returns project root when launched via .mcp.json
const rootDir = process.cwd();

// CORRECT - use import.meta.url
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
```

**Files affected:**
- `ai_dev_utils/mcp/prompt-cache.ts`


---

### AP-006: Vitest Workspace Glob Patterns
**Frequency:** 1 occurrence
**First Seen:** 2025-12-21
**Type:** `CONFIG_PATH_RESOLUTION`

**Prevention:** Vitest projects glob patterns must exclude non-package files:
- Use explicit paths for packages-oss/* instead of globs
- Exclude standalone .ts files like vercel-entry.ts
- Exclude .md files from matching

**Files affected:**
- `vitest.config.ts`
- `packages/vitest-config/aliases.ts`


---

### AP-007: NO_CONSOLE (20+ occurrences)
**Frequency:** 200+ total (21 files with 3+ occurrences)
**First Seen:** 2025-12-21 (audit)
**Type:** `NO_CONSOLE`

**Prevention:** Replace `console.log` with structured logger from `@snapback/core`.
ValidationPipeline pre-commit hook now catches new additions.

**Hot Spots:**
- `apps/vscode/src/activation/phase2-storage.ts` (18)
- `apps/vscode/src/activation/phase3-managers.ts` (18)
- `apps/vscode/src/activation/phase4-providers.ts` (15)
- `apps/vscode/src/handlers/ProtectionLevelHandler.ts` (14)


---

## Recent Fixes

| Date | Violation | File | Fix Applied |
|------|-----------|------|-------------|
| 2025-12-20 | path-resolution-bug | ai_dev_utils/mcp/prompt-cache.ts | Changed process.cwd() to fileURLToPath pattern |
| 2025-12-20 | onnxruntime-deps | packages/intelligence | Added onnxruntime-common, onnxruntime-node |
| 2025-12-20 | dual-use-mcp | apps/mcp-server | Wired customer MCP with snapback.* tools |

---

*Last updated: 2025-12-20 (Priorities 1-4 complete, dual-use MCP integrated)*
