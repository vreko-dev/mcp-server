# Consolidated V1 Roadmap - SnapBack

**Status:** Unified implementation plan merging CURRENT_EXECUTION_STATE + v1_rollout
**Timeline:** 3 weeks (52 hours total)
**Last Updated:** 2025-12-14
**Objective:** Deliver local-first code protection with PRE/POST checkpoints, UX polish, and smart defaults

---

## Executive Summary

This document consolidates two previously separate planning efforts:
- **CURRENT_EXECUTION_STATE:** UX utilities + onboarding (Weeks 1-3)
- **v1_rollout:** PRE/POST checkpoint system + safety primitives (Phases 1-5)

**Problem:** They were planned independently, creating sequencing conflicts and storage layer assumptions that don't align.

**Solution:** Merged 6-phase plan that respects dependencies while enabling parallel work where possible.

**Key insight:** Storage foundation (Phase 1) unblocks everything else. UX utilities (Phase 2) can run in parallel. UX onboarding (Phase 4) requires Phase 1+2 complete. Safety layer (Phase 3) enables rollback. Testing (Phase 5) validates all of the above. Config polish (Phase 6) completes with schema understanding.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ User Experience Layer (Phase 4, 6)                      │
│ ├─ ProgressiveDisclosure (beginner → advanced)          │
│ ├─ WalkthroughTracker + telemetry                       │
│ ├─ ProjectDetector (5+ project types)                   │
│ └─ ConfigValidator (inline validation)                  │
└──────────────────┬──────────────────────────────────────┘
                   │ depends on
┌──────────────────▼──────────────────────────────────────┐
│ Safety & Rollback Layer (Phase 3)                       │
│ ├─ RollbackService (WorkspaceEdit-based undo)           │
│ ├─ PRE_ROLLBACK checkpoint creation                     │
│ └─ Performance instrumentation                          │
└──────────────────┬──────────────────────────────────────┘
                   │ depends on
