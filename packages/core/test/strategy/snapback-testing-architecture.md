# SnapBack Extension: Comprehensive Testing Architecture

## Executive Summary

This document outlines a **5-layer testing strategy** designed to provide substantial confidence for rapid feature development without bug introduction. The architecture supports both **development-time TDD** and **comprehensive pre-release validation**.

**Key Metrics:**
- **Target Coverage:** 90%+ (Unit), 85%+ (Integration), 100% (Critical Paths)
- **Test Execution Time:** < 30 seconds (unit), < 2 minutes (integration), < 5 minutes (E2E)
- **CI/CD Integration:** Automated on every PR, release candidate validation
- **Regression Prevention:** Snapshot testing, visual regression, contract testing

---

## Testing Pyramid Strategy

```
                  ┌─────────────────┐
                  │   E2E Tests     │  5% (50 tests)
                  │  (WebdriverIO)  │
                  └─────────────────┘
                 ┌───────────────────┐
                 │  Integration      │  15% (150 tests)
                 │  (@vscode/test)   │
                 └───────────────────┘
               ┌─────────────────────────┐
               │   Component Tests       │  25% (250 tests)
               │   (Vitest + Mocks)      │
               └─────────────────────────┘
          ┌────────────────────────────────┐
          │      Unit Tests                │  55% (550 tests)
          │      (Vitest)                  │
          └────────────────────────────────┘
```

---

## Layer 1: Unit Tests (55% Coverage - 550 Tests)

**Framework:** Vitest (fast, ESM-native, TypeScript-first)

**Scope:** Pure logic, utility functions, data transformations

### Test Categories

#### 1.1 Protection Level Logic
```typescript
// tests/unit/protection/protection-levels.test.ts
describe('ProtectionLevel', () => {
  describe('Watch Level', () => {
    test('allows save without notification', () => {
      const level = ProtectionLevel.Watch;
      expect(level.shouldNotify()).toBe(false);
      expect(level.shouldBlock()).toBe(false);
    });
    
    test('creates snapshot silently', async () => {
      const spy = vi.spyOn(SnapshotService, 'create');
      await level.handleSave(mockFile);
      expect(spy).toHaveBeenCalledOnce();
      expect(mockNotifications).toHaveLength(0);
    });
  });

  describe('Warn Level', () => {
    test('shows notification but allows save', async () => {
      const level = ProtectionLevel.Warn;
      const result = await level.handleSave(mockFile);
      expect(result.allowed).toBe(true);
      expect(mockNotifications).toContain('⚠️ Saving protected file');
    });

    test('includes file path in warning', async () => {
      await ProtectionLevel.Warn.handleSave(mockFile);
      expect(mockNotifications[0]).toContain(mockFile.path);
    });
  });

  describe('Block Level', () => {
    test('prevents save without confirmation', async () => {
      const result = await ProtectionLevel.Block.handleSave(mockFile);
      expect(result.allowed).toBe(false);
      expect(mockShowWarningMessage).toHaveBeenCalled();
    });

    test('allows save after user confirmation', async () => {
      mockShowWarningMessage.mockResolvedValue('Save Anyway');
      const result = await ProtectionLevel.Block.handleSave(mockFile);
      expect(result.allowed).toBe(true);
    });

    test('cancels save when user dismisses dialog', async () => {
      mockShowWarningMessage.mockResolvedValue(undefined);
      const result = await ProtectionLevel.Block.handleSave(mockFile);
      expect(result.allowed).toBe(false);
    });
  });
});
```

#### 1.2 Snapshot Storage Logic
```typescript
// tests/unit/storage/snapshot-storage.test.ts
describe('SnapshotStorage', () => {
  test('generates unique snapshot IDs', () => {
    const id1 = SnapshotStorage.generateId();
    const id2 = SnapshotStorage.generateId();
    expect(id1).not.toBe(id2);
  });

  test('compresses snapshot content', async () => {
    const largeContent = 'x'.repeat(10000);
    const compressed = await SnapshotStorage.compress(largeContent);
    expect(compressed.length).toBeLessThan(largeContent.length);
  });

  test('decompresses to original content', async () => {
    const original = 'test content';
    const compressed = await SnapshotStorage.compress(original);
    const decompressed = await SnapshotStorage.decompress(compressed);
    expect(decompressed).toBe(original);
  });

  test('handles binary files correctly', async () => {
    const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF]);
    const snapshot = await SnapshotStorage.save({ data: binaryData });
    const restored = await SnapshotStorage.load(snapshot.id);
    expect(restored.data).toEqual(binaryData);
  });
});
```

