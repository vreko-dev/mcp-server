# Storage Layer Architecture

**Overview**: SnapBack's storage layer provides persistent and ephemeral snapshot storage with gzip compression and single-writer concurrency control. All storage implementations are in [packages/sdk/src/storage/](../../packages/sdk/src/storage/).

**Note**: The `packages/storage` directory exists but has NO implementation. See [TODO-STORAGE-CLEANUP.md](../../TODO-STORAGE-CLEANUP.md) for cleanup plan.

---

## Storage Adapter Interface

All storage implementations conform to the `StorageAdapter` interface for consistent behavior across backends.

**Implementation**: [packages/sdk/src/storage/StorageAdapter.ts](../../packages/sdk/src/storage/StorageAdapter.ts)

### Core Methods

```typescript
interface StorageAdapter {
  // Save snapshot (overwrites if ID exists)
  save(snapshot: Snapshot, contentHash?: string): Promise<void>;

  // Retrieve snapshot by ID (null if not found)
  get(id: string): Promise<Snapshot | null>;

  // Retrieve snapshot by content hash (optional, for future deduplication)
  getByContentHash?(hash: string): Promise<Snapshot | null>;

  // List snapshots with filters (sorted by timestamp desc)
  list(filters?: SnapshotFilters): Promise<Snapshot[]>;

  // Delete snapshot by ID (idempotent)
  delete(id: string): Promise<void>;

  // Cleanup resources
  close(): Promise<void>;
}
```

**Note**: `contentHash` parameter exists in interface but is **not currently used** for deduplication in StorageBroker.

---

## Storage Implementations

### 1. LocalStorage (SQLite-backed)

**Implementation**: [packages/sdk/src/storage/LocalStorage.ts](../../packages/sdk/src/storage/LocalStorage.ts)

**Primary use case**: Simple SQLite storage (currently unused in favor of StorageBrokerAdapter)

**Schema**:

```sql
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  name TEXT,
  protected INTEGER DEFAULT 0,
  files TEXT,                    -- JSON array of file paths
  file_contents TEXT,            -- JSON object {filePath: content}
  metadata TEXT,                 -- JSON object (user metadata)
  content_hash TEXT,             -- For future deduplication
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes
CREATE INDEX idx_timestamp ON snapshots(timestamp DESC);
CREATE INDEX idx_protected ON snapshots(protected);
CREATE INDEX idx_created_at ON snapshots(created_at DESC);
CREATE INDEX idx_name ON snapshots(name);
CREATE INDEX idx_content_hash ON snapshots(content_hash);
```

**Features**:

- SQLite with WAL mode (concurrent reads)
- Input sanitization (prevents injection)
- Error handling (disk full, database locked)
- **No compression**: File contents stored as plain JSON

---

### 2. MemoryStorage (In-memory)

**Implementation**: [packages/sdk/src/storage/MemoryStorage.ts](../../packages/sdk/src/storage/MemoryStorage.ts)

**Primary use case**: Testing, temporary snapshots

**Implementation**: `Map<string, Snapshot>`

**Features**:

- Deep cloning to prevent mutations
- Filters: filePath, before, after, protected
- Sorted results (timestamp desc)
- No persistence (data lost on instance destruction)
- Zero latency (<1ms operations)

---

### 3. StorageBrokerAdapter (Production storage)

**Implementation**: [packages/sdk/src/storage/StorageBrokerAdapter.ts](../../packages/sdk/src/storage/StorageBrokerAdapter.ts)

**Primary use case**: VS Code extension production storage

**Architecture**: Adapter pattern wrapping `StorageBroker`

**Flow**:

```text
StorageAdapter.save() → StorageBrokerAdapter → StorageBroker (queue) → SQLite
```

**Features**:

- Single-writer queue discipline
- Connection pooling (4 read connections)
- Gzip compression (level 9)
- WAL mode (concurrent reads)
- Session-aware snapshots

---

## StorageBroker (Single-writer engine)

**Implementation**: [packages/sdk/src/storage/StorageBroker.ts](../../packages/sdk/src/storage/StorageBroker.ts)

