# Task 4 Implementation Index - TDD_CORE Compliant

**Status**: ✅ READY FOR IMPLEMENTATION
**Date**: 2025-12-09
**Authority**: TDD_CORE.md (Zero Tolerance)

---

## Files in This Review

### 📋 START HERE (Quick Overview)
1. **REVIEW_SUMMARY.md** (this folder)
   - 11 violations found and fixed
   - Quick status overview
   - Key improvements summary

### 🗺️ NAVIGATION GUIDE
2. **CORRECTED_PHASE_4_GUIDE.md** (this folder)
   - What changed from original
   - Implementation order
   - Critical rules
   - Q&A

### 📊 VIOLATION ANALYSIS
3. **TDD_CORE_VIOLATION_REPORT.md** (this folder)
   - Detailed analysis of all 11 violations
   - Before/after examples
   - Compliance checklist

### 🔧 IMPLEMENTATION GUIDES (TDD_CORE Compliant)
4. **TASK_4_1_TDD_COMPLIANT.md** (this folder)
   - **Task 4.1: Dashboard Metrics Aggregation**
   - 6 phases with gates
   - 15 tests (100% 4-path coverage)
   - Effort: 4-6 hours

5. **TASK_4_2_TDD_COMPLIANT.md** (this folder)
   - **Task 4.2: Cloud Backup Upload**
   - 6 phases with gates
   - 15 tests (100% 4-path coverage)
   - Effort: 5-8 hours

---

## Phase Structure (Both Tasks)

Each task follows this structure with gate verification:

```
Phase 0: Architecture Audit
├─ Verify services exist
├─ Check for duplicates
├─ Document audit trail
└─ Gate: ./ai_dev_utils/scripts/tdd-gate.sh audit

Phase 1: RED - Write Failing Tests
├─ Happy path (3-4 tests)
├─ Sad path (2-3 tests)
├─ Edge cases (5 tests)
├─ Error cases (4-5 tests)
└─ Gate: ./ai_dev_utils/scripts/tdd-gate.sh red

Phase 2: GREEN - Minimal Implementation
├─ Implement only what tests require
├─ No extra features
└─ Gate: ./ai_dev_utils/scripts/tdd-gate.sh green

Phase 3: REFACTOR - Code Cleanup
├─ Extract helpers
├─ Improve readability
├─ Tests still pass
└─ Gate: ./ai_dev_utils/scripts/tdd-gate.sh refactor

Phase 4: QUALITY - Verify Standards
├─ Run pnpm test:quality-check
├─ Check coverage (90%+ lines, 85%+ branches)
├─ Verify assertions (no vague ones)
└─ Gate: ./ai_dev_utils/scripts/tdd-gate.sh quality

Phase 5: CERTIFY - Collect Evidence
├─ Create evidence files
├─ Document completion
├─ Prepare commit message
└─ Gate: ./ai_dev_utils/scripts/tdd-gate.sh certify
```

---

## Task 4.1: Dashboard Metrics

### Quick Facts
- **File**: TASK_4_1_TDD_COMPLIANT.md
- **Effort**: 4-6 hours
- **Tests**: 15 (3+3+5+4)
- **Coverage**: 100% (4-path model)
- **Service**: MetricsAggregator

### What Gets Done
1. Add `getAIToolDetectionCounts()` method to MetricsAggregator
2. Add `getRecentActivity()` method to MetricsAggregator
3. Update dashboard endpoint to use real data
4. Replace hardcoded zeros with aggregated metrics
5. Complete test suite with all paths covered

### Key Files Modified
- `/apps/api/src/services/metrics-aggregator.ts` (add methods)
- `/apps/api/modules/dashboard/procedures/get-metrics.ts` (use service)
- `/apps/api/test/integration/dashboard/metrics-aggregation.test.ts` (new)

---

## Task 4.2: Cloud Backup

### Quick Facts
- **File**: TASK_4_2_TDD_COMPLIANT.md
- **Effort**: 5-8 hours
- **Tests**: 15 (4+3+5+5)
- **Coverage**: 100% (4-path model)
- **Service**: CloudBackupService

