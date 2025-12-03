# SnapBack SDK Migration Guide

Complete guide to migrating from previous SDK versions and adopting SnapBack in your application.

## Table of Contents

1. [Version Migration](#version-migration)
2. [Integration Patterns](#integration-patterns)
3. [Adoption Checklist](#adoption-checklist)
4. [Common Pitfalls](#common-pitfalls)

---

## Version Migration

### From Alpha (< 1.0.0-beta) to 1.0.0-beta

#### Breaking Changes

**1. Storage Adapter Interface**

The storage interface changed to support async operations.

```typescript
// ❌ OLD - Synchronous
class MyStorage {
  create(snapshot: Snapshot): Snapshot { /* ... */ }
}

// ✅ NEW - Asynchronous
class MyStorage {
  async create(snapshot: Snapshot): Promise<Snapshot> { /* ... */ }
}
```

**Migration:** Wrap synchronous storage in `Promise.resolve()` if needed:

```typescript
class LegacyStorage implements StorageAdapter {
  async create(snapshot: Snapshot): Promise<Snapshot> {
    return Promise.resolve(this.createSync(snapshot))
  }
}
```

**2. Risk Score Scale Standardization**

Risk scores are now consistently on 0-10 scale across all components.

```typescript
// ❌ OLD - Variable scales (0-1, 0-10, 0-100)
const score = await riskAnalyzer.score(file) // Returns 0-1
const blockingThreshold = 8.0 // Uses 0-10 scale

// ✅ NEW - Consistent 0-10 scale
const riskScore = await sdk.analyzeRisk(changes)
console.log(riskScore.score) // Always 0-10

if (riskScore.score > 7.0) { // Consistent threshold
  await blockOperation()
}
```

**Migration:** Normalize any legacy scales:

```typescript
// Convert 0-1 to 0-10
const normalized = legacyScore * 10

// Convert 0-100 to 0-10
const normalized = legacyScore / 10
```

**3. Configuration via THRESHOLDS**

All SDK components now use centralized THRESHOLDS configuration.

```typescript
// ❌ OLD - Scattered configuration
new QoSService({
  timeout: 30000,
  maxRetries: 3
})

new SnapshotDeduplication({
  cacheSize: 500
})

// ✅ NEW - Centralized via THRESHOLDS
import { THRESHOLDS, updateThresholds } from '@snapback/sdk'

// Access configuration
const timeout = THRESHOLDS.qos.httpTimeout

// Update at runtime
updateThresholds({
  qos: { httpTimeout: 60000 }
})
```

**Migration:** Replace scattered configs with THRESHOLDS:

```typescript
import { THRESHOLDS, updateThresholds } from '@snapback/sdk'

// Before initialization
updateThresholds({
  resources: {
    snapshotMaxFiles: 1000,
    dedupCacheSize: 1000
  },
  qos: {
    httpTimeout: 60000
  }
})

const sdk = new Snapback(storage)
```

**4. Error Handling Pattern**

Error handling switched to Result<T, E> discriminated union pattern.

```typescript
// ❌ OLD - Try-catch only
try {
  const snapshot = await sdk.createSnapshot(files)
} catch (error) {
  logger.error(error.message)
}

// ✅ NEW - Result pattern
const result = await sdk.createSnapshot(files)

if (isErr(result)) {
  const { error } = result
  logger.error('Failed to create snapshot', error)
  return
}

const { value: snapshot } = result
```

**Migration:** Wrap legacy try-catch in Result converter:

```typescript
async function createSnapshotLegacy(
  files: FileInput[]
): Promise<Result<Snapshot, SnapshotError>> {
  try {
    const snapshot = await sdk.createSnapshot(files)
    return Ok(snapshot)
  } catch (error) {
    return Err(error instanceof SnapshotError ? error : new SnapshotError(String(error)))
  }
}
```

---

## Integration Patterns

### Pattern 1: Initialize SDK in Your Application

```typescript
import { Snapback, createFilesystemStorage } from '@snapback/sdk'

// In your app initialization
const storage = createFilesystemStorage(storageDir)
const sdk = new Snapback(storage)

// Make available globally or via dependency injection
export const snapshotSDK = sdk
```

### Pattern 2: Create Snapshots on File Changes

```typescript
import { snapshotSDK } from './sdk-setup'
import { fromPromise } from '@snapback/sdk'

editor.onDidChangeTextDocument(async (event) => {
  const filePath = event.document.fileName
  const content = event.document.getText()

  const result = await fromPromise(
    snapshotSDK.createSnapshot([
      {
        path: filePath,
        content,
        action: 'modify'
      }
    ])
  )

  if (isErr(result)) {
    logger.error('Failed to create snapshot', result.error)
    return
  }

  logger.info('Snapshot created', { id: result.value.id })
})
```

### Pattern 3: Analyze Risk Before Operations

```typescript
import { snapshotSDK } from './sdk-setup'

async function validateChanges(changes: ChangeInfo): Promise<boolean> {
  const result = await snapshotSDK.analyzeRisk(changes)

  if (result.score > 7.0) {
    // Critical risk detected
    showWarningDialog(
      `Risk Level: ${result.severity}\n` +
      `Factors: ${result.factors.join(', ')}\n\n` +
      'This operation is blocked for safety.'
    )
    return false
  }

  if (result.score > 5.0) {
    // High risk - require confirmation
    const confirmed = await askUserConfirmation(
      `This operation has high risk: ${result.factors.join(', ')}\n` +
      'Proceed anyway?'
    )
    return confirmed
  }

  return true
}

// Usage
if (!await validateChanges(gitChanges)) {
  return
}

await executeOperation()
```

### Pattern 4: Restore with Progress Feedback

```typescript
import { snapshotSDK } from './sdk-setup'

async function restoreWithProgress(snapshotId: string) {
  const result = await snapshotSDK.restoreSnapshot(snapshotId, {
    onProgress: (progress) => {
      // Update progress bar: progress is 0-100
      updateProgressBar(progress)
    }
  })

  if (isErr(result)) {
    showError(`Restore failed: ${result.error.message}`)
    return
  }

  const { value } = result
  showSuccess(`Restored ${value.fileCount} files`)
}
```

### Pattern 5: Configure Thresholds per Environment

```typescript
import { THRESHOLDS, updateThresholds } from '@snapback/sdk'

const environment = process.env.NODE_ENV

if (environment === 'production') {
  // Strict safety threshold
  updateThresholds({
    risk: { blockingThreshold: 7.0 },
    resources: { snapshotMaxFiles: 500 }
  })
} else if (environment === 'staging') {
  // Moderate safety
  updateThresholds({
    risk: { blockingThreshold: 8.0 },
    resources: { snapshotMaxFiles: 1000 }
  })
} else {
  // Development - more permissive
  updateThresholds({
    risk: { blockingThreshold: 9.0 },
    resources: { snapshotMaxFiles: 5000 }
  })
}

const sdk = new Snapback(storage)
```

---

## Adoption Checklist

### Phase 1: Installation (30 min)

- [ ] Install `@snapback/sdk` package
- [ ] Choose storage backend (filesystem, custom)
- [ ] Initialize SDK in your app entry point
- [ ] Export SDK instance for use throughout app

### Phase 2: Basic Integration (2-4 hours)

- [ ] Integrate snapshot creation on file changes
- [ ] Add snapshot restoration UI
- [ ] Connect snapshot listing UI
- [ ] Test basic snapshot lifecycle (create, list, restore)

### Phase 3: Risk Analysis (3-5 hours)

- [ ] Integrate risk analysis before dangerous operations
- [ ] Add UI feedback for risk levels (warnings, blocks)
- [ ] Configure risk thresholds for your threat model
- [ ] Test with known high-risk patterns

### Phase 4: Session Tracking (2-3 hours)

- [ ] Integrate session creation on user login
- [ ] Record events for important operations
- [ ] Finalize sessions on logout
- [ ] Analyze session metrics for insights

### Phase 5: Production Ready (1-2 hours)

- [ ] Configure THRESHOLDS for production environment
- [ ] Set up monitoring for SDK errors
- [ ] Document snapshot retention policy
- [ ] Deploy to production with feature flag

---

## Common Pitfalls

### Pitfall 1: Ignoring Risk Score Scale

**Problem:**
```typescript
// ❌ WRONG - Mixing scales
const score = await analyzeRisk(changes) // Returns 0-10
if (score > 8) { // Threshold expects 0-100?
  // This blocks at wrong threshold
}
```

**Solution:**
```typescript
// ✅ CORRECT - Consistent scale
const riskScore = await sdk.analyzeRisk(changes) // Always 0-10
if (riskScore.score > 7.0) { // Clear blocking threshold
  await blockOperation()
}
```

### Pitfall 2: Hardcoding Configuration

**Problem:**
```typescript
// ❌ WRONG - Config scattered throughout code
class SnapshotManager {
  constructor() {
    this.maxSnapshots = 500
    this.retentionMs = 30 * 24 * 60 * 60 * 1000
  }
}

class QoSService {
  constructor() {
    this.httpTimeout = 30000 // Different from SDK's 5000!
  }
}
```

**Solution:**
```typescript
// ✅ CORRECT - Centralized in THRESHOLDS
import { THRESHOLDS } from '@snapback/sdk'

// All components use same source of truth
const maxSnapshots = THRESHOLDS.resources.snapshotMaxSnapshots
const httpTimeout = THRESHOLDS.qos.httpTimeout
```

### Pitfall 3: Not Handling Async Storage

**Problem:**
```typescript
// ❌ WRONG - Assumes synchronous storage
class MyStorage implements StorageAdapter {
  create(snapshot: Snapshot): Snapshot {
    fs.writeFileSync(path, JSON.stringify(snapshot))
    return snapshot
  }
}
```

**Solution:**
```typescript
// ✅ CORRECT - Properly async
class MyStorage implements StorageAdapter {
  async create(snapshot: Snapshot): Promise<Snapshot> {
    await fs.promises.writeFile(path, JSON.stringify(snapshot))
    return snapshot
  }
}
```

### Pitfall 4: Blocking Main Thread on Snapshots

**Problem:**
```typescript
// ❌ WRONG - Awaits snapshots on main thread
async function onSave() {
  await sdk.createSnapshot(files) // Blocks editor!
  editor.refresh()
}
```

**Solution:**
```typescript
// ✅ CORRECT - Fire-and-forget with error handling
async function onSave() {
  editor.refresh()

  // Snapshot in background
  sdk.createSnapshot(files)
    .then(result => {
      if (isErr(result)) {
        logger.error('Snapshot failed', result.error)
      }
    })
    .catch(error => logger.error(error))
}
```

### Pitfall 5: Incorrect Result Pattern Usage

**Problem:**
```typescript
// ❌ WRONG - Not handling Result type correctly
const snapshot = await sdk.createSnapshot(files)
console.log(snapshot.id) // Error: snapshot is Result, not Snapshot
```

**Solution:**
```typescript
// ✅ CORRECT - Proper Result handling
import { isErr } from '@snapback/sdk'

const result = await sdk.createSnapshot(files)

if (isErr(result)) {
  logger.error('Failed', result.error)
  return
}

// Now safely access value
const snapshot = result.value
console.log(snapshot.id)
```

---

## Deprecated Features

### `legacyCreateSnapshot()` (Removed in 1.0.0)

Use `createSnapshot()` instead.

### `analyzeChanges()` with 0-1 scale (Removed in 1.0.0)

Use `analyzeRisk()` which returns 0-10 scale.

### Per-service configuration objects (Removed in 1.0.0)

Use centralized `THRESHOLDS` and `updateThresholds()`.

---

## Support & Questions

- **Documentation:** See [API-REFERENCE.md](./API-REFERENCE.md)
- **Examples:** See `/docs/examples/`
- **Security Issues:** See [SECURITY.md](./SECURITY.md)
- **GitHub Issues:** https://github.com/SnapBack-Dev/sdk/issues

**Last Updated:** 2025-11-20
**Version:** 1.0.0-beta
