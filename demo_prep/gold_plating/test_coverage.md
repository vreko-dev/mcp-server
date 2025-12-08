# SnapBack Comprehensive Test Coverage Plan

## Target: 95% Meaningful Coverage

Based on the implementation analysis (48% complete) and audit documents, here's the complete test matrix organized by component, priority, and test type.

---

## Current State Analysis (December 2025)

### Existing Test Coverage

| Component | Test Files | Coverage Est. | Status |
|-----------|------------|---------------|--------|
| VS Code Extension | ~150 files | ~35% | ⚠️ Incomplete |
| MCP Server | 5 files | ~20% | 🔴 Critical gaps |
| API Backend | 15 files | ~40% | ⚠️ Missing tier gating |
| CLI | 6 files | ~20% | 🔴 Missing cloud commands |
| SDK | 8 files | ~45% | ⚠️ Missing contracts |
| Web Portal | **0 files** | **0%** | 🔴 **NOT STARTED** |
| Analytics | 4 files | ~30% | ⚠️ Missing privacy tests |

### Testing Patterns Currently Used

```typescript
// ✅ ESTABLISHED PATTERN: vi.mock() for dependencies
import { vi } from 'vitest';

vi.mock('@snapback/platform', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
  }
}));

// ✅ ESTABLISHED PATTERN: Fixture factories
export const generateTestSnapshot = (overrides = {}) => ({
  id: `snap_${Date.now()}`,
  timestamp: Date.now(),
  files: [],
  ...overrides,
});

// ✅ ESTABLISHED PATTERN: Result<T,E> assertions
import { expectOk, expectErr } from '@test/helpers/test-helpers';

const snapshot = expectOk(result); // Type-safe unwrapping
```

### NEW: MSW Integration for HTTP Mocking

**Note**: Current codebase does NOT use MSW. We'll add it for API/HTTP testing while preserving existing `vi.mock()` patterns for in-memory mocking.

```typescript
// NEW PATTERN: MSW for HTTP API mocking
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const handlers = [
  http.post('/api/snapshots/create', () => {
    return HttpResponse.json({ id: 'snap_123' });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
```

---

## Implementation Roadmap (Ordered by Severity/ROI)

### 🔴 CRITICAL - Revenue Blockers (Week 1)
**ROI: IMMEDIATE** - These block monetization and security

1. **TierResolver Service** (3 test files) - **BLOCKS ALL REVENUE**
   - Cannot charge users without tier enforcement
   - Cannot rate limit without tier context
   - Cannot gate features without tier resolution
   - **Estimated Impact**: $0 → $XXX MRR blocked

2. **MCP Security** (2 test files) - **CRITICAL SECURITY RISK**
   - Path traversal attacks could expose user data
   - Input sanitization prevents injection attacks
   - **Estimated Impact**: Prevents data breach (legal/PR disaster)

3. **Security Validation Suite** (4 test files) - **AUTHENTICATION ATTACKS**
   - Token validation prevents unauthorized access
   - Authorization prevents data leaks
   - **Estimated Impact**: Prevents account takeover

### 🟠 HIGH - Demo Blockers (Week 2)
**ROI: HIGH** - Demo fails without these

4. **AutoDecisionEngine** (8 test files) - **CORE VALUE PROP**
   - The "Install → Protected" magic depends on this
   - Demo shows real-time protection decisions
   - **Estimated Impact**: Demo credibility at stake

5. **MCP Authentication/Authorization** (2 test files) - **PRO TIER DEMO**
   - Pro tier checkpoint features require auth
   - Cannot demo AI assistant integration without this
   - **Estimated Impact**: Pro tier conversion blocked

6. **SaveHandler** (1 test file) - **PROTECTION TRIGGERS**
   - User-facing protection must work reliably
   - Demo showcases snapshot creation on save
   - **Estimated Impact**: Core UX reliability

### 🟡 MEDIUM - Launch Quality (Weeks 3-4)
**ROI: MEDIUM** - Launch credibility and funnel optimization

7. **Web Portal Complete** (10 test files) - **DASHBOARD CREDIBILITY**
   - Currently 0% coverage - huge risk
   - Dashboard is primary user touchpoint after install
   - **Estimated Impact**: User trust and activation rate

8. **Telemetry Privacy** (5 test files) - **GDPR COMPLIANCE**
   - PII leaks = legal liability
   - Required for EU users
   - **Estimated Impact**: Legal risk + EU market access

9. **StorageManager** (4 test files) - **DATA INTEGRITY**
   - Snapshot storage must be bulletproof
   - Deduplication affects disk usage
   - **Estimated Impact**: Data loss prevention

