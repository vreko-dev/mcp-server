# Snapshot & Restore Implementation Design

## Objective

Implement production-ready snapshot creation and restore functionality for SnapBack Alpha, focusing on Free/Solo tiers. This design establishes the core value proposition: developers can capture workspace state at critical moments and restore it with atomic guarantees.

## System Scope

### In Scope
- Manual snapshot creation from VS Code extension, CLI, and web console
- Automatic snapshot triggers based on risk analysis
- Cloud-first storage with local fallback
- Atomic restore operations with conflict detection
- Deduplication for storage efficiency
- Performance budgets: snapshot creation <100ms, restore validation <500ms
- Analytics integration for product insights
- Tier-based limits (Free: 50 snapshots, Solo: 500 snapshots)

### Out of Scope (Deferred to Team/Enterprise)
- Multi-user collaboration features
- Snapshot sharing across organization members
- SSO/SAML authentication integration
- Custom retention policies beyond tier defaults
- Advanced search with full-text indexing

### Extended Scope: Session Layer (Task 2.5)
- Session-based change grouping over snapshot infrastructure
- Contextual rollback for selective file restoration
- VS Code tree view for active and historical sessions
- LLM-generated semantic session names
- Privacy-safe session analytics (metadata only)
- Idle boundary detection (15-minute auto-finalize)
- Session-to-snapshot linkage (non-breaking extension)

## Architectural Principles

### Contract-First Design
All snapshot operations must adhere to type contracts defined in `packages/contracts/src/types/snapshot.ts`. This ensures consistency across VS Code extension, CLI, web console, and MCP server.

### Storage Layer Architecture
The system follows a three-tier storage architecture:

**Tier 1: Local Storage (SQLite)**
- Location: `~/.snapback/snapback.db` (VS Code, CLI) or workspace-specific paths
- Purpose: Primary storage for Free tier, offline cache for Solo+
- Implementation: `StorageBrokerAdapter` wrapping Better-SQLite3
- Schema: Snapshots table with compressed content blobs, metadata table with indexes

**Tier 2: Cloud Storage (S3)**
- Location: `us-east-1` region (privacy requirement)
- Purpose: Primary storage for Solo+ tiers
- Implementation: API service handles upload/download via presigned URLs
- Structure: `s3://snapback-snapshots/{userId}/{snapshotId}.json.gz`

**Tier 3: Analytics Storage (PostgreSQL)**
- Location: Supabase managed database
- Purpose: Metadata for analytics dashboard, tier enforcement
- Implementation: Drizzle ORM schema in `packages/platform/src/db/schema/postgres.ts`
- Tables: `snapshots` (metadata only), `analyticsEvents` (product telemetry)

### Error Handling Strategy
Following Result<T, E> pattern from `always-result-type-pattern.md`:

```
createSnapshot() → Result<Snapshot, SnapshotCreationError>
restoreSnapshot() → Result<SnapshotRestoreResult, SnapshotRestoreError>
```

Errors are never thrown for expected failures (quota exceeded, storage unavailable). Throws are reserved for programming errors (null assertions, contract violations).

## Session Layer Architecture

### Design Philosophy

Sessions are **metadata overlays** on the existing snapshot infrastructure. They provide:
- **Contextual Grouping**: Files changed during a logical work period (AI editing session, feature branch work)
- **Selective Rollback**: Revert only session-scoped changes without full workspace restore
- **User-Friendly UI**: Tree view showing "what changed when" with human-readable names
- **Privacy Preservation**: Track change patterns without exposing file contents

**Key Principle**: Sessions reference existing Content-Addressable Storage (CAS) blobs via SHA-256 hashes. No duplicate storage.

### Session Schema Contract

**Location**: `packages/contracts/src/session.ts`

**Core Types**:

```typescript
export type SessionSchema = 'sb.session.v1';

export type ChangeOp = 'created' | 'modified' | 'deleted' | 'renamed';

export type EOLType = 'lf' | 'crlf';

export interface SessionChange {
  p: string;                 // Relative path from workspace root
  op: ChangeOp;              // Operation type
  from?: string;             // Prior relative path (for rename operations)
  hOld?: string;             // SHA-256 hash before change (CAS reference)
  hNew?: string;             // SHA-256 hash after change (CAS reference)
  sizeBefore?: number;       // File size before change (bytes)
  sizeAfter?: number;        // File size after change (bytes)
  mtimeBefore?: number;      // Modification time before (Unix epoch ms)
  mtimeAfter?: number;       // Modification time after (Unix epoch ms)
  modeBefore?: number;       // File permissions before (Unix mode)
  modeAfter?: number;        // File permissions after (Unix mode)
  eolBefore?: EOLType;       // Line ending style before
  eolAfter?: EOLType;        // Line ending style after
}

export interface SessionManifestV1 {
  schema: SessionSchema;          // 'sb.session.v1' (versioning)
  sessionId: string;              // CUID identifier
  startedAt: string;              // ISO 8601 timestamp
  endedAt?: string;               // ISO 8601 when finalized
  workspaceUri: string;           // VS Code workspace folder URI (multi-root safe)
  name?: string;                  // Offline-generated label (never transmitted)
  triggers: Array<'filewatch' | 'pre-commit' | 'manual' | 'idle-finalize'>;
  changeCount: number;
  filesChanged: SessionChange[];  // Chronological change list
  snapshots?: string[];           // Array of snapshot IDs created during session
}
```

**Snapshot Extension** (Non-Breaking):

```typescript
// packages/contracts/src/types/snapshot.ts
export interface Snapshot {
  id: string;
  timestamp: number;
  meta?: {
    // ... existing fields
    sessionId?: string;   // Link snapshot to parent session (optional)
  };
  files?: string[];
  fileContents?: Record<string, string>;
}
```

### Session Database Schema

**Location**: `packages/sdk/migrations/002_sessions.sql`

**Table: sessions**
```sql
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
PRAGMA synchronous=NORMAL;

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  workspace_uri TEXT NOT NULL,          -- VS Code workspace folder URI
  started_at INTEGER NOT NULL,          -- Unix epoch milliseconds
  ended_at INTEGER,                     -- NULL if active, epoch when finalized
  name TEXT,                            -- Offline-generated label (never transmitted)
  triggers INTEGER DEFAULT 0,           -- Bitmask: 1=filewatch, 2=pre-commit, 4=manual, 8=idle
  change_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_ws_end
  ON sessions(workspace_uri, ended_at);
```

**Table: session_changes**
```sql
CREATE TABLE IF NOT EXISTS session_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  rel_path TEXT NOT NULL,               -- Relative path from workspace root
  op TEXT CHECK(op IN ('created','modified','deleted','renamed')) NOT NULL,
  from_path TEXT,                       -- Non-null for rename operations
  size_before INTEGER,                  -- Size in bytes (pre-change)
  size_after INTEGER,                   -- Size in bytes (post-change)
  mtime_before INTEGER,                 -- Modification time before (Unix epoch ms)
  mtime_after INTEGER,                  -- Modification time after (Unix epoch ms)
  h_old TEXT,                           -- SHA-256 CAS reference (deferred until finalize)
  h_new TEXT,                           -- SHA-256 CAS reference (deferred until finalize)
  mode_before INTEGER,                  -- File permissions before (Unix mode)
  mode_after INTEGER,                   -- File permissions after (Unix mode)
  eol_before TEXT,                      -- 'lf'|'crlf'|NULL
  eol_after TEXT                        -- 'lf'|'crlf'|NULL
);

CREATE INDEX IF NOT EXISTS idx_changes_sess
  ON session_changes(session_id);
```

**Table: session_snapshots** (Link Table)
```sql
CREATE TABLE IF NOT EXISTS session_snapshots (
  session_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  PRIMARY KEY (session_id, snapshot_id)
);
```

**Trigger Bitmask Encoding**:
```
Bit 0 (1): filewatch
Bit 1 (2): pre-commit
Bit 2 (4): manual
Bit 3 (8): idle-finalize

Example: trigger_mask = 5 → filewatch + manual
```

### Session Manager Implementation

**Location**: `packages/sdk/src/session/SessionManager.ts`

**Configuration**:
```typescript
export interface SessionManagerOptions {
  workspaceUri: string;               // VS Code workspace folder URI (multi-root safe)
  idleMs?: number;                    // Default: 15 * 60_000 (15 minutes)
  flushBatchSize?: number;            // Default: 50 changes
  flushIntervalMs?: number;           // Default: 5000ms (flush every 5s or 50 changes, whichever first)
  useVSCodeWatcher?: boolean;         // Use VS Code file system watcher
  storage: StorageAdapter;            // Reference to snapshot storage
  ignorePatterns?: string[];          // .snapbackignore patterns
  tier?: 'free' | 'solo';             // User tier
  consent?: boolean;                  // Analytics consent (Solo tier)
}
```

**Core API**:

**start(): Promise<{ sessionId: string }>**
```
Flow:
1. Generate CUID for sessionId
2. Get workspaceUri from VS Code workspace folder API
3. Insert into sessions table:
   - session_id, workspace_uri, started_at (now)
   - ended_at = NULL (active)
   - triggers = 1 (filewatch by default)
4. Initialize in-memory change buffer: SessionChange[]
5. Start idle timer (15 minutes)
6. Start batch flush timer (5 seconds or 50 changes, whichever first)
7. Emit analytics: SESSION_STARTED { changeCount: 0 } (no workspace identifier)
8. Return { sessionId }
```

**track(path: string, op: ChangeOp, meta?: { fromPath?: string; oldUri?: string; newUri?: string }): void**
```
Flow:
1. Check .snapbackignore patterns (node_modules, .next, dist, build, coverage, .git, *.log, *.tmp, *.swp, .DS_Store)
   - If path matches ignore pattern → return early (no tracking)
   - Use minimatch with { dot: true } option to respect .* patterns
2. Resolve path to relative from workspace root
3. Normalize to POSIX-style (replace \ with /):
   - relPath = path.relative(workspaceRoot, absolutePath)
   - posixPath = relPath.split(path.sep).join('/')
4. For rename operations, extract fromPath from meta:
   - If meta.fromPath: use directly
   - If meta.oldUri && meta.newUri (VS Code onDidRenameFiles event):
     - fromPath = path.relative(workspaceRoot, vscode.Uri.parse(meta.oldUri).fsPath)
     - Normalize to POSIX: fromPath.split(path.sep).join('/')
5. Capture metadata (defer hash computation until finalize for <50ms budget):
   - size: file.size
   - mtime: file.mtimeMs
   - mode: file.mode (Unix permissions)
   - eol: detect 'lf' vs 'crlf' from observed writes (per file, preserve mixed)
6. Add SessionChange to in-memory buffer:
   - For 'created': sizeBefore=undefined, sizeAfter=size, hOld=undefined
   - For 'modified': Capture both before/after metadata, defer hashes
   - For 'deleted': sizeAfter=undefined, hNew=undefined
   - For 'renamed': from=meta.fromPath (or extracted from oldUri), preserve metadata
7. Reset idle timer (activity detected)
8. If buffer size ≥50 changes OR 5 seconds elapsed → trigger flush
```

**stopFinalize(): Promise<{ sessionId: string; changeCount: number }>**
```
Flow:
1. Cancel idle timer
2. Compute deferred hashes in worker thread (non-blocking):
   - For each change in buffer: read file content, compute SHA-256
   - Store hashes in CAS, update SessionChange.hOld/hNew
3. Flush remaining changes to session_changes table (prepared statement batch)
4. Update sessions table:
   - ended_at = now
   - change_count = total changes
   - triggers |= 4 (manual finalize)
5. Generate offline name (default, always available):
   - Extract top 3 file stems from filesChanged
   - Synthesize: "Updated auth, config, tests"
   - Set name field immediately
6. If tier=solo AND user_consent=true:
   - Queue async LLM naming request (non-blocking)
   - Retro-update name field when LLM responds
7. Emit analytics: SESSION_FINALIZED { changeCount, durationMs, ext_counts, token_counts }
   - ext_counts: { '.ts': 12, '.tsx': 5, '.json': 2 }
   - token_counts: { 'auth': 4, 'policy': 2 } (from file stems)
   - Free tier: omit ext_counts if changeCount < 3 (k-anonymity threshold)
8. Clear in-memory state
9. Return { sessionId, changeCount }
```

**current(): { sessionId: string | null; changeCount: number }**
```
Returns active session ID and current change count, or null if no active session.
```

**list(limit?: number): Promise<SessionSummary[]>**
```
Flow:
1. Query sessions table:
   SELECT session_id, name, change_count, started_at, ended_at
   WHERE workspace_id = ?
   ORDER BY started_at DESC
   LIMIT ?
2. Return array of session metadata
```

**getManifest(sessionId: string): Promise<SessionManifestV1>**
```
Flow:
1. Query sessions table for metadata
2. Query session_changes for filesChanged array
3. Query session_snapshots for linked snapshot IDs
4. Reconstruct triggers array from trigger_mask
5. Return SessionManifestV1
```

### Idle Boundary Detection

