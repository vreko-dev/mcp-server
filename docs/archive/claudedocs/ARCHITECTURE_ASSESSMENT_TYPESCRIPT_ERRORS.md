# Architectural Assessment: TypeScript Errors Analysis

**Date**: 2025-10-05
**Context**: System design review of TypeScript errors across authentication, database, and webhook layers
**Scope**: Type safety architecture, database initialization patterns, computed vs stored fields

---

## Executive Summary

### Critical Findings

**Database Initialization Pattern (CRITICAL)**: Null database client passed to authentication adapter represents a systemic initialization sequencing issue that could cause runtime failures.

**Type System Gap (HIGH)**: User statistics (`totalCheckpoints`, `totalRecoveries`) are treated as database columns in business logic but exist only as computed aggregates, revealing architectural misalignment between data model and business requirements.

**Error Handling Inconsistency (MEDIUM)**: Webhook layer uses non-standard error handling (`error.message || error`) indicating lack of centralized error management strategy.

---

## 1. Database Initialization Architecture

### Current Pattern Analysis

**Location**: `/packages/auth/auth.ts:38-42`

```typescript
export const auth = betterAuth({
	database: drizzle.db
		? drizzleAdapter(drizzle.db, { provider: "pg" })
		: undefined,
	// ...
});
```

**Location**: `/packages/database/drizzle/client.ts:18-43`

```typescript
let db: ReturnType<typeof drizzle<...>> | null = null;
let pool: Pool | null = null;

if (databaseUrl) {
  pool = new Pool({ connectionString: databaseUrl });
  db = drizzle(pool, { schema: { ...schema, ...snapbackSchema } });
} else if (isSupabase) {
  console.warn("...Using direct Supabase client only.");
  db = null;
  pool = null;
} else {
  throw new Error("DATABASE_URL is not set...");
}
```

### Architectural Issues

#### 1.1 Null-Safe Fallback Anti-Pattern

**Problem**: Authentication system accepts `null` database via conditional adapter initialization.

**Risk Assessment**:

-   **Probability**: Medium (occurs when `DATABASE_URL` unset but Supabase config present)
-   **Impact**: Critical (authentication completely non-functional)
-   **Detection**: Runtime only - no compile-time safety

**Root Cause**: Competing database initialization strategies (Drizzle ORM vs Supabase direct) without explicit selection mechanism.

#### 1.2 Environment-Based Branching

**Current Logic**:

```
if DATABASE_URL → Use Drizzle with PostgreSQL
else if Supabase detected → Set db = null, warn
else → Throw error
```

**Design Flaw**: Silent degradation mode (`db = null`) creates ambiguous failure states.

### Architectural Recommendation: Fail-Fast Initialization

**Pattern**: Explicit database strategy selection with startup validation

```typescript
// Recommended approach:
type DatabaseStrategy = "drizzle-postgres" | "supabase-direct";

interface DatabaseConfig {
	strategy: DatabaseStrategy;
	client: NonNullable<DatabaseClient>;
	validateConnection: () => Promise<void>;
}

// Initialization module
export async function initializeDatabase(): Promise<DatabaseConfig> {
	const strategy = selectDatabaseStrategy(); // Explicit selection

	if (strategy === "drizzle-postgres") {
		if (!process.env.DATABASE_URL) {
			throw new DatabaseInitializationError(
				"DATABASE_URL required for Drizzle strategy"
			);
		}
		const pool = new Pool({ connectionString: process.env.DATABASE_URL });
		const client = drizzle(pool, { schema });

		await validateConnection(pool); // Fail fast on startup
		return {
			strategy,
			client,
			validateConnection: () => validateConnection(pool),
		};
	}

	// Other strategies...
	throw new DatabaseInitializationError(`Unknown strategy: ${strategy}`);
}

// Usage in auth:
const dbConfig = await initializeDatabase();
export const auth = betterAuth({
	database: drizzleAdapter(dbConfig.client, { provider: "pg" }),
	// ...
});
```

**Benefits**:

-   **Compile-time Safety**: No null propagation to adapter
-   **Startup Validation**: Connection issues detected immediately
-   **Clear Failure Modes**: Explicit errors vs silent degradation
-   **Testability**: Mock database strategies in test environments

### Long-Term Pattern: Database-as-Dependency

**Architectural Principle**: Invert dependency - authentication should receive initialized database, not conditionally create it.

```typescript
// Module boundary approach
export function createAuthSystem(database: DatabaseClient) {
	return betterAuth({
		database: drizzleAdapter(database, { provider: "pg" }),
		// ...
	});
}

// Composition at application entry
const database = await initializeDatabase();
export const auth = createAuthSystem(database);
```

**Advantages**:

-   Clear ownership boundaries
-   Testable without environment dependencies
-   Supports multiple database instances (multi-tenancy, read replicas)

---

## 2. User Statistics Type Architecture

### Current State: Schema vs Business Logic Mismatch

#### 2.1 Schema Definition

**Base User Table** (`/packages/database/drizzle/schema/postgres.ts:38-56`):

```typescript
export const user = pgTable("user", {
	id: varchar("id", { length: 255 })
		.$defaultFn(() => cuid())
		.primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	// ... auth-related fields only
	// NO totalCheckpoints or totalRecoveries fields
});
```

**Checkpoints Table** (`/packages/database/drizzle/schema/snapback/checkpoints.ts`):

```typescript
export const checkpoints = pgTable("checkpoints", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id),
	// Checkpoint metadata...
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

#### 2.2 Business Logic Assumptions

**Webhook Usage** (`/packages/api/modules/webhooks/inapp-messaging.ts:226-227`):

```typescript
const userContext = {
	name: user.name,
	email: user.email,
	totalCheckpoints: user.totalCheckpoints || 0, // ❌ Property doesn't exist
	totalRecoveries: user.totalRecoveries || 0, // ❌ Property doesn't exist
	// ...
};
```

**Email Orchestrator** (`/packages/api/modules/webhooks/email-orchestrator.ts:73-74`):

```typescript
const userProperties = {
	totalCheckpoints: user.totalCheckpoints || 0, // ❌ Property doesn't exist
	totalRecoveries: user.totalRecoveries || 0, // ❌ Property doesn't exist
	// ...
};
```

### Architectural Decision: Computed vs Stored

#### Option A: Computed Aggregates (Current Implicit Model)

**Implementation**:

```typescript
// Query layer extension
export async function getUserWithStats(userId: string) {
	const user = await db.query.user.findFirst({
		where: eq(users.id, userId),
	});

	if (!user) return null;

	const [checkpointCount] = await db
		.select({ count: sql`COUNT(*)`.mapWith(Number) })
		.from(checkpoints)
		.where(eq(checkpoints.userId, userId));

	// Similar for recoveries...

	return {
		...user,
		totalCheckpoints: checkpointCount?.count || 0,
		totalRecoveries: 0, // Compute from recoveries table when exists
	};
}
```

**Type Definition**:

```typescript
// packages/database/drizzle/schema/postgres.ts
export type User = typeof user.$inferSelect;

export type UserWithStats = User & {
	totalCheckpoints: number;
	totalRecoveries: number;
};
```

**Pros**:

-   Always accurate (no stale data)
-   Simpler schema (fewer columns to maintain)
-   No update overhead on checkpoint creation

**Cons**:

-   Query overhead on every user access
-   N+1 query risk if not properly batched
-   Cannot index or filter by stats efficiently

#### Option B: Materialized Denormalization (Recommended)

**Schema Extension**:

```typescript
// packages/database/drizzle/schema/postgres.ts
export const user = pgTable("user", {
	// ... existing fields

	// Usage statistics (denormalized)
	totalCheckpoints: integer("total_checkpoints").default(0).notNull(),
	totalRecoveries: integer("total_recoveries").default(0).notNull(),
	lastCheckpointAt: timestamp("last_checkpoint_at"),
	lastRecoveryAt: timestamp("last_recovery_at"),

	// Metadata
	statsUpdatedAt: timestamp("stats_updated_at").defaultNow(),
});
```

**Update Strategy** (Database Triggers):

```sql
-- Create trigger to maintain stats
CREATE OR REPLACE FUNCTION update_user_checkpoint_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "user"
    SET
      total_checkpoints = total_checkpoints + 1,
      last_checkpoint_at = NEW.created_at,
      stats_updated_at = NOW()
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "user"
    SET
      total_checkpoints = total_checkpoints - 1,
      stats_updated_at = NOW()
    WHERE id = OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintain_checkpoint_stats