┌──────────────────▼──────────────────────────────────────┐
│ Storage Foundation Layer (Phase 1)                      │
│ ├─ V2 Schema (seq, parentSeq, type, metadata)           │
│ ├─ State/Index management (state.json, index.json)      │
│ ├─ PRWManager (rate limiting, cooldowns)                │
│ └─ SnapshotStore with PRE support                       │
└──────────────────┬──────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │ parallel with    │
┌────────▼─────────┐  ┌──────▼──────────────────┐
│ Phase 2: UX      │  │ Phase 5: Testing        │
│ Utilities        │  │ (depends on 1,2,3,4)    │
├────────────────┤  ├──────────────────────────┤
│ ProgressReporter│  │ Concurrency tests       │
│ StatusBarAnimtr │  │ Performance budgets     │
│ TreeItemBadge  │  │ Crash recovery          │
└────────────────┘  └──────────────────────────┘
```

---

## Phase Breakdown (6 Phases, 3 Weeks)

### PHASE 1: Storage Foundation (Days 1-3, Week 1) ⭐ CRITICAL PATH

**Duration:** ~12 hours (3 parallel days × 4 hours/day)

**Pre-Phase 1 Validation (Week 0, 1-2 hours - PREREQUISITE):**

⚠️ Before starting Phase 1, establish test baseline:
```bash
cd apps/vscode && pnpm test 2>&1 | grep -E "(FAIL|PASS|passed|failed)" | tail -5
```

**Tasks:**
1. Run full test suite, capture baseline (current: 303 failing tests)
2. Check PostHog telemetry mock in `vitest.config.ts` - ensure global setup
3. Fix top 2-3 failure patterns (if blocking Phase 1 tests)
4. Goal: Reduce to <50 failing tests before Phase 1 starts

**Rationale:** Prevents Phase 5 from test fatigue. Phase 1 tests run fresh on clean baseline.

**Gate:** `pnpm test --run 2>&1 | tail -1` shows baseline < 50 failures or captured baseline count

---

**Deliverables:**
1. Update `apps/vscode/src/storage/types.ts`
   - Add `CheckpointType = 'POST' | 'PRE' | 'PRE_ROLLBACK'`
   - Add `OriginLabel = 'INTERACTIVE' | 'AUTOMATED'`
   - Add `ReasonCode` enum for explainability
   - Create `SnapshotManifestV2` with `seq`, `parentSeq`, `parentId`, `type`, `metadata`
   - Keep `SnapshotManifestV1` for backward compatibility
   - Add type guards: `isV2Manifest()`, `isPointerCheckpoint()`, `isPostCheckpoint()`

2. Create `apps/vscode/src/storage/storeState.ts`
   - `StoreState` interface (lastSeq, headId, headSeq)
   - `SeqIndex` interface (bySeq, byId mappings)
   - Helper functions: `allocateSeq()`, `updateHead()`, `addToIndex()`
   - Validation: `isValidState()`, `isValidIndex()`

3. Upgrade `apps/vscode/src/storage/SnapshotStore.ts`
   - Load/create `state.json` and `index.json` on initialize
   - Update `create()` to allocate seq via allocateSeq()
   - Add `createPreCheckpoint()` method (type: 'PRE', files: {})
   - Add `createPreRollbackCheckpoint()` method (type: 'PRE_ROLLBACK')
   - Add `getWithContent()` with chain resolution (walk parentId to POST)
   - Add `rebuildStateFromDisk()` for crash recovery
   - Add `normalizeToV2()` helper for V1→V2 in-memory conversion

4. Create `apps/vscode/src/protection/PRWManager.ts`
   - `PRWConfig` interface (riskThreshold, maxPrePerMinute, fileCooldownMs)
   - `PRWManager` class with rate limiting + file cooldowns
   - `onRiskySignalDetected()` method
   - `onBeforeRollback()` method
   - Prevent: >10 PREs/minute, duplicate PREs within 5s per file

**Test Gates:**
- TypeScript compilation: `pnpm typecheck` (0 errors)
- Unit tests: `pnpm test -- types storeState SnapshotStore PRWManager`
- Coverage: >80% for new code
- Type guards verified with V1 and V2 manifests

**Risk Mitigation:**
- **Schema migration:** Keep V1 support via `normalizeToV2()` helper
- **Race conditions:** Synchronous state reservation BEFORE await
- **Atomicity:** Write temp file then rename for state.json, index.json
- **Backward compat:** All existing code works with union type `SnapshotManifest = V1 | V2`

**Files Modified/Created:**
```
apps/vscode/src/storage/
├── types.ts                    (modified: +V2 schema, type guards)
├── storeState.ts               (new: state/index management)
├── SnapshotStore.ts            (modified: V2 support, PRE + PRE_ROLLBACK)
├── writerLock.ts               (no change: ALREADY IMPLEMENTED ✅)
└── BlobStore.ts                (no change: already correct)

apps/vscode/src/protection/
└── PRWManager.ts               (new: rate limiting, cooldowns)

apps/vscode/src/storage/
└── SessionStore.ts             (no change: lazy init already designed ✅)
```

**Implementation Notes:**
- ✅ WriterLock exists in `writerLock.ts` (use `withLock()` utility)
- ✅ SessionStore already lazy (doesn't eagerly write)
- ✅ blobHash rename explicit in types.ts

**Success Criteria:**
- [ ] state.json and index.json created on first save
- [ ] V1 manifests still readable via normalizeToV2()
- [ ] New snapshots have schemaVersion: 2
- [ ] PRE checkpoints have files: {} (empty)
- [ ] PRE_ROLLBACK checkpoints have files: {} (empty, type: 'PRE_ROLLBACK')
- [ ] getWithContent() on PRE resolves to POST ancestor
- [ ] getWithContent() on PRE_ROLLBACK resolves to POST ancestor
- [ ] createPreRollbackCheckpoint() creates checkpoint before rollback
- [ ] No test regressions from baseline (Week 0 validation)
- [ ] All new tests pass (allocation, type guards, PRE creation, PRE_ROLLBACK creation)

---

### PHASE 2: UX Utilities (Days 1-3, Week 1) ↔️ PARALLEL with PHASE 1

**Duration:** ~4 hours (validation + minimal fixes)

**Status:** Already mostly complete from CURRENT_EXECUTION_STATE Week 1 ✅

**Deliverables:**
1. Verify `apps/vscode/src/ux/utilities/ProgressReporter.ts` (24 tests)
2. Verify `apps/vscode/src/ux/utilities/StatusBarAnimator.ts` (27 tests)
3. Verify `apps/vscode/src/ux/utilities/TreeItemBadgeProvider.ts` (36 tests)
4. Verify integration wiring in `SnapBackTreeProvider.ts`

**Test Gates:**
- All 113 unit tests passing
- No regressions from Phase 1 types changes
- Integration tests verify badge providers render correctly

**Files Modified:**
```
apps/vscode/src/ux/utilities/
├── ProgressReporter.ts         (verify complete)
├── StatusBarAnimator.ts        (verify complete)
└── TreeItemBadgeProvider.ts    (verify complete)

