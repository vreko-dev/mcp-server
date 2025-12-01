# SnapBack SDK Architecture - Visual Summary

**Quick Reference Guide**

---

## Component Responsibility Matrix

| Component             | Layer   | Responsibility              | Dependencies                      | Caching              |
| --------------------- | ------- | --------------------------- | --------------------------------- | -------------------- |
| **SnapbackClient**    | Client  | HTTP API orchestration      | ky, QuickLRU                      | Yes (HTTP responses) |
| **SnapshotClient**    | Client  | Snapshot API operations     | http, cache                       | Yes (GET operations) |
| **ProtectionClient**  | Client  | Protection API operations   | http, cache                       | Yes (GET operations) |
| **ConfigClient**      | Client  | Config API operations       | http, cache                       | Yes (GET operations) |
| **SnapshotManager**   | Manager | Local snapshot logic        | StorageAdapter, ProtectionManager | No (storage-backed)  |
| **ProtectionManager** | Manager | Protection pattern matching | ProtectionConfig                  | No (registry-based)  |
| **LocalStorage**      | Storage | SQLite persistence          | better-sqlite3                    | No (DB-backed)       |
| **CloudStorage**      | Storage | API-based persistence       | ky, cache                         | Yes (response cache) |
| **MemoryStorage**     | Storage | In-memory testing           | none                              | N/A (ephemeral)      |

---

## Interface Quick Reference

### StorageAdapter (Base Interface)

```typescript
interface StorageAdapter {
	save(snapshot: Snapshot): Promise<void>;
	get(id: string): Promise<Snapshot | null>;
	list(filters?: SnapshotFilters): Promise<Snapshot[]>;
	delete(id: string): Promise<void>;
	deleteBatch(ids: string[]): Promise<number>;
	search(criteria: SearchCriteria): Promise<Snapshot[]>;
	getStats(): Promise<StorageStats>;
	close(): Promise<void>;
	healthCheck(): Promise<HealthStatus>;
}
```

### SnapshotManager

```typescript
interface ISnapshotManager {
	create(data: CreateSnapshotData): Promise<Snapshot>;
	list(filters?: SnapshotFilters): Promise<Snapshot[]>;
	get(id: string): Promise<Snapshot | null>;
	delete(id: string): Promise<void>;
	restore(id: string): Promise<RestoreResult>;
	protect(id: string): Promise<void>;
	unprotect(id: string): Promise<void>;
	search(criteria: SearchCriteria): Promise<Snapshot[]>;
	update(id: string, data: UpdateSnapshotData): Promise<Snapshot>;
	getDeduplicationStats(): DeduplicationStats;
	cleanup(policy: CleanupPolicy): Promise<number>;
}
```

### ProtectionManager

```typescript
interface IProtectionManager {
	protect(filePath: string, level: ProtectionLevel, reason?: string): void;
	unprotect(filePath: string): void;
	getProtection(filePath: string): ProtectedFile | null;
	isProtected(filePath: string): boolean;
	getLevel(filePath: string): ProtectionLevel | null;
	listProtected(filters?: ProtectionFilters): ProtectedFile[];
	updateLevel(filePath: string, level: ProtectionLevel): void;
	getConfig(): ProtectionConfig;
	updateConfig(config: Partial<ProtectionConfig>): void;
	addPattern(pattern: PatternRule): void;
	removePattern(pattern: string): void;
	matchesPattern(filePath: string): PatternMatch | null;
	protectPattern(pattern: string, level: ProtectionLevel): number;
	export(): SerializedRegistry;
	import(data: SerializedRegistry): void;
}
```

---

## Cache Strategy Matrix

| Operation              | Cache Type      | TTL       | Invalidation Trigger            |
| ---------------------- | --------------- | --------- | ------------------------------- |
| `snapshot.get(id)`     | HTTP Response   | 5 min     | update, delete, protect         |
| `snapshot.list()`      | HTTP Response   | 1 min     | create, delete, update          |
| `protection.get(path)` | HTTP Response   | 10 min    | protect, unprotect, update      |
| `protection.list()`    | HTTP Response   | 5 min     | protect, unprotect, pattern add |
| Content dedup          | Object Cache    | Permanent | Reference count = 0             |
| Query results          | Query Cache     | Dynamic   | Dependency change               |
| Prepared statements    | Statement Cache | Permanent | DB close                        |

