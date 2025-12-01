# SnapBack Web App - Refactoring Analysis Report

**Analysis Date**: 2025-11-08
**Scope**: apps/web - Next.js marketing site + SaaS dashboard
**Total Lines Analyzed**: ~5,630 lines (lib: 4,158, components: 1,472)

---

## Executive Summary

**Potential Reduction**: ~1,200-1,500 lines of code (21-27% reduction)
**Complexity Reduction**: High (8/10)
**Risk Level**: Low-Medium (safe refactorings with existing test coverage)

### Top 3 Priorities

1. **Remove duplicate hats-demo code** → Save ~400 lines, eliminate confusion
2. **Leverage React Query built-in features** → Remove 493 lines of custom abstraction
3. **Consolidate repetitive API error handling** → Save ~300 lines, improve consistency

---

## Category 1: Code Duplication (HIGH PRIORITY)

### 1.1 Hats-Demo Duplicate Implementation

**Impact**: 🔴 Critical - Maintenance nightmare, version drift

**Current State**:
- Components exist in TWO locations:
  - `/components/hats-demo/` (legacy, 5 files)
  - `/modules/marketing/components/hats-demo/` (current, 5 files)
- Utils exist in TWO locations:
  - `/lib/hat-utils.ts` (70 lines)
  - `/lib/hats-demo/hat-utils.ts` (70 lines)
- Files have diverged (diff shows differences)

**Evidence**:
```bash
# Components duplicated
components/hats-demo/ActivityLog.tsx ≠ modules/marketing/components/hats-demo/ActivityLog.tsx
components/hats-demo/FileTree.tsx ≠ modules/marketing/components/hats-demo/FileTree.tsx
components/hats-demo/HatContext.tsx ≠ modules/marketing/components/hats-demo/HatContext.tsx
components/hats-demo/TreeRow.tsx ≠ modules/marketing/components/hats-demo/TreeRow.tsx
components/hats-demo/ContextMenu.tsx ≠ modules/marketing/components/hats-demo/ContextMenu.tsx

# Utils duplicated
lib/hat-utils.ts ≠ lib/hats-demo/hat-utils.ts
```

**Recommendation**:
- Delete entire `/components/hats-demo/` directory (legacy)
- Delete `/lib/hat-utils.ts` (use `/lib/hats-demo/hat-utils.ts`)
- Update all imports to point to canonical locations

**Lines Saved**: ~400 lines
**Complexity Reduction**: 9/10
**Risk**: Low (grep imports, update, test)

---

### 1.2 Repetitive API Route Error Handling

**Impact**: 🟡 High - Boilerplate bloat, inconsistent patterns

**Current State**:
- 19 API routes with identical try-catch patterns
- 41 try-catch blocks across API routes
- Repetitive error response patterns:
  ```typescript
  try {
    // logic
  } catch (error) {
    logger.error("...", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
  ```

**Evidence**:
- `/app/api/v1/snapshots/list/route.ts`: 194 lines, 3 try-catch blocks
- `/app/api/waitlist/route.ts`: 292 lines, 6 try-catch blocks
- `/app/api/v1/checkpoint/route.ts`: Stub with boilerplate

**Recommendation**:
Create API route wrapper utility:
```typescript
// lib/api-helpers.ts
export function withErrorHandler<T>(
  handler: () => Promise<T>
): Promise<NextResponse> {
  return handler()
    .then(data => NextResponse.json(data))
    .catch(error => {
      const appError = toAppError(error);
      logError(appError, { context: 'api-route' });
      return NextResponse.json(
        { error: appError.message },
        { status: appError.statusCode }
      );
    });
}

// Usage
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    // Just the business logic, no try-catch
    const data = await fetchData();
    return { data };
  });
}
```

**Lines Saved**: ~300 lines (eliminate 30+ try-catch blocks)
**Complexity Reduction**: 8/10
**Risk**: Low (wrapper pattern is standard)

---

### 1.3 Retry Logic Duplication

**Impact**: 🟡 Medium - Repeated exponential backoff logic

