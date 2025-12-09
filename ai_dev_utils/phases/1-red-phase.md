# Phase 1: RED - Write Failing Test

**Entry:** Architecture audit complete (Phase 0 passed)
**Exit:** Gate `red` passes

---

## Prerequisite Check

Before writing ANY code, confirm:
- [ ] I know the service location: `________________`
- [ ] I know the test location: `________________`
- [ ] I have NOT written any implementation yet

---

## Step 1: Create Test File (if needed)

**Test file path:**
```
[SERVICE_FILE]/__tests__/[SERVICE_NAME].test.ts
```

**Basic structure:**
```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { TestCleanupManager, setupTestDatabase } from '@/test-utils';
// Import the service (will fail - that's expected)
import { ServiceName } from './service-name';

describe('ServiceName', () => {
  let cleanup: TestCleanupManager;

  beforeAll(async () => {
    cleanup = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanup.dispose();
  });

  afterEach(async () => {
    await cleanup.clear();
  });

  describe('methodName', () => {
    // Tests go here
  });
});
```

---

## Step 2: Write the Failing Test

**Test requirements:**
- [ ] Descriptive name: `it("should [BEHAVIOR] when [CONDITION]")`
- [ ] Specific assertions (NO `.toBeTruthy()`, `.toBeDefined()`)
- [ ] Follows Arrange-Act-Assert pattern

**Template:**
```typescript
it('should [SPECIFIC BEHAVIOR] when [SPECIFIC CONDITION]', async () => {
  // Arrange - Set up test data with SPECIFIC values
  const input = {
    userId: 'test-user-123',
    dateRange: { start: '2024-01-01', end: '2024-01-31' }
  };

  // Act - Call the method
  const result = await service.methodName(input);

  // Assert - Check SPECIFIC expected values
  expect(result).toEqual({
    success: true,
    data: {
      count: 42,  // Specific number, not just "truthy"
      items: [    // Specific structure
        { id: 'item-1', value: 100 }
      ]
    }
  });
});
```

**My test:**
```typescript
[PASTE YOUR TEST HERE]
```

---

## Step 3: Run Test (MUST FAIL)

**Execute:**
```bash
pnpm test [TEST_FILE_PATH] 2>&1 | tee ai_dev_utils/state/red-phase-output.txt
```

**Expected failure:**
```
TypeError: service.methodName is not a function
# OR
Error: Cannot find module './service-name'
# OR
Expected: [value]
Received: undefined
```

**Actual output:**
```
[PASTE TEST OUTPUT HERE]
```

---

## Step 4: Verify Failure Type

The test MUST fail because:
- [ ] Method doesn't exist yet (correct)
- [ ] Import fails (correct)
- [ ] Returns wrong value (correct - if testing existing method)

The test MUST NOT fail because:
- [ ] Syntax error (FIX THIS)
- [ ] Timeout (FIX THIS)
- [ ] Test passes (WRONG PHASE)

**If test passes in RED phase:**
You are NOT doing TDD. You wrote implementation before the test.
Delete the implementation and start over.

---

## Step 5: Check for Vague Assertions

**Run automated check:**
```bash
grep -n "\.toBeTruthy()\|\.toBeDefined()\|\.toBeNull()\s*)" [TEST_FILE]
```

**Output:**
```
[SHOULD BE EMPTY]
```

**If violations found:**
Replace with specific assertions:
```typescript
// ❌ VAGUE
expect(result).toBeTruthy();

// ✅ SPECIFIC
expect(result).toEqual({ 
  id: 'snapshot-123', 
  status: 'created',
  timestamp: expect.any(Number)
});
```

---

## Evidence Collection

**Screenshot/output saved to:**
```
ai_dev_utils/state/red-phase-output.txt
```

**Verify evidence exists:**
```bash
cat ai_dev_utils/state/red-phase-output.txt | grep -E "(FAIL|Error|TypeError)"
```

**Expected output:**
```
❌ FAIL  apps/api/src/services/__tests__/metrics-aggregator.test.ts
  ● MetricsAggregator › getAIToolDetectionCounts › should return AI tool counts
    TypeError: aggregator.getAIToolDetectionCounts is not a function
```

**Save test file path to state:**
```bash
jq '.evidence.testFile = "[TEST_FILE_PATH]"' \
  ai_dev_utils/state/current-task.json > tmp.json && \
  mv tmp.json ai_dev_utils/state/current-task.json
```

---

## Exit Gate

**Run:**
```bash
./ai_dev_utils/scripts/tdd-gate.sh red
```

**Gate checks:**
- [ ] Test file exists
- [ ] Test fails (not passes)
- [ ] Failure is correct type (not syntax/timeout)
- [ ] No vague assertions found
- [ ] Evidence file exists

**If PASS:** Load `@phases/2-green-phase.md`
**If FAIL:** Document violation, fix, retry

---

## Common RED Phase Mistakes

### ❌ Mistake 1: Test Passes Immediately
```typescript
// Problem: Implementation already exists
const result = await existingMethod();
expect(result).toBeDefined(); // ✅ Passes in RED - WRONG!
```

**Fix:** Delete implementation first, or test a NEW method.

### ❌ Mistake 2: Syntax Error
```typescript
// Problem: Typo in test
expect(result).toEqqual({ data: 'test' }); // ❌ SyntaxError
```

**Fix:** Fix typo. Test should fail on logic, not syntax.

### ❌ Mistake 3: Vague Assertion
```typescript
// Problem: Too vague
expect(result.length).toBeGreaterThan(0); // Could be 1, 100, or 1000
```

**Fix:** 
```typescript
expect(result).toHaveLength(2);
expect(result[0]).toMatchObject({ id: 'item-1' });
```

---

**Remember:**
- RED phase proves the test is actually testing something
- If test passes in RED, it's useless
- Specific assertions prevent false positives

**Last Updated:** 2025-12-09
