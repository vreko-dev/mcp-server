# SnapBack SDK Architecture - Executive Summary

**Complete Architecture Design Package**

---

## Overview

The @snapback/sdk package provides a platform-agnostic TypeScript SDK for snapshot management and file protection. This architecture supports multiple platforms (VS Code, CLI, MCP, Web) through clean abstraction layers and dependency injection.

**Design Documents**:

1. **sdk-architecture-design.md** - Comprehensive architecture specification (11,000+ words)
2. **sdk-architecture-visual-summary.md** - Quick reference guide with tables and matrices
3. **sdk-implementation-roadmap.md** - 7-week implementation plan with detailed tasks
4. **sdk-architecture-summary.md** - This executive summary

---

## Core Architecture Principles

### 1. Three-Layer Architecture

```
Platform Layer (VS Code, CLI, MCP, Web)
    ↓
Client Layer (HTTP API) | Manager Layer (Local Logic)
    ↓                         ↓
         Storage Adapter Layer
                ↓
         Shared Services
```

**Separation Benefits**:

-   Client layer for remote operations (cloud sync)
-   Manager layer for local operations (offline-first)
-   Storage adapters for persistence flexibility
-   Platform layer for UI/CLI integration

### 2. Clean Dependency Injection

**Inversion of Control**:

```typescript
// Platform creates dependencies
const storage = new LocalStorage(dbPath);
const protectionManager = new ProtectionManager(config);
const snapshotManager = new SnapshotManager(
	storage,
	options,
	protectionManager
);
const client = new SnapbackClient({ baseUrl, apiKey });
```

**Benefits**:

-   Easy testing with mock implementations
-   Platform-specific customization
-   Runtime adapter selection
-   Simplified dependency management

### 3. Platform Agnostic Core

**Core logic independent of platform**:

-   No VS Code APIs in core
-   No Node.js file system in managers
-   No HTTP in storage adapters
-   Platform adapters inject capabilities

**Extension points**:

-   Plugin system for platform-specific features
-   Platform context for capability detection
-   Service injection for platform APIs
-   Lifecycle hooks for integration

---

## Key Components

### SnapshotManager (Local Operations)

**Responsibilities**:

-   Create snapshots with deduplication
-   Manage local snapshot lifecycle
-   Implement naming strategies
-   Execute search and cleanup

**Key Features**:

-   Content deduplication via SHA-256 hashing
-   Multiple naming strategies (git, semantic, timestamp)
-   Protection integration
-   Reference counting for garbage collection

**Performance**:

-   Deduplication ratio: > 3:1 for similar files
-   Create latency: < 100ms
-   Search with full-text: < 200ms

### ProtectionManager (Pattern Matching)

**Responsibilities**:

-   Manage protection registry
-   Pattern-based file matching
-   Protection level enforcement
-   Config import/export

**Protection Levels**:

-   **watch**: Silent auto-snapshot (green)
-   **warn**: Notification before save (yellow)
-   **block**: Require snapshot (red)

**Features**:

-   Glob pattern matching (minimatch)
-   Exact path matching
-   Pattern priority resolution
-   Bulk operations

### LocalStorage (SQLite Persistence)

**Database Schema**:

-   `snapshots` - Core snapshot data
-   `snapshot_contents` - Deduplicated content
-   `protected_files` - Protection registry
-   `pattern_rules` - Pattern-based rules

**Optimizations**:

-   Prepared statement caching
-   Transaction safety
-   Index optimization
-   Full-text search (FTS5)

**Performance**:

-   Insert: < 50ms
-   Query: < 100ms (indexed)
-   Full-text search: < 200ms

### SnapshotClient (Cloud API)

**Responsibilities**:

-   HTTP API operations
-   Response caching
-   Retry logic
-   Cache invalidation

**Features**:

-   Automatic retry with exponential backoff
-   QuickLRU caching (1000 entries)
-   Request deduplication
-   Compression for large payloads

**Cache TTLs**:

-   Snapshot GET: 5 minutes
-   Snapshot LIST: 1 minute
-   Protection GET: 10 minutes
-   Protection LIST: 5 minutes

---

## Data Flow Examples

### Snapshot Creation (Local)

```
Platform
  ↓ create({ filePath, content, message })
SnapshotManager
  ↓ Validate → Check protection → Hash content
  ↓ Deduplicate → Generate name
  ↓ save(snapshot)
LocalStorage
  ↓ BEGIN TRANSACTION
  ↓ Insert snapshot → Update refs → Commit
  ↓ Success
Cache Invalidation
  ↓ Clear list cache → Update stats
  ↓ Return snapshot
Platform
```