**Current State**:
- `stripe-webhook-handlers.ts` implements retry logic 6 times:
  - `sendConfirmationEmail()`: 42 lines with retry
  - `syncToHubSpot()`: 76 lines with retry
  - Pattern: `for (let attempt = 1; attempt <= retries; attempt++)`
  - Exponential backoff: `2 ** attempt * 1000`

**Recommendation**:
Use existing utility or create simple helper:
```typescript
// Check if @snapback/infrastructure has retry util
// If not, create lib/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; backoff: 'exponential' | 'linear' }
): Promise<T> {
  // Single implementation
}
```

**Lines Saved**: ~120 lines (consolidate 6 retry implementations)
**Complexity Reduction**: 7/10
**Risk**: Low (common utility pattern)

---

## Category 2: Over-Engineering (MEDIUM PRIORITY)

### 2.1 Custom Resource Pattern vs React Query

**Impact**: 🟡 Medium - Unnecessary abstraction layer

**Current State**:
- 493 lines of custom code:
  - `lib/resource.ts`: 72 lines (custom Resource type)
  - `lib/use-resource-query.ts`: 120 lines (wrapper around React Query)
  - `lib/error-handler.ts`: 301 lines (custom error handling)
- Only 11 files use `useResourceQuery`
- Only 4 files use `useResourceMutation`
- React Query already provides:
  - `isPending`, `isError`, `isSuccess` states
  - Error handling with `onError`
  - Retry logic
  - Loading states

**Evidence**:
```typescript
// Current custom approach (493 lines)
const resource = useResourceQuery(
  ['metrics'],
  () => fetchMetrics(),
  { schema: MetricsSchema }
);

if (isLoading(resource)) return <Spinner />;
if (isError(resource)) return <Error error={resource.error} />;
return <Data data={resource.data} />;

// Standard React Query (0 custom lines needed)
const { data, isPending, isError, error } = useQuery({
  queryKey: ['metrics'],
  queryFn: fetchMetrics,
  select: (data) => MetricsSchema.parse(data) // Zod validation
});

if (isPending) return <Spinner />;
if (isError) return <Error error={error} />;
return <Data data={data} />;
```

**Recommendation**:
- Remove `lib/resource.ts` (72 lines)
- Remove `lib/use-resource-query.ts` (120 lines)
- Simplify `lib/error-handler.ts` to just type definitions (reduce to ~50 lines)
- Use React Query's built-in features directly
- Add Zod validation in `select` option

**Lines Saved**: 493 lines → 50 lines = **443 lines saved**
**Complexity Reduction**: 8/10
**Risk**: Medium (11 components need updates, but pattern is straightforward)

**Migration Strategy**:
1. Create `lib/query-helpers.ts` with Zod validation utilities
2. Update 11 components using `useResourceQuery`
3. Update 4 components using `useResourceMutation`
4. Delete resource abstraction files
5. Run tests to verify

---

### 2.2 Redundant Device Detection Utilities

**Impact**: 🟢 Low - Minor, but unnecessary

**Current State**:
- `lib/device-detection.ts`: 80 lines
- Implements `isBrowser()`, `isNode()`, `isEdge()`
- These are simple checks that don't need dedicated utilities

**Recommendation**:
- Replace with inline checks: `typeof window !== 'undefined'`
- Or use Next.js built-in environment detection
- Most usage is already in Next.js contexts where runtime is known

**Lines Saved**: ~80 lines
**Complexity Reduction**: 4/10
**Risk**: Low (simple replacements)

---

## Category 3: Unused Dependencies (LOW PRIORITY)

### 3.1 Potentially Unused Libraries

**Impact**: 🟢 Low - Bundle size, not code complexity

**Investigation Results**:
| Package | Usage Count | Status | Recommendation |
|---------|-------------|--------|----------------|
| `@floating-ui/react` | 0 imports | Unused | Remove (Radix has tooltips) |
| `boring-avatars` | 3 imports | Used | Keep |
| `cropperjs` / `react-cropper` | 3 imports | Used | Keep |
| `input-otp` | 1 import | Used | Keep |
| `react-qr-code` | 1 import | Used | Keep |
| `lenis` | 2 imports | Used | Keep (smooth scroll) |
| `nprogress` libs | 3 imports | Used | Keep |
| `usehooks-ts` | 7 imports | Used | Keep |

