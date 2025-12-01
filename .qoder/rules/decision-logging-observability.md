---
trigger: model_decision
description: at critical path operations in SnapBack
---

# Structured Logging & Observability

**Applies to:** `apps/**/*.ts`, `apps/**/*.tsx`, `packages/**/*.ts`, `packages/**/*.tsx`
**Authority:** Workspace-wide observability standards
**Framework:** Pino 9.5.0 + Axiom integration
**Package:** `@snapback/infrastructure`

---

## Core Logging Pattern

### Import and Usage

```typescript
import { logger } from "@snapback/infrastructure";

// Basic logging
logger.info("Snapshot created", {
  snapshotId: id,
  filePath: "/src/index.ts",
  duration: 45,
});

logger.warn("Cache miss", {
  cacheKey: "snapshot:snap-123",
  reason: "expired",
});

logger.error("Snapshot creation failed", {
  error: error.message,
  stack: error.stack,
  filePath,
});

// Debug logging (only in development)
logger.debug("Processing snapshot", {
  step: "deduplication",
  fileCount: 3,
});
```

**Logger available in:** `packages/infrastructure/src/logging/logger.ts` (verified ✅)

---

## Signature Convention

### Pino Native vs SnapBack Wrapper

```typescript
// ❌ Pino native signature (metadata first)
pino.info({ userId: "123" }, "User logged in");

// ✅ SnapBack wrapper (message first, like console.log)
logger.info("User logged in", { userId: "123" });
```

**Rationale:**
- Matches `console.log()` mental model
- More readable for developers
- Consistent with `@snapback/contracts` interface

---

## Log Levels

### Level Usage Guidelines

```typescript
// DEBUG - Detailed diagnostic info (development only)
logger.debug("Processing snapshot", {
  step: "validation",
  fileSize: 1024,
});

// INFO - Normal operations (production default)
logger.info("Snapshot created", {
  snapshotId: "snap-abc123",
  duration: 45,
});

// WARN - Recoverable issues (degraded functionality)
logger.warn("Cache miss, regenerating", {
  cacheKey: "snapshot:snap-123",
  missCount: 5,
});

// ERROR - Failures requiring attention
logger.error("Snapshot creation failed", {
  error: error.message,
  stack: error.stack,
  filePath: "/src/index.ts",
});
```

**Environment-based levels:**

```bash
# Development
LOG_LEVEL=debug pnpm dev

# Production
LOG_LEVEL=info pnpm start
```

---

## Structured Context

### Pattern 1: Request/Response Logging

```typescript
// Type-safe logging helpers
export const log = {
  apiRequest: (data: {
    requestId: string;
    method: string;
    endpoint: string;
    userId?: string;
    duration: number;
    status: number;
  }) => {
    logger.info("API request completed", {
      type: "api_request",
      ...data,
    });
  },

  featureUsage: (data: {
    userId: string;
    feature: string;
    success: boolean;
  }) => {
    logger.info("Feature usage tracked", {
      type: "feature_usage",
      ...data,
    });
  },
};
```

---

### Pattern 3: Auth Audit Logging with Database Hooks

Use better-auth's lifecycle hooks for auth event tracking instead of custom event emission:

```typescript
// ✅ CORRECT - Centralized audit via databaseHooks
// packages/auth/src/auth.ts
export const auth = betterAuth({
  // ... existing config
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await trackEvent("auth.signup", {
            userId: user.id,
            email: user.email,
            timestamp: new Date(),
          });
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          await trackEvent("auth.signin", {
            userId: session.userId,
            timestamp: new Date(),
          });
        },
      },
      delete: {
        after: async (session) => {
          await trackEvent("auth.signout", {
            userId: session.userId,
            timestamp: new Date(),
          });
        },
      },
    },
  },
  onAPIError: {
    onError(error, ctx) {
      trackEvent("auth.error", { error, context: ctx });
    },
  },
});

// ❌ WRONG - Custom event tracking spread across services
// apps/api/src/hooks/auth-audit.ts (371 lines custom PostHog)
// apps/mcp-server/src/auth.ts (duplicated permission tracking)
// apps/cli/src/events.ts (custom event emission)
```

**Auth Event Types to Track:**
- `auth.signup` - New user registration
- `auth.signin` - Session creation
- `auth.signout` - Session deletion
- `auth.mfa_enabled` / `auth.mfa_disabled` - 2FA lifecycle
- `auth.passkey_enrolled` - Passkey registration
- `auth.api_key_created` - API key generation
- `auth.password_reset` - Password reset flow
- `auth.error` - Authentication errors

**Benefits:**
- Single source of truth for auth events
- Automatic lifecycle tracking
- No duplicated event emission logic
- Better-auth updates reflected automatically

---

### Pattern 2: Child Loggers (Scoped Context)

```typescript
// Create scoped logger for component
const activationLogger = logger.child({
  component: "extension",
  phase: "activation",
});

activationLogger.info("Starting activation");
// Output: { component: "extension", phase: "activation", msg: "Starting activation" }

activationLogger.info("Storage initialized", { dbPath: ".snapback/snapback.db" });
// Output: { component: "extension", phase: "activation", dbPath: "...", msg: "Storage initialized" }
```

