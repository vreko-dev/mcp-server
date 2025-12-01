# TypeScript Errors - Comprehensive Quality Assessment

**Analysis Date**: 2025-10-05
**Project**: SnapBack-Site
**Total Errors Identified**: 8 (5 reported + 3 additional discovered)
**Packages Affected**: `@snapback/auth`, `@snapback/api`

---

## Executive Summary

The TypeScript errors indicate **moderate quality issues** with a mix of type safety gaps and schema inconsistencies. The errors fall into three categories:

1. **Type Null Safety** (1 error) - Critical runtime safety issue
2. **Schema Misalignment** (2 errors) - Data model inconsistency
3. **Error Handling** (4 errors) - Type safety gaps in exception handling
4. **Promise Misuse** (1 error) - API usage error

**Severity Distribution**:

-   🔴 **Critical**: 2 errors (null safety, promise misuse)
-   🟡 **Important**: 2 errors (schema misalignment)
-   🟢 **Standard**: 4 errors (error handling type assertions)

**Recommended Action**: Fix all errors immediately. Critical errors pose runtime risks.

---

## Error Analysis by Category

### 🔴 CRITICAL - Error 1: Null Database Parameter

**File**: `packages/auth/auth.ts:39`
**Severity**: Critical (Runtime Safety Risk)

**Error Message**:

```
Argument of type '(NodePgDatabase<...> & { ... }) | null' is not assignable to parameter of type 'DB'.
Type 'null' is not assignable to type 'DB'.
```

**Root Cause**:
The `drizzle.db` property is typed as nullable (`db | null`), but `drizzleAdapter` expects a non-null database instance. The conditional check `drizzle.db ? drizzleAdapter(...) : undefined` is correct at runtime but TypeScript cannot narrow the type inside the ternary expression.

**Current Code** (Lines 38-42):

```typescript
database: drizzle.db
  ? drizzleAdapter(drizzle.db, {  // drizzle.db is still typed as 'db | null' here
      provider: "pg",
    })
  : undefined,
```

**Impact**:

-   **Type Safety**: Low - The runtime logic is correct, but type safety is compromised
-   **Runtime Risk**: Low - The conditional prevents null from reaching drizzleAdapter
-   **Code Quality**: Medium - Forces TypeScript to accept potentially unsafe code

**Fix Strategy**:
Use type assertion to narrow the type after the truthiness check:

**Fixed Code**:

```typescript
database: drizzle.db
  ? drizzleAdapter(drizzle.db as NonNullable<typeof drizzle.db>, {
      provider: "pg",
    })
  : undefined,
```

**Alternative Fix** (More defensive):

```typescript
database: (() => {
  const db = drizzle.db;
  if (!db) return undefined;
  return drizzleAdapter(db, { provider: "pg" });
})(),
```

**Testing Recommendation**:

-   Verify auth initialization with `DATABASE_URL` present
-   Test auth initialization with missing `DATABASE_URL` (should handle gracefully)
-   Add integration test for database connection lifecycle

---

### 🟡 IMPORTANT - Errors 2-3: Missing User Schema Properties

**File**: `packages/api/modules/webhooks/inapp-messaging.ts:226-227`
**Severity**: Important (Data Model Inconsistency)

**Error Messages**:

```
Line 226: Property 'totalCheckpoints' does not exist on type 'User'
Line 227: Property 'totalRecoveries' does not exist on type 'User'
```

**Root Cause**:
The `user` table schema (defined in `packages/database/drizzle/schema/postgres.ts`) does not include `totalCheckpoints` or `totalRecoveries` fields. These are either:

1. Fields that should exist but haven't been added to the schema
2. Computed values that should be queried from another table
3. Legacy fields from old schema that were removed

**Current Code** (Lines 220-230):

```typescript
const userContext = {
	name: user.name,
	email: user.email,
	plan: subscription?.plan || "free",
	subscriptionStatus: subscription?.status || "none",
	totalCheckpoints: user.totalCheckpoints || 0, // ❌ Field doesn't exist
	totalRecoveries: user.totalRecoveries || 0, // ❌ Field doesn't exist
	trialEndDate: subscription?.trialEnd,
	...context.userProperties,
};
```

**User Schema Analysis**:
From `postgres.ts`, the `user` table includes:

-   `id`, `name`, `email`, `emailVerified`, `image`
-   `createdAt`, `updatedAt`, `username`, `role`
-   `banned`, `banReason`, `banExpires`
-   `onboardingComplete`, `paymentsCustomerId`, `locale`

**Missing**: `totalCheckpoints`, `totalRecoveries`

**Impact**:

-   **Type Safety**: High - Properties don't exist at runtime
-   **Runtime Risk**: High - Will cause runtime errors when accessed
-   **Data Integrity**: High - AI message generation receives incorrect/missing data

