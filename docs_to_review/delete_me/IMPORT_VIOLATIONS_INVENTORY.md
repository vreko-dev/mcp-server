# Import Violations Inventory

**Generated:** December 8, 2025
**Scope:** All `apps/*/src`, `apps/*/test`, and `packages/*/src`, `packages/*/test`

---

## Executive Summary

This document catalogs all instances where **relative imports** (e.g., `../../../`) are used instead of the TypeScript path aliases (e.g., `@snapback/*`).

### Key Metrics

- **Total files with violations:** 255
- **Total relative imports:** ~475 import statements
- **Breakdown by location:**
  - `apps/api/`: 84 files
  - `apps/vscode/`: 138 files
  - `apps/web/`: 8 files
  - `packages/*/`: 13 files

---

## Violations by Location

### 📦 apps/api/ (84 files)

**Pattern:** Most violations use `../../../` to reach:
- Sibling service modules
- Database utilities
- Logger utilities
- Type definitions

**Top sources:**
- `../../../orpc/procedures` (68 files)
- `../../../src/services/database` (54 files)
- `../../../lib/logger` (5 files)

**Why it happens:** The API routes deeply nested under `apps/api/modules/*/procedures/` or `apps/api/routes/v1/` need to import from `apps/api/src/` utilities.

**Fix strategy:** Create `@snapback/api` package exports that expose these utilities.

---

### 🔌 apps/vscode/ (138 files)

**Pattern:** Test files (in `test/` and `test/integration/`) importing from `../../../src/`

**Example violations:**
```typescript
// ❌ Current (relative)
import { getProtectionLevelForFile } from "../../../src/config/merge";

// ✅ Should be
import { getProtectionLevelForFile } from "@snapback/vscode-extension";
```

**Top sources:**
- `../../../src/config/loaders` - 10+ test files
- `../../../src/config/merge` - 8+ test files
- `../../../src/services/*` - 50+ test files

**Why it happens:** VS Code extension tests are nested under `apps/vscode/test/` but need to test source code in `apps/vscode/src/`.

**Fix strategy:**
1. Move test files adjacent to source files
2. OR create internal test utilities package
3. OR configure test-only path aliases

---

### 💻 apps/web/ (8 files)

**Pattern:** Minor violations in components and hooks

**Example:**
```typescript
// ❌ Current
import { useSessionRecording } from "../../../../modules/analytics/hooks/use-session-recording";

// ✅ Should be
import { useSessionRecording } from "@snapback/web";
```

**Top sources:**
- `../../../../config` (analytics tests)
- `../../../../modules/analytics` (component files)

**Why it happens:** Deeply nested component structure.

---

### 📚 packages/* (13 files)

**Pattern:** Test files importing from source

**Examples:**
- `packages/core/test/` → `../../../src/detection/scanner/FusedScanner`
- `packages/sdk/tests/unit/` → `../../../../src/core/session/SessionCoordinator`

**Why it happens:** Test directories are `test/` instead of colocated or using `__tests__/`.

---

## Detailed Violation Sources

### Top 20 Most Common Import Paths

| Import Pattern | Files | Location |
|---|---|---|
| `../../../orpc/procedures` | 68 | apps/api |
| `../../../src/services/database` | 54 | apps/api |
| `../../../src/services/protectedFileRegistry` | 22 | apps/vscode |
| `../../../src/types/snapbackrc.types` | 13 | apps/vscode |
| `../../../src/storage/types` | 9 | apps/vscode |
| `../../../src/handlers/SaveHandler` | 8 | apps/vscode |
| `../../../src/config/merge` | 7 | apps/vscode |
| `../../../src/storage/SqliteStorageAdapter` | 6 | apps/vscode |
| `../../../src/performance/PerformanceMonitor` | 6 | apps/vscode |
| `../../../src/workspaceMemory` | 5 | apps/vscode |
| `../../../src/operationCoordinator` | 5 | apps/vscode |
| `../../../lib/usage` | 5 | apps/api |
| `../../../lib/logger` | 5 | apps/api |
| `../../../src/views/types` | 4 | apps/vscode |
| `../../../src/ui/ProtectionDecorationProvider` | 4 | apps/vscode |
| `../../../src/storage/SqliteCheckpointStorage` | 4 | apps/vscode |
| `../../../src/snapshot/sessionTypes` | 4 | apps/vscode |
| `../../../src/providers/CheckpointDocumentProvider` | 4 | apps/vscode |
| `../../../src/notificationManager` | 4 | apps/vscode |
| `../../../src/config/configurationManager` | 4 | apps/vscode |

