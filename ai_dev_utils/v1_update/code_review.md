# BRUTAL V1 CODE REVIEW - Zero Trust Verification

**Context:** An LLM coding agent claims V1 spec is "fully built." Your job is to verify this claim with ZERO trust. Assume everything is broken until proven otherwise. Find every loose connection, stub, placeholder, missing integration, and incomplete implementation.

**Your mindset:** You are a hostile auditor who gets paid for every bug found. The developer's bonus depends on passing your review. Be ruthless.

---

## PHASE 0: TRUST NOTHING - VERIFY BUILD STATE

Before reviewing ANY code, verify the project actually builds and runs:

```bash
# Run these commands and report EXACT output (not summaries):

# 1. Clean build from scratch
rm -rf node_modules/.cache
pnpm install --frozen-lockfile
pnpm build 2>&1 | tail -100

# 2. TypeScript strict check (not just tsc, the actual project config)
cd apps/vscode && pnpm typecheck 2>&1

# 3. Lint with zero tolerance
pnpm lint 2>&1 | grep -E "error|warning" | head -50

# 4. Test baseline (record exact numbers)
pnpm test 2>&1 | tail -50

# 5. Can the extension actually activate?
# Check for activation errors in package.json
cat apps/vscode/package.json | jq '.activationEvents, .main, .contributes.commands[:5]'
```

**Report:**
- [ ] Build exit code: ___
- [ ] TypeScript errors: ___
- [ ] Lint errors: ___
- [ ] Lint warnings: ___
- [ ] Test files failed: ___
- [ ] Test cases failed: ___
- [ ] Extension entry point exists: ___

**STOP HERE if build fails. Nothing else matters.**

---

## PHASE 1: V2 SCHEMA VERIFICATION

The V1 spec requires a V2 schema with PRE/POST/PRE_ROLLBACK checkpoints. Verify EVERY claim:

### 1.1 Types Verification

```bash
# Find the types file
find apps/vscode -name "types.ts" -path "*/storage/*" -exec cat {} \;
```

**Verify these EXACT types exist (not similar, EXACT):**

```typescript
// REQUIRED - CheckpointType enum
type CheckpointType = 'POST' | 'PRE' | 'PRE_ROLLBACK';

// REQUIRED - SnapshotManifestV2 interface
interface SnapshotManifestV2 {
  schemaVersion: 2;           // MUST be literal 2, not number
  id: string;
  seq: number;                // REQUIRED - monotonic sequence
  parentSeq: number | null;   // REQUIRED - parent link
  parentId: string | null;    // REQUIRED - parent link
  type: CheckpointType;       // REQUIRED - PRE/POST/PRE_ROLLBACK
  timestamp: number;
  trigger: string;
  name: string;
  files: Record<string, { blobHash: string; size: number }>;  // NOTE: blobHash not blob
  metadata: {
    origin: 'INTERACTIVE' | 'AUTOMATED' | 'UNKNOWN';
    riskScore: number;
    reasons: string[];        // ReasonCode array
  };
}

// REQUIRED - Type guards (must be functions, not just types)
function isV2Manifest(m: unknown): m is SnapshotManifestV2;
function isPointerCheckpoint(m: SnapshotManifest): boolean;
function isPostCheckpoint(m: SnapshotManifest): boolean;

// REQUIRED - Normalization function
function normalizeToV2(v1: SnapshotManifestV1): SnapshotManifestV2;
```

**Checklist:**
- [ ] CheckpointType exists with ALL THREE values
- [ ] SnapshotManifestV2 has `schemaVersion: 2` (literal)
- [ ] SnapshotManifestV2 has `seq` field
- [ ] SnapshotManifestV2 has `parentSeq` field
- [ ] SnapshotManifestV2 has `parentId` field
- [ ] SnapshotManifestV2 has `type` field
- [ ] Files use `blobHash` NOT `blob`
- [ ] `isV2Manifest` is a FUNCTION (not just a type)
- [ ] `isPointerCheckpoint` is a FUNCTION
- [ ] `isPostCheckpoint` is a FUNCTION
- [ ] `normalizeToV2` is a FUNCTION
- [ ] All functions are EXPORTED (check index.ts barrel)

