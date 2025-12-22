# SnapBack SDK Architecture Design

**Version**: 1.0
**Date**: 2025-10-21
**Status**: Design Phase

---

## Executive Summary

This document defines the complete architecture for `@snapback/sdk` - a platform-agnostic TypeScript SDK for snapshot management and file protection. The design follows a three-layer architecture with clear separation of concerns, enabling use across VS Code extensions, CLI tools, MCP servers, and web applications.

**Core Principles**:

-   Platform-agnostic core logic
-   Clean dependency injection via adapters
-   Comprehensive caching strategy
-   Testable and mockable interfaces
-   Future extensibility through plugins

---

## 1. Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Platform Layer                              │
│  (VS Code Extension, CLI, MCP Server, Web App)                  │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│     Client Layer             │  │   Manager Layer              │
│  (SnapbackClient)            │  │  (Business Logic)            │
│                              │  │                              │
│  ┌────────────────────────┐  │  │  ┌────────────────────────┐ │
│  │  SnapshotClient        │──┼──┼─►│  SnapshotManager       │ │
│  │  (HTTP API calls)      │  │  │  │  (Local logic)         │ │
│  └────────────────────────┘  │  │  └────────────────────────┘ │
│                              │  │                              │
│  ┌────────────────────────┐  │  │  ┌────────────────────────┐ │
│  │  ProtectionClient      │──┼──┼─►│  ProtectionManager     │ │
│  │  (HTTP API calls)      │  │  │  │  (Pattern matching)    │ │
│  └────────────────────────┘  │  │  └────────────────────────┘ │
│                              │  │                              │
│  ┌────────────────────────┐  │  │                              │
│  │  ConfigClient          │  │  │                              │
│  │  (HTTP API calls)      │  │  │                              │
│  └────────────────────────┘  │  │                              │
└──────────────┬───────────────┘  └───────────┬──────────────────┘
               │                              │
               │   Shared Infrastructure      │
               │                              │
               ▼                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Storage Adapter Layer                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ LocalStorage │  │ CloudStorage │  │ MemoryStorage│          │
│  │  (SQLite)    │  │  (HTTP API)  │  │  (Testing)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Shared Services                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Cache (LRU)  │  │ HTTP Client  │  │ Error System │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

**Platform Layer**:

-   Platform-specific initialization
-   UI/CLI interactions
-   File system operations
-   Extension points

**Client Layer** (Remote Operations):

-   HTTP API communication
-   Request/response handling
-   Remote cache management
-   Network error handling

**Manager Layer** (Local Operations):

-   Business logic execution
-   Local storage operations
-   Pattern matching & validation
-   Cache coordination

**Storage Adapter Layer**:

-   Persistence abstraction
-   Multiple backend support
-   Transaction management
-   Query optimization

**Shared Services**:

-   Cross-cutting concerns
-   Caching infrastructure
-   HTTP client configuration
-   Error handling hierarchy

---

## 2. Component Dependency Graph

```
SnapbackClient
├── http: KyInstance (shared)
├── cache: QuickLRU<string, unknown> (shared)
├── snapshots: SnapshotClient
│   ├── http: KyInstance (injected)
│   └── cache: QuickLRU (injected)
├── protection: ProtectionClient
│   ├── http: KyInstance (injected)
│   └── cache: QuickLRU (injected)
└── config: ConfigClient
    ├── http: KyInstance (injected)
    └── cache: QuickLRU (injected)

SnapshotManager
├── storage: StorageAdapter (injected)
├── protectionManager: ProtectionManager (optional)
├── options: SnapshotManagerOptions
│   ├── enableDeduplication: boolean
│   ├── namingStrategy: 'git' | 'semantic' | 'timestamp'
│   ├── autoProtect: boolean
│   └── maxSnapshots: number
└── deduplicationCache: Map<string, string> (internal)

ProtectionManager
├── registry: Map<string, ProtectedFile> (internal)
├── config: ProtectionConfig (injected)
│   ├── patterns: PatternRule[]
│   ├── defaultLevel: ProtectionLevel
│   ├── enabled: boolean
│   └── autoProtectConfigs: boolean
└── patternMatcher: MinimatchPattern[] (internal)

StorageAdapter (Interface)
├── LocalStorage (SQLite implementation)
│   ├── db: Database (better-sqlite3)
│   └── preparedStatements: Map<string, Statement>
├── CloudStorage (API implementation)
│   ├── http: KyInstance
│   └── cache: QuickLRU
└── MemoryStorage (Testing implementation)
    └── store: Map<string, Snapshot>
```

### Dependency Injection Flow

```
1. Platform creates StorageAdapter
   → LocalStorage(dbPath) OR CloudStorage(apiUrl)

2. Platform creates ProtectionConfig
   → Loads from .snapbackrc or defaults

3. Platform creates ProtectionManager
   → ProtectionManager(config)

4. Platform creates SnapshotManager
   → SnapshotManager(storage, options, protectionManager?)

5. Platform creates SnapbackClient (optional for cloud sync)
   → SnapbackClient({ baseUrl, apiKey })
```

---

## 3. Interface Contracts

### 3.1 StorageAdapter Interface

```typescript
/**
 * Core storage abstraction for snapshot persistence
 * All implementations must be async-safe and transactional
 */
export interface StorageAdapter {
	/**
	 * Save a snapshot to storage (upsert operation)
	 * @throws StorageError if save fails
	 */
	save(snapshot: Snapshot): Promise<void>;

	/**
	 * Retrieve a snapshot by ID
	 * @returns Snapshot or null if not found
	 * @throws StorageError if query fails
	 */
	get(id: string): Promise<Snapshot | null>;

	/**
	 * List snapshots with optional filters
	 * @returns Array of snapshots matching filters
	 * @throws StorageError if query fails
	 */
	list(filters?: SnapshotFilters): Promise<Snapshot[]>;

	/**
	 * Delete a snapshot by ID
	 * @throws ProtectionError if snapshot is protected
	 * @throws StorageError if delete fails
	 */
	delete(id: string): Promise<void>;

	/**
	 * Batch delete snapshots (with transaction safety)
	 * @returns Number of deleted snapshots
	 * @throws ProtectionError if any snapshot is protected
	 */
	deleteBatch(ids: string[]): Promise<number>;

	/**
	 * Search snapshots by content or metadata
	 * @returns Array of matching snapshots
	 */
	search(criteria: SearchCriteria): Promise<Snapshot[]>;

	/**
	 * Get storage statistics
	 * @returns Storage size, count, and metadata
	 */
	getStats(): Promise<StorageStats>;

	/**
	 * Close storage connection and cleanup resources
	 */
	close(): Promise<void>;

	/**
	 * Health check for storage backend
	 * @returns Health status with diagnostics
	 */
	healthCheck(): Promise<HealthStatus>;
}

export interface SearchCriteria {
	content?: string;
	message?: string;
	filePath?: string;
	tags?: string[];
	limit?: number;
}

export interface StorageStats {
	totalSnapshots: number;
	totalSize: number;
	oldestSnapshot?: Date;
	newestSnapshot?: Date;
	protectedCount: number;
}

export interface HealthStatus {
	status: "healthy" | "degraded" | "unhealthy";
	message?: string;
	lastChecked: Date;
}
```