---

## Error Hierarchy

```
SnapbackError (base)
├── StorageError
│   ├── StorageConnectionError
│   └── StorageTransactionError
├── ProtectionError
│   └── ProtectionBlockError
├── ValidationError
├── NetworkError
│   └── RateLimitError
├── NotFoundError
└── ConflictError
```

**Error Recovery Strategies**:

-   **Retry**: Network errors with exponential backoff
-   **Cache Fallback**: Use stale cache on network failure
-   **Transaction Rollback**: Automatic on storage errors
-   **User Prompt**: Protection violations require user input

---

## Storage Schema (SQLite)

### Core Tables

**snapshots**

-   `id` (PK): Snapshot identifier
-   `timestamp`: Creation time
-   `file_path`: File path
-   `content_hash`: Link to deduplicated content
-   `message`: Optional description
-   `is_protected`: Protection flag
-   `metadata`: JSON metadata

**snapshot_contents** (Deduplication)

-   `hash` (PK): Content SHA-256
-   `content`: Actual file content
-   `size`: Content size
-   `ref_count`: Reference counter

**protected_files**

-   `path` (PK): File path
-   `level`: watch | warn | block
-   `reason`: Optional reason
-   `pattern`: Pattern if matched
-   `added_at`: Protection timestamp

**pattern_rules**

-   `pattern`: Glob pattern
-   `level`: Protection level
-   `reason`: Optional reason
-   `enabled`: Active flag

### Indexes

```sql
idx_snapshots_timestamp
idx_snapshots_file_path
idx_snapshots_protected
idx_snapshots_hash
idx_snapshot_tags_tag
idx_protected_files_level
```

---

## Performance Optimization Checklist

### Database

-   [x] Prepared statement caching
-   [x] Batch operations with transactions
-   [x] Index hints for query optimization
-   [x] Foreign key constraints for integrity
-   [x] Full-text search for content

### Caching

-   [x] Multi-level cache strategy
-   [x] Adaptive cache sizing
-   [x] Predictive cache warming
-   [x] Cache partitioning (hot/warm/cold)
-   [x] Semantic cache invalidation

### Network

-   [x] Request deduplication
-   [x] Compression for large payloads
-   [x] Connection pooling
-   [x] Exponential backoff retry
-   [x] Rate limit handling

### Deduplication

-   [x] Content hash caching
-   [x] Reference counting
-   [x] Delta compression
-   [x] Similarity detection
-   [x] Garbage collection

---

## Platform Integration Patterns

### VS Code Extension

```typescript
// Initialize
const storage = new LocalStorage(extensionStorageUri);
const protectionManager = new ProtectionManager(config);
const snapshotManager = new SnapshotManager(storage);

// Hook into file save
workspace.onWillSaveTextDocument(async (event) => {
	const protection = protectionManager.getProtection(
		event.document.uri.fsPath
	);
	// Handle based on protection level
});
```

### CLI Tool

```typescript
// Command pattern
program
	.command("snapshot <file>")
	.option("-m, --message <msg>")
	.action(async (file, options) => {
		const snapshot = await snapshotManager.create({
			filePath: file,
			content: await fs.readFile(file, "utf-8"),
			message: options.message,
		});
	});
```

### MCP Server

```typescript
// Tool registration
server.setRequestHandler('tools/list', async () => ({
  tools: [
    { name: 'create_snapshot', ... },
    { name: 'restore_snapshot', ... },
    { name: 'protect_file', ... },
  ],
}));

// Tool execution
server.setRequestHandler('tools/call', async (request) => {
  switch (request.params.name) {
    case 'create_snapshot':
      return await snapshotManager.create(...);
  }
});
```

### Web Application

```typescript
// Cloud-only mode
const client = new SnapbackClient({
	baseUrl: "https://api.snapback.dev",
	apiKey: userApiKey,
	cache: true,
});

// Use client APIs directly
const snapshots = await client.snapshots.list();
const protection = await client.protection.get(filePath);
```

---

## Plugin Architecture

