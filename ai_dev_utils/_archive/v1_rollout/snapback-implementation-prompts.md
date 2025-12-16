# SnapBack PRW Implementation Prompts

Reference: Gap Analysis Report (2025-12-13), Target Architecture Spec v1.0.0

---

## Phase 1: Schema Migration

### Prompt 1.1: Update Storage Types

```
Update apps/vscode/src/storage/types.ts to implement SnapshotManifest V2 schema.

**Reference files:**
- /mnt/user-data/outputs/snapback-prw-patch/01-types.ts (target schema)
- Current: apps/vscode/src/storage/types.ts

**Requirements:**

1. Add new types at top of file:
   ```typescript
   export type CheckpointType = 'POST' | 'PRE' | 'PRE_ROLLBACK';
   export type OriginLabel = 'INTERACTIVE' | 'AUTOMATED' | 'UNKNOWN';
   export type ReasonCode =
     | 'RISK_BURST_START' | 'RISK_LARGE_DELETE' | 'RISK_MULTI_FILE'
     | 'AI_DETECTED' | 'MANUAL_SAVE' | 'PRE_ROLLBACK' 
     | 'MANUAL_CHECKPOINT' | 'CRITICAL_FILE';
   ```

2. Rename in SnapshotFileRef:
   - `blob: string` → `blobHash: string`

3. Keep existing SnapshotManifest as SnapshotManifestV1 (for migration)

4. Add SnapshotManifestV2 interface with:
   - schemaVersion: 2
   - seq: number
   - parentSeq: number | null
   - parentId: string | null
   - type: CheckpointType
   - metadata.origin?: OriginLabel
   - metadata.reasons?: ReasonCode[]

5. Add type guards:
   - isV2Manifest(m): m is SnapshotManifestV2
   - isPointerCheckpoint(m): boolean
   - isPostCheckpoint(m): boolean

6. Export union type: `export type SnapshotManifest = SnapshotManifestV1 | SnapshotManifestV2`

**Validation:**
- TypeScript compiles with no errors
- Existing code using SnapshotManifest still works (union type)
- Run: pnpm typecheck
```

### Prompt 1.2: Add State Management

```
Create apps/vscode/src/storage/storeState.ts for state.json and index.json management.

**Reference:** /mnt/user-data/outputs/snapback-prw-patch/02-storeState.ts

**Requirements:**

1. Create StoreState interface:
   ```typescript
   interface StoreState {
     schemaVersion: 1;
     lastSeq: number;
     headId: string | null;
     lastUpdatedAt: number;
   }
   ```

2. Create SeqIndex interface:
   ```typescript
   interface SeqIndex {
     schemaVersion: 1;
     bySeq: Record<number, string>;
     byId: Record<string, number>;
     rebuiltAt: number;
   }
   ```

3. Add helper functions:
   - allocateSeq(state): { newState, seq }
   - updateHead(state, headId): StoreState
   - addToIndex(index, seq, id): void
   - getSeqById(index, id): number | undefined
   - getIdBySeq(index, seq): string | undefined
   - getMaxSeq(index): number

4. Add validation:
   - isValidState(obj): obj is StoreState
   - isValidIndex(obj): obj is SeqIndex

5. Export DEFAULT_STATE and DEFAULT_INDEX constants

**Validation:**
- Unit tests pass for all helper functions
- Run: pnpm test -- storeState
```

### Prompt 1.3: Update BlobStore References

```
Update apps/vscode/src/storage/BlobStore.ts to align field naming.

**Changes:**
1. Ensure store() returns { hash, size } (already correct per audit)
2. Update any JSDoc referencing 'blob' to use 'blobHash'
3. No functional changes needed - BlobStore is COMPLETE per audit

**Validation:**
- Existing tests pass
- TypeScript compiles
```

---

## Phase 2: PRE Checkpoint Support

### Prompt 2.1: Upgrade SnapshotStore

