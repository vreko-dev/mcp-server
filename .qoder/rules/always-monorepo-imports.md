---
trigger: always_on
alwaysApply: true
---

# Monorepo Package Import Conventions

**Applies to:** `apps/**/*.ts`, `apps/**/*.tsx`, `packages/**/*.ts`, `packages/**/*.tsx`
**Authority:** Workspace-global rule
**Enforcement:** Critical - build fails without compliance

---

## Core Principles

### 1. Always Use `@snapback/*` Package Names

```typescript
// ✅ CORRECT - Package boundary import
import { logger } from "@snapback/infrastructure";
import { SnapshotStorage } from "@snapback/sdk/storage";
import type { Snapshot } from "@snapback/contracts";

// ❌ WRONG - Relative import across package boundary
import { logger } from "../../packages/infrastructure/src/logging/logger";
import type { Snapshot } from "../../../contracts/src/types/snapshot";
```

**Rationale:**
- Type safety across packages
- Refactoring safety (moving files doesn't break imports)
- Clear package boundaries
- VSCode IntelliSense support
- Build system validation

---

### 2. Workspace Protocol for Internal Dependencies

**In `package.json`:**
```json
{
  "dependencies": {
    "@snapback/contracts": "workspace:*",
    "@snapback/core": "workspace:*",
    "@snapback/events": "workspace:*",
    "@snapback/infrastructure": "workspace:*",
    "@snapback/sdk": "workspace:*"
  }
}
```

**Real Example from `apps/vscode/package.json`:**
```json
{
  "dependencies": {
    "@snapback/core": "workspace:*",
    "@snapback/events": "workspace:*",
    "@snapback/infrastructure": "workspace:*",
    "@snapback/sdk": "workspace:*",
    "ajv": "catalog:",
    "better-sqlite3": "catalog:",
    "pino": "catalog:"
  }
}
```

**Key Rules:**
- **Internal packages:** `workspace:*` (always uses local version)
- **External packages:** `catalog:` (centralized version management)
- **Version pinning:** Handled by pnpm catalog in `pnpm-workspace.yaml`

---

### 3. Catalog-Based Dependency Management

**Centralized Versions (`pnpm-workspace.yaml`):**
```yaml
catalogs:
  default:
    pino: 9.5.0
    vitest: 3.2.4
    typescript: 5.9.2
    '@biomejs/biome': 2.2.4
    better-sqlite3: 9.6.0
```

**Package Consumption:**
```json
{
  "devDependencies": {
    "vitest": "catalog:",
    "typescript": "catalog:",
    "@biomejs/biome": "catalog:"
  }
}
```

**Benefits:**
- Single source of truth for versions
- Prevent version drift across 580 packages
- Easy security updates (change once, apply everywhere)

---

## Import Patterns by Package Type

### Apps (apps/*)

```typescript
// apps/vscode/src/extension.ts
import { SqliteStorageAdapter } from "@snapback/sdk/storage";
import { SnapshotManager } from "@snapback/core";
import { logger } from "@snapback/infrastructure";
import type { ServiceFederation } from "@snapback/core";

// ✅ Internal app imports can use relative paths
import { ProtectedFileRegistry } from "./services/ProtectedFileRegistry";
import { StatusBarController } from "./ui/StatusBarController";
```

### Packages (packages/*)

```typescript
// packages/sdk/src/client.ts
import { logger } from "@snapback/infrastructure";
import type { Snapshot, SnapshotMetadata } from "@snapback/contracts";

// ✅ Internal package imports use relative paths
import { validateSnapshot } from "./validation";
import type { SDKConfig } from "./types";
```

### API Server (apps/api)

```typescript
// apps/api/modules/snapshots/procedures/create.ts
import { db } from "@snapback/platform/db";
import { logger } from "@snapback/infrastructure";
import { z } from "zod";

// ✅ Module-scoped imports
import { validateSnapshotInput } from "../validation";
```

---

## Subpath Exports Pattern

**Package Configuration (`packages/sdk/package.json`):**
```json
{
  "name": "@snapback/sdk",
  "exports": {
    ".": "./dist/index.js",
    "./storage": "./dist/storage/index.js",
    "./checkpoint": "./dist/checkpoint/index.js",
    "./types": "./dist/types.js"
  },
  "typesVersions": {
    "*": {
      "storage": ["./dist/storage/index.d.ts"],
      "checkpoint": ["./dist/checkpoint/index.d.ts"],
      "types": ["./dist/types.d.ts"]
    }
  }
}
```

**Usage:**
```typescript
// ✅ Subpath imports (tree-shakeable)
import { StorageBrokerAdapter } from "@snapback/sdk/storage";
import { createCheckpoint } from "@snapback/sdk/checkpoint";

// ❌ Avoid deep imports (breaks encapsulation)
import { StorageBrokerAdapter } from "@snapback/sdk/dist/storage/adapter";
```

---

## Common Patterns Across Packages

### Pattern 4: Shared Auth Logic

Use centralized auth package to prevent duplication across services:

```typescript
// ✅ CORRECT - All services use canonical auth
import { auth } from "@snapback/auth";
import { verifyApiKey } from "@snapback/auth";

// API service
const verified = await auth.api.verifyApiKey({ key: apiKey });

// MCP server
const verified = await auth.api.verifyApiKey({ key: apiKey });

// CLI tool
const verified = await auth.api.verifyApiKey({ key: apiKey });

// ❌ WRONG - Custom implementations per service
// apps/api/src/middleware/auth.ts (custom validation)
// apps/mcp-server/src/auth.ts (duplicated permission checking)
// apps/cli/src/auth.ts (custom auth logic)
```

---

### Pattern 1: Event Bus Integration

```typescript
// Used in 15+ packages
import { SnapBackEventBus } from "@snapback/events";

const eventBus = new SnapBackEventBus();
await eventBus.initialize();
await eventBus.publish("snapshot.created", { id, timestamp });
```

### Pattern 2: Structured Logging

```typescript
// Logger available in @snapback/infrastructure
import { logger } from "@snapback/infrastructure";

logger.info("Snapshot created", {
  snapshotId: id,
  fileCount: files.length,
  duration: Date.now() - startTime,
});
```

### Pattern 3: Contract Types

```typescript
// Used in all packages
import type {
  Snapshot,
  SnapshotMetadata,
  ProtectionLevel,
  RiskFactor,
} from "@snapback/contracts";
```

---

## Dependency Graph Rules

### Layer Architecture

```
┌─────────────────────────────────────┐
│           Apps Layer                 │
│  apps/vscode, apps/web, apps/api    │
│  CAN import: All packages            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Business Logic Layer           │
│  @snapback/core, @snapback/sdk      │
│  CAN import: contracts, events,     │
│              infrastructure          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Foundation Layer                │
│  @snapback/contracts (types only)   │
│  @snapback/events (pub/sub)         │
│  @snapback/infrastructure (logging) │
│  CAN import: Only contracts          │
└─────────────────────────────────────┘
```

**Forbidden Patterns:**
```typescript
// ❌ NEVER: Circular dependencies
// @snapback/contracts importing @snapback/core
import { SnapshotManager } from "@snapback/core"; // ❌

// ❌ NEVER: Cross-app imports
// apps/web importing from apps/vscode
import { ExtensionContext } from "../vscode/src/types"; // ❌

// ✅ CORRECT: Use shared contracts
import type { SharedType } from "@snapback/contracts";
```

---

## Build System Integration

### TypeScript Module Resolution

**Note:** This monorepo uses `"moduleResolution": "bundler"` in `tsconfig.base.json` which resolves packages through `package.json` exports, not path mappings.

### Turbo Build Order (`turbo.json`)

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

**Ensures:** Packages build in dependency order (contracts → core → sdk → apps)

---

## Troubleshooting

### Issue: "Cannot find module '@snapback/xyz'"

**Solution:**
1. Verify package exists: `ls packages/xyz`
2. Install dependencies: `pnpm install`
3. Build dependencies: `pnpm build`

### Issue: Circular dependency detected

**Solution:**
1. Extract shared types to `@snapback/contracts`
2. Use dependency injection to break cycles

---

## Verification Checklist

- [ ] All cross-package imports use `@snapback/*` namespace
- [ ] All internal dependencies use `workspace:*` protocol
- [ ] External dependencies use `catalog:` references
- [ ] No relative imports crossing `packages/` or `apps/` boundaries
- [ ] Package exports defined in `package.json` "exports" field
- [ ] TypeScript uses `moduleResolution: bundler` in `tsconfig.base.json`
- [ ] Build succeeds: `pnpm build`
- [ ] Type checking passes: `pnpm type-check`

---

## References

- **pnpm Workspace:** https://pnpm.io/workspaces
- **Catalog Protocol:** https://pnpm.io/catalogs
- **TypeScript Paths:** https://www.typescriptlang.org/tsconfig#paths
- **Monorepo hygiene report:** `/reports/monorepo-hygiene/baseline.json`

**Last Updated:** 2025-11-18
**Reviewed By:** Workspace architecture team
