# SnapBack Contracts

Type definitions, schemas, and API contracts for SnapBack.

## Overview

Contracts is the **source of truth** for all SnapBack types. It defines:

- **Type Definitions**: TypeScript types for all domain objects
- **Schemas**: Zod schemas for runtime validation
- **API Contracts**: Request/response shapes
- **Event Definitions**: Types for event bus events
- **Generated APIs**: OpenAPI specifications

## Two Versions

| Package | Access | Use Case |
|---------|--------|----------|
| **`@snapback/contracts`** | Private | Internal SnapBack packages |
| **`@snapback-oss/contracts`** | Public npm | Community and open-source users |

## Installation

### Using the Public Version

```bash
npm install @snapback-oss/contracts
```

### Internal Development

The private version is used within the monorepo:

```typescript
import type { Snapshot, FileMetadata } from "@snapback/contracts";
```

## Package Structure

```
packages/contracts/
├── src/
│   ├── events/
│   │   ├── core.ts           # Public event types
│   │   ├── infrastructure.ts  # Private analytics events
│   │   ├── migrate.ts         # Private migration events
│   │   └── legacy.ts          # Legacy event types
│   ├── types/
│   │   ├── snapshot.ts        # Snapshot types
│   │   ├── file.ts            # File metadata types
│   │   ├── risk.ts            # Risk assessment types
│   │   ├── session.ts         # Session types
│   │   └── index.ts           # Public exports
│   ├── schemas/
│   │   ├── snapshot.ts        # Snapshot validation
│   │   ├── file.ts            # File metadata validation
│   │   └── index.ts           # All schemas
│   ├── api/
│   │   ├── requests.ts        # API request types
│   │   ├── responses.ts       # API response types
│   │   └── index.ts           # Public API types
│   └── index.ts               # Main exports
├── generated/
│   ├── openapi.json           # OpenAPI spec
│   └── openapi.yaml           # OpenAPI YAML
├── openapi/
│   └── definitions.ts         # OpenAPI registry
├── scripts/
│   └── generate-openapi.ts    # OpenAPI generation
├── test/
│   ├── snapshots/
│   ├── files/
│   ├── risk/
│   └── events/
└── package.json               # Package configuration
```

## Core Types

### Snapshot

```typescript
import type { Snapshot, SnapshotMetadata } from "@snapback-oss/contracts";

// Full snapshot with content
type Snapshot = {
  id: string;
  filePath: string;
  content: string;
  metadata: SnapshotMetadata;
  timestamp: number;
};

// Snapshot metadata (transmitted, content not)
type SnapshotMetadata = {
  fileSize: number;
  lineCount: number;
  language: string;
  encoding: string;
  lastModified: number;
};
```

### FileMetadata

```typescript
import type { FileMetadata } from "@snapback-oss/contracts";

type FileMetadata = {
  filePath: string;
  fileHash: string;
  sizeBytes: number;
  lineCount: number;
  language: string;
  complexity: ComplexityMetrics;
  risk: RiskAssessment;
  timestamp: number;
};
```

### Risk Assessment

```typescript
import type { RiskAssessment, RiskFactor } from "@snapback-oss/contracts";

type RiskAssessment = {
  score: number; // 0-1
  factors: RiskFactor[];
  severity: "low" | "medium" | "high";
};

type RiskFactor =
  | "high_complexity"
  | "many_dependencies"
  | "recent_changes"
  | "large_file"
  | "deeply_nested";
```

## Event Types

### Public Events

```typescript
import type { SnapshotEvent } from "@snapback-oss/contracts";

type SnapshotEvent =
  | { type: "snapshot.created"; snapshotId: string; timestamp: number }
  | { type: "snapshot.restored"; snapshotId: string; timestamp: number }
  | { type: "snapshot.deleted"; snapshotId: string; timestamp: number };
```

### Private Events (Internal Only)

Events defined in `src/events/infrastructure.ts` are not exported publicly:

```typescript
// Not available in @snapback-oss/contracts
type AnalyticsEvent = { /* ... */ };
type TelemetryEvent = { /* ... */ };
```

## Zod Schemas

Validate data at runtime:

```typescript
import { SnapshotSchema, FileMetadataSchema } from "@snapback-oss/contracts";

// Validate snapshot
const result = SnapshotSchema.safeParse(data);

if (result.success) {
  const snapshot = result.data;
  // snapshot is type-safe Snapshot
} else {
  console.error("Invalid snapshot:", result.error);
}
```

## API Types

### Request Types

```typescript
import type { CreateSnapshotRequest, RestoreSnapshotRequest } from "@snapback-oss/contracts";

type CreateSnapshotRequest = {
  filePath: string;
  content: string;
  metadata: SnapshotMetadata;
};
```

### Response Types

```typescript
import type { CreateSnapshotResponse, ErrorResponse } from "@snapback-oss/contracts";

type CreateSnapshotResponse = {
  success: true;
  data: Snapshot;
};

type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};
```

## Conditional Exports

The package uses conditional exports to hide private types from npm:

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./events": "./dist/events/core.js",
    "./types": "./dist/types/index.js",
    "./schemas": "./dist/schemas/index.js",
    "./api": "./dist/api/index.js"
  }
}
```

**Not exported** (private only):
- `./events/infrastructure`
- `./events/migrate`
- Internal type paths

## Generating OpenAPI Specs

The package includes a script to generate OpenAPI specifications:

```bash
# Generate OpenAPI spec
pnpm run generate-openapi

# Output files
# - generated/openapi.json
# - generated/openapi.yaml
```

Used by:
- API documentation
- Code generation tools
- SDK generation

## Development

### Working with Types

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Type check
pnpm type-check

# Generate OpenAPI
pnpm generate-openapi
```

### Adding New Types

1. Create type definition in `src/types/`
2. Export from `src/types/index.ts`
3. Create Zod schema in `src/schemas/`
4. Add tests in `test/`
5. Run `pnpm build` and `pnpm type-check`
6. If public, regenerate OpenAPI: `pnpm generate-openapi`

### Adding New Events

1. Create event type in appropriate file:
   - `src/events/core.ts` (public)
   - `src/events/infrastructure.ts` (private)
2. Add validation schema
3. Update event registry
4. Test event emission and handling

## Testing

```bash
# Run all tests
pnpm test

# Run tests for specific area
pnpm test types
pnpm test events
pnpm test schemas

# Watch mode
pnpm test --watch

# With coverage
pnpm test --coverage
```

## OSS Sync Process

### How It Works

1. **Source**: `packages/contracts/src` (master)
2. **Filtering**: Remove private files (infrastructure.ts, migrate.ts)
3. **Export**: Use `package.json` conditional exports
4. **Publish**: `packages-oss/contracts` synced automatically

### What's Public

✅ Core event types (`events/core.ts`)
✅ Domain types (`types/*.ts`)
✅ Validation schemas (`schemas/*.ts`)
✅ API types (`api/*.ts`)
✅ Generated OpenAPI

### What's Private

❌ Infrastructure events (`events/infrastructure.ts`)
❌ Migration events (`events/migrate.ts`)
❌ Internal utilities
❌ Proprietary algorithms

## Contributing

To contribute to contracts:

1. Update types or schemas
2. Add/update tests
3. Run `pnpm test` and `pnpm build`
4. If adding public types, regenerate OpenAPI
5. Submit PR

See [Contributing Guide](/docs/contributing) for details.

## References

- **Documentation**: [SnapBack Docs](/docs)
- **Developer Guide**: [Developer Guide](/docs/developer-guide)
- **API Reference**: Generated from OpenAPI spec
- **Events**: [Event Types Documentation](/docs)

## License

- **Public (`@snapback-oss/contracts`)**: MIT
- **Private (`@snapback/contracts`)**: Proprietary
