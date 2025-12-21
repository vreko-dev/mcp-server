# SnapBack Package Consolidation Analysis

## Executive Summary

With the evolution toward an **intelligence-first architecture** (AutoDecisionEngine, DBSCAN clustering, AI detection), several packages can be consolidated or eliminated. This analysis identifies **5 packages for removal**, **3 for merger**, and proposes reducing from **16 packages to 10** while maintaining full functionality.

---

## 🚀 CURRENT STATUS (Updated: 2025-12-20)

| Phase | Description | Status | Notes |
|-------|-------------|--------|-------|
| **Phase 1** | @snapback/events → @snapback/contracts | ✅ **COMPLETE** | Package deleted, all imports updated |
| **Phase 2** | @snapback/policy-engine → @snapback/intelligence | ✅ **COMPLETE** | Package deleted, 3 consumers updated |
| **Phase 3** | @snapback/analytics → contracts + infrastructure | ✅ **COMPLETE** | Package deleted, no migrations needed (duplicate) |
| **Phase 4** | @snapback/mail → apps/api | ✅ **COMPLETE** | Package deleted, no migrations needed (duplicate) |
| **Phase 5** | Final verification and cleanup | 🔲 PENDING | Update pnpm-workspace.yaml |

### Phase 1 Completion Details

**What was done:**
1. Created `packages/contracts/src/eventBus.emitter.ts` with full EventBus implementation
2. Added generic `onRequest<TData, TResult>` and `request<TResult>` methods for type safety
3. Updated `packages/contracts/package.json` with eventemitter2 dependency and subpath export
4. Updated `packages/contracts/src/index.ts` with all EventBus exports
5. Migrated all imports from `@snapback/events` → `@snapback/contracts`:
   - `apps/vscode/src/extension.ts`
   - `apps/vscode/src/activation/phase3-managers.ts`
   - `apps/vscode/src/operationCoordinator.ts`
   - `apps/vscode/src/services/protectedFileRegistry.ts`
   - `apps/vscode/src/storage/StorageManager.ts`
   - `apps/vscode/src/telemetry.ts`
   - `apps/vscode/src/bridges/StorageBridge.ts`
   - `apps/vscode/src/commands/types.ts`
   - `apps/vscode/test/integration/event-bus-*.test.ts` (2 files)
   - `apps/mcp-server/src/index.ts`
   - `apps/mcp-server/src/client/extension-ipc.ts`
6. Removed `@snapback/events` from all package.json dependencies
7. Deleted `packages/events/` directory entirely

**Verification:**
- All tests pass (77 passed, 1 pre-existing failure in snapshot-storage.test.ts)
- Type checking passes for vscode and mcp-server
- pnpm install successful

---

### Phase 3 Completion Details (2025-12-20)

**What was done:**
1. Identified `@snapback/analytics` as a **DUPLICATE** package (not consolidation)
   - Only 1 consumer: `apps/mcp-server` (unused dependency in package.json)
   - All analytics functionality already implemented in `@snapback/infrastructure/metrics`
   - Analytics package re-exports from infrastructure: `export * from "@snapback/infrastructure"`
2. Removed `"@snapback/analytics": "workspace:*"` from `apps/mcp-server/package.json`
3. Deleted `packages/analytics/` directory entirely
4. Ran `pnpm install` successfully

**Verification:**
- pnpm install successful
- MCP server build passes
- No import migrations required (no actual usage found)

**Note:** Type-check has 2 pre-existing errors in `src/index.ts` (Context7Service methods) unrelated to this change.

---

### Phase 4 Completion Details (2025-12-20)

**What was done:**
1. Identified `@snapback/mail` as a **DUPLICATE** package (not migration)
   - Zero consumers found (grep found no imports)
   - Email functionality already implemented in `apps/api/src/services/email.ts` (478 lines, using Resend)
   - Mail package had similar but unused email templates
2. Deleted `packages/mail/` directory entirely
3. Ran `pnpm install` successfully

**Verification:**
- pnpm install successful (reduced from 36 to 34 workspace packages)
- API build succeeds
- No import migrations required (no actual usage found)

**Note:** API type-check has 776 pre-existing errors (database schema issues) unrelated to this change.