### Protection Check (File Save)

```
Platform (on save)
  ↓ isProtected(filePath)
ProtectionManager
  ↓ Check exact match → Check patterns
  ↓ Match found (level: 'warn')
Platform
  ↓ Show warning notification
  ↓ User: "Create Snapshot"
SnapshotManager
  ↓ create()
  ↓ Snapshot created
Platform
  ↓ Allow save
```

### Cloud Sync

```
SyncCoordinator
  ↓ list() local snapshots
  ↓ list() remote snapshots (via SnapshotClient)
  ↓ Compare versions
  ↓ Detect differences
  ↓ For each diff:
    ↓ Upload new (SnapshotClient.create)
    ↓ Download new (SnapshotClient.get → SnapshotManager.create)
    ↓ Resolve conflicts (ConflictResolver)
  ↓ Return SyncResult
```

---

## Caching Strategy

### Multi-Level Cache Architecture

**Level 1: HTTP Response Cache**

-   Location: SnapshotClient, ProtectionClient
-   Storage: QuickLRU (1000 entries)
-   Strategy: TTL-based with invalidation
-   Hit rate target: > 70%

**Level 2: Query Result Cache**

-   Location: SnapshotManager
-   Storage: Map-based with dependency tracking
-   Strategy: Invalidate on dependency change
-   Use cases: Complex queries, aggregations

**Level 3: Object Cache (Deduplication)**

-   Location: DeduplicationCache
-   Storage: Map with reference counting
-   Strategy: Permanent with GC on ref_count = 0
-   Benefit: 3:1+ space savings

### Cache Invalidation Rules

| Operation       | Invalidates                          |
| --------------- | ------------------------------------ |
| snapshot.create | `snapshots:*`, `snapshot_search:*`   |
| snapshot.update | `snapshot:{id}`, `snapshots:*`       |
| snapshot.delete | `snapshot:{id}`, `snapshots:*`       |
| protection.add  | `protection:{path}`, `protections:*` |
| pattern.add     | `protections:*`                      |

---

## Error Handling

### Error Hierarchy

```
SnapbackError (base)
├── StorageError (database/persistence errors)
│   ├── StorageConnectionError
│   └── StorageTransactionError
├── ProtectionError (protection violations)
│   └── ProtectionBlockError
├── ValidationError (input validation)
├── NetworkError (HTTP/API errors)
│   └── RateLimitError
├── NotFoundError (resource not found)
└── ConflictError (sync conflicts)
```

### Recovery Strategies

**RetryStrategy** (Network errors):

-   Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
-   Retry on: 408, 429, 500, 502, 503, 504
-   Max retries: 3

**CacheFallbackStrategy** (Network unavailable):

-   Use stale cache if available
-   Return with warning
-   Graceful degradation

**TransactionRollbackStrategy** (Storage errors):

-   Automatic rollback on failure
-   No partial state
-   Retry transaction once

---

## Plugin Architecture

### Plugin System

```typescript
interface SnapbackPlugin {
	name: string;
	version: string;
	initialize(context: PluginContext): Promise<void>;
	dispose(): Promise<void>;
}
```

### Available Hooks

-   **onBeforeCreate** - Before snapshot creation
-   **onAfterCreate** - After snapshot creation
-   **onBeforeDelete** - Before snapshot deletion
-   **onBeforeProtect** - Before file protection
-   **onProtectionViolation** - On protection check failure
-   **onRestore** - On snapshot restoration
-   **onConflict** - On sync conflict

### Built-in Plugins

**TelemetryPlugin**:

-   Track operations (create, delete, restore)
-   Monitor protection violations
-   Collect usage analytics

**GitIntegrationPlugin**:

-   Enhance snapshots with Git metadata
-   Track branch and commit info
-   Git-aware naming strategy

**VSCodePlugin**:

-   VS Code-specific UI integration
-   Show diff previews
-   Handle notifications
-   Command palette integration

---

## Performance Targets

### Latency Targets

| Operation           | Local   | Cached | Cloud   |
| ------------------- | ------- | ------ | ------- |
| Create snapshot     | < 100ms | N/A    | < 500ms |
| Get snapshot        | < 50ms  | < 10ms | < 200ms |
| List snapshots (20) | < 100ms | < 20ms | < 300ms |
| Protection check    | < 10ms  | N/A    | N/A     |
| Search snapshots    | < 200ms | < 50ms | < 500ms |

### Scalability Targets

-   **Snapshots per workspace**: > 100,000
-   **Storage size**: > 10GB (with deduplication)
-   **Concurrent operations**: > 100
-   **Cache hit rate**: > 70%
-   **Deduplication ratio**: > 3:1

