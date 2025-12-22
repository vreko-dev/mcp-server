# Refactoring Opportunities - Quick Reference

**Generated:** 2025-12-21
**Full Report:** `REFACTORING_OPPORTUNITIES_REPORT.md`
**@ROUTER.md Status:** REFACTORING task type → workflow: `5_refactor.md`

---

## 🚀 Start Here

### Mandatory Pre-Flight (from @ROUTER.md)

```bash
# Before any implementation:
codebase.start_task({
  task: "Refactor opportunity [OP-###]",
  keywords: ["refactoring", "consolidation", "duplication"],
  files: ["affected/files"]
})

# Before committing:
codebase.check_patterns({ code: "...", filePath: "..." })
```

---

## 14 Refactoring Opportunities (Updated)

| # | Opportunity | Category | Effort | Priority | Status |
|---|-------------|----------|--------|----------|--------|
| **001** | Console.log cleanup - VSCode | Style | S | P0-P1 | ✅ Ready |
| **002** | Console.log cleanup - Web | Style | S | P0-P1 | ✅ Ready |
| **003** | Type-safe session in Web | Type Safety | S | P1 | ✅ Ready |
| **004** | Service layer extraction (8 procs) | Architecture | L | P2 | ✅ Ready |
| **005** | Middleware validation consolidation | Architecture | M | P2 | ⏳ Depends on OP-004 |
| **006** | Auth helpers consolidation | Architecture | M | P3 | ⏳ Depends on OP-004 |
| **007** | Risk analyzer complexity reduction | Code Quality | M | P3 | ✅ Independent |
| **008** | Remove `as any` casts in auth middleware | Type Safety | S | P3-P4 | ✅ Independent |
| **009** | Error handling standardization | Architecture | M | P2-P3 | ⏳ Bundle with OP-004 |
| **010** | **Delete dead code file** ⭐ NEW | **Dead Code** | **XS** | **P0** | **✅ DO FIRST** |
| **011** | **Export helper functions** ⭐ NEW | **Reusability** | **XS** | **P1** | **✅ Ready** |
| **012** | **Consolidate validation null checks** ⭐ NEW | **Defensive** | **S** | **P2** | **✅ Ready** |
| **013** | **Create requireDatabase middleware** ⭐ NEW | **Defensive** | **M** | **P2** | **✅ Ready** |
| **014** | **Audit PostHog exports** ⭐ NEW | **Dead Code** | **S** | **P3-P4** | **✅ Independent** |

---

## Quick Start Guide

### Phase 1: Do This Week (4.9 hours) - UPDATED ORDER

```bash
# ⭐ HIGHEST ROI - Start here!
# OP-010: Delete dead code (5 minutes, 200 lines removed)
rm apps/mcp-server/src/agent/snapback-development-agent.ts
pnpm --filter @snapback/mcp-server build
git commit -m "refactor: remove unused snapback-development-agent.ts (200 lines)"

# OP-011: Export helper functions (15 minutes)
# Edit apps/api/modules/dashboard/services/dashboard-service.ts
# Add 'export' keyword to 3 functions + JSDoc
pnpm --filter @snapback/api build

# OP-001: Console.log cleanup - VSCode
1. grep -rn "console\." apps/vscode/src/
2. Replace with logger imports
3. Verify: pnpm --filter @snapback/vscode test

# OP-002: Console.log cleanup - Web
1. grep -rn "console\." apps/web/
2. Replace with logger imports
3. Verify: pnpm --filter @snapback/web test

# OP-003: Type-safe session - Web
1. Create apps/web/types/session.ts
2. Create apps/web/types/organization.ts
3. Replace (session as any) with typed imports
4. Verify: pnpm --filter @snapback/web type-check
```

**Total Time:** 4.9 hours
**Risk:** Minimal (style/type only + dead code deletion)
**Impact:** -235 violations, -200 lines dead code, 16 `as any` casts eliminated

---

### Phase 2: Do Next Sprint (42.5 hours) - UPDATED

```bash
# OP-012: Consolidate validation null checks (30 min)
# Edit packages/intelligence/src/validation/ValidationPipeline.ts
# Add single guard at entry, remove 5 duplicate guards in layers
pnpm --filter @snapback/intelligence test

# OP-013: Create requireDatabase middleware (2 hours)
# Create apps/api/src/middleware/require-database.ts
# Update 11 call sites to use c.get('db')
pnpm --filter @snapback/api test

# OP-004: Service layer extraction
1. Create apps/api/src/services/analytics-service.ts
2. Move DB logic from 8 procedures into service
3. Add 4-path test coverage (happy, sad, edge, error)
4. Update procedures to delegate to service
5. Verify: pnpm --filter @snapback/api test

# Bundle with OP-009 (error handling):
1. Create apps/api/src/services/errors.ts
2. Add ServiceError base class + domain-specific errors
3. Update services to throw specific errors
4. Update procedure error handling

# OP-005: Middleware validation consolidation
1. Create packages/contracts/src/validation/middleware.ts
2. Export validateBody, validateQuery, validateParams
3. Update apps/api/src/middleware/validation.ts to re-export
4. Update apps/web/lib/middleware/api-auth.ts to import
5. Verify: pnpm build

# OP-006: Auth helpers consolidation
1. Create @snapback/auth/helpers/jwt-extraction.ts
2. Extract JWT header parsing helper
3. Use in 3 locations: auth-unified, jwt-tools, api-auth
4. Verify: pnpm test
```