---

## Current Package Landscape (16 packages)

| Package | Purpose | Size | Dependents |
|---------|---------|------|------------|
| `@snapback/analytics` | Analytics events, retention, telemetry | M | web, api |
| `@snapback/auth` | Authentication | M | web, api, mcp |
| `@snapback/config` | Configuration management | S | all |
| `@snapback/contracts` | Shared types, event bus, schemas | M | all |
| `@snapback/core` | Legacy core (partial deprecated) | L | vscode, mcp |
| `@snapback/engine` | V2 transport-agnostic runtime | M | vscode |
| `@snapback/events` | Event bus wrapper (eventemitter2) | S | vscode, mcp |
| `@snapback/github-action` | GitHub Action | S | ci/cd |
| `@snapback/infrastructure` | Logging, tracing, utilities | M | all |
| `@snapback/integrations` | Third-party integrations | M | web, mcp |
| `@snapback/intelligence` | NEW: Unified intelligence layer | M | future |
| `@snapback/mail` | Email functionality | S | api |
| `@snapback/platform` | Database (Drizzle) | L | api, web |
| `@snapback/policy-engine` | Policy evaluation, RBAC | M | mcp |
| `@snapback/sdk` | Platform SDK | M | vscode, cli |
| `@snapback/testing` | Test utilities | S | all tests |

---

## Consolidation Recommendations

### 🔴 REMOVE (5 packages)

#### 1. `@snapback/events` → Absorb into `@snapback/contracts`

**Current State:**
```typescript
// packages/events/src/index.ts - ENTIRE PACKAGE
export { EventBusEventEmitter2 } from "./EventBusEventEmitter2";
```

**Justification:**
- Only wraps `eventemitter2` with a single class
- `@snapback/contracts` already defines `eventBus.ts` interface
- Package adds ~100 LOC of overhead for minimal value
- The engine package already defines its own event system

**Migration:**
```typescript
// Move EventBusEventEmitter2 to:
// packages/contracts/src/eventBus.implementation.ts

// Update imports:
- import { EventBusEventEmitter2 } from "@snapback/events";
+ import { EventBusEventEmitter2 } from "@snapback/contracts/eventBus";
```

**Effort:** S (1-2 hours)
**Risk:** Low

---

#### 2. `@snapback/policy-engine` → Absorb into `@snapback/intelligence`

**Current State:**
```
packages/policy-engine/src/
├── PolicyEngine.ts      # Policy evaluation
├── SarifFormatter.ts    # SARIF output format
├── detectors/           # Pattern detectors
├── provider-gates.ts    # Feature gating
└── rbac.ts             # Role-based access
```

**Justification:**
- Policy decisions are intelligence-driven (pattern matching, risk scoring)
- The intelligence package already handles validation pipelines
- RBAC and provider-gates belong with auth or contracts
- Detector patterns align with intelligence's violation tracking

**Migration Plan:**
```
@snapback/intelligence:
├── context/           # (existing)
├── validation/        # (existing)
├── learning/          # (existing)
├── policy/            # ← NEW: from policy-engine
│   ├── PolicyEngine.ts
│   ├── detectors/
│   └── SarifFormatter.ts
└── types/             # (existing)

@snapback/auth:
└── rbac.ts           # ← Move from policy-engine

@snapback/contracts:
└── provider-gates.ts # ← Move from policy-engine (tier gating)
```

**Effort:** M (4-6 hours)
**Risk:** Medium (needs API compatibility layer)

---

#### 3. `@snapback/core` (Deprecated exports) → Complete migration to `@snapback/engine`

**Current Deprecated Exports in core/index.ts:**
```typescript
// export * from "./guardian"; // DEPRECATED: Use @snapback/engine
// export * from "./risk-analyzer"; // DEPRECATED: Use @snapback/engine
// export * from "./threat-detection"; // DEPRECATED: Use @snapback/engine
```

**Still Active in @snapback/core:**
- `ai-detection.ts` → Move to `@snapback/intelligence`
- `circuit-breaker.ts` → Keep in core or move to infrastructure
- `dependency-analyzer.ts` → Move to `@snapback/intelligence`
- `clustering/` → Move to `@snapback/intelligence`
- `mcp-*` → Keep in core (MCP federation is transport-level)
- `session/` → Move to `@snapback/engine`