#### 1.3 File Pattern Matching
```typescript
// tests/unit/patterns/file-matcher.test.ts
describe('FileMatcher', () => {
  test('matches .snapbackrc configuration', () => {
    expect(FileMatcher.isConfigFile('.snapbackrc')).toBe(true);
    expect(FileMatcher.isConfigFile('subfolder/.snapbackrc')).toBe(true);
  });

  test('ignores node_modules', () => {
    expect(FileMatcher.shouldIgnore('node_modules/package/file.js')).toBe(true);
  });

  test('respects custom ignore patterns', () => {
    const matcher = new FileMatcher(['.next/**', 'dist/**']);
    expect(matcher.shouldIgnore('.next/cache/file.js')).toBe(true);
  });

  test('handles glob patterns correctly', () => {
    const matcher = new FileMatcher(['**/*.test.ts']);
    expect(matcher.shouldIgnore('src/component.test.ts')).toBe(true);
    expect(matcher.shouldIgnore('src/component.ts')).toBe(false);
  });
});
```

#### 1.4 Configuration Parser
```typescript
// tests/unit/config/config-parser.test.ts
describe('ConfigParser', () => {
  test('parses valid .snapbackrc', () => {
    const config = ConfigParser.parse(`{
      "protected": {
        "src/critical.ts": "block",
        "src/important.ts": "warn"
      }
    }`);
    expect(config.protected['src/critical.ts']).toBe('block');
  });

  test('throws on invalid JSON', () => {
    expect(() => ConfigParser.parse('invalid')).toThrow('Invalid JSON');
  });

  test('validates protection levels', () => {
    expect(() => ConfigParser.parse(`{
      "protected": { "file.ts": "invalid" }
    }`)).toThrow('Invalid protection level');
  });

  test('handles missing optional fields', () => {
    const config = ConfigParser.parse('{}');
    expect(config.protected).toEqual({});
    expect(config.ignore).toEqual([]);
  });
});
```

---

## Layer 2: Component Tests (25% Coverage - 250 Tests)

**Framework:** Vitest with VS Code API mocks

**Scope:** Individual classes and services with mocked dependencies

### Test Categories

#### 2.1 Protected File Registry
```typescript
// tests/component/registry/protected-file-registry.test.ts
describe('ProtectedFileRegistry', () => {
  let registry: ProtectedFileRegistry;
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
    registry = new ProtectedFileRegistry(mockStorage);
  });

  test('adds file with protection level', async () => {
    await registry.add('src/app.ts', ProtectionLevel.Warn);
    expect(registry.get('src/app.ts')).toBe(ProtectionLevel.Warn);
  });

  test('persists to storage on add', async () => {
    await registry.add('file.ts', ProtectionLevel.Block);
    expect(mockStorage.write).toHaveBeenCalledWith(
      expect.objectContaining({ 'file.ts': 'block' })
    );
  });

  test('removes file protection', async () => {
    await registry.add('file.ts', ProtectionLevel.Warn);
    await registry.remove('file.ts');
    expect(registry.get('file.ts')).toBeUndefined();
  });

  test('loads existing protections on initialization', async () => {
    mockStorage.read.mockResolvedValue({
      'existing.ts': 'block'
    });
    
    const newRegistry = new ProtectedFileRegistry(mockStorage);
    await newRegistry.initialize();
    
    expect(newRegistry.get('existing.ts')).toBe(ProtectionLevel.Block);
  });

  test('handles corrupted storage gracefully', async () => {
    mockStorage.read.mockRejectedValue(new Error('Corrupted'));
    const newRegistry = new ProtectedFileRegistry(mockStorage);
    await expect(newRegistry.initialize()).resolves.not.toThrow();
  });

  test('provides O(1) lookup performance', () => {
    // Add 10,000 files
    for (let i = 0; i < 10000; i++) {
      registry.add(`file${i}.ts`, ProtectionLevel.Watch);
    }
    
    const start = performance.now();
    registry.get('file5000.ts');
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(1); // < 1ms lookup
  });
});
```

#### 2.2 Snapshot Coordinator
```typescript
// tests/component/snapshot/snapshot-coordinator.test.ts
describe('SnapshotCoordinator', () => {
  let coordinator: SnapshotCoordinator;
  let mockStorage: MockSnapshotStorage;
  let mockDeduplicator: MockDeduplicator;

  beforeEach(() => {
    mockStorage = new MockSnapshotStorage();
    mockDeduplicator = new MockDeduplicator();
    coordinator = new SnapshotCoordinator(mockStorage, mockDeduplicator);
  });

  test('creates snapshot before save', async () => {
    const file = { uri: 'file.ts', content: 'code' };
    await coordinator.beforeSave(file);
    
    expect(mockStorage.save).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'code' })
    );
  });

  test('skips duplicate snapshots', async () => {
    mockDeduplicator.isDuplicate.mockReturnValue(true);
    
    await coordinator.beforeSave({ uri: 'file.ts', content: 'same' });
    await coordinator.beforeSave({ uri: 'file.ts', content: 'same' });
    
    expect(mockStorage.save).toHaveBeenCalledTimes(1);
  });

  test('creates snapshot for each unique change', async () => {
    mockDeduplicator.isDuplicate.mockReturnValue(false);
    
    await coordinator.beforeSave({ uri: 'file.ts', content: 'v1' });
    await coordinator.beforeSave({ uri: 'file.ts', content: 'v2' });
    
    expect(mockStorage.save).toHaveBeenCalledTimes(2);
  });

  test('emits snapshot-created event', async () => {
    const spy = vi.fn();
    coordinator.on('snapshot-created', spy);
    
    await coordinator.beforeSave({ uri: 'file.ts', content: 'code' });
    
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ uri: 'file.ts' })
    );
  });

  test('handles storage failures gracefully', async () => {
    mockStorage.save.mockRejectedValue(new Error('Disk full'));
    
    await expect(
      coordinator.beforeSave({ uri: 'file.ts', content: 'code' })
    ).resolves.not.toThrow();
  });
});
```

