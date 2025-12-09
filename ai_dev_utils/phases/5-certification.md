# Phase 5: Certification

**Entry:** Quality verification complete (all checks pass)
**Exit:** Gate `certify` passes

---

## Evidence Collection

### 1. RED Phase Evidence

**Failing test screenshot:**
```
Location: ai_dev_utils/state/red-phase-output.txt
```

**Verify:**
```bash
cat ai_dev_utils/state/red-phase-output.txt | grep "FAIL"
```

**Expected output:**
```
❌ FAIL  apps/api/src/services/__tests__/metrics-aggregator.test.ts
  ● MetricsAggregator › getAIToolDetectionCounts
    TypeError: aggregator.getAIToolDetectionCounts is not a function
```

**Checklist:**
- [ ] Test failed for correct reason (method doesn't exist)
- [ ] Error message proves test is actually testing something
- [ ] No syntax errors (test is valid code)

---

### 2. GREEN Phase Evidence

**Passing test screenshot:**
```
Location: ai_dev_utils/state/green-phase-output.txt
```

**Verify:**
```bash
cat ai_dev_utils/state/green-phase-output.txt | grep "PASS"
```

**Expected output:**
```
✅ PASS  apps/api/src/services/__tests__/metrics-aggregator.test.ts
Test Files  1 passed (1)
     Tests  1 passed (1)
```

**Checklist:**
- [ ] Test passes
- [ ] Implementation is minimal
- [ ] Implementation is in correct service location

---

### 3. Quality Verification Evidence

**Quality check output:**
```
Location: ai_dev_utils/state/quality-output.txt
```

**Verify automated checks passed:**
```bash
bash tools/test-quality-check.sh
```

**Expected output:**
```
✅ All TDD compliance checks PASSED
```

**Checklist:**
- [ ] No vague assertions
- [ ] No direct Date() usage
- [ ] All files have cleanup infrastructure
- [ ] No placeholder tests
- [ ] 4-path coverage complete

---

### 4. Coverage Matrix

**Complete this matrix:**

| Method | Happy | Sad | Edge | Error |
|--------|-------|-----|------|-------|
| `[METHOD_1]` | ✅ | ✅ | ✅ | ✅ |
| `[METHOD_2]` | ✅ | ✅ | ✅ | ✅ |

**Example:**

| Method | Happy | Sad | Edge | Error |
|--------|-------|-----|------|-------|
| `getAIToolDetectionCounts` | ✅ Line 42 | ✅ Line 56 | ✅ Line 72 | ✅ Line 89 |

**Verify each path:**
```bash
# Show test names
grep -n "it('should" [TEST_FILE]
```

---

### 5. Architecture Compliance

**Service location:**
```
[PATH TO SERVICE FILE]
```

**Test location:**
```
[PATH TO TEST FILE]
```

**Verify no service bypasses:**
```bash
# Check procedures don't have inline DB queries
grep -n "db\.\|prisma\." apps/api/modules/*/procedures/*.ts | grep -v "// Service call"
```

**Result:**
```
[SHOULD BE EMPTY or only service instantiation]
```

---

### 6. Git Diff Evidence

**Show changes:**
```bash
git diff --cached | head -100
```

**Or create patch:**
```bash
git diff > ai_dev_utils/state/task-changes.patch
```

**Verify:**
- [ ] Test file changes committed
- [ ] Implementation file changes committed
- [ ] No unrelated changes included

---

## Certification Statement

```yaml
task: "[TASK DESCRIPTION]"
status: COMPLETE
date: [YYYY-MM-DD]

evidence:
  red_phase:
    test_file: "[PATH]"
    failure_type: "Method not implemented"
    output: "ai_dev_utils/state/red-phase-output.txt"
  
  green_phase:
    implementation_file: "[PATH]"
    test_status: "PASSING"
    output: "ai_dev_utils/state/green-phase-output.txt"
  
  quality:
    vague_assertions: 0
    direct_date_usage: 0
    cleanup_infrastructure: YES
    four_path_coverage: COMPLETE
    service_layer_compliance: YES
    output: "ai_dev_utils/state/quality-output.txt"
  
  coverage_matrix:
    - method: "[METHOD_NAME]"
      happy: "✅ Line X"
      sad: "✅ Line Y"
      edge: "✅ Line Z"
      error: "✅ Line W"

architecture:
  service_location: "[PATH]"
  test_location: "[PATH]"
  bypasses: NONE
  canonical_locations: VERIFIED

violations: []

certification: |
  I certify that:
  - This implementation follows TDD workflow (RED → GREEN → REFACTOR)
  - All quality gates passed
  - 4-path test coverage is complete
  - No service layer bypasses exist
  - All evidence is captured and verifiable
  - No shortcuts were taken

signed: [AGENT_NAME]
```

---

## Save Certification

```bash
# Save certification to state file
jq '.certification = {
  "status": "COMPLETE",
  "date": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
  "evidence": {
    "redPhase": "ai_dev_utils/state/red-phase-output.txt",
    "greenPhase": "ai_dev_utils/state/green-phase-output.txt",
    "quality": "ai_dev_utils/state/quality-output.txt"
  },
  "fourPathCoverage": "COMPLETE",
  "serviceLayerCompliance": "YES",
  "violations": []
}' ai_dev_utils/state/current-task.json > tmp.json && \
  mv tmp.json ai_dev_utils/state/current-task.json
```

---

## Exit Gate

**Run:**
```bash
./ai_dev_utils/scripts/tdd-gate.sh certify
```

**Gate checks:**
- [ ] RED phase evidence exists
- [ ] GREEN phase evidence exists
- [ ] Quality checks all passed
- [ ] 4-path coverage matrix complete
- [ ] Architecture compliance verified
- [ ] Certification statement saved to state

**If PASS:** Task is DONE ✅
**If FAIL:** Missing evidence, collect and retry

---

## Final Verification

Before marking task complete:

### 1. Run Full Test Suite
```bash
pnpm test
```

**Expected:** All tests pass

### 2. Run Type Check
```bash
pnpm type-check
```

**Expected:** No type errors

### 3. Run Linter
```bash
pnpm lint
```

**Expected:** No lint errors

### 4. Run Quality Check
```bash
bash tools/test-quality-check.sh
```

**Expected:** All checks pass

---

## Completion Checklist

- [ ] All phases completed (AUDIT → RED → GREEN → REFACTOR → VERIFY)
- [ ] All gates passed
- [ ] Evidence collected for RED, GREEN, and QUALITY phases
- [ ] 4-path coverage matrix complete
- [ ] No vague assertions
- [ ] No service bypasses
- [ ] No violations logged
- [ ] Certification statement saved
- [ ] Tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Ready for code review

---

## What Happens Next

**Task is DONE:**
```bash
# Update state to DONE
jq '.phase = "DONE"' ai_dev_utils/state/current-task.json > tmp.json && \
  mv tmp.json ai_dev_utils/state/current-task.json

# Show completion message
echo "✅ Task Complete!"
echo "Evidence captured in ai_dev_utils/state/"
echo "Ready for code review and PR submission"
```

**For next task:**
```bash
# Start new workflow
./ai_dev_utils/scripts/tdd-start.sh "New task description"
```

---

## Common Certification Failures

### Failure 1: Missing Evidence

**Problem:**
```
red-phase-output.txt not found
```

**Fix:** Go back to RED phase, capture evidence, save to state.

### Failure 2: Incomplete Coverage

**Problem:**
```
Coverage matrix shows:
✅ Happy
✅ Sad
❌ Edge - MISSING
❌ Error - MISSING
```

**Fix:** Go back to Phase 4, add missing paths, re-verify.

### Failure 3: Service Bypass Detected

**Problem:**
```bash
$ grep -n "db\." apps/api/modules/dashboard/procedures/get-metrics.ts
15: const data = await db.select().from(metrics);
```

**Fix:** Refactor to use service layer, re-test, re-verify.

---

**Remember:**
- Certification is NOT optional
- Evidence proves you followed TDD workflow
- Without evidence, task is NOT complete
- Quality gates exist to prevent technical debt

**Last Updated:** 2025-12-09
