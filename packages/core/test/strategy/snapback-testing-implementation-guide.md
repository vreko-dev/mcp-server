# SnapBack Testing Architecture: Implementation Guide

## Quick Start: Getting Testing Infrastructure Running Today

This guide provides actionable steps to implement the comprehensive testing architecture for your SnapBack extension. Each phase is designed to be completable in 1-2 days with Claude Code assistance.

---

## Phase 0: Prerequisites & Setup (2-4 hours)

### Install Testing Dependencies

```bash
# Core testing framework
npm install -D vitest @vitest/ui @vitest/coverage-v8

# VS Code testing utilities
npm install -D @vscode/test-electron @vscode/test-cli mocha @types/mocha

# E2E testing (optional for Phase 1)
npm install -D webdriverio @wdio/cli @wdio/mocha-framework wdio-vscode-service

# Additional utilities
npm install -D @types/node chai @types/chai
```

### Project Structure

```
snapback-vscode/
├── src/
│   ├── extension.ts
│   ├── protection/
│   ├── snapshot/
│   └── ui/
├── tests/
│   ├── setup.ts                    # Global test setup
│   ├── unit/                       # Pure logic tests
│   │   ├── protection/
│   │   ├── snapshot/
│   │   └── utils/
│   ├── component/                  # Component tests with mocks
│   │   ├── registry/
│   │   ├── coordinator/
│   │   └── ui/
│   ├── integration/                # VS Code API tests
│   │   ├── suite/
│   │   └── runTests.ts
│   ├── e2e/                        # WebdriverIO tests
│   │   ├── specs/
│   │   └── wdio.conf.ts
│   ├── utils/                      # Test utilities
│   │   ├── mock-factory.ts
│   │   ├── test-data-builders.ts
│   │   └── assertions.ts
│   └── fixtures/                   # Test data
│       ├── sample-projects/
│       └── mock-configs/
├── vitest.config.ts
├── .vscode-test.mjs                # Integration test config
└── package.json
```

### Configuration Files

Create these config files:

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/integration/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/types.ts',
        'tests/**'
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      }
    },
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    isolate: true,
    pool: 'forks',
    reporters: ['default', 'html']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});
```

**.vscode-test.mjs** (for integration tests):
```javascript
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'tests/integration/suite/**/*.test.js',
  version: 'stable',
  workspaceFolder: './test-workspace',
  mocha: {
    ui: 'tdd',
    timeout: 20000,
    color: true
  }
});
```

**package.json scripts:**
```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:component",
    "test:unit": "vitest run tests/unit",
    "test:component": "vitest run tests/component",
    "test:integration": "vscode-test",
    "test:e2e": "wdio run ./tests/e2e/wdio.conf.ts",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:debug": "vitest --inspect-brk --no-file-parallelism"
  }
}
```

---

## Phase 1: Unit Tests Foundation (Day 1-2)

### Step 1: Create Test Setup

**tests/setup.ts:**
```typescript
import { vi, beforeEach, afterEach } from 'vitest';

// Mock VS Code module globally
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
    workspaceFolders: [],
    fs: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      delete: vi.fn(),
      stat: vi.fn()
    }
  },
  window: {
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    createStatusBarItem: vi.fn(() => ({
      text: '',
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn()
    }))
  },
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn()
  },
  Uri: {
    file: (path: string) => ({ fsPath: path, toString: () => path }),
    parse: (uri: string) => ({ fsPath: uri, toString: () => uri })
  },
  FileType: {
    File: 1,
    Directory: 2,
    SymbolicLink: 64
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2
  }
}));

// Global test hooks
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Clean up after tests
  vi.restoreAllMocks();
});
```

### Step 2: Create Mock Factory

**tests/utils/mock-factory.ts:**
```typescript
import { vi } from 'vitest';
import type * as vscode from 'vscode';

