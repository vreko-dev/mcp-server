# SnapBack SDK Security Guide

Security considerations, privacy guarantees, and best practices for using SnapBack SDK.

## Table of Contents

1. [Security Guarantees](#security-guarantees)
2. [Data Privacy](#data-privacy)
3. [Access Control](#access-control)
4. [Encryption](#encryption)
5. [Secret Detection](#secret-detection)
6. [Threat Model](#threat-model)
7. [Security Best Practices](#security-best-practices)
8. [Incident Response](#incident-response)

---

## Security Guarantees

### What SnapBack Protects

✅ **File Content Integrity**
- Snapshots are cryptographically verified
- Diff-based deduplication prevents content tampering
- Hash verification on restoration

✅ **Unauthorized Access Prevention**
- Read-only access without storage backend permissions
- Operation locks during concurrent modifications
- Session isolation per user/branch

✅ **Risk Detection**
- Automatic scanning for dangerous code patterns
- Secret entropy detection prevents credential leaks
- SQL injection and command execution detection

### What SnapBack Does NOT Guarantee

❌ **Data Encryption at Rest (by default)**
- SDK provides encryption hooks but does not encrypt by default
- Implement encryption in your storage backend if needed

❌ **Network Security**
- SDK communicates over provided HTTP client
- Use TLS/HTTPS in your transport layer

❌ **Access Control (by default)**
- SDK does not implement access control
- Implement authentication/authorization in your app

---

## Data Privacy

### Data Stored in Snapshots

Snapshots contain:
- **File paths** - Exact paths as provided to SDK
- **File contents** - Complete file text or binary data
- **Metadata** - Timestamps, user info, branch names

### Retention Policy

Snapshots are retained according to configured thresholds:

```typescript
import { THRESHOLDS } from '@snapback/sdk'

// Default retention: 90 days
const retentionMs = THRESHOLDS.resources.snapshotRetentionMs // 90 days
```

**Recommendation:** Implement automated deletion:

```typescript
async function cleanupOldSnapshots() {
  const cutoffTime = Date.now() - THRESHOLDS.resources.snapshotRetentionMs
  const snapshots = await sdk.listSnapshots()

  for (const snapshot of snapshots) {
    if (snapshot.timestamp < cutoffTime) {
      await sdk.deleteSnapshot(snapshot.id)
    }
  }
}

// Run daily cleanup
setInterval(cleanupOldSnapshots, 24 * 60 * 60 * 1000)
```

### GDPR Compliance

To comply with GDPR data deletion requirements:

```typescript
async function deleteUserData(userId: string) {
  // Delete all snapshots created by user
  const snapshots = await sdk.listSnapshots({
    metadata: { userId }
  })

  for (const snapshot of snapshots) {
    await sdk.deleteSnapshot(snapshot.id)
  }

  logger.info('User data deleted', { userId })
}
```

### PII Redaction

Detect and redact personally identifiable information:

```typescript
import { detectSecrets } from '@snapback/sdk/risk'

// Detect potential PII/secrets before storing
const secrets = await detectSecrets(fileContent)

if (secrets.length > 0) {
  logger.warn('Potential PII detected', {
    filePath,
    findings: secrets.map(s => ({
      type: s.type,
      line: s.line,
      // Don't log actual content
    }))
  })

  return // Don't snapshot files with PII
}
```

---

## Access Control

### Session-Based Access

Each snapshot operation is associated with a session:

```typescript
import { SessionCoordinator } from '@snapback/sdk'

const sessionCoordinator = new SessionCoordinator()

// Create session with user context
const session = sessionCoordinator.createSession({
  userId: currentUser.id,
  branch: currentBranch,
  timestamp: Date.now()
})

// Record operations in session
sessionCoordinator.recordEvent(session.id, {
  type: 'file-change',
  path: filePath,
  timestamp: Date.now()
})

// Finalize for audit trail
const metrics = sessionCoordinator.finalizeSession(session.id)

// Store audit log
auditLog.record({
  userId: currentUser.id,
  action: 'snapshot-created',
  snapshotId: snapshot.id,
  eventCount: metrics.eventCount,
  duration: metrics.duration
})
```

### Permission Scopes

Implement permission-based access:

```typescript
interface SnapshotPermissions {
  create: boolean
  read: boolean
  restore: boolean
  delete: boolean
  share: boolean
}

async function checkPermission(
  userId: string,
  snapshotId: string,
  permission: keyof SnapshotPermissions
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId, snapshotId)
  return userPermissions[permission] === true
}

// Usage
async function restoreSnapshot(snapshotId: string): Promise<void> {
  if (!await checkPermission(currentUserId, snapshotId, 'restore')) {
    throw new PermissionError('You do not have permission to restore this snapshot')
  }

  await sdk.restoreSnapshot(snapshotId)
}
```

---

## Encryption

### Optional Encryption Support

SnapBack provides hooks for encryption implementations:

```typescript
import type { StorageAdapter } from '@snapback/sdk'

class EncryptedStorage implements StorageAdapter {
  constructor(
    private baseStorage: StorageAdapter,
    private encryptionKey: Buffer
  ) {}

  async create(snapshot: Snapshot): Promise<Snapshot> {
    // Encrypt snapshot content before storage
    const encrypted = await this.encrypt(JSON.stringify(snapshot))
    const wrapped = {
      ...snapshot,
      fileContents: { _encrypted: encrypted }
    }

    return this.baseStorage.create(wrapped)
  }

  async get(id: string): Promise<Snapshot | null> {
    const wrapped = await this.baseStorage.get(id)
    if (!wrapped) return null

    // Decrypt content after retrieval
    const encrypted = wrapped.fileContents?._encrypted
    if (!encrypted) return wrapped

    const decrypted = JSON.parse(
      await this.decrypt(encrypted)
    )

    return decrypted
  }

  private async encrypt(data: string): Promise<string> {
    // Use crypto library of choice (nacl, libsodium, etc.)
    // This is example structure only
    throw new Error('Implement with your crypto library')
  }

  private async decrypt(encrypted: string): Promise<string> {
    throw new Error('Implement with your crypto library')
  }
}

// Usage
const encryptedStorage = new EncryptedStorage(
  filesystemStorage,
  encryptionKey
)

const sdk = new Snapback(encryptedStorage)
```

### Environment Variable Security

**NEVER commit sensitive data:**

```typescript
// ❌ WRONG - Hardcoded secrets
const encryptionKey = 'hardcoded-secret-key-12345'

// ✅ CORRECT - Load from environment
const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY || '', 'base64')

if (!encryptionKey.length) {
  throw new Error('ENCRYPTION_KEY environment variable not set')
}
```

---

## Secret Detection

### Built-in Secret Detection

SnapBack detects common secret patterns:

```typescript
import { detectSecrets } from '@snapback/sdk/risk'

const findings = await detectSecrets(fileContent)

findings.forEach(finding => {
  console.log(`Found ${finding.type}:`)
  console.log(`  Line: ${finding.line}`)
  console.log(`  Entropy: ${finding.entropy}`)
  console.log(`  Confidence: ${finding.confidence}`)
})
```

**Detected Patterns:**
- API keys (high entropy strings)
- Database credentials
- AWS secrets
- Private keys (PEM format)
- Tokens and tokens (JWT, bearer, etc.)
- Email addresses (when clustered)
- Phone numbers (when clustered)

### Handling Secrets in Snapshots

```typescript
async function createSnapshotWithSecretCheck(
  files: FileInput[]
): Promise<void> {
  // Check each file for secrets
  for (const file of files) {
    const secrets = await detectSecrets(file.content)

    if (secrets.length > 0) {
      // Too risky - alert instead of snapshot
      logger.warn('Snapshot blocked - secrets detected', {
        path: file.path,
        secretCount: secrets.length,
        types: [...new Set(secrets.map(s => s.type))]
      })

      showWarning(
        `Cannot create snapshot: ${file.path} contains potential secrets.\n\n` +
        'Please remove sensitive data and try again.'
      )
      return
    }
  }

  // Safe to snapshot
  const result = await sdk.createSnapshot(files)
  if (isErr(result)) {
    logger.error('Snapshot creation failed', result.error)
  }
}
```

---

## Threat Model

### Attack Scenarios

#### Scenario 1: Unauthorized Snapshot Access

**Threat:** User accesses snapshots they shouldn't see

**Mitigations:**
- ✅ Implement access control checks
- ✅ Store snapshots in user-specific directories
- ✅ Implement encryption for sensitive repos

```typescript
// Implement access control
async function getSnapshot(id: string): Promise<Snapshot | null> {
  if (!await checkPermission(currentUserId, id, 'read')) {
    return null
  }

  return sdk.getSnapshot(id)
}
```

#### Scenario 2: Snapshot Content Tampering

**Threat:** Malicious modification of snapshot files

**Mitigations:**
- ✅ Use hash verification on restore
- ✅ Keep audit logs of access
- ✅ Use immutable storage backends

#### Scenario 3: Secret Leakage via Snapshots

**Threat:** Hardcoded credentials captured in snapshots

**Mitigations:**
- ✅ Pre-flight secret detection
- ✅ Block snapshots with secrets
- ✅ Regular secret scanning

```typescript
// Pre-flight check before snapshot
const hasSecrets = await detectSecrets(fileContent)
if (hasSecrets.length > 0) {
  throw new SnapshotSecurityError('File contains secrets')
}
```

#### Scenario 4: Denial of Service

**Threat:** Large snapshots exhaust storage

**Mitigations:**
- ✅ Enforce file size limits
- ✅ Enforce total snapshot limits
- ✅ Implement cleanup policies

```typescript
const limits = THRESHOLDS.resources

// Check before creating snapshot
const totalSize = files.reduce((sum, f) => sum + f.content.length, 0)
const fileCount = files.length

if (totalSize > limits.snapshotMaxTotalSize) {
  throw new Error(`Snapshot too large: ${totalSize} > ${limits.snapshotMaxTotalSize}`)
}

if (fileCount > limits.snapshotMaxFiles) {
  throw new Error(`Too many files: ${fileCount} > ${limits.snapshotMaxFiles}`)
}
```

---

## Security Best Practices

### 1. Input Validation

```typescript
import { z } from 'zod'

const FileInputSchema = z.object({
  path: z.string().min(1).max(2048),
  content: z.string().max(10 * 1024 * 1024), // 10MB max
  action: z.enum(['add', 'modify', 'delete'])
})

// Validate before snapshot
const validated = files.map(f => {
  const result = FileInputSchema.safeParse(f)
  if (!result.success) {
    throw new ValidationError(`Invalid file: ${result.error.message}`)
  }
  return result.data
})

await sdk.createSnapshot(validated)
```

### 2. Rate Limiting

```typescript
class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  private readonly windowMs = 60000 // 1 minute
  private readonly maxAttempts = 100

  check(userId: string): boolean {
    const now = Date.now()
    const userAttempts = this.attempts.get(userId) || []

    // Remove old attempts outside window
    const recent = userAttempts.filter(t => now - t < this.windowMs)

    if (recent.length >= this.maxAttempts) {
      return false
    }

    recent.push(now)
    this.attempts.set(userId, recent)
    return true
  }
}

const limiter = new RateLimiter()

async function createSnapshotWithRateLimit(
  userId: string,
  files: FileInput[]
): Promise<void> {
  if (!limiter.check(userId)) {
    throw new RateLimitError('Too many snapshot attempts')
  }

  return sdk.createSnapshot(files)
}
```

### 3. Audit Logging

```typescript
interface AuditLog {
  timestamp: number
  userId: string
  action: string
  snapshotId?: string
  result: 'success' | 'failure'
  error?: string
}

async function auditedCreateSnapshot(
  userId: string,
  files: FileInput[]
): Promise<Snapshot> {
  const startTime = Date.now()

  try {
    const result = await sdk.createSnapshot(files)

    if (isErr(result)) {
      logAudit({
        timestamp: startTime,
        userId,
        action: 'snapshot.create',
        result: 'failure',
        error: result.error.message
      })
      throw result.error
    }

    logAudit({
      timestamp: startTime,
      userId,
      action: 'snapshot.create',
      snapshotId: result.value.id,
      result: 'success'
    })

    return result.value
  } catch (error) {
    logAudit({
      timestamp: startTime,
      userId,
      action: 'snapshot.create',
      result: 'failure',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}
```

### 4. Secure Defaults

```typescript
// Always assume hostile input
const config = {
  // Restrictive defaults
  maxSnapshots: 100,
  maxFilesPerSnapshot: 100,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  retentionDays: 30,
  encryptionRequired: true,
  secretDetectionRequired: true,
  accessLoggingRequired: true
}

// Only loosen for tested scenarios
if (process.env.TRUST_LEVEL === 'HIGH') {
  config.maxFilesPerSnapshot = 1000
}
```

---

## Incident Response

### Suspected Secret Compromise

**If a snapshot contains a leaked secret:**

1. **Immediate Actions:**
   ```typescript
   // Delete the compromised snapshot immediately
   await sdk.deleteSnapshot(compromisedSnapshotId)

   // Log incident
   logger.error('Secret compromise detected', {
     snapshotId: compromisedSnapshotId,
     timestamp: Date.now(),
     severity: 'critical'
   })
   ```

2. **Remediation:**
   - Rotate the leaked credential immediately
   - Review access logs for the snapshot
   - Notify affected users
   - Update secrets in configuration

3. **Prevention:**
   - Enable mandatory secret detection
   - Add secret to detection patterns
   - Review snapshot retention policy

### Storage Backend Compromise

**If storage is compromised:**

1. **Containment:**
   ```typescript
   // Switch to offline-only mode
   updateThresholds({
     storage: { readOnly: true }
   })
   ```

2. **Recovery:**
   - Restore from clean backup
   - Re-encrypt sensitive snapshots
   - Rotate encryption keys
   - Audit all access logs

---

## Reporting Security Issues

**Do NOT open public GitHub issues for security vulnerabilities.**

Please email security@snapback.dev with:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Your contact information

---

## Security Headers & Configurations

### Recommended Storage Configuration

```typescript
// Production-grade configuration
updateThresholds({
  resources: {
    snapshotMaxFiles: 500,
    snapshotMaxFileSize: 10 * 1024 * 1024, // 10MB
    snapshotMaxTotalSize: 100 * 1024 * 1024, // 100MB
    snapshotRetentionMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    dedupCacheSize: 500
  },
  qos: {
    httpTimeout: 30000,
    maxQueueSize: 100,
    batchIntervalMs: 5000
  },
  risk: {
    blockingThreshold: 7.0 // Strict
  }
})
```

---

## Compliance

- **GDPR:** See Data Privacy section for deletion procedures
- **HIPAA:** Not recommended without encryption and additional controls
- **SOC2:** Implement audit logging per recommendations
- **ISO 27001:** Follow Security Best Practices section

---

**Last Updated:** 2025-11-20
**Version:** 1.0.0-beta
**Security Level:** Production-ready (with recommended mitigations)
# SnapBack SDK Security Guide

Security considerations, privacy guarantees, and best practices for using SnapBack SDK.

## Table of Contents

1. [Security Guarantees](#security-guarantees)
2. [Data Privacy](#data-privacy)
3. [Access Control](#access-control)
4. [Encryption](#encryption)
5. [Secret Detection](#secret-detection)
6. [Threat Model](#threat-model)
7. [Security Best Practices](#security-best-practices)
8. [Incident Response](#incident-response)

---

## Security Guarantees

### What SnapBack Protects

✅ **File Content Integrity**
- Snapshots are cryptographically verified
- Diff-based deduplication prevents content tampering
- Hash verification on restoration

✅ **Unauthorized Access Prevention**
- Read-only access without storage backend permissions
- Operation locks during concurrent modifications
- Session isolation per user/branch

✅ **Risk Detection**
- Automatic scanning for dangerous code patterns
- Secret entropy detection prevents credential leaks
- SQL injection and command execution detection

### What SnapBack Does NOT Guarantee

❌ **Data Encryption at Rest (by default)**
- SDK provides encryption hooks but does not encrypt by default
- Implement encryption in your storage backend if needed

❌ **Network Security**
- SDK communicates over provided HTTP client
- Use TLS/HTTPS in your transport layer

❌ **Access Control (by default)**
- SDK does not implement access control
- Implement authentication/authorization in your app

---

## Data Privacy

### Data Stored in Snapshots

Snapshots contain:
- **File paths** - Exact paths as provided to SDK
- **File contents** - Complete file text or binary data
- **Metadata** - Timestamps, user info, branch names

### Retention Policy

Snapshots are retained according to configured thresholds:

```typescript
import { THRESHOLDS } from '@snapback/sdk'

// Default retention: 90 days
const retentionMs = THRESHOLDS.resources.snapshotRetentionMs // 90 days
```

**Recommendation:** Implement automated deletion:

```typescript
async function cleanupOldSnapshots() {
  const cutoffTime = Date.now() - THRESHOLDS.resources.snapshotRetentionMs
  const snapshots = await sdk.listSnapshots()

  for (const snapshot of snapshots) {
    if (snapshot.timestamp < cutoffTime) {
      await sdk.deleteSnapshot(snapshot.id)
    }
  }
}

// Run daily cleanup
setInterval(cleanupOldSnapshots, 24 * 60 * 60 * 1000)
```

### GDPR Compliance

To comply with GDPR data deletion requirements:

```typescript
async function deleteUserData(userId: string) {
  // Delete all snapshots created by user
  const snapshots = await sdk.listSnapshots({
    metadata: { userId }
  })

  for (const snapshot of snapshots) {
    await sdk.deleteSnapshot(snapshot.id)
  }

  logger.info('User data deleted', { userId })
}
```

### PII Redaction

Detect and redact personally identifiable information:

```typescript
import { detectSecrets } from '@snapback/sdk/risk'

// Detect potential PII/secrets before storing
const secrets = await detectSecrets(fileContent)

if (secrets.length > 0) {
  logger.warn('Potential PII detected', {
    filePath,
    findings: secrets.map(s => ({
      type: s.type,
      line: s.line,
      // Don't log actual content
    }))
  })

  return // Don't snapshot files with PII
}
```

---

## Access Control

### Session-Based Access

Each snapshot operation is associated with a session:

```typescript
import { SessionCoordinator } from '@snapback/sdk'

const sessionCoordinator = new SessionCoordinator()

// Create session with user context
const session = sessionCoordinator.createSession({
  userId: currentUser.id,
  branch: currentBranch,
  timestamp: Date.now()
})

// Record operations in session
sessionCoordinator.recordEvent(session.id, {
  type: 'file-change',
  path: filePath,
  timestamp: Date.now()
})

// Finalize for audit trail
const metrics = sessionCoordinator.finalizeSession(session.id)

// Store audit log
auditLog.record({
  userId: currentUser.id,
  action: 'snapshot-created',
  snapshotId: snapshot.id,
  eventCount: metrics.eventCount,
  duration: metrics.duration
})
```

### Permission Scopes

Implement permission-based access:

```typescript
interface SnapshotPermissions {
  create: boolean
  read: boolean
  restore: boolean
  delete: boolean
  share: boolean
}

async function checkPermission(
  userId: string,
  snapshotId: string,
  permission: keyof SnapshotPermissions
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId, snapshotId)
  return userPermissions[permission] === true
}

// Usage
async function restoreSnapshot(snapshotId: string): Promise<void> {
  if (!await checkPermission(currentUserId, snapshotId, 'restore')) {
    throw new PermissionError('You do not have permission to restore this snapshot')
  }

  await sdk.restoreSnapshot(snapshotId)
}
```

---

## Encryption

### Optional Encryption Support

SnapBack provides hooks for encryption implementations:

```typescript
import type { StorageAdapter } from '@snapback/sdk'

class EncryptedStorage implements StorageAdapter {
  constructor(
    private baseStorage: StorageAdapter,
    private encryptionKey: Buffer
  ) {}

  async create(snapshot: Snapshot): Promise<Snapshot> {
    // Encrypt snapshot content before storage
    const encrypted = await this.encrypt(JSON.stringify(snapshot))
    const wrapped = {
      ...snapshot,
      fileContents: { _encrypted: encrypted }
    }

    return this.baseStorage.create(wrapped)
  }

  async get(id: string): Promise<Snapshot | null> {
    const wrapped = await this.baseStorage.get(id)
    if (!wrapped) return null

    // Decrypt content after retrieval
    const encrypted = wrapped.fileContents?._encrypted
    if (!encrypted) return wrapped

    const decrypted = JSON.parse(
      await this.decrypt(encrypted)
    )

    return decrypted
  }

  private async encrypt(data: string): Promise<string> {
    // Use crypto library of choice (nacl, libsodium, etc.)
    // This is example structure only
    throw new Error('Implement with your crypto library')
  }

  private async decrypt(encrypted: string): Promise<string> {
    throw new Error('Implement with your crypto library')
  }
}

// Usage
const encryptedStorage = new EncryptedStorage(
  filesystemStorage,
  encryptionKey
)

const sdk = new Snapback(encryptedStorage)
```

### Environment Variable Security

**NEVER commit sensitive data:**

```typescript
// ❌ WRONG - Hardcoded secrets
const encryptionKey = 'hardcoded-secret-key-12345'

// ✅ CORRECT - Load from environment
const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY || '', 'base64')

if (!encryptionKey.length) {
  throw new Error('ENCRYPTION_KEY environment variable not set')
}
```

---

## Secret Detection

### Built-in Secret Detection

SnapBack detects common secret patterns:

```typescript
import { detectSecrets } from '@snapback/sdk/risk'

const findings = await detectSecrets(fileContent)

findings.forEach(finding => {
  console.log(`Found ${finding.type}:`)
  console.log(`  Line: ${finding.line}`)
  console.log(`  Entropy: ${finding.entropy}`)
  console.log(`  Confidence: ${finding.confidence}`)
})
```

**Detected Patterns:**
- API keys (high entropy strings)
- Database credentials
- AWS secrets
- Private keys (PEM format)
- Tokens and tokens (JWT, bearer, etc.)
- Email addresses (when clustered)
- Phone numbers (when clustered)

### Handling Secrets in Snapshots

```typescript
async function createSnapshotWithSecretCheck(
  files: FileInput[]
): Promise<void> {
  // Check each file for secrets
  for (const file of files) {
    const secrets = await detectSecrets(file.content)

    if (secrets.length > 0) {
      // Too risky - alert instead of snapshot
      logger.warn('Snapshot blocked - secrets detected', {
        path: file.path,
        secretCount: secrets.length,
        types: [...new Set(secrets.map(s => s.type))]
      })

      showWarning(
        `Cannot create snapshot: ${file.path} contains potential secrets.\n\n` +
        'Please remove sensitive data and try again.'
      )
      return
    }
  }

  // Safe to snapshot
  const result = await sdk.createSnapshot(files)
  if (isErr(result)) {
    logger.error('Snapshot creation failed', result.error)
  }
}
```

---

## Threat Model

### Attack Scenarios

#### Scenario 1: Unauthorized Snapshot Access

**Threat:** User accesses snapshots they shouldn't see

**Mitigations:**
- ✅ Implement access control checks
- ✅ Store snapshots in user-specific directories
- ✅ Implement encryption for sensitive repos

```typescript
// Implement access control
async function getSnapshot(id: string): Promise<Snapshot | null> {
  if (!await checkPermission(currentUserId, id, 'read')) {
    return null
  }

  return sdk.getSnapshot(id)
}
```

#### Scenario 2: Snapshot Content Tampering

**Threat:** Malicious modification of snapshot files

**Mitigations:**
- ✅ Use hash verification on restore
- ✅ Keep audit logs of access
- ✅ Use immutable storage backends

#### Scenario 3: Secret Leakage via Snapshots

**Threat:** Hardcoded credentials captured in snapshots

**Mitigations:**
- ✅ Pre-flight secret detection
- ✅ Block snapshots with secrets
- ✅ Regular secret scanning

```typescript
// Pre-flight check before snapshot
const hasSecrets = await detectSecrets(fileContent)
if (hasSecrets.length > 0) {
  throw new SnapshotSecurityError('File contains secrets')
}
```

#### Scenario 4: Denial of Service

**Threat:** Large snapshots exhaust storage

**Mitigations:**
- ✅ Enforce file size limits
- ✅ Enforce total snapshot limits
- ✅ Implement cleanup policies

```typescript
const limits = THRESHOLDS.resources

// Check before creating snapshot
const totalSize = files.reduce((sum, f) => sum + f.content.length, 0)
const fileCount = files.length

if (totalSize > limits.snapshotMaxTotalSize) {
  throw new Error(`Snapshot too large: ${totalSize} > ${limits.snapshotMaxTotalSize}`)
}

if (fileCount > limits.snapshotMaxFiles) {
  throw new Error(`Too many files: ${fileCount} > ${limits.snapshotMaxFiles}`)
}
```

---

## Security Best Practices

### 1. Input Validation

```typescript
import { z } from 'zod'

const FileInputSchema = z.object({
  path: z.string().min(1).max(2048),
  content: z.string().max(10 * 1024 * 1024), // 10MB max
  action: z.enum(['add', 'modify', 'delete'])
})

// Validate before snapshot
const validated = files.map(f => {
  const result = FileInputSchema.safeParse(f)
  if (!result.success) {
    throw new ValidationError(`Invalid file: ${result.error.message}`)
  }
  return result.data
})

await sdk.createSnapshot(validated)
```

### 2. Rate Limiting

```typescript
class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  private readonly windowMs = 60000 // 1 minute
  private readonly maxAttempts = 100

  check(userId: string): boolean {
    const now = Date.now()
    const userAttempts = this.attempts.get(userId) || []

    // Remove old attempts outside window
    const recent = userAttempts.filter(t => now - t < this.windowMs)

    if (recent.length >= this.maxAttempts) {
      return false
    }

    recent.push(now)
    this.attempts.set(userId, recent)
    return true
  }
}

const limiter = new RateLimiter()

async function createSnapshotWithRateLimit(
  userId: string,
  files: FileInput[]
): Promise<void> {
  if (!limiter.check(userId)) {
    throw new RateLimitError('Too many snapshot attempts')
  }

  return sdk.createSnapshot(files)
}
```

### 3. Audit Logging

```typescript
interface AuditLog {
  timestamp: number
  userId: string
  action: string
  snapshotId?: string
  result: 'success' | 'failure'
  error?: string
}

async function auditedCreateSnapshot(
  userId: string,
  files: FileInput[]
): Promise<Snapshot> {
  const startTime = Date.now()

  try {
    const result = await sdk.createSnapshot(files)

    if (isErr(result)) {
      logAudit({
        timestamp: startTime,
        userId,
        action: 'snapshot.create',
        result: 'failure',
        error: result.error.message
      })
      throw result.error
    }

    logAudit({
      timestamp: startTime,
      userId,
      action: 'snapshot.create',
      snapshotId: result.value.id,
      result: 'success'
    })

    return result.value
  } catch (error) {
    logAudit({
      timestamp: startTime,
      userId,
      action: 'snapshot.create',
      result: 'failure',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}
```

### 4. Secure Defaults

```typescript
// Always assume hostile input
const config = {
  // Restrictive defaults
  maxSnapshots: 100,
  maxFilesPerSnapshot: 100,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  retentionDays: 30,
  encryptionRequired: true,
  secretDetectionRequired: true,
  accessLoggingRequired: true
}

// Only loosen for tested scenarios
if (process.env.TRUST_LEVEL === 'HIGH') {
  config.maxFilesPerSnapshot = 1000
}
```

---

## Incident Response

### Suspected Secret Compromise

**If a snapshot contains a leaked secret:**

1. **Immediate Actions:**
   ```typescript
   // Delete the compromised snapshot immediately
   await sdk.deleteSnapshot(compromisedSnapshotId)

   // Log incident
   logger.error('Secret compromise detected', {
     snapshotId: compromisedSnapshotId,
     timestamp: Date.now(),
     severity: 'critical'
   })
   ```

2. **Remediation:**
   - Rotate the leaked credential immediately
   - Review access logs for the snapshot
   - Notify affected users
   - Update secrets in configuration

3. **Prevention:**
   - Enable mandatory secret detection
   - Add secret to detection patterns
   - Review snapshot retention policy

### Storage Backend Compromise

**If storage is compromised:**

1. **Containment:**
   ```typescript
   // Switch to offline-only mode
   updateThresholds({
     storage: { readOnly: true }
   })
   ```

2. **Recovery:**
   - Restore from clean backup
   - Re-encrypt sensitive snapshots
   - Rotate encryption keys
   - Audit all access logs

---

## Reporting Security Issues

**Do NOT open public GitHub issues for security vulnerabilities.**

Please email security@snapback.dev with:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Your contact information

---

## Security Headers & Configurations

### Recommended Storage Configuration

```typescript
// Production-grade configuration
updateThresholds({
  resources: {
    snapshotMaxFiles: 500,
    snapshotMaxFileSize: 10 * 1024 * 1024, // 10MB
    snapshotMaxTotalSize: 100 * 1024 * 1024, // 100MB
    snapshotRetentionMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    dedupCacheSize: 500
  },
  qos: {
    httpTimeout: 30000,
    maxQueueSize: 100,
    batchIntervalMs: 5000
  },
  risk: {
    blockingThreshold: 7.0 // Strict
  }
})
```

---

## Compliance

- **GDPR:** See Data Privacy section for deletion procedures
- **HIPAA:** Not recommended without encryption and additional controls
- **SOC2:** Implement audit logging per recommendations
- **ISO 27001:** Follow Security Best Practices section

---

**Last Updated:** 2025-11-20
**Version:** 1.0.0-beta
**Security Level:** Production-ready (with recommended mitigations)
