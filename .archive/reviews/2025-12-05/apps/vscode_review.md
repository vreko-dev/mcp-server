Here's a comprehensive code review prompt for full system inspection:

---

```markdown
# Comprehensive Storage System Code Review & Test Coverage Audit

## Objective
Conduct a thorough review of the SnapBack VS Code extension's new file-based storage system to ensure:
1. Correct functionality across all components
2. Adequate test coverage (target: 80%+)
3. Edge case handling
4. Error recovery
5. Performance characteristics
6. Integration correctness

---

## PHASE 1: System Inventory (10 min)

### 1.1 List All Storage Files
```bash
find apps/vscode/src/storage -name "*.ts" -type f | head -20
```

### 1.2 List All Storage Tests
```bash
find apps/vscode -path "*/test*" -name "*storage*" -o -name "*Storage*" -o -name "*Blob*" -o -name "*Snapshot*" -o -name "*Session*" -o -name "*Audit*" -o -name "*Cooldown*" 2>/dev/null | grep -E "\.test\.ts$|\.spec\.ts$"
```

### 1.3 Check Test Configuration
```bash
cat apps/vscode/vitest.config.ts 2>/dev/null || cat apps/vscode/jest.config.js 2>/dev/null
```

### 1.4 Document Current State
Create inventory of:
- [ ] All storage implementation files (with line counts)
- [ ] All existing test files
- [ ] Test framework in use (Vitest/Jest/Mocha)
- [ ] Coverage configuration

---

## PHASE 2: Implementation Review (30 min)

Read each file and verify correctness against requirements:

### 2.1 Core Types (`types.ts`)
```bash
cat apps/vscode/src/storage/types.ts
```

Verify:
- [ ] All interfaces properly defined
- [ ] No `any` types (strict TypeScript)
- [ ] Proper JSDoc documentation
- [ ] Compatibility aliases present (SnapshotStorage, FileSystemStorage)

### 2.2 Utilities

#### fileId.ts
```bash
cat apps/vscode/src/storage/utils/fileId.ts
```

Verify:
- [ ] Timestamp format is Windows-safe (no colons in filenames)
- [ ] IDs are unique (timestamp + random component)
- [ ] parseTimestampFromId() correctly extracts timestamp

#### hash.ts
```bash
cat apps/vscode/src/storage/utils/hash.ts
```

Verify:
- [ ] Uses SHA-256 (crypto.createHash('sha256'))
- [ ] Returns hex string
- [ ] getBlobPath() creates 2-level directory structure (ab/cd/full-hash)

#### atomicWrite.ts
```bash
cat apps/vscode/src/storage/utils/atomicWrite.ts
```

Verify:
- [ ] Uses write-then-rename pattern
- [ ] Temp file has unique name (prevents collisions)
- [ ] Handles FileNotFound gracefully
- [ ] JSON parse errors caught (per code review fix)
- [ ] Directory creation is recursive

### 2.3 Storage Components

#### CooldownCache.ts
```bash
cat apps/vscode/src/storage/CooldownCache.ts
```

Verify:
- [ ] Uses in-memory Map (NOT persisted)
- [ ] Entries expire after TTL
- [ ] Cleanup interval prevents memory leaks
- [ ] dispose() clears interval
- [ ] No persistence to disk (truly ephemeral)

#### BlobStore.ts
```bash
cat apps/vscode/src/storage/BlobStore.ts
```

Verify:
- [ ] Content-addressable (same content = same hash)
- [ ] Deduplication works (doesn't write if blob exists)
- [ ] 2-level directory structure (ab/cd/hash)
- [ ] retrieve() returns null for missing blobs (not throws)
- [ ] delete() handles missing blobs gracefully

#### SnapshotStore.ts
```bash
cat apps/vscode/src/storage/SnapshotStore.ts
```

Verify:
- [ ] Manifests stored separately from content
- [ ] Files reference blobs by hash
- [ ] getWithContent() resolves all blob references
- [ ] Missing blobs logged (per code review fix)
- [ ] list() returns sorted by timestamp (newest first)
- [ ] delete() removes manifest AND orphaned blobs

#### SessionStore.ts
```bash
cat apps/vscode/src/storage/SessionStore.ts
```

Verify:
- [ ] Session lifecycle: start → update → finalize
- [ ] Active sessions tracked separately
- [ ] Finalized sessions immutable
- [ ] getActive() returns only non-finalized
- [ ] Abandoned sessions handled (cleanup strategy)

#### AuditLog.ts
```bash
cat apps/vscode/src/storage/AuditLog.ts
```

Verify:
- [ ] JSONL format (one JSON object per line)
- [ ] Append-only (no modifications)
- [ ] Entries have timestamp, id, action
- [ ] Query methods work (getForFile, getByAction, getInRange)
- [ ] Handles empty/missing file

#### StorageManager.ts
```bash
cat apps/vscode/src/storage/StorageManager.ts
```

Verify:
- [ ] Implements IStorageManager interface
- [ ] Initializes all components in correct order
- [ ] dispose() cleans up all resources
- [ ] Coordinates between components correctly
- [ ] Error handling doesn't leave partial state

---

## PHASE 3: Integration Points Review (15 min)

### 3.1 Extension Activation
```bash
grep -n "StorageManager" apps/vscode/src/extension.ts
grep -n "StorageManager" apps/vscode/src/activation/phase2-storage.ts
```

Verify:
- [ ] StorageManager created with ExtensionContext
- [ ] initialize() called before use
- [ ] dispose() called on deactivation
- [ ] Error handling for initialization failures

### 3.2 Operation Coordinator
```bash
grep -n "storage\." apps/vscode/src/operationCoordinator.ts | head -30
```

Verify:
- [ ] Uses new API methods (createSnapshot, listSnapshots, getSnapshot)
- [ ] No references to old methods (create, list, retrieve, restore)
- [ ] Proper error handling for storage failures

### 3.3 Commands
```bash
grep -rn "storage\." apps/vscode/src/commands/ | grep -v "test" | head -20
```

Verify:
- [ ] All commands use new storage API
- [ ] Error states handled gracefully
- [ ] User feedback on failures

---

## PHASE 4: Test Coverage Analysis (20 min)

### 4.1 Run Existing Tests
```bash
cd apps/vscode && pnpm test -- --reporter=verbose 2>&1 | head -100
```

### 4.2 Check Coverage Report
```bash
cd apps/vscode && pnpm test -- --coverage 2>&1 | tail -50
```

### 4.3 Identify Coverage Gaps

For each storage file, document:
- Current test coverage %
- Missing test scenarios
- Critical paths not tested

Expected coverage targets:
| File | Target | Priority |
|------|--------|----------|
| StorageManager.ts | 80% | HIGH |
| BlobStore.ts | 90% | HIGH |
| SnapshotStore.ts | 85% | HIGH |
| SessionStore.ts | 80% | MEDIUM |
| CooldownCache.ts | 90% | MEDIUM |
| AuditLog.ts | 70% | LOW |
| atomicWrite.ts | 85% | HIGH |

---

## PHASE 5: Test Gap Analysis & Creation (30 min)

### 5.1 Required Test Scenarios

Create tests for these critical scenarios if missing:

#### BlobStore Tests
```typescript
describe('BlobStore', () => {
  // Deduplication
  it('should not create duplicate blobs for same content', async () => {});
  it('should create different blobs for different content', async () => {});

  // Retrieval
  it('should return null for non-existent blob', async () => {});
  it('should retrieve stored content correctly', async () => {});

  // Edge cases
  it('should handle empty string content', async () => {});
  it('should handle large content (>1MB)', async () => {});
  it('should handle unicode content', async () => {});

  // Concurrency
  it('should handle concurrent writes of same content', async () => {});
});
```

#### SnapshotStore Tests
```typescript
describe('SnapshotStore', () => {
  // CRUD
  it('should create snapshot with multiple files', async () => {});
  it('should retrieve snapshot manifest', async () => {});
  it('should retrieve snapshot with content', async () => {});
  it('should list snapshots sorted by date', async () => {});
  it('should delete snapshot and orphaned blobs', async () => {});

  // Edge cases
  it('should handle snapshot with no files', async () => {});
  it('should handle missing blob references gracefully', async () => {});
  it('should return null for non-existent snapshot', async () => {});

  // Filtering
  it('should filter by date range', async () => {});
  it('should limit results', async () => {});
});
```

#### CooldownCache Tests
```typescript
describe('CooldownCache', () => {
  // Basic operations
  it('should set and check cooldown', async () => {});
  it('should expire cooldown after TTL', async () => {});
  it('should clear specific cooldown', async () => {});
  it('should clear all cooldowns', async () => {});

  // Persistence (should NOT persist)
  it('should NOT persist cooldowns across instances', async () => {});

  // Cleanup
  it('should auto-cleanup expired entries', async () => {});
  it('should stop cleanup on dispose', async () => {});
});
```

#### AtomicWrite Tests
```typescript
describe('atomicWrite', () => {
  // Success cases
  it('should write file atomically', async () => {});
  it('should create parent directories', async () => {});

  // Error handling
  it('should handle corrupted JSON gracefully', async () => {});
  it('should return null for missing file', async () => {});
  it('should clean up temp file on failure', async () => {});

  // Concurrency
  it('should handle concurrent writes to same file', async () => {});
});
```

#### StorageManager Integration Tests
```typescript
describe('StorageManager Integration', () => {
  // Full workflow
  it('should complete snapshot → retrieve → restore workflow', async () => {});
  it('should track session with multiple snapshots', async () => {});
  it('should record audit entries for all operations', async () => {});

  // Error recovery
  it('should handle partial initialization failure', async () => {});
  it('should recover from corrupted manifest', async () => {});

  // Cleanup
  it('should dispose all resources on shutdown', async () => {});
});
```

### 5.2 Create Missing Tests

For each missing test scenario identified above, create the test file:

```bash
# Create test file if it doesn't exist
touch apps/vscode/test/unit/storage/BlobStore.test.ts
touch apps/vscode/test/unit/storage/SnapshotStore.test.ts
touch apps/vscode/test/unit/storage/CooldownCache.test.ts
touch apps/vscode/test/unit/storage/atomicWrite.test.ts
touch apps/vscode/test/integration/StorageManager.test.ts
```

---

## PHASE 6: Edge Case & Error Scenario Testing (15 min)

### 6.1 Simulate Error Conditions

Test these scenarios manually or via tests:

#### File System Errors
- [ ] Disk full (write failure)
- [ ] Permission denied (read/write)
- [ ] File locked by another process
- [ ] Directory doesn't exist

#### Data Corruption
- [ ] Corrupted JSON manifest
- [ ] Missing blob file
- [ ] Truncated file
- [ ] Invalid UTF-8 content

#### Concurrency
- [ ] Two saves at same millisecond
- [ ] Read during write
- [ ] Delete during read

#### Resource Limits
- [ ] 10,000+ snapshots
- [ ] 100MB single file
- [ ] Very long file paths (>260 chars on Windows)

### 6.2 Create Error Scenario Tests

```typescript
describe('Error Scenarios', () => {
  it('should handle corrupted manifest file', async () => {
    // Write invalid JSON to manifest location
    // Verify getSnapshot returns null, doesn't crash
  });

  it('should handle missing blob directory', async () => {
    // Delete blobs directory
    // Verify retrieve returns null
  });

  it('should handle very large snapshot list', async () => {
    // Create 1000 snapshots
    // Verify listSnapshots completes in <1s
  });
});
```

---

## PHASE 7: Performance Validation (10 min)

### 7.1 Benchmark Key Operations

```typescript
describe('Performance', () => {
  it('should create snapshot in <200ms', async () => {
    const start = Date.now();
    await storage.createSnapshot(testFiles, { name: 'perf-test', trigger: 'manual' });
    expect(Date.now() - start).toBeLessThan(200);
  });

  it('should check cooldown in <1ms', async () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      storage.cooldownCache.isOnCooldown(`/test/${i}.ts`);
    }
    expect(performance.now() - start).toBeLessThan(10); // <10ms for 1000 checks
  });

  it('should list 100 snapshots in <100ms', async () => {
    // Create 100 snapshots first
    const start = Date.now();
    await storage.listSnapshots();
    expect(Date.now() - start).toBeLessThan(100);
  });
});
```

### 7.2 Memory Usage Check

```typescript
it('should not leak memory on repeated operations', async () => {
  const initialMemory = process.memoryUsage().heapUsed;

  for (let i = 0; i < 100; i++) {
    await storage.createSnapshot(testFiles, { name: `test-${i}`, trigger: 'manual' });
  }

  // Force GC if available
  if (global.gc) global.gc();

  const finalMemory = process.memoryUsage().heapUsed;
  const growth = finalMemory - initialMemory;

  // Should not grow more than 50MB for 100 snapshots
  expect(growth).toBeLessThan(50 * 1024 * 1024);
});
```

---

## PHASE 8: Final Report (10 min)

### 8.1 Create Summary Report

Document:
1. **Files Reviewed:** List all files with status (✅/⚠️/❌)
2. **Test Coverage:** Current % vs target %
3. **Issues Found:** Severity, location, fix effort
4. **Tests Created:** List of new test files
5. **Performance Results:** Benchmark outcomes
6. **Recommendations:** Prioritized action items

### 8.2 Coverage Summary Table

| Component | Lines | Coverage | Status | Notes |
|-----------|-------|----------|--------|-------|
| types.ts | 207 | N/A | ✅ | Types only |
| fileId.ts | 47 | ?% | ? | |
| hash.ts | 20 | ?% | ? | |
| atomicWrite.ts | 94 | ?% | ? | |
| CooldownCache.ts | 144 | ?% | ? | |
| BlobStore.ts | 188 | ?% | ? | |
| SnapshotStore.ts | 236 | ?% | ? | |
| SessionStore.ts | 226 | ?% | ? | |
| AuditLog.ts | 180 | ?% | ? | |
| StorageManager.ts | 344 | ?% | ? | |
| **TOTAL** | ~1686 | ?% | ? | Target: 80% |

### 8.3 Action Items

Categorize findings:

**🔴 CRITICAL (Block Release)**
- List issues that must be fixed

**🟡 HIGH (Fix This Sprint)**
- List important issues

**🟢 MEDIUM (Backlog)**
- List nice-to-have improvements

**⚪ LOW (Future)**
- List minor enhancements

---

## Deliverables

At the end of this review, provide:

1. **STORAGE_TEST_COVERAGE_REPORT.md** - Coverage analysis
2. **New test files** - All missing tests created
3. **STORAGE_ISSUES_FOUND.md** - Issues discovered with fixes
4. **Updated coverage numbers** - After running new tests

---

## Success Criteria

Review is complete when:
- [ ] All 10 storage files reviewed
- [ ] Test coverage ≥80% for critical paths
- [ ] All critical issues have fixes or tracking issues
- [ ] Performance benchmarks documented
- [ ] No blocking issues remain for demo
```

---

Ready to run this comprehensive review?
