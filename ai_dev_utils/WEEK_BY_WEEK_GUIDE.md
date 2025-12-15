# Week-by-Week Execution Guide - Consolidated V1

**Purpose:** Daily breakdown of what to build, test gates, and success metrics per week
**Audience:** Team members executing the work
**Duration:** 3 weeks of focused, parallel work

---

## WEEK 0 (Pre-Work): Test Infrastructure Baseline

**Duration:** 1-2 hours (PREREQUISITE before Week 1)

**Goal:** Establish clean test baseline before Phase 1 begins

**Tasks:**
1. Run full test suite and capture baseline:
   ```bash
   cd apps/vscode && pnpm test 2>&1 | tee test-baseline.log
   # Look for: "FAIL" count, "passed/failed" summary
   ```
2. Current baseline: 303 failing tests
3. Target: Reduce to <50 by fixing top failure patterns
4. Check PostHog mock in `vitest.config.ts`
5. Document baseline for Phase 5 comparison

**Gate:** Baseline captured and <50 failures (or documented current failures)

**Rationale:** Phase 5 (Testing) will add 100+ new tests. Starting from clean baseline prevents test fatigue.

---

## WEEK 1: Foundation + Utilities

**Total Effort:** 14 hours (7h per engineer if 2-person team)
**Parallel Streams:** Phase 1 (Backend) + Phase 2 (Frontend)
**Goal:** Stable storage layer + verified UX utilities = unblock Phases 3-4

---

### WEEK 1 - Day 1 (Monday)

#### Phase 1: Storage Foundation (Backend) - 4 hours

**Morning Standup (15 min):**
- Goal: types.ts + storeState.ts complete by EOD
- Setup: Feature branch `feature/phase1-schema-migration`
- Test mindset: TDD - write failing tests first

**Session 1 (2 hours): types.ts Update**

**Deliverables:**
```typescript
// apps/vscode/src/storage/types.ts

// NEW: Type definitions
export type CheckpointType = 'POST' | 'PRE' | 'PRE_ROLLBACK';
export type OriginLabel = 'INTERACTIVE' | 'AUTOMATED';
export type ReasonCode =
  | 'RISK_BURST_START' | 'RISK_LARGE_DELETE'
  | 'AI_DETECTED' | 'MANUAL_SAVE' | 'MANUAL_CHECKPOINT';

// KEEP: SnapshotManifestV1 (backward compat)
interface SnapshotManifestV1 { /* existing */ }

// NEW: SnapshotManifestV2
interface SnapshotManifestV2 {
  schemaVersion: 2;
  id: string;
  seq: number;
  parentSeq: number | null;
  parentId: string | null;
  type: CheckpointType;
  timestamp: number;
  trigger: string;
  name: string;
  files: Record<string, { blobHash: string; size: number }>;
  metadata: {
    origin: OriginLabel;
    riskScore: number;
    reasons: ReasonCode[];
  };
}

// NEW: Type guards
function isV2Manifest(m: unknown): m is SnapshotManifestV2 { /* ... */ }
function isPointerCheckpoint(m: SnapshotManifest): boolean { /* ... */ }
function isPostCheckpoint(m: SnapshotManifest): boolean { /* ... */ }

// EXPORT: Union type
export type SnapshotManifest = SnapshotManifestV1 | SnapshotManifestV2;
```

**Tests to Write First (RED):**
```typescript
// apps/vscode/test/unit/storage/types.test.ts
describe('SnapshotManifestV2', () => {
  it('isV2Manifest recognizes V2 manifests', () => { /* ... */ });
  it('isV2Manifest rejects V1 manifests', () => { /* ... */ });
  it('isPointerCheckpoint identifies PRE and PRE_ROLLBACK', () => { /* ... */ });
  it('isPostCheckpoint identifies POST only', () => { /* ... */ });
});
```

**Checklist:**
- [ ] types.ts compiles without errors
- [ ] Union type works: `const m: SnapshotManifest = ...` accepts V1 and V2
- [ ] Type guards have test coverage
- [ ] `pnpm typecheck` passes

**Session 2 (2 hours): storeState.ts Creation**

