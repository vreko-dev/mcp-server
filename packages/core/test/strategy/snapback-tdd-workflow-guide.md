# TDD Workflow for Rapid SnapBack Feature Development

## Philosophy: Red-Green-Refactor with Confidence

This guide provides practical TDD workflows for adding new features to SnapBack while maintaining the comprehensive test coverage that prevents regressions.

---

## Core TDD Cycle

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  RED → Write failing test                      │
│   ↓                                             │
│  GREEN → Make it pass (quickly)                │
│   ↓                                             │
│  REFACTOR → Clean up code                      │
│   ↓                                             │
│  COMMIT → Save working state                   │
│   ↓                                             │
│  [Repeat]                                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Workflow 1: Adding a New Protection Level

**Feature: Add "Pause" Protection Level**
*Temporarily disables protection without removing it*

### Step 1: RED - Write the failing test first

```typescript
// tests/unit/protection/protection-level.test.ts
describe('ProtectionLevel.Pause', () => {
  test('should exist as a valid protection level', () => {
    expect(ProtectionLevel.Pause).toBeDefined();
  });

  test('should not show notifications', () => {
    expect(ProtectionLevel.Pause.shouldNotify()).toBe(false);
  });

  test('should not block saves', () => {
    expect(ProtectionLevel.Pause.shouldBlock()).toBe(false);
  });

  test('should not create snapshots', async () => {
    const mockFile = MockFactory.createMockDocument();
    const result = await ProtectionLevel.Pause.handleSave(mockFile);
    
    expect(result.snapshotCreated).toBe(false);
  });

  test('should show "paused" indicator in status', () => {
    expect(ProtectionLevel.Pause.getStatusIcon()).toBe('⏸️');
  });
});
```

