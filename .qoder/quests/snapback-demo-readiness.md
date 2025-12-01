# SnapBack Demo Readiness Design

## Document Metadata

- **Created**: 2025-01-XX
- **Updated**: 2025-01-XX (Post-reassessment)
- **Target**: 60-second demo flows for marketing and YC presentations
- **Scope**: VS Code extension + SDK + CLI demo plumbing
- **Status**: Reassessed - 1/5 blockers resolved, 4/5 remain
- **Confidence**: High - Clear path forward with concrete next steps

### Implementation Progress Since Last Review

**✅ Completed (1/5)**:
- CI Guard Script (`scripts/ci/guard.sh`) - Comprehensive terminology enforcement

**❌ Remaining Blockers (4/5)**:
- Missing migration `001_snapshots.sql`
- Event naming drift (`SESSION_ENDED` vs `SESSION_FINALIZED`)
- Analytics sanitizer not created
- 50MB size limit not enforced in SnapshotManager
- Windows swap safety not implemented
- SystemOperationGuard not created
- Privacy guard script not created

---

## Executive Summary

This design establishes the complete implementation plan for bulletproof demo flows that showcase SnapBack's core value proposition: intelligent snapshot management with privacy-first session tracking. The focus is on ensuring flawless execution of 8 critical demo flows across macOS and Windows, with strict performance budgets and privacy guarantees.

**Key Design Principles:**
- Local-first operation with graceful cloud fallback
- No new runtime dependencies unless essential
- Performance budgets enforced via automated tests
- Privacy-by-default with zero PII in analytics
- Atomic, crash-safe file operations
- Cross-platform compatibility (macOS + Windows)

---

## Design Goals

### Primary Objectives

1. **Validate Existing Infrastructure** - Confirm all core contracts, migrations, and SDK components are present and functional
2. **Implement Missing UI Components** - Build VS Code session tree view, status bar indicators, and command handlers
3. **Enforce Snapshot Size Limits** - Hard 50MB cap with user-friendly error messaging
4. **Ensure Atomic Restore** - Crash-safe restore with Windows EXDEV fallback strategy
5. **Privacy-First Analytics** - Zero PII transmission with tier-based consent model
6. **Cross-Platform Testing** - Comprehensive test matrix covering macOS and Windows edge cases
7. **Demo Automation** - Scripts for repeatable, non-interactive demo execution

### Success Criteria

- All 8 demo flows execute without manual intervention
- Performance budgets: snapshot create <100ms p95, restore <500ms p95, session track <50ms p95
- Zero PII in analytics events for Free tier
- 50MB snapshot limit enforced with clear error messages
- Restore operations are atomic and crash-safe on both platforms
- CI guards pass for terminology, privacy, and performance

---

## Existing Infrastructure Analysis

### Phase 0: Verified Components

#### Contracts Layer (✅ Complete)

**Location**: `packages/contracts/src/`

**Snapshot Types** (`types/snapshot.ts`):
- `Snapshot` - Core snapshot structure with optional session linkage via `meta.sessionId`
- `FileState` - File state with content hash for deduplication
- `CreateSnapshotOptions` - Snapshot creation parameters with `description` and `protected` flags
- `SnapshotRestoreResult` - Restore outcome with success flag, restored files list, and errors
- `SnapshotStorage` - Storage interface abstraction

**Session Types** (`session.ts`):
- `SessionManifestV1` - Complete session manifest with schema version, triggers, and file changes
- `SessionChange` - Individual file change with CAS hash references (lazy-computed)
- `SessionSummary` - Minimal session data for list views
- `ChangeOp` - Operation types: created, modified, deleted, renamed
- `SessionTrigger` - Trigger sources: filewatch, pre-commit, manual, idle-finalize

**Privacy Design**:
- Paths are POSIX-normalized (cross-platform safe)
- Hashes computed lazily during finalization (<50ms tracking budget)
- `workspaceUri` stored locally only (never transmitted)
- `name` generated offline (never transmitted)

#### Database Schema (✅ Complete)

**Location**: `packages/sdk/migrations/002_sessions.sql`

**Tables**:
- `sessions` - Session metadata with bitmask-encoded triggers
- `session_changes` - Individual file changes with CAS references
- `session_snapshots` - Link table connecting sessions to snapshots
- `blobs` - Content-addressable storage with reference counting

**Features**:
- WAL mode for concurrency
- Foreign key constraints enabled
- Automatic blob reference counting via triggers
- Partial indexes for active session lookups
- Views for blob statistics and session summaries

**BLOCKER**: `001_snapshots.sql` migration missing - must create before E2E tests

**Required Schema**:
- `snapshots` table with id, timestamp, meta, content_hash
- `snapshot_files` table for file-to-snapshot mapping
- Indexes on content_hash for deduplication lookups
- Foreign keys to `blobs` table for CAS references

#### SDK Implementation (✅ Core Complete, ⚠️ Gaps Identified)

**SnapshotManager** (`packages/sdk/src/snapshot/SnapshotManager.ts`):
- ✅ Snapshot creation with deduplication
- ✅ Atomic restore with staging directory
- ✅ Conflict detection via dry-run mode
- ✅ Protected snapshot enforcement
- ⚠️ **Missing**: 50MB size cap enforcement
- ⚠️ **Missing**: Windows EXDEV fallback (copy-remove instead of rename)

**SessionManager** (`packages/sdk/src/session/SessionManager.ts`):
- ✅ Session lifecycle: start, track, finalize
- ✅ Lazy hash computation (deferred until finalize)
- ✅ Idle timeout (15 minutes default)
- ✅ Batch flushing (50 changes or 5 seconds)
- ✅ Crash recovery on initialization
- ✅ Offline name generation
- ✅ Privacy-safe analytics events
- ⚠️ **Missing**: Rollback implementation (delegates to SessionRollback)

**SessionRollback** (`packages/sdk/src/session/SessionRollback.ts`):
- ✅ Inverse operation generation
- ✅ Journal-based crash safety (`.sb_journal/pending`)
- ⚠️ **Not Verified**: Windows rename behavior, file permission restoration

#### VS Code Extension (⚠️ Partial Implementation)

**Commands** (`apps/vscode/package.json`):
- ✅ `snapback.createSnapshot` - Manual snapshot creation
- ✅ `snapback.snapBack` - Restore snapshot
- ✅ `snapback.protectFile` - File protection
- ⚠️ **Missing**: `snapback.session.finalize` - Finalize active session
- ⚠️ **Missing**: `snapback.session.rollback` - Rollback session changes
- ⚠️ **Missing**: `snapback.session.reveal` - Reveal session diff

**Views** (`apps/vscode/package.json`):
- ✅ `snapback.main` - Snapshots tree (activity bar)
- ✅ `snapback.protectedFiles` - Protected files tree (explorer)
- ⚠️ **Missing**: `snapback.sessions` - Sessions tree view with change nodes

**Event Handlers**:
- ✅ `onWillSaveTextDocument` - Pre-save hook (risk detection)
- ⚠️ **Missing**: Guardian threshold check for auto-snapshot (score > 7)

**Tree Providers**:
- ✅ `SessionsTreeProvider` exists but incomplete (uses placeholder array)
- ⚠️ **Missing**: Integration with SessionManager for real session data
- ⚠️ **Missing**: Session change nodes (file-level detail)
- ⚠️ **Missing**: Status bar indicator for active session

#### CLI (⚠️ Not Verified)

**Location**: `apps/cli/src/`

**Files**:
- `index.ts` - Main CLI entry point
- `check.ts` - Risk check command
- `prepush.ts` - Pre-push hook

**Missing Verification**:
- Snapshot create command
- Snapshot restore command
- Session commands
- 50MB size limit enforcement

#### Analytics (⚠️ Events Defined, Sanitization Missing)

**Events** (`packages/analytics/src/events.ts`):
- ✅ `SNAPSHOT_CREATED` - Snapshot creation event
- ✅ `SESSION_STARTED` - Session start event
- ⚠️ **BLOCKER**: Naming drift - both `SESSION_ENDED` and `SESSION_FINALIZED` exist
  - **Decision**: Standardize on `SESSION_FINALIZED` (matches SDK implementation)
  - **Action**: Remove `SESSION_ENDED`, update all references
  - **CI Guard**: Ban `SESSION_ENDED` in terminology script
- ⚠️ **BLOCKER**: PII sanitization layer missing - implement `packages/analytics/src/sanitizer.ts`
- ⚠️ **BLOCKER**: Log sanitization missing - scrub file paths from INFO/ERROR logs