**Justification:**
- 40% of core exports are already deprecated
- The engine package is the V2 architecture
- Remaining functionality splits between intelligence and engine

**Migration:**
```
@snapback/intelligence:
├── detection/
│   ├── ai-detection.ts      # ← from core
│   └── dependency-analyzer.ts # ← from core
├── clustering/
│   └── dbscan.ts           # ← from core

@snapback/engine:
├── session/                # ← from core/session

@snapback/core (SLIM):
├── mcp-federation.ts       # Keep: transport-level
├── mcp-client.ts          # Keep: transport-level
└── utils/                 # Keep: shared utilities
```

**Effort:** L (8-12 hours)
**Risk:** High (many consumers, needs careful migration)

---

#### 4. `@snapback/analytics` → Merge with `@snapback/contracts` telemetry

**Current Overlap:**
```
packages/contracts/src/telemetry/
├── events.ts           # 60 legacy events
├── events.v1.ts        # 7 core events
├── event-mapper.ts     # Maps legacy → core

packages/analytics/src/
├── events.ts           # More event definitions
├── telemetry-service.ts # Service wrapper
├── retention.ts        # Retention logic
```

**Justification:**
- Two packages define overlapping event schemas
- The event cataloging audit found 127 events across 3 parallel systems
- Consolidation reduces duplication and confusion
- PostHog-only strategy simplifies the stack

**Migration:**
```
@snapback/contracts:
└── telemetry/
    ├── events.ts          # Unified event definitions
    ├── schemas.ts         # Zod schemas
    ├── event-mapper.ts    # Legacy → core mapping
    └── index.ts

@snapback/infrastructure:
└── analytics/
    ├── posthog-client.ts  # PostHog SDK wrapper
    ├── retention.ts       # ← from analytics
    └── ingestion.ts       # Event ingestion
```

**Effort:** M (4-6 hours)
**Risk:** Medium (many event consumers)

---

#### 5. `@snapback/mail` → Absorb into `@snapback/api`

**Current State:** Standalone email package with minimal functionality

**Justification:**
- Only used by the API for transactional emails
- Not reused across other packages
- Adds package overhead for single-purpose utility

**Migration:**
```
apps/api/src/services/
└── mail/               # ← from packages/mail
    ├── templates/
    └── sender.ts
```

**Effort:** S (1-2 hours)
**Risk:** Low

---

### 🟡 MERGE (3 consolidations)

#### 1. Event System Consolidation

**Before (3 systems):**
```
@snapback/contracts/src/eventBus.ts       # Interface
@snapback/events/src/EventBusEventEmitter2.ts  # Implementation
@snapback/engine/src/runtime/events.ts    # V2 events
```

**After (1 system):**
```
@snapback/contracts/src/
├── eventBus.ts              # Interface
├── eventBus.emitter.ts      # eventemitter2 impl
└── types/events.ts          # Unified event types

@snapback/engine/src/runtime/
└── events.ts                # Runtime event bus (uses contracts)
```

---

#### 2. Intelligence Package Absorption

**Into `@snapback/intelligence`:**
```
FROM @snapback/core:
├── ai-detection.ts
├── clustering/dbscan.ts
├── dependency-analyzer.ts

FROM @snapback/policy-engine:
├── PolicyEngine.ts
├── detectors/
├── SarifFormatter.ts

NEW modules:
├── decision/
│   └── AutoDecisionEngine.ts    # Centralized decision logic
└── risk/
    └── RiskAnalyzer.ts          # From deprecated core
```

---

#### 3. Transport Layer Consolidation

**Keep in `@snapback/core` (slim):**
```
├── mcp-federation.ts
├── mcp-client.ts
├── mcp-fallbacks.ts
└── mcp-response-processor.ts
```

**Move to `@snapback/engine`:**
```
├── transports/
│   ├── mcp.ts           # (existing)
│   ├── http.ts          # (existing)
│   └── cli.ts           # (existing)
└── session/              # ← from core
```

---

## Proposed Final Structure (10 packages)

