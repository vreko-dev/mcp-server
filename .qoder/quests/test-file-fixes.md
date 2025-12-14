# Test File Database Mock Fixes

## Objective

Fix test files in `apps/api` that fail with "db is undefined" or "Cannot read properties of undefined (reading 'insert')" errors by adding the proper database mock pattern.

## Problem Analysis

Several test files in `apps/api` are mocking `@snapback/platform` incorrectly, using a nested `drizzle.db` structure instead of directly exporting `db`. This causes runtime failures when the actual code imports and uses `db` from `@snapback/platform`.

### Root Cause

The codebase uses this import pattern:
```
import { db } from "@snapback/platform"
```

But some test files mock it incorrectly as:
```
drizzle: { db: { ... } }
```

Instead of the correct pattern:
```
db: { ... }
```

## Files Requiring Fixes

### Category 1: Files with Incorrect Nested Structure

These files mock `@snapback/platform` with `drizzle.db` instead of just `db`:

1. **apps/api/modules/billing/tests/usage-billing.test.ts**
   - Current: `drizzle: { db: { ... } }`
   - Lines: 4-22

2. **apps/api/modules/privacy/tests/privacy-controls.test.ts**
   - Current: `drizzle: { db: { ... } }`
   - Lines: 4-21

3. **apps/api/modules/risk/tests/risk-analysis.test.ts**
   - Current: `drizzle: { db: { ... } }`
   - Lines: 4-20

4. **apps/api/modules/snapshots/tests/snapshots.test.ts**
   - Current: `drizzle: { db: { ... } }`
   - Lines: 5-25
   - **Special case:** Uses `db as drizzle` import alias
   - **Requires TWO changes:**
     1. Update mock structure from `drizzle: { db: {...} }` to `db: {...}`
     2. Update import from `import { db as drizzle }` to `import { db }`
     3. Update all test code references from `drizzle.method()` to `db.method()`
   - **Critical:** Must update both mock AND usage sites or tests will still fail

5. **apps/api/modules/telemetry/tests/enhanced-telemetry.test.ts**
   - Current: `drizzle: mockDrizzle` where `mockDrizzle = { db: { ... } }`
   - Lines: 11-27

6. **apps/api/modules/telemetry/tests/telemetry-proxy.test.ts**
   - Current: `drizzle: { db: { ... } }`
   - Lines: 4-20

7. **apps/api/modules/webhooks/tests/email-orchestrator.test.ts**
   - Current: `drizzle: { db: { ... } }`
   - Lines: 5-14

8. **apps/api/modules/webhooks/tests/inapp-messaging.test.ts**
   - Current: `drizzle: { db: { ... } }`
   - Lines: 5-19

9. **apps/api/modules/webhooks/tests/posthog-handler.test.ts**
   - Current: `drizzle: { db: { ... } }`
   - Lines: 27-61

### Category 2: Files Already Correct

These files already use the correct mock pattern and should NOT be modified:

1. **apps/api/modules/apikeys/tests/api-keys.test.ts**
   - Correct: `db: mockDb` (lines 19-25)
   - Uses `vi.hoisted()` pattern

2. **apps/api/test/integration/auth-middleware.red.test.ts**
   - Correct: `db: { select, query }` (lines 41-46)

3. **apps/api/test/integration/auth-middleware-extended.red.test.ts**
   - Correct: `db: { select, query }` (lines 49-54)

4. **apps/api/test/unit/middleware/auth-unified.test.ts**
   - Correct: `db: { select, update }` (lines 55-60)

## Required Mock Pattern

### Standard Pattern

All test files must use this mock structure:

```
vi.mock('@snapback/platform', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockReturnThis(),
  }
}));
```

### Extended Methods

Some tests may also need these additional methods based on usage:

| Method | Return Type | Purpose |
|--------|-------------|---------|
| `query` | `{ [table]: { findFirst: vi.fn() } }` | Table-specific queries |
| `execute` | `vi.fn().mockResolvedValue([])` | Direct query execution |
| `all` | `vi.fn().mockResolvedValue([])` | Fetch all results |
| `get` | `vi.fn().mockResolvedValue(null)` | Fetch single result |

## Implementation Changes

For each file in Category 1, the mock structure must be updated:

### Change Pattern

| Before | After |
|--------|-------|
| `drizzle: { db: { ... } }` | `db: { ... }` |
| `return { ...actual, drizzle: { db: {...} } }` | `return { ...actual, db: {...} }` |

