# Comprehensive TODO Audit - November 8, 2025

## Executive Summary

**Total TODOs Found**: 170+ instances
**Unique Actionable Items**: 82
**Covered in Roadmap**: 52
**Missing from Roadmap**: 30
**Critical Security Issues**: 1 (hardcoded password in test)
**Blocking Production**: 8 items

## Roadmap Validation ✅

The TODO_IMPLEMENTATION_ROADMAP.md is **accurate and comprehensive** for the 52 items it covers. Excellent prioritization and phasing. However, it's missing 30 additional TODOs discovered in this audit.

---

## Critical Issues 🔴 (Must Fix Before Production)

### 1. Hardcoded Password in Test
**File**: `apps/vscode/test/integration/gitAnalysis.integration.test.ts:120`
**Issue**: `TODO(SNAPBACK-123): Remove this hardcoded password before production`
**Status**: ⚠️ **MISLEADING TODO** - This is intentional test fixture data
**Action**: Update comment to clarify this is test data, not a security issue
**Priority**: LOW (cosmetic fix)
**Time**: 2 minutes

### 2. Database Import Issue
**File**: `apps/web/app/api/health/route.ts:1`
**Issue**: `TODO(TICKET-125): Fix database import - should use drizzle instead of prisma`
**Impact**: Health check endpoint using wrong ORM
**Priority**: HIGH
**Time**: 15 minutes
**Missing from Roadmap**: ✅

### 3. Sentry/Error Tracking Disabled
**File**: `apps/web/app/global-error.tsx:3`
**Issue**: `TODO: Re-enable Sentry after fixing CommonJS/ESM compatibility`
**Impact**: No production error tracking
**Priority**: HIGH
**Time**: 2 hours (needs Sentry v8+ migration)
**Missing from Roadmap**: ✅

### 4. API Key Signing Secret
**File**: `packages/api/lib/security.ts:30`
**Issue**: `TODO(TICKET-126): add signingSecret field to schema`
**Impact**: Using apiKeyId as signing secret (insecure)
**Priority**: CRITICAL
**Time**: 1 hour (schema + migration)
**Missing from Roadmap**: ✅

### 5. Context Access in API Key Creation
**File**: `packages/api/modules/apikeys/procedures/create-api-key.ts:18`
**Issue**: `TODO(TICKET-128): Fix context access - should use context.user instead of context.session`
**Impact**: Incorrect user attribution for API keys
**Priority**: HIGH
**Time**: 30 minutes
**Missing from Roadmap**: ✅

---

## High Priority 🟡 (Web App - Missing from Roadmap)

### 6. Stub Docs Source Implementation
**File**: `apps/web/app/docs-source.ts:1`
**Issue**: `Stub docs source - TODO: Implement proper Fumadocs integration`
**Impact**: Documentation site not functional
**Priority**: HIGH
**Time**: 4 hours
**Missing from Roadmap**: ✅

### 7. Analytics Metrics Endpoint
**File**: `apps/web/app/api/v1/analytics/metrics/route.ts:30`
**Issue**: `TODO: Implement analytics retrieval logic here`
**Impact**: Dashboard metrics not working
**Priority**: MEDIUM
**Time**: 3 hours
**Missing from Roadmap**: ✅

### 8. Rollback Endpoints (2 TODOs)
**File**: `apps/web/app/api/v1/rollbacks/route.ts`
**Issues**:
- Line 32: `TODO: Implement rollback creation logic here`
- Line 75: `TODO: Implement rollback list logic here`
**Impact**: Core snapshot rollback feature not implemented
**Priority**: HIGH
**Time**: 6 hours
**Missing from Roadmap**: ✅

### 9. Stripe Webhook Handlers (7 TODOs)
**File**: `apps/web/lib/stripe-webhook-handlers.ts`
**Issues**:
- `TODO(PAY-001)`: Implement actual database update when schema is confirmed
- `TODO(PAY-002)`: Implement cloud backup enablement
- `TODO(PAY-003)`: Implement cloud backup disablement
- `TODO(PAY-004)`: Implement permission updates based on plan
- `TODO(PAY-005)`: Implement snapshot limit update
- `TODO(PAY-006)`: Implement user email lookup
- `TODO(PAY-007)`: Link device trial to user and upgrade limits
**Impact**: Subscription changes don't update user permissions/limits
**Priority**: CRITICAL (billing broken)
**Time**: 8 hours
**Missing from Roadmap**: ✅

