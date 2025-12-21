# Codebase Issues Report

**Generated:** 2025-12-21
**Updated:** With Historical Git Analysis (200+ commits)
**Scope:** apps/, packages/, ai_dev_utils/

---

## Executive Summary

| Category | Count | Severity |
|----------|-------|----------|
| **Historical Regressions** | 10 major | Critical |
| **Recurring Violations** | 5 promoted | High |
| **Learning System Gaps** | 6 identified | Medium |
| **Hot Spot Files** | 5 (50+ commits each) | High |
| TODOs/FIXMEs (total) | ~480 | See breakdown |
| ↳ Test file stubs (not blocking) | ~99 | Low |
| ↳ Documentation TODOs | ~38 | Low |
| ↳ Actionable code TODOs | ~150 | Medium |
| ↳ Stub components (blocking) | 10 | High |
| `as any` type assertions | 16+ | Medium |
| `console.log` in production | 20+ | Medium |
| `@ts-expect-error` comments | 50+ | Low (mostly in tests) |
| Missing error handling | ~0 | Low |
| Deprecated APIs | 0 | None |

### TODO Breakdown by Location

| Location | Total | Actionable | Notes |
|----------|-------|------------|-------|
| apps/web | 100 | ~35 | 10 stubs, 14 auth, 11 config |
| apps/api/__tests__ | 99 | 0 | All commented-out test stubs |
| apps/api/src | 6 | 6 | Real implementation TODOs |
| apps/vscode/src | 68 | ~40 | Mix of v2 features and fixes |
| apps/vscode/docs | 38 | 0 | Documentation improvements |
| apps/mcp-server | 19 | ~10 | Integration work |
| packages | 150 | ~60 | Across 12 packages |

**Note:** Some TODOs found by the initial scan (e.g., "auth client" in LoginForm) have already been implemented - the TODO comments were never removed. Actual actionable TODOs are ~150, not 400+.

---

## 1. TODO/FIXME Analysis

### High-Priority Themes

#### 1.1 Auth Integration (14 TODOs - verified)
Backend auth client implementations pending across web app.

| File Pattern | Issue |
|--------------|-------|
| `apps/web/modules/saas/organizations/lib/api.ts` | TODO: Replace with actual auth client when backend is ready |
| `apps/web/modules/saas/settings/**` | TODO: Replace with actual auth client |

**Note:** LoginForm.tsx already imports `authClient` from `@snapback/auth/client` - some auth TODOs are stale.

#### 1.2 API Integration (15+ TODOs)
ORPC payments and email services not yet integrated.

| File Pattern | Issue |
|--------------|-------|
| `apps/web/modules/saas/payments/**` | TODO: Re-enable when payments API is available in ORPC |
| `apps/web/modules/marketing/**` | TODO: integrate with ORPC when available |

#### 1.3 Stub Components (10 verified)
Placeholder components marked for full implementation.

| Component | Location | Status |
|-----------|----------|--------|
| ActiveOrganizationProvider | `apps/web/modules/saas/organizations/components/` | Stub |
| DeleteOrganizationForm | `apps/web/modules/saas/organizations/components/` | Stub |
| OrganizationInvitationModal | `apps/web/modules/saas/organizations/components/` | Stub |
| OrganizationLogoForm | `apps/web/modules/saas/organizations/components/` | Stub |
| ResetPasswordForm | `apps/web/modules/saas/auth/components/` | Stub |
| ChangeNameForm | `apps/web/modules/saas/settings/components/` | Stub |
| ChangeEmailForm | `apps/web/modules/saas/settings/components/` | Stub |
| DeleteAccountForm | `apps/web/modules/saas/settings/components/` | Stub |
| UserList | `apps/web/modules/saas/admin/component/users/` | Stub |
| OrganizationList | `apps/web/modules/saas/admin/component/organizations/` | Stub |

#### 1.4 Test Coverage Gaps (99 in apps/api/__tests__ - not blocking)
These are commented-out test assertions waiting for middleware implementation.

| Test File | Issues |
|-----------|--------|
| `apps/api/__tests__/middleware-auth-checks.test.ts` | 18 TODOs for auth mock implementation |
| `apps/api/__tests__/middleware-validation.test.ts` | 16 TODOs for schema validation |
| `apps/api/__tests__/routes-health.test.ts` | 20 TODOs for health check tests |

