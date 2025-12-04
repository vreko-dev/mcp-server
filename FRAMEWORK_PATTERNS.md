# Framework-Specific Patterns & Best Practices

**Last Updated:** 2025-12-03
**Authority:** Architecture & Development Standards
**Applies to:** `apps/**/*.ts`, `apps/**/*.tsx`, `packages/**/*.ts`, `packages/**/*.tsx`

---

## Table of Contents

1. [oRPC Framework Patterns](#orpc-framework-patterns)
2. [Drizzle ORM Patterns](#drizzle-orm-patterns)
3. [Next.js Middleware Patterns](#nextjs-middleware-patterns)
4. [Rate Limiting Patterns](#rate-limiting-patterns)
5. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

---

## oRPC Framework Patterns

### Core Procedure Structure

**Applies to:** `apps/api/modules/*/procedures/*.ts`, `apps/api/orpc/procedures.ts`

oRPC (Object-Oriented Remote Procedure Call) framework provides type-safe API development with proper middleware support.

#### ✅ CORRECT Pattern

```typescript
// ✅ Use .handler() method (NOT .query())
// ✅ Chain with .input() and optional middleware
// ✅ No .output() schema needed (handler return type infers output)

import { publicProcedure } from "../../../orpc/procedures.js";
import { z } from "zod";

const getUserSchema = z.object({
  userId: z.string().min(1),
});

export const getUser = publicProcedure
  .input(getUserSchema)
  .handler(async ({ input }) => {
    // Handler receives input with proper type inference
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, input.userId),
    });

    // Return type is inferred from actual return value
    return {
      success: !!user,
      data: user || null,
      error: user ? null : "User not found",
    };
  });
```

#### ❌ WRONG Patterns

```typescript
// ❌ WRONG: Using .query() instead of .handler()
export const getUser = publicProcedure
  .input(getUserSchema)
  .query(async ({ input }) => {
    // ❌ .query() doesn't exist on oRPC procedures
  });

// ❌ WRONG: Using .output() to define response schema
export const getUser = publicProcedure
  .input(getUserSchema)
  .output(z.object({
    success: z.boolean(),
    data: z.any().nullable(),
    error: z.string().nullable(),
  }))
  .handler(async ({ input }) => {
    // ❌ .output() is not used in oRPC procedures
  });

// ❌ WRONG: Importing os when you have publicProcedure
import { os } from "@orpc/server";

export const getUser = os.router({
  // ❌ Use publicProcedure not os.router for individual procedures
});
```

### Router Assembly

**Router Structure Pattern:**

```typescript
// ✅ CORRECT: Return plain object of procedures, no os.router()
export function createMetricsRouter(db: PgDatabase<any>) {
  const aggregator = new MetricsAggregator(db);

  return {
    getMyUsage: publicProcedure
      .input(z.object({ userId: z.string() }))
      .handler(async ({ input }) => {
        // implementation
      }),

    getMyTimeline: publicProcedure
      .input(z.object({ userId: z.string() }))
      .handler(async ({ input }) => {
        // implementation
      }),
  };
}

// ✅ CORRECT: Main router uses os.router() to assemble sub-routers
import { os } from "@orpc/server";

export const router = publicProcedure
  .prefix("/api")
  .router({
    metrics: metricsRouter,
    analytics: analyticsRouter,
    users: usersRouter,
  });
```

### Procedure Hierarchy

```typescript
// ✅ CORRECT: Define procedure bases for reuse
export const publicProcedure = os.$context<OrpcContext>();

export const protectedProcedure = publicProcedure.use(async ({ context, next }) => {
  const auth = await snapbackAuth.requireAuth(context.request);
  return next({
    context: {
      ...context,
      auth,
      user: {
        id: auth.userId,
        email: auth.email,
        role: auth.role,
        plan: auth.plan,
      },
    },
  });
});

export const adminProcedure = protectedProcedure.use(async ({ context, next }) => {
  if (context.user?.role !== "admin") {
    throw new ORPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next();
});
```

---

## Drizzle ORM Patterns

### Database Type Parameters

**Applies to:** `apps/api/**/*.ts` files using Drizzle

Drizzle ORM's `PgDatabase` type requires proper type parameters to ensure type safety.

#### ✅ CORRECT Pattern

```typescript
// ✅ Use PgDatabase<any> when exact schema is not available
import type { PgDatabase } from "drizzle-orm/pg-core";

export function createMetricsRouter(db: PgDatabase<any>) {
  // Safe to use with any database instance
  const users = await db.select().from(userTable);
}

// ✅ Use InferSelectModel / InferInsertModel for type inference
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

type User = InferSelectModel<typeof userTable>;
type NewUser = InferInsertModel<typeof userTable>;
```

#### ❌ WRONG Patterns

```typescript
// ❌ WRONG: Invalid type parameters that don't exist
import type { TQueryResult, TFullSchema } from "drizzle-orm";

export function createRouter(db: PgDatabase<TQueryResult, TFullSchema, any>) {
  // ❌ TQueryResult and TFullSchema are not valid type exports
  // ❌ This will cause TypeScript errors
}

// ❌ WRONG: Using bare PgDatabase without parameters
export function createRouter(db: PgDatabase) {
  // ❌ Generic type 'PgDatabase' requires 1-3 type arguments
}
```

### Schema Exports & Access

```typescript
// ✅ CORRECT: Access type maps from schema
const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
});

type UserSelect = typeof users.$inferSelect;
type UserInsert = typeof users.$inferInsert;

// ✅ CORRECT: Using InferSelectModel for queries
type User = InferSelectModel<typeof users>;
const result: User[] = await db.select().from(users);
```

---

## Next.js Middleware Patterns

### Rate Limiting Middleware

**Applies to:** Authentication and API protection in `apps/api/src/routes/**/*.ts`

Rate limiting middleware must be **synchronous** when wrapping request handlers in Next.js middleware context.

#### ✅ CORRECT Pattern (In-Memory Synchronous)

```typescript
// ✅ CORRECT: Synchronous in-memory rate limiter for middleware
interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Initialize or reset if window expired
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      resetAt: now + WINDOW_MS,
    });

    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      resetAt: now + WINDOW_MS,
    };
  }

  // Check if under limit
  if (entry.attempts < MAX_ATTEMPTS) {
    entry.attempts++;
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - entry.attempts,
      resetAt: entry.resetAt,
    };
  }

  // Over limit
  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.resetAt,
  };
}

// Usage in middleware
export function withAuthRateLimit(handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    const ip = getClientIP(request);
    const identifier = `auth:${ip}`;

    const limit = checkRateLimit(identifier);

    if (!limit.allowed) {
      const retryAfterSeconds = Math.ceil((limit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: "Too many authentication attempts",
          message: "You have exceeded the maximum number of login attempts. Please try again later.",
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfterSeconds.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": limit.resetAt.toString(),
          },
        }
      );
    }

    const response = await handler(request);
    const enhancedResponse = new Response(response.body, response);
    enhancedResponse.headers.set("X-RateLimit-Remaining", limit.remaining.toString());
    enhancedResponse.headers.set("X-RateLimit-Reset", limit.resetAt.toString());

    return enhancedResponse;
  };
}
```

#### ❌ WRONG Patterns

```typescript
// ❌ WRONG: Async rate limiter in middleware context
import { checkRateLimit } from "@/lib/rate-limit"; // This is async!

export function withAuthRateLimit(handler) {
  return async (request: NextRequest) => {
    const ip = getClientIP(request);
    // ❌ WRONG: checkRateLimit expects 3 params (userId, plan, requestCost)
    // ❌ WRONG: Function is async and returns Promise, not sync result
    const limit = checkRateLimit(identifier); // ❌ Wrong signature
  };
}

// ❌ WRONG: Using API layer rate limiter (expects different params)
import { checkRateLimit } from "@/lib/rate-limit";

// This function expects:
// checkRateLimit(userId: string, plan: string, requestCost = 1)
// And it's async, returning a Promise
```

---

## Rate Limiting Patterns

### Multi-Layer Rate Limiting Architecture

**Applies to:** Different contexts require different rate limiting strategies

```typescript
// Layer 1: IP-based rate limiting (in middleware)
// - Fast, in-memory
// - Protects against brute force attacks
// - Used in: Authentication middleware
import { checkRateLimit } from "./rate-limit-middleware";

const ipLimit = checkRateLimit(`auth:${clientIp}`);
if (!ipLimit.allowed) {
  return NextResponse.json({ error: "Rate limited" }, { status: 429 });
}

// Layer 2: User-based rate limiting (in API procedures)
// - Redis-backed (distributed)
// - Respects subscription tier
// - Used in: oRPC procedures
import { checkUserRateLimit } from "@/lib/upstash-rate-limit";

const userLimit = await checkUserRateLimit(userId);
if (!userLimit.allowed) {
  throw new ORPCError("TOO_MANY_REQUESTS");
}

// Layer 3: API key rate limiting (in API procedures)
// - Redis-backed (distributed)
// - Tied to subscription plan
// - Used in: Third-party API access
import { checkAPIKeyRateLimit } from "@/lib/upstash-rate-limit";

const keyLimit = await checkAPIKeyRateLimit(apiKey, plan);
if (!keyLimit.allowed) {
  throw new ORPCError("TOO_MANY_REQUESTS");
}
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Mixing Framework APIs

**Problem:** Using `.query()` instead of `.handler()` in oRPC procedures

```typescript
// ❌ FAILS at runtime
const getUser = publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
    // .query() doesn't exist
  });
```

**Solution:** Use `.handler()` which is the correct oRPC method

```typescript
// ✅ CORRECT
const getUser = publicProcedure
  .input(z.object({ userId: z.string() }))
  .handler(async ({ input }) => {
    // Proper oRPC handler
  });
```

**Lesson:** Verify the actual API of frameworks being used. Use Context7 or official docs to confirm method names.

---

### Pitfall 2: Invalid Drizzle Type Parameters

**Problem:** Using non-existent types like `TQueryResult`, `TFullSchema`

```typescript
// ❌ FAILS: Types don't exist
import type { TQueryResult, TFullSchema } from "drizzle-orm";

export function createRouter(db: PgDatabase<TQueryResult, TFullSchema, any>) {
  // Won't compile
}
```

**Solution:** Use `PgDatabase<any>` or properly typed schema with `InferSelectModel`

```typescript
// ✅ CORRECT
import type { PgDatabase } from "drizzle-orm/pg-core";

export function createRouter(db: PgDatabase<any>) {
  // Type-safe and works with any database
}
```

**Lesson:** Always check actual type exports. Invalid types cause cryptic TypeScript errors.

---

### Pitfall 3: Async Functions in Synchronous Middleware

**Problem:** Importing async rate limiter but using it synchronously

```typescript
// ❌ FAILS: checkRateLimit is async but used synchronously
import { checkRateLimit } from "@/lib/rate-limit";

export function withAuthRateLimit(handler) {
  return async (request) => {
    const limit = checkRateLimit(identifier); // ❌ Not awaited, wrong signature
    if (!limit.allowed) { // ❌ limit is Promise, not object
      // Type errors everywhere
    }
  };
}
```

**Solution:** Implement sync rate limiting for middleware context

```typescript
// ✅ CORRECT: Synchronous in-memory rate limiter
const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  // Synchronous implementation for middleware use
  const entry = rateLimitStore.get(identifier);
  // ... implementation ...
}
```

**Lesson:** Middleware context is synchronous. Rate limiting there must be fast and synchronous.

---

### Pitfall 4: Wrong Import Paths

**Problem:** Incorrect relative paths to services

```typescript
// ❌ FAILS: Wrong directory structure
import { MetricsAggregator } from "../../services/metrics-aggregator.js";
```

**Solution:** Check actual directory structure and use correct path

```typescript
// ✅ CORRECT: File is in src/services/
import { MetricsAggregator } from "../../src/services/metrics-aggregator.js";
```

**Lesson:** Verify file locations before importing. Use workspace-aware IDE navigation.

---

### Pitfall 5: Unused Variables in Tests

**Problem:** Unused parameters causing linting errors

```typescript
// ❌ Biome warning: unused variables
const result = middleware(_request, _response, (data) => {
  // 'data' is unused
});
```

**Solution:** Prefix unused identifiers with underscore

```typescript
// ✅ CORRECT: Prefix with underscore
const result = middleware(_request, _response, (_data) => {
  // Now 'data' is intentionally unused
});
```

**Lesson:** Follow project linting standards. Prefixing with `_` is idiomatic TypeScript.

---

### Pitfall 6: Incorrect Router Assembly

**Problem:** Using `os.router()` when returning object of procedures

```typescript
// ❌ WRONG: Over-wrapping with os.router()
export function createMetricsRouter(db: PgDatabase<any>) {
  return os.router({
    getMyUsage: publicProcedure.input(...).handler(...),
    getMyTimeline: publicProcedure.input(...).handler(...),
  });
}
```

**Solution:** Return plain object; only use `os.router()` at top level

```typescript
// ✅ CORRECT: Plain object for sub-routers
export function createMetricsRouter(db: PgDatabase<any>) {
  return {
    getMyUsage: publicProcedure.input(...).handler(...),
    getMyTimeline: publicProcedure.input(...).handler(...),
  };
}

// ✅ CORRECT: os.router() only at top level
export const router = publicProcedure
  .prefix("/api")
  .router({
    metrics: metricsRouter,
    analytics: analyticsRouter,
  });
```

**Lesson:** Understand framework conventions. oRPC has specific patterns for composition.

---

## Verification Checklist

Before committing code, verify:

- [ ] oRPC procedures use `.handler()` not `.query()`
- [ ] Drizzle types use `PgDatabase<any>` or proper `InferSelectModel`
- [ ] Rate limiting in middleware is synchronous and in-memory
- [ ] API layer rate limiting is async and Redis-backed
- [ ] All import paths are correct (use workspace navigation)
- [ ] No unused variables (prefix with `_`)
- [ ] Sub-routers return plain objects, not wrapped in `os.router()`
- [ ] Framework patterns match official documentation
- [ ] Type errors are resolved (not bypassed with `any`)

---

## References

- **oRPC Documentation:** https://github.com/unnoq/orpc
- **Drizzle ORM Documentation:** https://orm.drizzle.team
- **Next.js Patterns:** https://nextjs.org/docs/app/building-your-application/routing/middleware
- **TypeScript Best Practices:** https://www.typescriptlang.org/docs/handbook/
- **SnapBack Architecture:** See `ARCHITECTURE.md`
- **Related Rules:** See `always-typescript-patterns.md`, `always-monorepo-imports.md`

---

## Maintenance

**Last Verified:** 2025-12-03
**Verified Against:** oRPC latest, Drizzle ORM v0.37+, Next.js 15, TypeScript 5.9+

When updating frameworks, revisit these patterns and update documentation accordingly.