**Real-World Example:**

```typescript
// packages/sdk/src/client.ts
export class SnapBackClient {
  private logger = logger.child({
    component: "sdk-client",
    endpoint: this.config.endpoint,
  });

  async createSnapshot(filePath: string) {
    this.logger.info("Creating snapshot", { filePath });

    try {
      const snapshot = await this.api.post("/snapshots", { filePath });
      this.logger.info("Snapshot created", { snapshotId: snapshot.id });
      return snapshot;
    } catch (error) {
      this.logger.error("Snapshot creation failed", {
        error: error.message,
        filePath,
      });
      throw error;
    }
  }
}
```

---

## PII Redaction

### Automatic Redaction

```typescript
// Automatically redacted fields
logger.info("User login", {
  user: {
    email: "user@example.com", // ← [REDACTED]
    password: "secret123",      // ← [REDACTED]
    name: "Alice",              // ✅ Not redacted
  },
  apiKey: "sk-abc123",          // ← [REDACTED]
  session: {
    token: "sess_xyz789",       // ← [REDACTED]
  },
});
```

**Redaction Paths:**

```typescript
// packages/infrastructure/src/logging/logger.ts
const redactPaths = [
  "user.email",
  "user.password",
  "apiKey",
  "session.token",
  "req.headers.authorization",
  "auth.*.password",     // Wildcard matching
  "config.*.secret",     // Wildcard matching
  "env.*",               // Wildcard matching
];
```

---

## Production Integration

### Axiom Configuration (Basic)

```typescript
// Production: Stream to Axiom
const hasAxiomCredentials =
  process.env.AXIOM_DATASET && process.env.AXIOM_TOKEN;

if (hasAxiomCredentials) {
  const axiomTransport = pino.transport({
    target: "@axiomhq/pino",
    options: {
      dataset: process.env.AXIOM_DATASET!,
      token: process.env.AXIOM_TOKEN!,
    },
  });

  logger = pino({
    level: process.env.LOG_LEVEL || "info",
    base: {
      env: process.env.NODE_ENV,
      service: "snapback-api",
    },
  }, axiomTransport);
}
```

For detailed Axiom queries and operations, see operational documentation.

---

## Best Practices

### 1. Always Include Context

```typescript
// ❌ BAD - No context
logger.error("Failed");

// ✅ GOOD - Actionable context
logger.error("Snapshot creation failed", {
  error: error.message,
  stack: error.stack,
  filePath: "/src/index.ts",
  userId: "user_123",
});
```

---

### 2. Use Structured Data, Not String Concatenation

```typescript
// ❌ BAD - String concatenation
logger.info(`User ${userId} created snapshot ${snapshotId}`);

// ✅ GOOD - Structured data (queryable)
logger.info("User created snapshot", { userId, snapshotId });
```

---

### 3. Log Errors with Full Context

```typescript
// ✅ GOOD - Preserve error stack
try {
  await createSnapshot(filePath);
} catch (error) {
  logger.error("Snapshot creation failed", {
    error: error.message,
    stack: error.stack,
    filePath,
    userId,
  });
  throw error;
}

// ✅ GOOD - Pass Error directly (Pino serializes it)
try {
  await createSnapshot(filePath);
} catch (error) {
  logger.error("Snapshot creation failed", error);
  throw error;
}
```

---

### 4. Use Child Loggers for Scoped Context

```typescript
// ❌ BAD - Repeat context everywhere
logger.info("Step 1", { requestId: "req-123", userId: "user-456" });
logger.info("Step 2", { requestId: "req-123", userId: "user-456" });

// ✅ GOOD - Child logger with shared context
const requestLogger = logger.child({ requestId: "req-123", userId: "user-456" });
requestLogger.info("Step 1");
requestLogger.info("Step 2");
```

---

### 5. Don't Log Sensitive Data

```typescript
// ❌ BAD - Logging passwords
logger.info("User login attempt", {
  email: "user@example.com",
  password: "secret123", // ❌ Never log passwords
});

// ✅ GOOD - Redacted automatically if using standard paths
logger.info("User login attempt", {
  user: {
    email: "user@example.com",
    password: "secret123", // ← [REDACTED] automatically
  },
});

// ✅ GOOD - Don't include sensitive fields at all
logger.info("User login attempt", {
  userId: "user_123",
  timestamp: Date.now(),
});
```

---

## Performance Considerations

### Avoid Expensive Computations in Log Arguments

```typescript
// ❌ BAD - Computes even when debug disabled
logger.debug("Processing", {
  expensive: computeExpensiveMetrics(), // Always executes
});

// ✅ GOOD - Check level first
if (logger.level === "debug") {
  logger.debug("Processing", {
    expensive: computeExpensiveMetrics(),
  });
}
```

---

## Testing Considerations

For mocking logger in tests, see `files-testing-vitest.md` rule.

---

## References

- **Logger Implementation:** `packages/infrastructure/src/logging/logger.ts` (verified ✅)
- **Pino Docs:** https://getpino.io
- **Axiom Docs:** https://axiom.co/docs
- **Testing with Mocks:** See `files-testing-vitest.md`

**Last Updated:** 2025-11-18
**Reviewed By:** Observability team