apps/vscode/src/views/
└── snapBackTreeProvider.ts     (verify wiring)
```

**Success Criteria:**
- [ ] 113 tests passing (ProgressReporter 24 + StatusBarAnimator 27 + TreeItemBadgeProvider 36 + Integration 26)
- [ ] No new warnings or type errors
- [ ] Unblocks Week 2 UX onboarding work

---

### PHASE 3: Safety & Rollback Layer (Days 4-5, Week 1 + Days 1-2, Week 2)

**Duration:** ~10 hours (split across week boundary)

**Dependencies:** Requires Phase 1 complete (types, SnapshotStore, PRWManager)

**Deliverables:**

1. Create `apps/vscode/src/rollback/RollbackService.ts`
   - `RollbackPlan` interface (targetCheckpointId, filesToRestore, filesToDelete, safetyScore)
   - `rollbackTo(checkpointId)` method:
     - Create PRE_ROLLBACK checkpoint FIRST
     - Get target snapshot content via getWithContent()
     - Build WorkspaceEdit for all file changes
     - Apply atomically (goes on undo stack)
   - `planRollback(checkpointId)` method:
     - Safety scoring (unsaved buffers, file count, time since checkpoint)
     - Return warnings for high-risk rollbacks
   - Performance: rollback <500ms per file

2. Wire RollbackService to UI (`apps/vscode/src/ui/SnapshotRestoreUI.ts`)
   - Replace OperationCoordinator dependency with RollbackService
   - Update restore flow:
     - Show confirmation with safety warnings
     - Execute rollback via RollbackService
     - Show PRE_ROLLBACK ID to user
   - User can Cmd+Z to undo the rollback

3. Add performance instrumentation (`apps/vscode/src/utils/perf.ts`)
   - `measure()` and `measureAsync()` utilities
   - Warn when budgets exceeded:
     - detection: 10ms
     - pre-checkpoint: 15ms
     - post-checkpoint: 100ms
     - save-intercept: 50ms
     - rollback: 500ms

**Test Gates:**
- Integration tests for rollback flow (20+ tests)
- Concurrent rollback tests (100+ concurrent operations)
- Performance budget validation (all budgets met in p95)
- WorkspaceEdit safety tests (verify atomic apply)

**Risk Mitigation:**
- **PRE_ROLLBACK timing:** Create BEFORE any file changes
- **Race conditions:** Use WriterLock during rollback planning
- **Partial failures:** Test failure injection at each step
- **Memory safety:** Clean up temporary state on error

**Files Modified/Created:**
```
apps/vscode/src/rollback/
└── RollbackService.ts          (new: WorkspaceEdit rollback)

apps/vscode/src/ui/
└── SnapshotRestoreUI.ts        (modified: use RollbackService)

apps/vscode/src/utils/
└── perf.ts                      (new: performance measurement)