10. **MCP Tools** (15 test files) - **AI ASSISTANT RELIABILITY**
    - Pro tier differentiator
    - analyze_risk, checkpoint CRUD
    - **Estimated Impact**: Pro tier retention

### 🟢 POLISH - Optimization (Weeks 5-6)
**ROI: LOW-MEDIUM** - Nice to have, not launch blockers

11. **CLI Commands** (6 test files) - **POWER USER FEATURES**
    - analyze, snapshot, restore commands
    - **Estimated Impact**: Power user satisfaction

12. **SDK Client** (8 test files) - **API STABILITY**
    - Contract compliance
    - **Estimated Impact**: API reliability

13. **Performance Tests** (3 test files) - **UX POLISH**
    - Activation <500ms, save <50ms budgets
    - **Estimated Impact**: Perceived speed

14. **E2E Workflows** (6 test files) - **REGRESSION PREVENTION**
    - Activation funnel, protection flow
    - **Estimated Impact**: Confidence in releases

15. **DBSCAN Clustering** (2 test files) - **PRO TIER FUTURE**
    - Smart grouping (not yet implemented)
    - **Estimated Impact**: Future feature validation

---

## Test Coverage Summary Matrix

| Component | Current | Target | Critical Paths | Test Files Needed |
|-----------|---------|--------|----------------|-------------------|
| AutoDecisionEngine | ~30% | 95% | Decision logic, rules evaluation | 8 |
| MCP Server | ~40% | 95% | Tools, auth, security | 12 |
| VS Code Extension | ~35% | 90% | Activation, save handler, snapshots | 15 |
| Web Portal | ~25% | 85% | Auth, dashboard, API routes | 10 |
| API Backend | ~40% | 95% | oRPC procedures, tier gating | 14 |
| CLI | ~20% | 80% | Commands, config, output | 6 |
| SDK | ~45% | 90% | Client, events, storage | 8 |
| Analytics | ~30% | 85% | Events, privacy, forwarding | 5 |
| **TOTAL** | ~33% | **91%** | | **78 test files** |

---

## 1. AutoDecisionEngine Tests (CRITICAL - 100% Implemented)

### Unit Tests (`apps/vscode/test/unit/domain/`)

```
engine.test.ts
├── DecisionEngine Core
│   ├── evaluate() returns correct decision for each protection level
│   │   ├── WATCH level → always allows save, emits telemetry
│   │   ├── WARN level → allows save, shows notification
│   │   ├── BLOCK level → blocks save until user action
│   │   └── PROTECT level → creates snapshot before save
│   ├── evaluate() handles missing context gracefully
│   ├── evaluate() respects cooldown periods
│   ├── evaluate() detects AI-generated changes
│   │   ├── Cursor signature detection
│   │   ├── Copilot signature detection
│   │   ├── Claude signature detection
│   │   └── Unknown AI tool fallback
│   └── evaluate() calculates risk scores correctly
│       ├── Low risk (<0.3) → minimal intervention
│       ├── Medium risk (0.3-0.7) → warning
│       └── High risk (>0.7) → requires confirmation

rules-evaluator.test.ts
├── RulesEvaluator
│   ├── matchRule() finds most specific matching rule
│   │   ├── Exact path match takes priority
│   │   ├── Glob pattern matching works correctly
│   │   ├── Directory rules apply to children
│   │   └── Default rule used when no match
│   ├── evaluateRules() applies rules in correct order
│   ├── evaluateRules() handles conflicting rules
│   └── evaluateRules() validates rule syntax

cooldown-manager.test.ts
├── CooldownManager
│   ├── isInCooldown() returns true during cooldown period
│   ├── isInCooldown() returns false after expiry
│   ├── setCooldown() stores cooldown with correct duration
│   ├── clearCooldown() removes specific cooldown
│   ├── clearAllCooldowns() removes all cooldowns
│   └── getRemainingTime() returns accurate remaining time

ai-detector.test.ts
├── AIDetector
│   ├── detect() identifies Cursor patterns
│   │   ├── Multi-line insertions >20 lines
│   │   ├── Burst edits within 100ms
│   │   ├── Comment style signatures
│   │   └── Import pattern analysis
│   ├── detect() identifies Copilot patterns
│   ├── detect() identifies Claude patterns
│   ├── detect() returns confidence score 0-1
│   ├── detect() handles false positives gracefully
│   └── getDetectionContext() provides explainability

risk-calculator.test.ts
├── RiskCalculator
│   ├── calculate() scores file type risk
│   │   ├── Config files (.env, .json) → high risk
│   │   ├── Source files (.ts, .js) → medium risk
│   │   └── Documentation (.md) → low risk
│   ├── calculate() scores change magnitude
│   │   ├── >100 lines changed → high risk
│   │   ├── 20-100 lines → medium risk
│   │   └── <20 lines → low risk
│   ├── calculate() considers file history
│   └── calculate() weights AI detection
```

