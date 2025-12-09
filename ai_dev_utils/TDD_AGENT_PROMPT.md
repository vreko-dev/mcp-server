# TDD Red-Green-Refactor Prompt for Coding Agents

**Purpose:** Ensure coding agents perform thorough Test-Driven Development without shortcuts, placeholder tests, or useless tests, while maintaining strict architectural compliance.

**Authority:** This prompt synthesizes 12 comprehensive testing documents (~9,000 lines) + real-world architecture violation analysis into actionable rules.

**Zero Tolerance:** Violations of FORBIDDEN patterns OR architectural bypasses will fail code review and CI/CD checks.

**Critical Update (2025-12-09):** Added mandatory STEP 0 (Architecture Audit) to prevent service layer bypasses and duplicate logic creation.

---

## 🚨 CRITICAL RULES (ZERO TOLERANCE)

### FORBIDDEN PATTERNS (Will Fail Code Review)

These patterns create useless tests and are **NEVER** allowed:

#### ❌ FORBIDDEN #1: Placeholder Tests
```typescript
// ❌ FORBIDDEN - Tests nothing
it("should do something", () => {
  expect(true).toBe(true);
});

// ❌ FORBIDDEN - Empty test
it("should validate input", () => {
  // TODO: implement
});

// ❌ FORBIDDEN - Tautology
it("should return true", () => {
  expect(true).toBe(true);
});
```

#### ❌ FORBIDDEN #2: TODO Markers Without Implementation
```typescript
// ❌ FORBIDDEN - TODO never implemented
it.todo("should handle edge case");

// ❌ FORBIDDEN - Comment TODO
it("should validate", () => {
  // TODO: add actual validation
  expect(result).toBeDefined();
});
```

#### ❌ FORBIDDEN #3: .skip Without GitHub Issue
```typescript
// ❌ FORBIDDEN - Skip without tracking
it.skip("should handle timeout", () => { ... });

// ✅ ALLOWED - Skip with issue reference
it.skip("should handle timeout [GH-1234]", () => { ... });
```

#### ❌ FORBIDDEN #4: Vague Assertions
```typescript
// ❌ FORBIDDEN - What is "truthy"? Could be "", 0, [], {}
expect(result).toBeTruthy();

// ❌ FORBIDDEN - Too vague
expect(result).toBeDefined();

// ✅ REQUIRED - Specific assertion
expect(result).toEqual({ id: "123", name: "test", active: true });
```

#### ❌ FORBIDDEN #5: Testing Implementation Details
```typescript
// ❌ FORBIDDEN - Couples to internal state
expect(component.state.internalCounter).toBe(5);

// ✅ REQUIRED - Tests observable behavior
expect(screen.getByText("Count: 5")).toBeInTheDocument();
```

#### ❌ FORBIDDEN #6: Mocking What You're Testing
```typescript
// ❌ FORBIDDEN - Mocks the entire thing being tested
const mockValidator = { validate: vi.fn().mockReturnValue(true) };
expect(mockValidator.validate()).toBe(true); // Of course it returns true!

// ✅ REQUIRED - Tests real code, mocks dependencies
const result = validator.validate(input); // Real validator
expect(mockLogger.info).toHaveBeenCalled(); // Mocked dependency
```

#### ❌ FORBIDDEN #7: Writing Production Code Without Failing Test
```typescript
// ❌ FORBIDDEN WORKFLOW:
// 1. Write function implementation
// 2. Write test that passes immediately
// Result: Test doesn't prove anything

// ✅ REQUIRED WORKFLOW (TDD):
// 1. Write test (MUST fail)
// 2. Write minimal code to pass
// 3. Refactor
```

#### ❌ FORBIDDEN #8: Bypassing Existing Services/Aggregators

```typescript
// ❌ FORBIDDEN - Inline DB query when MetricsAggregator exists
// apps/api/modules/dashboard/procedures/get-metrics.ts
const aiBreakdown = await db
  .select({ featureName: featureUsage.featureName, count: count() })
  .from(featureUsage)
  .where(eq(featureUsage.userId, userId))
  .groupBy(featureUsage.featureName);
// Problem: Bypasses MetricsAggregator service, creates duplicate logic

// ✅ REQUIRED - Use existing service
// apps/api/modules/dashboard/procedures/get-metrics.ts
const metricsAggregator = new MetricsAggregator(db);
const aiBreakdown = await metricsAggregator.getAIToolDetectionCounts(userId);
// Correct: Uses service layer, follows architecture
```

**How to verify before implementing:**

```bash
# 1. Search for existing services in domain
find apps/api/src/services -name "*<domain>*"

# 2. Example: For metrics feature
find apps/api/src/services -name "*metrics*"
# Output: apps/api/src/services/metrics-aggregator.ts ← Service exists!

# 3. Read the service file
cat apps/api/src/services/metrics-aggregator.ts
# Check: Does it have the method you need?
#   - YES → Use it
#   - NO → Add method to service (don't bypass!)
```

**Enforcement Rules:**

If a service exists for your domain, you MUST:
1. ✅ Add methods to the existing service
2. ✅ Test the service methods (not inline queries)
3. ✅ Use the service in procedures/routes
4. ❌ NEVER write inline DB queries in procedures
5. ❌ NEVER bypass service layer "because it's faster"

**Real-World Example:**