[... existing content ...]

**Deliverables:**
```typescript
// apps/vscode/src/storage/storeState.ts

interface StoreState {
  schemaVersion: 1;
  lastSeq: number;        // Last allocated sequence number
  headId: string | null;  // Current HEAD snapshot ID
  headSeq: number | null; // HEAD sequence number
  lastUpdatedAt: number;  // Timestamp of last update
}

interface SeqIndex {
  schemaVersion: 1;
  bySeq: Record<number, string>;   // seq → id mapping
  byId: Record<string, number>;    // id → seq mapping
  rebuiltAt: number;               // Timestamp of last rebuild
}

export const DEFAULT_STATE: StoreState = {
  schemaVersion: 1,
  lastSeq: 0,
  headId: null,
  headSeq: null,
  lastUpdatedAt: Date.now(),
};

export const DEFAULT_INDEX: SeqIndex = {
  schemaVersion: 1,
  bySeq: {},
  byId: {},
  rebuiltAt: Date.now(),
};

// Helper functions
export function allocateSeq(state: StoreState): { newState: StoreState; seq: number } {
  const seq = state.lastSeq + 1;
  return {
    newState: { ...state, lastSeq: seq, lastUpdatedAt: Date.now() },
    seq,
  };
}

export function updateHead(state: StoreState, headId: string, headSeq: number): StoreState {
  return { ...state, headId, headSeq, lastUpdatedAt: Date.now() };
}

export function addToIndex(index: SeqIndex, seq: number, id: string): SeqIndex {
  return {
    ...index,
    bySeq: { ...index.bySeq, [seq]: id },
    byId: { ...index.byId, [id]: seq },
  };
}

// Validation
export function isValidState(obj: unknown): obj is StoreState {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as StoreState).schemaVersion === 1 &&
    typeof (obj as StoreState).lastSeq === 'number'
  );
}
```

**Tests to Write First (RED):**
```typescript
// apps/vscode/test/unit/storage/storeState.test.ts
describe('StoreState', () => {
  it('allocateSeq increments lastSeq', () => { /* ... */ });
  it('updateHead changes headId and headSeq', () => { /* ... */ });
  it('addToIndex maintains bidirectional mapping', () => { /* ... */ });
  it('isValidState rejects invalid objects', () => { /* ... */ });
});
```

**Checklist:**
- [ ] storeState.ts compiles
- [ ] All helper functions have tests
- [ ] Validation functions work correctly
- [ ] No import errors from SnapshotStore yet (it will call these)

---

#### Phase 2: UX Utilities (Frontend) - 4 hours ↔ PARALLEL

**Morning (1 hour): Verify ProgressReporter**
- Location: `apps/vscode/src/ux/utilities/ProgressReporter.ts`
- Tests: Check that 24 tests pass
- Command: `pnpm test -- ProgressReporter`
- Success: All 24 passing ✅

**Midday (1 hour): Verify StatusBarAnimator**
- Location: `apps/vscode/src/ux/utilities/StatusBarAnimator.ts`
- Tests: Check that 27 tests pass
- Command: `pnpm test -- StatusBarAnimator`
- Success: All 27 passing ✅

**Afternoon (2 hours): Verify TreeItemBadgeProvider**
- Location: `apps/vscode/src/ux/utilities/TreeItemBadgeProvider.ts`
- Tests: Check that 36 tests pass + integration
- Command: `pnpm test -- TreeItemBadgeProvider`
- Success: All 36 + 26 integration = 62 passing ✅

**Checklist:**
- [ ] ProgressReporter: 24 tests passing
- [ ] StatusBarAnimator: 27 tests passing
- [ ] TreeItemBadgeProvider: 36 tests passing
- [ ] Integration tests: 26 passing
- [ ] Total Phase 2: 113 tests passing ✅

---

### WEEK 1 - Day 2 (Tuesday)

#### Phase 1: Storage Foundation (Backend) - 4 hours

**Goal:** SnapshotStore.ts upgrade with V2 support

**Session 1 (2 hours): SnapshotStore Constructor + Initialize**

