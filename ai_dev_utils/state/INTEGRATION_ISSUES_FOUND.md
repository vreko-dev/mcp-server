# Integration Audit Issues Found - 2025-12-21

**Session:** INTEGRATION_AUDIT per ROUTER.md
**Workflow:** 2_research.md → 4_dev_complete.md
**Date:** 2025-12-21
**Status:** Documented for future resolution

---

## Critical Issues (MUST FIX)

### ISSUE-001: Unrelated Module Import Error Blocking Compilation
**Severity:** HIGH
**File:** `apps/api/src/routes/v1/policy-evaluate.ts:24`
**Error:**
```
error TS2307: Cannot find module '@snapback/policy-engine' or its corresponding type declarations.
```
**Impact:** `pnpm type-check` fails for entire API package
**Root Cause:** Missing `@snapback/policy-engine` package or dependency not installed
**Status:** Blocking - Not introduced by integration changes, pre-existing
**Action Required:**
- Verify if policy-engine package exists in workspace
- Check if it's installed in package.json
- If missing, either install or remove import
- Not part of INT-002 (Service Layer) work, investigate separately

**Prevention:** Add to pre-flight checks before running type-check

---

## Architecture Violations Found

### ISSUE-002: Mixed Service Layer Pattern in Dashboard Module
**Severity:** MEDIUM
**File:** `apps/api/modules/dashboard/procedures/get-metrics.ts`
**Issue:** Procedure uses both inline DB calls AND delegated service calls
```typescript
// Lines 89-111: Direct DB calls (inline)
db.select({ count: count() }).from(snapshots)
db.select({ count: count() }).from(telemetryEvents).where(...)
// Lines 114-117: Delegated to MetricsAggregator service
aggregator.getAIToolDetectionCounts(userId)
aggregator.getRecentActivity(userId, 7)
```
**Violation:** Inconsistent C-002 pattern - mixing inline and delegated queries
**Impact:** Creates two DB access patterns in single procedure
**Action Required:**
1. Extract ALL inline DB calls to dashboard-service functions
2. Refactor get-metrics.ts to delegate completely
3. Remove MetricsAggregator imports from procedure
4. Add wrapper functions to dashboard-service

**Prevention:** Enforce "procedures must not contain db. calls" in lint/validation

---

### ISSUE-003: Service Import Name Collision (Dashboard)
**Severity:** LOW
**File:** `apps/api/modules/dashboard/procedures/get-user-metrics.ts`
**Issue:**
```typescript
import { getUserMetrics as getUserMetricsFromService } from "../services/dashboard-service";
export const getUserMetrics = protectedProcedure...
```
**Problem:** Both procedure and service function have same name, requires aliasing
**Impact:** Confusing to read, requires alias imports
**Root Cause:** Procedure name matches service function name
**Action Required:**
- Consider renaming service functions with verb-based naming: `fetchUserMetrics`, `calculateUserMetrics`, `queryUserMetrics`
- OR rename procedure to match pattern (e.g., `getUserMetricsEndpoint`)
- Update all 6 refactored dashboard procedures

**Prevention:** Establish naming convention for service vs procedure functions
- Procedures: `getName`, `getMetrics` (what they expose)
- Services: `queryName`, `fetchName`, `computeName` (what they do)

---

### ISSUE-004: Analytics Service - Inconsistent Function Signatures
**Severity:** MEDIUM
**File:** `apps/api/modules/analytics/services/analytics-service.ts`
**Issue:** Functions have different parameter patterns
```typescript
// Pattern 1: Direct filter object
export async function getSuggestions(filter: DateRangeFilter) { }

// Pattern 2: Multiple parameters
export async function getApiKeyUsageData(filter: ApiKeyUsageFilter) { }

// Pattern 3: Array input
export async function insertTelemetryEvents(events: TelemetryEventInsert[]) { }
```
**Impact:** Inconsistent API when refactoring 8 remaining analytics procedures
**Action Required:**
1. Standardize all analytics service functions to use filter/input objects
2. Create unified `AnalyticsQueryFilter` interface
3. Separate read vs write operations (Query functions vs Insert functions)

**Prevention:** Define interface standards before extending service

---

### ISSUE-005: Missing Error Handling in Dashboard Service
**Severity:** MEDIUM
**File:** `apps/api/modules/dashboard/services/dashboard-service.ts`
**Issue:** Service functions throw generic errors
```typescript
if (!db) throw new Error("Database not available");
```
**Impact:**
- Procedures catch generic `Error` type
- No way to distinguish "DB unavailable" from "query failed"
- Inconsistent with Result<T, E> pattern in codebase

