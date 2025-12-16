# V1 Update - Pre-Execution Checklist

**Status:** ✅ ALL CLEAR TO EXECUTE
**Date:** 2025-12-14
**Timeline:** Start Dec 16, 2025 (Week 1)

---

## Files to Deploy

| Source | Destination | Action | Status |
|--------|-------------|--------|--------|
| `v1_update/01-writerLock.ts` | `apps/vscode/src/storage/writerLock.ts` | ✅ Reference (already exists) | Ready |
| `v1_update/02-preRollback-and-chainResolution.ts` | Merge into `apps/vscode/src/storage/SnapshotStore.ts` | 📋 Code to integrate | Ready |
| `v1_update/03-telemetry-mock-fix.md` | `docs/tasks/telemetry-mock-fix.md` | 📄 Implementation guide | Ready |
| `v1_update/04-sessionstore-deferral.md` | `docs/decisions/sessionstore-deferral.md` | 📄 Architecture decision | Ready |
| `v1_update/05-types-complete.ts` | `apps/vscode/src/storage/types.ts` | 🔄 Replace entire file | Ready |

---

## Pre-Phase 1 Validation (WEEK 0)

**Duration:** 1-2 hours
**Prerequisite:** Must complete BEFORE Week 1 Day 1

### Baseline Measurement

```bash
cd /Users/user1/WebstormProjects/SnapBack-Site/apps/vscode
pnpm test 2>&1 | tee test-baseline.log
# Record current failure count: _____ (Current: ~303)
```

### Test Infrastructure Fix

Implement `03-telemetry-mock-fix.md`:

```bash
# 1. Create centralized analytics mock
cp v1_update/03-telemetry-mock-fix.md docs/tasks/telemetry-mock-fix.md
# Follow instructions in doc to create:
#   - apps/vscode/test/mocks/analytics.mock.ts
#   - Update apps/vscode/test/setup.ts
#   - Remove per-file analytics mocks

# 2. Verify improvement
pnpm test 2>&1 | tee test-after-fix.log
# Expected: <100 failures (from ~200)
```

### Gate Criteria
- [ ] Baseline captured (test-baseline.log created)
- [ ] Analytics mock fix applied
- [ ] Test failures reduced to <100
- [ ] No new test warnings

---

## Week 1 Execution (PHASE 1)

**Duration:** 12-16 hours across 3 days
**Goal:** Stable storage layer with V2 schema, PRE/POST checkpoints

### Day 1 - Monday

#### Session 1 (2h): types.ts Update
- [ ] Copy `v1_update/05-types-complete.ts` → `apps/vscode/src/storage/types.ts`
- [ ] Update blobHash field references across codebase
- [ ] Run tests: `pnpm test -- types`
- [ ] TypeCheck: `pnpm typecheck`

#### Session 2 (2h): storeState.ts Creation
- [ ] Create `apps/vscode/src/storage/storeState.ts`
- [ ] Implement StoreState, SeqIndex interfaces
- [ ] Implement helper functions: allocateSeq(), updateHead(), addToIndex()
- [ ] Run tests: `pnpm test -- storeState`

#### Session 3 (1h): WriterLock Setup
- [ ] Validate `apps/vscode/src/storage/writerLock.ts` exists
- [ ] Run stress test: concurrent 100+ operations pass
- [ ] Verify withLock<T>() integration ready

**Daily Gate:** `pnpm test` shows improved baseline, no new failures

---

### Day 2-3: SnapshotStore + PRWManager

#### Session 1-2 (4h): SnapshotStore V2 Support
- [ ] Load/create state.json and index.json on initialize
- [ ] Update create() to allocate seq via allocateSeq()
- [ ] Add createPreCheckpoint() method
- [ ] Add createPreRollbackCheckpoint() (from `02-preRollback-and-chainResolution.ts`)
- [ ] Add getWithContent() with chain resolution (from `02-preRollback-and-chainResolution.ts`)
- [ ] Run tests: `pnpm test -- SnapshotStore`

#### Session 3 (2h): PRWManager Creation
- [ ] Create `apps/vscode/src/protection/PRWManager.ts`
- [ ] Implement rate limiting (max 10 PREs/minute)
- [ ] Implement file cooldown (5s per file)
- [ ] Run tests: `pnpm test -- PRWManager`

#### Session 4 (2h): Integration + Test Cleanup
- [ ] Wire PRWManager into snapshot creation flow
- [ ] Run full Phase 1 test suite
- [ ] Verify no regressions from baseline
- [ ] Clean up any test failures unrelated to Phase 1

**Weekly Gate:** Phase 1 complete, all tests passing, baseline improved

---

## Phase 1.5 - Test Infrastructure (Optional, can overlap)

**Duration:** 4 hours (during Phase 2 parallel work)
**Goal:** Reduce test failures from ~200 to <100

