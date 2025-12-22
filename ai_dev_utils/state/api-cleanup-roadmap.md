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
| P2-1 | risk | 1 | ⬜ PENDING | `services/risk-service.ts` |
| P2-2 | rules | 2 | ⬜ PENDING | `services/rules-service.ts` |
| P2-3 | telemetry | 4 | ⬜ PENDING | `services/telemetry-service.ts` |
| P2-4 | newsletter | 1 | ⬜ PENDING | `services/newsletter-service.ts` |
| P2-5 | pioneer | 1 | ⬜ PENDING | Extend existing service |
| P2-6 | snapshots/create | 3 | ⬜ PENDING | `services/snapshots-service.ts` |

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
| P3-1 | Create shared `timestamps.ts` pattern | ⬜ PENDING | DRY | Reusable column helpers |
| P3-2 | Add missing FK indexes | ⬜ PENDING | Performance | Audit all references() |
| P3-3 | Remove MySQL/SQLite duplicate schemas | ⬜ PENDING | DRY | Postgres is primary |
| P3-4 | Migrate to identity columns (new tables) | ⬜ PENDING | Modern | Per Drizzle 2025 guide |

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

---

## Rollback Plan

If issues arise:
1. Git revert specific commit
2. Re-add deleted files from git history
3. Run full test suite

---

**Last Updated:** 2025-12-22
**Next Action:** Execute Phase 2 (Service Layer Compliance)

---

## Phase 1 Summary

**Completed:** 2025-12-22
**Files Deleted:** 11
**Lines Removed:** ~1,200
**Security Issues Fixed:** 1 (stub auth bypass risk)
**Time Taken:** ~15 minutes
