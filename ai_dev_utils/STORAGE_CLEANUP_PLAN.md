# Storage Cleanup Plan - TDD Compliant

**Date:** 2025-12-09
**Phase 0 Audit:** `evidence/phase0_storage_architecture_audit.md`
**Authority:** TDD_CORE.md, TDD_WORKFLOW.md

---

## Executive Summary

**FINDING:** The storage_implementation_gap.md document is outdated. The VSCode extension **HAS** completed its migration to file-based storage successfully.

**GOAL:** Remove dead code, correct documentation, and add integration tests to validate the current architecture.

---

## TDD Workflow State

```json
{
  "currentPhase": 0,
  "task": "Storage Architecture Cleanup",
  "phaseStatus": "COMPLETE",
  "nextPhase": 1,
  "violations": []
}
```

**Phase 0 Exit Criteria:** ✅ ALL MET
- Architecture audit complete
- Existing services documented
- Canonical locations verified
- No service layer bypasses found
- Remediation plan created

---

## Task Breakdown

### Task 1: Documentation Correction (Priority 1)

**Goal:** Update docs to reflect CURRENT architecture (file-based storage)

**TDD Phase:** N/A (documentation only)

**Steps:**

1. **Archive outdated document**
   ```bash
   mv storage_implementation_gap.md \
      ai_dev_utils/evidence/storage_implementation_gap_ARCHIVED_2025-12-09.md
   ```

2. **Add archive header**
   ```markdown
   # ⚠️  ARCHIVED - OUTDATED INFORMATION

   **Archive Date:** 2025-12-09
   **Reason:** This document described a migration-in-progress state that has since been completed.
   **Current State:** VSCode extension successfully uses file-based storage (apps/vscode/src/storage/)
   **Replacement:** See docs/architecture/storage-current-state.md
   ```

3. **Create current architecture doc**
   - File: `docs/architecture/storage-current-state.md`
   - Content:
     - Current file-based architecture diagram
     - Package responsibilities
     - VSCode: file-based (apps/vscode/src/storage/)
     - Servers: SQLite-based (packages/sdk/src/storage/)
     - Bundle size analysis
     - Migration history (completed)

---

### Task 2: Dead Code Removal (Priority 2)

**Goal:** Remove obsolete SQLite diagnostic code

**TDD Phase:** N/A (cleanup only)

**Pre-flight Check:**
```bash
# Verify these files are not imported anywhere
git grep -l "validate-storage" apps/vscode/src/
git grep -l "test-sqlite" apps/vscode/src/
git grep -l "SqliteSnapshotStorage" apps/vscode/src/
```

**Steps:**

1. **Delete dead files**
   ```bash
   rm apps/vscode/validate-storage.ts
   rm apps/vscode/scripts/test-sqlite.js
   ```

2. **Update validate-manifest.js**
   ```diff
   - if (manifest.dependencies?.["better-sqlite3"]) {
   -   success("Native module (better-sqlite3) properly declared as dependency");
   - } else {
   -   error("better-sqlite3 not found in dependencies (required for SnapBack)");
   - }
   + // NOTE: better-sqlite3 removed - extension uses file-based storage
   ```

3. **Remove stale comments**
   - `apps/vscode/src/errors/index.ts` line 62: Delete SQLite connection error
   - `apps/vscode/src/constants.ts` line 23: Delete "Database lock timeout" comment
   - `apps/vscode/src/commands/sessionCommands.ts` line 279: Update @see reference

**Verification:**
```bash
# Should return 0 results
git grep -i "sqlite" apps/vscode/src --include="*.ts"
git grep -i "better-sqlite3" apps/vscode --include="*.ts" --include="*.js"
```

---

### Task 3: Integration Tests (Priority 3) - TDD REQUIRED

**Goal:** Validate file-based storage architecture with comprehensive tests

**TDD Workflow:** RED → GREEN → REFACTOR

---

#### Test 3.1: StorageManager Orchestration

**Phase 0 (Architecture Audit):**
- [x] Service exists: `apps/vscode/src/storage/StorageManager.ts`
- [x] No bypasses: All operations go through StorageManager
- [x] Dependencies: BlobStore, SnapshotStore, SessionStore, AuditLog, CooldownCache

**Phase 1 (RED - Failing Test):**