**Findings**:
- `@floating-ui/react`: 0 imports found
  - Radix UI components already include positioning
  - Safe to remove

**Lines Saved**: 0 (just bundle size reduction)
**Complexity Reduction**: 2/10
**Risk**: Very Low (no imports found)

**Recommendation**: Remove `@floating-ui/react` from package.json

---

### 3.2 Dead Code Analysis

**Impact**: 🟢 Low - Legacy components

**Current State**:
- `/components/` directory has 8 legacy files:
  - `layout/Footer.tsx`
  - `hats-demo/*` (5 files - covered in 1.1)
  - `UsageChart.tsx`
  - `ErrorBoundary.tsx`
- These appear to be superseded by `/modules/` structure

**Recommendation**:
1. Verify no imports exist for legacy components
2. If unused, delete `/components/` directory
3. Keep `ErrorBoundary.tsx` if actively used

**Lines Saved**: ~200 lines (if fully unused)
**Complexity Reduction**: 5/10
**Risk**: Low (grep for imports first)

---

## Category 4: Simplification Opportunities

### 4.1 API Route Middleware Not Used

**Impact**: 🟡 Medium - Inconsistent auth patterns

**Current State**:
- `lib/middleware/api-auth.ts`: 62 lines, defines `withApiAuth` wrapper
- Only 3 files define `export const runtime = "nodejs"`
- Middleware NOT used in actual API routes
- Each route implements auth manually

**Example**:
```typescript
// apps/web/app/api/v1/snapshots/list/route.ts
// Manually parses x-auth-context header (22 lines)
const authContextHeader = request.headers.get("x-auth-context");
if (!authContextHeader) {
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}
const authContext = JSON.parse(authContextHeader);
```

**Recommendation**:
- Either use the `withApiAuth` wrapper consistently, or remove it
- If keeping: Update all routes to use wrapper
- If removing: Delete unused middleware (save 62 lines)

**Lines Saved**: 62 lines (if removing) OR simplify ~150 lines across routes (if using)
**Complexity Reduction**: 6/10
**Risk**: Medium (requires consistent auth pattern decision)

---

### 4.2 ORPC/TRPC Dual Setup

**Impact**: 🟢 Low - Potential confusion

**Current State**:
- package.json has both `@orpc/*` and `@trpc/*` dependencies
- Only 4 files use ORPC:
  - `package.json`
  - `modules/shared/lib/orpc-client.ts`
  - `lib/api-client.ts`
  - `modules/shared/lib/orpc-query-utils.ts`
- No tRPC imports found in web app

**Recommendation**:
- Verify tRPC is only used in `@snapback/api` package
- If web doesn't use tRPC directly, this is fine (just a transitive dep)
- Keep ORPC as the client-side RPC framework

**Lines Saved**: 0
**Complexity Reduction**: 3/10
**Risk**: None (just documentation clarity)

---

## Summary by Impact

### High Impact (Do First)
1. **Remove hats-demo duplicates**: 400 lines, complexity 9/10
2. **Leverage React Query built-ins**: 443 lines, complexity 8/10
3. **API route error handling**: 300 lines, complexity 8/10

**Total High Impact**: ~1,143 lines saved, avg complexity reduction 8.3/10

### Medium Impact (Do Next)
4. **Retry logic consolidation**: 120 lines, complexity 7/10
5. **API auth middleware decision**: 62-150 lines, complexity 6/10
6. **Device detection simplification**: 80 lines, complexity 4/10

**Total Medium Impact**: ~262-350 lines saved, avg complexity reduction 5.7/10

### Low Impact (Optional)
7. **Remove unused @floating-ui**: Bundle size only
8. **Dead components cleanup**: 200 lines, complexity 5/10
9. **Dependency audit**: Documentation only