### What Gets Done
1. Integrate CloudBackupService into snapshot creation
2. Upload snapshots to S3 with encryption
3. Store cloudBackupUrl and checksum
4. Handle S3 failures non-blocking
5. Validate environment variables
6. Complete test suite with MSW mocking

### Key Files Modified
- `/apps/api/modules/snapshots/procedures/create-snapshot.ts` (integrate service)
- `/apps/api/test/integration/snapshots/cloud-backup.test.ts` (new)
- `.env` configuration (S3_BUCKET_NAME, S3_REGION, ENABLE_CLOUD_BACKUP)

---

## Test Coverage Comparison

### Task 4.1: Dashboard Metrics

| Path Type | Original | Compliant | Tests |
|-----------|----------|-----------|-------|
| **Happy** | 3 tests | 3 tests | Real aggregation |
| **Sad** | MISSING ❌ | 3 tests | Empty data, old data |
| **Edge** | MISSING ❌ | 5 tests | Boundaries, concurrency, nulls |
| **Error** | MISSING ❌ | 4 tests | DB failures, corruption |
| **TOTAL** | 25% (1/4) | **100% (4/4)** | **15 tests** |

### Task 4.2: Cloud Backup

| Path Type | Original | Compliant | Tests |
|-----------|----------|-----------|-------|
| **Happy** | 2 tests | 4 tests | Upload, checksums, large files |
| **Sad** | 2 tests | 3 tests | Disabled, feature flags |
| **Edge** | MISSING ❌ | 5 tests | Empty content, concurrency, special chars |
| **Error** | MISSING ❌ | 5 tests | S3 failures (non-blocking), missing config |
| **TOTAL** | 50% (2/4) | **100% (4/4)** | **15 tests** |

---

## Critical Rules (TDD_CORE.md)

### These are NON-NEGOTIABLE

1. ✅ **NEVER write implementation before a failing test exists**
   - RED phase FIRST
   - Tests must FAIL before implementation

2. ✅ **NEVER bypass the service layer**
   - MetricsAggregator for task 4.1
   - CloudBackupService for task 4.2

3. ✅ **NEVER use vague assertions**
   - ❌ `.toBeGreaterThan(0)`
   - ❌ `.toBeTruthy()`
   - ✅ `.toMatchObject({ copilot: 2, ... })`
   - ✅ `.toEqual([...])`

4. ✅ **NEVER skip the architecture audit (Phase 0)**
   - Run grep and find commands
   - Document audit trail

5. ✅ **ALWAYS require 4-path coverage**
   - Happy, Sad, Edge, Error
   - 100%, not 50%

6. ✅ **ALWAYS run phase gates**
   - Each phase must pass gate
   - No skipping phases

---

## Implementation Checklist

### Pre-Implementation
- [ ] Read this index (5 min)
- [ ] Read CORRECTED_PHASE_4_GUIDE.md (5 min)
- [ ] Read TDD_CORE_VIOLATION_REPORT.md (10 min)
- [ ] Read TDD_CORE.md (15 min)
- [ ] Understand 6-phase gate protocol

### For Task 4.1
- [ ] Read TASK_4_1_TDD_COMPLIANT.md completely
- [ ] Phase 0: Run audit commands
- [ ] Phase 1: Write 15 tests (must fail first!)
- [ ] Gate: `./ai_dev_utils/scripts/tdd-gate.sh red` PASSES
- [ ] Phase 2: Implement minimal code
- [ ] Gate: `./ai_dev_utils/scripts/tdd-gate.sh green` PASSES
- [ ] Phase 3: Refactor
- [ ] Gate: `./ai_dev_utils/scripts/tdd-gate.sh refactor` PASSES
- [ ] Phase 4: Quality check
- [ ] Gate: `./ai_dev_utils/scripts/tdd-gate.sh quality` PASSES
- [ ] Phase 5: Collect evidence
- [ ] Gate: `./ai_dev_utils/scripts/tdd-gate.sh certify` PASSES
- [ ] Commit: "feat(dashboard): Wire MetricsAggregator for real metrics"