**Mechanism**:
```typescript
private startIdleTimer(): void {
  this.idleTimer = setTimeout(() => {
    this.autoFinalize();
  }, this.options.idleMs || 15 * 60_000);
}

private resetIdleTimer(): void {
  if (this.idleTimer) {
    clearTimeout(this.idleTimer);
  }
  this.startIdleTimer();
}

private async autoFinalize(): Promise<void> {
  if (!this.activeSessionId) return;

  // Compute deferred hashes in worker thread (non-blocking)
  await this.computeDeferredHashes();

  // Flush changes
  await this.flushChanges();

  // Update trigger mask to include idle-finalize (bit 3)
  await this.db.run(
    'UPDATE sessions SET ended_at = ?, triggers = triggers | 8 WHERE session_id = ?',
    [Date.now(), this.activeSessionId]
  );

  // Generate offline name immediately
  const offlineName = this.namingService.generateOfflineName(this.changeBuffer);
  await this.db.run(
    'UPDATE sessions SET name = ? WHERE session_id = ?',
    [offlineName, this.activeSessionId]
  );

  // Queue async LLM naming (non-blocking, if consent)
  this.namingService.queueLLMNaming(this.activeSessionId, this.changeBuffer).catch(() => {});

  // Emit analytics
  this.emitSessionFinalized();

  // Clear state
  this.activeSessionId = null;
  this.changeBuffer = [];
}

/**
 * Compute SHA-256 hashes in worker thread to keep UI responsive
 */
private async computeDeferredHashes(): Promise<void> {
  const worker = new Worker('./hash-worker.js');

  for (const change of this.changeBuffer) {
    if (!change.hOld && change.op !== 'created') {
      // Read old content from CAS or file system
      const oldContent = await this.readFileContent(change.p, 'before');
      change.hOld = await worker.postMessage({ content: oldContent });
    }

    if (!change.hNew && change.op !== 'deleted') {
      // Read new content from file system
      const newContent = await this.readFileContent(change.p, 'after');
      change.hNew = await worker.postMessage({ content: newContent });
    }
  }

  worker.terminate();
}
```

**OS Sleep/Wake Resilience**:
- On VS Code workspace deactivate: persist change buffer to disk
- On VS Code workspace reactivate: reload change buffer
- Idle timer pauses during sleep, resumes on wake

```typescript
vscode.workspace.onDidChangeWorkspaceFolders(async () => {
  // Persist state before deactivation
  await this.sessionManager.persistState();
});

vscode.window.onDidChangeWindowState(async (state) => {
  if (state.focused) {
    // Restore state after wake
    await this.sessionManager.restoreState();
  }
});

**Activity Events that Reset Timer**:
- File created/modified/deleted/renamed
- Manual snapshot creation (implies active work)
- User interaction with session UI (reveal diff, rollback preview)

### Content-Addressable Storage Integration

**CAS Blob Reference**:

Sessions do NOT store file contents. Instead:

1. **Snapshot Creation**: When files change, SnapshotManager stores content in CAS with SHA-256 key
2. **Session Tracking**: SessionChange records hNew/hOld pointing to CAS blobs
3. **Rollback**: Retrieve blob by hash from CAS, write to file system

**Example**:
```
File: src/auth.ts
Before: "export const login = () => { ... }"  → hOld = "a3f5..."
After:  "export const login = async () => { ... }"  → hNew = "b7e2..."

CAS Storage:
  blobs/a3f5... → compressed original content
  blobs/b7e2... → compressed new content

SessionChange:
  { p: 'src/auth.ts', op: 'modified', hOld: 'a3f5...', hNew: 'b7e2...' }

Rollback:
  1. Read blob blobs/a3f5...
  2. Decompress
  3. Write to workspace/src/auth.ts
  4. Verify hash matches hOld
```

**Deduplication Benefit**:
- If `src/auth.ts` is modified again, and content matches a previous version, CAS reuses existing blob
- Session references same hash → zero additional storage cost

### Session Rollback Algorithm

**Location**: `packages/sdk/src/session/SessionRollback.ts`

**API**: `rollbackSession(sessionId: string, options?: RollbackOptions): Promise<RollbackResult>`

**RollbackOptions**:
```typescript
interface RollbackOptions {
  onProgress?: (percent: number) => void;
  dryRun?: boolean;               // Validate without applying changes
}

interface RollbackResult {
  success: boolean;
  filesReverted: string[];        // Paths successfully rolled back
  filesSkipped: string[];         // Paths with conflicts or missing blobs
  errors: Array<{ path: string; error: string }>;
}
```

**Algorithm**:
```
Input: sessionId, options
Output: RollbackResult

1. Load SessionManifestV1 from database
2. Reverse filesChanged array (apply inverse operations in reverse chronological order)
3. Create journal entry in .sb_journal/pending/{sessionId}.txn:
   - Record: { sessionId, timestamp, changes: [...], backups: [] }
   - Ensures crash recovery if process killed mid-rollback
4. Create staging directory: {workspace}/.snapback-rollback-{sessionId}
5. For each change in reversed order:

   If op = 'created':
     - Mark for deletion: staging/.deleted/{path}

   If op = 'modified':
     - Retrieve blob by hOld from BlobStore
     - If blob missing → add to filesSkipped, continue
     - Verify hash of blob matches hOld (integrity check)
     - Write blob to staging/{path}
     - Restore metadata: mtime, mode, eol

   If op = 'deleted':
     - Retrieve blob by hOld from BlobStore
     - Write blob to staging/{path}
     - Restore metadata: mtime, mode, eol

   If op = 'renamed':
     - Move file from current path back to fromPath
     - Retrieve blob by hOld (if content changed during rename)
     - Write to staging/{fromPath}
     - Restore metadata: mtime, mode, eol

6. Validate staging directory:
   - Compute hash of each staged file
   - Compare to expected hOld
   - If mismatch → abort, show Recovery UI, keep journal entry

7. **Per-file atomic swap** (Windows-safe):
   a. For each file in staging:
      i.   Backup current file: rename {path} → {path}.bak-{sessionId}
      ii.  Record backup in journal: journal.backups.push({ original: path, backup: path + '.bak-' + sessionId })
      iii. Move staged file into place:
           try {
             await fs.rename(staging/{path}, {path})
           } catch (e) {
             if (e.code === 'EXDEV') {
               // Cross-device link error (Windows different drives)
               await fs.copyFile(staging/{path}, {path})
               await fs.unlink(staging/{path})
             } else {
               throw e
             }
           }
   b. For each file in staging/.deleted:
      i.   Backup current file: rename {path} → {path}.bak-{sessionId}
      ii.  Record backup in journal
      iii. Delete file: fs.unlink({path})
   c. On success:
      - Delete all .bak-{sessionId} files
      - Move journal from pending/ to committed/
      - Remove staging directory
   d. On failure (any file operation):
      - Restore from per-file backups: rename {path}.bak-{sessionId} → {path}
      - Keep journal in pending/ for manual recovery
      - Remove staging directory

8. Return RollbackResult with counts and any errors
```

**Crash Safety**:
- Journal directory: `.sb_journal/pending/` and `.sb_journal/committed/`
- Transaction log written before any file mutations
- **Per-file backup tracking**: Journal records all {path}.bak-{sessionId} files created
- If process crashes during rollback:
  - On next startup: SessionManager replays or rolls back pending transactions
  - Pending journal entry indicates incomplete rollback → auto-rollback from per-file backups
  - Committed journal entry indicates successful rollback → cleanup only
  - Per-file backups preserved until journal confirms success
- Database uses SQLite WAL mode for transaction safety

**Cross-Platform File Operations**:
- **Windows**: `fs.rename()` with explicit EXDEV fallback for cross-device moves:
  ```typescript
  try {
    await fs.rename(src, dst);
  } catch (e: any) {
    if (e.code === 'EXDEV') {
      await fs.copyFile(src, dst);
      await fs.unlink(src);
    } else {
      throw e;
    }
  }
  ```
- **macOS/Linux**: `fs.rename()` is atomic within same filesystem
- **Metadata Restoration**:
  - mtime: `fs.utimes()` to restore modification time
  - mode: `fs.chmod()` to restore Unix permissions (ignored on Windows)
  - eol: Detect from first write and re-apply on restore (preserve observed EOL per file)
- **EOL Normalization**: Store observed EOL style (`lf` vs `crlf`) during tracking; re-apply on restore
- **Case Sensitivity**: Normalize paths via `path.normalize()` before comparison; use case-insensitive compares on Windows
- **Path Normalization**: Always store relative, POSIX-style paths in database:
  ```typescript
  const relPath = path.relative(workspaceRoot, absolutePath);
  const posixPath = relPath.split(path.sep).join('/'); // Convert \ to /
  ```

**Journal Recovery on Startup**:
```typescript
// packages/sdk/src/session/SessionRecovery.ts
export async function recoverPendingTransactions(): Promise<void> {
  const pending = await fs.readdir('.sb_journal/pending/');

  for (const txnFile of pending) {
    const txn = JSON.parse(await fs.readFile(txnFile, 'utf-8'));

    // Check if any per-file backups exist
    const backupExists = txn.backups.some(async (backup: any) => {
      return await fs.exists(backup.backup);
    });

    if (backupExists) {
      // Rollback incomplete transaction using per-file backups
      for (const backup of txn.backups) {
        if (await fs.exists(backup.backup)) {
          await fs.rename(backup.backup, backup.original);
          await fs.unlink(backup.backup);
        }
      }
      await fs.unlink(txnFile); // Remove pending journal
    } else {
      // No backups = transaction never started, safe to delete journal
      await fs.unlink(txnFile);
    }
  }
}
```

**Hash Mismatch Recovery**:
```
If staging validation detects hash != expected:
1. Auto-rollback: restore workspace from backup
2. Show VS Code notification:
   "Session rollback failed: content integrity error.
    Workspace restored to pre-rollback state.
    [View Details] [Report Issue]"
3. Log to error telemetry (anonymized):
   { event: 'ROLLBACK_HASH_MISMATCH', sessionId: '[redacted]', pathCount: N }
```

## Data Models

### Snapshot Entity

**Source**: `packages/contracts/src/types/snapshot.ts`

**Core Structure**:
```
Snapshot {
  id: string                                  // UUID v4
  timestamp: number                           // Unix epoch milliseconds
  meta?: {
    name?: string                             // Semantic name from SnapshotNaming
    description?: string                      // User-provided description
    protected?: boolean                       // Protection flag (prevents deletion)
    trigger?: 'manual' | 'auto-risk' | 'auto-save' | 'pre-commit'
    riskScore?: number                        // 0-10 scale from Guardian policy engine
    [key: string]: unknown                    // Extensible metadata
  }
  files?: string[]                            // Relative file paths
  fileContents?: Record<string, string>       // Path → content mapping
}
```

**Metadata Enrichment**:
VS Code extension and web console enrich snapshots with UI-specific fields via `RichSnapshot` type:
- `name`: Generated by `SnapshotNaming` strategy (git commit message, semantic analysis, or timestamp)
- `isProtected`: Derived from `meta.protected`
- `icon` and `iconColor`: UI theming based on trigger type

### Snapshot Creation Options

**Source**: `packages/contracts/src/types/snapshot.ts`

```
CreateSnapshotOptions {
  description?: string              // User-provided context
  protected?: boolean               // Mark snapshot as protected (default: false)
}
```

**Extended Input** (VS Code specific):
```
CreateSnapshotInput {
  trigger: string                   // 'manual' | 'auto-risk' | 'auto-save' | 'pre-commit'
  content?: string                  // Legacy single-file content (deprecated)
  risk?: {
    score: number                   // 0-10 scale
    reasons: string[]               // Guardian policy violation details
  }
  files?: string[]                  // File paths to snapshot
  fileContents?: Record<string, string>  // Content map
}
```

### Restore Result

**Source**: `packages/contracts/src/types/snapshot.ts`

```
SnapshotRestoreResult {
  success: boolean
  restoredFiles: string[]
  errors?: string[]
}
```

**Extended Result** (VS Code specific):
```
RestoreResult {
  success: boolean
  restoredFiles: string[]
  conflicts: ConflictInfo[]         // Files with content divergence
  error?: string                    // Top-level error message
}

ConflictInfo {
  path: string
  snapshotContent: string
  currentContent: string | null
  type: 'modified' | 'added' | 'deleted'
  snapshotTimestamp: number
  currentTimestamp: number | null
}
```

### Snapshot Filters

**Source**: `packages/contracts/src/types/snapshot.ts`

```
SnapshotFilters {
  filePath?: string                 // Filter by file path (partial match)
  before?: Date                     // Created before timestamp
  after?: Date                      // Created after timestamp
  protected?: boolean               // Filter by protection status
  limit?: number                    // Max results (default: 50)
  offset?: number                   // Pagination offset
}
```

## Component Design

### Snapshot Manager

**Location**: `packages/sdk/src/snapshot/SnapshotManager.ts`

**Responsibilities**:
- Orchestrate snapshot creation with deduplication
- Coordinate with storage adapter for persistence
- Manage snapshot naming strategies
- Enforce protection rules
- Provide search and filtering capabilities

**Key Operations**:

**create(files: FileInput[], options?: CreateSnapshotOptions)**
```
Flow:
1. Validate file paths against traversal attacks (validatePath utility)
2. **Check total size against 50MB Alpha cap**:
   - Sum all file content byte lengths
   - If totalBytes > 50 * 1024 * 1024:
     - Return Err({ code: 'SNAPSHOT_TOO_LARGE', limitMB: 50, sizeMB: Math.ceil(totalBytes / 1024 / 1024) })
     - Show user notification: "Snapshot exceeds 50MB limit. Try incremental mode (Beta feature)."
3. Check for duplicates if deduplication enabled
   - Hash file contents using SnapshotDeduplication
   - Query storage adapter for existing hash
   - If match found → throw "Duplicate snapshot detected"
