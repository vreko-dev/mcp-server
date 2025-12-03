-- Migration 002: Sessions, Session Changes, and Blobs
-- SQLite schema for session-based change tracking and content-addressable storage
-- Version: sb.session.v1

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
PRAGMA synchronous=NORMAL;

-- ============================================================================
-- Table: sessions
-- Purpose: Track logical work sessions with change metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  workspace_uri TEXT NOT NULL,          -- VS Code workspace folder URI (multi-root safe)
  started_at INTEGER NOT NULL,          -- Unix epoch milliseconds
  ended_at INTEGER,                     -- NULL if active, epoch when finalized
  name TEXT,                            -- Offline-generated label (never transmitted)
  triggers INTEGER DEFAULT 0,           -- Bitmask: 1=filewatch, 2=pre-commit, 4=manual, 8=idle
  change_count INTEGER DEFAULT 0
);

-- Index for workspace-scoped queries
CREATE INDEX IF NOT EXISTS idx_sessions_ws_end
  ON sessions(workspace_uri, ended_at);

-- Index for active session lookups (ended_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON sessions(workspace_uri, ended_at)
  WHERE ended_at IS NULL;

-- ============================================================================
-- Table: session_changes
-- Purpose: Individual file changes within a session
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  rel_path TEXT NOT NULL,               -- Relative POSIX path from workspace root
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

-- Index for session-scoped change queries
CREATE INDEX IF NOT EXISTS idx_changes_sess
  ON session_changes(session_id);

-- Index for hash lookups (garbage collection)
CREATE INDEX IF NOT EXISTS idx_changes_h_old
  ON session_changes(h_old)
  WHERE h_old IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_changes_h_new
  ON session_changes(h_new)
  WHERE h_new IS NOT NULL;

-- ============================================================================
-- Table: session_snapshots
-- Purpose: Link table connecting sessions to snapshots created during session
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_snapshots (
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  snapshot_id TEXT NOT NULL,
  PRIMARY KEY (session_id, snapshot_id)
);

-- ============================================================================
-- Table: blobs
-- Purpose: Content-addressable storage metadata for deduplication
-- ============================================================================
CREATE TABLE IF NOT EXISTS blobs (
  hash TEXT PRIMARY KEY,                -- SHA-256 content hash (hex string)
  size INTEGER NOT NULL,                -- Uncompressed size in bytes
  compressed_size INTEGER,              -- LZ4 compressed size in bytes
  algo TEXT DEFAULT 'sha256',           -- Hash algorithm
  ref_count INTEGER DEFAULT 0,          -- Number of sessions/snapshots referencing
  created_at INTEGER DEFAULT (unixepoch() * 1000)  -- Unix epoch milliseconds
);

-- Index for garbage collection (find unreferenced blobs)
CREATE INDEX IF NOT EXISTS idx_blobs_refcount
  ON blobs(ref_count);

-- Index for temporal queries
CREATE INDEX IF NOT EXISTS idx_blobs_created
  ON blobs(created_at);

-- ============================================================================
-- Triggers: Reference Counting for Blobs
-- Purpose: Automatically maintain blob reference counts
-- ============================================================================

-- Increment ref_count when session_change references a blob
CREATE TRIGGER IF NOT EXISTS inc_blob_refcount_h_old
AFTER INSERT ON session_changes
WHEN NEW.h_old IS NOT NULL
BEGIN
  INSERT INTO blobs (hash, size, ref_count)
  VALUES (NEW.h_old, 0, 1)
  ON CONFLICT(hash) DO UPDATE SET ref_count = ref_count + 1;
END;

CREATE TRIGGER IF NOT EXISTS inc_blob_refcount_h_new
AFTER INSERT ON session_changes
WHEN NEW.h_new IS NOT NULL
BEGIN
  INSERT INTO blobs (hash, size, ref_count)
  VALUES (NEW.h_new, 0, 1)
  ON CONFLICT(hash) DO UPDATE SET ref_count = ref_count + 1;
END;

-- Decrement ref_count when session_change is deleted
CREATE TRIGGER IF NOT EXISTS dec_blob_refcount_h_old
AFTER DELETE ON session_changes
WHEN OLD.h_old IS NOT NULL
BEGIN
  UPDATE blobs SET ref_count = ref_count - 1 WHERE hash = OLD.h_old;
  -- Optionally delete blob if ref_count reaches 0 (garbage collection)
  -- DELETE FROM blobs WHERE hash = OLD.h_old AND ref_count <= 0;
END;

CREATE TRIGGER IF NOT EXISTS dec_blob_refcount_h_new
AFTER DELETE ON session_changes
WHEN OLD.h_new IS NOT NULL
BEGIN
  UPDATE blobs SET ref_count = ref_count - 1 WHERE hash = OLD.h_new;
  -- Optionally delete blob if ref_count reaches 0 (garbage collection)
  -- DELETE FROM blobs WHERE hash = OLD.h_new AND ref_count <= 0;
END;

-- ============================================================================
-- Views: Convenience queries
-- ============================================================================

-- Active sessions (not finalized)
CREATE VIEW IF NOT EXISTS active_sessions AS
SELECT *
FROM sessions
WHERE ended_at IS NULL;

-- Blob storage statistics
CREATE VIEW IF NOT EXISTS blob_stats AS
SELECT
  COUNT(*) as total_blobs,
  SUM(size) as total_size_bytes,
  SUM(compressed_size) as total_compressed_bytes,
  CAST(SUM(compressed_size) AS REAL) / NULLIF(SUM(size), 0) as compression_ratio,
  SUM(CASE WHEN ref_count = 0 THEN size ELSE 0 END) as orphaned_bytes
FROM blobs;

-- Session summary with change counts
CREATE VIEW IF NOT EXISTS session_summary AS
SELECT
  s.session_id,
  s.workspace_uri,
  s.started_at,
  s.ended_at,
  s.name,
  s.triggers,
  COUNT(sc.id) as actual_change_count,
  s.change_count as recorded_change_count
FROM sessions s
LEFT JOIN session_changes sc ON s.session_id = sc.session_id
GROUP BY s.session_id;
