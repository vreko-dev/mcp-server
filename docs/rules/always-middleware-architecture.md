# Hono Middleware Architecture & Security Integration

**Applies to:** `apps/api/**/*.ts`, security middleware integration with `@snapback/auth/security/*`
**Authority:** Workspace-wide middleware standards
**Enforcement:** Required for all middleware, security-critical for auth/rate-limiting/CSRF chains

**Aligned with:** Hono 4.x patterns, OWASP 2025 security standards, SnapBack security implementation

---

## 1. Core Middleware Patterns

### Pattern: Error Handling with HTTPException

All Hono middleware must use `HTTPException` for errors, allowing centralized `onError` handling:

```typescript
// apps/api/src/middleware/csrf-protection.ts
import { HTTPException } from "hono/http-exception";
import { validateCSRFToken } from "@snapback/auth/security/csrf-protection";
import type { MiddlewareHandler } from "hono";

export function csrfProtectionMiddleware(config?: CSRFConfig): MiddlewareHandler {
  return async (c, next) => {
    // Skip for safe methods
    if (c.req.method === "GET" || c.req.method === "OPTIONS") {
      return next();
    }

    // Get token from request
    const providedToken =
      c.req.header("X-CSRF-Token") ||
      (await c.req.text()).match(/csrf_token=([^&]+)/)?.[1];

    const storedToken = c.get("csrfToken"); // Set by earlier middleware
    const origin = c.req.header("Origin");

    // Validate using security module
    const validation = validateCSRFToken(
      providedToken,
      storedToken,
      origin,
      config
    );

    if (!validation.valid) {
      // ✅ Throw HTTPException - centralized error handling
      throw new HTTPException(403, {
        message: validation.reason || "CSRF validation failed",
        cause: {
          code: "CSRF_TOKEN_INVALID",
          reason: validation.reason,
        },
      });
    }

    // Continue to next middleware
    return next();
  };
}
```

**Key Points:**
- Use `HTTPException` with status code and message
- Include `cause` with detailed error information for logging
- Never return error response directly (let `onError` handle it)
- Centralized handling via `app.onError((err, c) => ...)`

---

### Pattern: Context Passing (Type-Safe)

Pass data between middleware using typed context:

```typescript
// apps/api/src/middleware/session-refresh.ts
import { validateSessionJWT } from "@snapback/auth/security/session-security";
import type { HonoRequest } from "hono";

interface SessionContext {
  userId: string;
  sessionToken: string;
  needsRefresh: boolean;
  anomalies: {
    ipChanged: boolean;
    userAgentChanged: boolean;
  };
}

export function sessionRefreshMiddleware(): MiddlewareHandler<{
  Variables: {
    session: SessionContext;
  };
}> {
  return async (c, next) => {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new HTTPException(401, { message: "Missing session token" });
    }

    // Validate JWT from security module
    try {
      const decoded = validateSessionJWT(
        token,
        "snapback-api",
        "snapback-user"
      );

      // Type-safe context assignment
      c.set("session", {
        userId: decoded.sub,
        sessionToken: token,
        needsRefresh: false, // Determined by session-security logic
        anomalies: {
          ipChanged: false,
          userAgentChanged: false,
        },
      });
    } catch (error) {
      throw new HTTPException(401, {
        message: "Invalid session token",
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }

    return next();
  };
}
```

**Usage in handler:**

```typescript
app.get(
  "/api/user/profile",
  sessionRefreshMiddleware(),
  (c) => {
    // ✅ TypeScript knows type of session
    const session = c.get("session");
    return c.json({
      userId: session.userId,
      needsRefresh: session.needsRefresh,
    });
  }
);
```

---

### Pattern: Middleware Composition & Ordering

```typescript
// apps/api/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "@snapback/infrastructure";
import { csrfProtectionMiddleware } from "./middleware/csrf-protection";
import { sessionRefreshMiddleware } from "./middleware/session-refresh";
import { rateLimitMiddleware } from "./middleware/rate-limiting";
import { apiKeyScopeMiddleware } from "./middleware/api-key-scope";

const app = new Hono();

// 1. TIMING & INSTRUMENTATION (outermost)
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  c.res.headers.set("X-Response-Time", `${duration}ms`);
});

// 2. SECURITY: CORS (allow request flow)
app.use(
  "*",
  cors({
    origin: ["https://console.snapback.dev"],
    credentials: true,
  })
);

// 3. SECURITY: RATE LIMITING (reject early on abuse)
app.use("/api/*", rateLimitMiddleware());

// 4. SECURITY: CSRF (validate state-changing requests)
app.use("/api/*", csrfProtectionMiddleware());

// 5. AUTHENTICATION (extract & validate credentials)
app.use("/api/*", sessionRefreshMiddleware());
app.use("/api/auth/*", apiKeyScopeMiddleware());

// 6. BUSINESS LOGIC (handlers)
app.post("/api/snapshots", (c) => {
  const session = c.get("session"); // From middleware
  // ... create snapshot
});

// 7. ERROR HANDLING (innermost - catches everything)
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    logger.warn("HTTP exception", {
      status: err.status,
      message: err.message,
      cause: err.cause,
    });
    return err.getResponse();
  }

  logger.error("Unhandled error", {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  return c.json(
    {
      error: "Internal Server Error",
      requestId: c.get("requestId"),
    },
    500
  );
});

// 8. NOT FOUND (final fallback)
app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404);
});

export default app;
```