### 3.2 SnapshotManager Interface

```typescript
export interface ISnapshotManager {
	/**
	 * Create a new snapshot with deduplication
	 * @returns Created snapshot with generated ID
	 * @throws ValidationError if data is invalid
	 * @throws StorageError if save fails
	 */
	create(data: CreateSnapshotData): Promise<Snapshot>;

	/**
	 * List snapshots with filters
	 * @returns Filtered snapshot list
	 */
	list(filters?: SnapshotFilters): Promise<Snapshot[]>;

	/**
	 * Get a specific snapshot by ID
	 * @returns Snapshot or null if not found
	 */
	get(id: string): Promise<Snapshot | null>;

	/**
	 * Delete a snapshot with protection check
	 * @throws ProtectionError if snapshot is protected
	 * @throws NotFoundError if snapshot doesn't exist
	 */
	delete(id: string): Promise<void>;

	/**
	 * Restore snapshot content
	 * @returns Restoration result with content and metadata
	 */
	restore(id: string): Promise<RestoreResult>;

	/**
	 * Mark snapshot as protected
	 */
	protect(id: string): Promise<void>;

	/**
	 * Remove protection from snapshot
	 */
	unprotect(id: string): Promise<void>;

	/**
	 * Search snapshots by content/metadata
	 */
	search(criteria: SearchCriteria): Promise<Snapshot[]>;

	/**
	 * Update snapshot metadata
	 */
	update(id: string, data: UpdateSnapshotData): Promise<Snapshot>;

	/**
	 * Get deduplication statistics
	 */
	getDeduplicationStats(): DeduplicationStats;

	/**
	 * Cleanup old snapshots based on retention policy
	 */
	cleanup(policy: CleanupPolicy): Promise<number>;
}

export interface CreateSnapshotData {
	filePath: string;
	content: string;
	message?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
}

export interface UpdateSnapshotData {
	message?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
}

export interface RestoreResult {
	success: boolean;
	content: string;
	snapshot: Snapshot;
	warnings?: string[];
}

export interface DeduplicationStats {
	totalSnapshots: number;
	uniqueContents: number;
	spaceSaved: number;
	deduplicationRatio: number;
}

export interface CleanupPolicy {
	maxAge?: number; // milliseconds
	maxCount?: number;
	keepProtected: boolean;
	dryRun?: boolean;
}
```

### 3.3 ProtectionManager Interface

```typescript
export interface IProtectionManager {
	/**
	 * Add file protection
	 * @throws ValidationError if path is invalid
	 */
	protect(filePath: string, level: ProtectionLevel, reason?: string): void;

	/**
	 * Remove file protection
	 */
	unprotect(filePath: string): void;

	/**
	 * Get protection info for a file (with pattern matching)
	 * @returns ProtectedFile or null if not protected
	 */
	getProtection(filePath: string): ProtectedFile | null;

	/**
	 * Check if file is protected (includes patterns)
	 */
	isProtected(filePath: string): boolean;

	/**
	 * Get protection level for file
	 */
	getLevel(filePath: string): ProtectionLevel | null;

	/**
	 * List all protected files
	 */
	listProtected(filters?: ProtectionFilters): ProtectedFile[];

	/**
	 * Update protection level
	 */
	updateLevel(filePath: string, level: ProtectionLevel): void;

	/**
	 * Get current protection configuration
	 */
	getConfig(): ProtectionConfig;

	/**
	 * Update protection configuration
	 */
	updateConfig(config: Partial<ProtectionConfig>): void;

	/**
	 * Add a pattern rule
	 */
	addPattern(pattern: PatternRule): void;

	/**
	 * Remove a pattern rule
	 */
	removePattern(pattern: string): void;

	/**
	 * Test if a path matches any pattern
	 */
	matchesPattern(filePath: string): PatternMatch | null;

	/**
	 * Bulk protect files matching pattern
	 */
	protectPattern(pattern: string, level: ProtectionLevel): number;

	/**
	 * Export protection registry for persistence
	 */
	export(): SerializedRegistry;

	/**
	 * Import protection registry
	 */
	import(data: SerializedRegistry): void;
}

export interface ProtectionFilters {
	level?: ProtectionLevel;
	pattern?: string;
	reason?: string;
}

export interface PatternMatch {
	pattern: string;
	level: ProtectionLevel;
	reason?: string;
}

export interface SerializedRegistry {
	version: string;
	files: ProtectedFile[];
	patterns: PatternRule[];
	config: ProtectionConfig;
	exportedAt: Date;
}
```

### 3.4 Client Layer Interfaces

```typescript
export interface ISnapshotClient {
	/**
	 * Create snapshot via API
	 */
	create(data: CreateSnapshotRequest): Promise<Snapshot>;

	/**
	 * List snapshots from API (with caching)
	 */
	list(filters?: SnapshotFilters): Promise<Snapshot[]>;

	/**
	 * Get snapshot from API (with caching)
	 */
	get(id: string, options?: CacheOptions): Promise<Snapshot>;

	/**
	 * Delete snapshot via API (with cache invalidation)
	 */
	delete(id: string): Promise<void>;

	/**
	 * Restore snapshot via API
	 */
	restore(id: string): Promise<SnapshotRestoreResult>;

	/**
	 * Update snapshot via API (with cache invalidation)
	 */
	update(id: string, data: UpdateSnapshotRequest): Promise<Snapshot>;

	/**
	 * Sync local snapshots to cloud
	 */
	sync(localSnapshots: Snapshot[]): Promise<SyncResult>;
}

export interface IProtectionClient {
	/**
	 * Protect file via API
	 */
	protect(
		path: string,
		level: ProtectionLevel,
		reason?: string
	): Promise<ProtectedFile>;

	/**
	 * Unprotect file via API
	 */
	unprotect(path: string): Promise<void>;

	/**
	 * Get protection status from API (with caching)
	 */
	get(path: string, options?: CacheOptions): Promise<ProtectedFile | null>;

	/**
	 * List protected files from API (with caching)
	 */
	list(filters?: ProtectionFilters): Promise<ProtectedFile[]>;

	/**
	 * Update protection via API
	 */
	update(
		path: string,
		level: ProtectionLevel,
		reason?: string
	): Promise<ProtectedFile>;

	/**
	 * Sync local protection config to cloud
	 */
	syncConfig(config: ProtectionConfig): Promise<void>;
}

export interface CacheOptions {
	bypassCache?: boolean;
	ttl?: number; // milliseconds
}

export interface SyncResult {
	uploaded: number;
	updated: number;
	conflicts: number;
	errors: ConflictError[];
}

export interface ConflictError {
	snapshotId: string;
	reason: string;
	localVersion: Snapshot;
	remoteVersion: Snapshot;
}
```

---

## 4. Storage Strategy

### 4.1 LocalStorage (SQLite)

**Schema Design**:

