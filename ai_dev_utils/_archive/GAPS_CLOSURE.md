# Implementation Gaps - Verification & Closure

**Date:** 2025-12-14
**Status:** All 7 gaps reviewed, 4 closed, 3 require action

---

## ✅ Closed Gaps (No Action Needed)

### 1. WriterLock Implementation
- **Status:** Already implemented ✅
- **Location:** `apps/vscode/src/storage/writerLock.ts` (156 lines)
- **Usage:** `await withLock(lock, async () => { ... })`
- **Integration:** Already in SnapshotStore.ts and StorageManager.ts
- **Action:** None needed

### 2. SessionStore Lazy Initialization
- **Status:** Already designed lazy ✅
- **Current design:**
  - `activeSessionId` tracked in-memory only
  - Persisted to disk only on `finalizeSession()`
  - Never writes on every snapshot (was original concern)
- **Action:** None needed - confirms current approach is correct

### 3. `blobHash` vs `blob` Rename
- **Status:** Explicit in Phase 1 ✅
- **Location:** WEEK_BY_WEEK_GUIDE.md "Session 1 (types.ts)"
- **Interface:** `{ blobHash: string; size: number }` (not `blob`)
- **Action:** None needed - already specified

---

## ⚠️ Gaps Requiring Action

### 4. `createPreRollbackCheckpoint()` Method Missing from Phase 1

**Problem:**
- Phase 1 shows `createPreCheckpoint()` but NOT `createPreRollbackCheckpoint()`
- Phase 3 RollbackService calls `onBeforeRollback()` which calls `createPreRollbackCheckpoint()`
- Without this, Phase 3 won't compile

**Solution:**
Add to **Phase 1 Day 3 (SnapshotStore.ts)** Session 2 (2 hours):

```typescript
// Add after createPreCheckpoint() method:

async createPreRollbackCheckpoint(targetId: string): Promise<SnapshotManifestV2> {
  return this.lock.withLock(async () => {
    const { newState, seq } = allocateSeq(this.state);
    const parentSeq = this.state.headSeq || null;
    const parentId = this.state.headId || null;

    const manifest: SnapshotManifestV2 = {
      schemaVersion: 2,
      id: generateId(),
      seq,
      parentSeq,
      parentId,
      type: 'PRE_ROLLBACK',  // Key difference
      timestamp: Date.now(),
      trigger: 'rollback',
      name: `PRE_ROLLBACK: ${targetId}`,
      files: {},  // EMPTY - pointer only
      metadata: {
        origin: 'AUTOMATED',
        riskScore: 1.0,
        reasons: ['PRE_ROLLBACK'],
        targetId  // Audit trail
      },
    };

    const manifestUri = vscode.Uri.joinPath(
      this.storageUri,
      'snapshots',
      `snap-${manifest.id}.json`
    );
    await vscode.workspace.fs.writeFile(
      manifestUri,
      Buffer.from(JSON.stringify(manifest))
    );

    this.state = updateHead(newState, manifest.id, seq);
    this.index = addToIndex(this.index, seq, manifest.id);

    await this.persistState();
    await this.persistIndex();

    console.debug('[SnapshotStore] Created PRE_ROLLBACK checkpoint', {
      id: manifest.id,
      targetId
    });

    return manifest;
  });
}
```

