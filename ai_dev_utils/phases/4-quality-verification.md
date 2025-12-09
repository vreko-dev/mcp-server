# Phase 4: Quality Verification

**Entry:** Refactor phase complete
**Exit:** Gate `quality` passes

---

## Automated Quality Checks

### Check 1: Run Full Test Suite

```bash
pnpm test [TEST_FILE_PATH] --reporter=verbose 2>&1 | tee ai_dev_utils/state/quality-output.txt
```

**Result:**
- [ ] All tests pass
- [ ] No console errors/warnings

---

### Check 2: Assertion Quality Scan

```bash
# Find vague assertions
grep -n "\.toBeTruthy()\|\.toBeDefined()\|\.toBeNull()\s*)\|toBeGreaterThan(" [TEST_FILE]
```

**Output:**
```
[PASTE OUTPUT - should be empty]
```

**Violations found:** [COUNT]

For each violation:
| Line | Current | Should Be |
|------|---------|-----------|
| | | |

**Example fixes:**
```typescript
// ❌ Line 42: expect(result).toBeTruthy();
// ✅ Fix: expect(result).toEqual({ id: '123', status: 'active' });

// ❌ Line 56: expect(result.length).toBeGreaterThan(0);
// ✅ Fix: expect(result).toHaveLength(2);
```

---

### Check 3: 4-Path Coverage

For EACH method implemented, verify all 4 paths:

**Method: `[METHOD_NAME]`**

| Path | Test Name | Line # | Status |
|------|-----------|--------|--------|
| Happy | `should return X when valid input` | | ✅/❌ |
| Sad | `should return error when invalid input` | | ✅/❌ |
| Edge | `should handle empty/boundary case` | | ✅/❌ |
| Error | `should handle exception/failure` | | ✅/❌ |

**Missing paths:** [LIST]

**If paths are missing, add them now:**

#### Happy Path
```typescript
it('should return AI tool counts when valid user', async () => {
  const result = await aggregator.getAIToolCounts('user-123');
  
  expect(result).toEqual([
    { tool: 'code completion', count: 42 },
    { tool: 'code review', count: 15 }
  ]);
});
```

#### Sad Path
```typescript
it('should return empty array when user has no AI usage', async () => {
  const result = await aggregator.getAIToolCounts('new-user');
  
  expect(result).toEqual([]);
});
```

#### Edge Case
```typescript
it('should handle user at boundary (exactly 0 usage)', async () => {
  await db.insert(users).values({ id: 'user-zero', aiUsage: 0 });
  
  const result = await aggregator.getAIToolCounts('user-zero');
  
  expect(result).toEqual([]);
});
```

#### Error Path
```typescript
it('should handle database connection failure', async () => {
  // Mock DB failure
  vi.spyOn(db, 'select').mockRejectedValueOnce(new Error('Connection lost'));
  
  await expect(aggregator.getAIToolCounts('user-123'))
    .rejects
    .toThrow('Connection lost');
});
```

---

### Check 4: Service Layer Compliance

```bash
# Verify no business logic in procedures
grep -n "db\.\|prisma\.\|drizzle\." apps/api/modules/[RELATED_MODULE]/procedures/*.ts
```

**Output:**
```
[PASTE OUTPUT - should be empty or only service calls]
```

**Violations:**
```
[LIST ANY FILES WITH INLINE QUERIES]
```

**If violations found:**
```typescript
// ❌ WRONG - Procedure has inline query
export const handler = async () => {
  const data = await db.select().from(table); // ❌
  return data;
};

// ✅ CORRECT - Procedure uses service
export const handler = async () => {
  const service = new Service(db);
  const data = await service.getData(); // ✅
  return data;
};
```

---

### Check 5: No Skipped/Focused Tests

```bash
grep -n "\.skip\|\.only\|xit\|xdescribe" [TEST_FILE]
```

**Output:**
```
[PASTE OUTPUT - should be empty]
```

**If found:**
- `.only` → Remove (was for debugging)
- `.skip` → Either fix or add GitHub issue reference `[GH-####]`

---

### Check 6: Cleanup Infrastructure

```bash
grep -n "TestCleanupManager\|afterEach" [TEST_FILE]
```

**Output:**
```
[SHOULD SHOW CLEANUP CODE]
```

**Required pattern:**
```typescript
import { TestCleanupManager, setupTestDatabase } from '@/test-utils';

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
});
```

---

### Check 7: No Direct Date() Usage

```bash
grep -n "new Date()" [TEST_FILE] | grep -v "// Expected" | grep -v "mockResolvedValue"
```