### For Task 4.2
- [ ] Read TASK_4_2_TDD_COMPLIANT.md completely
- [ ] Phase 0: Run audit commands
- [ ] Phase 1: Write 15 tests (with MSW, not vi.mock)
- [ ] Gate: `./ai_dev_utils/scripts/tdd-gate.sh red` PASSES
- [ ] Phase 2: Implement minimal code
- [ ] Gate: `./ai_dev_utils/scripts/tdd-gate.sh green` PASSES
- [ ] Phase 3: Refactor
- [ ] Gate: `./ai_dev_utils/scripts/tdd-gate.sh refactor` PASSES
- [ ] Phase 4: Quality check
- [ ] Gate: `./ai_dev_utils/scripts/tdd-gate.sh quality` PASSES
- [ ] Phase 5: Collect evidence
- [ ] Gate: `./ai_dev_utils/scripts/tdd-gate.sh certify` PASSES
- [ ] Commit: "feat(snapshots): Integrate CloudBackupService for S3 uploads"

---

## Document Reading Order

### For Quick Overview (30 minutes)
1. This file (TASK_4_INDEX.md) - 10 min
2. REVIEW_SUMMARY.md - 10 min
3. CORRECTED_PHASE_4_GUIDE.md (Q&A section) - 10 min

### For Complete Understanding (1 hour)
1. This file (TASK_4_INDEX.md) - 10 min
2. REVIEW_SUMMARY.md - 10 min
3. CORRECTED_PHASE_4_GUIDE.md - 15 min
4. TDD_CORE_VIOLATION_REPORT.md (summary section) - 15 min
5. /ai_dev_utils/TDD_CORE.md (absolute rules) - 10 min

### For Implementation (Full)
1. This file (TASK_4_INDEX.md) - 10 min
2. All documents above - 1 hour
3. TASK_4_1_TDD_COMPLIANT.md (full reading) - 30 min
4. TASK_4_2_TDD_COMPLIANT.md (full reading) - 40 min
5. Then implement following the guides

**Total Reading Time**: 2.5 hours
**Implementation Time**: 9-14 hours
**Complete Time**: 11.5-16.5 hours

---

## Files in `/ai_dev_utils/`

```
/ai_dev_utils/
├── TDD_CORE.md                         ← Absolute rules (required reading)
├── TDD_AGENT_PROMPT.md                 ← Extended guidance
├── TASK_4_INDEX.md                     ← This file
├── REVIEW_SUMMARY.md                   ← Quick overview
├── CORRECTED_PHASE_4_GUIDE.md          ← Navigation guide
├── TDD_CORE_VIOLATION_REPORT.md        ← Detailed violations
├── TASK_4_1_TDD_COMPLIANT.md           ← Task 4.1 full guide
├── TASK_4_2_TDD_COMPLIANT.md           ← Task 4.2 full guide
└── evidence/                           ← Evidence files (will create during implementation)
    ├── task-4.1-audit.md
    ├── task-4.1-certification.md
    ├── task-4.2-audit.md
    └── task-4.2-certification.md
```

---

## Do NOT Use

❌ **These documents contain violations and should NOT be used**:
- `arch_remediation.md` (tasks 4.1-4.2 sections)
- `PHASE_4_QUICK_START.md`

Use only the TDD_CORE compliant guides listed above.

---

## Summary

| Item | Status |
|------|--------|
| Violations Found | 11 ✅ |
| Violations Fixed | 11 ✅ |
| Compliance | 0% → 100% ✅ |
| Test Coverage | 25-50% → 100% ✅ |
| Phase Structure | None → 6 phases ✅ |
| Gate Protocol | None → Complete ✅ |
| Ready for Implementation | YES ✅ |

---

**Status**: ✅ READY
**Authority**: TDD_CORE.md
**Date**: 2025-12-09