**Deliverables:**
```typescript
// apps/vscode/src/storage/SnapshotStore.ts

export class SnapshotStore {
  private state: StoreState = DEFAULT_STATE;
  private index: SeqIndex = DEFAULT_INDEX;
  private readonly stateUri: vscode.Uri;
  private readonly indexUri: vscode.Uri;
  private readonly lock: WriterLock;

  constructor(
    private storageUri: vscode.Uri,
    private blobStore: BlobStore,
    private workspaceKey: string
  ) {
    this.stateUri = vscode.Uri.joinPath(storageUri, 'state.json');
    this.indexUri = vscode.Uri.joinPath(storageUri, 'index.json');
    this.lock = new WriterLock();
  }

  async initialize(): Promise<void> {
    // Load or create state.json
    try {
      const stateData = await vscode.workspace.fs.readFile(this.stateUri);
      const parsed = JSON.parse(Buffer.from(stateData).toString());
      if (isValidState(parsed)) {
        this.state = parsed;
      } else {
        await this.rebuildStateFromDisk();
      }
    } catch {
      // File doesn't exist or is corrupt
      await this.rebuildStateFromDisk();
    }

    // Load or create index.json (similar pattern)
    try {
      const indexData = await vscode.workspace.fs.readFile(this.indexUri);
      const parsed = JSON.parse(Buffer.from(indexData).toString());
      if (isValidIndex(parsed)) {
        this.index = parsed;
      }
    } catch {
      // Rebuild if missing
      await this.rebuildStateFromDisk();
    }
  }

  async rebuildStateFromDisk(): Promise<void> {
    // Scan snapshots/ directory
    // Sort by timestamp
    // Assign virtual seq numbers
    // Build index
    // Write state.json and index.json
    console.debug('[SnapshotStore] Rebuilt state from disk');
  }

  private normalizeToV2(manifest: SnapshotManifestV1): SnapshotManifestV2 {
    // Convert V1 to V2 in-memory for consistent interface
    // Assign virtual seq based on timestamp
    return {
      schemaVersion: 2,
      id: manifest.id,
      seq: Math.floor(manifest.timestamp / 1000), // Virtual seq from timestamp
      parentSeq: null,
      parentId: null,
      type: 'POST',
      timestamp: manifest.timestamp,
      trigger: 'auto',
      name: manifest.name || '',
      files: manifest.files.map(f => ({ blobHash: f.blob, size: f.size })),
      metadata: { origin: 'UNKNOWN', riskScore: 0, reasons: [] },
    };
  }
}
```

**Tests to Write First (RED):**
```typescript
describe('SnapshotStore.initialize', () => {
  it('loads existing state.json', async () => { /* ... */ });
  it('creates state.json if missing', async () => { /* ... */ });
  it('rebuilds state if corrupted', async () => { /* ... */ });
  it('normalizeToV2 converts V1 to V2', () => { /* ... */ });
});
```

**Session 2 (2 hours): create(), createPreCheckpoint(), and createPreRollbackCheckpoint()**