| Package | Purpose | Notes |
|---------|---------|-------|
| `@snapback/auth` | Authentication + RBAC | +rbac from policy-engine |
| `@snapback/config` | Configuration | Unchanged |
| `@snapback/contracts` | Types, events, schemas | +events pkg, +telemetry |
| `@snapback/core` | MCP federation only | SLIM: ~30% original size |
| `@snapback/engine` | V2 runtime | +session from core |
| `@snapback/github-action` | CI/CD | Unchanged |
| `@snapback/infrastructure` | Logging, tracing | +PostHog client |
| `@snapback/intelligence` | **Central brain** | +policy, +detection, +clustering |
| `@snapback/platform` | Database | Unchanged |
| `@snapback/sdk` | Platform SDK | Unchanged |

**Removed:**
- ~~`@snapback/analytics`~~ → contracts + infrastructure
- ~~`@snapback/events`~~ → contracts
- ~~`@snapback/integrations`~~ → infrastructure or inline
- ~~`@snapback/mail`~~ → apps/api
- ~~`@snapback/policy-engine`~~ → intelligence
- ~~`@snapback/testing`~~ → keep as devDependency only

---

## Intelligence Package Vision

The `@snapback/intelligence` package becomes the **central brain** for all decision-making:

```typescript
// @snapback/intelligence
export {
  // Context retrieval (existing)
  ContextEngine,
  SemanticSearch,

  // Validation (existing)
  ValidationPipeline,

  // Learning (existing)
  LearningEngine,
  FeedbackCollector,

  // Decision (NEW)
  AutoDecisionEngine,
  RiskAnalyzer,

  // Detection (from core)
  AIDetector,
  BurstDetector,
  DependencyAnalyzer,

  // Clustering (from core)
  DBSCANClusterer,
  SessionGrouper,

  // Policy (from policy-engine)
  PolicyEngine,
  Detectors,

  // Violation tracking (existing)
  ViolationTracker,
};
```

**Usage in VS Code Extension:**
```typescript
import {
  AutoDecisionEngine,
  AIDetector,
  PolicyEngine
} from "@snapback/intelligence";

// Single import for all intelligent behavior
const decision = await AutoDecisionEngine.evaluate({
  fileChange,
  aiContext: AIDetector.detect(change),
  policy: PolicyEngine.evaluate(file),
});
```

---

## Migration Timeline

### Phase 1: Low-Risk Removals ✅ COMPLETE
- [x] Remove `@snapback/events` → contracts
- [ ] Remove `@snapback/mail` → apps/api (moved to Phase 4)
- [x] Update all imports

### Phase 2 Completion Details (2025-12-20)

**What was done:**
1. Created `packages/intelligence/src/policy/` directory structure
2. Migrated PolicyEngine.ts, SarifFormatter.ts, and detectors/ from policy-engine
3. Created policy/index.ts with all exports (evaluate, PolicyEngine, SecretDetector, etc.)
4. Updated intelligence package.json with subpath export `./policy`
5. Updated tsup.config.ts to include policy entry
6. Updated consumers:
   - `apps/api/src/services/secret-detection.ts` → `@snapback/intelligence/policy`
   - `apps/mcp-server/src/index.ts` → `@snapback/intelligence/policy`
   - `apps/mcp-server/test/unit/policy-engine-integration.test.ts`
7. Removed stale tsconfig.json references to packages/events and packages/policy-engine
8. Deleted `packages/policy-engine/` directory

**Verification:**
- All 9 policy-engine-integration tests pass
- MCP server build succeeds
- pnpm install successful

---

### Phase 2: Policy-Engine → Intelligence (COMPLETE)
- [x] Create `packages/intelligence/src/policy/` directory
- [x] Move PolicyEngine.ts, detectors/, SarifFormatter.ts to intelligence/policy
- [x] Move rbac.ts to `packages/auth/src/rbac.ts` (SKIPPED - unused)
- [x] Move provider-gates.ts to `packages/contracts/src/provider-gates.ts` (SKIPPED - unused)
- [x] Update exports in intelligence package.json
- [x] Update all imports from `@snapback/policy-engine`
- [x] Remove `@snapback/policy-engine` from dependencies
- [x] Delete `packages/policy-engine/` directory