**Fix Strategy Options**:

#### Option 1: Add fields to user schema (if they should be tracked)

```typescript
// packages/database/drizzle/schema/postgres.ts (line ~56)
export const user = pgTable("user", {
	// ... existing fields ...
	totalCheckpoints: integer("totalCheckpoints").default(0),
	totalRecoveries: integer("totalRecoveries").default(0),
});
```

Then run:

```bash
pnpm --filter database run migrate
```

#### Option 2: Query from related tables (if computed)

```typescript
// Assuming checkpoints are stored in a related table
const [checkpointStats] = await drizzle
	.db!.select({
		totalCheckpoints: count(checkpoints.id),
	})
	.from(checkpoints)
	.where(eq(checkpoints.userId, userId))
	.limit(1);

const userContext = {
	name: user.name,
	email: user.email,
	plan: subscription?.plan || "free",
	subscriptionStatus: subscription?.status || "none",
	totalCheckpoints: checkpointStats?.totalCheckpoints || 0,
	totalRecoveries: 0, // Query from recoveries table if exists
	trialEndDate: subscription?.trialEnd,
	...context.userProperties,
};
```

#### Option 3: Remove if not needed (temporary fix)

```typescript
const userContext = {
	name: user.name,
	email: user.email,
	plan: subscription?.plan || "free",
	subscriptionStatus: subscription?.status || "none",
	// Remove totalCheckpoints and totalRecoveries if not critical
	trialEndDate: subscription?.trialEnd,
	...context.userProperties,
};
```

**Recommended Fix**: Option 1 or 2, depending on whether these should be denormalized or computed.

**Testing Recommendation**:

-   Unit test `generatePersonalizedMessage` with mock user data
-   Verify AI context includes accurate checkpoint/recovery counts
-   Integration test database migration if adding schema fields

---

### 🔴 CRITICAL - Error 4: Promise Called as Function

**File**: `packages/api/modules/webhooks/inapp-messaging.ts:263`
**Severity**: Critical (API Misuse)

**Error Message**:

```
This expression is not callable.
Type 'Promise<string>' has no call signatures.
```

**Root Cause**:
The `streamText` function from AI SDK returns a `Promise`, but line 263 attempts to call `.text()` on it. The correct pattern is to await the promise first, then access the text stream.

**Current Code** (Lines 233-263):

```typescript
const response = await streamText({
	model: textModel,
	system: `...`,
	prompt: `...`,
});

// Parse the response
const textResponse = await response.text(); // ❌ response is already awaited, .text() returns Promise
```

**Impact**:

-   **Type Safety**: Critical - Attempting to call a Promise as a function
-   **Runtime Risk**: Critical - Will throw "response.text is not a function" error
-   **Feature Broken**: AI message generation completely non-functional

**Fix Strategy**:
The AI SDK's `streamText` returns a result object. Use the correct API:

**Fixed Code** (Option 1 - Full text):

```typescript
const result = await streamText({
	model: textModel,
	system: `...`,
	prompt: `...`,
});

// Get the full text response
const textResponse = await result.text; // Note: .text is a Promise, not a method
```

**Fixed Code** (Option 2 - Stream handling):

```typescript
const result = await streamText({
	model: textModel,
	system: `...`,
	prompt: `...`,
});

// Collect streamed text
let textResponse = "";
for await (const chunk of result.textStream) {
	textResponse += chunk;
}
```

**Fixed Code** (Option 3 - Use generateText for non-streaming):

```typescript
import { generateText } from "ai";

const result = await generateText({
	model: textModel,
	system: `...`,
	prompt: `...`,
});

const textResponse = result.text; // Direct property access, no await needed
```

**Recommended Fix**: Option 3 (`generateText`) since the code doesn't use streaming features.

**Testing Recommendation**:

-   Unit test `generatePersonalizedMessage` with mocked AI SDK
-   Test JSON parsing fallback path (lines 264-276)
-   Integration test with actual AI model (if available in test environment)

---

### 🟢 STANDARD - Errors 5-8: Unknown Error Type

**Files**: `packages/api/modules/webhooks/inapp-messaging.ts:112, 157, 180, 279, 343`
**Severity**: Standard (Type Safety Best Practice)

**Error Messages** (all similar):

```
'error' is of type 'unknown'.
```

**Root Cause**:
TypeScript 4.4+ changed catch clause error types from `any` to `unknown` for better type safety. Accessing properties like `error.message` requires type narrowing or assertion.

**Current Code Pattern** (Repeated 4 times):

```typescript
} catch (error) {
  logger.error("Failed to schedule in-app message", {
    error: error.message || error,  // ❌ 'unknown' doesn't have .message
    userId,
  });
  return false;
}
```

**Impact**:

-   **Type Safety**: Medium - Could log incorrect error information
-   **Runtime Risk**: Low - The `|| error` fallback prevents crashes
-   **Code Quality**: Medium - Violates TypeScript strict mode best practices