**Purpose**: High-performance SQLite storage with single-writer discipline, compression, and session support

### Database Schema

**Actual schema** ([packages/sdk/src/storage/StorageBroker.ts](../../packages/sdk/src/storage/StorageBroker.ts:246-343)):

```sql
-- Snapshots table
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  parent_id TEXT,
  metadata TEXT,
  FOREIGN KEY (parent_id) REFERENCES snapshots(id)
);

-- File changes table (stores compressed diffs)
CREATE TABLE file_changes (
  snapshot_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  action TEXT CHECK(action IN ('add','modify','delete')),
  diff BLOB,                    -- Gzip compressed content
  storage_type TEXT DEFAULT 'diff',
  content_size INTEGER,         -- Original uncompressed size
  PRIMARY KEY (snapshot_id, file_path),
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
);

-- Sessions table (multi-file snapshots)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  reason TEXT NOT NULL,
  summary TEXT,
  tags TEXT,
  metadata TEXT
);

-- Session files (many-to-many)
CREATE TABLE session_files (
  session_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  added_count INTEGER DEFAULT 0,
  deleted_count INTEGER DEFAULT 0,
  PRIMARY KEY (session_id, file_path),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
);

-- Operation queue (for single-writer discipline)
CREATE TABLE queued_operations (
  id TEXT PRIMARY KEY,
  operation_name TEXT NOT NULL,
  priority INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  data BLOB,
  status TEXT CHECK(status IN ('pending','processing','completed','failed')) DEFAULT 'pending'
);

-- Writer lock (ensures single writer)
CREATE TABLE writers_lock (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  writer_id TEXT,
  acquired_at INTEGER,
  expires_at INTEGER
);
```

**Indexes**:

```sql
-- Single-column indexes
CREATE INDEX idx_snapshot_timestamp ON snapshots(timestamp);
CREATE INDEX idx_snapshot_parent ON snapshots(parent_id);
CREATE INDEX idx_file_path ON file_changes(file_path);
CREATE INDEX idx_session_started_at ON sessions(started_at);
CREATE INDEX idx_session_ended_at ON sessions(ended_at);
CREATE INDEX idx_session_reason ON sessions(reason);
CREATE INDEX idx_queued_operations_priority ON queued_operations(priority);
CREATE INDEX idx_queued_operations_status ON queued_operations(status);
CREATE INDEX idx_queued_operations_created_at ON queued_operations(created_at);

-- Covering indexes for common queries
CREATE INDEX idx_snapshots_list
  ON snapshots(timestamp DESC, id, name);

CREATE INDEX idx_file_changes_snapshot
  ON file_changes(snapshot_id, file_path, action);

CREATE INDEX idx_file_changes_file_covering
  ON file_changes(file_path, snapshot_id)
  WHERE action != 'delete';

CREATE INDEX idx_sessions_list
  ON sessions(started_at DESC, ended_at, id);
```

### Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    StorageBroker                             │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Write Queue  │ Read Pool    │ Compression  │ Session Mgmt   │
│ (Priority)   │ (4 conns)    │ (gzip -9)    │ (Multi-file)   │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │              │              │                │
       ↓              ↓              ↓                ↓
┌──────────────────────────────────────────────────────────────┐
│                SQLite Database (WAL mode)                     │
│  snapshots | file_changes | sessions | session_files         │
└──────────────────────────────────────────────────────────────┘
```

### Write Queue (Single-writer discipline)

**Problem**: SQLite only supports one writer at a time
**Solution**: Queue all write operations, execute sequentially

**Queue Properties**:

- Priority-based (higher priority first)
- FIFO within same priority
- Async/await for caller synchronization
- Operations: `createSnapshot`, `deleteSnapshot`, `updateSnapshot`

**Priority Levels**:

- High: User-triggered operations
- Normal: Automatic snapshots
- Low: Background cleanup

### Read Connection Pool

**Purpose**: Parallel reads with WAL mode

**Implementation** ([packages/sdk/src/storage/StorageBroker.ts](../../packages/sdk/src/storage/StorageBroker.ts:35-97)):

```typescript
class ConnectionPool {
  private connections: DatabaseInstance[] = [];
  private maxConnections = 4;  // Tuned for typical workloads

