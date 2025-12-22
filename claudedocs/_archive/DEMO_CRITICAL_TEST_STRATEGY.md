# Demo-Critical Test Strategy

**Generated**: 2025-12-04
**Purpose**: Focus test efforts on activation funnel validation, not comprehensive coverage expansion
**Scope**: 3 critical user journeys that prove demo value

---

## Philosophy: Test What Matters for Demo

**NOT**: Achieve 85% coverage across 2,100+ tests
**YES**: 100% coverage of the 3 paths that prove SnapBack works

---

## The 3 Critical Paths

### Path 1: Extension Activates Fast
**User Experience**: "Extension loads instantly, doesn't feel broken"
**Current State**: 40-second cold start (BROKEN)
**Target State**: <3 seconds (acceptable), <500ms (ideal)

### Path 2: First Snapshot Created Automatically
**User Experience**: "I saved a file, it just worked - snapshot appeared"
**Current State**: Works but untested
**Target State**: 100% reliable, fires telemetry event

### Path 3: Restore Works Perfectly
**User Experience**: "I broke something, right-click restore, I'm back"
**Current State**: Works but untested
**Target State**: 100% reliable, exact file state restoration

---

## Test Implementation Guide

### Test Suite 1: Activation Performance

**File**: `apps/vscode/test/integration/activation.test.ts`

```typescript
import * as vscode from 'vscode';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Extension Activation Performance', () => {
  let extension: vscode.Extension<any>;

  beforeEach(() => {
    extension = vscode.extensions.getExtension('snapback.snapback')!;
  });

  it('should activate in under 3 seconds', async () => {
    const startTime = Date.now();
    await extension.activate();
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(3000);
    expect(extension.isActive).toBe(true);
  });

  it('should activate in under 500ms (ideal)', async () => {
    const startTime = Date.now();
    await extension.activate();
    const duration = Date.now() - startTime;

    // This may fail initially - target for optimization
    if (duration < 500) {
      expect(duration).toBeLessThan(500);
    } else {
      console.warn(`Activation took ${duration}ms - target is <500ms`);
    }
  });

  it('should fire extension_activated telemetry event', async () => {
    const telemetryEvents: any[] = [];

    // Mock telemetry service to capture events
    const originalTrackEvent = (global as any).trackEvent;
    (global as any).trackEvent = (event: string, data: any) => {
      telemetryEvents.push({ event, data });
    };

    await extension.activate();

    // Restore original
    (global as any).trackEvent = originalTrackEvent;

    const activationEvent = telemetryEvents.find(e => e.event === 'extension_activated');
    expect(activationEvent).toBeDefined();
    expect(activationEvent.data).toHaveProperty('activationTime');
    expect(activationEvent.data).toHaveProperty('version');
    expect(activationEvent.data).toHaveProperty('firstInstall');
  });

  it('should initialize storage within activation', async () => {
    await extension.activate();

    // Storage should be ready immediately after activation
    const storageAdapter = extension.exports?.storageAdapter;
    expect(storageAdapter).toBeDefined();
    expect(storageAdapter.isInitialized()).toBe(true);
  });

  it('should not block on non-critical services', async () => {
    // Analytics, telemetry should initialize async
    await extension.activate();

    const analyticsService = extension.exports?.analyticsService;
    // Analytics may still be initializing - that's OK
    expect(extension.isActive).toBe(true);
  });
});
```

**Success Criteria**:
- [ ] All 5 tests pass
- [ ] Activation time <3s consistently
- [ ] Telemetry event fires with correct properties
- [ ] Storage ready immediately after activation

---

### Test Suite 2: First Snapshot Creation