**Fix Strategy**:
Use proper error type narrowing or type guards:

**Fixed Code** (Option 1 - Type guard function):

```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

} catch (error) {
  logger.error("Failed to schedule in-app message", {
    error: getErrorMessage(error),
    userId,
  });
  return false;
}
```

**Fixed Code** (Option 2 - Inline narrowing):

```typescript
} catch (error) {
  logger.error("Failed to schedule in-app message", {
    error: error instanceof Error ? error.message : String(error),
    userId,
  });
  return false;
}
```

**Fixed Code** (Option 3 - Pass entire error object):

```typescript
} catch (error) {
  logger.error("Failed to schedule in-app message", {
    error,  // Let logger handle serialization
    userId,
  });
  return false;
}
```

**Recommended Fix**: Create a shared utility function (Option 1) to use across all catch blocks.

**Testing Recommendation**:

-   Unit test error logging with different error types (Error, string, object)
-   Verify logger receives properly formatted error information

---

## Cross-Cutting Architectural Issues

### Issue 1: Schema Documentation Gap

**Problem**: No clear documentation showing which fields exist on each table.

**Recommendation**:

1. Generate TypeScript types from Prisma/Drizzle schema
2. Export and use these types in API code
3. Add schema documentation comments

**Example**:

```typescript
// packages/database/drizzle/schema/postgres.ts
/**
 * User table schema
 * @property totalCheckpoints - Stored count of user checkpoints
 * @property totalRecoveries - Stored count of successful recoveries
 */
export const user = pgTable("user", {
	// ... fields with JSDoc comments
});
```

### Issue 2: Type Safety in Database Queries

**Problem**: Using nullable database instances without proper type guards.

**Recommendation**:

1. Add runtime validation for critical database operations
2. Use typed query builders that enforce schema compliance
3. Consider a database access layer that guarantees non-null instances

**Example**:

```typescript
// packages/database/src/client.ts
export function getDatabase() {
  if (!drizzle.db) {
    throw new Error("Database not initialized. Check DATABASE_URL configuration.");
  }
  return drizzle.db;
}

// Usage in auth.ts
database: drizzleAdapter(getDatabase(), { provider: "pg" }),
```

### Issue 3: Error Handling Consistency

**Problem**: Inconsistent error handling patterns across the codebase.

**Recommendation**:

1. Create shared error utilities
2. Standardize catch block patterns
3. Use typed error classes for different error categories

**Example**:

```typescript
// packages/utils/src/errors.ts
export class DatabaseError extends Error {
	constructor(message: string, public cause?: unknown) {
		super(message);
		this.name = "DatabaseError";
	}
}

export function formatError(error: unknown): {
	message: string;
	stack?: string;
} {
	if (error instanceof Error) {
		return { message: error.message, stack: error.stack };
	}
	return { message: String(error) };
}
```

---

## Quality Metrics Assessment

### Type Safety Score: **6/10** (Moderate)

**Strengths**:

-   ✅ Using TypeScript strict mode
-   ✅ Schema definitions with Drizzle ORM
-   ✅ Type inference for database queries

**Weaknesses**:

-   ❌ Nullable types not properly handled (auth.ts:39)
-   ❌ Schema-code misalignment (missing user fields)
-   ❌ Unknown error types without narrowing

### Runtime Safety Score: **5/10** (Concerning)

**Risks**:

-   🔴 Promise misuse will cause immediate runtime failure
-   🔴 Missing schema fields will cause runtime errors
-   🟡 Null database handling relies on conditional, not type system
-   🟢 Error logging won't crash but may provide poor error info

### Code Maintainability Score: **7/10** (Good)

**Strengths**:

-   ✅ Clear module organization
-   ✅ Consistent file structure
-   ✅ Good separation of concerns

**Weaknesses**:

-   ❌ Schema changes require manual API updates
-   ❌ No centralized error handling utilities
-   ❌ Type assertions used instead of proper type narrowing

---

## Prioritized Fix Checklist

### Phase 1: Critical Fixes (Fix Immediately)

-   [ ] **Fix Promise misuse** (inapp-messaging.ts:263) - Replace with `generateText` API
-   [ ] **Fix null database type** (auth.ts:39) - Add type assertion or validation
-   [ ] **Investigate user schema** - Determine if `totalCheckpoints`/`totalRecoveries` should exist

### Phase 2: Important Fixes (Within 1-2 Days)

-   [ ] **Resolve schema misalignment** - Either add fields or query from related tables
-   [ ] **Add error type guards** - Create `getErrorMessage()` utility function
-   [ ] **Update all catch blocks** - Use error utility across all 4 locations

### Phase 3: Quality Improvements (Within 1 Week)

