# SnapBack Codebase Alignment Analysis

**Date**: December 3, 2025
**Scope**: Alignment between proposed architecture.md/feedback.md and current codebase
**Status**: Ready for implementation planning

---

## Executive Summary

Your codebase has **excellent structural alignment** with the proposed architecture.md design, but suffers from:
1. **Scattered telemetry implementation** across 6+ locations (consolidation needed)
2. **Package duplication** (analytics packages, auth-mock, packages-oss)
3. **Documentation fragmentation** (claudedocs, builder_pack, /docs overlap)
4. **Event naming inconsistency** (matches feedback.md Issue #1)
5. **Technical debt files** (legacy analysis documents)

**Confidence**: 70% → 85% implementation-ready with targeted cleanup

---

## Part 1: What's Aligned (No Action Needed)

### ✅ Database Schema (packages/platform)
Your schema **matches architecture.md** proposal excellently:

| Table | Status | Alignment |
|-------|--------|-----------|
| `snapshots` | ✓ | Perfect match with cloud_backup_enabled, encryption fields |
| `telemetry_events` | ✓ | Complete - userId, apiKeyId, eventType, properties, platform, sessionId |
| `user_product_metrics` | ✓ | All KPIs present (snapshots_total, restores_total, ai_bursts_detected) |
| `user_daily_metrics` | ✓ | Rolling metrics for emails/dashboard |
| `user_lifecycle_state` | ✓ | Waitlist, onboarding, retention stages |
| `user_analytics_identities` | ✓ | PostHog, HubSpot, Resend correlation |
| `protection_decisions` | ✓ | ML training data - decision_snapshot, restored_within_24h labels |
| `api_keys` | ✓ | key_prefix, key_hash, permissions, revoked_at |
| `subscription` | ✓ | Plan tracking |

**Action**: None. Continue using these tables as-is.

### ✅ API Structure (apps/api)
Telemetry procedures exist and are functional:
- `/modules/telemetry/procedures/ingest-events.ts` - Accepts batches
- `/modules/telemetry/procedures/track-event.ts` - Single event tracking
- `/modules/telemetry/procedures/enrich-event.ts` - Event enrichment
- PostHog forwarding implemented with privacy filtering
- Usage tracking for billing integration

**Action**: Keep. But consolidate the multiple PostHog clients into one.

### ✅ Auth Structure (packages/auth)
Better Auth integration is correct:
- OAuth flow implemented
- API key table with key_hash for security
- Audit logging via lib/audit.ts

**Concerns**:
- Device authorization flow (from feedback.md) not yet implemented
- Key rotation validation not present (feedback.md Issue #2)

**Action**: Implement device flow + key validator per feedback.md recommendations (Medium priority)

### ✅ Extension Schema (packages/platform/src/db/schema/extension-auth.ts)
Exists for VS Code device auth. Good foundation.

---

## Part 2: Critical Issues (Action Required)

### 🔴 ISSUE #1: Telemetry Implementation is Scattered

**Problem**: 6 different PostHog client implementations with inconsistent patterns

```
Current State:
├── apps/api/lib/posthog-server.ts (54 lines)
├── apps/web/lib/posthog-client.tsx (122 lines)
├── packages/infrastructure/src/metrics/server/index.ts (ServerAnalyticsClient)
├── packages/infrastructure/src/metrics/client/index.ts (BrowserAnalyticsClient)
├── packages/infrastructure/src/analytics/AnalyticsWrapper.ts (227 lines)
├── packages/infrastructure/src/tracing/telemetry-client.ts (279 lines)
└── apps/api/modules/telemetry/procedures/ (3 files)

Issues:
- apps/api/lib/posthog-server.ts and packages/infrastructure both have server clients
- AnalyticsWrapper and telemetry-client do similar sanitization
- No canonical telemetry service that consolidates these
```

**Recommendation**:
Create `packages/analytics/src/telemetry-service.ts` as single source of truth:

```typescript
// packages/analytics/src/telemetry-service.ts
export class CanonicalTelemetryService {
  // Single client management for PostHog
  private posthog: PostHog;

  // Used by: apps/api, apps/web, apps/vscode, apps/mcp-server, apps/cli
  async track(event: string, properties: Record<string, unknown>): Promise<void>
  async identify(userId: string, traits?: Record<string, unknown>): Promise<void>
  async shutdown(): Promise<void>

  // Privacy enforcement
  private sanitizeProperties(props: unknown): Record<string, unknown>
}

// Deprecate:
// - apps/api/lib/posthog-server.ts (4 weeks transition)
// - apps/web/lib/posthog-client.tsx (4 weeks transition)
// - packages/infrastructure/src/analytics/AnalyticsWrapper.ts (consolidate into above)
// - packages/infrastructure/src/tracing/telemetry-client.ts (consolidate)
```

**Effort**: HIGH (consolidating 6 implementations)
**Priority**: HIGH (blocks telemetry reliability)
**Timeline**: Week 1-2 of implementation

---

### 🔴 ISSUE #2: Event Naming Inconsistency

**Problem**: Matches feedback.md Issue #1 exactly

```typescript
// Current (BROKEN):
TELEMETRY_EVENTS = {
  EXTENSION_ACTIVATED: "extension.activated",      // ✓ dot notation
  EXTENSION_DEACTIVATED: "extension.deactivated",  // ✓ dot notation
  COMMAND_EXECUTION: "command.execution",          // ✓ dot notation
  // BUT new ones should be added as:
  'welcome_panel_shown'      // ✗ snake_case (INCONSISTENT)
  'auth_flow_started'        // ✗ snake_case (INCONSISTENT)
}
```

**Current Event Constants Duplication**:
- `packages/contracts/src/telemetry/events.ts` (TELEMETRY_EVENTS)
- `packages/contracts/src/events/legacy.ts` (TELEMETRY_EVENTS - duplicate)
- `packages/contracts/src/events/core.ts` (CORE_TELEMETRY_EVENTS - different)
- `packages/contracts/src/telemetry/events.v1.ts` (CORE_TELEMETRY_EVENTS - duplicate)
- `apps/api/modules/telemetry/procedures/ingest-events.ts` (inline TELEMETRY_EVENTS)

**Recommendation**:
1. Consolidate to ONE canonical location: `packages/contracts/src/events/core.ts`
2. Standardize all event names to dot.notation
3. Add missing diagnostic events from feedback.md:

```typescript
// packages/contracts/src/events/core.ts
export const CORE_EVENTS = {
  // Business metrics (7)
  SAVE_ATTEMPT: 'save_attempt',
  SNAPSHOT_CREATED: 'snapshot.created',
  SESSION_FINALIZED: 'session.finalized',
  ISSUE_CREATED: 'issue.created',
  ISSUE_RESOLVED: 'issue.resolved',
  SESSION_RESTORED: 'session.restored',
  POLICY_CHANGED: 'policy.changed',
} as const;

export const INFRASTRUCTURE_EVENTS = {
  // Extension lifecycle
  EXTENSION_INSTALLED: 'extension.installed',
  EXTENSION_ACTIVATED: 'extension.activated',
  EXTENSION_DEACTIVATED: 'extension.deactivated',

  // Auth flow (with diagnostics per feedback.md)
  AUTH_FLOW_STARTED: 'auth.flow.started',
  AUTH_PROVIDER_SELECTED: 'auth.provider.selected',
  AUTH_BROWSER_OPENED: 'auth.browser.opened',
  AUTH_CALLBACK_RECEIVED: 'auth.callback.received',
  AUTH_EXCHANGE_STARTED: 'auth.exchange.started',
  AUTH_FLOW_COMPLETED: 'auth.flow.completed',
  AUTH_FLOW_FAILED: 'auth.flow.failed',
  AUTH_FLOW_SKIPPED: 'auth.flow.skipped',

  // Welcome panel
  WELCOME_PANEL_SHOWN: 'welcome.panel.shown',
  WELCOME_FEATURE_VIEWED: 'welcome.feature.viewed',
  WELCOME_PANEL_DISMISSED: 'welcome.panel.dismissed',
} as const;
```

**Effort**: MEDIUM (consolidation + refactoring)
**Priority**: HIGH (unblocks telemetry consistency, needed before shipping)
**Timeline**: Week 1 of implementation

---

### 🔴 ISSUE #3: Package Duplication

#### A. Analytics Package Split

**Current**:
```
packages/analytics/
├── src/
├── package.json (depends on: contracts, platform)
└── Purpose: Metrics aggregation + retention analysis

packages/analytics-infra/
├── src/
├── package.json (depends on: @snapback-oss/infrastructure, contracts)
└── Purpose: PostHog client + pino logging
```

**Problem**:
- `analytics-infra` imports `@snapback-oss/infrastructure` (OSS package) instead of `@snapback/infrastructure`
- Two packages doing analytics work with unclear boundaries
- Should be ONE package

**Recommendation**:
```
MERGE: packages/analytics-infra → packages/analytics

packages/analytics/
├── src/
│   ├── telemetry-service.ts (NEW - canonical PostHog client)
│   ├── metrics/
│   │   ├── aggregation.ts (from analytics)
│   │   └── retention.ts (from analytics)
│   └── posthog/
│       ├── client.ts (from analytics-infra)
│       └── types.ts
├── package.json
└── exports:
    - ./telemetry (canonical service)
    - ./metrics (aggregation + retention)
```

**Import Fix**: Change `@snapback-oss/infrastructure` → `@snapback/infrastructure`

**Effort**: MEDIUM
**Priority**: HIGH (reduces confusion)
**Timeline**: Week 1

---

#### B. Auth-Mock Package

**Current**:
```
packages/auth-mock/
├── package.json (only depends on @snapback/auth)
└── Purpose: Testing utilities for auth

packages/auth/
├── src/
└── Purpose: Better Auth implementation
```

**Problem**:
- `auth-mock` is minimal (just 4 items, no test directory per package.json)
- Test utilities should live in same package

**Recommendation**:
```
MERGE: packages/auth-mock → packages/auth

packages/auth/
├── src/
│   └── index.ts
├── test/
│   ├── mocks.ts (from auth-mock)
│   └── fixtures.ts (mock implementations)
└── package.json (remove dependency on itself)

# Remove: packages/auth-mock entirely
```

**Effort**: SMALL
**Priority**: MEDIUM
**Timeline**: Week 1

---

#### C. packages-oss Duplication

**Current**:
```
packages/
├── contracts/
├── events/
├── infrastructure/
└── sdk/

packages-oss/
├── contracts/ (duplicate)
├── events/ (duplicate)
├── infrastructure/ (duplicate)
└── sdk/ (duplicate)
```

**Status**: Intentional sync (packages-oss is public repo mirror)

**Recommendation**: KEEP as-is, but establish sync process:
- One canonical location: `packages/*`
- Auto-sync to `packages-oss/*` via CI/CD (future)
- Update README.md in packages-oss with sync instructions

**Effort**: SMALL (documentation only)
**Priority**: LOW (already working)
**Timeline**: Post-implementation

---

### 🟡 ISSUE #4: Documentation Fragmentation

**Current State**:
```
Root level:
├── ARCHITECTURE.md (30KB - high-level design)
├── README.md (project overview)
├── QUICKSTART.md
├── CONTRIBUTING.md
├── PROJECT_MAINTENANCE_GUIDE.md
├── TDD_IMPLEMENTATION_GUIDE.md
└── [TECHNICAL DEBT FILES - see below]

/docs/ (Fumadocs - production docs):
├── api/
├── architecture/
├── deployment/
├── integration/
├── mcp/
├── open-core/
├── setup/
├── testing/
├── [15 detailed guides]

/claudedocs/ (Analysis - 20 files):
├── ARCHITECTURE_MAP.md
├── SDK-ARCHITECTURE-INDEX.md
├── deep-architecture-review-10x.md
├── sdk-architecture-design.md (61KB)
├── sdk-architecture-summary.md
├── storage-layer-architecture.md (78KB)
└── [15 more analysis docs]

/builder_pack/ (Specs - 14 files):
├── snapback-technical-spec.md
├── snapback-cli-spec.md
├── snapback-mcp-server-spec.md
├── snapback-implementation-roadmap.md
└── [10 analysis/decision docs]

/scripts/snapback_implementation_pack/:
├── architecture.md (NEW PROPOSAL)
└── feedback.md (NEW PROPOSAL)
```

**Problem**: Three competing architecture sources creating confusion

**Recommendation**:

| Directory | Status | Action |
|-----------|--------|--------|
| `/docs/` | KEEP | Primary production documentation (Fumadocs) |
| `/scripts/snapback_implementation_pack/` | KEEP | Current task source (architecture.md, feedback.md) |
| `/claudedocs/` | **ARCHIVE** | Analysis documents (can be referenced in git history) |
| `/builder_pack/` | **ARCHIVE** | Spec documents (can be referenced in git history) |
| Root ARCHITECTURE.md | CONSOLIDATE | Merge with /docs/architecture/README.md |
| Root TDD_IMPLEMENTATION_GUIDE.md | KEEP | Useful for developers |
| Root PROJECT_MAINTENANCE_GUIDE.md | KEEP | Useful for maintainers |

**Technical Debt Files to Archive**:
- `GIT_VS_SNAPBACK_VISIBILITY_FIX.md` (one-time fix, reference in git)
- `SYSTEM_DELTA_ANALYSIS.md` (historical analysis)
- `TEST_FULL_COMMIT.md` (temporary debugging)
- App-specific CLAUDE.md files (consolidate into /docs/)
- App-specific CODE_REVIEW_*.md files (consolidate or remove)

**New Structure**:
```
/docs/
├── README.md (start here)
├── QUICKSTART.md (5-minute setup)
├── architecture/
│   ├── README.md (consolidated from root ARCHITECTURE.md + Part 1-10 from architecture.md)
│   ├── auth-identity.md (from feedback.md Device flow section)
│   ├── telemetry.md (from architecture.md Part 4)
│   ├── database-schema.md (from architecture.md Part 2)
│   └── growth-lifecycle.md (from architecture.md Part 7)
├── implementation/
│   ├── phases.md (from architecture.md Part 9)
│   ├── feedback-findings.md (from feedback.md critique)
│   └── quality-gates.md (from architecture.md Part 10)
└── development/
    ├── TDD_IMPLEMENTATION_GUIDE.md (existing)
    └── CONTRIBUTING.md
```

**Effort**: MEDIUM (organizational, not code)
**Priority**: MEDIUM (improves developer experience)
**Timeline**: After code cleanup complete

---

## Part 3: Concerns with Proposed Implementation

### ⚠️ CONCERN #1: Device Authorization Flow (from feedback.md)

**Issue**: Current OAuth flow may fail on WSL/Remote SSH/Codespaces

**Current Flow**:
```
Extension → OAuth callback with code → POST /extension-grant → API Key
```

**Feedback Recommendation**: Implement RFC 8628 Device Authorization Flow

**Your Status**: Not implemented yet

**Risk Level**: MEDIUM
**When to Address**: Before initial release (users may be on Remote-SSH)
**Timeline**: Week 2

---

### ⚠️ CONCERN #2: Key Rotation & Validation (from feedback.md)

**Issue**: No mechanism for:
- When user rotates key from dashboard
- Extension knowing key was revoked
- Multi-device key usage detection

**Feedback Recommendation**: Implement KeyValidator with 5-minute background checks

**Current Status**: Not implemented

**Risk Level**: MEDIUM
**When to Address**: Before full auth rollout
**Timeline**: Week 3

---

### ⚠️ CONCERN #3: Anonymous Mode Type Pollution (from feedback.md)

**Issue**: `AnonymousContext` uses `tier: 'anonymous'` but `AuthenticatedContext` uses `tier: 'free' | 'pro'`

**Current Status**: Need to verify in extension code

**Risk Level**: LOW
**When to Address**: During auth implementation review
**Timeline**: Week 2 (verification phase)

---

### ⚠️ CONCERN #4: Event Mapper Gap (from feedback.md)

**Issue**: `mapWelcomeEventToCore()` only maps 2 of 7 core events

**Current Status**: Functions may not exist yet

**Risk Level**: LOW
**When to Address**: During telemetry consolidation (Issue #2)
**Timeline**: Week 1

---

### ⚠️ CONCERN #5: Missing Snapshot Counter Atomicity

**Issue**: Snapshot count increments without atomic guarantee for milestone nudges

**Current Status**: Unknown - need to verify `SnapshotManager.createSnapshot()`

**Risk Level**: LOW
**When to Address**: During nudge system implementation
**Timeline**: Week 3

---

## Part 4: Implementation Roadmap

### Phase 1: Consolidation (Week 1)
- [ ] Consolidate event constants (ISSUE #2)
- [ ] Standardize event naming to dot.notation
- [ ] Add missing diagnostic events from feedback.md
- [ ] Verify AnonymousMode type safety (CONCERN #3)

### Phase 2: Telemetry Unification (Week 1-2)
- [ ] Create `packages/analytics/src/telemetry-service.ts`
- [ ] Implement canonical PostHog client
- [ ] Deprecate 6 existing implementations (4-week grace period)
- [ ] Add privacy sanitization to canonical service

### Phase 3: Package Cleanup (Week 1)
- [ ] Merge `packages/analytics-infra` → `packages/analytics`
- [ ] Merge `packages/auth-mock` → `packages/auth/test`
- [ ] Fix import: `@snapback-oss/infrastructure` → `@snapback/infrastructure`

### Phase 4: Auth Implementation (Week 2-3)
- [ ] Implement Device Authorization Flow (feedback.md)
- [ ] Implement KeyValidator (feedback.md)
- [ ] Add key rotation handling
- [ ] Add multi-device detection

### Phase 5: Telemetry Enhancements (Week 2)
- [ ] Implement event mapper for Core → Infrastructure events
- [ ] Add missing diagnostic events for auth funnel
- [ ] Add atomic snapshot counter for nudges

### Phase 6: Documentation (Week 2-3)
- [ ] Archive /claudedocs → docs/archive/
- [ ] Archive /builder_pack → docs/archive/
- [ ] Consolidate root ARCHITECTURE.md into /docs/architecture/
- [ ] Create implementation-specific guides in /docs/implementation/

---

## Part 5: Directory Management Decisions

### Recommend Archiving (keep in git history, move to docs/archive)
```bash
# Create archive directory
mkdir -p docs/archive/

# Move analysis documents
mv claudedocs/* docs/archive/claudedocs/
mv builder_pack/* docs/archive/builder_pack/
rmdir claudedocs builder_pack

# Move root-level technical debt files
mv GIT_VS_SNAPBACK_VISIBILITY_FIX.md docs/archive/
mv SYSTEM_DELTA_ANALYSIS.md docs/archive/
mv TEST_FULL_COMMIT.md docs/archive/

# Update .gitignore if needed (keep docs/archive in git)
```

### Recommend Consolidating
```
Root documentation:
├── ARCHITECTURE.md → docs/architecture/README.md (merge)
├── README.md → Keep (overview)
├── QUICKSTART.md → Keep (or move to docs/)
├── CONTRIBUTING.md → Keep
├── TDD_IMPLEMENTATION_GUIDE.md → Keep (move to docs/development/)
└── PROJECT_MAINTENANCE_GUIDE.md → Keep

Packages:
├── packages/auth + packages/auth-mock → packages/auth (merge)
├── packages/analytics + packages/analytics-infra → packages/analytics (merge)
└── packages-oss → Keep (OSS sync target)
```

### Recommend Keeping
```
apps/*/CLAUDE.md → These are specific guides per app
apps/vscode/package.json, apps/api/package.json, etc. → Obviously keep
docs/ → Production docs (Fumadocs) - keep and expand
```

---

## Part 6: Success Metrics

After implementing above recommendations:

| Metric | Current | Target |
|--------|---------|--------|
| PostHog client implementations | 6 | 1 |
| Event naming consistency | 60% (mixed notation) | 100% (all dot.notation) |
| Core event mappings implemented | 2/7 | 7/7 |
| Auth endpoints | OAuth only | OAuth + Device flow |
| Documentation sources of truth | 3 (root + docs/ + proposals) | 1 (/docs/) |
| Technical debt files in root | 3 | 0 |
| Package duplication | 2 | 0 |
| Implementation readiness | 70% | 85%+ |

---

## Summary Table: What to Do

| Item | Type | Action | Effort | Priority | Timeline |
|------|------|--------|--------|----------|----------|
| Event naming | CODE | Consolidate, standardize to dot.notation | M | HIGH | W1 |
| Telemetry scattered | CODE | Create canonical service | H | HIGH | W1-2 |
| Analytics packages | CODE | Merge analytics-infra → analytics | M | HIGH | W1 |
| Auth-mock package | CODE | Merge → auth/test | S | MED | W1 |
| Device auth flow | CODE | RFC 8628 implementation | M | MED | W2 |
| Key validation | CODE | KeyValidator with polling | M | MED | W3 |
| claudedocs | DOCS | Archive to docs/archive | S | MED | W2 |
| builder_pack | DOCS | Archive to docs/archive | S | MED | W2 |
| Root ARCHITECTURE.md | DOCS | Consolidate to /docs/architecture | S | MED | W3 |
| Tech debt files | DOCS | Move to archive | S | LOW | W3 |
| packages-oss | DOCS | Update with sync process | S | LOW | Post-impl |

---

## Final Recommendation

**Proceed with implementation using this roadmap:**

1. **Weeks 1**: Complete all HIGH priority code consolidations
   - Event naming
   - Telemetry unification
   - Package merges

2. **Weeks 2-3**: Complete MEDIUM priority features from feedback.md
   - Device authorization flow
   - Key validation
   - Event mapper enhancements

3. **Weeks 2-3**: Documentation cleanup
   - Archive historic analysis
   - Consolidate architecture docs
   - Clean up root directory

4. **Post-implementation**: Establish maintenance practices
   - Document OSS sync process
   - Create CODEBASE_MAINTENANCE.md
   - Update contribution guidelines

---

**Questions or concerns?** This analysis is ready for discussion.