**Run test:** `npm run test:watch`
**Expected:** ❌ All tests fail (Pause doesn't exist)

### Step 2: GREEN - Implement minimum code to pass

```typescript
// src/protection/protection-level.ts
export enum ProtectionLevel {
  Watch = 'watch',
  Warn = 'warn',
  Block = 'block',
  Pause = 'pause'  // ← Add this
}

export class ProtectionLevelHandler {
  static Pause = {
    shouldNotify: () => false,
    shouldBlock: () => false,
    handleSave: async () => ({
      allowed: true,
      snapshotCreated: false,
      notificationShown: false
    }),
    getStatusIcon: () => '⏸️'
  };
}
```

**Run test:** `npm run test:watch`
**Expected:** ✅ All tests pass

### Step 3: REFACTOR - Add integration

```typescript
// src/protection/protection-registry.ts
export class ProtectedFileRegistry {
  async pause(uri: string): Promise<void> {
    const currentLevel = this.get(uri);
    if (!currentLevel) {
      throw new Error('File is not protected');
    }
    
    // Store current level for resume
    await this.stateStorage.set(`paused:${uri}`, currentLevel);
    await this.update(uri, ProtectionLevel.Pause);
    
    this.emit('paused', { uri, previousLevel: currentLevel });
  }

  async resume(uri: string): Promise<void> {
    const previousLevel = await this.stateStorage.get(`paused:${uri}`);
    if (!previousLevel) {
      throw new Error('File was not paused');
    }
    
    await this.update(uri, previousLevel);
    await this.stateStorage.delete(`paused:${uri}`);
    
    this.emit('resumed', { uri, level: previousLevel });
  }
}
```

### Step 4: Add component tests

```typescript
// tests/component/registry/pause-resume.test.ts
describe('Protection Pause/Resume', () => {
  let registry: ProtectedFileRegistry;
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = MockFactory.createMockStorage();
    registry = new ProtectedFileRegistry(mockStorage);
  });

  test('should pause protected file', async () => {
    await registry.add('file.ts', ProtectionLevel.Warn);
    await registry.pause('file.ts');
    
    expect(registry.get('file.ts')).toBe(ProtectionLevel.Pause);
  });

  test('should remember original level', async () => {
    await registry.add('file.ts', ProtectionLevel.Block);
    await registry.pause('file.ts');
    
    const stored = await mockStorage.get('paused:file.ts');
    expect(stored).toBe(ProtectionLevel.Block);
  });

  test('should resume to original level', async () => {
    await registry.add('file.ts', ProtectionLevel.Warn);
    await registry.pause('file.ts');
    await registry.resume('file.ts');
    
    expect(registry.get('file.ts')).toBe(ProtectionLevel.Warn);
  });

  test('should emit pause event', async () => {
    const spy = vi.fn();
    registry.onDidChange(spy);
    
    await registry.add('file.ts', ProtectionLevel.Block);
    await registry.pause('file.ts');
    
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'paused',
        previousLevel: ProtectionLevel.Block
      })
    );
  });

  test('should throw if file not protected', async () => {
    await expect(registry.pause('nonexistent.ts')).rejects.toThrow(
      'File is not protected'
    );
  });

  test('should throw if file not paused', async () => {
    await registry.add('file.ts', ProtectionLevel.Warn);
    
    await expect(registry.resume('file.ts')).rejects.toThrow(
      'File was not paused'
    );
  });
});
```

### Step 5: Add command

```typescript
// src/commands/protection-commands.ts
export class ProtectionCommands {
  registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        'snapback.pauseProtection',
        async (uri: vscode.Uri) => {
          try {
            await this.registry.pause(uri.fsPath);
            vscode.window.showInformationMessage(
              `⏸️ Protection paused: ${path.basename(uri.fsPath)}`
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to pause: ${error.message}`
            );
          }
        }
      ),
      
      vscode.commands.registerCommand(
        'snapback.resumeProtection',
        async (uri: vscode.Uri) => {
          try {
            await this.registry.resume(uri.fsPath);
            const level = this.registry.get(uri.fsPath);
            vscode.window.showInformationMessage(
              `▶️ Protection resumed: ${path.basename(uri.fsPath)} (${level})`
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to resume: ${error.message}`
            );
          }
        }
      )
    );
  }
}
```

### Step 6: Integration test

```typescript
// tests/integration/suite/pause-protection.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Pause Protection Integration', () => {
  test('should pause and resume via commands', async () => {
    const testFile = vscode.Uri.file('/test-workspace/test.ts');
    
    // Protect file
    await vscode.commands.executeCommand(
      'snapback.protectFile',
      testFile,
      'block'
    );
    
    // Pause
    await vscode.commands.executeCommand(
      'snapback.pauseProtection',
      testFile
    );
    
    let level = await vscode.commands.executeCommand(
      'snapback.getProtectionLevel',
      testFile.fsPath
    );
    assert.strictEqual(level, 'pause');
    
    // Resume
    await vscode.commands.executeCommand(
      'snapback.resumeProtection',
      testFile
    );
    
    level = await vscode.commands.executeCommand(
      'snapback.getProtectionLevel',
      testFile.fsPath
    );
    assert.strictEqual(level, 'block');
  });
});
```

---

## Workflow 2: Adding Snapshot Comparison Feature

**Feature: Compare two snapshots to see what changed**

### TDD Steps

**1. RED - Write unit test for diff calculation**

```typescript
// tests/unit/snapshot/snapshot-diff.test.ts
describe('SnapshotDiff', () => {
  test('should calculate line additions', () => {
    const before = 'line 1\nline 2';
    const after = 'line 1\nline 2\nline 3';
    
    const diff = SnapshotDiff.calculate(before, after);
    
    expect(diff.additions).toEqual([
      { line: 3, content: 'line 3' }
    ]);
  });

  test('should calculate line deletions', () => {
    const before = 'line 1\nline 2\nline 3';
    const after = 'line 1\nline 3';
    
    const diff = SnapshotDiff.calculate(before, after);
    
    expect(diff.deletions).toEqual([
      { line: 2, content: 'line 2' }
    ]);
  });

  test('should calculate line modifications', () => {
    const before = 'const x = 1;';
    const after = 'const x = 2;';
    
    const diff = SnapshotDiff.calculate(before, after);
    
    expect(diff.modifications).toEqual([
      { line: 1, before: 'const x = 1;', after: 'const x = 2;' }
    ]);
  });

  test('should provide summary statistics', () => {
    const before = 'a\nb\nc';
    const after = 'a\nX\nc\nd';
    
    const diff = SnapshotDiff.calculate(before, after);
    
    expect(diff.summary).toEqual({
      additions: 1,
      deletions: 0,
      modifications: 1,
      total: 2
    });
  });
});
```

**2. GREEN - Implement basic diff**

```typescript
// src/snapshot/snapshot-diff.ts
export class SnapshotDiff {
  static calculate(before: string, after: string): DiffResult {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    
    const additions: DiffLine[] = [];
    const deletions: DiffLine[] = [];
    const modifications: DiffModification[] = [];
    
    // Simple line-by-line comparison
    const maxLength = Math.max(beforeLines.length, afterLines.length);
    
    for (let i = 0; i < maxLength; i++) {
      const beforeLine = beforeLines[i];
      const afterLine = afterLines[i];
      
      if (beforeLine === undefined) {
        additions.push({ line: i + 1, content: afterLine });
      } else if (afterLine === undefined) {
        deletions.push({ line: i + 1, content: beforeLine });
      } else if (beforeLine !== afterLine) {
        modifications.push({
          line: i + 1,
          before: beforeLine,
          after: afterLine
        });
      }
    }
    
    return {
      additions,
      deletions,
      modifications,
      summary: {
        additions: additions.length,
        deletions: deletions.length,
        modifications: modifications.length,
        total: additions.length + deletions.length + modifications.length
      }
    };
  }
}
```

**3. REFACTOR - Use proper diff library**

```typescript
// src/snapshot/snapshot-diff.ts
import { diffLines, Change } from 'diff';

export class SnapshotDiff {
  static calculate(before: string, after: string): DiffResult {
    const changes = diffLines(before, after);
    
    const additions: DiffLine[] = [];
    const deletions: DiffLine[] = [];
    let lineNumber = 1;
    
    for (const change of changes) {
      const lines = change.value.split('\n').filter(l => l);
      
      if (change.added) {
        lines.forEach(content => {
          additions.push({ line: lineNumber++, content });
        });
      } else if (change.removed) {
        lines.forEach(content => {
          deletions.push({ line: lineNumber++, content });
        });
      } else {
        lineNumber += lines.length;
      }
    }
    
    return {
      additions,
      deletions,
      summary: {
        additions: additions.length,
        deletions: deletions.length,
        total: additions.length + deletions.length
      }
    };
  }
}
```

**4. Add component test for comparison coordinator**

```typescript
// tests/component/snapshot/snapshot-comparison.test.ts
describe('SnapshotComparison', () => {
  let coordinator: SnapshotCoordinator;
  let mockStorage: MockSnapshotStorage;

  beforeEach(() => {
    mockStorage = new MockSnapshotStorage();
    coordinator = new SnapshotCoordinator(mockStorage);
  });

  test('should compare two snapshots', async () => {
    const snapshot1 = await coordinator.create({
      uri: 'file.ts',
      content: 'version 1'
    });
    
    const snapshot2 = await coordinator.create({
      uri: 'file.ts',
      content: 'version 2'
    });
    
    const diff = await coordinator.compare(snapshot1.id, snapshot2.id);
    
    expect(diff.additions.length).toBeGreaterThan(0);
  });

  test('should throw if snapshots are for different files', async () => {
    const snapshot1 = await coordinator.create({
      uri: 'file1.ts',
      content: 'content'
    });
    
    const snapshot2 = await coordinator.create({
      uri: 'file2.ts',
      content: 'content'
    });
    
    await expect(
      coordinator.compare(snapshot1.id, snapshot2.id)
    ).rejects.toThrow('Cannot compare snapshots from different files');
  });
});
```

**5. Add command and UI**

```typescript
// src/commands/snapshot-commands.ts
vscode.commands.registerCommand(
  'snapback.compareSnapshots',
  async (snapshot1Id: string, snapshot2Id: string) => {
    const diff = await coordinator.compare(snapshot1Id, snapshot2Id);
    
    // Show diff in editor
    const doc = await vscode.workspace.openTextDocument({
      content: formatDiff(diff),
      language: 'diff'
    });
    
    await vscode.window.showTextDocument(doc, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside
    });
  }
);
```

---

## Workflow 3: Fixing a Bug with TDD

**Bug: Protected files tree view doesn't update when .snapbackrc changes**

### TDD Bug Fix Process

**1. RED - Write failing test that reproduces bug**

```typescript
// tests/integration/suite/config-watching.test.ts
test('should update tree view when .snapbackrc changes', async () => {
  const workspaceRoot = vscode.workspace.workspaceFolders![0].uri;
  const configPath = vscode.Uri.joinPath(workspaceRoot, '.snapbackrc');
  
  // Initial config
  await vscode.workspace.fs.writeFile(
    configPath,
    Buffer.from(JSON.stringify({
      protected: { 'file1.ts': 'warn' }
    }))
  );
  
  await vscode.commands.executeCommand('snapback.reloadConfig');
  
  // Verify initial state
  let treeItems = await getTreeViewItems('snapback.protectedFiles');
  assert.strictEqual(treeItems.length, 1);
  
  // Update config
  await vscode.workspace.fs.writeFile(
    configPath,
    Buffer.from(JSON.stringify({
      protected: {
        'file1.ts': 'warn',
        'file2.ts': 'block'  // ← Added file
      }
    }))
  );
  
  // Wait for file watcher to detect change
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // BUG: Tree view doesn't update automatically
  treeItems = await getTreeViewItems('snapback.protectedFiles');
  assert.strictEqual(treeItems.length, 2); // ← This fails
});
```

**2. GREEN - Fix the bug**

```typescript
// src/config/config-watcher.ts
export class ConfigWatcher {
  private watcher?: vscode.FileSystemWatcher;
  
  watch(configPath: vscode.Uri): void {
    this.watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.workspace.workspaceFolders![0],
        '.snapbackrc'
      )
    );
    
    // Handle config changes
    this.watcher.onDidChange(async () => {
      await this.reloadConfig();
      this.emit('config-changed');
    });
  }
  
  private async reloadConfig(): Promise<void> {
    const config = await ConfigParser.load();
    await this.registry.syncFromConfig(config);
    
    // ← FIX: Trigger tree view refresh
    this.treeDataProvider.refresh();
  }
}
```

**3. REFACTOR - Add better error handling**

```typescript
export class ConfigWatcher {
  private async reloadConfig(): Promise<void> {
    try {
      const config = await ConfigParser.load();
      await this.registry.syncFromConfig(config);
      this.treeDataProvider.refresh();
      
      vscode.window.showInformationMessage(
        'Configuration reloaded successfully'
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to reload configuration: ${error.message}`
      );
    }
  }
}
```

**4. Add unit test for regression prevention**

```typescript
// tests/unit/config/config-watcher.test.ts
describe('ConfigWatcher', () => {
  test('should refresh tree view on config change', async () => {
    const watcher = new ConfigWatcher(mockRegistry, mockTreeProvider);
    const refreshSpy = vi.spyOn(mockTreeProvider, 'refresh');
    
    // Simulate config change
    await watcher.handleConfigChange();
    
    expect(refreshSpy).toHaveBeenCalled();
  });

  test('should handle config parsing errors', async () => {
    const watcher = new ConfigWatcher(mockRegistry, mockTreeProvider);
    mockConfigParser.load.mockRejectedValue(new Error('Invalid JSON'));
    
    await watcher.handleConfigChange();
    
    expect(mockShowError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to reload')
    );
  });
});
```

---

## Best Practices for Rapid Development

### 1. Test-First Checklist

Before writing any feature code:

```
□ Write failing unit test
□ Write failing component test (if applicable)
□ Commit with message "RED: [feature name]"
□ Run tests to confirm they fail
□ Implement minimum code to pass
□ Commit with message "GREEN: [feature name]"
□ Refactor for quality
□ Commit with message "REFACTOR: [feature name]"
```

### 2. Test Naming Convention

```typescript
// ✅ GOOD: Descriptive, behavior-focused
test('should emit change event when protection level updated', () => {});