apps/vscode/src/extension.ts     (modified: initialize RollbackService)
```

**Success Criteria:**
- [ ] PRE_ROLLBACK created before restore
- [ ] Multi-file restore is atomic (WorkspaceEdit)
- [ ] User can Cmd+Z to undo rollback
- [ ] Safety warnings shown for high-risk rollbacks
- [ ] Performance budgets met on all critical paths
- [ ] No perf warnings during normal operation

---

### PHASE 4: UX Onboarding (Days 3-5, Week 2)

**Duration:** ~8 hours (distributed across week)

**Dependencies:** Requires Phase 1 complete (new snapshot.type field awareness)

**Deliverables:**

1. Wire ProgressiveDisclosureController (`apps/vscode/src/ux/controllers/ProgressiveDisclosureController.ts`)
   - Connect to tree view commands (Create Snapshot, Browse Snapshots)
   - Contextual hints based on userLevel (beginner/intermediate/advanced)
   - First-time users see walkthrough hints
   - Hints auto-hide after 3-5 interactions
   - User level persists in `globalState`

2. Add WalkthroughTracker telemetry (`apps/vscode/src/tutorial/InteractiveTutorial.ts`)
   - Track step completion (started, completed, skipped)
   - Wire to telemetry service via PostHog
   - Time-to-completion per step
   - User satisfaction metric (optional)

3. Understand new snapshot types in UI
   - Filter snapshot.type === 'POST' when listing (hide PRE/PRE_ROLLBACK)
   - Show PRE in timeline context (e.g., "PRE-checkpoint: X")
   - Handle snapshot.metadata.origin display (INTERACTIVE vs AUTOMATED)

**Test Gates:**
- Progressive disclosure integration tests (15+ tests)
- Walkthrough telemetry tests (10+ tests)
- globalState persistence tests
- Snapshot type filtering tests

**Risk Mitigation:**
- **Phase 1 dependency:** If Phase 1 delayed, use mock SnapshotStore
- **Telemetry privacy:** Don't log file paths/names, only anonymous events
- **User level migration:** Handle undefined userLevel gracefully (default: beginner)

**Files Modified/Created:**
```
apps/vscode/src/ux/controllers/
└── ProgressiveDisclosureController.ts    (verify/wire)

apps/vscode/src/tutorial/
└── InteractiveTutorial.ts               (modified: add telemetry)

apps/vscode/src/views/
└── snapBackTreeProvider.ts              (modified: filter by snapshot.type)
```

**Success Criteria:**
- [ ] First-time users see hints on first action
- [ ] Hints auto-hide after 3-5 interactions
- [ ] User level persists across sessions
- [ ] Telemetry events logged for walkthrough completion
- [ ] Snapshot type filtering prevents orphan snapshots from showing

---

### PHASE 5: Testing & Instrumentation (Week 3)

**Duration:** ~10 hours (distributed across week)

**Dependencies:** Requires Phase 1, 2, 3, 4 complete

**Deliverables:**

1. Concurrency Tests (`apps/vscode/test/unit/storage/SnapshotStore.concurrency.test.ts`)
   - 100+ concurrent PRE creation attempts → only 1 succeeds
   - 100+ concurrent lock acquisitions → <50ms avg wait time
   - Orphan PRE detection (PRE without POST)
   - Interrupted operation recovery

2. Performance Budget Tests
   - Wrap all critical paths with `measure()` / `measureAsync()`
   - AutoDecisionIntegration.makeDecision() → detection <10ms
   - SnapshotStore.createPreCheckpoint() → pre-checkpoint <15ms
   - SnapshotStore.create() → post-checkpoint <100ms
   - RollbackService.rollbackTo() → rollback <500ms
   - Each test has explicit budget assertions

3. Crash Recovery Tests (`apps/vscode/test/unit/storage/StorageManager.recovery.test.ts`)
   - Delete state.json → rebuild on startup
   - Corrupt index.json → rebuild on startup
   - Partial write (incomplete manifest) → detect and skip
   - Log verification: "[Storage] Corruption detected, rebuilding index..."

4. Schema Migration Tests
   - Load V1 manifest → normalizeToV2() produces valid V2
   - Load V2 manifest → all fields preserved
   - Mix of V1/V2 in same storage → both work
   - Seq allocation respects V1 timestamp ordering

**Test Fixtures:**
- Mock project directories (Node.js, Python, Rust)
- Sample manifests (valid V1/V2, corrupted, incomplete)
- Mock editor state (unsaved buffers, multi-file edits)

**Test Gates:**
- All tests passing: `pnpm test`
- Coverage >80% for new code (Phase 1-4)
- No performance warnings in console during normal operation
- Crash recovery tests verify rebuild succeeds

**Files Modified/Created:**
```
apps/vscode/test/unit/storage/
├── SnapshotStore.v2.test.ts    (enhanced: V2 manifest tests)
├── SnapshotStore.concurrency.test.ts  (new: race condition tests)
├── StorageManager.recovery.test.ts    (new: crash recovery tests)
└── storeState.test.ts          (new: seq allocation tests)

