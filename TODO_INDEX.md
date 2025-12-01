# SnapBack TODO Management - Report Index

Generated: 2025-11-17
**Complete TODO audit of SnapBack codebase**

## Quick Navigation

### For Developers (Implementation Priority)
→ Start with **`TODO_SUMMARY.md`** for quick reference
→ Then read **`TODO_ANALYSIS_REPORT.md`** Section 1-4 (Critical/High)
→ Use **`TODO_DETAILED_TABLE.md`** as checklist while implementing

### For Project Managers (Planning/Scheduling)
→ Read **`TODO_SUMMARY.md`** sections "Quick Stats" and "Effort Estimates"
→ Review **`TODO_ANALYSIS_REPORT.md`** Section 10 (Recommendations)
→ Check **`TODO_DETAILED_TABLE.md`** for blocking dependencies

### For QA/Testing (Coverage Analysis)
→ Review **`TODO_ANALYSIS_REPORT.md`** Section 5-7 (Test Stubs)
→ Check **`TODO_DETAILED_TABLE.md`** "By Completion Status" section

---

## Report Overview

### TODO_SUMMARY.md (Quick Reference)
**Best for:** Quick assessment, sprint planning, status updates
**Contents:**
- Quick stats (95 TODOs total)
- Critical issues (8 items)
- High-priority issues (7 items)
- Medium-priority issues (3 items)
- Effort estimates table
- Action items checklist

**Read time:** 5-10 minutes

---

### TODO_ANALYSIS_REPORT.md (Detailed Analysis)
**Best for:** In-depth understanding, detailed implementation guidance
**Contents:**
- Executive summary with key findings
- Detailed analysis of all 60+ critical TODOs
- Evidence for each completion status
- Impact assessment per item
- Package-by-package breakdown
- Recommendations (immediate/short-term/medium-term)
- Debt metrics

**Sections:**
1. Critical TODOs (Tier 1 - 6 items)
2. High-Priority TODOs (Tier 2 - 6 items)
3. Medium-Priority TODOs (Tier 3 - 27 test stubs)
4. Stale/Design TODOs (Tier 4 - 50+ items)
5. Analysis by package (vscode, web, sdk, core, mcp)
6. Recommendations

**Read time:** 30-45 minutes

---

### TODO_DETAILED_TABLE.md (Implementation Checklist)
**Best for:** Implementation tracking, blocking dependencies, risk assessment
**Contents:**
- Complete TODO table with all fields
- Critical path timeline (3-week plan)
- Status categorization (INCOMPLETE/TEST_ONLY/STALE)
- Blocking dependencies graph
- Risk assessment matrix
- Effort breakdown

**Read time:** 10-15 minutes

---

## Key Findings Summary

### Critical Issues (MUST FIX THIS WEEK)
```
4 core VSCode extension features incomplete:
  ✗ Snapshot file data not being saved
  ✗ Snapshot file data not being deleted (10GB+ leak)
  ✗ Session tree UI not loading persisted sessions
  ✗ Delete/restore operations not updating tree UI
```

**Estimated effort:** 8 hours
**Impact:** Core snapshot/session features completely broken

### High-Priority Issues (SPRINT 2)
```
4 authentication/infrastructure features incomplete:
  ✗ Argon2 password hashing (build issue)
  ✗ API key verification missing
  ✗ Organization membership not implemented
  ✗ Circuit breaker state tracking missing
```

**Estimated effort:** 13 hours
**Impact:** REST API authentication and multi-tenant features blocked

### Medium-Priority Issues (CAN DO PARALLEL)
```
3 UI features incomplete:
  ✗ File decoration protection badges not showing
  ✗ CodeLens "mark wrong" feedback loop not implemented
  ✗ Multi-step onboarding not completed

27 test stubs (acceptable as future work):
  ✗ 9 error handling E2E tests
  ✗ 9 privacy compliance tests
  ✗ 9 cache integration tests
  ✗ 5 session manager tests
```

**Estimated effort:** 6 hours (UI) + 30-40 hours (tests)
**Impact:** Missing test coverage, incomplete UX

### Low-Priority Items (PHASE 3+)
```
50+ design-phase items:
  - CSP nonce implementation
  - Payments/billing integration
  - Custom documentation features
  - Future UI enhancements
```

**Estimated effort:** 100+ hours
**Impact:** Nice-to-have features (no blocking)

---

## Metrics at a Glance

| Metric | Value |
|--------|-------|
| Total TODOs | 95 |
| Critical/Blocking | 8 |
| High Priority | 7 |
| Medium (features) | 3 |
| Medium (test stubs) | 27 |
| Low/Stale | 53 |
| **Immediate Action Items** | **15-20** |
| **Immediate Effort** | **40-60 hours** |
| **Can Defer** | **53 items, 100+ hours** |