### 1.2 State Management Verification

```bash
# Find storeState.ts
find apps/vscode -name "storeState.ts" -exec cat {} \;
```

**Verify these EXACT interfaces and functions:**

```typescript
// REQUIRED interfaces
interface StoreState {
  schemaVersion: 1;
  lastSeq: number;
  headId: string | null;
  headSeq: number | null;     // Some specs have this, some don't - verify
  lastUpdatedAt: number;
}

interface SeqIndex {
  schemaVersion: 1;
  bySeq: Record<number, string>;
  byId: Record<string, number>;
  rebuiltAt: number;
}

// REQUIRED functions - verify they EXIST and have CORRECT SIGNATURES
function allocateSeq(state: StoreState): { newState: StoreState; seq: number };
function updateHead(state: StoreState, headId: string, headSeq: number): StoreState;
function addToIndex(index: SeqIndex, seq: number, id: string): SeqIndex;
function isValidState(obj: unknown): obj is StoreState;
function isValidIndex(obj: unknown): obj is SeqIndex;
```

**Checklist:**
- [ ] StoreState interface exists
- [ ] SeqIndex interface exists
- [ ] allocateSeq function exists AND increments seq
- [ ] updateHead function exists
- [ ] addToIndex function exists AND updates BOTH bySeq and byId
- [ ] Validation functions exist
- [ ] DEFAULT_STATE exported
- [ ] DEFAULT_INDEX exported

### 1.3 WriterLock Verification

```bash
# Find writerLock
find apps/vscode -name "*writerLock*" -o -name "*WriterLock*" | xargs cat 2>/dev/null
```

**Verify:**
- [ ] WriterLock class exists
- [ ] `withLock<T>(fn: () => Promise<T>): Promise<T>` method exists
- [ ] Lock uses FIFO queue (not just boolean flag that drops requests)
- [ ] Lock releases on error (finally block or equivalent)
- [ ] `tryAcquire()` method exists (non-blocking)
- [ ] `isLocked()` method exists

**CRITICAL: Verify lock is ACTUALLY USED in SnapshotStore:**
```bash
grep -n "withLock\|this\.lock" apps/vscode/src/storage/SnapshotStore.ts
```

- [ ] `create()` uses lock
- [ ] `createPRE()` or equivalent uses lock
- [ ] `createPreRollbackCheckpoint()` uses lock

---

## PHASE 2: SNAPSHOT STORE DEEP DIVE

This is where most "smoke" hides. Verify every method actually works.

### 2.1 Method Existence Check

```bash
# Extract all public methods from SnapshotStore
grep -E "^\s*(async\s+)?(public\s+)?[a-zA-Z]+\s*\(" apps/vscode/src/storage/SnapshotStore.ts | head -50
```

**REQUIRED methods (verify each exists AND has correct signature):**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `initialize()` | `(): Promise<void>` | Load/create state.json and index.json |
| `create()` | `(files, options): Promise<SnapshotManifestV2>` | Create POST checkpoint |
| `createPRE()` or `createPreCheckpoint()` | `(...): Promise<SnapshotManifestV2>` | Create PRE pointer |
| `createPreRollbackCheckpoint()` | `(targetId: string): Promise<SnapshotManifestV2>` | Create PRE_ROLLBACK |
| `get()` | `(id: string): Promise<SnapshotManifest \| null>` | Get manifest by ID |
| `getWithContent()` or `getWithContentV2()` | `(id): Promise<{manifest, contents} \| null>` | Get with resolved content |
| `list()` | `(filters?): Promise<SnapshotManifest[]>` | List snapshots |
| `delete()` | `(id: string): Promise<boolean>` | Delete snapshot |
| `rebuildStateFromDisk()` | `(): Promise<void>` | Crash recovery |