**Note:** These tests are intentionally commented out until the middleware is fully implemented. They are not blocking production.

#### 1.5 Config Management (11 TODOs)
Config imports from environment/app settings not finalized.

| Pattern | Occurrences |
|---------|-------------|
| `TODO: Replace with actual config from environment/app settings` | 11 layout files |

---

## 2. Type Safety Issues

### 2.1 `as any` Type Assertions (16+ occurrences)

**Root Cause:** Session and organization types not properly typed from BetterAuth/Supabase.

| File | Usage |
|------|-------|
| `apps/web/app/(saas)/app/(account)/settings/layout.tsx:5` | `(session as any)?.user?.name` |
| `apps/web/app/(saas)/app/(account)/settings/billing/page.tsx:10` | `(session as any)?.user?.id` |
| `apps/web/app/(saas)/app/(account)/admin/layout.tsx:3` | `(session as any).user?.role` |
| `apps/web/app/(saas)/app/(account)/page.tsx:4-5` | `(organization as any)?.slug`, `(session as any)?.user?.name` |
| `apps/web/app/(saas)/app/api-keys/actions.ts:6` | `(session as any)?.user` (3x) |
| `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/layout.tsx:5-6` | Organization and session casts |

**Fix Required:**
1. Create `types/session.ts` with proper `SessionUser` type from BetterAuth
2. Create `types/organization.ts` with proper types from API responses
3. Replace `as any` casts with proper types

### 2.2 `: any` Type Annotations (8+ occurrences)

| File | Issue |
|------|-------|
| `apps/web/app/(marketing)/snapback-demo/components/SnapBackDemo.tsx` | Monaco editor types |
| `apps/web/app/(marketing)/snapback-demo/lib/idb-fallback.ts` | IndexedDB value type |
| `apps/web/app/api/og/recovery/route.tsx:124` | Catch block error type |

**Fix Required:** Add `@types/monaco-editor` and create proper editor types.

---

## 3. Logging Issues

### 3.1 `console.log` in Production Code (20+ occurrences)

**Violates:** C-007 (Console.log in Production)

| File | Type |
|------|------|
| `apps/web/app/components/trial-detector.tsx:26` | Debug logging |
| `apps/web/hooks/use-protection-status.ts:116` | Connection logging |
| `apps/web/modules/ui/components/magic/snapback-terminal-ultimate.tsx` | Sound effect logging |
| `apps/web/modules/marketing/waitlist/components/WaitlistSuccess.tsx` | Task completion |
| `apps/web/modules/marketing/home/components/Newsletter.tsx` | Form submission |
| `apps/web/modules/marketing/home/components/ExitIntentModal.tsx` | Analytics tracking |
| `apps/web/modules/marketing/home/components/ContactForm.tsx` | Form submission |
| `apps/web/modules/marketing/components/sections/pricing.tsx` | Event tracking |
| `apps/web/modules/marketing/lib/analytics.ts` | Analytics logging |

**Fix Required:** Replace with `logger` from `@snapback/infrastructure`.

---

## 4. App-Specific Issues

### 4.1 apps/web (Next.js 16)

| Category | Count |
|----------|-------|
| Layout config TODOs | 11 |
| Auth integration TODOs | 15 |
| Stub components | 12 |
| Billing/payments TODOs | 6 |
| Type assertions | 16 |

### 4.2 apps/api (Hono + oRPC)

| Category | Count | Actionable |
|----------|-------|------------|
| Commented-out test assertions | 80+ | No (awaiting middleware) |
| Middleware implementation TODOs | 15 | Yes |
| Service layer TODOs | 6 | Yes |

### 4.3 apps/vscode (VS Code Extension)

| Category | Count | Actionable |
|----------|-------|------------|
| Source code TODOs | 68 | ~40 (v2 features) |
| Documentation TODOs | 38 | No (docs only) |

### 4.4 apps/mcp-server

| Category | Count |
|----------|-------|
| Core implementation TODOs | 5 |
| Integration test TODOs | 3 |

---

## 5. Positive Findings

