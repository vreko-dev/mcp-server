# PRW Patch: Day 1-2 Implementation

## Overview

This patch implements **Preemptive Risk Windows (PRW)** - the core safety primitive for SnapBack that creates checkpoints BEFORE risky operations rather than after failures occur.

### Key Insight

> The failure mode is fast automation; the best recovery point is the state right before that automation.
> PRW turns automation bursts into transactions with a pre-image - the same trick databases use for crash recovery.

## Files in This Patch

| File | Purpose |
|------|---------|
| `01-types.ts` | V2 schema with `seq`, `parentSeq`, `parentId`, `type`, `schemaVersion` |
| `02-storeState.ts` | Persistent state (state.json) and seq index (index.json) |
| `03-SnapshotStore.ts` | Enhanced store with V2 support + PRE checkpoint creation |
| `04-prwIntegration.ts` | Integration hooks for burst detection, SaveHandler, rollback |
| `05-tests.ts` | Unit tests for type guards, state management, PRW logic |

---

## Day 1: Schema Upgrade

### Changes to `apps/vscode/src/storage/types.ts`

1. **New types:**
   - `CheckpointType`: `'POST' | 'PRE' | 'PRE_ROLLBACK'`
   - `ReasonCode`: Stable codes for explainability
   - `OriginLabel`: `'INTERACTIVE' | 'AUTOMATED' | 'UNKNOWN'`

2. **V2 Manifest:**
   ```typescript
   interface SnapshotManifestV2 {
     schemaVersion: 2;
     id: string;
     seq: number;           // Monotonic ordering
     parentSeq: number | null;
     parentId: string | null;
     type: CheckpointType;  // POST, PRE, PRE_ROLLBACK
     // ... rest unchanged
   }
   ```

3. **File reference renamed:**
   ```typescript
   interface SnapshotFileRef {
     blobHash: string;  // Renamed from 'blob' to match spec
     size: number;
   }
   ```

4. **Type guards:**
   - `isV2Manifest(m)` - Check if manifest is V2
   - `isPointerCheckpoint(m)` - Check if PRE/PRE_ROLLBACK
   - `isPostCheckpoint(m)` - Check if has blob data

### New files in storage root

```
globalStorage/marcellelabs.snapback-vscode/
├── snapshots/        # Existing
│   └── snap-*.json
├── blobs/            # Existing
├── sessions/         # Existing
├── state.json        # NEW: { lastSeq, headId, ... }
└── index.json        # NEW: { bySeq: {}, byId: {} }
```

---

## Day 2: PRE Pointer Checkpoints

### How PRE Checkpoints Work

**POST checkpoint** (normal):
- Writes blob data for each file
- `files: { '/src/index.ts': { blob: 'abc123', size: 100 } }`

**PRE checkpoint** (pointer):
- Writes NO blob data
- `files: {}` - empty!
- Points to parent via `parentSeq` / `parentId`
- Resolution walks back to nearest POST ancestor

### Creating PRE Checkpoints

```typescript
// In SnapshotStore
const pre = await snapshotStore.createPreCheckpoint({
  name: 'Pre: Burst detected on index.ts',
  trigger: 'risk-burst',
  reasons: ['RISK_BURST_START', 'AI_DETECTED'],
  origin: 'AUTOMATED',
});
```

### Resolving PRE Checkpoints

```typescript
// getWithContent() handles resolution automatically
const snapshot = await snapshotStore.getWithContent('pre-123-abc');
// → Walks back to find POST ancestor, resolves content from there
```

### Integration Points

1. **SignalAggregator**: When risk score ≥ 0.6, call `prwManager.onRiskySignalDetected()`
2. **SaveHandler**: Before high-risk saves, create PRE checkpoint
3. **Rollback flow**: Before applying rollback, call `prwManager.onBeforeRollback()`

---

## Migration Strategy (Option A)

**You chose Option A**: Don't rewrite V1 manifests

### What happens on first run after update:

1. State file doesn't exist → trigger `rebuildStateFromDisk()`
2. Scan all manifest files in snapshots/
3. Sort by timestamp
4. Assign virtual seq numbers based on order
5. Build index (bySeq, byId mappings)
6. Write state.json and index.json

### V1 manifests are NOT modified:
- They stay exactly as-is on disk
- When read, `normalizeToV2()` converts them in-memory
- Less risk, no data migration storm on upgrade

---

## How to Apply This Patch

### Step 1: Copy types
```bash
# Replace or merge with your existing types.ts
cp 01-types.ts apps/vscode/src/storage/types.ts
```

### Step 2: Add store state
```bash
cp 02-storeState.ts apps/vscode/src/storage/storeState.ts
```

### Step 3: Update SnapshotStore
```bash
# This is a significant change - review carefully
cp 03-SnapshotStore.ts apps/vscode/src/storage/SnapshotStore.ts
```

### Step 4: Add PRW integration
```bash
cp 04-prwIntegration.ts apps/vscode/src/protection/prwIntegration.ts
```

### Step 5: Wire up in extension.ts

```typescript
// apps/vscode/src/extension.ts

import { PRWManager } from './protection/prwIntegration';

export async function activate(context: vscode.ExtensionContext) {
  // ... existing initialization
  
  // Initialize PRW after storage
  const prwManager = new PRWManager(storageManager.snapshotStore);
  
  // Wire to SignalAggregator
  signalAggregator.setPRWManager(prwManager);
  
  // Wire to SaveHandler
  saveHandler.setPRWManager(prwManager);
}
```

### Step 6: Add tests
```bash
cp 05-tests.ts apps/vscode/test/unit/storage/SnapshotStore.prw.test.ts
pnpm test:unit
```

---

## Verification Checklist

- [ ] `state.json` created in globalStorage after first save
- [ ] `index.json` created with bidirectional mappings
- [ ] V1 manifests still readable (normalizeToV2 works)
- [ ] New snapshots have `schemaVersion: 2`, `seq`, `parentSeq`
- [ ] PRE checkpoints have `files: {}` (empty)
- [ ] `getWithContent()` on PRE checkpoint resolves to POST content
- [ ] Rate limiting prevents PRE spam
- [ ] File cooldowns prevent duplicate PREs
- [ ] `blobHash` field used (not `blob`) in file references

---

## Performance Impact

| Operation | Before | After | Notes |
|-----------|--------|-------|-------|
| POST creation | ~50ms | ~50ms | No change |
| PRE creation | N/A | ~5ms | Metadata only, no blob writes |
| Content resolution | ~10ms | ~15ms | May need to walk chain |
| State read | N/A | ~1ms | Small JSON file |
| Index read | N/A | ~1ms | Small JSON file |

**PRE checkpoints are nearly free** - just writing a ~200 byte manifest file.

---

## Next Steps (Days 3-7)

| Day | Task |
|-----|------|
| 3 | Convert SessionStore to lazy/async |
| 4 | Normalize Decision contract with ReasonCodes |
| 5 | Implement unified rollback primitive |
| 6 | Add rate limiting at store boundary |
| 7 | Flatten Timeline UI to use derived sessions |

---

## Questions?

If you hit issues during integration:
1. Check that `vscode.workspace.fs` is being used (not Node `fs`)
2. Verify `context.globalStorageUri` is passed correctly
3. Run tests to validate type guards and state management
