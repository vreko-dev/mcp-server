# TODO Report - 2025-11-17 (COMPREHENSIVE AUDIT)

**Last Updated:** 2025-11-17
**Audit Scope:** Full codebase systematic review
**Total TODOs:** 95 verified items (157 raw occurrences)

> **📊 Navigation:** This is the master index. For detailed analysis, see specialized reports below.

---

## 🎯 Quick Access (Choose Your Role)

| Report | Best For | Time to Read |
|--------|----------|--------------|
| **[TODO_SUMMARY.md](./TODO_SUMMARY.md)** | Managers, CTOs, leads | 5 minutes |
| **[TODO_ANALYSIS_REPORT.md](./TODO_ANALYSIS_REPORT.md)** | Engineers, implementers | 15-20 minutes |
| **[TODO_DETAILED_TABLE.md](./TODO_DETAILED_TABLE.md)** | Sprint planning, tracking | Reference |
| **[TODO_INDEX.md](./TODO_INDEX.md)** | Overview, navigation | 3 minutes |

---

## 📈 Executive Summary

**Current State:**
- ✅ **42 items COMPLETE** (stale TODOs, design placeholders, future features)
- ⚠️ **15 items INCOMPLETE** (4 CRITICAL, 4 HIGH, 3 MEDIUM, 4 LOW)
- 🧪 **27 items TEST_ONLY** (test stubs for future test implementation)
- 📋 **11 items PARTIAL** (commented code awaiting schema/API work)

**Impact Analysis:**
- 🔴 **4 CRITICAL items** block core VSCode extension features (8-10 hours)
- 🟡 **4 HIGH items** block web auth/multi-tenant (12-16 hours)
- 🟢 **3 MEDIUM items** affect UI polish (6-8 hours)
- ⚪ **53 LOW items** are design-phase features (100+ hours, can defer)

---

## 🔴 Critical Items (THIS WEEK - 8-10 hours)

### VSCode Extension Core Features

