# 🎯 SnapBack SDK Migration - Comprehensive Implementation Roadmap

**Branch**: `feat/sdk-implementation-centralization`
**Created**: October 21, 2025
**Status**: Analysis Complete → Ready for Implementation

---

## 📊 Executive Summary

### Current State Analysis

**SDK Package Status**:

-   ✅ **130 tests passing** (93% pass rate)
-   ❌ **10 tests failing** (9 compilation errors + 1 runtime bug)
-   ✅ **Client layer implemented** (HTTP, caching, retry logic)
-   ✅ **Privacy system implemented** (hashing, sanitization, validation)
-   ⚠️ **Manager layer** (stubs only - needs VS Code migration)
-   ⚠️ **Storage layer** (MemoryStorage only - needs SQLite)

**VS Code Extension Analysis** (from Explore Agent):

-   **32 files**, **7,079 LOC** to migrate
-   **70% reusable** business logic (~5,000 LOC)
-   **30% VS Code-specific** (~2,000 LOC - needs abstraction)

**Key Discovery**: This is NOT a greenfield TDD project. The SDK already has significant implementation. We need to:

1. Fix immediate bugs (2 hours)
2. Migrate VS Code business logic (30-40 hours)
3. Create abstraction interfaces for platform-specific code

---

## 🔥 Critical Bugs to Fix Immediately

### Bug #1: QuickLRU Cache Initialization

**File**: `packages/sdk/src/client/SnapbackClient.ts:39`

**Current Code**:

```typescript
this.cache = new QuickLRU({ maxSize: options.cache === false ? 0 : 1000 });
```

**Problem**: QuickLRU throws error when `maxSize` is 0

**Fix**:

```typescript
// Option A: Conditional initialization
this.cache =
	options.cache === false
		? (new Map() as any) // No-op cache
		: new QuickLRU({ maxSize: 1000 });

// Option B: Use minimum size
this.cache = new QuickLRU({
	maxSize: options.cache === false ? 1 : 1000,
});
```

**Effort**: 15 minutes

---

### Bug #2: Reserved Word "protected" in Tests

**Affected Files** (9 files):

-   `tests/unit/SnapshotClient.test.ts`
-   `tests/unit/SnapshotManager.test.ts`
-   `tests/unit/ProtectionManager.test.ts`
-   `tests/unit/ProtectionClient.test.ts`
-   `tests/unit/LocalStorage.test.ts`
-   `tests/unit/end-to-end.test.ts`
-   `tests/e2e/end-to-end.test.ts`
-   Plus 2 more compilation errors

**Current Code**:

```typescript
const protected = await snapshotManager.get(snapshot2.id);
expect(protected?.protected).toBe(true);
```

**Problem**: `protected` is a reserved word in ES modules

**Fix** (apply to all 9 files):

```typescript
const protectedSnapshot = await snapshotManager.get(snapshot2.id);
expect(protectedSnapshot?.protected).toBe(true);
```

**Effort**: 45 minutes (bulk find/replace with verification)

---

## 📋 Six-Phase Implementation Plan

### **PHASE 1: Immediate Bug Fixes** (1-2 hours)

**Objective**: Get all tests passing

**Tasks**:

1. Fix QuickLRU initialization in `SnapbackClient.ts`
2. Replace `const protected` with `const protectedSnapshot` in 9 test files
3. Run full test suite: `pnpm test`
4. Verify: 140+ tests passing

**Acceptance Criteria**:

-   ✅ Zero compilation errors
-   ✅ 140+ tests GREEN
-   ✅ 0 tests RED

**Deliverable**: Clean baseline with all existing tests passing

---

### **PHASE 2: Snapshot System Migration** (10-14 hours)

**Objective**: Migrate snapshot business logic from VS Code to SDK

#### Component 2.1: SnapshotDeduplicator (2-3 hours)

**Source**: `apps/vscode/src/snapshot/SnapshotDeduplicator.ts` (261 LOC)

