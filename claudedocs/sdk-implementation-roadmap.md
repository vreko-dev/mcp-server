# SnapBack SDK Implementation Roadmap

**Implementation Guide and File Structure**

---

## Recommended File Structure

```
packages/sdk/
├── src/
│   ├── index.ts                          # Main entry point
│   │
│   ├── client/                           # Client Layer (HTTP API)
│   │   ├── SnapbackClient.ts             # Main client orchestrator
│   │   ├── SnapshotClient.ts             # Snapshot API operations
│   │   ├── ProtectionClient.ts           # Protection API operations
│   │   ├── ConfigClient.ts               # Config API operations
│   │   └── types.ts                      # Client-specific types
│   │
│   ├── manager/                          # Manager Layer (Business Logic)
│   │   ├── SnapshotManager.ts            # Snapshot business logic
│   │   ├── ProtectionManager.ts          # Protection pattern matching
│   │   ├── ConfigManager.ts              # Config management
│   │   ├── SyncCoordinator.ts            # Cloud sync orchestration
│   │   └── types.ts                      # Manager-specific types
│   │
│   ├── storage/                          # Storage Layer (Adapters)
│   │   ├── StorageAdapter.ts             # Base adapter interface
│   │   ├── LocalStorage.ts               # SQLite implementation
│   │   ├── CloudStorage.ts               # API-based implementation
│   │   ├── MemoryStorage.ts              # Testing implementation
│   │   ├── schema.sql                    # SQLite schema
│   │   └── types.ts                      # Storage-specific types
│   │
│   ├── cache/                            # Caching Infrastructure
│   │   ├── CacheStrategy.ts              # Base cache strategy
│   │   ├── HttpCacheStrategy.ts          # HTTP response caching
│   │   ├── QueryCacheStrategy.ts         # Query result caching
│   │   ├── DeduplicationCache.ts         # Content deduplication
│   │   ├── CacheCoordinator.ts           # Cache orchestration
│   │   └── types.ts                      # Cache-specific types
│   │
│   ├── errors/                           # Error Hierarchy
│   │   ├── SnapbackError.ts              # Base error class
│   │   ├── StorageError.ts               # Storage errors
│   │   ├── ProtectionError.ts            # Protection errors
│   │   ├── ValidationError.ts            # Validation errors
│   │   ├── NetworkError.ts               # Network errors
│   │   ├── ErrorRecovery.ts              # Recovery strategies
│   │   └── index.ts                      # Error exports
│   │
│   ├── plugins/                          # Plugin System
│   │   ├── PluginRegistry.ts             # Plugin management
│   │   ├── PluginContext.ts              # Plugin context provider
│   │   ├── PluginHooks.ts                # Lifecycle hooks
│   │   ├── builtin/                      # Built-in plugins
│   │   │   ├── TelemetryPlugin.ts
│   │   │   ├── GitIntegrationPlugin.ts
│   │   │   └── VSCodePlugin.ts
│   │   └── types.ts                      # Plugin-specific types
│   │
│   ├── utils/                            # Shared Utilities
│   │   ├── hash.ts                       # Hashing utilities
│   │   ├── pattern.ts                    # Pattern matching (minimatch)
│   │   ├── naming.ts                     # Naming strategies
│   │   ├── validation.ts                 # Input validation (ow/zod)
│   │   ├── compression.ts                # Compression utilities
│   │   └── retry.ts                      # Retry logic (p-retry)
│   │
│   └── types/                            # Shared Types
│       ├── config.ts                     # Configuration types
│       ├── platform.ts                   # Platform-specific types
│       └── common.ts                     # Common utility types
│
├── tests/
│   ├── unit/                             # Unit tests
│   │   ├── storage/
│   │   │   ├── LocalStorage.test.ts
│   │   │   ├── CloudStorage.test.ts
│   │   │   └── MemoryStorage.test.ts
│   │   ├── manager/
│   │   │   ├── SnapshotManager.test.ts
│   │   │   ├── ProtectionManager.test.ts
│   │   │   └── SyncCoordinator.test.ts
│   │   ├── client/
│   │   │   ├── SnapshotClient.test.ts
│   │   │   └── ProtectionClient.test.ts
│   │   ├── cache/
│   │   │   ├── DeduplicationCache.test.ts
│   │   │   └── CacheStrategy.test.ts
│   │   └── utils/
│   │       ├── hash.test.ts
│   │       └── pattern.test.ts
│   │
│   ├── integration/                      # Integration tests
│   │   ├── snapshot-workflow.test.ts
│   │   ├── protection-workflow.test.ts
│   │   ├── sync-workflow.test.ts
│   │   └── deduplication.test.ts
│   │
│   ├── e2e/                              # End-to-end tests
│   │   ├── vscode-integration.test.ts
│   │   ├── cli-integration.test.ts
│   │   └── mcp-integration.test.ts
│   │
│   └── fixtures/                         # Test data
│       ├── snapshots.json
│       ├── protection-config.json
│       └── sample-files/
│
├── examples/                             # Usage examples
│   ├── vscode-extension.ts
│   ├── cli-tool.ts
│   ├── mcp-server.ts
│   └── web-app.ts
│
├── docs/                                 # Documentation
│   ├── api/                              # API reference
│   ├── guides/                           # Integration guides
│   └── architecture/                     # Architecture docs
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Core interfaces and storage layer

**Tasks**:

1. **Storage Layer** (`src/storage/`)

    - [ ] Define `StorageAdapter` interface
    - [ ] Implement `MemoryStorage` (for testing)
    - [ ] Implement `LocalStorage` with SQLite schema
    - [ ] Write unit tests for storage adapters
    - [ ] Add database migrations support

2. **Error System** (`src/errors/`)

    - [ ] Create `SnapbackError` base class
    - [ ] Implement error hierarchy
    - [ ] Add error recovery strategies
    - [ ] Write error handling tests

3. **Utilities** (`src/utils/`)
    - [ ] Implement hash utilities (SHA-256)
    - [ ] Add pattern matching (minimatch)
    - [ ] Create validation helpers
    - [ ] Add naming strategies

**Acceptance Criteria**:

-   [ ] All storage operations tested
-   [ ] Database schema validated
-   [ ] Error handling comprehensive
-   [ ] 100% test coverage on utils

---

### Phase 2: Manager Layer (Week 2)

**Goal**: Business logic and local operations

**Tasks**:

1. **SnapshotManager** (`src/manager/SnapshotManager.ts`)

    - [ ] Implement CRUD operations
    - [ ] Add deduplication logic
    - [ ] Implement naming strategies
    - [ ] Add search functionality
    - [ ] Implement cleanup policies

2. **ProtectionManager** (`src/manager/ProtectionManager.ts`)

    - [ ] Implement protection registry
    - [ ] Add pattern matching
    - [ ] Implement config management
    - [ ] Add bulk operations
    - [ ] Implement import/export

3. **Deduplication Cache** (`src/cache/DeduplicationCache.ts`)
    - [ ] Implement content hashing
    - [ ] Add reference counting
    - [ ] Implement garbage collection
    - [ ] Add similarity detection

**Acceptance Criteria**:

-   [ ] All manager operations tested
-   [ ] Deduplication working correctly
-   [ ] Protection patterns functional
-   [ ] Integration tests passing

---

### Phase 3: Client Layer (Week 3)

**Goal**: HTTP API and cloud operations

**Tasks**:

1. **HTTP Client Setup** (`src/client/SnapbackClient.ts`)

    - [ ] Configure ky HTTP client
    - [ ] Add retry logic (p-retry)
    - [ ] Implement request/response interceptors
    - [ ] Add error transformation

2. **Snapshot Client** (`src/client/SnapshotClient.ts`)

    - [ ] Implement CRUD API calls
    - [ ] Add response caching
    - [ ] Implement cache invalidation
    - [ ] Add batch operations

3. **Protection Client** (`src/client/ProtectionClient.ts`)

    - [ ] Implement protection API calls
    - [ ] Add response caching
    - [ ] Implement config sync

4. **CloudStorage Adapter** (`src/storage/CloudStorage.ts`)
    - [ ] Implement using SnapshotClient
    - [ ] Add caching layer
    - [ ] Implement optimistic updates

**Acceptance Criteria**:

-   [ ] All API operations tested
-   [ ] Caching working correctly
-   [ ] Error handling comprehensive
-   [ ] Mock API server for tests

---

### Phase 4: Caching Infrastructure (Week 4)

**Goal**: Performance optimization through caching

**Tasks**:

1. **Cache Strategies** (`src/cache/`)

    - [ ] Implement `HttpCacheStrategy`
    - [ ] Implement `QueryCacheStrategy`
    - [ ] Add cache warming
    - [ ] Implement adaptive sizing

2. **Cache Coordinator** (`src/cache/CacheCoordinator.ts`)

    - [ ] Implement multi-level cache
    - [ ] Add cache invalidation rules
    - [ ] Implement cache partitioning
    - [ ] Add cache statistics

3. **Performance Testing**
    - [ ] Benchmark cache hit rates
    - [ ] Measure latency improvements
    - [ ] Test memory usage
    - [ ] Profile cache efficiency

**Acceptance Criteria**:

-   [ ] Cache hit rate > 70%
-   [ ] Latency reduction > 50%
-   [ ] Memory usage acceptable
-   [ ] All cache operations tested

---

### Phase 5: Plugin System (Week 5)

**Goal**: Extensibility and platform integration

**Tasks**:

1. **Plugin Infrastructure** (`src/plugins/`)

    - [ ] Implement `PluginRegistry`
    - [ ] Create `PluginContext`
    - [ ] Add lifecycle hooks
    - [ ] Implement hook execution

2. **Built-in Plugins** (`src/plugins/builtin/`)

    - [ ] Create `TelemetryPlugin`
    - [ ] Create `GitIntegrationPlugin`
    - [ ] Create `VSCodePlugin`
    - [ ] Add plugin tests

3. **Platform Adapters** (`src/types/platform.ts`)
    - [ ] Define platform capabilities
    - [ ] Add platform services interface
    - [ ] Implement platform detection

**Acceptance Criteria**:

-   [ ] Plugin system working
-   [ ] All hooks functional
-   [ ] Built-in plugins tested
-   [ ] Platform adapters complete

---

### Phase 6: Sync & Conflict Resolution (Week 6)

**Goal**: Cloud synchronization

**Tasks**:

1. **Sync Coordinator** (`src/manager/SyncCoordinator.ts`)

    - [ ] Implement sync algorithm
    - [ ] Add conflict detection
    - [ ] Implement merge strategies
    - [ ] Add incremental sync

2. **Conflict Resolution**

    - [ ] Implement resolution strategies
    - [ ] Add user prompts for conflicts
    - [ ] Implement merge algorithms
    - [ ] Add conflict logging

3. **Sync Tests**
    - [ ] Test local-to-cloud sync
    - [ ] Test cloud-to-local sync
    - [ ] Test conflict scenarios
    - [ ] Test incremental sync

**Acceptance Criteria**:

-   [ ] Sync working bidirectionally
-   [ ] Conflicts handled correctly
-   [ ] All sync scenarios tested
-   [ ] Performance acceptable

---

### Phase 7: Integration & Examples (Week 7)

**Goal**: Platform integrations and documentation

**Tasks**:

1. **VS Code Integration** (`examples/vscode-extension.ts`)

    - [ ] Create example extension
    - [ ] Implement file save hooks
    - [ ] Add command palette integration
    - [ ] Create UI components

2. **CLI Tool** (`examples/cli-tool.ts`)

    - [ ] Create CLI with commander
    - [ ] Implement all commands
    - [ ] Add interactive prompts
    - [ ] Create man pages

3. **MCP Server** (`examples/mcp-server.ts`)

    - [ ] Implement MCP protocol
    - [ ] Add tool definitions
    - [ ] Implement tool handlers
    - [ ] Add MCP tests

4. **Documentation**
    - [ ] API reference (TypeDoc)
    - [ ] Integration guides
    - [ ] Architecture diagrams
    - [ ] Best practices

**Acceptance Criteria**:

-   [ ] All examples working
-   [ ] Documentation complete
-   [ ] E2E tests passing
-   [ ] Ready for beta release

---

## Implementation Guidelines

### Code Style

**TypeScript Configuration**:

```json
{
	"compilerOptions": {
		"strict": true,
		"noImplicitAny": true,
		"strictNullChecks": true,
		"strictFunctionTypes": true,
		"esModuleInterop": true,
		"skipLibCheck": false,
		"declaration": true,
		"declarationMap": true,
		"sourceMap": true,
		"target": "ES2022",
		"module": "ES2022",
		"moduleResolution": "bundler"
	}
}
```

**Naming Conventions**:

-   Classes: PascalCase (`SnapshotManager`)
-   Interfaces: PascalCase with 'I' prefix (`ISnapshotManager`)
-   Types: PascalCase (`SnapshotFilters`)
-   Functions/Methods: camelCase (`createSnapshot`)
-   Constants: UPPER_SNAKE_CASE (`CACHE_TTL`)
-   Private members: camelCase with '\_' prefix (`_storage`)

**Documentation**:

````typescript
/**
 * Create a new snapshot with deduplication
 *
 * @param data - Snapshot creation data
 * @returns Created snapshot with generated ID
 * @throws {ValidationError} If data is invalid
 * @throws {StorageError} If save fails
 * @throws {ProtectionError} If file is protected
 *
 * @example
 * ```typescript
 * const snapshot = await manager.create({
 *   filePath: '/path/to/file.ts',
 *   content: 'file content',
 *   message: 'Important change'
 * });
 * ```
 */
async create(data: CreateSnapshotData): Promise<Snapshot>
````

### Testing Standards

**Test Structure**:

```typescript
describe("SnapshotManager", () => {
	let storage: MemoryStorage;
	let manager: SnapshotManager;

	beforeEach(() => {
		storage = new MemoryStorage();
		manager = new SnapshotManager(storage);
	});

	afterEach(() => {
		storage.reset();
	});

	describe("create", () => {
		it("creates snapshot with valid data", async () => {
			const data = createValidSnapshotData();
			const snapshot = await manager.create(data);

			expect(snapshot.id).toBeDefined();
			expect(snapshot.timestamp).toBeGreaterThan(0);
		});

		it("throws ValidationError for invalid data", async () => {
			const invalidData = {
				/* missing required fields */
			};

			await expect(manager.create(invalidData as any)).rejects.toThrow(
				ValidationError
			);
		});

		it("deduplicates identical content", async () => {
			const data1 = createSnapshotData("content");
			const data2 = createSnapshotData("content");

			await manager.create(data1);
			await manager.create(data2);

			const stats = manager.getDeduplicationStats();
			expect(stats.uniqueContents).toBe(1);
		});
	});
});
```

**Test Coverage Targets**:

-   Unit tests: 85%+ coverage
-   Integration tests: Core workflows covered
-   E2E tests: All platform integrations
-   Error scenarios: All error paths tested

### Performance Benchmarks

**Snapshot Operations**:

```typescript
describe("Performance", () => {
	it("creates snapshot in < 100ms", async () => {
		const start = Date.now();
		await manager.create(data);
		const duration = Date.now() - start;

		expect(duration).toBeLessThan(100);
	});

	it("lists 1000 snapshots in < 200ms", async () => {
		// Seed 1000 snapshots
		await seedSnapshots(1000);

		const start = Date.now();
		await manager.list({ limit: 100 });
		const duration = Date.now() - start;

		expect(duration).toBeLessThan(200);
	});
});
```

### Security Considerations

**Input Validation**:

```typescript
import ow from "ow";