```sql
-- Core snapshots table
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  message TEXT,
  is_protected BOOLEAN DEFAULT 0,
  metadata TEXT, -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Content deduplication table
CREATE TABLE snapshot_contents (
  hash TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  ref_count INTEGER DEFAULT 1
);

-- Protection registry table
CREATE TABLE protected_files (
  path TEXT PRIMARY KEY,
  level TEXT NOT NULL CHECK(level IN ('watch', 'warn', 'block')),
  reason TEXT,
  pattern TEXT,
  added_at INTEGER NOT NULL
);

-- Pattern rules table
CREATE TABLE pattern_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern TEXT NOT NULL UNIQUE,
  level TEXT NOT NULL CHECK(level IN ('watch', 'warn', 'block')),
  reason TEXT,
  enabled BOOLEAN DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- File states for snapshot restoration
CREATE TABLE snapshot_files (
  snapshot_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('add', 'modify', 'delete')),
  PRIMARY KEY (snapshot_id, file_path),
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE,
  FOREIGN KEY (content_hash) REFERENCES snapshot_contents(hash)
);

-- Tags for organization
CREATE TABLE snapshot_tags (
  snapshot_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, tag),
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_snapshots_timestamp ON snapshots(timestamp);
CREATE INDEX idx_snapshots_file_path ON snapshots(file_path);
CREATE INDEX idx_snapshots_protected ON snapshots(is_protected);
CREATE INDEX idx_snapshots_hash ON snapshots(content_hash);
CREATE INDEX idx_snapshot_tags_tag ON snapshot_tags(tag);
CREATE INDEX idx_protected_files_level ON protected_files(level);

-- Full-text search for content
CREATE VIRTUAL TABLE snapshot_search USING fts5(
  id UNINDEXED,
  message,
  content,
  tags
);
```

**Implementation Features**:

-   Prepared statement caching
-   Transaction support for batch operations
-   Content deduplication via hash-based storage
-   Reference counting for garbage collection
-   Full-text search capabilities
-   Automatic index maintenance

### 4.2 CloudStorage (HTTP API)

**Features**:

-   HTTP client with retry logic (p-retry)
-   Response caching with TTL
-   Optimistic concurrency control
-   Conflict resolution strategies
-   Rate limiting handling
-   Connection pooling

**Cache Strategy**:

```typescript
// Cache keys with semantic namespacing
const CACHE_KEYS = {
	snapshot: (id: string) => `snapshot:${id}`,
	snapshotList: (filters: string) => `snapshots:${filters}`,
	protection: (path: string) => `protection:${path}`,
	protectionList: (level?: string) => `protections:${level || "all"}`,
};

// TTL configuration
const CACHE_TTL = {
	snapshot: 5 * 60 * 1000, // 5 minutes
	snapshotList: 1 * 60 * 1000, // 1 minute
	protection: 10 * 60 * 1000, // 10 minutes
	protectionList: 5 * 60 * 1000, // 5 minutes
};
```

### 4.3 MemoryStorage (Testing)

**Features**:

-   In-memory Map-based storage
-   No persistence
-   Instant operations
-   Reset capability for test isolation
-   Snapshot/restore for test fixtures

```typescript
export class MemoryStorage implements StorageAdapter {
	private snapshots = new Map<string, Snapshot>();
	private contents = new Map<string, string>();

	reset(): void {
		this.snapshots.clear();
		this.contents.clear();
	}

	snapshot(): Map<string, Snapshot> {
		return new Map(this.snapshots);
	}

	restore(state: Map<string, Snapshot>): void {
		this.snapshots = new Map(state);
	}
}
```

---

## 5. Caching Strategy

### 5.1 Cache Architecture

```
┌────────────────────────────────────────────────────┐
│           Application Layer                        │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│         Cache Coordinator                          │
│  - Cache invalidation logic                        │
│  - Multi-level cache strategy                      │
│  - Cache warming                                   │
└─────────┬─────────────┬─────────────┬──────────────┘
          │             │             │
          ▼             ▼             ▼
┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│  HTTP Cache  │ │ Query Cache │ │ Object Cache │
│  (Response)  │ │  (Results)  │ │  (Entities)  │
└──────────────┘ └─────────────┘ └──────────────┘
     │                 │               │
     └─────────────────┴───────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │    QuickLRU      │
              │  (maxSize: 1000) │
              └──────────────────┘
```

### 5.2 Cache Types

**1. HTTP Response Cache** (Client Layer):

```typescript
class HttpCacheStrategy {
	constructor(private cache: QuickLRU<string, unknown>) {}

	async getCached<T>(
		key: string,
		fetcher: () => Promise<T>,
		ttl: number
	): Promise<T> {
		const cached = this.cache.get(key) as CachedEntry<T> | undefined;

		if (cached && Date.now() - cached.timestamp < ttl) {
			return cached.data;
		}

		const data = await fetcher();
		this.cache.set(key, { data, timestamp: Date.now() });
		return data;
	}

	invalidate(pattern: string | RegExp): void {
		// Remove all keys matching pattern
		for (const key of this.cache.keys()) {
			if (
				typeof pattern === "string"
					? key.startsWith(pattern)
					: pattern.test(key)
			) {
				this.cache.delete(key);
			}
		}
	}
}
```

**2. Query Result Cache** (Manager Layer):

```typescript
class QueryCacheStrategy {
	private cache = new Map<string, CachedQuery>();

	getCached<T>(
		query: QueryDescriptor,
		executor: () => Promise<T>
	): Promise<T> {
		const key = this.hashQuery(query);
		const cached = this.cache.get(key);

		if (cached && !this.isStale(cached, query)) {
			return Promise.resolve(cached.result as T);
		}

		return this.executeAndCache(key, executor);
	}

	private isStale(cached: CachedQuery, query: QueryDescriptor): boolean {
		// Check if query results might have changed
		return this.hasDependencyChanged(cached.dependencies);
	}
}
```

**3. Object Cache** (Deduplication):

```typescript
class DeduplicationCache {
	private hashToContent = new Map<string, string>();
	private refCounts = new Map<string, number>();

	store(content: string): string {
		const hash = this.hash(content);

		if (!this.hashToContent.has(hash)) {
			this.hashToContent.set(hash, content);
			this.refCounts.set(hash, 0);
		}

		this.refCounts.set(hash, (this.refCounts.get(hash) || 0) + 1);
		return hash;
	}

	retrieve(hash: string): string | null {
		return this.hashToContent.get(hash) || null;
	}

	release(hash: string): void {
		const count = (this.refCounts.get(hash) || 0) - 1;

		if (count <= 0) {
			this.hashToContent.delete(hash);
			this.refCounts.delete(hash);
		} else {
			this.refCounts.set(hash, count);
		}
	}

	private hash(content: string): string {
		return crypto.createHash("sha256").update(content).digest("hex");
	}
}
```

### 5.3 Cache Invalidation Rules

```typescript
const INVALIDATION_RULES = {
	// Snapshot operations
	"snapshot.create": ["snapshots:*", "snapshot_search:*"],
	"snapshot.update": [(id: string) => `snapshot:${id}`, "snapshots:*"],
	"snapshot.delete": [(id: string) => `snapshot:${id}`, "snapshots:*"],
	"snapshot.protect": [(id: string) => `snapshot:${id}`, "snapshots:*"],

	// Protection operations
	"protection.add": [(path: string) => `protection:${path}`, "protections:*"],
	"protection.remove": [
		(path: string) => `protection:${path}`,
		"protections:*",
	],
	"protection.update": [
		(path: string) => `protection:${path}`,
		"protections:*",
	],

	// Pattern operations
	"pattern.add": ["protections:*"],
	"pattern.remove": ["protections:*"],
};
```

