# @snapback-oss/sdk

## 0.1.0 (2025-12-04)

### Features

**Initial public release of SnapBack TypeScript SDK**

- **Snapshot Management**: Full CRUD operations
  - Create snapshots with file patterns
  - List snapshots with filtering
  - Get snapshot details
  - Restore from snapshots
  - Delete snapshots

- **File Protection**: Declarative file protection
  - Protect files by pattern
  - Multiple protection levels
  - List protected files
  - Remove protection

- **Storage**: Flexible storage adapters
  - Local storage with SQLite (optional)
  - HTTP storage for remote API
  - Clean storage interface for custom adapters

- **Type Safety**: Full TypeScript support
  - Type-safe API client
  - Validated request/response types
  - IDE autocomplete support

- **Developer Experience**:
  - Promise-based async API
  - Automatic retries with exponential backoff
  - Comprehensive error handling
  - Request/response logging

### What's Included

- ✅ Complete SDK for SnapBack API
- ✅ Type-safe snapshot operations
- ✅ File protection management
- ✅ HTTP client with retries
- ✅ Storage adapters (HTTP, optional SQLite)

### What's Not Included (Private)

- ❌ better-sqlite3 bundled (optional peer dep)
- ❌ Platform-specific integrations
- ❌ Premium/enterprise features
- ❌ Advanced analytics hooks

### Installation

```bash
npm install @snapback-oss/sdk
# or
pnpm add @snapback-oss/sdk
```

---

**Full Changelog**: https://github.com/snapback-dev/sdk/commits/main