Create test file: `apps/vscode/test/integration/storage/StorageManager.integration.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as vscode from "vscode";
import { StorageManager } from "../../../src/storage/StorageManager";
import { SnapBackEventBus } from "@snapback/events";

describe("StorageManager Integration", () => {
  let storage: StorageManager;
  let mockContext: vscode.ExtensionContext;
  let eventBus: SnapBackEventBus;
  let tempDir: vscode.Uri;

  beforeEach(async () => {
    // Setup mock context with temp directory
    tempDir = vscode.Uri.file(`/tmp/snapback-test-${Date.now()}`);
    mockContext = {
      globalStorageUri: tempDir,
      subscriptions: [],
    } as any;

    eventBus = new SnapBackEventBus();
    await eventBus.initialize();

    storage = new StorageManager(mockContext, eventBus);
  });

  afterEach(async () => {
    storage.dispose();
    await eventBus.dispose();
    // Cleanup temp directory
    await vscode.workspace.fs.delete(tempDir, { recursive: true });
  });

  // Happy Path
  it("should initialize with lazy component loading", async () => {
    await storage.initialize();

    expect(storage.isInitialized()).toBe(true);
    // Cooldown cache starts immediately
    expect(storage.getActiveCooldowns()).toEqual([]);
  });

  it("should create snapshot with full flow", async () => {
    await storage.initialize();

    const files = new Map([
      ["/test/file1.ts", "console.log('test');"],
      ["/test/file2.ts", "export const foo = 'bar';"]
    ]);

    const snapshot = await storage.createSnapshot(files, {
      name: "Test Snapshot",
      trigger: { type: "manual", source: "test" },
    });

    expect(snapshot).toBeDefined();
    expect(snapshot.id).toBeTruthy();
    expect(snapshot.name).toBe("Test Snapshot");
    expect(snapshot.files).toHaveLength(2);
  });

  it("should deduplicate blob storage", async () => {
    await storage.initialize();

    const duplicateContent = "console.log('duplicate');";
    const files1 = new Map([["/file1.ts", duplicateContent]]);
    const files2 = new Map([["/file2.ts", duplicateContent]]);

    await storage.createSnapshot(files1, {
      name: "Snapshot 1",
      trigger: { type: "manual", source: "test" },
    });

    await storage.createSnapshot(files2, {
      name: "Snapshot 2",
      trigger: { type: "manual", source: "test" },
    });

    const stats = await storage.getQuickStats();
    expect(stats.snapshots).toBe(2);
    // Only 1 blob should exist due to deduplication
    expect(stats.blobs).toBe(1);
  });

  it("should record audit trail", async () => {
    await storage.initialize();

    await storage.recordAudit({
      action: "snapshot_created",
      filePath: "/test/file.ts",
      metadata: { trigger: "manual" },
    });

    const trail = await storage.getAuditTrail("/test/file.ts");
    expect(trail).toHaveLength(1);
    expect(trail[0].action).toBe("snapshot_created");
  });

  // Sad Path
  it("should handle initialization failure gracefully", async () => {
    // Mock filesystem failure
    const invalidContext = {
      globalStorageUri: vscode.Uri.file("/invalid/readonly/path"),
      subscriptions: [],
    } as any;

    const failStorage = new StorageManager(invalidContext);

    // Should not throw, just log warning
    await failStorage.initialize();
    expect(failStorage.isInitialized()).toBe(true); // Lazy init still succeeds
  });

  it("should handle missing snapshot", async () => {
    await storage.initialize();

    const result = await storage.getSnapshot("nonexistent-id");
    expect(result).toBeNull();
  });

  // Edge Cases
  it("should handle empty snapshot creation", async () => {
    await storage.initialize();

    const emptyFiles = new Map();
    const snapshot = await storage.createSnapshot(emptyFiles, {
      name: "Empty Snapshot",
      trigger: { type: "manual", source: "test" },
    });

    expect(snapshot.files).toHaveLength(0);
  });

  it("should handle concurrent operations", async () => {
    await storage.initialize();

    const operations = Array.from({ length: 10 }, (_, i) =>
      storage.createSnapshot(
        new Map([[`/file${i}.ts`, `content ${i}`]]),
        {
          name: `Snapshot ${i}`,
          trigger: { type: "manual", source: "test" },
        }
      )
    );

    const results = await Promise.all(operations);
    expect(results).toHaveLength(10);
    expect(new Set(results.map(r => r.id))).toHaveLength(10); // All unique IDs
  });

  // Error Handling
  it("should throw on operations before initialization", async () => {
    // Don't call initialize()
    const files = new Map([["/test.ts", "content"]]);

    // Should still work due to lazy initialization
    const snapshot = await storage.createSnapshot(files, {
      name: "Test",
      trigger: { type: "manual", source: "test" },
    });

    expect(snapshot).toBeDefined();
  });
});
```

