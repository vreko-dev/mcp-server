# SnapBack Complete Platform Specification

**Version**: 1.0
**Status**: Definitive Specification for Implementation Validation
**Generated**: December 2025
**Purpose**: Compare expectations against implementation across VS Code Extension, MCP Server, and CLI

---

## Table of Contents

1. [VS Code Extension Specification](#1-vs-code-extension-specification)
2. [MCP Server Specification](#2-mcp-server-specification)
3. [CLI Specification](#3-cli-specification)
4. [Cross-Cutting Concerns](#4-cross-cutting-concerns)
5. [Implementation Status Matrix](#5-implementation-status-matrix)

---

# 1. VS Code Extension Specification

## 1.1 Bird's Eye View

### Mission Statement
SnapBack VS Code Extension is the primary user touchpoint—a safety net for AI-assisted development that automatically protects code through intelligent snapshots, AI detection, and seamless recovery.

### Core Value Proposition
- "Git is for commits. SnapBack is for 'oh no, what did I just do?'"
- Invisible operation until needed
- Zero configuration required for protection
- Sub-100ms protection decisions

### Target Users
- Developers using AI coding assistants (Cursor, GitHub Copilot, Claude)
- Teams wanting protection against AI-generated code risks
- Individual developers seeking code safety without workflow friction

---

## 1.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    VS Code Extension Host                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Extension  │  │    Save      │  │   Snapshot   │          │
│  │   Lifecycle  │  │   Handler    │  │   Manager    │          │
│  │              │  │              │  │              │          │
│  │  • activate  │  │  • preSave   │  │  • create    │          │
│  │  • deactivate│  │  • postSave  │  │  • restore   │          │
│  │  • register  │  │  • throttle  │  │  • list      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   AI        │  │   Cooldown   │  │   Rules      │          │
│  │   Detection │  │   Manager    │  │   Manager    │          │
│  │              │  │              │  │              │          │
│  │  • detect   │  │  • check     │  │  • load      │          │
│  │  • burst    │  │  • set       │  │  • evaluate  │          │
│  │  • patterns │  │  • clear     │  │  • cache     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Storage   │  │   Telemetry  │  │   UI/UX      │          │
│  │   Manager   │  │   Client     │  │   Components │          │
│  │              │  │              │  │              │          │
│  │  • blobs    │  │  • track     │  │  • status bar│          │
│  │  • manifests│  │  • flush     │  │  • CodeLens  │          │
│  │  • sessions │  │  • sanitize  │  │  • webviews  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ File System (Local Storage)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ~/.config/Code/.../marcellelabs.snapback-vscode/               │
│  ├── blobs/           (content-addressable SHA-256)             │
│  ├── snapshots/       (lightweight JSON manifests)              │
│  ├── sessions/        (session manifests)                       │
│  ├── audit.jsonl      (append-only log)                         │
│  └── storage.json     (metadata/version)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1.3 Extension Metadata

### Package.json Requirements

```json
{
  "name": "snapback-vscode",
  "version": "1.2.5",
  "displayName": "SnapBack - Code Safety Net",
  "publisher": "MarcelleLabs",
  "engines": {
    "vscode": "^1.99.0"
  },
  "activationEvents": [
    "onStartupFinished",
    "onCommand:snapback.*",
    "workspaceContains:.snapbackrc"
  ],
  "categories": [
    "Other",
    "Source Control",
    "Programming Languages"
  ]
}
```

### Activation Events Specification

| Event | Trigger Condition | Rationale |
|-------|-------------------|-----------|
| `onStartupFinished` | After VS Code fully loads | Background protection without blocking startup |
| `onCommand:snapback.*` | Any SnapBack command | Command execution |
| `workspaceContains:.snapbackrc` | Workspace has config file | Project-specific activation |

---

## 1.4 Core Features Specification

### 1.4.1 Protection Levels

| Level | Behavior | Use Case | Default |
|-------|----------|----------|---------|
| **Watch** | Silent monitoring, snapshots only | Low-risk files | No |
| **Warn** | Show notification + snapshot | Medium-risk files | Yes |
| **Block** | Prevent save until confirmed | High-risk files | No |

#### Protection Level Configuration Schema

```typescript
interface ProtectionConfig {
  level: 'watch' | 'warn' | 'block';
  patterns: string[];           // Glob patterns
  cooldownMs?: number;          // Default: 30000 (30s)
  snapshotOnSave?: boolean;     // Default: true for warn/block
  aiDetectionEnabled?: boolean; // Default: true
}
```

### 1.4.2 Save Handler Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   VS Code   │────▶│   Pre-Save  │────▶│   Cooldown  │
│   Save      │     │   Handler   │     │   Check     │
│   Event     │     │             │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┘
                    ▼
        ┌───────────────────────┐
        │  In Cooldown?         │
        │                       │
        │  YES → Allow Save     │
        │  NO  → Continue       │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Protection Level     │
        │  Evaluation           │
        │                       │
        │  Rules + Patterns     │
        │  + AI Detection       │
        └───────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌───────────────┐
│    WATCH      │      │  WARN/BLOCK   │
│               │      │               │
│ • Log event   │      │ • Create      │
│ • Continue    │      │   snapshot    │
│   save        │      │ • Show UI     │
└───────────────┘      │ • Wait for    │
                       │   decision    │
                       └───────────────┘
```

#### Save Handler Performance Requirements

| Metric | Budget | Scenario |
|--------|--------|----------|
| p95 Latency | ≤50ms | Protected file, no snapshot |
| p95 Latency | ≤100ms | Protected file, with snapshot |
| p99 Latency | ≤150ms | Any scenario |

### 1.4.3 AI Detection System

#### Detection Methods

| Method | Description | Accuracy Target | Performance |
|--------|-------------|-----------------|-------------|
| **Burst Detection** | Rapid multi-file changes | 95%+ | <10ms |
| **Pattern Matching** | Known AI tool signatures | 90%+ | <5ms |
| **Edit Velocity** | Characters/second analysis | 85%+ | <5ms |
| **Semantic Analysis** | Code structure patterns | 80%+ | <20ms (Pro) |

#### AI Tool Detection Signatures

```typescript
interface AIToolSignature {
  tool: 'cursor' | 'copilot' | 'claude' | 'windsurf' | 'unknown';
  indicators: {
    // Edit pattern indicators
    editVelocity: { min: number; max: number }; // chars/sec
    batchSize: { typical: number; variance: number };

    // Content indicators
    commentPatterns?: RegExp[];
    structurePatterns?: string[];

    // Behavioral indicators
    multiFileEdit?: boolean;
    sequentialFiles?: boolean;
  };
  confidence: {
    threshold: number;  // 0.0 - 1.0
    weightings: Record<string, number>;
  };
}
```

#### Detection Event Schema

```typescript
interface AIDetectionEvent {
  detected: boolean;
  tool: string | null;
  confidence: number;       // 0.0 - 1.0
  signals: {
    burstDetected: boolean;
    editVelocity: number;
    patternMatches: string[];
    semanticScore?: number; // Pro tier only
  };
  timestamp: number;
  filePath: string;         // Sanitized for telemetry
}
```

### 1.4.4 Snapshot System

#### Snapshot Architecture (File-Based)

```
Storage Directory Structure:
├── blobs/                    # Content-addressable storage
│   ├── ab/
│   │   └── cd/
│   │       └── abcdef123...  # SHA-256 hash as filename
│   └── de/
│       └── f4/
│           └── def456789...
├── snapshots/                # Lightweight manifests
│   └── snap-1733062242000-x7f9a2.json
├── sessions/                 # Session groupings
│   └── sess-1733062242000-b3k8m1.json
├── audit.jsonl               # Append-only audit log
└── storage.json              # Metadata/versioning
```

#### Snapshot Manifest Schema

```typescript
interface SnapshotManifest {
  id: string;                 // snap-{timestamp}-{random6}
  timestamp: number;          // Unix ms
  name: string;               // Human-readable
  trigger: 'auto' | 'manual' | 'ai-detected' | 'pre-save';
  files: Record<string, SnapshotFileRef>;
  metadata?: {
    riskScore?: number;
    aiDetection?: {
      detected: boolean;
      tool?: string;
      confidence?: number;
    };
    sessionId?: string;
  };
}

interface SnapshotFileRef {
  blob: string;    // SHA-256 hash
  size: number;    // Bytes
}
```

#### Blob Storage Implementation

```typescript
// Content-addressable storage with deduplication
class BlobStore {
  // Store content, return hash
  async store(content: string): Promise<{
    hash: string;
    size: number;
    isNew: boolean;  // false = deduplication hit
  }>;

  // Retrieve by hash
  async retrieve(hash: string): Promise<string | null>;

  // Check existence
  async exists(hash: string): Promise<boolean>;

  // Path: ab/cd/abcdef... (2-level hierarchy)
  getBlobPath(hash: string): string;
}
```

### 1.4.5 Session Management

#### Session Lifecycle

```
SESSION LIFECYCLE
================

┌─────────────┐
│   IDLE      │◀───────────────────────────────────┐
│             │                                    │
└──────┬──────┘                                    │
       │ First edit detected                       │
       ▼                                           │
┌─────────────┐                                    │
│   ACTIVE    │                                    │
│             │                                    │
│ • Track     │                                    │
│   edits     │      Inactivity timeout (5min)    │
│ • Create    │────────────────────────────────────┤
│   snapshots │                                    │
└──────┬──────┘                                    │
       │ Explicit end or                           │
       │ window close                              │
       ▼                                           │
┌─────────────┐                                    │
│  FINALIZING │                                    │
│             │                                    │
│ • Write     │                                    │
│   manifest  │                                    │
│ • Generate  │                                    │
│   summary   │                                    │
└──────┬──────┘                                    │
       │                                           │
       └───────────────────────────────────────────┘
```

#### Session Manifest Schema

```typescript
interface SessionManifest {
  id: string;                 // sess-{timestamp}-{random6}
  startedAt: number;          // Unix ms
  endedAt: number;            // Unix ms
  reason: 'idle' | 'manual' | 'window-close' | 'timeout';
  files: SessionFileEntry[];
  tags?: string[];
  summary?: string;
}

interface SessionFileEntry {
  filePath: string;
  snapshotId: string;
  changeStats: {
    added: number;
    deleted: number;
  };
}
```

### 1.4.6 Cooldown System

#### Cooldown Specification

```typescript
interface CooldownEntry {
  filePath: string;
  protectionLevel: string;
  triggeredAt: number;     // Unix ms
  expiresAt: number;       // Unix ms
  actionTaken: string;     // 'blocked' | 'warned' | 'proceeded'
  snapshotId?: string;
}

// Implementation: In-memory only (no persistence)
// Rationale: Cooldowns are ephemeral, reset on extension reload
class CooldownCache {
  private cache: Map<string, CooldownEntry>;

  // Key format: {filePath}::{protectionLevel}
  set(entry: CooldownEntry): void;
  get(filePath: string, level: string): CooldownEntry | null;
  isInCooldown(filePath: string, level: string): boolean;
  getRemainingTime(filePath: string, level: string): number;

  // Automatic cleanup every 60s
  removeExpired(): number;
}
```

#### Default Cooldown Durations

| Protection Level | Default Duration | Configurable |
|------------------|------------------|--------------|
| Watch | 10 seconds | Yes |
| Warn | 30 seconds | Yes |
| Block | 60 seconds | Yes |

---

## 1.5 Commands Specification

### Registered Commands

| Command ID | Title | Keybinding | When Clause |
|------------|-------|------------|-------------|
| `snapback.createSnapshot` | Create Snapshot | `Ctrl+Shift+S` | `editorTextFocus` |
| `snapback.listSnapshots` | List Snapshots | - | Always |
| `snapback.restoreSnapshot` | Restore Snapshot | - | `snapback.hasSnapshots` |
| `snapback.showHistory` | Show File History | - | `editorTextFocus` |
| `snapback.setProtection` | Set Protection Level | - | `editorTextFocus` |
| `snapback.toggleProtection` | Toggle Protection | `Ctrl+Shift+P` | Always |
| `snapback.initialize` | Initialize SnapBack | - | `!snapback.initialized` |
| `snapback.authenticate` | Authenticate | - | `!snapback.authenticated` |
| `snapback.openDashboard` | Open Dashboard | - | `snapback.authenticated` |
| `snapback.configureRules` | Configure Rules | - | Always |
| `snapback.showLogs` | Show Logs | - | Always |
| `snapback.enableOfflineMode` | Enable Offline Mode | - | Always |
| `snapback.disableOfflineMode` | Disable Offline Mode | - | Always |

### Command Implementation Requirements

```typescript
interface CommandRegistration {
  command: string;
  callback: (...args: any[]) => Promise<void>;
  errorHandling: 'notify' | 'silent' | 'throw';
  telemetry: {
    event: string;
    properties?: Record<string, unknown>;
  };
  preConditions?: string[];  // When clauses
}
```

---

## 1.6 UI Components Specification

### 1.6.1 Status Bar Item

```typescript
interface StatusBarConfig {
  id: 'snapback-status';
  alignment: StatusBarAlignment.Right;
  priority: 100;

  states: {
    protected: {
      text: '$(shield) Protected';
      tooltip: 'SnapBack active - {snapshotCount} snapshots';
      color: 'statusBar.foreground';
    };
    warning: {
      text: '$(warning) Warning';
      tooltip: 'AI changes detected';
      color: 'statusBarItem.warningForeground';
    };
    inactive: {
      text: '$(shield-x) Inactive';
      tooltip: 'SnapBack not initialized';
      color: 'statusBarItem.errorForeground';
    };
    offline: {
      text: '$(cloud-offline) Offline';
      tooltip: 'Working offline';
      color: 'statusBar.foreground';
    };
  };
}
```

### 1.6.2 CodeLens Provider

```typescript
interface SnapBackCodeLensProvider {
  // Show protection status above functions/classes
  provideCodeLenses(document: TextDocument): CodeLens[];

  lensTypes: {
    protection: {
      title: 'Protection: {level}';
      command: 'snapback.setProtection';
    };
    lastSnapshot: {
      title: 'Last snapshot: {relativeTime}';
      command: 'snapback.showHistory';
    };
    aiDetected: {
      title: '$(sparkle) AI detected';
      command: 'snapback.viewAIChanges';
    };
  };
}
```

### 1.6.3 Notification System

```typescript
interface NotificationConfig {
  // Use inline CodeLens + status bar instead of modal dialogs
  strategy: 'non-intrusive';

  channels: {
    statusBar: boolean;    // Primary
    codeLens: boolean;     // Contextual
    notification: boolean; // Major events only
    modal: boolean;        // Never (except critical errors)
  };

  events: {
    snapshotCreated: 'statusBar';
    aiDetected: 'codeLens';
    protectionTriggered: 'notification';
    restoreComplete: 'notification';
    errorCritical: 'notification';
  };
}
```

### 1.6.4 Welcome View (First-Run Wizard)

```typescript
interface WelcomeView {
  type: 'webview';
  id: 'snapback-welcome';

  steps: [
    {
      id: 'intro';
      title: 'Welcome to SnapBack';
      description: 'Your safety net for AI-assisted development';
      action: 'Continue';
    },
    {
      id: 'auth';
      title: 'Connect Your Account';
      description: 'Sign in with GitHub or Google';
      action: 'snapback.authenticate';
    },
    {
      id: 'setup';
      title: 'Initialize Protection';
      description: 'Protect your workspace';
      action: 'snapback.initialize';
    },
    {
      id: 'configure';
      title: 'Configure Rules';
      description: 'Customize protection levels';
      action: 'snapback.configureRules';
    },
    {
      id: 'complete';
      title: 'You\'re Protected!';
      description: 'Start coding safely';
      action: 'Close';
    }
  ];
}
```

---

## 1.7 Configuration Schema

### VS Code Settings

```typescript
interface SnapBackSettings {
  // Core settings
  'snapback.enabled': boolean;                    // Default: true
  'snapback.defaultProtectionLevel': 'watch' | 'warn' | 'block'; // Default: 'warn'

  // AI Detection
  'snapback.aiDetection.enabled': boolean;        // Default: true
  'snapback.aiDetection.sensitivity': 'low' | 'medium' | 'high'; // Default: 'medium'
  'snapback.aiDetection.burstThreshold': number;  // Default: 5 (files/second)

  // Cooldowns
  'snapback.cooldowns.watch': number;             // Default: 10000 (ms)
  'snapback.cooldowns.warn': number;              // Default: 30000 (ms)
  'snapback.cooldowns.block': number;             // Default: 60000 (ms)

  // Storage
  'snapback.storage.maxSnapshots': number;        // Default: 1000
  'snapback.storage.retentionDays': number;       // Default: 30
  'snapback.storage.cloudBackup': boolean;        // Default: false (Pro)

  // Telemetry
  'snapback.telemetry.enabled': boolean;          // Default: true
  'snapback.telemetry.anonymousId': string;       // Auto-generated

  // Advanced
  'snapback.offline.enabled': boolean;            // Default: false
  'snapback.debug.enabled': boolean;              // Default: false
  'snapback.debug.logLevel': 'error' | 'warn' | 'info' | 'debug'; // Default: 'info'
}
```

### Workspace Configuration (.snapbackrc)

```json
{
  "$schema": "https://snapback.dev/schemas/snapbackrc.json",
  "version": "1.0",
  "rules": [
    {
      "pattern": "**/*.ts",
      "protection": "warn",
      "aiDetection": true
    },
    {
      "pattern": "**/migrations/**",
      "protection": "block"
    },
    {
      "pattern": "**/test/**",
      "protection": "watch"
    }
  ],
  "ignore": [
    "node_modules/**",
    "dist/**",
    ".git/**"
  ],
  "settings": {
    "autoSnapshot": true,
    "snapshotOnBranch": true
  }
}
```

---

## 1.8 Telemetry Specification

### Event Categories

| Category | Events | Purpose |
|----------|--------|---------|
| Lifecycle | `extension.activated`, `extension.deactivated` | Usage patterns |
| Commands | `command.execution` | Feature adoption |
| Protection | `snapshot.created`, `risk.detected`, `snapback.used` | Core metrics |
| Onboarding | `onboarding.phase.progressed`, `walkthrough.step.completed` | Funnel tracking |
| Errors | `error` | Debugging |

### Core Telemetry Events

```typescript
// Event: save_attempt
interface SaveAttemptEvent {
  event: 'save_attempt';
  properties: {
    protection: 'watch' | 'warn' | 'block';
    severity: 'low' | 'medium' | 'high' | 'critical';
    file_kind: string;          // Extension only
    reason: string;
    ai_present: boolean;
    ai_burst: boolean;
    outcome: 'allowed' | 'warned' | 'blocked' | 'restored';
  };
}

// Event: snapshot_created
interface SnapshotCreatedEvent {
  event: 'snapshot_created';
  properties: {
    session_id: string;
    snapshot_id: string;
    bytes_original: number;
    bytes_stored: number;       // After dedup
    dedup_hit: boolean;
    latency_ms: number;
  };
}

// Event: session_finalized
interface SessionFinalizedEvent {
  event: 'session_finalized';
  properties: {
    session_id: string;
    files: number;
    triggers: number;
    duration_ms: number;
    ai_present: boolean;
    ai_burst: boolean;
    highest_severity: string;
  };
}
```

### Privacy Requirements

```typescript
const BLOCKED_PROPERTIES = [
  'path', 'filePath', 'fileName', 'fullPath',
  'email', 'user', 'userId', 'name',
  'ip', 'ipAddress', 'location',
  'content', 'code', 'diff',
];

// All events must:
// 1. Never include file paths (only extensions)
// 2. Never include code content
// 3. Use anonymousId, never userId
// 4. Scrub IP before forwarding
```

---

## 1.9 Performance Requirements

### Activation Performance

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Cold start | ≤500ms | Extension activation to ready |
| Bundle parse | ≤100ms | JavaScript parsing time |
| First interaction | ≤200ms | Command response time |

### Runtime Performance

| Operation | Budget | Percentile |
|-----------|--------|------------|
| Protection level lookup | ≤5ms | p95 |
| Cooldown check | ≤1ms | p95 |
| Snapshot creation | ≤100ms | p95 |
| Session finalization | ≤50ms | average |
| Manifest creation | ≤20ms | average |

### Bundle Size Requirements

| Component | Budget | Current |
|-----------|--------|---------|
| Total VSIX | ≤2MB | ~11MB (BLOCKER) |
| extension.js | ≤1.5MB | TBD |
| Assets | ≤500KB | TBD |

### Memory Requirements

| Metric | Budget |
|--------|--------|
| Idle memory | ≤50MB |
| Peak memory | ≤200MB |
| Memory leak tolerance | 0 |

---

## 1.10 Testing Requirements

### Unit Test Coverage

| Module | Minimum Coverage | Critical |
|--------|------------------|----------|
| SaveHandler | 90% | Yes |
| SnapshotManager | 85% | Yes |
| AIDetection | 85% | Yes |
| CooldownCache | 90% | Yes |
| StorageManager | 80% | Yes |
| RulesManager | 80% | No |

### Integration Tests

| Scenario | Priority | Automated |
|----------|----------|-----------|
| Save → Snapshot creation | P0 | Yes |
| AI Detection → Warning shown | P0 | Yes |
| Restore → File recovery | P0 | Yes |
| Auth flow → Token storage | P0 | Yes |
| Offline mode → Graceful fallback | P1 | Yes |

### E2E Tests (Activation Funnel)

```
Install → Authenticate → First Protected Save → Dashboard View
  ↓           ↓                    ↓                  ↓
Tracked   Tracked             Tracked            Tracked
```

---

## 1.11 Security Requirements

### Path Validation

```typescript
interface PathValidation {
  // Prevent directory traversal
  allowedPatterns: string[];
  blockedPatterns: string[];

  validate(path: string): ValidationResult;

  checks: [
    'No .. sequences',
    'Within workspace boundary',
    'No symlink escape',
    'No null bytes',
    'Valid UTF-8'
  ];
}
```

### Authentication Flow

```
Extension                   Web Portal                  API Backend
    │                           │                           │
    │   Open browser            │                           │
    │──────────────────────────▶│                           │
    │                           │                           │
    │                           │   OAuth (GitHub/Google)   │
    │                           │──────────────────────────▶│
    │                           │                           │
    │                           │◀──────────────────────────│
    │                           │   Session created         │
    │                           │                           │
    │   Poll for grant          │                           │
    │──────────────────────────▶│                           │
    │                           │                           │
    │◀──────────────────────────│                           │
    │   API Key returned        │                           │
    │                           │                           │
    │   Store securely          │                           │
    │   (VS Code secrets)       │                           │
```

### API Key Storage

```typescript
// Use VS Code's secure storage
const secretStorage = context.secrets;
await secretStorage.store('snapback.apiKey', apiKey);

// Never:
// - Store in settings (visible)
// - Store in Memento (not encrypted)
// - Log to console
// - Include in telemetry
```

---

## 1.12 Dependencies Specification

### Required Dependencies

| Package | Purpose | External? |
|---------|---------|-----------|
| `vscode` | VS Code API | Yes (not bundled) |
| `posthog-node` | Telemetry | No |
| `zod` | Schema validation | No |
| `simple-git` | Git integration | No |

### Removed Dependencies (Bundle Size)

| Package | Previous Use | Replacement |
|---------|--------------|-------------|
| `better-sqlite3` | Database | File-based storage |
| `sql.js` | WASM SQLite | File-based storage |
| `@sentry/node` | Error tracking | PostHog errors |

### Bundle Configuration

```javascript
// esbuild.config.cjs
module.exports = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  external: ['vscode'],  // Only VS Code API
  minify: true,
  treeShaking: true,
  sourcemap: false,  // Production
};
```

---

## 1.13 Error Handling Specification

### Error Categories

| Category | Handling | User Notification |
|----------|----------|-------------------|
| Recoverable | Log + continue | Status bar update |
| Degraded | Fallback mode | Toast notification |
| Critical | Disable feature | Modal (rare) |
| Fatal | Extension disable | Modal |

### Error Boundaries

```typescript
// All async operations must have error boundaries
async function safeOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    Logger.error(`${context}:`, error);
    Telemetry.trackError(context, error);
    return fallback;
  }
}
```

### Logging Levels

| Level | Use Case | Output |
|-------|----------|--------|
| ERROR | Exceptions, failures | Always |
| WARN | Degraded operation | Always |
| INFO | State changes | Default |
| DEBUG | Detailed flow | Opt-in |

---

# 2. MCP Server Specification

## 2.1 Bird's Eye View

### Mission Statement
The MCP (Model Context Protocol) Server enables AI coding assistants to interact with SnapBack protection capabilities, providing tools for risk analysis, dependency checking, and checkpoint management.

### Integration Targets
- Cursor IDE
- Continue (VS Code extension)
- Claude Desktop
- Custom AI integrations

### Architecture Pattern
```
AI Assistant ──── MCP Protocol ───── MCP Server ───── SnapBack Backend
              (STDIO/HTTP/SSE)                    (API Proxy for Pro)
```

---

## 2.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Server                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Transport  │  │     Tool     │  │     Auth     │          │
│  │    Layer     │  │   Registry   │  │    Layer     │          │
│  │              │  │              │  │              │          │
│  │  • STDIO     │  │  • Register  │  │  • API Key   │          │
│  │  • HTTP/SSE  │  │  • Execute   │  │  • Tier      │          │
│  │              │  │  • Validate  │  │  • Cache     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     TOOL IMPLEMENTATIONS                  │  │
│  │                                                          │  │
│  │  FREE TIER                        PRO TIER               │  │
│  │  ┌─────────────────────┐         ┌─────────────────────┐ │  │
│  │  │ analyze_risk        │         │ create_checkpoint   │ │  │
│  │  │ check_dependencies  │         │ list_checkpoints    │ │  │
│  │  │ catalog.list_tools  │         │ restore_checkpoint  │ │  │
│  │  │ ctx7.resolve-lib    │         │ advanced_analysis   │ │  │
│  │  │ ctx7.get-lib-docs   │         │                     │ │  │
│  │  └─────────────────────┘         └─────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Security   │  │  Performance │  │   External   │          │
│  │   Utils      │  │   Tracking   │  │  Integration │          │
│  │              │  │              │  │              │          │
│  │  • Path val  │  │  • Budgets   │  │  • Context7  │          │
│  │  • Input val │  │  • Metrics   │  │  • MCP Ext   │          │
│  │  • Boundary  │  │  • Timeouts  │  │  • Backend   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2.3 Transport Specification

### STDIO Transport (Primary)

```typescript
interface STDIOTransport {
  input: NodeJS.ReadStream;   // stdin
  output: NodeJS.WriteStream; // stdout

  // Message format: JSON-RPC 2.0
  messageFormat: {
    jsonrpc: '2.0';
    method: string;
    params?: Record<string, unknown>;
    id?: number | string;
  };
}
```

### HTTP Transport (SSE)

```typescript
interface HTTPTransport {
  endpoints: {
    sse: '/sse';           // Server-sent events
    messages: '/messages'; // POST for client messages
    health: '/health';     // Health check
    version: '/version';   // Version info
  };

  cors: {
    origin: '*';           // Configurable
    methods: ['GET', 'POST'];
  };

  port: number;            // Default: 3000
}
```

---

## 2.4 Tool Specifications

### 2.4.1 snapback.analyze_risk

| Property | Value |
|----------|-------|
| **Tier** | Free |
| **Description** | Analyze code changes for potential risks |
| **Performance Budget** | 200ms |

**Input Schema:**
```typescript
interface AnalyzeRiskInput {
  diff: string;           // Code diff to analyze
  filePath: string;       // Target file (validated)
  context?: {
    language?: string;    // 'typescript', 'javascript', etc.
    framework?: string;   // 'react', 'node', etc.
    aiTool?: string;      // 'cursor', 'copilot', etc.
  };
}
```

**Output Schema:**
```typescript
interface AnalyzeRiskOutput {
  risk: 'low' | 'medium' | 'high' | 'critical';
  score: number;          // 0-100
  issues: Array<{
    type: string;
    severity: string;
    location?: { line: number; column: number };
    message: string;
    suggestion?: string;
  }>;
  recommendation: 'proceed' | 'review' | 'snapshot' | 'block';
  aiDetection?: {
    detected: boolean;
    tool?: string;
    confidence?: number;
  };
}
```

**Implementation:**
```typescript
// Free tier: Local pattern matching
// Pro tier: Server-side ML analysis (proxied)

async function analyzeRisk(input: AnalyzeRiskInput): Promise<AnalyzeRiskOutput> {
  // 1. Validate input
  const validated = AnalyzeRiskInputSchema.parse(input);

  // 2. Path validation (security)
  validateFilePath(validated.filePath);

  // 3. Execute analysis
  if (context.tier === 'free') {
    return localAnalysis(validated);
  } else {
    return backendProxy('/v1/analyze/risk', validated);
  }
}
```

### 2.4.2 snapback.check_dependencies

| Property | Value |
|----------|-------|
| **Tier** | Free |
| **Description** | Check for dependency-related risks |
| **Performance Budget** | 300ms |

**Input Schema:**
```typescript
interface CheckDependenciesInput {
  packageJson: string;        // package.json content
  lockFile?: string;          // package-lock.json or yarn.lock
  operation: 'add' | 'remove' | 'update';
  packages: string[];         // Affected packages
}
```

**Output Schema:**
```typescript
interface CheckDependenciesOutput {
  status: 'safe' | 'warning' | 'danger';
  issues: Array<{
    package: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
  vulnerabilities?: Array<{
    package: string;
    cve?: string;
    severity: string;
    fixAvailable: boolean;
  }>;
}
```

### 2.4.3 snapback.create_checkpoint (Pro)

| Property | Value |
|----------|-------|
| **Tier** | Pro |
| **Description** | Create a code checkpoint before risky changes |
| **Performance Budget** | 500ms |

**Input Schema:**
```typescript
interface CreateCheckpointInput {
  files: string[];            // Files to checkpoint
  name?: string;              // Optional name
  reason?: string;            // Reason for checkpoint
}
```

**Output Schema:**
```typescript
interface CreateCheckpointOutput {
  checkpointId: string;
  timestamp: number;
  files: Array<{
    path: string;
    hash: string;
    size: number;
  }>;
  expiresAt?: number;         // Free tier: 24h retention
}
```

### 2.4.4 snapback.list_checkpoints (Pro)

| Property | Value |
|----------|-------|
| **Tier** | Pro |
| **Description** | List available checkpoints |
| **Performance Budget** | 100ms |

**Input Schema:**
```typescript
interface ListCheckpointsInput {
  limit?: number;             // Default: 20
  filePath?: string;          // Filter by file
  since?: number;             // Unix timestamp
}
```

**Output Schema:**
```typescript
interface ListCheckpointsOutput {
  checkpoints: Array<{
    id: string;
    name?: string;
    timestamp: number;
    fileCount: number;
    totalSize: number;
    reason?: string;
  }>;
  hasMore: boolean;
}
```

### 2.4.5 snapback.restore_checkpoint (Pro)

| Property | Value |
|----------|-------|
| **Tier** | Pro |
| **Description** | Restore code from checkpoint |
| **Performance Budget** | 500ms |

**Input Schema:**
```typescript
interface RestoreCheckpointInput {
  checkpointId: string;
  files?: string[];           // Specific files (optional)
  dryRun?: boolean;           // Preview without restoring
}
```

**Output Schema:**
```typescript
interface RestoreCheckpointOutput {
  success: boolean;
  restored: Array<{
    path: string;
    status: 'restored' | 'skipped' | 'error';
    diff?: string;            // If dryRun
    error?: string;
  }>;
}
```

### 2.4.6 catalog.list_tools

| Property | Value |
|----------|-------|
| **Tier** | Free |
| **Description** | List available MCP tools |
| **Performance Budget** | 50ms |

**Output Schema:**
```typescript
interface ListToolsOutput {
  tools: Array<{
    name: string;
    description: string;
    tier: 'free' | 'pro';
    inputSchema: JSONSchema;
  }>;
}
```

### 2.4.7 ctx7.resolve-library-id

| Property | Value |
|----------|-------|
| **Tier** | Free |
| **Description** | Resolve library name to Context7 ID |
| **Performance Budget** | 1000ms |

**Input Schema:**
```typescript
interface ResolveLibraryInput {
  libraryName: string;        // e.g., 'react', 'lodash'
}
```

**Output Schema:**
```typescript
interface ResolveLibraryOutput {
  libraryId: string;          // Context7 ID
  name: string;
  version: string;
  description?: string;
}
```

### 2.4.8 ctx7.get-library-docs

| Property | Value |
|----------|-------|
| **Tier** | Free |
| **Description** | Get library documentation |
| **Performance Budget** | 2000ms |

**Input Schema:**
```typescript
interface GetLibraryDocsInput {
  libraryId: string;          // From resolve-library-id
  topic?: string;             // Specific topic
  tokens?: number;            // Max tokens (default: 5000)
}
```

**Output Schema:**
```typescript
interface GetLibraryDocsOutput {
  documentation: string;
  source: string;
  version: string;
  lastUpdated: string;
}
```

---

## 2.5 Authentication Specification

### API Key Validation

```typescript
interface AuthConfig {
  // API key format
  keyPrefix: 'sk_live_' | 'sk_test_';
  keyLength: 32;

  // Caching
  cacheTTL: 60;               // 1 minute
  cacheStrategy: 'memory';

  // Validation
  validateEndpoint: '/v1/auth/validate';
}

interface AuthResult {
  valid: boolean;
  userId?: string;
  orgId?: string;
  tier: 'free' | 'pro' | 'enterprise';
  permissions: string[];
  rateLimits: {
    requests: number;
    window: number;
  };
}
```

### Tier Gating

```typescript
const TIER_TOOLS: Record<string, string[]> = {
  free: [
    'snapback.analyze_risk',
    'snapback.check_dependencies',
    'catalog.list_tools',
    'ctx7.resolve-library-id',
    'ctx7.get-library-docs',
  ],
  pro: [
    // Includes all free tools
    'snapback.create_checkpoint',
    'snapback.list_checkpoints',
    'snapback.restore_checkpoint',
  ],
  enterprise: [
    // Includes all pro tools
    'snapback.team_policies',
    'snapback.audit_log',
  ],
};
```

---

## 2.6 Security Specification

### Input Validation

```typescript
// All inputs validated with Zod
const InputValidation = {
  // File paths
  filePath: z.string()
    .max(1000)
    .refine(path => !path.includes('..'))
    .refine(path => !path.includes('\0')),

  // Code content
  content: z.string()
    .max(1_000_000),  // 1MB limit

  // Package names
  packageName: z.string()
    .regex(/^[@a-z0-9-_./]+$/i),
};
```

### Path Validation

```typescript
interface PathValidation {
  // Validate path is within workspace
  validateWorkspaceBoundary(path: string, workspace: string): boolean;

  // Check for traversal attempts
  detectTraversalAttempt(path: string): boolean;

  // Validate symlinks don't escape
  validateSymlink(path: string): Promise<boolean>;

  // Security violations are telemetered
  reportViolation(type: string, details: object): void;
}
```

### Error Sanitization

```typescript
// Production error messages never leak:
// - Stack traces
// - File paths
// - System information
// - Internal state

function sanitizeError(error: Error): MCP_Error {
  if (process.env.NODE_ENV === 'production') {
    return {
      code: error.code || 'INTERNAL_ERROR',
      message: 'An error occurred',  // Generic
    };
  }
  return { code: error.code, message: error.message };
}
```

---

## 2.7 Performance Specification

### Operation Budgets

| Tool | Budget | Timeout |
|------|--------|---------|
| analyze_risk | 200ms | 5s |
| check_dependencies | 300ms | 5s |
| create_checkpoint | 500ms | 10s |
| list_checkpoints | 100ms | 2s |
| restore_checkpoint | 500ms | 10s |
| catalog.list_tools | 50ms | 1s |
| ctx7.resolve-library-id | 1000ms | 10s |
| ctx7.get-library-docs | 2000ms | 30s |

### Caching Strategy

```typescript
interface CacheConfig {
  // Auth results
  auth: {
    ttl: 60,              // 1 minute
    maxSize: 1000,
  },

  // Context7 results
  context7: {
    ttl: 3600,            // 1 hour
    maxSize: 100,
  },

  // Tool catalog
  toolCatalog: {
    ttl: 300,             // 5 minutes
    maxSize: 10,
  },
};
```

### Resilience Patterns

```typescript
interface ResilienceConfig {
  // Retry logic
  retry: {
    maxAttempts: 3,
    backoffMs: [100, 500, 2000],
    retryableErrors: ['TIMEOUT', 'CONNECTION_RESET'],
  },

  // Circuit breaker
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
  },

  // Concurrency
  concurrency: {
    maxParallel: 10,
    queueSize: 100,
  },
};
```

---

## 2.8 External Integration Specification

### Context7 Service

```typescript
interface Context7Service {
  baseUrl: 'https://context7.com/api/v1';

  endpoints: {
    resolve: '/libraries/resolve';
    docs: '/libraries/{id}/docs';
  };

  retry: {
    maxAttempts: 3,
    exponentialBackoff: true,
  };

  cache: {
    enabled: true,
    ttl: 3600,
  };
}
```

### Backend API Proxy

```typescript
interface BackendProxy {
  baseUrl: 'https://api.snapback.dev';

  endpoints: {
    analyzeRisk: '/v1/analyze/risk',
    validateRollback: '/v1/snapshots/{id}/validate-rollback',
    smartGrouping: '/v1/analyze/grouping',
  };

  // Authentication
  auth: {
    type: 'bearer',
    header: 'Authorization',
  };

  // Client identification
  headers: {
    'X-Client-Type': 'mcp',
    'X-Client-Version': string,
  };
}
```

---

## 2.9 Testing Requirements

### Unit Test Coverage

| Module | Minimum Coverage |
|--------|------------------|
| Tool implementations | 80% |
| Authentication | 90% |
| Security utils | 90% |
| Transport layer | 70% |

### Integration Tests

| Scenario | Priority |
|----------|----------|
| STDIO transport communication | P0 |
| Tool execution (all tools) | P0 |
| Auth flow with caching | P0 |
| Backend proxy calls | P1 |
| Context7 integration | P1 |
| Error handling | P1 |

### Contract Tests

```typescript
// Extension ↔ MCP contract
describe('MCP Contract', () => {
  it('analyze_risk accepts extension format', async () => {
    const response = await mcp.callTool('snapback.analyze_risk', {
      diff: '+ const x = 1;',
      filePath: '/src/test.ts',
    });
    expect(response).toMatchSchema(AnalyzeRiskOutputSchema);
  });
});
```

---

# 3. CLI Specification

## 3.1 Bird's Eye View

### Mission Statement
The SnapBack CLI provides command-line access to SnapBack functionality for automation, CI/CD integration, and power users who prefer terminal-based workflows.

### Target Users
- DevOps engineers setting up CI/CD pipelines
- Power users preferring terminal workflows
- Automation scripts and tooling
- System administrators managing team installations

### Installation Methods
```bash
# NPM (global)
npm install -g @snapback/cli

# Homebrew
brew install snapback

# Direct download
curl -fsSL https://get.snapback.dev | sh
```

---

## 3.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SnapBack CLI                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Command    │  │   Config     │  │    Auth      │          │
│  │   Parser     │  │   Manager    │  │   Manager    │          │
│  │              │  │              │  │              │          │
│  │  • yargs     │  │  • .snapbackrc│ │  • API key   │          │
│  │  • help      │  │  • env vars  │  │  • Token     │          │
│  │  • version   │  │  • defaults  │  │  • OAuth     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    COMMAND GROUPS                         │  │
│  │                                                          │  │
│  │  SNAPSHOT          CONFIG           AUTH                 │  │
│  │  ┌──────────┐     ┌──────────┐     ┌──────────┐         │  │
│  │  │ create   │     │ init     │     │ login    │         │  │
│  │  │ list     │     │ set      │     │ logout   │         │  │
│  │  │ restore  │     │ get      │     │ status   │         │  │
│  │  │ diff     │     │ validate │     │ token    │         │  │
│  │  │ delete   │     │          │     │          │         │  │
│  │  └──────────┘     └──────────┘     └──────────┘         │  │
│  │                                                          │  │
│  │  ANALYZE           PROTECT          CI/CD (Pro)          │  │
│  │  ┌──────────┐     ┌──────────┐     ┌──────────┐         │  │
│  │  │ risk     │     │ enable   │     │ check    │         │  │
│  │  │ deps     │     │ disable  │     │ gate     │         │  │
│  │  │ history  │     │ status   │     │ report   │         │  │
│  │  └──────────┘     └──────────┘     └──────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Output     │  │    API       │  │   Storage    │          │
│  │   Formatter  │  │   Client     │  │   Client     │          │
│  │              │  │              │  │              │          │
│  │  • json      │  │  • REST      │  │  • Local     │          │
│  │  • table     │  │  • WebSocket │  │  • Cloud     │          │
│  │  • plain     │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3.3 Command Reference

### 3.3.1 Global Options

```bash
snapback [command] [options]

Global Options:
  --help, -h      Show help
  --version, -v   Show version
  --config, -c    Config file path (default: .snapbackrc)
  --json          Output as JSON
  --quiet, -q     Suppress output except errors
  --verbose       Verbose output
  --api-key       API key (or SNAPBACK_API_KEY env)
```

### 3.3.2 Snapshot Commands

#### `snapback snapshot create`

```bash
snapback snapshot create [files...] [options]

Create a code snapshot.

Arguments:
  files           Files to snapshot (default: all protected)

Options:
  --name, -n      Snapshot name
  --message, -m   Snapshot message
  --all, -a       Include all tracked files

Examples:
  snapback snapshot create src/index.ts
  snapback snapshot create --all --name "pre-deploy"
  snapback snapshot create src/**/*.ts --message "Before refactor"
```

**Implementation:**
```typescript
interface SnapshotCreateOptions {
  files: string[];
  name?: string;
  message?: string;
  all?: boolean;
}

interface SnapshotCreateResult {
  id: string;
  timestamp: number;
  files: string[];
  totalSize: number;
}
```

#### `snapback snapshot list`

```bash
snapback snapshot list [options]

List available snapshots.

Options:
  --limit, -l     Maximum snapshots to show (default: 20)
  --file, -f      Filter by file path
  --since         Show snapshots since date
  --until         Show snapshots until date
  --format        Output format: table|json|plain

Examples:
  snapback snapshot list
  snapback snapshot list --limit 50 --format json
  snapback snapshot list --file src/index.ts --since 2024-01-01
```

#### `snapback snapshot restore`

```bash
snapback snapshot restore <id> [options]

Restore code from a snapshot.

Arguments:
  id              Snapshot ID

Options:
  --files, -f     Specific files to restore
  --dry-run       Preview changes without applying
  --force         Skip confirmation prompt

Examples:
  snapback snapshot restore snap-1733062242000-x7f9a2
  snapback snapshot restore snap-1733062242000-x7f9a2 --dry-run
  snapback snapshot restore snap-1733062242000-x7f9a2 --files src/index.ts
```

#### `snapback snapshot diff`

```bash
snapback snapshot diff <id> [options]

Show differences from snapshot.

Arguments:
  id              Snapshot ID

Options:
  --file, -f      Specific file to diff
  --stat          Show only statistics
  --color         Force colored output

Examples:
  snapback snapshot diff snap-1733062242000-x7f9a2
  snapback snapshot diff snap-1733062242000-x7f9a2 --stat
```

#### `snapback snapshot delete`

```bash
snapback snapshot delete <id> [options]

Delete a snapshot.

Arguments:
  id              Snapshot ID

Options:
  --force         Skip confirmation prompt

Examples:
  snapback snapshot delete snap-1733062242000-x7f9a2
  snapback snapshot delete snap-1733062242000-x7f9a2 --force
```

### 3.3.3 Config Commands

#### `snapback config init`

```bash
snapback config init [options]

Initialize SnapBack configuration.

Options:
  --force         Overwrite existing config
  --preset        Use preset: minimal|standard|strict

Examples:
  snapback config init
  snapback config init --preset strict
```

**Generated .snapbackrc:**
```json
{
  "$schema": "https://snapback.dev/schemas/snapbackrc.json",
  "version": "1.0",
  "rules": [
    {
      "pattern": "**/*.ts",
      "protection": "warn"
    },
    {
      "pattern": "**/migrations/**",
      "protection": "block"
    }
  ],
  "ignore": [
    "node_modules/**",
    "dist/**"
  ]
}
```

#### `snapback config set`

```bash
snapback config set <key> <value> [options]

Set configuration value.

Arguments:
  key             Configuration key (dot notation)
  value           Configuration value

Options:
  --global        Set in global config (~/.snapbackrc)

Examples:
  snapback config set defaultProtection warn
  snapback config set rules.0.protection block
  snapback config set telemetry.enabled false --global
```

#### `snapback config get`

```bash
snapback config get [key] [options]

Get configuration value(s).

Arguments:
  key             Configuration key (optional, shows all if omitted)

Options:
  --global        Read from global config

Examples:
  snapback config get
  snapback config get defaultProtection
  snapback config get rules
```

#### `snapback config validate`

```bash
snapback config validate [options]

Validate configuration.

Options:
  --fix           Attempt to fix issues

Examples:
  snapback config validate
  snapback config validate --fix
```

### 3.3.4 Auth Commands

#### `snapback auth login`

```bash
snapback auth login [options]

Authenticate with SnapBack.

Options:
  --method        Auth method: browser|token (default: browser)
  --token         API token (if method=token)

Examples:
  snapback auth login
  snapback auth login --method token --token sk_live_xxx
```

#### `snapback auth logout`

```bash
snapback auth logout [options]

Remove stored credentials.

Options:
  --all           Remove all stored tokens

Examples:
  snapback auth logout
```

#### `snapback auth status`

```bash
snapback auth status [options]

Show authentication status.

Examples:
  snapback auth status
```

**Output:**
```
Authentication Status:
  Logged in:    Yes
  User:         user@example.com
  Tier:         Pro
  API Key:      sk_live_...abc
  Expires:      Never
```

#### `snapback auth token`

```bash
snapback auth token [options]

Manage API tokens.

Options:
  --create        Create new token
  --revoke <id>   Revoke token
  --list          List tokens

Examples:
  snapback auth token --create
  snapback auth token --list
  snapback auth token --revoke tok_xxx
```

### 3.3.5 Analyze Commands

#### `snapback analyze risk`

```bash
snapback analyze risk [files...] [options]

Analyze code for risks.

Arguments:
  files           Files to analyze (default: staged changes)

Options:
  --diff          Analyze diff instead of files
  --threshold     Minimum risk level to report: low|medium|high
  --exit-code     Exit with 1 if risks found above threshold

Examples:
  snapback analyze risk
  snapback analyze risk src/**/*.ts --threshold high
  snapback analyze risk --diff HEAD~1 --exit-code
```

**Output:**
```
Risk Analysis Results:

  src/database.ts
    ⚠ HIGH: Direct database query construction (line 42)
    ⚠ MEDIUM: Missing error handling (line 56)

  src/auth.ts
    ⚠ MEDIUM: Hardcoded timeout value (line 23)

Summary:
  Files analyzed: 2
  High risks: 1
  Medium risks: 2
  Low risks: 0

Recommendation: Review before deploying
```

#### `snapback analyze deps`

```bash
snapback analyze deps [options]

Analyze dependencies.

Options:
  --check-updates Check for available updates
  --check-vulns   Check for vulnerabilities
  --outdated      Show outdated packages

Examples:
  snapback analyze deps
  snapback analyze deps --check-vulns
  snapback analyze deps --outdated
```

#### `snapback analyze history`

```bash
snapback analyze history [file] [options]

Analyze file change history.

Arguments:
  file            Specific file (optional)

Options:
  --days          Days to analyze (default: 30)
  --format        Output format: table|json|chart

Examples:
  snapback analyze history
  snapback analyze history src/index.ts --days 7
```

### 3.3.6 Protect Commands

#### `snapback protect enable`

```bash
snapback protect enable [pattern] [options]

Enable protection for files.

Arguments:
  pattern         Glob pattern (default: **)

Options:
  --level         Protection level: watch|warn|block
  --recursive     Apply recursively

Examples:
  snapback protect enable
  snapback protect enable "**/*.ts" --level warn
  snapback protect enable src/migrations --level block
```

#### `snapback protect disable`

```bash
snapback protect disable [pattern] [options]

Disable protection for files.

Arguments:
  pattern         Glob pattern

Examples:
  snapback protect disable "test/**"
  snapback protect disable node_modules
```

#### `snapback protect status`

```bash
snapback protect status [options]

Show protection status.

Options:
  --file, -f      Specific file

Examples:
  snapback protect status
  snapback protect status --file src/index.ts
```

**Output:**
```
Protection Status:

  Protected Files:    145
  Watch Mode:         89
  Warn Mode:          45
  Block Mode:         11

  Snapshots Today:    23
  AI Detections:      5
  Restores Used:      1

  Status: ✓ Active
```

### 3.3.7 CI/CD Commands (Pro)

#### `snapback ci check`

```bash
snapback ci check [options]

Run CI checks.

Options:
  --fail-on       Fail on risk level: low|medium|high|critical
  --config        CI config file

Examples:
  snapback ci check
  snapback ci check --fail-on high
```

**Exit Codes:**
| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Risks found above threshold |
| 2 | Configuration error |
| 3 | Authentication error |

#### `snapback ci gate`

```bash
snapback ci gate [options]

Quality gate for deployments.

Options:
  --require-snapshot   Require snapshot before deploy
  --require-review     Require AI changes review
  --max-risk           Maximum allowed risk level

Examples:
  snapback ci gate --require-snapshot --max-risk medium
```

#### `snapback ci report`

```bash
snapback ci report [options]

Generate CI report.

Options:
  --format        Report format: json|markdown|html
  --output        Output file

Examples:
  snapback ci report --format markdown --output report.md
```

---

## 3.4 Configuration Specification

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SNAPBACK_API_KEY` | API key for authentication | - |
| `SNAPBACK_API_URL` | API base URL | https://api.snapback.dev |
| `SNAPBACK_CONFIG` | Config file path | .snapbackrc |
| `SNAPBACK_NO_COLOR` | Disable colored output | false |
| `SNAPBACK_DEBUG` | Enable debug output | false |
| `CI` | CI environment detection | auto |

### Configuration File Locations

```
Priority (highest to lowest):
1. --config flag
2. SNAPBACK_CONFIG env var
3. .snapbackrc in current directory
4. .snapbackrc in parent directories (up to root)
5. ~/.snapbackrc (global config)
```

### Configuration Schema

```typescript
interface CLIConfig {
  // API
  apiUrl?: string;
  apiKey?: string;            // Not recommended, use env var

  // Defaults
  defaults?: {
    protectionLevel?: 'watch' | 'warn' | 'block';
    outputFormat?: 'table' | 'json' | 'plain';
  };

  // Telemetry
  telemetry?: {
    enabled?: boolean;
  };

  // Aliases
  aliases?: Record<string, string>;
}
```

---

## 3.5 Output Formatting Specification

### Table Format (Default)

```
┌──────────────────────────────────────────────────────────────┐
│                     Snapshot List                            │
├────────────────────────────┬────────────────┬────────────────┤
│ ID                         │ Name           │ Created        │
├────────────────────────────┼────────────────┼────────────────┤
│ snap-1733062242000-x7f9a2  │ Pre-deploy     │ 2 hours ago    │
│ snap-1733058642000-b3k8m1  │ Auto-snapshot  │ 3 hours ago    │
│ snap-1733055042000-y8h2n3  │ Manual save    │ 4 hours ago    │
└────────────────────────────┴────────────────┴────────────────┘
```

### JSON Format

```json
{
  "snapshots": [
    {
      "id": "snap-1733062242000-x7f9a2",
      "name": "Pre-deploy",
      "timestamp": 1733062242000,
      "fileCount": 5,
      "totalSize": 12345
    }
  ],
  "total": 3,
  "hasMore": false
}
```

### Plain Format

```
snap-1733062242000-x7f9a2  Pre-deploy      2024-12-01T10:30:42Z
snap-1733058642000-b3k8m1  Auto-snapshot   2024-12-01T09:30:42Z
snap-1733055042000-y8h2n3  Manual save     2024-12-01T08:30:42Z
```

---

## 3.6 Error Handling Specification

### Error Output Format

```bash
# Standard error
Error: [CODE] Message
  Details: Additional context
  Help: Suggestion to resolve
  Docs: https://docs.snapback.dev/errors/CODE
```

### Error Codes

| Code | Category | Example |
|------|----------|---------|
| E001-E099 | Authentication | Invalid API key |
| E100-E199 | Configuration | Invalid config file |
| E200-E299 | Snapshot | Snapshot not found |
| E300-E399 | Network | API unreachable |
| E400-E499 | Validation | Invalid input |
| E500-E599 | Internal | Unexpected error |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Configuration error |
| 3 | Authentication error |
| 4 | Validation error |
| 5 | Network error |
| 64-78 | BSD sysexits.h codes |

---

## 3.7 Testing Requirements

### Command Tests

| Command Group | Test Coverage |
|---------------|---------------|
| snapshot | 85% |
| config | 80% |
| auth | 90% |
| analyze | 80% |
| protect | 75% |
| ci | 80% |

### Integration Tests

| Scenario | Priority |
|----------|----------|
| Full snapshot lifecycle | P0 |
| Config management | P0 |
| Auth flow | P0 |
| CI gate integration | P1 |
| Error handling | P1 |

---

# 4. Cross-Cutting Concerns

## 4.1 Unified Identity System

### Token Flow (All Components)

```
                    ┌──────────────────┐
                    │   OAuth Provider │
                    │ (GitHub/Google)  │
                    └────────┬─────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                    SnapBack Identity Layer                     │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                   Better Auth                           │   │
│  │                                                         │   │
│  │  • OAuth session management                            │   │
│  │  • API key generation/validation                       │   │
│  │  • Tier/permission management                          │   │
│  └────────────────────────────────────────────────────────┘   │
│                              │                                 │
│                              ▼                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                   Token Types                           │   │
│  │                                                         │   │
│  │  1. Session Cookie (httpOnly)    - Web dashboard       │   │
│  │  2. API Key (sk_live_...)        - Extension/CLI/MCP   │   │
│  │  3. JWT (short-lived)            - Internal services   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │ Extension │    │    MCP    │    │    CLI    │
    │           │    │   Server  │    │           │
    │ API Key   │    │ API Key   │    │ API Key   │
    └───────────┘    └───────────┘    └───────────┘
```

### Token Validation

```typescript
// Centralized validation (all components use same pattern)
interface TokenContext {
  userId: string;
  orgId?: string;
  tier: 'free' | 'pro' | 'enterprise';
  permissions: string[];
  rateLimits: {
    requests: number;
    window: number;
    remaining: number;
  };
  clientType: 'extension' | 'mcp' | 'cli' | 'web';
  clientVersion: string;
}

// All API calls include:
headers: {
  'Authorization': `Bearer ${apiKey}`,
  'X-Client-Type': clientType,
  'X-Client-Version': version,
}
```

---

## 4.2 Analytics & Telemetry

### Event Flow (All Components)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Event Sources                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Extension          MCP Server          CLI                    │
│   ┌─────────┐        ┌─────────┐        ┌─────────┐            │
│   │ Events  │        │ Events  │        │ Events  │            │
│   └────┬────┘        └────┬────┘        └────┬────┘            │
│        │                  │                  │                  │
│        └──────────────────┼──────────────────┘                  │
│                           │                                     │
│                           ▼                                     │
│                  ┌─────────────────┐                            │
│                  │  SDK Telemetry  │                            │
│                  │     Client      │                            │
│                  │                 │                            │
│                  │ • Sanitization  │                            │
│                  │ • Batching      │                            │
│                  │ • Retry         │                            │
│                  └────────┬────────┘                            │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Backend                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌────────────────────────────────────────────────────────┐   │
│   │                  Telemetry Proxy                        │   │
│   │                                                         │   │
│   │  • Additional sanitization                              │   │
│   │  • IP scrubbing                                        │   │
│   │  • Event validation                                     │   │
│   │  • Allowlist enforcement                                │   │
│   └─────────────────────────┬──────────────────────────────┘   │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │     PostHog     │
                     │   (Analytics)   │
                     └─────────────────┘
```

### Consolidated Event Schema

| Event | Source | Category | Tier |
|-------|--------|----------|------|
| `extension.activated` | Extension | Lifecycle | Free |
| `extension.deactivated` | Extension | Lifecycle | Free |
| `save_attempt` | Extension | Protection | Free |
| `snapshot_created` | Extension/CLI | Protection | Free |
| `session_finalized` | Extension | Protection | Free |
| `mcp.tool_called` | MCP | Usage | Free |
| `cli.command_executed` | CLI | Usage | Free |
| `auth.login_completed` | All | Auth | Free |

### Privacy Requirements (All Components)

```typescript
// Properties NEVER sent
const BLOCKED_PROPERTIES = [
  'path', 'filePath', 'fileName', 'fullPath',
  'email', 'user', 'userId', 'name',
  'ip', 'ipAddress', 'location',
  'content', 'code', 'diff',
];

// All events require:
// 1. anonymousId (never userId)
// 2. IP scrubbing before PostHog
// 3. File extensions only (not paths)
// 4. Schema validation
```

---

## 4.3 Error Handling Strategy

### Error Categories (All Components)

| Category | User Impact | Handling | Example |
|----------|-------------|----------|---------|
| **Recoverable** | None | Log + continue | Network timeout, retry success |
| **Degraded** | Reduced functionality | Fallback + notify | API unavailable, offline mode |
| **User Error** | Blocked action | Clear message | Invalid input, missing auth |
| **Critical** | Feature disabled | Alert + disable | Corrupt storage, security violation |
| **Fatal** | Component unusable | Restart required | Unrecoverable state |

### Error Reporting

```typescript
// All components report errors to PostHog
interface ErrorReport {
  type: 'error';
  properties: {
    error_code: string;
    error_message: string;      // Sanitized
    component: 'extension' | 'mcp' | 'cli';
    stack_hash: string;         // For grouping, not actual stack
    context: {
      operation: string;
      clientVersion: string;
    };
  };
}
```

---

## 4.4 Performance Budgets (All Components)

### Summary Table

| Component | Metric | Budget |
|-----------|--------|--------|
| **Extension** | Activation | ≤500ms |
| **Extension** | Bundle size | ≤2MB |
| **Extension** | Save handler | ≤100ms |
| **Extension** | Memory (peak) | ≤200MB |
| **MCP** | Tool execution | ≤500ms |
| **MCP** | analyze_risk | ≤200ms |
| **CLI** | Command startup | ≤300ms |
| **CLI** | Simple commands | ≤500ms |
| **CLI** | Complex analysis | ≤5s |

---

# 5. Implementation Status Matrix

## 5.1 VS Code Extension Status

| Feature | Spec Status | Implementation | Gap |
|---------|-------------|----------------|-----|
| **Core Protection** |
| Save handler | ✅ Complete | ✅ Implemented | - |
| Protection levels | ✅ Complete | ✅ Implemented | - |
| Cooldown system | ✅ Complete | ✅ Implemented | - |
| **Snapshot System** |
| Blob storage | ✅ Complete | ✅ Implemented | - |
| Manifest storage | ✅ Complete | ✅ Implemented | - |
| Session management | ✅ Complete | ⚠️ Partial | Finalization incomplete |
| **AI Detection** |
| Burst detection | ✅ Complete | ✅ Implemented | - |
| Pattern matching | ✅ Complete | ✅ Implemented | - |
| Tool identification | ✅ Complete | ⚠️ Partial | Confidence scoring incomplete |
| **UI Components** |
| Status bar | ✅ Complete | ✅ Implemented | - |
| CodeLens | ✅ Complete | ⚠️ Partial | AI detection lens missing |
| Welcome view | ✅ Complete | ✅ Implemented | - |
| **Telemetry** |
| Event tracking | ✅ Complete | ⚠️ Partial | Funnel events incomplete |
| Privacy sanitization | ✅ Complete | ✅ Implemented | - |
| **Performance** |
| Bundle size ≤2MB | ✅ Complete | ❌ Failing | Currently ~11MB |
| Activation ≤500ms | ✅ Complete | ⚠️ Unknown | Not validated in CI |
| **Authentication** |
| OAuth flow | ✅ Complete | ✅ Implemented | - |
| API key storage | ✅ Complete | ✅ Implemented | - |

## 5.2 MCP Server Status

| Feature | Spec Status | Implementation | Gap |
|---------|-------------|----------------|-----|
| **Transport** |
| STDIO | ✅ Complete | ✅ Implemented | - |
| HTTP/SSE | ✅ Complete | ✅ Implemented | - |
| **Tools - Free Tier** |
| analyze_risk | ✅ Complete | ✅ Implemented | - |
| check_dependencies | ✅ Complete | ✅ Implemented | - |
| catalog.list_tools | ✅ Complete | ✅ Implemented | - |
| ctx7.resolve-library-id | ✅ Complete | ✅ Implemented | - |
| ctx7.get-library-docs | ✅ Complete | ✅ Implemented | - |
| **Tools - Pro Tier** |
| create_checkpoint | ✅ Complete | ✅ Implemented | - |
| list_checkpoints | ✅ Complete | ✅ Implemented | - |
| restore_checkpoint | ✅ Complete | ✅ Implemented | - |
| **Security** |
| Path validation | ✅ Complete | ✅ Implemented | - |
| Input validation | ✅ Complete | ✅ Implemented | - |
| Error sanitization | ✅ Complete | ✅ Implemented | - |
| **Authentication** |
| API key validation | ✅ Complete | ✅ Implemented | - |
| Tier gating | ✅ Complete | ✅ Implemented | - |
| **Performance** |
| Tool budgets | ✅ Complete | ⚠️ Partial | Not enforced in CI |
| **Testing** |
| Coverage ≥80% | ✅ Complete | ❌ Failing | Currently ~40% |

## 5.3 CLI Status

| Feature | Spec Status | Implementation | Gap |
|---------|-------------|----------------|-----|
| **Snapshot Commands** |
| create | ✅ Complete | ⚠️ Unknown | Needs validation |
| list | ✅ Complete | ⚠️ Unknown | Needs validation |
| restore | ✅ Complete | ⚠️ Unknown | Needs validation |
| diff | ✅ Complete | ⚠️ Unknown | Needs validation |
| delete | ✅ Complete | ⚠️ Unknown | Needs validation |
| **Config Commands** |
| init | ✅ Complete | ⚠️ Unknown | Needs validation |
| set | ✅ Complete | ⚠️ Unknown | Needs validation |
| get | ✅ Complete | ⚠️ Unknown | Needs validation |
| validate | ✅ Complete | ⚠️ Unknown | Needs validation |
| **Auth Commands** |
| login | ✅ Complete | ⚠️ Unknown | Needs validation |
| logout | ✅ Complete | ⚠️ Unknown | Needs validation |
| status | ✅ Complete | ⚠️ Unknown | Needs validation |
| **Analyze Commands** |
| risk | ✅ Complete | ⚠️ Unknown | Needs validation |
| deps | ✅ Complete | ⚠️ Unknown | Needs validation |
| **CI Commands (Pro)** |
| check | ✅ Complete | ⚠️ Unknown | Needs validation |
| gate | ✅ Complete | ⚠️ Unknown | Needs validation |
| report | ✅ Complete | ⚠️ Unknown | Needs validation |

## 5.4 Critical Blockers Summary

| Blocker | Component | Impact | Priority |
|---------|-----------|--------|----------|
| Bundle size 11MB | Extension | Demo blocker | P0 |
| TypeScript errors (32+) | All | Build blocker | P0 |
| Activation funnel incomplete | Extension | Analytics gap | P0 |
| Test coverage ~40% | MCP | Quality risk | P1 |
| Performance not validated in CI | All | Regression risk | P1 |
| CLI validation unknown | CLI | Delivery risk | P1 |

---

## Appendix A: File References

### Extension Key Files
- `apps/vscode/src/extension.ts` - Entry point
- `apps/vscode/src/storage/` - Storage implementation
- `apps/vscode/src/handlers/SaveHandler.ts` - Save interception
- `apps/vscode/src/telemetry.ts` - Telemetry client
- `apps/vscode/package.json` - Manifest

### MCP Key Files
- `apps/mcp-server/src/index.ts` - Server entry
- `apps/mcp-server/src/tools/` - Tool implementations
- `apps/mcp-server/src/auth.ts` - Authentication
- `apps/mcp-server/src/utils/security.ts` - Security utilities

### CLI Key Files
- `apps/cli/src/index.ts` - Entry point
- `apps/cli/src/commands/` - Command implementations

### Shared Packages
- `packages/contracts/` - Schemas and types
- `packages/sdk/` - Shared client utilities
- `packages/analytics/` - Event definitions

---

## Appendix B: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial comprehensive specification |

---

*This specification serves as the definitive reference for validating implementation against expectations. All features should be traced back to this document for compliance verification.*