### 10. PostHog Event Tracking
**File**: `apps/web/app/api/waitlist/task/route.ts:120`
**Issue**: `TODO: Track event in PostHog`
**Impact**: Missing analytics for waitlist conversions
**Priority**: MEDIUM
**Time**: 15 minutes
**Missing from Roadmap**: ✅

### 11. Cloud Storage Calculation
**File**: `apps/web/lib/dashboard/metrics.ts:282`
**Issue**: `cloudStorageUsedMb: 0, // TODO: Calculate from snapshot cloud backups`
**Impact**: Inaccurate storage metrics in dashboard
**Priority**: MEDIUM
**Time**: 2 hours
**Missing from Roadmap**: ✅

---

## Medium Priority 🟢 (UI Components)

### 12. Organization Authorization
**File**: `packages/api/modules/organizations/procedures/get-by-id.ts:37`
**Issue**: `TODO: Add authorization check - verify user has access to this organization`
**Impact**: Security vulnerability - users can view any organization
**Priority**: HIGH (security)
**Time**: 1 hour
**Missing from Roadmap**: ✅

### 13. SaaS UI Components (6 TODOs)
**Files**:
- `apps/web/modules/saas/organizations/components/OrganizationInvitationModal.tsx:58` - Handle error
- `apps/web/modules/saas/apikeys/components/CreateApiKeyModal.tsx:53` - Replace with actual API call
- `apps/web/modules/saas/apikeys/components/CreateApiKeyDialog.tsx:29` - Implement create API key API call
- `apps/web/modules/saas/apikeys/components/ApiKeyList.tsx:61` - Implement revoke API call
- `apps/web/modules/marketing/sections/launch/final-cta.tsx:17` - Add email capture API integration
- `apps/web/modules/marketing/blog/components/PostContent.tsx:5` - Add proper markdown/MDX rendering
**Impact**: Various UI features not functional
**Priority**: MEDIUM
**Time**: 4 hours total
**Missing from Roadmap**: ✅

### 14. Disabled Dependencies (3 TODOs)
**Files**:
- `apps/web/modules/shared/components/ClientProviders.tsx:3` - Fix analytics module
- `apps/web/modules/shared/components/ConsentProvider.tsx:3` - Install js-cookie or remove consent feature
- `apps/web/modules/saas/payments/hooks/plan-data.tsx:4` - Fix type definition for ProductReferenceId
**Impact**: Analytics, consent, and type safety issues
**Priority**: MEDIUM
**Time**: 2 hours total
**Missing from Roadmap**: ✅

---

## SDK Test Stubs 🔵 (Not in Roadmap - 62 TODOs)

### 15. Privacy E2E Tests (24 TODOs)
**File**: `packages/sdk/tests/e2e/privacy.e2e.test.ts`
**Status**: Complete test scaffold, all tests stubbed
**Priority**: HIGH (privacy compliance)
**Time**: 12 hours
**Missing from Roadmap**: ✅

**Test Categories**:
1. Compliance validation (GDPR, CCPA) - 6 tests
2. Zero-trust validation - 6 tests
3. Data leakage prevention - 3 tests
4. Security (injection, endpoints, auth) - 9 tests

### 16. Error Handling E2E Tests (20 TODOs)
**File**: `packages/sdk/tests/e2e/error-handling.e2e.test.ts`
**Status**: Complete test scaffold, all tests stubbed
**Priority**: MEDIUM
**Time**: 8 hours
**Missing from Roadmap**: ✅

**Test Categories**:
1. Graceful degradation - 6 tests
2. Logging and monitoring - 9 tests
3. Data integrity - 3 tests
4. Alerting - 2 tests

### 17. Privacy Integration Tests (18 TODOs)
**File**: `packages/sdk/tests/integration/privacy.test.ts`
**Status**: Complete test scaffold, all tests stubbed
**Priority**: HIGH (privacy compliance)
**Time**: 6 hours
**Missing from Roadmap**: ✅

**Test Categories**:
1. Full pipeline tests - 6 tests
2. Compliance tests (GDPR, CCPA) - 9 tests
3. Sensitive data handling - 3 tests

### 18. Cache Integration Tests (15 TODOs)
**File**: `packages/sdk/tests/integration/cache.test.ts`
**Status**: Complete test scaffold, all tests stubbed
**Priority**: MEDIUM
**Time**: 6 hours
**Missing from Roadmap**: ✅

**Test Categories**:
1. Persistence tests - 9 tests
2. Performance tests - 6 tests

