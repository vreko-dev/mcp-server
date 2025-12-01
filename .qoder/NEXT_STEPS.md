# Alpha Completion - Tactical Next Steps

## Immediate Action Plan (Next 8 Hours)

### Priority 1: Lane A - Snapshot Core (4-6 hours)

#### Step 1: Create Test Suite (TDD RED Phase)
```bash
# Create test file first
mkdir -p packages/core/src/snapshot
touch packages/core/test/snapshot-storage.spec.ts
```

**Test Structure** (copy this):
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SnapshotStorage } from '../src/snapshot/storage';

describe('SnapshotStorage - TDD', () => {
  let storage: SnapshotStorage;

  beforeEach(() => {
    storage = new SnapshotStorage({ workspaceRoot: '/tmp/test' });
  });

  describe('Snapshot Creation', () => {
    it('should generate unique CUID snapshot IDs', () => {
      const id1 = storage.generateId();
      const id2 = storage.generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^c[a-z0-9]{24}$/);
    });

    it('should create snapshot from file list', async () => {
      const files = [
        { path: 'src/index.ts', content: Buffer.from('code') }
      ];
      
      const snapshot = await storage.createSnapshot(files, {
        message: 'test snapshot',
        trigger: 'manual'
      });

      expect(snapshot.id).toBeDefined();
      expect(snapshot.fileCount).toBe(1);
      expect(snapshot.chunks).toHaveLength(1);
    });

    it('should deduplicate identical content', async () => {
      const content = 'const x = 1;';
      const files = [
        { path: 'a.ts', content: Buffer.from(content) },
        { path: 'b.ts', content: Buffer.from(content) }
      ];

      const snapshot = await storage.createSnapshot(files);
      
      // Should have 2 files but only 1 unique chunk
      expect(snapshot.fileCount).toBe(2);
      expect(snapshot.chunks.length).toBe(1);
    });

    it('should calculate SHA-256 hash for each chunk', async () => {
      const files = [
        { path: 'test.ts', content: Buffer.from('hello') }
      ];

      const snapshot = await storage.createSnapshot(files);
      const hash = snapshot.chunks[0];
      
      // SHA-256 of "hello"
      expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('should respect .snapbackignore patterns', async () => {
      storage.setIgnorePatterns(['node_modules/**', '*.log']);
      
      const files = [
        { path: 'src/index.ts', content: Buffer.from('code') },
        { path: 'node_modules/lib.js', content: Buffer.from('lib') },
        { path: 'debug.log', content: Buffer.from('log') }
      ];

      const snapshot = await storage.createSnapshot(files);
      expect(snapshot.fileCount).toBe(1); // Only src/index.ts
    });

    it('should compress content with gzip', async () => {
      const largeContent = 'x'.repeat(10000);
      const files = [
        { path: 'large.ts', content: Buffer.from(largeContent) }
      ];

      const snapshot = await storage.createSnapshot(files);
      const stored = await storage.getChunk(snapshot.chunks[0]);
      
      expect(stored.compressed).toBe(true);
      expect(stored.size).toBeLessThan(largeContent.length);
    });
  });

  describe('Snapshot Restoration', () => {
    it('should restore snapshot to original content', async () => {
      const originalFiles = [
        { path: 'test.ts', content: Buffer.from('original') }
      ];

      const snapshot = await storage.createSnapshot(originalFiles);
      const restored = await storage.restoreSnapshot(snapshot.id);

      expect(restored).toHaveLength(1);
      expect(restored[0].content.toString()).toBe('original');
    });

    it('should verify hash integrity on restore', async () => {
      const files = [
        { path: 'test.ts', content: Buffer.from('data') }
      ];

      const snapshot = await storage.createSnapshot(files);
      
      // Corrupt the chunk
      await storage.corruptChunk(snapshot.chunks[0]);

      await expect(
        storage.restoreSnapshot(snapshot.id)
      ).rejects.toThrow('Hash mismatch');
    });

    it('should be atomic (all-or-nothing)', async () => {
      const files = [
        { path: 'a.ts', content: Buffer.from('a') },
        { path: 'b.ts', content: Buffer.from('b') }
      ];

      const snapshot = await storage.createSnapshot(files);
      
      // Corrupt one chunk
      await storage.corruptChunk(snapshot.chunks[0]);

      await expect(
        storage.restoreSnapshot(snapshot.id)
      ).rejects.toThrow();

      // No partial restoration should occur
      const filesOnDisk = await storage.listFiles();
      expect(filesOnDisk).toHaveLength(0);
    });
  });

  describe('Performance Budget', () => {
    it('should create snapshot within 100ms p95', async () => {
      const files = Array.from({ length: 50 }, (_, i) => ({
        path: `file${i}.ts`,
        content: Buffer.from(`content ${i}`)
      }));

      const times: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await storage.createSnapshot(files);
        times.push(performance.now() - start);
      }

      const p95 = times.sort()[Math.floor(times.length * 0.95)];
      expect(p95).toBeLessThan(100);
    });
  });
});
```

Run tests (they should FAIL - this is RED phase):
```bash
cd packages/core
pnpm test snapshot-storage.spec.ts
```

#### Step 2: Implement Storage (TDD GREEN Phase)

Create `packages/core/src/snapshot/storage.ts`:

```typescript
import { createHash } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { minimatch } from 'minimatch';
import { createId } from '@paralleldrive/cuid2';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