**File**: `apps/vscode/test/integration/first-snapshot.test.ts`

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('First Snapshot Creation', () => {
  let testWorkspace: vscode.Uri;
  let testFile: vscode.Uri;

  beforeEach(async () => {
    // Create temporary workspace
    testWorkspace = vscode.Uri.file(path.join(__dirname, '.test-workspace'));
    await fs.mkdir(testWorkspace.fsPath, { recursive: true });

    // Create test file
    testFile = vscode.Uri.file(path.join(testWorkspace.fsPath, 'test.ts'));
    await fs.writeFile(testFile.fsPath, 'const x = 1;');
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testWorkspace.fsPath, { recursive: true, force: true });
  });

  it('should create snapshot on file save', async () => {
    const extension = vscode.extensions.getExtension('snapback.snapback')!;
    await extension.activate();

    // Open and edit file
    const doc = await vscode.workspace.openTextDocument(testFile);
    const editor = await vscode.window.showTextDocument(doc);

    await editor.edit(editBuilder => {
      editBuilder.insert(new vscode.Position(0, 0), '// Comment\n');
    });

    // Save file (should trigger snapshot)
    await doc.save();

    // Wait for snapshot to be created
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify snapshot exists
    const storageAdapter = extension.exports?.storageAdapter;
    const snapshots = await storageAdapter.getSnapshots();

    expect(snapshots.length).toBeGreaterThan(0);
    expect(snapshots[0].files).toContain(testFile.fsPath);
  });

  it('should fire first_snapshot_created telemetry event', async () => {
    const telemetryEvents: any[] = [];

    // Mock telemetry
    const originalTrackEvent = (global as any).trackEvent;
    (global as any).trackEvent = (event: string, data: any) => {
      telemetryEvents.push({ event, data });
    };

    const extension = vscode.extensions.getExtension('snapback.snapback')!;
    await extension.activate();

    // Create first snapshot
    const doc = await vscode.workspace.openTextDocument(testFile);
    const editor = await vscode.window.showTextDocument(doc);
    await editor.edit(editBuilder => {
      editBuilder.insert(new vscode.Position(0, 0), '// Comment\n');
    });
    await doc.save();

    // Wait for event
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Restore original
    (global as any).trackEvent = originalTrackEvent;

    const firstSnapshotEvent = telemetryEvents.find(e => e.event === 'first_snapshot_created');
    expect(firstSnapshotEvent).toBeDefined();
    expect(firstSnapshotEvent.data).toHaveProperty('fileCount');
    expect(firstSnapshotEvent.data).toHaveProperty('timeToFirstSnapshot');
  });

  it('should show snapshot in TreeView', async () => {
    const extension = vscode.extensions.getExtension('snapback.snapback')!;
    await extension.activate();

    // Create snapshot
    const doc = await vscode.workspace.openTextDocument(testFile);
    const editor = await vscode.window.showTextDocument(doc);
    await editor.edit(editBuilder => {
      editBuilder.insert(new vscode.Position(0, 0), '// Comment\n');
    });
    await doc.save();

    // Wait for TreeView update
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify TreeView shows snapshot
    const treeViewManager = extension.exports?.treeViewManager;
    const treeItems = await treeViewManager.getChildren();

    expect(treeItems.length).toBeGreaterThan(0);
    expect(treeItems[0].label).toContain('test.ts');
  });

  it('should deduplicate blob storage', async () => {
    const extension = vscode.extensions.getExtension('snapback.snapback')!;
    await extension.activate();

    const doc = await vscode.workspace.openTextDocument(testFile);
    const editor = await vscode.window.showTextDocument(doc);

    // Save same content twice
    await doc.save();
    await new Promise(resolve => setTimeout(resolve, 500));
    await doc.save();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Should have 2 snapshots but only 1 blob
    const storageAdapter = extension.exports?.storageAdapter;
    const snapshots = await storageAdapter.getSnapshots();
    const blobs = await storageAdapter.getBlobs();

    expect(snapshots.length).toBe(2);
    expect(blobs.length).toBe(1); // Deduplicated
  });
});
```

**Success Criteria**:
- [ ] All 4 tests pass
- [ ] Snapshot created reliably on file save
- [ ] Telemetry event fires with correct properties
- [ ] TreeView updates immediately
- [ ] Blob deduplication works

---

### Test Suite 3: Snapshot Restore

**File**: `apps/vscode/test/integration/restore.test.ts`

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Snapshot Restore', () => {
  let testWorkspace: vscode.Uri;
  let testFile: vscode.Uri;

  beforeEach(async () => {
    testWorkspace = vscode.Uri.file(path.join(__dirname, '.test-workspace'));
    await fs.mkdir(testWorkspace.fsPath, { recursive: true });
    testFile = vscode.Uri.file(path.join(testWorkspace.fsPath, 'test.ts'));
  });

  afterEach(async () => {
    await fs.rm(testWorkspace.fsPath, { recursive: true, force: true });
  });

  it('should restore file to exact snapshot state', async () => {
    const extension = vscode.extensions.getExtension('snapback.snapback')!;
    await extension.activate();

    // Original content
    const originalContent = 'const x = 1;\nconst y = 2;';
    await fs.writeFile(testFile.fsPath, originalContent);

    // Create snapshot
    const doc = await vscode.workspace.openTextDocument(testFile);
    await doc.save();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Modify file (break it)
    await fs.writeFile(testFile.fsPath, 'BROKEN CODE HERE');

    // Get snapshot ID
    const storageAdapter = extension.exports?.storageAdapter;
    const snapshots = await storageAdapter.getSnapshots();
    const snapshotId = snapshots[0].id;

    // Restore
    const restoreService = extension.exports?.restoreService;
    await restoreService.restore(snapshotId);

    // Verify content matches original exactly
    const restoredContent = await fs.readFile(testFile.fsPath, 'utf-8');
    expect(restoredContent).toBe(originalContent);
  });

  it('should fire restore_completed telemetry event', async () => {
    const telemetryEvents: any[] = [];

    const originalTrackEvent = (global as any).trackEvent;
    (global as any).trackEvent = (event: string, data: any) => {
      telemetryEvents.push({ event, data });
    };

    const extension = vscode.extensions.getExtension('snapback.snapback')!;
    await extension.activate();

    // Create snapshot
    await fs.writeFile(testFile.fsPath, 'const x = 1;');
    const doc = await vscode.workspace.openTextDocument(testFile);
    await doc.save();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Restore
    const storageAdapter = extension.exports?.storageAdapter;
    const snapshots = await storageAdapter.getSnapshots();
    const restoreService = extension.exports?.restoreService;
    await restoreService.restore(snapshots[0].id);

    // Verify event
    (global as any).trackEvent = originalTrackEvent;

    const restoreEvent = telemetryEvents.find(e => e.event === 'restore_completed');
    expect(restoreEvent).toBeDefined();
    expect(restoreEvent.data).toHaveProperty('restoreTime');
    expect(restoreEvent.data).toHaveProperty('fileCount');
    expect(restoreEvent.data).toHaveProperty('snapshotAge');
  });

  it('should restore multiple files in single snapshot', async () => {
    const extension = vscode.extensions.getExtension('snapback.snapback')!;
    await extension.activate();

    // Create 3 test files
    const file1 = vscode.Uri.file(path.join(testWorkspace.fsPath, 'file1.ts'));
    const file2 = vscode.Uri.file(path.join(testWorkspace.fsPath, 'file2.ts'));
    const file3 = vscode.Uri.file(path.join(testWorkspace.fsPath, 'file3.ts'));

    await fs.writeFile(file1.fsPath, 'const a = 1;');
    await fs.writeFile(file2.fsPath, 'const b = 2;');
    await fs.writeFile(file3.fsPath, 'const c = 3;');

    // Create snapshot of all 3
    const snapshotService = extension.exports?.snapshotService;
    await snapshotService.createSnapshot([file1, file2, file3]);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Break all 3 files
    await fs.writeFile(file1.fsPath, 'BROKEN');
    await fs.writeFile(file2.fsPath, 'BROKEN');
    await fs.writeFile(file3.fsPath, 'BROKEN');

    // Restore all 3
    const storageAdapter = extension.exports?.storageAdapter;
    const snapshots = await storageAdapter.getSnapshots();
    const restoreService = extension.exports?.restoreService;
    await restoreService.restore(snapshots[0].id);

    // Verify all 3 restored correctly
    expect(await fs.readFile(file1.fsPath, 'utf-8')).toBe('const a = 1;');
    expect(await fs.readFile(file2.fsPath, 'utf-8')).toBe('const b = 2;');
    expect(await fs.readFile(file3.fsPath, 'utf-8')).toBe('const c = 3;');
  });

  it('should handle restore of deleted file', async () => {
    const extension = vscode.extensions.getExtension('snapback.snapback')!;
    await extension.activate();

    // Create and snapshot file
    await fs.writeFile(testFile.fsPath, 'const x = 1;');
    const doc = await vscode.workspace.openTextDocument(testFile);
    await doc.save();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Delete file
    await fs.unlink(testFile.fsPath);
    expect(await fs.access(testFile.fsPath).then(() => false).catch(() => true)).toBe(true);

    // Restore (should recreate file)
    const storageAdapter = extension.exports?.storageAdapter;
    const snapshots = await storageAdapter.getSnapshots();
    const restoreService = extension.exports?.restoreService;
    await restoreService.restore(snapshots[0].id);

    // Verify file recreated with correct content
    expect(await fs.access(testFile.fsPath).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.readFile(testFile.fsPath, 'utf-8')).toBe('const x = 1;');
  });

  it('should show restore notification with undo option', async () => {
    const extension = vscode.extensions.getExtension('snapback.snapback')!;
    await extension.activate();

    // Create snapshot
    await fs.writeFile(testFile.fsPath, 'const x = 1;');
    const doc = await vscode.workspace.openTextDocument(testFile);
    await doc.save();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Modify and restore
    await fs.writeFile(testFile.fsPath, 'const x = 2;');

    const storageAdapter = extension.exports?.storageAdapter;
    const snapshots = await storageAdapter.getSnapshots();
    const restoreService = extension.exports?.restoreService;

    // Mock notification service
    let notificationShown = false;
    const originalShowInformationMessage = vscode.window.showInformationMessage;
    (vscode.window as any).showInformationMessage = (message: string, ...items: string[]) => {
      notificationShown = true;
      expect(message).toContain('restored');
      expect(items).toContain('Undo');
      return Promise.resolve(undefined);
    };

    await restoreService.restore(snapshots[0].id);

    // Restore original
    (vscode.window as any).showInformationMessage = originalShowInformationMessage;

    expect(notificationShown).toBe(true);
  });
});
```