**1. Session Tree Not Loading Sessions**
- **File:** [apps/vscode/src/views/SessionsTreeProvider.ts:21,47](apps/vscode/src/views/SessionsTreeProvider.ts#L21)
- **Impact:** Session timeline UI is broken, users can't browse session history
- **Status:** INCOMPLETE - Hardcoded empty array
- **Fix Time:** 2 hours
- **Action:** Wire `SessionsTreeProvider.getChildren()` to `storage.listSessionManifests()`

**2. Snapshot File Data Not Being Saved**
- **File:** [apps/vscode/src/services/SnapshotService.ts:151](apps/vscode/src/services/SnapshotService.ts#L151)
- **Impact:** Snapshots created but files not stored → restoration impossible
- **Status:** INCOMPLETE - TODO comment, no implementation
- **Fix Time:** 3 hours
- **Action:** Implement file content persistence in `createSnapshot()`

**3. Snapshot File Data Not Being Deleted**
- **File:** [apps/vscode/src/services/SnapshotService.ts:126](apps/vscode/src/services/SnapshotService.ts#L126)
- **Impact:** Disk space leak (~10GB+ after 1000 snapshots)
- **Status:** INCOMPLETE - TODO comment, no cleanup
- **Fix Time:** 2 hours
- **Action:** Implement file data cleanup in `deleteSnapshot()`

**4. Snapshot Events Not Monitored**
- **File:** [apps/vscode/src/views/SnapshotsTreeProvider.ts:42](apps/vscode/src/views/SnapshotsTreeProvider.ts#L42)
- **Impact:** Tree view becomes stale after delete/restore operations
- **Status:** INCOMPLETE - TODO comment, only CREATED event subscribed
- **Fix Time:** 1 hour
- **Action:** Add event listeners for `SNAPSHOT_DELETED` and `SNAPSHOT_RESTORED`

---

## 🟡 High Priority (SPRINT 2 - 12-16 hours)

### Web App Authentication & Multi-Tenant

**5. Argon2 Password Hashing Disabled**
- **File:** [apps/web/middleware/auth.ts:1](apps/web/middleware/auth.ts#L1)
- **Impact:** API key verification cannot work (imports commented out)
- **Status:** INCOMPLETE - Build issue blocking
- **Fix Time:** 4-8 hours (depending on root cause investigation)
- **Action:** Resolve `@node-rs/argon2` build compatibility issue

**6. API Key Verification Missing**
- **File:** [apps/web/middleware/auth.ts:129](apps/web/middleware/auth.ts#L129)
- **Impact:** REST API cannot authenticate requests (returns 501)
- **Status:** INCOMPLETE - Blocked by #5
- **Fix Time:** 2 hours (after #5 resolved)
- **Dependencies:** Requires #5 (argon2) to be fixed first

**7. Organization Membership Lookup Missing**
- **File:** [apps/web/middleware/auth.ts:272](apps/web/middleware/auth.ts#L272)
- **Impact:** Multi-tenant features blocked, org context unavailable
- **Status:** INCOMPLETE - Query commented out
- **Fix Time:** 6 hours
- **Action:** Implement database query + RLS policies

**8. MCP Circuit Breaker State Not Tracked**
- **File:** [apps/mcp-server/src/client/snapback-api.ts:249](apps/mcp-server/src/client/snapback-api.ts#L249)
- **Impact:** Always returns "closed", cannot detect circuit breaker trips
- **Status:** INCOMPLETE - Hardcoded return value
- **Fix Time:** 1 hour
- **Action:** Implement state tracking in `CircuitBreaker` class

---

## 🟢 Medium Priority (PHASE 2 - 6-8 hours features + 30-40 hours tests)

### UI Features

**9. File Decoration Not Working**
- **File:** [apps/vscode/src/ui/fileDecorations.ts:47](apps/vscode/src/ui/fileDecorations.ts#L47)
- **Impact:** No protection level badges in file explorer
- **Status:** INCOMPLETE - Always returns undefined
- **Fix Time:** 1 hour
- **Action:** Integrate with `ProtectedFileRegistry`

**10. Mark Wrong Logic Missing**
- **File:** [apps/vscode/src/ui/SnapBackCodeLensProvider.ts:185](apps/vscode/src/ui/SnapBackCodeLensProvider.ts#L185)
- **Impact:** User feedback loop broken (shows success but doesn't save)
- **Status:** INCOMPLETE - Shows notification but no backend
- **Fix Time:** 2 hours
- **Action:** Implement feedback storage and telemetry

**11. Onboarding Multi-Step Not Implemented**
- **File:** [apps/web/modules/saas/onboarding/components/OnboardingForm.tsx:30](apps/web/modules/saas/onboarding/components/OnboardingForm.tsx#L30)
- **Impact:** Incomplete user onboarding experience
- **Status:** PARTIAL - Step 1 only, schema field missing
- **Fix Time:** 4 hours
- **Dependencies:** Requires `onboardingComplete` field in auth schema

### Test Stubs (27 items - 30-40 hours)

**Test Coverage Gaps:**
- 9 items: [packages/sdk/tests/e2e/error-handling.e2e.test.ts](packages/sdk/tests/e2e/error-handling.e2e.test.ts) (error recovery)
- 9 items: [packages/sdk/tests/e2e/privacy.e2e.test.ts](packages/sdk/tests/e2e/privacy.e2e.test.ts) (GDPR/privacy compliance)
- 9 items: [packages/sdk/tests/integration/cache.test.ts](packages/sdk/tests/integration/cache.test.ts) (cache behavior)
- 5 items: [packages/sdk/tests/integration/privacy.test.ts](packages/sdk/tests/integration/privacy.test.ts) (privacy pipeline)
- 5 items: [packages/core/src/session/__tests__/SessionManager.test.ts](packages/core/src/session/__tests__/SessionManager.test.ts) (session management)

---

## ⚪ Low Priority (PHASE 3+ - 100+ hours, can defer)

**Design-Phase Features (53 items):**
- CSP nonce implementation (security hardening)
- Custom frontmatter for docs (content management)
- Payments/billing API integration (revenue features)
- Modular motion components (animation system)
- Email sign-in helpers (auth enhancement)
- Passkey helpers (WebAuthn support)
- Multi-step onboarding wizard (UX polish)
- And 46 more future enhancements...

*See [TODO_ANALYSIS_REPORT.md](./TODO_ANALYSIS_REPORT.md) for complete list.*

---

## By Priority

### 🔴 Critical (Blocking Production - 4 items)

- [ ] Session tree not loading persisted sessions (SessionsTreeProvider.ts)
- [ ] Snapshot file data not being saved (SnapshotService.ts:151)
- [ ] Snapshot file data not being deleted on cleanup (SnapshotService.ts:126)
- [ ] Snapshot events not monitored for delete/restore (SnapshotsTreeProvider.ts:42)

### 🟡 High Priority (Sprint 2 - 4 items)

- [ ] Argon2 build failure blocking API key verification (auth.ts:1)
- [ ] API key verification returns 501 not implemented (auth.ts:129)
- [ ] Organization membership lookup missing (auth.ts:272)
- [ ] Circuit breaker state always returns 'closed' (snapback-api.ts:249)

### 🟢 Medium Priority (Phase 2 - 30 items)

**UI Features (3 items):**

- [ ] File decoration not integrated with ProtectedFileRegistry (fileDecorations.ts:47)
- [ ] Mark wrong logic missing implementation (SnapBackCodeLensProvider.ts:185)
- [ ] Onboarding multi-step flow incomplete (OnboardingForm.tsx:30)

**Test Stubs (27 items):**

- [ ] 9 error handling E2E tests (packages/sdk/tests/e2e/error-handling.e2e.test.ts)
- [ ] 9 privacy E2E tests (packages/sdk/tests/e2e/privacy.e2e.test.ts)
- [ ] 9 cache integration tests (packages/sdk/tests/integration/cache.test.ts)
- [ ] 5 privacy integration tests (packages/sdk/tests/integration/privacy.test.ts)
- [ ] 5 session manager tests (packages/core/src/session/__tests__/SessionManager.test.ts)

### ⚪ Low Priority (Phase 3+ - 58 items)

**Design Phase & Future Features:**

- [ ] CSP nonce implementation (middleware.ts:70)
- [ ] Custom frontmatter schema (source.config.ts:9)
- [ ] Payments API integration (15+ files)
- [ ] Email/passkey auth helpers (auth components)
- [ ] Modular motion components (UI animations)
- [ ] And 53 more future enhancements...

---

## By Package

### apps/vscode (12 TODOs)

**Production Blocking:**

- [ ] `SessionsTreeProvider.ts:21,47` - Session tree not loading (CRITICAL)
- [ ] `SnapshotService.ts:151` - File data not saved (CRITICAL)
- [ ] `SnapshotService.ts:126` - File data not deleted (CRITICAL)
- [ ] `SnapshotsTreeProvider.ts:42` - Events not monitored (CRITICAL)

**Polish Items:**

- [ ] `fileDecorations.ts:47` - No protection badges (MEDIUM)
- [ ] `SnapBackCodeLensProvider.ts:185` - Mark wrong missing (MEDIUM)
- [ ] `workflowIntegration.ts:430,590` - Production notes (LOW)

**Test Items:**

- [ ] `semanticCheckpointNamer.integration.test.ts:132` - FIXME: API timeout (TEST)
- [ ] `gitAnalysis.integration.test.ts:120` - Hardcoded password (TEST - intentional fixture)
- [ ] `critical-bugs-regression.test.ts:546,556` - Future test features (TEST)

### apps/web (35 TODOs)

**Auth & Multi-Tenant:**

- [ ] `middleware/auth.ts:1` - Argon2 build issue (HIGH)
- [ ] `middleware/auth.ts:129` - API key verification (HIGH)
- [ ] `middleware/auth.ts:272` - Org membership lookup (HIGH)

**Onboarding:**

- [ ] `OnboardingForm.tsx:30` - Multi-step incomplete (MEDIUM)
- [ ] `OnboardingForm.tsx:4,7` - Schema fields missing (MEDIUM)

**Future Features (30 items):**

- [ ] Payments integration (5 files)
- [ ] Email/passkey helpers (auth components)
- [ ] CSP nonce (middleware.ts:70)
- [ ] Custom frontmatter (source.config.ts:9)
- [ ] And 26 more design-phase items...

### apps/mcp-server (1 TODO)

- [ ] `client/snapback-api.ts:249` - Circuit breaker state (HIGH)

### packages/api (1 TODO)

- [ ] `modules/apikeys/procedures/create-api-key.ts:20` - Context access fix (MEDIUM)

### packages/auth (1 TODO)

- [ ] `plugins/invitation-only/index.ts:1` - Config export (LOW - blocked by packages/config)

### packages/core (6 TODOs)

**Test Stubs:**

- [ ] `session/__tests__/SessionManager.test.ts` - 5 session tests (MEDIUM)
- [ ] `test/full-implementation-example.test.ts:71` - Hardcoded password (TEST - intentional)

### packages/sdk (27 TODOs - All Test Stubs)

**E2E Tests:**

- [ ] `tests/e2e/error-handling.e2e.test.ts` - 9 error recovery tests
- [ ] `tests/e2e/privacy.e2e.test.ts` - 9 privacy/GDPR tests

**Integration Tests:**

- [ ] `tests/integration/cache.test.ts` - 9 cache behavior tests
- [ ] `tests/integration/privacy.test.ts` - 5 privacy pipeline tests

### tests/e2e (2 TODOs)

- [ ] `security/auth-security.spec.ts:133,137,358` - Passkey/RS256 tests (TEST - future)

---

## Effort Estimates

| Priority | Count | Hours | Timeline |
|----------|-------|-------|----------|
| 🔴 CRITICAL | 4 | 8-10 | This week |
| 🟡 HIGH | 4 | 12-16 | Sprint 2 (1-2 weeks) |
| 🟢 MEDIUM (features) | 3 | 6-8 | Sprint 2-3 |
| 🟢 MEDIUM (tests) | 27 | 30-40 | Phase 2 (2-3 weeks) |
| ⚪ LOW | 58 | 100+ | Phase 3+ (defer) |
| **TOTAL** | **96** | **156-174+** | **4-6 weeks** |

---

## Implementation Roadmap

### Week 1: Critical Path (8-10 hours)

**Day 1-2: VSCode Core Features**

- Implement session tree storage wiring (2h)
- Implement snapshot file data saving (3h)
- Implement snapshot file data deletion (2h)
- Add snapshot event listeners (1h)

**Deliverable:** VSCode extension fully functional for snapshots + sessions

### Week 2: Auth & Multi-Tenant (12-16 hours)

**Day 1-2: Argon2 Resolution**

- Debug @node-rs/argon2 build issue (4-8h)
- Re-enable commented imports

**Day 3-4: Auth Features**

- Implement API key verification (2h)
- Implement org membership lookup (6h)

**Deliverable:** REST API authentication + multi-tenant support

### Week 2-3: UI Polish (6-8 hours)

- File decoration integration (1h)
- Mark wrong logic implementation (2h)
- Onboarding multi-step flow (4h)

**Deliverable:** Complete user experience for core flows

### Week 3-5: Test Coverage (30-40 hours)

**Phase 1: SDK E2E Tests**

- Error handling scenarios (10h)
- Privacy/GDPR compliance (10h)

**Phase 2: Integration Tests**

- Cache behavior tests (10h)
- Session management tests (5h)

**Deliverable:** 90%+ test coverage for core packages

### Phase 3+: Future Enhancements (100+ hours)

Defer to post-MVP:

- Payments integration
- CSP nonce implementation
- Email/passkey helpers
- Modular motion components
- And 54 more design-phase items...

---

## Verification Checklist

Use this checklist to verify completion:

**Critical (Must Complete Week 1):**

- [ ] Sessions appear in tree view after creation
- [ ] Snapshots can be restored (file content recovers)
- [ ] Deleted snapshots don't leak disk space
- [ ] Tree view updates after delete/restore operations

**High Priority (Must Complete Week 2):**

- [ ] API keys can authenticate REST requests
- [ ] Organization context available in middleware
- [ ] MCP circuit breaker state tracked correctly

**Medium Priority (Sprint 2-3):**

- [ ] Protection badges show in file explorer
- [ ] "Mark wrong" feedback stores to database
- [ ] Onboarding completes all steps
- [ ] Test coverage >80% for SDK packages

---

## Notes

**Stale TODOs Identified (15 items):**

Several TODOs are NOT actual debt:

- `semanticNamer.ts:344-345` - String literal checking for "TODO: fix" patterns (code feature)
- `gitAnalysis.integration.test.ts:120` - Intentional test fixture password
- `full-implementation-example.test.ts:71` - Intentional test fixture password
- Auth type imports - Blocked by schema export work in @snapback/auth
- Secret detection test fixtures - Intentional "XXXXXX" patterns for testing

**Design-Phase Items (53 items):**

Many TODOs are for future features not required for MVP:

- All payment/billing TODOs
- CSP nonce (security hardening for Phase 2)
- Custom frontmatter (docs enhancement)
- Modular motion (animation polish)

These can be deferred to Phase 3+ without impacting core functionality.

---

**For detailed analysis of each item, see [TODO_ANALYSIS_REPORT.md](./TODO_ANALYSIS_REPORT.md)**