```
Upgrade apps/vscode/src/storage/SnapshotStore.ts to support V2 schema and PRE checkpoints.

**Reference:** /mnt/user-data/outputs/snapback-prw-patch/03-SnapshotStore.ts

**Requirements:**

1. Add imports:
   ```typescript
   import type { StoreState, SeqIndex } from './storeState';
   import { allocateSeq, updateHead, addToIndex, ... } from './storeState';
   ```

2. Add instance properties:
   ```typescript
   private state: StoreState;
   private index: SeqIndex;
   private readonly stateUri: vscode.Uri;
   private readonly indexUri: vscode.Uri;
   ```

3. Update initialize():
   - Load or create state.json
   - Load or create index.json
   - If corrupted/missing, call rebuildStateFromDisk()

4. Update create() method:
   - Allocate seq via allocateSeq()
   - Set parentSeq/parentId from current head
   - Write V2 manifest with type: 'POST'
   - Update state (head) and index
   - Persist state.json and index.json

5. Add createPreCheckpoint() method:
   - Allocate seq
   - Write manifest with type: 'PRE', files: {} (empty)
   - Update state and index
   - Return manifest

6. Add createPreRollbackCheckpoint(targetId) method:
   - Calls createPreCheckpoint with type: 'PRE_ROLLBACK'

7. Add getWithContent() resolution:
   - For POST: resolve directly from blobs
   - For PRE/PRE_ROLLBACK: walk parentId chain to find POST, resolve from there

8. Add rebuildStateFromDisk():
   - Scan snapshots/*.json
   - Sort by timestamp
   - Assign virtual seq to V1 manifests
   - Rebuild index
   - Determine head

9. Add normalizeToV2(manifest) helper:
   - Converts V1 manifest to V2 shape in-memory (for consistent interface)

**Validation:**
- Create POST checkpoint → state.json and index.json updated
- Create PRE checkpoint → files: {} in manifest
- getWithContent on PRE → resolves to POST ancestor's content
- Run: pnpm test -- SnapshotStore
```

### Prompt 2.2: Create PRW Manager

```
Create apps/vscode/src/protection/PRWManager.ts to coordinate PRE checkpoint creation.

**Reference:** /mnt/user-data/outputs/snapback-prw-patch/04-prwIntegration.ts

**Requirements:**

1. Create PRWConfig interface:
   ```typescript
   interface PRWConfig {
     riskThreshold: number;      // 0.6 default
     maxPrePerMinute: number;    // 10 default
     fileCooldownMs: number;     // 5000 default
   }
   ```

2. Create PRWManager class:
   ```typescript
   class PRWManager {
     private preCooldowns: Map<string, number>;
     private recentPres: number[];
     
     constructor(snapshotStore: SnapshotStore, config?: PRWConfig);
     
     async onRiskySignalDetected(signal: {
       filePath: string;
       riskScore: number;
       reasons: ReasonCode[];
       origin: OriginLabel;
     }): Promise<SnapshotManifestV2 | null>;
     
     async onBeforeRollback(targetId: string): Promise<SnapshotManifestV2>;
     
     private checkRateLimit(): boolean;
     cleanup(): void;
   }
   ```

3. Implement rate limiting:
   - Track timestamps of recent PREs
   - Clean entries older than 1 minute
   - Reject if count >= maxPrePerMinute

4. Implement file cooldowns:
   - Track per-file expiry timestamps
   - Skip PRE if file in cooldown

**Validation:**
- Rate limiting prevents >10 PREs/minute
- File cooldown prevents duplicate PREs within 5s
- Run: pnpm test -- PRWManager
```

### Prompt 2.3: Wire PRW to Decision Flow

```
Update apps/vscode/src/integration/AutoDecisionIntegration.ts to trigger PRE checkpoints.

**Current state:** Makes decisions but only creates POST checkpoints.

**Requirements:**

1. Add PRWManager dependency:
   ```typescript
   private prwManager?: PRWManager;
   
   setPRWManager(manager: PRWManager): void {
     this.prwManager = manager;
   }
   ```

2. In the decision flow (where shouldProtect is determined):
   ```typescript
   if (this.prwManager && decision.riskScore >= 0.6) {
     await this.prwManager.onRiskySignalDetected({
       filePath: document.uri.fsPath,
       riskScore: decision.riskScore / 100, // normalize to 0-1
       reasons: this.mapToReasonCodes(decision),
       origin: this.classifyOrigin(decision),
     });
   }
   ```

3. Add helper methods:
   - mapToReasonCodes(decision): ReasonCode[]
   - classifyOrigin(decision): OriginLabel

4. Update extension.ts to wire PRWManager:
   ```typescript
   const prwManager = new PRWManager(storageManager.snapshotStore);
   autoDecisionIntegration.setPRWManager(prwManager);
   ```

**Validation:**
- High-risk save creates PRE checkpoint before POST
- Console shows: "[PRW] Created PRE checkpoint pre-xxx for /path/file.ts"
- Timeline shows PRE checkpoint with empty files
```

