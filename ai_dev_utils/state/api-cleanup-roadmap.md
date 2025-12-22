# API Cleanup & Consolidation Roadmap

**Created:** 2025-12-22
**Status:** IN_PROGRESS
**Task Type:** REFACTORING (per ROUTER.md)
**Workflow:** `5_refactor.md`

---

## Executive Summary

Comprehensive cleanup of `apps/api` to improve maintainability and DX:
- Eliminate duplicate middleware
- Remove dangerous stub files
- Enforce service layer pattern (C-002)
- Modernize Drizzle schema patterns

**Estimated Total Effort:** 8-12 days
**Quick Wins:** 2-3 hours (Phase 1)

---

## Phase 1: Critical Security & Cleanup (P0-P1)

| ID | Task | Status | Impact | Effort | Notes |
|----|------|--------|--------|--------|-------|
| P1-1 | Delete stub `src/middleware/auth.ts` | ✅ DONE | Security | 5 min | Contains mock auth - bypass risk |
| P1-2 | Consolidate rate limit middleware | ✅ DONE | DX | 5 min | Deleted duplicate from legacy dir |
| P1-3 | Delete legacy `middleware/` directory | ✅ DONE | DX | 5 min | All 9 files deleted (no imports) |
| P1-4 | Delete deprecated drizzle config | ✅ DONE | Hygiene | 2 min | `src/db/drizzle.config.ts` deleted |

### Pre-Flight Verification
- [ ] `pnpm test --run` passes in apps/api
- [ ] Note current test count
- [ ] Grep for usages before deletion

---

## Phase 2: Service Layer Compliance (P1)

**Constraint:** C-002 - Database queries MUST go through service layer

| ID | Module | Violation Count | Status | Service File |
|----|--------|-----------------|--------|--------------|
| P2-1 | risk | 1 | ✅ DONE | Used shared `user-context-service.ts` |
| P2-2 | rules | 2 | ✅ DONE | Used shared `user-context-service.ts` |
| P2-3 | telemetry | 4 | ✅ DONE | Used shared `user-context-service.ts` |
| P2-4 | newsletter | 4 | ✅ DONE | Created `newsletter-service.ts` |
| P2-5 | pioneer | 2 | ✅ DONE | Extended `pioneer-service.ts` |
| P2-6 | snapshots/create | 6 | ✅ DONE | Extended `snapshots-service.ts` |

### C-002 Violation Locations
```
modules/risk/procedures/analyze-risk.ts:53
modules/rules/procedures/get-rules-bundle.ts:213,222
modules/snapshots/procedures/create-snapshot.ts:170,193,340
modules/telemetry/procedures/enrich-event.ts:79,88,110
modules/telemetry/procedures/track-event.ts:31,40
modules/newsletter/procedures/subscribe-to-newsletter.ts:61
modules/pioneer/procedures/signup.ts:45
```

---

## Phase 3: Schema Modernization (P2)

| ID | Task | Status | Impact | Notes |
|----|------|--------|--------|-------|
| P3-1 | Create shared `timestamps.ts` pattern | ✅ DONE | DRY | Created helpers/timestamps.ts |
| P3-2 | Add missing FK indexes | ⏭ DEFERRED | Performance | Future migration |
| P3-3 | Remove MySQL/SQLite duplicate schemas | ✅ DONE | DRY | Deleted 2 unused files |
| P3-4 | Migrate to identity columns (new tables) | ⏭ DEFERRED | Modern | Apply to new tables only |

---

## Phase 4: DX Improvements (P3)

| ID | Task | Status | Impact | Notes |
|----|------|--------|--------|-------|
| P4-1 | Extract shared middleware factory | ⬜ PENDING | Maintainability | Single source of truth |
| P4-2 | Add tests to modules missing coverage | ⬜ PENDING | Quality | ~50% modules lack tests |
| P4-3 | Add barrel exports to service directories | ⬜ PENDING | DX | Cleaner imports |

---

## Verification Gates (per 5_refactor.md)

After each change:
- [ ] `pnpm test --run` passes
- [ ] No behavior changes
- [ ] TypeScript compiles: `pnpm type-check`
- [ ] No new imports of deleted files