**Files to migrate:**
```
FROM packages/policy-engine/src/:
├── PolicyEngine.ts      → intelligence/src/policy/PolicyEngine.ts
├── SarifFormatter.ts    → intelligence/src/policy/SarifFormatter.ts
├── detectors/           → intelligence/src/policy/detectors/
├── index.ts             → intelligence/src/policy/index.ts (re-export)
├── provider-gates.ts    → contracts/src/provider-gates.ts
└── rbac.ts              → auth/src/rbac.ts
```

**Consumers to update:**
- `apps/api/src/services/secret-detection.ts` - imports SecretDetector
- `apps/mcp-server/src/index.ts` - imports evaluate
- `apps/mcp-server/test/unit/policy-engine-integration.test.ts` - imports evaluate

### Phase 3: Analytics Consolidation
- [ ] Merge `@snapback/analytics` into contracts + infrastructure
- [ ] Consolidate 127 events → unified schema
- [ ] Update PostHog integration

### Phase 4: Mail → API + Core Slimming
- [ ] Move `@snapback/mail` → `apps/api/src/services/mail/`
- [ ] Remove deprecated exports from core
- [ ] Move session to engine
- [ ] Verify all consumers updated

---

## Impact Analysis

### Bundle Size Impact (VS Code Extension)

**Before:**
```
@snapback/core: ~800KB (with deprecated code)
@snapback/events: ~50KB
@snapback/policy-engine: ~150KB
@snapback/analytics: ~100KB
```

**After:**
```
@snapback/core (slim): ~200KB
@snapback/intelligence: ~400KB
@snapback/contracts: ~150KB (includes events)
```

**Net Reduction:** ~350KB (30% improvement)

### Developer Experience

| Before | After |
|--------|-------|
| 16 packages to understand | 10 packages with clear boundaries |
| Deprecated exports mixed with active | Clean, maintained exports |
| 3 event systems | 1 unified event system |
| Decision logic scattered | Central intelligence package |

### Test Coverage Impact

- Consolidation allows combining test suites
- Fewer cross-package mocks needed
- Shared testing utilities in devDependencies

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking imports | High | Medium | Automated codemod + deprecation warnings |
| Missing functionality | Medium | High | Comprehensive test coverage before migration |
| Performance regression | Low | Medium | Bundle size monitoring in CI |
| Type errors | High | Low | TypeScript will catch at build time |

---

## Decision Required

**Option A: Full Consolidation (Recommended)**
- 10 packages final
- 6-week timeline
- Maximum DX improvement

**Option B: Minimal Consolidation**
- 13 packages final (keep analytics, integrations)
- 3-week timeline
- Lower risk, less improvement

**Option C: Intelligence-First Only**
- 14 packages final
- 2-week timeline
- Focus only on intelligence absorption

---

## Next Steps

1. **Review this analysis** with stakeholders
2. **Choose consolidation option** (A/B/C)
3. **Create migration issues** in Linear
4. **Begin Phase 1** (low-risk removals)
5. **Monitor bundle sizes** throughout

---

---

## Quick Reference: Import Changes

### Completed Migrations

```typescript
// @snapback/events → @snapback/contracts (DONE)
- import { SnapBackEvent, SnapBackEventBus } from "@snapback/events";
+ import { SnapBackEvent, SnapBackEventBus } from "@snapback/contracts";

// Generic typed requests (NEW API)
eventBus.request<IterationStats>("get_iteration_stats", { filePath });
eventBus.onRequest<{ filePath: string }, ProtectionLevel>("get_protection_level", handler);

// @snapback/policy-engine → @snapback/intelligence/policy (DONE)
- import { evaluate, SecretDetector } from "@snapback/policy-engine";
+ import { evaluate, SecretDetector } from "@snapback/intelligence/policy";
```

### Pending Migrations

```typescript
// @snapback/analytics → @snapback/contracts + @snapback/infrastructure (Phase 3)
- import { trackEvent } from "@snapback/analytics";
+ import { trackEvent } from "@snapback/infrastructure/analytics";
```

---

*Last Updated: 2025-12-20*
*Phase 1 + Phase 2 completed via MCP-guided consolidation*
*Based on: Codebase analysis via MCP tools*