```typescript
// SCENARIO: Need to get AI tool detection counts

// ❌ WRONG APPROACH (bypasses architecture)
// File: apps/api/modules/dashboard/procedures/get-metrics.ts
export const getMetricsHandler = async ({ context }) => {
  const { userId } = context;
  
  // Inline DB query (FORBIDDEN!)
  const aiBreakdownResult = await db
    .select({ featureName: featureUsage.featureName, count: count() })
    .from(featureUsage)
    .where(and(
      eq(featureUsage.userId, userId),
      eq(featureUsage.featureCategory, "ai_assistance")
    ))
    .groupBy(featureUsage.featureName);
  
  // Map results...
};

// ✅ CORRECT APPROACH (follows architecture)
// File: apps/api/src/services/metrics-aggregator.ts
export class MetricsAggregator {
  // Add method to service
  async getAIToolDetectionCounts(userId: string) {
    const results = await this.db
      .select({ featureName: featureUsage.featureName, count: count() })
      .from(featureUsage)
      .where(and(
        eq(featureUsage.userId, userId),
        eq(featureUsage.featureCategory, "ai_assistance")
      ))
      .groupBy(featureUsage.featureName);
    
    return this.mapToAIBreakdown(results);
  }
}

// File: apps/api/modules/dashboard/procedures/get-metrics.ts
export const getMetricsHandler = async ({ context }) => {
  const { userId } = context;
  const metricsAggregator = new MetricsAggregator(db);
  
  // Use service (CORRECT!)
  const aiBreakdown = await metricsAggregator.getAIToolDetectionCounts(userId);
};
```

---

## ✅ MANDATORY TDD WORKFLOW

### The Red-Green-Refactor Cycle

**EVERY feature MUST follow this exact cycle. NO EXCEPTIONS.**

### 🔍 STEP 0: ARCHITECTURE AUDIT (MANDATORY BEFORE RED)

**CRITICAL: Run this architectural compliance check BEFORE writing any tests.**

**This step prevents:**
- ❌ Bypassing existing services/aggregators
- ❌ Creating duplicate logic in wrong layers
- ❌ Violating canonical location rules
- ❌ Testing implementation that doesn't match architecture docs

#### Mandatory Checklist (MUST complete ALL items):

##### 1. Search for Existing Services/Aggregators

```bash
# Search for domain-specific services
find apps/api/src/services -name "*aggregator*" -o -name "*service*" -o -name "*manager*"

# Search for similar functionality
grep -r "<feature-name>" apps/api/src/services/

# Example: For metrics feature
find apps/api/src/services -name "*metrics*"
# → Found: metrics-aggregator.ts ✅
```

**Decision Tree:**
- ✅ **No service found** → Proceed with inline implementation (document why)
- ❌ **Service exists** → MUST add methods to service (never bypass)
- ⚠️ **Uncertain** → Ask team/check architecture docs

##### 2. Review Architecture Documentation

```bash
# Check for architecture plans mentioning this task
grep -r "Task <X.X>" docs/architecture/ ai_dev_utils/ *.md

# Check remediation roadmaps
cat INTEGRATION_GAPS_REMEDIATION_ROADMAP.md | grep -A 10 "<task-id>"
cat PHASE_4_QUICK_START.md | grep -A 10 "<feature-name>"
```

**Questions to answer:**
- [ ] Does architecture doc specify WHERE to implement this?
- [ ] Does it reference a specific service/class/module?
- [ ] Are there abstraction layer requirements?
- [ ] Are there integration points documented?

##### 3. Check Canonical Locations

```bash
# Review consolidation rules
cat docs/rules/always-code-consolidation.md

# Search for existing patterns
grep -r "similar-functionality" packages/ apps/
```

**Canonical Location Rules:**
| Component | Location | Status |
|-----------|----------|--------|
| Error Handling | `@snapback-oss/sdk/utils/errorHelpers.ts` | ✅ Use this |
| Retry Logic | `@snapback-oss/sdk/utils/retry.ts` | ✅ Use this |
| Logger | `@snapback/infrastructure/logging/logger.ts` | ✅ Use this |
| **Metrics** | `apps/api/src/services/metrics-aggregator.ts` | ✅ Use this |
| Auth | `@snapback/auth` | ✅ Use this |
| Validation | `apps/api/middleware/validation.ts` | ✅ Use this |

##### 4. Verify Abstraction Layer

**Critical Questions:**
- [ ] Am I testing the **correct layer**? (service vs procedure vs controller)
- [ ] Will this create **duplicate logic**?
- [ ] Does this violate **Single Responsibility Principle**?
- [ ] Am I bypassing an **existing abstraction**?

**Example - Correct Layer Identification:**

```typescript
// ❌ WRONG LAYER: Inline DB query in procedure
// apps/api/modules/dashboard/procedures/get-metrics.ts
const aiBreakdown = await db
  .select({ featureName: featureUsage.featureName, count: count() })
  .from(featureUsage)
  .where(eq(featureUsage.userId, userId))
  .groupBy(featureUsage.featureName);

// ✅ CORRECT LAYER: Service encapsulates logic
// apps/api/src/services/metrics-aggregator.ts
export class MetricsAggregator {
  async getAIToolDetectionCounts(userId: string) {
    return await this.db
      .select({ featureName: featureUsage.featureName, count: count() })
      .from(featureUsage)
      .where(eq(featureUsage.userId, userId))
      .groupBy(featureUsage.featureName);
  }
}

// apps/api/modules/dashboard/procedures/get-metrics.ts
const aiBreakdown = await metricsAggregator.getAIToolDetectionCounts(userId);
```

##### 5. Document Architecture Audit Results

**Before proceeding to RED phase, document your findings:**

```markdown
## Architecture Audit - Task <X.X>

### Services Found:
- ✅ MetricsAggregator exists at apps/api/src/services/metrics-aggregator.ts
- Methods: getUserLifetimeMetrics(), getDailyMetricsForRange()
- Missing: getAIToolDetectionCounts() ← NEED TO ADD

### Architecture Docs:
- PHASE_4_QUICK_START.md line 45: "Add methods to MetricsAggregator"
- arch_remediation.md: Specifies service layer pattern

### Canonical Location:
- Metrics logic belongs in MetricsAggregator (confirmed)

### Abstraction Layer:
- Service layer: MetricsAggregator.getAIToolDetectionCounts()
- Procedure layer: get-metrics.ts calls service method

### Decision:
✅ Proceed with adding method to MetricsAggregator
❌ Do NOT add inline query to get-metrics.ts
```