**Output:**
```
[SHOULD BE EMPTY]
```

**If violations found:**
```typescript
// ❌ WRONG
const now = new Date();
expect(result.timestamp).toBe(now.getTime());

// ✅ CORRECT
import { DeterministicTime } from '@/test-utils';
const time = new DeterministicTime('2024-01-15T10:00:00Z');
expect(result.timestamp).toBe(time.now());
```

---

### Check 8: Run Automated Quality Script

```bash
# Run the comprehensive quality check
bash tools/test-quality-check.sh
```

**Expected output:**
```
================================================
  TDD Quality Compliance Checker
================================================

[1/5] Checking for vague assertions...
✅ No vague assertions found

[2/5] Checking for direct Date() usage in tests...
✅ No direct Date() usage in tests

[3/5] Checking for cleanup infrastructure...
✅ All test files have cleanup infrastructure

[4/5] Checking for placeholder tests...
✅ No placeholder tests found

[5/5] Checking test file naming convention...
✅ All test files use .test.ts convention

================================================
✅ All TDD compliance checks PASSED

Ready for code review! 🎉
```

**If any check fails:**
- Fix violations
- Re-run script
- Do not proceed until all pass

---

## Quality Score

| Check | Status | Notes |
|-------|--------|-------|
| Tests pass | ✅/❌ | |
| No vague assertions | ✅/❌ | |
| 4-path coverage | ✅/❌ | |
| Service layer compliance | ✅/❌ | |
| No skipped tests | ✅/❌ | |
| Cleanup infrastructure | ✅/❌ | |
| No direct Date() | ✅/❌ | |
| Automated script passes | ✅/❌ | |

**Overall:** PASS / FAIL

---

## Security Verification

### AI-Specific Security Checks

**Run these checks to prevent AI-generated vulnerabilities:**

#### Check 1: No Hardcoded Secrets
```bash
grep -rn "apiKey\|API_KEY\|secret\|password\|token" [TEST_FILE] [IMPLEMENTATION_FILE]
```

**Expected:** Only in test setup/mocks, not in production code

#### Check 2: Input Validation
```typescript
// ✅ REQUIRED - Validate all external inputs
export async function getData(userId: string) {
  if (!userId || typeof userId !== 'string') {
    throw new ValidationError('Invalid userId');
  }
  // ... rest of implementation
}
```

#### Check 3: SQL Injection Prevention
```bash
# Check for string concatenation in queries
grep -n "SELECT.*\${" [IMPLEMENTATION_FILE]
```

**Expected:** Empty (use parameterized queries only)

#### Check 4: No Overly Permissive Patterns
```typescript
// ❌ WRONG
const cors = { origin: '*' };  // Too permissive
const permissions = 'admin';   // Hardcoded privilege escalation

// ✅ CORRECT
const cors = { origin: process.env.ALLOWED_ORIGINS };
const permissions = getUserPermissions(userId);
```

---

## Exit Gate

**Run:**
```bash
./ai_dev_utils/scripts/tdd-gate.sh quality
```

**Gate checks:**
- [ ] All tests pass
- [ ] Zero vague assertions
- [ ] 4-path coverage complete
- [ ] Service layer compliance verified
- [ ] No skipped/focused tests
- [ ] Cleanup infrastructure present
- [ ] No direct Date() usage
- [ ] Automated quality script passes
- [ ] Security checks pass

**If PASS:** Load `@phases/5-certification.md`
**If FAIL:** Fix violations, re-run checks

---

## Common Quality Phase Failures

### Failure 1: Missing Coverage Path

**Problem:**
```
4-Path Coverage:
✅ Happy: should return data when valid user
✅ Sad: should return empty when no data
❌ Edge: [MISSING]
❌ Error: [MISSING]
```

**Fix:** Add missing paths before proceeding.

### Failure 2: Vague Assertions

**Problem:**
```bash
$ grep -n "toBeTruthy" test.ts
42: expect(result).toBeTruthy();
56: expect(data.length).toBeGreaterThan(0);
```

**Fix:** Replace with specific assertions.

### Failure 3: Service Bypass

**Problem:**
```bash
$ grep -n "db\." apps/api/modules/dashboard/procedures/get-metrics.ts
15: const data = await db.select().from(metrics);
```

**Fix:** Move query to service, call service from procedure.

---

**Remember:**
- Quality gates prevent technical debt
- Fix violations now, not later
- Automated checks catch what manual review misses

**Last Updated:** 2025-12-09