**Key differences from `createPreCheckpoint()`:**
- `type: 'PRE_ROLLBACK'` (vs `'PRE'`)
- `trigger: 'rollback'` (vs `'risk-burst'`)
- `targetId` in metadata (tracks what we're rolling back to)
- `origin: 'AUTOMATED'` (always, since rollback is system-initiated)

**Tests to add:**
```typescript
describe('SnapshotStore.createPreRollbackCheckpoint', () => {
  it('creates manifest with type PRE_ROLLBACK', async () => {
    const pre = await store.createPreRollbackCheckpoint('target-123');
    expect(pre.type).toBe('PRE_ROLLBACK');
  });

  it('has empty files object', async () => {
    const pre = await store.createPreRollbackCheckpoint('target-123');
    expect(pre.files).toEqual({});
  });

  it('includes targetId in metadata', async () => {
    const pre = await store.createPreRollbackCheckpoint('target-123');
    expect(pre.metadata.targetId).toBe('target-123');
  });

  it('allocates seq correctly', async () => {
    const pre = await store.createPreRollbackCheckpoint('target-123');
    expect(pre.seq).toBeGreaterThan(0);
  });
});
```

**Update locations:**
1. CONSOLIDATED_V1_ROADMAP.md Phase 1 - add `createPreRollbackCheckpoint()` to deliverables
2. WEEK_BY_WEEK_GUIDE.md - add to Week 1 Day 3 SnapshotStore section
3. Success Criteria - add: "[ ] createPreRollbackCheckpoint() creates PRE_ROLLBACK checkpoints"

---

### 5. Telemetry Mock Fix - Week 0 Pre-Work

**Problem:**
- 303 tests currently failing (primarily telemetry/initialization issues)
- Phase 5 will add 100+ new tests
- Without baseline fix, Phase 5 becomes test fatigue cleanup task

**Solution:**
Add **Week 0 Pre-Work (1-2 hours)** as prerequisite before Phase 1:

```markdown
## WEEK 0 PRE-WORK: Test Infrastructure Baseline

**Duration:** 1-2 hours (PREREQUISITE - before Phase 1 starts)

**Gate:** Complete this before Monday Week 1

**Tasks:**

1. **Capture baseline:**
   ```bash
   cd apps/vscode && pnpm test 2>&1 | tee test-baseline-dec14.log
   ```
   - Note the "FAIL" count
   - Note the "passed/failed" summary

2. **Identify top 3 failure patterns:**
   ```bash
   grep "Error:" test-baseline-dec14.log | head -10
   ```

3. **Fix PostHog telemetry mock:**
   - Edit `vitest.config.ts`
   - Ensure `vi.mock()` for telemetry is in global setup
   - Verify mock is active for all tests

4. **Fix top 2-3 blocking failures:**
   - Examples: Import errors, initialization order, async timing
   - Focus on failures that would block Phase 1 tests
   - Ignore non-critical test failures

5. **Capture new baseline:**
   ```bash
   pnpm test 2>&1 | tail -3
   ```
   - Goal: <50 failing tests
   - If >100, document which are non-blocking

**Rationale:**
- Phase 1 tests run on clean baseline
- Phase 5 focuses on new tests, not fixing 300 inherited failures
- Prevents test fatigue and burnout

**Success Criteria:**
- [ ] Baseline captured and logged
- [ ] <50 tests failing (or documented blockers)
- [ ] PostHog mock verified working
```

**Add to documents:**
1. CONSOLIDATED_V1_ROADMAP.md - new section before Phase 1
2. WEEK_BY_WEEK_GUIDE.md - new section before Week 1
3. CONSOLIDATED_V1_SUMMARY.md - add to checklist

---

### 6. Parent Chain Error Handling in getWithContent()

**Problem:**
- `getWithContent()` walks parent chain to find POST ancestor
- What happens if chain is broken (orphan, corrupted)?
- Current spec doesn't specify error handling

**Solution:**
Add to Phase 1 SnapshotStore.ts `getWithContent()` implementation:

```typescript
async getWithContent(id: string): Promise<{ manifest: SnapshotManifestV2; contents: Record<string, string> } | null> {
  const manifest = await this.getManifest(id);
  if (!manifest) return null;

  // If POST: load directly from blobs
  if (manifest.type === 'POST') {
    const contents: Record<string, string> = {};
    for (const [path, ref] of Object.entries(manifest.files)) {
      const content = await this.blobStore.read(ref.blobHash);
      if (!content) {
        console.warn('[SnapshotStore] Blob missing for path', { path, blobHash: ref.blobHash });
        contents[path] = ''; // Fallback to empty (or throw?)
      } else {
        contents[path] = content;
      }
    }
    return { manifest, contents };
  }

  // If PRE/PRE_ROLLBACK: walk parent chain with depth limit
  const MAX_CHAIN_DEPTH = 100;
  let current = manifest;
  let depth = 0;

  while (current.type !== 'POST' && depth < MAX_CHAIN_DEPTH) {
    if (!current.parentId) {
      // Orphan PRE without POST ancestor
      console.error('[SnapshotStore] Orphan checkpoint detected', {
        id: current.id,
        type: current.type,
        depth
      });
      return null; // Or throw SnapshotOrphanError
    }

    const parent = await this.getManifest(current.parentId);
    if (!parent) {
      console.error('[SnapshotStore] Parent manifest missing', {
        id: current.id,
        parentId: current.parentId
      });
      return null; // Broken chain
    }

    current = parent;
    depth++;
  }

  if (depth >= MAX_CHAIN_DEPTH) {
    console.error('[SnapshotStore] Chain depth limit exceeded', { id, depth: MAX_CHAIN_DEPTH });
    return null; // Prevent infinite loops
  }

  // Now current is POST - resolve content
  return this.getWithContent(current.id);
}
```

**Error handling strategy:**
- **Max depth limit:** 100 (prevents infinite loops)
- **Missing parent:** Return null (fail gracefully)
- **Orphan PRE:** Log error, return null, trigger orphan detection scan
- **Missing blob:** Log warning, use empty string fallback (or throw)

**Tests to add:**
```typescript
describe('SnapshotStore.getWithContent', () => {
  it('resolves POST directly', async () => { /* ... */ });

  it('resolves PRE by walking parent chain', async () => { /* ... */ });

  it('returns null for orphan PRE (no POST ancestor)', async () => {
    // Create PRE with no parent
  });

  it('returns null if parent chain broken', async () => {
    // Create PRE → PRE chain where second PRE missing
  });

  it('prevents infinite loops with depth limit', async () => {
    // Create circular parent chain (if possible)
  });

  it('handles missing blobs gracefully', async () => {
    // Create POST with missing blob
  });
});
```

**Update locations:**
1. WEEK_BY_WEEK_GUIDE.md - Add to Phase 1 Day 2 SnapshotStore section
2. CONSOLIDATED_V1_ROADMAP.md Phase 1 - add "getWithContent() with chain resolution + error handling"

---

### 7. Timeline Confirmation

**Gap:** No explicit confirmation of 3-week timeline vs sprint-compressed

**Clarification:**

```
Proposed: 3 calendar weeks (starting Monday Dec 16, 2025)
├─ Week 1 (Dec 16-20): Phase 1 + Phase 2 = 14 hours
├─ Week 2 (Dec 23-27): Phase 3 + Phase 4 = 14 hours [Holiday week - adjust?]
└─ Week 3 (Dec 30-Jan 3): Phase 5 + Phase 6 = 24 hours [New Year week - adjust?]

Alternative: Sprint-compressed (2 weeks intensive)
├─ Week 1: Phases 1-3 (36 hours) = Full-time intensive
└─ Week 2: Phases 4-6 (16 hours) + stabilization

Recommendation:
- Use 3-week calendar timeline
- Flag holiday weeks (Dec 23, Dec 30) as reduced capacity
- Adjust Phase 2-3 boundary if needed for continuity
```

**Action:** Confirm with team and update roadmap dates accordingly

---

## Summary Table

| Gap | Status | Action | Effort |
|-----|--------|--------|--------|
| 1. WriterLock | ✅ Closed | None | - |
| 2. SessionStore | ✅ Closed | None | - |
| 3. blobHash | ✅ Closed | None | - |
| 4. createPreRollbackCheckpoint() | ⚠️ Action | Add method to Phase 1 | 20 lines |
| 5. Telemetry mock | ⚠️ Action | Add Week 0 pre-work | 1-2h |
| 6. Parent chain error handling | ⚠️ Action | Add to getWithContent() | 30 lines + tests |
| 7. Timeline confirmation | ⚠️ Action | Confirm dates | - |

---

## Updated Checklist Before Week 1 Starts

- [ ] Gap 4: Add `createPreRollbackCheckpoint()` to Phase 1 (WEEK_BY_WEEK_GUIDE.md + ROADMAP.md)
- [ ] Gap 5: Add Week 0 pre-work section (test baseline cleanup)
- [ ] Gap 6: Specify error handling in getWithContent() (MAX_CHAIN_DEPTH, orphan handling)
- [ ] Gap 7: Confirm 3-week timeline with team (note holiday weeks)
- [ ] **Then:** Proceed with Phase 1 execution

---

**Created:** 2025-12-14
**Reviewer:** Gap analysis from critical review
**Next:** Implement actions 4-7 above, then execute Phase 1