- **Error Handling:** Most async operations have proper try/catch or .catch() handling
- **Deprecated APIs:** No deprecated React lifecycle methods detected
- **@ts-expect-error:** Mostly legitimate use in test files for accessing private members
- **Architecture:** Layer boundaries are being respected (per CONSTRAINTS.md)

---

## 6. Recommended Actions

### Priority 1 - Type Safety (This Week)

```
[ ] Create apps/web/types/session.ts with SessionUser type
[ ] Create apps/web/types/organization.ts with Organization type
[ ] Replace all (session as any) with typed session
[ ] Replace all (organization as any) with typed organization
```

### Priority 2 - Logging (This Week)

```
[ ] Install @snapback/infrastructure in apps/web if not present
[ ] Replace console.log with logger.debug() in marketing components
[ ] Replace console.log with logger.info() in form submission handlers
```

### Priority 3 - Stub Components (Next Sprint)

```
[ ] Implement ResetPasswordForm
[ ] Implement OrganizationLogoForm
[ ] Implement DeleteOrganizationForm
[ ] Implement ChangeNameForm
[ ] Implement DeleteAccountForm
```

### Priority 4 - Test Coverage (Ongoing)

```
[ ] Uncomment and implement middleware auth tests
[ ] Uncomment and implement validation tests
[ ] Complete health check test suite
```

---

## 7. Files Modified in This Session

| File | Change |
|------|--------|
| `ai_dev_utils/ARCHITECTURE.md` | Updated with Intelligence layer, versions, packages |
| `ai_dev_utils/CONSTRAINTS.md` | Added C-009 to C-012 from recent violations |
| `ai_dev_utils/PROJECT_INSTRUCTIONS.md` | Added full tool reference, layer rules |

---

*This report was generated by exploring the codebase with Task agents and documenting findings per ROUTER.md guidelines.*

---

## PART B: HISTORICAL PATTERN ANALYSIS (Added via Git History Exploration)

**Analysis Date:** 2025-12-21
**Commits Analyzed:** 200+
**Method:** Multi-agent exploration of git history, violations, learnings

### Executive Summary - Historical Issues

| Category | Count | Severity |
|----------|-------|----------|
| Historical Regressions | 10 major | Critical |
| Recurring Violations (promoted) | 5 | High |
| Learning System Gaps | 6 identified | Medium |
| Hot Spot Files (50+ commits) | 5 files | High |

---

## 8. Critical Regressions & Reversions

### 8.1 The 83% Activation Regression (Dec 17, 2025)
**Commit:** `3968103bc`
**Impact:** +1072ms activation time (372% over 500ms budget)

**Root Cause:**
- Changed `setContext` from fire-and-forget to `await vscode.commands.executeCommand()`
- Each call added ~100ms IPC serialization overhead
- ContextManager: 3x calls = 300ms
- ProtectionService (duplicate instances): 4x calls = 400ms

**Pattern to Prevent:**
```typescript
// WRONG - adds 100ms IPC overhead per call
await vscode.commands.executeCommand("setContext", key, value);

// CORRECT - fire-and-forget
vscode.commands.executeCommand("setContext", key, value);
return Promise.resolve();
```

**Status:** Learning L044 captured, documented in ROUTER.md lines 701-715

---

### 8.2 Auth Syntax Breaking Revert (Nov 28, 2025)
**Commit:** `86e43caf6` (reverted `24326bf9c`)
**Impact:** 34 files, 218 insertions undone

**What Happened:**
- "Fix" for broken auth syntax introduced breaking changes
- Required complete rollback of auth helper system
- Affected auth, organizations, settings modules

**Pattern to Prevent:**
- Run full type-check before committing auth changes
- Test authentication flow end-to-end before merge
- Use feature branches for auth modifications

---

### 8.3 Massive File Deletion & Recovery (Nov 28 - Dec 4, 2025)
**Recovery Commit:** `62489851a`
**Files Lost:**
- `apps/api/lib/dashboard-metrics.ts` - 437 lines
- `apps/api/lib/email-service.ts` - 314 lines
- `apps/api/middleware/auth-legacy.ts` - 227 lines
- `apps/api/middleware/usage-tracking.ts` - 161 lines
- **Total:** 1,169 lines recovered