**Critical Ordering Rules:**

```
┌─────────────────────────────────────────────┐
│ 1. Timing/Instrumentation (outermost)       │
│    - Response time measurement              │
│    - Request ID generation                  │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 2. CORS (allow request to proceed)          │
│    - Must be before rate limiting           │
│    - Preflight OPTIONS must pass through    │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 3. Rate Limiting (reject abusers early)     │
│    - Must be before auth (reject fast)      │
│    - Return 429 immediately if limited      │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 4. CSRF (validate state-changing requests)  │
│    - Only needed for POST/PUT/DELETE        │
│    - After rate limit (preserve resources)  │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 5. Auth (session/API key validation)        │
│    - Extract & validate credentials         │
│    - Set context for handlers               │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 6. Authorization (scope/permission check)   │
│    - Validate user can access resource      │
│    - Check API key scopes                   │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 7. Handlers (business logic)                │
│    - All security validated                 │
│    - Can trust context data                 │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 8. Error Handling (innermost - catches all) │
│    - app.onError() for HTTPException        │
│    - app.notFound() for 404                 │
└─────────────────────────────────────────────┘
```

---

## 2. SnapBack Security Middleware Integration

### Rate Limiting Middleware

```typescript
// apps/api/src/middleware/rate-limiting.ts
import { HTTPException } from "hono/http-exception";
import {
  isRateLimited,
  authEndpointLimits,
} from "@snapback/auth/security/rate-limiting";
import type { MiddlewareHandler } from "hono";

export function rateLimitMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header("CF-Connecting-IP") || "127.0.0.1";
    const endpoint = c.req.path;

    // Get config for this endpoint
    const config = authEndpointLimits[endpoint] || {
      maxRequests: 100,
      windowSeconds: 60,
      backend: "memory",
      enabled: true,
    };

    // Check rate limit using security module
    const result = isRateLimited(ip, config);

    if (result.limited) {
      throw new HTTPException(429, {
        message: "Too many requests",
        cause: {
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: result.retryAfterSeconds,
          resetAt: result.resetAt,
        },
      });
    }

    // Set rate limit info in response headers
    c.res.headers.set(
      "X-RateLimit-Remaining",
      String(result.remaining)
    );
    if (result.resetAt) {
      c.res.headers.set("X-RateLimit-Reset", String(result.resetAt));
    }

    return next();
  };
}
```

---

### API Key Scope Validation Middleware

```typescript
// apps/api/src/middleware/api-key-scope.ts
import { HTTPException } from "hono/http-exception";
import { validateAPIKeyScope } from "@snapback/auth/security/api-key-security";
import type { MiddlewareHandler } from "hono";

export function apiKeyScopeMiddleware(requiredScopes: string[] = []): MiddlewareHandler<{
  Variables: {
    apiKey: {
      keyId: string;
      scopes: string[];
    };
  };
}> {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      throw new HTTPException(401, {
        message: "Missing or invalid API key",
      });
    }

    const keyId = authHeader.replace("Bearer ", "");
    const keyScopes = ["snapshots:read", "snapshots:write"]; // From database lookup

    // Validate scope using security module
    for (const requiredScope of requiredScopes) {
      if (!validateAPIKeyScope(keyScopes, requiredScope)) {
        throw new HTTPException(403, {
          message: "Insufficient permissions",
          cause: {
            code: "INSUFFICIENT_SCOPE",
            required: requiredScope,
            granted: keyScopes,
          },
        });
      }
    }

    // Set API key in context
    c.set("apiKey", {
      keyId,
      scopes: keyScopes,
    });

    return next();
  };
}
```

---

## 3. Testing Middleware Chains

```typescript
// apps/api/__tests__/middleware/csrf-protection.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { csrfProtectionMiddleware } from "../../src/middleware/csrf-protection";

describe("CSRF Protection Middleware", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use("*", async (c, next) => {
      c.set("csrfToken", "valid-token-from-session");
      return next();
    });
    app.use("*", csrfProtectionMiddleware());
    app.post("/api/test", (c) => c.json({ ok: true }));
  });

  it("should reject POST without CSRF token", async () => {
    const res = await app.request(
      new Request("http://localhost/api/test", {
        method: "POST",
        headers: { Origin: "http://localhost" },
      })
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toBe("CSRF validation failed");
  });

  it("should allow POST with valid CSRF token", async () => {
    const res = await app.request(
      new Request("http://localhost/api/test", {
        method: "POST",
        headers: {
          Origin: "http://localhost",
          "X-CSRF-Token": "valid-token-from-session",
        },
      })
    );

    expect(res.status).toBe(200);
  });

  it("should allow GET requests (safe method)", async () => {
    const res = await app.request(
      new Request("http://localhost/api/test", {
        method: "GET",
      })
    );

    expect(res.status).toBe(200);
  });
});
```