// ❌ BAD: Implementation-focused, vague
test('updateProtectionLevel works', () => {});
```

### 3. One Assert Per Test (When Possible)

```typescript
// ✅ GOOD: Clear failure point
test('should add file to registry', async () => {
  await registry.add('file.ts', ProtectionLevel.Warn);
  expect(registry.get('file.ts')).toBe(ProtectionLevel.Warn);
});

test('should persist to storage', async () => {
  await registry.add('file.ts', ProtectionLevel.Warn);
  expect(mockStorage.update).toHaveBeenCalled();
});

// ❌ BAD: Multiple assertions make debugging harder
test('should add file', async () => {
  await registry.add('file.ts', ProtectionLevel.Warn);
  expect(registry.get('file.ts')).toBe(ProtectionLevel.Warn);
  expect(mockStorage.update).toHaveBeenCalled();
  expect(registry.size()).toBe(1);
});
```

### 4. Use Test Data Builders

```typescript
// ✅ GOOD: Reusable, clear intent
const snapshot = new SnapshotBuilder()
  .withUri('critical.ts')
  .withContent('important code')
  .createdAt(yesterday)
  .build();

// ❌ BAD: Repetitive, error-prone
const snapshot = {
  id: 'snap-123',
  uri: 'critical.ts',
  content: 'important code',
  createdAt: new Date(Date.now() - 86400000),
  hash: 'abc123...'
};
```

### 5. Test Isolation

```typescript
// ✅ GOOD: Each test is independent
beforeEach(() => {
  registry = new ProtectedFileRegistry(mockStorage);
  mockStorage.__reset();
});