AFTER INSERT OR DELETE ON checkpoints
FOR EACH ROW
EXECUTE FUNCTION update_user_checkpoint_stats();
```

**Application-Level Alternative** (if triggers unavailable):

```typescript
// packages/database/drizzle/queries/checkpoints.ts
export async function createCheckpoint(data: NewCheckpoint) {
	return await db.transaction(async (tx) => {
		// Insert checkpoint
		const [checkpoint] = await tx
			.insert(checkpoints)
			.values(data)
			.returning();

		// Update user stats atomically
		await tx
			.update(user)
			.set({
				totalCheckpoints: sql`${user.totalCheckpoints} + 1`,
				lastCheckpointAt: checkpoint.createdAt,
				statsUpdatedAt: new Date(),
			})
			.where(eq(user.id, data.userId));

		return checkpoint;
	});
}
```

**Pros**:

-   Single query access (O(1) vs O(n) joins)
-   Indexable and filterable (e.g., "users with >100 checkpoints")
-   Better for analytics and dashboards
-   Supports eventual consistency patterns

**Cons**:

-   Schema complexity (more columns)
-   Update coordination overhead
-   Risk of stale data if updates fail
-   Migration complexity (backfilling existing data)

#### Option C: Hybrid Cached Aggregates

**Implementation**:

```typescript
// packages/database/drizzle/schema/snapback/usage-stats-cache.ts
export const userStatsCache = pgTable("user_stats_cache", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),

	totalCheckpoints: integer("total_checkpoints").default(0).notNull(),
	totalRecoveries: integer("total_recoveries").default(0).notNull(),

	lastCheckpointAt: timestamp("last_checkpoint_at"),
	lastRecoveryAt: timestamp("last_recovery_at"),

	// Cache metadata
	computedAt: timestamp("computed_at").defaultNow().notNull(),
	ttlSeconds: integer("ttl_seconds").default(3600), // 1 hour
});

// Query with cache fallback
export async function getUserWithStats(userId: string) {
	const [cached] = await db
		.select()
		.from(userStatsCache)
		.where(eq(userStatsCache.userId, userId))
		.limit(1);

	const isStale =
		!cached ||
		Date.now() - cached.computedAt.getTime() > cached.ttlSeconds * 1000;

	if (!isStale) {
		const user = await db.query.user.findFirst({
			where: eq(users.id, userId),
		});
		return { ...user, ...cached };
	}

	// Recompute and cache
	const stats = await recomputeUserStats(userId);
	await db
		.insert(userStatsCache)
		.values({ userId, ...stats })
		.onConflictDoUpdate({
			target: userStatsCache.userId,
			set: { ...stats, computedAt: new Date() },
		});

	return { ...user, ...stats };
}
```

**Pros**:

-   Best of both worlds (accuracy + performance)
-   Configurable consistency vs performance tradeoff
-   Easy to invalidate and refresh
-   Supports background refresh jobs

**Cons**:

-   Most complex implementation
-   Additional table to manage
-   Potential cache consistency issues

### Recommended Architecture: Materialized Denormalization

**Rationale**:

1. **Query Performance**: User statistics accessed frequently (webhooks, emails, dashboards)
2. **Analytics Requirements**: Need to filter users by usage (e.g., "trial at risk" cohort)
3. **Consistency Model**: Strong consistency not required (eventual consistency acceptable)
4. **Scale Characteristics**: Read-heavy workload benefits from denormalization

**Migration Path**:

```sql
-- Step 1: Add columns to user table
ALTER TABLE "user"
  ADD COLUMN total_checkpoints INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN total_recoveries INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN last_checkpoint_at TIMESTAMP,
  ADD COLUMN stats_updated_at TIMESTAMP DEFAULT NOW();

