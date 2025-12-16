# Phase 4 Implementation Guide - TDD_CORE Compliant

**Status**: ✅ CORRECTED & VERIFIED
**Date**: 2025-12-09
**Authority**: TDD_CORE.md (Zero Tolerance)

---

## Quick Navigation

### DO NOT USE (Contains Violations)
- ❌ `arch_remediation.md` (Tasks 4.1-4.2 sections) - 11 TDD_CORE violations
- ❌ `PHASE_4_QUICK_START.md` - Skips gate protocol

### USE THESE INSTEAD (TDD_CORE Compliant)
- ✅ `TASK_4_1_TDD_COMPLIANT.md` - Full 6-phase guide with gates
- ✅ `TASK_4_2_TDD_COMPLIANT.md` - Full 6-phase guide with gates
- ✅ `TDD_CORE_VIOLATION_REPORT.md` - Complete violation analysis

---

## What Changed

### Document Comparison

| Aspect | Original | Compliant |
|--------|----------|-----------|
| **Structure** | Implementation first | Test-first TDD phases |
| **Phases** | None | 6 phases (0-5) with gates |
| **Gates** | None | Gate at each phase |
| **Tests** | Partial (50-75%) | Full 4-path (100%) |
| **Assertions** | Vague | Specific |
| **Infrastructure** | Missing | Complete |
| **Audit** | Mentioned | Phase 0 with commands |
| **Evidence** | None | Phase 5 with files |

### Key Structural Difference

**Original Flow** (❌ Wrong):
```
Hardcoded data → Implementation code → Tests → "Done"
```

**TDD_CORE Compliant Flow** (✅ Correct):
```
Phase 0: Audit (gate: audit)
├─ Phase 1: RED tests FIRST (gate: red)
├─ Phase 2: GREEN minimal implementation (gate: green)
├─ Phase 3: REFACTOR code cleanup (gate: refactor)
├─ Phase 4: QUALITY verification (gate: quality)
└─ Phase 5: CERTIFY with evidence (gate: certify)
```

---

## For Task 4.1: Dashboard Metrics

### Go Here
**File**: `/ai_dev_utils/TASK_4_1_TDD_COMPLIANT.md`

### What You'll Do
1. **Phase 0**: Run audit commands, document findings
2. **Phase 1**: Write 15 tests (3 happy + 3 sad + 5 edge + 4 error)
3. **Phase 2**: Add 2 methods to MetricsAggregator service
4. **Phase 3**: Refactor dashboard endpoint
5. **Phase 4**: Run quality checks (coverage, assertions, cleanup)
6. **Phase 5**: Collect evidence, certify completion

### Tests You'll Write
- ✅ Happy path: Real data aggregation (3 tests)
- ✅ Sad path: Empty users, old data (3 tests)
- ✅ Edge cases: Boundaries, concurrency, nulls (5 tests)
- ✅ Error cases: DB failures, corruption (4 tests)

### Time Estimate
4-6 hours (includes all phases + gates)

### Success Criteria
```bash
# All gates must pass
./ai_dev_utils/scripts/tdd-gate.sh certify --evidence-file=ai_dev_utils/evidence/task-4.1-certification.md

# Expected output:
# ✅ CERTIFICATION gate PASSED
# ✅ Task 4.1 COMPLETE
```

---

## For Task 4.2: Cloud Backup

### Go Here
**File**: `/ai_dev_utils/TASK_4_2_TDD_COMPLIANT.md`

### What You'll Do
1. **Phase 0**: Run audit commands, verify CloudBackupService
2. **Phase 1**: Write 15 tests with MSW S3 mocking (4 happy + 3 sad + 5 edge + 5 error)
3. **Phase 2**: Integrate CloudBackupService into snapshot creation
4. **Phase 3**: Extract helpers (validation, upload logic)
5. **Phase 4**: Run quality checks (MSW verification, env var handling)
6. **Phase 5**: Collect evidence, certify completion