function validateSnapshotData(
	data: unknown
): asserts data is CreateSnapshotData {
	ow(
		data,
		ow.object.exactShape({
			filePath: ow.string.nonEmpty,
			content: ow.string,
			message: ow.optional.string,
			tags: ow.optional.array.ofType(ow.string),
		})
	);
}
```

**SQL Injection Prevention**:

```typescript
// Always use prepared statements
const stmt = db.prepare("SELECT * FROM snapshots WHERE id = ?");
const snapshot = stmt.get(id);

// Never string concatenation
// ❌ BAD: db.prepare(`SELECT * FROM snapshots WHERE id = '${id}'`)
```

**Path Traversal Prevention**:

```typescript
import path from "path";

function validateFilePath(filePath: string, baseDir: string): string {
	const resolved = path.resolve(baseDir, filePath);

	if (!resolved.startsWith(baseDir)) {
		throw new ValidationError(
			"Path traversal detected",
			"filePath",
			filePath
		);
	}

	return resolved;
}
```

---

## Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Build
pnpm build

# Run specific test suite
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

### Pre-commit Checks

```bash
# Run before every commit
pnpm check        # Biome format + lint
pnpm typecheck    # TypeScript
pnpm test:unit    # Unit tests
```

### Release Process

```bash
# 1. Update version
pnpm version patch|minor|major