### 5.4 Cache Warming Strategy

```typescript
class CacheWarmer {
	async warmCache(priorities: CacheWarmPriority[]): Promise<void> {
		// Parallel warm high-priority caches
		await Promise.all([
			this.warmProtectionConfig(),
			this.warmRecentSnapshots(),
			this.warmProtectedFiles(),
		]);

		// Sequential warm lower-priority caches
		for (const priority of priorities.filter((p) => p.level === "low")) {
			await this.warmByPriority(priority);
		}
	}

	private async warmProtectionConfig(): Promise<void> {
		// Pre-load protection patterns and config
		await this.protectionManager.getConfig();
		await this.protectionManager.listProtected();
	}

	private async warmRecentSnapshots(): Promise<void> {
		// Pre-load most recent snapshots
		const recent = await this.snapshotManager.list({
			limit: 50,
			sortBy: "timestamp",
			sortOrder: "desc",
		});

		// Cache individual snapshots
		for (const snapshot of recent) {
			this.cache.set(`snapshot:${snapshot.id}`, snapshot);
		}
	}
}
```

---

## 6. Error Handling

### 6.1 Error Hierarchy

```typescript
/**
 * Base error class for all SDK errors
 */
export class SnapbackError extends Error {
	constructor(
		message: string,
		public code: string,
		public context?: Record<string, unknown>
	) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			context: this.context,
		};
	}
}

/**
 * Storage-related errors
 */
export class StorageError extends SnapbackError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, "STORAGE_ERROR", context);
	}
}

export class StorageConnectionError extends StorageError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, { ...context });
		this.code = "STORAGE_CONNECTION_ERROR";
	}
}

export class StorageTransactionError extends StorageError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, { ...context });
		this.code = "STORAGE_TRANSACTION_ERROR";
	}
}

/**
 * Protection-related errors
 */
export class ProtectionError extends SnapbackError {
	constructor(
		message: string,
		public level: ProtectionLevel,
		public filePath: string,
		context?: Record<string, unknown>
	) {
		super(message, "PROTECTION_ERROR", { level, filePath, ...context });
	}
}

export class ProtectionBlockError extends ProtectionError {
	constructor(filePath: string, reason?: string) {
		super(
			`File is protected and cannot be modified: ${filePath}`,
			"block",
			filePath,
			{ reason }
		);
		this.code = "PROTECTION_BLOCK_ERROR";
	}
}

/**
 * Validation errors
 */
export class ValidationError extends SnapbackError {
	constructor(
		message: string,
		public field: string,
		public value: unknown,
		context?: Record<string, unknown>
	) {
		super(message, "VALIDATION_ERROR", { field, value, ...context });
	}
}

/**
 * Network errors
 */
export class NetworkError extends SnapbackError {
	constructor(
		message: string,
		public statusCode?: number,
		public response?: unknown,
		context?: Record<string, unknown>
	) {
		super(message, "NETWORK_ERROR", { statusCode, response, ...context });
	}
}

export class RateLimitError extends NetworkError {
	constructor(public retryAfter: number, context?: Record<string, unknown>) {
		super(
			`Rate limit exceeded, retry after ${retryAfter}ms`,
			429,
			undefined,
			{
				retryAfter,
				...context,
			}
		);
		this.code = "RATE_LIMIT_ERROR";
	}
}

/**
 * Not found errors
 */
export class NotFoundError extends SnapbackError {
	constructor(
		public resourceType: string,
		public resourceId: string,
		context?: Record<string, unknown>
	) {
		super(`${resourceType} not found: ${resourceId}`, "NOT_FOUND_ERROR", {
			resourceType,
			resourceId,
			...context,
		});
	}
}

/**
 * Conflict errors (for sync)
 */
export class ConflictError extends SnapbackError {
	constructor(
		message: string,
		public localVersion: unknown,
		public remoteVersion: unknown,
		context?: Record<string, unknown>
	) {
		super(message, "CONFLICT_ERROR", {
			localVersion,
			remoteVersion,
			...context,
		});
	}
}
```

### 6.2 Error Recovery Strategies

```typescript
interface ErrorRecoveryStrategy {
	canRecover(error: Error): boolean;
	recover(error: Error, context: OperationContext): Promise<RecoveryResult>;
}

class RetryStrategy implements ErrorRecoveryStrategy {
	canRecover(error: Error): boolean {
		return (
			error instanceof NetworkError &&
			error.statusCode &&
			[408, 429, 500, 502, 503, 504].includes(error.statusCode)
		);
	}

	async recover(
		error: Error,
		context: OperationContext
	): Promise<RecoveryResult> {
		const networkError = error as NetworkError;
		const delay = this.calculateBackoff(context.attemptNumber);

		await new Promise((resolve) => setTimeout(resolve, delay));

		return {
			shouldRetry: context.attemptNumber < context.maxRetries,
			delay,
		};
	}

	private calculateBackoff(attempt: number): number {
		return Math.min(1000 * Math.pow(2, attempt), 30000);
	}
}

class CacheFallbackStrategy implements ErrorRecoveryStrategy {
	canRecover(error: Error): boolean {
		return error instanceof NetworkError;
	}

	async recover(
		error: Error,
		context: OperationContext
	): Promise<RecoveryResult> {
		const cached = await context.cache.get(context.cacheKey);

		if (cached) {
			return {
				shouldRetry: false,
				result: cached,
				warning: "Using stale cache data due to network error",
			};
		}

		return { shouldRetry: false };
	}
}

class ErrorRecoveryCoordinator {
	private strategies: ErrorRecoveryStrategy[] = [
		new RetryStrategy(),
		new CacheFallbackStrategy(),
	];

	async handleError(
		error: Error,
		context: OperationContext
	): Promise<RecoveryResult> {
		for (const strategy of this.strategies) {
			if (strategy.canRecover(error)) {
				const result = await strategy.recover(error, context);
				if (result.shouldRetry || result.result) {
					return result;
				}
			}
		}

		throw error; // No recovery possible
	}
}
```

### 6.3 Error Propagation

```typescript
/**
 * Error boundary for async operations
 */
async function withErrorBoundary<T>(
	operation: () => Promise<T>,
	errorHandler?: (error: Error) => void
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		// Transform unknown errors to SnapbackError
		const snapbackError =
			error instanceof SnapbackError
				? error
				: new SnapbackError(
						error instanceof Error ? error.message : String(error),
						"UNKNOWN_ERROR",
						{ originalError: error }
				  );

		// Log error with context
		logger.error(snapbackError.message, snapbackError.toJSON());

		// Call custom error handler if provided
		errorHandler?.(snapbackError);

		throw snapbackError;
	}
}

/**
 * Safe wrapper for operations that might fail
 */
async function trySafe<T>(
	operation: () => Promise<T>,
	fallback: T
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		logger.warn("Operation failed, using fallback", { error });
		return fallback;
	}
}
```

---

## 7. Plugin Architecture

### 7.1 Extension Points