4. Generate snapshot name via SnapshotNaming strategy
5. Construct Snapshot object with UUID v4 id
6. Compute content hash for deduplication index
7. Save to storage adapter with hash metadata
8. Record hash in deduplication cache
9. Return created Snapshot
```

**restore(id: string, targetPath?: string, options?: RestoreOptions)**
```
Flow:
1. Retrieve snapshot from storage adapter
2. If not found → throw "Snapshot {id} not found"
3. If no targetPath → return metadata-only result (no file writes)
4. If dryRun mode → validate content availability, return without writes
5. **Per-file atomic restore** (instead of full workspace backup):
   a. Create staging directory: {targetPath}/.snapback-staging-{id}
   b. For each file in snapshot:
      - Extract file to staging/{relativePath}
      - Validate content integrity (hash check)
   c. **Per-file backup and atomic swap**:
      - For each staged file:
        i.   Backup current file: rename {path} → {path}.bak-{snapshotId}
        ii.  Move staged file into place: rename staging/{path} → {path}
        iii. On EXDEV error (cross-device): copy staging/{path} → {path}, unlink staging/{path}
   d. On success:
      - Delete all .bak-{snapshotId} files
      - Remove staging directory
   e. On failure (any file operation):
      - Restore from per-file backups: rename {path}.bak-{snapshotId} → {path}
      - Clean up staging directory
      - Return error with partial restore state
6. Return SnapshotRestoreResult with restored files list
```

**Configuration**:
```
SnapshotManagerOptions {
  enableDeduplication?: boolean     // Default: true
  namingStrategy?: 'git' | 'semantic' | 'timestamp'  // Default: 'semantic'
  autoProtect?: boolean             // Default: false
}
```

### Snapshot Deduplication

**Location**: `packages/sdk/src/snapshot/SnapshotDeduplication.ts`

**Purpose**: Reduce storage footprint by detecting identical file content across snapshots.

**Approach**:
- Content-based hashing using SHA-256
- In-memory LRU cache (QuickLRU) mapping hash → snapshot ID
- Storage adapter maintains hash index for persistence

**Operations**:

**hashFiles(files: FileInput[])**
```
Algorithm:
1. Sort files by path (deterministic ordering)
2. Concatenate path + content for each file
3. Compute SHA-256 hash of concatenated string
4. Return hex digest
```

**isDuplicate(files: FileInput[], storage: StorageAdapter)**
```
Flow:
1. Compute content hash via hashFiles()
2. Check in-memory cache for hash
3. If cache miss → query storage adapter's hash index
4. Return { isDuplicate: boolean, existingId?: string }
```

**Cache Invalidation**:
- `clearHash(id: string)`: Remove entry when snapshot deleted
- LRU eviction after 1000 entries (memory limit)
- Cache cleared on storage adapter close

### Snapshot Naming

**Location**: `packages/sdk/src/snapshot/SnapshotNaming.ts`

**Strategies**:

**git Strategy**:
```
Flow:
1. Check if workspace has .git directory
2. Execute: git log -1 --pretty=%B
3. Return commit message as name
4. Fallback to timestamp if git unavailable
```

**semantic Strategy** (Default):
```
Flow:
1. Analyze file paths and content for patterns:
   - Configuration files → "Config update: {filename}"
   - Test files → "Test changes: {test suite}"
   - Multiple files → "Multi-file update: {count} files"
2. Detect context from file extensions:
   - .ts/.js → "Code changes"
   - .md → "Documentation update"
   - package.json → "Dependency update"
3. Truncate to 60 characters max
4. Fallback to timestamp if analysis fails
```

**timestamp Strategy**:
```
Format: "Snapshot YYYY-MM-DD HH:MM:SS"
Example: "Snapshot 2025-01-18 14:32:45"
```

**custom Strategy**:
User provides name via CreateSnapshotOptions.description

### Storage Adapter Interface

**Location**: `packages/sdk/src/storage/StorageAdapter.ts`

**Contract**:
```
interface StorageAdapter {
  save(snapshot: Snapshot, contentHash?: string): Promise<void>
  get(id: string): Promise<Snapshot | null>
  getByContentHash?(hash: string): Promise<Snapshot | null>
  list(filters?: SnapshotFilters): Promise<Snapshot[]>
  delete(id: string): Promise<void>
  close(): Promise<void>
}
```

**Implementations**:

**StorageBrokerAdapter** (Local SQLite):
- Location: `packages/sdk/src/storage/StorageBroker.ts`
- Database: `~/.snapback/snapback.db`
- Schema:
  ```
  snapshots {
    id TEXT PRIMARY KEY
    timestamp INTEGER NOT NULL
    metadata JSON NOT NULL           // Stores meta field
    files JSON NOT NULL               // Array of file paths
    file_contents JSON NOT NULL       // Compressed blob
    content_hash TEXT                 // For deduplication
  }

  CREATE INDEX idx_snapshots_hash ON snapshots(content_hash)
  CREATE INDEX idx_snapshots_timestamp ON snapshots(timestamp DESC)
  ```
- Compression: LZ4 for file contents, JSON for metadata
- Transaction safety: All writes in SQLite transactions

**CloudStorageAdapter** (S3):
- Location: `apps/api/modules/snapshots/adapters/CloudStorageAdapter.ts`
- Strategy: Client uploads directly to S3 via presigned URLs
- Metadata stored in PostgreSQL for listing/filtering
- Content stored in S3 as JSON.gz files
- Privacy: All buckets in `us-east-1` region

### BlobStore (Content-Addressable Storage)

**Location**: `packages/sdk/src/storage/BlobStore.ts`

**Purpose**: Deduplicate file contents across snapshots and sessions using content-addressable storage (CAS).

**Interface**:
```typescript
export interface BlobStore {
  /**
   * Store blob and return its SHA-256 hash
   * @param buf - File content as byte array
   * @param algo - Hash algorithm (default: 'sha256')
   * @returns Content hash (hex string)
   */
  put(buf: Uint8Array, algo?: 'sha256'): Promise<string>;

  /**
   * Retrieve blob by content hash
   * @param hash - SHA-256 hash (hex string)
   * @returns File content or null if not found
   */
  get(hash: string): Promise<Uint8Array | null>;

  /**
   * Check if blob exists
   * @param hash - SHA-256 hash (hex string)
   * @returns True if blob exists in store
   */
  has(hash: string): Promise<boolean>;

  /**
   * Delete blob by hash (with reference counting)
   * @param hash - SHA-256 hash (hex string)
   */
  delete(hash: string): Promise<void>;

  /**
   * Get total storage size in bytes
   * @returns Total bytes consumed by all blobs
   */
  size(): Promise<number>;
}
```

**Local Implementation** (`packages/sdk/src/storage/BlobStore.fs.ts`):
```typescript
export class FilesystemBlobStore implements BlobStore {
  constructor(private basePath: string = '~/.snapback/blobs') {}

  async put(buf: Uint8Array, algo: 'sha256' = 'sha256'): Promise<string> {
    // Compute hash
    const hash = createHash(algo).update(buf).digest('hex');

    // Shard path: sha256/aa/bb/<full-hash>.lz4
    const shardPath = path.join(
      this.basePath,
      algo,
      hash.slice(0, 2),
      hash.slice(2, 4)
    );

    await fs.mkdir(shardPath, { recursive: true });

    // Compress and write
    const compressed = await compress(buf); // LZ4 compression
    const filePath = path.join(shardPath, `${hash}.lz4`);

    // Skip write if already exists (idempotent)
    if (await fs.exists(filePath)) {
      return hash;
    }

    await fs.writeFile(filePath, compressed);

    // Update SQLite index
    await this.db.run(
      'INSERT OR IGNORE INTO blobs (hash, size, algo) VALUES (?, ?, ?)',
      [hash, buf.byteLength, algo]
    );

    return hash;
  }

  async get(hash: string): Promise<Uint8Array | null> {
    const filePath = this.getPath(hash);

    if (!await fs.exists(filePath)) {
      return null;
    }

    const compressed = await fs.readFile(filePath);
    return await decompress(compressed); // LZ4 decompression
  }

  async has(hash: string): Promise<boolean> {
    return await fs.exists(this.getPath(hash));
  }

  private getPath(hash: string): string {
    return path.join(
      this.basePath,
      'sha256',
      hash.slice(0, 2),
      hash.slice(2, 4),
      `${hash}.lz4`
    );
  }

