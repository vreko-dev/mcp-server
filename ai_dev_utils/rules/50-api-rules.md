---
description: "API and backend development patterns"
globs:
  - "apps/api/**/*.ts"
  - "packages/platform/**/*.ts"
alwaysApply: false
---

# API & Backend Rules

**Applies to:** `apps/api/`, `packages/platform/`

---

## Service Layer Pattern

```
RULE: Database queries MUST go through service layer
CHECK: apps/api/src/procedures/** cannot contain "db.query" or "db.select"
ALLOWED: apps/api/src/services/** can contain database operations
```

---

## Procedure Structure

```typescript
// apps/api/src/procedures/snapshots.ts
// ✅ Thin orchestration - delegates to services

export const createSnapshot = procedure
  .input(createSnapshotSchema)
  .mutation(async ({ input, ctx }) => {
    // Auth check
    await ctx.auth.requireUser();

    // Delegate to service
    return snapshotService.create(input);
  });
```

---

## Error Handling Required

```typescript
// All async operations MUST have error handling
try {
  const result = await someService.action();
  return { success: true, data: result };
} catch (error) {
  logger.error("Operation failed", { error: toError(error) });
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
}
```

---

## Authentication Pattern

```typescript
// Use @snapback/auth consistently
import { auth } from "@snapback/auth";

// API service
const verified = await auth.api.verifyApiKey({ key: apiKey });

// Never create custom auth implementations per service
```

---

## Canonical Imports

```typescript
// ✅ CORRECT
import { logger } from "@snapback/infrastructure";
import { toError } from "@snapback-oss/sdk";
import type { Snapshot } from "@snapback/contracts";

// ❌ WRONG - relative across packages
import { logger } from "../../packages/infrastructure/src/logger";
```