---

## Phase 3: Rollback Layer

### Prompt 3.1: Create RollbackService

```
Create apps/vscode/src/rollback/RollbackService.ts for safe atomic rollbacks.

**Requirements:**

1. Create RollbackService class:
   ```typescript
   class RollbackService {
     constructor(
       private snapshotStore: SnapshotStore,
       private prwManager: PRWManager
     );
     
     async rollbackTo(checkpointId: string): Promise<RollbackResult>;
     async planRollback(checkpointId: string): Promise<RollbackPlan>;
     private async applyViaWorkspaceEdit(plan: RollbackPlan): Promise<boolean>;
   }
   ```

2. Create RollbackPlan interface:
   ```typescript
   interface RollbackPlan {
     targetCheckpointId: string;
     filesToRestore: Array<{ path: string; content: string }>;
     filesToDelete: string[];
     safetyScore: number;
     warnings: string[];
   }
   ```

3. Implement rollbackTo():
   ```typescript
   async rollbackTo(checkpointId: string): Promise<RollbackResult> {
     // 1. Create PRE_ROLLBACK checkpoint FIRST
     const preRollback = await this.prwManager.onBeforeRollback(checkpointId);
     
     // 2. Get target snapshot content
     const target = await this.snapshotStore.getWithContent(checkpointId);
     if (!target) throw new Error('Checkpoint not found');
     
     // 3. Build and apply WorkspaceEdit
     const edit = new vscode.WorkspaceEdit();
     for (const [filePath, content] of Object.entries(target.contents)) {
       const uri = vscode.Uri.file(filePath);
       edit.createFile(uri, { overwrite: true, contents: Buffer.from(content) });
     }
     
     // 4. Apply atomically (goes on undo stack)
     const success = await vscode.workspace.applyEdit(edit);
     
     return { success, preRollbackId: preRollback.id };
   }
   ```

4. Implement safety scoring in planRollback():
   - Check for unsaved buffers in scope
   - Count files affected
   - Time since checkpoint
   - Return warnings for high-risk rollbacks

**Validation:**
- Rollback creates PRE_ROLLBACK first
- Multi-file restore is atomic (all or nothing)
- User can Cmd+Z to undo the rollback
- Run: pnpm test -- RollbackService
```

### Prompt 3.2: Wire RollbackService to UI

```
Update apps/vscode/src/ui/SnapshotRestoreUI.ts to use RollbackService.

**Current:** Uses OperationCoordinator with direct file writes.
**Target:** Use RollbackService with WorkspaceEdit.

**Requirements:**

1. Replace OperationCoordinator dependency with RollbackService

2. Update restore flow:
   ```typescript
   async restoreSnapshot(snapshotId: string): Promise<void> {
     // Show confirmation with safety info
     const plan = await this.rollbackService.planRollback(snapshotId);
     
     if (plan.warnings.length > 0) {
       const proceed = await this.showWarnings(plan.warnings);
       if (!proceed) return;
     }
     
     // Execute rollback
     const result = await this.rollbackService.rollbackTo(snapshotId);
     
     if (result.success) {
       vscode.window.showInformationMessage(
         `Restored to checkpoint. Pre-rollback saved as ${result.preRollbackId}`
       );
     }
   }
   ```

3. Update extension.ts to create and wire RollbackService

**Validation:**
- Restore from timeline UI creates PRE_ROLLBACK
- Cmd+Z undoes the restore
- Warning shown for high-risk rollbacks
```

---

