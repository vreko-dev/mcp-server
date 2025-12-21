# Snap Architecture: Local-First + Server-Side Intelligence

**Clarification:** How we protect user privacy while keeping IP server-side

---

## Core Principle: Separate Data Planes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   LOCAL (User's Machine)                 SERVER (SnapBack)                   │
│   ══════════════════════                 ════════════════                    │
│                                                                              │
│   ┌──────────────────────┐              ┌──────────────────────┐            │
│   │   CODE CONTENT       │              │   INTELLIGENCE       │            │
│   │   ──────────────     │              │   ────────────       │            │
│   │   • Actual files     │              │   • Detection rules  │            │
│   │   • Snapshots        │              │   • Risk algorithms  │            │
│   │   • Diffs            │              │   • Pattern matching │            │
│   │   • Recovery blobs   │              │   • Issue detection  │            │
│   │                      │              │                      │            │
│   │   NEVER LEAVES       │              │   PROCESSES ONLY     │            │
│   │   USER'S MACHINE     │              │   METADATA           │            │
│   └──────────────────────┘              └──────────────────────┘            │
│              │                                    │                          │
│              │                                    │                          │
│              ▼                                    ▼                          │
│   ┌──────────────────────────────────────────────────────────────┐          │
│   │                     METADATA LAYER                            │          │
│   │                     ──────────────                            │          │
│   │   What flows between client and server:                       │          │
│   │                                                               │          │
│   │   • File paths (not content)                                  │          │
│   │   • File sizes                                                │          │
│   │   • Timestamps                                                │          │
│   │   • Git branch/status (not diffs)                            │          │
│   │   • Package names/versions (not code)                        │          │
│   │   • Config file existence (not content)                      │          │
│   │   • Session IDs                                               │          │
│   │   • Auth tokens                                               │          │
│   │   • Aggregated metrics                                        │          │
│   └──────────────────────────────────────────────────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## What Stays Local (NEVER Sent to Server)

```typescript
// .snapback/ directory structure - ALL LOCAL

.snapback/
├── config.json              // Local workspace config
├── snapshots/               // ACTUAL CODE - NEVER UPLOADED
│   ├── snap_abc123/
│   │   ├── manifest.json    // Metadata only
│   │   └── blobs/           // Content-addressable storage
│   │       ├── a1b2c3...    // File content (hashed)
│   │       └── d4e5f6...
│   └── snap_def456/
│       └── ...
├── protected-files.json     // List from server (paths only)
├── vitals.json              // Cached server response
└── .gitignore               // Excludes sensitive data
```

### Snapshot Storage (100% Local)

```typescript
interface LocalSnapshot {
  // Metadata (can be synced to server for analytics)
  id: string;
  sessionId: string;
  createdAt: string;
  trigger: 'auto' | 'manual' | 'ai-detected';
  fileCount: number;
  totalBytes: number;

  // AI detection metadata (no code)
  aiDetected: boolean;
  aiTool?: string;
  aiConfidence?: number;

  // File metadata (paths, not content)
  files: Array<{
    path: string;           // ✅ Safe - just path
    size: number;           // ✅ Safe - just size
    hash: string;           // ✅ Safe - content hash, not content
    blobRef: string;        // Local reference to blob
  }>;

  // THE ACTUAL CODE - STAYS LOCAL
  // Stored in .snapback/snapshots/{id}/blobs/
  // Never referenced in metadata sent to server
}
```

---

## What Goes to Server (Metadata Only)

### During `snap init`

```typescript
// Client sends this to POST /api/cli/init-workspace
const initPayload = {
  // Workspace identity (anonymous)
  name: "my-project",
  pathHash: "sha256(absolutePath)",  // ✅ Hashed, not actual path
  machineId: "anonymous-machine-id", // ✅ No PII

  // Auth
  sessionId: "session_xxx",          // ✅ For request tracking

  // Package.json METADATA (not full file)
  packageJson: {
    name: "my-project",              // ✅ Project name
    dependencies: {                   // ✅ Package names only
      "next": "14.2.0",
      "react": "18.0.0"
    },
    devDependencies: { ... }
  },

  // File listing (PATHS ONLY, NO CONTENT)
  files: [
    { path: "src/index.ts", size: 1234, modifiedAt: "2025-01-01" },
    { path: "package.json", size: 567, modifiedAt: "2025-01-01" },
    // ❌ No file content
    // ❌ No code
    // ❌ No secrets
  ],

  // Git status (BRANCH/COUNT, NOT DIFFS)
  git: {
    isRepo: true,
    branch: "main",                   // ✅ Branch name
    uncommittedCount: 3,              // ✅ Just a count
    // ❌ No commit messages
    // ❌ No diff content
    // ❌ No file changes
  },

  // AI tools (PRESENCE ONLY)
  aiToolsInstalled: [
    { name: "cursor", version: "0.43.0", configExists: true },
    { name: "claude-desktop", version: "1.2.0", configExists: false },
  ],

  // Config files (EXISTENCE, NOT CONTENT)
  configFiles: [
    "tsconfig.json",                  // ✅ Just path
    "next.config.js",                 // ✅ Just path
    // ❌ No file content
  ],

  // Env files (PATH + GITIGNORE STATUS)
  envFiles: [
    { path: ".env", inGitignore: false },      // ✅ Path only
    { path: ".env.local", inGitignore: true }, // ✅ Path only
    // ❌ No env values
    // ❌ No secrets
  ],

  cliVersion: "1.0.0"
};
```