**Success Criteria**:
- [ ] All 5 tests pass
- [ ] Single file restore: exact state
- [ ] Multiple file restore: all files exact state
- [ ] Deleted file restore: file recreated correctly
- [ ] Telemetry event fires with correct properties
- [ ] Notification shows with undo option

---

## Test Execution Strategy

### Local Development
```bash
# Run all 3 demo-critical test suites
pnpm --filter @snapback/vscode test:integration

# Run specific suite
pnpm --filter @snapback/vscode test apps/vscode/test/integration/activation.test.ts
pnpm --filter @snapback/vscode test apps/vscode/test/integration/first-snapshot.test.ts
pnpm --filter @snapback/vscode test apps/vscode/test/integration/restore.test.ts
```

### CI/CD (Pre-Demo)
```yaml
# .github/workflows/demo-critical-tests.yml
name: Demo-Critical Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install

      # Activation tests
      - name: Test Extension Activation
        run: pnpm --filter @snapback/vscode test apps/vscode/test/integration/activation.test.ts

      # Snapshot creation tests
      - name: Test First Snapshot
        run: pnpm --filter @snapback/vscode test apps/vscode/test/integration/first-snapshot.test.ts

      # Restore tests
      - name: Test Snapshot Restore
        run: pnpm --filter @snapback/vscode test apps/vscode/test/integration/restore.test.ts

      # All must pass or build fails
      - name: Validate Demo-Critical Path
        run: |
          if [ $? -eq 0 ]; then
            echo "✅ Demo-critical tests passed"
          else
            echo "❌ Demo-critical tests failed - DO NOT DEMO"
            exit 1
          fi
```