-- Step 2: Backfill existing data
UPDATE "user" u
SET
  total_checkpoints = (
    SELECT COUNT(*) FROM checkpoints WHERE user_id = u.id
  ),
  stats_updated_at = NOW();

-- Step 3: Create maintenance triggers (see trigger SQL above)

-- Step 4: Add indexes for filtering
CREATE INDEX idx_user_stats_checkpoints ON "user"(total_checkpoints DESC);
CREATE INDEX idx_user_stats_recoveries ON "user"(total_recoveries DESC);
```

**Type System Integration**:

```typescript
// packages/database/drizzle/schema/postgres.ts
export const user = pgTable("user", {
	// ... existing fields
	totalCheckpoints: integer("total_checkpoints").default(0).notNull(),
	totalRecoveries: integer("total_recoveries").default(0).notNull(),
	lastCheckpointAt: timestamp("last_checkpoint_at"),
	statsUpdatedAt: timestamp("stats_updated_at").defaultNow(),
});

// Type automatically includes new fields
export type User = typeof user.$inferSelect; // ✅ Now includes stats
```

---

## 3. Webhook Error Handling Architecture

### Current Pattern Issues

**Location**: `/packages/api/modules/webhooks/inapp-messaging.ts`

```typescript
catch (error) {
  logger.error("Failed to schedule in-app message", {
    error: error.message || error, // ❌ Line 112: Property access on unknown
    userId,
  });
  return false;
}
```

**TypeScript Error**:

```
TS18046: 'error' is of type 'unknown'.
```

### Problem Analysis

#### 3.1 Non-Standard Error Coercion

**Anti-Pattern**: `error.message || error`

**Issues**:

-   Assumes `error` has `message` property (not guaranteed)
-   Falls back to entire error object (unstructured logging)
-   Type-unsafe property access on `unknown`

#### 3.2 Inconsistent Error Handling

**Observation**: Multiple files use different error handling patterns:

```typescript
// Pattern A: Property access (type-unsafe)
catch (error) {
  logger.error("...", { error: error.message || error });
}

// Pattern B: Type assertion (bypasses safety)
catch (error: any) {
  logger.error("...", { error: error.message || String(error) });
}

// Pattern C: Type guard (proper)
catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error("...", { error: message });
}
```

### Recommended Architecture: Centralized Error Handling

#### 3.3 Error Utilities Module

**Location**: `/packages/utils/src/errors.ts`

```typescript
/**
 * Type-safe error message extraction
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === "string") {
		return error;
	}

	if (error && typeof error === "object" && "message" in error) {
		return String(error.message);
	}

	return "Unknown error occurred";
}

/**
 * Structured error serialization for logging
 */
export function serializeError(error: unknown): {
	message: string;
	name?: string;
	stack?: string;
	code?: string | number;
	[key: string]: unknown;
} {
	if (error instanceof Error) {
		return {
			message: error.message,
			name: error.name,
			stack: error.stack,
			...(error.cause && { cause: serializeError(error.cause) }),
		};
	}

	if (typeof error === "string") {
		return { message: error };
	}

	if (error && typeof error === "object") {
		return {
			message:
				"message" in error ? String(error.message) : "Unknown error",
			...error,
		};
	}

	return { message: String(error) };
}

/**
 * Type guard for Error objects
 */
export function isError(error: unknown): error is Error {
	return error instanceof Error;
}

/**
 * Application-specific error class
 */
export class ApplicationError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly statusCode: number = 500,
		public readonly context?: Record<string, unknown>
	) {
		super(message);
		this.name = "ApplicationError";
	}
}
```

#### 3.4 Logger Integration

**Enhanced Logger Wrapper**:

```typescript
// packages/logs/src/index.ts
import { serializeError } from "@snapback/utils/errors";