### 19. Session Manager Tests (5 TODOs)
**File**: `packages/core/src/session/__tests__/SessionManager.test.ts`
**Status**: Test stubs for session management
**Priority**: MEDIUM
**Time**: 3 hours
**Missing from Roadmap**: ✅

---

## VS Code Extension (Covered in Roadmap ✅)

These are all correctly documented in TODO_IMPLEMENTATION_ROADMAP.md:

1. ✅ Extension.ts iteration tracking
2. ✅ SnapshotService file data management (2 TODOs)
3. ✅ SessionCoordinator storage integration
4. ✅ SnapBackCodeLensProvider mark wrong logic
5. ✅ SessionsTreeProvider storage retrieval (2 TODOs)
6. ✅ SnapshotsTreeProvider event listeners
7. ✅ WorkflowIntegration production implementation (2 TODOs)
8. ✅ FileDecorations (already implemented)
9. ✅ Critical bugs regression tests (4 TODOs)
10. ✅ GitAnalysis test hardcoded password (cosmetic)

---

## Web App Tests (Covered in Roadmap ✅)

These are all correctly documented in TODO_IMPLEMENTATION_ROADMAP.md:

1. ✅ Snapshots metadata tests (5 tests) - **COMPLETED**
2. ✅ Checkpoints metadata tests (5 tests)
3. ✅ Snapshots list tests (5 tests)
4. ✅ Checkpoints list tests (5 tests)
5. ✅ User API tests (5 tests)
6. ✅ Stripe webhook tests (5 tests)

---

## Not Actionable (Test Fixtures) ⚪

These are intentional code for testing detection:

1. `apps/vscode/src/semanticNamer.ts:343-344` - TODO/FIXME detection code
2. `apps/vscode/src/semanticNamer.ts:358-360` - BUG/FIXME marker detection
3. `apps/vscode/test/unit/componentIntegration.test.ts:234` - Test fixture with TODO
4. `apps/vscode/test/integration/semanticCheckpointNamer.integration.test.ts:132` - Test fixture with FIXME
5. `packages/core/test/full-implementation-example.test.ts:71` - Test fixture password
6. `packages/auth/src/plugins/invitation-only/index.ts:1` - Waiting on config export

---

## Updated Metrics

### By Status
- **Roadmap Coverage**: 52 items (63%)
- **New Items Found**: 30 items (37%)
- **Total Unique TODOs**: 82 items

### By Priority
- **🔴 Critical (Production Blocking)**: 5 items
- **🟡 High Priority**: 17 items
- **🟢 Medium Priority**: 15 items
- **🔵 Test Stubs**: 62 items
- **⚪ Not Actionable**: 6 items

### By Category
- **Web App Production Code**: 18 items
- **Web App Tests**: 25 items (roadmap)
- **VS Code Extension Code**: 11 items (roadmap)
- **VS Code Extension Tests**: 5 items (roadmap)
- **SDK Tests**: 62 items
- **Security/Auth**: 3 items
- **Documentation**: 2 items

### Estimated Time
- **Critical Issues**: 12 hours
- **High Priority**: 45 hours
- **Medium Priority**: 20 hours
- **SDK Tests**: 35 hours
- **Roadmap Items (remaining)**: 38 hours
- **Total**: ~150 hours

---

## Recommended Action Plan

### 🔥 Immediate (This Week)

1. **Fix API Key Security** (packages/api/lib/security.ts) - 1 hour
2. **Fix Organization Authorization** (get-by-id.ts) - 1 hour
3. **Implement Stripe Webhook Handlers** (stripe-webhook-handlers.ts) - 8 hours
4. **Fix Database Import** (health/route.ts) - 15 minutes
5. **Complete Web App Tests** (per roadmap Phase 1) - 8 hours

**Total**: 18 hours (critical path)

### 📅 Phase 2 (Next Sprint)

1. **Implement Rollback Endpoints** - 6 hours
2. **Fix Sentry Integration** - 2 hours
3. **Implement Analytics Metrics** - 3 hours
4. **Fix Fumadocs Integration** - 4 hours
5. **Complete UI Component TODOs** - 4 hours
6. **VS Code Session Management** (per roadmap Phase 2) - 16 hours

**Total**: 35 hours

### 📅 Phase 3 (Following Sprint)

1. **SDK Privacy Tests** - 18 hours
2. **SDK Error Handling Tests** - 14 hours
3. **SDK Cache Tests** - 6 hours
4. **VS Code Extension Polish** (per roadmap Phase 3) - 10 hours