### Quality Targets

-   **Test coverage**: > 85%
-   **Type safety**: 100% (TypeScript strict mode)
-   **API documentation**: 100%
-   **Error handling**: All public APIs

---

## Platform Integration

### VS Code Extension

```typescript
// Initialize SDK
const storage = new LocalStorage(extensionStorageUri);
const manager = new SnapshotManager(storage);

// Hook into file save
workspace.onWillSaveTextDocument(async (event) => {
	const protection = protectionManager.getProtection(
		event.document.uri.fsPath
	);

	if (protection?.level === "warn") {
		const choice = await window.showWarningMessage(
			"Create snapshot?",
			"Create",
			"Skip"
		);

		if (choice === "Create") {
			await manager.create({
				filePath: event.document.uri.fsPath,
				content: event.document.getText(),
			});
		}
	}
});
```

### CLI Tool

```typescript
program
	.command("snapshot <file>")
	.option("-m, --message <msg>")
	.action(async (file, options) => {
		const snapshot = await snapshotManager.create({
			filePath: file,
			content: await fs.readFile(file, "utf-8"),
			message: options.message,
		});
		console.log(`Created: ${snapshot.id}`);
	});
```

### MCP Server

```typescript
server.setRequestHandler("tools/call", async (request) => {
	switch (request.params.name) {
		case "create_snapshot":
			const snapshot = await snapshotManager.create(
				request.params.arguments
			);
			return {
				content: [{ type: "text", text: `Created: ${snapshot.id}` }],
			};
	}
});
```

### Web Application

```typescript
// Cloud-only mode
const client = new SnapbackClient({
	baseUrl: "https://api.snapback.dev",
	apiKey: userApiKey,
});

const snapshots = await client.snapshots.list();
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

-   Storage adapters (LocalStorage, MemoryStorage)
-   Error hierarchy
-   Utility functions
-   **Deliverable**: Storage layer working

### Phase 2: Manager Layer (Week 2)

-   SnapshotManager with deduplication
-   ProtectionManager with patterns
-   Deduplication cache
-   **Deliverable**: Local operations working

### Phase 3: Client Layer (Week 3)

-   SnapshotClient, ProtectionClient
-   CloudStorage adapter
-   HTTP caching
-   **Deliverable**: Cloud operations working

### Phase 4: Caching (Week 4)

-   Cache strategies
-   Cache coordinator
-   Performance optimization
-   **Deliverable**: Optimized performance

### Phase 5: Plugins (Week 5)

-   Plugin system
-   Built-in plugins
-   Platform adapters
-   **Deliverable**: Extensibility complete

### Phase 6: Sync (Week 6)

-   SyncCoordinator
-   Conflict resolution
-   Incremental sync
-   **Deliverable**: Cloud sync working

### Phase 7: Integration (Week 7)

-   VS Code example
-   CLI example
-   MCP example
-   Documentation
-   **Deliverable**: Ready for beta release

---

## Design Decisions & Trade-offs

### Decision 1: SQLite vs. LevelDB

**Chosen**: SQLite (better-sqlite3)

**Rationale**:

-   ✅ Full SQL query capabilities
-   ✅ ACID transactions
-   ✅ Full-text search (FTS5)
-   ✅ Mature and well-tested
-   ✅ Excellent performance
-   ❌ Larger file size (acceptable)

### Decision 2: Client + Manager vs. Single Layer

**Chosen**: Separate Client and Manager layers

**Rationale**:

-   ✅ Offline-first architecture
-   ✅ Cloud sync optional
-   ✅ Platform flexibility
-   ✅ Clear separation of concerns
-   ❌ More code complexity (acceptable)

### Decision 3: Plugin System vs. Built-in

**Chosen**: Plugin system with built-in plugins

**Rationale**:

-   ✅ Extensibility
-   ✅ Platform-specific features
-   ✅ Testability
-   ✅ Optional features
-   ❌ Additional abstraction (minimal)

### Decision 4: QuickLRU vs. lru-cache

**Chosen**: QuickLRU

**Rationale**:

-   ✅ Simpler API
-   ✅ Modern ESM support
-   ✅ TypeScript native
-   ✅ Sufficient for needs
-   ❌ Fewer features (acceptable)

### Decision 5: Content Deduplication

**Chosen**: SHA-256 hash-based with reference counting

**Rationale**:

-   ✅ Excellent space savings (3:1+)
-   ✅ Fast hash computation
-   ✅ Collision-resistant
-   ✅ Automatic garbage collection
-   ❌ CPU cost (minimal with caching)

---

## Security Considerations

### Input Validation

**All user inputs validated**:

```typescript
import ow from "ow";