export const logger = {
	error(
		message: string,
		context?: { error?: unknown; [key: string]: unknown }
	) {
		const { error, ...rest } = context || {};

		baseLogger.error(message, {
			...rest,
			...(error && { error: serializeError(error) }),
		});
	},

	// ... other methods
};
```

#### 3.5 Updated Webhook Pattern

```typescript
// packages/api/modules/webhooks/inapp-messaging.ts
import { getErrorMessage, serializeError } from '@snapback/utils/errors';
import { logger } from '@snapback/logs';

catch (error) {
  logger.error("Failed to schedule in-app message", {
    error, // Automatically serialized by logger
    userId,
  });
  return false;
}

// Alternative explicit approach:
catch (error) {
  logger.error("Failed to schedule in-app message", {
    error: serializeError(error),
    errorMessage: getErrorMessage(error),
    userId,
  });
  return false;
}
```

### Error Handling Strategy: Layered Architecture

```
┌─────────────────────────────────────────┐
│  Application Layer                      │
│  - Catch business logic errors          │
│  - Convert to ApplicationError          │
│  - Preserve context                     │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Error Utilities Layer                  │
│  - Type-safe extraction                 │
│  - Structured serialization             │
│  - Error classification                 │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Logging Layer                          │
│  - Automatic error serialization        │
│  - Context enrichment                   │
│  - Destination routing                  │
└─────────────────────────────────────────┘
```

---

## 4. Promise Handling Issue

### Error Analysis

**Location**: `/packages/api/modules/webhooks/inapp-messaging.ts:263`

```typescript
const textResponse = await response.text(); // ❌ Line 263
```

**TypeScript Error**:

```
TS2349: This expression is not callable.
Type 'Promise<string>' has no call signatures.
```

### Root Cause

**Likely Cause**: `response.text()` called twice

```typescript
const response = await streamText({
	model: textModel,
	// ...
});

// First call - returns Promise<string>
const textResponse = await response.text();

// Second call attempt - `response.text` now holds a Promise, not a method
const again = await response.text(); // ❌ Error: trying to call a Promise
```

### Architectural Issue: Stream Consumption Pattern

**Problem**: `streamText()` returns a stream that can only be consumed once.

**AI SDK Pattern** (from Vercel AI SDK):

```typescript
const result = await streamText({
	model: textModel,
	prompt: "...",
});

// Correct consumption patterns:

// Option A: Stream (for SSE/streaming responses)
for await (const chunk of result.textStream) {
	process.stdout.write(chunk);
}

// Option B: Full text (awaits entire response)
const fullText = await result.text;

// Option C: Text stream with parts
const { text, finishReason } = await result;
```

### Recommended Fix

```typescript
// packages/api/modules/webhooks/inapp-messaging.ts:233-276
export async function generatePersonalizedMessage(
	userId: string,
	context: {
		messageType: string;
		userProperties: Record<string, any>;
		eventProperties?: Record<string, any>;
	}
) {
	try {
		// ... user lookup ...

		const result = await streamText({
			model: textModel,
			system: `...`,
			prompt: `...`,
		});

		// Correct: await the text property (Promise<string>)
		const textResponse = await result.text;

		try {
			const parsed = JSON.parse(textResponse);
			return {
				title: parsed.title,
				content: parsed.content,
			};
		} catch (parseError) {
			return {
				title: `${context.messageType} Message`,
				content: textResponse,
			};
		}
	} catch (error) {
		logger.error("Failed to generate personalized message", {
			error,
			userId,
		});
		return null;
	}
}
```

**Key Changes**:

1. `await result.text()` → `await result.text` (property, not method)
2. Single consumption of stream response
3. Proper error handling with updated error utilities

---

## 5. Type Safety Architecture Assessment

### Current State: Layered Type Propagation

```
┌──────────────────────────────────────────────────────┐
│  Database Schema (Drizzle)                           │
│  - pgTable definitions                               │
│  - Column types + constraints                        │
│  - Relations                                         │
└──────────────────────────────────────────────────────┘
                    │
                    │ $inferSelect / $inferInsert
                    ▼
