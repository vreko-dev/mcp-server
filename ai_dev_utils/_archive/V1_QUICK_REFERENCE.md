# Quick Reference - V1 Update Files

**For Quick Lookup During Phase 1 Execution**

---

## File Mapping

```
v1_update/00-INTEGRATION-GUIDE.md
  → Master checklist for all updates
  → Execution sequence (lines 290-298)
  → File placements (lines 280-286)
  → USE: Before starting Phase 1

v1_update/01-writerLock.ts
  → WriterLock implementation (reference)
  → Code: lines 16-103 (class definition)
  → Tests: lines 109-237
  → STATUS: Already exists in codebase
  → USE: Validate in Phase 1 Day 1 Session 3

v1_update/02-preRollback-and-chainResolution.ts
  → createPreRollbackCheckpoint() (lines 27-80)
  → getWithContent() (lines 96-129)
  → resolveContentAncestor() (lines 137-185)
  → loadContentsFromManifest() (lines 190-216)
  → SnapshotChainError class (lines 225-234)
  → Tests: lines 292-446
  → USE: Merge into SnapshotStore.ts Day 2-3

v1_update/03-telemetry-mock-fix.md
  → Test infrastructure fix (complete guide)
  → Create analytics mock (lines 38-127)
  → Update vitest setup (lines 130-155)
  → Remove per-file mocks (lines 174-187)
  → USE: Execute Week 0 before Phase 1 starts

v1_update/04-sessionstore-deferral.md
  → Architecture decision to defer SessionStore changes
  → Decision (line 23): Defer to post-V1
  → Post-V1 roadmap (lines 69-94)
  → USE: File as docs/decisions/sessionstore-deferral.md

v1_update/05-types-complete.ts
  → Complete types.ts implementation
  → Type definitions (lines 10-50)
  → SnapshotFileRef with blobHash (lines 55-66) ⭐ IMPORTANT
  → SnapshotManifestV2 (lines 117-176)
  → Type guards (lines 195-241)
  → Tests: lines 318-481
  → USE: Replace entire types.ts file
```

---

## Timeline Summary

```
WEEK 0 (Before Week 1)
├─ Hour 1-2: Run test baseline, implement telemetry mock fix
└─ Gate: Test failures <100, baseline documented

WEEK 1 (16 hours)
├─ Day 1 (4h): types.ts + storeState.ts + WriterLock validation
├─ Day 2-3 (8h): SnapshotStore + PRWManager
├─ Day 4 (2h): Test infrastructure (if needed)
└─ Day 5 (2h): Integration + validation

WEEK 2-3 (34 hours)
├─ Phase 3: Safety & Rollback
├─ Phase 4: UX Onboarding
├─ Phase 5: Testing & Instrumentation
└─ Phase 6: Config & Smart Defaults
```

---

## Key Code Changes

### 1. blobHash Rename (CRITICAL)

**Old:** `SnapshotFileRef { blob: string; size: number }`
**New:** `SnapshotFileRef { blobHash: string; size: number }`

**Find/Replace:**
```bash
# In apps/vscode/src/**/*.ts:
grep -r "ref\.blob" --include="*.ts"
grep -r "blob:" --include="*.ts"
grep -r "{ blob" --include="*.ts"
# Replace: ref.blob → ref.blobHash
#          { blob: → { blobHash:
```

### 2. New SnapshotManifestV2 Fields

```typescript
interface SnapshotManifestV2 {
  schemaVersion: 2;        // NEW (always 2)
  id: string;              // SAME
  seq: number;             // NEW (sequence number)
  parentSeq: number|null;  // NEW (parent seq)
  parentId: string|null;   // NEW (parent ID)
  type: CheckpointType;    // NEW (POST|PRE|PRE_ROLLBACK)
  timestamp: number;       // SAME
  trigger: Trigger;        // SAME
  name: string;            // SAME
  files: Record<...>;      // SAME (but uses blobHash)
  metadata: {              // EXPANDED
    origin: OriginLabel;   // NEW (INTERACTIVE|AUTOMATED)
    riskScore: number;     // SAME
    reasons: ReasonCode[]; // NEW (array of reasons)
    rollbackTarget?: string; // NEW (for PRE_ROLLBACK)
  };
}
```