### Tests You'll Write
- ✅ Happy path: Upload succeeds, checksums, large files (4 tests)
- ✅ Sad path: Feature disabled, env vars false (3 tests)
- ✅ Edge cases: Empty content, concurrency, special chars (5 tests)
- ✅ Error cases: S3 failures non-blocking, missing config (5 tests)

### Key Security Features Tested
- ✅ No hardcoded credentials
- ✅ Environment variable validation
- ✅ Encryption key handling
- ✅ Checksum verification
- ✅ Non-blocking error handling
- ✅ No sensitive data logging

### Time Estimate
5-8 hours (includes all phases + gates)

### Success Criteria
```bash
# All gates must pass
./ai_dev_utils/scripts/tdd-gate.sh certify --evidence-file=ai_dev_utils/evidence/task-4.2-certification.md

# Expected output:
# ✅ CERTIFICATION gate PASSED
# ✅ Task 4.2 COMPLETE
```

---

## Implementation Order

**Recommended Sequential Approach**:

### Day 1: Task 4.1 (4-6 hours)
1. Read `/ai_dev_utils/TASK_4_1_TDD_COMPLIANT.md` (20 min)
2. Execute Phase 0 audit (15 min)
3. Implement Phase 1-5 (3-5 hours)
4. Run certify gate
5. Commit: `feat(dashboard): Wire MetricsAggregator for real metrics`

### Day 2: Task 4.2 (5-8 hours)
1. Read `/ai_dev_utils/TASK_4_2_TDD_COMPLIANT.md` (20 min)
2. Execute Phase 0 audit (15 min)
3. Implement Phase 1-5 (4-7 hours)
4. Run certify gate
5. Commit: `feat(snapshots): Integrate CloudBackupService for S3 uploads`

**Total**: 1-2 days (9-14 hours)

---

## Critical Rules (TDD_CORE.md)

**You CANNOT proceed without**:

1. ✅ **Architecture Audit (Phase 0)** - MUST verify no service bypass
2. ✅ **RED Phase First** - Tests BEFORE implementation
3. ✅ **4-Path Coverage** - Happy, Sad, Edge, Error (100%)
4. ✅ **Specific Assertions** - No `.toBeTruthy()`, `.toBeDefined()`
5. ✅ **Test Infrastructure** - TestCleanupManager, DeterministicTime
6. ✅ **Gate Verification** - Each phase must pass gate
7. ✅ **Evidence Collection** - Phase 5 documentation

**You CANNOT do**:
- ❌ Bypass the gate protocol
- ❌ Skip any phase
- ❌ Use vague assertions
- ❌ Skip 4-path coverage
- ❌ Use vi.mock for HTTP (use MSW)
- ❌ Claim completion without gate passing

---

## Violation Report

For complete violation analysis, see:
**File**: `/ai_dev_utils/TDD_CORE_VIOLATION_REPORT.md`

**Summary**:
- 11 violations found in original documents
- 11 violations fixed in compliant guides
- Violations ranged from CRITICAL to MEDIUM severity
- 100% compliance achieved

---

## Questions & Answers

### Q: Why are the compliant guides so much longer?
**A**: TDD_CORE.md requires:
- Architecture audit with commands (Phase 0)
- Complete 4-path test coverage (not 50%)
- Gate commands at each phase (not shown in original)
- Evidence collection and certification (Phase 5)
- Detailed explanations of each phase

Original documents were incomplete implementations without TDD_CORE compliance.

### Q: What if I follow the original documents?
**A**: Your implementation will:
- Fail the gate protocol
- Have incomplete test coverage
- Lack architecture audit evidence
- Skip quality verification
- Be rejected in code review

### Q: How long will this take?
**A**:
- Task 4.1: 4-6 hours
- Task 4.2: 5-8 hours
- Total: 1-2 days (9-14 hours)

This includes ALL phases + gates + evidence collection.

### Q: What about the original arch_remediation.md?
**A**: It contains good architectural insights but violates TDD_CORE.md in execution. Use it as reference for WHAT to implement, but follow TASK_4_X_TDD_COMPLIANT.md for HOW to implement.

---

## Document Index