┌──────────────────────────────────────────────────────┐
│  ORM Types (Generated)                               │
│  - User, Session, Organization, etc.                 │
│  - Type-safe query builders                          │
└──────────────────────────────────────────────────────┘
                    │
                    │ API contracts
                    ▼
┌──────────────────────────────────────────────────────┐
│  API Layer (oRPC)                                    │
│  - Type-safe procedures                              │
│  - Zod validation schemas                            │
│  - Input/output contracts                            │
└──────────────────────────────────────────────────────┘
                    │
                    │ Type exports
                    ▼
┌──────────────────────────────────────────────────────┐
│  Client Layer (Web/VSCode)                           │
│  - Auto-generated client types                       │
│  - End-to-end type safety                            │
└──────────────────────────────────────────────────────┘
```

### Type System Gaps Identified

#### 5.1 Database → Application Boundary

**Gap**: Computed fields not represented in schema types

**Current**:

```typescript
type User = typeof user.$inferSelect; // From schema
// ❌ Missing: totalCheckpoints, totalRecoveries
```

**Required**:

```typescript
// Extended types for business logic
type UserWithStats = User & {
	totalCheckpoints: number;
	totalRecoveries: number;
};

// Or via schema extension (recommended)
export const user = pgTable("user", {
	// ... add stats columns directly
});
```

#### 5.2 Better Auth → Application Integration

**Gap**: Better Auth types not fully integrated with extended user schema

**Current**:

```typescript
export const auth = betterAuth({
	user: {
		additionalFields: {
			onboardingComplete: { type: "boolean", required: false },
			locale: { type: "string", required: false },
		},
	},
	// ...
});

export type Session = typeof auth.$Infer.Session;
```

**Issue**: `additionalFields` defined in Better Auth config but not in Drizzle schema baseline.

**Recommendation**: Single source of truth

```typescript
// Option A: Schema-first (recommended)
// 1. Define all fields in Drizzle schema
export const user = pgTable("user", {
	id: varchar("id", { length: 255 }).primaryKey(),
	// ... Better Auth required fields
	onboardingComplete: boolean("onboardingComplete").default(false),
	locale: text("locale"),
	// ... application fields
});

// 2. Configure Better Auth to use schema
export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg" }),
	// No additionalFields - use schema directly
});
```

#### 5.3 Webhook → Business Logic Types

**Gap**: Webhook event types loosely coupled to database types

**Current**:

```typescript
// packages/api/modules/webhooks/types.ts
export interface HubSpotContactProperties {
	email: string;
	total_checkpoints?: number; // ❌ Optional, but business logic assumes present
	total_recoveries?: number;
	[key: string]: any; // ❌ Escape hatch loses type safety
}
```

**Recommended**:

```typescript
import type { UserWithStats } from "@snapback/database";

export interface HubSpotContactProperties {
	// Map database types to external format
	email: string;
	firstname?: string;
	lastname?: string;
	total_checkpoints: number; // Required in sync
	total_recoveries: number;
	plan?: string;
	subscription_status?: string;
}

export function mapUserToHubSpotContact(
	user: UserWithStats
): HubSpotContactProperties {
	return {
		email: user.email,
		firstname: user.name.split(" ")[0],
		total_checkpoints: user.totalCheckpoints,
		total_recoveries: user.totalRecoveries,
		// Type-safe mapping with compile-time checks
	};
}
```

---

## 6. Long-Term Architectural Improvements

### 6.1 Database-First Type Generation

**Strategy**: Generate application types from database schema

```typescript
// packages/database/scripts/generate-types.ts
import { pgTable } from "drizzle-orm/pg-core";
import * as schema from "./schema";