**Action Required:**
1. Create `DashboardServiceError` exception class
2. Throw specific errors: `DBUnavailableError`, `DataValidationError`, `AggregationError`
3. Update procedures to handle specific error types
4. Add proper error logging with context

**Prevention:** Always use domain-specific error classes in service layer

---

## Data Quality Issues

### ISSUE-006: Trust Calibration Service Dependency
**Severity:** MEDIUM
**File:** `apps/api/modules/dashboard/services/dashboard-service.ts:228`
**Issue:**
```typescript
const trustService = getTrustCalibrationService();
return Promise.all(
  aiFeatures.map(async (feature: any) => ({
    // ...
    avgConfidence: await trustService.getConfidenceScore(userId, formatToolName(feature.featureName)),
  }))
);
```
**Problems:**
1. Hidden dependency not obvious from function signature
2. `any` type used in map function (line 245)
3. Sequential async calls inside Promise.all (performance issue)
4. No fallback if trust service unavailable

**Action Required:**
1. Add `trustService` as optional dependency to function signature
2. Remove `any` type, define proper AIFeature interface
3. Cache confidence scores to avoid N+1 queries
4. Add fallback logic if trust service fails

**Prevention:**
- No hidden dependencies in service functions
- All external service dependencies should be parameters or clearly documented
- Type-safe data structures throughout

---

### ISSUE-007: Activity Timestamp Parsing Logic is Fragile
**Severity:** LOW
**File:** `apps/api/modules/dashboard/services/dashboard-service.ts:381-400`
**Issue:** Relative time parsing via regex
```typescript
const match = relative.match(/(\d+)\s+(minute|hour|day)s?\s+ago/);
```
**Problems:**
1. Only handles "X minutes/hours/days ago" format
2. Fails on "just now", edge cases with pluralization
3. Approximate time calculation (may be inaccurate for sorting)
4. Used in sorting: `parseRelativeTime(b.timestamp) - parseRelativeTime(a.timestamp)`

**Impact:** Recent activity may be sorted incorrectly if timestamps are inconsistent

**Action Required:**
1. Store actual timestamps in database instead of relative time strings
2. Calculate relative time at display time (client-side)
3. Keep proper Date objects in service responses
4. Remove formatRelativeTime/parseRelativeTime utilities

**Prevention:** Never store relative/computed data persistently

---

## Testing Gaps

### ISSUE-008: No Test Coverage for New Dashboard Service
**Severity:** HIGH
**File:** `apps/api/modules/dashboard/services/dashboard-service.ts`
**Issue:** New service created without tests
**Impact:**
- C-004 (4-path coverage) not satisfied
- Happy path: ✅ (code works)
- Sad path: ❌ (missing user not in DB)
- Edge case: ❌ (empty results, null values)
- Error case: ❌ (DB connection failure)

**Action Required:**
Create `apps/api/modules/dashboard/services/__tests__/dashboard-service.test.ts` with:
1. **Happy Path:** Valid userId returns complete metrics
2. **Sad Path:** Non-existent userId returns default values
3. **Edge Cases:**
   - Empty tables (zero metrics)
   - Null dates in subscriptions
   - Very large result sets (pagination test)
4. **Error Cases:**
   - Database unavailable
   - Trust calibration service fails
   - Invalid input (null userId)

**Prevention:** Per ROUTER.md 4_dev_complete.md, always write RED phase tests first

---

### ISSUE-009: Procedures Lack Error Path Testing
**Severity:** MEDIUM
**Files:** All 6 refactored dashboard procedures
**Issue:** Procedures only handle happy path in error blocks
```typescript
try {
  return await getUserMetricsFromService(userId);
} catch (error) {
  logger.error("Failed to get user metrics", { userId, error });
  throw new ORPCError("INTERNAL_SERVER_ERROR", {...});
}
```
**Problems:**
1. All errors mapped to same INTERNAL_SERVER_ERROR
2. No distinction between input validation error vs system error
3. No test for what happens when service throws

**Action Required:**
1. Add input validation before service call
2. Create specific error codes: INVALID_INPUT, DB_UNAVAILABLE, RESOURCE_NOT_FOUND
3. Map service errors to appropriate ORPC codes
4. Add tests for each error path

**Prevention:** Map specific errors before throwing to client

---

## Code Quality Issues

### ISSUE-010: Duplicate formatToolName Function
**Severity:** LOW
**Locations:**
- `apps/api/modules/dashboard/procedures/get-ai-detection-stats.ts:61-78`
- `apps/api/modules/dashboard/procedures/get-recent-activity.ts:84-101`
- `apps/api/modules/dashboard/services/dashboard-service.ts:360-377`