**Checklist:**
- [ ] initialize() exists
- [ ] create() exists and returns V2 manifest
- [ ] createPRE/createPreCheckpoint() exists
- [ ] createPreRollbackCheckpoint() exists (NOT just createPRE with type param)
- [ ] get() exists
- [ ] getWithContent() or getWithContentV2() exists
- [ ] list() exists
- [ ] delete() exists
- [ ] rebuildStateFromDisk() exists

### 2.2 PRE Checkpoint Behavior Verification

**The PRE checkpoint MUST have empty files. Verify:**

```bash
# Find the createPRE implementation
grep -A 30 "createPRE\|createPreCheckpoint" apps/vscode/src/storage/SnapshotStore.ts
```

**Verify in the code:**
- [ ] PRE checkpoint sets `files: {}` (empty object)
- [ ] PRE checkpoint sets `type: 'PRE'`
- [ ] PRE checkpoint links to parent via `parentId` and `parentSeq`
- [ ] PRE checkpoint does NOT write any blobs (no blobStore.store() call)

### 2.3 Chain Resolution Verification

**This is the MOST LIKELY place for smoke. The getWithContent must walk the parent chain.**

```bash
# Find getWithContent implementation
grep -A 50 "getWithContent\|resolveContentAncestor" apps/vscode/src/storage/SnapshotStore.ts
```

**Verify the implementation:**
- [ ] If manifest is POST → load content directly from blobs
- [ ] If manifest is PRE/PRE_ROLLBACK → walk parentId chain
- [ ] Chain walking has MAX_DEPTH limit (prevent infinite loops)
- [ ] Throws SnapshotChainError (or equivalent) on broken chain
- [ ] Does NOT just return null on broken chain (must be explicit error)

**CRITICAL TEST - Can you trace this flow?**
```
1. User creates POST checkpoint (seq=1, id=A)
2. Burst detection creates PRE checkpoint (seq=2, id=B, parentId=A)
3. User calls getWithContent(B)
4. System should return content from A (not B, which has no content)
```

- [ ] This flow is implemented
- [ ] This flow has test coverage
- [ ] This flow actually works (verify with manual test or unit test)

### 2.4 State Persistence Verification

```bash
# Check if state/index are actually written
grep -n "state\.json\|index\.json\|persistState\|persistIndex" apps/vscode/src/storage/SnapshotStore.ts
```

**Verify:**
- [ ] `state.json` path is defined
- [ ] `index.json` path is defined
- [ ] `persistState()` or equivalent writes state.json
- [ ] `persistIndex()` or equivalent writes index.json
- [ ] Both are called after EVERY checkpoint creation
- [ ] Writes are atomic (temp file → rename pattern)

### 2.5 Crash Recovery Verification

```bash
# Find rebuild logic
grep -A 30 "rebuildStateFromDisk\|rebuildIndex" apps/vscode/src/storage/SnapshotStore.ts
```

**Verify:**
- [ ] Can rebuild state.json from existing manifests
- [ ] Can rebuild index.json from existing manifests
- [ ] Assigns virtual seq numbers based on timestamp order
- [ ] Called automatically if state.json is missing/corrupt
- [ ] Called automatically if index.json is missing/corrupt

---

## PHASE 3: PRW MANAGER VERIFICATION

### 3.1 Method Existence

```bash
grep -E "^\s*(async\s+)?(public\s+)?[a-zA-Z]+\s*\(" apps/vscode/src/protection/PRWManager.ts 2>/dev/null || \
grep -E "^\s*(async\s+)?(public\s+)?[a-zA-Z]+\s*\(" apps/vscode/src/protection/*.ts | head -30
```

**REQUIRED methods:**