**Root Cause:** Confusion between migration (move + refactor) and deletion (remove entirely)

**The pattern repeated** - same files modified/deleted again in commit `49bb9c722`

**Pattern to Prevent:**
- Before deleting ANY file >100 lines: verify it's truly unused
- Migration = move + update imports, NOT delete
- Document migration decisions in commit message

---

### 8.4 Package Consolidation Chaos (Nov-Dec 2025)
**Packages Removed:**
- `@snapback/mail` (commit `908594d41`)
- `@snapback/analytics` (commit `35050680d`)
- `@snapback/policy-engine` (commit `7c7d1a86d`)
- `@snapback/events` (commit `a16bc37c0`)

**Migration Issues:**
- 4+ follow-up commits to fix broken imports
- EventBus imports updated 3 times (`e7f874b2e`, `49f1a4fcb`, `5bcc5801e`)

**Pattern to Prevent (Migration Checklist):**
1. Create new canonical location
2. Migrate code with exports
3. Update ALL imports (global search/replace)
4. Update ALL tests
5. Delete old package ONLY after CI passes
6. Clean package.json dependencies

---

### 8.5 Test File Location Errors (Dec 21, 2025)
**Current Issue:**
```
D apps/vscode/src/ui/StatusBarManager.test.ts
D apps/vscode/src/ui/VitalsIntegration.test.ts
?? apps/vscode/test/ui/StatusBarManager.test.ts
```

**Root Cause:** Tests created in `src/ui/` instead of `test/ui/`

**Pattern (CONSTRAINTS.md C-009):**
- ALL tests MUST be in `test/` directory
- NEVER create `*.test.ts` files in `src/` directory
- Check `vitest.config.ts` test.include pattern before creating test files

---

## 9. Hot Spot Analysis (Files with 50+ commits)

| File | Commits | Primary Issue | Action Needed |
|------|---------|---------------|---------------|
| `apps/vscode/src/extension.ts` | 50 | Central hub, too many concerns | Extract bridges to separate initialization |
| `apps/vscode/package.json` | 46 | Dependency churn from consolidation | Stabilize after consolidation |
| `apps/vscode/src/activation/phase*.ts` | 28 | Unclear phase boundaries | Document phase ownership |
| `apps/vscode/src/operationCoordinator.ts` | 16 | BUG FIX comments indicate repeated fixes | Refactor for clarity |
| Test infrastructure | 755+ | Configuration churn, mock issues | Lock down vitest config |

**Missing Documentation:**
- Activation phase ownership matrix (which phase owns which service?)
- Service lifecycle management
- V1→V2 migration strategy and completion criteria
- Bridge wiring patterns (SignalBridge, EventBridge, StorageBridge)

---

## 10. Recurring Violations Not Being Learned From

### 10.1 VAGUE_ASSERTION (5 occurrences - Promoted but still recurring)
**Pattern:** Using `.toBeTruthy()`, `.toBeDefined()` without specifics

**Status:** Promoted to patterns.md, but 3 more violations AFTER promotion

**Detection:** ValidationPipeline already has check at `packages/intelligence/src/validation/layers/index.ts:146`

**Gap:** ValidationPipeline exists but not run in pre-commit hook

**Recommendation:**
- Add `codebase:check_patterns` to pre-commit hook
- Biome doesn't have this rule natively, rely on ValidationPipeline

---

### 10.2 INCOMPLETE_COVERAGE (5 occurrences - Promoted)
**Pattern:** Tests missing 4-path coverage (happy/sad/edge/error)

**Status:** 2 violations resolved, 2 remain open

**Recommendation:**
- Create test file template with 4 describe blocks
- Add ValidationPipeline check for structure
- CI gate for describe block presence

---

### 10.3 INCOMPLETE_TEST_IMPLEMENTATION (New - Dec 21, 2025)
**Violation V-034:** 25 placeholder tests with `expect(true).toBe(true)`

**Immediate Response:**
- Added to CONSTRAINTS.md as C-004a
- Added verification step to ROUTER.md lines 647-652

**Detection:**
```bash
grep -rn 'expect(true).toBe(true)\|// TODO' test/
```