### Special Handling

#### snapshots.test.ts (CRITICAL - Three-Part Fix)

**File:** `apps/api/modules/snapshots/tests/snapshots.test.ts`

This file requires THREE coordinated changes:

1. **Mock Structure** (Lines 5-25)
   ```typescript
   // BEFORE
   vi.mock("@snapback/platform", () => {
     const actual = vi.importActual("@snapback/platform");
     return {
       ...actual,
       drizzle: {  // ❌ Wrong structure
         db: { ... }
       }
     };
   });
   
   // AFTER
   vi.mock("@snapback/platform", () => ({
     db: {  // ✅ Correct structure
       insert: vi.fn().mockReturnThis(),
       values: vi.fn().mockReturnThis(),
       returning: vi.fn().mockResolvedValue([]),
       // ... other methods
     }
   }));
   ```

2. **Import Statement** (Line 1)
   ```typescript
   // BEFORE
   import { db as drizzle } from "@snapback/platform";
   
   // AFTER
   import { db } from "@snapback/platform";
   ```

3. **All Usage Sites** (Throughout test file - lines 68, 69, 72, 136, 201-204, etc.)
   ```typescript
   // BEFORE
   (drizzle.insert as any).mockReturnThis();
   (drizzle.values as any).mockResolvedValue(...);
   (drizzle.returning as any).mockResolvedValue(...);
   (drizzle.select as any).mockReturnThis();
   
   // AFTER
   (db.insert as any).mockReturnThis();
   (db.values as any).mockResolvedValue(...);
   (db.returning as any).mockResolvedValue(...);
   (db.select as any).mockReturnThis();
   ```

**Verification Steps:**
1. Search for all occurrences of `drizzle.` in the file
2. Replace each with `db.`
3. Count: Should find ~15-20 references
4. Run test to verify no "drizzle is undefined" errors

#### enhanced-telemetry.test.ts
- Uses hoisted mock: `const mockDrizzle = { db: {...} }`
- Change to: `const mockDb = {...}`
- Update mock return from `drizzle: mockDrizzle` to `db: mockDb`

## Validation Criteria

After fixes are applied, each test file must:

1. **Import Validation**
   - Verify import statement: `import { db } from "@snapback/platform"`
   - No alias needed unless required by test logic

2. **Mock Structure Validation**
   - Mock exports `db` at top level
   - No nested `drizzle.db` structure

3. **Method Coverage**
   - All database methods used in tests are mocked
   - Chain-able methods return `this` via `.mockReturnThis()`
   - Terminal methods return resolved promises

4. **Test Execution**
   - All tests pass without "db is undefined" errors
   - All tests pass without "Cannot read properties of undefined" errors

## Implementation Steps

### Step 0: Baseline Verification (REQUIRED)

Before applying any fixes, verify that the identified tests actually fail with database-related errors:

```bash
# Verify these tests actually fail with db errors
for file in \
  apps/api/modules/billing/tests/usage-billing.test.ts \
  apps/api/modules/privacy/tests/privacy-controls.test.ts \
  apps/api/modules/risk/tests/risk-analysis.test.ts \
  apps/api/modules/snapshots/tests/snapshots.test.ts \
  apps/api/modules/telemetry/tests/enhanced-telemetry.test.ts \
  apps/api/modules/telemetry/tests/telemetry-proxy.test.ts \
  apps/api/modules/webhooks/tests/email-orchestrator.test.ts \
  apps/api/modules/webhooks/tests/inapp-messaging.test.ts \
  apps/api/modules/webhooks/tests/posthog-handler.test.ts; do
  echo "=== $file ==="
  pnpm test "$file" 2>&1 | grep -E "undefined|db is|Cannot read" | head -3
done
```

#### Decision Criteria

| Test Output | Action |
|-------------|--------|
| Fails with "db is undefined" or "Cannot read properties of undefined" | ✅ Proceed with fix |
| Fails with different errors | ❌ Wrong diagnosis - investigate actual issue |
| Test passes | ⏭️ Skip file - no fix needed |

#### Documentation Requirements

For each file, record:
1. Current status (Pass/Fail)
2. Exact error message if failing
3. Decision (Fix/Skip/Investigate)

**Critical:** Only proceed to Step 1 if at least one test fails with database mock errors.

## Testing Strategy

### Pre-Implementation

Document baseline from Step 0 verification results

### Post-Implementation

Re-run all tests to verify fixes:
```
pnpm test apps/api/modules --reporter=verbose
```