---

## Import Pattern Analysis

### Pattern 1: Test Files (Most Common)

**Frequency:** ~400/475 imports

**Issue:** Tests are separated from source and use relative imports
```typescript
// apps/vscode/test/unit/config/merge.test.ts
import { getProtectionLevel } from "../../../src/config/merge"; // ❌
```

**Why problematic:**
- Creates coupling to directory structure
- Makes refactoring difficult
- Breaks when files move

**Solution:**
1. Configure vitest path aliases for tests
2. Use test-specific tsconfig with path mappings
3. Or move tests adjacent to source (`src/__tests__/`)

---

### Pattern 2: API Procedures (app-specific)

**Frequency:** ~130/475 imports

**Issue:** Procedures and routes import from sibling modules and utilities
```typescript
// apps/api/modules/admin/procedures/find-organization.ts
import { adminProcedure } from "../../../orpc/procedures"; // ❌
```

**Why problematic:**
- API is monolithic without clear package boundaries
- No `@snapback/api` package abstraction

**Solution:**
1. Create clear API service boundaries with exports
2. Use path aliases within `apps/api/tsconfig.json`
3. Consider extracting API into a package

---

### Pattern 3: Component Imports (web)

**Frequency:** ~10/475 imports

**Issue:** Nested components importing from higher levels
```typescript
// apps/web/modules/saas/dashboard/components/ActivityFeed.tsx
import { AnalyticsEvents } from "../../../../analytics"; // ❌
```

**Solution:**
1. Use `@/` alias configured in next.config.js
2. Or use barrel exports (`index.ts`)

---

## Root Causes

### 1. **Test File Organization** (Most Common)
- Tests live in `test/` directories instead of `__tests__/` adjacent to source
- No test-specific path aliases configured
- **Impact:** 200+ violations

### 2. **Monolithic Apps** (apps/api, apps/vscode)
- Apps lack internal package structure
- No clear service boundaries
- **Impact:** 150+ violations

### 3. **Missing tsconfig Paths** (Some files)
- Internal path aliases not configured for tests
- **Impact:** 75+ violations

### 4. **Deeply Nested Structures**
- Component hierarchies in `apps/web/modules/*/components/`
- API procedures in `apps/api/modules/*/procedures/`
- **Impact:** 50+ violations

---

## Next Steps & Recommendations

### Phase 1: Immediate (Low Effort, High Impact)

1. **Configure test path aliases in vitest configs**
   - Add `@snapback/vscode-extension` to `apps/vscode/vitest.config.ts`
   - Add `@snapback/api` to `apps/api/tsconfig.test.json`
   - Add `@snapback/web` to `apps/web/tsconfig.test.json`

2. **Update tsconfig files**
   - Each app should have path mappings for internal modules
   - Tests can use pointing to `src/`

### Phase 2: Medium Effort

1. **Reorganize test files**
   - Move from `test/unit/` → `src/__tests__/`
   - Eliminates need for deep relative paths

2. **Create internal API boundaries**
   - `apps/api/lib/` → `@snapback/api-lib`
   - `apps/api/services/` → `@snapback/api-services`
   - Create `apps/api/src/index.ts` with exports

### Phase 3: Long Term

1. **Extract APIs into packages**
   - Move `apps/api` modules to `packages/api/*`
   - Use `@snapback/api-*` namespace
   - Maintains monorepo while enabling better isolation

2. **Implement automated linting**
   - Pre-commit hooks to catch relative imports
   - Linting rules for cross-package imports
   - Already partially configured in `.lefthook.yml`

---

## Configuration Examples

### Option 1: Test Path Aliases (Quickest)