### During Snapshot Creation

```typescript
// Client sends this to POST /api/cli/snapshot-created
const snapshotMetadata = {
  // Auth
  sessionId: "session_xxx",
  workspaceId: "ws_xxx",

  // Snapshot metadata (NO CODE)
  snapshot: {
    id: "snap_abc123",
    trigger: "ai-detected",
    createdAt: "2025-01-01T12:00:00Z",

    // Aggregate stats only
    fileCount: 15,
    totalBytes: 45678,

    // AI detection results
    aiDetected: true,
    aiTool: "cursor",
    aiConfidence: 0.92,

    // File list (PATHS ONLY)
    files: [
      { path: "src/auth/login.ts", size: 2345, hash: "abc123" },
      { path: "src/auth/logout.ts", size: 1234, hash: "def456" },
      // ❌ No file content
      // ❌ No diffs
      // ❌ No code
    ]
  }
};

// The actual snapshot blobs stay in:
// .snapback/snapshots/snap_abc123/blobs/
// NEVER uploaded
```

---

## Session & Auth Flow

### Session Management

```typescript
// Sessions track a coding "session" for grouping
interface Session {
  id: string;                    // "session_xxx"
  userId: string;                // Authenticated user
  workspaceId: string;           // Which workspace
  machineId: string;             // Which machine (anonymous)

  // Timing
  startedAt: string;
  lastActivityAt: string;
  endedAt?: string;

  // Aggregate metrics (no code)
  snapshotCount: number;
  filesModified: number;
  aiDetectionCount: number;

  // For DBSCAN clustering (server-side)
  // Server uses these to group sessions intelligently
}
```

### Auth Token Flow

```typescript
// Stored locally at ~/.snapback/credentials.json
interface StoredCredentials {
  accessToken: string;           // JWT for API calls
  refreshToken: string;          // For token refresh
  expiresAt: string;

  // User info (for display)
  userId: string;
  email: string;
  tier: 'free' | 'pro' | 'enterprise';
}

// Every API call includes:
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'X-Session-Id': sessionId,      // For request grouping
  'X-Workspace-Id': workspaceId,  // For context
  'X-Client-Version': '1.0.0',    // For compatibility
}
```

---

## Server Processing (Intelligence Layer)

The server receives ONLY metadata and returns DECISIONS:

```typescript
// Server receives metadata
const metadata = await request.json();

// Server processes with protected algorithms
const analysis = await serverSideIntelligence({
  // Input: just metadata
  filePaths: metadata.files.map(f => f.path),
  packageDeps: Object.keys(metadata.packageJson.dependencies),
  gitStatus: metadata.git,

  // NOT input: no code content, no secrets, no diffs
});

// Server returns decisions (not raw logic)
return {
  // Processed vitals with scores
  vitals: {
    framework: { name: 'nextjs', version: '14.2.0', confidence: 0.95 },
    healthScore: 85,
    securityScore: 70,  // Because .env not in gitignore
  },

  // Issues detected (rules are server-side)
  issues: [
    {
      id: 'issue_xxx',
      severity: 'critical',
      title: '.env not in .gitignore',
      // Client doesn't see the detection rule
      // Just the result
    }
  ],

  // Protection decisions (logic is server-side)
  protection: {
    files: [
      { path: '.env', level: 'critical', reason: 'environment-secrets' },
      { path: 'prisma/schema.prisma', level: 'critical', reason: 'database-schema' },
    ]
    // Client doesn't see how we decided this
    // Just the final list
  }
};
```

---

## Privacy Guarantees

### What We NEVER Send to Server

| Data Type | Example | Status |
|-----------|---------|--------|
| File content | `const secret = "abc123"` | ❌ NEVER |
| Code diffs | `+ const newLine = ...` | ❌ NEVER |
| Snapshot blobs | Binary file content | ❌ NEVER |
| Environment values | `DATABASE_URL=postgres://...` | ❌ NEVER |
| Secrets | API keys, passwords | ❌ NEVER |
| Commit messages | "Fixed auth bug" | ❌ NEVER |
| Actual file paths | `/Users/john/secret-project/` | ❌ Hashed only |

### What We DO Send to Server

| Data Type | Example | Why It's Safe |
|-----------|---------|---------------|
| File paths (relative) | `src/auth/login.ts` | No content |
| File sizes | `2345 bytes` | Just a number |
| File hashes | `sha256: abc123...` | Can't reverse to content |
| Package names | `next`, `react` | Public packages |
| Git branch | `main` | No code |
| Uncommitted count | `3 files` | Just a number |
| Config existence | `tsconfig.json exists` | No content |
| Session ID | `session_xxx` | For grouping |
| Auth token | `Bearer xxx` | For access control |

