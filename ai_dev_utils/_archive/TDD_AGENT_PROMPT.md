# TDD Red-Green-Refactor Prompt for Coding Agents

**Purpose:** Ensure coding agents perform thorough Test-Driven Development without shortcuts, placeholder tests, or useless tests, while maintaining strict architectural compliance and AI-safety awareness.

**Authority:** This prompt synthesizes:
- 12 comprehensive testing documents (~9,000 lines)
- Real-world architecture violation analysis (Task 4.1.A)
- External AI research on coding pitfalls (6 peer-reviewed sources)

**Zero Tolerance:** Violations of FORBIDDEN patterns, architectural bypasses, or AI-safety failures will fail code review and CI/CD checks.

**Critical Updates (2025-12-09):**
- Added STEP 0: Architecture Audit (prevents service layer bypasses)
- Added FORBIDDEN #9-11: Iteration loops, blind trust, DRY violations
- Added Security Verification section (AI-specific vulnerabilities)
- Added AI suitability assessment (when NOT to use AI)
- Integrated 6 external research sources on AI coding failures

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

#### ❌ FORBIDDEN #9: Iterative Fix Loops Without Human Review

**Research Finding (IEEE-ISTAS 2025):** Each AI "fix" iteration can introduce NEW vulnerabilities.
After 5 iterations: **37.6% increase in critical vulnerabilities.**

```typescript
// ❌ FORBIDDEN PATTERN - Unchecked iteration loop
// Iteration 1: AI generates code
// User: "Fix the error"
// Iteration 2: AI fixes error, breaks validation
// User: "Fix the validation"
// Iteration 3: AI fixes validation, adds SQL injection
// User: "Fix the security issue"
// Iteration 4: AI patches SQL, removes rate limiting
// Iteration 5: 37.6% MORE vulnerabilities than iteration 1!

// ✅ REQUIRED PATTERN - Mandatory review checkpoint
// After 3 AI iterations on the SAME code block:
// 1. STOP and review ALL changes holistically
// 2. Consider manual rewrite vs. continued AI iteration
// 3. Document why iterations were needed
// 4. Run security scan before proceeding
```

**Maximum Iterations Rule:**
- ✅ 1-2 iterations: Proceed normally
- ⚠️ 3 iterations: Mandatory pause + human review
- ❌ 4+ iterations: Consider manual rewrite (AI may be creating circular fixes)

**Why This Matters:**
AI doesn't "understand" your codebase - it pattern-matches. Each fix attempts to satisfy
the immediate error without holistic awareness, often breaking something else.

#### ❌ FORBIDDEN #10: Blind Trust in AI-Generated Code

**Research Finding (Stanford Study):** Developers using AI produce less secure code
while BELIEVING it to be MORE secure. This "false confidence effect" is dangerous.

**Statistics:**
- 76% of developers use AI coding tools
- Only 43% trust their accuracy
- Yet developers review AI code LESS critically than human code

```typescript
// ❌ FORBIDDEN - Accepting AI code without scrutiny
const apiKey = "sk-abc123";  // AI hardcoded this "for simplicity"
const cors = "*";            // AI used permissive CORS "to avoid issues"
const query = `SELECT * FROM users WHERE id = ${userId}`; // AI concatenated SQL

// ✅ REQUIRED - Treat AI code with HEIGHTENED scrutiny
// Ask for EVERY AI-generated line:
// 1. "Would I approve this in a human's PR?" (same standard)
// 2. "What could go wrong?" (adversarial thinking)
// 3. "Does this follow our patterns?" (architectural check)
// 4. "Is there a security implication?" (threat modeling)
```

**Anti-Complacency Rules:**
1. **Never** approve AI code faster than human code
2. **Always** verify security-sensitive operations manually
3. **Question** every "simplification" AI makes (often removes safety)
4. **Test** edge cases AI may not have considered
5. **Check** for hardcoded values AI adds for "convenience"

#### ❌ FORBIDDEN #11: Violating DRY with AI-Generated Duplicates

**Research Finding (GitClear):** **8x increase** in duplicated code blocks since AI adoption.
AI generates NEW code instead of finding/reusing existing utilities.

```typescript
// ❌ FORBIDDEN - AI generates duplicate utility
// File: apps/api/modules/users/utils.ts
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// File: apps/api/modules/auth/helpers.ts  
// AI generates IDENTICAL function instead of importing!
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ✅ REQUIRED - Search before creating
// BEFORE writing any utility/helper:
grep -r "function validate" packages/*/src/ apps/*/lib/
grep -r "export const validate" packages/*/src/ apps/*/lib/

// Found existing? Import it:
import { validateEmail } from "@snapback/contracts/validation";
```