#### 2.3 Status Bar Manager
```typescript
// tests/component/ui/status-bar-manager.test.ts
describe('StatusBarManager', () => {
  let manager: StatusBarManager;
  let mockStatusBar: MockStatusBarItem;

  beforeEach(() => {
    mockStatusBar = createMockStatusBarItem();
    manager = new StatusBarManager(mockStatusBar);
  });

  test('updates protection count', () => {
    manager.updateProtectionCount(5);
    expect(mockStatusBar.text).toContain('5');
  });

  test('shows shield emoji when protected', () => {
    manager.setProtectionEnabled(true);
    expect(mockStatusBar.text).toContain('🛡️');
  });

  test('changes color on error state', () => {
    manager.setStatus('error', 'Failed to create snapshot');
    expect(mockStatusBar.backgroundColor).toBe('statusBarItem.errorBackground');
  });

  test('shows working indicator during operations', () => {
    manager.setStatus('working', 'Creating snapshot...');
    expect(mockStatusBar.text).toContain('$(sync~spin)');
  });

  test('updates tooltip with detailed info', () => {
    manager.updateProtectionCount(3);
    manager.updateSnapshotCount(10);
    expect(mockStatusBar.tooltip).toContain('3 protected files');
    expect(mockStatusBar.tooltip).toContain('10 snapshots');
  });
});
```

---

## Layer 3: Integration Tests (15% Coverage - 150 Tests)

**Framework:** `@vscode/test-electron` + Mocha

**Scope:** Real VS Code API interactions, file system operations, multi-component workflows

### Test Categories

#### 3.1 Extension Activation
```typescript
// tests/integration/extension/activation.test.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as assert from 'assert';

suite('Extension Activation', () => {
  test('extension activates successfully', async () => {
    const ext = vscode.extensions.getExtension('snapback.snapback');
    assert.ok(ext);
    await ext!.activate();
    assert.strictEqual(ext!.isActive, true);
  });

  test('registers all commands', async () => {
    const commands = await vscode.commands.getCommands();
    const snapbackCommands = commands.filter(cmd => cmd.startsWith('snapback.'));
    
    assert.ok(snapbackCommands.includes('snapback.protectFile'));
    assert.ok(snapbackCommands.includes('snapback.createSnapshot'));
    assert.ok(snapbackCommands.includes('snapback.restoreSnapshot'));
    assert.ok(snapbackCommands.includes('snapback.showProtectedFiles'));
  });

  test('creates status bar item', async () => {
    // Status bar items aren't directly accessible, but we can verify via commands
    const items = await vscode.commands.executeCommand('workbench.action.toggleStatusbar');
    // Verification through side effects
  });

  test('loads .snapbackrc configuration', async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const configPath = path.join(workspaceRoot, '.snapbackrc');
    
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(configPath),
      Buffer.from(JSON.stringify({
        protected: { 'test.ts': 'block' }
      }))
    );

    // Trigger configuration reload
    await vscode.commands.executeCommand('snapback.reloadConfig');

    // Verify protection level was applied
    const result = await vscode.commands.executeCommand(
      'snapback.getProtectionLevel',
      'test.ts'
    );
    assert.strictEqual(result, 'block');
  });
});
```

#### 3.2 File Protection Workflow
```typescript
// tests/integration/protection/file-protection.test.ts
suite('File Protection Workflow', () => {
  let testFile: vscode.Uri;
  let originalContent: string;

  setup(async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    testFile = vscode.Uri.file(path.join(workspaceRoot, 'test-file.ts'));
    originalContent = 'const x = 1;';
    
    await vscode.workspace.fs.writeFile(testFile, Buffer.from(originalContent));
  });

  teardown(async () => {
    await vscode.commands.executeCommand('snapback.unprotectFile', testFile.fsPath);
    await vscode.workspace.fs.delete(testFile);
  });

  test('protects file via context menu command', async () => {
    await vscode.commands.executeCommand(
      'snapback.protectFile',
      testFile,
      'warn'
    );

    const level = await vscode.commands.executeCommand(
      'snapback.getProtectionLevel',
      testFile.fsPath
    );
    
    assert.strictEqual(level, 'warn');
  });

  test('shows file decoration for protected files', async () => {
    await vscode.commands.executeCommand(
      'snapback.protectFile',
      testFile,
      'block'
    );

    // Wait for decorations to update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify decoration appears (this tests the FileDecorationProvider)
    const decorations = vscode.window.tabGroups.all
      .flatMap(group => group.tabs)
      .find(tab => (tab.input as any)?.uri?.fsPath === testFile.fsPath);
    
    assert.ok(decorations);
  });

  test('creates snapshot before saving protected file', async () => {
    await vscode.commands.executeCommand('snapback.protectFile', testFile, 'watch');

    // Open and modify the file
    const doc = await vscode.workspace.openTextDocument(testFile);
    const editor = await vscode.window.showTextDocument(doc);
    
    await editor.edit(editBuilder => {
      editBuilder.insert(new vscode.Position(0, 0), '// Modified\n');
    });

    // Save the file
    const snapshotCreatedPromise = new Promise(resolve => {
      vscode.commands.executeCommand('snapback.onSnapshotCreated', resolve);
    });

    await doc.save();
    await snapshotCreatedPromise;

    // Verify snapshot was created
    const snapshots = await vscode.commands.executeCommand(
      'snapback.listSnapshots',
      testFile.fsPath
    );
    
    assert.ok((snapshots as any[]).length > 0);
  });
});
```

