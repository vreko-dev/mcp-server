# Workflow 4: Dev Complete (Canonical TDD Implementation)

**Purpose:** Complete TDD implementation - RED → GREEN → REFACTOR → VERIFY → CERTIFY
**Entry:** Approved plan from `3_planning.md` or direct from `1_triage.md`
**Exit:** Working, tested, certified code

**Authority:** This is the CANONICAL implementation workflow. All development passes through this.

---

## Absolute Rules (Zero Tolerance)

### FORBIDDEN Patterns

1. **NEVER** write implementation before a failing test
2. **NEVER** use vague assertions: `.toBeTruthy()`, `.toBeDefined()` alone
3. **NEVER** skip the architecture audit (Phase 0)
4. **NEVER** bypass existing services with inline queries
5. **NEVER** mock what you're testing
6. **ALWAYS** require 4-path coverage: happy, sad, edge, error
7. **ALWAYS** search for existing utilities before creating new ones
8. **ALWAYS** run phase gates before claiming completion

### AI Safety Rules

- **Max 3 iterations** without human review
- **No blind trust** - always review generated code
- **Document deviations** with justification

---

## Phase Overview

```
PHASE 1: RED    → Write failing test
PHASE 2: GREEN  → Minimal implementation  
PHASE 3: REFACTOR → Improve code quality
PHASE 4: VERIFY → Quality checks
PHASE 5: CERTIFY → Final certification
```

---

## Phase 1: RED (Failing Test)

**Objective:** Prove the feature doesn't exist yet with a failing test.

### Steps

1. **Create test file** in correct location:
   ```
   [SERVICE_PATH]/__tests__/[SERVICE_NAME].test.ts
   ```

2. **Write test FIRST** - describe expected behavior:
   ```typescript
   describe("[FeatureName]", () => {
     it("should [expected behavior]", async () => {
       // Arrange
       const input = { /* valid input */ };
       
       // Act
       const result = await service.method(input);
       
       // Assert - SPECIFIC, not vague
       expect(result).toEqual({ 
         id: expect.any(String),
         status: "success",
         data: expect.objectContaining({ key: "value" })
       });
     });
   });
   ```

3. **Run test - MUST FAIL:**
   ```bash
   pnpm test [test-file] --run
   ```

4. **Capture evidence:**
   ```bash
   # Save failing test output
   pnpm test [test-file] --run 2>&1 | head -50 > ai_dev_utils/evidence/phase1-red.txt
   ```

### Required Test Paths

| Path | What to Test |
|------|--------------|
| **Happy** | Valid input → expected output |
| **Sad** | Invalid input → graceful error with message |
| **Edge** | Empty, null, boundary values |
| **Error** | Dependency failures (mocked) |

### Gate Check

```bash
./ai_dev_utils/scripts/gate.sh red
```

**Passes when:**
- [ ] Test file exists
- [ ] Test FAILS with expected error
- [ ] No vague assertions
- [ ] 4-path coverage planned

---

## Phase 2: GREEN (Minimal Implementation)

**Objective:** Write MINIMUM code to make test pass.

### Steps

1. **Implement in correct location** (from planning):
   ```typescript
   // Add to existing service, don't create new file unless justified
   async methodName(input: InputType): Promise<OutputType> {
     // Minimal implementation
   }
   ```

2. **Run test - MUST PASS:**
   ```bash
   pnpm test [test-file] --run
   ```

3. **Capture evidence:**
   ```bash
   pnpm test [test-file] --run 2>&1 > ai_dev_utils/evidence/phase2-green.txt
   ```

### Rules

- **Minimal means minimal** - no "while I'm here" additions
- **Use existing utilities** - don't reinvent
- **Follow canonical patterns** - see `patterns/codebase-patterns.md`

### Gate Check

```bash
./ai_dev_utils/scripts/gate.sh green
```

**Passes when:**
- [ ] All tests PASS
- [ ] Implementation is in correct service location
- [ ] No service layer bypasses
- [ ] No unused code added

---

## Phase 3: REFACTOR (Improve Quality)

**Objective:** Improve code quality WITHOUT changing behavior.