# 2. Build
pnpm build

# 3. Run all tests
pnpm test

# 4. Publish
pnpm publish
```

---

## Migration Strategy

### From Existing Implementation

**Step 1: Create Adapters**

```typescript
// Wrap existing code in adapter
class LegacyStorageAdapter implements StorageAdapter {
	constructor(private legacy: ExistingStorage) {}

	async save(snapshot: Snapshot): Promise<void> {
		await this.legacy.saveSnapshot(this.transformToLegacy(snapshot));
	}

	// ... implement other methods
}
```

**Step 2: Gradual Migration**

```typescript
// Support both old and new APIs
class HybridSnapshotManager {
	constructor(
		private newManager: SnapshotManager,
		private oldManager: OldManager
	) {}

	async create(data: CreateSnapshotData): Promise<Snapshot> {
		// New implementation
		const snapshot = await this.newManager.create(data);

		// Also update old system (temporary)
		await this.oldManager.createSnapshot(data);

		return snapshot;
	}
}
```

**Step 3: Deprecation**

```typescript
/**
 * @deprecated Use SnapshotManager.create instead
 */
async createSnapshot(data: any): Promise<any> {
  console.warn('createSnapshot is deprecated, use create instead');
  return this.create(data);
}
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Race Conditions

**Problem**: Concurrent operations on same snapshot

