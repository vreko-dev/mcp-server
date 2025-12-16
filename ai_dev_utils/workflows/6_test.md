# Workflow 6: Test

**Purpose:** Fill coverage gaps, add edge cases, improve test quality
**Entry:** Identified coverage gap OR missing test scenarios
**Exit:** Improved test coverage, all tests passing

---

## When to Use This Workflow

- Coverage report shows gaps
- Edge cases identified but not tested
- Flaky tests need fixing
- Test quality audit requested
- After refactoring reveals missing tests

---

## Step 1: Identify Coverage Gaps

### Run Coverage Report

```bash
pnpm test --coverage
```

### Find Untested Code

```bash
# Check specific file coverage
pnpm test --coverage -- --reporter=verbose [file-pattern]
```

### Priority Order

1. **Critical paths** - Auth, data persistence, payment
2. **Error handling** - Catch blocks, error paths
3. **Edge cases** - Boundaries, empty states
4. **Happy paths** - Already tested? Move on

---

## Step 2: Apply 4-Path Coverage Model

For each function/feature, ensure coverage of:

| Path | Description | Example |
|------|-------------|---------|
| **Happy** | Normal flow, valid input | User logs in successfully |
| **Sad** | Invalid input, handled gracefully | Wrong password → error message |
| **Edge** | Boundary conditions | Empty array, max length, null |
| **Error** | Unexpected failures | Network down, DB error |

### Test Template

```typescript
describe("[FeatureName]", () => {
  // Happy path
  it("should succeed with valid input", async () => {
    const result = await feature.execute(validInput);
    expect(result).toEqual(expectedOutput);
  });

  // Sad path
  it("should return error for invalid input", async () => {
    const result = await feature.execute(invalidInput);
    expect(result.error).toBe("Validation failed: missing required field");
  });

  // Edge cases
  it("should handle empty input", async () => {
    const result = await feature.execute([]);
    expect(result).toEqual({ items: [], count: 0 });
  });

  it("should handle maximum allowed items", async () => {
    const maxItems = Array(1000).fill(validItem);
    const result = await feature.execute(maxItems);
    expect(result.count).toBe(1000);
  });

  // Error path
  it("should handle database failure gracefully", async () => {
    vi.mocked(db.query).mockRejectedValue(new Error("Connection lost"));
    
    const result = await feature.execute(validInput);
    
    expect(result.error).toBe("Service unavailable");
    expect(logger.error).toHaveBeenCalled();
  });
});
```

---

## Step 3: Fix Test Quality Issues

### Forbidden Patterns to Fix

```typescript
// ❌ Vague assertion - fix this
expect(result).toBeTruthy();

// ✅ Specific assertion
expect(result).toEqual({ id: "123", status: "active" });
```

```typescript
// ❌ Testing implementation - fix this
expect(component.state.internal).toBe(5);

// ✅ Testing behavior
expect(screen.getByText("Count: 5")).toBeInTheDocument();
```

```typescript
// ❌ Mocking what you test - fix this
const mockService = { method: vi.fn().mockReturnValue(true) };
expect(mockService.method()).toBe(true); // Useless!

// ✅ Testing real code, mocking dependencies
const result = realService.method(input);
expect(mockDependency.called).toBe(true);
```

### Flaky Test Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Random failures | Non-deterministic time | Use `DeterministicTime` |
| Order-dependent | Shared state | Isolate with `beforeEach` |
| Timeout failures | Slow async | Increase timeout or mock |
| Race conditions | Parallel access | Proper async/await |

---

## Step 4: Property-Based Testing (for complex logic)

For functions with many edge cases:

```typescript
import { fc } from 'fast-check';

describe("[ComplexFunction] - Property Tests", () => {
  it("should always return non-negative", () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        const result = complexFunction(n);
        return result >= 0;
      })
    );
  });

  it("should be idempotent", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const once = normalize(s);
        const twice = normalize(normalize(s));
        return once === twice;
      })
    );
  });
});
```

---

## Step 5: Verify Coverage Improvement

```bash
# Before
pnpm test --coverage > coverage-before.txt

# After adding tests
pnpm test --coverage > coverage-after.txt

# Compare
diff coverage-before.txt coverage-after.txt
```

---

## Test Quality Checklist

- [ ] No vague assertions (`.toBeTruthy()`, `.toBeDefined()` alone)
- [ ] No mocking the system under test
- [ ] No testing implementation details
- [ ] 4-path coverage for critical functions
- [ ] No flaky tests
- [ ] Proper async handling
- [ ] Isolated tests (no shared state)

---

## Output Template

```yaml
testing:
  target: "[FILE/FUNCTION]"
  
coverage_before: "[PERCENTAGE]"
coverage_after: "[PERCENTAGE]"

tests_added:
  - name: "[TEST_NAME]"
    path: happy | sad | edge | error
  - name: "[TEST_NAME]"
    path: happy | sad | edge | error

quality_improvements:
  - "[WHAT_WAS_FIXED]"
  
flaky_tests_fixed: [NUMBER]
```

---

## Gate Check

```bash
./ai_dev_utils/scripts/gate.sh test
```

**Passes when:**
- [ ] All tests pass
- [ ] Coverage improved or maintained
- [ ] No forbidden patterns
- [ ] No flaky tests

---

**Last Verified:** 2025-12-16
**Status:** active