-   [ ] **Add schema documentation** - Document all database fields with JSDoc
-   [ ] **Create database access layer** - Centralized, type-safe database access
-   [ ] **Standardize error handling** - Shared error classes and utilities
-   [ ] **Add integration tests** - Test database operations and AI generation

---

## Testing Strategy

### Unit Tests Required

1. **Auth Package**:

```typescript
describe("auth configuration", () => {
	it("should initialize with valid database", () => {
		// Test with DATABASE_URL set
	});

	it("should handle missing database gracefully", () => {
		// Test without DATABASE_URL
	});
});
```

2. **Webhooks Package**:

```typescript
describe("generatePersonalizedMessage", () => {
	it("should handle user without stats", async () => {
		// Test with minimal user data
	});

	it("should generate valid AI context", async () => {
		// Test context structure
	});

	it("should handle AI API errors", async () => {
		// Test error handling
	});
});

describe("scheduleInAppMessage", () => {
	it("should handle various error types", async () => {
		// Test Error, string, object errors
	});
});
```

### Integration Tests Required

1. **Database Schema Validation**:

```typescript
describe("user schema", () => {
	it("should include all required fields", () => {
		// Validate schema matches expected structure
	});
});
```

2. **AI Message Generation E2E**:

```typescript
describe("AI message generation flow", () => {
	it("should generate personalized messages end-to-end", async () => {
		// Full workflow test
	});
});
```

### Type Safety Tests

Add to `tsconfig.json`:

```json
{
	"compilerOptions": {
		"strict": true,
		"noUncheckedIndexedAccess": true,
		"noImplicitReturns": true,
		"noFallthroughCasesInSwitch": true
	}
}
```

Run type checks in CI:

```bash
pnpm --filter @snapback/auth run type-check
pnpm --filter @snapback/api run type-check
```

---

## Architectural Recommendations

### 1. Database Schema Management

**Current State**: Schema changes require manual code updates
**Recommended**: Use generated types from schema

```typescript
// packages/database/codegen.ts
import { drizzle } from "drizzle-orm";
import { generateDrizzleTypes } from "drizzle-kit";

// Auto-generate TypeScript types from schema
export const schema = generateDrizzleTypes("./drizzle/schema");
```

### 2. Type-Safe Database Layer

**Create abstraction**:

```typescript
// packages/database/src/repositories/user.repository.ts
export class UserRepository {
	async getUserWithStats(userId: string) {
		const user = await this.getUser(userId);
		const stats = await this.getUserStats(userId);

		return {
			...user,
			totalCheckpoints: stats.checkpoints,
			totalRecoveries: stats.recoveries,
		};
	}
}
```

### 3. Error Handling Standard

**Shared utility package**:

```typescript
// packages/utils/src/error-handling.ts
export const ErrorHandler = {
	format: (error: unknown) => ({
		message: error instanceof Error ? error.message : String(error),
		stack: error instanceof Error ? error.stack : undefined,
	}),

	log: (logger: Logger, context: string, error: unknown) => {
		logger.error(context, ErrorHandler.format(error));
	},
};
```

---

## Risk Assessment Summary

| Error               | Severity     | Runtime Risk | User Impact        | Fix Complexity            |
| ------------------- | ------------ | ------------ | ------------------ | ------------------------- |
| Null database param | 🔴 Critical  | Medium       | High (auth breaks) | Low (1 line)              |
| Missing user fields | 🟡 Important | High         | High (AI breaks)   | Medium (schema migration) |
| Promise misuse      | 🔴 Critical  | High         | High (AI breaks)   | Low (API change)          |
| Unknown error types | 🟢 Standard  | Low          | Low (logging only) | Low (utility function)    |

**Overall Risk**: 🔴 **High** - 2 critical errors that will cause runtime failures

**Recommended Timeline**:

-   **Day 1**: Fix critical errors (Promise misuse, null database)
-   **Day 2**: Resolve schema issues (add fields or query separately)
-   **Day 3**: Implement error handling utilities
-   **Week 1**: Add comprehensive tests and documentation

---

## Conclusion

The TypeScript errors reveal a combination of:

1. **Type system gaps** - Nullable types not properly handled
2. **Schema drift** - Code expectations don't match database schema
3. **API misuse** - Incorrect usage of async AI SDK
4. **Best practice violations** - Error handling doesn't follow strict TypeScript patterns

**Positive Findings**:

-   Runtime logic is mostly correct (the bugs are type-level)
-   Good separation of concerns in module structure
-   Clear intent in error handling (just needs proper typing)

**Action Required**:
All errors should be fixed, with priority on the 2 critical errors that will cause immediate runtime failures. The fixes are straightforward and low-risk, but require careful testing to ensure proper behavior.

**Long-term Improvements**:
Implement type-safe database access layer, standardize error handling, and establish schema-to-code generation to prevent future drift.