---

## Files to Delete (Phase 1)

```
✅ DELETED (2025-12-22):
apps/api/src/middleware/auth.ts          # Stub with mock tokens
apps/api/middleware/rate-limit.ts        # Duplicate of ratelimit.ts
apps/api/middleware/compose-middleware.ts # Unused
apps/api/middleware/error-tracking.ts    # Unused
apps/api/middleware/logging.ts           # Duplicate of request-logging.ts
apps/api/middleware/monitoring.ts        # Unused
apps/api/middleware/request-id.ts        # Unused
apps/api/middleware/usage-tracking.ts    # Duplicate
apps/api/middleware/with-usage-tracking.ts # Duplicate
apps/api/middleware/README.md            # Stale docs
packages/platform/src/db/drizzle.config.ts # Deprecated
```

---

## Progress Log

| Date | Phase | Task ID | Action | Result |
|------|-------|---------|--------|--------|
| 2025-12-22 | Setup | - | Created roadmap | ✅ |
| 2025-12-22 | P1 | P1-1 | Deleted stub auth.ts, updated protected-examples.ts | ✅ |
| 2025-12-22 | P1 | P1-4 | Deleted deprecated drizzle.config.ts | ✅ |
| 2025-12-22 | P1 | P1-3 | Deleted legacy middleware/ directory (9 files) | ✅ |
| 2025-12-22 | P1 | P1-2 | Rate limit consolidation (part of P1-3) | ✅ |
| 2025-12-22 | P2 | P2-1-6 | Service layer refactor - all 6 modules | ✅ |
| 2025-12-22 | P3 | P3-1 | Created shared timestamps.ts helper | ✅ |
| 2025-12-22 | P3 | P3-3 | Deleted mysql.ts and sqlite.ts (0 usages) | ✅ |
| 2025-12-22 | fix | - | Fixed leftover Phase 2 issues (enrich-event, policy-evaluate) | ✅ |

---

## Rollback Plan

If issues arise:
1. Git revert specific commit
2. Re-add deleted files from git history
3. Run full test suite

---

**Last Updated:** 2025-12-22
**Next Action:** Commit Phase 3 changes

---

## Phase 1 Summary

**Completed:** 2025-12-22
**Files Deleted:** 11
**Lines Removed:** ~1,200
**Security Issues Fixed:** 1 (stub auth bypass risk)
**Time Taken:** ~15 minutes

---

## Phase 2 Summary

**Completed:** 2025-12-22
**New Files Created:** 2
  - `apps/api/src/services/user-context-service.ts` (shared API key/subscription queries)
  - `apps/api/modules/newsletter/services/newsletter-service.ts`
**Files Extended:** 2
  - `apps/api/src/services/pioneer-service.ts` (+3 functions)
  - `apps/api/modules/snapshots/services/snapshots-service.ts` (+3 functions)
**Procedures Refactored:** 7
  - analyze-risk.ts, get-rules-bundle.ts, enrich-event.ts, track-event.ts
  - subscribe-to-newsletter.ts, signup.ts, create-snapshot.ts
**C-002 Violations Fixed:** 13
**Lines Changed:** ~300 lines (net reduction due to consolidation)
**Time Taken:** ~30 minutes

---

## Phase 3 Summary

**Completed:** 2025-12-22
**New Files Created:** 2
  - `packages/platform/src/db/schema/helpers/timestamps.ts` (shared timestamps pattern)
  - `packages/platform/src/db/schema/helpers/index.ts` (barrel export)
**Files Deleted:** 2
  - `packages/platform/src/db/schema/mysql.ts` (0 imports, dead code)
  - `packages/platform/src/db/schema/sqlite.ts` (0 imports, dead code)
**Bug Fixes:** 2
  - `apps/api/modules/telemetry/procedures/enrich-event.ts` (missing `eq` import, scope issue)
  - `apps/api/src/routes/v1/policy-evaluate.ts` (stale @snapback/policy-engine import)
**Lines Removed:** ~760 (mysql.ts 291 + sqlite.ts 470)
**Time Taken:** ~15 minutes