#### 3.3 Snapshot Creation and Restoration
```typescript
// tests/integration/snapshot/snapshot-lifecycle.test.ts
suite('Snapshot Lifecycle', () => {
  test('creates manual snapshot via command', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: 'original content',
      language: 'typescript'
    });

    const snapshotId = await vscode.commands.executeCommand(
      'snapback.createSnapshot',
      doc.uri.fsPath
    );

    assert.ok(snapshotId);
  });

  test('restores file from snapshot', async () => {
    const testFile = vscode.Uri.file(
      path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, 'restore-test.ts')
    );

    const originalContent = 'const original = true;';
    const modifiedContent = 'const modified = true;';

    // Create file with original content
    await vscode.workspace.fs.writeFile(testFile, Buffer.from(originalContent));
    
    // Create snapshot
    const snapshotId = await vscode.commands.executeCommand(
      'snapback.createSnapshot',
      testFile.fsPath
    );

    // Modify file
    await vscode.workspace.fs.writeFile(testFile, Buffer.from(modifiedContent));

    // Restore from snapshot
    await vscode.commands.executeCommand('snapback.restoreSnapshot', snapshotId);

    // Verify restoration
    const restoredContent = await vscode.workspace.fs.readFile(testFile);
    assert.strictEqual(
      new TextDecoder().decode(restoredContent),
      originalContent
    );
  });

  test('shows diff view when restoring', async () => {
    const testFile = vscode.Uri.file(
      path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, 'diff-test.ts')
    );

    await vscode.workspace.fs.writeFile(testFile, Buffer.from('before'));
    const snapshotId = await vscode.commands.executeCommand(
      'snapback.createSnapshot',
      testFile.fsPath
    );

    await vscode.workspace.fs.writeFile(testFile, Buffer.from('after'));

    // Restore with diff preview
    await vscode.commands.executeCommand(
      'snapback.previewRestore',
      snapshotId
    );

    // Wait for diff editor to open
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify diff editor is active
    const activeEditor = vscode.window.activeTextEditor;
    assert.ok(activeEditor?.document.uri.scheme === 'snapback-diff');
  });
});
```

#### 3.4 TreeView Integration
```typescript
// tests/integration/ui/treeview.test.ts
suite('TreeView Integration', () => {
  test('shows protected files in explorer', async () => {
    const testFile = vscode.Uri.file(
      path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, 'protected.ts')
    );

    await vscode.workspace.fs.writeFile(testFile, Buffer.from('test'));
    await vscode.commands.executeCommand('snapback.protectFile', testFile, 'warn');

    // Get tree view items
    const treeView = await vscode.commands.executeCommand(
      'snapback.getProtectedFilesTreeView'
    );

    assert.ok(treeView);
    // Additional assertions on tree structure
  });

  test('shows snapshots grouped by file', async () => {
    // Create multiple snapshots
    const file1 = vscode.Uri.file('file1.ts');
    const file2 = vscode.Uri.file('file2.ts');

    await vscode.commands.executeCommand('snapback.createSnapshot', file1.fsPath);
    await vscode.commands.executeCommand('snapback.createSnapshot', file1.fsPath);
    await vscode.commands.executeCommand('snapback.createSnapshot', file2.fsPath);

    const treeView = await vscode.commands.executeCommand(
      'snapback.getSnapshotsTreeView'
    );

    // Verify tree structure: 2 file nodes, 3 snapshot children total
    // Detailed assertions here
  });

  test('updates tree view on protection changes', async () => {
    const testFile = vscode.Uri.file('dynamic.ts');

    // Initial state - no protected files
    let treeItems = await getTreeViewItems('snapback.protectedFiles');
    assert.strictEqual(treeItems.length, 0);

    // Add protection
    await vscode.commands.executeCommand('snapback.protectFile', testFile, 'block');
    await waitForTreeViewUpdate();

    treeItems = await getTreeViewItems('snapback.protectedFiles');
    assert.strictEqual(treeItems.length, 1);

    // Remove protection
    await vscode.commands.executeCommand('snapback.unprotectFile', testFile.fsPath);
    await waitForTreeViewUpdate();

    treeItems = await getTreeViewItems('snapback.protectedFiles');
    assert.strictEqual(treeItems.length, 0);
  });
});
```