// Generate extended types with computed fields
type GenerateUserTypes = {
	User: typeof schema.user.$inferSelect;
	UserWithStats: typeof schema.user.$inferSelect & {
		totalCheckpoints: number;
		totalRecoveries: number;
	};
	UserWithRelations: typeof schema.user.$inferSelect & {
		sessions: Session[];
		organizations: Organization[];
	};
};

// Export to shared types package
// packages/types/src/database.ts
export type * from "@snapback/database/generated-types";
```

### 6.2 Schema Validation Layer

**Pattern**: Runtime validation at API boundaries

```typescript
// packages/api/lib/validation.ts
import { z } from "zod";
import type { User } from "@snapback/database";

// Generate Zod schemas from Drizzle types
export const UserSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string().email(),
	totalCheckpoints: z.number().int().min(0),
	totalRecoveries: z.number().int().min(0),
	// ... all fields
}) satisfies z.ZodType<User>;

// Use in API procedures
export const getUserProcedure = rpc({
	input: z.object({ userId: z.string() }),
	output: UserSchema,
	handler: async ({ userId }) => {
		const user = await getUserWithStats(userId);
		return UserSchema.parse(user); // Runtime validation
	},
});
```

### 6.3 Error Taxonomy

**Pattern**: Structured error classification

```typescript
// packages/utils/src/errors/taxonomy.ts
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM',
}

export class ClassifiedError extends ApplicationError {
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    code: string,
    statusCode: number = 500,
    context?: Record<string, unknown>,
  ) {
    super(message, code, statusCode, context);
    this.name = 'ClassifiedError';
  }
}

// Usage in webhooks
catch (error) {
  if (error instanceof DatabaseError) {
    throw new ClassifiedError(
      'Failed to query user statistics',
      ErrorCategory.DATABASE,
      'USER_STATS_QUERY_FAILED',
      500,
      { userId, originalError: error }
    );
  }
  // ... other classifications
}
```

### 6.4 Monitoring & Observability

**Strategy**: Type-safe telemetry

```typescript
// packages/logs/src/telemetry.ts
export interface TelemetryEvent {
	category: "database" | "webhook" | "api" | "auth";
	action: string;
	duration?: number;
	error?: unknown;
	metadata?: Record<string, unknown>;
}

export function trackEvent(event: TelemetryEvent) {
	logger.info("Telemetry event", {
		...event,
		timestamp: new Date().toISOString(),
	});

	// Send to analytics platform (PostHog, DataDog, etc.)
	// ...
}

