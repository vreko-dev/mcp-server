# @snapback/sdk

**Purpose**: Client-side SDK for interacting with SnapBack services
**Role**: Abstraction layer for storage, snapshots, protection, analytics

## Architecture

### Core SDK (`Snapback.ts`)
**Main entry point** with fluent API:
```ts
const snapback = new Snapback({ apiUrl, apiKey });
await snapback.init();

// Access sub-clients
snapback.snapshots.create(filePath, content);
snapback.protection.setLevel(filePath, 'block');
snapback.analytics.track('snapshot_created');
```

### Client Modules (`client/`)

**SnapshotClient** (`client/SnapshotClient.ts`):
- `create(filePath, content, metadata?)` → snapshot ID
- `get(id)` → snapshot data
- `list(options?)` → paginated snapshots
- `delete(id)` → soft delete
- `restore(id, targetPath?)` → file restoration

**ProtectionClient** (`client/ProtectionClient.ts`):
- `setLevel(filePath, level)` → 'watch'|'warn'|'block'
- `getLevel(filePath)` → current protection
- `listProtected()` → all protected files
- `removeProtection(filePath)`

**SnapbackAnalyticsClient** (`client/`):
- `track(event, properties?)` → telemetry
- `identify(userId, traits?)` → user context
- Respects offline mode + privacy settings

### Storage Adapters (`storage/`)

**LocalStorage** (`storage/LocalStorage.ts`):
- SQLite-backed local storage
- Used by VS Code extension
- File: `~/.snapback/snapshots.db`

**MemoryStorage** (`storage/MemoryStorage.ts`):
- In-memory HashMap
- Used for testing + ephemeral sessions

**StorageAdapter** interface:
```ts
interface StorageAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}
```

### Privacy Utilities (`privacy/`)

**Hasher** (`privacy/hasher.ts`):
- SHA-256 file content hashing
- Deduplication keys
- PII-safe identifiers

**Sanitizer** (`privacy/sanitizer.ts`):
- Removes file paths from error messages
- Redacts sensitive data before telemetry
- Whitelist-based field filtering

**Validator** (`privacy/validator.ts`):
- Validates telemetry payloads
- Ensures no PII leakage
- Enforces privacy contracts

### Cache (`cache/`)
**LRU Cache** (`cache/lru-cache.ts`):
- Generic LRU with TTL
- Used for snapshot metadata
- Configurable size (default: 500 entries)

## Usage Patterns

### VS Code Extension
```ts
import { Snapback, LocalStorage } from '@snapback/sdk';

const storage = new LocalStorage('~/.snapback/vscode.db');
const sdk = new Snapback({ storage, offline: true });

await sdk.snapshots.create('/path/file.ts', content);
```

### Web App (Next.js)
```ts
import { Snapback } from '@snapback/sdk';

const sdk = new Snapback({
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  apiKey: session.apiKey
});

const snapshots = await sdk.snapshots.list({ limit: 20 });
```

### MCP Server
```ts
import { MemoryStorage } from '@snapback/sdk';

const storage = new MemoryStorage(); // Ephemeral session state
const sdk = new Snapback({ storage });
```

## Configuration (`config.ts`)
```ts
interface SDKConfig {
  apiUrl?: string;      // Default: http://localhost:3000
  apiKey?: string;      // Optional for local-only mode
  storage?: StorageAdapter;
  offline?: boolean;    // Disable network calls
  telemetry?: boolean;  // Opt-in analytics (default: false)
}
```

## Error Handling (`storage/StorageErrors.ts`)
Custom error hierarchy:
- `StorageError` (base)
- `StorageConnectionError` → DB/API unavailable
- `StorageLockError` → Concurrent write conflict
- `StorageFullError` → Disk/quota exceeded
- `CorruptedDataError` → Invalid snapshot data

## Performance
- **Snapshot create**: <50ms (local), <200ms (API)
- **List queries**: <100ms (local), <500ms (API)
- **Cache hit ratio**: >80% for metadata
- **Offline fallback**: <10ms (memory storage)

## Privacy Guarantees
1. **No PII in telemetry**: File paths → hashes only
2. **Offline mode**: Zero network calls if enabled
3. **Local-first**: All data stored locally until explicitly synced
4. **Sanitizer validation**: 100% test coverage for PII leakage

## Dependencies
- **Storage**: better-sqlite3 (LocalStorage)
- **Crypto**: Node.js native (hasher)
- **HTTP**: fetch API (client)
- **Utils**: zod (validation)

## Testing
- **Unit**: All clients, storage adapters
- **Integration**: LocalStorage ↔ API sync
- **Privacy**: Sanitizer contract tests

## Related Docs
- VS Code Extension: [apps/vscode/CLAUDE.md](../../apps/vscode/CLAUDE.md)
- Web App: [apps/web/CLAUDE.md](../../apps/web/CLAUDE.md)
- API: [packages/api/CLAUDE.md](../api/CLAUDE.md)
