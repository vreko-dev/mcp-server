# Test File Cleanup - apps/api

## Objective

Identify and remediate placeholder test files in `apps/api` that contain skipped tests without explanations, trivial assertions, or incomplete TODO markers. Improve test quality and reduce noise in test suite reporting.

## Scope

### Target Directory
- `apps/api` and all subdirectories
- File patterns: `*.test.ts`, `*.spec.ts`

### Detection Criteria

| Pattern | Description | Action Required |
|---------|-------------|-----------------|
| `it.skip` or `describe.skip` without explanation | Skipped tests with no comment explaining why | Add reason comment or delete |
| `expect(true).toBe(true)` | Trivial placeholder assertion | Replace with real assertion or mark skip |
| `// TODO` inside test body with no assertions | Incomplete test stubs | Add `.skip` with reason or implement |

## Analysis Results

### Files Requiring Action

#### 1. lifecycle-state-machine.red.test.ts

**Location:** `apps/api/modules/lifecycle/tests/lifecycle-state-machine.red.test.ts`

**Status:** TDD RED Phase File (Intentional Placeholders)

**Analysis:**
- Contains 16 instances of `expect(true).toBe(true)` with "Placeholder" comments
- All tests are part of TDD RED phase (failing tests before implementation)
- File header explicitly states: "These tests FAIL initially (RED phase) until schema and LifecycleEngine are implemented"
- Tests document expected behavior for lifecycle state machine transitions

**Recommendation:** **PRESERVE - No Action Required**

**Rationale:**
- This is a valid TDD RED phase specification
- Placeholders are intentional and documented
- Tests serve as implementation specification
- File follows TDD methodology (TDD_CORE.md rule)

#### 2. snapshots.test.ts

**Location:** `apps/api/modules/snapshots/tests/snapshots.test.ts`

**Status:** Partially Implemented

**Issues Found:**
- Line 374: `expect(true).toBe(true); // Cascade is in schema`

**Analysis:**
- Single trivial assertion in test: "should delete associated files (cascade)"
- Comment indicates cascade is handled by database schema, not application logic
- Test validates database foreign key constraint behavior

**Recommendation:** **Add .skip with Reason**

**Proposed Change:**
```
Change test from:
  it("should delete associated files (cascade)", async () => { ... })

To:
  it.skip("should delete associated files (cascade) - DB schema validation only", async () => { ... })
```

**Rationale:**
- Cascade behavior is database-level, not application-level
- Testing requires database integration test setup
- Current placeholder provides no validation value

#### 3. email-orchestrator.test.ts

**Location:** `apps/api/modules/webhooks/tests/email-orchestrator.test.ts`

**Status:** Partially Implemented

**Issues Found:**
- Line 44: `expect(true).toBe(true);` in "should enqueue campaign emails" test

**Analysis:**
- Test only validates "no errors thrown"
- Uses in-memory storage that cannot be inspected
- Comment acknowledges inability to verify behavior: "Since we're using in-memory storage, we can't directly check the queue"

**Recommendation:** **Add .skip with Reason**

**Proposed Change:**
```
Change test from:
  it("should enqueue campaign emails", async () => { ... })

To:
  it.skip("should enqueue campaign emails - requires queue inspection capability", async () => { ... })
```

**Rationale:**
- Current assertion provides no value
- Test infrastructure lacks queue inspection capability
- Should be re-enabled when queue can be verified

### Files Not Requiring Action

All other test files in `apps/api` contain meaningful assertions and implemented tests.

## Remediation Plan

### Phase 1: Mark Ineffective Tests

| File | Test Name | Line | Action |
|------|-----------|------|--------|
| snapshots.test.ts | should delete associated files (cascade) | 374 | Add `.skip` with reason comment |
| email-orchestrator.test.ts | should enqueue campaign emails | 44 | Add `.skip` with reason comment |

### Phase 2: Verification

Run test suite and confirm:
- Total test count decreases by 2 (skipped tests not counted in pass/fail)
- No unexpected failures from changes
- Skip reasons appear in test output

**Verification Command:**
```
pnpm --filter @snapback/api test
```

**Expected Output Changes:**
- Before: N tests passing
- After: N-2 tests passing, 2 skipped (with reasons displayed)

## Impact Assessment

### Test Coverage Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total Tests in apps/api | 25 files | 25 files | No change |
| Active Test Count | ~150 tests | ~148 tests | -2 tests |
| Skipped Tests | Unknown | 2 (documented) | +2 skip markers |
| Placeholder Assertions | 18 instances | 16 instances | -2 instances |
| Files Deleted | 0 | 0 | No deletions |

### Benefits

1. **Clarity:** Skip reasons make test suite status transparent
2. **Noise Reduction:** Eliminates false-positive passing tests
3. **Documentation:** Skip comments serve as TODO markers for future work
4. **Metrics Accuracy:** Test pass rate reflects actual validated behavior

### Risks