---

## Optional Cloud Backup (Explicit Opt-In)

For users who WANT cloud backup:

```typescript
// This is OPT-IN, never default
interface CloudBackupConfig {
  enabled: false,  // DEFAULT: false

  // If enabled, user explicitly chooses:
  backupSnapshots: false,
  backupFrequency: 'manual',  // 'manual' | 'daily' | 'on-snapshot'
  retentionDays: 30,

  // Encryption
  encryptionKey: 'user-provided or generated',

  // Storage
  storageProvider: 's3',
  storageBucket: 'snapback-user-backups',
}

// Even with backup enabled:
// - Content is encrypted client-side BEFORE upload
// - We store encrypted blobs, can't read them
// - User controls the key
// - Deletion is immediate and permanent
```

---

## Database Schema: Privacy Columns

```sql
-- Snapshots table: metadata ONLY, no content
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  session_id TEXT,

  -- Metadata (safe to store)
  trigger TEXT NOT NULL,              -- 'auto' | 'manual' | 'ai-detected'
  file_count INTEGER NOT NULL,        -- Just a count
  total_bytes INTEGER NOT NULL,       -- Just a sum

  -- AI detection (metadata only)
  ai_detected BOOLEAN DEFAULT false,
  ai_tool TEXT,                       -- 'cursor' | 'copilot' | etc
  ai_confidence REAL,                 -- 0.0 - 1.0

  -- File list (paths only, NO CONTENT)
  file_paths JSONB NOT NULL,          -- ['src/index.ts', 'package.json']
  -- ❌ NO file_content column
  -- ❌ NO blob_data column
  -- ❌ NO diff_content column

  -- Optional cloud backup reference (encrypted)
  cloud_backup_enabled BOOLEAN DEFAULT false,
  cloud_storage_ref TEXT,             -- S3 path to encrypted blob
  -- Even this is encrypted client-side

  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table: for grouping, no code
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Timing
  started_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,

  -- Aggregate stats (no code)
  snapshot_count INTEGER DEFAULT 0,
  files_modified INTEGER DEFAULT 0,
  ai_detection_count INTEGER DEFAULT 0,
  total_bytes_protected INTEGER DEFAULT 0,

  -- For clustering (DBSCAN)
  -- Server uses metadata patterns, not code
  activity_vector JSONB,              -- Aggregated activity metrics

  created_at TIMESTAMP DEFAULT NOW()
);

-- Telemetry: anonymous, no PII
CREATE TABLE telemetry_events (
  id TEXT PRIMARY KEY,

  -- Anonymous identity
  anonymous_id TEXT NOT NULL,         -- PostHog distinct_id, NOT user_id
  session_id TEXT,

  -- Event data (no code)
  event_type TEXT NOT NULL,
  properties JSONB NOT NULL,          -- Sanitized, no PII

  -- Client info
  client_type TEXT NOT NULL,          -- 'cli' | 'extension' | 'web'
  client_version TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

---

## Summary: The Hybrid Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   USER'S MACHINE                          SNAPBACK SERVER                    │
│   ══════════════                          ═══════════════                    │
│                                                                              │
│   ┌─────────────────┐                    ┌─────────────────┐                │
│   │  SNAP CLI       │ ── metadata ────▶  │  INTELLIGENCE   │                │
│   │                 │                    │                 │                │
│   │  • Collect data │ ◀── decisions ──── │  • Analyze      │                │
│   │  • Store local  │                    │  • Detect       │                │
│   │  • Execute      │                    │  • Score        │                │
│   │  • Display      │                    │  • Decide       │                │
│   └─────────────────┘                    └─────────────────┘                │
│           │                                      │                           │
│           │                                      │                           │
│           ▼                                      ▼                           │
│   ┌─────────────────┐                    ┌─────────────────┐                │
│   │  .snapback/     │                    │  DATABASE       │                │
│   │                 │                    │                 │                │
│   │  • Snapshots    │                    │  • User accounts│                │
│   │  • Blobs        │  CODE STAYS HERE   │  • Metadata     │  NO CODE HERE  │
│   │  • Configs      │                    │  • Analytics    │                │
│   │  • Recovery     │                    │  • Sessions     │                │
│   └─────────────────┘                    └─────────────────┘                │
│                                                                              │
│   Privacy: ✅ Code never leaves          IP: ✅ Algorithms protected         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Yes, the architecture fully supports:**
1. ✅ Local-first snapshots (code stays on user's machine)
2. ✅ Metadata-only to server (paths, sizes, counts - never content)
3. ✅ Session ID tracking (for grouping and analytics)
4. ✅ User authentication (OAuth + JWT)
5. ✅ Privacy by default (opt-in for any cloud features)

The server is "smart but blind" - it makes intelligent decisions based on metadata patterns without ever seeing the actual code.