## Phase 4: Wiring & Integration Fixes

### Prompt 4.1: Wire AIRiskService

```
Fix apps/vscode/src/integration/AutoDecisionIntegration.ts to actually use RemoteAIRiskService.

**Current issue:** AIRiskService is imported but falls through to local estimation.

**Requirements:**

1. Locate getRiskScore() method

2. Fix the try/catch to properly await and use AIRiskService result:
   ```typescript
   private async getRiskScore(fileInfos: FileInfo[]): Promise<number> {
     if (this.aiRiskService && fileInfos.length > 0) {
       try {
         const result = await this.aiRiskService.assessChange(fileInfos);
         if (result && typeof result.riskScore === 'number') {
           return result.riskScore;
         }
       } catch (error) {
         console.warn('[AutoDecision] AIRiskService failed, using local:', error);
       }
     }
     return this.estimateRiskScoreLocally(fileInfos);
   }
   ```

3. Ensure RemoteAIRiskService is properly instantiated in extension.ts

**Validation:**
- Network request made to AI risk endpoint (check DevTools)
- Falls back to local on network error
- Log shows which method was used
```

### Prompt 4.2: Add OriginLabel Classification

```
Add origin classification to detect INTERACTIVE vs AUTOMATED changes.

**Requirements:**

1. In AutoDecisionIntegration, add classifyOrigin():
   ```typescript
   private classifyOrigin(context: DecisionContext): OriginLabel {
     // AI detection signals → AUTOMATED
     if (context.aiDetected) return 'AUTOMATED';
     
     // High velocity + multi-file → likely AUTOMATED
     if (context.velocity > 100 && context.multiFile) return 'AUTOMATED';
     
     // Paste of large content → could be either
     if (context.pasteDetected && context.pasteSize > 500) return 'UNKNOWN';
     
     // Normal typing patterns → INTERACTIVE
     return 'INTERACTIVE';
   }
   ```

2. Include origin in snapshot metadata:
   ```typescript
   metadata: {
     riskScore: decision.riskScore,
     origin: this.classifyOrigin(context),
     reasons: this.mapToReasonCodes(decision),
   }
   ```

**Validation:**
- Snapshots have origin field in metadata
- AI-assisted changes marked AUTOMATED
- Normal typing marked INTERACTIVE
```

### Prompt 4.3: Add Startup Corruption Recovery

```
Update apps/vscode/src/storage/StorageManager.ts to handle corruption on startup.

**Requirements:**

1. In initialize(), after loading stores:
   ```typescript
   async initialize(): Promise<void> {
     await ensureDirectory(this.storageUri);
     
     // Initialize sub-stores
     await this.blobStore.initialize();
     await this.snapshotStore.initialize(); // This now handles state/index
     await this.sessionStore.initialize();
     
     // Verify integrity
     const integrityOk = await this.verifyIntegrity();
     if (!integrityOk) {
       console.warn('[Storage] Corruption detected, rebuilding index...');
       await this.snapshotStore.rebuildStateFromDisk();
     }
   }
   ```

2. Add verifyIntegrity():
   ```typescript
   private async verifyIntegrity(): Promise<boolean> {
     try {
       const state = await this.snapshotStore.getState();
       const index = await this.snapshotStore.getIndex();
       
       // Check head exists if set
       if (state.headId && !index.byId[state.headId]) {
         return false;
       }
       
       // Check lastSeq matches index
       const maxSeq = Math.max(...Object.keys(index.bySeq).map(Number), 0);
       if (state.lastSeq < maxSeq) {
         return false;
       }
       
       return true;
     } catch {
       return false;
     }
   }
   ```

**Validation:**
- Delete state.json, restart extension → rebuilt automatically
- Corrupt index.json, restart → rebuilt automatically
- Log shows "[Storage] Corruption detected, rebuilding index..."
```

---

## Phase 5: Instrumentation & Testing

### Prompt 5.1: Add Performance Measurement

