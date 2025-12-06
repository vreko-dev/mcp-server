---
trigger: always_on
alwaysApply: true
---

# Code Consolidation - Canonical Locations

**Applies to:** All TypeScript files
**Authority:** Workspace-wide
**Enforcement:** Critical - prevents duplication

---

## Canonical Locations (Dec 2025)

| Component | Canonical Location | Status |
|-----------|-------------------|--------|
| Error Handling | `@snapback-oss/sdk/utils/errorHelpers.ts` | ✅ Use this |
| Retry Logic | `@snapback-oss/sdk/utils/retry.ts` | ✅ Use this |
| Logger | `@snapback/infrastructure/logging/logger.ts` | ✅ Use this |
| Auth | `@snapback/auth` | ✅ Use this |
| Validation | `apps/api/middleware/validation.ts` + `@snapback/contracts` | ✅ Use this |
| Types | `@snapback/contracts` | ✅ Use this |
| API Client | `@snapback/sdk/client/SnapshotClient.ts` | ✅ Use this |

---

## Usage Patterns

### Error Handling
```typescript
// ✅ CORRECT
import { toError } from "@snapback-oss/sdk";

try {
  await operation();
} catch (error) {
  const err = toError(error);
  logger.error("Failed", { error: err.message });
}
```

### Retry Logic
```typescript
// ✅ CORRECT
import { withRetry, RetryPresets } from "@snapback-oss/sdk";

await withRetry(() => fetch("/api/data"), RetryPresets.network);
```

### Logging
```typescript
// ✅ CORRECT
import { logger } from "@snapback/infrastructure";

logger.info("Event", { data });
```

---

**Last Updated:** 2025-12-06
**Impact:** ~261 lines saved