**Total Low Impact**: ~200 lines saved

---

## Overall Recommendations

### Phase 1: Quick Wins (1-2 days)
1. Delete duplicate hats-demo code (grep imports, update, delete)
2. Remove `@floating-ui/react` dependency
3. Consolidate retry logic into utility

**Expected Savings**: ~520 lines, low risk

### Phase 2: Architectural Cleanup (3-5 days)
1. Remove Resource pattern, use React Query directly
2. Standardize API route error handling
3. Decide on API auth middleware approach

**Expected Savings**: ~643-793 lines, medium risk

### Phase 3: Optional Polish (2-3 days)
1. Clean up legacy `/components/` directory
2. Simplify device detection
3. Document ORPC/tRPC separation

**Expected Savings**: ~280 lines, low risk

---

## Testing Strategy

### Before Refactoring
- Run existing tests: `pnpm test`
- Snapshot current behavior: E2E tests for critical flows
- Document current import paths

### During Refactoring
- One category at a time (don't mix concerns)
- Commit after each successful change
- Run tests between changes

### After Refactoring
- Full test suite pass
- Visual regression testing (Playwright)
- Performance benchmarks (Lighthouse)

---

## Risk Mitigation

### Low Risk Items (Safe to start)
- Hats-demo duplication removal
- Unused dependency removal
- Retry logic consolidation

### Medium Risk Items (Needs review)
- Resource pattern removal (affects 15 components)
- API error handling standardization (affects 19 routes)
- API auth middleware decision (architectural choice)

### Rollback Plan
- Feature flag critical changes
- Keep deleted code in git history
- Document import path changes in PR

---

## Metrics

### Before Refactoring
- Total lines: ~5,630
- Custom utilities: 493 lines
- Duplicate code: ~400 lines
- Boilerplate: ~300 lines

### After Refactoring (Projected)
- Total lines: ~4,130-4,430 (27-21% reduction)
- Custom utilities: ~50 lines
- Duplicate code: 0 lines
- Boilerplate: ~50 lines

### Maintainability Gains
- Fewer custom abstractions → easier onboarding
- Leverages standard React Query patterns → better documentation
- Consolidated error handling → consistent UX
- Single source of truth → no version drift

---

## Next Steps

1. **Review this analysis** with team
2. **Prioritize phases** based on project timeline
3. **Create feature branch** for refactoring work
4. **Start with Phase 1** (quick wins, low risk)
5. **Measure impact** after each phase
6. **Document learnings** for future refactoring

---

## Appendix A: File-by-File Analysis

### Hats-Demo Duplicates
```
DELETE:
- components/hats-demo/ActivityLog.tsx
- components/hats-demo/FileTree.tsx
- components/hats-demo/HatContext.tsx
- components/hats-demo/TreeRow.tsx
- components/hats-demo/ContextMenu.tsx
- lib/hat-utils.ts

KEEP:
- modules/marketing/components/hats-demo/* (current)
- lib/hats-demo/* (canonical location)
```

### Resource Pattern Files
```
REMOVE:
- lib/resource.ts (72 lines)
- lib/use-resource-query.ts (120 lines)

SIMPLIFY:
- lib/error-handler.ts (301 → 50 lines)

CREATE:
- lib/query-helpers.ts (50 lines - Zod validation utils)
```

### API Routes to Refactor
```
ALL routes in app/api/v1/:
- checkpoint/route.ts
- snapshots/list/route.ts
- snapshots/metadata/route.ts
- checkpoints/list/route.ts
- checkpoints/metadata/route.ts
- user/me/route.ts
- device-fingerprint/route.ts
- trial-key/route.ts
- rollbacks/route.ts
- telemetry/event/route.ts
- analytics/metrics/route.ts
- billing/create-checkout/route.ts
- waitlist/route.ts
- waitlist/task/route.ts
```

---

**Analysis Completed**: 2025-11-08
**Analyst**: Claude Code (Refactoring Expert Mode)
**Confidence**: High (based on static analysis + package.json audit)