### 3. New Methods in SnapshotStore

```typescript
// Create PRE checkpoint (pointer, no content)
async createPreCheckpoint(reason: string, origin: OriginLabel, reasons: ReasonCode[]): Promise<SnapshotManifestV2>

// Create PRE_ROLLBACK checkpoint (pointer, targets rollback)
async createPreRollbackCheckpoint(targetId: string): Promise<SnapshotManifestV2>

// Get snapshot with resolved contents (walks parent chain if needed)
async getWithContent(id: string): Promise<{ manifest, contents } | null>

// Private: walk parent chain to find POST with content
private async resolveContentAncestor(manifest: V2): Promise<SnapshotManifestV2 | null>

// Private: load blob contents from manifest
private async loadContentsFromManifest(manifest: V2): Promise<Record<string, string>>
```

### 4. New storeState.ts Helpers

```typescript
interface StoreState {
  lastSeq: number;        // Last allocated sequence
  headId: string|null;    // Current HEAD snapshot ID
  headSeq: number|null;   // HEAD sequence number
}

function allocateSeq(state: StoreState): { newState, seq }
function updateHead(state: StoreState, id: string, seq: number): StoreState
function addToIndex(index: SeqIndex, seq: number, id: string): SeqIndex
```

---

## Test Gates by Phase

### Phase 1 Tests (Week 1)
```
✓ types.ts: isV2Manifest, isPointerCheckpoint, isPostCheckpoint
✓ storeState.ts: allocateSeq, updateHead, addToIndex
✓ SnapshotStore: create with seq, createPreCheckpoint, createPreRollbackCheckpoint
✓ SnapshotStore: getWithContent with chain resolution
✓ SnapshotStore: orphan detection
✓ WriterLock: concurrent stress test 100+
✓ Total test failures: <100 (down from ~303)
```

### Phase 1.5 Tests (Week 1 Day 4)
```
✓ Analytics mocking: capture, identify, feature flags
✓ Analytics-related test failures: 0
✓ Test failure reduction: ~150-200 → <100
```

---

## Execution Checklist

### Week 0 (Before Phase 1)

- [ ] **Baseline:** Run `pnpm test`, capture failure count
- [ ] **Telemetry:** Implement 03-telemetry-mock-fix.md
  - [ ] Create `test/mocks/analytics.mock.ts`
  - [ ] Update `test/setup.ts` with global mock
  - [ ] Remove per-file analytics mocks
  - [ ] Re-run tests, verify reduction
- [ ] **Documents:** Read REVIEW_SUMMARY.md + V1_UPDATE_ALIGNMENT_REVIEW.md
- [ ] **Gate:** Baseline <100 failures documented

### Day 1 (Monday)

- [ ] **Session 1 (2h):** Update types.ts
  - [ ] Copy `v1_update/05-types-complete.ts` → `apps/vscode/src/storage/types.ts`
  - [ ] Search/replace: `blob` → `blobHash`
  - [ ] Run: `pnpm typecheck` (0 errors)
  - [ ] Run: `pnpm test -- types` (all pass)

- [ ] **Session 2 (2h):** Create storeState.ts
  - [ ] Create `apps/vscode/src/storage/storeState.ts`
  - [ ] Copy interfaces + helpers from WEEK_BY_WEEK_GUIDE.md
  - [ ] Run: `pnpm test -- storeState` (all pass)

- [ ] **Session 3 (1h):** Validate WriterLock
  - [ ] Verify: `apps/vscode/src/storage/writerLock.ts` exists
  - [ ] Run stress test: concurrent 100+ operations
  - [ ] Confirm ready for SnapshotStore integration