**DRY Compliance Checklist:**
- [ ] Searched for existing utilities before creating new ones
- [ ] Checked `packages/*/src/utils/` for shared helpers
- [ ] Checked `apps/*/lib/` for app-specific utilities
- [ ] If creating new utility, placed in SHARED location (not module-specific)

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
- [ ] **Searched for existing utilities** (grep for helpers/validators before creating new)
- [ ] **Verified environment context** (no hardcoded env values, uses ConfigService)
- [ ] **Assessed AI suitability** (is this task better done manually? See below)

##### When to Use AI vs Manual Coding

**Research Finding (METR Study):** Experienced developers are **19% SLOWER** with AI on complex tasks.

| Scenario | Recommendation | Reason |
|----------|----------------|--------|
| Simple CRUD operations | ✅ Manual faster | Less verification overhead |
| Greenfield project | ✅ AI helpful | No existing patterns to match |
| Legacy codebase | ⚠️ Caution | AI lacks tacit knowledge |
| Security-sensitive code | ❌ Manual preferred | AI misses security patterns |
| Business logic | ❌ Manual preferred | AI doesn't know your domain |
| Boilerplate/repetitive | ✅ AI helpful | Low-risk, high-volume |
| Complex algorithms | ⚠️ Case-by-case | Verify every step |

**Quick Decision Framework:**
```
1. Does AI have enough CONTEXT? (No → Manual)
2. Is this SECURITY-sensitive? (Yes → Manual)
3. Do patterns ALREADY EXIST? (Yes → Manual adaptation, not AI generation)
4. Will VERIFICATION take longer than writing? (Yes → Manual)
```

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

### 🔄 STEP 3.5: INCREMENTAL VERIFICATION (During Development)

**CRITICAL: Run these checks AFTER each RED-GREEN-REFACTOR cycle, NOT just at the end.**

**DO NOT write 10 tests then check. Check EACH test as you write it.**

#### After RED Phase:

```bash
# Verify test actually fails
pnpm test path/to/test.ts

# Expected output:
# ❌ FAIL  apps/api/src/services/__tests__/metrics-aggregator.test.ts
#   ● getAIToolDetectionCounts › should aggregate counts
#     TypeError: aggregator.getAIToolDetectionCounts is not a function
#
#       425 |       // ACT
#       426 |       const result = await aggregator.getAIToolDetectionCounts("user_123");
#           |                                      ^
```

**If test passes in RED phase → You're NOT doing TDD. Start over.**

#### After GREEN Phase:

```bash
# Verify test now passes
pnpm test path/to/test.ts

# Expected output:
# ✅ PASS  apps/api/src/services/__tests__/metrics-aggregator.test.ts
#   ✓ getAIToolDetectionCounts › should aggregate counts (15ms)
```

**Run compliance check immediately on THIS ONE TEST:**

```bash
# Check this specific test for violations
grep -n "toBeGreaterThan\|toBeTruthy\|toBeDefined" apps/api/src/services/__tests__/metrics-aggregator.test.ts | grep -A 2 -B 2 "line-425"

# Expected: No output (0 violations)
# If violations found: Fix NOW before writing next test
```

#### After Each Test (Before Writing Next One):

**Immediate Quality Checklist:**