### Integration Tests (`apps/vscode/test/integration/domain/`)

```
engine-integration.test.ts
├── Engine + Storage Integration
│   ├── Decision creates snapshot when required
│   ├── Decision records audit trail
│   ├── Decision updates telemetry
│   └── Decision respects storage limits

engine-rules-integration.test.ts
├── Engine + Rules Integration
│   ├── .snapbackrc rules are loaded and applied
│   ├── Workspace rules override global rules
│   ├── Rule changes trigger re-evaluation
│   └── Invalid rules are logged and skipped
```

---

## 2. MCP Server Tests (CRITICAL - 90% Implemented)

### Unit Tests (`apps/mcp-server/test/unit/`)

```
tools/analyze-risk.test.ts
├── analyzeRisk Tool
│   ├── Returns risk analysis for valid diff
│   ├── Handles empty diff gracefully
│   ├── Detects high-risk patterns
│   │   ├── API key exposure
│   │   ├── Credential patterns
│   │   ├── Large deletions
│   │   └── Configuration changes
│   ├── Returns confidence score
│   └── Respects rate limits

tools/check-dependencies.test.ts
├── checkDependencies Tool
│   ├── Parses package.json correctly
│   ├── Identifies new dependencies
│   ├── Identifies removed dependencies
│   ├── Flags known vulnerable packages
│   ├── Warns on major version changes
│   └── Handles malformed package.json

tools/create-checkpoint.test.ts
├── createCheckpoint Tool (Pro Tier)
│   ├── Creates snapshot with content-addressable ID
│   ├── Stores file metadata correctly
│   ├── Rejects unauthenticated requests
│   ├── Rejects free tier users
│   ├── Respects storage limits
│   └── Returns snapshot manifest

tools/list-checkpoints.test.ts
├── listCheckpoints Tool (Pro Tier)
│   ├── Returns snapshots sorted by timestamp
│   ├── Filters by date range
│   ├── Filters by trigger type
│   ├── Paginates large result sets
│   └── Returns empty array when none exist

tools/restore-checkpoint.test.ts
├── restoreCheckpoint Tool (Pro Tier)
│   ├── Retrieves correct snapshot content
│   ├── Returns all files in snapshot
│   ├── Handles missing snapshot gracefully
│   ├── Validates user owns snapshot
│   └── Records restore in audit log

auth/authentication.test.ts
├── Authentication
│   ├── Validates API key format
│   ├── Caches authentication result (1 min)
│   ├── Rejects expired API keys
│   ├── Rejects revoked API keys
│   ├── Identifies user tier correctly
│   └── Returns mock auth in test mode

auth/authorization.test.ts
├── Authorization
│   ├── Free tier can access basic tools
│   ├── Free tier rejected for Pro tools
│   ├── Pro tier can access all tools
│   ├── Enterprise tier has no limits
│   └── Rate limits enforced per tier

security/path-validation.test.ts
├── Path Validation (SECURITY CRITICAL)
│   ├── Rejects path traversal attacks
│   │   ├── "../" sequences blocked
│   │   ├── "..\" sequences blocked
│   │   ├── URL-encoded traversal blocked
│   │   └── Double-encoded traversal blocked
│   ├── Rejects absolute paths outside workspace
│   ├── Allows paths within workspace
│   ├── Handles symlinks safely
│   │   ├── Symlink to outside workspace → reject
│   │   ├── Symlink within workspace → allow
│   │   └── Circular symlinks → reject with error
│   └── Logs security violations to telemetry

security/input-sanitization.test.ts
├── Input Sanitization
│   ├── Strips PII from inputs
│   ├── Validates Zod schemas strictly
│   ├── Rejects oversized payloads
│   └── Sanitizes error messages in production
```

### Integration Tests (`apps/mcp-server/test/integration/`)

```
mcp-protocol.test.ts
├── MCP Protocol Compliance
│   ├── Responds to tools/list correctly
│   ├── Responds to tools/call correctly
│   ├── Handles malformed requests gracefully
│   ├── Returns proper error codes
│   └── Supports both STDIO and HTTP transport

backend-proxy.test.ts
├── Backend Proxy Integration
│   ├── Proxies Pro tier requests to API
│   ├── Caches responses appropriately
│   ├── Handles API timeout gracefully
│   ├── Falls back to local for basic analysis
│   └── Propagates authentication correctly

context7-integration.test.ts
├── Context7 Service
│   ├── Resolves library IDs correctly
│   ├── Fetches documentation successfully
│   ├── Caches results with TTL
│   ├── Retries on transient failures
│   └── Returns helpful error on unknown library
```