#### 🚨 FORBIDDEN: Skipping Architecture Audit

```typescript
// ❌ FORBIDDEN WORKFLOW - Jump to implementation
describe("get-metrics", () => {
  it("should query featureUsage table", async () => {
    // Tests inline DB query (bypasses MetricsAggregator!)
    const result = await db.select().from(featureUsage)...;
  });
});

// ✅ REQUIRED WORKFLOW - Architecture audit first
// 1. Search: find apps/api/src/services -name "*metrics*"
//    → Found MetricsAggregator ✅
// 2. Read: cat apps/api/src/services/metrics-aggregator.ts
//    → Missing getAIToolDetectionCounts() method
// 3. Decide: Add method to service (not inline query)
// 4. Write RED test for SERVICE method:

describe("MetricsAggregator", () => {
  describe("getAIToolDetectionCounts", () => {
    it("should return AI tool usage from featureUsage table", async () => {
      // Test the SERVICE layer (correct abstraction)
      const result = await aggregator.getAIToolDetectionCounts("user-123");
      expect(result).toEqual({ copilot: 7, cursor: 3, claude: 0, windsurf: 0 });
    });
  });
});
```

#### Verification Checklist:

- [ ] **Searched for services** (ran `find` command, documented results)
- [ ] **Read architecture docs** (checked roadmaps, remediation plans)
- [ ] **Verified canonical location** (no duplicate logic will be created)
- [ ] **Confirmed abstraction layer** (service vs procedure vs controller)
- [ ] **Documented audit results** (added to commit message or PR description)
- [ ] **No existing patterns bypassed** (using services, not bypassing them)

**Time Investment:** 5-10 minutes
**Value:** Prevents hours of refactoring + architectural debt

---

### 🔴 STEP 1: RED (Write Failing Test)

**MANDATORY REQUIREMENTS:**
1. Write test BEFORE implementation
2. Test MUST fail for the RIGHT reason
3. Run test and VERIFY it fails
4. Never skip RED phase

**Example:**
```typescript
describe("ProtectionLevel.Block", () => {
  describe("handleSave", () => {
    it("should prevent save when user declines confirmation", async () => {
      // ARRANGE
      const mockFile = { path: "/test.ts", content: "const x = 1;" };
      mockShowWarningMessage.mockResolvedValue(undefined); // User clicks X

      // ACT
      const result = await ProtectionLevel.Block.handleSave(mockFile);

      // ASSERT - These MUST fail initially
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("BLOCKED");
      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        "This file is protected. Override protection?",
        "Override",
        "Cancel"
      );
    });
  });
});

// RUN TEST → MUST see error like:
// "Cannot read property 'Block' of undefined"
// OR "Expected false, received undefined"
```

### 🟢 STEP 2: GREEN (Minimal Implementation)

**MANDATORY REQUIREMENTS:**
1. Write ONLY enough code to pass the test
2. No extra features
3. No premature optimization
4. Run test and VERIFY it passes

**Example:**
```typescript
// Write MINIMAL code to pass
export const ProtectionLevel = {
  Block: {
    handleSave: async (file: File): Promise<SaveResult> => {
      const choice = await vscode.window.showWarningMessage(
        "This file is protected. Override protection?",
        "Override",
        "Cancel"
      );

      return {
        allowed: false,
        reason: "BLOCKED"
      };
    }
  }
};

// RUN TEST → MUST pass now
```

### 🔵 STEP 3: REFACTOR (Clean Up)

**MANDATORY REQUIREMENTS:**
1. Refactor WITHOUT changing behavior
2. Extract functions, rename variables, improve readability
3. NO new functionality
4. Run test and VERIFY it still passes

**Example:**
```typescript
// Refactor for clarity (behavior unchanged)
export const ProtectionLevel = {
  Block: {
    handleSave: async (file: File): Promise<SaveResult> => {
      const userConfirmed = await showProtectionWarning(file.path);

      if (userConfirmed) {
        return { allowed: true, reason: "USER_OVERRIDE" };
      }

      return { allowed: false, reason: "BLOCKED" };
    }
  }
};

async function showProtectionWarning(filePath: string): Promise<boolean> {
  const choice = await vscode.window.showWarningMessage(
    `File ${filePath} is protected. Override?`,
    "Override",
    "Cancel"
  );

  return choice === "Override";
}

// RUN TEST → MUST still pass (behavior unchanged)
```

### ⚠️ CRITICAL: Never Skip RED Phase

```typescript
// ❌ FORBIDDEN - Writing code without failing test
function createSnapshot(path: string): Snapshot {
  // Implementation written first
  return { id: generateId(), path, timestamp: Date.now() };
}

// Then writing test that passes immediately
it("should create snapshot", () => {
  const snapshot = createSnapshot("/test.ts");
  expect(snapshot.id).toBeDefined(); // ❌ Passes immediately, proves nothing
});

// ✅ REQUIRED - Test first, MUST see it fail
it("should create snapshot", () => {
  const snapshot = createSnapshot("/test.ts"); // Error: createSnapshot is not defined
  expect(snapshot.id).toBeDefined();
});
// THEN implement minimal code
```

---

## 📋 REQUIRED COVERAGE: 4-PATH MODEL

**MANDATORY: Every public function MUST test all 4 paths.**

### Path 1: Happy Path (Expected Success)