- [ ] Assertion is specific (exact value or `toMatchObject` with type matchers)
- [ ] No vague checks (`toBeTruthy`, `toBeDefined`, `toBeGreaterThan(0)`)
- [ ] Test name follows `should [behavior] when [condition]` format
- [ ] AAA structure (Arrange-Act-Assert) clearly separated with comments
- [ ] Mock setup is minimal (only what's needed for THIS test)

**Example - Good Incremental Check:**

```typescript
// ✅ Just wrote this test - check it NOW:
it("should aggregate AI tool detection counts by tool name", async () => {
  // ARRANGE
  const mockGroupBy = vi.fn();
  mockWhere.mockReturnValue({ groupBy: mockGroupBy });
  mockGroupBy.mockResolvedValueOnce([
    { featureName: "GitHub Copilot", count: 7 },
    { featureName: "Cursor AI", count: 3 },
  ]);

  // ACT
  const result = await aggregator.getAIToolDetectionCounts("user_123");

  // ASSERT
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.value).toEqual({  // ✅ Specific object match
      copilot: 7,
      cursor: 3,
      claude: 0,
      windsurf: 0,
    });
  }
});

// Check this test RIGHT NOW:
// ✅ Specific assertion? YES (toEqual with exact object)
// ✅ No vague checks? YES (no toBeTruthy/toBeDefined)
// ✅ Good naming? YES (describes behavior + condition)
// ✅ AAA structure? YES (clear sections)
// → APPROVED, move to next test
```

**Example - Bad Incremental Check:**

```typescript
// ❌ Just wrote this test - STOP, this is wrong:
it("should get recent metrics", async () => {
  mockOrderBy.mockResolvedValueOnce([{ date: new Date(), snapshotsCreated: 5 }]);
  
  const result = await aggregator.getRecentDailyMetrics("user_123");
  
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.value.length).toBeGreaterThanOrEqual(0);  // ❌ VAGUE!
  }
});

// Check this test RIGHT NOW:
// ❌ Specific assertion? NO (toBeGreaterThanOrEqual accepts ANY value)
// ❌ No vague checks? NO (this IS a vague check)
// → FAILED, fix before continuing:

it("should get metrics for last 30 days by default", async () => {
  // ARRANGE
  mockOrderBy.mockResolvedValueOnce([
    { date: new Date("2025-12-01"), snapshotsCreated: 5, snapshotsRestored: 1 },
  ]);
  
  // ACT
  const result = await aggregator.getRecentDailyMetrics("user_123");
  
  // ASSERT
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.value).toHaveLength(1);  // ✅ Specific length
    expect(result.value[0]).toMatchObject({  // ✅ Specific structure
      date: expect.any(Date),
      snapshotsCreated: 5,
      snapshotsRestored: 1,
    });
  }
});
// → NOW approved, continue
```

**Key Principle: Fix violations IMMEDIATELY, not "after finishing all tests"**

Why? Because:
- Easier to fix one test than rewrite 10
- Pattern violations compound (copy-paste bad patterns)
- Harder to remember context later
- Incremental verification catches issues early

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

## ⚠️ SELF-VERIFICATION (Before Claiming Complete)

**MANDATORY: Run this checklist BEFORE declaring any task "complete" or "ready for review".**

### Pre-Certification Checklist

**Run these checks in ORDER. If ANY item fails, task is NOT complete:**

#### 1. Grep for Violations

```bash
# Check for vague assertions
grep -rn "toBeGreaterThan\|toBeGreaterThanOrEqual\|toBeTruthy\|toBeDefined\|not.toBeNull" apps/*/src/**/*.test.ts packages/*/src/**/*.test.ts 2>/dev/null
# Must return 0 results

# Check for direct Date usage in tests
grep -rn "new Date()" apps/*/src/**/*.test.ts packages/*/src/**/*.test.ts 2>/dev/null | grep -v "// Expected" | grep -v "mockResolvedValue"
# Must return 0 results (use DeterministicTime)

# Check for missing cleanup infrastructure
for file in $(find apps/*/src packages/*/src -name "*.test.ts" 2>/dev/null); do
  if ! grep -q "TestCleanupManager\|afterEach" "$file"; then
    echo "❌ Missing cleanup: $file"
  fi
done
```

#### 2. Count Coverage Paths Per Method

```bash
# For EACH public method, verify 4 test categories exist:
# - Happy Path (normal success)
# - Sad Path (validation failures)
# - Edge Cases (boundaries, limits, special chars)
# - Error Cases (DB failures, network timeouts)

# Example verification for getAIToolDetectionCounts:
echo "Checking 4-path coverage for getAIToolDetectionCounts:"
grep "it(" apps/api/src/services/__tests__/metrics-aggregator.test.ts | grep -A 1 "getAIToolDetectionCounts" -B 1
# Should show at least 4 tests:
#   - 1+ Happy path
#   - 1+ Sad path (empty/invalid input)
#   - 2+ Edge cases (boundaries, special values)
#   - 1+ Error path (DB/network failure)
```

#### 3. Visual Inspection Checklist

- [ ] Open test file in editor
- [ ] Scroll through ALL assertions line-by-line
- [ ] Verify ZERO instances of:
  - `expect(result).toBeTruthy()`
  - `expect(result).toBeDefined()`
  - `expect(value).toBeGreaterThan(0)` (without knowing exact expected value)
  - `expect(value).toBeGreaterThanOrEqual(0)` (accepts ANY value including 0)
  - Chained `toHaveProperty` calls (use `toMatchObject` instead)
- [ ] Every assertion checks SPECIFIC value or uses `toMatchObject` with type matchers

#### 4. Run Automated Quality Check

```bash
# Run the test quality verification script (see tools/test-quality-check.sh)
pnpm test:quality-check

# Expected output:
# ✅ No vague assertions found
# ✅ No direct Date() usage in tests
# ✅ All test files have cleanup infrastructure
# ✅ All TDD compliance checks passed
```

#### 5. Evidence Collection

**Before claiming "Phase X.X Complete", you MUST have:**

- [ ] Screenshot of RED phase showing test failure with error like:
  ```
  TypeError: aggregator.getAIToolDetectionCounts is not a function
  ```
- [ ] Terminal output showing specific failure reason (not generic timeout)
- [ ] Git diff showing test was committed BEFORE implementation
- [ ] Final test run output showing ALL tests pass:
  ```bash
  ✓ getAIToolDetectionCounts (6 tests)
    ✓ should aggregate counts (12ms)
    ✓ should return error for empty user (3ms)
    ✓ should return zeros when no detections (5ms)
    ✓ should normalize tool names (8ms)
    ✓ should ignore unknown tools (4ms)
    ✓ should handle database errors (6ms)
  ```
- [ ] Coverage report showing 4-path completion:
  ```
  | Method                      | Happy | Sad | Edge | Error |
  |-----------------------------|-------|-----|------|-------|
  | getAIToolDetectionCounts    |   ✅  |  ✅ |  ✅  |   ✅  |
  | getRecentActivity           |   ✅  |  ✅ |  ✅  |   ✅  |
  ```

**IF ANY CHECK FAILS:**

- ❌ Task is NOT complete
- ❌ DO NOT claim "ready for review"
- ❌ DO NOT update task status to COMPLETE
- ❌ DO NOT certify in PR description
- ✅ Fix violations FIRST
- ✅ Re-run ALL checks
- ✅ Collect evidence
- ✅ Only THEN proceed to certification

### Common False Positives

**Tests pass ≠ Task complete**

```bash
# ❌ This is NOT sufficient:
$ pnpm test
Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total

# ✅ This IS sufficient:
$ pnpm test
Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total

$ bash tools/test-quality-check.sh
✅ No vague assertions
✅ No Date() usage
✅ All files have cleanup
✅ 4-path coverage verified

$ grep -rn "toBeGreaterThan" apps/api/src/services/__tests__/
(no output)
```

**Type checking passes ≠ Quality assured**

```bash
# ❌ This proves types are correct, NOT that tests are good:
$ pnpm type-check
✓ Type checking passed

# ✅ This proves tests meet quality standards:
$ pnpm type-check && bash tools/test-quality-check.sh
✓ Type checking passed
✅ All TDD compliance checks passed
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

## 🚫 ANTI-PATTERNS: What "Passing Tests" Looks Like When WRONG

**CRITICAL: These examples show code that PASSES all tests but VIOLATES TDD_AGENT_PROMPT.**

Use these as negative examples when reviewing your own code. If your tests look like these, they're WRONG even if they pass.

### Anti-Pattern 1: Vague Assertions That Pass

```typescript
// ❌ ANTI-PATTERN: All assertions pass, but test is useless
describe("getRecentDailyMetrics", () => {
  it("should get metrics for last 30 days by default", async () => {
    // ARRANGE
    mockOrderBy.mockResolvedValueOnce([
      { date: new Date(), snapshotsCreated: 5, snapshotsRestored: 1 }
    ]);

    // ACT
    const result = await aggregator.getRecentDailyMetrics("user_123");

    // ASSERT
    expect(result.success).toBe(true);  // ✅ Passes
    if (result.success) {
      expect(result.value.length).toBeGreaterThanOrEqual(0);  // ❌ VAGUE!
      // ^^ This passes if value is [], [1 item], [100 items], [null], etc.
      // It tells us NOTHING about correctness!
    }
  });
});

// ✅ CORRECT: Specific assertion
describe("getRecentDailyMetrics", () => {
  it("should return metrics for last 30 days by default", async () => {
    // ARRANGE
    mockOrderBy.mockResolvedValueOnce([
      { date: new Date("2025-12-01"), snapshotsCreated: 5, snapshotsRestored: 1 },
      { date: new Date("2025-12-02"), snapshotsCreated: 3, snapshotsRestored: 0 },
    ]);

    // ACT  
    const result = await aggregator.getRecentDailyMetrics("user_123");

    // ASSERT
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toHaveLength(2);  // ✅ Exact length
      expect(result.value[0]).toMatchObject({  // ✅ Specific structure
        date: expect.any(Date),
        snapshotsCreated: 5,
        snapshotsRestored: 1,
        minutesSavedEstimate: expect.any(Number),
      });
      expect(result.value[1]).toMatchObject({
        date: expect.any(Date),
        snapshotsCreated: 3,
        snapshotsRestored: 0,
      });
    }
  });
});
```

**Why Anti-Pattern 1 is Dangerous:**
- Test passes even if implementation returns `[]` (empty array)
- Test passes even if implementation returns garbage data
- Gives false confidence ("all tests passing" means nothing)
- Production bugs slip through

### Anti-Pattern 2: Missing Cleanup (Tests Pass Locally, Fail in CI)

```typescript
// ❌ ANTI-PATTERN: Tests pass individually, fail when run together
describe("CloudBackupService", () => {
  beforeEach(() => {
    process.env.ENABLE_CLOUD_BACKUP = 'true';  // ❌ Mutates global state
    process.env.S3_BUCKET_NAME = 'test-bucket';
    process.env.S3_REGION = 'us-east-1';
  });

  it("should upload snapshot to S3 when enabled", async () => {
    const result = await cloudService.upload(snapshot);
    expect(result.success).toBe(true);  // ✅ Passes
  });
  
  it("should skip upload when disabled", async () => {
    process.env.ENABLE_CLOUD_BACKUP = 'false';
    const result = await cloudService.upload(snapshot);
    expect(result.success).toBe(true);  // ✅ Passes
  });
  
  // ❌ NO afterEach cleanup!
  // Next test file inherits these env vars
  // CI runs tests in parallel → race conditions → flaky failures
});