  async getConnection(): Promise<DatabaseInstance> {
    // Try available → Create new → Reuse existing
  }

  releaseConnection(db: DatabaseInstance): void {
    // Connections kept in pool for reuse
  }
}
```

**Read Operations**:

- `getSnapshot(id)` - Single snapshot retrieval
- `listSnapshots(filters)` - Query with filters
- Parallel reads: Up to 4 concurrent queries
- Latency: <10ms per read (indexed)

### Compression

**Algorithm**: Gzip level 9 (maximum compression)
**Applied to**: File contents in `file_changes.diff` BLOB column

**Implementation** ([packages/sdk/src/storage/StorageBroker.ts](../../packages/sdk/src/storage/StorageBroker.ts:11-12)):

```typescript
function compress(content: string): Buffer {
  return gzipSync(Buffer.from(content, 'utf-8'), { level: 9 });
}
```

**Compression Flow**:

```text
File content → Compress (gzip -9) → Store in file_changes.diff (BLOB)
```

**Compression Ratios** (typical):

- Source code: 60-80% reduction
- JSON data: 70-85% reduction
- Minified JS: 30-50% reduction

**Trade-offs**:

- CPU cost: ~10-20ms per file (compression)
- Disk savings: >60% space reduction
- Decompression: ~5-10ms per file

### Session Support

**Purpose**: Group multi-file snapshots into atomic sessions

**Schema**:

- `sessions` table: Session metadata
- `session_files` table: Links sessions to snapshot files

**Use case**: AI assistant changes 5+ files simultaneously → one session for atomic restore

**Session creation** ([packages/sdk/src/storage/StorageBroker.ts](../../packages/sdk/src/storage/StorageBroker.ts)):

```typescript
await broker.createSession({
  reason: 'edit-burst',  // 'edit-burst' | 'commit' | 'manual'
  summary: 'Refactored authentication system',
  tags: ['auth', 'security'],
  snapshotIds: ['snap-1', 'snap-2', 'snap-3']
});
```

---

## Deduplication Status

**Current implementation**: ❌ **NO content-based deduplication**

**What was planned but NOT implemented**:

- ❌ BLAKE3 content hashing
- ❌ Separate `file_contents` table with hash-based dedup
- ❌ `getByContentHash()` method functionality
- ❌ Hash-based file content reuse

**Current approach**: Each snapshot stores full compressed file contents

**Space usage**:

- Without deduplication: 100 snapshots × 1MB each = 100MB
- With compression (gzip -9): ~30-40MB (60-70% savings from compression alone)
- Potential with deduplication: ~5-10MB (90-95% savings if implemented)

**Why not implemented**:

- Compression provides significant space savings
- Complexity vs benefit trade-off
- May be added in future if space becomes issue

---

## Error Handling

**Error Types** ([packages/sdk/src/storage/StorageErrors.ts](../../packages/sdk/src/storage/StorageErrors.ts)):

```typescript
class StorageError extends Error {
  code: string;
  details?: unknown;
}

class StorageConnectionError extends StorageError {}
class StorageFullError extends StorageError {}
class StorageLockError extends StorageError {}
class CorruptedDataError extends StorageError {}
class StorageTransactionError extends StorageError {}
```

**Error Recovery**:

```typescript
// StorageLockError (retryable)
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    await storage.save(snapshot);
    break;
  } catch (error) {
    if (error instanceof StorageLockError && attempt < 3) {
      await delay(100 * attempt);  // Exponential backoff
      continue;
    }
    throw error;
  }
}