**Solution**: Use transactions and optimistic locking

```typescript
async update(id: string, data: UpdateSnapshotData): Promise<Snapshot> {
  return this.db.transaction(() => {
    const current = this.get(id);
    if (!current) throw new NotFoundError('Snapshot', id);

    // Check version
    if (current.version !== data.expectedVersion) {
      throw new ConflictError('Version mismatch', current, data);
    }

    // Update with new version
    return this.save({ ...current, ...data, version: current.version + 1 });
  });
}
```

### Pitfall 2: Memory Leaks in Cache

**Problem**: Cache grows unbounded

**Solution**: Use QuickLRU with size limits

```typescript
const cache = new QuickLRU<string, Snapshot>({
	maxSize: 1000,
	maxAge: 5 * 60 * 1000, // 5 minutes
	onEviction: (key, value) => {
		logger.debug("Cache evicted", { key });
	},
});
```

### Pitfall 3: SQL Injection

**Problem**: User input in SQL queries

**Solution**: Always use prepared statements

```typescript
// ✅ GOOD
const stmt = db.prepare("SELECT * FROM snapshots WHERE file_path = ?");
const results = stmt.all(userInput);

// ❌ BAD
const results = db
	.prepare(`SELECT * FROM snapshots WHERE file_path = '${userInput}'`)
	.all();
```

### Pitfall 4: Unhandled Promise Rejections

**Problem**: Async errors not caught

**Solution**: Use error boundaries

```typescript
async function withErrorBoundary<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		logger.error("Operation failed", { error });
		throw transformError(error);
	}
}
```

---

## Success Metrics

### Code Quality

-   [ ] TypeScript strict mode enabled
-   [ ] No 'any' types (except in tests)
-   [ ] All public APIs documented
-   [ ] Biome checks passing
-   [ ] Test coverage > 85%

### Performance

-   [ ] Snapshot create < 100ms
-   [ ] Snapshot retrieve < 50ms (cached)
-   [ ] Protection check < 10ms
-   [ ] List 100 items < 200ms
-   [ ] Cache hit rate > 70%

### Reliability

-   [ ] All error scenarios handled
-   [ ] No unhandled promise rejections
-   [ ] Graceful degradation on errors
-   [ ] Transaction safety guaranteed
-   [ ] No data loss scenarios

### Developer Experience

-   [ ] Clear API documentation
-   [ ] Comprehensive examples
-   [ ] Migration guides available
-   [ ] Type definitions exported
-   [ ] Good error messages

---

**Document Version**: 1.0
**Companion to**: sdk-architecture-design.md
**Last Updated**: 2025-10-21