**Total**: 48 hours

---

## Critical Findings Not in Original Roadmap

### Security Issues
1. **API Key Signing Secret** - Using apiKeyId as secret (insecure)
2. **Organization Authorization Missing** - Users can view any org
3. **Context Access Wrong** - API keys attributed incorrectly

### Broken Production Features
1. **Stripe Webhooks** - 7 TODOs blocking subscription updates
2. **Rollback Endpoints** - Core feature completely stubbed
3. **Sentry Disabled** - No error tracking in production
4. **Docs Site Stubbed** - Documentation not functional

### Quality Gaps
1. **62 SDK Test Stubs** - Entire test suite scaffolded but not implemented
2. **Analytics Disabled** - Multiple analytics integrations commented out
3. **Type Safety Issues** - ProductReferenceId type definition incomplete

---

## Recommendations

### 1. Update TODO_IMPLEMENTATION_ROADMAP.md

Add new Phase 0 for critical security/production issues:

```markdown
### Phase 0: Critical Production Blockers (Week 0 - URGENT)
1. Fix API key signing secret (security)
2. Add organization authorization check (security)
3. Implement Stripe webhook handlers (billing)
4. Fix context access in API key creation
5. Re-enable Sentry error tracking

**Deliverable**: Production-ready security and billing
**Time**: 12 hours
```

### 2. Prioritize SDK Tests

The 62 SDK test stubs represent significant technical debt. These should be added to the roadmap as Phase 5:

```markdown
### Phase 5: SDK Test Implementation (Weeks 5-6)
1. Privacy E2E tests (24 tests) - 12 hours
2. Error Handling E2E tests (20 tests) - 8 hours
3. Privacy Integration tests (18 tests) - 6 hours
4. Cache Integration tests (15 tests) - 6 hours
5. Session Manager tests (5 tests) - 3 hours

**Deliverable**: SDK fully tested and production-ready
**Time**: 35 hours
```

### 3. Track Tickets Properly

Many TODOs reference tickets (TICKET-123, PAY-001, etc.) but these may not exist in your issue tracker. Consider:

1. Create actual tickets for all TICKET-XXX references
2. Link TODOs to GitHub issues
3. Add TODO comments with issue URLs

### 4. Clean Up Non-Actionable TODOs

Update these comments to be more clear:

```typescript
// Before
// TODO(SNAPBACK-123): Remove this hardcoded password before production

// After
// Test fixture: Intentional security anti-pattern for Guardian detection testing
```

---

## Files Requiring Immediate Attention

### Critical Path (Block Production)
1. `packages/api/lib/security.ts` - API key signing
2. `apps/web/lib/stripe-webhook-handlers.ts` - Billing broken
3. `packages/api/modules/organizations/procedures/get-by-id.ts` - Security hole
4. `packages/api/modules/apikeys/procedures/create-api-key.ts` - Wrong context
5. `apps/web/app/global-error.tsx` - No error tracking

### High Value (User-Facing Features)
1. `apps/web/app/api/v1/rollbacks/route.ts` - Core feature missing
2. `apps/web/app/docs-source.ts` - Docs site broken
3. `apps/web/app/api/v1/analytics/metrics/route.ts` - Dashboard metrics broken
4. `apps/web/lib/dashboard/metrics.ts` - Storage metrics wrong

### Quality/Stability
1. `packages/sdk/tests/e2e/privacy.e2e.test.ts` - Privacy compliance untested
2. `packages/sdk/tests/e2e/error-handling.e2e.test.ts` - Error handling untested
3. `packages/sdk/tests/integration/privacy.test.ts` - Privacy pipeline untested
4. `packages/sdk/tests/integration/cache.test.ts` - Cache behavior untested

---

## Conclusion

The TODO_IMPLEMENTATION_ROADMAP.md is **excellent** for the 52 items it covers, but this audit reveals:

- **30 additional TODOs** not in the roadmap
- **5 critical security/production issues** that should be Phase 0
- **62 SDK test stubs** that should be tracked as Phase 5
- **Total scope**: ~150 hours vs originally estimated 38 hours

**Recommended Next Steps**:
1. Fix 5 critical security/production issues (12 hours)
2. Complete roadmap Phase 1 web app tests (8 hours)
3. Update roadmap with new findings
4. Re-estimate total project timeline

**Quality Note**: The codebase is well-structured and most TODOs are properly tracked with ticket numbers. The main gaps are in security hardening, billing integration, and test coverage.