**Total Time:** 42.5 hours across 2-3 weeks
**Risk:** Medium (architecture changes, but well-tested)
**Impact:** 8 procedures refactored, 85 lines consolidated, error handling standardized

---

### Phase 3: Do Later (20.5 hours)

```bash
# OP-007: Complexity reduction
1. Extract regex patterns to COMPLEXITY_PATTERNS constant
2. Create countMatches() helper
3. Create calculatePatternComplexity() function
4. Refactor analyzeFileComplexity()
5. Verify: pnpm --filter @snapback/core test

# OP-008: Remove `as any` casts
1. Create HonoEnv interface
2. Remove 6 (c.env as any) casts
3. Verify: pnpm build

# OP-014: Audit PostHog exports (30 min)
1. grep -r "from.*posthog.*alerts" apps/ packages/
2. grep -r "from.*posthog.*cohorts" apps/ packages/
3. grep -r "from.*posthog.*correlation" apps/ packages/
4. Remove unused exports or document usage

# Note: OP-009 can be bundled with OP-004 or done separately
```

**Total Time:** 20.5 hours
**Risk:** Low (code quality, low-impact areas)
**Impact:** Improved maintainability, type safety, cleaner exports

---

## Constraint Compliance Check

### OP-001, OP-002: Console.log Cleanup

- ✅ **C-007 (No console logs):** Fixes 38 violations
- ✅ **Layer Boundaries:** Apps/vscode, apps/web already follow C-001
- ✅ **Logging Pattern:** Uses @snapback/infrastructure logger (canonical)

### OP-003: Type-safe Session

- ✅ **Type Safety:** Eliminates 16 `as any` casts
- ✅ **Layer Boundaries:** Web app only
- ✅ **Pattern:** Extends BetterAuth types from @snapback/auth

### OP-004: Service Layer

- ✅ **C-002 (Service layer):** Moves logic from procedures → services
- ✅ **C-004 (4-path testing):** Must include happy, sad, edge, error paths
- ✅ **C-015 (Service errors):** Use domain-specific error classes

### OP-010: Delete Dead Code

- ✅ **Bundle Size:** -200 lines immediately
- ✅ **Zero Risk:** Never imported, never used
- ✅ **Verification:** Build succeeds after deletion

### OP-012: Consolidate Validation Checks

- ✅ **TypeScript Safety:** Trust type system + single entry guard
- ✅ **Defense in Depth:** Maintained at pipeline entry (per TOCTOU-AUDIT.md)
- ✅ **Code Clarity:** -15 lines of redundant checks

### OP-013: Database Middleware

- ✅ **Architecture Pattern:** Follows Hono middleware best practices
- ✅ **Error Handling:** Consistent ORPCError across all routes
- ✅ **Single Source of Truth:** -10 duplicate checks

---

## Key Decisions Made

### Why OP-010 First?

1. **Highest ROI** - 200 lines removed in 5 minutes
2. **Zero risk** - Never imported = never used
3. **Immediate gratification** - See results instantly
4. **Sets momentum** - Easy win motivates team

### Why Add Dead Code & Defensive Code Analysis?

- **User Request:** "can you also check for..."
- **Systematic Approach:** Dead code = wasted maintenance
- **Defense in Depth:** Balance safety vs over-engineering
- **@ROUTER.md Alignment:** Consolidation is REFACTORING (line 58)

### Why Bundle OP-009 with OP-004?

- Same files modified (analytics-service.ts, feedback-service.ts, etc.)
- Same test suite updates needed
- Saves 5+ hours vs doing separately
- Error handling naturally part of service extraction

---

## Success Criteria

### Phase 1 Done?

- [ ] 200 lines of dead code deleted (OP-010)
- [ ] 3 helper functions exported (OP-011)
- [ ] Zero console.log in production code (validated with grep)
- [ ] 16 `as any` casts eliminated (type-check passes)
- [ ] All tests pass: `pnpm test`
- [ ] VSCode extension activates normally
- [ ] Web app builds without type errors

### Phase 2 Done?

- [ ] Validation null checks consolidated (OP-012)
- [ ] requireDatabase middleware created (OP-013)
- [ ] All 8 analytics procedures delegate to service
- [ ] 4-path tests added (happy, sad, edge, error) for each procedure
- [ ] ServiceError base class created, used in all services
- [ ] Validation middleware consolidated in @snapback/contracts
- [ ] Auth helpers consolidated in @snapback/auth
- [ ] All tests pass: `pnpm test`
- [ ] No `db.` calls found in procedure files
- [ ] Build succeeds: `pnpm build`