```typescript
/**
 * Plugin system for SDK extensibility
 */
export interface SnapbackPlugin {
	name: string;
	version: string;

	/**
	 * Initialize plugin with SDK context
	 */
	initialize(context: PluginContext): Promise<void>;

	/**
	 * Cleanup plugin resources
	 */
	dispose(): Promise<void>;
}

export interface PluginContext {
	sdk: SnapbackClient;
	snapshotManager: SnapshotManager;
	protectionManager: ProtectionManager;
	storage: StorageAdapter;
	logger: Logger;
	config: PluginConfig;

	/**
	 * Register hooks for lifecycle events
	 */
	hooks: PluginHooks;

	/**
	 * Platform-specific context
	 */
	platform: PlatformContext;
}

export interface PluginHooks {
	/**
	 * Before snapshot creation
	 */
	onBeforeCreate(handler: BeforeCreateHandler): void;

	/**
	 * After snapshot creation
	 */
	onAfterCreate(handler: AfterCreateHandler): void;

	/**
	 * Before snapshot deletion
	 */
	onBeforeDelete(handler: BeforeDeleteHandler): void;

	/**
	 * Before file protection
	 */
	onBeforeProtect(handler: BeforeProtectHandler): void;

	/**
	 * On protection violation
	 */
	onProtectionViolation(handler: ProtectionViolationHandler): void;

	/**
	 * On snapshot restore
	 */
	onRestore(handler: RestoreHandler): void;

	/**
	 * On sync conflict
	 */
	onConflict(handler: ConflictHandler): void;
}

export interface PlatformContext {
	type: "vscode" | "cli" | "mcp" | "web";
	version: string;
	capabilities: PlatformCapabilities;

	/**
	 * Platform-specific services
	 */
	services: {
		filesystem?: FileSystemService;
		ui?: UIService;
		notifications?: NotificationService;
	};
}

export interface PlatformCapabilities {
	hasFileSystem: boolean;
	hasUI: boolean;
	hasNotifications: boolean;
	canReadFiles: boolean;
	canWriteFiles: boolean;
}
```

### 7.2 Example Plugins

**1. Telemetry Plugin**:

```typescript
export class TelemetryPlugin implements SnapbackPlugin {
	name = "telemetry";
	version = "1.0.0";

	private analytics?: AnalyticsService;

	async initialize(context: PluginContext): Promise<void> {
		this.analytics = new AnalyticsService(context.config.telemetry);

		// Track snapshot operations
		context.hooks.onAfterCreate((snapshot) => {
			this.analytics?.track("snapshot.created", {
				id: snapshot.id,
				size: snapshot.fileContents?.length || 0,
			});
		});

		// Track protection violations
		context.hooks.onProtectionViolation((violation) => {
			this.analytics?.track("protection.violated", {
				level: violation.level,
				filePath: violation.filePath,
			});
		});
	}

	async dispose(): Promise<void> {
		await this.analytics?.flush();
	}
}
```

**2. Git Integration Plugin**:

```typescript
export class GitIntegrationPlugin implements SnapbackPlugin {
	name = "git-integration";
	version = "1.0.0";

	async initialize(context: PluginContext): Promise<void> {
		// Auto-snapshot on git operations
		context.hooks.onBeforeCreate(async (data) => {
			const gitInfo = await this.getGitInfo(data.filePath);

			return {
				...data,
				metadata: {
					...data.metadata,
					gitBranch: gitInfo.branch,
					gitCommit: gitInfo.commit,
				},
			};
		});
	}

	private async getGitInfo(filePath: string) {
		// Git integration logic
		return {
			branch: await this.getCurrentBranch(),
			commit: await this.getHeadCommit(),
		};
	}

	async dispose(): Promise<void> {
		// Cleanup
	}
}
```

**3. VS Code Integration Plugin**:

```typescript
export class VSCodePlugin implements SnapbackPlugin {
	name = "vscode-integration";
	version = "1.0.0";

	async initialize(context: PluginContext): Promise<void> {
		if (context.platform.type !== "vscode") {
			throw new Error("This plugin requires VS Code");
		}

		const { ui, notifications } = context.platform.services;

		// Show protection warnings in VS Code
		context.hooks.onProtectionViolation((violation) => {
			if (violation.level === "warn") {
				notifications?.showWarning(
					`File ${violation.filePath} is protected. Create snapshot?`,
					["Create Snapshot", "Override"]
				);
			} else if (violation.level === "block") {
				notifications?.showError(
					`File ${violation.filePath} is blocked. Snapshot required.`
				);
			}
		});

		// Show restore preview
		context.hooks.onRestore(async (result) => {
			if (ui) {
				await ui.showDiff(result.snapshot, result.currentContent);
			}
		});
	}

	async dispose(): Promise<void> {
		// Cleanup
	}
}
```

### 7.3 Plugin Registry

```typescript
export class PluginRegistry {
	private plugins = new Map<string, SnapbackPlugin>();
	private initialized = new Set<string>();

	async register(
		plugin: SnapbackPlugin,
		context: PluginContext
	): Promise<void> {
		if (this.plugins.has(plugin.name)) {
			throw new Error(`Plugin ${plugin.name} is already registered`);
		}

		this.plugins.set(plugin.name, plugin);
		await plugin.initialize(context);
		this.initialized.add(plugin.name);
	}

	async unregister(name: string): Promise<void> {
		const plugin = this.plugins.get(name);
		if (!plugin) return;

		if (this.initialized.has(name)) {
			await plugin.dispose();
			this.initialized.delete(name);
		}

		this.plugins.delete(name);
	}

	get(name: string): SnapbackPlugin | undefined {
		return this.plugins.get(name);
	}

	getAll(): SnapbackPlugin[] {
		return Array.from(this.plugins.values());
	}

	async disposeAll(): Promise<void> {
		const disposePromises = Array.from(this.plugins.values()).map((p) =>
			p.dispose()
		);
		await Promise.all(disposePromises);
		this.plugins.clear();
		this.initialized.clear();
	}
}
```

---

## 8. Data Flow Diagrams

### 8.1 Snapshot Creation Flow

```
┌────────────┐
│  Platform  │
│ (VS Code)  │
└─────┬──────┘
      │
      │ create({ filePath, content, message })
      ▼
┌──────────────────┐
│ SnapshotManager  │
│                  │
│ 1. Validate data │
│ 2. Check         │
│    protection    │──────► ProtectionManager.isProtected()
│ 3. Compute hash  │
│ 4. Deduplicate   │──────► DeduplicationCache.store()
│ 5. Generate name │──────► NamingStrategy.generate()
│ 6. Create        │
│    snapshot obj  │
└─────┬────────────┘
      │
      │ save(snapshot)
      ▼
┌──────────────────┐
│ StorageAdapter   │
│  (LocalStorage)  │
│                  │
│ 1. Begin         │
│    transaction   │
│ 2. Insert        │
│    snapshot      │
│ 3. Update refs   │
│ 4. Commit        │
└─────┬────────────┘
      │
      │ Success
      ▼
┌──────────────────┐
│  Cache           │
│  Invalidation    │
│                  │
│ - Clear list     │
│ - Update stats   │
└──────────────────┘
      │
      │ Return snapshot
      ▼
┌────────────┐
│  Platform  │
└────────────┘
```