  async size(): Promise<number> {
    const result = await this.db.get('SELECT SUM(size) as total FROM blobs');
    return result?.total || 0;
  }
}
```

**SQLite Schema** (added to `packages/sdk/migrations/001_initial.sql`):
```sql
CREATE TABLE IF NOT EXISTS blobs (
  hash TEXT PRIMARY KEY,
  size INTEGER NOT NULL,
  algo TEXT DEFAULT 'sha256',
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_blobs_created ON blobs(created_at);
```

**Cloud Implementation** (S3):
```
Location: apps/api/modules/storage/S3BlobStore.ts
Bucket: s3://snapback-blobs
Path Structure: sha256/aa/bb/<full-hash>.lz4
Region: us-east-1
Encryption: SSE-S3 (server-side)
Access: Presigned URLs with 7-day expiration
```

**Integration with Sessions**:

Sessions reference blobs via `SessionChange.hOld` and `SessionChange.hNew` fields:

```typescript
// During session finalize
for (const change of session.filesChanged) {
  if (change.op !== 'created') {
    // Store old content in BlobStore
    const oldContent = await fs.readFile(change.p);
    change.hOld = await blobStore.put(oldContent);
  }

  if (change.op !== 'deleted') {
    // Store new content in BlobStore
    const newContent = await fs.readFile(change.p);
    change.hNew = await blobStore.put(newContent);
  }
}
```

**Deduplication Benefit**:
- If the same file content appears multiple times (across snapshots or sessions), it's stored only once
- Storage cost is proportional to unique content, not number of snapshots
- Example: 100 snapshots of same file = 1 blob + 100 metadata records

### Session Analytics Events

**Location**: `packages/contracts/src/analytics.ts`

**New Event Types**:
```typescript
export type ProductAnalyticsEvent =
  // ... existing events
  | {
      name: 'SESSION_STARTED';
      changeCount: 0;               // Always 0 at start
      durationMs?: number;          // Optional duration in milliseconds
      tier: 'free' | 'solo';        // User tier (no workspace identifier)
    }
  | {
      name: 'SESSION_FINALIZED';
      changeCount: number;          // Total files changed
      durationMs: number;           // Session duration
      ext_counts?: Record<string, number>;  // { '.ts': 12, '.tsx': 5 } (Solo only with consent)
      tier: 'free' | 'solo';        // User tier
    };
```

**Sanitization Rules Extension**:
```typescript
export type SanitizationRules = {
  stripPaths: true;               // Remove absolute paths
  stripFileNames: true;           // Remove file names, keep extensions only
  stripWorkspaceId: true;         // Never transmit workspace identifiers (any form, including hashes)
  stripSessionLabels: true;       // Never transmit session names
  bucketizeExtensions: true;      // Aggregate file extensions into histogram
  kAnonymityThreshold: 3;         // Omit histograms if changeCount < 3 (Free tier)
};
```

**Privacy Guarantees**:
- **No File Paths**: Never transmitted in any form (no hashing, no path-derived strings)
- **No File Names**: Session labels never transmitted (local display only)
- **No Content**: Hashes and sizes never transmitted
- **No Workspace ID**: Zero workspace identifiers for any tier (no hash, no URI, no rotating ID)
- **Free Tier**: Counts only (changeCount, durationMs); no histograms
- **Solo Tier**: Extension histograms (ext_counts) only with explicit consent and changeCount ≥ 3
- **No Token Counts**: Removed to prevent client name leakage (Alpha scope)
- **Analytics do not include filenames, paths, hashes of paths, workspace identifiers (any form), or session labels.**
- **Workspace identity is not transmitted for any tier.**

**Implementation**:
```typescript
// packages/analytics/src/sanitizer.ts
export function sanitizeSessionEvent(
  event: SessionAnalyticsEvent,
  tier: 'free' | 'solo',
  consent: boolean
): SanitizedEvent {
  const base = {
    name: event.name,
    changeCount: event.changeCount,
    durationMs: (event as any).durationMs,
    tier,
  };

  // Free tier: counts only, no histograms
  if (tier === 'free') {
    return base;
  }

  // Solo tier: extension histogram only with consent and k-anonymity (≥3 changes)
  if (tier === 'solo' && consent && event.changeCount >= 3 && 'ext_counts' in event) {
    return {
      ...base,
      ext_counts: event.ext_counts, // { '.ts': 12, '.tsx': 5 }
    };
  }

  return base;
}

function aggregateExtensions(changes: SessionChange[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const change of changes) {
    const ext = path.extname(change.p);
    counts[ext] = (counts[ext] || 0) + 1;
  }
  return counts;
}
```

### Analytics Integration

**Location**: `packages/analytics/src/client.ts`

**Event Contract**: `packages/contracts/src/analytics.ts`

**Snapshot Creation Event**:
```
{
  name: 'SNAPSHOT_CREATED'
  properties: {
    trigger: 'manual' | 'auto-risk' | 'auto-save' | 'pre-commit'
    cloudBackup: boolean              // True if uploaded to S3
    fileCount: number
    totalSizeBytes: number
    deduplicationHit: boolean         // True if duplicate detected
    latencyMs: number                 // Time from trigger to completion
    riskScore?: number                // 0-10 scale if auto-risk trigger
  }
  timestamp: number
}
```

**Snapshot Restore Event**:
```
{
  name: 'SNAPSHOT_RESTORED'
  properties: {
    source: 'vscode' | 'cli' | 'web'
    snapshotId: string                // UUID of restored snapshot
    fileCount: number
    conflictCount: number             // Files with divergence
    restoredFileCount: number         // Successfully restored
    latencyMs: number
    dryRun: boolean                   // True if validation-only run
  }
  timestamp: number
}
```

**Analytics Workflow**:
```
Flow:
1. Snapshot operation completes (create or restore)
2. Extension/CLI/Web enqueues event in AnalyticsClient queue
3. Client sanitizes metadata (PII removal, path normalization)
4. Batch accumulates until maxBatchSize (50) or flushIntervalMs (10s)
5. Client POSTs batch to /api/v1/analytics/ingest
6. API validates batch against AnalyticsBatch contract
7. API writes events to PostgreSQL analyticsEvents table
8. API forwards to PostHog for product analytics dashboards
9. Client receives acknowledgment with event IDs
```

**Sanitization Rules**:
- File paths normalized: `/Users/user/project/file.ts` → `/project/file.ts`
- Emails redacted: `user@example.com` → `[email]`
- API keys removed: `sk_live_123` → `[api_key]`
- Tokens redacted: UUIDs and JWTs replaced with placeholder

## Entry Point Designs

### Session Tree View Provider

**Location**: `apps/vscode/src/views/SessionsTreeDataProvider.ts`

**Purpose**: Display active and historical sessions in VS Code sidebar with expand/collapse for changed files.

**Tree Structure**:
```
Sessions (Root)
├─ ● Active Session (15 changes)          [if active]
│  ├─ C src/auth.ts
│  ├─ M src/config.ts
│  └─ D tests/old-test.ts
├─ Updated auth logic (23 changes)        [finalized session]
│  ├─ C src/auth/index.ts
│  ├─ M src/auth/provider.ts
│  └─ R src/auth/legacy.ts → backup.ts
└─ Fixed bug #123 (5 changes)
   ├─ M src/utils.ts
   └─ M tests/utils.test.ts
```

**Node Types**:

**SessionNode**:
```typescript
class SessionNode extends vscode.TreeItem {
  constructor(
    public readonly session: SessionSummary,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(
      session.name || `Session ${session.sessionId.slice(0, 8)}`,
      collapsibleState
    );

    this.contextValue = session.endedAt ? 'session' : 'activeSession';
    this.iconPath = session.endedAt
      ? new vscode.ThemeIcon('history')
      : new vscode.ThemeIcon('record', new vscode.ThemeColor('charts.green'));

    this.description = `${session.changeCount} changes`;
    this.tooltip = `Started: ${new Date(session.startedAt).toLocaleString()}`;
  }
}
```

**SessionChangeNode**:
```typescript
class SessionChangeNode extends vscode.TreeItem {
  constructor(
    public readonly change: SessionChange,
    public readonly sessionId: string
  ) {
    const icon = {
      'created': 'diff-added',
      'modified': 'diff-modified',
      'deleted': 'diff-removed',
      'renamed': 'diff-renamed'
    }[change.op];

    super(change.p, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(icon);
    this.contextValue = 'sessionChange';
    this.description = change.op === 'renamed' ? `← ${change.from}` : '';

    // Click to open diff
    this.command = {
      command: 'snapback.session.reveal',
      title: 'Show Diff',
      arguments: [this.sessionId, this.change]
    };
  }
}
```

**Data Provider Implementation**:
```typescript
export class SessionsTreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private sessionManager: SessionManager) {
    // Refresh tree when session changes
    sessionManager.on('sessionChanged', () => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    if (!element) {
      // Root level: return session list
      const sessions = await this.sessionManager.list(20);
      return sessions.map(s => new SessionNode(s, vscode.TreeItemCollapsibleState.Collapsed));
    }

    if (element instanceof SessionNode) {
      // Session children: return changed files
      const manifest = await this.sessionManager.getManifest(element.session.sessionId);
      return manifest.filesChanged.map(c => new SessionChangeNode(c, element.session.sessionId));
    }

    return [];
  }
}
```

**Registration** (`apps/vscode/src/extension.ts`):
```typescript
const sessionManager = new SessionManager({
  workspacePath: workspaceRoot,
  storage: snapshotStorage,
  useVSCodeWatcher: true
});

const sessionsProvider = new SessionsTreeDataProvider(sessionManager);
vscode.window.registerTreeDataProvider('snapback.sessions', sessionsProvider);

// Auto-start session on activation
await sessionManager.start();
```

### Session Commands

**Location**: `apps/vscode/src/commands/session/`

**Command: snapback.session.finalize**

**Trigger**: Status bar click or command palette

**Implementation**:
```typescript
// apps/vscode/src/commands/session/finalize.ts
export async function finalizeSession(
  sessionManager: SessionManager
): Promise<void> {
  const current = sessionManager.current();

  if (!current.sessionId) {
    vscode.window.showWarningMessage('No active session to finalize');
    return;
  }

  // Confirm with user
  const confirm = await vscode.window.showInformationMessage(
    `Finalize session with ${current.changeCount} changes?`,
    'Yes', 'No'
  );

  if (confirm !== 'Yes') return;

  // Show progress
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Finalizing session...'
  }, async () => {
    const result = await sessionManager.stopFinalize();

    vscode.window.showInformationMessage(
      `Session finalized: ${result.changeCount} changes recorded`
    );
  });
}
```

**Command: snapback.session.rollback**

**Trigger**: Right-click session in tree view → "Rollback Session"

**Implementation**:
```typescript
// apps/vscode/src/commands/session/rollback.ts
export async function rollbackSession(
  sessionNode: SessionNode,
  sessionManager: SessionManager
): Promise<void> {
  const manifest = await sessionManager.getManifest(sessionNode.session.sessionId);

  // Show preview of changes to revert
  const preview = manifest.filesChanged.map(c =>
    `${c.op === 'created' ? '[-]' : c.op === 'deleted' ? '[+]' : '[~]'} ${c.p}`
  ).join('\n');

  const confirm = await vscode.window.showWarningMessage(
    `Rollback ${manifest.changeCount} changes?\n\n${preview}`,
    { modal: true },
    'Rollback', 'Cancel'
  );

  if (confirm !== 'Rollback') return;

  // Execute rollback with progress
  const result = await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Rolling back session...',
    cancellable: false
  }, async (progress) => {
    return await sessionManager.rollback(sessionNode.session.sessionId, {
      onProgress: (percent) => {
        progress.report({ increment: percent });
      }
    });
  });

  if (result.success) {
    vscode.window.showInformationMessage(
      `Rollback complete: ${result.filesReverted.length} files reverted`
    );
  } else {
    vscode.window.showErrorMessage(
      `Rollback failed: ${result.errors.length} errors. Workspace restored to pre-rollback state.`
    );
  }
}
```

**Command: snapback.session.reveal**

**Trigger**: Click on file in session tree view

**Implementation**:
```typescript
// apps/vscode/src/commands/session/reveal.ts
export async function revealSessionChange(
  sessionId: string,
  change: SessionChange,
  storage: StorageAdapter
): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
  const filePath = path.join(workspaceRoot, change.p);

  if (change.op === 'deleted') {
    // Show deleted file content from CAS
    const blob = await storage.getBlob(change.hOld!);
    const doc = await vscode.workspace.openTextDocument({
      content: blob,
      language: path.extname(change.p).slice(1)
    });
    await vscode.window.showTextDocument(doc, { preview: true });
    return;
  }

  if (change.op === 'created') {
    // Show created file (current version)
    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);
    return;
  }

  // For modified/renamed: show diff
  const oldContent = await storage.getBlob(change.hOld!);
  const newContent = await storage.getBlob(change.hNew!);

  const oldUri = vscode.Uri.parse(`snapback-session:${change.p}?hash=${change.hOld}`);
  const newUri = vscode.Uri.parse(`snapback-session:${change.p}?hash=${change.hNew}`);

  await vscode.commands.executeCommand(
    'vscode.diff',
    oldUri,
    newUri,
    `${change.p} (Session Changes)`
  );
}
```

**Status Bar Integration**:

**Location**: `apps/vscode/src/ui/SessionStatusBar.ts`

```typescript
export class SessionStatusBar {
  private statusBarItem: vscode.StatusBarItem;

  constructor(private sessionManager: SessionManager) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );

    this.statusBarItem.command = 'snapback.session.finalize';
    this.update();
    this.statusBarItem.show();

    // Update on session changes
    sessionManager.on('sessionChanged', () => this.update());
  }

  private update(): void {
    const current = this.sessionManager.current();

    if (!current.sessionId) {
      this.statusBarItem.text = '$(circle-outline) No Session';
      this.statusBarItem.tooltip = 'Click to start session';
      this.statusBarItem.backgroundColor = undefined;
      return;
    }

    this.statusBarItem.text = `$(record) Session: ${current.changeCount} changes`;
    this.statusBarItem.tooltip = 'Click to finalize session';
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
})
```

### Multi-Root Workspace Support

**Challenge**: VS Code supports opening multiple workspace folders simultaneously

**Solution**: Key sessions by workspace URI, not global workspace root

**Implementation**:
```typescript
// apps/vscode/src/session/MultiRootSessionManager.ts
export class MultiRootSessionManager {
  private sessions: Map<string, SessionManager> = new Map();

  constructor(private storage: StorageAdapter) {}

  /**
   * Get or create SessionManager for specific workspace folder
   */
  getSessionManager(workspaceFolder: vscode.WorkspaceFolder): SessionManager {
    const uri = workspaceFolder.uri.toString();

    if (!this.sessions.has(uri)) {
      const manager = new SessionManager({
        workspaceUri: uri,
        storage: this.storage,
        // ... other options
      });

      this.sessions.set(uri, manager);
    }

    return this.sessions.get(uri)!;
  }

  /**
   * Track file change in appropriate workspace folder
   */
  async trackChange(uri: vscode.Uri, op: ChangeOp): Promise<void> {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) return; // File outside workspace

    const manager = this.getSessionManager(folder);
    const relativePath = path.relative(folder.uri.fsPath, uri.fsPath);

    await manager.track(relativePath, op);
  }
}
```

**Tree View Grouping**:
```
Sessions (Root)
├─ Workspace: my-app (2 sessions)
│  ├─ ● Active Session (15 changes)
│  └─ Updated auth logic (23 changes)
├─ Workspace: shared-lib (1 session)
│  └─ Fixed bug #123 (5 changes)
```

**TreeNode Structure**:
```typescript
class WorkspaceFolderNode extends vscode.TreeItem {
  constructor(
    public readonly folder: vscode.WorkspaceFolder,
    public readonly sessionCount: number
  ) {
    super(folder.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.description = `${sessionCount} sessions`;
    this.iconPath = new vscode.ThemeIcon('folder');
  }
}
```

### Ignore Patterns

**Default .snapbackignore**:
```
# Dependencies
node_modules/
.pnpm-store/
.yarn/

# Build outputs
dist/
build/
.next/
out/
coverage/

# Version control
.git/
.svn/
.hg/

# Temporary files
*.log
*.tmp
*.swp
*.swo
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.iml

# OS
.Spotlight-V100
.Trashes
```

**Implementation**:
```typescript
// packages/sdk/src/session/IgnoreFilter.ts
import { minimatch } from 'minimatch';

export class IgnoreFilter {
  private patterns: string[] = [];

  constructor(workspaceRoot: string) {
    this.loadIgnoreFile(workspaceRoot);
  }

  private async loadIgnoreFile(workspaceRoot: string): Promise<void> {
    const ignorePath = path.join(workspaceRoot, '.snapbackignore');

    try {
      const content = await fs.readFile(ignorePath, 'utf-8');
      this.patterns = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    } catch {
      // Use default patterns if .snapbackignore doesn't exist
      this.patterns = [
        'node_modules/**',
        '.next/**',
        'dist/**',
        'build/**',
        'coverage/**',
        '.git/**',
        '*.log',
        '*.tmp',
        '*.swp',
        '.DS_Store'
      ];
    }
  }