// ✅ CORRECT: Always clean up global state
describe("CloudBackupService", () => {
  let cleanup: TestCleanupManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    cleanup = new TestCleanupManager();
    originalEnv = { ...process.env };
    
    process.env.ENABLE_CLOUD_BACKUP = 'true';
    process.env.S3_BUCKET_NAME = 'test-bucket';
    process.env.S3_REGION = 'us-east-1';
  });

  afterEach(async () => {
    process.env = originalEnv;  // ✅ Restore original state
    await cleanup.runAll();      // ✅ LIFO cleanup
  });

  it("should upload snapshot to S3 when enabled", async () => {
    const result = await cloudService.upload(snapshot);
    expect(result.success).toBe(true);
  });
  
  // Cleanup happens automatically
});
```

**Why Anti-Pattern 2 is Dangerous:**
- Works on developer machine (tests run in isolation)
- Fails in CI (tests run in parallel)
- Intermittent failures ("works on my machine")
- Wastes hours debugging flaky tests

### Anti-Pattern 3: Incomplete 4-Path Coverage (Looks Complete, Isn't)

```typescript
// ❌ ANTI-PATTERN: "All tests pass" but only 25% coverage (1/4 paths)
describe("getAIToolDetectionCounts", () => {
  it("should aggregate AI tool counts", async () => {
    // ARRANGE
    mockGroupBy.mockResolvedValueOnce([
      { featureName: "copilot", count: 5 },
      { featureName: "cursor", count: 3 },
    ]);

    // ACT
    const result = await aggregator.getAIToolDetectionCounts("user_123");

    // ASSERT
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.copilot).toBe(5);
      expect(result.value.cursor).toBe(3);
    }
  });
  
  // ❌ MISSING: Sad path (empty user, null user, whitespace-only user)
  // ❌ MISSING: Edge cases (0 detections, case variations, unknown tools)
  // ❌ MISSING: Error path (database failure, connection timeout)
  
  // Result: 75% of code paths untested!
});