```typescript
describe("createSnapshot", () => {
  it("should create snapshot with valid file path", async () => {
    // ARRANGE
    const filePath = "/valid/file.ts";
    mockFs.readFile.mockResolvedValue("const x = 1;");
    mockStorage.save.mockResolvedValue(undefined);

    // ACT
    const result = await createSnapshot(filePath);

    // ASSERT
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toMatchObject({
        id: expect.stringMatching(/^snap_[a-z0-9]{12}$/),
        filePath: "/valid/file.ts",
        content: "const x = 1;",
        timestamp: expect.any(Number)
      });
    }
  });
});
```

### Path 2: Sad Path (Expected Failures)

```typescript
describe("createSnapshot - validation failures", () => {
  it("should return error for empty file path", async () => {
    const result = await createSnapshot("");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/invalid file path/i);
      expect(result.error.name).toBe("SnapshotCreationError");
    }
  });

  it("should return error for non-existent file", async () => {
    mockFs.readFile.mockRejectedValue(new Error("ENOENT: no such file"));

    const result = await createSnapshot("/does/not/exist.ts");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/file not found/i);
    }
  });
});
```

### Path 3: Edge Cases (Boundaries)

```typescript
describe("createSnapshot - edge cases", () => {
  it("should handle empty file (0 bytes)", async () => {
    mockFs.readFile.mockResolvedValue("");

    const result = await createSnapshot("/empty.ts");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.content).toBe("");
    }
  });

  it("should handle extremely large files (10MB+)", async () => {
    const largeContent = "x".repeat(10 * 1024 * 1024);
    mockFs.readFile.mockResolvedValue(largeContent);

    const result = await createSnapshot("/large.ts");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.content.length).toBe(10 * 1024 * 1024);
    }
  });

  it("should handle files with special characters in path", async () => {
    mockFs.readFile.mockResolvedValue("content");

    const result = await createSnapshot("/path/with spaces/file-名前.ts");

    expect(result.success).toBe(true);
  });

  it("should handle null bytes in file content", async () => {
    mockFs.readFile.mockResolvedValue("line1\0line2");

    const result = await createSnapshot("/test.ts");

    expect(result.success).toBe(true);
  });
});
```

### Path 4: Error Cases (Unexpected Failures)

```typescript
describe("createSnapshot - error handling", () => {
  it("should handle storage write failures", async () => {
    mockFs.readFile.mockResolvedValue("content");
    mockStorage.save.mockRejectedValue(new Error("ENOSPC: disk full"));

    const result = await createSnapshot("/test.ts");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/storage failed/i);
      expect(result.error.cause?.message).toMatch(/disk full/i);
    }
  });

  it("should handle file read permission errors", async () => {
    mockFs.readFile.mockRejectedValue(new Error("EACCES: permission denied"));

    const result = await createSnapshot("/protected.ts");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/permission denied/i);
    }
  });

  it("should handle network timeout during cloud storage", async () => {
    mockStorage.save.mockRejectedValue(new Error("ETIMEDOUT"));

    const result = await createSnapshot("/test.ts");

    expect(result.success).toBe(false);
  });
});
```

**VERIFICATION:** Every function MUST have tests in all 4 categories.

---

## 🎯 MEANINGFUL ASSERTION PATTERNS

### Pattern 1: Exact Value Matching

```typescript
// ✅ GOOD - Exact equality
expect(result).toEqual({
  id: "snap_abc123",
  name: "test",
  active: true
});

// ✅ GOOD - Primitive values
expect(count).toBe(5);
expect(message).toBe("Success");
expect(isValid).toBe(true);

// ❌ BAD - Too vague
expect(result).toBeTruthy(); // What is it? "", 0, [], {}?
expect(result).toBeDefined(); // Still doesn't tell us what it is
expect(result).not.toBeNull(); // Too generic
```

### Pattern 2: Property Existence + Type + Format

```typescript
// ✅ GOOD - Specific property checks
expect(result).toHaveProperty("id");
expect(typeof result.id).toBe("string");
expect(result.id).toMatch(/^snap_[a-z0-9]{12}$/);

// ✅ GOOD - Partial object matching
expect(result).toMatchObject({
  id: expect.stringMatching(/^snap_/),
  timestamp: expect.any(Number),
  status: "active"
});

// ❌ BAD - Property exists but could be null/undefined
expect("id" in result).toBe(true); // id: undefined passes!
```

### Pattern 3: Array/Collection Assertions

```typescript
// ✅ GOOD - Specific length + content
expect(snapshots).toHaveLength(3);
expect(snapshots[0]).toMatchObject({
  id: "1",
  name: "First"
});

// ✅ GOOD - Array contains specific items
expect(tags).toContain("production");
expect(tags).toEqual(expect.arrayContaining(["test", "demo"]));

// ✅ GOOD - All items match predicate
expect(snapshots.every(s => s.id.startsWith("snap_"))).toBe(true);

// ❌ BAD - Just checks array exists
expect(Array.isArray(snapshots)).toBe(true); // Empty array passes!

// ❌ BAD - Doesn't check content
expect(snapshots.length > 0).toBe(true); // Could be [null, null]
```

### Pattern 4: Function Call Verification

```typescript
// ✅ GOOD - Specific call count + arguments
expect(mockLogger.error).toHaveBeenCalledTimes(1);
expect(mockLogger.error).toHaveBeenCalledWith(
  "Snapshot creation failed",
  expect.objectContaining({
    error: "File not found",
    path: "/test/file.ts"
  })
);

// ✅ GOOD - Call order verification
expect(mockLogger.info).toHaveBeenNthCalledWith(1, "Starting");
expect(mockLogger.info).toHaveBeenNthCalledWith(2, "Complete");

// ❌ BAD - Just checks it was called
expect(mockLogger.error).toHaveBeenCalled(); // Could be wrong args

// ❌ BAD - Doesn't verify arguments
expect(mockLogger.error.mock.calls.length).toBe(1);
```

### Pattern 5: Error Assertions