// ❌ BAD: Tests depend on order
let registry; // Shared state
test('test 1', () => {
  registry.add('file.ts', ProtectionLevel.Warn);
});
test('test 2', () => {
  // Assumes file.ts was added in test 1
  expect(registry.get('file.ts')).toBe(ProtectionLevel.Warn);
});
```

---

## Performance Tips

### 1. Fast Test Execution

```typescript
// Use beforeAll for expensive setup
describe('SnapshotStorage', () => {
  beforeAll(async () => {
    // One-time expensive operation
    await initializeDatabase();
  });

  beforeEach(() => {
    // Quick per-test cleanup
    clearTestData();
  });
});
```

### 2. Parallel Test Execution

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'forks',      // Parallel execution
    isolate: true,      // Test isolation
    maxConcurrency: 5   // Limit parallel tests
  }
});
```

### 3. Watch Mode Optimization

```bash
# Only run tests for changed files
npm run test:watch -- --changed

# Run specific test file
npm run test:watch -- protection-level.test.ts
```

---

## Debugging Tests

### VS Code Debug Configuration

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Current Test",
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["run", "${file}", "--no-file-parallelism"],
  "console": "integratedTerminal",
  "skipFiles": ["<node_internals>/**"]
}
```

### Debug Specific Test

```typescript
// Add .only to focus on one test
test.only('should debug this test', () => {
  debugger; // Set breakpoint
  expect(value).toBe(expected);
});
```

---

## CI/CD Integration

### Pre-commit Hook

```bash
# .husky/pre-commit
npm run test:unit -- --run --bail
```

### Pre-push Hook

```bash
# .husky/pre-push
npm run test:unit && npm run test:component
```

### PR Checks

```yaml
# .github/workflows/pr-checks.yml
- name: Run tests
  run: npm run test:coverage

- name: Check coverage
  run: |
    COVERAGE=$(jq -r '.total.lines.pct' coverage/coverage-summary.json)
    if (( $(echo "$COVERAGE < 90" | bc -l) )); then
      echo "Coverage below 90%: $COVERAGE%"
      exit 1
    fi
```

---

## Measuring Success

### Coverage Goals

```bash
# Generate coverage report
npm run test:coverage

# View in browser
open coverage/index.html
```

### Test Metrics

Track these metrics in your PR descriptions:

```markdown
## Test Metrics
- Unit tests: +15 (565 total)
- Component tests: +8 (258 total)
- Coverage: 92.3% (+1.2%)
- Test execution time: 28s (-2s)
```

---

## Next Steps

1. **Start with one feature**: Pick the simplest feature and TDD it completely
2. **Build habits**: Practice RED-GREEN-REFACTOR cycle
3. **Increase confidence**: Watch your test suite catch bugs before they ship
4. **Ship faster**: Refactor without fear

Your test suite is your safety net. Invest in it now, ship fearlessly later! 🚀