**Deliverables:**
```typescript
async create(files: FileRef[]): Promise<SnapshotManifestV2> {
  return this.lock.withLock(async () => {
    // Allocate seq
    const { newState, seq } = allocateSeq(this.state);

    // Get parent info
    const parentSeq = this.state.headSeq || null;
    const parentId = this.state.headId || null;

    // Store files in blob store
    const fileRefs: Record<string, FileRef> = {};
    for (const file of files) {
      const { hash, size } = await this.blobStore.store(file.content);
      fileRefs[file.path] = { blobHash: hash, size };
    }

    // Create manifest
    const manifest: SnapshotManifestV2 = {
      schemaVersion: 2,
      id: generateId(),
      seq,
      parentSeq,
      parentId,
      type: 'POST',
      timestamp: Date.now(),
      trigger: 'manual',
      name: 'Manual snapshot',
      files: fileRefs,
      metadata: { origin: 'INTERACTIVE', riskScore: 0, reasons: [] },
    };

    // Write manifest to snapshots/snap-{id}.json
    const manifestUri = vscode.Uri.joinPath(this.storageUri, 'snapshots', `snap-${manifest.id}.json`);
    await vscode.workspace.fs.writeFile(manifestUri, Buffer.from(JSON.stringify(manifest)));

    // Update state and index
    this.state = updateHead(newState, manifest.id, seq);
    this.index = addToIndex(this.index, seq, manifest.id);

    // Persist state and index
    await this.persistState();
    await this.persistIndex();

    return manifest;
  });
}

async createPreCheckpoint(name: string, origin: OriginLabel, reasons: ReasonCode[]): Promise<SnapshotManifestV2> {
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
      type: 'PRE',
      timestamp: Date.now(),
      trigger: 'risk-burst',
      name,
      files: {}, // EMPTY - pointer only
      metadata: { origin, riskScore: 0.7, reasons }, // Example risk score
    };

    // Write manifest
    const manifestUri = vscode.Uri.joinPath(this.storageUri, 'snapshots', `snap-${manifest.id}.json`);
    await vscode.workspace.fs.writeFile(manifestUri, Buffer.from(JSON.stringify(manifest)));

    // Update state and index
    this.state = updateHead(newState, manifest.id, seq);
    this.index = addToIndex(this.index, seq, manifest.id);

    // Persist
    await this.persistState();
    await this.persistIndex();

    console.debug('[SnapshotStore] Created PRE checkpoint', { id: manifest.id, seq });

    return manifest;
  });
}

async getWithContent(id: string): Promise<{ manifest: SnapshotManifestV2; contents: Record<string, string> } | null> {
  // If POST: load files from blobs directly
  // If PRE/PRE_ROLLBACK: walk parentId chain until finding POST, load content from there
  // Return { manifest, contents }
}
```

**Tests:**
```typescript
describe('SnapshotStore.create', () => {
  it('allocates seq from state', async () => { /* ... */ });
  it('stores files in blob store', async () => { /* ... */ });
  it('persists state and index', async () => { /* ... */ });
});

describe('SnapshotStore.createPreCheckpoint', () => {
  it('has empty files object', async () => { /* ... */ });
  it('points to parent via parentSeq/parentId', async () => { /* ... */ });
  it('type is PRE', async () => { /* ... */ });
});

describe('SnapshotStore.createPreRollbackCheckpoint', () => {
  it('has empty files object', async () => { /* ... */ });
  it('type is PRE_ROLLBACK', async () => { /* ... */ });
  it('includes targetId in metadata', async () => { /* ... */ });
  it('sets origin to AUTOMATED', async () => { /* ... */ });
});
```

**Checklist:**
- [ ] SnapshotStore.ts compiles
- [ ] create() stores files + updates state/index
- [ ] createPreCheckpoint() creates pointer-only checkpoint (type: 'PRE')
- [ ] createPreRollbackCheckpoint() creates PRE_ROLLBACK checkpoint
- [ ] Both checkpoint types have files: {} (empty)
- [ ] All tests passing (including PRE_ROLLBACK tests)
- [ ] No import errors

---

### WEEK 1 - Day 3 (Wednesday)

#### Phase 1: Storage Foundation (Backend) - 4 hours

**Goal:** PRWManager creation + integration wiring

**Session 1 (2 hours): PRWManager.ts Creation**