```typescript
// ✅ GOOD - Specific error type + message
await expect(
  createSnapshot("/invalid/path")
).rejects.toThrow(SnapshotCreationError);

await expect(
  createSnapshot("/invalid/path")
).rejects.toThrow("File not found: /invalid/path");

// ✅ GOOD - Error properties
try {
  await createSnapshot("/invalid");
  fail("Should have thrown");
} catch (error) {
  expect(error).toBeInstanceOf(SnapshotCreationError);
  expect(error.message).toMatch(/file not found/i);
  expect(error.filePath).toBe("/invalid");
  expect(error.cause).toBeDefined();
}

// ❌ BAD - Just checks it throws
await expect(createSnapshot("/invalid")).rejects.toThrow();

// ❌ BAD - Generic error check
try {
  await createSnapshot("/invalid");
} catch (error) {
  expect(error).toBeDefined(); // Too vague
}
```

### Pattern 6: Architectural Compliance Assertions

**CRITICAL: Tests MUST verify the correct abstraction layer is being used.**

```typescript
// ✅ GOOD - Tests service layer (correct abstraction)
describe("MetricsAggregator", () => {
  describe("getAIToolDetectionCounts", () => {
    it("should return AI tool usage from featureUsage table", async () => {
      // Arrange - Mock database at service layer
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockResolvedValue([
            { featureName: "copilot", count: 7 },
            { featureName: "cursor", count: 3 }
          ])
        })
      };
      const aggregator = new MetricsAggregator(mockDb);

      // Act - Test the SERVICE method
      const result = await aggregator.getAIToolDetectionCounts("user-123");

      // Assert - Verify service returns aggregated data
      expect(result).toEqual({
        copilot: 7,
        cursor: 3,
        claude: 0,
        windsurf: 0
      });
      
      // Verify service used correct query
      expect(mockDb.select).toHaveBeenCalledWith({
        featureName: expect.anything(),
        count: expect.any(Function)
      });
    });
  });
});

// ✅ GOOD - Procedure tests use service (not inline queries)
describe("get-metrics procedure", () => {
  it("should fetch AI breakdown from MetricsAggregator", async () => {
    // Arrange - Mock the SERVICE, not the database
    const mockAggregator = {
      getAIToolDetectionCounts: vi.fn().mockResolvedValue({
        copilot: 5,
        cursor: 2,
        claude: 1,
        windsurf: 0
      })
    };

    // Act - Procedure calls service
    const result = await getMetricsHandler({ 
      context: { userId: "user-123" },
      services: { metricsAggregator: mockAggregator }
    });

    // Assert - Verify service was called (not DB directly)
    expect(mockAggregator.getAIToolDetectionCounts).toHaveBeenCalledWith("user-123");
    expect(result.ai_breakdown).toEqual({
      copilot: 5,
      cursor: 2,
      claude: 1,
      windsurf: 0
    });
  });
});

// ❌ BAD - Tests inline DB query in procedure (wrong layer)
describe("get-metrics procedure", () => {
  it("should query featureUsage directly", async () => {
    // ❌ WRONG: Testing inline query bypasses service layer!
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([...])
      })
    };

    const result = await getMetricsHandler({ db: mockDb });
    
    // This test encourages bypassing MetricsAggregator!
    expect(mockDb.select).toHaveBeenCalled();
  });
});

// ❌ BAD - Tests implementation details, not service contract
describe("MetricsAggregator", () => {
  it("should call db.select with groupBy", async () => {
    // ❌ WRONG: Tests HOW (implementation), not WHAT (contract)
    const mockDb = { select: vi.fn() };
    await aggregator.getAIToolDetectionCounts("user-123");
    
    expect(mockDb.select).toHaveBeenCalled(); // Too vague
  });
});
```

**Architectural Compliance Rules:**

1. **Service Layer Tests**:
   - ✅ Test public methods (contract)
   - ✅ Mock database/external dependencies
   - ✅ Verify return values match expected schema
   - ❌ Never test private methods
   - ❌ Never test implementation details (SQL syntax, etc.)

2. **Procedure/Controller Layer Tests**:
   - ✅ Mock service dependencies (not database)
   - ✅ Verify services are called with correct arguments
   - ✅ Verify response transformation/formatting
   - ❌ Never mock database directly in procedure tests
   - ❌ Never test inline DB queries in procedures

3. **Layer Verification Checklist**:
   ```typescript
   // Before writing test, ask:
   // 1. Does a service exist for this domain?
   //    YES → Test the service, not inline code
   //    NO → Document why service doesn't exist
   //
   // 2. Am I testing the right layer?
   //    Service test → Mock DB, test business logic
   //    Procedure test → Mock service, test orchestration
   //
   // 3. Will this test encourage bad architecture?
   //    If test mocks DB in procedure → BAD (bypasses service)
   //    If test mocks service in procedure → GOOD (uses service)
   ```

---

## 🔧 DETERMINISTIC TEST INFRASTRUCTURE

### TestCleanupManager (Prevent Resource Leaks)

**MANDATORY: Use in EVERY test that creates resources (files, databases, timers, connections).**

```typescript
import { TestCleanupManager } from "@snapback/testing";

describe("SnapshotManager", () => {
  let cleanup: TestCleanupManager;
  let manager: SnapshotManager;

  beforeEach(() => {
    cleanup = new TestCleanupManager();
  });

  afterEach(async () => {
    await cleanup.runAll(); // LIFO cleanup (reverse order)
  });

  it("should create snapshot", async () => {
    // Create resources
    manager = new SnapshotManager();
    cleanup.register(() => manager.close()); // Auto cleanup

    const tempFile = await fs.promises.writeFile("/tmp/test.ts", "content");
    cleanup.register(() => fs.promises.unlink("/tmp/test.ts"));

    const snapshot = await manager.create("/tmp/test.ts");

    expect(snapshot.id).toBeDefined();
    // Cleanup happens automatically in afterEach
  });
});
```