**Complexity**: Simple - Pure hash-based logic, zero VS Code dependencies

**Implementation**:

```typescript
// packages/sdk/src/snapshot/SnapshotDeduplicator.ts
export class SnapshotDeduplicator {
	private hashCache = new Map<string, Set<string>>(); // filePath → hashes

	async hashContent(content: string): Promise<string> {
		return crypto.createHash("sha256").update(content).digest("hex");
	}

	async isDuplicate(filePath: string, hash: string): Promise<boolean> {
		const hashes = this.hashCache.get(filePath);
		return hashes ? hashes.has(hash) : false;
	}

	async recordHash(filePath: string, hash: string): Promise<void> {
		if (!this.hashCache.has(filePath)) {
			this.hashCache.set(filePath, new Set());
		}
		this.hashCache.get(filePath)!.add(hash);
	}
}
```

**Tests**: Create `tests/unit/snapshot/SnapshotDeduplicator.test.ts` (10-15 tests)

---

#### Component 2.2: SnapshotNamingStrategy (4-5 hours)

**Source**: `apps/vscode/src/snapshot/SnapshotNamingStrategy.ts` (700 LOC)

**Complexity**: Complex - 4-tier naming system (Git → File Ops → Content → Fallback)

**Implementation Strategy**:

```typescript
// packages/sdk/src/snapshot/SnapshotNaming.ts
export type NamingStrategy = "git" | "semantic" | "timestamp";

export class SnapshotNaming {
	constructor(private strategy: NamingStrategy = "semantic") {}

	async generate(data: {
		filePath: string;
		content: string;
		gitMessage?: string;
	}): Promise<string> {
		switch (this.strategy) {
			case "git":
				return this.gitNaming(data);
			case "semantic":
				return this.semanticNaming(data);
			case "timestamp":
				return this.timestampNaming(data);
		}
	}

	private async semanticNaming(data): Promise<string> {
		// Tier 1: Git commit message
		if (data.gitMessage) return data.gitMessage;

		// Tier 2: File operation detection (added/modified/deleted)
		const operation = await this.detectFileOperation(data);
		if (operation) return operation;

		// Tier 3: Content analysis (extract function/class names)
		const analysis = await this.analyzeContent(data.content, data.filePath);
		if (analysis) return analysis;

		// Tier 4: Fallback timestamp
		return this.timestampNaming(data);
	}
}
```

**VS Code Decoupling**: Extract from 700 LOC, remove VS Code workspace APIs, use Node.js fs/git only

**Tests**: Create `tests/unit/snapshot/SnapshotNaming.test.ts` (20-25 tests)

---

#### Component 2.3: SnapshotManager (3-4 hours)

**Source**: `apps/vscode/src/snapshot/SnapshotManager.ts` (506 LOC)

**Complexity**: Moderate - Orchestrator with dependencies on naming, deduplication, storage

**Implementation**:

```typescript
// packages/sdk/src/snapshot/SnapshotManager.ts
import { SnapshotNaming } from "./SnapshotNaming";
import { SnapshotDeduplicator } from "./SnapshotDeduplicator";
import type { StorageAdapter } from "../storage/StorageAdapter";

export class SnapshotManager {
	private naming: SnapshotNaming;
	private deduplicator: SnapshotDeduplicator;

	constructor(
		private storage: StorageAdapter,
		options?: {
			enableDeduplication?: boolean;
			namingStrategy?: "git" | "semantic" | "timestamp";
		}
	) {
		this.naming = new SnapshotNaming(options?.namingStrategy || "semantic");
		this.deduplicator = new SnapshotDeduplicator();
	}

	async create(data: {
		filePath: string;
		content: string;
		message?: string;
	}): Promise<Snapshot> {
		// 1. Hash content
		const hash = await this.deduplicator.hashContent(data.content);

		// 2. Check for duplicate
		if (await this.deduplicator.isDuplicate(data.filePath, hash)) {
			throw new Error("Duplicate snapshot detected");
		}

		// 3. Generate smart name
		const message = data.message || (await this.naming.generate(data));

		// 4. Save to storage
		const snapshot: Snapshot = {
			id: this.generateId(),
			filePath: data.filePath,
			content: data.content,
			hash,
			timestamp: new Date(),
			message,
			protected: false,
			metadata: {},
		};

		await this.storage.save(snapshot);
		await this.deduplicator.recordHash(data.filePath, hash);

		return snapshot;
	}

	// ... rest of CRUD methods
}
```