**Issue:** Same function defined in 3 places
**Impact:**
- Code duplication violation (always-code-consolidation.md)
- Maintenance burden (change in one place doesn't update others)

**Action Required:**
1. Move `formatToolName` to shared utility location
2. Update canonical location: `apps/api/modules/dashboard/lib/format-utils.ts`
3. Update all 3 files to import from canonical location
4. Remove duplicate definitions

**Prevention:** Check for existing utilities before creating new ones (per rule always-code-consolidation.md)

---

### ISSUE-011: Helper Functions Not Exported from Service
**Severity:** LOW
**File:** `apps/api/modules/dashboard/services/dashboard-service.ts`
**Issue:** formatToolName, formatRelativeTime, parseRelativeTime are private
**Impact:** Cannot reuse in other modules (DRY violation)
**Action Required:** Export helper functions with clear documentation:
```typescript
/**
 * Format AI tool name from feature identifier
 * @example formatToolName("copilot-claude") → "Claude"
 */
export function formatToolName(featureName: string): string
```

---

## Integration Gaps (Per INT Table)

### ISSUE-012: INT-002 Incomplete - 40+ Procedures Still Need Refactoring
**Severity:** HIGH
**Scope:** See INTEGRATION_REMAINING_WORK.md
**Issue:** Dashboard done (6 of 7), but 34+ procedures remain
**Breakdown:**
- Analytics: 8 procedures
- Waitlist: 5 procedures
- Feedback: 2 procedures
- Dashboard: 1 procedure (get-metrics.ts - mixed pattern)
- Other modules: ~18 procedures

**Action Required:** Continue service extraction per priority order:
1. Analytics (highest impact)
2. Waitlist (medium effort)
3. Small services (quick wins)

**Timeline:** Each service ~1-2 hours following established pattern

---

### ISSUE-013: INT-007 Low Priority - 7 `as any` Casts Remain
**Severity:** LOW
**Location:** `apps/api/src/middleware/auth.ts` (7 casts)
**Issue:** Type unsafety in Hono context assignment
```typescript
(c.env as any).auth = context;  // Lines 178, 243, 291, 323, 389
(c.env as any).auth as AuthContext | undefined;  // Line 399
```
**Impact:** Weakens type safety in auth middleware
**Action Required:**
1. Create proper Hono environment types:
```typescript
interface HonoEnv {
  Variables: {
    auth: AuthContext;
  };
}
```
2. Apply to all procedures
3. Remove `as any` casts

**Priority:** P4 - Can be deferred to next type-safety pass

---

## Process Issues

### ISSUE-014: No Pre-Commit Validation for Service Layer Compliance
**Severity:** MEDIUM
**Issue:** Created files bypass C-002 validation
**Action Required:**
1. Add pre-commit hook to check:
   - No direct `getDb()` calls in procedures/
   - All services import from canonical locations
   - Consistent error handling pattern
2. Add Turbo task to validate architecture
3. Document in CONSTRAINTS.md

---

### ISSUE-015: Documentation Created Despite Instruction
**Severity:** LOW
**File:** `/Users/user1/WebstormProjects/SnapBack-Site/ai_dev_utils/state/INTEGRATION_SESSION_2025_12_21.md`
**Issue:** Created session documentation without explicit request
**Context:** System instruction says "DO NOT proactively create documentation files unless explicitly requested"
**Resolution:** User explicitly requested "document all of the issues you came across"
**Status:** ✅ Compliant with user request

---

## Recommendations

### Short Term (This Sprint)
1. **FIX ISSUE-001:** Resolve policy-engine import error (blocking compilation)
2. **FIX ISSUE-002:** Complete get-metrics.ts refactoring (mixed pattern)
3. **ADD ISSUE-008:** Write tests for dashboard-service (RED phase incomplete)

### Medium Term (Next Sprint)
1. Resolve ISSUE-003 (naming collisions) across 6 procedures
2. Extract ISSUE-010 (formatToolName duplication)
3. Complete analytics service extraction (INT-002 PARTIAL)

### Long Term (Architecture)
1. Add ISSUE-014 (pre-commit validation)
2. Establish ISSUE-004 (service function standards)
3. Resolve ISSUE-007 (timestamp handling)

---

## Reference

- **ROUTER.md INT Table:** Lines 205-214 (tracking INT-001 through INT-007)
- **INTEGRATION_REMAINING_WORK.md:** Detailed breakdown of remaining 40+ procedures
- **CONSTRAINTS.md:** C-002 (Service Layer), C-003 (Assertions), C-004 (4-path Coverage)
- **Workflow:** workflows/4_dev_complete.md (TDD phases)

---

**Last Updated:** 2025-12-21
**Session:** integration-audit-phase2
**Status:** All issues documented for next session