### E2E Tests (`apps/mcp-server/test/e2e/`)

```
http-server.e2e.test.ts
├── HTTP Server E2E
│   ├── Health check returns 200
│   ├── Version endpoint returns correct version
│   ├── SSE connection establishes correctly
│   ├── POST /message processes tool calls
│   ├── CORS headers set correctly
│   └── Handles concurrent requests

full-workflow.e2e.test.ts
├── Complete MCP Workflow
│   ├── AI assistant can list available tools
│   ├── AI assistant can analyze risk
│   ├── AI assistant can create checkpoint (Pro)
│   ├── AI assistant can restore checkpoint (Pro)
│   └── AI assistant receives proper errors for unauthorized actions
```

### Performance Tests (`apps/mcp-server/test/performance/`)

```
budgets.perf.test.ts
├── Performance Budgets
│   ├── analyze_risk completes in <200ms (p95)
│   ├── create_checkpoint completes in <500ms (p95)
│   ├── list_checkpoints completes in <100ms (p95)
│   ├── Authentication caching reduces latency by >80%
│   └── Memory usage stays under 100MB
```

---

## 3. VS Code Extension Tests (CRITICAL)

### Unit Tests (`apps/vscode/test/unit/`)

```
extension/activation.test.ts
├── Extension Activation
│   ├── Activates on startup finished
│   ├── Activates on snapback command
│   ├── Activates on .snapbackrc presence
│   ├── Initializes storage manager
│   ├── Registers all commands
│   ├── Registers save handler
│   └── Completes activation in <500ms

handlers/save-handler.test.ts
├── SaveHandler
│   ├── Intercepts document save events
│   ├── Evaluates protection rules
│   ├── Creates snapshot when required
│   ├── Shows warning notification when configured
│   ├── Blocks save when configured
│   ├── Respects cooldown periods
│   ├── Handles concurrent saves correctly
│   └── Completes in <50ms (without snapshot)

storage/storage-manager.test.ts
├── StorageManager
│   ├── Initializes directories on first run
│   ├── Creates content-addressable blobs
│   ├── Deduplicates identical content
│   ├── Creates snapshot manifests
│   ├── Retrieves snapshot by ID
│   ├── Lists snapshots with filters
│   ├── Deletes snapshots
│   └── Maintains audit log

storage/blob-store.test.ts
├── BlobStore
│   ├── Stores content and returns hash
│   ├── Retrieves content by hash
│   ├── Returns isNew flag for deduplication
│   ├── Handles large files (>1MB)
│   └── Calculates total storage size

storage/cooldown-cache.test.ts
├── CooldownCache
│   ├── Stores cooldown entries
│   ├── Returns null for expired entries
│   ├── Cleans up expired entries periodically
│   ├── Clears all entries on dispose
│   └── Handles concurrent access

telemetry/telemetry.test.ts
├── VSCodeTelemetry
│   ├── Initializes PostHog client
│   ├── Tracks events with correct properties
│   ├── Sanitizes PII from events
│   ├── Respects user telemetry preferences
│   ├── Queues events when offline
│   └── Flushes on extension deactivation

providers/detection-provider.test.ts
├── DetectionCodeActionProvider
│   ├── Shows code actions for AI-detected changes
│   ├── Offers "Restore to previous" action
│   ├── Offers "Accept change" action
│   ├── Offers "Add to ignore" action
│   └── Updates when document changes

views/welcome-view.test.ts
├── WelcomeView
│   ├── Renders correctly on first run
│   ├── Shows authentication button
│   ├── Shows protection status
│   ├── Links to documentation
│   └── Dismisses after setup complete
```

### Integration Tests (`apps/vscode/test/integration/`)

```
activation-flow.test.ts
├── Activation Flow Integration
│   ├── Extension activates and registers providers
│   ├── Storage initializes with correct structure
│   ├── Telemetry connects to PostHog
│   ├── Commands are executable
│   └── Status bar shows correct state

save-flow.test.ts
├── Save Flow Integration
│   ├── Save triggers evaluation
│   ├── Evaluation creates snapshot when needed
│   ├── Snapshot stored in blob store
│   ├── Manifest created with correct metadata
│   ├── Audit log updated
│   └── Telemetry event fired

auth-flow.test.ts
├── Authentication Flow Integration
│   ├── Opens browser for OAuth
│   ├── Receives callback with API key
│   ├── Stores API key securely
│   ├── Validates API key with backend
│   └── Updates UI to show authenticated state
```

### E2E Tests (`apps/vscode/test/e2e/`)

