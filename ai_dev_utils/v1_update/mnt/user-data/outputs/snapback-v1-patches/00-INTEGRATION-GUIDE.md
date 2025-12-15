# V1 Roadmap Patches - Integration Guide

**Date:** 2025-12-14  
**Purpose:** Integrate missing pieces into Consolidated V1 Roadmap  
**Files in this patch set:**
1. `01-writerLock.ts` - WriterLock implementation
2. `02-preRollback-and-chainResolution.ts` - PRE_ROLLBACK + getWithContent
3. `03-telemetry-mock-fix.md` - Test infrastructure prerequisite
4. `04-sessionstore-deferral.md` - Architecture decision record
5. `05-types-complete.ts` - Complete types.ts with blobHash rename

---

## Roadmap Updates Required

### Update 1: Add WriterLock to Phase 1 Day 1

**In WEEK_BY_WEEK_GUIDE.md, Phase 1 Day 1:**

Add after `storeState.ts` section:

```markdown
**Session 3 (1 hour): writerLock.ts Creation**

**Deliverables:**
- `apps/vscode/src/storage/writerLock.ts`
- Single-writer lock with FIFO queue
- Methods: withLock(), tryAcquire(), isLocked(), getQueueDepth(), rejectAll()

**Tests:**
- Concurrent execution ordering (FIFO)
- Lock release on error
- 100+ concurrent stress test

**Checklist:**
- [ ] writerLock.ts compiles
- [ ] All unit tests passing
- [ ] No deadlock scenarios
```

**Update Phase 1 "Files Modified/Created":**
```
apps/vscode/src/storage/
├── types.ts                    (modified: V2 schema, type guards, blobHash)
├── storeState.ts               (new: state/index management)
├── writerLock.ts               (new: single-writer lock)  <-- ADD THIS
├── SnapshotStore.ts            (modified: V2 support, PRE creation)
└── BlobStore.ts                (no change)
```

---

### Update 2: Add createPreRollbackCheckpoint to Phase 1 Day 2

**In WEEK_BY_WEEK_GUIDE.md, Phase 1 Day 2, Session 2:**

Add to `SnapshotStore` deliverables:

```typescript
// Add to Session 2 deliverables:

async createPreRollbackCheckpoint(targetId: string): Promise<SnapshotManifestV2> {
  // Same pattern as createPreCheckpoint but:
  // - type: 'PRE_ROLLBACK'
  // - metadata.rollbackTarget: targetId
}

async getWithContent(id: string): Promise<{
  manifest: SnapshotManifestV2;
  contents: Record<string, string>;
} | null> {
  // For POST: load directly from blobs
  // For PRE/PRE_ROLLBACK: walk parent chain to POST
  // Throws SnapshotChainError if chain broken
}

// Add SnapshotChainError class
export class SnapshotChainError extends Error {
  constructor(message, snapshotId, brokenAtId) { ... }
}
```

**Update tests section:**
```typescript
describe('SnapshotStore.createPreRollbackCheckpoint', () => {
  it('creates with type PRE_ROLLBACK', async () => { /* ... */ });
  it('includes rollbackTarget in metadata', async () => { /* ... */ });
  it('links to current HEAD', async () => { /* ... */ });
});

describe('SnapshotStore.getWithContent', () => {
  it('loads POST content directly', async () => { /* ... */ });
  it('resolves PRE to parent POST', async () => { /* ... */ });
  it('throws SnapshotChainError on broken chain', async () => { /* ... */ });
  it('throws on chain exceeding MAX_DEPTH', async () => { /* ... */ });
});
```

---

### Update 3: Add Phase 1.5 (Telemetry Mock Fix)

**In CONSOLIDATED_V1_ROADMAP.md, after Phase 1:**

```markdown
### PHASE 1.5: Test Infrastructure Fix (Week 1, End of Day 3)

**Duration:** ~4 hours (can overlap with Phase 2 validation)

**Dependencies:** None (infrastructure work)

**Problem:** ~50-80 test failures due to incomplete analytics mocking

**Deliverables:**
1. Create `apps/vscode/test/mocks/analytics.mock.ts`
   - Complete PostHog interface mock
   - Helper functions: resetAnalyticsMocks(), getCapturedEvents(), expectEventCaptured()

2. Update `apps/vscode/test/setup.ts`
   - Global mock for @snapback/analytics
   - Global mock for @/modules/analytics/provider/posthog
   - beforeEach reset

3. Audit and remove per-file mocks
   - grep for vi.mock.*analytics
   - grep for vi.mock.*posthog
   - Remove redundant mocks

**Test Gates:**
- Analytics-related failures: 0
- Total test failures: <100 (down from ~150-200)

**Success Criteria:**
- [ ] Centralized mock in place
- [ ] Per-file mocks removed
- [ ] Test failure count documented (before/after)
- [ ] No new test warnings

**Risk Mitigation:**
- This is infrastructure only - doesn't change business logic
- Safe to do in parallel with Phase 2 validation
```

**Update Timeline:**
```
WEEK 1 (16 hours → was 14):
  Mon-Tue-Wed (3 days):
    Stream A: Phase 1 (Storage Foundation) - 12 hours + 1h writerLock
    Stream B: Phase 2 (UX Utilities) - 4 hours
    Stream C: Phase 1.5 (Test Infrastructure) - 4 hours (parallel)
```