### Steps

1. **Identify improvements:**
   - Extract duplicate code
   - Improve naming
   - Simplify logic
   - Add proper error handling

2. **Make changes incrementally**

3. **Run tests after EACH change:**
   ```bash
   pnpm test [test-file] --run
   ```

4. **Verify no behavior changes:**
   - Same inputs → same outputs
   - No new functionality added

### Common Refactorings

| Pattern | Action |
|---------|--------|
| Duplicate code | Extract to utility in canonical location |
| Magic values | Extract to constants |
| Long functions | Extract smaller functions |
| Poor naming | Rename for clarity |

### Gate Check

```bash
./ai_dev_utils/scripts/gate.sh refactor
```

**Passes when:**
- [ ] All tests still pass
- [ ] No new functionality added
- [ ] Code quality improved

---

## Phase 4: VERIFY (Quality Checks)

**Objective:** Run all quality checks and verify completeness.

### Automated Checks

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# All tests
pnpm test --run

# Coverage (if applicable)
pnpm test --coverage
```

### Manual Verification

- [ ] 4-path coverage complete (happy, sad, edge, error)
- [ ] No vague assertions
- [ ] Service layer compliance (no bypasses)
- [ ] Canonical utilities used (no duplication)
- [ ] Documentation updated if needed

### Gate Check

```bash
./ai_dev_utils/scripts/gate.sh verify
```

---

## Phase 5: CERTIFY (Final Sign-off)

**Objective:** Document completion and capture learnings.

### Certification Template

```yaml
certification:
  task: "[DESCRIPTION]"
  completed_at: "[TIMESTAMP]"
  
implementation:
  service: "[PATH]"
  test: "[PATH]"
  lines_added: [NUMBER]
  lines_removed: [NUMBER]
  
quality:
  test_count: [NUMBER]
  coverage: "[PERCENTAGE]"
  all_gates_passed: true
  
4_path_coverage:
  happy: "[TEST_NAME]"
  sad: "[TEST_NAME]"
  edge: "[TEST_NAME]"
  error: "[TEST_NAME]"
  
learnings:
  - "[ANYTHING_LEARNED]"
  
ready_for_merge: true
```

### Record Learnings

If you learned something useful:

```bash
./ai_dev_utils/scripts/learn.sh "[type]" "[trigger]" "[action]" "[task-id]"
```

### Gate Check

```bash
./ai_dev_utils/scripts/gate.sh certify
```

**Passes when:**
- [ ] All previous gates passed
- [ ] Certification complete
- [ ] Evidence captured
- [ ] Learnings recorded

---

## Quick Reference

### Canonical Locations

| Component | Location |
|-----------|----------|
| Error Handling | `@snapback-oss/sdk/utils/errorHelpers.ts` |
| Retry Logic | `@snapback-oss/sdk/utils/retry.ts` |
| Logger | `@snapback/infrastructure/logging/logger.ts` |
| Auth | `@snapback/auth` |
| Types | `@snapback/contracts` |

### Test Utilities

| Utility | Purpose |
|---------|---------|
| `TestCleanupManager` | Cleanup after tests |
| `DeterministicTime` | Mock time consistently |
| `setupTestDatabase()` | Test DB setup |

### Assertion Patterns

```typescript
// ✅ GOOD - Specific
expect(result).toEqual({ id: "123", name: "test" });
expect(error.message).toBe("Invalid input: missing required field");

// ❌ BAD - Vague
expect(result).toBeTruthy();
expect(result).toBeDefined();
```

---

## Detailed Phase Docs

For comprehensive phase guidance, see:

| Phase | Document |
|-------|----------|
| 0 - Audit | `@phases/0-architecture-audit.md` |
| 1 - Red | `@phases/1-red-phase.md` |
| 2 - Green | `@phases/2-green-phase.md` |
| 3 - Refactor | `@phases/3-refactor-phase.md` |
| 4 - Quality | `@phases/4-quality-verification.md` |
| 5 - Certify | `@phases/5-certification.md` |

---

**Last Verified:** 2025-12-16
**Status:** active
**Authority:** Canonical TDD implementation workflow