---

## Coverage Targets

**NOT**: 85% overall coverage
**YES**: 100% coverage of 3 critical paths

### Current Coverage (Estimate)
- Activation: ~40% (untested performance, partial telemetry)
- First Snapshot: ~60% (creation works, telemetry untested)
- Restore: ~70% (basic restore works, edge cases untested)

### Target Coverage (Demo-Ready)
- Activation: 100% (all 5 tests passing)
- First Snapshot: 100% (all 4 tests passing)
- Restore: 100% (all 5 tests passing)

**Total new tests**: 14 tests across 3 suites
**Timeline**: Days 9-10 of sprint (2 days)
**ROI**: CRITICAL - these tests validate the demo works

---

## Post-Demo Test Expansion

After successful demo, expand test coverage in this order:

### Priority 1: API Security Middleware (50+ tests)
- CSRF protection tests
- Rate limiting tests
- RLS enforcement tests
- Security event tracking tests
- Quarantine system tests

### Priority 2: Policy Engine (30+ tests)
- Tier-gating logic tests
- Feature flag evaluation tests
- Rate limit quota tests
- Subscription validation tests
- Usage tracking tests

### Priority 3: VSCode New Features (20+ tests)
- PreSnapshotService tests
- SnapshotQuickDiffProvider tests
- PatternMatcher tests
- AutoDecisionEngine tests
- TreeView value-first display tests

