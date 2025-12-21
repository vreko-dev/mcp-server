# Codebase Issues Routing Plan

**Generated:** 2025-12-21
**Source:** [codebase_issues_2025-12-21.md](file:///Users/user1/WebstormProjects/SnapBack-Site/ai_dev_utils/resources/codebase_issues_2025-12-21.md)
**Router:** [ROUTER.md](file:///Users/user1/WebstormProjects/SnapBack-Site/ai_dev_utils/ROUTER.md)

---

## Executive Routing Summary

| Priority | Issue Category | Count | Workflow | Estimated Effort |
|----------|---------------|-------|----------|------------------|
| **P0-P1** | Historical Regressions | 10 | `7_hotfix.md` → `2_research.md` | 2-3 weeks |
| **P1-P2** | Type Safety Issues | 24+ | `5_refactor.md` | 1 week |
| **P2** | Logging Violations | 20+ | `5_refactor.md` | 2-3 days |
| **P2-P3** | Stub Components | 10 | `3_planning.md` → `4_dev_complete.md` | 1-2 weeks |
| **P3** | Test Coverage Gaps | 99 | `6_test.md` | 1 week |
| **P3-P4** | Learning System Gaps | 6 | `5_refactor.md` + ROUTER updates | 3-5 days |
| **P4** | TODO Hygiene | ~150 | `8_doc_hygiene.md` | Ongoing |

**Total Effort:** ~6-8 weeks for full remediation

---

## P0-P1: CRITICAL - Historical Regressions (HOTFIX → RESEARCH)

### 8.1 The 83% Activation Regression ⚠️ CRITICAL
**Status:** Already resolved (Dec 17, 2025)  
**Learning Captured:** L044 in ROUTER.md  
**Action:** ✅ COMPLETE - Verify learning applied in future similar tasks

---

### 8.2 Auth Syntax Breaking Revert
**Impact:** 34 files, 218 insertions reverted  
**Root Cause:** Type errors committed without pre-commit type-check  
**Workflow:** `7_hotfix.md` (if auth still broken) OR `2_research.md` (investigate auth state)

**Task:**
```yaml
Route: Investigate auth module stability
Priority: P1
Workflow: 2_research.md → Report findings
Questions:
  - Is auth currently working after revert?
  - Are type errors resolved?
  - Do we need feature branch for next auth changes?
```

**Prevention Actions:**
- [ ] Add pre-commit type-check gate (if not already present)
- [ ] Document auth testing checklist
- [ ] Record violation: `AUTH_BREAKING_CHANGE`

---

### 8.3 Massive File Deletion & Recovery ⚠️ CRITICAL
**Files Affected:** 1,169 lines across 4 critical files  
**Pattern:** Repeated deletion/recovery of same files  
**Workflow:** `2_research.md` → Document migration vs deletion criteria

**Task:**
```yaml
Route: Create file deletion safety checklist
Priority: P1
Workflow: 2_research.md → 8_doc_hygiene.md (add to ROUTER.md)
Deliverables:
  - File deletion checklist (>100 lines = mandatory review)
  - Migration playbook (move + refactor vs delete)
  - Pre-commit hook: warn on large file deletions
```

**Files to verify still exist:**
- `apps/api/lib/dashboard-metrics.ts` (437 lines)
- `apps/api/lib/email-service.ts` (314 lines)
- `apps/api/middleware/auth-legacy.ts` (227 lines)
- `apps/api/middleware/usage-tracking.ts` (161 lines)

**Action Items:**
- [ ] Verify these files exist (or find canonical location)
- [ ] Record violation: `ACCIDENTAL_FILE_DELETION`
- [ ] Add to ROUTER.md: File deletion safety pattern

---

### 8.4 Package Consolidation Chaos
**Impact:** 4+ follow-up commits to fix broken imports  
**Workflow:** Already documented in ROUTER.md lines 972-993

**Task:**
```yaml
Route: Validate package consolidation checklist
Priority: P2
Workflow: 5_refactor.md → Verify all packages follow checklist
Checklist Review:
  - ✓ Canonical package built FIRST
  - ✓ All imports updated globally
  - ✓ Old package deleted ONLY after CI passes
  - ? Pre-commit hook warns on package.json deletion
```

**Action Items:**
- [ ] Add pre-commit hook: detect package.json deletion
- [ ] Verify no broken imports currently exist
- [ ] Update ROUTER.md with auto-detection rule

---

### 8.5 Test File Location Errors ⚠️ URGENT
**Violation:** C-009 (tests in src/ instead of test/)  
**Current Status:** Tests moved but may still be staged incorrectly  
**Workflow:** `5_refactor.md` → Fix test locations

**Task:**
```yaml
Route: Fix test file locations (C-009 violation)
Priority: P1
Workflow: 5_refactor.md
Steps:
  1. Find all *.test.ts files in src/ directories
  2. Move to test/ with same directory structure
  3. Update vitest.config.ts if needed
  4. Verify all tests run after move
```

**Detection Command:**
```bash
find apps/vscode/src -name "*.test.ts" -o -name "*.spec.ts"
```

**Action Items:**
- [ ] Run detection command
- [ ] Move any remaining test files
- [ ] Add pre-commit hook: block *.test.ts in src/

---

## P1-P2: Type Safety Issues (REFACTORING)

### 2.1 `as any` Type Assertions (16+ occurrences)
**Violation:** Type safety bypass (should be C-XXX constraint)  
**Root Cause:** Session and organization types not properly typed  
**Workflow:** `5_refactor.md`

**Task:**
```yaml
Route: Eliminate all (session as any) casts
Priority: P1
Workflow: 5_refactor.md
Steps:
  1. Create apps/web/types/session.ts with SessionUser type
  2. Create apps/web/types/organization.ts with Organization type
  3. Replace all (session as any) with typed session (16 files)
  4. Replace all (organization as any) with typed org
  5. Verify type-check passes
```

**Files Affected:**
- `apps/web/app/(saas)/app/(account)/settings/**` (5 files)
- `apps/web/app/(saas)/app/api-keys/actions.ts`
- `apps/web/app/(saas)/app/(organizations)/**` (2 files)

**Action Items:**
- [ ] Create violation: `EXPLICIT_ANY_CAST` (16 occurrences)
- [ ] Implement types from BetterAuth/Supabase
- [ ] Consider enabling `noExplicitAny: "warn"` in biome.json

---

### 2.2 `: any` Type Annotations (8+ occurrences)
**Workflow:** `5_refactor.md`

**Task:**
```yaml
Route: Replace : any with proper types
Priority: P2
Workflow: 5_refactor.md
Steps:
  1. Add @types/monaco-editor for editor types
  2. Create IndexedDB value type for idb-fallback.ts
  3. Use toError() helper for catch blocks
```

**Files:**
- `apps/web/app/(marketing)/snapback-demo/components/SnapBackDemo.tsx`
- `apps/web/app/(marketing)/snapback-demo/lib/idb-fallback.ts`
- `apps/web/app/api/og/recovery/route.tsx`

---

## P2: Logging Violations (REFACTORING)

### 3.1 `console.log` in Production Code (20+ occurrences)
**Violation:** C-007 (Console.log in Production)  
**Detection:** ValidationPipeline already has check  
**Workflow:** `5_refactor.md`

**Task:**
```yaml
Route: Replace console.log with logger
Priority: P2
Workflow: 5_refactor.md
Steps:
  1. Verify @snapback/infrastructure installed in apps/web
  2. Import logger in all 20 affected files
  3. Replace console.log → logger.debug/info/error
  4. Record 20 violations via codebase:report_violation
  5. Run ValidationPipeline to verify fixes
```

**Files (10 primary):**
- `apps/web/app/components/trial-detector.tsx`
- `apps/web/hooks/use-protection-status.ts`
- `apps/web/modules/ui/components/magic/snapback-terminal-ultimate.tsx`
- `apps/web/modules/marketing/**` (5 files)
- `apps/web/modules/marketing/lib/analytics.ts`

**Action Items:**
- [ ] Record 20+ violations: `CONSOLE_LOG_IN_PRODUCTION`
- [ ] After fix, verify count reaches 3x threshold
- [ ] Auto-promote to patterns.md if 3x+ violations

---

## P2-P3: Stub Components (NEW_FEATURE)

### 1.3 Stub Components (10 verified)
**Workflow:** `3_planning.md` → `4_dev_complete.md`

**Task Group:**
```yaml
Route: Implement stub components
Priority: P2-P3 (depends on auth/API readiness)
Workflow: 3_planning.md → 4_dev_complete.md
Components:
  Auth Module (P2):
    - ResetPasswordForm
  Organizations Module (P2):
    - DeleteOrganizationForm
    - OrganizationInvitationModal
    - OrganizationLogoForm
  Settings Module (P3):
    - ChangeNameForm
    - ChangeEmailForm
    - DeleteAccountForm
  Admin Module (P3):
    - UserList
    - OrganizationList
  Providers (P2):
    - ActiveOrganizationProvider
```

**Routing Strategy:**
1. **Auth components first** (blocking user flows)
2. **Organizations components** (core feature)
3. **Settings components** (nice-to-have)
4. **Admin components** (admin-only)

**Each component task:**
```yaml
Route: Implement [ComponentName]
Priority: [P2 or P3]
Workflow: 3_planning.md → 4_dev_complete.md
Steps:
  1. Review component requirements (3_planning.md Step 0)
  2. Check if backend API ready
  3. Write tests first (4_dev_complete.md RED)
  4. Implement component (4_dev_complete.md GREEN)
  5. Refactor for clarity (4_dev_complete.md REFACTOR)
```

**Action Items:**
- [ ] Create violation: `INCOMPLETE_IMPLEMENTATION` for stubs >30 days old
- [ ] Add to ROUTER.md: Stub component lifecycle tracking

---

## P3: Test Coverage Gaps (TESTING)

### 1.4 Test Coverage Gaps (99 in apps/api/__tests__)
**Status:** Commented-out tests waiting for middleware  
**Workflow:** `6_test.md`

**Task:**
```yaml
Route: Implement middleware test suite
Priority: P3
Workflow: 6_test.md
Blocked By: Middleware implementation completion
Steps:
  1. Verify middleware implementation complete
  2. Uncomment auth tests (18 TODOs)
  3. Implement auth mocks
  4. Uncomment validation tests (16 TODOs)
  5. Implement schema validation mocks
  6. Uncomment health check tests (20 TODOs)
  7. Verify 4-path coverage (C-004)
```

**Files:**
- `apps/api/__tests__/middleware-auth-checks.test.ts`
- `apps/api/__tests__/middleware-validation.test.ts`
- `apps/api/__tests__/routes-health.test.ts`

**Action Items:**
- [ ] Check middleware implementation status
- [ ] If complete → implement tests
- [ ] If incomplete → defer to P4

---

## P3-P4: Learning System Improvements (REFACTORING + DOC_HYGIENE)

### 11. Learning System Gaps (6 identified)
**Workflow:** `5_refactor.md` + `8_doc_hygiene.md`

#### 11.1 Type Safety Gap
**Task:**
```yaml
Route: Decide on noExplicitAny enforcement
Priority: P3
Workflow: 2_research.md → 8_doc_hygiene.md (update CONSTRAINTS.md)
Decision Needed:
  - Enable noExplicitAny: "warn" in biome.json?
  - Add to ValidationPipeline types layer?
  - Create learning L052?
Current: Intentionally disabled (biome.json:14)
```

---

#### 11.2 Console.log Gap
**Task:**
```yaml
Route: Integrate ValidationPipeline into pre-commit
Priority: P3
Workflow: 5_refactor.md
Steps:
  1. Verify ValidationPipeline check exists (✓ at line 348)
  2. Add codebase:check_patterns to git pre-commit hook
  3. Test hook catches console.log violations
  4. Record 20+ existing violations (see P2 task above)
```

**Action Items:**
- [ ] Add to `.lefthook.yml` or `.husky/pre-commit`
- [ ] Verify ValidationPipeline runs before commit

---

#### 11.3 Missing Stub Component Tracking
**Task:**
```yaml
Route: Create stub component lifecycle tracking
Priority: P4
Workflow: 8_doc_hygiene.md
Steps:
  1. Create violation type: INCOMPLETE_IMPLEMENTATION
  2. Track stub age (>30 days = warning, >90 days = violation)
  3. Add to ROUTER.md planning checklist
  4. Create script: check-stub-age.sh
```

---

#### 11.4 Missing TODO Hygiene
**Task:**
```yaml
Route: Implement TODO lifecycle management
Priority: P4
Workflow: 8_doc_hygiene.md
Steps:
  1. Create learning L053: "TODO comments must have: owner, date, issue link"
  2. Create script: audit-todos.sh (find TODOs >90 days old)
  3. Add to ROUTER.md: Periodic TODO audit workflow
  4. Run initial audit on ~150 actionable TODOs
```

**Pattern:**
```typescript
// TODO(owner, 2025-12-21, #123): Description
```

---

#### 11.5 Documentation Improvements
**Task:**
```yaml
Route: Document missing architectural patterns
Priority: P3
Workflow: 8_doc_hygiene.md
Deliverables:
  - Activation phase ownership matrix
  - Bridge wiring patterns (SignalBridge, EventBridge, StorageBridge)
  - V1→V2 migration completion criteria
  - Package consolidation playbook
```

**Location:** Add to `ai_dev_utils/ARCHITECTURE.md` or create new docs

---

#### 11.6 Automation Improvements
**Task:**
```yaml
Route: Add automated pattern detection
Priority: P4
Workflow: 5_refactor.md
Steps:
  1. Add codebase:check_patterns to pre-commit hook
  2. Implement auto-application for vitest config via morphllm
  3. Build metrics dashboard for violation trends
```

---

## P4: TODO Hygiene (DOC_HYGIENE)

### 1.1-1.5 TODO Analysis (~150 actionable)
**Workflow:** `8_doc_hygiene.md`

**Task Groups:**

#### High-Priority TODOs (P2-P3)
```yaml
Route: Auth Integration TODOs (14 verified)
Priority: P3
Workflow: 8_doc_hygiene.md → Verify if stale
Files: apps/web/modules/saas/*/lib/api.ts
Action: Check if auth client already integrated (LoginForm.tsx imports authClient)
```

```yaml
Route: API Integration TODOs (15+)
Priority: P3
Workflow: 8_doc_hygiene.md → Wait for ORPC availability
Files: apps/web/modules/saas/payments/**, apps/web/modules/marketing/**
Action: Defer until payments API available
```

```yaml
Route: Config Management TODOs (11)
Priority: P3
Workflow: 8_doc_hygiene.md → Create config schema
Files: 11 layout files
Action: Finalize environment/app settings config
```

#### Low-Priority TODOs (P4)
```yaml
Route: Documentation TODOs (38 in apps/vscode/docs)
Priority: P4
Workflow: 8_doc_hygiene.md
Action: Batch update or delete stale TODOs
```

```yaml
Route: Test stub TODOs (99 in apps/api/__tests__)
Priority: P4 (see P3 Test Coverage task)
Action: Defer to middleware implementation completion
```

---

## Hot Spot Files Requiring Architectural Review

### 9. Hot Spot Analysis (Files with 50+ commits)
**Workflow:** `2_research.md` → `3_planning.md` → `5_refactor.md`

**Task:**
```yaml
Route: Refactor hot spot files
Priority: P2
Workflow: 2_research.md → Document current state → 3_planning.md → Design modularization → 5_refactor.md
Files:
  - apps/vscode/src/extension.ts (50 commits) - Too many concerns
  - apps/vscode/src/operationCoordinator.ts (16 commits) - Fragile (BUG FIX comments)
  - apps/vscode/src/activation/phase*.ts (28 commits) - Unclear boundaries
Steps:
  1. Document current architecture
  2. Identify single responsibility violations
  3. Extract concerns into separate modules
  4. Create comprehensive tests before refactoring
```

**Deliverables:**
- [ ] Activation phase ownership matrix
- [ ] Service lifecycle documentation
- [ ] Bridge wiring patterns documentation

---

## Violation Recording Tasks

### Record All Untracked Violations
**Workflow:** Use `codebase:report_violation` MCP tool

**Violations to Record:**

#### P1: Record Immediately
```bash
# Console.log violations (20+)
codebase.report_violation({
  type: "CONSOLE_LOG_IN_PRODUCTION",
  file: "apps/web/app/components/trial-detector.tsx",
  whatHappened: "Using console.log in production code",
  whyItHappened: "C-007 constraint exists but ValidationPipeline not run",
  prevention: "Run codebase:check_patterns in pre-commit hook"
})

# Explicit any casts (16+)
codebase.report_violation({
  type: "EXPLICIT_ANY_CAST",
  file: "apps/web/app/(saas)/app/(account)/settings/layout.tsx",
  whatHappened: "(session as any)?.user?.name",
  whyItHappened: "Session type not properly imported from BetterAuth",
  prevention: "Create apps/web/types/session.ts with proper SessionUser type"
})
```

#### P2: Record After Research
```bash
# Auth breaking change
codebase.report_violation({
  type: "AUTH_BREAKING_CHANGE",
  file: "apps/web/modules/saas/auth/**",
  whatHappened: "34 files reverted due to type errors",
  whyItHappened: "No pre-commit type-check gate",
  prevention: "Add pre-commit hook for type-check, use feature branches for auth"
})

# Accidental file deletion
codebase.report_violation({
  type: "ACCIDENTAL_FILE_DELETION",
  file: "apps/api/lib/dashboard-metrics.ts",
  whatHappened: "1,169 lines deleted and recovered across 4 files",
  whyItHappened: "Confusion between migration and deletion",
  prevention: "File deletion checklist for files >100 lines, pre-commit hook warning"
})
```

---

## Summary: Routing by Workflow

| Workflow | Issue Count | Priority | Effort |
|----------|-------------|----------|--------|
| `7_hotfix.md` | 2 | P0-P1 | 1-2 days |
| `2_research.md` | 5 | P1-P2 | 1 week |
| `3_planning.md` | 10 | P2-P3 | 1 week |
| `4_dev_complete.md` | 10 | P2-P3 | 1-2 weeks |
| `5_refactor.md` | 50+ | P1-P4 | 2-3 weeks |
| `6_test.md` | 99 | P3 | 1 week |
| `8_doc_hygiene.md` | 150+ | P3-P4 | Ongoing |

---

## Recommended Execution Order

### Week 1: Critical Stability
1. ✅ **P1: Test File Locations** (C-009 violation) - `5_refactor.md`
2. ✅ **P1: Verify deleted files** (apps/api/lib/*) - `2_research.md`
3. ✅ **P1: Record 20+ console.log violations** - MCP tool
4. ✅ **P1: Record 16+ as any violations** - MCP tool

### Week 2: Type Safety
5. ✅ **P1: Create session/organization types** - `5_refactor.md`
6. ✅ **P1: Replace all (session as any) casts** - `5_refactor.md`
7. ✅ **P2: Replace console.log with logger** - `5_refactor.md`

### Week 3: Stub Components (Auth First)
8. ✅ **P2: Implement ResetPasswordForm** - `3_planning.md` → `4_dev_complete.md`
9. ✅ **P2: Implement ActiveOrganizationProvider** - `3_planning.md` → `4_dev_complete.md`
10. ✅ **P2: Implement OrganizationLogoForm** - `3_planning.md` → `4_dev_complete.md`

### Week 4: Learning System
11. ✅ **P3: Add ValidationPipeline to pre-commit** - `5_refactor.md`
12. ✅ **P3: Document activation phase ownership** - `8_doc_hygiene.md`
13. ✅ **P3: Create TODO lifecycle script** - `8_doc_hygiene.md`

### Weeks 5-6: Test Coverage & Remaining Stubs
14. ✅ **P3: Implement middleware tests** (if middleware complete) - `6_test.md`
15. ✅ **P3: Implement remaining stub components** - `4_dev_complete.md`

### Ongoing: TODO Hygiene
16. ✅ **P4: Audit and resolve TODOs** - `8_doc_hygiene.md`

---

## Next Steps

**Immediate Actions (Today):**
1. Run test file location detection: `find apps/vscode/src -name "*.test.ts"`
2. Verify deleted files exist: `ls apps/api/lib/{dashboard-metrics,email-service,auth-legacy,usage-tracking}.ts`
3. Record console.log violations (20+) via `codebase:report_violation`
4. Record as any violations (16+) via `codebase:report_violation`

**This Week:**
5. Create `apps/web/types/session.ts` and `organization.ts`
6. Replace all type safety violations
7. Add ValidationPipeline to pre-commit hook

**Track Progress:**
- Update this file with ✅ checkmarks as tasks complete
- Use `ai_dev_utils/state/current-task.json` for active task tracking
- Record learnings after each completed workflow

---

**Last Updated:** 2025-12-21  
**Status:** Ready for execution  
**Routing Complete:** ✅