| Method | Purpose |
|--------|---------|
| `onRiskySignalDetected()` | Create PRE when risk threshold exceeded |
| `onBeforeRollback()` | Create PRE_ROLLBACK before rollback |
| Rate limiting logic | Max 10 PREs/minute |
| File cooldown logic | 5s cooldown per file |

**Checklist:**
- [ ] onRiskySignalDetected() exists
- [ ] onBeforeRollback() exists
- [ ] Rate limiting implemented (not just TODO)
- [ ] File cooldown implemented (not just TODO)
- [ ] Calls SnapshotStore.createPRE() or equivalent
- [ ] Calls SnapshotStore.createPreRollbackCheckpoint()

### 3.2 Integration Verification

**PRWManager must be wired to the extension. Verify:**

```bash
# Check extension.ts for PRWManager initialization
grep -n "PRWManager\|prwManager" apps/vscode/src/extension.ts
```

- [ ] PRWManager is instantiated in activate()
- [ ] PRWManager is passed SnapshotStore reference
- [ ] PRWManager is wired to signal aggregator or equivalent
- [ ] PRWManager is disposed on deactivate

---

## PHASE 4: ROLLBACK SERVICE VERIFICATION

**This is a V1 requirement. Verify it exists and works.**

```bash
# Find RollbackService
find apps/vscode -name "*rollback*" -o -name "*Rollback*" | xargs ls -la 2>/dev/null
find apps/vscode -name "*RollbackService*" -exec cat {} \;
```

### 4.1 If RollbackService EXISTS:

**Verify methods:**
- [ ] `planRollback(checkpointId)` - returns RollbackPlan with safety warnings
- [ ] `rollbackTo(checkpointId)` - executes rollback
- [ ] Creates PRE_ROLLBACK checkpoint BEFORE restoring files
- [ ] Uses WorkspaceEdit for atomic file restoration
- [ ] Provides safety scoring (warns on high-risk rollbacks)

**Verify integration:**
- [ ] Wired to UI (SnapshotRestoreUI or equivalent)
- [ ] Called from restore command
- [ ] Shows confirmation before destructive action

### 4.2 If RollbackService DOES NOT EXIST:

**This is a CRITICAL V1 GAP. Report:**
- [ ] RollbackService is MISSING
- [ ] No restore functionality exists
- [ ] V1 claim is FALSE without this

---

## PHASE 5: TELEMETRY/ANALYTICS VERIFICATION

### 5.1 PostHog Integration

```bash
# Find PostHog usage
grep -rn "posthog\|PostHog\|capture\|track" apps/vscode/src/ --include="*.ts" | head -30
```

**Verify:**
- [ ] PostHog client initialized
- [ ] Events captured for: snapshot_created, snapshot_restored, ai_detected
- [ ] PII scrubbing in place (no file paths/content in events)
- [ ] Opt-out mechanism exists

### 5.2 Test Mock Status

```bash
# Check for analytics mock
find apps/vscode/test -name "*mock*" -exec grep -l "analytics\|posthog" {} \;
cat apps/vscode/test/setup.ts 2>/dev/null | head -50
```

**Verify:**
- [ ] Centralized analytics mock exists
- [ ] Mock covers: capture, identify, track, flush
- [ ] Mock is loaded in test setup
- [ ] No per-file mock duplication

---

## PHASE 6: UI/UX VERIFICATION

### 6.1 Tree View Provider

```bash
# Find tree provider
find apps/vscode -name "*TreeProvider*" -o -name "*treeProvider*" | xargs cat 2>/dev/null | head -100
```

**Verify:**
- [ ] TreeDataProvider implementation exists
- [ ] Filters out PRE/PRE_ROLLBACK from user view (only shows POST)
- [ ] Shows snapshot metadata (timestamp, name, file count)
- [ ] Refresh mechanism exists

### 6.2 Commands Registration

```bash
# Check package.json commands
cat apps/vscode/package.json | jq '.contributes.commands'
```

**REQUIRED commands for V1:**
- [ ] Create snapshot (manual)
- [ ] Restore snapshot
- [ ] Browse/list snapshots
- [ ] Delete snapshot