### Read First
1. `/ai_dev_utils/TDD_CORE.md` - Absolute rules (must understand)
2. This document - Navigation guide
3. `/ai_dev_utils/TDD_CORE_VIOLATION_REPORT.md` - What was wrong

### Then Use
4. `/ai_dev_utils/TASK_4_1_TDD_COMPLIANT.md` - Task 4.1 full guide
5. `/ai_dev_utils/TASK_4_2_TDD_COMPLIANT.md` - Task 4.2 full guide

### Reference
- `INTEGRATION_GAPS_REMEDIATION_ROADMAP.md` - Strategic overview
- `arch_remediation.md` - Architectural details (reference only)

---

## Commit Strategy

**Per Memory: "Prefer grouping related changes into coherent commits"**

### Task 4.1 Commit
```bash
git add apps/api/src/services/metrics-aggregator.ts
git add apps/api/modules/dashboard/procedures/get-metrics.ts
git add apps/api/test/integration/dashboard/metrics-aggregation.test.ts
git add ai_dev_utils/evidence/task-4.1-*.md

git commit -m "feat(dashboard): Wire MetricsAggregator for real metrics (Task 4.1)

- Add getAIToolDetectionCounts() method to MetricsAggregator
- Add getRecentActivity() method to MetricsAggregator
- Update dashboard endpoint to use aggregated data
- Replace hardcoded zeros with real metrics
- Add comprehensive test suite: 15 tests covering 4 paths

Fixes: INTEGRATION_GAPS_REMEDIATION_ROADMAP Task 4.1
TDD Gates: All 6 phases complete, all gates PASSED"
```

### Task 4.2 Commit
```bash
git add apps/api/modules/snapshots/procedures/create-snapshot.ts
git add apps/api/test/integration/snapshots/cloud-backup.test.ts
git add ai_dev_utils/evidence/task-4.2-*.md

git commit -m "feat(snapshots): Integrate CloudBackupService for S3 uploads (Task 4.2)

- Instantiate CloudBackupService in snapshot creation flow
- Upload to S3 with encryption and checksumming
- Handle S3 upload failures non-blocking (snapshot succeeds)
- Add S3 configuration validation
- Support ENABLE_CLOUD_BACKUP feature flag
- Add comprehensive test suite: 15 tests covering 4 paths
- Use MSW for S3 integration testing

Fixes: INTEGRATION_GAPS_REMEDIATION_ROADMAP Task 4.2
TDD Gates: All 6 phases complete, all gates PASSED"
```

---

## Verification Checklist

Before claiming any task complete:

- [ ] Read entire compliant guide (`TASK_4_X_TDD_COMPLIANT.md`)
- [ ] Phase 0 audit commands executed
- [ ] Phase 1 RED tests created and failing
- [ ] `./ai_dev_utils/scripts/tdd-gate.sh red` PASSING
- [ ] Phase 2 GREEN implementation minimal
- [ ] `./ai_dev_utils/scripts/tdd-gate.sh green` PASSING
- [ ] Phase 3 REFACTOR code cleaned
- [ ] `./ai_dev_utils/scripts/tdd-gate.sh refactor` PASSING
- [ ] Phase 4 quality checks run
- [ ] `./ai_dev_utils/scripts/tdd-gate.sh quality` PASSING
- [ ] Phase 5 evidence collected
- [ ] `./ai_dev_utils/scripts/tdd-gate.sh certify` PASSING
- [ ] Commit message includes gate status
- [ ] All gates PASSED before pushing

---

## Support

If you encounter issues:

1. **Check gate output**: `./ai_dev_utils/scripts/tdd-gate.sh [phase] --debug`
2. **Review violation report**: `/ai_dev_utils/TDD_CORE_VIOLATION_REPORT.md`
3. **Reference compliant guides**: `/ai_dev_utils/TASK_4_X_TDD_COMPLIANT.md`
4. **Check TDD_CORE rules**: `/ai_dev_utils/TDD_CORE.md` (absolute rules)

---

**Status**: ✅ Ready for Implementation
**Compliance**: 100% TDD_CORE.md
**Date**: 2025-12-09
**Authority**: TDD_CORE.md (Zero Tolerance)