// ✅ CORRECT: All 4 paths covered
describe("getAIToolDetectionCounts", () => {
  // Happy Path: Normal operation
  it("should aggregate counts for multiple tools", async () => {
    mockGroupBy.mockResolvedValueOnce([
      { featureName: "GitHub Copilot", count: 7 },
      { featureName: "Cursor AI", count: 3 },
    ]);

    const result = await aggregator.getAIToolDetectionCounts("user_123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toEqual({ copilot: 7, cursor: 3, claude: 0, windsurf: 0 });
    }
  });

  // Sad Path: Validation failures
  it("should return error for empty user ID", async () => {
    const result = await aggregator.getAIToolDetectionCounts("");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("MISSING_USER_ID");
    }
  });

  // Edge Cases: Boundaries and special values
  it("should return all zeros when user has no detections", async () => {
    mockGroupBy.mockResolvedValueOnce([]);

    const result = await aggregator.getAIToolDetectionCounts("user_no_activity");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toEqual({ copilot: 0, cursor: 0, claude: 0, windsurf: 0 });
    }
  });

  it("should normalize tool names (case-insensitive)", async () => {
    mockGroupBy.mockResolvedValueOnce([
      { featureName: "GITHUB COPILOT", count: 5 },
      { featureName: "copilot", count: 2 },
    ]);

    const result = await aggregator.getAIToolDetectionCounts("user_123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.copilot).toBe(7);  // 5 + 2 = 7
    }
  });

  // Error Path: Unexpected failures
  it("should handle database errors gracefully", async () => {
    mockGroupBy.mockRejectedValueOnce(new Error("Connection timeout"));

    const result = await aggregator.getAIToolDetectionCounts("user_123");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FETCH_FAILED");
    }
  });
});
```

**Why Anti-Pattern 3 is Dangerous:**
- Happy path only = 25% code coverage
- Production edge cases untested (null, empty, special chars)
- Error handling untested (DB failures, network issues)
- First production error exposes the gap

### Anti-Pattern 4: Mock Setup That Doesn't Work (False Confidence)

```typescript
// ❌ ANTI-PATTERN: Mock defined but not wired to implementation
beforeEach(() => {
  vi.mock('@snapback/sdk/cloud');  // ❌ Declares mock at wrong scope
});