**Verify each command has handler:**
```bash
# Find command registrations
grep -rn "registerCommand" apps/vscode/src/ | head -20
```

---

## PHASE 7: INTEGRATION SMOKE TESTS

These are manual verification steps. Run each and report results.

### 7.1 Extension Activation Test

```bash
# In VS Code with extension loaded:
# 1. Open Developer Tools (Help > Toggle Developer Tools)
# 2. Check Console for errors
# 3. Run command: Developer: Show Running Extensions
# 4. Verify SnapBack is listed and active
```

- [ ] Extension activates without errors
- [ ] No console errors on startup
- [ ] Extension appears in running extensions list

### 7.2 Snapshot Creation Test

```
1. Open any file in VS Code
2. Make a change
3. Save the file
4. Check: Was a snapshot created?
5. Check: Does .snapback/snapshots/ contain new manifest?
6. Check: Does manifest have schemaVersion: 2?
7. Check: Does manifest have seq and parentSeq?
```

- [ ] Snapshot created on save
- [ ] Manifest is V2 format
- [ ] seq is assigned
- [ ] parentSeq links to previous

### 7.3 PRE Checkpoint Test

```
1. Enable burst detection (or simulate rapid saves)
2. Make multiple rapid changes
3. Check: Was a PRE checkpoint created?
4. Check: Does PRE have files: {} (empty)?
5. Check: Does PRE have type: 'PRE'?
6. Check: Does PRE have parentId pointing to last POST?
```

- [ ] PRE checkpoint created under burst conditions
- [ ] PRE has empty files
- [ ] PRE links to parent correctly

### 7.4 Chain Resolution Test

```
1. Have at least one POST and one PRE checkpoint
2. Call getWithContent() on the PRE checkpoint ID
3. Check: Does it return the POST's content?
4. Check: Does it NOT return empty content?
```

- [ ] Chain resolution works
- [ ] PRE resolves to parent POST content

### 7.5 Rollback Test

```
1. Create a snapshot of known content
2. Modify the file
3. Restore the snapshot
4. Check: Was PRE_ROLLBACK created first?
5. Check: Is file restored to original content?
6. Check: Can you Cmd+Z to undo the restore?
```

- [ ] PRE_ROLLBACK created before restore
- [ ] File content restored correctly
- [ ] Undo works (if using WorkspaceEdit)

---

## PHASE 8: TEST COVERAGE ANALYSIS

### 8.1 Coverage Report

```bash
cd apps/vscode
pnpm test -- --coverage 2>&1 | tail -100
```

**Report coverage for critical files:**
- [ ] storage/types.ts: ___%
- [ ] storage/storeState.ts: ___%
- [ ] storage/SnapshotStore.ts: ___%
- [ ] storage/writerLock.ts: ___%
- [ ] protection/PRWManager.ts: ___%

### 8.2 Test Quality Check

```bash
# Find placeholder tests
grep -rn "expect(true).toBe(true)\|it.skip\|test.skip\|TODO" apps/vscode/test/ --include="*.ts" | wc -l
```

- [ ] Placeholder test count: ___
- [ ] Skipped test count: ___

### 8.3 Critical Path Coverage

**These specific scenarios MUST have tests:**

| Scenario | Has Test? | Test Passes? |
|----------|-----------|--------------|
| V1 manifest normalized to V2 | | |
| PRE checkpoint has empty files | | |
| Chain resolution PRE → POST | | |
| Chain resolution PRE_ROLLBACK → POST | | |
| Broken chain throws error | | |
| Rate limiting blocks excess PREs | | |
| File cooldown prevents duplicate PREs | | |
| State rebuilt from disk on corruption | | |
| Concurrent checkpoint creation is safe | | |

---

## PHASE 9: DEPENDENCY & IMPORT VERIFICATION

### 9.1 Circular Dependencies