apps/vscode/test/unit/protection/
└── PRWManager.test.ts          (new: rate limiting, cooldown tests)

apps/vscode/test/unit/rollback/
└── RollbackService.test.ts     (new: rollback safety tests)

apps/vscode/test/unit/ux/
├── ProgressiveDisclosure.integration.test.ts  (new)
└── WalkthroughTracker.test.ts  (new)
```

**Success Criteria:**
- [ ] All tests passing (no regressions)
- [ ] Coverage >80% for all new code
- [ ] Performance budgets validated in tests
- [ ] Crash recovery verified with file system failures
- [ ] Concurrent operations handle safely (no race conditions)

---

### PHASE 6: Config & Smart Defaults (Days 3-5, Week 3)

**Duration:** ~8 hours (distributed across week)

**Dependencies:** Requires Phase 1 complete (understanding of V2 schema)

**Deliverables:**

1. Create ProjectDetector (`apps/vscode/src/config/ProjectDetector.ts`)
   - Detect 5+ project types:
     - Node.js (package.json)
     - Python (requirements.txt, setup.py)
     - Rust (Cargo.toml)
     - Go (go.mod)
     - Java (pom.xml, build.gradle)
   - Auto-generate `.snapbackignore` with framework-specific patterns
   - Suggest protection levels based on file criticality
   - Show notification: "We detected a {type} project - configured defaults"

2. Create ConfigValidator (`apps/vscode/src/config/ConfigValidator.ts`)
   - Real-time validation of `.snapbackrc` as user types
   - Inline error messages in editor
   - Quick fix code actions for common mistakes
   - Validation feedback in Problems panel
   - Use Zod for schema validation

3. Integration with SmartDefaults workflow
   - On first activation: run ProjectDetector
   - If no `.snapbackrc` exists: create with auto-detected defaults
   - If validation fails: show inline errors + quick fixes
   - User can override any default via UI or config

**Test Gates:**
- Project detection tests (20+ tests, 5+ project types)
- Config validation tests (15+ tests, valid/invalid configs)
- Integration tests (UI updates on detection)
- Performance: detection <100ms on first activation

**Risk Mitigation:**
- **V2 schema knowledge:** Understand new snapshot.type for validation
- **Config backward compat:** Support old `.snapbackrc` format
- **Quick fixes:** Only suggest fixes for fixable errors (not policy violations)

**Files Modified/Created:**
```
apps/vscode/src/config/
├── ProjectDetector.ts          (new: project type detection)
└── ConfigValidator.ts          (new: inline validation)

apps/vscode/src/extension.ts    (modified: call ProjectDetector on activation)

apps/vscode/test/unit/config/
├── ProjectDetector.test.ts     (new)
└── ConfigValidator.test.ts     (new)
```

**Success Criteria:**
- [ ] Detects 5+ project types correctly
- [ ] Auto-generates `.snapbackignore` with sane defaults
- [ ] Reduces time-to-value from 5 min → <1 min
- [ ] Config validation shows inline errors
- [ ] Quick fixes available for common mistakes
- [ ] Detection runs in <100ms
- [ ] All 35+ tests passing (20 detection + 15 validation)

---

## Timeline & Parallelization

```
WEEK 1 (14 hours):
  Mon-Tue-Wed (3 days):
    Stream A: Phase 1 (Storage Foundation) - 12 hours
              Day 1: types.ts + storeState.ts (4h)
              Day 2: SnapshotStore upgrade (4h)
              Day 3: PRWManager + integration (4h)

    Stream B: Phase 2 (UX Utilities) - 4 hours
              Days 1-3: Verify & validate existing work (4h)

WEEK 2 (14 hours):
  Thu-Fri (5 days):
    Phase 3: Safety Layer - 10 hours
             Day 1: RollbackService creation (4h)
             Day 2: Wiring + perf instrumentation (6h)

    Phase 4: UX Onboarding - 8 hours (distributed)
             Day 3: ProgressiveDisclosure wiring (3h)
             Day 4: WalkthroughTracker + telemetry (3h)
             Day 5: Snapshot type filtering (2h)