---

### Update 4: Add blobHash Rename to Phase 1 Checklist

**In CONSOLIDATED_V1_ROADMAP.md, Phase 1 Success Criteria:**

Add:
```markdown
- [ ] SnapshotFileRef uses `blobHash` (not `blob`) consistently
- [ ] All existing code updated to use blobHash
- [ ] BlobStore.store() returns { hash, size } (already correct per audit)
```

**In WEEK_BY_WEEK_GUIDE.md, Day 1 Session 1:**

Add note:
```markdown
**IMPORTANT: Field Rename**
In SnapshotFileRef, rename `blob` → `blobHash` for clarity.
This is a breaking change for any code referencing `ref.blob`.

Search and replace:
- `ref.blob` → `ref.blobHash`
- `{ blob:` → `{ blobHash:`
```

---

### Update 5: Add SessionStore Deferral Note

**In CONSOLIDATED_V1_ROADMAP.md, add section after Phase 6:**

```markdown
---

## Deferred Work (Post-V1)

### SessionStore Lazy/Async Conversion
**Deferred to:** V1.1 or V2
**Rationale:** See `docs/decisions/sessionstore-deferral.md`
**Summary:** SessionStore eager writes are a performance issue, not correctness. 
             Stabilizing SnapshotStore V2 is higher priority.
**Estimated effort:** M (8-12 hours)
```

---

### Update 6: Add Parent Chain Handling to Phase 1

**In CONSOLIDATED_V1_ROADMAP.md, Phase 1 Risk Mitigation:**

Add:
```markdown
- **Broken parent chains:** getWithContent() throws SnapshotChainError with context
- **Infinite loops:** MAX_CHAIN_DEPTH = 100 prevents runaway resolution
- **Orphan detection:** findOrphanedCheckpoints() for crash recovery (Phase 5)
```

---

## Updated Dependency Diagram

```
                    ┌──────────────────────┐
                    │   PHASE 5: TESTING   │
                    │ (Week 3: 10 hours)   │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
    ┌───────────▼──────┐  ┌────▼──────────┐  │
    │  PHASE 4: UX     │  │  PHASE 6:     │  │
    │  Onboarding      │  │  Config       │  │
    └────────┬─────────┘  └───────┬───────┘  │
             │                    │          │
             └────────┬───────────┘          │
                      │                      │
            ┌─────────▼──────────┐           │
            │  PHASE 3: SAFETY   │───────────┘
            └─────────┬──────────┘
                      │
                      │ depends on
                      │
            ┌─────────▼──────────┐
            │  PHASE 1: STORAGE  │ ◄─── CRITICAL PATH
            │  (Week 1: 13h)     │      +1h for writerLock
            │                    │
            │ + writerLock.ts    │ ◄─── NEW
            │ + createPreRollback│ ◄─── NEW
            │ + getWithContent   │ ◄─── NEW (chain resolution)
            │ + blobHash rename  │ ◄─── EXPLICIT
            └─────────┬──────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         │   parallel │            │
         │            │            │
┌────────▼────────┐ ┌─▼────────────▼───┐
│ PHASE 2: UX     │ │ PHASE 1.5: TEST  │ ◄─── NEW
│ Utils (4h)      │ │ INFRA (4h)       │
└─────────────────┘ └──────────────────┘
```

---

## Updated Checklist (Before Starting)

```
[x] WriterLock implementation ready (01-writerLock.ts)
[x] createPreRollbackCheckpoint() specified (02-preRollback-and-chainResolution.ts)
[x] getWithContent() chain resolution specified (02-preRollback-and-chainResolution.ts)
[x] SnapshotChainError defined (02-preRollback-and-chainResolution.ts)
[x] Telemetry mock fix task documented (03-telemetry-mock-fix.md)
[x] SessionStore deferral noted (04-sessionstore-deferral.md)
[x] blobHash rename explicit (05-types-complete.ts)
[x] Parent chain error handling specified (02-preRollback-and-chainResolution.ts)
[x] Timeline updated (14h → 16h Week 1)

Ready to execute! ✅
```

---

## File Placement

Copy these files to your project:

| Patch File | Destination |
|------------|-------------|
| `01-writerLock.ts` | `apps/vscode/src/storage/writerLock.ts` |
| `02-preRollback-and-chainResolution.ts` | Merge into `apps/vscode/src/storage/SnapshotStore.ts` |
| `03-telemetry-mock-fix.md` | `docs/tasks/telemetry-mock-fix.md` |
| `04-sessionstore-deferral.md` | `docs/decisions/sessionstore-deferral.md` |
| `05-types-complete.ts` | Replace `apps/vscode/src/storage/types.ts` |

---

## Execution Order

1. **Day 1 Morning:** Copy `05-types-complete.ts` → types.ts
2. **Day 1 Morning:** Create storeState.ts (from roadmap)
3. **Day 1 Afternoon:** Copy `01-writerLock.ts` → writerLock.ts
4. **Day 2:** Update SnapshotStore.ts with `02-preRollback-and-chainResolution.ts` methods
5. **Day 3:** Complete PRWManager (from roadmap)
6. **Day 3 Evening:** Execute `03-telemetry-mock-fix.md` tasks
7. **Week 2+:** Continue as per roadmap

---

**You're now fully equipped to run V1!** 🚀