### Day 2-3 (Tuesday-Wednesday)

- [ ] **Update SnapshotStore**
  - [ ] Load/create state.json on initialize
  - [ ] Update `create()` to use allocateSeq()
  - [ ] Add `createPreCheckpoint()` method
  - [ ] Add `createPreRollbackCheckpoint()` (from 02-preRollback-and-chainResolution.ts)
  - [ ] Add `getWithContent()` with chain resolution (from 02-preRollback-and-chainResolution.ts)

- [ ] **Create PRWManager**
  - [ ] Create `apps/vscode/src/protection/PRWManager.ts`
  - [ ] Implement: rate limiting (max 10 PREs/minute)
  - [ ] Implement: file cooldown (5s per file)

- [ ] **Tests**
  - [ ] Run: `pnpm test` (track failure count)
  - [ ] Verify: No regressions from baseline
  - [ ] Verify: Phase 1 specific tests pass

### Day 4-5 (Thursday-Friday)

- [ ] **Optional:** Complete Phase 1.5 (if not done Week 0)
- [ ] **Integration:** Wire all components together
- [ ] **Validation:** Full Phase 1 test suite passes
- [ ] **Gate:** Ready for Phase 2 + Phase 3

---

## Common Issues & Solutions

### Issue: Type checking fails after types.ts update
**Solution:** Verify union type `SnapshotManifest = V1 | V2` is exported properly

### Issue: WriterLock not found
**Solution:** Check `apps/vscode/src/storage/writerLock.ts` exists and import correctly

### Issue: state.json persistence fails
**Solution:** Verify temp file → rename pattern used; check disk space/permissions

### Issue: Chain resolution timeout
**Solution:** MAX_CHAIN_DEPTH=100 should prevent; check for circular references in data

### Issue: Tests still failing after Phase 1
**Solution:**
1. Check test baseline was <100 before starting
2. Verify no conflicts with Phase 2 UX utilities
3. Run `pnpm test -- --reporter=verbose` for details

---

## Success Criteria

### Phase 1 Complete When:
```
✅ types.ts compiles without errors
✅ storeState.ts handles seq correctly
✅ SnapshotStore creates state.json/index.json
✅ V1 manifests still readable (backward compat)
✅ New snapshots have schemaVersion: 2
✅ PRE checkpoints have files: {}
✅ PRE_ROLLBACK checkpoints created correctly
✅ getWithContent() resolves chains correctly
✅ Test failures reduced from 303 → <100
✅ No new regressions from baseline
✅ All Phase 1 tests passing
✅ Ready for Phase 2 + Phase 3
```

---

## File Sizes & Effort

| File | Size | Effort | When |
|------|------|--------|------|
| 05-types-complete.ts | 482 lines | 2h | Day 1 |
| storeState.ts (new) | ~150 lines | 2h | Day 1 |
| SnapshotStore (update) | ~200 lines | 4h | Day 2-3 |
| PRWManager (new) | ~150 lines | 2h | Day 2-3 |
| 02-preRollback... (merge) | 447 lines | Include SnapshotStore | Day 2-3 |
| 03-telemetry-mock-fix | 263 lines | 1-2h | Week 0 |
| 01-writerLock (verify) | 239 lines | 1h | Day 1 |

**Total Week 1: 16 hours**

---

## Questions?

Refer to:
1. **Quick Overview:** REVIEW_SUMMARY.md
2. **Detailed Analysis:** V1_UPDATE_ALIGNMENT_REVIEW.md
3. **Daily Tasks:** V1_UPDATE_CHECKLIST.md
4. **Master Guide:** v1_update/00-INTEGRATION-GUIDE.md
5. **Daily Schedule:** WEEK_BY_WEEK_GUIDE.md
6. **Architecture:** CONSOLIDATED_V1_ROADMAP.md

---

**Last Updated:** 2025-12-14
**Status:** ✅ READY FOR EXECUTION
**Start Date:** December 16, 2025