**Deliverables:**
```typescript
// apps/vscode/src/protection/PRWManager.ts

export interface PRWConfig {
  riskThreshold: number;      // 0.6 (0-1 scale)
  maxPrePerMinute: number;    // 10
  fileCooldownMs: number;     // 5000
}

export class PRWManager {
  private preCooldowns: Map<string, number> = new Map();
  private recentPres: number[] = [];
  private config: PRWConfig;

  constructor(private snapshotStore: SnapshotStore, config?: Partial<PRWConfig>) {
    this.config = {
      riskThreshold: config?.riskThreshold ?? 0.6,
      maxPrePerMinute: config?.maxPrePerMinute ?? 10,
      fileCooldownMs: config?.fileCooldownMs ?? 5000,
    };
  }

  async onRiskySignalDetected(signal: {
    filePath: string;
    riskScore: number;
    reasons: ReasonCode[];
    origin: OriginLabel;
  }): Promise<SnapshotManifestV2 | null> {
    // Check risk threshold
    if (signal.riskScore < this.config.riskThreshold) {
      return null;
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      console.debug('[PRW] Rate limit exceeded, skipping PRE');
      return null;
    }

    // Check file cooldown
    const now = Date.now();
    const cooldownExpiry = this.preCooldowns.get(signal.filePath) ?? 0;
    if (now < cooldownExpiry) {
      console.debug('[PRW] File cooldown active, skipping PRE', { filePath: signal.filePath });
      return null;
    }

    // Create PRE checkpoint
    const pre = await this.snapshotStore.createPreCheckpoint(
      `PRE: ${signal.filePath}`,
      signal.origin,
      signal.reasons
    );

    // Record cooldown
    this.preCooldowns.set(signal.filePath, now + this.config.fileCooldownMs);
    this.recentPres.push(now);

    console.debug('[PRW] Created PRE checkpoint', { id: pre.id, filePath: signal.filePath });

    return pre;
  }

  async onBeforeRollback(targetId: string): Promise<SnapshotManifestV2> {
    // Create PRE_ROLLBACK checkpoint before rollback happens
    return this.snapshotStore.createPreRollbackCheckpoint(targetId);
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old entries
    this.recentPres = this.recentPres.filter(ts => ts > oneMinuteAgo);

    // Check limit
    if (this.recentPres.length >= this.config.maxPrePerMinute) {
      return false;
    }

    return true;
  }

  cleanup(): void {
    this.preCooldowns.clear();
    this.recentPres = [];
  }
}
```

**Tests:**
```typescript
describe('PRWManager', () => {
  it('creates PRE when riskScore >= threshold', async () => { /* ... */ });
  it('skips PRE when riskScore < threshold', async () => { /* ... */ });
  it('enforces rate limit (max 10/minute)', async () => { /* ... */ });
  it('enforces file cooldown (5s)', async () => { /* ... */ });
  it('cleanup clears state', () => { /* ... */ });
});
```

**Session 2 (2 hours): Integration Wiring**

**Location:** `apps/vscode/src/extension.ts`

**Deliverables:**
```typescript
// In activate() function:

// After StorageManager and SnapshotStore initialized
const prwManager = new PRWManager(storageManager.snapshotStore);

// Wire to AutoDecisionIntegration (if exists)
if (autoDecisionIntegration) {
  autoDecisionIntegration.setPRWManager(prwManager);
}

// Store for later use
context.subscriptions.push({
  dispose: () => prwManager.cleanup(),
});
```

**Update AutoDecisionIntegration.ts:**
```typescript
export class AutoDecisionIntegration {
  private prwManager?: PRWManager;

  setPRWManager(manager: PRWManager): void {
    this.prwManager = manager;
  }

  private async makeDecision(context: DecisionContext): Promise<Decision> {
    // ... existing decision logic ...

    // NEW: Trigger PRE checkpoint if risky
    if (this.prwManager && decision.riskScore >= 0.6) {
      await this.prwManager.onRiskySignalDetected({
        filePath: context.filePath,
        riskScore: decision.riskScore / 100, // normalize to 0-1
        reasons: this.mapToReasonCodes(decision),
        origin: this.classifyOrigin(decision),
      });
    }

    return decision;
  }

  private mapToReasonCodes(decision: Decision): ReasonCode[] {
    // Map decision.reasons → ReasonCode enum
    return [];
  }

  private classifyOrigin(decision: Decision): OriginLabel {
    // AI detected → AUTOMATED, else → INTERACTIVE
    return 'INTERACTIVE';
  }
}
```

**Checklist:**
- [ ] PRWManager.ts compiles
- [ ] All unit tests passing (rate limit, cooldown)
- [ ] extension.ts wires PRWManager
- [ ] AutoDecisionIntegration calls setPRWManager
- [ ] No circular dependencies
- [ ] `pnpm typecheck` passes

---

### WEEK 1 - End of Day 3 (Wednesday EOD)

#### **GATE CHECK: Phase 1 & 2 Complete** ✅