export class MockFactory {
  /**
   * Create a mock VS Code TextDocument
   */
  static createMockDocument(options: {
    uri?: string;
    content?: string;
    languageId?: string;
    isDirty?: boolean;
  } = {}): vscode.TextDocument {
    return {
      uri: { fsPath: options.uri || '/test.ts' } as any,
      fileName: options.uri || '/test.ts',
      languageId: options.languageId || 'typescript',
      version: 1,
      isDirty: options.isDirty || false,
      isClosed: false,
      isUntitled: false,
      eol: 1,
      lineCount: (options.content || '').split('\n').length,
      save: vi.fn(),
      getText: vi.fn(() => options.content || ''),
      getWordRangeAtPosition: vi.fn(),
      validateRange: vi.fn(range => range),
      validatePosition: vi.fn(position => position),
      lineAt: vi.fn((line: number) => ({
        text: (options.content || '').split('\n')[line] || '',
        lineNumber: line,
        range: {} as any,
        rangeIncludingLineBreak: {} as any,
        firstNonWhitespaceCharacterIndex: 0,
        isEmptyOrWhitespace: false
      })),
      offsetAt: vi.fn(),
      positionAt: vi.fn()
    } as any;
  }

  /**
   * Create a mock storage
   */
  static createMockStorage() {
    const storage = new Map<string, any>();

    return {
      get: vi.fn((key: string) => storage.get(key)),
      update: vi.fn((key: string, value: any) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
      keys: vi.fn(() => Array.from(storage.keys())),
      clear: vi.fn(() => {
        storage.clear();
        return Promise.resolve();
      }),
      // Additional helpers
      __storage: storage,
      __reset: () => storage.clear()
    };
  }

  /**
   * Create a mock file system
   */
  static createMockFileSystem() {
    const files = new Map<string, Uint8Array>();

    return {
      readFile: vi.fn(async (uri: any) => {
        const content = files.get(uri.fsPath || uri.toString());
        if (!content) throw new Error(`File not found: ${uri.fsPath}`);
        return content;
      }),
      writeFile: vi.fn(async (uri: any, content: Uint8Array) => {
        files.set(uri.fsPath || uri.toString(), content);
      }),
      delete: vi.fn(async (uri: any) => {
        files.delete(uri.fsPath || uri.toString());
      }),
      stat: vi.fn(async (uri: any) => ({
        type: 1, // File
        ctime: Date.now(),
        mtime: Date.now(),
        size: files.get(uri.fsPath || uri.toString())?.length || 0
      })),
      readDirectory: vi.fn(async () => []),
      createDirectory: vi.fn(async () => {}),
      // Helper to preset files
      __setFile: (path: string, content: string) => {
        files.set(path, new TextEncoder().encode(content));
      },
      __getFile: (path: string): string | undefined => {
        const content = files.get(path);
        return content ? new TextDecoder().decode(content) : undefined;
      },
      __reset: () => files.clear()
    };
  }

  /**
   * Create a mock status bar item
   */
  static createMockStatusBarItem() {
    return {
      text: '',
      tooltip: '',
      color: undefined,
      backgroundColor: undefined,
      command: undefined,
      alignment: 1,
      priority: 0,
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn()
    };
  }

  /**
   * Create a mock workspace
   */
  static createMockWorkspace(files: Record<string, string> = {}) {
    const fs = this.createMockFileSystem();
    
    // Preset files
    Object.entries(files).forEach(([path, content]) => {
      fs.__setFile(path, content);
    });

    return {
      workspaceFolders: [{
        uri: { fsPath: '/workspace' },
        name: 'test-workspace',
        index: 0
      }],
      fs,
      getConfiguration: vi.fn(() => ({
        get: vi.fn(),
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn()
      })),
      openTextDocument: vi.fn(async (uri: any) => {
        const content = fs.__getFile(uri.fsPath || uri.toString());
        return this.createMockDocument({
          uri: uri.fsPath || uri.toString(),
          content
        });
      })
    };
  }
}
```

### Step 3: Write Your First Unit Tests

**Example: tests/unit/protection/protection-level.test.ts:**

```typescript
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ProtectionLevel } from '@/protection/protection-level';
import { MockFactory } from '@tests/utils/mock-factory';