**Privacy Requirements**:
- Free tier: Zero file paths, file names, or workspace IDs
- Solo tier: Histograms only, k-anonymity >= 3, consent-gated

---

## Design Specifications

### Flow 1: Manual Snapshot Creation

#### VS Code Implementation

**Command**: `snapback.createSnapshot`

**Flow**:
1. User invokes command (Command Palette, context menu, or Ctrl+Alt+S)
2. Quick input box prompts for description (optional)
3. SnapshotManager validates total size <= 50MB
4. If size exceeds limit → Show error: "Snapshot too large (limit 50MB). Select fewer files."
5. If valid → Create snapshot with deduplication
6. Show success toast: "Snapshot created: [description]"
7. Emit `SNAPSHOT_CREATED` event (sanitized)

**Error Handling**:
- Size over 50MB → Result.Err with user-friendly message
- Duplicate detected → Reuse existing snapshot ID
- File read error → Result.Err with specific file path
- Storage failure → Result.Err with retry suggestion

#### CLI Implementation

**Command**: `snapback snapshot create <files...> [--description <text>]`

**Flow**:
1. Parse file paths and options
2. Read file contents
3. Calculate total size
4. If size > 50MB → Exit with error code 1 and message
5. Call SnapshotManager.create()
6. Output snapshot ID to stdout
7. Exit with code 0

**Example**:
```
$ snapback snapshot create src/auth.ts src/config.ts --description "Pre-refactor"
snap-abc123
```

#### Performance Budget

- **Target**: <100ms p95 for snapshots with <10 files
- **Measurement**: Track time from command invocation to completion
- **Test**: Vitest unit test with 10 files totaling 5MB

#### Test Matrix

| Test Case | Expected Outcome |
|-----------|------------------|
| Single file (1KB) | Success, <50ms |
| 10 files (5MB) | Success, <100ms |
| 1 file (51MB) | Error: "Snapshot too large" |
| Duplicate content | Reuse existing snapshot |
| Missing file | Error with file path |

---

### Flow 2: Auto Snapshot on High-Risk Save

#### VS Code Implementation

**Trigger**: `workspace.onWillSaveTextDocument`

**Flow**:
1. Document save initiated
2. Read current file content
3. Calculate file size (raw bytes)
4. If size > 50MB → Skip snapshot, log warning (respects size cap)
5. Call Guardian policy engine → risk score (0-10)
6. If score <= 7 → Allow save (no snapshot)
7. If score > 7 AND size <= 50MB → Automatically create snapshot (non-blocking)
8. Show toast: "⚠️ High-risk change detected → Snapshot created"
9. Emit `SNAPSHOT_CREATED` event with `source: "auto"`, `trigger: "risk_threshold"`
10. Continue with save operation

**Guardian Integration**:
- Use existing `GuardianConfig` from `apps/vscode/src/config/runtime.ts`
- Read threshold from `snapback.guardian.thresholds.warn` (default: 6) and `.block` (default: 8)
- For demo, use threshold of 7 (between warn and block)

**Privacy**:
- Do NOT log file content or path in analytics
- Do NOT log file paths in INFO/ERROR logs (PII leak)
- Only emit: `{ source: "auto", trigger: "risk_threshold", changeCount: 1 }`
- Use file hash or sanitized identifier in logs: `logger.info('Snapshot created', { hash: sha256(filePath) })`

#### Performance Budget

