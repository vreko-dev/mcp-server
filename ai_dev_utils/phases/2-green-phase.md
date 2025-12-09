# Phase 2: GREEN - Minimal Implementation

**Entry:** RED phase complete (test fails correctly)
**Exit:** Gate `green` passes

---

## Golden Rule

> Write the MINIMUM code to make the test pass.
> No optimizations. No extra features. No "while I'm here" additions.

---

## Step 1: Implement in Correct Location

**Implementation goes in:**
```
[SERVICE_LOCATION from Phase 0]
```

**NOT in:**
- ❌ Procedure file (business logic doesn't belong here)
- ❌ Controller file (HTTP handling only)
- ❌ New file (unless justified in Phase 0)

---

## Step 2: Write Minimal Implementation

**Template:**
```typescript
// In: apps/api/src/services/[service-name].ts

export async function methodName(input: InputType): Promise<OutputType> {
  // MINIMAL implementation - only what the test requires

  // If test expects { count: 42 }, return exactly that
  // Don't add caching, logging, or error handling YET
  // Those come with their own tests

  return {
    // Match test expectations exactly
  };
}
```

**My implementation:**
```typescript
[PASTE YOUR IMPLEMENTATION HERE]
```

---

## Step 3: Run Test (MUST PASS)

**Execute:**
```bash
pnpm test [TEST_FILE_PATH] 2>&1 | tee ai_dev_utils/state/green-phase-output.txt
```

**Expected:**
```
✅ PASS  apps/api/src/services/__tests__/metrics-aggregator.test.ts
  ● MetricsAggregator › getAIToolDetectionCounts › should return AI tool counts

Test Files  1 passed (1)
     Tests  1 passed (1)
```

**Actual output:**
```
[PASTE TEST OUTPUT HERE]
```

---

## Step 4: Verify Minimalism

Check your implementation:
- [ ] No code that isn't tested
- [ ] No "future-proofing"
- [ ] No error handling (unless tested)
- [ ] No caching (unless tested)
- [ ] No logging (unless tested)
- [ ] No extra features

**If you added extras:** Remove them. They get their own tests.

**Example of minimal vs. over-engineered:**

```typescript
// ❌ OVER-ENGINEERED (not minimal)
export async function getAIToolCounts(userId: string) {
  // Validate input
  if (!userId) throw new Error('Missing userId');
  
  // Log entry
  logger.info('Getting AI tool counts', { userId });
  
  // Query with caching
  const cached = await cache.get(`ai-counts-${userId}`);
  if (cached) return cached;
  
  // Actual query
  const results = await db.query(/* ... */);
  
  // Cache results
  await cache.set(`ai-counts-${userId}`, results, { ttl: 300 });
  
  // Log exit
  logger.info('AI tool counts retrieved', { count: results.length });
  
  return results;
}

// ✅ MINIMAL (only what test requires)
export async function getAIToolCounts(userId: string) {
  const results = await db
    .select({ featureName: featureUsage.featureName, count: count() })
    .from(featureUsage)
    .where(eq(featureUsage.userId, userId))
    .groupBy(featureUsage.featureName);
    
  return results;
}
```

**Why minimal?**
- Validation needs its own test (sad path)
- Caching needs its own test (edge case)
- Logging is infrastructure (separate concern)
- You'll add these when you write tests for them

---

## Step 5: Verify Service Layer Compliance

**Check: No inline DB queries in procedures**

```bash
# If your task involves procedures, verify they use services
grep -n "db\.\|prisma\.\|drizzle\." apps/api/modules/[MODULE]/procedures/[PROCEDURE].ts
```

**Output:**
```
[SHOULD BE EMPTY or only service calls]
```

**Example:**

```typescript
// ❌ WRONG - Procedure has inline DB query
export const getMetricsHandler = async ({ context }) => {
  const results = await db.select().from(metrics); // ❌ Bypasses service
  return results;
};

// ✅ CORRECT - Procedure uses service
export const getMetricsHandler = async ({ context }) => {
  const aggregator = new MetricsAggregator(db);
  const results = await aggregator.getMetrics(); // ✅ Uses service
  return results;
};
```

---

## Evidence Collection

**Screenshot/output saved to:**
```
ai_dev_utils/state/green-phase-output.txt
```

**Save implementation path to state:**
```bash
jq '.evidence.implementationFile = "[IMPLEMENTATION_PATH]"' \
  ai_dev_utils/state/current-task.json > tmp.json && \
  mv tmp.json ai_dev_utils/state/current-task.json
```

---

## Exit Gate

**Run:**
```bash
./ai_dev_utils/scripts/tdd-gate.sh green
```

**Gate checks:**
- [ ] Test passes
- [ ] Implementation in correct service location
- [ ] No direct DB queries in procedures (if applicable)
- [ ] Evidence file exists
- [ ] Implementation is minimal (no untested code)

**If PASS:** Load `@phases/3-refactor-phase.md`
**If FAIL:** Document violation, fix, retry

---

## Common GREEN Phase Mistakes

### ❌ Mistake 1: Over-Engineering

```typescript
// Added caching, validation, logging - NONE are tested
export async function getData(id: string) {
  if (!id) throw new ValidationError(); // ❌ No test for this
  const cached = await cache.get(id);    // ❌ No test for this
  if (cached) return cached;             // ❌ No test for this
  logger.info('Fetching data');          // ❌ No test for this
  return await db.get(id);
}
```

**Fix:** Remove untested code. Add it later with tests.

### ❌ Mistake 2: Service Bypass

```typescript
// Procedure file with inline query
const data = await db.select().from(table); // ❌ Bypasses service
```

**Fix:** Move query to service, call service from procedure.

### ❌ Mistake 3: Still Failing Test

```typescript
// Implementation doesn't match test expectations
// Test expects: { count: 42, items: [...] }
// Implementation returns: { total: 42, data: [...] } // ❌ Keys don't match
```

**Fix:** Make implementation match test expectations exactly.

---

**Remember:**
- Minimal means "just enough to pass the test"
- You can add features later with their own tests
- Passing test proves implementation is correct for this case

**Last Updated:** 2025-12-09