**Tests**: Update existing `tests/unit/SnapshotManager.test.ts` (30+ tests already exist)

---

### **PHASE 3: Storage Layer Migration** (8-12 hours)

**Objective**: Implement SQLite-based LocalStorage from VS Code

#### Component 3.1: LocalStorage with SQLite (6-8 hours)

**Source**: `apps/vscode/src/storage/SqliteSnapshotStorage.ts` (1,178 LOC)

**Complexity**: Complex - Database schema, migrations, diff optimization, compression

**Implementation** (following Backend Architect design):

```typescript
// packages/sdk/src/storage/LocalStorage.ts
import Database from "better-sqlite3";
import type { StorageAdapter } from "./StorageAdapter";

export class LocalStorage implements StorageAdapter {
	private db: Database.Database;

	constructor(dbPath: string) {
		this.db = new Database(dbPath);
		this.db.pragma("journal_mode = WAL"); // Performance optimization
		this.initSchema();
	}

	private initSchema(): void {
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        message TEXT,
        protected INTEGER DEFAULT 0,
        parent_id TEXT,
        storage_type TEXT DEFAULT 'full',
        compressed INTEGER DEFAULT 0,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_file_path ON snapshots(file_path);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON snapshots(timestamp);
      CREATE INDEX IF NOT EXISTS idx_content_hash ON snapshots(content_hash);
      CREATE INDEX IF NOT EXISTS idx_parent_id ON snapshots(parent_id);

      CREATE TABLE IF NOT EXISTS content_blobs (
        hash TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        compressed INTEGER DEFAULT 0,
        size INTEGER NOT NULL,
        ref_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_ref_count ON content_blobs(ref_count);
    `);
	}

	async save(snapshot: Snapshot): Promise<void> {
		const stmt = this.db.prepare(`
      INSERT INTO snapshots (
        id, file_path, content, content_hash, timestamp,
        message, protected, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

		stmt.run(
			snapshot.id,
			snapshot.filePath,
			snapshot.content,
			snapshot.hash,
			snapshot.timestamp.getTime(),
			snapshot.message || null,
			snapshot.protected ? 1 : 0,
			JSON.stringify(snapshot.metadata || {})
		);
	}

	async list(filters?: SnapshotFilters): Promise<Snapshot[]> {
		let sql = "SELECT * FROM snapshots WHERE 1=1";
		const params: any[] = [];

		if (filters?.filePath) {
			sql += " AND file_path = ?";
			params.push(filters.filePath);
		}

		if (filters?.protected !== undefined) {
			sql += " AND protected = ?";
			params.push(filters.protected ? 1 : 0);
		}

		sql += " ORDER BY timestamp DESC";

		if (filters?.limit) {
			sql += " LIMIT ?";
			params.push(filters.limit);
		}

		const stmt = this.db.prepare(sql);
		const rows = stmt.all(...params) as any[];

		return rows.map((row) => this.rowToSnapshot(row));
	}

	// ... rest of CRUD methods
}
```

**Deduplication Enhancement**:

```typescript
// Add content deduplication with content_blobs table
async saveWithDeduplication(snapshot: Snapshot): Promise<void> {
  const tx = this.db.transaction(() => {
    // 1. Check if content blob exists
    let blobStmt = this.db.prepare('SELECT hash FROM content_blobs WHERE hash = ?');
    const existing = blobStmt.get(snapshot.hash);

    if (!existing) {
      // 2. Save content blob
      const insertBlob = this.db.prepare(`
        INSERT INTO content_blobs (hash, content, size, ref_count)
        VALUES (?, ?, ?, 1)
      `);
      insertBlob.run(snapshot.hash, snapshot.content, snapshot.content.length);
    } else {
      // 3. Increment reference count
      const updateRef = this.db.prepare(`
        UPDATE content_blobs SET ref_count = ref_count + 1 WHERE hash = ?
      `);
      updateRef.run(snapshot.hash);
    }

    // 4. Save snapshot metadata (without content)
    const insertSnapshot = this.db.prepare(`
      INSERT INTO snapshots (
        id, file_path, content_hash, timestamp, message, protected, storage_type
      ) VALUES (?, ?, ?, ?, ?, ?, 'dedup')
    `);
    insertSnapshot.run(
      snapshot.id,
      snapshot.filePath,
      snapshot.hash,
      snapshot.timestamp.getTime(),
      snapshot.message,
      snapshot.protected ? 1 : 0
    );
  });

  tx();
}
```

**Tests**: Update `tests/unit/LocalStorage.test.ts` (40+ tests)

---

#### Component 3.2: Compression Utilities (1-2 hours)

**Source**:

-   `apps/vscode/src/storage/CompressionUtil.ts` (12 LOC)
-   `apps/vscode/src/storage/StreamingCompressionUtil.ts` (76 LOC)

**Implementation**:

```typescript
// packages/sdk/src/storage/compression.ts
import { gzipSync, gunzipSync } from "zlib";
import { createGzip, createGunzip } from "zlib";
import { pipeline } from "stream/promises";

export class Compression {
	static compress(content: string): Buffer {
		return gzipSync(Buffer.from(content, "utf-8"), { level: 9 });
	}

	static decompress(data: Buffer): string {
		return gunzipSync(data).toString("utf-8");
	}

	static async compressLarge(content: string): Promise<Buffer> {
		// Use streaming for files >1MB
		const chunks: Buffer[] = [];
		const gzip = createGzip({ level: 9 });

		gzip.on("data", (chunk) => chunks.push(chunk));

		return new Promise((resolve, reject) => {
			gzip.on("end", () => resolve(Buffer.concat(chunks)));
			gzip.on("error", reject);
			gzip.write(content);
			gzip.end();
		});
	}
}
```

**Tests**: Create `tests/unit/storage/compression.test.ts` (10-15 tests)

---

### **PHASE 4: Protection System Migration** (6-8 hours)

**Objective**: Migrate protection config management from VS Code

#### Component 4.1: ProtectionManager (4-5 hours)

**Source**: `apps/vscode/src/protection/ProtectionConfigManager.ts` (237 LOC)

**Implementation**:

```typescript
// packages/sdk/src/protection/ProtectionManager.ts
import { minimatch } from "minimatch";

export class ProtectionManager {
	private registry = new Map<string, ProtectedFile>();

	constructor(private config: ProtectionConfig) {
		this.loadPatterns();
	}

	protect(filePath: string, level: ProtectionLevel, reason?: string): void {
		this.registry.set(filePath, {
			path: filePath,
			level,
			reason,
			addedAt: new Date(),
		});
	}

	getProtection(filePath: string): ProtectedFile | null {
		// 1. Check direct protection
		if (this.registry.has(filePath)) {
			return this.registry.get(filePath)!;
		}

		// 2. Check pattern-based protection
		for (const rule of this.config.patterns) {
			if (minimatch(filePath, rule.pattern)) {
				return {
					path: filePath,
					level: rule.level,
					reason: rule.reason,
					addedAt: new Date(),
				};
			}
		}

		return null;
	}

	// ... rest of methods
}
```

**Tests**: Update `tests/unit/ProtectionManager.test.ts` (25+ tests exist)

---

#### Component 4.2: ConfigFileManager (2-3 hours)

**Source**: `apps/vscode/src/protection/ConfigFileManager.ts` (240 LOC)

**Implementation**: Extract glob pattern validation and matching logic

---

### **PHASE 5: Configuration System Migration** (6-8 hours)

**Objective**: Migrate config loading, merging, and validation

#### Component 5.1: ConfigurationManager (3-4 hours)

**Source**: `apps/vscode/src/config/configurationManager.ts` (374 LOC)

**Implementation**: Extract config file detection, loading, validation

#### Component 5.2: Config Loaders (2-3 hours)

**Source**: `apps/vscode/src/config/loaders.ts` (133 LOC)

**Implementation**: Multi-format support (JSON, JSON5, YAML, CJS, MJS)

#### Component 5.3: Config Merge (1-2 hours)

**Source**: `apps/vscode/src/config/merge.ts` (248 LOC)

**Implementation**: Priority-based config merging

---

### **PHASE 6: VS Code Extension Refactoring** (6-8 hours)

**Objective**: Update VS Code extension to use SDK

#### Step 6.1: Create Abstraction Interfaces (2-3 hours)

```typescript
// packages/sdk/src/abstractions/IConfirmationService.ts
export interface IConfirmationService {
	confirm(message: string, detail?: string): Promise<boolean>;
}

// packages/sdk/src/abstractions/IFileSystemService.ts
export interface IFileSystemService {
	watch(pattern: string, onChange: (uri: string) => void): Disposable;
	findFiles(include: string, exclude?: string): Promise<string[]>;
	readFile(path: string): Promise<string>;
	writeFile(path: string, content: string): Promise<void>;
}

// packages/sdk/src/abstractions/IIconProvider.ts
export interface IIconProvider {
	getIconForFile(filePath: string, metadata: SnapshotMetadata): IconResult;
}
```

#### Step 6.2: Create VS Code Adapters (2-3 hours)

```typescript
// apps/vscode/src/adapters/VSCodeConfirmationService.ts
import * as vscode from "vscode";
import type { IConfirmationService } from "@snapback/sdk";

export class VSCodeConfirmationService implements IConfirmationService {
	async confirm(message: string, detail?: string): Promise<boolean> {
		const result = await vscode.window.showInformationMessage(
			message,
			{ modal: true, detail },
			"Confirm",
			"Cancel"
		);
		return result === "Confirm";
	}
}
```

#### Step 6.3: Refactor VS Code Services (2-3 hours)

```typescript
// apps/vscode/src/services/SnapshotService.ts
// BEFORE: 524 lines of business logic
// AFTER: 50 lines delegating to SDK

import { SnapshotManager, LocalStorage } from "@snapback/sdk";
import * as path from "path";

export class SnapshotService {
	private manager: SnapshotManager;

	constructor(private context: vscode.ExtensionContext) {
		const dbPath = path.join(
			context.globalStorageUri.fsPath,
			"snapshots.db"
		);
		const storage = new LocalStorage(dbPath);
		this.manager = new SnapshotManager(storage, {
			enableDeduplication: true,
			namingStrategy: "semantic",
		});
	}

	async createSnapshot(document: vscode.TextDocument, message?: string) {
		return this.manager.create({
			filePath: document.fileName,
			content: document.getText(),
			message,
		});
	}

	async listSnapshots(filePath?: string) {
		return this.manager.list({ filePath });
	}

	// ... rest just delegates to manager
}
```

---

## 📊 Effort Estimation Summary

| Phase | Focus               | Duration    | Deliverable                    |
| ----- | ------------------- | ----------- | ------------------------------ |
| **1** | Bug Fixes           | 1-2 hours   | All tests passing              |
| **2** | Snapshot System     | 10-14 hours | Deduplication, naming, manager |
| **3** | Storage Layer       | 8-12 hours  | SQLite, compression, dedup     |
| **4** | Protection System   | 6-8 hours   | Protection manager, patterns   |
| **5** | Config System       | 6-8 hours   | Config loading, merging        |
| **6** | VS Code Integration | 6-8 hours   | Adapters, refactoring          |

**Total**: 37-52 hours (~1-2 weeks full-time, 2-4 weeks part-time)

---

## ✅ Success Criteria

### Quantitative Metrics

-   ✅ **140+ tests passing** (100% pass rate)
-   ✅ **85%+ code coverage**
-   ✅ **0 TypeScript errors**
-   ✅ **Build time <30 seconds**
-   ✅ **VS Code extension <2,500 LOC** (down from 6,000)

### Qualitative Metrics

-   ✅ **Zero VS Code dependencies** in SDK core
-   ✅ **CLI buildable in 1 day** using SDK
-   ✅ **MCP buildable in 1 day** using SDK
-   ✅ **Web dashboard** can use SDK
-   ✅ **Single source of truth** for snapshot logic

---

## 🎯 Immediate Next Steps

### RIGHT NOW (30 minutes)

1. Fix QuickLRU bug in `SnapbackClient.ts`
2. Fix "protected" reserved word in test files
3. Run `pnpm test` and verify 140+ GREEN

### TODAY (2-4 hours)

1. Start Phase 2.1: SnapshotDeduplicator migration
2. Create TDD tests first
3. Migrate implementation
4. Verify tests pass

### THIS WEEK (Days 1-3)

-   Day 1: Phase 2 (Snapshot system)
-   Day 2: Phase 3 (Storage layer)
-   Day 3: Phase 4 (Protection system)

### NEXT WEEK (Days 4-7)

-   Day 4-5: Phase 5 (Config system)
-   Day 6-7: Phase 6 (VS Code integration)

---

## 📚 Documentation Created

All agent analyses are available in `/Users/user1/WebstormProjects/SnapBack-Site/claudedocs/`:

1. **VS Code Extension Analysis** (Explore Agent)

    - Complete file inventory (32 files, 7,079 LOC)
    - Dependency graph
    - Migration complexity ratings
    - VS Code coupling assessment

2. **SDK Architecture Design** (System Architect Agent)

    - 3-layer architecture (Client → Manager → Storage)
    - Interface contracts
    - Caching strategy
    - Plugin architecture
    - Performance targets

3. **Detailed Implementation Plan** (Requirements Analyst Agent)

    - 6-phase breakdown
    - Concrete code examples
    - Measurable acceptance criteria
    - Test coverage requirements

4. **Storage Layer Architecture** (Backend Architect Agent)

    - Complete SQLite schema
    - Deduplication strategy
    - Compression approach
    - Migration utilities

5. **This Roadmap**
    - Synthesis of all findings
    - Actionable tasks with estimates
    - Success criteria
    - Timeline

---

## 🚀 ROI Validation

### Without SDK (Original Path)

-   VS Code: 6,000 LOC
-   CLI: 2,000 LOC (duplicate snapshot logic)
-   MCP: 1,500 LOC (duplicate snapshot logic)
-   Web: 3,000 LOC (duplicate snapshot logic)
-   **Total: 12,500 LOC, 6+ weeks**

### With SDK (New Path)

-   SDK: 4,000 LOC (shared logic)
-   VS Code: 2,500 LOC (uses SDK)
-   CLI: 300 LOC (uses SDK)
-   MCP: 200 LOC (uses SDK)
-   Web: 800 LOC (uses SDK)
-   **Total: 7,800 LOC, 2-3 weeks**

### Savings

-   **38% less code**
-   **50% faster delivery**
-   **1 place to fix bugs** (not 4)
-   **Single test suite** covers all platforms

---

## 💡 Key Architectural Decisions

From all agent analyses:

1. **Three-Layer Architecture**: Client → Manager → Storage
2. **Storage Adapter Pattern**: LocalStorage (SQLite), CloudStorage (API), MemoryStorage (tests)
3. **Content Deduplication**: SHA256 hashing with reference counting
4. **Abstraction Interfaces**: Clean separation between SDK and platform-specific code
5. **Caching Strategy**: Multi-level (HTTP, Query, Object)
6. **Plugin System**: Lifecycle hooks for extensibility

---

**READY TO START**: Begin with Phase 1 bug fixes immediately! 🚀