- **Target**: <50ms for risk analysis (non-blocking)
- **Target**: <100ms for snapshot creation (async, doesn't block save)

#### Test Matrix

| Test Case | Risk Score | File Size | Expected Outcome |
|-----------|-----------|-----------|------------------|
| Safe edit (comment) | 2.0 | 1KB | Save allowed, no snapshot |
| Moderate change | 5.0 | 1MB | Save allowed, no snapshot |
| Risky change (auth code) | 8.5 | 5MB | Snapshot created, toast shown |
| Critical (secret added) | 9.0 | 10MB | Snapshot created, toast shown |
| High risk but huge file | 9.0 | 55MB | Save allowed, no snapshot, warning logged |

---

### Flow 3: Atomic Restore with Conflict Detection

#### SnapshotManager Enhancement

**Method**: `restore(id, targetPath, options)`

**Enhanced Flow**:
1. Retrieve snapshot from storage
2. If `options.dryRun === true` → Validate integrity and return file list
3. Create staging directory: `${targetPath}.staging`
4. Extract all files to staging directory
5. Validate all files extracted successfully
6. Create backup directory: `${targetPath}.backup`
7. Rename existing target to backup (atomic on POSIX)
8. **Windows EXDEV Handling**:
   - Try rename: `fs.rename(targetPath, backupDir)`
   - If error.code === 'EXDEV' (cross-device link):
     - Fallback: `fs.cp(targetPath, backupDir, { recursive: true })`
     - Then: `fs.rm(targetPath, { recursive: true })`
9. Rename staging to target (atomic swap)
10. Remove backup directory on success
11. On failure: Rollback by renaming backup to target

**Conflict Detection** (BLOCKER - Define base source):

**Three-Way Diff Requirements**:
- **Base**: Prior on-disk state captured at snapshot creation time
- **Ours**: Current working copy
- **Theirs**: Snapshot content

**Base Source Strategy**:
1. **Preferred**: Store `baseHash` per file in snapshot metadata (references CAS blob)
2. **Fallback**: If no base stored, degrade to two-way diff with clear UX: "Cannot detect conflicts (snapshot lacks base). Continue?"

**Enhanced Snapshot Schema**:
```typescript
interface SnapshotFile {
  path: string;
  contentHash: string;  // Current content ("theirs")
  baseHash?: string;    // Prior content at snapshot time ("base")
  size: number;
}
```

**Conflict Detection Logic**:
```typescript
async detectConflicts(snapshotId: string): Promise<ConflictReport> {
  const snapshot = await this.storage.get(snapshotId);
  const conflicts: Array<{ path: string; type: 'modified' | 'deleted' | 'created' }> = [];
  
  for (const file of snapshot.files) {
    const currentHash = await hashFile(file.path);
    
    if (!file.baseHash) {
      // No base - cannot detect conflicts, warn user
      continue;
    }
    
    // Three-way comparison
    const baseChanged = file.baseHash !== currentHash;
    const snapshotChanged = file.baseHash !== file.contentHash;
    
    if (baseChanged && snapshotChanged) {
      conflicts.push({ path: file.path, type: 'modified' });
    }
  }
  
  return { hasConflicts: conflicts.length > 0, conflicts };
}
```

**QuickPick UI**:
- Show list of files to restore
- Highlight conflicting files with ⚠️ icon
- Options: "Restore All", "Restore Non-Conflicting", "Cancel"
- On "Restore All": Overwrite conflicts with snapshot version

#### Performance Budget

- **Validation (dry-run)**: <500ms for 100 files
- **Restore**: <2s for 100 files (10MB total)

#### Test Matrix

| Test Case | Platform | Expected Outcome |
|-----------|----------|------------------|
| Clean restore | macOS | Atomic rename, success |
| Clean restore | Windows | Atomic rename, success |
| EXDEV error | Windows | Fallback to copy-remove, success |
| Conflict detected | Both | Show QuickPick, user chooses action |
| Crash during restore | Both | Rollback from backup |

---

### Flow 4: Session Layer Implementation

#### Session Start/Track/Finalize

**Already Implemented** (Verified):
- `SessionManager.start()` - Creates session, starts timers
- `SessionManager.track()` - Records file changes, lazy hashing
- `SessionManager.finalize()` - Computes hashes, persists to DB, generates offline name
- `SessionManager.current()` - Returns active session status

**Performance Validation**:
- `track()` must complete in <50ms (lazy hash deferral)
- `finalize()` must complete in <500ms (batch hash computation)

#### Path & EOL Normalization (BLOCKER)

**Storage Standard**:
- **Paths**: Always POSIX-style (`src/auth/login.ts`) in database
- **EOL**: Store detected EOL type per file; restore original
- **Mode**: Store Unix mode bits; ignore on Windows

**Normalization Functions**:
```typescript
// Convert to POSIX for storage
function toPosixPath(absolutePath: string, workspaceRoot: string): string {
  const relPath = path.relative(workspaceRoot, absolutePath);
  return relPath.split(path.sep).join('/');
}

// Convert from POSIX for file operations
function fromPosixPath(posixPath: string, workspaceRoot: string): string {
  const nativePath = posixPath.split('/').join(path.sep);
  return path.join(workspaceRoot, nativePath);
}

// Detect EOL
function detectEOL(content: string): 'lf' | 'crlf' {
  const crlf = content.match(/\r\n/g)?.length ?? 0;
  const lf = content.match(/(?<!\r)\n/g)?.length ?? 0;
  return crlf > lf ? 'crlf' : 'lf';
}

// Restore EOL
function restoreEOL(content: string, eol: 'lf' | 'crlf'): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return eol === 'crlf' ? normalized.replace(/\n/g, '\r\n') : normalized;
}
```

**Enhanced SessionChange**:
```typescript
interface SessionChange {
  p: string;           // POSIX path
  op: ChangeOp;
  eolBefore?: 'lf' | 'crlf';
  eolAfter?: 'lf' | 'crlf';
  modeBefore?: number; // Unix mode (ignored on Windows)
  modeAfter?: number;
}
```

**Test Coverage**:
- CRLF file → store as POSIX with eol='crlf' → restore with CRLF
- LF file → store as POSIX with eol='lf' → restore with LF
- Mixed EOL → use majority; log warning
- Mode bits → restore on Unix; ignore on Windows

#### Idle Timeout (15 minutes)

**Design**:
- Idle timer starts on session creation
- Each `track()` call resets the timer
- On timeout: Add "idle-finalize" trigger, call `finalize()`

**Test**:
- Mock timer using `vi.useFakeTimers()`
- Simulate 15 minutes of inactivity
- Verify session auto-finalizes with "idle-finalize" trigger

**Sleep/Wake Handling** (BLOCKER - Add test):
```typescript
// Persist buffer before idle finalize
async autoFinalize(): Promise<void> {
  if (!this.activeSession) {
    return;
  }
  
  // Flush buffer to ensure no data loss
  if (this.activeSession.changeBuffer.length > 0) {
    await this.flushBuffer();
  }
  
  // Add idle-finalize trigger
  this.activeSession.triggers.add('idle-finalize');
  
  // Finalize session
  await this.finalize();
}
```

**Test**: Sleep/wake doesn't drop buffered changes
1. Start session, track 5 changes
2. Simulate sleep (14 min 59 sec)
3. Verify buffer persisted before finalize
4. Wake → verify all 5 changes in finalized session

#### Session Rollback

**Implementation** (Existing):
- `SessionRollback.rollback(manifest, options)`
- Reads session manifest
- Generates inverse operations (in reverse chronological order)
- Writes journal to `.sb_journal/pending/<sessionId>.json`
- Executes inverse operations
- Removes journal on success

**BLOCKER - Windows-Specific Enhancements Required**:

**1. EXDEV Handling with Retry + Backoff**:
```typescript
async function atomicSwap(staging: string, target: string, backup: string) {
  const maxRetries = 3;
  const baseDelay = 100; // ms
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Try atomic rename first
      await fs.rename(staging, target);
      return; // Success
    } catch (error) {
      if (error.code === 'EXDEV') {
        // Cross-device - fallback to copy + remove
        await fs.cp(staging, target, { recursive: true, force: true });
        await fs.rm(staging, { recursive: true, force: true });
        return;
      }
      
      if (error.code === 'EBUSY' || error.code === 'EPERM') {
        // File locked or permission denied - retry with backoff
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      throw error; // Other errors - fail fast
    }
  }
}
```

**2. Clear Read-Only Attributes (Windows)**:
```typescript
async function clearReadOnly(targetPath: string) {
  if (process.platform === 'win32') {
    // Remove read-only attribute before rename/delete
    const { execFile } = await import('child_process');
    await execFile('attrib', ['-R', `${targetPath}\\*.*`, '/S']);
  }
}
```

**3. Pause File Watchers During Mutations**:
```typescript
class SystemOperationGuard {
  private inSystemOp = false;
  
  async withGuard<T>(operation: () => Promise<T>): Promise<T> {
    this.inSystemOp = true;
    try {
      return await operation();
    } finally {
      this.inSystemOp = false;
    }
  }
  
  shouldIgnore(): boolean {
    return this.inSystemOp;
  }
}

// In SessionManager.track():
if (this.systemGuard.shouldIgnore()) {
  return; // Skip tracking during restore/rollback
}
```

**Result Type**:
```typescript
type RollbackResult = Result<
  { filesRestored: string[] },
  { message: string; failedOps: string[] }
>;
```

#### VS Code UI Components

**SessionsTreeProvider** (Existing):
- Already listens to `SessionCoordinator.onSessionFinalized`
- Currently uses placeholder array

**Enhancement**:
1. Replace placeholder with `SessionManager.list()`
2. Load sessions from database on activation
3. Implement `getChildren()` for session nodes:
   - Root level: Session items
   - Child level: SessionChange items (file paths, operations)
4. Context menu actions:
   - "Finalize Session" → Call `SessionManager.finalize()`
   - "Rollback Session" → Call `SessionManager.rollback()`
   - "Reveal Diff" → Open diff view for file change

**Status Bar Indicator**:
- Show when session active: "● Session: N changes"
- Click → Open Sessions tree view
- Update on each `track()` call

**Commands**:
- `snapback.session.finalize` → Finalize active session
- `snapback.session.rollback` → Rollback selected session
- `snapback.session.reveal` → Reveal diff for selected change

---

### Flow 5: Privacy Defaults & Cloud Fallback

#### Settings Configuration

**Default Settings** (`apps/vscode/package.json`):
```
"snapback.privacy.mode": {
  "type": "string",
  "enum": ["local-only", "cloud-backup"],
  "default": "local-only",
  "description": "Privacy mode: local-only (Free) or cloud-backup (Solo)"
}

"snapback.privacy.cloudConsent": {
  "type": "boolean",
  "default": false,
  "description": "Consent to cloud backup and analytics (Solo tier only)"
}
```

**Behavior**:
- Free tier: Always `local-only`, no cloud operations
- Solo tier: Defaults to `local-only`, user must opt-in to `cloud-backup`

#### Cloud Operation Design

**Strategy**:
- Check for AWS credentials (environment variables)
- If missing → Cloud codepaths NOOP with info toast
- If present → Attempt cloud operation
- On failure → Log error, continue with local operation
- Never fail local path due to cloud error

**Example** (Snapshot Create):
```typescript
async create(files, options) {
  // Always create local snapshot
  const snapshot = await this.storage.save(files);
  
  // Attempt cloud backup if enabled
  if (this.config.privacyMode === 'cloud-backup' && this.config.cloudConsent) {
    try {
      await this.cloudStorage.upload(snapshot);
    } catch (error) {
      logger.info('Cloud backup unavailable, continuing with local-only');
      // Don't fail the operation
    }
  }
  
  return snapshot;
}
```

#### Analytics Sanitization

**Free Tier Events** (Zero PII):
```typescript
{
  event: 'SNAPSHOT_CREATED',
  source: 'auto' | 'manual',
  changeCount: 1,
  trigger: 'risk_threshold' | 'manual',
  // NO: filePath, fileName, workspaceId, content
## Demo Harness & Scripts

### Demo Determinism (HIGH-IMPACT)

**Problem**: Non-deterministic IDs and timestamps make demo recordings inconsistent

**Solution**: Add `--deterministic` mode for demos

**Implementation** (`packages/sdk/src/config.ts`):
```typescript
export interface SDKConfig {
  deterministicMode?: boolean;
  deterministicSeed?: string;
}

let demoCounter = 0;
const DEMO_EPOCH = 1704067200000; // 2024-01-01T00:00:00Z

// Deterministic ID generator
function generateId(config: SDKConfig): string {
  if (config.deterministicMode) {
    // Use seeded counter for stable IDs
    const seed = config.deterministicSeed || 'demo';
    return `snap-${seed}-${String(demoCounter++).padStart(4, '0')}`;
  }
  return createId();
}

// Deterministic timestamp
function now(config: SDKConfig): number {
  if (config.deterministicMode) {
    // Increment from fixed epoch (1 second per operation)
    return DEMO_EPOCH + (demoCounter * 1000);
  }
  return Date.now();
}
```

**CLI Flag**:
```bash
snapback --deterministic snapshot create src/auth.ts
# Produces: snap-demo-0001 with timestamp 2024-01-01T00:00:00Z

snapback --deterministic snapshot create src/config.ts
# Produces: snap-demo-0002 with timestamp 2024-01-01T00:00:01Z
```

**VS Code Setting** (`apps/vscode/package.json`):
```json
{
  "snapback.demo.deterministicMode": {
    "type": "boolean",
    "default": false,
    "description": "Enable deterministic IDs and timestamps for demo recording"
  }
}
```

**Environment Variable** (alternative):
```bash
export SNAPBACK_DETERMINISTIC=true
export SNAPBACK_DEMO_SEED=website-demo
code examples/demo-workspace
```

---

### Demo Workspace

**Location**: `examples/demo-workspace/`
  event: 'SESSION_FINALIZED',
  changeCount: 5,
  durationMs: 45000,
  triggers: ['filewatch', 'manual'],
  // NO: filePaths, workspaceUri
}
```

**Solo Tier Events** (Consent + k-anonymity):
- Histograms only (aggregated over k >= 3 users)
- File stems only (no full paths): "auth", "config", "test"
- Requires explicit consent via settings

**CI Guard**:
- Scan analytics client code for PII patterns
- Fail build if: `workspaceId`, `filePath`, `fileName` found in Free tier events
- Script: `scripts/ci/guard-privacy.sh`

---

### Flow 6: Snapshot Size Cap (50MB)

#### Implementation

**Size Measurement Standard** (BLOCKER - Must align across all surfaces):
- **Authoritative**: Raw bytes pre-compression via `Buffer.byteLength(content, 'utf-8')`
- **NOT**: String length, compressed size, or character count
- **Scope**: Per-snapshot limit (not cumulative)
- **Surfaces**: SDK, VS Code, CLI, API (all must use identical logic)

**SnapshotManager Enhancement** (`packages/sdk/src/snapshot/SnapshotManager.ts`):

**Method**: `create(files, options)`

**Logic**:
```typescript
async create(files, options) {
  // Calculate total size (raw bytes pre-compression)
  let totalSize = 0;
  const fileSizes: Array<{ path: string; size: number }> = [];
  
  for (const file of files) {
    const size = Buffer.byteLength(file.content, 'utf-8');
    totalSize += size;
    fileSizes.push({ path: file.path, size });
  }
  
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB (raw bytes)
  
  if (totalSize > MAX_SIZE) {
    // Sort by size descending for breakdown
    const topFiles = fileSizes
      .sort((a, b) => b.size - a.size)
      .slice(0, 5)
      .map(f => `${path.basename(f.path)} (${formatBytes(f.size)})`)
      .join(', ');
    
    return Err({
      code: 'SNAPSHOT_TOO_LARGE',
      message: `Snapshot too large (${formatBytes(totalSize)}). Limit: 50MB.`,
      totalSize,
      maxSize: MAX_SIZE,
      breakdown: topFiles  // For UI display
    });
  }
  
  // Continue with snapshot creation...
}
```

#### Error Handling

**VS Code** (identical error handling):
```typescript
const result = await snapshotManager.create(files, options);

if (isErr(result)) {
  if (result.error.code === 'SNAPSHOT_TOO_LARGE') {
    const message = `Snapshot too large (${formatBytes(result.error.totalSize)}). Limit: 50MB.

Largest files: ${result.error.breakdown}

Select fewer files or reduce file sizes.`;
    vscode.window.showErrorMessage(message);
  }
  return;
}
```

**CLI** (identical error handling):
```typescript
const result = await snapshotManager.create(files, options);

if (isErr(result)) {
  if (result.error.code === 'SNAPSHOT_TOO_LARGE') {
    console.error(`Error: Snapshot too large (${formatBytes(result.error.totalSize)}). Limit: 50MB.`);
    console.error(`\nLargest files: ${result.error.breakdown}`);
    console.error(`\nSelect fewer files or reduce file sizes.`);
  } else {
    console.error(`Error: ${result.error.message}`);
  }
  process.exit(1);
}
```

#### Test Matrix

| Test Case | Total Size | Expected Outcome |
|-----------|-----------|------------------|
| 1 file (1MB) | 1MB | Success |
| 10 files (5MB each) | 50MB | Success (at limit) |
| 1 file (51MB) | 51MB | Error: "Snapshot too large" |
| 100 files (0.6MB each) | 60MB | Error: "Snapshot too large" |

---

### Flow 7: Analytics Events

#### Event Schema

**SNAPSHOT_CREATED** (Free Tier):
```typescript
{
  event: 'snapshot_created',
  timestamp: 1705420800000,
  tier: 'free',
  properties: {
    source: 'auto' | 'manual',
    changeCount: number,
    trigger?: 'risk_threshold' | 'manual' | 'pre-commit'
  }
}
```

**SESSION_STARTED** (Free Tier):
```typescript
{
  event: 'session_started',
  timestamp: 1705420800000,
  tier: 'free',
  properties: {
    // No additional properties
  }
}
```

**SESSION_FINALIZED** (Free Tier):
```typescript
{
  event: 'session_finalized',
  timestamp: 1705420800000,
  tier: 'free',
  properties: {
    changeCount: number,
    durationMs: number,
    triggers: ('filewatch' | 'pre-commit' | 'manual' | 'idle-finalize')[]
  }
}
```

**SESSION_FINALIZED** (Solo Tier with Consent):
```typescript
{
  event: 'session_finalized',
  timestamp: 1705420800000,
  tier: 'solo',
  consent: true,
  properties: {
    changeCount: number,
    durationMs: number,
    triggers: ('filewatch' | 'pre-commit' | 'manual' | 'idle-finalize')[],
    fileStems: string[], // e.g., ['auth', 'config', 'test']
    opHistogram: { created: 2, modified: 5, deleted: 1 }
  }
}
```

#### Sanitization Layer

**File**: `packages/analytics/src/sanitizer.ts` (BLOCKER - Create this file)

**Functions**:
```typescript
import crypto from 'node:crypto';

// Remove PII from object
export function sanitizeEvent(
  event: AnalyticsEvent,
  tier: 'free' | 'solo',
  consent: boolean
): SafeEvent {
  const safe: SafeEvent = {
    event: event.event,
    timestamp: event.timestamp,
    tier,
  };
  
  if (tier === 'free') {
    // Zero PII for Free tier
    safe.properties = sanitizeFree(event.properties);
  } else if (tier === 'solo' && consent) {
    // Limited data for Solo with consent
    safe.properties = sanitizeSolo(event.properties);
  } else {
    // No consent → same as Free
    safe.properties = sanitizeFree(event.properties);
  }
  
  return safe;
}

// Free tier: strip all PII
function sanitizeFree(props: any): any {
  const { source, trigger, changeCount, durationMs, triggers } = props;
  return { source, trigger, changeCount, durationMs, triggers };
}

// Solo tier with consent: allow stems + histograms
function sanitizeSolo(props: any): any {
  const base = sanitizeFree(props);
  
  if (props.filePaths) {
    base.fileStems = extractFileStems(props.filePaths);
  }
  
  if (props.operations) {
    base.opHistogram = createHistogram(props.operations);
  }
  
  return base;
}

// Validate event has no PII (returns error array)
export function validateNoPII(event: AnalyticsEvent): Result<void, string[]> {
  const piiPatterns = [
    /workspaceId/i,
    /workspace.?uri/i,
    /file.?path/i,
    /file.?name/i,
    /content/i,
    /token/i,
  ];
  
  const violations: string[] = [];
  const json = JSON.stringify(event);
  
  for (const pattern of piiPatterns) {
    if (pattern.test(json)) {
      violations.push(`PII pattern detected: ${pattern}`);
    }
  }
  
  return violations.length > 0 ? Err(violations) : Ok(undefined);
}

// Extract file stems (Solo tier only)
export function extractFileStems(paths: string[]): string[] {
  return paths
    .map(p => path.basename(p, path.extname(p)))
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    .slice(0, 10); // limit
}

// Hash file path for logging (no PII)
export function hashFilePath(filePath: string): string {
  return crypto.createHash('sha256').update(filePath).digest('hex').slice(0, 8);
}
```

**CI Guard Script** (`scripts/ci/guard-privacy.sh`) (BLOCKER - Create this file):
```bash
#!/bin/bash
set -e

echo "[CI Guard] Checking for PII in analytics events..."

# Scan analytics client for PII patterns in Free tier events
FOUND=$(grep -rn "workspaceId\|filePath\|fileName" packages/analytics/src/client.ts || true)

if [ -n "$FOUND" ]; then
  echo "❌ PII detected in analytics client:"
  echo "$FOUND"
  exit 1
fi

# Verify sanitizer is wired
if ! grep -q "sanitizeEvent" packages/analytics/src/client.ts; then
  echo "❌ Sanitizer not wired in analytics client"
  exit 1
fi

echo "✅ Privacy guards passed"
```

**Log Sanitization** (BLOCKER - Update logger usage):
```typescript
// ❌ BAD - Leaks file path
logger.info('Snapshot created', { filePath });

// ✅ GOOD - Use hash
import { hashFilePath } from '@snapback/analytics';
logger.info('Snapshot created', { fileHash: hashFilePath(filePath) });
```

---

### Flow 8: VS Code UI Components

#### Sessions Tree View

**View ID**: `snapback.sessions`

**Registration** (`apps/vscode/package.json`):
```json
{
  "views": {
    "snapback": [
      {
        "id": "snapback.sessions",
        "name": "Sessions",
        "when": "snapback.isActive"
      }
    ]
  }
}
```

**Tree Structure**:
```
Sessions
├─ ● Active Session (5 changes)
│  ├─ src/auth/login.ts (modified)
│  ├─ src/config/env.ts (created)
│  └─ tests/auth.test.ts (modified)
├─ Session: Updated auth, config (10 changes) - 2h ago
│  ├─ src/auth/login.ts (modified)
│  ├─ src/auth/register.ts (modified)
│  └─ ...
└─ Session: Refactored tests (3 changes) - 1d ago
```

**Context Menu**:
- Active session: "Finalize Session"
- Finalized session: "Rollback Session", "View Details"
- Session change: "Reveal Diff", "Restore This File"

#### Status Bar Indicator

**Text**: "● Session: 5 changes"

**Behavior**:
- Show when session active
- Update on each `track()` call
- Click → Open Sessions tree view
- Right-click → "Finalize Session"

**Implementation**:
```typescript
class SessionStatusBar {
  private item: vscode.StatusBarItem;
  
  constructor(private sessionManager: SessionManager) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.item.command = 'workbench.view.extension.snapback';
  }
  
  update(): void {
    const { sessionId, changeCount } = this.sessionManager.current();
    
    if (sessionId) {
      this.item.text = `● Session: ${changeCount} changes`;
      this.item.show();
    } else {
      this.item.hide();
    }
  }
}
```

#### Command Palette Restore

**Command**: `snapback.snapBack`

**Flow**:
1. Show QuickPick with recent snapshots
2. Format: "[timestamp] description (N files)"
3. User selects snapshot
4. Call `SnapshotManager.restore(id, workspaceRoot, { dryRun: true })`
5. Show conflict summary if any
6. Confirm: "Restore N files? (M conflicts will be overwritten)"
7. Execute restore with progress indicator
8. Show completion toast with file count

---

## Pre-Flight Blockers (Must Fix Before Implementation)

### 1. Missing Migration (`001_snapshots.sql`)

**Status**: ❌ BLOCKER

**Required Schema**:
```sql
-- Migration 001: Snapshots and Blob Storage
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
PRAGMA synchronous=NORMAL;

-- Snapshots table
CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  meta TEXT,                       -- JSON metadata (name, protected, etc.)
  content_hash TEXT,               -- SHA-256 hash for deduplication
  total_size INTEGER NOT NULL,     -- Raw bytes pre-compression
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_content_hash ON snapshots(content_hash);

-- Snapshot files (many-to-many)
CREATE TABLE IF NOT EXISTS snapshot_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,         -- POSIX-style relative path
  content_hash TEXT NOT NULL,      -- SHA-256 CAS reference
  base_hash TEXT,                  -- Prior content hash (for 3-way diff)
  size INTEGER NOT NULL,           -- Raw bytes
  eol TEXT,                        -- 'lf' | 'crlf'
  mode INTEGER                     -- Unix mode bits
);

CREATE INDEX IF NOT EXISTS idx_snapshot_files_snapshot ON snapshot_files(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_files_hash ON snapshot_files(content_hash);
```

**Action**: Create this migration file and test with empty database.

---

### 2. Event Naming Drift

**Status**: ❌ BLOCKER

**Problem**: Both `SESSION_ENDED` and `SESSION_FINALIZED` exist in codebase.

**Decision**: Standardize on `SESSION_FINALIZED` (matches SDK implementation).

**Actions**:
1. **Remove** `SESSION_ENDED` from `packages/analytics/src/events.ts`
2. **Update** all references in:
   - `packages/sdk/src/session/sessionAnalytics.ts`
   - `apps/vscode/src/telemetry.ts`
   - Any test files
3. **Add CI Guard**: Ban `SESSION_ENDED` in terminology script

**Script**: Add to `scripts/ci/guard-terminology.sh`:
```bash
if grep -rn "SESSION_ENDED" packages/ apps/ --exclude="*.md"; then
  echo "❌ Banned term SESSION_ENDED found (use SESSION_FINALIZED)"
  exit 1
fi
```

---

### 3. Size Limit Alignment

**Status**: ❌ BLOCKER

**Requirement**: Identical 50MB enforcement across all surfaces.

**Standard**: Raw bytes pre-compression via `Buffer.byteLength(content, 'utf-8')`

**Implementation Checklist**:
- [x] SDK: `packages/sdk/src/snapshot/SnapshotManager.ts` (already specified in design)
- [ ] VS Code: `apps/vscode/src/commands/snapshotCommands.ts`
- [ ] CLI: `apps/cli/src/commands/snapshot.ts`
- [ ] API: `apps/api/modules/snapshots/procedures/create.ts` (if applicable)

**Test**: Cross-surface consistency test
```typescript
const testFile = { path: 'large.txt', content: 'x'.repeat(50 * 1024 * 1024 + 1) };

// All must return identical error
const sdkResult = await sdk.createSnapshot([testFile]);
const cliResult = await cli.exec(['snapshot', 'create', testFile.path]);
const vscodeResult = await vscode.commands.executeCommand('snapback.createSnapshot');

expect(sdkResult.error.code).toBe('SNAPSHOT_TOO_LARGE');
expect(cliResult.exitCode).toBe(1);
expect(vscodeResult.error.code).toBe('SNAPSHOT_TOO_LARGE');
```

---

### 4. Windows Swap Safety

**Status**: ❌ BLOCKER

**Enhancements Required** (see Flow 3 for full code):
1. EXDEV + EBUSY/EPERM handling with retry + exponential backoff
2. Read-only attribute clearing (`attrib -R`)
3. File watcher pause during mutations (`SystemOperationGuard`)

**Test Coverage**:
- [ ] Restore while editors open (Windows file locks)
- [ ] EXDEV on different drives
- [ ] Read-only files
- [ ] Watcher doesn't emit events during restore

---

### 5. Analytics Sanitizer

**Status**: ❌ BLOCKER

**Files to Create**:
1. `packages/analytics/src/sanitizer.ts` (see Flow 7 for full code)
2. `scripts/ci/guard-privacy.sh` (see Flow 7 for full code)

**Integration Points**:
```typescript
// packages/analytics/src/client.ts
import { sanitizeEvent, hashFilePath } from './sanitizer.js';

export function trackEvent(event: AnalyticsEvent, tier: 'free' | 'solo', consent: boolean) {
  const safe = sanitizeEvent(event, tier, consent);
  
  // Validate no PII leakage
  const validation = validateNoPII(safe);
  if (isErr(validation)) {
    logger.error('PII detected in analytics', { violations: validation.error });
    return; // Block transmission
  }
  
  // Transmit sanitized event
  transmit(safe);
}
```

**CI Integration**: Add to `.github/workflows/ci.yml`:
```yaml
- name: Privacy Guards
  run: bash scripts/ci/guard-privacy.sh
```

---

## Demo Harness & Scripts

### Demo Workspace

**Location**: `examples/demo-workspace/`

**Structure**:
```
examples/demo-workspace/
├─ src/
│  ├─ auth.ts          # Intentionally risky (hard-coded token)
│  ├─ config.ts        # Safe configuration
│  └─ utils.ts         # Helper functions
├─ tests/
│  └─ auth.test.ts     # Failing test after risky edit
├─ package.json
├─ .snapbackrc         # Demo configuration
└─ README.md           # Demo steps
```

**auth.ts** (Risky Content):
```typescript
// Initial version (safe)
export function authenticate(username: string) {
  return fetch('/api/auth', { method: 'POST', body: JSON.stringify({ username }) });
}

// Risky edit (hard-coded token) - triggers auto-snapshot
export const API_TOKEN = 'sk-abc123-DEMO-TOKEN'; // ⚠️ Risk score: 9.0
```

**auth.test.ts** (Failing Test):
```typescript
test('authenticate requires valid token', () => {
  expect(API_TOKEN).toBeUndefined(); // ❌ Fails after risky edit
});
```

### Demo Scripts

#### Script: `pnpm demo:website`

**Purpose**: Execute website marketing demo flow

**Steps**:
1. Reset demo workspace to initial state
2. Open VS Code with demo workspace
3. Simulate risky edit to `auth.ts`
4. Verify auto-snapshot created
5. Run test suite → fails
6. Restore snapshot via Command Palette
7. Run test suite → passes
8. Print success message with snapshot ID

**Implementation** (`scripts/demo-website.sh`):
```bash
#!/bin/bash
set -e

# Reset workspace
rm -rf examples/demo-workspace/.snapback
cp examples/demo-workspace/auth.ts.safe examples/demo-workspace/src/auth.ts

# Start VS Code (headless for CI)
code --extensionDevelopmentPath=./apps/vscode examples/demo-workspace

# Simulate risky edit
echo "export const API_TOKEN = 'sk-abc123-DEMO-TOKEN';" >> examples/demo-workspace/src/auth.ts

# Wait for auto-snapshot (triggered by Guardian)
sleep 2

# Verify snapshot created
SNAPSHOT_ID=$(snapback snapshot list --limit 1 --format json | jq -r '.[0].id')
echo "✅ Auto-snapshot created: $SNAPSHOT_ID"

# Run tests (should fail)
cd examples/demo-workspace
npm test || echo "✅ Tests failed as expected"

# Restore snapshot
snapback snapshot restore "$SNAPSHOT_ID" .

# Run tests (should pass)
npm test && echo "✅ Tests pass after restore"
```

#### Script: `pnpm demo:yc`

**Purpose**: Execute YC presentation demo (shorter narration)

**Similar to `demo:website` but with condensed output**

#### Script: `pnpm demo:assets`

**Purpose**: Generate demo assets for recording

**Steps**:
1. Create demo workspace in known state
2. Execute demo flow
3. Capture screenshots at key moments:
   - Auto-snapshot toast
   - Failing test output
   - Restore QuickPick
   - Passing test output
4. Save assets to `/demo-assets/`

**Implementation** (`scripts/demo-assets.sh`):
```bash
#!/bin/bash
mkdir -p demo-assets

# Capture before state
cp examples/demo-workspace/src/auth.ts demo-assets/auth-before.ts

# Execute risky edit
echo "export const API_TOKEN = 'sk-abc123';" >> examples/demo-workspace/src/auth.ts
cp examples/demo-workspace/src/auth.ts demo-assets/auth-after-risky.ts

# Capture snapshot metadata
snapback snapshot list --limit 1 > demo-assets/snapshot-created.txt

# Restore and capture after state
snapback snapshot restore <id> examples/demo-workspace
cp examples/demo-workspace/src/auth.ts demo-assets/auth-restored.ts

echo "✅ Demo assets saved to demo-assets/"
```

---

## Test Matrix

### Unit Tests

**Location**: `packages/sdk/test/`

| Test Suite | Coverage |
|------------|----------|
| `snapshot/SnapshotManager.test.ts` | Size cap, deduplication, conflict detection |
| `session/SessionManager.test.ts` | Start, track, finalize, idle timeout |
| `session/SessionRollback.test.ts` | Inverse ops, crash recovery, Windows rename |
| `analytics/sanitizer.test.ts` | PII removal, tier-based filtering |

### E2E Tests

**Location**: `apps/vscode/test/e2e/`

| Test Suite | Platform | Coverage |
|------------|----------|----------|
| `auto-snapshot.e2e.test.ts` | macOS, Windows | Risky save → auto snapshot |
| `session-lifecycle.e2e.test.ts` | macOS, Windows | Start → track → idle finalize |
| `restore-atomic.e2e.test.ts` | macOS | Atomic rename |
| `restore-exdev.e2e.test.ts` | Windows | EXDEV fallback (copy-remove) |
| `session-rollback.e2e.test.ts` | macOS, Windows | Rollback → tests green |

### Cross-Platform Matrix

| Test Case | macOS | Windows |
|-----------|-------|---------|
| Snapshot create | ✅ | ✅ |
| Atomic restore (rename) | ✅ | ✅ |
| EXDEV fallback (copy-remove) | N/A | ✅ |
| Session track (file lock) | ✅ | ✅ |
| Session rollback (rename) | ✅ | ⚠️ (May fail if file locked) |
| Crash recovery | ✅ | ✅ |

### Performance Tests

**Location**: `packages/perf/test/`

| Metric | Budget | Test |
|--------|--------|------|
| Snapshot create (10 files, 5MB) | <100ms p95 | `snapshot-create.perf.test.ts` |
| Restore validation (100 files) | <500ms p95 | `snapshot-restore.perf.test.ts` |
| Session track (single file) | <50ms p95 | `session-track.perf.test.ts` |
| Session finalize (50 changes) | <500ms p95 | `session-finalize.perf.test.ts` |

---

## Implementation Checklist

### Pre-Flight Blockers (❌ 4 Remain, ✅ 1 Completed)

**✅ COMPLETED**:
- [x] **CI Terminology Guard** - `scripts/ci/guard.sh` implemented with:
  - Legacy "checkpoint" terminology check
  - Legacy policy action detection
  - Direct PostHog usage check
  - Enterprise feature scope validation
  - Feature flags enforcement
  - Allowlist support for exceptions

**❌ REMAINING BLOCKERS**:

- [ ] **Create `001_snapshots.sql` migration** with snapshots, snapshot_files, indexes
  - **Status**: NOT created (only `002_sessions.sql` exists)
  - **Blocker**: E2E tests will fail without snapshot table

- [ ] **Remove `SESSION_ENDED`** from events.ts; update all references to `SESSION_FINALIZED`
  - **Status**: NAMING DRIFT EXISTS
  - **Found in**:
    - `packages/analytics/src/events.ts:L14`
    - `apps/web/modules/analytics/events.ts:L16`
  - **Correct usage** in: `packages/contracts`, `packages/sdk`
  - **Action**: Remove `SESSION_ENDED` constant, update 2 files

- [ ] **Implement analytics sanitizer** (`packages/analytics/src/sanitizer.ts`)
  - **Status**: NOT created
  - **Blocker**: PII leakage risk in production

- [ ] **Implement 50MB size limit** in SnapshotManager.create()
  - **Status**: NOT enforced (no validation in createSnapshot method)
  - **Found**: Size measurement exists in StorageBroker (Buffer.byteLength), but NOT enforced
  - **Gap**: VS Code, CLI have no size checks
  - **Action**: Add pre-create validation with identical error across SDK/VS Code/CLI

- [ ] **Create privacy guard script** (`scripts/ci/guard-privacy.sh`)
  - **Status**: NOT created
  - **Gap**: No PII detection in CI (only terminology guard exists)

- [ ] **Implement Windows swap safety**: EXDEV, EBUSY/EPERM retry, read-only clearing
  - **Status**: Basic atomic restore exists, but NO Windows edge-case handling
  - **Gap**: No retry logic, no EXDEV fallback

- [ ] **Create SystemOperationGuard** to pause watchers during mutations
  - **Status**: NOT created (`packages/sdk/src/session/SystemOperationGuard.ts` missing)
  - **Gap**: Sessions will track restore/rollback as user changes

- [ ] **Add ignore patterns** for `.sb_journal/**`, `*.staging`, `*.backup`
  - **Status**: NOT verified in SessionManager ignore list

- [ ] **Audit logs** for PII (file paths) and replace with `hashFilePath()`
  - **Status**: NOT audited
  - **Blocker**: Privacy leakage in production logs

### High-Impact Improvements (Recommended Before Demo Recording)

- [ ] **Implement deterministic mode** for stable IDs/timestamps in demos
- [ ] **Add path/EOL normalization** with POSIX storage and restore functions
- [ ] **Implement three-way conflict detection** with base hash storage
- [ ] **Add sleep/wake buffer persistence test**
- [ ] **Add CLI `--format json` flag** for scripting
- [ ] **Test restore with many editors open** (Windows file locks)
- [ ] **Test analytics during restore/rollback** (should emit single lifecycle event only)

### Phase 0: Preflight & Inventory

- [ ] Verify snapshot contracts (`packages/contracts/src/types/snapshot.ts`)
- [ ] Verify session contracts (`packages/contracts/src/session.ts`)
- [ ] Verify session migration (`packages/sdk/migrations/002_sessions.sql`)
- [ ] Create missing snapshot migration (`packages/sdk/migrations/001_snapshots.sql`)
- [ ] Scan VS Code contributions for missing commands
- [ ] Confirm StorageBroker uses WAL mode
- [ ] Generate inventory table (exists vs. missing)

### Phase 1: Snapshot Create + Size Cap

- [ ] Implement 50MB size cap in `SnapshotManager.create()`
- [ ] Add `Result<Snapshot, SnapshotError>` return type
- [ ] Update VS Code command to handle size cap error
- [ ] Update CLI command to handle size cap error
- [ ] Write unit tests for size cap (1MB, 50MB, 51MB)
- [ ] Write E2E test for VS Code size cap error dialog

### Phase 2: Auto Snapshot on Risk

- [ ] Wire `onWillSaveTextDocument` to Guardian policy engine
- [ ] Read risk threshold from settings (default: 7)
- [ ] If score > threshold → Create snapshot (non-blocking)
- [ ] Show toast: "⚠️ High-risk change detected → Snapshot created"
- [ ] Emit `SNAPSHOT_CREATED` event with `source: "auto"`
- [ ] Write unit test with mock Guardian (score 8.5)
- [ ] Write E2E test with actual risky file content

### Phase 3: Atomic Restore + Conflict Detection

- [ ] Enhance `SnapshotManager.restore()` with Windows EXDEV handling
- [ ] Implement three-way conflict detection (base, snapshot, current)
- [ ] Add QuickPick UI for conflict summary
- [ ] Add progress indicator for restore operation
- [ ] Write unit test for EXDEV simulation
- [ ] Write E2E test for macOS (atomic rename)
- [ ] Write E2E test for Windows (EXDEV fallback)

### Phase 4: Session Layer

- [ ] Update `SessionsTreeProvider` to load real sessions
- [ ] Implement session change nodes (file-level detail)
- [ ] Add commands: `session.finalize`, `session.rollback`, `session.reveal`
- [ ] Implement status bar indicator
- [ ] Test idle finalize (15-minute timeout)
- [ ] Test crash recovery on startup
- [ ] Write unit test for Windows file lock during rollback

### Phase 5: Privacy Defaults & Cloud Fallback

- [ ] Add privacy settings to `package.json`
- [ ] Implement cloud operation NOOP for missing credentials
- [ ] Implement analytics sanitization layer
- [ ] Add CI guard script for PII detection
- [ ] Write unit tests for sanitizer
- [ ] Write E2E test for offline analytics (Free tier)

### Phase 6: Demo Harness

- [ ] Create `examples/demo-workspace/` with risky files
- [ ] Write `scripts/demo-website.sh`
- [ ] Write `scripts/demo-yc.sh`
- [ ] Write `scripts/demo-assets.sh`
- [ ] Write `README-demo.md` with step-by-step instructions
- [ ] Test demo scripts on macOS
- [ ] Test demo scripts on Windows

### Phase 7: Test Matrix

- [ ] Write unit tests for all flows
- [ ] Write E2E tests for all flows
- [ ] Write cross-platform tests (macOS + Windows)
- [ ] Write performance tests with budgets
- [ ] Add CI jobs for macOS and Windows

### Phase 8: Documentation

- [ ] Generate `Demo Readiness Report.md`
- [ ] Document known limitations
- [ ] Document perf budget results
- [ ] Document how to run demo scripts

---

## Performance Budgets

| Operation | Budget (p95) | Rationale |
|-----------|--------------|-----------|
| Snapshot create (10 files, 5MB) | <100ms | Non-blocking UI, instant feedback |
| Restore validate (100 files) | <500ms | Dry-run for conflict detection |
| Restore execute (100 files, 10MB) | <2s | Atomic swap with progress indicator |
| Session track (single file) | <50ms | Lazy hashing, in-memory buffer |
| Session finalize (50 changes) | <500ms | Batch hash computation, DB flush |

**Measurement**:
- Use `performance.now()` for timing
- Run 100 iterations, compute p95
- Fail CI if budget exceeded

---

## Privacy Guarantees

### Free Tier (Default)

**Zero PII Transmission**:
- ❌ No file paths
- ❌ No file names
- ❌ No workspace IDs
- ❌ No file content
- ✅ Only: event type, timestamp, change count, triggers

**Example Event**:
```json
{
  "event": "snapshot_created",
  "timestamp": 1705420800000,
  "tier": "free",
  "properties": {
    "source": "auto",
    "changeCount": 1,
    "trigger": "risk_threshold"
  }
}
```

### Solo Tier (Opt-In)

**Consent-Gated**:
- Requires explicit `snapback.privacy.cloudConsent: true`
- If false → Same as Free tier

**Allowed Data** (with consent):
- File stems only (no paths): "auth", "config", "test"
- Operation histograms: `{ created: 2, modified: 5, deleted: 1 }`
- k-anonymity >= 3 (aggregated over multiple users)

**Example Event**:
```json
{
  "event": "session_finalized",
  "timestamp": 1705420800000,
  "tier": "solo",
  "consent": true,
  "properties": {
    "changeCount": 8,
    "durationMs": 45000,
    "triggers": ["filewatch", "manual"],
    "fileStems": ["auth", "config", "test"],
    "opHistogram": { "created": 2, "modified": 5, "deleted": 1 }
  }
}
```

---

## Acceptance Criteria

### Hard Requirements

1. **All 8 demo flows marked ✅** with passing tests
2. **50MB cap enforced** with user-friendly error messages
3. **Restore is atomic** and crash-safe on macOS and Windows
4. **Privacy guards pass**: Zero PII in analytics for Free tier
5. **Performance budgets met**: Create <100ms, restore <500ms, track <50ms
6. **Demo scripts run non-interactively** up to final UI click points
7. **Demo assets folder populated** with stable paths

### Soft Requirements

1. Sessions tree view shows real session data
2. Status bar indicator updates on each file change
3. Rollback handles Windows file locks gracefully
4. CI jobs run on both macOS and Windows

---

## Known Limitations

### Non-Blocking Issues

1. **Solo tier cloud backup** - Not implemented; all operations local-only
2. **LLM-based session naming** - Offline name generation only
3. **Snapshot compression** - Content stored uncompressed (future optimization)
4. **Windows file locks during rollback** - May fail if file locked by another process

### Future Enhancements

1. **Snapshot deduplication across sessions** - Currently per-snapshot only
2. **Incremental snapshots** - Currently full snapshots only
3. **Snapshot encryption at rest** - Currently plaintext storage
4. **Cloud sync conflict resolution** - Not applicable (local-only for now)

---

## Dependencies

### Existing Dependencies

All existing; no new runtime dependencies required.

**Critical Dependencies**:
- `better-sqlite3` - Database (already used)
- `minimatch` - Pattern matching (already used)
- `@paralleldrive/cuid2` - Session ID generation (already used)

### Optional Dependencies

None required for demo readiness.

---

## Rollout Strategy

### Phase 1: Internal Testing (Week 1)

- Run demo scripts on macOS and Windows
- Validate performance budgets
- Verify privacy guarantees

### Phase 2: Beta Testing (Week 2)

- Invite 5-10 beta testers
- Collect feedback on demo flows
- Measure actual performance in real workspaces

### Phase 3: Demo Recording (Week 3)

- Record marketing demo video
- Record YC presentation demo
- Generate demo assets for blog posts

### Phase 4: Public Release (Week 4)

- Merge to main branch
- Tag release: `v1.3.0-demo-ready`
- Publish VS Code extension update
- Announce demo availability

---

## Risk Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Windows EXDEV errors | Medium | High | Implement copy-remove fallback |
| File locks during rollback | Medium | Medium | Retry logic with exponential backoff |
| Performance budget violations | Low | High | Optimize hash computation, use LRU cache |
| Privacy leak in analytics | Low | Critical | CI guard script + code review |

### Demo Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Demo fails during presentation | Low | Critical | Rehearse scripts, record backup video |
| Performance varies by machine | Medium | Medium | Test on low-spec machines, adjust budgets |
| UI freezes during restore | Low | High | Use progress indicators, test with large files |

---

## Open Questions

1. **Should we support snapshot tags for demo purposes?** (e.g., "demo-checkpoint")
   - Proposed: Not for v1; add in future iteration

2. **Should rollback confirm before executing?** (vs. silent execution)
   - Proposed: Yes, show confirmation dialog with file count

3. **Should we limit session duration?** (e.g., max 24 hours)
   - Proposed: No hard limit; idle timeout (15 min) is sufficient

4. **Should we support selective file restore from session?** (vs. all-or-nothing)
   - Proposed: Yes, add to UI context menu: "Restore This File"

---

## Appendix A: File Structure

```
SnapBack-Site/
├─ packages/
│  ├─ contracts/
│  │  └─ src/
│  │     ├─ types/snapshot.ts          ✅ Exists
│  │     └─ session.ts                 ✅ Exists
│  ├─ sdk/
│  │  ├─ migrations/
│  │  │  ├─ 001_snapshots.sql         ⚠️ Missing
│  │  │  └─ 002_sessions.sql          ✅ Exists
│  │  └─ src/
│  │     ├─ snapshot/
│  │     │  ├─ SnapshotManager.ts     ✅ Exists (needs 50MB cap)
│  │     │  ├─ SnapshotDeduplication.ts ✅ Exists
│  │     │  └─ SnapshotNaming.ts      ✅ Exists
│  │     ├─ session/
│  │     │  ├─ SessionManager.ts      ✅ Exists
│  │     │  ├─ SessionRollback.ts     ✅ Exists (needs Windows testing)
│  │     │  └─ SessionRecovery.ts     ✅ Exists
│  │     └─ storage/
│  │        └─ StorageBroker.ts       ✅ Exists (needs verification)
│  └─ analytics/
│     └─ src/
│        ├─ events.ts                 ✅ Exists (needs SESSION_FINALIZED)
│        └─ sanitizer.ts              ⚠️ Missing
├─ apps/
│  ├─ vscode/
│  │  ├─ package.json                 ⚠️ Needs session commands
│  │  └─ src/
│  │     ├─ views/
│  │     │  └─ SessionsTreeProvider.ts ⚠️ Needs enhancement
│  │     ├─ commands/
│  │     │  └─ sessionCommands.ts     ⚠️ Missing
│  │     └─ ui/
│  │        └─ SessionStatusBar.ts    ⚠️ Missing
│  └─ cli/
│     └─ src/
│        └─ commands/
│           ├─ snapshot.ts            ⚠️ Needs verification
│           └─ session.ts             ⚠️ Missing
├─ examples/
│  └─ demo-workspace/                 ⚠️ Missing
│     ├─ src/
│     │  ├─ auth.ts
│     │  ├─ config.ts
│     │  └─ utils.ts
│     └─ tests/
│        └─ auth.test.ts
├─ scripts/
│  ├─ demo-website.sh                 ⚠️ Missing
│  ├─ demo-yc.sh                      ⚠️ Missing
│  ├─ demo-assets.sh                  ⚠️ Missing
│  └─ ci/
│     └─ guard-privacy.sh             ⚠️ Missing
└─ demo-assets/                       ⚠️ Missing (generated by script)
```

---

## Appendix B: Command Reference

### VS Code Commands

| Command | Description | Keybinding |
|---------|-------------|-----------|
| `snapback.createSnapshot` | Create snapshot | Ctrl+Alt+S |
| `snapback.snapBack` | Restore snapshot | Ctrl+Alt+Z |
| `snapback.session.finalize` | Finalize active session | - |
| `snapback.session.rollback` | Rollback session | - |
| `snapback.session.reveal` | Reveal session diff | - |

### CLI Commands

| Command | Description |
|---------|-------------|
| `snapback snapshot create <files...> [--description <text>]` | Create snapshot |
| `snapback snapshot list [--limit <n>]` | List snapshots |
| `snapback snapshot restore <id> <path>` | Restore snapshot |
| `snapback session list [--limit <n>]` | List sessions |
| `snapback session finalize` | Finalize active session |
| `snapback session rollback <id>` | Rollback session |

---

## Appendix C: Analytics Event Catalog

| Event | Tier | Properties | PII |
|-------|------|-----------|-----|
| `SNAPSHOT_CREATED` | Free | `source`, `changeCount`, `trigger` | ❌ |
| `SNAPSHOT_RESTORED` | Free | `changeCount` | ❌ |
| `SESSION_STARTED` | Free | - | ❌ |
| `SESSION_FINALIZED` | Free | `changeCount`, `durationMs`, `triggers` | ❌ |
| `SESSION_FINALIZED` | Solo (consent) | `changeCount`, `durationMs`, `triggers`, `fileStems`, `opHistogram` | ⚠️ Stems only |

---

## Appendix D: Error Codes

| Code | Message | Recovery |
|------|---------|----------|
| `SNAPSHOT_TOO_LARGE` | "Snapshot too large (XMB). Limit: 50MB." | Select fewer files |
| `SNAPSHOT_NOT_FOUND` | "Snapshot not found: <id>" | Verify snapshot ID |
| `SESSION_NOT_ACTIVE` | "No active session to finalize" | Start new session |
| `RESTORE_CONFLICT` | "Conflicts detected: N files" | Review conflicts, choose action |
| `EXDEV_FALLBACK` | "Cross-device link detected, using fallback" | Automatic (no user action) |

---

## Confidence Assessment

**Overall Confidence: High** (Post-review with pre-flight fixes)

**Confidence Basis**:

**High Confidence** (Existing + Fixes Identified):
- Core contracts are complete and well-designed
- Session schema is robust with proper indexing
- SnapshotManager has atomic restore logic
- SessionManager has privacy-safe analytics
- All blockers identified with clear mitigation paths
- Windows edge cases documented with concrete solutions
- Privacy requirements fully specified with implementation code

**Medium Confidence** (Needs Implementation):
- 50MB size cap requires alignment across 3-4 surfaces
- Three-way conflict detection needs base hash storage
- Demo determinism needs seeded ID generation
- Cross-platform test coverage (especially Windows)

**Lower Confidence** (Testing Required):
- Windows file lock behavior during rollback with many editors open
- Sleep/wake buffer persistence under real-world conditions
- Performance budgets in large workspaces (>1000 files)

**Key Risks Mitigated**:
- ✅ EXDEV errors: Copy-remove fallback with retry logic
- ✅ File locks: EBUSY/EPERM exponential backoff
- ✅ PII leakage: Sanitizer + CI guards + hash-based logging
- ✅ Naming drift: Terminology guard bans `SESSION_ENDED`
- ✅ Watcher feedback loops: SystemOperationGuard pauses tracking

---

## Recommendation

**Proceed with Option B**: Complete pre-flight fixes (5 blockers) before UI implementation.

**Rationale** (Law #23: Concentrate Forces):
1. **Risk Reduction**: Blockers eliminated → demo won't fail on platform edge cases
2. **Consistency**: Single source of truth for events, size limits, and privacy
3. **Portability**: Windows swap safety ensures cross-platform reliability
4. **Compliance**: Privacy guards prevent PII leaks in production
5. **Velocity**: Clean foundation → faster UI implementation (no backtracking)

**Estimated Timeline**:
- Pre-flight fixes: 1-2 days (5 blockers + tests)
- High-impact improvements: 1 day (determinism, normalization, conflicts)
- Demo recording: 0.5 days (with stable infrastructure)
- **Total**: 2.5-3.5 days to demo-ready

**Next Steps**:
1. Create feature branch: `demo/readiness-2025-01`
2. Complete pre-flight blockers in order (migration → events → sanitizer → Windows → guards)
3. Implement high-impact improvements (determinism, normalization)
4. Run full test matrix (unit + E2E + cross-platform)
5. Record demo assets with deterministic mode
6. Merge to main and tag `v1.3.0-demo-ready`

---

## Answers to Open Questions

**Q1: Size cap per-snapshot or cumulative? UI breakdown on failure?**

**A**: Per-snapshot only (not cumulative). UI shows:
- Total size with formatted units (e.g., "55MB")
- Top 5 largest files with sizes (e.g., "auth.ts (30MB), config.ts (25MB)")
- Actionable guidance: "Select fewer files or reduce file sizes."

**Q2: Size measurement standard?**

**A**: Raw bytes pre-compression (`Buffer.byteLength(content, 'utf-8')`) as authoritative standard across SDK, VS Code, CLI, and API.

**Enforcement**: Cross-surface consistency test ensures all surfaces return `SNAPSHOT_TOO_LARGE` for identical input.

---

## Appendix E: Terminology Standardization

| Deprecated Term | Standard Term | Reason |
|----------------|---------------|--------|
| `SESSION_ENDED` | `SESSION_FINALIZED` | Matches SDK implementation; more precise (implies completion not just termination) |
| "snapshot size" (ambiguous) | "raw bytes pre-compression" | Eliminates confusion between compressed/uncompressed/string-length |
| "path" (ambiguous) | "POSIX-style relative path" | Cross-platform clarity |
| "restore" (overloaded) | "atomic restore" or "rollback" | Distinguishes snapshot restore from session rollback |