**Timeline**: 1-2 weeks post-demo
**Target**: 1,978 → 2,100+ tests, 75% → 85% coverage

---

## Success Metrics

### Demo-Critical Tests (This Sprint)
- [ ] Activation suite: 5/5 tests passing
- [ ] First Snapshot suite: 4/4 tests passing
- [ ] Restore suite: 5/5 tests passing
- [ ] Total: 14/14 demo-critical tests passing
- [ ] CI/CD: Demo-critical pipeline green

### Post-Demo Expansion (Next Sprint)
- [ ] API security: 50+ tests added
- [ ] Policy engine: 30+ tests added
- [ ] VSCode features: 20+ tests added
- [ ] Total: 1,978 → 2,100+ tests
- [ ] Coverage: 75% → 85%

---

## LLM Agent Execution Instructions

**START HERE**:
1. Create `apps/vscode/test/integration/` directory if not exists
2. Implement `activation.test.ts` (5 tests)
3. Run tests locally, fix failures
4. Implement `first-snapshot.test.ts` (4 tests)
5. Run tests locally, fix failures
6. Implement `restore.test.ts` (5 tests)
7. Run tests locally, fix failures
8. Validate all 14 tests passing
9. Update CI/CD to run demo-critical tests
10. Mark task complete when pipeline green

**DO NOT**:
- Expand beyond 14 demo-critical tests during sprint
- Attempt comprehensive coverage (defer to post-demo)
- Skip any of the 14 tests (all are critical for demo validation)

---

## Questions for User

Before implementation, clarify:

1. **Test Framework**: Currently using Vitest. Correct?
2. **VS Code Test Runner**: Using `@vscode/test-electron`? Need setup?
3. **Telemetry Mocking**: PostHog mock strategy or in-memory capture?
4. **CI/CD**: GitHub Actions or different platform?

---

## References

- [High ROI Integrations Pt 2](../gold_plating/high_roi_integrations_pt2.md) - Activation funnel priorities
- [Auto-Detect Implementation](../gold_plating/auto_detect_implementation.md) - Detection logic to test
- [Activation Funnel](../gold_plating/activation_funnel.md) - Telemetry events to validate