```bash
# Check for circular imports
npx madge --circular apps/vscode/src/
```

- [ ] Circular dependency count: ___
- [ ] Critical circular deps: ___

### 9.2 Missing Exports

```bash
# Check barrel exports
cat apps/vscode/src/storage/index.ts
```

**Verify exported:**
- [ ] SnapshotStore
- [ ] SnapshotManifestV2
- [ ] isV2Manifest
- [ ] isPointerCheckpoint
- [ ] WriterLock (if separate file)
- [ ] StoreState
- [ ] SeqIndex

### 9.3 Unused Exports

```bash
# Find potentially dead code
npx ts-prune apps/vscode/src/ 2>/dev/null | head -30
```

---

## PHASE 10: FINAL VERDICT

Based on ALL of the above, provide:

### Summary Table

| Component | Exists | Compiles | Integrated | Tested | Works |
|-----------|--------|----------|------------|--------|-------|
| V2 Schema | | | | | |
| State Management | | | | | |
| WriterLock | | | | | |
| SnapshotStore | | | | | |
| PRE Checkpoints | | | | | |
| PRE_ROLLBACK | | | | | |
| Chain Resolution | | | | | |
| PRWManager | | | | | |
| RollbackService | | | | | |
| UI Tree View | | | | | |
| Commands | | | | | |
| Telemetry | | | | | |

### Critical Gaps

List EVERY gap found, categorized:

**BLOCKERS (V1 cannot ship):**
1. ...

**HIGH (Should fix before demo):**
1. ...

**MEDIUM (Technical debt):**
1. ...

**LOW (Nice to have):**
1. ...

### Smoke Score

Rate the "smoke level" of the V1 claim:

- [ ] **0% Smoke** - Everything claimed is implemented, tested, and works
- [ ] **25% Smoke** - Most things work, minor gaps
- [ ] **50% Smoke** - Core functionality works, significant gaps
- [ ] **75% Smoke** - Partial implementation, major gaps
- [ ] **100% Smoke** - Mostly stubs/placeholders, nothing works

### Recommendation

Based on findings:
- [ ] **SHIP IT** - V1 is ready
- [ ] **FIX BLOCKERS** - 1-2 days of work needed
- [ ] **SIGNIFICANT WORK** - 1 week+ needed
- [ ] **START OVER** - Implementation doesn't match spec

---

## APPENDIX: KNOWN PATTERNS OF SMOKE

Watch for these red flags:

### Code Patterns
```typescript
// 🚨 Empty implementation
async createPRE(): Promise<SnapshotManifestV2> {
  // TODO: implement
  return {} as SnapshotManifestV2;
}

// 🚨 Always returns success
async delete(id: string): Promise<boolean> {
  return true; // Never actually deletes
}

// 🚨 Swallows errors
try {
  await riskyOperation();
} catch {
  // Silent failure
}

// 🚨 Type assertion hiding incompleteness
return manifest as SnapshotManifestV2; // Missing required fields

// 🚨 Placeholder that compiles but doesn't work
const seq = 0; // Should be allocated from state
```

### Test Patterns
```typescript
// 🚨 Tautology test
it('should work', () => {
  expect(true).toBe(true);
});

// 🚨 Mock that proves nothing
it('creates snapshot', async () => {
  vi.spyOn(store, 'create').mockResolvedValue(mockManifest);
  const result = await store.create(...);
  expect(result).toBe(mockManifest); // Just testing the mock
});

// 🚨 Skip without explanation
it.skip('handles edge case', () => { ... });
```

### Documentation Patterns
```typescript
// 🚨 Aspirational JSDoc
/**
 * Creates a PRE checkpoint with full chain resolution,
 * rate limiting, and atomic persistence.
 */
async createPRE() {
  // Actual implementation does none of that
}
```

---

**END OF REVIEW PROMPT**

Execute this review completely. Do not summarize or skip sections. Report EVERY finding, even if it seems minor. Your job is to find problems, not to reassure.