### 8.2 Snapshot Restoration Flow

```
┌────────────┐
│  Platform  │
└─────┬──────┘
      │
      │ restore(snapshotId)
      ▼
┌──────────────────┐
│ SnapshotManager  │
│                  │
│ 1. Get snapshot  │──────► storage.get(id)
│ 2. Validate      │
│    exists        │
└─────┬────────────┘
      │
      │ Get content
      ▼
┌──────────────────┐
│ StorageAdapter   │
│                  │
│ 1. Retrieve hash │
│ 2. Lookup content│──────► snapshot_contents table
│ 3. Return data   │
└─────┬────────────┘
      │
      │ content
      ▼
┌──────────────────┐
│ SnapshotManager  │
│                  │
│ 1. Prepare       │
│    result        │
│ 2. Add metadata  │
└─────┬────────────┘
      │
      │ Return { success, content, snapshot }
      ▼
┌────────────┐
│  Platform  │
│            │
│ 1. Show    │
│    preview │
│ 2. Confirm │
│ 3. Write   │
│    to disk │
└────────────┘
```

### 8.3 Protection Check Flow

```
┌────────────┐
│  Platform  │
│ (on save)  │
└─────┬──────┘
      │
      │ isProtected(filePath)
      ▼
┌──────────────────┐
│ProtectionManager │
│                  │
│ 1. Check exact   │──────► registry.get(filePath)
│    match         │
└─────┬────────────┘
      │
      │ Not found
      ▼
┌──────────────────┐
│ProtectionManager │
│                  │
│ 2. Check pattern │──────► PatternMatcher.match()
│    rules         │
└─────┬────────────┘
      │
      │ Match found (level: 'warn')
      ▼
┌──────────────────┐
│  Platform        │
│                  │
│ 1. Show warning  │
│    notification  │
│ 2. Get user      │
│    choice        │
└─────┬────────────┘
      │
      │ User: "Create Snapshot"
      ▼
┌──────────────────┐
│ SnapshotManager  │
│                  │
│ create()         │
└─────┬────────────┘
      │
      │ Snapshot created
      ▼
┌──────────────────┐
│  Platform        │
│                  │
│ Allow save       │
└──────────────────┘
```

### 8.4 Sync Flow (Local ↔ Cloud)

```
┌────────────┐
│  Platform  │
└─────┬──────┘
      │
      │ sync()
      ▼
┌──────────────────┐
│ SyncCoordinator  │
│                  │
│ 1. Get local     │──────► SnapshotManager.list()
│    snapshots     │
│ 2. Get remote    │──────► SnapshotClient.list()
│    snapshots     │
│ 3. Compare       │
│    versions      │
└─────┬────────────┘
      │
      │ Differences found
      ▼
┌──────────────────┐
│ SyncCoordinator  │
│                  │
│ For each diff:   │
│ - Upload new     │──────► SnapshotClient.create()
│ - Download new   │──────► SnapshotClient.get()
│ - Resolve        │──────► ConflictResolver.resolve()
│   conflicts      │
└─────┬────────────┘
      │
      │ Upload local snapshot
      ▼
┌──────────────────┐
│ SnapshotClient   │
│                  │
│ 1. POST to API   │──────► HTTP POST /snapshots
│ 2. Handle        │
│    response      │
│ 3. Update cache  │
└─────┬────────────┘
      │
      │ Download remote snapshot
      ▼
┌──────────────────┐
│ SnapshotClient   │
│                  │
│ 1. GET from API  │──────► HTTP GET /snapshots/:id
│ 2. Save locally  │──────► SnapshotManager.create()
│ 3. Update cache  │
└─────┬────────────┘
      │
      │ Conflict detected
      ▼
┌──────────────────┐
│ConflictResolver  │
│                  │
│ Strategy:        │
│ - Keep local     │
│ - Keep remote    │
│ - Merge          │
│ - Manual         │
└─────┬────────────┘
      │
      │ Resolution
      ▼
┌────────────┐
│  Platform  │
│            │
│ Show result│
└────────────┘
```

---

## 9. Performance Optimization Points

### 9.1 Database Optimization

```typescript
class LocalStorageOptimizations {
	private db: Database.Database;
	private stmtCache = new Map<string, Database.Statement>();

	/**
	 * Prepared statement caching
	 */
	private prepare(sql: string): Database.Statement {
		if (!this.stmtCache.has(sql)) {
			this.stmtCache.set(sql, this.db.prepare(sql));
		}
		return this.stmtCache.get(sql)!;
	}

	/**
	 * Batch operations with transaction
	 */
	async batchInsert(snapshots: Snapshot[]): Promise<void> {
		const insert = this.prepare(`
      INSERT INTO snapshots (id, timestamp, file_path, content_hash, message, is_protected)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

		const transaction = this.db.transaction((items: Snapshot[]) => {
			for (const snapshot of items) {
				insert.run(
					snapshot.id,
					snapshot.timestamp,
					snapshot.files?.[0] || "",
					this.hashContent(snapshot),
					snapshot.meta?.message || null,
					snapshot.meta?.protected || 0
				);
			}
		});

		transaction(snapshots);
	}

	/**
	 * Index hints for query optimization
	 */
	async listOptimized(filters: SnapshotFilters): Promise<Snapshot[]> {
		let sql = "SELECT * FROM snapshots INDEXED BY ";

		if (filters.filePath) {
			sql += "idx_snapshots_file_path";
		} else if (filters.protected !== undefined) {
			sql += "idx_snapshots_protected";
		} else {
			sql += "idx_snapshots_timestamp";
		}

		sql += " WHERE 1=1";

		// Add filter conditions
		if (filters.filePath) {
			sql += " AND file_path = ?";
		}

		return this.db.prepare(sql).all(/* params */);
	}

	/**
	 * Analyze and optimize query plans
	 */
	analyzeQueryPlan(sql: string): void {
		const plan = this.db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all();
		console.log("Query plan:", plan);
	}
}
```

### 9.2 Deduplication Optimization

```typescript
class DeduplicationOptimizer {
	private hashCache = new Map<string, string>();

	/**
	 * Incremental hashing for large files
	 */
	async hashContent(content: string): Promise<string> {
		// Use cached hash if content unchanged
		const quickHash = this.quickHash(content);
		if (this.hashCache.has(quickHash)) {
			return this.hashCache.get(quickHash)!;
		}

		// Compute full hash
		const hash = crypto.createHash("sha256").update(content).digest("hex");
		this.hashCache.set(quickHash, hash);

		return hash;
	}

	/**
	 * Quick hash for cache lookup
	 */
	private quickHash(content: string): string {
		return `${content.length}:${content.slice(0, 100)}:${content.slice(
			-100
		)}`;
	}

	/**
	 * Delta compression for similar content
	 */
	async storeDelta(
		baseHash: string,
		newContent: string
	): Promise<DeltaResult> {
		const baseContent = await this.retrieveContent(baseHash);

		if (this.isSimilar(baseContent, newContent)) {
			const delta = this.computeDelta(baseContent, newContent);

			if (delta.size < newContent.length * 0.5) {
				return {
					type: "delta",
					baseHash,
					delta,
					compressionRatio: delta.size / newContent.length,
				};
			}
		}

		return {
			type: "full",
			content: newContent,
		};
	}