it("should upload to S3", async () => {
  const mockUpload = vi.fn().mockResolvedValue({ success: true });  // ❌ Local mock not injected
  
  await cloudService.upload(snapshot);
  
  expect(mockUpload).toHaveBeenCalled();  // ❌ ALWAYS FAILS - mock never connected!
  // Test fails with: "Expected mock to be called but it wasn't"
});

// ✅ CORRECT: Use MSW for HTTP mocking
import { http, HttpResponse } from "msw";
import { server } from "@/test/setup";

it("should upload to S3 via HTTP PUT", async () => {
  // Intercept at network level
  server.use(
    http.put("https://s3.amazonaws.com/test-bucket/:key", ({ params }) => {
      return new HttpResponse(null, { status: 200 });
    })
  );
  
  const result = await cloudService.upload(snapshot);
  
  expect(result.success).toBe(true);
  // Actual HTTP request was intercepted by MSW
});

// ✅ CORRECT: Properly inject service mocks
it("should call CloudBackupService.upload", async () => {
  const mockCloudService = {
    upload: vi.fn().mockResolvedValue({ success: true }),
  };

  // Inject mock via constructor/DI
  const handler = new SnapshotHandler({ cloudService: mockCloudService });
  
  await handler.createSnapshot(data);
  
  expect(mockCloudService.upload).toHaveBeenCalled();  // ✅ Works - mock properly injected
});
```

**Why Anti-Pattern 4 is Dangerous:**
- Test ALWAYS fails (mock never invoked)
- Developers spend hours debugging "why mock not called"
- May disable test with `.skip` instead of fixing
- False failures erode trust in test suite

### Anti-Pattern 5: Certification Without Evidence

```markdown
❌ ANTI-PATTERN: "Phase 4.1 Complete" claim without proof

## Phase 4.1: Wire MetricsAggregator into Dashboard Metrics - COMPLETE ✅

### Summary
Successfully implemented Phase 4.1 following TDD:

- Added getAIToolDetectionCounts() method to MetricsAggregator
- Added getRecentActivity() method to MetricsAggregator  
- All tests pass
- Architecture compliant
- Zero shortcuts

[No screenshots, no failing test evidence, no verification checklist]
[No grep output showing zero violations]
[No 4-path coverage matrix]
```

```markdown
✅ CORRECT: Evidence-based certification

## Phase 4.1: Wire MetricsAggregator into Dashboard Metrics - COMPLETE ✅

### RED Phase Evidence

**Screenshot of failing test:**
```
❌ FAIL  apps/api/src/services/__tests__/metrics-aggregator.test.ts
  ● getAIToolDetectionCounts › should aggregate counts
    TypeError: aggregator.getAIToolDetectionCounts is not a function

      425 |   // ACT
      426 |   const result = await aggregator.getAIToolDetectionCounts("user_123");
          |                                  ^
```

### GREEN Phase Evidence

**Terminal output:**
```bash
$ pnpm test metrics-aggregator

✅ PASS  apps/api/src/services/__tests__/metrics-aggregator.test.ts
  ✓ getAIToolDetectionCounts (6 tests, 47ms)
    ✓ should aggregate counts (12ms)
    ✓ should return error for empty user (3ms)
    ✓ should return zeros when no detections (5ms)
    ✓ should normalize tool names (8ms)
    ✓ should ignore unknown tools (6ms)
    ✓ should handle database errors (13ms)
```

### Compliance Verification

**Automated checks:**
```bash
$ bash tools/test-quality-check.sh
✅ No vague assertions found
✅ No direct Date() usage in tests
✅ All test files have cleanup infrastructure
✅ All TDD compliance checks passed

$ grep -rn "toBeGreaterThan\|toBeTruthy\|toBeDefined" apps/api/src/services/__tests__/metrics-aggregator.test.ts
(no output - zero violations)
```