### DeterministicTime (Eliminate Timing Flakiness)

**MANDATORY: NEVER use `Date.now()`, `setTimeout`, or `setInterval` in tests.**

```typescript
import { DeterministicTime, toTimestamp } from "@snapback/testing";

describe("Session expiration", () => {
  let time: DeterministicTime;

  beforeEach(() => {
    // Start at deterministic time
    time = new DeterministicTime(toTimestamp("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    time.restore(); // Restore real timers
  });

  it("should expire session after 30 minutes", () => {
    const session = createSession();
    expect(session.isExpired()).toBe(false);

    // Advance time deterministically (no waiting)
    time.advanceBy(30 * 60 * 1000); // 30 minutes

    expect(session.isExpired()).toBe(true);
  });

  it("should not expire session before 30 minutes", () => {
    const session = createSession();

    time.advanceBy(29 * 60 * 1000); // 29 minutes

    expect(session.isExpired()).toBe(false);
  });
});
```

### Test Factories (IP-Safe Test Data)

**MANDATORY: Use factories for test data, NEVER hardcoded values.**

```typescript
import { createTestUser, createTestSnapshot } from "@snapback/testing/fixtures/factories";

describe("User permissions", () => {
  it("should allow pro users to create unlimited snapshots", async () => {
    // ✅ GOOD - IP-safe test data
    const user = createTestUser({ tier: "pro" });
    const snapshot = createTestSnapshot({ userId: user.id });

    expect(snapshot.userId).toBe(user.id);
  });
});

// ❌ BAD - Hardcoded production-like data
const user = {
  id: "user_123",
  email: "test@example.com",
  tier: "enterprise", // Reveals proprietary tier names
  maxSnapshots: 10000 // Reveals pricing logic
};
```

### MSW for Network Mocking

**MANDATORY: Use MSW for HTTP mocking, NEVER mock fetch directly.**

```typescript
import { http, HttpResponse } from "msw";
import { server } from "@/test/setup";

describe("API client", () => {
  it("should fetch snapshot by ID", async () => {
    // ✅ GOOD - Network-level mock with MSW
    server.use(
      http.get("https://api.snapback.dev/snapshots/:id", ({ params }) => {
        return HttpResponse.json({
          id: params.id,
          name: "Test Snapshot",
          createdAt: "2025-01-01T00:00:00Z"
        });
      })
    );

    const snapshot = await client.getSnapshot("123");

    expect(snapshot.name).toBe("Test Snapshot");
  });

  it("should handle 404 errors", async () => {
    server.use(
      http.get("https://api.snapback.dev/snapshots/:id", () => {
        return new HttpResponse(null, { status: 404 });
      })
    );

    await expect(client.getSnapshot("999")).rejects.toThrow("Not found");
  });
});

// ❌ BAD - Mocking fetch directly
global.fetch = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ id: "123" })
});
```

---

## 🛡️ QUALITY GATES (Enforcement)

### Pre-Commit Checks (Run Locally)

```bash
# .husky/pre-commit
#!/bin/bash

echo "🔍 Running pre-commit checks..."

# Type checking
pnpm type-check || {
  echo "❌ Type check failed"
  exit 1
}

# Linting
pnpm lint || {
  echo "❌ Linting failed"
  exit 1
}

# Tests for changed files only
pnpm test:changed || {
  echo "❌ Tests failed for changed files"
  exit 1
}

# Check for forbidden patterns
git diff --cached | grep -E "(expect\(true\)\.toBe\(true\)|it\.todo\(|it\.skip\()" && {
  echo "❌ Forbidden test patterns detected"
  echo "  - expect(true).toBe(true) [placeholder test]"
  echo "  - it.todo() [TODO without implementation]"
  echo "  - it.skip() [skip without GitHub issue]"
  exit 1
}

echo "✅ Pre-commit checks passed"
```

### Pre-Push Checks (Run Locally)

```bash
# .husky/pre-push
#!/bin/bash

echo "🚀 Running pre-push checks..."

# All tests must pass
pnpm test || {
  echo "❌ Full test suite failed"
  exit 1
}

# Build must succeed
pnpm build || {
  echo "❌ Build failed"
  exit 1
}

# Flakiness check (run tests 3 times)
echo "🔄 Running flakiness check (3 runs)..."
for i in {1..3}; do
  echo "  Run $i of 3..."
  pnpm test --reporter=dot || {
    echo "❌ Flakiness detected - test failed on run $i"
    exit 1
  }
done

echo "✅ Pre-push checks passed"
```

### CI/CD Checks (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Run tests 3 times (flakiness check)
        run: |
          pnpm test && pnpm test && pnpm test

      - name: Check coverage thresholds
        run: pnpm test:coverage --min=90

      - name: Verify no placeholder tests
        run: |
          ! grep -r "expect(true).toBe(true)" "src/**/*.test.ts"
          ! grep -r "it.todo" "src/**/*.test.ts"

      - name: Build
        run: pnpm build
```

### Coverage Thresholds

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 90,        // 90%+ line coverage
        functions: 90,    // 90%+ function coverage
        branches: 85,     // 85%+ branch coverage
        statements: 90    // 90%+ statement coverage
      },
      perFile: true,
      include: ["src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/test/**",
        "**/__tests__/**"
      ]
    },
    bail: 1,              // Stop on first failure
    allowOnly: false,     // Fail if .only detected
    testTimeout: 5000     // Fail tests >5s
  }
});
```

---

## 🏗️ TEST NAMING CONVENTIONS

### Mandatory Format

```typescript
describe('[Component/Function Name]', () => {
  describe('[Method/Scenario]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange-Act-Assert
    });
  });
});
```

### Good Examples

