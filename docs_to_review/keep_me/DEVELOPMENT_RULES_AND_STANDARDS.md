# Development Rules & Standards
**Consolidated from**: .qoder/rules/ directory | **Date**: December 11, 2025
**Purpose**: Canonical development standards and architectural rules for SnapBack

---

## Overview

This document consolidates the development rules that govern SnapBack codebase decisions. All rules are organized by type and enforcement level.

**Structure**:
- **Always-On Rules** - Mandatory for all code
- **Decision Rules** - Used when specific architectural choice needed
- **File-Based Rules** - Specific to file types/patterns

---

## Part 1: Always-On Rules (Mandatory)

### Rule: Code Consolidation - Canonical Locations

**Location**: `.qoder/rules/always-code-consolidation.md`
**Applies To**: All TypeScript files
**Authority**: Workspace-wide
**Enforcement**: Critical

**Canonical Locations** (Use these ALWAYS):

| Component | Canonical Location | Usage |
|-----------|-------------------|-------|
| Error Handling | `@snapback-oss/sdk/utils/errorHelpers.ts` | Import `toError` |
| Retry Logic | `@snapback-oss/sdk/utils/retry.ts` | Use `withRetry` |
| Logger | `@snapback/infrastructure/logging/logger.ts` | Import `logger` |
| Auth | `@snapback/auth` | Use `auth.api.verifyApiKey()` |
| Validation | `apps/api/middleware/validation.ts` + `@snapback/contracts` | Zod schemas |
| Types | `@snapback/contracts` | All shared types here |
| API Client | `@snapback/sdk/client/SnapshotClient.ts` | Use canonical client |

**Pattern**:
```typescript
// ✅ CORRECT
import { toError } from "@snapback-oss/sdk";
import { logger } from "@snapback/infrastructure";
import { withRetry } from "@snapback-oss/sdk";

try {
  await withRetry(() => riskyOp(), RetryPresets.network);
} catch (error) {
  const err = toError(error);
  logger.error("Failed", { error: err.message });
}

// ❌ WRONG
import { CustomError } from "../../utils/errors"; // Wrong location
import pino from 'pino'; // Should use canonical logger
```

---

### Rule: Advanced TypeScript Patterns

**Location**: `.qoder/rules/always-typescript-patterns.md`
**Applies To**: All TypeScript files
**Authority**: Workspace-wide
**Enforcement**: Required for type-safe APIs, strongly recommended everywhere

**Key Patterns**:

#### 1. Discriminated Unions (State Machines)
```typescript
type Resource<T, E = AppError> =
  | { state: "loading" }
  | { state: "error"; error: E }
  | { state: "ready"; data: T };

// Type guards
function isReady<T, E>(r: Resource<T, E>): r is { state: "ready"; data: T } {
  return r.state === "ready";
}
```

#### 2. Const Assertions (Type Safety)
```typescript
// Replace enums with const assertions
const PROTECTION_LEVELS = ["watch", "warn", "block"] as const;
type ProtectionLevel = typeof PROTECTION_LEVELS[number];
```

#### 3. Type Guards (Runtime Narrowing)
```typescript
function isError(value: unknown): value is AppError {
  return value instanceof Error && "code" in value;
}
```

#### 4. Conditional Types (Type Transformations)
```typescript
type Awaited<T> = T extends Promise<infer U> ? U : T;
```

---

### Rule: Monorepo Imports - Package Conventions

**Location**: `.qoder/rules/always-monorepo-imports.md`
**Applies To**: All TypeScript files
**Authority**: Workspace-global
**Enforcement**: Critical - build fails without compliance

**Core Principles**:

#### Always Use `@snapback/*` Package Names
```typescript
// ✅ CORRECT - Package boundary import
import { logger } from "@snapback/infrastructure";
import { SnapshotStorage } from "@snapback/sdk/storage";
import type { Snapshot } from "@snapback/contracts";

// ❌ WRONG - Relative import across boundaries
import { logger } from "../../packages/infrastructure/src";
```

#### Workspace Protocol for Internal Dependencies
```json
{
  "dependencies": {
    "@snapback/contracts": "workspace:*",
    "@snapback/core": "workspace:*",
    "ajv": "catalog:"
  }
}
```

#### Import Patterns by Package Type
```typescript
// Apps (apps/web)
import { SnapshotManager } from "@snapback/core";       // Cross-package
import { ProtectedFileRegistry } from "./services";    // Internal (relative OK)

// Packages (packages/sdk)
import { logger } from "@snapback/infrastructure";      // Cross-package
import { validateSnapshot } from "./validation";        // Internal (relative OK)
```