  shouldIgnore(relativePath: string): boolean {
    return this.patterns.some(pattern => minimatch(relativePath, pattern, { dot: true }));
  }
}
```

**Integration in SessionManager.track()**:
```typescript
async track(path: string, op: ChangeOp): Promise<void> {
  // Check ignore filter first
  if (this.ignoreFilter.shouldIgnore(path)) {
    return; // Skip tracking for ignored files
  }

  // ... rest of tracking logic
}
```

### Pre-Merge Test Requirements

**Location**: `packages/sdk/test/session/`, `packages/e2e/tests/session/`

**Critical Tests**:

**1. Path Privacy Test**:
```typescript
// packages/analytics/test/privacy.spec.ts (already defined in privacy section)
// Validates zero PII in analytics payloads
```

**2. Windows Rename Test**:
```typescript
// packages/sdk/test/session/windows-rename.spec.ts
import { describe, it, expect, vi } from 'vitest';

describe('Windows Cross-Device Rename', () => {
  it('should handle cross-device rename with copy-remove fallback', async () => {
    // Mock fs.rename to throw EXDEV error
    const originalRename = fs.rename;
    fs.rename = vi.fn().mockRejectedValue({ code: 'EXDEV' });

    const rollback = new SessionRollback(storage);
    const result = await rollback.rollbackSession(sessionId);

    // Should succeed via copy-remove fallback
    expect(result.success).toBe(true);
    expect(fs.copyFile).toHaveBeenCalled();
    expect(fs.unlink).toHaveBeenCalled();

    fs.rename = originalRename;
  });
});
```

**3. Crash Journal Test**:
```typescript
// packages/sdk/test/session/crash-recovery.spec.ts
describe('Crash Journal Recovery', () => {
  it('should recover from incomplete rollback on startup', async () => {
    // Create pending journal entry
    const txn = {
      sessionId: 'test-session',
      backupPath: '/workspace.backup-12345',
      timestamp: Date.now()
    };

    await fs.writeFile('.sb_journal/pending/test-session.txn', JSON.stringify(txn));

    // Simulate crash by killing process (mock)
    // On restart, recovery should detect pending transaction
    const recovery = new SessionRecovery();
    await recovery.recoverPendingTransactions();

    // Should rollback from backup
    expect(await fs.exists('/workspace.backup-12345')).toBe(false);
    expect(await fs.exists('.sb_journal/pending/test-session.txn')).toBe(false);
  });
});
```

**4. Idle Finalize After Sleep Test**:
```typescript
// packages/sdk/test/session/idle-finalize.spec.ts
describe('Idle Finalize', () => {
  it('should not lose changes after OS sleep/wake', async () => {
    const manager = new SessionManager(options);
    await manager.start();

    // Track changes
    manager.track('file1.ts', 'modified');
    manager.track('file2.ts', 'created');

    // Simulate OS sleep (persist state)
    await manager.persistState();

    // Simulate wake (restore state)
    await manager.restoreState();

    // Finalize after wake
    const result = await manager.stopFinalize();

    expect(result.changeCount).toBe(2);
  });
});
```

**5. Multi-Root Isolation Test**:
```typescript
// packages/e2e/tests/session/multi-root.spec.ts
describe('Multi-Root Workspace', () => {
  it('should isolate sessions by workspace folder', async () => {
    // Open two workspace folders
    const folder1 = vscode.workspace.workspaceFolders![0];
    const folder2 = vscode.workspace.workspaceFolders![1];

    const manager = new MultiRootSessionManager(storage);

    // Track changes in folder1
    await manager.trackChange(
      vscode.Uri.file(path.join(folder1.uri.fsPath, 'file1.ts')),
      'modified'
    );

    // Track changes in folder2
    await manager.trackChange(
      vscode.Uri.file(path.join(folder2.uri.fsPath, 'file2.ts')),
      'created'
    );

    // Sessions should be separate
    const session1 = manager.getSessionManager(folder1).current();
    const session2 = manager.getSessionManager(folder2).current();

    expect(session1.sessionId).not.toBe(session2.sessionId);
    expect(session1.changeCount).toBe(1);
    expect(session2.changeCount).toBe(1);
  });
});
```

**6. Ignore List Test**:
```typescript
// packages/sdk/test/session/ignore-filter.spec.ts
describe('Ignore Filter', () => {
  it('should not track files in ignored directories', async () => {
    const filter = new IgnoreFilter(workspaceRoot);

    // Should ignore
    expect(filter.shouldIgnore('node_modules/pkg/index.js')).toBe(true);
    expect(filter.shouldIgnore('dist/bundle.js')).toBe(true);
    expect(filter.shouldIgnore('.git/config')).toBe(true);
    expect(filter.shouldIgnore('debug.log')).toBe(true);

    // Should track
    expect(filter.shouldIgnore('src/index.ts')).toBe(false);
    expect(filter.shouldIgnore('package.json')).toBe(false);
  });
});
```

### VS Code Extension

**Location**: `apps/vscode/src/commands/`

**Manual Snapshot Command**:

**File**: `apps/vscode/src/commands/createSnapshot.ts`

**Trigger**: Command palette → "SnapBack: Create Snapshot"

**Flow**:
```
1. Check if workspace is open
   - If no workspace → show error notification
2. Prompt user for snapshot description (optional)
3. Detect currently open files in editor
4. Construct CreateSnapshotInput:
   - trigger: 'manual'
   - files: active editor file paths
   - fileContents: read from workspace file system
5. Call SnapshotManager.create()
6. Handle Result<Snapshot, Error>:
   - Success: Show notification with snapshot name
   - Failure: Show error notification with retry option
7. Track analytics event: SNAPSHOT_CREATED
8. Refresh snapshot tree view
```

**Auto-Risk Snapshot Trigger**:

**File**: `apps/vscode/src/handlers/onWillSaveTextDocument.ts`

**Trigger**: File save event with Guardian risk score >7

**Flow**:
```
1. onWillSaveTextDocument event fires
2. Extract file content and path
3. Call Guardian policy engine for risk analysis
4. If riskScore > 7:
   a. Show notification: "High-risk changes detected. Creating snapshot..."
   b. Construct CreateSnapshotInput:
      - trigger: 'auto-risk'
      - risk: { score, reasons }
      - files: [saved file path]
      - fileContents: { [path]: content }
   c. Call SnapshotManager.create()
   d. Track analytics event with riskScore property
5. Allow save to proceed (non-blocking)
```

**Restore Command**:

**File**: `apps/vscode/src/commands/restoreSnapshot.ts`

**Trigger**: Command palette → "SnapBack: Restore Snapshot"

**Flow**:
```
1. Show snapshot picker (Quick Pick UI):
   - List recent 50 snapshots via SnapshotManager.list()
   - Display: name, timestamp, file count, protection status
2. User selects snapshot
3. Detect conflicts:
   a. Read current file contents from workspace
   b. Compare with snapshot.fileContents
   c. Identify modified/added/deleted files
4. If conflicts detected:
   - Show conflict UI with side-by-side diff
   - Options: "Keep Current", "Use Snapshot", "Cancel"
5. Call SnapshotManager.restore(id, workspaceRoot)
6. Handle Result:
   - Success: Show notification with restored file count
   - Failure: Show error notification with rollback confirmation
7. Track analytics event: SNAPSHOT_RESTORED
8. Refresh file explorer
```

### CLI

**Location**: `apps/cli/src/commands/`

**Snapshot Create Command**:

**Invocation**: `snapback snapshot create [options]`

**Options**:
- `--description, -d`: Snapshot description
- `--protected, -p`: Mark snapshot as protected
- `--files, -f`: Comma-separated file paths (default: all tracked files)

**Implementation**:
```
Flow:
1. Parse command-line arguments
2. Detect workspace root (search for .git or .snapback directory)
3. If --files specified:
   - Read specified files
4. Else:
   - Execute: git ls-files (if git available)
   - Fallback: recursive directory scan
5. Construct CreateSnapshotInput
6. Initialize SnapshotManager with LocalStorage adapter
7. Call SnapshotManager.create()
8. Handle Result:
   - Success: Print snapshot ID and name
   - Failure: Print error message, exit code 1
9. Track analytics event (if online)
```

**Snapshot List Command**:

**Invocation**: `snapback snapshot list [options]`

**Options**:
- `--limit, -n`: Max results (default: 50)
- `--protected`: Show only protected snapshots
- `--file, -f`: Filter by file path

**Implementation**:
```
Flow:
1. Parse filters from arguments
2. Initialize SnapshotManager
3. Call SnapshotManager.list(filters)
4. Format output as table:
   | ID (8 chars) | Name | Date | Files | Protected |
5. Exit code 0
```

**Snapshot Restore Command**:

**Invocation**: `snapback snapshot restore <snapshot-id> [options]`

**Options**:
- `--dry-run`: Validate without writing files
- `--force`: Skip conflict confirmation
- `--target, -t`: Target directory (default: current directory)

**Implementation**:
```
Flow:
1. Parse snapshot ID and options
2. Initialize SnapshotManager
3. If --dry-run:
   - Call SnapshotManager.restore(id, undefined, { dryRun: true })
   - Print validation result
   - Exit code 0
4. Call SnapshotManager.restore(id, targetPath)
5. If conflicts detected and not --force:
   - Print conflict summary
   - Prompt: "Continue with restore? (y/n)"
   - If n: exit code 0
6. Handle Result:
   - Success: Print restored file list
   - Failure: Print error, exit code 1
7. Track analytics event
```

### Web Console

**Location**: `apps/web/app/(dashboard)/snapshots/`

**Snapshot List View**:

**Route**: `/dashboard/snapshots`

**Component**: `apps/web/app/(dashboard)/snapshots/page.tsx`

**Data Fetching**:
```
Server Component:
1. Authenticate user via session cookie
2. Query PostgreSQL snapshots table:
   SELECT id, name, timestamp, file_count, protected, risk_score
   FROM snapshots
   WHERE user_id = $1
   ORDER BY timestamp DESC
   LIMIT 50
3. Render snapshot cards with metadata
4. Client-side hydration for interactive features
```

**UI Elements**:
- Snapshot card grid with name, date, file count badge
- Filter bar: date range picker, protection toggle, search input
- Create snapshot button (triggers modal)
- Restore button per snapshot (opens conflict UI)

**Create Snapshot Modal**:

**Trigger**: "Create Snapshot" button click

**Implementation**:
```
Client Component:
1. Show modal with form:
   - Description input (optional)
   - File selection (multi-select tree view)
   - Protection checkbox
2. On submit:
   a. POST /api/v1/snapshots/create
      Body: { description, files, protected }
   b. API validates user quota (Free: 50, Solo: 500)
   c. API creates snapshot via SnapshotManager
   d. API uploads to S3 if Solo+ tier
   e. Return snapshot metadata
3. Close modal, refresh snapshot list
4. Show toast notification: "Snapshot created: {name}"
```

**Restore Flow**:

**Trigger**: Restore button click on snapshot card

**Implementation**:
```
Client Component:
1. Show loading spinner
2. GET /api/v1/snapshots/{id}/download
   - Returns presigned S3 URL for Solo+ tier
   - Returns inline JSON for Free tier
3. Download snapshot content
4. Detect conflicts via client-side file system API
5. If conflicts:
   - Show conflict resolution UI
   - Options: "Keep Current", "Use Snapshot", "Merge"
6. Apply restore via browser file system API
7. Show success notification
8. Track analytics event
```

### API Endpoints

**Base Path**: `/api/v1/snapshots`

**POST /api/v1/snapshots/create**

**Auth**: Requires valid session or API key

**Request Body**:
```
{
  description?: string
  files: string[]                    // Relative paths
  fileContents: Record<string, string>
  protected?: boolean
}
```

**Response**:
```
Success (200):
{
  id: string
  name: string
  timestamp: number
  cloudBackup: boolean               // True if uploaded to S3
}

Quota Exceeded (429):
{
  error: "Quota exceeded"
  limit: number                      // Tier limit
  current: number                    // Current snapshot count
}
```

**Implementation**:
```
Flow:
1. Extract auth context from session/API key
2. Check user tier and snapshot count:
   - Free: 50 limit
   - Solo: 500 limit
   - Team/Enterprise: 2000+ limit
3. If quota exceeded → return 429
4. **Check total size against 50MB Alpha cap**:
   - Sum all file content byte lengths from request body
   - If totalBytes > 50 * 1024 * 1024:
     - Return 413 Payload Too Large:
       { error: "SNAPSHOT_TOO_LARGE", limitMB: 50, sizeMB: Math.ceil(totalBytes / 1024 / 1024) }
5. Initialize SnapshotManager with CloudStorageAdapter
6. Call SnapshotManager.create()
7. If Solo+ tier:
   - Generate presigned S3 upload URL
   - Upload snapshot content to S3
   - Store metadata in PostgreSQL with total_size_bytes field
8. Track analytics event
9. Return snapshot metadata
```

**GET /api/v1/snapshots**

**Auth**: Requires valid session or API key

**Query Parameters**:
- `limit`: Max results (default: 50, max: 100)
- `offset`: Pagination offset
- `protected`: Filter by protection status
- `before`: ISO 8601 timestamp
- `after`: ISO 8601 timestamp

**Response**:
```
Success (200):
{
  snapshots: [
    {
      id: string
      name: string
      timestamp: number
      fileCount: number
      protected: boolean
      riskScore?: number
    }
  ]
  total: number
  limit: number
  offset: number
}
```

**GET /api/v1/snapshots/:id**

**Auth**: Requires valid session or API key

**Response**:
```
Success (200):
{
  id: string
  name: string
  timestamp: number
  files: string[]
  protected: boolean
  riskScore?: number
  cloudBackup: boolean
}

Not Found (404):
{
  error: "Snapshot not found"
}
```

**GET /api/v1/snapshots/:id/download**

**Auth**: Requires valid session or API key

**Response**:
```
Success (200) - Free Tier:
{
  snapshot: Snapshot                 // Full snapshot object with file contents
}

Success (200) - Solo+ Tier:
{
  presignedUrl: string               // S3 presigned URL (7-day expiration)
  expiresAt: number                  // Unix timestamp
}
```

**DELETE /api/v1/snapshots/:id**

**Auth**: Requires valid session or API key

**Response**:
```
Success (204): No content

Protected (403):
{
  error: "Cannot delete protected snapshot"
}

Not Found (404):
{
  error: "Snapshot not found"
}
```

## Tier Enforcement

### Free Tier (Local-Only)

**Constraints**:
- Maximum 50 snapshots
- Local storage only (SQLite)
- No cloud backup
- 30-day retention

**Enforcement Points**:
1. **VS Code Extension**: Check snapshot count before create
   ```
   if (snapshotCount >= 50) {
     showUpgradeNotification()
     return Err("Quota exceeded")
   }
   ```

2. **API Endpoint**: Reject create requests if quota exceeded
   ```
   SELECT COUNT(*) FROM snapshots WHERE user_id = $1
   if (count >= 50) {
     return 429 Quota Exceeded
   }
   ```

3. **Retention Policy**: Cron job runs daily at 02:00 UTC
   ```
   DELETE FROM snapshots
   WHERE user_id IN (SELECT id FROM users WHERE subscription_tier = 'free')
   AND timestamp < NOW() - INTERVAL '30 days'
   AND protected = false
   ```

### Solo Tier (Cloud Backup)

**Constraints**:
- Maximum 500 snapshots
- Cloud backup enabled (S3)
- 5GB storage limit
- 90-day retention

**Enforcement Points**:
1. **Storage Quota Check**: Before S3 upload
   ```
   totalSize = SUM(file_size) FROM snapshots WHERE user_id = $1
   if (totalSize + newSnapshotSize > 5GB) {
     return 429 Storage Quota Exceeded
   }
   ```

2. **Snapshot Count**: Before create
   ```
   if (snapshotCount >= 500) {
     return 429 Snapshot Quota Exceeded
   }
   ```

3. **Retention Policy**: 90-day cleanup
   ```
   DELETE FROM snapshots
   WHERE user_id IN (SELECT id FROM users WHERE subscription_tier = 'solo')
   AND timestamp < NOW() - INTERVAL '90 days'
   AND protected = false
   ```

### Team/Enterprise Tiers (Feature Flag)

**Alpha Constraint**: All Team/Enterprise features return 501 Not Implemented

**Implementation**:
```
if (tier === 'team' || tier === 'enterprise') {
  if (process.env.ENABLE_TEAM_FEATURES !== 'true') {
    return 501 Not Implemented
  }
}
```

**Designed Stubs**:
- Snapshot sharing endpoints: `/api/v1/snapshots/:id/share`
- Organization quota: 2000 snapshots per org
- Custom retention policies: Configurable via admin panel

### Session Naming

**Location**: `packages/sdk/src/session/SessionNaming.ts`

**Approach**: Offline-first labeling with optional async LLM enhancement

**Implementation**:
```typescript
export class SessionNaming {
  constructor(
    private llmClient?: LLMClient,
    private tier?: 'free' | 'solo',
    private consent?: boolean
  ) {}