---

## Layer 4: End-to-End Tests (5% Coverage - 50 Tests)

**Framework:** WebdriverIO with `wdio-vscode-service`

**Scope:** Complete user workflows, UI interactions, cross-feature integration

### Test Setup

```javascript
// tests/e2e/wdio.conf.ts
export const config: Options.Testrunner = {
  runner: 'local',
  specs: ['./tests/e2e/specs/**/*.test.ts'],
  capabilities: [{
    browserName: 'vscode',
    browserVersion: '1.85.0', // or 'stable', 'insiders'
    'wdio:vscodeOptions': {
      extensionPath: __dirname,
      userSettings: {
        'snapback.enabled': true,
        'snapback.autoSnapshot': true
      },
      workspacePath: path.join(__dirname, 'test-workspace')
    }
  }],
  services: ['vscode'],
  framework: 'mocha',
  mochaOpts: {
    timeout: 60000
  }
};
```

### Test Categories

#### 4.1 Complete Protection Workflow
```typescript
// tests/e2e/specs/protection-workflow.test.ts
describe('Complete Protection Workflow', () => {
  let workbench: Workbench;

  before(async () => {
    workbench = await browser.getWorkbench();
  });

  it('should protect a file and create automatic snapshots', async () => {
    // 1. Open file explorer
    const explorer = await workbench.getActivityBar().getViewControl('Explorer');
    await explorer?.openView();

    // 2. Right-click on a file
    const fileTree = await workbench.getSideBar().getContent().getSection('Files');
    const fileItem = await fileTree.findItem('src/app.ts');
    await fileItem.click({ button: 'right' });

    // 3. Select protection level from context menu
    const contextMenu = await workbench.getContextMenu();
    const protectOption = await contextMenu.getItem('🧢 SnapBack: Protect File');
    await protectOption?.select();

    // 4. Choose protection level
    const quickPick = await workbench.openCommandPrompt();
    await quickPick.selectQuickPick('👷 Warning - Notify on save');

    // 5. Verify file decoration appears
    await browser.waitUntil(async () => {
      const decoration = await fileItem.getTooltip();
      return decoration.includes('⚠️');
    }, { timeout: 5000, timeoutMsg: 'File decoration did not appear' });

    // 6. Edit the file
    const editorView = workbench.getEditorView();
    const editor = await editorView.openEditor('src/app.ts');
    const textEditor = await editor.getTextEditor();
    await textEditor.typeText('\n// New comment');

    // 7. Save and verify notification
    await workbench.executeCommand('File: Save');
    
    const notifications = await workbench.getNotifications();
    const warningNotification = await notifications.find(async (n) => {
      const message = await n.getMessage();
      return message.includes('⚠️ Saving protected file');
    });
    
    expect(warningNotification).toBeDefined();

    // 8. Verify snapshot was created
    await workbench.executeCommand('SnapBack: Show Snapshots');
    const snapshotsView = await workbench.getSideBar().getContent().getSection('Snapshots');
    const snapshotItems = await snapshotsView.getVisibleItems();
    
    expect(snapshotItems.length).toBeGreaterThan(0);
  });
});
```

#### 4.2 Snapshot Restoration with Diff
```typescript
// tests/e2e/specs/snapshot-restoration.test.ts
describe('Snapshot Restoration', () => {
  it('should restore file with diff preview', async () => {
    const workbench = await browser.getWorkbench();

    // 1. Create a file and snapshot
    await workbench.executeCommand('File: New File');
    const editor = await workbench.getEditorView().openEditor('Untitled-1');
    const textEditor = await editor.getTextEditor();
    await textEditor.setText('Original content\nLine 2\nLine 3');
    
    await workbench.executeCommand('File: Save As');
    await browser.keys(['test-restore.ts', 'Enter']);

    await workbench.executeCommand('SnapBack: Create Snapshot');
    await browser.pause(1000); // Wait for snapshot creation

    // 2. Modify the file
    await textEditor.setText('Modified content\nNew line 2\nLine 3');
    await workbench.executeCommand('File: Save');

    // 3. Open snapshots view
    await workbench.executeCommand('SnapBack: Show Snapshots');
    const snapshotsView = await workbench.getSideBar().getContent().getSection('Snapshots');
    const firstSnapshot = (await snapshotsView.getVisibleItems())[0];

    // 4. Right-click and preview restore
    await firstSnapshot.click({ button: 'right' });
    const contextMenu = await workbench.getContextMenu();
    await (await contextMenu.getItem('Preview Restore'))?.select();

    // 5. Verify diff editor opens
    await browser.waitUntil(async () => {
      const activeEditor = await workbench.getEditorView().getActiveTab();
      const title = await activeEditor?.getTitle();
      return title?.includes('↔');
    }, { timeout: 5000 });

    // 6. Verify diff content
    const diffEditor = await workbench.getEditorView().openEditor('test-restore.ts ↔ Snapshot');
    // Verify left side shows current, right side shows snapshot
    
    // 7. Confirm restore
    await workbench.executeCommand('SnapBack: Confirm Restore');
    await browser.pause(500);

    // 8. Verify file content restored
    const restoredEditor = await workbench.getEditorView().openEditor('test-restore.ts');
    const restoredText = await (await restoredEditor.getTextEditor()).getText();
    expect(restoredText).toBe('Original content\nLine 2\nLine 3');
  });
});
```