describe('ProtectionLevel', () => {
  describe('Watch Level', () => {
    test('should not show notifications', () => {
      const level = ProtectionLevel.Watch;
      expect(level.shouldNotify()).toBe(false);
    });

    test('should not block saves', () => {
      const level = ProtectionLevel.Watch;
      expect(level.shouldBlock()).toBe(false);
    });

    test('should create silent snapshots', async () => {
      const level = ProtectionLevel.Watch;
      const mockFile = MockFactory.createMockDocument({
        uri: '/test.ts',
        content: 'const x = 1;'
      });

      const result = await level.handleSave(mockFile);
      
      expect(result.allowed).toBe(true);
      expect(result.snapshotCreated).toBe(true);
      expect(result.notificationShown).toBe(false);
    });
  });

  describe('Warn Level', () => {
    test('should show notifications', () => {
      const level = ProtectionLevel.Warn;
      expect(level.shouldNotify()).toBe(true);
    });

    test('should not block saves', () => {
      const level = ProtectionLevel.Warn;
      expect(level.shouldBlock()).toBe(false);
    });

    test('should allow save with warning', async () => {
      const level = ProtectionLevel.Warn;
      const mockFile = MockFactory.createMockDocument({
        uri: '/test.ts'
      });

      const result = await level.handleSave(mockFile);
      
      expect(result.allowed).toBe(true);
      expect(result.notificationShown).toBe(true);
      expect(result.notificationMessage).toContain('⚠️');
    });
  });

  describe('Block Level', () => {
    test('should block saves', () => {
      const level = ProtectionLevel.Block;
      expect(level.shouldBlock()).toBe(true);
    });

    test('should require user confirmation', async () => {
      const level = ProtectionLevel.Block;
      const mockFile = MockFactory.createMockDocument({
        uri: '/critical.ts'
      });

      // Mock user canceling
      const mockShowWarning = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('showWarningMessage', mockShowWarning);

      const result = await level.handleSave(mockFile);
      
      expect(result.allowed).toBe(false);
      expect(mockShowWarning).toHaveBeenCalled();
    });

    test('should allow save after confirmation', async () => {
      const level = ProtectionLevel.Block;
      const mockFile = MockFactory.createMockDocument({
        uri: '/critical.ts'
      });

      // Mock user confirming
      const mockShowWarning = vi.fn().mockResolvedValue('Save Anyway');
      vi.stubGlobal('showWarningMessage', mockShowWarning);

      const result = await level.handleSave(mockFile);
      
      expect(result.allowed).toBe(true);
      expect(result.userConfirmed).toBe(true);
    });
  });
});
```

### Step 4: Run Your First Tests

```bash
# Run tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# UI mode (interactive)
npm run test:ui
```

---

## Phase 2: Component Tests (Day 3-4)

### Example: Protected File Registry Tests

**tests/component/registry/protected-file-registry.test.ts:**

```typescript
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ProtectedFileRegistry } from '@/registry/protected-file-registry';
import { ProtectionLevel } from '@/protection/protection-level';
import { MockFactory } from '@tests/utils/mock-factory';