### Phase 3 Done?

- [ ] Risk analyzer refactored, tests pass
- [ ] Zero `as any` in auth middleware
- [ ] PostHog exports audited
- [ ] Code quality metrics improved

---

## Files Affected by Opportunity (Updated)

### OP-010: Delete Dead Code ⭐ NEW

```
apps/mcp-server/src/agent/snapback-development-agent.ts (DELETE)
```

### OP-011: Export Helper Functions ⭐ NEW

```
apps/api/modules/dashboard/services/dashboard-service.ts (add exports + JSDoc)
```

### OP-012: Consolidate Validation Checks ⭐ NEW

```
packages/intelligence/src/validation/ValidationPipeline.ts (add entry guard)
packages/intelligence/src/validation/layers/index.ts (remove 5 guards)
```

### OP-013: requireDatabase Middleware ⭐ NEW

```
apps/api/src/middleware/require-database.ts (CREATE)
apps/api/src/index.ts (add middleware)
apps/api/src/middleware/auth-unified.ts (remove check)
apps/api/src/middleware/rls-enforcement.ts (remove check)
apps/api/src/middleware/rls-tenant.ts (remove 3 checks)
apps/api/src/routes/v1/analyze.ts (remove check)
apps/api/src/routes/v1/detect-secrets.ts (remove check)
apps/api/src/routes/v1/policy-current.ts (remove check)
apps/api/src/routes/v1/policy-evaluate.ts (remove 2 checks)
apps/api/src/services/pioneer-service.ts (remove check)
```

### OP-014: Audit PostHog Exports ⭐ NEW

```
packages/infrastructure/src/posthog/index.ts (audit exports)
packages/infrastructure/src/posthog/alerts.ts (check usage)
packages/infrastructure/src/posthog/cohorts.ts (check usage)
packages/infrastructure/src/posthog/correlation.ts (check usage)
```

---

## Testing Strategy

### Phase 1 Testing

```bash
# OP-010: Dead code deletion
pnpm --filter @snapback/mcp-server build  # Must succeed

# OP-011: Helper exports
# Try importing from another module to verify export works

# OP-001, OP-002: Console.log
pnpm --filter @snapback/vscode test
pnpm --filter @snapback/web test

# OP-003: Type safety
pnpm --filter @snapback/web type-check
```

### Phase 2 Testing

```bash
# OP-012: Validation consolidation
pnpm --filter @snapback/intelligence test

# OP-013: DB middleware
pnpm --filter @snapback/api test  # All route tests must pass

# OP-004: Service layer
pnpm --filter @snapback/api test  # Must pass with 4-path coverage

# OP-005, OP-006: Consolidation
pnpm type-check  # Verify no type errors
pnpm build      # Verify build succeeds

# Integration test
pnpm test        # Full suite
```

### Phase 3 Testing

```bash
# OP-007, OP-008, OP-014
pnpm --filter @snapback/core test
pnpm build
```

---

## Rollback Strategy

Each refactoring is independently reversible:

```bash
# Rollback OP-010
git checkout apps/mcp-server/src/agent/snapback-development-agent.ts

# Rollback OP-012
git checkout packages/intelligence/src/validation/

# Rollback OP-013
git checkout apps/api/src/middleware/
git checkout apps/api/src/routes/

# Rollback OP-004
git checkout apps/api/src/services/
git checkout apps/api/modules/analytics/procedures/
```

---

## References

- **Full Report:** `REFACTORING_OPPORTUNITIES_REPORT.md`
- **@ROUTER.md:** Task classification and workflow
- **CONSTRAINTS.md:** Hard rules (C-001 through C-015)
- **Workflow:** `ai_dev_utils/workflows/5_refactor.md`

---

## Next Steps

1. **Approve roadmap** - Get stakeholder sign-off
2. **Start with OP-010** - Delete dead code (5 min, 200 lines)
3. **Then OP-011** - Export helpers (15 min)
4. **Plan Phase 1** - Assign OP-001, OP-002, OP-003 to sprint
5. **Start task tracking** - Create GitHub issues for each opportunity
6. **Execute Phase 1** - Parallel implementation for quick wins
7. **Validate Phase 1** - Run full test suite, user validation
8. **Plan Phase 2** - Schedule OP-004 and supporting refactors (include OP-012, OP-013)
9. **Continuous validation** - Run `codebase.check_patterns()` before each commit

---

**Ready to proceed? See REFACTORING_OPPORTUNITIES_REPORT.md for detailed implementation guide.**

**🎯 RECOMMENDATION: Start with OP-010 (5 minutes, 200 lines removed, zero risk) for immediate impact!**