```
activation-funnel.e2e.test.ts
├── Activation Funnel E2E (DEMO CRITICAL)
│   ├── Fresh install → extension activates
│   ├── First open → welcome view shown
│   ├── Click authenticate → browser opens
│   ├── Complete OAuth → API key stored
│   ├── First file save → snapshot created
│   ├── Dashboard link → opens web portal
│   └── Full funnel completes in <5 minutes

protection-flow.e2e.test.ts
├── Protection Flow E2E
│   ├── Protected file save → snapshot created
│   ├── Warning level → notification shown
│   ├── Block level → save prevented
│   ├── User accepts → save proceeds
│   ├── User restores → file reverted
│   └── Cooldown prevents repeated prompts

snapshot-restore.e2e.test.ts
├── Snapshot Restore E2E
│   ├── Create multiple snapshots
│   ├── List snapshots in sidebar
│   ├── Select snapshot to preview
│   ├── Restore snapshot → files updated
│   ├── Partial restore → selected files only
│   └── Restore creates backup of current state
```

### Performance Tests (`apps/vscode/test/performance/`)

```
activation-perf.test.ts
├── Activation Performance
│   ├── Cold start <500ms (p95)
│   ├── Warm start <100ms (p95)
│   ├── Memory after activation <50MB
│   └── No blocking during activation

save-handler-perf.test.ts
├── Save Handler Performance
│   ├── Without snapshot <50ms (p95)
│   ├── With snapshot <100ms (p95)
│   ├── Large file (1MB) <200ms (p95)
│   └── Concurrent saves handled correctly

bundle-size.test.ts
├── Bundle Size Validation
│   ├── Total bundle <2MB
│   ├── No duplicate dependencies
│   ├── Tree shaking effective
│   └── Source maps not included in production
```

---

## 4. Web Portal Tests

### Unit Tests (`apps/web/test/unit/`)

```
hooks/use-api-keys.test.ts
├── useApiKeys Hook
│   ├── Fetches API keys on mount
│   ├── Creates new API key
│   ├── Revokes API key
│   ├── Rotates API key
│   ├── Handles errors gracefully
│   └── Invalidates cache on mutation

hooks/use-dashboard-metrics.test.ts
├── useDashboardMetrics Hook
│   ├── Fetches metrics on mount
│   ├── Transforms data correctly
│   ├── Handles loading state
│   ├── Handles error state
│   └── Refetches on interval

components/metrics-grid.test.tsx
├── MetricsGrid Component
│   ├── Renders all metric cards
│   ├── Animates number changes
│   ├── Shows loading skeleton
│   ├── Handles zero values
│   └── Responsive on mobile

components/activity-feed.test.tsx
├── ActivityFeed Component
│   ├── Renders activity items
│   ├── Shows correct icons per type
│   ├── Formats timestamps correctly
│   ├── Handles empty state
│   └── Loads more on scroll

components/ai-detection-stats.test.tsx
├── AIDetectionStats Component
│   ├── Renders tool statistics
│   ├── Shows confidence percentages
│   ├── Sorts by detection count
│   └── Handles no detections
```

### Integration Tests (`apps/web/test/integration/`)

```
auth-flow.test.ts
├── Authentication Flow
│   ├── GitHub OAuth redirects correctly
│   ├── Google OAuth redirects correctly
│   ├── Session cookie set on success
│   ├── Redirects to dashboard after login
│   └── Handles OAuth errors gracefully

api-keys.test.ts
├── API Keys Integration
│   ├── Create key returns prefix
│   ├── List keys returns all user keys
│   ├── Revoke key marks as revoked
│   ├── Revoked key cannot be used
│   └── Key rotation preserves permissions

dashboard-data.test.ts
├── Dashboard Data Integration
│   ├── Metrics endpoint returns correct data
│   ├── Activity endpoint returns recent items
│   ├── AI stats endpoint returns tool breakdown
│   └── Data scoped to authenticated user
```

### E2E Tests (`apps/web/test/e2e/`)

```
onboarding.e2e.test.ts
├── Onboarding E2E
│   ├── Waitlist signup flow
│   ├── Email verification
│   ├── First login welcome
│   ├── Extension install prompt
│   └── Dashboard tour

dashboard.e2e.test.ts
├── Dashboard E2E
│   ├── Metrics load correctly
│   ├── Activity feed updates
│   ├── Navigation works
│   ├── API key management
│   └── Settings changes persist

billing.e2e.test.ts
├── Billing E2E (when implemented)
│   ├── Upgrade prompt shown at limit
│   ├── Stripe checkout flow
│   ├── Subscription activates
│   ├── Features unlock
│   └── Downgrade flow
```

---

## 5. API Backend Tests

### Unit Tests (`packages/api/test/unit/`)