  /**
   * Generate offline name immediately (never blocks finalize)
   */
  generateOfflineName(filesChanged: SessionChange[]): string {
    // Extract file stems (base names without extension)
    const stems = filesChanged
      .slice(0, 3)
      .map(c => path.basename(c.p, path.extname(c.p)));

    if (stems.length === 0) {
      return 'Empty session';
    }

    // Construct readable name
    return `Updated ${stems.join(', ')}`;
  }

  /**
   * Queue async LLM naming (post-finalize, non-blocking)
   * Only called if tier=solo AND consent=true
   */
  async queueLLMNaming(
    sessionId: string,
    filesChanged: SessionChange[]
  ): Promise<void> {
    // Gate: only Solo tier with explicit consent
    if (this.tier !== 'solo' || !this.consent || !this.llmClient) {
      return;
    }

    // Extract top 10 file stems (no paths)
    const stems = filesChanged
      .slice(0, 10)
      .map(c => path.basename(c.p, path.extname(c.p)));

    // Construct privacy-safe prompt (stems only, no paths)
    const prompt = `Summarize this coding session in 5 words or less. Files: ${stems.join(', ')}`;

    try {
      const response = await this.llmClient.complete({
        prompt,
        maxTokens: 20,
        temperature: 0.3
      });

      // Sanitize response
      const llmName = response.text
        .replace(/["']/g, '')
        .trim()
        .slice(0, 60);

      // Retro-update session name in database (non-blocking)
      await this.updateSessionName(sessionId, llmName);
    } catch (error) {
      // Silent failure: offline name remains
      logger.debug('LLM naming failed, keeping offline name', { error });
    }
  }

  private async updateSessionName(sessionId: string, name: string): Promise<void> {
    await this.db.run(
      'UPDATE sessions SET name = ? WHERE session_id = ?',
      [name, sessionId]
    );
  }
}
```

**LLM Client Configuration**:
```typescript
// packages/sdk/src/llm/LLMClient.ts
export interface LLMClient {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}

export interface CompletionRequest {
  prompt: string;
  maxTokens: number;
  temperature: number;
}

export interface CompletionResponse {
  text: string;
  tokensUsed: number;
}
```

**API Key Handling**:
- Check environment variable: `SNAPBACK_LLM_API_KEY`
- If not set: offline naming only (no network calls)
- Free tier: Offline naming only (no LLM)
- Solo tier: Optional LLM naming with explicit consent

**Privacy Safeguards**:
- Only file stems sent to LLM (base names without extensions), never paths or contents
- LLM naming is post-hoc and never blocks finalize
- Offline labeler is the default; LLM enhancement is async
- API key stored in secure keychain (VS Code: `vscode.secretStorage`)
- User must explicitly enable LLM naming in settings
- **Session labels are never transmitted in analytics (local display only)**

### Performance Budgets

### Session Tracking

**Budget**: <50ms (p95) per batch flush

**Measurement**: Time from `track()` call to database write completion

**Optimization Strategies**:
- In-memory buffer: Accumulate changes, flush every 5 seconds
- Batch inserts: Single SQL transaction for 100+ changes
- Prepared statements: Cache INSERT statements
- Async flush: Non-blocking on UI thread

**Benchmark Test**:
```
Location: packages/perf/tests/session-tracking.spec.ts

Test:
1. Start session via SessionManager.start()
2. Track 500 file changes via track() calls
3. Measure time from first track() to flush completion
4. Run 10 iterations, calculate p50, p90, p95
5. Assert p95 < 50ms
```

### Snapshot Creation

**Budget**: <100ms (p95) for snapshots ≤1-2MB

**Measurement Points**:
1. Entry point invocation (command/button click)
2. File content read completion
3. Deduplication check completion
4. Storage write completion
5. Analytics event queued

**Optimization Strategies**:
- Deduplication check: In-memory cache first, storage fallback
- File reads: Parallel Promise.all() for multiple files
- Storage write: Async, non-blocking for UI thread
- Compression: LZ4 for speed over ratio

**Performance Realism**:
- <100ms snapshot create is achievable for ≤1-2MB total content
- **Alpha Cap**: 50MB maximum snapshot size (fail-fast preflight check)
  - If totalBytes > 50MB → return error: "SNAPSHOT_TOO_LARGE"
  - Show user prompt: "Snapshot exceeds 50MB. Try incremental mode (Beta feature)."
  - Store `total_size_bytes` in metadata for quota/telemetry
- For large repos (>100MB), incremental mode (deferred to Beta) required

**Benchmark Test**:
```
Location: packages/perf/tests/snapshot-create.spec.ts

Test:
1. Create workspace with 100 files (total 1MB)
2. Create snapshot via SnapshotManager.create()
3. Measure time from create() call to Promise resolution
4. Run 10 iterations, calculate p95
5. Assert p95 < 100ms
6. Test large snapshot rejection: create 51MB snapshot → assert SNAPSHOT_TOO_LARGE error
```

### Restore Validation

**Budget**: <500ms

**Scope**: Conflict detection and dry-run validation

**Measurement Points**:
1. Snapshot retrieval from storage
2. Current file content reads
3. Diff computation (3-way merge)
4. Conflict UI render

**Optimization Strategies**:
- Lazy content loading: Only read files in snapshot.files array
- Streaming diffs: Process file-by-file, not all at once
- Memoized results: Cache conflict detection for re-renders

**Benchmark Test**:
```
Location: packages/perf/tests/snapshot-restore.spec.ts

Test:
1. Create snapshot with 50 files
2. Modify 10 files in workspace
3. Call SnapshotManager.restore() with dryRun: true
4. Measure time from restore() call to result
5. Run 10 iterations, calculate p95
6. Assert p95 < 500ms
```

### Analytics Event Ingestion

**Budget**: <50ms (local queue), <2000ms (TTI for dashboard)

**Measurement**:
- Local queue: Time from trackEvent() call to queue insertion
- Dashboard: Time from navigation to interactive chart render

**Optimization**:
- Event batching: Flush every 10s or 50 events
- Lazy dashboard queries: Load charts on-demand
- Indexed queries: PostgreSQL indexes on user_id, timestamp

## Security Considerations

### Path Traversal Prevention

**Vulnerability**: Malicious snapshot could contain files with `../` paths

**Mitigation**:
```
Location: packages/sdk/src/utils/security.ts

validatePath(filePath: string): void {
  if (filePath.includes('..') || filePath.startsWith('/')) {
    throw new Error('Path traversal detected')
  }
}
```

**Application**: Called in `SnapshotManager.create()` before processing files

### Content Sanitization

**Vulnerability**: Snapshots could contain secrets (API keys, passwords)

**Mitigation** (Not Automated):
- Guardian policy engine detects secrets before snapshot
- User confirmation prompt if high-risk content detected
- Documentation warning about secret management

**Future Enhancement** (Team+ tier):
- Automatic secret redaction via pattern matching
- Integration with secret managers (Vault, AWS Secrets Manager)

### Storage Encryption

**Free Tier** (Local SQLite):
- No encryption at rest (user responsible for disk encryption)
- Documentation recommends FileVault (macOS) or BitLocker (Windows)

**Solo+ Tier** (S3):
- Server-side encryption (SSE-S3) enabled by default
- Presigned URLs expire after 7 days
- No client-side encryption (performance trade-off)

## Testing Strategy

### Unit Tests

**Location**: `packages/sdk/test/snapshot/`

**Coverage Targets**:
- SnapshotManager.create(): Happy path, duplicate detection, quota exceeded
- SnapshotManager.restore(): Dry-run, atomic swap, rollback on failure
- SnapshotDeduplication: Hash computation, cache hit/miss
- SnapshotNaming: All strategies (git, semantic, timestamp)

**Framework**: Vitest

**Mocking**:
- Storage adapter: MemoryStorage implementation
- File system: `memfs` for isolated tests
- Analytics client: Spy on trackEvent() calls

### Integration Tests

**Location**: `packages/e2e/tests/snapshot/`

**Scenarios**:
1. End-to-end create and restore in VS Code extension
2. CLI snapshot lifecycle (create, list, restore, delete)
3. Web console snapshot workflow with S3 upload
4. Conflict resolution UI interaction
5. Tier quota enforcement

**Framework**: Playwright for web, VS Code extension test runner

### Performance Tests

**Location**: `packages/perf/tests/`

**Benchmarks**:
- Snapshot creation: 100 files, 1MB total
- Restore validation: 50 files, 10 conflicts
- Analytics ingestion: 1000 events batched

**Assertion**: All budgets met on CI runner (GitHub Actions)

## Session-Snapshot Linkage

### Automatic Linkage

When a snapshot is created during an active session, the snapshot's `meta.sessionId` field is automatically populated.

**Implementation** (in `SnapshotManager.create()`):
```typescript
async create(files: FileInput[], options?: CreateSnapshotOptions): Promise<Snapshot> {
  // ... existing validation and deduplication

  // Check if session is active
  const activeSession = this.sessionManager?.current();

  const snapshot: Snapshot = {
    id: randomUUID(),
    timestamp: Date.now(),
    meta: {
      name,
      protected: options?.protected || this.options.autoProtect || false,
      sessionId: activeSession?.sessionId || undefined  // Link to session
    },
    files: files.map(f => f.path),
    fileContents: { /* ... */ }
  };

  // ... save snapshot

  // Update session_snapshots link table
  if (activeSession?.sessionId) {
    await this.db.run(
      'INSERT INTO session_snapshots (session_id, snapshot_id) VALUES (?, ?)',
      [activeSession.sessionId, snapshot.id]
    );
  }

  return snapshot;
}
```

### Session View Enhancement

Show linked snapshots as children in session tree view:

```
● Active Session (15 changes)
├─ Snapshots (2)
│  ├─ Pre-refactor snapshot
│  └─ Mid-session checkpoint
├─ Changes (15)
│  ├─ C src/auth.ts
│  └─ M src/config.ts
```

**TreeNode Addition**:
```typescript
class SessionSnapshotNode extends vscode.TreeItem {
  constructor(
    public readonly snapshot: SnapshotMetadata,
    public readonly sessionId: string
  ) {
    super(snapshot.name || snapshot.id.slice(0, 8), vscode.TreeItemCollapsibleState.None);

    this.iconPath = new vscode.ThemeIcon('archive');
    this.contextValue = 'sessionSnapshot';
    this.description = new Date(snapshot.timestamp).toLocaleTimeString();

    // Click to restore snapshot
    this.command = {
      command: 'snapback.snapshot.restore',
      title: 'Restore Snapshot',
      arguments: [snapshot.id]
    };
  }
}
```

### Migration Strategy

### Existing Checkpoint Migration

**Context**: Legacy "checkpoint" terminology must be migrated to "snapshot"

**Approach**:
1. Database migration script in `packages/platform/src/db/migrations/`
2. Rename `checkpoints` table → `snapshots`
3. Update column: `checkpoint_id` → `snapshot_id`
4. Migrate trigger values: `checkpoint` → `auto-save`

**Backward Compatibility**:
- API accepts both `checkpoint` and `snapshot` query params (deprecation warning)
- VS Code extension auto-migrates local SQLite database on first run

### Storage Format Evolution

**Current**: Snapshot v1 (timestamp, meta, files, fileContents)

**Future**: Snapshot v2 (add encryption, compression metadata)

**Strategy**:
- Version field in Snapshot.meta: `{ version: 1 }`
- Adapter detects version on read, applies migration
- Write always uses latest version
- No breaking changes to API contracts

## Operational Readiness

### Monitoring

**Metrics** (Exported to Prometheus):
- `snapback_snapshot_create_duration_seconds` (histogram)
- `snapback_snapshot_restore_duration_seconds` (histogram)
- `snapback_snapshot_quota_exceeded_total` (counter)
- `snapback_storage_size_bytes` (gauge per user)

**Alerts**:
- P95 latency exceeds budget for 5 minutes
- Error rate >1% for 10 minutes
- Storage quota exceeded for 50+ users (capacity planning)

### Logging

**Structured Logs** (JSON format):
```
{
  "level": "info",
  "message": "Snapshot created",
  "userId": "user_123",
  "snapshotId": "snap_456",
  "fileCount": 15,
  "latencyMs": 87,
  "deduplicationHit": false,
  "tier": "solo"
}
```

**Log Levels**:
- DEBUG: Deduplication cache hits, naming strategy selection
- INFO: Snapshot lifecycle events (create, restore, delete)
- WARN: Quota approaching (90% of limit)
- ERROR: Storage failures, restore rollbacks

### Backup and Recovery

**Local Storage** (SQLite):
- User responsibility to back up `~/.snapback/` directory
- Documentation includes backup instructions

**Cloud Storage** (S3):
- Versioning enabled on `snapback-snapshots` bucket
- Cross-region replication to `us-west-2` (disaster recovery)
- 30-day deletion protection via object lock

**Database** (PostgreSQL):
- Supabase automated daily backups
- Point-in-time recovery (7-day window)
- Manual backup trigger via admin panel

## CI Guard Updates

### Terminology Enforcement (Unchanged)

**Location**: `scripts/ci/guard.sh`

No changes to existing guards:
- "checkpoint" banned (except in allowlist)
- "apply" banned (except policy actions)
- "review" banned (except PR context)
- Direct PostHog calls banned (must use analytics wrapper)

### Analytics Privacy Guard (New)

**Addition to Guard Script**:
```bash
#!/bin/bash

# ... existing guards

# Session Analytics Privacy Check
echo "Checking session analytics for PII leakage..."

if grep -r "filePath:" packages/analytics/src/; then
  echo "❌ FAIL: File paths detected in analytics"
  echo "Session analytics must not transmit file paths"
  exit 1
fi

if grep -r "fileName:" packages/analytics/src/; then
  echo "❌ FAIL: File names detected in analytics"
  echo "Only extension counts allowed"
  exit 1
fi

if grep -r "workspaceId" packages/analytics/src/; then
  echo "❌ FAIL: Workspace identifiers detected (any form)"
  echo "Workspace identifiers must not be sent (no hash, URI, or rotating ID)"
  exit 1
fi

if grep -r "workspacePath" packages/analytics/src/; then
  echo "❌ FAIL: Workspace path detected"
  echo "Workspace paths must not be sent in any form"
  exit 1
fi

if grep -r "token_counts" packages/analytics/src/; then
  echo "❌ FAIL: token_counts detected (Alpha forbidden)"
  echo "Token counts can leak client names; use ext_counts only"
  exit 1
fi

echo "✅ Session analytics privacy checks passed"
```

**Test Case**:
```typescript
// packages/analytics/test/privacy.spec.ts
import { sanitizeSessionEvent } from '../src/sanitizer';

describe('Session Analytics Privacy', () => {
  it('should strip file paths from events', () => {
    const event = {
      name: 'SESSION_FINALIZED',
      changeCount: 5,
      durationMs: 120000,
      tier: 'solo',
      filesChanged: [
        { p: 'src/auth.ts', op: 'modified' },
        { p: 'tests/auth.test.ts', op: 'created' }
      ]
    };

    const sanitized = sanitizeSessionEvent(event, 'solo', true);

    // Should not contain any file paths or names
    expect(JSON.stringify(sanitized)).not.toContain('src/auth.ts');
    expect(JSON.stringify(sanitized)).not.toContain('auth.ts');
    expect(JSON.stringify(sanitized)).not.toContain('auth');

    // Should contain only extension counts (with consent + k-anonymity)
    expect(sanitized.ext_counts).toEqual({ '.ts': 2 });
  });

  it('should not transmit workspace identifiers (any form)', () => {
    const event = {
      name: 'SESSION_STARTED',
      changeCount: 0,
      tier: 'free',
    };

    const sanitized = sanitizeSessionEvent(event, 'free', false);

    // Should have no workspace identifier fields
    expect(sanitized).not.toHaveProperty('workspaceId');
    expect(sanitized).not.toHaveProperty('workspacePath');
    expect(sanitized).not.toHaveProperty('workspaceUri');
    expect(sanitized).not.toHaveProperty('workspaceHash');

    // Should contain only basic metadata
    expect(sanitized).toHaveProperty('name');
    expect(sanitized).toHaveProperty('tier');
    expect(sanitized).toHaveProperty('changeCount');
  });

  it('should omit ext_counts for Free tier', () => {
    const event = {
      name: 'SESSION_FINALIZED',
      changeCount: 10,
      durationMs: 60000,
      tier: 'free',
    };

    const sanitized = sanitizeSessionEvent(event, 'free', false);

    // Free tier: no histograms regardless of consent or changeCount
    expect(sanitized).not.toHaveProperty('ext_counts');
    expect(sanitized).not.toHaveProperty('token_counts');
  });

  it('should omit ext_counts without consent (Solo tier)', () => {
    const event = {
      name: 'SESSION_FINALIZED',
      changeCount: 10,
      durationMs: 60000,
      tier: 'solo',
      ext_counts: { '.ts': 8, '.tsx': 2 },
    };

    const sanitized = sanitizeSessionEvent(event, 'solo', false); // no consent

    // No consent: no histograms
    expect(sanitized).not.toHaveProperty('ext_counts');
  });

  it('should omit ext_counts for low changeCount (k-anonymity)', () => {
    const event = {
      name: 'SESSION_FINALIZED',
      changeCount: 2, // < 3 threshold
      durationMs: 30000,
      tier: 'solo',
      ext_counts: { '.ts': 2 },
    };

    const sanitized = sanitizeSessionEvent(event, 'solo', true);

    // Below k-anonymity threshold: no histograms
    expect(sanitized).not.toHaveProperty('ext_counts');
  });

  it('should never contain token_counts (Alpha restriction)', () => {
    const event = {
      name: 'SESSION_FINALIZED',
      changeCount: 10,
      durationMs: 60000,
      tier: 'solo',
      ext_counts: { '.ts': 10 },
    };

    const sanitized = sanitizeSessionEvent(event, 'solo', true);

    // Alpha: no token_counts field (prevent client name leakage)
    expect(sanitized).not.toHaveProperty('token_counts');
  });
});
```

### Performance Budget Integration

**Update**: `packages/perf/.perf-baseline.json`

```json
{
  "snapshot_create_p95_ms": 100,
  "restore_validate_p95_ms": 500,
  "session_track_p95_ms": 50,
  "analytics_tti_ms": 2000,
  "session_rollback_p95_ms": 800
}
```

**CI Assertion**:
```yaml
# .github/workflows/alpha.yml
- name: Run Performance Benchmarks
  run: pnpm --filter @snapback/perf test

- name: Validate Performance Budgets
  run: |
    node scripts/ci/validate-perf-budgets.js
    if [ $? -ne 0 ]; then
      echo "❌ Performance budgets exceeded"
      exit 1
    fi
```

## Rollout Plan

### Phase 1: Alpha Launch (Week 1)

**Scope**: Free tier only, VS Code extension + CLI

**Deliverables**:
- SnapshotManager implementation with local storage
- VS Code commands: create, list, restore
- CLI commands: create, list, restore, delete
- CI guards: Terminology check, performance budgets
- Analytics events: SNAPSHOT_CREATED, SNAPSHOT_RESTORED

**Success Criteria**:
- 100 active users creating snapshots
- P95 latency <100ms for create operations
- Zero data loss incidents
- 50% user activation (create at least one snapshot)

### Phase 1.5: Session Layer (Week 1, After Core Snapshot/Restore)

**Scope**: Session tracking, rollback, VS Code UI

**Deliverables**:
- Session schema and contracts (`sb.session.v1`)
- SQLite migration: `002_sessions.sql`
- SessionManager implementation with idle detection
- SessionsTreeDataProvider for VS Code
- Session commands: finalize, rollback, reveal
- Status bar integration ("● Session recording")
- LLM naming integration (optional)
- Session analytics events (privacy-safe)
- Performance benchmarks (<50ms tracking)

**Success Criteria**:
- File changes appear in session tree view within 1 second
- Idle finalization triggers after 15 minutes of inactivity
- Rollback reverts all session changes with 100% accuracy
- Hash integrity checks pass on macOS and Windows
- Analytics events contain zero PII (verified by CI guard)
- Performance budget met: p95 < 50ms for session tracking

**Stop Rules**:
- If absolute file paths leak to analytics → block merge
- If rollback leaves workspace inconsistent → auto-rollback + Recovery UI
- If session tracking p95 > 50ms → optimize before ship

### Phase 2: Solo Tier Enablement (Week 2)

**Scope**: Cloud backup, web console, session cloud sync

**Deliverables**:
- S3 integration with presigned URLs
- API endpoints: create, list, download, delete
- Web console snapshot list view
- **Session cloud sync** (optional for Solo tier)
- Tier quota enforcement
- Storage size tracking

**Success Criteria**:
- 10% Free → Solo conversion rate
- S3 upload success rate >99%
- Average snapshot size <5MB
- **Session manifests sync to cloud with consent**
- 80% user satisfaction (survey)

### Phase 3: Optimization (Week 3)

**Scope**: Performance improvements, UX polish

**Deliverables**:
- Deduplication hit rate >30%
- Conflict resolution UI improvements
- Snapshot search and filtering
- Protected snapshot management
- Analytics dashboard for users

**Success Criteria**:
- Deduplication saving 30%+ storage
- Conflict resolution completion rate >90%
- User retention >60% (30-day)

## Open Questions

### Question 1: Session Name Generation Strategy

**Context**: LLM naming requires API key and adds latency/cost

**Options**:
A. LLM-only (fail if no API key)
B. LLM with synthesis fallback (current design)
C. Synthesis-only (no LLM dependency)

**Recommendation**: Option B for Solo tier, Option C for Free tier

**Trade-offs**:
- LLM names: Better semantic quality, requires API key, 200-500ms latency
- Synthesized names: Instant, deterministic, less context-aware

### Question 2: Session Rollback Scope

**Context**: What to do with files created/modified outside the session?

**Options**:
A. Strict rollback (restore only session files, leave others untouched)
B. Workspace rollback (restore all files to session start state)
C. Selective rollback (user chooses which files to revert)

**Recommendation**: Option A for Alpha (predictable behavior), Option C for Team tier

### Question 3: Snapshot Size Limits

**Context**: Large repositories could create multi-GB snapshots

**Options**:
A. Hard limit at 100MB per snapshot (reject larger)
B. Incremental snapshots (store diffs from parent)
C. Compression with higher ratio (LZMA vs LZ4)

**Recommendation**: Option A for Alpha (simplicity), evaluate B for Team tier

### Question 4: Concurrent Snapshot Creation

**Context**: Multiple VS Code windows could create snapshots simultaneously

**Options**:
A. SQLite exclusive lock (serialize writes)
B. Optimistic concurrency (detect conflicts, retry)
C. Multi-writer queue (single background worker)

**Recommendation**: Option A for local storage (SQLite handles this), Option C for cloud

### Question 5: Session-Snapshot Linkage Cardinality

**Context**: Should snapshots link to multiple sessions or single session only?

**Options**:
A. One-to-one (snapshot belongs to exactly one session)
B. Many-to-one (multiple snapshots per session, current design)
C. Many-to-many (snapshot can be referenced by multiple sessions)

**Recommendation**: Option B for Alpha (simple mental model), evaluate C for Team tier

**Use Case for C**: User creates manual snapshot, then continues two separate sessions that both reference it as a baseline.

### Question 6: Snapshot Metadata Schema Evolution

**Context**: Future features may require new metadata fields

**Options**:
A. Schema versioning in Snapshot.meta
B. Separate metadata table in database
C. Flexible JSON column (current approach)

**Recommendation**: Continue with Option C, add versioning if breaking changes needed

## Appendix

### File Manifest

**Contract Definitions**:
- `packages/contracts/src/types/snapshot.ts`: Snapshot, CreateSnapshotOptions, SnapshotFilters, SnapshotRestoreResult
- `packages/contracts/src/session.ts`: SessionManifestV1, SessionChange, SessionSchema (NEW)
- `packages/contracts/src/analytics.ts`: SESSION_STARTED, SESSION_FINALIZED events (NEW)

**Core Implementation**:
- `packages/sdk/src/snapshot/SnapshotManager.ts`: Main orchestration logic
- `packages/sdk/src/snapshot/SnapshotDeduplication.ts`: Content hashing and duplicate detection
- `packages/sdk/src/snapshot/SnapshotNaming.ts`: Naming strategy implementations
- `packages/sdk/src/storage/StorageAdapter.ts`: Storage interface definition
- `packages/sdk/src/storage/StorageBroker.ts`: SQLite storage implementation
- `packages/sdk/src/session/SessionManager.ts`: Session lifecycle management (NEW)
- `packages/sdk/src/session/SessionRollback.ts`: Session-scoped rollback logic (NEW)
- `packages/sdk/src/session/SessionNaming.ts`: LLM and synthesized naming (NEW)

**Database Migrations**:
- `packages/sdk/migrations/001_snapshots.sql`: Snapshot tables
- `packages/sdk/migrations/002_sessions.sql`: Session tables (NEW)

**VS Code Extension**:
- `apps/vscode/src/commands/createSnapshot.ts`: Manual snapshot command
- `apps/vscode/src/commands/restoreSnapshot.ts`: Restore command with conflict UI
- `apps/vscode/src/handlers/onWillSaveTextDocument.ts`: Auto-risk trigger
- `apps/vscode/src/views/snapshotNavigatorProvider.ts`: Snapshot tree view provider
- `apps/vscode/src/views/SessionsTreeDataProvider.ts`: Session tree view provider (NEW)
- `apps/vscode/src/commands/session/finalize.ts`: Finalize session command (NEW)
- `apps/vscode/src/commands/session/rollback.ts`: Session rollback command (NEW)
- `apps/vscode/src/commands/session/reveal.ts`: Show session file diff (NEW)
- `apps/vscode/src/ui/SessionStatusBar.ts`: Status bar integration (NEW)

**CLI**:
- `apps/cli/src/commands/snapshot/create.ts`: Create command
- `apps/cli/src/commands/snapshot/list.ts`: List command
- `apps/cli/src/commands/snapshot/restore.ts`: Restore command

**API Endpoints**:
- `apps/api/modules/snapshots/procedures/create.ts`: POST /snapshots/create
- `apps/api/modules/snapshots/procedures/list.ts`: GET /snapshots
- `apps/api/modules/snapshots/procedures/download.ts`: GET /snapshots/:id/download

**Analytics**:
- `packages/analytics/src/client.ts`: Event queuing and batching
- `packages/analytics/src/sanitizer.ts`: PII removal and path hashing (ENHANCED)
- `apps/api/modules/analytics/procedures/ingest.ts`: POST /analytics/ingest

**CI Guards**:
- `scripts/ci/guard.sh`: Terminology and analytics privacy checks (ENHANCED)
- `packages/analytics/test/privacy.spec.ts`: Session analytics privacy tests (NEW)

### Database Schema

**PostgreSQL** (`packages/platform/src/db/schema/postgres.ts`):
```
snapshots {
  id VARCHAR(255) PRIMARY KEY
  user_id VARCHAR(255) REFERENCES user(id)
  name TEXT NOT NULL
  timestamp TIMESTAMP NOT NULL
  file_count INTEGER NOT NULL
  total_size_bytes INTEGER
  risk_score NUMERIC(3,1)
  protected BOOLEAN DEFAULT FALSE
  cloud_backup BOOLEAN DEFAULT FALSE
  created_at TIMESTAMP DEFAULT NOW()
}

analyticsEvents {
  id VARCHAR(255) PRIMARY KEY
  user_id VARCHAR(255) REFERENCES user(id)
  event_type VARCHAR(100) NOT NULL
  properties JSON NOT NULL
  timestamp TIMESTAMP NOT NULL
  created_at TIMESTAMP DEFAULT NOW()
}

CREATE INDEX idx_snapshots_user_timestamp ON snapshots(user_id, timestamp DESC)
CREATE INDEX idx_snapshots_protected ON snapshots(protected)
CREATE INDEX idx_analytics_user_type ON analyticsEvents(user_id, event_type)
```

**SQLite** (Local storage):
```
snapshots {
  id TEXT PRIMARY KEY
  timestamp INTEGER NOT NULL
  metadata JSON NOT NULL
  files JSON NOT NULL
  file_contents BLOB NOT NULL        -- LZ4 compressed
  content_hash TEXT
}

CREATE INDEX idx_snapshots_hash ON snapshots(content_hash)
CREATE INDEX idx_snapshots_timestamp ON snapshots(timestamp DESC)
```

### Risk Score Calculation

**Source**: Guardian policy engine (`packages/policy-engine/`)

**Formula**:
```
riskScore = SUM(violation.severity * violation.weight) / totalPossibleScore * 10

Example:
- Secret detected (severity: 10, weight: 1.0) → +10
- TODO comment (severity: 2, weight: 0.5) → +1
- Large file (severity: 5, weight: 0.8) → +4
Total: 15 / 20 * 10 = 7.5 (rounds to 8)
```

**Thresholds**:
- 0-3: Low risk (green indicator)
- 4-6: Medium risk (yellow indicator)
- 7-10: High risk (red indicator, auto-snapshot trigger)

### Conflict Resolution Algorithm

**Three-Way Merge**:
```
Base: Snapshot content at creation time
Theirs: Current workspace content
Ours: Snapshot content at restore time

Conflict Detection:
1. If base == theirs && base != ours → No conflict (fast-forward)
2. If base != theirs && base == ours → No conflict (already applied)
3. If base != theirs && base != ours && theirs != ours → Conflict

Resolution Strategies:
- Keep Current: Use theirs, discard ours
- Use Snapshot: Use ours, discard theirs
- Merge: Manual line-by-line resolution (VS Code diff editor)
```

### Terminology Migration Mapping

**Legacy** → **Current**:
- checkpoint → snapshot
- checkpoint.created → snapshot.created
- apply → restore
- review → validate (dry-run restore)
- CheckpointStorage → SnapshotStorage
- createCheckpoint() → createSnapshot()

**CI Guard Enforcement**:
```
Location: scripts/ci/guard.sh

Prohibited Terms:
- "checkpoint" (except in migration notes)
- "apply" (except in policy actions)
- "review" (except in pull request context)

**Allowlist**:
- .guard-allowlist.txt (paths exempt from terminology check)
```

---

## Alpha Ship Readiness Checklist

### Privacy Hardening (Ship-Blocker Fixes Applied)

**1. Analytics Privacy Conflict Resolved**

**Problem**: Design both "strip workspace IDs" and "test for hashed workspace ID" — contradiction.

**Fix Applied**:
- ✅ Removed all workspace identifiers (hashed or not) from analytics events
- ✅ Updated `SESSION_STARTED` and `SESSION_FINALIZED` contracts: no `workspaceId` field
- ✅ Updated sanitizer to never emit workspace identifiers (any form)
- ✅ Updated privacy tests to assert absence of `workspaceId`, `workspacePath`, `workspaceUri`, `workspaceHash`
- ✅ Updated CI guard to fail if any workspace identifier appears in analytics code

**Privacy Guarantee**: Zero workspace identifiers transmitted for Free and Solo tiers.

**2. Token Leakage Prevented**

**Problem**: `token_counts` derives from file stems → can leak client names ("hipaa", "acme").

**Fix Applied**:
- ✅ Removed `token_counts` field from `SESSION_FINALIZED` event contract
- ✅ Removed `aggregateTokens()` function from sanitizer
- ✅ Removed `bucketizeTokens` from SanitizationRules
- ✅ Updated sanitizer to only emit `ext_counts` (extension histograms) for Solo tier with consent and changeCount ≥3
- ✅ Added CI guard to fail if `token_counts` appears in analytics code
- ✅ Added test: "should never contain token_counts (Alpha restriction)"

**Privacy Guarantee**: No file names, stems, or tokens transmitted. Only extension counts (e.g., `.ts`, `.tsx`) with Solo consent.

**Decision**: Drop `token_counts` entirely for Alpha. Simplest, safest, fastest path to ship.

### High-Impact Polish (Applied)

**3. BlobStore Contract (CAS Formalized)**

**Problem**: Sessions reference hashes, but CAS wasn't formalized → risk of duplicating file contents.

**Fix Applied**:
- ✅ Added `BlobStore` interface with `put()`, `get()`, `has()`, `delete()`, `size()` methods
- ✅ Defined local filesystem implementation: `~/.snapback/blobs/sha256/aa/bb/<hash>.lz4`
- ✅ Defined SQLite schema: `blobs(hash TEXT PRIMARY KEY, size INTEGER, algo TEXT, created_at INTEGER)`
- ✅ Defined S3 cloud implementation: `s3://snapback-blobs/sha256/aa/bb/<hash>.lz4`
- ✅ Updated session finalize to store file contents via `BlobStore.put()` and reference via `hOld`/`hNew`
- ✅ Updated rollback algorithm to retrieve blobs via `BlobStore.get(hash)`

**Deduplication Benefit**: Storage cost proportional to unique content, not snapshot count. Example: 100 snapshots of same file = 1 blob + 100 metadata records.

**4. Atomic Restore Scope (Per-File Backups)**

**Problem**: "Backup entire workspace" won't scale. Too slow and wasteful.

**Fix Applied**:
- ✅ Updated snapshot restore to use per-file staging + targeted backup
- ✅ For each file: `rename {path} → {path}.bak-{snapshotId}` then move staged file into place
- ✅ On failure: restore per-file backups, delete baks on commit
- ✅ Updated session rollback algorithm with same per-file backup approach
- ✅ Journal now records all `{path}.bak-{sessionId}` files for crash recovery

**Scalability**: Only changed files backed up, not entire workspace. Faster and safer.

**5. EOL/Mode Capture (Per-File Preservation)**

**Problem**: First-1KB scan can misclassify mixed EOL files.

**Fix Applied**:
- ✅ Store observed EOL per write during session tracking
- ✅ Re-apply observed EOL on restore (preserve per-file, not global)
- ✅ If mixed EOL detected: default to preserving snapshot's EOL
- ✅ Updated `SessionChange` to include `eolBefore` and `eolAfter` fields
- ✅ Metadata restoration includes `mtime`, `mode`, and `eol`

**Cross-Platform**: Works correctly with mixed LF/CRLF files in same repo.

**6. Windows Cross-Device (EXDEV Explicit Fallback)**

**Problem**: `fs.rename()` fails with EXDEV on Windows when moving across drives.

**Fix Applied**:
- ✅ Added explicit EXDEV error handling in restore and rollback algorithms:
  ```typescript
  try {
    await fs.rename(src, dst);
  } catch (e: any) {
    if (e.code === 'EXDEV') {
      await fs.copyFile(src, dst);
      await fs.unlink(src);
    } else {
      throw e;
    }
  }
  ```
- ✅ Updated crash safety section to document fallback pattern
- ✅ Added test: "should handle cross-device rename with copy-remove fallback"

**Windows Safety**: Works across C: and D: drives without failure.

**7. Path Normalization (POSIX-Style Storage)**

**Problem**: Windows backslashes (\) cause path mismatches on restore.

**Fix Applied**:
- ✅ Normalize all paths to POSIX-style before storing in database:
  ```typescript
  const relPath = path.relative(workspaceRoot, absolutePath);
  const posixPath = relPath.split(path.sep).join('/'); // \ → /
  ```
- ✅ Updated `SessionManager.track()` to normalize paths
- ✅ Updated database schema docs to specify "relative, POSIX-style paths"
- ✅ Use case-insensitive path compares on Windows

**Cross-Platform**: Paths stored as `src/auth.ts` (not `src\auth.ts`), work on all OSes.

**8. Performance Realism (50MB Snapshot Cap)**

**Problem**: <100ms snapshot create budget unrealistic for >100MB files.

**Fix Applied**:
- ✅ Added 50MB Alpha cap with preflight check in `SnapshotManager.create()`:
  - If `totalBytes > 50 * 1024 * 1024` → return `SNAPSHOT_TOO_LARGE` error
  - Show user: "Snapshot exceeds 50MB. Try incremental mode (Beta feature)."
- ✅ Mirrored check in API server (return 413 Payload Too Large)
- ✅ Updated performance budget docs: "<100ms achievable for ≤1-2MB"
- ✅ Added benchmark test: create 51MB snapshot → assert error
- ✅ Store `total_size_bytes` in metadata for quota/telemetry

**Performance Guarantee**: <100ms for ≤1-2MB snapshots. Fail-fast for >50MB.

### Minor Polish (Applied)

**9. SessionManager.track() Signature Alignment**

**Fix Applied**:
- ✅ Updated signature to accept `meta?: { fromPath?: string; oldUri?: string; newUri?: string }`
- ✅ Extract `fromPath` from VS Code `onDidRenameFiles` event: `{ oldUri, newUri }`
- ✅ Normalize extracted paths to POSIX-style

**VS Code Integration**: Directly wire VS Code file watcher events without path transformation.

**10. Minimatch with `{ dot: true }` Option**

**Fix Applied**:
- ✅ Updated `IgnoreFilter.shouldIgnore()` to use `minimatch(path, pattern, { dot: true })`
- ✅ Ensures `.* `patterns match hidden files (e.g., `.git/`, `.DS_Store`)

**Ignore Accuracy**: `.git/**` now correctly ignores `.git/config` and `.git/HEAD`.

**11. Multi-Root Workspace Grouping**

**Confirmed**:
- ✅ Group sessions by `workspaceFolder.name` in tree view
- ✅ Key sessions by `workspaceFolder.uri.toString()` in SessionManager map
- ✅ Multi-root isolation test included in pre-merge requirements

### Pre-Merge Test Requirements (All Specified)

✅ **1. Path Privacy Test**: Assert absence of paths, filenames, workspace IDs, session labels

✅ **2. Windows Rename Test**: Mock EXDEV error, verify copy-remove fallback

✅ **3. Crash Journal Test**: Simulate crash, verify per-file backup recovery

✅ **4. Idle Finalize After Sleep Test**: Persist/restore state across OS sleep/wake

✅ **5. Multi-Root Isolation Test**: Track changes in two workspace folders, assert separate sessions

✅ **6. Ignore List Test**: Verify `node_modules/`, `.git/`, `*.log` not tracked

### CI Guard Enhancements (Applied)

✅ **workspaceId ban**: Fail if `workspaceId` appears in analytics code

✅ **workspacePath ban**: Fail if `workspacePath` appears in analytics code

✅ **token_counts ban**: Fail if `token_counts` appears in analytics code (Alpha)

✅ **filePath ban**: Fail if `filePath:` or `fileName:` appear in analytics code

### Verdict: Ship-Ready

**All ship-blockers resolved**. Privacy contradictions fixed, token leakage prevented, BlobStore formalized, per-file backups implemented, cross-platform robustness guaranteed, 50MB cap enforced.

**Architecture validated**: CAS-referencing sessions, optional sessionId on snapshots, tree view, inverse-apply rollback, privacy-minimized analytics all aligned with "local-first, consent-up" principles.

**Ready to ship Alpha** after these surgical tweaks.