### 4-Path Coverage Matrix

| Method | Happy | Sad | Edge | Error |
|--------|-------|-----|------|-------|
| getAIToolDetectionCounts | ✅ Line 413 | ✅ Line 440 | ✅ Lines 451, 470, 496 | ✅ Line 518 |
| getRecentActivity | ✅ Line 558 | ✅ Lines 598, 612 | ✅ Lines 627, 644, 659 | ✅ Lines 673, 690 |

**Coverage details:**
- Happy: Normal aggregation with multiple tools
- Sad: Empty user ID, whitespace-only user ID
- Edge: No detections (all zeros), case normalization, unknown tools ignored, max 20 items
- Error: Database connection failure, query timeout, permission denied

### Architecture Compliance

**STEP 0 Audit:**
```bash
$ find apps/api/src/services -name "*metrics*"
apps/api/src/services/metrics-aggregator.ts  ✅ Service exists

$ grep "getAIToolDetectionCounts\|getRecentActivity" apps/api/src/services/metrics-aggregator.ts
export async getAIToolDetectionCounts(userId: string)  ✅ Method added to service
export async getRecentActivity(userId: string, days = 7)  ✅ Method added to service

$ grep -r "db.select.*featureUsage" apps/api/modules/dashboard/procedures/get-metrics.ts
(no output - no inline queries)  ✅ No service bypass
```

**Result: Architecture compliant - service layer used correctly**

---

**This level of evidence is REQUIRED before claiming "complete".**
```

**Why Anti-Pattern 5 is Dangerous:**
- No proof that RED phase actually happened (may have skipped TDD)
- No verification that vague assertions were avoided
- No confirmation of 4-path coverage
- Impossible to audit during code review
- Erodes trust in "complete" certifications

### Quick Reference: Spotting Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|--------------|---------|-----|
| Vague Assertions | `toBeGreaterThanOrEqual(0)`, `toBeTruthy()` | Use exact values or `toMatchObject` |
| Missing Cleanup | No `afterEach`, no `TestCleanupManager` | Add cleanup in every test file |
| Incomplete Coverage | Only happy path tested | Add Sad, Edge, Error tests |
| Broken Mocks | Mock defined but never called | Use MSW or proper DI |
| No Evidence | "All tests pass" claim only | Provide screenshots, grep output, coverage matrix |

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

## 🔒 SECURITY VERIFICATION (AI-Generated Code)

**Research Finding:** 29.1% of AI-generated Python code contains security weaknesses.
45% of AI-assisted tasks introduce critical security flaws.

**CRITICAL:** AI coding tools have systematic security blind spots. This checklist is MANDATORY
for all AI-generated or AI-assisted code before merge.

### Mandatory Security Checklist

**Before merging any AI-generated code, verify:**

#### Secrets & Configuration
- [ ] **No hardcoded secrets** (passwords, API keys, tokens, connection strings)
- [ ] **No hardcoded environment values** (uses process.env or ConfigService)
- [ ] **Secrets use proper management** (env vars, vault, secrets manager)
- [ ] **Config files excluded from git** (.env files in .gitignore)

#### Input Validation
- [ ] **All user inputs validated** (length, type, format checks)
- [ ] **SQL parameterized** (no string concatenation in queries)
- [ ] **Path traversal prevented** (no `../` in file paths)
- [ ] **Command injection prevented** (no user input in shell commands)

#### Access Control
- [ ] **Authentication checks present** on protected routes
- [ ] **Authorization verified** (not just authentication)
- [ ] **Rate limiting configured** on public endpoints
- [ ] **CORS properly scoped** (not `*` in production)

#### Error Handling
- [ ] **No stack traces exposed** to clients
- [ ] **Sensitive data not logged** (passwords, tokens, PII)
- [ ] **Generic error messages** for users (detailed logs internally)

#### Dependencies
- [ ] **No known CVEs** in added dependencies
- [ ] **Minimal new dependencies** (avoid dependency bloat)
- [ ] **Dependencies from trusted sources** (npm, not random URLs)

### AI Security Anti-Patterns

**Common vulnerabilities AI introduces "for simplicity":**

```typescript
// ❌ AI Pattern: Hardcoded credentials
const db = new Database({
  host: "localhost",
  password: "admin123"  // AI added this "to get it working"
});

// ✅ Secure: Environment-based
const db = new Database({
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD
});

// ❌ AI Pattern: SQL concatenation
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Secure: Parameterized query
const query = sql`SELECT * FROM users WHERE id = ${userId}`;