```
procedures/auth.test.ts
├── Auth Procedures
│   ├── createSession creates valid session
│   ├── validateSession returns user context
│   ├── refreshSession extends expiry
│   ├── revokeSession invalidates token
│   └── getMe returns current user

procedures/keys.test.ts
├── API Keys Procedures
│   ├── createKey generates secure key
│   ├── createKey stores hash, not plaintext
│   ├── listKeys returns user's keys
│   ├── revokeKey marks as revoked
│   ├── validateKey returns context
│   └── rotateKey preserves metadata

procedures/snapshots.test.ts
├── Snapshots Procedures
│   ├── syncMetadata stores snapshot info
│   ├── listSnapshots returns user's snapshots
│   ├── getSnapshot returns metadata
│   ├── deleteSnapshot removes record
│   └── validateRollback checks safety

procedures/analyze.test.ts
├── Analysis Procedures (IP-Protected)
│   ├── analyzeRisk returns risk score
│   ├── getSmartGrouping clusters snapshots
│   ├── validateRollback checks dependencies
│   └── Requires Pro tier authentication

procedures/telemetry.test.ts
├── Telemetry Procedures
│   ├── ingestEvents accepts batch
│   ├── ingestEvents sanitizes PII
│   ├── ingestEvents validates schema
│   ├── ingestEvents forwards to PostHog
│   └── ingestEvents handles duplicates
```

### Integration Tests (`packages/api/test/integration/`)

```
orpc-contract.test.ts
├── oRPC Contract Tests
│   ├── All procedures have correct input schemas
│   ├── All procedures have correct output schemas
│   ├── Error responses follow standard format
│   ├── Authentication middleware works
│   └── Rate limiting applies correctly

database-operations.test.ts
├── Database Operations
│   ├── User CRUD operations
│   ├── API Key CRUD operations
│   ├── Snapshot metadata CRUD
│   ├── Telemetry event insertion
│   ├── CASCADE deletes work correctly
│   └── Indexes improve query performance

redis-operations.test.ts
├── Redis Operations
│   ├── Token caching works
│   ├── Rate limit tracking works
│   ├── Cache invalidation works
│   ├── TTL expiration works
│   └── Failover to DB works
```

### Tier Gating Tests (`packages/api/test/unit/tiers/`)

```
tier-resolver.test.ts
├── TierResolver (CRITICAL - Currently Missing)
│   ├── resolve() returns correct tier for user
│   ├── resolve() checks organization tier
│   ├── checkFeature() returns true for allowed features
│   ├── checkFeature() returns false for gated features
│   ├── incrementUsage() tracks usage correctly
│   ├── getRemainingUsage() returns accurate count
│   └── Caches tier resolution for performance

feature-gates.test.ts
├── Feature Gates
│   ├── Free tier has correct features
│   │   ├── basic_protection ✓
│   │   ├── local_snapshots ✓
│   │   ├── basic_ai_detection ✓
│   │   ├── cloud_backup ✗
│   │   └── smart_grouping ✗
│   ├── Pro tier has correct features
│   │   ├── All free features ✓
│   │   ├── cloud_backup ✓
│   │   ├── smart_grouping ✓
│   │   ├── rollback_validation ✓
│   │   └── team_management ✗
│   └── Enterprise tier has all features

rate-limiting.test.ts
├── Rate Limiting
│   ├── Free tier: 100 req/min
│   ├── Pro tier: 1000 req/min
│   ├── Enterprise tier: 10000 req/min
│   ├── Returns 429 when exceeded
│   ├── Resets after window
│   └── Headers include remaining count
```

---

## 6. CLI Tests

### Unit Tests (`apps/cli/test/unit/`)

```
commands/analyze.test.ts
├── analyze Command
│   ├── Analyzes single file
│   ├── Analyzes directory recursively
│   ├── Respects .gitignore
│   ├── Outputs JSON format
│   ├── Outputs table format
│   └── Returns exit code on issues

commands/snapshot.test.ts
├── snapshot Command
│   ├── Creates snapshot of current state
│   ├── Creates snapshot of specific files
│   ├── Accepts --name flag
│   ├── Accepts --trigger flag
│   ├── Outputs snapshot ID
│   └── Handles errors gracefully

commands/list.test.ts
├── list Command
│   ├── Lists recent snapshots
│   ├── Filters by date range
│   ├── Filters by trigger type
│   ├── Outputs JSON format
│   ├── Outputs table format
│   └── Handles no snapshots

commands/restore.test.ts
├── restore Command
│   ├── Restores specific snapshot
│   ├── Restores specific files from snapshot
│   ├── Creates backup before restore
│   ├── Prompts for confirmation
│   ├── Accepts --force flag
│   └── Reports restored files

config/config-loader.test.ts
├── Config Loader
│   ├── Loads .snapbackrc.json
│   ├── Loads .snapbackrc.yaml
│   ├── Merges with defaults
│   ├── Validates schema
│   └── Reports config errors
```