describe('ProtectedFileRegistry', () => {
  let registry: ProtectedFileRegistry;
  let mockStorage: ReturnType<typeof MockFactory.createMockStorage>;

  beforeEach(() => {
    mockStorage = MockFactory.createMockStorage();
    registry = new ProtectedFileRegistry(mockStorage);
  });

  describe('add', () => {
    test('should add file with protection level', async () => {
      await registry.add('src/app.ts', ProtectionLevel.Warn);
      
      expect(registry.get('src/app.ts')).toBe(ProtectionLevel.Warn);
    });

    test('should persist to storage', async () => {
      await registry.add('src/app.ts', ProtectionLevel.Block);
      
      expect(mockStorage.update).toHaveBeenCalledWith(
        'protected-files',
        expect.objectContaining({
          'src/app.ts': 'block'
        })
      );
    });

    test('should emit change event', async () => {
      const spy = vi.fn();
      registry.onDidChange(spy);

      await registry.add('file.ts', ProtectionLevel.Watch);
      
      expect(spy).toHaveBeenCalledWith({
        type: 'add',
        uri: 'file.ts',
        level: ProtectionLevel.Watch
      });
    });

    test('should not duplicate entries', async () => {
      await registry.add('file.ts', ProtectionLevel.Watch);
      await registry.add('file.ts', ProtectionLevel.Warn);
      
      // Should update, not duplicate
      expect(registry.size()).toBe(1);
      expect(registry.get('file.ts')).toBe(ProtectionLevel.Warn);
    });
  });

  describe('remove', () => {
    test('should remove file protection', async () => {
      await registry.add('file.ts', ProtectionLevel.Warn);
      await registry.remove('file.ts');
      
      expect(registry.get('file.ts')).toBeUndefined();
    });

    test('should persist removal to storage', async () => {
      await registry.add('file.ts', ProtectionLevel.Warn);
      mockStorage.update.mockClear();
      
      await registry.remove('file.ts');
      
      expect(mockStorage.update).toHaveBeenCalledWith(
        'protected-files',
        {}
      );
    });

    test('should emit change event', async () => {
      await registry.add('file.ts', ProtectionLevel.Watch);
      
      const spy = vi.fn();
      registry.onDidChange(spy);

      await registry.remove('file.ts');
      
      expect(spy).toHaveBeenCalledWith({
        type: 'remove',
        uri: 'file.ts'
      });
    });
  });

  describe('initialization', () => {
    test('should load existing protections', async () => {
      mockStorage.get.mockReturnValue({
        'existing.ts': 'block',
        'another.ts': 'warn'
      });

      const newRegistry = new ProtectedFileRegistry(mockStorage);
      await newRegistry.initialize();
      
      expect(newRegistry.get('existing.ts')).toBe(ProtectionLevel.Block);
      expect(newRegistry.get('another.ts')).toBe(ProtectionLevel.Warn);
    });

    test('should handle corrupted storage', async () => {
      mockStorage.get.mockReturnValue(null);

      const newRegistry = new ProtectedFileRegistry(mockStorage);
      await expect(newRegistry.initialize()).resolves.not.toThrow();
      
      expect(newRegistry.size()).toBe(0);
    });

    test('should validate protection levels', async () => {
      mockStorage.get.mockReturnValue({
        'invalid.ts': 'invalid-level'
      });

      const newRegistry = new ProtectedFileRegistry(mockStorage);
      await newRegistry.initialize();
      
      // Should skip invalid entries
      expect(newRegistry.get('invalid.ts')).toBeUndefined();
    });
  });

  describe('performance', () => {
    test('should provide O(1) lookup', () => {
      // Add 10,000 files
      for (let i = 0; i < 10000; i++) {
        registry.add(`file${i}.ts`, ProtectionLevel.Watch);
      }

      // Measure lookup time
      const start = performance.now();
      registry.get('file5000.ts');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1); // < 1ms
    });

    test('should handle large registries efficiently', async () => {
      const files: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        files[`file${i}.ts`] = 'watch';
      }

      mockStorage.get.mockReturnValue(files);

      const start = performance.now();
      await registry.initialize();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // < 100ms to load 1000 files
    });
  });
});
```

---

## Phase 3: Integration Tests (Day 5-6)

### Setup Integration Test Runner

**tests/integration/runTests.ts:**
```typescript
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');
    const testWorkspace = path.resolve(__dirname, '../../test-workspace');

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        testWorkspace,
        '--disable-extensions', // Disable other extensions
        '--disable-gpu' // Improve test stability
      ],
      extensionTestsEnv: {
        SNAPBACK_TEST_MODE: 'true'
      }
    });
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();
```

**tests/integration/suite/index.ts:**
```typescript
import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 20000
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise((resolve, reject) => {
    glob('**/**.test.js', { cwd: testsRoot })
      .then(files => {
        files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

        try {
          mocha.run(failures => {
            if (failures > 0) {
              reject(new Error(`${failures} tests failed.`));
            } else {
              resolve();
            }
          });
        } catch (err) {
          reject(err);
        }
      })
      .catch(reject);
  });
}
```

**Example Integration Test:**
```typescript
// tests/integration/suite/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Extension Integration Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should activate', async () => {
    const ext = vscode.extensions.getExtension('your-publisher.snapback');
    assert.ok(ext);
    
    if (!ext.isActive) {
      await ext.activate();
    }
    
    assert.strictEqual(ext.isActive, true);
  });

  test('Should register all commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    const snapbackCommands = commands.filter(cmd => cmd.startsWith('snapback.'));
    
    assert.ok(snapbackCommands.includes('snapback.protectFile'));
    assert.ok(snapbackCommands.includes('snapback.createSnapshot'));
    assert.ok(snapbackCommands.includes('snapback.restoreSnapshot'));
  });

  test('Should protect file via command', async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const testFile = vscode.Uri.file(path.join(workspaceRoot, 'test.ts'));
    
    // Create test file
    await vscode.workspace.fs.writeFile(testFile, Buffer.from('const x = 1;'));
    
    // Execute protect command
    await vscode.commands.executeCommand('snapback.protectFile', testFile.fsPath, 'warn');
    
    // Verify protection
    const level = await vscode.commands.executeCommand(
      'snapback.getProtectionLevel',
      testFile.fsPath
    );
    
    assert.strictEqual(level, 'warn');
    
    // Cleanup
    await vscode.workspace.fs.delete(testFile);
  });
});
```

---

## Phase 4: CI/CD Integration (Day 7)

### GitHub Actions Workflow

**.github/workflows/test.yml:**
```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-component:
    name: Unit & Component Tests
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run component tests
        run: npm run test:component
      
      - name: Generate coverage
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          fail_ci_if_error: true

  integration:
    name: Integration Tests - ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests (Linux)
        if: runner.os == 'Linux'
        run: xvfb-run -a npm run test:integration
      
      - name: Run integration tests (Windows/Mac)
        if: runner.os != 'Linux'
        run: npm run test:integration

  quality-gate:
    name: Quality Gate
    needs: [unit-component, integration]
    runs-on: ubuntu-latest
    if: always()
    
    steps:
      - name: Check test results
        run: |
          if [ "${{ needs.unit-component.result }}" != "success" ] || [ "${{ needs.integration.result }}" != "success" ]; then
            echo "Tests failed!"
            exit 1
          fi
```

---

## Troubleshooting Guide

### Common Issues

**Issue: Tests timing out**
```typescript
// Increase timeout in vitest.config.ts
test: {
  testTimeout: 30000,
  hookTimeout: 30000
}
```

**Issue: VS Code API not mocked properly**
```typescript
// Make sure setup.ts is in setupFiles
// vitest.config.ts
setupFiles: ['./tests/setup.ts']
```

**Issue: Integration tests failing to launch VS Code**
```bash
# Ensure you have X11 forwarding (Linux)
xvfb-run -a npm run test:integration

# Or install missing dependencies
sudo apt-get install libx11-dev libxkbfile-dev libsecret-1-dev
```

---

## Next Steps

1. **Start with Phase 1**: Get unit tests running
2. **Add Component Tests**: Test your registries and coordinators
3. **Integration Tests**: Test real VS Code interactions
4. **CI/CD**: Automate everything
5. **E2E Tests**: Add user workflow validation

## Questions to Explore

1. Which layer should we implement first based on your current needs?
2. Do you want to focus on specific features for initial testing?
3. Should we set up CI/CD immediately or after Phase 2?

Let me know what you'd like to tackle first!