### Plugin Interface

```typescript
interface SnapbackPlugin {
	name: string;
	version: string;
	initialize(context: PluginContext): Promise<void>;
	dispose(): Promise<void>;
}
```

### Available Hooks

-   `onBeforeCreate` - Before snapshot creation
-   `onAfterCreate` - After snapshot creation
-   `onBeforeDelete` - Before snapshot deletion
-   `onBeforeProtect` - Before file protection
-   `onProtectionViolation` - On protection check failure
-   `onRestore` - On snapshot restoration
-   `onConflict` - On sync conflict

### Example Plugins

**TelemetryPlugin**: Track operations and usage patterns
**GitIntegrationPlugin**: Enhance snapshots with Git metadata
**VSCodePlugin**: VS Code-specific UI integrations
**NotificationPlugin**: Custom notification strategies

---

## Testing Strategy

### Unit Tests

```typescript
describe('SnapshotManager', () => {
  let storage: MemoryStorage;
  let manager: SnapshotManager;

  beforeEach(() => {
    storage = new MemoryStorage();
    manager = new SnapshotManager(storage);
  });

  it('creates snapshot with deduplication', async () => {
    const snapshot = await manager.create({ ... });
    expect(snapshot.id).toBeDefined();
  });
});
```

### Integration Tests

```typescript
describe('Snapshot Workflow', () => {
  it('creates, lists, and restores snapshot', async () => {
    const created = await manager.create({ ... });
    const list = await manager.list();
    expect(list).toContainEqual(created);

    const restored = await manager.restore(created.id);
    expect(restored.content).toBe(originalContent);
  });
});
```

### E2E Tests

```typescript
describe("Platform Integration", () => {
	it("handles VS Code file save with protection", async () => {
		protectionManager.protect(filePath, "warn");
		const event = createMockSaveEvent(filePath);
		await handleFileSave(event);
		// Verify snapshot created
	});
});
```

---

## Migration Path

### Phase 1: Core Implementation

1. Implement StorageAdapter interface
2. Create LocalStorage with SQLite
3. Build SnapshotManager with deduplication
4. Implement ProtectionManager with patterns

### Phase 2: Client Layer

1. Implement SnapshotClient with caching
2. Implement ProtectionClient with caching
3. Add CloudStorage adapter
4. Implement sync logic

### Phase 3: Platform Integration

1. VS Code extension integration
2. CLI tool integration
3. MCP server integration
4. Web SDK (client-only mode)

### Phase 4: Advanced Features

1. Plugin system implementation
2. Advanced caching strategies
3. Performance optimizations
4. Delta compression

---

## Quick Decision Guide

**When to use which storage?**

-   **LocalStorage**: Desktop apps (VS Code, CLI)
-   **CloudStorage**: Web apps, sync scenarios
-   **MemoryStorage**: Unit tests, ephemeral data

**When to use Client vs Manager?**

-   **Client**: Need cloud sync, API operations
-   **Manager**: Local-only, offline-first

**How to handle protection violations?**

-   **watch**: Silent auto-snapshot
-   **warn**: Prompt user with options
-   **block**: Require snapshot before save

**Cache invalidation strategy?**

-   **Pessimistic**: Invalidate on any write
-   **Optimistic**: Use TTL, invalidate on known conflicts
-   **Hybrid**: Pessimistic for critical, optimistic for reads

---

## Key Metrics

**Performance Targets**:

-   Snapshot creation: < 100ms (local), < 500ms (cloud)
-   Snapshot retrieval: < 50ms (cached), < 200ms (storage)
-   Protection check: < 10ms
-   List operation: < 100ms (20 items)
-   Deduplication ratio: > 3:1 for similar files

**Quality Targets**:

-   Test coverage: > 85%
-   Type safety: 100% (TypeScript strict mode)
-   API documentation: 100%
-   Error handling: All public APIs

**Scalability Targets**:

-   Snapshots: > 100,000 per workspace
-   Storage size: > 10GB with deduplication
-   Concurrent operations: > 100
-   Cache hit rate: > 70%

---

**Document Version**: 1.0
**Companion to**: sdk-architecture-design.md
**Last Updated**: 2025-10-21
