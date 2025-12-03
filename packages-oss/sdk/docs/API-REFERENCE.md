# SnapBack SDK API Reference

Complete API documentation for the SnapBack SDK including all public classes, methods, and types.

## Table of Contents

1. [Core Classes](#core-classes)
2. [Storage & Snapshots](#storage--snapshots)
3. [Risk Analysis](#risk-analysis)
4. [Session Management](#session-management)
5. [Configuration](#configuration)
6. [Types & Interfaces](#types--interfaces)
7. [Error Handling](#error-handling)

---

## Core Classes

### `Snapback`

Main SDK entry point for snapshot and risk analysis operations.

```typescript
constructor(storage: StorageAdapter, options?: SnapbackOptions)
```

**Methods:**

#### `createSnapshot(files: FileInput[]): Promise<Snapshot>`
Creates a new snapshot from the provided files.

- **Parameters:**
  - `files` - Array of FileInput objects containing path, content, and action
- **Returns:** Promise resolving to created Snapshot
- **Throws:** SnapshotError on validation failures

**Example:**
```typescript
const snapshot = await sdk.createSnapshot([
  {
    path: 'src/app.ts',
    content: 'export const App = () => {...}',
    action: 'modify'
  }
]);
```

#### `analyzeRisk(changes: ChangeInfo): Promise<RiskScore>`
Analyzes file changes for security risks.

- **Parameters:**
  - `changes` - ChangeInfo containing added, modified, and deleted files
- **Returns:** Promise resolving to RiskScore (0-10 scale)
- **Throws:** RiskAnalysisError on analysis failures

**Example:**
```typescript
const riskScore = await sdk.analyzeRisk({
  added: ['new-feature.ts'],
  modified: ['main.ts'],
  deleted: []
});
```

---

## Storage & Snapshots

### `SnapshotManager`

Manages snapshot lifecycle including creation, restoration, and deletion.

#### `create(files: FileInput[], options?: CreateSnapshotOptions): Promise<Snapshot>`
Creates and saves a snapshot.

- **Options:**
  - `description?: string` - Human-readable snapshot name
  - `protected?: boolean` - Mark snapshot as protected
- **Returns:** Promise<Snapshot>

#### `restore(id: string, targetPath?: string, options?: RestoreOptions): Promise<SnapshotRestoreResult>`
Restores snapshot to target directory.

- **Parameters:**
  - `id` - Snapshot ID to restore
  - `targetPath` - Target directory (optional for metadata restore)
- **Options:**
  - `dryRun?: boolean` - Validate without writing files
  - `onProgress?: (progress: number) => void` - Progress callback
- **Returns:** Restore result with file list and errors

#### `delete(id: string): Promise<void>`
Deletes a snapshot and cleans up dedup cache.

#### `list(filters?: SnapshotFilters): Promise<Snapshot[]>`
Lists snapshots with optional filtering.

#### `get(id: string): Promise<Snapshot | null>`
Retrieves a single snapshot by ID.

### `StorageAdapter`

Interface for implementing custom storage backends.

```typescript
interface StorageAdapter {
  create(snapshot: Snapshot, contentHash?: string): Promise<Snapshot>
  get(id: string): Promise<Snapshot | null>
  list(filters?: SnapshotFilters): Promise<Snapshot[]>
  delete(id: string): Promise<void>
  save(snapshot: Snapshot, contentHash?: string): Promise<void>
}
```

---

## Risk Analysis

### `RiskAnalyzer`

Analyzes security risks in code changes.

#### `analyzeChanges(changes: ChangeInfo): Promise<RiskScore>`
Comprehensive risk analysis across all changed files.

**Risk Thresholds (0-10 scale):**
- **Low (0.0-2.9):** Minor changes, no security concerns
- **Medium (3.0-4.9):** Standard changes requiring review
- **High (5.0-6.9):** Significant risk, requires approval
- **Critical (7.0-10.0):** Blocking threshold, must be addressed

#### `scoreSecurityPatterns(content: string): number`
Scores code for dangerous patterns (eval, exec, SQL injection, etc.).

**Returns:** Risk score component (0-10 scale)

#### `detectSecrets(content: string): SecretFinding[]`
Detects potential hardcoded secrets using entropy analysis.

**Returns:** Array of detected secret locations and metadata

---

## Session Management

### `SessionCoordinator`

Manages user sessions and event recording.

#### `createSession(metadata: SessionMetadata): Session`
Creates a new user session.

**SessionMetadata:**
```typescript
{
  userId?: string
  branch?: string
  files?: string[]
  timestamp: number
}
```

#### `recordEvent(sessionId: string, event: SessionEvent): void`
Records an event within a session.

**SessionEvent types:**
- `file-change` - File was modified
- `snapshot-created` - Snapshot created
- `analysis-complete` - Risk analysis completed
- `snapshot-restored` - Snapshot was restored

#### `finalizeSession(sessionId: string): SessionMetrics`
Completes a session and calculates metrics.

**Returns:** SessionMetrics with duration, event count, and tags

---

## Configuration

### `THRESHOLDS`

Central configuration for all SDK tuning parameters.

```typescript
interface THRESHOLDS {
  session: SessionThresholds
  burst: BurstThresholds
  experience: ExperienceThresholds
  tagging: TaggingThresholds
  risk: RiskThresholds
  protection: ProtectionThresholds
  resources: ResourceThresholds
  qos: QoSThresholds
}
```

**QoS Thresholds (example):**
```typescript
{
  batchMax: 10           // Max items per batch
  batchIntervalMs: 1000  // Batch flush interval
  httpTimeout: 30000     // HTTP request timeout
  maxQueueSize: 1000     // Max queue depth
}
```

### `updateThresholds(overrides: Partial<ThresholdsConfig>): void`

Updates thresholds at runtime for A/B testing or feature flags.

```typescript
updateThresholds({
  risk: {
    blockingThreshold: 7.0 // More permissive
  }
});
```

---

## Types & Interfaces

### `Snapshot`

Represents a saved state of files.

```typescript
interface Snapshot {
  id: string                           // Unique identifier
  timestamp: number                    // Creation time
  meta?: Record<string, any>          // Custom metadata
  files?: string[]                     // File paths in snapshot
  fileContents?: Record<string, string> // File contents
}
```

### `RiskScore`

Risk analysis result on 0-10 scale.

```typescript
interface RiskScore {
  score: number                        // 0-10 scale
  factors: string[]                    // Risk factors found
  severity: 'low' | 'medium' | 'high' | 'critical'
}
```

### `FileInput`

Input for snapshot creation.

```typescript
interface FileInput {
  path: string                    // File path
  content: string               // File content
  action: 'add' | 'modify' | 'delete'
}
```

### `ChangeInfo`

Git change information for risk analysis.

```typescript
interface ChangeInfo {
  added: string[]      // New files
  modified: string[]   // Changed files
  deleted: string[]    // Removed files
}
```

---

## Error Handling

### Error Hierarchy

All SDK errors extend `SnapBackError` base class.

```typescript
class SnapBackError extends Error {
  name: string
  code: string
  message: string
  cause?: Error
}
```

### Common Errors

#### `SnapshotError`
Snapshot-related errors (creation, restoration, deletion).

#### `RiskAnalysisError`
Risk analysis failures or missing dependencies.

#### `StorageError`
Storage backend failures (database, file system).

#### `SnapshotNotFoundError`
Requested snapshot does not exist.

### Error Handling Pattern

```typescript
import { isErr } from '@snapback/sdk'

try {
  const result = await sdk.createSnapshot(files)

  if (isErr(result)) {
    const { error } = result
    logger.error('Snapshot failed', {
      code: error.code,
      message: error.message
    })
  }
} catch (error) {
  // Handle unexpected errors
  console.error(error)
}
```

---

## Quick Start Examples

### Basic Snapshot

```typescript
import { Snapback } from '@snapback/sdk'

const sdk = new Snapback(storage)

const snapshot = await sdk.createSnapshot([
  { path: 'app.ts', content: '...', action: 'modify' }
])

console.log(`Snapshot created: ${snapshot.id}`)
```

### Risk Analysis

```typescript
const riskScore = await sdk.analyzeRisk({
  added: ['feature.ts'],
  modified: ['main.ts'],
  deleted: []
})

if (riskScore.score > 5.0) {
  console.warn(`High risk detected: ${riskScore.severity}`)
}
```

### Custom Storage

```typescript
const customStorage = {
  async create(snapshot) { /* ... */ },
  async get(id) { /* ... */ },
  async list() { /* ... */ },
  async delete(id) { /* ... */ }
}

const sdk = new Snapback(customStorage)
```

---

## API Stability

This documentation reflects the current stable API. See [MIGRATION.md](./MIGRATION.md) for breaking changes between versions.

**Last Updated:** 2025-11-20
**Version:** 1.0.0-beta
# SnapBack SDK API Reference

Complete API documentation for the SnapBack SDK including all public classes, methods, and types.

## Table of Contents

1. [Core Classes](#core-classes)
2. [Storage & Snapshots](#storage--snapshots)
3. [Risk Analysis](#risk-analysis)
4. [Session Management](#session-management)
5. [Configuration](#configuration)
6. [Types & Interfaces](#types--interfaces)
7. [Error Handling](#error-handling)

---

## Core Classes

### `Snapback`

Main SDK entry point for snapshot and risk analysis operations.

```typescript
constructor(storage: StorageAdapter, options?: SnapbackOptions)
```

**Methods:**

#### `createSnapshot(files: FileInput[]): Promise<Snapshot>`
Creates a new snapshot from the provided files.

- **Parameters:**
  - `files` - Array of FileInput objects containing path, content, and action
- **Returns:** Promise resolving to created Snapshot
- **Throws:** SnapshotError on validation failures

**Example:**
```typescript
const snapshot = await sdk.createSnapshot([
  {
    path: 'src/app.ts',
    content: 'export const App = () => {...}',
    action: 'modify'
  }
]);
```

#### `analyzeRisk(changes: ChangeInfo): Promise<RiskScore>`
Analyzes file changes for security risks.

- **Parameters:**
  - `changes` - ChangeInfo containing added, modified, and deleted files
- **Returns:** Promise resolving to RiskScore (0-10 scale)
- **Throws:** RiskAnalysisError on analysis failures

**Example:**
```typescript
const riskScore = await sdk.analyzeRisk({
  added: ['new-feature.ts'],
  modified: ['main.ts'],
  deleted: []
});
```

---

## Storage & Snapshots

### `SnapshotManager`

Manages snapshot lifecycle including creation, restoration, and deletion.

#### `create(files: FileInput[], options?: CreateSnapshotOptions): Promise<Snapshot>`
Creates and saves a snapshot.

- **Options:**
  - `description?: string` - Human-readable snapshot name
  - `protected?: boolean` - Mark snapshot as protected
- **Returns:** Promise<Snapshot>

#### `restore(id: string, targetPath?: string, options?: RestoreOptions): Promise<SnapshotRestoreResult>`
Restores snapshot to target directory.

- **Parameters:**
  - `id` - Snapshot ID to restore
  - `targetPath` - Target directory (optional for metadata restore)
- **Options:**
  - `dryRun?: boolean` - Validate without writing files
  - `onProgress?: (progress: number) => void` - Progress callback
- **Returns:** Restore result with file list and errors

#### `delete(id: string): Promise<void>`
Deletes a snapshot and cleans up dedup cache.

#### `list(filters?: SnapshotFilters): Promise<Snapshot[]>`
Lists snapshots with optional filtering.

#### `get(id: string): Promise<Snapshot | null>`
Retrieves a single snapshot by ID.

### `StorageAdapter`

Interface for implementing custom storage backends.

```typescript
interface StorageAdapter {
  create(snapshot: Snapshot, contentHash?: string): Promise<Snapshot>
  get(id: string): Promise<Snapshot | null>
  list(filters?: SnapshotFilters): Promise<Snapshot[]>
  delete(id: string): Promise<void>
  save(snapshot: Snapshot, contentHash?: string): Promise<void>
}
```

---

## Risk Analysis

### `RiskAnalyzer`

Analyzes security risks in code changes.

#### `analyzeChanges(changes: ChangeInfo): Promise<RiskScore>`
Comprehensive risk analysis across all changed files.

**Risk Thresholds (0-10 scale):**
- **Low (0.0-2.9):** Minor changes, no security concerns
- **Medium (3.0-4.9):** Standard changes requiring review
- **High (5.0-6.9):** Significant risk, requires approval
- **Critical (7.0-10.0):** Blocking threshold, must be addressed

#### `scoreSecurityPatterns(content: string): number`
Scores code for dangerous patterns (eval, exec, SQL injection, etc.).

**Returns:** Risk score component (0-10 scale)

#### `detectSecrets(content: string): SecretFinding[]`
Detects potential hardcoded secrets using entropy analysis.

**Returns:** Array of detected secret locations and metadata

---

## Session Management

### `SessionCoordinator`

Manages user sessions and event recording.

#### `createSession(metadata: SessionMetadata): Session`
Creates a new user session.

**SessionMetadata:**
```typescript
{
  userId?: string
  branch?: string
  files?: string[]
  timestamp: number
}
```

#### `recordEvent(sessionId: string, event: SessionEvent): void`
Records an event within a session.

**SessionEvent types:**
- `file-change` - File was modified
- `snapshot-created` - Snapshot created
- `analysis-complete` - Risk analysis completed
- `snapshot-restored` - Snapshot was restored

#### `finalizeSession(sessionId: string): SessionMetrics`
Completes a session and calculates metrics.

**Returns:** SessionMetrics with duration, event count, and tags

---

## Configuration

### `THRESHOLDS`

Central configuration for all SDK tuning parameters.

```typescript
interface THRESHOLDS {
  session: SessionThresholds
  burst: BurstThresholds
  experience: ExperienceThresholds
  tagging: TaggingThresholds
  risk: RiskThresholds
  protection: ProtectionThresholds
  resources: ResourceThresholds
  qos: QoSThresholds
}
```

**QoS Thresholds (example):**
```typescript
{
  batchMax: 10           // Max items per batch
  batchIntervalMs: 1000  // Batch flush interval
  httpTimeout: 30000     // HTTP request timeout
  maxQueueSize: 1000     // Max queue depth
}
```

### `updateThresholds(overrides: Partial<ThresholdsConfig>): void`

Updates thresholds at runtime for A/B testing or feature flags.

```typescript
updateThresholds({
  risk: {
    blockingThreshold: 7.0 // More permissive
  }
});
```

---

## Types & Interfaces

### `Snapshot`

Represents a saved state of files.

```typescript
interface Snapshot {
  id: string                           // Unique identifier
  timestamp: number                    // Creation time
  meta?: Record<string, any>          // Custom metadata
  files?: string[]                     // File paths in snapshot
  fileContents?: Record<string, string> // File contents
}
```

### `RiskScore`

Risk analysis result on 0-10 scale.

```typescript
interface RiskScore {
  score: number                        // 0-10 scale
  factors: string[]                    // Risk factors found
  severity: 'low' | 'medium' | 'high' | 'critical'
}
```

### `FileInput`

Input for snapshot creation.

```typescript
interface FileInput {
  path: string                    // File path
  content: string               // File content
  action: 'add' | 'modify' | 'delete'
}
```

### `ChangeInfo`

Git change information for risk analysis.

```typescript
interface ChangeInfo {
  added: string[]      // New files
  modified: string[]   // Changed files
  deleted: string[]    // Removed files
}
```

---

## Error Handling

### Error Hierarchy

All SDK errors extend `SnapBackError` base class.

```typescript
class SnapBackError extends Error {
  name: string
  code: string
  message: string
  cause?: Error
}
```

### Common Errors

#### `SnapshotError`
Snapshot-related errors (creation, restoration, deletion).

#### `RiskAnalysisError`
Risk analysis failures or missing dependencies.

#### `StorageError`
Storage backend failures (database, file system).

#### `SnapshotNotFoundError`
Requested snapshot does not exist.

### Error Handling Pattern

```typescript
import { isErr } from '@snapback/sdk'

try {
  const result = await sdk.createSnapshot(files)

  if (isErr(result)) {
    const { error } = result
    logger.error('Snapshot failed', {
      code: error.code,
      message: error.message
    })
  }
} catch (error) {
  // Handle unexpected errors
  console.error(error)
}
```

---

## Quick Start Examples

### Basic Snapshot

```typescript
import { Snapback } from '@snapback/sdk'

const sdk = new Snapback(storage)

const snapshot = await sdk.createSnapshot([
  { path: 'app.ts', content: '...', action: 'modify' }
])

console.log(`Snapshot created: ${snapshot.id}`)
```

### Risk Analysis

```typescript
const riskScore = await sdk.analyzeRisk({
  added: ['feature.ts'],
  modified: ['main.ts'],
  deleted: []
})

if (riskScore.score > 5.0) {
  console.warn(`High risk detected: ${riskScore.severity}`)
}
```

### Custom Storage

```typescript
const customStorage = {
  async create(snapshot) { /* ... */ },
  async get(id) { /* ... */ },
  async list() { /* ... */ },
  async delete(id) { /* ... */ }
}

const sdk = new Snapback(customStorage)
```

---

## API Stability

This documentation reflects the current stable API. See [MIGRATION.md](./MIGRATION.md) for breaking changes between versions.

**Last Updated:** 2025-11-20
**Version:** 1.0.0-beta