	/**
	 * Similarity check (Levenshtein distance)
	 */
	private isSimilar(a: string, b: string): boolean {
		const threshold = 0.8;
		const distance = this.levenshteinDistance(a, b);
		const similarity = 1 - distance / Math.max(a.length, b.length);
		return similarity >= threshold;
	}
}
```

### 9.3 Cache Optimization

```typescript
class CacheOptimizer {
	/**
	 * Adaptive cache sizing based on usage patterns
	 */
	adjustCacheSize(stats: CacheStats): number {
		const hitRate = stats.hits / (stats.hits + stats.misses);

		if (hitRate < 0.5) {
			// Low hit rate, increase cache size
			return Math.min(stats.maxSize * 1.5, 5000);
		} else if (hitRate > 0.9) {
			// High hit rate, can reduce cache size
			return Math.max(stats.maxSize * 0.8, 500);
		}

		return stats.maxSize;
	}

	/**
	 * Predictive cache warming
	 */
	async predictAndWarm(history: AccessHistory[]): Promise<void> {
		// Analyze access patterns
		const patterns = this.analyzePatterns(history);

		// Pre-fetch likely next accesses
		for (const prediction of patterns.predictions) {
			if (prediction.confidence > 0.7) {
				await this.warmCache(prediction.key);
			}
		}
	}

	/**
	 * Cache partitioning by access frequency
	 */
	partitionCache(): {
		hot: QuickLRU<string, unknown>;
		warm: QuickLRU<string, unknown>;
		cold: QuickLRU<string, unknown>;
	} {
		return {
			hot: new QuickLRU({ maxSize: 100 }), // Frequent access
			warm: new QuickLRU({ maxSize: 500 }), // Moderate access
			cold: new QuickLRU({ maxSize: 400 }), // Rare access
		};
	}
}
```

### 9.4 Network Optimization

```typescript
class NetworkOptimizer {
	/**
	 * Request batching
	 */
	private pendingRequests = new Map<string, Promise<unknown>>();

	async batchRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
		// Deduplicate concurrent requests
		if (this.pendingRequests.has(key)) {
			return this.pendingRequests.get(key) as Promise<T>;
		}

		const promise = fetcher().finally(() => {
			this.pendingRequests.delete(key);
		});

		this.pendingRequests.set(key, promise);
		return promise;
	}

	/**
	 * Compression for large payloads
	 */
	async compressPayload(data: unknown): Promise<CompressedPayload> {
		const json = JSON.stringify(data);

		if (json.length > 10000) {
			const compressed = await gzip(json);
			return {
				type: "gzip",
				data: compressed,
				originalSize: json.length,
				compressedSize: compressed.length,
			};
		}

		return {
			type: "plain",
			data: json,
		};
	}

	/**
	 * Connection pooling
	 */
	createOptimizedClient(): KyInstance {
		return ky.create({
			retry: {
				limit: 3,
				methods: ["get", "post", "put", "delete"],
				statusCodes: [408, 413, 429, 500, 502, 503, 504],
				backoffLimit: 30000,
			},
			timeout: 30000,
			hooks: {
				beforeRequest: [
					async (request) => {
						// Add compression header
						request.headers.set("Accept-Encoding", "gzip, deflate");
					},
				],
				afterResponse: [
					async (request, options, response) => {
						// Log performance metrics
						this.logPerformance(request, response);
					},
				],
			},
		});
	}
}
```

---

## 10. Platform Integration Examples

### 10.1 VS Code Extension Integration

```typescript
import * as vscode from "vscode";
import {
	SnapbackClient,
	SnapshotManager,
	ProtectionManager,
	LocalStorage,
	VSCodePlugin,
} from "@snapback/sdk";

export class SnapBackExtension {
	private snapshotManager!: SnapshotManager;
	private protectionManager!: ProtectionManager;
	private client?: SnapbackClient;

	async activate(context: vscode.ExtensionContext): Promise<void> {
		// Initialize local storage
		const dbPath = path.join(
			context.globalStorageUri.fsPath,
			"snapback.db"
		);
		const storage = new LocalStorage(dbPath);

		// Load protection config from .snapbackrc
		const config = await this.loadProtectionConfig();

		// Initialize managers
		this.protectionManager = new ProtectionManager(config);
		this.snapshotManager = new SnapshotManager(storage, {
			enableDeduplication: true,
			namingStrategy: "semantic",
		});

		// Initialize cloud client if configured
		const apiKey = vscode.workspace
			.getConfiguration("snapback")
			.get<string>("apiKey");
		if (apiKey) {
			this.client = new SnapbackClient({
				baseUrl: "https://api.snapback.dev",
				apiKey,
			});
		}

		// Register plugin
		const plugin = new VSCodePlugin();
		await plugin.initialize({
			sdk: this.client!,
			snapshotManager: this.snapshotManager,
			protectionManager: this.protectionManager,
			storage,
			logger: console,
			config: {},
			hooks: new PluginHooks(),
			platform: {
				type: "vscode",
				version: vscode.version,
				capabilities: {
					hasFileSystem: true,
					hasUI: true,
					hasNotifications: true,
					canReadFiles: true,
					canWriteFiles: true,
				},
				services: {
					filesystem: new VSCodeFileSystem(),
					ui: new VSCodeUI(),
					notifications: new VSCodeNotifications(),
				},
			},
		});

		// Register file save listener
		context.subscriptions.push(
			vscode.workspace.onWillSaveTextDocument(async (event) => {
				await this.handleFileSave(event);
			})
		);

		// Register commands
		this.registerCommands(context);
	}

	private async handleFileSave(
		event: vscode.TextDocumentWillSaveEvent
	): Promise<void> {
		const filePath = event.document.uri.fsPath;
		const protection = this.protectionManager.getProtection(filePath);

		if (!protection) return;

		switch (protection.level) {
			case "watch":
				// Silent auto-snapshot
				await this.snapshotManager.create({
					filePath,
					content: event.document.getText(),
					message: "Auto-snapshot on save",
				});
				break;

			case "warn":
				// Show warning and offer snapshot
				const choice = await vscode.window.showWarningMessage(
					`File ${path.basename(
						filePath
					)} is protected. Create snapshot?`,
					"Create Snapshot",
					"Skip",
					"Override"
				);

				if (choice === "Create Snapshot") {
					await this.snapshotManager.create({
						filePath,
						content: event.document.getText(),
						message: "Snapshot before save",
					});
				}
				break;

			case "block":
				// Block save and require snapshot
				event.waitUntil(
					(async () => {
						const choice = await vscode.window.showErrorMessage(
							`File ${path.basename(
								filePath
							)} is blocked. Snapshot required.`,
							"Create Snapshot",
							"Cancel"
						);

						if (choice !== "Create Snapshot") {
							throw new Error("Save blocked by protection");
						}

						await this.snapshotManager.create({
							filePath,
							content: event.document.getText(),
							message: "Required snapshot",
						});
					})()
				);
				break;
		}
	}