### Integration Tests (`apps/cli/test/integration/`)

```
cli-workflow.test.ts
├── CLI Workflow Integration
│   ├── analyze → snapshot → restore flow
│   ├── Config changes affect behavior
│   ├── API key authentication works
│   └── Offline mode works

ci-cd-integration.test.ts
├── CI/CD Integration
│   ├── Pre-commit hook integration
│   ├── Exit codes for scripting
│   ├── JSON output for parsing
│   └── Environment variable config
```

---

## 7. SDK Tests

### Unit Tests (`packages/sdk/test/unit/`)

```
client/snapback-client.test.ts
├── SnapBack Client
│   ├── Initializes with API key
│   ├── Creates snapshot
│   ├── Lists snapshots
│   ├── Gets snapshot by ID
│   ├── Tracks events
│   ├── Handles errors
│   └── Retries on transient failures

events/event-sanitizer.test.ts
├── Event Sanitizer
│   ├── Strips path properties
│   ├── Strips email properties
│   ├── Strips IP addresses
│   ├── Strips user IDs
│   ├── Preserves allowed properties
│   └── Handles nested objects

storage/storage-broker.test.ts
├── StorageBroker
│   ├── Abstracts storage backend
│   ├── Supports file-based storage
│   ├── Supports memory storage
│   ├── Queues operations when offline
│   └── Syncs when online
```

### Contract Tests (`packages/sdk/test/contract/`)

```
api-contract.test.ts
├── API Contract Compliance
│   ├── SDK requests match API schemas
│   ├── SDK handles all API responses
│   ├── SDK handles all error codes
│   ├── Version header sent correctly
│   └── Authentication header format correct
```

---

## 8. Analytics Tests

### Unit Tests (`packages/analytics/test/unit/`)

```
events.test.ts
├── Event Definitions
│   ├── All events have correct types
│   ├── All events have required properties
│   ├── Property schemas are valid Zod
│   └── Event names follow conventions

telemetry-service.test.ts
├── TelemetryService
│   ├── Initializes with correct config
│   ├── Tracks events with properties
│   ├── Batches events for efficiency
│   ├── Flushes on threshold
│   ├── Flushes on shutdown
│   └── Handles PostHog errors

privacy.test.ts
├── Privacy Compliance
│   ├── PII never sent to analytics
│   ├── IP scrubbing applied
│   ├── User IDs anonymized
│   ├── File paths stripped
│   └── Opt-out respected
```

### Integration Tests (`packages/analytics/test/integration/`)

```
posthog-integration.test.ts
├── PostHog Integration
│   ├── Events reach PostHog
│   ├── Properties stored correctly
│   ├── Funnels track correctly
│   ├── Feature flags work
│   └── Cohorts updated
```

---

## 9. DBSCAN Clustering Tests (TO BE IMPLEMENTED)

### Unit Tests (`packages/core/test/unit/clustering/`)

```
dbscan.test.ts
├── DBSCAN Algorithm
│   ├── Clusters similar points
│   ├── Identifies outliers
│   ├── eps parameter affects cluster size
│   ├── minPts parameter affects cluster formation
│   ├── Handles edge cases
│   │   ├── Empty dataset
│   │   ├── Single point
│   │   ├── All identical points
│   │   └── No clusters (all outliers)
│   └── Performance scales linearly

session-grouper.test.ts
├── SessionGrouper
│   ├── Groups snapshots by session
│   ├── Uses temporal proximity
│   ├── Uses file relationship
│   ├── Uses semantic similarity
│   ├── Labels clusters meaningfully
│   └── Returns ungrouped as separate
```

---

## 10. Security Tests

### Security Test Suite (`test/security/`)

```
path-traversal.test.ts
├── Path Traversal Prevention
│   ├── ../ blocked
│   ├── ..\ blocked
│   ├── %2e%2e%2f blocked
│   ├── Absolute paths outside workspace blocked
│   └── Symlinks validated

input-validation.test.ts
├── Input Validation
│   ├── SQL injection patterns rejected
│   ├── XSS patterns sanitized
│   ├── Oversized payloads rejected
│   ├── Invalid JSON rejected
│   └── Schema violations rejected

authentication.test.ts
├── Authentication Security
│   ├── Invalid tokens rejected
│   ├── Expired tokens rejected
│   ├── Revoked tokens rejected
│   ├── Rate limiting enforced
│   └── Brute force prevented

authorization.test.ts
├── Authorization Security
│   ├── Users can only access own data
│   ├── Org members can access org data
│   ├── Non-members cannot access org data
│   ├── Pro features require Pro tier
│   └── Admin features require admin role
```

