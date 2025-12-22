# @snapback/platform

Database layer and client utilities for SnapBack - Drizzle ORM integration, Supabase client, and database schema management.

## Overview

**@snapback/platform** provides the database abstraction layer for all SnapBack services. It handles:

- **Database Schema**: Define and manage Snapback and PostgreSQL tables
- **ORM Integration**: Drizzle ORM with PostgreSQL adapter
- **Database Queries**: Pre-built queries for common operations
- **Client Management**: Supabase client initialization
- **Migrations**: Schema versioning and migrations
- **Type Safety**: Zod validation for database operations

## Important

**This package is private** and not available on npm. It's used internally by SnapBack services:
- API server (`apps/api`)
- Web dashboard (`apps/web`)
- CLI tool (`apps/cli`)
- MCP server (`apps/mcp-server`)

## Architecture

### Core Systems

```
Platform/
├── Database Connection
│   ├── PostgreSQL adapter
│   ├── Supabase integration
│   ├── Connection pooling
│   └── Migration tools
│
├── Schema Definition
│   ├── PostgreSQL schema (builtin tables)
│   ├── SnapBack schema (app tables)
│   ├── Relationships
│   └── Indexes
│
├── Query Layer
│   ├── Pre-built queries
│   ├── Transaction support
│   ├── Batch operations
│   └── Custom query builder
│
├── Type Safety
│   ├── Zod schemas
│   ├── Type inference
│   ├── Validation
│   └── Runtime checks
│
└── Migration Tools
    ├── Schema generation
    ├── Database push
    ├── Migration execution
    └── Rollback support
```

### Key Modules

#### Database Client (`src/db/client.ts`)

Initialize and manage database connections:

```typescript
import { createClient, db } from "@snapback/platform/db/client";

// Create database connection
const dbClient = createClient({
  connectionString: process.env.DATABASE_URL,
});

// Use with queries
const snapshots = await db.query.snapshots.findMany();

// Transaction support
const result = await db.transaction(async (tx) => {
  await tx.insert(snapshots).values(snapshot);
  await tx.insert(events).values(event);
  return { success: true };
});
```

#### Schema Definitions

**PostgreSQL Schema** (`src/db/schema/postgres.ts`):

```typescript
import {
  users,
  sessions,
  accounts,
  verificationTokens
} from "@snapback/platform/db/schema/postgres";

// Tables provided by Better-auth
// - users: User account data
// - sessions: Active sessions
// - accounts: OAuth connections
// - verificationTokens: Email verification tokens
```

**SnapBack Schema** (`src/db/schema/snapback/`):

```typescript
import {
  snapshots,
  snapshotMetadata,
  protectedFiles,
  riskAssessments,
  sessionHistory
} from "@snapback/platform/db/schema/snapback";

// Core SnapBack tables:
// - snapshots: File snapshots
// - snapshotMetadata: Snapshot metadata
// - protectedFiles: Protection policies
// - riskAssessments: Risk analysis results
// - sessionHistory: Audit trail
```

#### Query Layer (`src/db/queries/`)

Pre-built queries for common operations:

```typescript
import {
  findUserById,
  findSnapshotsByFile,
  getLatestSnapshot,
  findProtectedFiles
} from "@snapback/platform/db/queries";

// Get user
const user = await findUserById(userId);

// Get snapshots for file
const snapshots = await findSnapshotsByFile(filePath);

// Get latest snapshot
const latest = await getLatestSnapshot(filePath);

// Get protected files
const protected = await findProtectedFiles(userId);
```

**Auth Queries** (`src/db/queries/auth.ts`):

```typescript
import {
  findUserByEmail,
  findApiKey,
  createApiKey
} from "@snapback/platform/db/queries/auth";

// User lookup
const user = await findUserByEmail("user@example.com");

// API key verification
const apiKey = await findApiKey(keyHash);

// Create new API key
const newKey = await createApiKey({
  userId: "user-123",
  name: "GitHub Actions",
});
```

#### Zod Validation (`src/db/zod.ts`)

Type-safe validation schemas:

```typescript
import {
  SnapshotSchema,
  CreateSnapshotSchema,
  UpdateSnapshotSchema
} from "@snapback/platform/db/zod";

// Validate input
const data = CreateSnapshotSchema.parse({
  filePath: "/src/app.ts",
  content: "...",
  timestamp: new Date(),
});

// Use parsed data (type-safe)
const snapshot = await createSnapshot(data);
```

#### Type Inference

Leverage TypeScript for type safety:

```typescript
import {
  type SelectSnapshot,
  type InsertSnapshot,
  type SelectUser
} from "@snapback/platform/db/schema/snapback";

// Type-safe insert
const snapshot: InsertSnapshot = {
  filePath: "/src/app.ts",
  content: fileContent,
  hash: await hashContent(fileContent),
  timestamp: new Date(),
};

await db.insert(snapshots).values(snapshot);

// Type-safe select
const retrieved: SelectSnapshot = await getSnapshot(id);
console.log(retrieved.filePath); // ✅ TypeScript knows this exists
```

## Development

### Getting Started

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.local.example .env.local

# Run migrations
pnpm db:push

# Build the package
pnpm build

# Run tests
pnpm test

# Type check
pnpm type-check

# Watch mode for development
pnpm dev
```

### Database Setup

```bash
# Generate migration files
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Push schema to database (for development)
pnpm db:push

# Open Drizzle Studio (database explorer)
pnpm db:studio

