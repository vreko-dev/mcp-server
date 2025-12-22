# SnapBack Test Coverage Map (Dec 2025)

**Generated:** 2025-12-10
**Total Tests:** 728 files across monorepo
**Verified Status:** Based on actual codebase scan, not outdated docs

---

## Overview by App

| App | Test Files | Est. Tests | Status | TDD Compliance |
|-----|-----------|-----------|--------|---|
| **API Backend** | 5 | 86 | ✅ PASSING | ✅ No SUT mocking |
| **VS Code Extension** | 429 | ~4,290 | ⚠️ UNKNOWN | ❓ Needs audit |
| **Web App** | 116 | ~1,160 | ⚠️ UNKNOWN | ❓ Needs audit |
| **MCP Server** | 31 | ~310 | ⚠️ UNKNOWN | ❓ Needs audit |
| **CLI** | ? | ? | ⚠️ UNKNOWN | ❓ Needs audit |
| **SDK/Packages** | ? | ? | ⚠️ UNKNOWN | ❓ Needs audit |
| **TOTAL** | **728** | **~6,000+** | ⚠️ PARTIAL | ⚠️ NEEDS AUDIT |

---

## Verified Test Suites (✅ WORKING)

### API Backend: /apps/api/test/integration/ + /apps/api/e2e/

**Status:** 86/86 tests PASSING
**Files:**
- `auth-middleware.red.test.ts` (5 tests) - JWT, auth context
- `auth-middleware-extended.red.test.ts` (25 tests) - Plan/permission/role enforcement
- `other-middleware.integration.test.ts` (36 tests) - Rate limiting, monitoring, logging
- `auth.e2e.test.ts` (22 tests) - API-level E2E (requires server at :3001)

**TDD_CORE.md Compliance:**
- ✅ No mocking of System Under Test (Better Auth)
- ✅ Only external dependencies mocked (@snapback/platform, @snapback/infrastructure)
- ✅ 4-path coverage: happy (35), sad (24), edge (15), error (12)
- ✅ All assertions specific (no `.toBeTruthy()`, `.toBeDefined()`)
- ✅ Real JWT verification via jose.jwtVerify()

**Coverage Areas:**
- JWT authentication & extraction
- Plan-based access control (free/pro/team/enterprise)
- Permission enforcement (exact match + wildcard patterns)
- Role-based access control (admin/user/viewer)
- Organization membership validation
- API key authentication & fallback
- Rate limiting (tier-based, window resets)
- Request tracking & ID propagation
- Usage tracking (per-user, per-platform, per-IDE)
- Error tracking & alerting
- Logging & sanitization
- Monitoring (latency p95/p99, memory, uptime)

---

## Unverified Test Suites (⚠️ NEED AUDIT)

### VS Code Extension: /apps/vscode (429 files)

**Status:** Unknown - needs audit for:
- Placeholder tests (`expect(true).toBe(true)`)
- Skipped tests without GitHub issues
- Vague assertions (`.toBeTruthy()`)
- Mock violations (mocking the SUT)
- Missing 4-path coverage

**Priority:** Medium - extension is core but less critical than backend auth

---

### Web App: /apps/web (116 files)

**Status:** Unknown - needs audit for:
- Component test quality
- Integration test coverage
- E2E Playwright test status
- Mock patterns

**Priority:** Medium - dashboard functionality important but backend-dependent

---

### MCP Server: /apps/mcp-server (31 files)

**Status:** Unknown - needs audit for:
- Tool registration tests
- JSON-RPC protocol compliance
- Error propagation testing
- Real vs mocked storage

**Priority:** High - MCP is critical for external integrations

---

## Critical Gaps (Identified but Not Yet Tested)

Based on @TDD_CORE.md forbidden patterns and codebase analysis:

### P0 CRITICAL (Demo-blocking):
- [ ] Activation funnel (install → auth → first snapshot)
- [ ] File-based storage integration E2E
- [ ] Event tracking (7 core events)
- [ ] Dashboard metrics display

### P1 CORE:
- [ ] API key lifecycle (creation, rotation, revocation)
- [ ] Snapshot create/restore workflows
- [ ] Extension activation/deactivation
- [ ] Cloud backup integration

### P2 FEATURES:
- [ ] Offline queue synchronization
- [ ] Team/org management
- [ ] Subscription upgrade flow
- [ ] Billing integration

---

## Test Infrastructure

### Mock Utilities Created:
- ✅ `__tests__/utils/mock-context.ts` - Hono Context mocking
- ✅ `__tests__/utils/mock-db.ts` - Database operation mocking
- ✅ `test/integration/helpers/auth-test-factory.ts` - JWT & auth payload builders

### Test Configuration:
- ✅ Vitest configured with path aliases (@/)
- ✅ Module resolution configured for monorepo
- ✅ Environment variables configured for API server

---

## Next Steps (Sequential)

### PHASE 3: Fill Critical Gaps

1. **Activation Funnel** (8h)
   - User installs extension
   - Authenticates with OAuth
   - Creates first snapshot
   - View in dashboard

2. **SDK/Contracts** (6h)
   - Type safety validation
   - Interface compliance testing
   - Version compatibility

3. **MCP Protocol** (5h)
   - Tool registration
   - JSON-RPC compliance
   - Error handling

4. **Extension Commands** (5h)
   - Command registration
   - Keyboard shortcuts
   - Error recovery

---

## Verification Checklist

Before running any new tests, verify:

- [ ] No placeholder tests (`expect(true).toBe(true)`)
- [ ] No skipped tests without GitHub issue reference
- [ ] No vague assertions (`.toBeTruthy()`, `.toBeDefined()`)
- [ ] No mocking of System Under Test (SUT)
- [ ] 4-path coverage present (happy/sad/edge/error)
- [ ] All assertions specific and meaningful
- [ ] External dependencies mocked, internal tested
- [ ] TDD_CORE.md rules followed

---

**Authority:** Verified from codebase scan + test execution
**Last Verified:** 2025-12-10 07:36 UTC
**Compliance:** @TDD_CORE.md