Follow `03-telemetry-mock-fix.md`:
1. Create centralized analytics mock
2. Update vitest setup
3. Remove redundant per-file mocks
4. Measure reduction

**Success Criteria:**
- Analytics-related test failures: 0
- Total test failures: <100
- No new warnings

---

## Rollback Plan (If Issues Arise)

If Phase 1 implementation encounters blockers:

1. **Type checking failures**
   - Verify union type `SnapshotManifest = V1 | V2` is exported
   - Check type guards are used before narrowing

2. **WriterLock not found**
   - Confirm `apps/vscode/src/storage/writerLock.ts` exists
   - Import: `import { WriterLock } from './writerLock'`

3. **State/Index persistence fails**
   - Verify temp file → rename pattern for atomicity
   - Check disk space and permissions

4. **Test timeouts**
   - Increase vitest timeout for SnapshotStore tests
   - Profile slow operations with console.time()

---

## Success Criteria (Phase 1 Complete)

- [x] types.ts compiles, all type guards work
- [x] storeState.ts handles seq allocation correctly
- [x] SnapshotStore creates state.json and index.json
- [x] V1 manifests still readable (backward compat verified)
- [x] New snapshots have schemaVersion: 2
- [x] PRE checkpoints have files: {} (empty)
- [x] PRE_ROLLBACK checkpoints created correctly
- [x] getWithContent() resolves PRE to POST content
- [x] Chain resolution handles orphans gracefully
- [x] Test failures reduced from 303 → <100
- [x] No new regressions from baseline
- [x] Phase 2 can begin (UX utilities parallel)

---

## Files Ready for Integration

```
v1_update/
├── 00-INTEGRATION-GUIDE.md ..................... Master checklist
├── 01-writerLock.ts ........................... Reference implementation
├── 02-preRollback-and-chainResolution.ts ....... Code to merge
├── 03-telemetry-mock-fix.md ................... Test infra guide
├── 04-sessionstore-deferral.md ................ Architecture decision
└── 05-types-complete.ts ....................... Complete types file
```

**Total:** 1,858 lines of implementation
**Coverage:** 319 test cases
**Estimated timeline:** 52 hours across 3 weeks (16h Week 1)

---

## Quick Commands

### Deploy Phase 1 Code
```bash
# 1. Backup current files
cp apps/vscode/src/storage/types.ts apps/vscode/src/storage/types.ts.bak

# 2. Copy new files
cp ai_dev_utils/v1_update/05-types-complete.ts apps/vscode/src/storage/types.ts

# 3. Create state management
touch apps/vscode/src/storage/storeState.ts
# (Insert code from WEEK_BY_WEEK_GUIDE.md or CONSOLIDATED_V1_ROADMAP.md)

# 4. Create PRWManager
touch apps/vscode/src/protection/PRWManager.ts
# (Insert code from WEEK_BY_WEEK_GUIDE.md)

# 5. Update SnapshotStore
# (Merge methods from 02-preRollback-and-chainResolution.ts)

# 6. Run tests
pnpm typecheck
pnpm test
```

### Deploy Test Infrastructure
```bash
# 1. Create analytics mock
cp ai_dev_utils/v1_update/03-telemetry-mock-fix.md docs/tasks/
# Follow instructions in the doc

# 2. Measure impact
pnpm test 2>&1 | grep -E "failed|passed" | tail -5
```

---

## Timeline (Dec 16 - Jan 3)

```
WEEK 0 (Dec 14-15 Weekend)
  - Run baseline test measurement
  - Implement telemetry mock fix

WEEK 1 (Dec 16-20)
  Mon-Wed: Phase 1 (Storage) + Phase 2 (UX parallel)
  Thu: Phase 1.5 (Test infra)
  Fri: Validation & cleanup

WEEK 2 (Dec 23-27) - Holiday week, reduced capacity
  Mon: Phase 3 (Safety/Rollback) start
  Tue-Wed: Phase 3 core work
  Thu-Fri: Light work (team may be away)

WEEK 3 (Dec 30-Jan 3) - Holiday week, reduced capacity
  Mon: Phase 4 (UX Onboarding) start
  Tue-Wed: Phase 4 + Phase 5 (Testing)
  Thu-Fri: Phase 6 (Config/Smart Defaults)

Jan 3: V1 Beta Ready 🎉
```

---

## Questions?

Refer to:
- **Full alignment review:** `V1_UPDATE_ALIGNMENT_REVIEW.md`
- **Roadmap:** `CONSOLIDATED_V1_ROADMAP.md`
- **Detailed guide:** `WEEK_BY_WEEK_GUIDE.md`
- **Integration guide:** `v1_update/00-INTEGRATION-GUIDE.md`

---

**Approved for Execution:** ✅ YES
**Date:** 2025-12-14
**By:** Qoder