	private registerCommands(context: vscode.ExtensionContext): void {
		// Create snapshot command
		context.subscriptions.push(
			vscode.commands.registerCommand(
				"snapback.createSnapshot",
				async () => {
					const editor = vscode.window.activeTextEditor;
					if (!editor) return;

					const snapshot = await this.snapshotManager.create({
						filePath: editor.document.uri.fsPath,
						content: editor.document.getText(),
						message: await this.promptForMessage(),
					});

					vscode.window.showInformationMessage(
						`Snapshot created: ${snapshot.id}`
					);
				}
			)
		);

		// Restore snapshot command
		context.subscriptions.push(
			vscode.commands.registerCommand(
				"snapback.restoreSnapshot",
				async () => {
					const snapshots = await this.snapshotManager.list({
						limit: 20,
					});
					const selected = await this.showSnapshotQuickPick(
						snapshots
					);

					if (selected) {
						const result = await this.snapshotManager.restore(
							selected.id
						);
						await this.showRestorePreview(result);
					}
				}
			)
		);
	}
}
```

### 10.2 CLI Integration

```typescript
import { Command } from "commander";
import {
	SnapshotManager,
	ProtectionManager,
	LocalStorage,
} from "@snapback/sdk";

const program = new Command();

// Initialize SDK
const dbPath = path.join(os.homedir(), ".snapback", "snapback.db");
const storage = new LocalStorage(dbPath);
const snapshotManager = new SnapshotManager(storage);
const protectionManager = new ProtectionManager({
	patterns: [],
	defaultLevel: "watch",
	enabled: true,
});

// Snapshot commands
program
	.command("snapshot <file>")
	.description("Create a snapshot of a file")
	.option("-m, --message <message>", "Snapshot message")
	.action(async (file: string, options) => {
		const content = await fs.readFile(file, "utf-8");
		const snapshot = await snapshotManager.create({
			filePath: file,
			content,
			message: options.message,
		});

		console.log(`Snapshot created: ${snapshot.id}`);
	});

program
	.command("list")
	.description("List snapshots")
	.option("-f, --file <file>", "Filter by file path")
	.option("-l, --limit <limit>", "Limit results", "20")
	.action(async (options) => {
		const snapshots = await snapshotManager.list({
			filePath: options.file,
			limit: parseInt(options.limit),
		});

		console.table(
			snapshots.map((s) => ({
				id: s.id.slice(0, 8),
				timestamp: new Date(s.timestamp).toLocaleString(),
				file: s.files?.[0] || "N/A",
				message: s.meta?.message || "N/A",
			}))
		);
	});

program
	.command("restore <id>")
	.description("Restore a snapshot")
	.option("-o, --output <file>", "Output file (default: original)")
	.action(async (id: string, options) => {
		const result = await snapshotManager.restore(id);

		const outputPath = options.output || result.snapshot.files?.[0];
		if (outputPath) {
			await fs.writeFile(outputPath, result.content);
			console.log(`Restored to: ${outputPath}`);
		} else {
			console.log(result.content);
		}
	});

// Protection commands
program
	.command("protect <file>")
	.description("Protect a file")
	.option(
		"-l, --level <level>",
		"Protection level (watch|warn|block)",
		"warn"
	)
	.option("-r, --reason <reason>", "Protection reason")
	.action((file: string, options) => {
		protectionManager.protect(file, options.level, options.reason);
		console.log(`Protected: ${file} (${options.level})`);
	});

program.parse();
```

### 10.3 MCP Server Integration

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
	SnapshotManager,
	ProtectionManager,
	LocalStorage,
} from "@snapback/sdk";

// Initialize MCP server
const server = new Server({
	name: "snapback-mcp",
	version: "1.0.0",
});

// Initialize SDK
const dbPath = path.join(process.env.HOME || "", ".snapback", "snapback.db");
const storage = new LocalStorage(dbPath);
const snapshotManager = new SnapshotManager(storage);
const protectionManager = new ProtectionManager({
	patterns: [],
	defaultLevel: "watch",
	enabled: true,
});

// Register tools
server.setRequestHandler("tools/list", async () => ({
	tools: [
		{
			name: "create_snapshot",
			description: "Create a snapshot of file content",
			inputSchema: {
				type: "object",
				properties: {
					filePath: { type: "string" },
					content: { type: "string" },
					message: { type: "string" },
				},
				required: ["filePath", "content"],
			},
		},
		{
			name: "restore_snapshot",
			description: "Restore a snapshot by ID",
			inputSchema: {
				type: "object",
				properties: {
					id: { type: "string" },
				},
				required: ["id"],
			},
		},
		{
			name: "protect_file",
			description: "Add protection to a file",
			inputSchema: {
				type: "object",
				properties: {
					filePath: { type: "string" },
					level: {
						type: "string",
						enum: ["watch", "warn", "block"],
					},
					reason: { type: "string" },
				},
				required: ["filePath", "level"],
			},
		},
	],
}));

// Handle tool calls
server.setRequestHandler("tools/call", async (request) => {
	switch (request.params.name) {
		case "create_snapshot": {
			const { filePath, content, message } = request.params.arguments;
			const snapshot = await snapshotManager.create({
				filePath,
				content,
				message,
			});

			return {
				content: [
					{
						type: "text",
						text: `Snapshot created: ${snapshot.id}`,
					},
				],
			};
		}

		case "restore_snapshot": {
			const { id } = request.params.arguments;
			const result = await snapshotManager.restore(id);

			return {
				content: [
					{
						type: "text",
						text: result.content,
					},
				],
			};
		}

		case "protect_file": {
			const { filePath, level, reason } = request.params.arguments;
			protectionManager.protect(filePath, level, reason);

			return {
				content: [
					{
						type: "text",
						text: `Protected: ${filePath} (${level})`,
					},
				],
			};
		}

		default:
			throw new Error(`Unknown tool: ${request.params.name}`);
	}
});

// Start server
server.connect({
	inStream: process.stdin,
	outStream: process.stdout,
});
```

---

## 11. Summary

### Architecture Highlights

**✅ Clean Separation of Concerns**:

-   Client layer for remote API operations
-   Manager layer for local business logic
-   Storage adapter for persistence abstraction
-   Shared services for cross-cutting concerns

**✅ Platform Agnostic**:

-   Core logic independent of platform
-   Extension points for platform-specific features
-   Dependency injection for customization

**✅ Performance Optimized**:

-   Multi-level caching strategy
-   Content deduplication
-   Prepared statement caching
-   Batch operations with transactions

**✅ Testable & Mockable**:

-   Interface-based design
-   MemoryStorage for testing
-   Plugin system for test doubles
-   Clear dependency boundaries

**✅ Extensible**:

-   Plugin architecture
-   Lifecycle hooks
-   Platform adapters
-   Custom storage backends

### Next Steps

1. **Implementation Phase**:

    - Implement core interfaces
    - Create storage adapters
    - Build manager layer
    - Add client layer

2. **Testing Phase**:

    - Unit tests for each component
    - Integration tests for workflows
    - E2E tests for platforms
    - Performance benchmarks

3. **Platform Integration**:

    - VS Code extension
    - CLI tool
    - MCP server
    - Web SDK

4. **Documentation**:
    - API reference
    - Integration guides
    - Best practices
    - Migration guides

---

**Document Version**: 1.0
**Last Updated**: 2025-10-21
**Author**: System Architect (Claude)