WEEK 3 (24 hours):
  Mon-Tue-Wed-Thu-Fri:
    Phase 5: Testing & Instrumentation - 10 hours
             Day 1: Concurrency tests (3h)
             Day 2: Performance budget tests (3h)
             Day 3: Crash recovery tests (2h)
             Day 4: Schema migration tests (2h)

    Phase 6: Config & Smart Defaults - 8 hours
             Day 3: ProjectDetector (3h)
             Day 4: ConfigValidator (3h)
             Day 5: Integration + tests (2h)

CRITICAL GATES:
  EOD Week 1: Phase 1 + Phase 2 complete → unblocks Week 2
  EOD Week 2: Phase 3 + Phase 4 complete → ready for testing
  EOD Week 3: All phases complete → V1 ready for release
```

---

## Risk & Mitigation Summary

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Phase 1 overruns into Week 2 | Medium | High | Pre-allocate 4h/day, fixed scope |
| Phase 1 breaks existing code | Low | High | Keep V1 compat, extensive tests |
| Race conditions in PRE creation | Medium | High | Synchronous reservation, 100+ concurrent tests |
| Test suite explosion (300+ failures) | High | Medium | Fix telemetry mock first, incremental additions |
| Performance budget violations | Medium | High | Measure all paths with perf.ts, fail on violation |
| Week 2 UX work blocked waiting for Phase 1 | Low | Medium | Use interface stubs if Phase 1 delayed |
| Rollback WorkspaceEdit complexity | Low | Medium | Start single-file, expand to multi-file |
| Schema migration leaving orphans | Low | High | Startup orphan detection scan + cleanup |
| Week 3 testing too aggressive | Medium | Low | Focus on Phase 1-3 first, Phase 4-5 secondary |

---

## Success Criteria (All Phases)

- [ ] **Timeline:** All 6 phases complete within 3 weeks
- [ ] **Quality:** >80% test coverage for new code
- [ ] **Backward Compat:** V1 manifests still work, normalized to V2 in-memory
- [ ] **Performance:** All budgets met (PRE <15ms, POST <100ms, detection <10ms)
- [ ] **Safety:** No race conditions (100+ concurrent tests pass)
- [ ] **Reliability:** Crash recovery works (state.json corruption handled)
- [ ] **User Value:** Time-to-value reduced from 5 min → <1 min (ProjectDetector)
- [ ] **UX Polish:** Progressive disclosure + walkthrough complete
- [ ] **No Regressions:** Fix existing 303 test failures, don't add more

---

## File Organization Map

```
apps/vscode/src/
├── storage/
│   ├── types.ts                  ← Phase 1: V2 schema
│   ├── storeState.ts             ← Phase 1: State/index management
│   ├── SnapshotStore.ts          ← Phase 1: V2 support + PRE
│   ├── BlobStore.ts              ← (no change)
│   └── writerLock.ts             ← (existing, used by Phase 1)
│
├── protection/
│   └── PRWManager.ts             ← Phase 1: Rate limiting
│
├── rollback/
│   └── RollbackService.ts        ← Phase 3: WorkspaceEdit rollback
│
├── utils/
│   └── perf.ts                   ← Phase 3: Performance measurement
│
├── ux/
│   ├── utilities/
│   │   ├── ProgressReporter.ts   ← Phase 2: (verify)
│   │   ├── StatusBarAnimator.ts  ← Phase 2: (verify)
│   │   └── TreeItemBadgeProvider.ts  ← Phase 2: (verify)
│   │
│   └── controllers/
│       └── ProgressiveDisclosureController.ts  ← Phase 4: Wire
│
├── tutorial/
│   └── InteractiveTutorial.ts    ← Phase 4: Add telemetry
│
├── config/
│   ├── ProjectDetector.ts        ← Phase 6: Project detection
│   └── ConfigValidator.ts        ← Phase 6: Config validation
│
├── ui/
│   └── SnapshotRestoreUI.ts      ← Phase 3: Use RollbackService
│
├── views/
│   └── snapBackTreeProvider.ts   ← Phase 2 (verify) + Phase 4 (filter type)
│
└── extension.ts                  ← All phases: Initialize components