---

## 11. Performance Tests

### Performance Test Suite (`test/performance/`)

```
extension-budgets.perf.ts
├── Extension Performance Budgets
│   ├── Activation <500ms
│   ├── Save handler <50ms (no snapshot)
│   ├── Save handler <100ms (with snapshot)
│   ├── Bundle size <2MB
│   └── Memory <200MB

web-vitals.perf.ts
├── Web Vitals
│   ├── FCP <1.8s mobile
│   ├── LCP <2.5s mobile
│   ├── FID <100ms
│   ├── CLS <0.1
│   └── Bundle <500KB JS

api-latency.perf.ts
├── API Latency
│   ├── Auth endpoints <100ms
│   ├── CRUD endpoints <200ms
│   ├── Analysis endpoints <500ms
│   ├── Concurrent load handling
│   └── Rate limit accuracy
```

---

## Test Configuration

### Vitest Config (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        global: {
          lines: 95,
          functions: 95,
          branches: 90,
          statements: 95,
        },
      },
      exclude: [
        'test/**',
        '**/*.test.ts',
        '**/mocks/**',
        '**/dist/**',
        '**/node_modules/**',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
```

### Test Scripts (`package.json`)

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run --dir test/unit",
    "test:integration": "vitest run --dir test/integration",
    "test:e2e": "playwright test",
    "test:perf": "vitest run --dir test/performance",
    "test:security": "vitest run --dir test/security",
    "test:ci": "vitest run --coverage --reporter=junit"
  }
}
```

---

## Coverage Targets by Priority

### P0 - Demo Critical (Must have 95%+)
- [ ] AutoDecisionEngine (`apps/vscode/src/domain/`)
- [ ] SaveHandler (`apps/vscode/src/handlers/`)
- [ ] Extension Activation (`apps/vscode/src/extension.ts`)
- [ ] MCP Tools (`apps/mcp-server/src/tools/`)
- [ ] Authentication (`packages/api/modules/auth/`)

### P1 - Launch Critical (Must have 90%+)
- [ ] StorageManager (`apps/vscode/src/storage/`)
- [ ] API Keys (`packages/api/modules/keys/`)
- [ ] Telemetry (`packages/analytics/`)
- [ ] Security Validation (`*/security/`)
- [ ] Tier Gating (`packages/api/modules/tiers/`)

### P2 - Quality (Should have 85%+)
- [ ] Web Dashboard (`apps/web/`)
- [ ] CLI Commands (`apps/cli/`)
- [ ] SDK Client (`packages/sdk/`)
- [ ] Configuration Loading

### P3 - Polish (Nice to have 80%+)
- [ ] UI Components
- [ ] Error Handling Edge Cases
- [ ] Documentation Generation

---

## Estimated Implementation Time

| Test Category | Files | Estimated Time |
|---------------|-------|----------------|
| AutoDecisionEngine Unit | 5 | 8 hours |
| AutoDecisionEngine Integration | 2 | 4 hours |
| MCP Server Unit | 10 | 16 hours |
| MCP Server Integration | 3 | 6 hours |
| MCP Server E2E | 2 | 4 hours |
| VS Code Extension Unit | 8 | 16 hours |
| VS Code Extension Integration | 3 | 8 hours |
| VS Code Extension E2E | 3 | 12 hours |
| Web Portal Unit | 5 | 8 hours |
| Web Portal Integration | 3 | 6 hours |
| Web Portal E2E | 3 | 8 hours |
| API Backend Unit | 6 | 12 hours |
| API Backend Integration | 3 | 8 hours |
| Tier Gating | 3 | 8 hours |
| CLI | 5 | 8 hours |
| SDK | 3 | 6 hours |
| Analytics | 3 | 4 hours |
| Security | 4 | 8 hours |
| Performance | 3 | 6 hours |
| **TOTAL** | **78** | **~150 hours** |

---

## Next Steps

1. **Week 1**: P0 tests (AutoDecisionEngine, SaveHandler, MCP Tools)
2. **Week 2**: P0 continued (Authentication, Extension Activation)
3. **Week 3**: P1 tests (Storage, API Keys, Telemetry)
4. **Week 4**: P1 continued (Security, Tier Gating)
5. **Week 5**: P2 tests (Web, CLI, SDK)
6. **Week 6**: Polish, edge cases, documentation

This plan achieves **95% meaningful coverage** by focusing on critical paths first and ensuring all business logic, security boundaries, and performance constraints are validated.