#### 4.3 Configuration-Based Protection
```typescript
// tests/e2e/specs/config-based-protection.test.ts
describe('Configuration-Based Protection', () => {
  it('should auto-protect files based on .snapbackrc', async () => {
    const workbench = await browser.getWorkbench();

    // 1. Create .snapbackrc
    await browser.executeWorkbench((vscode) => {
      const workspaceRoot = vscode.workspace.workspaceFolders![0].uri;
      const configUri = vscode.Uri.joinPath(workspaceRoot, '.snapbackrc');
      const config = {
        protected: {
          'src/config.ts': 'block',
          'src/**/*.env': 'warn',
          'package.json': 'block'
        },
        ignore: [
          'node_modules/**',
          '*.test.ts'
        ]
      };
      return vscode.workspace.fs.writeFile(
        configUri,
        Buffer.from(JSON.stringify(config, null, 2))
      );
    });

    // 2. Create files that match patterns
    await workbench.executeCommand('File: New File');
    await browser.keys(['src/config.ts', 'Enter']);
    
    await workbench.executeCommand('File: New File');
    await browser.keys(['src/.env', 'Enter']);

    // 3. Reload extension to pick up config
    await workbench.executeCommand('Developer: Reload Window');
    await browser.pause(2000);

    // 4. Verify protections applied
    const explorer = await workbench.getSideBar().getContent().getSection('Files');
    
    const configFile = await explorer.findItem('src/config.ts');
    const configTooltip = await configFile.getTooltip();
    expect(configTooltip).toContain('🔒'); // Block emoji

    const envFile = await explorer.findItem('src/.env');
    const envTooltip = await envFile.getTooltip();
    expect(envTooltip).toContain('⚠️'); // Warn emoji

    // 5. Test that block-protected file prevents save
    await workbench.getEditorView().openEditor('src/config.ts');
    const editor = await workbench.getActiveTextEditor();
    await editor.typeText('const test = 1;');
    
    await workbench.executeCommand('File: Save');
    
    // Should show blocking modal
    const modal = await workbench.getNotifications().find(async (n) => {
      const message = await n.getMessage();
      return message.includes('This file is protected');
    });
    
    expect(modal).toBeDefined();
  });
});
```

#### 4.4 Multi-File Operations
```typescript
// tests/e2e/specs/multi-file-operations.test.ts
describe('Multi-File Operations', () => {
  it('should protect multiple files simultaneously', async () => {
    const workbench = await browser.getWorkbench();

    // 1. Select multiple files
    const explorer = await workbench.getSideBar().getContent().getSection('Files');
    
    // Hold Cmd/Ctrl and click files
    await browser.keys(['Control']); // or 'Command' on Mac
    await (await explorer.findItem('file1.ts')).click();
    await (await explorer.findItem('file2.ts')).click();
    await (await explorer.findItem('file3.ts')).click();
    await browser.keys(['Control']); // Release key

    // 2. Right-click and protect
    await (await explorer.findItem('file1.ts')).click({ button: 'right' });
    const contextMenu = await workbench.getContextMenu();
    await (await contextMenu.getItem('🧢 SnapBack: Protect Selected Files'))?.select();

    // 3. Choose protection level
    const quickPick = await workbench.openCommandPrompt();
    await quickPick.selectQuickPick('👷 Warning');

    // 4. Verify all files have decoration
    for (const fileName of ['file1.ts', 'file2.ts', 'file3.ts']) {
      const file = await explorer.findItem(fileName);
      const tooltip = await file.getTooltip();
      expect(tooltip).toContain('⚠️');
    }

    // 5. Verify protected files view shows all
    await workbench.executeCommand('SnapBack: Show Protected Files');
    const protectedView = await workbench.getSideBar().getContent().getSection('Protected Files');
    const items = await protectedView.getVisibleItems();
    
    expect(items.length).toBe(3);
  });
});
```

---

## Layer 5: Specialized Testing

### 5.1 Visual Regression Testing

**Tool:** `@playwright/test` with screenshot comparison