### Regression Prevention

Verify that previously passing tests remain passing:
```
pnpm test apps/api/modules/apikeys/tests/api-keys.test.ts
pnpm test apps/api/test/integration/auth-middleware.red.test.ts
pnpm test apps/api/test/unit/middleware/auth-unified.test.ts
```

## Expected Outcomes

### Quantitative Metrics

| Metric | Before | After |
|--------|--------|-------|
| Failing test files | 9 | 0 |
| Mock pattern violations | 9 | 0 |
| Test execution errors | Multiple | 0 |

### Qualitative Improvements

1. **Consistency**: All test files use the same database mock pattern
2. **Maintainability**: Clear, predictable mock structure
3. **Debugging**: Easier to identify mock-related issues
4. **Reliability**: Tests fail for correct reasons, not mock configuration

## Change Summary Report Template

After implementation, document changes in this format:

### Baseline Verification Results

| File | Status | Error Message | Decision |
|------|--------|---------------|----------|
| billing/tests/usage-billing.test.ts | Fail/Pass | [exact error] | Fix/Skip |
| privacy/tests/privacy-controls.test.ts | Fail/Pass | [exact error] | Fix/Skip |
| risk/tests/risk-analysis.test.ts | Fail/Pass | [exact error] | Fix/Skip |
| snapshots/tests/snapshots.test.ts | Fail/Pass | [exact error] | Fix/Skip |
| telemetry/tests/enhanced-telemetry.test.ts | Fail/Pass | [exact error] | Fix/Skip |
| telemetry/tests/telemetry-proxy.test.ts | Fail/Pass | [exact error] | Fix/Skip |
| webhooks/tests/email-orchestrator.test.ts | Fail/Pass | [exact error] | Fix/Skip |
| webhooks/tests/inapp-messaging.test.ts | Fail/Pass | [exact error] | Fix/Skip |
| webhooks/tests/posthog-handler.test.ts | Fail/Pass | [exact error] | Fix/Skip |

**Total files requiring fix:** [count]

### File-by-File Changes

### File: [filename]
- **Lines Modified**: [line numbers]
- **Change Type**: Mock structure correction
- **Before**: `drizzle: { db: {...} }`
- **After**: `db: {...}`
- **Additional Changes**: [if any, like import updates or usage site changes]
- **Test Result**: ✅ Pass / ❌ Fail
- **Notes**: [any special handling or discoveries]

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tests don't actually fail with db errors | Medium | High | **Step 0 baseline verification** - prevents wasted effort |
| Tests fail after fix | Low | Medium | Verify mock methods match actual usage |
| Breaking other tests | Low | High | Run full test suite before/after |
| Missing mock methods | Medium | Medium | Add methods as needed based on errors |
| Import alias issues (snapshots.test.ts) | Medium | High | **Three-part fix:** mock + import + usage sites |
| Incomplete usage site updates | Medium | High | Search for ALL `drizzle.` references in snapshots.test.ts |

## Dependencies

### Prerequisites
- Vitest test framework
- `@snapback/platform` package with `db` export
- Node.js test environment configured

### No External Changes Required
- No production code modifications
- No schema changes
- No package.json updates

## Timeline Estimate

| Task | Estimated Time |
|------|----------------|
| **Step 0: Baseline verification** | **10-15 minutes** |
| Fix remaining files (after verification) | 20-30 minutes |
| Run validation tests | 10-15 minutes |
| Document changes | 10-15 minutes |
| **Total** | **50-75 minutes** |

**Note:** Timeline assumes Step 0 confirms failures. If all tests pass, total time is only 10-15 minutes for verification.

## Implementation Notes

### Mock Method Behavior

The mock must replicate Drizzle ORM's query builder pattern:

1. **Builder Methods** (return `this` for chaining):
   - `select()`, `from()`, `where()`, `insert()`, `update()`, `delete()`, `set()`, `values()`, `orderBy()`

2. **Terminal Methods** (return promise):
   - `returning()`, `limit()`, `execute()`, `all()`, `get()`

3. **Special Cases**:
   - `query` object for table-specific operations
   - `mockReturnValue()` vs `mockResolvedValue()` based on sync/async behavior

### Common Pitfalls to Avoid

1. Do not use `vi.importActual()` with incorrect structure
2. Do not nest `db` under `drizzle` key
3. Do not forget to update import statements if using aliases
4. Do not omit frequently-used methods like `orderBy()` or `limit()`