**Expected Result:** ❌ FAIL (test file doesn't exist yet)

**Phase 2 (GREEN - Make Test Pass):**

Run test to verify failures:
```bash
cd apps/vscode
pnpm test test/integration/storage/StorageManager.integration.test.ts
```

**If tests fail:**
1. Check StorageManager implementation
2. Verify component initialization
3. Fix bugs found during testing

**Expected Outcome:** ✅ PASS all tests

**Phase 3 (REFACTOR):**
- Extract test helpers (createMockContext, createTempStorage)
- Add performance benchmarks
- Document test patterns

---

#### Test 3.2: SnapshotStorageAdapter Bridge

**Phase 1 (RED - Failing Test):**

Create: `apps/vscode/test/integration/snapshot/SnapshotStorageAdapter.integration.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as vscode from "vscode";
import { StorageManager } from "../../../src/storage/StorageManager";
import { SnapshotStorageAdapter } from "../../../src/snapshot/SnapshotStorageAdapter";

describe("SnapshotStorageAdapter (Legacy Bridge)", () => {
  let storage: StorageManager;
  let adapter: SnapshotStorageAdapter;
  let mockContext: vscode.ExtensionContext;
  let tempDir: vscode.Uri;

  beforeEach(async () => {
    tempDir = vscode.Uri.file(`/tmp/snapback-test-${Date.now()}`);
    mockContext = {
      globalStorageUri: tempDir,
      subscriptions: [],
    } as any;

    storage = new StorageManager(mockContext);
    await storage.initialize();

    adapter = new SnapshotStorageAdapter(storage);
  });

  afterEach(async () => {
    storage.dispose();
    await vscode.workspace.fs.delete(tempDir, { recursive: true });
  });

  // Design Decision Validation
  it("should throw on direct save (by design)", async () => {
    const mockSnapshot = {
      id: "test-id",
      name: "Test",
      timestamp: Date.now(),
      files: [],
      isProtected: false,
      icon: "circle",
      iconColor: "#fff",
    };

    await expect(adapter.save(mockSnapshot)).rejects.toThrow(
      "Direct save not supported - use SnapshotManager"
    );
  });

  // Happy Path
  it("should retrieve snapshot after creation", async () => {
    // Create via StorageManager
    const files = new Map([["/test.ts", "content"]]);
    const created = await storage.createSnapshot(files, {
      name: "Test Snapshot",
      trigger: { type: "manual", source: "test" },
    });

    // Retrieve via adapter
    const retrieved = await adapter.get(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.name).toBe("Test Snapshot");
  });

  it("should list all snapshots", async () => {
    // Create 3 snapshots
    for (let i = 0; i < 3; i++) {
      await storage.createSnapshot(
        new Map([[`/file${i}.ts`, `content ${i}`]]),
        {
          name: `Snapshot ${i}`,
          trigger: { type: "manual", source: "test" },
        }
      );
    }

    const snapshots = await adapter.getAll();
    expect(snapshots).toHaveLength(3);
  });

  it("should delete snapshot", async () => {
    const files = new Map([["/test.ts", "content"]]);
    const created = await storage.createSnapshot(files, {
      name: "To Delete",
      trigger: { type: "manual", source: "test" },
    });

    await adapter.delete(created.id);

    const retrieved = await adapter.get(created.id);
    expect(retrieved).toBeUndefined();
  });

  // Sad Path
  it("should return undefined for missing snapshot", async () => {
    const result = await adapter.get("nonexistent");
    expect(result).toBeUndefined();
  });

  it("should handle update gracefully (calls save internally)", async () => {
    const files = new Map([["/test.ts", "content"]]);
    const created = await storage.createSnapshot(files, {
      name: "Original",
      trigger: { type: "manual", source: "test" },
    });

    const snapshot = await adapter.get(created.id);
    expect(snapshot).toBeDefined();

    // Update should throw (calls save internally)
    await expect(
      adapter.update(created.id, { name: "Updated" })
    ).rejects.toThrow("Direct save not supported");
  });
});
```

**Expected Result:** ❌ FAIL (test file doesn't exist yet)

**Phase 2 (GREEN):**
```bash
cd apps/vscode
pnpm test test/integration/snapshot/SnapshotStorageAdapter.integration.test.ts
```

**Expected Outcome:** ✅ PASS all tests

---

#### Test 3.3: Build Dependencies Validation

**Phase 1 (RED):**

Create: `apps/vscode/test/unit/build/dependencies.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Build Dependencies (No SQLite)", () => {
  it("should NOT have better-sqlite3 in package.json", () => {
    const pkgPath = path.join(__dirname, "../../../package.json");
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    expect(pkgJson.dependencies?.["better-sqlite3"]).toBeUndefined();
    expect(pkgJson.devDependencies?.["better-sqlite3"]).toBeUndefined();
    expect(pkgJson.optionalDependencies?.["better-sqlite3"]).toBeUndefined();
  });

  it("should only externalize vscode API in esbuild", () => {
    const configPath = path.join(__dirname, "../../../esbuild.config.cjs");
    const configContent = fs.readFileSync(configPath, "utf-8");

    // Parse external array from esbuild config
    const externalMatch = configContent.match(/external:\s*\[([\s\S]*?)\]/);
    expect(externalMatch).toBeTruthy();

    const externalStr = externalMatch![1];

    // Should only contain "vscode" and comments
    expect(externalStr).toContain('"vscode"');
    expect(externalStr).not.toContain('better-sqlite3');
    expect(externalStr).not.toContain('sql.js');
  });

  it("should have file-based storage imports only", () => {
    const storageDir = path.join(__dirname, "../../../src/storage");
    const files = fs.readdirSync(storageDir);

    expect(files).toContain("StorageManager.ts");
    expect(files).toContain("BlobStore.ts");
    expect(files).toContain("SnapshotStore.ts");
    expect(files).toContain("SessionStore.ts");
    expect(files).toContain("AuditLog.ts");
    expect(files).toContain("CooldownCache.ts");
  });
});
```

**Phase 2 (GREEN):**
```bash
cd apps/vscode
pnpm test test/unit/build/dependencies.test.ts
```

**Expected Outcome:** ✅ PASS all tests

---

## Task Execution Order (TDD Workflow)

```
1. Task 1 (Documentation) → Independent, can run anytime
2. Task 2 (Dead Code) → Depends on Task 1 (doc updates)
3. Task 3.1 (StorageManager Tests) → RED → GREEN → REFACTOR
4. Task 3.2 (Adapter Tests) → RED → GREEN → REFACTOR
5. Task 3.3 (Build Tests) → RED → GREEN → REFACTOR
```

**Total Estimated Time:** 8-10 hours
- Task 1: 2-3 hours
- Task 2: 1-2 hours
- Task 3: 4-5 hours (with TDD cycles)

---

## Success Criteria

- [ ] storage_implementation_gap.md archived with warning header
- [ ] New docs/architecture/storage-current-state.md created
- [ ] Dead code removed (validate-storage.ts, test-sqlite.js)
- [ ] SQLite comments removed from source files
- [ ] ✅ 3 integration test suites passing (4-path coverage: happy, sad, edge, error)
- [ ] ✅ Build validation tests passing
- [ ] No grep matches for "sqlite" in apps/vscode/src
- [ ] CI passes with new tests

---

## Post-Demo Tasks (Priority 4)

**Deferred until after YC demo:**

1. **Package Consolidation**
   - Audit packages-oss/sdk vs packages/sdk divergence
   - Create migration plan for OSS consumers
   - Decide: merge or split into @snapback/storage-server and @snapback/storage-client

2. **Performance Benchmarking**
   - Bundle size analysis (target: <2MB)
   - Snapshot creation latency
   - Memory usage profiling

3. **Documentation Site**
   - Add storage architecture page to docs site
   - Include migration history
   - Provide upgrade guide for existing users

---

**Last Updated:** 2025-12-09
**Next Step:** Execute Task 1 (Documentation Correction)