apps/vscode/test/unit/
├── storage/
│   ├── storeState.test.ts        ← Phase 5: Seq allocation
│   ├── SnapshotStore.v2.test.ts  ← Phase 5: V2 manifest
│   ├── SnapshotStore.concurrency.test.ts  ← Phase 5: Race conditions
│   └── StorageManager.recovery.test.ts    ← Phase 5: Crash recovery
│
├── protection/
│   └── PRWManager.test.ts        ← Phase 5: Rate limiting
│
├── rollback/
│   └── RollbackService.test.ts   ← Phase 5: Rollback safety
│
├── ux/
│   ├── ProgressiveDisclosure.integration.test.ts  ← Phase 5: Wiring
│   └── WalkthroughTracker.test.ts  ← Phase 5: Telemetry
│
└── config/
    ├── ProjectDetector.test.ts   ← Phase 5: Detection (20 tests)
    └── ConfigValidator.test.ts   ← Phase 5: Validation (15 tests)
```

---

## Key Patterns & Rules to Follow

### 1. TDD (from consolidated memories)
- Write failing test FIRST
- Implement minimal code to pass
- Refactor while keeping tests green
- Pre-commit hook validates test-first workflow

### 2. Performance Budgets (from consolidated memories)
- Measure all critical paths with `measure()` / `measureAsync()`
- PRE checkpoint: <15ms (p95)
- POST checkpoint: <100ms (p95)
- Detection: <10ms
- Rollback: <500ms
- Warn if exceeded, fail test if exceeded

### 3. Schema Validation (from consolidated memories)
- Always validate external data with Zod
- Use branded types at boundaries
- Never use `as` type assertions without validation
- Example: `.snapbackrc` file must validate before use

### 4. Error Handling (from consolidated memories)
- Preserve error chain with `cause` property
- Include contextual info (filePath, snapshot ID, etc.)
- Log structured errors at debug level
- Example: `SnapshotCreationError` includes filePath + cause

### 5. Race Condition Prevention (from consolidated memories)
- Synchronous state reservation BEFORE await
- Single-writer lock for critical files (state.json, index.json)
- Always delete state on failure (e.g., activePRE cleanup)
- Test with 100+ concurrent operations

### 6. Interface-First Development (from consolidated memories)
- Define interfaces before implementation
- Create stubs for integration testing
- Allows parallel development
- Example: Define PRWManager interface, then implement

### 7. Debug Logging (from consolidated memories)
- Use console.debug() with structured data objects
- Log at critical paths (orphan detection, deduplication, lock contention)
- Don't log file paths/names (privacy)
- Benefits: Observability without performance impact

---

## Next Steps

**Immediate (Before Week 1 Starts):**
1. [ ] Review this roadmap with team
2. [ ] Assign owners to each phase (can overlap)
3. [ ] Set up feature branches per phase (if parallel work)
4. [ ] Verify test infrastructure ready (vitest, MSW, mocking)

**Week 1 Day 1:**
1. [ ] Phase 1 Day 1: Start types.ts + storeState.ts
2. [ ] Phase 2 Day 1: Verify existing UX utilities
3. [ ] Create test files with stub tests (TDD)

**Week 1 Day 2:**
1. [ ] Phase 1 Day 2: SnapshotStore.ts upgrade
2. [ ] Phase 1 Day 2: Add unit tests as code progresses

**Week 1 Day 3:**
1. [ ] Phase 1 Day 3: PRWManager + integration wiring
2. [ ] Phase 1 Day 3: All Phase 1 tests passing
3. [ ] Gate Check: Phase 1 & 2 complete, unblocks Week 2

---

## References

**Original Planning Documents:**
- CURRENT_EXECUTION_STATE.md (UX focus, Weeks 1-3)
- v1_rollout/ (Storage focus, Phases 1-5)

**Architecture:**
- CONSOLIDATED_MEMORIES.md (patterns & lessons learned)
- always-typescript-patterns.md (type safety)
- always-code-consolidation.md (canonical locations)
- always-result-type-pattern.md (error handling)
- always-monorepo-imports.md (package structure)

**Key Locations:**
- Feature branches: Follow feature branch strategy per Phase
- Test setup: See TDD_CORE.md for test patterns
- Performance: See performance budget tests in Phase 5

---

**Status:** Ready for execution
**Last Review:** 2025-12-14
**Next Update:** After Phase 1 completion (EOD Week 1)
