# Phase 3: REFACTOR

**Entry:** GREEN phase complete (test passes with minimal implementation)
**Exit:** Gate `refactor` passes

---

## Golden Rule

> Improve code quality WITHOUT adding new functionality.
> Test MUST still pass after refactoring.

---

## Step 1: Identify Refactoring Opportunities

**Common improvements:**
- [ ] Extract magic numbers to constants
- [ ] Extract repeated logic to helper functions
- [ ] Improve variable names
- [ ] Simplify complex expressions
- [ ] Remove duplication
- [ ] Improve type safety

**Do NOT add:**
- ❌ New features
- ❌ Error handling (needs its own test)
- ❌ Caching (needs its own test)
- ❌ Logging (needs its own test)

---

## Step 2: Refactor in Small Steps

**Pattern: Refactor → Test → Commit**

For each improvement:
1. Make ONE small change
2. Run tests to ensure they still pass
3. Commit if passing

**Example refactoring sequence:**

### Before Refactoring
```typescript
export async function getAIToolCounts(userId: string) {
  const results = await db
    .select({ featureName: featureUsage.featureName, count: count() })
    .from(featureUsage)
    .where(and(
      eq(featureUsage.userId, userId),
      eq(featureUsage.featureCategory, "ai_assistance")
    ))
    .groupBy(featureUsage.featureName);
    
  return results.map((r) => ({
    tool: r.featureName.replace("ai_", "").replace("_", " "),
    count: r.count,
  }));
}
```

### Refactoring 1: Extract constants
```typescript
const AI_FEATURE_CATEGORY = "ai_assistance" as const;

export async function getAIToolCounts(userId: string) {
  const results = await db
    .select({ featureName: featureUsage.featureName, count: count() })
    .from(featureUsage)
    .where(and(
      eq(featureUsage.userId, userId),
      eq(featureUsage.featureCategory, AI_FEATURE_CATEGORY)
    ))
    .groupBy(featureUsage.featureName);
    
  return results.map((r) => ({
    tool: r.featureName.replace("ai_", "").replace("_", " "),
    count: r.count,
  }));
}
```

**Run test:**
```bash
pnpm test [TEST_FILE_PATH]
```
✅ Still passes → Continue

### Refactoring 2: Extract transformation logic
```typescript
const AI_FEATURE_CATEGORY = "ai_assistance" as const;

function formatToolName(featureName: string): string {
  return featureName.replace("ai_", "").replace("_", " ");
}

export async function getAIToolCounts(userId: string) {
  const results = await db
    .select({ featureName: featureUsage.featureName, count: count() })
    .from(featureUsage)
    .where(and(
      eq(featureUsage.userId, userId),
      eq(featureUsage.featureCategory, AI_FEATURE_CATEGORY)
    ))
    .groupBy(featureUsage.featureName);
    
  return results.map((r) => ({
    tool: formatToolName(r.featureName),
    count: r.count,
  }));
}
```

**Run test:**
```bash
pnpm test [TEST_FILE_PATH]
```
✅ Still passes → Continue

### Refactoring 3: Improve type safety
```typescript
const AI_FEATURE_CATEGORY = "ai_assistance" as const;

interface AIToolCount {
  tool: string;
  count: number;
}

function formatToolName(featureName: string): string {
  return featureName.replace("ai_", "").replace("_", " ");
}

export async function getAIToolCounts(userId: string): Promise<AIToolCount[]> {
  const results = await db
    .select({ featureName: featureUsage.featureName, count: count() })
    .from(featureUsage)
    .where(and(
      eq(featureUsage.userId, userId),
      eq(featureUsage.featureCategory, AI_FEATURE_CATEGORY)
    ))
    .groupBy(featureUsage.featureName);
    
  return results.map((r): AIToolCount => ({
    tool: formatToolName(r.featureName),
    count: r.count,
  }));
}
```

**Run test:**
```bash
pnpm test [TEST_FILE_PATH]
```
✅ Still passes → Done

---

## Step 3: Run Full Test Suite

**Execute:**
```bash
pnpm test [TEST_FILE_PATH] --reporter=verbose 2>&1 | tee ai_dev_utils/state/refactor-output.txt
```

**Expected:**
```
✅ PASS  [TEST_FILE]
Test Files  1 passed (1)
     Tests  1 passed (1)
```

**If any test fails:**
- Refactoring broke something
- Revert last change
- Try smaller refactoring step

---

## Step 4: Check for Duplication

**Search for similar code:**
```bash
# Search for similar function names
grep -r "function format" packages/*/src/ apps/*/src/

# Search for similar logic patterns
grep -r "replace.*replace" packages/*/src/ apps/*/src/
```

**Found duplication:**
```
[LIST FILES WITH SIMILAR CODE]
```

**If duplication exists:**
- Consider extracting to shared utility
- But only if used in 3+ places
- Remember: Extract to canonical location (see @TDD_CORE.md)

---

## Step 5: Run Type Checker

**Execute:**
```bash
pnpm type-check
```

**Expected:**
```
✅ No type errors found
```

**If type errors:**
- Fix them
- Refactoring may have introduced type issues

---

## Evidence Collection

**Save output:**
```
ai_dev_utils/state/refactor-output.txt
```

**Document refactorings:**
```bash
jq '.evidence.refactorings = [
  "Extracted AI_FEATURE_CATEGORY constant",
  "Created formatToolName helper",
  "Added AIToolCount interface"
]' ai_dev_utils/state/current-task.json > tmp.json && \
  mv tmp.json ai_dev_utils/state/current-task.json
```

---

## Exit Gate

**Run:**
```bash
./ai_dev_utils/scripts/tdd-gate.sh refactor
```

**Gate checks:**
- [ ] Tests still pass
- [ ] No new functionality added
- [ ] Type checking passes
- [ ] Evidence file exists

**If PASS:** Load `@phases/4-quality-verification.md`
**If FAIL:** Revert changes, retry

---

## Common REFACTOR Phase Mistakes

### ❌ Mistake 1: Adding Features

```typescript
// Before
return results.map(r => ({ tool: r.name, count: r.count }));

// After - WRONG, added new field
return results.map(r => ({ 
  tool: r.name, 
  count: r.count,
  percentage: (r.count / total) * 100  // ❌ New feature!
}));
```

**Fix:** Remove new feature. Add it later with its own test.

### ❌ Mistake 2: Breaking Tests

```typescript
// Before
return { count: results.length };

// After - WRONG, changed return structure
return { total: results.length }; // ❌ Test expects 'count', not 'total'
```

**Fix:** Keep return structure the same, or update test first.

### ❌ Mistake 3: Too Big Refactoring

```typescript
// Refactored entire file at once, tests now fail
// Can't identify which change broke it
```

**Fix:** Refactor in small steps. Test after each change.

---

## Refactoring Checklist

- [ ] Made small, incremental changes
- [ ] Ran tests after each change
- [ ] Tests still pass
- [ ] No new functionality added
- [ ] Type checking passes
- [ ] Code is more readable
- [ ] No duplication created

---

**Remember:**
- Refactoring improves design without changing behavior
- If behavior changes, you're not refactoring
- Always keep tests passing

**Last Updated:** 2025-12-09