---

### 10.4 ignored-router-instructions (1 occurrence)
**Violation:** LLM started implementation without calling `start_task()`

**Current Count:** 1x (as of 2025-12-20)
**Threshold:** 3x = auto-promotion to patterns.md

---

## 11. Learning System Gaps

### 11.1 Type Safety Gap
**Evidence:** 16+ occurrences of `as any` in apps/web
**Biome Config:** `noExplicitAny: "off"` (intentionally disabled in biome.json:14)
**Violations Recorded:** 0 (despite being clear anti-pattern)

**Note:** Biome rule is off by choice. If we want enforcement:
- Enable `noExplicitAny: "warn"` in biome.json
- Or add to ValidationPipeline types layer
- Create learning L052

---

### 11.2 Console.log Gap
**Evidence:** 20+ violations in apps/web (see Section 3.1)
**Constraint:** C-007 exists
**ValidationPipeline:** Has check at `packages/intelligence/src/validation/layers/index.ts:348`
**Violations Recorded:** 0 in violations.jsonl

**Gap:** ValidationPipeline check exists but not being triggered

**Recommendation:**
- Record these 20+ instances via `codebase:report_violation`
- Run `codebase:check_patterns` before commits
- Biome's `noConsole` rule could be added but ValidationPipeline is preferred

---

### 11.3 Missing Stub Component Tracking
**Evidence:** 10 stub components marked "TODO: Implement"
**Constraint:** None for incomplete implementations
**Learning:** None about stub acceptability vs blocking

**Recommendation:**
- Create violation type: `INCOMPLETE_IMPLEMENTATION`
- Track stub age (>30 days = warning, >90 days = violation)
- Add to ROUTER.md planning checklist

---

### 11.4 Missing TODO Hygiene
**Evidence:**
- 38 TODOs in apps/vscode/docs/
- ~150 actionable TODOs codebase-wide
**Learning:** None about TODO lifecycle management

**Recommendation:**
- Add L053: "TODO comments must have: owner, date, issue link"
- TODOs >90 days old = tracked violations
- Periodic TODO audit in 8_doc_hygiene.md workflow

---

## 12. Patterns That Should Be Manually Promoted

These patterns have <3 occurrences but are architecturally important:

| Pattern | Occurrences | Importance | Current Location |
|---------|-------------|------------|------------------|
| Test File Location (C-009) | 1x | High (breaks vitest) | CONSTRAINTS.md |
| Path Resolution in ESM (C-010) | 1x | High (breaks MCP) | CONSTRAINTS.md |
| Vitest Workspace Glob (C-011) | 1x | Medium | CONSTRAINTS.md |

**Action:** Manually promote to codebase-patterns.md due to architectural significance

---

## 13. Performance Pattern Summary

**Budgets:**
| Operation | Budget | Enforcement |
|-----------|--------|-------------|
| Cold start activation | < 500ms | Test + CI |
| Subsequent activations | < 100ms | Test |
| Session finalization | avg < 50ms, p95 < 100ms | Test |
| Snapshot creation | < 200ms | Test |
| Protection check | < 10ms (O(1)) | Design |

**Key Performance Patterns:**

| Pattern | Impact | Reference |
|---------|--------|-----------|
| Fire-and-forget setContext | -300ms | ROUTER.md:701-715 |
| Defer heavy operations | -10-20s | setTimeout after activation |
| O(1) lookups (Set vs Array.some) | -100ms on large repos | protectedFileRegistry |
| Batch size increase (10→100) | 10x throughput | SnapshotStore |
| Selective imports | -4MB bundle | esbuild config |
| Lazy loading (simple-git) | -500ms cold start | git-lazy.ts |

---

## 14. Rapid Fix Cycles (Warning Signs)

**Nov 28 - Dec 4: 30 "fix" commits in 6 days**
- 5 fixes in single day (Dec 4)
- Pattern: trial-and-error development

**Root Cause Analysis:**
- Insufficient testing before commits
- Type errors committed
- Tests failing in CI
- Manual testing gaps

**Prevention:**
- Pre-commit gates (type-check via `pnpm type-check`, Biome check)
- Feature branches for multi-file changes
- CI must pass before merge

---