**apps/vscode/vitest.config.ts:**
```typescript
export default defineConfig({
  resolve: {
    alias: {
      // Internal modules - accessible from tests
      "@snapback/vscode": path.resolve(__dirname, "./src"),
      "@snapback/vscode-config": path.resolve(__dirname, "./src/config"),
      "@snapback/vscode-services": path.resolve(__dirname, "./src/services"),
    },
  },
  test: {
    globals: true,
    environment: "node",
  },
});
```

**Test usage:**
```typescript
// ❌ Before
import { getProtectionLevel } from "../../../src/config/merge";

// ✅ After
import { getProtectionLevel } from "@snapback/vscode-config/merge";
```

---

### Option 2: Monorepo Package Approach

**apps/api/package.json:**
```json
{
  "exports": {
    ".": "./src/index.js",
    "./lib": "./src/lib/index.js",
    "./services": "./src/services/index.js",
    "./orpc": "./src/orpc/procedures.js"
  }
}
```

**Usage:**
```typescript
// ❌ Before
import { log } from "../../../lib/logger";

// ✅ After
import { log } from "@snapback/api/lib";
```

---

## File List: All 255 Violations

### apps/api (84 files)
- `__tests__/legacy/metadata.test.ts`
- `__tests__/legacy/user.test.ts`
- `modules/admin/procedures/find-organization.ts`
- `modules/admin/procedures/list-organizations.ts`
- `modules/admin/procedures/list-users.ts`
- `modules/analytics/procedures/get-agent-suggestions.ts`
- `modules/analytics/procedures/get-analytics-metrics.ts`
- `modules/analytics/procedures/get-api-key-usage.ts`
- `modules/analytics/procedures/get-daily-metrics.ts`
- `modules/analytics/procedures/get-feedback.ts`
- `modules/analytics/procedures/get-loops.ts`
- `modules/analytics/procedures/get-policy-evaluations.ts`
- `modules/analytics/procedures/get-post-accept-outcomes.ts`
- `modules/analytics/procedures/get-snapshots.ts`
- `modules/analytics/procedures/ingest-events.ts`
- `modules/analytics/procedures/process-daily-metrics.ts`
- `modules/apikeys/procedures/create-api-key.ts`
- `modules/apikeys/procedures/list-api-keys.ts`
- `modules/apikeys/procedures/revoke-api-key.ts`
- `modules/auth/procedures/track-api-usage.ts`
- `modules/auth/procedures/verify-api-key.ts`
- `modules/contact/procedures/submit-contact-form.ts`
- `modules/cooldowns/procedures/clear-expired-cooldowns.ts`
- `modules/cooldowns/procedures/get-cooldown-status.ts`
- `modules/cooldowns/procedures/list-cooldowns.ts`
- `modules/dashboard/procedures/__tests__/get-metrics.test.ts`
- `modules/dashboard/procedures/get-ai-detection-stats.ts`
- `modules/dashboard/procedures/get-metrics.ts`
- `modules/dashboard/procedures/get-org-metrics.ts`
- `modules/dashboard/procedures/get-recent-activity.ts`
- `modules/dashboard/procedures/get-session-metrics.ts`
- `modules/dashboard/procedures/get-subscription-data.ts`
- `modules/dashboard/procedures/get-user-metrics.ts`
- `modules/device-trials/procedures/create-device-trial.ts`
- `modules/device-trials/procedures/link-device.ts`
- `modules/extension/procedures/create-extension-session.ts`
- `modules/extension/procedures/validate-api-key.ts`
- `modules/feature-flags/procedures/get-user-flags.ts`
- `modules/feedback/procedures/submit-feedback.ts`
- `modules/feedback/procedures/submit-nps.ts`
- `modules/newsletter/procedures/subscribe-to-newsletter.ts`
- `modules/organizations/lib/membership.ts`
- `modules/organizations/procedures/create-logo-upload-url.ts`
- `modules/organizations/procedures/generate-organization-slug.ts`
- `modules/organizations/procedures/get-by-id.ts`
- `modules/payments/procedures/create-checkout-link.ts`
- `modules/payments/procedures/create-payment-intent.ts`
- `modules/payments/procedures/get-billing-portal-url.ts`
- `modules/payments/procedures/get-invoice.ts`
- `modules/payments/procedures/list-invoices.ts`
- `modules/payments/procedures/retrieve-checkout-session.ts`
- `modules/payments/procedures/validate-coupon.ts`
- `modules/policy-evaluations/procedures/evaluate-policy.ts`
- `modules/policy-evaluations/procedures/get-current-policy.ts`
- `modules/snapshots/procedures/create-checkpoint.ts`
- `modules/snapshots/procedures/get-checkpoint.ts`
- `modules/subscriptions/procedures/get-subscription.ts`
- `modules/subscriptions/procedures/list-subscriptions.ts`
- `modules/subscriptions/procedures/sync-subscriptions.ts`
- `modules/users/procedures/get-profile.ts`
- `modules/users/procedures/update-profile.ts`
- `middleware/__tests__/api-key-scope.integration.test.ts`
- `middleware/__tests__/csrf-protection.integration.test.ts`
- `middleware/__tests__/ratelimit.integration.test.ts`
- `routes/v1/__tests__/analyze.spec.ts`
- `routes/v1/analyze.ts`
- `routes/v1/detect-secrets.ts`
- `routes/v1/policy-current.ts`
- `routes/v1/policy-evaluate.ts`
- `routes/v1/telemetry-ingest.ts`
- `routes/__tests__/api-endpoints.integration.test.ts`
- [+ 14 more]