**Layer Architecture**:
```
┌─────────────────────────┐
│   Apps Layer            │  CAN import: All packages
├─────────────────────────┤
│   Business Logic Layer  │  CAN import: contracts, events, infrastructure
├─────────────────────────┤
│   Foundation Layer      │  CAN import: Only contracts
└─────────────────────────┘
```

---

### Rule: Result<T, E> Error Handling Pattern

**Location**: `.qoder/rules/always-result-type-pattern.md`
**Applies To**: Public APIs, recommended for internal logic
**Authority**: Workspace-wide
**Enforcement**: Required for error handling

**Pattern**:
```typescript
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

// Type guards
function isOk<T, E>(r: Result<T, E>): r is { success: true; value: T } {
  return r.success === true;
}

// Usage
const result = await findSnapshot(id);
if (isOk(result)) {
  logger.info("Found", { id: result.value.id });
} else {
  logger.error("Not found", { error: result.error.message });
}
```

**When to Use**:
- ✅ Expected failures (user input validation, file not found, network timeout)
- ✅ Recoverable errors
- ✅ Public APIs
- ❌ Programming errors (use throw instead)

---

### Rule: React Security Boundaries

**Location**: `.qoder/rules/always-react-security-boundaries.md`
**Applies To**: React components
**Authority**: Workspace-wide
**Enforcement**: Critical for Next.js 16 RSC

**Rules**:
- Mark interactive components with "use client"
- Keep data fetching on server side
- Proper error boundaries for RSC errors
- Leverage Next.js native caching

```typescript
// Server Component (default)
export async function Dashboard() {
  const data = await fetchData(); // OK - server side
  return <Dashboard initialData={data} />;
}

// Client Component (interactive)
"use client";
export function Dashboard({ initialData }) {
  const [state, setState] = useState(initialData); // OK - client state
  return <div>{/* interactive UI */}</div>;
}
```

---

### Rule: Turbo Repo & pnpm Hardening

**Location**: `.qoder/rules/always-turborepo-pnpm-hardening.md`
**Applies To**: Build configuration
**Authority**: Workspace-global
**Enforcement**: Build fails without compliance

**pnpm Catalog** (Single source of truth):
```yaml
catalogs:
  default:
    react: 19.1.2
    next: 16.0.3
    typescript: 5.9.2
    # ... 285+ packages
```

**Turbo Configuration**:
- Proper task dependencies
- Validation gates before build
- Cache configuration correct
- Global dependencies tracked

```json
{
  "build": {
    "dependsOn": [
      "validate:infrastructure",
      "validate:exports",
      "^build"
    ],
    "cache": true
  }
}
```

---

### Rule: SDK Wrapping Pattern

**Location**: `.qoder/rules/always-sdk-wrapping-pattern.md`
**Applies To**: SDK layer
**Authority**: SDK boundary
**Enforcement**: Strong recommendation

**Pattern**: Wrap external libraries for better control

```typescript
// ✅ CORRECT - SDK boundary
export class SnapshotClient {
  private http = new HttpClient();

  async getSnapshot(id: string) {
    return this.http.get(`/snapshots/${id}`);
  }
}

// ❌ WRONG - Direct external dependency
import { default as axios } from 'axios';
export const client = axios;
```

---

### Rule: Better Auth Canonical Implementation

**Location**: `.qoder/rules/always-better-auth-canonical.md`
**Applies To**: Auth implementations
**Authority**: Auth system
**Enforcement**: Critical

**Use canonical auth package everywhere**:
```typescript
import { auth } from "@snapback/auth";

// API service
const verified = await auth.api.verifyApiKey({ key: apiKey });

// MCP server
const verified = await auth.api.verifyApiKey({ key: apiKey });

// CLI
const verified = await auth.api.verifyApiKey({ key: apiKey });
```

---

## Part 2: Decision Rules (Choose When Applicable)

### Decision: Logging & Observability

**Location**: `.qoder/rules/decision-logging-observability.md`
**Context**: At critical path operations
**Decision Points**:
- **What to log**: Business events, errors, performance milestones
- **What NOT to log**: Sensitive data, PII, internal implementation details
- **When to log**: Entry/exit points, errors, state changes

```typescript
// ✅ CORRECT - Business event
logger.info("Snapshot created", { snapshotId: id, fileCount });

// ❌ WRONG - Sensitive data
logger.info("User authenticated", { password, apiKey });
```