```typescript
// ✅ EXCELLENT - Clear behavior + condition
describe("ProtectionLevel.Block", () => {
  describe("handleSave", () => {
    it("should prevent save when user declines confirmation", async () => {
      mockShowWarningMessage.mockResolvedValue(undefined);

      const result = await ProtectionLevel.Block.handleSave(mockFile);

      expect(result.allowed).toBe(false);
    });

    it("should allow save when user confirms override", async () => {
      mockShowWarningMessage.mockResolvedValue("Override");

      const result = await ProtectionLevel.Block.handleSave(mockFile);

      expect(result.allowed).toBe(true);
    });

    it("should log block attempt when save is prevented", async () => {
      mockShowWarningMessage.mockResolvedValue(undefined);

      await ProtectionLevel.Block.handleSave(mockFile);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Save blocked",
        expect.objectContaining({ filePath: mockFile.path })
      );
    });
  });
});
```

### Bad Examples

```typescript
// ❌ BAD - Vague, doesn't specify condition
it("should work", () => { ... });

// ❌ BAD - Tests implementation, not behavior
it("should call internal method twice", () => { ... });

// ❌ BAD - No condition specified
it("should validate input", () => { ... });

// ✅ GOOD - Specific behavior + condition
it("should reject input when email format is invalid", () => { ... });
```

### AAA Structure (Arrange-Act-Assert)

```typescript
it("should create snapshot when file is valid", async () => {
  // ARRANGE - Setup test data and mocks
  const filePath = "/test/file.ts";
  mockFs.readFile.mockResolvedValue("const x = 1;");
  mockStorage.save.mockResolvedValue(undefined);

  // ACT - Execute the function under test
  const result = await createSnapshot(filePath);

  // ASSERT - Verify expected behavior
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.value.filePath).toBe(filePath);
    expect(result.value.content).toBe("const x = 1;");
  }
});
```

---

## 🎓 ADVANCED TESTING PATTERNS

### Contract Testing (Prevent 80% of Integration Bugs)

**What:** Tests that verify implementations match interface contracts.

**When:** REQUIRED for all public interfaces and abstractions.

```typescript
// Define interface contract
interface IProtectionManager {
  isProtected(path: string): boolean;
  protect(path: string, level: ProtectionLevel): Promise<void>;
  unprotect(path: string): Promise<void>;
}

// Test contract compliance
describe("Contract: IProtectionManager", () => {
  let manager: IProtectionManager;

  beforeEach(() => {
    manager = new FileProtectionManager(); // Real implementation
  });

  describe("isProtected", () => {
    it("should implement isProtected(path: string): boolean", () => {
      // Verify function exists
      expect(typeof manager.isProtected).toBe("function");

      // Verify return type
      const result = manager.isProtected("/any/path");
      expect(typeof result).toBe("boolean");
    });

    it("should return boolean for all valid paths", () => {
      const testPaths = ["/a", "/a/b/c", "/file.ts", ""];

      testPaths.forEach(path => {
        const result = manager.isProtected(path);
        expect(typeof result).toBe("boolean");
      });
    });
  });

  describe("protect", () => {
    it("should implement protect(path: string, level: ProtectionLevel): Promise<void>", async () => {
      expect(typeof manager.protect).toBe("function");

      // Verify return type
      const promise = manager.protect("/test.ts", "block");
      expect(promise).toBeInstanceOf(Promise);

      await expect(promise).resolves.toBeUndefined();
    });

    it("should accept all valid protection levels", async () => {
      const levels: ProtectionLevel[] = ["watch", "warn", "block"];

      for (const level of levels) {
        await expect(
          manager.protect("/test.ts", level)
        ).resolves.not.toThrow();
      }
    });
  });
});
```

### Trust Chain Testing (Prevent Double Validation)

**What:** Tests that verify components trust upstream validation decisions.

**When:** REQUIRED when data flows through multiple layers.

```typescript
describe("Trust Chain: StorageAdapter", () => {
  it("should NOT re-validate when SDK returns null", async () => {
    // SDK returns null (already validated upstream)
    const manifest = null;

    await adapter.storeSessionManifest(manifest);

    // Adapter should trust SDK decision, not throw or log errors
    expect(mockStorage.finalizeSession).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("should NOT throw when SDK returns validated data", async () => {
    // SDK already validated this data
    const manifest = { id: "test", files: [] };

    // Adapter should trust SDK, not re-validate
    await expect(
      adapter.storeSessionManifest(manifest)
    ).resolves.not.toThrow();
  });

  it("should store exactly what SDK provides (no transformation)", async () => {
    const manifest = {
      id: "test",
      files: [],
      customField: "value" // Unconventional field
    };

    await adapter.storeSessionManifest(manifest);

    // Verify exact data stored (no filtering/transformation)
    expect(mockStorage.finalizeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customField: "value"
      })
    );
  });
});
```

### IP-Safety for Open Core Packages

**CRITICAL:** Public packages (`@snapback-oss/*`) MUST NOT expose proprietary logic in tests.

**FORBIDDEN in Public Tests:**
1. ❌ Proprietary tier names/limits
2. ❌ Pricing logic
3. ❌ Analytics schemas
4. ❌ Business rules

```typescript
// ❌ FORBIDDEN - Public package exposes proprietary tier logic
// packages/@snapback-oss/sdk/src/auth.test.ts
describe("Tier limits", () => {
  it("should allow enterprise users 10000 snapshots", () => {
    const user = { tier: "enterprise", maxSnapshots: 10000 };
    expect(canCreateSnapshot(user)).toBe(true);
  });
});

// ✅ IP-SAFE - Generic tier testing
// packages/@snapback-oss/sdk/src/auth.test.ts
describe("Tier validation", () => {
  it("should enforce snapshot limits based on tier", () => {
    const user = createTestUser({ tier: "test-tier" });
    const result = canCreateSnapshot(user);
    expect(typeof result).toBe("boolean");
  });
});

// ❌ FORBIDDEN - Exposes analytics schema
describe("Analytics tracking", () => {
  it("should track snapshot.created with revenue metrics", () => {
    trackEvent("snapshot.created", {
      userId: "123",
      revenue: 49.99,           // ❌ Proprietary
      conversionSource: "google-ads" // ❌ Proprietary
    });
  });
});

// ✅ IP-SAFE - Generic event testing
describe("Event tracking", () => {
  it("should publish snapshot.created event", () => {
    trackEvent("snapshot.created", { snapshotId: "test" });
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
```