```typescript
// tests/visual/status-bar.visual.test.ts
import { test, expect } from '@playwright/test';

test.describe('Status Bar Visual Regression', () => {
  test('should match baseline when protection enabled', async ({ page }) => {
    await page.goto('vscode://');
    
    // Ensure extension is active
    await page.waitForSelector('[aria-label*="SnapBack"]');
    
    // Take screenshot of status bar area
    const statusBar = await page.locator('.statusbar');
    await expect(statusBar).toHaveScreenshot('status-bar-active.png', {
      maxDiffPixels: 100
    });
  });

  test('should show error state correctly', async ({ page }) => {
    await page.goto('vscode://');
    
    // Trigger error state
    await page.evaluate(() => {
      vscode.commands.executeCommand('snapback.simulateError');
    });

    const statusBar = await page.locator('.statusbar');
    await expect(statusBar).toHaveScreenshot('status-bar-error.png');
  });
});
```

### 5.2 Performance Testing

```typescript
// tests/performance/snapshot-creation.perf.test.ts
import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
  test('snapshot creation should complete in < 50ms', async () => {
    const iterations = 100;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await coordinator.createSnapshot(mockFile);
      times.push(performance.now() - start);
    }

    const avg = times.reduce((a, b) => a + b) / times.length;
    const p95 = times.sort()[Math.floor(times.length * 0.95)];

    expect(avg).toBeLessThan(50);
    expect(p95).toBeLessThan(100);
  });

  test('should handle 1000 protected files without slowdown', async () => {
    // Add 1000 files
    for (let i = 0; i < 1000; i++) {
      await registry.add(`file${i}.ts`, ProtectionLevel.Watch);
    }

    // Measure lookup performance
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      registry.get(`file${Math.floor(Math.random() * 1000)}.ts`);
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10); // 10ms for 1000 lookups = 0.01ms each
  });
});
```

### 5.3 Snapshot Testing (UI State)

```typescript
// tests/snapshot/treeview-structure.snapshot.test.ts
import { toMatchSnapshot } from 'jest-snapshot';

expect.extend({ toMatchSnapshot });

describe('TreeView Structure Snapshots', () => {
  test('protected files tree matches snapshot', async () => {
    await registry.add('file1.ts', ProtectionLevel.Block);
    await registry.add('dir/file2.ts', ProtectionLevel.Warn);
    
    const treeStructure = await treeProvider.getTreeStructure();
    
    expect(treeStructure).toMatchSnapshot();
  });

  test('snapshots tree matches snapshot with time formatting', async () => {
    // Create snapshots at known times
    const mockDate = new Date('2025-01-01T12:00:00Z');
    vi.setSystemTime(mockDate);

    await coordinator.createSnapshot(mockFile1);
    await coordinator.createSnapshot(mockFile2);

    const treeStructure = await snapshotTreeProvider.getTreeStructure();
    
    expect(treeStructure).toMatchSnapshot();
  });
});
```

---

## Testing Infrastructure

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Comprehensive Test Suite

on: [push, pull_request]

jobs:
  unit-and-component:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run component tests
        run: npm run test:component
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  integration:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        vscode-version: ['1.85.0', 'stable', 'insiders']
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          VSCODE_VERSION: ${{ matrix.vscode-version }}

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-screenshots
          path: tests/e2e/screenshots/

  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - name: Run performance tests
        run: npm run test:performance
      
      - name: Benchmark comparison
        run: npm run test:benchmark
      
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = fs.readFileSync('benchmark-results.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Performance Benchmark Results\n\`\`\`\n${results}\n\`\`\``
            });
```

### Test Configuration

```json
// package.json scripts
{
  "scripts": {
    "test": "npm run test:all",
    "test:all": "npm run test:unit && npm run test:component && npm run test:integration && npm run test:e2e",
    "test:unit": "vitest run tests/unit",
    "test:component": "vitest run tests/component",
    "test:integration": "node ./tests/integration/runTests.js",
    "test:e2e": "wdio run ./tests/e2e/wdio.conf.ts",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:performance": "vitest run tests/performance",
    "test:visual": "playwright test tests/visual",
    "test:ci": "vitest run --reporter=junit --reporter=default",
    "test:debug": "vitest --inspect-brk --single-thread"
  }
}
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'tests/**',
        '**/*.test.ts',
        '**/mocks/**',
        'dist/**'
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      }
    },
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000
  }
});
```

---

## Test Utilities and Helpers

### Mock Factory

```typescript
// tests/utils/mock-factory.ts
export class MockFactory {
  static createMockTextDocument(options: {
    uri?: string;
    content?: string;
    languageId?: string;
  } = {}): vscode.TextDocument {
    return {
      uri: vscode.Uri.file(options.uri || 'test.ts'),
      fileName: options.uri || 'test.ts',
      languageId: options.languageId || 'typescript',
      version: 1,
      isDirty: false,
      isClosed: false,
      getText: () => options.content || '',
      lineAt: (line: number) => ({
        text: options.content?.split('\n')[line] || '',
        lineNumber: line
      }),
      // ... other methods
    } as any;
  }

