# INT-002: Service Layer Extraction - Remaining Work

**Status:** Phase 2 (P1+P2) Complete | Phase 3 (P3-P4) Planned
**Last Updated:** 2025-12-21
**Owner:** Integration Audit

---

## Phase 2 Summary (COMPLETE ✅)

### Completed Services (3 new + 1 extended = 4 total)

| Module | Service | Procedures Refactored | Functions | Status |
|--------|---------|-------|-----------|--------|
| dashboard | dashboard-service.ts | 7 | getUserMetrics, getOrgMetrics, getAIDetectionStats, getRecentActivity, getSessionMetrics, getSubscriptionData | ✅ NEW |
| analytics | analytics-service.ts (extended) | 8 | getSuggestions, getOutcomes, getApiKeyUsage, getFeedbackFiltered, getLoopsFiltered, getPolicyEvaluationsFiltered, getPostAcceptOutcomesFiltered, getSnapshotsFiltered, processDailyMetrics | ✅ NEW |
| feedback | feedback-service.ts | 2 | submitUserFeedback, submitNPSSurvey | ✅ NEW |
| (previous work) | 10 services already exist | 10 modules complete | N/A | ✅ PRIOR |

**Total Refactored:** 17 procedures across 3 modules
**Services Created:** 3 new | 1 extended
**Code Improvement:** ~660 lines moved from procedures to service layer

---

## Phase 3-4 Plan (DEFERRED)

### Remaining Procedures by Priority

#### P3 - Lower Effort (18 procedures)

| Module | Procedures | Service Effort | Status |
|--------|-----------|--------|--------|
| Newsletter | subscribe-to-newsletter | Low - Simple 1 function | DEFERRED |
| Organizations | get-by-id | Low - Simple 1 function | DEFERRED |
| Auth | track-api-usage, verify-api-key | Low - Consolidate with extension-service | DEFERRED |
| Risk | analyze-risk | Low - 1 function | DEFERRED |
| Rules | get-rules-bundle | Low - 1 function | DEFERRED |
| Telemetry | enrich-event, track-event | Low - 2 functions | DEFERRED |

#### P4 - Complex (18 procedures)

| Module | Procedures | Complexity | Lines | Status |
|--------|-----------|--------|-------|--------|
| Waitlist | get-position, get-recent-activity, get-referrals, join-waitlist, helpers | Medium - 5 functions | ~300 | DEFERRED |
| Snapshots | create-snapshot | **HIGH** - Complex orchestration | 416 | DEFERRED |
| Snapshots | restore-snapshot | Medium - 2 stages | ~200 | DEFERRED |

---

## Implementation Guidelines (Learned from P1+P2)

### Service Creation Pattern
```typescript
// apps/api/modules/[module]/services/[module]-service.ts

import { getDb } from "@snapback/platform";
import { logger } from "@snapback/infrastructure";

/**
 * [Domain]ServiceError - Type-safe error handling
 * @see C-015 in CONSTRAINTS.md
 */
export class [Domain]ServiceError extends Error {
  constructor(
    message: string,
    public context?: {
      userId?: string;
      [key: string]: unknown;
    },
  ) {
    super(message);
    this.name = "[Domain]ServiceError";
  }
}

/**
 * Query/fetch/calculate functions - NOT get*
 * @see C-014 in CONSTRAINTS.md (naming conventions)
 */
export async function query[Name](filter: FilterType): Promise<ResultType> {
  const db = getDb();
  if (!db) {
    throw new [Domain]ServiceError("Database not available");
  }

  try {
    // Business logic here
  } catch (err) {
    logger.error("[operation] failed", { context, error: err });
    throw new [Domain]ServiceError("Operation failed", { context });
  }
}
```

### Key Learnings from Phase 2

**✅ What Worked:**
- Clear separation: procedures orchestrate, services implement
- Consistent error pattern: throw specific service errors
- Type safety: All functions typed with JSDoc

**⚠️ Issues Found (See CONSTRAINTS.md):**
- **C-014:** Naming collisions (getUserMetrics() in both procedure and service)
  - Fix: Use query*, fetch*, calculate* for service functions
- **C-015:** Generic error handling (throw new Error("..."))
  - Fix: Create [Domain]ServiceError classes
- **C-016:** Inconsistent input signatures across analytics functions
  - Fix: Use standardized filter/input objects

### Tests (C-004: 4-Path Coverage)

Each service needs tests for:
1. **Happy Path:** Valid input returns expected result
2. **Sad Path:** Non-existent resource returns default/empty
3. **Edge Cases:** Empty results, null values, boundary conditions
4. **Error Cases:** DB unavailable, validation fails

---

## Priority Rationale

### P3 (Quick Wins) - ~1 week total
- Simple 1:1 procedure → service mapping
- Low risk of introducing bugs
- Clear business logic
- Quick validation

### P4 (Complex) - ~2 weeks total
- Waitlist: Multiple interdependent functions
- Snapshots create: 416 lines, 15+ DB calls, complex transaction handling
- Higher risk, needs thorough testing

---

## Verification Commands

```bash
# Check current direct DB calls in procedures
find apps/api/modules -name "*.ts" -path "*/procedures/*" \
  -exec grep -l "getDb()" {} \; | wc -l

# Should be ~18 remaining (down from 35)
# Target: 0

# Check service layer completeness
ls -la apps/api/modules/*/services/*.ts | wc -l

# Verify no naming collisions
for service in apps/api/modules/*/services/*-service.ts; do
  grep "^export async function get" "$service" && \
    echo "⚠️ Found get* in service: $service"
done
```

---

## Gate Completion Criteria

- [ ] All P3 procedures extracted to services
- [ ] All P4 procedures extracted to services (especially create-snapshot)
- [ ] No direct `getDb()` calls in procedures/ directory
- [ ] All service functions use domain-specific error classes (C-015)
- [ ] Service function naming follows conventions (C-014)
- [ ] Test coverage: 4-path for all new services (C-004)
- [ ] TypeScript compilation passes
- [ ] All integration tests pass

---

## Related Documentation

- **INTEGRATION_REMAINING_WORK.md** - Detailed P1-P4 breakdown (Phase 2 output, keep for reference)
- **INTEGRATION_ISSUES_FOUND.md** - Issues discovered during Phase 2 (keep for issue context)
- **CONSTRAINTS.md** - C-014, C-015, C-016 define standards for Phase 3-4
- **ROUTER.md** - INT-002 tracking in Integration Audit Checklist

---

*This document replaces session-specific tracking. Phase 3-4 implementation will reference this plan.*