ow(filePath, ow.string.nonEmpty);
ow(content, ow.string);
ow(level, ow.string.oneOf(["watch", "warn", "block"]));
```

### SQL Injection Prevention

**Always use prepared statements**:

```typescript
// ✅ SAFE
db.prepare("SELECT * FROM snapshots WHERE id = ?").get(id);

// ❌ UNSAFE
db.prepare(`SELECT * FROM snapshots WHERE id = '${id}'`).get();
```

### Path Traversal Prevention

**Validate all file paths**:

```typescript
const resolved = path.resolve(baseDir, filePath);
if (!resolved.startsWith(baseDir)) {
	throw new ValidationError("Path traversal detected");
}
```

### API Key Security

**Never log or expose API keys**:

```typescript
// Redact sensitive headers
logger.debug("HTTP request", {
	url: request.url,
	headers: redactSensitive(request.headers),
});
```

---

## Testing Strategy

### Unit Tests (85%+ coverage)

**Test each component in isolation**:

```typescript
describe("SnapshotManager", () => {
	let storage: MemoryStorage;
	let manager: SnapshotManager;

	beforeEach(() => {
		storage = new MemoryStorage();
		manager = new SnapshotManager(storage);
	});

	it("creates snapshot with deduplication", async () => {
		// Test implementation
	});
});
```

### Integration Tests

**Test component interactions**:

```typescript
describe('Snapshot Workflow', () => {
  it('creates, lists, and restores snapshot', async () => {
    const created = await manager.create({ ... });
    const list = await manager.list();
    expect(list).toContain(created);

    const restored = await manager.restore(created.id);
    expect(restored.content).toBe(originalContent);
  });
});
```

### E2E Tests

**Test platform integrations**:

```typescript
describe("VS Code Integration", () => {
	it("handles file save with protection", async () => {
		protectionManager.protect(filePath, "warn");
		const event = createMockSaveEvent(filePath);
		await handleFileSave(event);

		const snapshots = await manager.list({ filePath });
		expect(snapshots.length).toBe(1);
	});
});
```

### Performance Tests

**Benchmark critical operations**:

```typescript
describe("Performance", () => {
	it("creates snapshot in < 100ms", async () => {
		const start = Date.now();
		await manager.create(data);
		expect(Date.now() - start).toBeLessThan(100);
	});
});
```

---

## Success Criteria

### Technical Criteria

-   [x] Architecture design complete
-   [ ] All interfaces defined
-   [ ] Storage layer implemented
-   [ ] Manager layer implemented
-   [ ] Client layer implemented
-   [ ] Caching implemented
-   [ ] Plugin system implemented
-   [ ] Sync implemented
-   [ ] All tests passing (85%+ coverage)
-   [ ] Performance targets met

### Quality Criteria

-   [ ] TypeScript strict mode
-   [ ] No 'any' types (except tests)
-   [ ] All public APIs documented
-   [ ] Error handling comprehensive
-   [ ] Security review passed

### Integration Criteria

-   [ ] VS Code extension working
-   [ ] CLI tool working
-   [ ] MCP server working
-   [ ] Web SDK working
-   [ ] Examples complete

### Documentation Criteria

-   [x] Architecture documented
-   [ ] API reference generated (TypeDoc)
-   [ ] Integration guides written
-   [ ] Best practices documented
-   [ ] Migration guide created

---

## Next Steps

1. **Review Architecture** - Stakeholder review and approval
2. **Begin Implementation** - Start Phase 1 (Foundation)
3. **Set Up CI/CD** - Automated testing and deployment
4. **Create Project Board** - Track implementation progress
5. **Weekly Reviews** - Progress checkpoints and adjustments

---

## Document Index

| Document                               | Purpose                             | Audience                       |
| -------------------------------------- | ----------------------------------- | ------------------------------ |
| **sdk-architecture-design.md**         | Complete architecture specification | Architects, Senior Developers  |
| **sdk-architecture-visual-summary.md** | Quick reference guide               | All Developers                 |
| **sdk-implementation-roadmap.md**      | Implementation plan and guidelines  | Implementers, Project Managers |
| **sdk-architecture-summary.md**        | Executive summary                   | Stakeholders, Leadership       |

---

**Architecture Status**: ✅ Design Complete
**Implementation Status**: 🟡 Ready to Begin
**Version**: 1.0.0
**Date**: 2025-10-21
**Architect**: Claude (System Architect Mode)