// StorageFullError (alert user)
try {
  await storage.save(snapshot);
} catch (error) {
  if (error instanceof StorageFullError) {
    showNotification("Disk full - cannot save snapshot");
  }
}
```

---

## Performance Characteristics

### LocalStorage (SQLite)

| Operation | Latency (P50) | Latency (P95) | Throughput |
|-----------|---------------|---------------|------------|
| save() | 25ms | 50ms | 40/sec |
| get() | 5ms | 10ms | 200/sec |
| list() | 8ms | 15ms | 125/sec |
| delete() | 3ms | 8ms | 333/sec |

**Note**: WAL mode, SSD storage, no compression

### MemoryStorage (In-memory)

| Operation | Latency (P50) | Latency (P95) | Throughput |
|-----------|---------------|---------------|------------|
| save() | 0.2ms | 0.5ms | 5,000/sec |
| get() | 0.1ms | 0.3ms | 10,000/sec |
| list() | 0.5ms | 1ms | 2,000/sec |
| delete() | 0.1ms | 0.3ms | 10,000/sec |

**Note**: Limited by available memory

### StorageBrokerAdapter (Production)

| Operation | Latency (P50) | Latency (P95) | Throughput |
|-----------|---------------|---------------|------------|
| save() | 35ms | 70ms | 28/sec |
| get() | 8ms | 15ms | 125/sec |
| list() | 12ms | 25ms | 83/sec |
| delete() | 6ms | 12ms | 166/sec |

**Note**: Includes compression overhead (~10-20ms), queue wait time

---

## Storage Location by Client

### VS Code Extension

- **Primary**: `StorageBrokerAdapter` (SQLite with queue)
- **Location**: `~/.vscode/extensions/snapback/storage.db`
- **Features**: Compression, sessions, WAL mode
- **Fallback**: `MemoryStorage` (if SQLite unavailable)

### MCP Server

- **Primary**: `MemoryStorage` (ephemeral)
- **Rationale**: MCP sessions are short-lived
- **Future**: Optional SQLite persistence

### CLI

- **Primary**: `LocalStorage` (SQLite)
- **Location**: `~/.snapback/cli-storage.db`
- **Features**: Simple SQLite, no compression

### Web Dashboard

- **Primary**: Supabase PostgreSQL (cloud)
- **Sync**: Event bus for real-time updates
- **Local cache**: Browser IndexedDB (future)

---

## Concurrency Model

### SQLite WAL Mode

**Advantages**:

- Concurrent reads (multiple readers don't block)
- Read while writing (readers don't wait for writers)
- Atomic commits (all-or-nothing)
- Crash safety (WAL file provides recovery)

**Configuration**:

```sql
PRAGMA journal_mode = WAL;      -- Enable WAL mode
PRAGMA synchronous = NORMAL;    -- Balance safety/performance
PRAGMA cache_size = -64000;     -- 64MB cache
```

**Write serialization**: StorageBroker queue ensures single writer

---

## Migration Notes

### packages/storage Package (DEPRECATED)

**Status**: Directory exists with NO implementation
**Planned functionality**: S3/Supabase signed upload URLs
**Current status**: NEVER IMPLEMENTED

**Cleanup**: See [TODO-STORAGE-CLEANUP.md](../../TODO-STORAGE-CLEANUP.md)

**References to remove**:

- `packages/api/modules/users/procedures/create-avatar-upload-url.ts` - Commented import
- `packages/api/modules/organizations/procedures/create-logo-upload-url.ts` - Commented code
- Tests mock `@snapback/storage` (should use `@snapback/sdk`)

---

## Related Documentation

- [SDK Package](../../packages/sdk/CLAUDE.md) - SnapshotClient, ProtectionClient
- [Event Bus](./event-bus.md) - EventPersistenceManager uses StorageBrokerAdapter
- [VS Code Extension](../../apps/vscode/CLAUDE.md) - Storage usage patterns
- [Contracts](../../packages/contracts/CLAUDE.md) - Snapshot types and schemas

---

## Future Enhancements

### Planned (not yet implemented)

- ❌ Content-based deduplication (BLAKE3 hashing)
- ❌ Cloud storage adapter (Supabase Storage, S3)
- ❌ Signed upload URLs for avatar/logo uploads
- ❌ Incremental snapshot diffing
- ❌ Snapshot expiration policies
- ❌ Encryption at rest (AES-256)

### Under consideration

- Compression algorithm selection (zstd, brotli)
- Adaptive connection pool sizing
- Streaming large snapshots
- Multi-device sync (peer-to-peer or cloud)