## 15. Test Infrastructure Issues (755+ commits)

### Mock Consolidation Journey
**Before:** 300/484 test files failing (62% failure rate), 1,445 individual tests failing
**Issue:** 116 files with duplicate `vi.mock('vscode')` overrides
**Fix:** Centralized mock in `test/unit/setup.ts`

### Placeholder Tests Issue
**Commits:** `cb68e323b`
**Before:** 83 files with 250+ fake assertions (`expect(true).toBe(true)`)
**Fix:** Converted to `it.todo()` or real implementations
**Scripts Created:** `check-fake-tests.sh`, `convert-fake-tests.sh`

### Vitest Config Consolidation
**Commit:** `4d49e2e30`
**Created:** `@snapback/vitest-config` with presets: `nodeConfig`, `jsdomConfig`, `vscodeConfig`

**Key Fixes:**
- Centralized aliases for `@snapback/*` packages
- Standardized coverage thresholds (80% unit, 60% integration, 40% E2E)
- Standardized timeouts (10s default, 30s integration, 60s E2E)

---

## 16. System Effectiveness Metrics

### Learning Velocity
| Metric | Status |
|--------|--------|
| Violations → Constraints | FAST (same day for critical issues) |
| Violations → Patterns | AUTOMATED (3x threshold working) |
| Violations → Automation | WAITING (only 1 at 5x threshold) |

### Knowledge Retention
| Metric | Status |
|--------|--------|
| Session learnings captured | YES (45 learnings) |
| Cross-session references | YES (learnings reference source sessions) |
| Pattern evolution | YES (VAGUE_ASSERTION evolved from warning to promoted) |

### Prevention Effectiveness
| Metric | Status |
|--------|--------|
| Pre-commit hooks | PARTIAL (Biome runs, ValidationPipeline not integrated) |
| IDE integration | NO (patterns.md not integrated) |
| Documentation coverage | GOOD (ROUTER.md, CONSTRAINTS.md, ARCHITECTURE.md active) |

---

## 17. Additional Recommended Actions (From Historical Analysis)

### Learning System Improvements (This Week)
```
[ ] Integrate ValidationPipeline into pre-commit hook (run codebase:check_patterns)
[ ] Add test file template with 4-path structure
[ ] Create TODO comment hygiene learning (L053)
[ ] Record 20+ console.log violations via codebase:report_violation
[ ] Consider enabling noExplicitAny in biome.json (currently "off")
```

### Documentation Improvements (Next Sprint)
```
[ ] Document activation phase ownership matrix
[ ] Document Bridge wiring patterns (SignalBridge, EventBridge, StorageBridge)
[ ] Add package consolidation playbook to ROUTER.md
[ ] Document V1→V2 migration completion criteria
[ ] Manually promote C-009, C-010, C-011 to codebase-patterns.md
```

### Automation Improvements (Next Month)
```
[ ] Add codebase:check_patterns to git pre-commit hook
[ ] Implement auto-application for vitest config pattern via morphllm
[ ] Create stub component lifecycle tracking
[ ] Build metrics dashboard for violation trends
```

---

## 18. Files Requiring Architectural Review

### Critical Hot Spots
| File | Commits | Issue |
|------|---------|-------|
| [extension.ts](apps/vscode/src/extension.ts) | 50 | Too many concerns, needs modularization |
| [operationCoordinator.ts](apps/vscode/src/operationCoordinator.ts) | 16 | BUG FIX comments indicate fragility |
| [phase2-storage.ts](apps/vscode/src/activation/phase2-storage.ts) | 28 | Unclear phase boundaries |
| [phase3-managers.ts](apps/vscode/src/activation/phase3-managers.ts) | 28 | Service lifecycle issues |

### Learning System Files
| File | Content |
|------|---------|
| [violations.jsonl](ai_dev_utils/patterns/violations.jsonl) | 35 violations tracked |
| [learnings.jsonl](ai_dev_utils/feedback/learnings.jsonl) | 45 learnings captured |
| [codebase-patterns.md](ai_dev_utils/patterns/codebase-patterns.md) | 3 auto-promoted patterns |

---

*Historical analysis generated by multi-agent exploration of git history, violations, and learnings.*