**Low Risk:**
- Changes only add `.skip` modifiers, do not delete code
- Skipped tests remain in codebase for future implementation
- No impact on CI/CD pipelines (skipped tests don't fail builds)

## Success Criteria

- [ ] All trivial `expect(true).toBe(true)` assertions outside TDD RED files are marked skip
- [ ] Skip markers include clear reason comments
- [ ] Test suite runs successfully with updated skip markers
- [ ] Test count decreases by exactly 2 active tests
- [ ] No files deleted (all placeholder tests have value as specifications)

## Notes

### TDD RED Phase Exception

Files explicitly marked as TDD RED phase (like `lifecycle-state-machine.red.test.ts`) are **exempt** from cleanup. These files:
- Intentionally contain placeholder assertions
- Document expected behavior before implementation
- Follow TDD_CORE.md methodology
- Should transition to GREEN phase when functionality is implemented

### Future Work

Tests marked skip should be re-enabled when:
1. **snapshots.test.ts cascade test:** Integration test infrastructure supports database constraint validation
2. **email-orchestrator.test.ts enqueue test:** Queue inspection capability is added to test harness

## References

### Project Rules
- `TDD_CORE.md` - Test-Driven Development methodology
- `files-testing-vitest.md` - Vitest testing patterns

### Related Files
- `apps/api/modules/lifecycle/tests/lifecycle-state-machine.red.test.ts` (TDD RED phase - preserve)
- `apps/api/modules/snapshots/tests/snapshots.test.ts` (1 test requires skip marker)
- `apps/api/modules/webhooks/tests/email-orchestrator.test.ts` (1 test requires skip marker)

**Rationale:**
- This is a valid TDD RED phase specification
- Placeholders are intentional and documented
- Tests serve as implementation specification
- File follows TDD methodology (TDD_CORE.md rule)

#### 2. snapshots.test.ts

**Location:** `apps/api/modules/snapshots/tests/snapshots.test.ts`

**Status:** Partially Implemented

**Issues Found:**
- Line 374: `expect(true).toBe(true); // Cascade is in schema`

**Analysis:**
- Single trivial assertion in test: "should delete associated files (cascade)"
- Comment indicates cascade is handled by database schema, not application logic
- Test validates database foreign key constraint behavior

**Recommendation:** **Add .skip with Reason**

**Proposed Change:**
```
Change test from:
  it("should delete associated files (cascade)", async () => { ... })

To:
  it.skip("should delete associated files (cascade) - DB schema validation only", async () => { ... })
```

**Rationale:**
- Cascade behavior is database-level, not application-level
- Testing requires database integration test setup
- Current placeholder provides no validation value

#### 3. email-orchestrator.test.ts

**Location:** `apps/api/modules/webhooks/tests/email-orchestrator.test.ts`

**Status:** Partially Implemented

**Issues Found:**
- Line 44: `expect(true).toBe(true);` in "should enqueue campaign emails" test

**Analysis:**
- Test only validates "no errors thrown"
- Uses in-memory storage that cannot be inspected
- Comment acknowledges inability to verify behavior: "Since we're using in-memory storage, we can't directly check the queue"

**Recommendation:** **Add .skip with Reason**

**Proposed Change:**
```
Change test from:
  it("should enqueue campaign emails", async () => { ... })

To:
  it.skip("should enqueue campaign emails - requires queue inspection capability", async () => { ... })
```

**Rationale:**
- Current assertion provides no value
- Test infrastructure lacks queue inspection capability
- Should be re-enabled when queue can be verified

### Files Not Requiring Action

All other test files in `apps/api` contain meaningful assertions and implemented tests.

## Remediation Plan

### Phase 1: Mark Ineffective Tests

| File | Test Name | Line | Action |
|------|-----------|------|--------|
| snapshots.test.ts | should delete associated files (cascade) | 374 | Add `.skip` with reason comment |
| email-orchestrator.test.ts | should enqueue campaign emails | 44 | Add `.skip` with reason comment |

### Phase 2: Verification

Run test suite and confirm:
- Total test count decreases by 2 (skipped tests not counted in pass/fail)
- No unexpected failures from changes
- Skip reasons appear in test output

**Verification Command:**
```
pnpm --filter @snapback/api test
```

**Expected Output Changes:**
- Before: N tests passing
- After: N-2 tests passing, 2 skipped (with reasons displayed)

## Impact Assessment

### Test Coverage Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total Tests in apps/api | 25 files | 25 files | No change |
| Active Test Count | ~150 tests | ~148 tests | -2 tests |
| Skipped Tests | Unknown | 2 (documented) | +2 skip markers |
| Placeholder Assertions | 18 instances | 16 instances | -2 instances |
| Files Deleted | 0 | 0 | No deletions |

### Benefits

1. **Clarity:** Skip reasons make test suite status transparent
2. **Noise Reduction:** Eliminates false-positive passing tests
3. **Documentation:** Skip comments serve as TODO markers for future work
4. **Metrics Accuracy:** Test pass rate reflects actual validated behavior

### Risks

**Low Risk:**
- Changes only add `.skip` modifiers, do not delete code
- Skipped tests remain in codebase for future implementation
- No impact on CI/CD pipelines (skipped tests don't fail builds)

## Success Criteria

- [ ] All trivial `expect(true).toBe(true)` assertions outside TDD RED files are marked skip
- [ ] Skip markers include clear reason comments
- [ ] Test suite runs successfully with updated skip markers
- [ ] Test count decreases by exactly 2 active tests
- [ ] No files deleted (all placeholder tests have value as specifications)

## Notes

### TDD RED Phase Exception

Files explicitly marked as TDD RED phase (like `lifecycle-state-machine.red.test.ts`) are **exempt** from cleanup. These files:
- Intentionally contain placeholder assertions
- Document expected behavior before implementation
- Follow TDD_CORE.md methodology
- Should transition to GREEN phase when functionality is implemented

### Future Work

Tests marked skip should be re-enabled when:
1. **snapshots.test.ts cascade test:** Integration test infrastructure supports database constraint validation
2. **email-orchestrator.test.ts enqueue test:** Queue inspection capability is added to test harness

## References

### Project Rules
- `TDD_CORE.md` - Test-Driven Development methodology
- `files-testing-vitest.md` - Vitest testing patterns

### Related Files
- `apps/api/modules/lifecycle/tests/lifecycle-state-machine.red.test.ts` (TDD RED phase - preserve)
- `apps/api/modules/snapshots/tests/snapshots.test.ts` (1 test requires skip marker)
- `apps/api/modules/webhooks/tests/email-orchestrator.test.ts` (1 test requires skip marker)