---

## 4. Error Handling Best Practices

### Centralized Error Handler Pattern

```typescript
// apps/api/src/middleware/error-handler.ts
import { HTTPException } from "hono/http-exception";
import { logger } from "@snapback/infrastructure";

export function setupErrorHandling(app: Hono) {
  app.onError((err, c) => {
    // ✅ HTTPException - expected, log as warning
    if (err instanceof HTTPException) {
      const status = err.status;
      const message = err.message;
      const cause = err.cause as Record<string, unknown>;

      logger.warn("HTTP exception", {
        status,
        message,
        code: cause?.code,
        details: cause,
      });

      // Return proper response
      return err.getResponse();
    }

    // ❌ Unexpected error - log as error
    logger.error("Unhandled error in middleware", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    return c.json(
      {
        error: "Internal Server Error",
      },
      500
    );
  });

  app.notFound((c) => {
    return c.json(
      {
        error: "Route not found",
      },
      404
    );
  });
}
```

---

## 5. Result<T, E> Pattern in Middleware

When middleware performs operations that can fail (like validation), return `Result<Success, Error>`:

```typescript
// apps/api/src/middleware/validation.ts
import type { Result } from "@snapback/auth/types";
import { Ok, Err } from "@snapback/auth/types";

export function validateRequest(
  body: unknown
): Result<ParsedBody, ValidationError> {
  try {
    const parsed = JSON.parse(body);
    return Ok(parsed);
  } catch (error) {
    return Err({
      code: "INVALID_JSON",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Usage in middleware
export function jsonValidationMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const body = await c.req.text();
    const result = validateRequest(body);

    if (!result.success) {
      throw new HTTPException(400, {
        message: result.error.message,
        cause: result.error,
      });
    }

    c.set("validatedBody", result.value);
    return next();
  };
}
```

---

## 6. TypeScript Types for Middleware

```typescript
// apps/api/src/types/middleware.ts
import type { MiddlewareHandler } from "hono";

export interface SessionContext {
  userId: string;
  sessionToken: string;
  needsRefresh: boolean;
}

export interface APIKeyContext {
  keyId: string;
  scopes: string[];
}

export interface AppVariables {
  session?: SessionContext;
  apiKey?: APIKeyContext;
  requestId?: string;
  csrfToken?: string;
}

// Type-safe Hono app
export type AppType = Hono<{
  Variables: AppVariables;
}>;

// Usage
export const createApp = (): AppType => {
  return new Hono<{ Variables: AppVariables }>();
};
```

---

## 7. Middleware Return Patterns

### ✅ Always Return from `next()`

```typescript
// CORRECT
export function myMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    // Do something before
    const res = await next();
    // Do something after
    return res; // ✅ Return response
  };
}
```

### ❌ Don't Forget to Return

```typescript
// WRONG
export function myMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    // This will cause issues!
    await next(); // ❌ Not returning
    return c.text("Done");
  };
}
```

---

## 8. Integration Checklist

- [ ] Middleware uses `HTTPException` for all errors
- [ ] Middleware is tested with integration tests (full request/response)
- [ ] Error handling via `app.onError()` (not direct response)
- [ ] Context typing is defined (no `any` types)
- [ ] Security modules imported from `@snapback/auth/security/*`
- [ ] Middleware ordering follows section 1 (timing → CORS → rate limit → auth)
- [ ] All middleware returns response from `next()`
- [ ] Tests cover both success and failure paths
- [ ] Logging includes error cause/details
- [ ] Built with Result<T,E> pattern where applicable

---

## 9. Common Patterns Reference

| Pattern | Purpose | Example |
|---------|---------|---------|
| **HTTPException** | Uniform error handling | `throw new HTTPException(403, { message: "Forbidden" })` |
| **Context Typing** | Type-safe data passing | `c.set("session", data)` with interface |
| **Middleware Ordering** | Correct security flow | Rate limit → Auth → Business logic |
| **Error Handler** | Centralized logging | `app.onError((err, c) => ...)` |
| **Result Pattern** | Functional error handling | `Result<T, E>` for operations |
| **Guard Middleware** | Early rejection | Rate limiting before auth |
| **Composition** | Reusable middleware | Factory functions returning `MiddlewareHandler` |

---

## 10. References

- **Hono HTTPException:** https://hono.dev/docs/api/exception
- **Hono Middleware Patterns:** https://hono.dev/docs/guides/middleware
- **SnapBack Security Modules:** `packages/auth/src/security/*`
- **OWASP 2025:** https://owasp.org/www-project-top-ten/
- **TypeScript Patterns:** See `always-typescript-patterns.md`
- **Result Type Pattern:** See `always-result-type-pattern.md`

**Last Updated:** 2025-12-04
**Verified Against:** Hono 4.x, @snapback/auth security implementation
**Status:** Ready for Phase 1 Middleware Integration