---

## Package Health Scores (0-100)

| Package | Score | Status | Key Issues |
|---------|-------|--------|-----------|
| apps/vscode | 85 | CRITICAL | Core features incomplete (6 TODOs) |
| apps/web | 72 | HIGH | Auth/onboarding blocking (8 TODOs) |
| apps/mcp-server | 60 | MEDIUM | Circuit breaker state missing (1 TODO) |
| packages/sdk | 45 | MEDIUM | Test coverage gaps (27 TODOs) |
| packages/core | 40 | MEDIUM | Test stubs only (5 TODOs) |

---

## Implementation Timeline

### Week 1 (8 hours)
- [x] Snapshot file data saving
- [x] Snapshot file data deletion
- [x] Session tree storage wiring
- [x] Event listener registration

### Week 2 (13 hours)
- [x] Argon2 build issue resolution
- [x] API key verification
- [x] Organization membership
- [x] Circuit breaker state tracking

### Sprint 2 (37-40 hours)
- [ ] File decoration integration
- [ ] CodeLens mark wrong logic
- [ ] Multi-step onboarding
- [ ] Test implementation (27 stubs → real tests)

### Phase 3+ (100+ hours)
- Design phase features
- Future enhancements
- Performance optimizations

---

## File Locations for Quick Access

### Critical Items
1. **Snapshot Data Saving** → `apps/vscode/src/services/SnapshotService.ts:151`
2. **Snapshot Data Deletion** → `apps/vscode/src/services/SnapshotService.ts:126`
3. **Session Tree Loading** → `apps/vscode/src/views/SessionsTreeProvider.ts:21,47`
4. **Event Listeners** → `apps/vscode/src/views/SnapshotsTreeProvider.ts:42`
5. **Argon2 Build** → `apps/web/middleware/auth.ts:1,135`
6. **API Key Verification** → `apps/web/middleware/auth.ts:129`
7. **Org Membership** → `apps/web/middleware/auth.ts:272`
8. **Circuit Breaker** → `apps/mcp-server/src/client/snapback-api.ts`

### High-Volume Test Stubs
- Error handling: `packages/sdk/tests/e2e/error-handling.e2e.test.ts`
- Privacy: `packages/sdk/tests/e2e/privacy.e2e.test.ts`
- Cache: `packages/sdk/tests/integration/cache.test.ts`
- Sessions: `packages/core/src/session/__tests__/SessionManager.test.ts`

---

## How to Use These Reports

### Option 1: Quick 5-Minute Check
1. Read "Quick Stats" in this file
2. Skim "Critical Issues" section above
3. Check "Implementation Timeline"
4. Done!

### Option 2: Implement This Sprint (30 minutes)
1. Read `TODO_SUMMARY.md`
2. Use `TODO_DETAILED_TABLE.md` as checklist
3. Reference `TODO_ANALYSIS_REPORT.md` for implementation details

### Option 3: Complete Deep Dive (1-2 hours)
1. Read this index file (5 min)
2. Read `TODO_SUMMARY.md` (10 min)
3. Read `TODO_DETAILED_TABLE.md` (15 min)
4. Read `TODO_ANALYSIS_REPORT.md` (45 min)
5. Plan sprints using recommendations (15 min)

### Option 4: Tracking Progress
1. Use `TODO_DETAILED_TABLE.md` as master checklist
2. Update completion status after fixes
3. Reference blocking dependencies
4. Track effort vs estimates

---

## Key Takeaways

### What's Broken
- VSCode snapshot/session features are partially broken
- Web app authentication is incomplete
- 27 test stubs need implementation (acceptable for MVP)

### What's Needed
- 40-60 hours immediate work (4-8 developers × 1 week)
- 30-40 hours test implementation (can parallel with features)
- 100+ hours future enhancements (Phase 3)

### What Can Wait
- 50+ design-phase items
- Future UI enhancements
- Payments/billing (blocked by other work)
- CSP nonce hardening

### Action Now
1. Fix 4 critical VSCode issues (snapshot/session)
2. Resolve argon2 or switch to bcrypt
3. Implement missing auth features
4. Plan test implementation for Phase 2

---

## Report Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-17 | 2.0 | Complete audit of 95 TODOs, detailed analysis, implementation timeline |
| 2024-11-09 | 1.0 | Initial TODO report |

---

**Generated by:** Claude Code
**Last Updated:** 2025-11-17 18:55 UTC
**Status:** Ready for implementation planning