// ❌ AI Pattern: Overly permissive CORS
app.use(cors({ origin: "*" }));  // AI added this "to fix CORS errors"

// ✅ Secure: Scoped CORS
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") }));

// ❌ AI Pattern: Exposed error details
catch (error) {
  res.status(500).json({ error: error.stack });  // Leaks internals
}

// ✅ Secure: Generic response
catch (error) {
  logger.error("Operation failed", { error });
  res.status(500).json({ error: "Internal server error" });
}
```

### Security Review Trigger

**Mandatory security review for AI-generated code touching:**
- Authentication/authorization logic
- Database queries
- File system operations
- External API calls
- User input processing
- Cryptographic operations
- Session management
- Payment/billing logic

**Reviewer must verify:** Each item in the security checklist above.

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

### AI-Specific Safety (NEW - Research-Backed)
- [ ] **Iteration count tracked**: Max 3 AI iterations before mandatory human review
- [ ] **DRY compliance verified**: Searched for existing utilities before creating new
- [ ] **False confidence countered**: Reviewed AI code with SAME rigor as human code
- [ ] **Context blindness checked**: No hardcoded env values, uses existing patterns
- [ ] **Security checklist completed**: All items in Security Verification section verified

### Security (For AI-Generated Code)
- [ ] **No hardcoded secrets**: All credentials from env vars or secret manager
- [ ] **Input validation present**: All user inputs sanitized and validated
- [ ] **SQL parameterized**: No string concatenation in database queries
- [ ] **Error handling secure**: No stack traces exposed, sensitive data not logged
- [ ] **CORS properly scoped**: Not using wildcard `*` in production
- [ ] **Dependencies vetted**: No known CVEs in new dependencies

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
2. **Pass AI suitability check** (is this task appropriate for AI?)
3. **Pass automated quality check** (`pnpm test:quality-check` - ZERO violations)
4. Start with a failing test (RED)
5. Be implemented minimally (GREEN)
6. Be refactored without behavior change (BLUE)
7. Pass all 4 coverage paths (Happy/Sad/Edge/Error)
8. Use specific assertions (no vague checks)
9. Use deterministic infrastructure
10. Pass all quality gates
11. **Pass security verification** (if AI-generated)
12. **Provide certification evidence** (screenshots, grep output, coverage matrix)

**Zero tolerance for:**
- **Bypassing existing services/aggregators** 
- **Skipping architecture audit (STEP 0)** 
- **Skipping automated quality check** (`pnpm test:quality-check`) ← NEW
- **Unchecked iteration loops** (max 3 before human review) ← NEW
- **Blind trust in AI code** (review with SAME rigor as human code) ← NEW
- **DRY violations** (search for existing utilities first) ← NEW
- **Security blind spots** (hardcoded secrets, SQL injection, etc.) ← NEW
- Placeholder tests
- TODO markers without implementation
- .skip without GitHub issue
- Vague assertions
- Production code without failing test
- Flaky tests

**Automated Enforcement:**

```bash
# Run BEFORE claiming "task complete"
pnpm test:quality-check

# Expected output:
# ✅ No vague assertions found
# ✅ No direct Date() usage in tests
# ✅ All test files have cleanup infrastructure
# ✅ No placeholder tests
# ✅ Consistent .test.ts naming
# ✅ All TDD compliance checks PASSED
```

**If quality check fails:**
- ❌ Task is NOT complete
- ❌ DO NOT claim "ready for review"
- ✅ Fix ALL violations reported by script
- ✅ Re-run `pnpm test:quality-check` until ZERO violations
- ✅ THEN collect evidence and certify

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
// Quality check passes: pnpm test:quality-check ✅
```

**Script Location:** `/tools/test-quality-check.sh`
**Usage:** `pnpm test:quality-check` or `bash tools/test-quality-check.sh`

**This is not negotiable. This is the standard.**

---

**Generated from:** 12 testing documents (~9,000 lines) + Task 4.1.A architecture violation analysis + External AI research

**Research Sources Integrated:**
- IEEE-ISTAS 2025: Iterative AI code degradation (37.6% vulnerability increase)
- METR/LinkedIn Study: Experienced developers 19% slower with AI
- GitClear Report: 8x increase in duplicate code blocks
- Stanford Study: False confidence effect in AI-assisted coding
- GitHub Statistics: 29.1% of AI Python code contains security weaknesses
- VentureBeat: AI coding agents operational awareness gaps

**Last Updated:** 2025-12-09 (Added STEP 0 + AI Safety Research)
**Authority:** Workspace-wide testing standard