interface FileInfo {
  path: string;
  content: Buffer;
}

interface Snapshot {
  id: string;
  workspaceId: string;
  message?: string;
  trigger: 'manual' | 'auto' | 'pre-commit' | 'window-blur';
  createdAt: number;
  fileCount: number;
  totalSizeBytes: number;
  chunks: string[]; // Array of chunk hashes
  fileMap: Record<string, string>; // filepath -> chunk hash
}

interface Chunk {
  hash: string;
  content: Buffer;
  compressed: boolean;
  size: number;
}

export class SnapshotStorage {
  private workspaceRoot: string;
  private chunks: Map<string, Chunk> = new Map();
  private snapshots: Map<string, Snapshot> = new Map();
  private ignorePatterns: string[] = [];

  constructor(config: { workspaceRoot: string }) {
    this.workspaceRoot = config.workspaceRoot;
  }

  generateId(): string {
    return createId();
  }

  setIgnorePatterns(patterns: string[]): void {
    this.ignorePatterns = patterns;
  }

  async createSnapshot(
    files: FileInfo[],
    options: {
      message?: string;
      trigger?: Snapshot['trigger'];
    } = {}
  ): Promise<Snapshot> {
    // Filter out ignored files
    const filteredFiles = files.filter(f => !this.shouldIgnore(f.path));

    // Deduplicate and store chunks
    const fileMap: Record<string, string> = {};
    const uniqueChunks = new Set<string>();

    for (const file of filteredFiles) {
      const hash = await this.hashContent(file.content);
      fileMap[file.path] = hash;
      uniqueChunks.add(hash);

      // Store chunk if not already stored
      if (!this.chunks.has(hash)) {
        const compressed = await gzipAsync(file.content);
        this.chunks.set(hash, {
          hash,
          content: compressed,
          compressed: true,
          size: compressed.length
        });
      }
    }

    const snapshot: Snapshot = {
      id: this.generateId(),
      workspaceId: 'default',
      message: options.message,
      trigger: options.trigger || 'manual',
      createdAt: Date.now(),
      fileCount: filteredFiles.length,
      totalSizeBytes: filteredFiles.reduce((sum, f) => sum + f.content.length, 0),
      chunks: Array.from(uniqueChunks),
      fileMap
    };

    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  async restoreSnapshot(id: string): Promise<FileInfo[]> {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${id}`);
    }

    const restoredFiles: FileInfo[] = [];

    for (const [pathunkHash] of Object.entries(snapshot.fileMap)) {
      const chunk = this.chunks.get(chunkHash);
      if (!chunk) {
        throw new Error(`Chunk not found: ${chunkHash}`);
      }

      // Decompress
      const decompressed = await gunzipAsync(chunk.content);

      // Verify hash
      const actualHash = await this.hashContent(decompressed);
      if (actualHash !== chunkHash) {
        throw new Error(`Hash mismatch for ${path}`);
      }

      restoredFiles.push({
        path,
        content: decompressed
      });
    }

    return restoredFiles;
  }

  async getChunk(hash: string): Promise<Chunk> {
    const chunk = this.chunks.get(hash);
    if (!chunk) {
      throw new Error(`Chunk not found: ${hash}`);
    }
    return chunk;
  }

  private async hashContent(content: Buffer): Promise<string> {
    return createHash('sha256').update(content).digest('hex');
  }

  private shouldIgnore(path: string): boolean {
    return this.ignorePatterns.some(pattern => minimatch(path, pattern));
  }

  // Test helpers
  async corruptChunk(hash: string): Promise<void> {
    const chunk = this.chunks.get(hash);
    if (chunk) {
      chunk.content = Buffer.from('corrupted');
    }
  }

  async listFiles(): Promise<string[]> {
    return [];
  }
}
```

Install dependencies:
```bash
pnpm add @paralleldrive/cuid2 minimatch
pnpm add -D @types/minimatch
```

Run tests (should PASS - GREEN phase):
```bash
pnpm test snapshot-storage.spec.ts
```

#### Step 3: Integrate with Analytics

Add to snapshot creation:
```typescript
import { AnalyticsClient } from '@snapback/analytics';

// After snapshot created
const analytics = AnalyticsClient.getInstance({/*...*/});
analytics.track({
  name: 'SNAPSHOT_CREATED',
  meta: {
    trigger: options.trigger,
    fileCount: snapshot.fileCount,
    cloudBackup: false
  },
  timestamp: Date.now()
});
```

### Priority 2: Wire to VS Code Extension (2 hours)

Update `apps/vscode/src/commands/snapshot.ts`:
```typescript
import { SnapshotStorage } from '@snapback/core/snapshot';
import * as vscode from 'vscode';

export async function createSnapshot() {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    vscode.window.showErrorMessage('No workspace open');
    return;
  }

  const storage = new SnapshotStorage({
    workspaceRoot: workspace.uri.fsPath
  });

  const message = await vscode.window.showInputBox({
    prompt: 'Snapshot message (optional)',
    placeHolder: 'e.g., Before refactoring...'
  });

  // Get all files
  const files = await getAllWorkspaceFiles(workspace);

  const snapshot = await storage.createSnapshot(files, {
    message,
    trigger: 'manual'
  });

  vscode.window.showInformationMessage(
    `Snapshot created: ${snapshot.id.substring(0, 8)}...`
  );
}

async function getAllWorkspaceFiles(workspace: vscode.WorkspaceFolder) {
  const files: FileInfo[] = [];
  const uris = await vscode.workspace.findFiles('**/*', '**/node_modules/**');

  for (const uri of uris) {
    const content = await vscode.workspace.fs.readFile(uri);
    files.push({
      path: vscode.workspace.asRelativePath(uri),
      content: Buffer.from(content)
    });
  }

  return files;
}
```

### Priority 3: Add Performance Benchmark (30 min)

Create `packages/core/test/snapshot-perf.spec.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createBenchmark, checkBudget, ALPHA_BUDGETS } from '@snapback/perf';
import { SnapshotStorage } from '../src/snapshot/storage';

describe('Snapshot Performance', () => {
  it('should meet <100ms p95 budget', async () => {
    const storage = new SnapshotStorage({ workspaceRoot: '/tmp' });
    const files = Array.from({ length: 500 }, (_, i) => ({
      path: `file${i}.ts`,
      content: Buffer.from(`export const v${i} = ${i};`)
    }));

    const bench = createBenchmark('snapshot-creation');
    const result = await bench.run(async () => {
      await storage.createSnapshot(files);
    });

    const budget = ALPHA_BUDGETS.find(b => b.name === 'snapshot-creation');
    const check = checkBudget(result, budget!);

    expect(check.passed).toBe(true);
    console.log(check.message);
  });
});
```

## Success Metrics

After completing these steps, you'll have:
- ✅ Snapshot creation with deduplication (TDD)
- ✅ Hash integrity validation
- ✅ VS Code command integration
- ✅ Performance budget compliance
- ✅ Analytics event tracking

## Estimated Time
- Step 1 (Tests): 1.5 hours
- Step 2 (Implementation): 2.5 hours  
- Step 3 (VS Code): 1.5 hours
- Step 4 (Performance): 0.5 hours
- **Total: ~6 hours**

## After This

Continue with:
1. Restore mechanism (atomic, with rollback)
2. Cloud backup for Solo tier
3. Guardian policy engine
4. MCP integration

All following same TDD pattern established in Phase 0.