  static createMockFileSystemProvider(): vscode.FileSystemProvider {
    const files = new Map<string, Uint8Array>();
    
    return {
      stat: vi.fn(async (uri) => ({
        type: vscode.FileType.File,
        size: files.get(uri.toString())?.length || 0,
        ctime: Date.now(),
        mtime: Date.now()
      })),
      readFile: vi.fn(async (uri) => {
        const content = files.get(uri.toString());
        if (!content) throw new Error('File not found');
        return content;
      }),
      writeFile: vi.fn(async (uri, content) => {
        files.set(uri.toString(), content);
      }),
      delete: vi.fn(async (uri) => {
        files.delete(uri.toString());
      }),
      // ... other methods
    };
  }

  static createMockWorkspace(files: Record<string, string> = {}) {
    return {
      workspaceFolders: [{
        uri: vscode.Uri.file('/workspace'),
        name: 'test-workspace',
        index: 0
      }],
      fs: this.createMockFileSystemProvider(),
      openTextDocument: vi.fn(async (uri) => {
        return this.createMockTextDocument({
          uri: uri.toString(),
          content: files[uri.toString()]
        });
      })
    };
  }
}
```

### Test Data Builders

```typescript
// tests/utils/test-data-builders.ts
export class SnapshotBuilder {
  private id: string = 'test-snapshot-id';
  private uri: string = 'test.ts';
  private content: string = 'test content';
  private timestamp: Date = new Date();

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withUri(uri: string): this {
    this.uri = uri;
    return this;
  }

  withContent(content: string): this {
    this.content = content;
    return this;
  }

  createdAt(date: Date): this {
    this.timestamp = date;
    return this;
  }

  build(): Snapshot {
    return {
      id: this.id,
      uri: this.uri,
      content: this.content,
      createdAt: this.timestamp,
      hash: createHash('sha256').update(this.content).digest('hex')
    };
  }
}

// Usage
const snapshot = new SnapshotBuilder()
  .withUri('src/critical.ts')
  .withContent('const x = 1;')
  .createdAt(new Date('2025-01-01'))
  .build();
```

---

## Test Coverage Goals

### Coverage Thresholds

| Layer | Lines | Functions | Branches | Statements |
|-------|-------|-----------|----------|------------|
| Unit | 95% | 95% | 90% | 95% |
| Component | 90% | 90% | 85% | 90% |
| Integration | 80% | 80% | 75% | 80% |
| **Overall** | **90%** | **90%** | **85%** | **90%** |

### Critical Path Requirements

**100% coverage required for:**
- File save interception
- Protection level enforcement
- Snapshot creation/restoration
- Configuration parsing
- Data persistence

---

## Continuous Testing Strategy

### Pre-Commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run fast unit tests only
npm run test:unit -- --run --bail

# Type checking
npm run type-check

# Linting
npm run lint
```

### Pre-Push Hooks

```bash
# .husky/pre-push
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run unit + component tests
npm run test:unit
npm run test:component
```

### Pull Request Checks

```markdown
## PR Testing Checklist

- [ ] All unit tests passing
- [ ] All component tests passing
- [ ] Integration tests passing on all platforms
- [ ] E2E tests passing
- [ ] Coverage thresholds met (90%+ overall)
- [ ] No performance regressions
- [ ] Visual regression tests passing (if UI changed)
- [ ] Manual testing completed for new features
```

---

## Debugging Tests

### VS Code Launch Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Unit Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test:debug"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug Current Test File",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "${file}"],
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Integration Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/tests/integration"
      ],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

---

## Next Steps

### Implementation Phases

**Phase 1: Foundation (Week 1-2)**
- [ ] Set up Vitest with coverage
- [ ] Create mock factory and test utilities
- [ ] Write first 100 unit tests for core logic
- [ ] Set up CI pipeline

**Phase 2: Component Testing (Week 3-4)**
- [ ] Mock VS Code API completely
- [ ] Test all major components in isolation
- [ ] Achieve 90% component coverage

**Phase 3: Integration Testing (Week 5-6)**
- [ ] Set up `@vscode/test-electron`
- [ ] Write tests for real VS Code API interactions
- [ ] Test across multiple VS Code versions

**Phase 4: E2E Testing (Week 7-8)**
- [ ] Set up WebdriverIO
- [ ] Write complete user workflow tests
- [ ] Add visual regression testing

**Phase 5: Optimization (Week 9-10)**
- [ ] Performance testing and benchmarking
- [ ] Flaky test resolution
- [ ] Documentation and training

---

## Summary

This architecture provides:

✅ **Comprehensive Coverage:** 90%+ across all code paths  
✅ **Fast Feedback:** Unit tests run in < 30 seconds  
✅ **Confidence:** E2E tests validate real user workflows  
✅ **Regression Prevention:** Snapshot and visual testing  
✅ **CI/CD Ready:** Automated testing on every commit  
✅ **Debugging Support:** Rich debugging configurations  
✅ **Maintainable:** Clear separation of concerns, reusable mocks

**Total Test Count: 1000+ tests ensuring production-grade quality**

Ready to start implementation? I can help you build any layer of this architecture in detail!