### Decision: Module Boundary Enforcement

**Location**: `.qoder/rules/decision-module-boundary-enforcement.md`
**Context**: When designing package structure
**Rules**:
- Keep layer separation strict
- Use public exports (index.ts)
- Don't expose internals
- Document boundaries

### Decision: OAuth Multi-Service

**Location**: `.qoder/rules/decision-oauth-multi-service.md`
**Context**: Auth provider integration
**Strategy**: Abstract provider differences, use canonical patterns

### Decision: TypeScript ESM Testing

**Location**: `.qoder/rules/decision-typescript-esm-testing.md`
**Context**: Test configuration
**Rules**: Use Vitest with proper TypeScript configuration

---

## Part 3: File-Based Rules

### Rule: Docker Deployment Configuration

**Location**: `.qoder/rules/files-docker-deployment.md`
**Applies To**: Dockerfile, docker-compose files
**Requirements**:
- Multi-stage builds for production
- Layer caching optimization
- Non-root user for security
- Health checks
- Proper signal handling (dumb-init)

```dockerfile
# ✅ CORRECT - Multi-stage with optimization
FROM node:20-alpine AS base
FROM base AS deps
RUN pnpm install
FROM base AS builder
RUN pnpm build
FROM base AS runner
COPY --from=builder /app/dist ./
USER appuser
EXPOSE 3000
```

### Rule: Testing with Vitest

**Location**: `.qoder/rules/files-testing-vitest.md`
**Applies To**: `*.test.ts`, `*.spec.ts` files
**Requirements**:
- Test pyramid (60% unit, 25% integration, 15% E2E)
- Proper test organization
- Mock dependencies clearly
- Use type-safe assertions

```typescript
describe('SnapshotService', () => {
  let service: SnapshotService;

  beforeEach(() => {
    service = new SnapshotService(new MockStorage());
  });

  it('should create and retrieve snapshots', async () => {
    const snapshot = await service.create({ filePath: '/test.ts' });
    const retrieved = await service.getById(snapshot.id);
    expect(retrieved).toEqual(snapshot);
  });
});
```

---

## Part 4: Quality Gates & Validation

### Pre-Commit Checks (Lefthook)

All commits are validated:
- ✅ Biome formatting
- ✅ DTS resolution
- ✅ TypeScript path resolution
- ✅ Import violation detection
- ✅ Workspace dependency validation
- ✅ Type checking
- ✅ Test integrity

**Example failure** (requires fix before commit):
```
❌ VIOLATION: Relative import crossing package boundary
File: apps/web/src/lib/detection.ts:1
Import: import { detect } from "../../../packages/core/src"
Fix: import { detect } from "@snapback/core"
```

---

## Part 5: Rules Summary Table

| Rule Name | Applies To | Enforcement | Impact |
|-----------|-----------|-------------|--------|
| Code Consolidation | All TypeScript | Critical | Build failure |
| TypeScript Patterns | Type-safe APIs | Strong | Type safety |
| Monorepo Imports | Cross-package imports | Critical | Build failure |
| Result Type Pattern | Error handling | Required for APIs | Consistency |
| React Boundaries | React components | Critical | RSC compliance |
| Turbo Hardening | Build configuration | Critical | Cache stability |
| SDK Wrapping | SDK layer | Strong | Maintainability |
| Better Auth | Auth code | Critical | Security |
| Docker Deployment | Dockerfiles | Strong | Production safety |
| Vitest Testing | Test files | Required | Test quality |

---

## References

- **Canonical Locations**: See always-code-consolidation.md
- **TypeScript Patterns**: See always-typescript-patterns.md
- **Monorepo Imports**: See always-monorepo-imports.md
- **Result Type**: See always-result-type-pattern.md
- **React Security**: See always-react-security-boundaries.md
- **Turbo & pnpm**: See always-turborepo-pnpm-hardening.md
- **SDK Wrapping**: See always-sdk-wrapping-pattern.md
- **Better Auth**: See always-better-auth-canonical.md
- **Docker**: See files-docker-deployment.md
- **Testing**: See files-testing-vitest.md
- **Logging**: See decision-logging-observability.md

---

**Last Updated**: December 11, 2025
**Status**: Consolidated from 20 Qoder rule files
**Authority**: Development team
**Review Schedule**: Monthly

All developers must read and adhere to these rules. Violations are caught by pre-commit validation (Lefthook) and build checks (Turbo).