**Private Packages Can Test Proprietary Logic:**
```typescript
// ✅ ALLOWED - Private package (apps/api)
describe("Billing", () => {
  it("should charge $49.99 for pro tier upgrade", () => {
    const charge = calculateUpgradeCost("free", "pro");
    expect(charge).toBe(49.99);
  });
});
```

---

## ✅ VERIFICATION CHECKLIST

Before submitting PR, verify ALL items:

### Architecture Compliance (CRITICAL - NEW)
- [ ] **STEP 0 completed**: Architecture audit performed before RED phase
- [ ] **Services searched**: Ran `find` command to locate existing services
- [ ] **Architecture docs reviewed**: Checked roadmaps, remediation plans, task specifications
- [ ] **Canonical locations verified**: No duplicate logic created, no consolidation rules violated
- [ ] **Abstraction layer confirmed**: Testing correct layer (service vs procedure vs controller)
- [ ] **No service bypass**: If service exists for domain, it is being used (not bypassed)
- [ ] **Audit documented**: Architecture decisions recorded in commit/PR description

### Test Quality
- [ ] All tests follow TDD red-green-refactor workflow
- [ ] Every test has RED phase (verified failure screenshot/log)
- [ ] Zero placeholder tests (`expect(true).toBe(true)`)
- [ ] Zero TODO markers without implementation
- [ ] Zero `.skip` without GitHub issue reference
- [ ] Zero `.only` (removed before commit)
- [ ] All assertions are specific (no `.toBeTruthy()` or `.toBeDefined()`)

### Coverage
- [ ] All 4 paths tested (Happy, Sad, Edge, Error)
- [ ] Coverage ≥90% for new code
- [ ] Coverage ≥85% for modified code
- [ ] All public functions have tests
- [ ] All edge cases identified and tested

### Infrastructure
- [ ] `TestCleanupManager` used for all resource cleanup
- [ ] `DeterministicTime` used instead of `Date.now()`/`setTimeout`
- [ ] Test factories used for all test data
- [ ] MSW used for all HTTP mocking
- [ ] No hardcoded production-like data

### Naming & Structure
- [ ] Tests follow `describe → describe → it` structure
- [ ] Test names follow `should [behavior] when [condition]` format
- [ ] AAA structure (Arrange-Act-Assert) in all tests
- [ ] One behavior per test (no multi-assertion tests)

### Quality Gates
- [ ] All tests pass 3 consecutive runs (no flakiness)
- [ ] Pre-commit hooks pass
- [ ] Type checking passes (zero errors)
- [ ] Linting passes (zero errors)
- [ ] Build succeeds

### Advanced (If Applicable)
- [ ] Contract tests for all public interfaces
- [ ] Trust chain tests for multi-layer flows
- [ ] IP-safety verified (no proprietary logic in public packages)

---

## 📚 ENFORCEMENT SUMMARY

### Static Analysis (ESLint)
```json
{
  "rules": {
    "no-placeholder-tests": "error",
    "no-todo-markers": "error",
    "no-skip-without-ticket": "error",
    "no-vague-assertions": "error"
  }
}
```

### Git Hooks
```bash
# Pre-commit: Type check, lint, test changed files
# Pre-push: Full test suite, build, flakiness check (3 runs)
```

### CI/CD
```yaml
- Type checking (0 errors)
- Linting (0 errors)
- Tests (3 runs, all pass)
- Coverage (90%+ new code)
- Build (success)
- Placeholder test detection
```

---

## 🎯 FINAL MANDATE

**Every line of production code MUST:**
1. **Pass architecture audit** (STEP 0 - verify no service bypass)
2. Start with a failing test (RED)
3. Be implemented minimally (GREEN)
4. Be refactored without behavior change (BLUE)
5. Pass all 4 coverage paths (Happy/Sad/Edge/Error)
6. Use specific assertions (no vague checks)
7. Use deterministic infrastructure
8. Pass all quality gates

**Zero tolerance for:**
- **Bypassing existing services/aggregators** (← NEW)
- **Skipping architecture audit (STEP 0)** (← NEW)
- Placeholder tests
- TODO markers without implementation
- .skip without GitHub issue
- Vague assertions
- Production code without failing test
- Flaky tests

**Real-World Enforcement Example:**

```typescript
// ❌ FORBIDDEN - Bypassed MetricsAggregator service
// Task 4.1.A incorrect implementation:
const aiBreakdownResult = await db
  .select({ featureName: featureUsage.featureName, count: count() })
  .from(featureUsage)
  .groupBy(featureUsage.featureName);
// Problem: Works perfectly, all tests pass, BUT violates architecture
// Missing STEP 0: Didn't check if MetricsAggregator exists

// ✅ CORRECT - Used MetricsAggregator service
// Task 4.1.A correct implementation:
const metricsAggregator = new MetricsAggregator(db);
const aiBreakdown = await metricsAggregator.getAIToolDetectionCounts(userId);
// Correct: STEP 0 found service, added method, followed architecture
```

**This is not negotiable. This is the standard.**

---

**Generated from:** 12 testing documents (~9,000 lines) + Task 4.1.A architecture violation analysis
**Last Updated:** 2025-12-09 (Added STEP 0: Architecture Audit)
**Authority:** Workspace-wide testing standard