# Seed database (optional)
pnpm db:seed
```

### Project Structure

```
packages/platform/
├── src/
│   ├── db/
│   │   ├── client.ts                # Database client setup
│   │   ├── client/
│   │   │   ├── supabase.ts         # Supabase client
│   │   │   └── ...                 # Database utilities
│   │   ├── queries/
│   │   │   ├── index.ts            # Main queries
│   │   │   ├── auth.ts             # Auth queries
│   │   │   └── ...                 # Domain queries
│   │   ├── schema/
│   │   │   ├── postgres.ts         # Better-auth tables
│   │   │   └── snapback/           # SnapBack tables
│   │   │       ├── index.ts
│   │   │       ├── snapshots.ts
│   │   │       ├── files.ts
│   │   │       ├── risk.ts
│   │   │       └── ...
│   │   ├── adapters/
│   │   │   ├── TelemetrySinkDb.ts  # Telemetry adapter
│   │   │   └── ...
│   │   └── zod.ts                  # Validation schemas
│   ├── client/
│   │   ├── index.ts                # Client exports
│   │   └── ...
│   ├── index.ts                    # Main exports
│   └── ...
├── migrations/                      # Database migrations
├── scripts/
│   └── seed.ts                     # Database seeding
├── drizzle.config.ts               # Drizzle configuration
├── vitest.config.ts                # Test configuration
└── package.json
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific module
pnpm test schema
pnpm test queries

# Watch mode
pnpm test --watch

# With coverage
pnpm test --coverage

# Integration tests (against real database)
pnpm test:int
```

### Code Style

Follow the TypeScript patterns defined in the workspace:

- **Discriminated Unions**: For state management
- **Type Guards**: For type narrowing
- **Result Types**: For error handling (Result<T, E>)
- **Const Assertions**: For immutable data

See [Developer Guide](/docs/developer-guide) for examples.

## Configuration

### Environment Variables

```bash
# PostgreSQL connection
DATABASE_URL=postgresql://user:password@localhost:5432/snapback

# Supabase (optional)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGc...

# Database SSL
DB_SSL_ENABLED=true
```

### Drizzle Configuration (`drizzle.config.ts`)

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    table: "__drizzle_migrations__",
    schema: "drizzle",
  },
});
```

## Dependencies

Platform depends on:

- **@snapback/contracts**: Type definitions and schemas
- **@snapback/infrastructure**: Logging and observability
- **@snapback/config**: Configuration utilities
- **drizzle-orm**: ORM framework
- **drizzle-zod**: Zod schema generation
- **pg**: PostgreSQL driver
- **@supabase/supabase-js**: Supabase client

Platform does **NOT** depend on:
- UI frameworks
- Business logic
- Service layers

## Performance Considerations

### Query Optimization

- Database indexes on frequently queried fields
- Connection pooling (default: 10 connections)
- Prepared statements for security
- Lazy loading relationships

### Migration Strategy

- Zero-downtime migrations
- Backward-compatible schema changes
- Tested migration rollbacks
- Audit trail for all changes

### Scaling

- Read replicas support via Supabase
- Connection pooling via PgBouncer
- Query caching strategies
- Batch operations for bulk updates

## Observability

Platform includes structured logging for database operations:

```typescript
import { logger } from "@snapback/infrastructure";

// Automatically logged:
// - Query execution (slow queries tracked)
// - Connection events
// - Migration runs
// - Transaction rollbacks
```

Enable debug logging:

```bash
LOG_LEVEL=debug pnpm dev
```

## Integration Examples

### Using in Express API

```typescript
import { db } from "@snapback/platform/db/client";
import { snapshots } from "@snapback/platform/db/schema/snapback";

app.get("/api/snapshots/:id", async (req, res) => {
  const snapshot = await db.query.snapshots.findFirst({
    where: (snapshots) => eq(snapshots.id, req.params.id),
  });

  res.json(snapshot);
});
```

### Using in Next.js

```typescript
import { db } from "@snapback/platform/db/client";

export async function GET(req: Request) {
  const snapshots = await db.query.snapshots.findMany({
    limit: 10,
  });

  return Response.json(snapshots);
}
```

### Using Zod Validation

```typescript
import { CreateSnapshotSchema } from "@snapback/platform/db/zod";

export async function createSnapshot(input: unknown) {
  const data = CreateSnapshotSchema.parse(input);
  // data is now type-safe
  return db.insert(snapshots).values(data);
}
```

## Migration Workflow

1. **Define schema changes** in `src/db/schema/`
2. **Generate migration** with `pnpm db:generate`
3. **Review migration** in `migrations/`
4. **Test locally** with `pnpm db:push`
5. **Deploy** migration in production
6. **Verify** with `pnpm db:studio`

## Contributing

To contribute to Platform:

1. Understand database schema implications
2. Write migrations for schema changes
3. Add tests for queries
4. Follow code style guidelines
5. Run `pnpm test` and `pnpm build`
6. Submit PR with migration review

See [Contributing Guide](/docs/contributing) for details.

### Database Changes Checklist

- [ ] Schema change is backward compatible
- [ ] Migration is written and tested
- [ ] Type definitions are updated
- [ ] Zod schemas are updated
- [ ] Queries are updated if needed
- [ ] Performance implications reviewed
- [ ] Tests pass

## Resources

- **Contracts**: [Type Definitions](../contracts/README.md)
- **Infrastructure**: [Logging & Observability](../infrastructure/README.md)
- **Auth**: [Authentication System](../auth/README.md)
- **Drizzle Docs**: https://orm.drizzle.team
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Developer Guide**: [Technical Guide](/docs/developer-guide)
- **Contributing**: [How to Contribute](/docs/contributing)

## License

Proprietary - SnapBack Platform is not open source