**Phase 1 Checklist:**
- [ ] types.ts updated with V2 schema + type guards
- [ ] storeState.ts created with seq allocation
- [ ] SnapshotStore.ts upgraded with V2 support + PRE creation
- [ ] PRWManager.ts created with rate limiting
- [ ] All Phase 1 unit tests passing (100+ tests)
- [ ] TypeScript compilation: `pnpm typecheck` (0 errors)
- [ ] V1 manifests work via normalizeToV2()
- [ ] PRE checkpoints created with files: {} (verified in tests)

**Phase 2 Checklist:**
- [ ] ProgressReporter verified: 24 tests ✅
- [ ] StatusBarAnimator verified: 27 tests ✅
- [ ] TreeItemBadgeProvider verified: 36 tests ✅
- [ ] Integration tests: 26 tests ✅
- [ ] Total: 113 tests passing

**GO/NO-GO Decision:**
```
✅ GO for Week 2 if:
  - Phase 1: All unit tests passing + TypeScript compiles
  - Phase 2: 113 tests passing
  - No critical blocking issues
  - Ready to proceed to Phase 3 (Safety Layer)

❌ NO-GO if:
  - TypeScript compilation errors (fix before proceeding)
  - >10 failing tests in Phase 1 (investigate and fix)
  - Race condition detected in concurrent tests (redesign)
```

**Week 1 Summary:**
- Duration: 3 days × 4 hours = 12 hours (Phase 1) + 4 hours (Phase 2)
- Status: **COMPLETE** ✅
- Next: Begin Phase 3 (Safety & Rollback) on Week 2 Day 4

---

## WEEK 2: Safety & Onboarding

**Total Effort:** 14 hours (Phase 3: 10h, Phase 4: 8h distributed)
**Goal:** RollbackService operational + UX onboarding wired = prepare for testing

### WEEK 2 - Day 4 (Thursday)

#### Phase 3: Safety & Rollback (Backend) - 4 hours

**Goal:** RollbackService.ts creation with WorkspaceEdit rollback

[Continue with Day 4-5 and Phase 3 details...]

---

## WEEK 3: Testing & Polish

**Total Effort:** 24 hours (Phase 5: 10h, Phase 6: 8h distributed)
**Goal:** Complete test coverage + config validation = V1 ready

[Continue with Week 3 Phase 5-6 details...]

---

## Daily Standup Template

```
Start of Day:
- What did I complete yesterday?
- What am I working on today?
- Any blockers?

End of Day:
- Did I complete my deliverables?
- Are tests passing?
- Any risks to timeline?

Gate Completions (EOD of gate days):
- Which tests now pass?
- Code review status?
- Ready for next phase?
```

---

## Success Metrics (Track Daily)

| Metric | Week 1 Goal | Week 2 Goal | Week 3 Goal |
|--------|------------|-----------|-----------|
| Test Count | 113+ | 150+ | 250+ |
| Coverage | >60% | >70% | >80% |
| Blocker Issues | 0 | 0 | 0 |
| Performance Warnings | 0 | <5 | 0 |
| TypeScript Errors | 0 | 0 | 0 |

---

## Troubleshooting Guide

**Symptom: TypeScript compilation error in types.ts**
- Check: Union type syntax `SnapshotManifestV1 | SnapshotManifestV2`
- Fix: Ensure both interfaces are exported separately

**Symptom: State.json not being written**
- Check: WriterLock implementation in SnapshotStore
- Fix: Ensure lock.withLock() properly releases lock on error

**Symptom: V1 manifest normalization failing**
- Check: normalizeToV2() handles missing fields
- Fix: Provide sensible defaults (origin: UNKNOWN, riskScore: 0)

**Symptom: Race condition in concurrent PRE tests**
- Check: Synchronous state reservation BEFORE await
- Fix: Move `this.recentPres.push(now)` before any async operation

**Symptom: Test timeout in Phase 5 concurrency tests**
- Check: 100+ concurrent operations might be too many
- Mitigation: Reduce to 50, verify logic, then scale up

---

**Document Status:** Complete week-by-week guide
**Last Updated:** 2025-12-14
**Next:** Start WEEK 1 - Day 1