```
Add performance instrumentation to critical paths.

**Requirements:**

1. Create apps/vscode/src/utils/perf.ts:
   ```typescript
   export function measure<T>(name: string, fn: () => T): T {
     const start = performance.now();
     try {
       return fn();
     } finally {
       const duration = performance.now() - start;
       if (duration > BUDGETS[name]) {
         console.warn(`[Perf] ${name} exceeded budget: ${duration.toFixed(1)}ms > ${BUDGETS[name]}ms`);
       }
     }
   }
   
   export async function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
     const start = performance.now();
     try {
       return await fn();
     } finally {
       const duration = performance.now() - start;
       if (duration > BUDGETS[name]) {
         console.warn(`[Perf] ${name} exceeded budget: ${duration.toFixed(1)}ms > ${BUDGETS[name]}ms`);
       }
     }
   }
   
   const BUDGETS: Record<string, number> = {
     'detection': 10,
     'pre-checkpoint': 15,
     'post-checkpoint': 100,
     'save-intercept': 50,
     'rollback': 500,
   };
   ```

2. Wrap critical paths:
   - AutoDecisionEngine.makeDecision() → measure('detection', ...)
   - SnapshotStore.createPreCheckpoint() → measureAsync('pre-checkpoint', ...)
   - SnapshotStore.create() → measureAsync('post-checkpoint', ...)
   - RollbackService.rollbackTo() → measureAsync('rollback', ...)

**Validation:**
- Console warns when budget exceeded
- No warnings during normal operation
```

### Prompt 5.2: Add Missing Tests

```
Create tests for new PRW components.

**Files to create:**

1. apps/vscode/test/unit/storage/storeState.test.ts
   - Test allocateSeq increments correctly
   - Test updateHead updates headId
   - Test index operations (add, get, remove)
   - Test validation functions

2. apps/vscode/test/unit/storage/SnapshotStore.v2.test.ts
   - Test V2 manifest creation with all fields
   - Test PRE checkpoint has empty files
   - Test getWithContent resolves PRE to POST
   - Test rebuildStateFromDisk from V1 manifests
   - Test normalizeToV2 conversion

3. apps/vscode/test/unit/protection/PRWManager.test.ts
   - Test rate limiting (>10/min blocked)
   - Test file cooldowns (same file within 5s blocked)
   - Test risk threshold (below 0.6 skipped)
   - Test onBeforeRollback creates PRE_ROLLBACK

4. apps/vscode/test/unit/rollback/RollbackService.test.ts
   - Test PRE_ROLLBACK created before restore
   - Test WorkspaceEdit contains all files
   - Test safety scoring

**Reference:** /mnt/user-data/outputs/snapback-prw-patch/05-tests.ts

**Validation:**
- All tests pass: pnpm test
- Coverage > 80% for new code
```

---

## Execution Order

| Day | Phase | Prompts | Estimated Hours |
|-----|-------|---------|-----------------|
| 1 | Schema Migration | 1.1, 1.2, 1.3 | 3-4h |
| 2 | PRE Checkpoints | 2.1, 2.2, 2.3 | 4-5h |
| 3 | Rollback Layer | 3.1, 3.2 | 3-4h |
| 4 | Wiring Fixes | 4.1, 4.2, 4.3 | 2-3h |
| 5 | Instrumentation | 5.1, 5.2 | 2-3h |

**Total:** 14-19 hours

---

## Verification After Each Phase

### After Phase 1:
```bash
pnpm typecheck  # No errors
pnpm test -- types storeState  # Tests pass
```

### After Phase 2:
```bash
# Manual test in Extension Development Host:
# 1. Make a high-risk change (paste large code block)
# 2. Check console for "[PRW] Created PRE checkpoint"
# 3. Check globalStorage/snapshots/ for pre-*.json with files: {}
```

### After Phase 3:
```bash
# Manual test:
# 1. Create some snapshots
# 2. Restore to earlier one
# 3. Check pre-rollback checkpoint created
# 4. Press Cmd+Z - should undo the restore
```

### After Phase 4:
```bash
# Check DevTools Network tab for AI risk requests
# Check snapshot metadata has origin field
# Delete state.json, reload, verify rebuild
```

### After Phase 5:
```bash
pnpm test  # All pass
pnpm test:coverage  # >80% on new code
# No perf warnings in console during normal use
```