// Usage
trackEvent({
	category: "database",
	action: "user_stats_computed",
	duration: 150, // ms
	metadata: { userId, checkpointCount: 42 },
});
```

---

## 7. Migration Strategy

### Phase 1: Critical Fixes (Immediate)

**Priority**: Resolve compilation errors and critical runtime risks

1. **Database Initialization** (2-3 hours)

    - Add startup validation for `drizzle.db`
    - Throw explicit error if database not initialized
    - Update Better Auth to fail fast on null database

2. **Error Handling** (1-2 hours)
    - Create error utilities module
    - Update webhook error handlers to use utilities
    - Fix `response.text()` call pattern in AI message generation

**Deliverable**: Compilation succeeds, no type errors

### Phase 2: Type System Enhancement (1-2 days)

**Priority**: Add missing user statistics to schema

1. **Schema Migration**

    - Add `totalCheckpoints`, `totalRecoveries` columns to user table
    - Create database migration with backfill
    - Add database triggers for automatic updates

2. **Type Integration**
    - Update Drizzle schema with new fields
    - Regenerate types
    - Update webhook handlers to use new fields

**Deliverable**: End-to-end type safety for user statistics

### Phase 3: Architectural Refactoring (1 week)

**Priority**: Implement long-term patterns

1. **Database-as-Dependency**

    - Refactor auth initialization to accept database client
    - Create database initialization module with strategy pattern
    - Add connection pool health checks

2. **Error Taxonomy**

    - Implement classified error system
    - Update all error handling to use taxonomy
    - Add error monitoring integration

3. **Type Generation Pipeline**
    - Automate type generation from schema
    - Create validation schema generators
    - Integrate with build process

**Deliverable**: Robust, maintainable type architecture

### Phase 4: Testing & Validation (Ongoing)

1. **Integration Tests**

    - Database initialization scenarios
    - Error handling coverage
    - Type safety validation

2. **Migration Validation**
    - Verify user statistics accuracy
    - Test trigger functionality
    - Performance benchmarks

---

## 8. Risk Assessment Matrix

| Issue              | Likelihood | Impact   | Current Mitigation  | Recommended Action       |
| ------------------ | ---------- | -------- | ------------------- | ------------------------ |
| Null DB in auth    | Medium     | Critical | None                | Fail-fast initialization |
| Missing user stats | High       | High     | Fallback to 0       | Add schema columns       |
| Error type safety  | High       | Medium   | Logging still works | Error utilities          |
| Promise handling   | Low        | Low      | Single occurrence   | Fix AI SDK usage         |
| Type propagation   | Medium     | Medium   | Runtime checks      | Schema-first types       |

**Overall Risk Level**: **MEDIUM-HIGH**

**Primary Concerns**:

1. Database initialization could fail silently in certain configurations
2. User statistics queries will fail in production if not addressed
3. Type safety gaps may cause runtime errors in edge cases

---

## 9. Recommended Actions (Prioritized)

### Immediate (This Sprint)

1. **Fix database initialization** in `/packages/auth/auth.ts`

    - Add null check before adapter call
    - Throw explicit error if database unavailable

2. **Add error utilities** to `/packages/utils/src/errors.ts`

    - Implement `getErrorMessage()` and `serializeError()`
    - Update webhook handlers

3. **Fix AI SDK usage** in `inapp-messaging.ts:263`
    - Change `await response.text()` to `await response.text`

### Short-Term (Next Sprint)

4. **Add user statistics to schema**

    - Create migration with `totalCheckpoints`, `totalRecoveries`
    - Implement database triggers or application-level updates
    - Backfill existing data

5. **Implement type-safe error handling**
    - Create error taxonomy
    - Update all catch blocks to use utilities
    - Add telemetry for error tracking

### Medium-Term (Next Quarter)

6. **Refactor database initialization**

    - Create database strategy pattern
    - Implement health checks
    - Add connection pooling monitoring

7. **Enhance type generation**
    - Automate type generation from schema
    - Create validation schema pipeline
    - Integrate with CI/CD

### Long-Term (Roadmap)

8. **Architectural evolution**
    - Implement domain-driven design boundaries
    - Create shared type packages
    - Add comprehensive observability

---

## 10. Conclusion

### Key Findings

**Database Layer**: Initialization pattern allows null database client to reach authentication adapter, creating silent failure mode. Requires fail-fast pattern.

**Type System**: User statistics (`totalCheckpoints`, `totalRecoveries`) treated as database columns but exist only as implicit aggregates. Schema should be source of truth.

**Error Handling**: Inconsistent error handling across webhook layer indicates need for centralized error management utilities.

**Type Propagation**: Overall type architecture is sound (Drizzle → ORM → API → Client) but has gaps at computed field boundaries.

### Strategic Recommendations

1. **Schema-First Development**: All application state should be defined in database schema, not runtime configuration
2. **Fail-Fast Initialization**: Critical dependencies (database) should validate at startup, not runtime
3. **Type Safety Boundaries**: Use runtime validation (Zod) at API boundaries to enforce type contracts
4. **Error as Data**: Treat errors as structured data with classification, context, and telemetry

### Success Metrics

-   **Type Safety**: 100% TypeScript compilation success
-   **Runtime Safety**: No null reference errors in production
-   **Data Accuracy**: User statistics match actual checkpoint counts
-   **Observability**: All errors classified and tracked with full context

**Estimated Effort**: 2-3 weeks for full implementation across all phases

**ROI**: Prevents production errors, improves maintainability, enables confident refactoring

---

**Document Version**: 1.0
**Last Updated**: 2025-10-05
**Maintainer**: Claude Code System Architect