### apps/vscode (138 files)

**Test files (majority):**
- `test/integration/config/loaders.sandbox.integration.test.ts`
- `test/integration/config/precedence.torture.integration.test.ts`
- `test/integration/config/sandbox.integration.test.ts`
- `test/unit/commands/*.test.ts` (10+ files)
- `test/unit/config/*.test.ts` (20+ files)
- `test/unit/services/*.test.ts` (30+ files)
- `test/unit/storage/*.test.ts` (15+ files)
- [+ many more test files]

### apps/web (8 files)
- `__tests__/modules/analytics/hooks/use-session-recording.test.ts`
- `modules/marketing/shared/components/Footer.tsx`
- `modules/saas/dashboard/components/ActivityFeed.tsx`
- `modules/saas/dashboard/components/AIDetectionStats.tsx`
- `modules/saas/dashboard/components/MetricsGrid.tsx`
- `tests/integration/analytics/identify.spec.tsx`
- `tests/integration/analytics/init.spec.ts`
- `tests/integration/analytics/init.spec.tsx`

### packages (13 files)
- `packages/core/test/detection/performance/fused-scanner.perf.test.ts`
- `packages/core/test/detection/scanner/FusedScanner.test.ts`
- `packages/core/test/detection/validation/ABTest.test.ts`
- `packages/infrastructure/test/session-replay.test.ts`
- `packages/sdk/__tests__/core/detection/*.test.ts` (5 files)
- `packages/sdk/__tests__/core/session/*.test.ts` (4 files)
- `packages/sdk/tests/unit/storage/*.ts` (3 files)

---

## Monorepo Import Convention (Reference)

Per `always-monorepo-imports.md`:

### ✅ CORRECT
```typescript
import { logger } from "@snapback/infrastructure";
import type { Snapshot } from "@snapback/contracts";
import { SnapshotManager } from "@snapback/core";
```

### ❌ WRONG (All violations in this inventory)
```typescript
import { logger } from "../../../packages/infrastructure/src";
import type { Snapshot } from "../../../../packages/contracts/src";
```

---

## Conclusion

The codebase has **255 files** using relative imports instead of path aliases, concentrated primarily in:
1. **Test files** (200+ files)
2. **API procedures** (80+ files)

The violations are not critical blockers but represent technical debt:
- **Risk:** Low for functionality
- **Risk:** High for maintainability (refactoring becomes fragile)
- **Effort to fix:** Low (mostly configuration + moving tests)
- **ROI:** High (improves developer experience significantly)

**Recommended action:** Start with Phase 1 (test path aliases) for quick wins, then Phase 2 (test reorganization) for sustainable solution.
