# Consolidated Project Memories - SnapBack

**Last Updated:** 2025-12-14  
**Purpose:** Reusable patterns, lessons learned, and development practices  
**Status:** Deduplicated and organized by category

---

## Table of Contents
1. [Architecture Patterns](#architecture-patterns)
2. [Development Practices](#development-practices)
3. [Common Pitfalls](#common-pitfalls)
4. [Testing Strategy](#testing-strategy)
5. [Configuration Management](#configuration-management)
6. [Performance Optimization](#performance-optimization)
7. [UX Best Practices](#ux-best-practices)

---

## Architecture Patterns

### 1. Content-Addressable Blob Storage
**Pattern:** Git-style storage with SHA-256 hashing  
**Benefits:**
- Automatic deduplication (unchanged files stored once)
- Fast snapshot creation (only write new/changed files)
- Space efficiency (10-100x smaller than full copies)

**Implementation:**
```typescript
// BlobStore structure
blobs/
  ab/
    cd/
      abcd1234...  (full hash as filename)

// Usage
const { hash, size, isNew } = await blobStore.store(content);
if (!isNew) {
  // Content already exists, no write needed
}
```

**Location:** `apps/vscode/src/storage/BlobStore.ts`

---

### 2. V1/V2 Schema Coexistence
**Pattern:** Type guards for schema version filtering  
**Problem:** PRE checkpoints (V2) show as empty snapshots in UI  
**Solution:** Filter at read-time, not storage-time

```typescript
// Type guard
function isSnapshotManifestV2(data: unknown): data is SnapshotManifestV2 {
  return typeof data === 'object' && 
         data !== null && 
         'schemaVersion' in data;
}

// Usage in getManifest()
if (isSnapshotManifestV2(data)) {
  return null; // Skip V2 manifests from V1 list
}
```

**Trade-off:** Slight read overhead vs. complex storage refactor  
**Location:** `apps/vscode/src/storage/SnapshotStore.ts`

---

### 3. Manifest-Level Deduplication
**Pattern:** Hash comparison before manifest creation  
**Problem:** New manifest created even when content unchanged  
**Solution:** Compare file hashes with last snapshot

```typescript
async create(files: Map<string, string>): Promise<SnapshotManifest> {
  // Store files in blob store (automatic blob deduplication)
  const fileRefs = await this.storeFiles(files);
  
  // Check if content identical to last snapshot
  const lastSnapshot = await this.getMostRecent();
  if (lastSnapshot && this.isContentIdentical(lastSnapshot.files, fileRefs)) {
    console.debug('Skipping duplicate snapshot');
    return lastSnapshot; // Return existing
  }
  
  // Create new manifest only if content changed
  return this.writeManifest(fileRefs);
}
```

**Performance:** O(n) file hash comparison, O(1) with content-hash index  
**Location:** `apps/vscode/src/storage/SnapshotStore.ts`

---

### 4. PRE/POST Checkpoint Pattern (PRWManager)
**Pattern:** Two-phase snapshot for risky operations  
**Workflow:**
1. **PRE:** Create pointer-only checkpoint (files: {}) before save
2. **POST:** Create content checkpoint after save completes
3. **Orphan Detection:** PRE without POST = interrupted save

**Benefits:**
- Rollback to exact pre-save state
- Detect crashes during file writes
- <15ms overhead for PRE creation

**Location:** `apps/vscode/src/domain/prwManager.ts`

---

## Development Practices

### 1. TDD Methodology (TDD_CORE.md)
**Principle:** Red → Green → Refactor  
**Enforcement:** Pre-commit hooks validate test-first workflow

**Workflow:**
1. Write failing test (RED)
2. Implement minimal code to pass (GREEN)
3. Refactor while keeping tests green
4. Commit only when tests pass

**Gate Script:** `ai_dev_utils/scripts/tdd-gate.sh`

---

### 2. Async Parallel File Processing
**Pattern:** Batch processing with memory limits  
**Anti-pattern:** Sequential `await` in loops

```typescript
// ❌ WRONG - Sequential (slow)
for (const file of files) {
  await processFile(file);
}

// ✅ CORRECT - Parallel batches
const BATCH_SIZE = 100;
const batches = chunk(files, BATCH_SIZE);
for (const batch of batches) {
  await Promise.all(batch.map(f => processFile(f)));
}
```

**Performance:** 10-50x faster for I/O-bound operations  
**Memory Safety:** Batch size limits prevent OOM

---

### 3. Atomic Writes with Writer Lock
**Pattern:** Single-writer guarantee for critical files  
**Use Cases:** Manifest writes, state updates, seq allocation

```typescript
class WriterLock {
  private locked = false;
  
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    while (this.locked) {
      await sleep(10);
    }
    this.locked = true;
    try {
      return await fn();
    } finally {
      this.locked = false;
    }
  }
}

// Usage
await this.lock.withLock(async () => {
  const manifest = await readManifest();
  manifest.seq++;
  await writeManifest(manifest);
});
```

**Race Condition Prevention:** Prevents concurrent seq allocation  
**Location:** `apps/vscode/src/storage/writerLock.ts`

---

### 4. Interface-First Development
**Pattern:** Define interfaces before implementation  
**Benefits:**
- Enables stub-based integration testing
- Allows parallel development
- Enforces contract stability

```typescript
// 1. Define interface
interface TombstoneTracker {
  getPendingDeletions(): string[];
  recordDeletion(filePath: string): void;
  flush(): Promise<void>;
}

// 2. Create stub for testing
class StubTombstoneTracker implements TombstoneTracker {
  getPendingDeletions() { return []; }
  recordDeletion() {}
  async flush() {}
}

// 3. Implement later without breaking tests
class RealTombstoneTracker implements TombstoneTracker {
  // Full implementation
}
```

---

### 5. Zod + Branded Types at Boundaries
**Pattern:** Runtime validation at system boundaries  
**Use Cases:** API inputs, config files, external data

```typescript
// Define branded type
const FilePathSchema = z.string().brand('FilePath');
type FilePath = z.infer<typeof FilePathSchema>;

// Validate at boundary
function processFile(input: unknown): Result<void, ValidationError> {
  const result = FilePathSchema.safeParse(input);
  if (!result.success) {
    return Err(new ValidationError(result.error));
  }
  
  const filePath: FilePath = result.data;
  // TypeScript guarantees filePath is validated
}
```

**Benefits:** Prevents config drift, catches errors early  
**Performance:** Validation only at boundaries, not internal calls

---

### 6. Regex Pre-compilation
**Pattern:** Compile regex once at initialization  
**Anti-pattern:** Compiling in loops

```typescript
// ❌ WRONG - Recompiles every iteration
for (const file of files) {
  if (/\.test\.ts$/.test(file)) { ... }
}

// ✅ CORRECT - Compile once
const TEST_FILE_REGEX = /\.test\.ts$/;
for (const file of files) {
  if (TEST_FILE_REGEX.test(file)) { ... }
}
```

**Performance:** 10-100x faster for large file sets

---

## Common Pitfalls

### 1. Race Condition: Concurrent PRE Creation
**Problem:** Multiple saves trigger concurrent PRE creation  
**Symptom:** Seq allocation conflicts, orphan PREs

**Solution:** Synchronous state reservation
```typescript
// Reserve slot BEFORE any await
const placeholder: ActivePREState = {
  pending: true,
  preId: null,
  timestamp: Date.now()
};
this.activePREs.set(filePath, placeholder);

// Now safe to await
const pre = await this.snapshotStore.createPRE(...);
this.activePREs.set(filePath, { pending: false, preId: pre.id });
```

**Key:** Synchronous reservation prevents race window

---

### 2. Schema Validation: Runtime vs. Compile-Time
**Problem:** Trusting external data without validation  
**Example:** Loading manifest from disk

```typescript
// ❌ WRONG - No validation
const manifest = JSON.parse(fileContent) as SnapshotManifest;

// ✅ CORRECT - Runtime validation
const ManifestSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  files: z.record(z.object({
    blob: z.string(),
    size: z.number()
  }))
});

const result = ManifestSchema.safeParse(JSON.parse(fileContent));
if (!result.success) {
  throw new ValidationError('Invalid manifest');
}
const manifest = result.data;
```

---

### 3. Feature Branch Strategy for Parallel Quests
**Problem:** Multiple refactoring quests modify same files  
**Solution:** Isolated feature branches with sequential merging

```bash
# Create quest branches
git checkout -b quest/db-mock
git checkout -b quest/orpc
git checkout -b quest/msw

# Merge sequentially to main
git checkout main
git merge quest/db-mock
git merge quest/orpc
git merge quest/msw
```

**Benefit:** Clean rollback of individual quests without affecting others

---

### 4. POST Creation Failure Handling
**Problem:** POST creation fails, PRE becomes orphan  
**Solution:** Always delete activePRE on failure

```typescript
async onBurstEnd(filePath: string): Promise<SnapshotManifestV2 | null> {
  const activePRE = this.activePREs.get(filePath);
  
  try {
    const post = await this.snapshotStore.createPOST(...);
    this.activePREs.delete(filePath); // Success
    return post;
  } catch (error) {
    this.activePREs.delete(filePath); // CRITICAL: Clear on failure
    
    if (isFileNotFound(error)) {
      console.debug('File deleted before burst end, orphaning PRE');
    } else {
      console.error('POST creation failed, orphaning PRE', error);
    }
    throw error;
  }
}
```

**Orphan Detection:** Startup scan identifies PREs without POST

---

## Testing Strategy

### 1. Comprehensive Concurrency Test Coverage
**Required Tests:**
- Race condition scenarios (concurrent saves, PRE creation)
- Writer lock contention (multiple threads acquiring lock)
- Orphan detection (PRE without POST)
- Rollback safety (interrupted operations)

**Example:**
```typescript
it('should handle concurrent PRE creation', async () => {
  const promises = Array.from({ length: 10 }, () =>
    prwManager.onBurstStart(filePath, riskScore)
  );
  
  const results = await Promise.all(promises);
  
  // Only one PRE should succeed
  const successful = results.filter(r => r !== null);
  expect(successful).toHaveLength(1);
});
```

---

### 2. End-to-End Timing Validation
**Pattern:** Measure async flow performance  
**Use Cases:** PRE creation latency, snapshot deduplication speed

```typescript
it('should create PRE in <15ms', async () => {
  const start = Date.now();
  await prwManager.onBurstStart(filePath, riskScore);
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(15);
});
```

**Performance Budget:** PRE <15ms, POST <100ms, Dedup check <10ms

---

### 3. MSW Testing Setup Pattern
**Pattern:** Mock network requests in tests  
**Benefits:** Fast, deterministic, no external dependencies

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.post('/api/snapshots', () => {
    return HttpResponse.json({ id: 'snap-123' });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Location:** `packages/testing/src/msw/`

---

### 4. oRPC Test Utilities
**Pattern:** Type-safe API mocking  
**Benefits:** Auto-generated mocks from RPC schema

```typescript
import { createMockClient } from '@snapback/testing/orpc';

const mockClient = createMockClient({
  createSnapshot: vi.fn().mockResolvedValue({ id: 'snap-123' })
});

await mockClient.createSnapshot({ files: [...] });
expect(mockClient.createSnapshot).toHaveBeenCalledWith(...);
```

---

## Configuration Management

### 1. Smart Defaults + Config Validation
**Pattern:** Project detection → auto-configuration  
**Time-to-Value:** Reduces from 5 min → <1 min

**Workflow:**
1. Detect project type (package.json, requirements.txt, etc.)
2. Generate `.snapbackignore` with framework-specific patterns
3. Suggest protection levels based on file criticality
4. Validate config in real-time with inline errors

**Example Detection:**
```typescript
const PROJECT_DETECTORS = {
  nodejs: (files) => files.includes('package.json'),
  python: (files) => files.includes('requirements.txt'),
  rust: (files) => files.includes('Cargo.toml')
};

function detectProjectType(workspaceFiles: string[]): string {
  for (const [type, detector] of Object.entries(PROJECT_DETECTORS)) {
    if (detector(workspaceFiles)) {
      return type;
    }
  }
  return 'generic';
}
```

---

### 2. User-Level State Persistence (globalState)
**Pattern:** Store accumulated user data in VS Code globalState  
**Use Cases:** User level (beginner/expert), usage stats, walkthrough progress

```typescript
// Save
await context.globalState.update('snapback.userLevel', 'intermediate');

// Load
const userLevel = context.globalState.get<string>('snapback.userLevel', 'beginner');
```

**Why globalState:** Survives workspace changes, per-user not per-project

---

## Performance Optimization

### 1. Lazy Component Initialization
**Pattern:** Defer heavy initialization until first use  
**Benefit:** Reduces activation time from 3.9s → <50ms

```typescript
async initialize(): Promise<void> {
  // Only initialize cooldown cache immediately
  this.cooldownCache.start();
  
  // Defer blob store, snapshot store, session store
  this.initializeComponents().catch(console.error);
}

private async ensureComponentsInitialized(): Promise<void> {
  if (this._componentsInitialized) return;
  
  await this.blobStore.initialize();
  await this.snapshotStore.initialize();
  await this.sessionStore.initialize();
  
  this._componentsInitialized = true;
}
```

**Location:** `apps/vscode/src/storage/StorageManager.ts`

---

### 2. Lock Acquisition Performance Benchmarking
**Pattern:** Measure lock contention under load  
**Metrics:** Avg wait time, max wait time, throughput

```typescript
it('should handle 100 concurrent lock acquisitions', async () => {
  const lock = new WriterLock();
  const times: number[] = [];
  
  const promises = Array.from({ length: 100 }, async () => {
    const start = Date.now();
    await lock.withLock(async () => {
      await sleep(5); // Simulate work
    });
    times.push(Date.now() - start);
  });
  
  await Promise.all(promises);
  
  const avgWait = times.reduce((a, b) => a + b) / times.length;
  expect(avgWait).toBeLessThan(50); // 50ms avg wait acceptable
});
```

---

### 3. Orphan PRE Checkpoint Detection at Startup
**Pattern:** Non-blocking scan for observability  
**Purpose:** Identify interrupted saves, log for debugging

```typescript
async detectOrphanPREs(): Promise<{ orphanCount: number; orphanIds: string[] }> {
  const manifests = await this.listV2({ limit: 500, includeOrphanStatus: true });
  
  const orphanIds = manifests
    .filter(m => m.type === 'PRE' && m.isOrphan)
    .map(m => m.id);
  
  if (orphanIds.length > 0) {
    console.debug(`Found ${orphanIds.length} orphan PRE checkpoint(s)`);
  }
  
  return { orphanCount: orphanIds.length, orphanIds };
}
```

**Non-blocking:** Run in background, don't block activation

---

## UX Best Practices

### 1. Progressive Disclosure Pattern
**Pattern:** Show advanced features only when user ready  
**User Levels:**
- **Beginner:** Simple actions (Create Snapshot, Browse)
- **Intermediate:** Bulk operations, filters
- **Advanced:** Custom scripts, API access

**Implementation:**
```typescript
function getAvailableActions(userLevel: UserLevel): Action[] {
  const base = [{ id: 'create', label: 'Create Snapshot' }];
  
  if (userLevel === 'intermediate' || userLevel === 'advanced') {
    base.push({ id: 'bulk-create', label: 'Bulk Create' });
  }
  
  if (userLevel === 'advanced') {
    base.push({ id: 'api-access', label: 'API Keys' });
  }
  
  return base;
}
```

---

### 2. Reversible Actions Framework (LogRocket)
**4 Types:**
1. **Undo:** Immediate, in-session (Ctrl+Z)
2. **Soft Delete:** Temporary removal, 30-day retention
3. **Version History:** Per-file timeline (Snapshots)
4. **Rollback:** Multi-file state restoration (Sessions)

**SnapBack Mapping:**
- **Snapshots** = Version History (file-level, granular)
- **Sessions** = Rollback (multi-file, atomic)

**UX Clarity:** Use action verbs ("Undo AI Changes", not "Restore Session")

---

### 3. Codebase Experience Inventory
**Pattern:** Audit all user-facing touchpoints  
**Categories:**
1. **Commands:** Registered in `package.json`
2. **UI Surfaces:** Tree views, status bar, notifications
3. **Events:** Published via event bus
4. **Services:** Background workers

**Status Classification:**
- 🟢 **Live:** Exists, registered, called, connected, tested
- 🟡 **Orphaned:** Exists but not wired or untested
- 🔴 **Stub:** Interface exists but no implementation

**Prioritization:** Orphaned and stub entries → high ROI for wiring

---

## Cross-Cutting Concerns

### 1. Consolidate Scattered Implementations
**Anti-pattern:** 15+ custom progress indicators across codebase  
**Solution:** Single unified utility

```typescript
// Before: 15+ custom implementations
function showProgress1() { /* custom logic */ }
function showProgress2() { /* custom logic */ }
// ...

// After: Unified ProgressReporter
const reporter = new ProgressReporter({
  title: 'Creating snapshot',
  cancellable: true
});
reporter.start();
reporter.update(50, 'Reading files...');
reporter.complete('Done');
```

**Location:** `apps/vscode/src/ux/utilities/ProgressReporter.ts`

---

### 2. Structured Architecture Gap Analysis
**Methodology:**
1. Define target architecture spec
2. Verify file existence
3. Check interface exports
4. Validate naming alignment
5. Test data flow connectivity
6. Confirm schema conformance
7. Measure performance budgets

**Output:** JSON report with mismatches, missing components, broken wiring

---

### 3. Debug Logging at Critical Paths
**Pattern:** Structured logs for troubleshooting  
**When:** Orphan detection, deduplication skips, lock contention

```typescript
if (lastSnapshot && this.isContentIdentical(lastSnapshot.files, fileRefs)) {
  console.debug('[SnapshotStore] Skipping duplicate snapshot', {
    lastSnapshotId: lastSnapshot.id,
    fileCount: Object.keys(fileRefs).length
  });
  return lastSnapshot;
}
```

**Benefits:** Observability without performance impact (debug level)

---

## Quick Reference: File Locations

| Component | Location |
|-----------|----------|
| Blob Store | `apps/vscode/src/storage/BlobStore.ts` |
| Snapshot Store | `apps/vscode/src/storage/SnapshotStore.ts` |
| PRWManager | `apps/vscode/src/domain/prwManager.ts` |
| Writer Lock | `apps/vscode/src/storage/writerLock.ts` |
| UX Utilities | `apps/vscode/src/ux/utilities/` |
| Tree Provider | `apps/vscode/src/views/snapBackTreeProvider.ts` |
| Session Commands | `apps/vscode/src/commands/sessionCommands.ts` |
| TDD Core | `ai_dev_utils/TDD_CORE.md` |
| Testing Patterns | `ai_dev_utils/testing_docs/` |

---

## Version History

| Date | Change | Impact |
|------|--------|--------|
| 2025-12-14 | Added manifest deduplication | Prevents snapshot spam |
| 2025-12-14 | V2 manifest filtering | Fixes "0 files" bug |
| 2025-12-14 | UX tree action rename | Clarifies snapshot vs. session |
| 2025-11-18 | PRWManager PRE/POST pattern | Rollback safety |
| 2025-11-06 | Blob store deduplication | 10-100x space savings |

---

**Maintenance:** Update this file when adding new patterns or lessons  
**Usage:** Reference before starting new features or debugging issues
