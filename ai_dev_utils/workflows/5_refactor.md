# Workflow 5: Refactor

**Purpose:** Code quality improvements without changing behavior
**Entry:** Working code that needs cleanup OR identified tech debt
**Exit:** Improved code, same behavior, all tests passing

---

## Refactoring Principles

1. **Behavior preserved** - Same inputs → same outputs
2. **Tests pass** - Run after EVERY change
3. **Small steps** - One refactoring at a time
4. **No new features** - That's a different workflow

---

## Pre-Refactor Checklist

Before changing anything:

```bash
# 1. Verify all tests pass
pnpm test --run

# 2. Note current coverage
pnpm test --coverage

# 3. Check for existing tests on target code
grep -l "[TARGET_FUNCTION]" **/*.test.ts
```

**If no tests exist for target code:**
- STOP
- Write characterization tests first
- Then proceed with refactoring

---

## Common Refactoring Patterns

### 1. Extract Duplicate Code

**Before:**
```typescript
// File A
const result = await db.select().from(table).where(eq(table.id, id));
if (!result) throw new Error("Not found");

// File B (same code)
const result = await db.select().from(table).where(eq(table.id, id));
if (!result) throw new Error("Not found");
```

**After:**
```typescript
// Extracted to canonical location
export async function findById(id: string) {
  const result = await db.select().from(table).where(eq(table.id, id));
  if (!result) throw new Error("Not found");
  return result;
}
```

### 2. Extract Constants

**Before:**
```typescript
if (retryCount > 3) { ... }
setTimeout(callback, 5000);
```

**After:**
```typescript
const MAX_RETRIES = 3;
const TIMEOUT_MS = 5000;

if (retryCount > MAX_RETRIES) { ... }
setTimeout(callback, TIMEOUT_MS);
```

### 3. Improve Naming

**Before:**
```typescript
const d = getData();
const p = processData(d);
```

**After:**
```typescript
const userData = fetchUserData();
const normalizedUser = normalizeUserData(userData);
```

### 4. Simplify Conditionals

**Before:**
```typescript
if (user && user.isActive && user.role === "admin") {
  if (user.permissions.includes("write")) {
    // do thing
  }
}
```

**After:**
```typescript
const canWrite = isActiveAdmin(user) && hasPermission(user, "write");
if (canWrite) {
  // do thing
}
```

---

## Refactoring Workflow

### Step 1: Identify Target

```yaml
target:
  file: "[PATH]"
  function: "[NAME]"
  issue: "duplicate | complex | poor naming | long function"
```

### Step 2: Write Characterization Test (if missing)

```typescript
describe("[FunctionName] - Characterization", () => {
  it("captures current behavior", () => {
    const input = { /* current input */ };
    const result = functionName(input);
    
    // Capture ACTUAL current output
    expect(result).toMatchSnapshot();
  });
});
```

### Step 3: Make One Change

- One refactoring at a time
- Commit after each successful change

### Step 4: Verify

```bash
pnpm test --run
```

**If tests fail:**
- Undo change
- Investigate why
- Try smaller step

### Step 5: Repeat

Continue until refactoring complete.

---

## Canonical Locations for Extraction

When extracting shared code, put it in the right place:

| Type | Location |
|------|----------|
| Error utilities | `@snapback-oss/sdk/utils/errorHelpers.ts` |
| Retry logic | `@snapback-oss/sdk/utils/retry.ts` |
| Type utilities | `@snapback/contracts` |
| API service helpers | `apps/api/src/utils/` |
| VS Code helpers | `apps/vscode/src/utils/` |
| Web helpers | `apps/web/lib/` |

---

## Config/Schema Migration Rules

For any config or schema refactoring:

1. **Version the schema** - Add `{ version: number }`
2. **Write migration** - `migrate(v1) → v2`
3. **Test with fixtures** - 20+ scenarios
4. **Support rollback** - Backward compatibility

```typescript
// Example migration
function migrateV1ToV2(config: ConfigV1): ConfigV2 {
  return {
    version: 2,
    ...config,
    newField: deriveNewField(config),
  };
}
```

---

## Output Template

```yaml
refactoring:
  target: "[FILE:FUNCTION]"
  type: "extract | rename | simplify | consolidate"
  
before:
  lines: [NUMBER]
  complexity: "[DESCRIPTION]"
  
after:
  lines: [NUMBER]
  complexity: "[DESCRIPTION]"
  extracted_to: "[PATH_IF_APPLICABLE]"
  
verification:
  tests_passed: true
  behavior_preserved: true
  coverage_maintained: true
```

---

## Gate Check

```bash
./ai_dev_utils/scripts/gate.sh refactor
```

**Passes when:**
- [ ] All tests still pass
- [ ] No behavior changes
- [ ] Code quality measurably improved
- [ ] Extracted code in canonical location

---

**Last Verified:** 2025-12-16
**Status:** active
