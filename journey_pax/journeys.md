# SnapBack Journey-Driven Development Kits

**Generated**: 2025-12-07
**Source**: Conversation history + audit documents
**Total Journeys**: 24

---

## Journey Dependency Graph

```
                           ┌─────────────────────────────────────────┐
                           │          FOUNDATION LAYER               │
                           │  (Must complete before any journeys)    │
                           │  F0.1 TypeScript Fix                    │
                           │  F0.2 Bundle Size Optimization          │
                           │  F0.3 Token Validation                  │
                           │  F0.4 Analytics Consolidation           │
                           └─────────────────┬───────────────────────┘
                                             │
           ┌─────────────────────────────────┼─────────────────────────────────┐
           │                                 │                                 │
           ▼                                 ▼                                 ▼
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  01-waitlist-signup  │     │  Extension Layer     │     │  Backend Layer       │
│  (Web Entry Point)   │     │  (No auth needed)    │     │  (API infrastructure)│
└──────────┬───────────┘     └──────────────────────┘     └──────────────────────┘
           │                           │
           ▼                           ▼
┌──────────────────────┐     ┌──────────────────────┐
│ 02-oauth-activation  │────▶│ 05-extension-install │
│ (Web Auth)           │     │ (First Run)          │
└──────────┬───────────┘     └──────────┬───────────┘
           │                            │
           ▼                            ▼
┌──────────────────────┐     ┌──────────────────────┐
│ 03-api-key-generation│◀───▶│ 06-first-protected-  │
│ (Web Dashboard)      │     │     save             │
└──────────┬───────────┘     └──────────┬───────────┘
           │                            │
           ├────────────────────────────┼────────────────────────────┐
           │                            │                            │
           ▼                            ▼                            ▼
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│ 08-mcp-analyze-risk  │     │ 07-first-ai-detection│     │ 14-cli-snapshot      │
│ (MCP Basic Tool)     │     │ (Extension)          │     │ (CLI Basic)          │
└──────────┬───────────┘     └──────────┬───────────┘     └──────────────────────┘
           │                            │
           ▼                            ▼
┌──────────────────────┐     ┌──────────────────────┐
│ 09-mcp-checkpoints   │     │ 10-first-recovery    │
│ (MCP Pro Tools)      │     │ (Extension)          │
└──────────────────────┘     └──────────────────────┘
```

---

## Priority Classification

### P0 - Demo Blockers (Must work for YC demo)
| Journey | Surface | Description |
|---------|---------|-------------|
| 01 | Web | Waitlist signup |
| 02 | Web | OAuth activation |
| 03 | Web | API key generation |
| 05 | Extension | First run wizard |
| 06 | Extension | First protected save |
| 07 | Extension | First AI detection |
| 10 | Extension | First recovery |

### P1 - Core Value (Complete for launch)
| Journey | Surface | Description |
|---------|---------|-------------|
| 04 | Web | Dashboard metrics view |
| 08 | MCP | analyze_risk (basic) |
| 09 | MCP | checkpoints (pro) |
| 11 | Extension | Snapshot creation |
| 12 | Extension | Session management |
| 14 | CLI | snapshot command |
| 15 | CLI | restore command |

### P2 - Full Platform (Complete for GA)
| Journey | Surface | Description |
|---------|---------|-------------|
| 13 | CLI | init command |
| 16 | CLI | status command |
| 17 | CLI | scan command |
| 18 | Web | Settings management |
| 19 | MCP | check_dependencies |
| 20 | MCP | Context7 integration |

---

# JOURNEY KITS

---

## 01 - Waitlist Signup

### SPEC.md
```markdown
# Journey: Waitlist Signup

## User Story
As a developer who discovered SnapBack,
I can join the waitlist with my email
so that I get notified when access is available.

## Actors
- Visitor (unauthenticated)
- Marketing Site
- API Backend
- Email Service (Resend)

## Flow
1. User lands on snapback.dev
2. Scrolls to waitlist CTA or clicks "Join Waitlist"
3. Enters email in waitlist form
4. Form validates email format
5. Submit triggers API call
6. Backend creates waitlist entry
7. Backend triggers welcome email
8. UI shows success state with position number
9. Event tracked: `waitlist_joined`

## Constraints
- Email must be valid format
- Duplicate emails return existing position (no error)
- Rate limit: 10 submissions per IP per hour
- Email sent within 5 minutes
```

### SCOPE.md
```markdown
# Scope: Waitlist Signup

## Files to CREATE
- apps/web/app/(marketing)/waitlist/actions.test.ts
- apps/web/test/e2e/waitlist-signup.spec.ts

## Files to MODIFY
- apps/web/app/(marketing)/waitlist/actions.ts
- apps/web/app/(marketing)/components/waitlist-form.tsx
- packages/api/modules/waitlist/procedures/join-waitlist.ts

## Files to READ (context only)
- packages/platform/src/db/schema/snapback/waitlist.ts
- packages/contracts/generated/infrastructure-events.ts
- apps/web/modules/shared/lib/orpc-client.ts

## Files OFF-LIMITS
- Everything else
```

### DEPENDENCIES.md
```markdown
# Dependencies: Waitlist Signup

## Must be complete
- F0.4 Analytics consolidation (PostHog event tracking)
- Database migrations applied (waitlist table exists)

## Parallel-safe with
- All other journeys (no shared write files)
```

### ACCEPTANCE.md
```markdown
# Acceptance: Waitlist Signup

## Automated
- [ ] `pnpm test apps/web/app/(marketing)/waitlist/actions.test.ts` passes
- [ ] `pnpm test:e2e apps/web/test/e2e/waitlist-signup.spec.ts` passes
- [ ] `pnpm typecheck` clean
- [ ] `pnpm lint` clean

## Manual
- [ ] Visit snapback.dev → Enter email → Success message with position
- [ ] Re-submit same email → Shows existing position (no duplicate)
- [ ] Submit 11 times from same IP → Rate limit error
- [ ] Check Resend dashboard → Welcome email sent

## Integration
- [ ] Check PostgreSQL waitlist table → Row created
- [ ] Check PostHog → `waitlist_joined` event received
```

### CONTEXT.md
```markdown
# Context: Waitlist Signup

## From: database-schema-analysis.md
Waitlist table schema:
- id, email, status, position, referral_code, created_at
- Status: 'pending' | 'invited' | 'converted'

## From: event-cataloging.md
Infrastructure event: `auth_signup_completed` (track after waitlist→signup)

## From: requirements-matrix.md
"Auth-gated waitlist/onboarding" - status: implemented
Evidence: packages/platform/src/db/schema/snapback/waitlist.ts
```

### tests/cases.md
```markdown
# Test Cases: Waitlist Signup

## Happy Path
1. Valid email submission → 201 status, position returned
2. Email format validation passes → Form submits
3. Welcome email triggered → Resend API called

## Sad Path
4. Invalid email format → 400 error, form shows validation message
5. Rate limit exceeded → 429 error, retry-after header

## Edge Cases
6. Duplicate email → 200 status, existing position returned
7. Email with plus addressing (test+1@example.com) → Accepted
8. Very long email (254 chars) → Accepted
9. Unicode email (тест@example.com) → Rejected

## Error Path
10. Database unavailable → 503 error, graceful fallback message
11. Resend API failure → Entry created, email queued for retry
```

---

## 02 - OAuth Activation

### SPEC.md
```markdown
# Journey: OAuth Activation

## User Story
As a waitlisted user who received an invite,
I can sign up with GitHub or Google
so that I can access the dashboard.

## Actors
- Invited User
- Web Portal
- Better Auth
- GitHub/Google OAuth
- PostgreSQL

## Flow
1. User clicks invite link from email
2. Lands on /auth/signup with invite token
3. Sees "Sign in with GitHub" and "Sign in with Google"
4. Clicks GitHub (primary CTA)
5. Redirects to GitHub OAuth consent
6. User authorizes SnapBack
7. GitHub redirects to /api/auth/callback/github
8. Better Auth creates session + user record
9. Sets httpOnly session cookie
10. Redirects to /app/dashboard
11. Event tracked: `auth_signup_completed`

## Constraints
- Invite token required for signup (no open registration)
- Session cookie: httpOnly, secure, SameSite=Strict
- 7-day session expiry with refresh
```

### SCOPE.md
```markdown
# Scope: OAuth Activation

## Files to CREATE
- apps/web/test/integration/oauth-flow.test.ts
- apps/web/test/e2e/oauth-signup.spec.ts

## Files to MODIFY
- apps/web/app/auth/signup/page.tsx
- packages/auth/src/index.ts
- packages/auth/src/auth-config.ts

## Files to READ (context only)
- packages/platform/src/db/schema/postgres.ts (user table)
- apps/web/app/api/auth/[...all]/route.ts

## Files OFF-LIMITS
- Everything else
```

### DEPENDENCIES.md
```markdown
# Dependencies: OAuth Activation

## Must be complete
- 01-waitlist-signup (invite flow)
- Better Auth configuration
- GitHub/Google OAuth apps configured

## Parallel-safe with
- 05-extension-install (different surface)
- 08-mcp-analyze-risk (different surface)
```

### ACCEPTANCE.md
```markdown
# Acceptance: OAuth Activation

## Automated
- [ ] `pnpm test packages/auth` passes
- [ ] `pnpm test:e2e apps/web/test/e2e/oauth-signup.spec.ts` passes

## Manual
- [ ] Click GitHub signup → Authorize → Lands on dashboard
- [ ] Click Google signup → Authorize → Lands on dashboard
- [ ] Session persists after browser restart (7 days)
- [ ] Invalid invite token → Redirects to waitlist

## Integration
- [ ] PostgreSQL user table → New user row created
- [ ] PostgreSQL session table → Active session
- [ ] PostHog → `auth_signup_completed` event
```

### tests/cases.md
```markdown
# Test Cases: OAuth Activation

## Happy Path
1. GitHub OAuth flow completes → User created, session set
2. Google OAuth flow completes → User created, session set
3. Existing user re-authenticates → Session refreshed

## Sad Path
4. User denies OAuth consent → Error message, retry option
5. Invalid invite token → Redirect to waitlist page
6. Expired invite token → Error message with contact support

## Edge Cases
7. OAuth returns without email → Request email separately
8. User switches OAuth provider → Links to existing account
9. Session expires mid-flow → Restart OAuth flow

## Error Path
10. GitHub API unavailable → Graceful error with retry
11. Database write fails → Transaction rollback, error message
```

---

## 03 - API Key Generation

### SPEC.md
```markdown
# Journey: API Key Generation

## User Story
As an authenticated Pro user,
I can create an API key from the dashboard
so that I can authenticate CLI/MCP/Extension.

## Actors
- Authenticated User (Pro+ tier)
- Web Dashboard
- API Backend
- PostgreSQL

## Flow
1. User navigates to /app/api-keys
2. Clicks "Create API Key" button
3. Modal opens with name input field
4. User enters key name (e.g., "Development Machine")
5. Clicks "Create" button
6. Server action validates session + tier
7. Server calls ORPC apiKeys.create procedure
8. Backend generates key: sk_live_{32_random_chars}
9. Backend stores hash (SHA-256) in database
10. Returns: { key, id, prefix: "sk_live_xxx" }
11. UI shows key ONCE with copy button
12. User copies key, modal closes
13. Event tracked: `dashboard_api_key_created`

## Constraints
- Free tier: Rejected with upgrade prompt
- Key shown ONCE, never retrievable after modal close
- Name: 1-50 characters, alphanumeric + dash + underscore
- Max 5 keys per user (Pro), 10 (Team), 20 (Enterprise)
- Key prefix visible in list: sk_live_xxx...
```

### SCOPE.md
```markdown
# Scope: API Key Generation

## Files to CREATE
- apps/web/app/(saas)/app/api-keys/actions.test.ts
- apps/web/test/e2e/api-key-lifecycle.spec.ts

## Files to MODIFY
- apps/web/app/(saas)/app/api-keys/actions.ts
- apps/web/app/(saas)/app/api-keys/components/create-key-modal.tsx
- packages/api/modules/apikeys/procedures/create-api-key.ts

## Files to READ (context only)
- packages/platform/src/db/schema/postgres.ts (api_keys table)
- packages/auth/src/index.ts (session validation)
- apps/web/hooks/use-api-keys.ts

## Files OFF-LIMITS
- Everything else
```

### DEPENDENCIES.md
```markdown
# Dependencies: API Key Generation

## Must be complete
- 02-oauth-activation (user must be authenticated)
- Tier system implemented (free/pro/team/enterprise)

## Parallel-safe with
- 04-dashboard-metrics (different component)
- 14-cli-snapshot (different surface)

## Blocks
- 08-mcp-analyze-risk (needs API key)
- 09-mcp-checkpoints (needs API key)
- 05-extension-install (needs extension grant endpoint)
```

### ACCEPTANCE.md
```markdown
# Acceptance: API Key Generation

## Automated
- [ ] `pnpm test apps/web/app/(saas)/app/api-keys/actions.test.ts` passes
- [ ] `pnpm test:e2e apps/web/test/e2e/api-key-lifecycle.spec.ts` passes
- [ ] `pnpm typecheck` clean

## Manual
- [ ] Login as Pro user → Create key → Key displayed once
- [ ] Login as Free user → Create key → Upgrade prompt shown
- [ ] Create 6th key (Pro) → "Limit reached" error
- [ ] Copy key → Paste works → Format: sk_live_{32chars}

## Integration
- [ ] PostgreSQL api_keys table → Row with hashed key
- [ ] Use key in Authorization header → API accepts
- [ ] PostHog → `dashboard_api_key_created` event
```

### tests/cases.md
```markdown
# Test Cases: API Key Generation

## Happy Path
1. Pro user creates key → Key returned with id and prefix
2. Key format valid → sk_live_ + 32 alphanumeric chars
3. Key hash stored → SHA-256 hash in database

## Sad Path
4. Free user attempts → 403 with upgrade URL
5. Empty name → 400 validation error
6. Name too long (>50) → 400 validation error
7. Duplicate name → 400 with "name exists" message

## Edge Cases
8. Create at limit → 403 with "limit reached" message
9. Unicode name → Rejected (alphanumeric only)
10. Concurrent creation → Both succeed with unique IDs

## Error Path
11. Database unavailable → 503 with retry suggestion
12. Session expired mid-creation → 401 redirect to login
```

---

## 04 - Dashboard Metrics View

### SPEC.md
```markdown
# Journey: Dashboard Metrics View

## User Story
As an authenticated user,
I can see my protection metrics on the dashboard
so that I understand SnapBack's value.

## Actors
- Authenticated User
- Web Dashboard
- API Backend
- PostgreSQL

## Flow
1. User logs in and lands on /app/dashboard
2. Dashboard fetches metrics via ORPC
3. MetricsGrid displays:
   - Total snapshots (with camera icon)
   - Total recoveries (with activity icon)
   - Files protected (with file check icon)
   - AI detection rate (with sparkles icon)
4. AIDetectionStats shows breakdown by tool
5. ActivityFeed shows recent events
6. Data refreshes every 60 seconds
7. Event tracked: `dashboard_viewed`

## Constraints
- Data scoped to authenticated user only
- 60-second stale time for caching
- Skeleton loaders during fetch
- Graceful empty states for new users
```

### SCOPE.md
```markdown
# Scope: Dashboard Metrics View

## Files to CREATE
- apps/web/modules/saas/dashboard/components/MetricsGrid.test.tsx
- apps/web/modules/saas/dashboard/components/ActivityFeed.test.tsx

## Files to MODIFY
- apps/web/modules/saas/dashboard/components/MetricsGrid.tsx
- apps/web/modules/saas/dashboard/components/ActivityFeed.tsx
- apps/web/hooks/use-dashboard-metrics.ts
- packages/api/modules/dashboard/procedures/get-metrics.ts

## Files to READ (context only)
- packages/platform/src/db/schema/snapback/snapshots.ts
- packages/platform/src/db/schema/snapback/telemetry-events.ts

## Files OFF-LIMITS
- Everything else
```

### DEPENDENCIES.md
```markdown
# Dependencies: Dashboard Metrics View

## Must be complete
- 02-oauth-activation (authentication required)
- Database tables: snapshots, telemetry_events

## Parallel-safe with
- 03-api-key-generation
- 05-extension-install
```

### ACCEPTANCE.md
```markdown
# Acceptance: Dashboard Metrics View

## Automated
- [ ] `pnpm test apps/web/modules/saas/dashboard` passes
- [ ] `pnpm typecheck` clean

## Manual
- [ ] New user sees all zeros with proper empty states
- [ ] User with data sees accurate counts
- [ ] Skeleton loaders visible during fetch
- [ ] Data refreshes when leaving/returning to tab

## Integration
- [ ] API returns correct aggregated data
- [ ] PostHog → `dashboard_viewed` event
```

---

## 05 - Extension Install + First Run

### SPEC.md
```markdown
# Journey: Extension Install + First Run

## User Story
As a user who installed the VS Code extension,
I experience a seamless welcome that gets me protected immediately
so that I understand value without configuration.

## Actors
- User
- VS Code Extension
- Welcome Webview

## Flow
1. User installs extension from Marketplace
2. Extension activates (onStartupFinished)
3. Welcome webview opens automatically
4. Single screen shows:
   - "You're protected" message
   - Status: "Watching for changes..."
   - Optional: "Connect account" link
5. User can close welcome or connect account
6. If connect: Opens browser to /auth/extension-grant
7. User authorizes in browser
8. Extension polls for grant approval
9. Extension receives API key, stores securely
10. Status updates: "Connected to {email}"
11. Events tracked: `extension_installed`, `extension_activated`

## Constraints
- Extension works WITHOUT auth (local-only mode)
- No blocking modals - user can close welcome anytime
- Activation time: <500ms
- Welcome webview: Single screen, not wizard
```

### SCOPE.md
```markdown
# Scope: Extension Install + First Run

## Files to CREATE
- apps/vscode/test/unit/welcome/welcome-panel.test.ts
- apps/vscode/test/integration/first-run.test.ts

## Files to MODIFY
- apps/vscode/src/welcomeView.ts
- apps/vscode/src/extension.ts
- apps/vscode/src/auth/OAuthHandler.ts

## Files to READ (context only)
- apps/vscode/src/telemetry.ts
- apps/vscode/src/storage/StorageManager.ts
- packages/contracts/src/telemetry/events.ts

## Files OFF-LIMITS
- Everything else
```

### DEPENDENCIES.md
```markdown
# Dependencies: Extension Install + First Run

## Must be complete
- F0.2 Bundle size optimization (<2MB)
- F0.3 Token validation middleware (for grant endpoint)

## Parallel-safe with
- 01-waitlist-signup (different surface)
- 04-dashboard-metrics (different surface)

## Blocks
- 06-first-protected-save (needs extension activated)
- 07-first-ai-detection (needs extension activated)
```

### ACCEPTANCE.md
```markdown
# Acceptance: Extension Install + First Run

## Automated
- [ ] `pnpm test apps/vscode/test/unit/welcome` passes
- [ ] Extension activation time <500ms (performance test)
- [ ] Bundle size <2MB (CI check)

## Manual
- [ ] Install extension → Welcome opens automatically
- [ ] Close welcome → Extension still protects files
- [ ] Click connect → Browser opens grant page
- [ ] Authorize in browser → Extension shows connected

## Integration
- [ ] PostHog → `extension_installed` event
- [ ] PostHog → `extension_activated` event
```

---

## 06 - First Protected Save

### SPEC.md
```markdown
# Journey: First Protected Save

## User Story
As a new extension user,
when I save a file for the first time,
I see confirmation that SnapBack is working.

## Actors
- User
- VS Code Extension
- SaveHandler
- SnapshotManager

## Flow
1. User opens a file in VS Code
2. Makes any edit
3. Saves file (Cmd+S)
4. SaveHandler intercepts save
5. AutoDecisionEngine evaluates:
   - Protection level (from config or auto)
   - AI detection signals
   - Burst detection
6. If snapshot needed:
   - SnapshotManager creates snapshot
   - Content stored in BlobStore
7. Success toast: "✓ Snapshot created"
8. Status bar updates: "$(shield) 1 checkpoint"
9. Event tracked: `first_protected_save`

## Constraints
- Save handler: <50ms without snapshot, <100ms with
- No blocking dialogs - toast only
- Works offline (local storage only)
- First save always creates snapshot
```

### SCOPE.md
```markdown
# Scope: First Protected Save

## Files to CREATE
- apps/vscode/test/unit/handlers/save-handler.test.ts
- apps/vscode/test/integration/first-save.test.ts

## Files to MODIFY
- apps/vscode/src/handlers/SaveHandler.ts
- apps/vscode/src/snapshot/SnapshotManager.ts
- apps/vscode/src/notificationManager.ts

## Files to READ (context only)
- apps/vscode/src/storage/SnapshotStore.ts
- apps/vscode/src/storage/BlobStore.ts
- apps/vscode/src/decision/AutoDecisionEngine.ts

## Files OFF-LIMITS
- Everything else
```

### DEPENDENCIES.md
```markdown
# Dependencies: First Protected Save

## Must be complete
- 05-extension-install (extension must be active)
- Storage system implemented (BlobStore, SnapshotStore)

## Parallel-safe with
- 03-api-key-generation (different surface)
- 08-mcp-analyze-risk (different surface)

## Blocks
- 07-first-ai-detection (needs save flow working)
- 10-first-recovery (needs snapshots to exist)
```

### ACCEPTANCE.md
```markdown
# Acceptance: First Protected Save

## Automated
- [ ] `pnpm test apps/vscode/test/unit/handlers/save-handler.test.ts` passes
- [ ] Save handler latency <100ms with snapshot

## Manual
- [ ] Open file → Edit → Save → Toast appears
- [ ] Check ~/.config/Code/.../snapshots/ → Snapshot file exists
- [ ] Status bar shows checkpoint count

## Integration
- [ ] PostHog → `first_protected_save` event
- [ ] PostHog → `snapshot_created` event
```

---

## 07 - First AI Detection

### SPEC.md
```markdown
# Journey: First AI Detection

## User Story
As a user making AI-assisted changes,
I see SnapBack detecting and protecting against AI edits
so that I trust the automatic protection.

## Actors
- User
- AI Tool (Cursor/Copilot/Claude)
- VS Code Extension
- AIDetector
- SignalAggregator

## Flow
1. User accepts AI suggestion or uses AI compose
2. File changes detected by extension
3. AIDetector analyzes:
   - Pattern matching (basic - local)
   - Burst detection (rapid changes)
   - Semantic analysis (if connected to API)
4. AI detected with confidence score
5. SignalAggregator combines signals
6. Notification: "🤖 Detected {tool} edit"
7. Auto-snapshot created before changes
8. Event tracked: `first_ai_detection`

## Constraints
- Basic detection works offline (pattern matching)
- Advanced detection requires API (Pro tier)
- No false positives on small typos
- Confidence threshold: 70%+ to trigger
```

### SCOPE.md
```markdown
# Scope: First AI Detection

## Files to CREATE
- apps/vscode/test/unit/detection/ai-detector.test.ts
- apps/vscode/test/unit/detection/burst-detector.test.ts

## Files to MODIFY
- apps/vscode/src/detection/AIDetector.ts
- apps/vscode/src/detection/BurstDetector.ts
- apps/vscode/src/signals/SignalAggregator.ts

## Files to READ (context only)
- packages/core/src/detection/patterns.ts
- apps/vscode/src/decision/AutoDecisionEngine.ts

## Files OFF-LIMITS
- Everything else
```

### DEPENDENCIES.md
```markdown
# Dependencies: First AI Detection

## Must be complete
- 06-first-protected-save (save flow must work)
- Detection patterns defined

## Parallel-safe with
- 03-api-key-generation (different surface)
- 14-cli-snapshot (different surface)
```

### ACCEPTANCE.md
```markdown
# Acceptance: First AI Detection

## Automated
- [ ] `pnpm test apps/vscode/test/unit/detection` passes
- [ ] Pattern matching tests pass for Cursor, Copilot, Claude

## Manual
- [ ] Use Cursor to accept suggestion → Detection notification
- [ ] Use Copilot inline completion → Detection notification
- [ ] Make small manual edit → No false positive

## Integration
- [ ] PostHog → `first_ai_detection` event with tool property
```

---

## 08 - MCP analyze_risk (Basic)

### SPEC.md
```markdown
# Journey: MCP analyze_risk (Basic)

## User Story
As an AI assistant (Cursor/Claude),
I can call snapback.analyze_risk to assess code changes
so that I can warn users about risky modifications.

## Actors
- AI Assistant
- MCP Server
- Risk Analyzer (local)

## Flow
1. AI sends tool call: snapback.analyze_risk
2. MCP server validates input schema
3. No auth required for basic tier
4. Local analyzer evaluates:
   - Syntax patterns
   - Semantic changes
   - File type risks
5. Returns: { riskLevel, issues, recommendations }
6. AI presents findings to user
7. Event tracked: `ai_risk_detected`

## Constraints
- Free tier: Local analysis only
- Response time: <200ms
- No code sent to server (local execution)
```

### SCOPE.md
```markdown
# Scope: MCP analyze_risk (Basic)

## Files to CREATE
- apps/mcp-server/test/unit/tools/analyze-risk.test.ts
- apps/mcp-server/test/integration/analyze-risk.test.ts

## Files to MODIFY
- apps/mcp-server/src/tools/analyze-risk.ts
- apps/mcp-server/src/analysis/LocalAnalyzer.ts

## Files to READ (context only)
- apps/mcp-server/src/index.ts
- packages/contracts/src/mcp/tool-schemas.ts

## Files OFF-LIMITS
- Everything else
```

### DEPENDENCIES.md
```markdown
# Dependencies: MCP analyze_risk (Basic)

## Must be complete
- MCP server infrastructure (STDIO transport)
- Tool registration system

## Parallel-safe with
- All extension journeys
- All web journeys
- All CLI journeys
```

### ACCEPTANCE.md
```markdown
# Acceptance: MCP analyze_risk (Basic)

## Automated
- [ ] `pnpm test apps/mcp-server/test/unit/tools/analyze-risk.test.ts` passes
- [ ] Response time <200ms

## Manual
- [ ] Call tool via MCP inspector → Valid response
- [ ] Works without API key (free tier)

## Integration
- [ ] Works with Cursor MCP integration
```

---

## 09 - MCP Checkpoints (Pro)

### SPEC.md
```markdown
# Journey: MCP Checkpoints (Pro)

## User Story
As an AI assistant with Pro access,
I can create, list, and restore checkpoints
so that I can provide robust protection during AI sessions.

## Actors
- AI Assistant
- MCP Server
- Extension (via IPC)
- BlobStore

## Tools
- snapback.create_checkpoint
- snapback.list_checkpoints
- snapback.restore_checkpoint

## Flow (create_checkpoint)
1. AI sends tool call: snapback.create_checkpoint
2. MCP validates API key (must be Pro tier)
3. MCP sends request to Extension via local IPC
4. Extension creates snapshot with provided files
5. Returns: { checkpointId, filesCount, totalSize }

## Flow (restore_checkpoint)
1. AI sends tool call with dryRun: true
2. Returns files that would be restored
3. AI confirms with user
4. AI sends tool call with dryRun: false
5. Extension restores files
6. Returns: { success, filesRestored }

## Constraints
- Pro tier required (403 for free)
- Max 50 files per checkpoint
- dryRun default: true (safe by default)
```

### SCOPE.md
```markdown
# Scope: MCP Checkpoints (Pro)

## Files to CREATE
- apps/mcp-server/test/unit/tools/checkpoints.test.ts
- apps/mcp-server/test/integration/checkpoint-lifecycle.test.ts

## Files to MODIFY
- apps/mcp-server/src/tools/create-checkpoint.ts
- apps/mcp-server/src/tools/list-checkpoints.ts
- apps/mcp-server/src/tools/restore-checkpoint.ts
- apps/mcp-server/src/auth.ts

## Files to READ (context only)
- packages/contracts/src/mcp/tool-schemas.ts
- apps/vscode/src/snapshot/SnapshotManager.ts

## Files OFF-LIMITS
- Everything else
```

### DEPENDENCIES.md
```markdown
# Dependencies: MCP Checkpoints (Pro)

## Must be complete
- 03-api-key-generation (Pro key needed)
- 08-mcp-analyze-risk (MCP infrastructure)
- Extension snapshot system

## Parallel-safe with
- Web dashboard journeys
- CLI journeys
```

### ACCEPTANCE.md
```markdown
# Acceptance: MCP Checkpoints (Pro)

## Automated
- [ ] `pnpm test apps/mcp-server/test/unit/tools/checkpoints.test.ts` passes
- [ ] Pro tier check enforced (free key → 403)

## Manual
- [ ] Create checkpoint → ID returned
- [ ] List checkpoints → Array with created checkpoint
- [ ] Restore with dryRun: true → Preview shown
- [ ] Restore with dryRun: false → Files restored

## Integration
- [ ] Checkpoint visible in Extension sidebar
- [ ] CLI can list MCP-created checkpoints
```

---

## 10 - First Recovery

### SPEC.md
```markdown
# Journey: First Recovery

## User Story
As a user who made a mistake or wants to undo AI changes,
I can restore from a snapshot
so that I recover my previous code state.

## Actors
- User
- VS Code Extension
- SnapshotStore
- Recovery UI

## Flow
1. User triggers restore:
   - Command palette: "SnapBack: Restore"
   - Status bar click
   - Sidebar snapshot click
2. QuickPick shows recent snapshots
3. User selects snapshot
4. Confirmation dialog: "Restore X files?"
5. User confirms
6. SnapshotManager restores files:
   - Read content from BlobStore
   - Write to filesystem
7. Success notification: "🎉 Recovered {lines} lines"
8. Optional: Share dialog
9. Event tracked: `first_recovery_used`

## Constraints
- Multi-file restore supported
- Confirmation required (no accidental restores)
- Undo available (creates new snapshot before restore)
```

### SCOPE.md
```markdown
# Scope: First Recovery

## Files to CREATE
- apps/vscode/test/unit/restore/restore-manager.test.ts
- apps/vscode/test/integration/restore-flow.test.ts

## Files to MODIFY
- apps/vscode/src/restore/RestoreManager.ts
- apps/vscode/src/commands/restoreCommands.ts
- apps/vscode/src/views/SnapshotTreeView.ts

## Files to READ (context only)
- apps/vscode/src/storage/SnapshotStore.ts
- apps/vscode/src/storage/BlobStore.ts

## Files OFF-LIMITS
- Everything else
```

### DEPENDENCIES.md
```markdown
# Dependencies: First Recovery

## Must be complete
- 06-first-protected-save (snapshots must exist)
- SnapshotStore implementation

## Parallel-safe with
- All web journeys
- All MCP journeys
```

### ACCEPTANCE.md
```markdown
# Acceptance: First Recovery

## Automated
- [ ] `pnpm test apps/vscode/test/unit/restore` passes

## Manual
- [ ] Command palette → Select snapshot → Files restored
- [ ] Sidebar → Click snapshot → Files restored
- [ ] Cancel confirmation → Nothing changes
- [ ] Success celebration message shown

## Integration
- [ ] PostHog → `first_recovery_used` event
- [ ] Audit log entry created
```

---

## 11 - Snapshot Creation

### SPEC.md
```markdown
# Journey: Snapshot Creation

## User Story
As a developer making changes,
snapshots are created automatically
so that I always have recovery points.

## Actors
- User
- VS Code Extension
- SnapshotOrchestrator
- BlobStore

## Triggers
- File save (if protection level triggers)
- AI detection (automatic pre-save)
- Manual command
- Session boundary

## Flow
1. Trigger occurs
2. SnapshotOrchestrator evaluates:
   - Rate limiter (prevent spam)
   - Deduplication (skip unchanged)
   - Session association
3. If snapshot needed:
   - Read file content
   - Hash content (SHA-256)
   - Check BlobStore for existing hash
   - Store blob if new (content-addressable)
   - Create snapshot manifest
4. Update session with snapshot reference
5. Event tracked: `snapshot_created`

## Constraints
- Rate limit: Max 1 snapshot per file per 5 seconds
- Deduplication: Skip if content hash matches last
- Max file size: 10MB per file
- Latency budget: <100ms
```

### SCOPE.md
```markdown
# Scope: Snapshot Creation

## Files to CREATE
- apps/vscode/test/unit/snapshot/orchestrator.test.ts
- apps/vscode/test/performance/snapshot-latency.test.ts

## Files to MODIFY
- apps/vscode/src/snapshot/SnapshotOrchestrator.ts
- apps/vscode/src/snapshot/RateLimiter.ts
- apps/vscode/src/storage/BlobStore.ts

## Files to READ (context only)
- snapback-storage-implementation-guide.md

## Files OFF-LIMITS
- Everything else
```

---

## 12 - Session Management

### SPEC.md
```markdown
# Journey: Session Management

## User Story
As a developer working on a feature,
my related changes are grouped into sessions
so that I can restore logical units of work.

## Actors
- User
- VS Code Extension
- SessionStore
- (Pro) DBSCAN API

## Flow
1. Extension detects activity start
2. SessionStore.startSession() called
3. Files tracked as session progresses:
   - Each snapshot tagged with session ID
   - File change stats accumulated
4. Session ends when:
   - Idle timeout (5 minutes default)
   - Manual finalization
   - Window close
5. SessionStore.finalizeSession() called
6. (Pro) DBSCAN groups related changes
7. Session manifest written
8. Event tracked: `session_finalized`

## Constraints
- Idle timeout: Configurable (default 5 min)
- Max session duration: 4 hours
- Session summary generation
```

### SCOPE.md
```markdown
# Scope: Session Management

## Files to CREATE
- apps/vscode/test/unit/session/session-store.test.ts

## Files to MODIFY
- apps/vscode/src/storage/SessionStore.ts
- apps/vscode/src/session/SessionCoordinator.ts

## Files to READ (context only)
- snapback-storage-implementation-guide.md

## Files OFF-LIMITS
- Everything else
```

---

## 13 - CLI init

### SPEC.md
```markdown
# Journey: CLI init

## User Story
As a developer setting up SnapBack in a project,
I can run `snapback init` to configure my workspace
so that protection is ready to use.

## Actors
- Developer
- CLI
- Filesystem

## Flow
1. Developer runs: snapback init
2. CLI checks for existing .snapbackrc
3. If exists: prompt to overwrite
4. Interactive prompts:
   - Protection level default
   - Ignored patterns
   - Cloud backup (Pro)
5. Creates .snapbackrc file
6. Creates .snapbackignore if needed
7. Adds .snapback/ to .gitignore
8. Success message with next steps

## Constraints
- Non-destructive by default
- Works offline
- Respects existing gitignore
```

### SCOPE.md
```markdown
# Scope: CLI init

## Files to CREATE
- apps/cli/test/commands/init.test.ts

## Files to MODIFY
- apps/cli/src/commands/init.ts
- apps/cli/src/templates/snapbackrc.ts

## Files to READ (context only)
- packages/config/src/schema.ts

## Files OFF-LIMITS
- Everything else
```

---

## 14 - CLI snapshot

### SPEC.md
```markdown
# Journey: CLI snapshot

## User Story
As a developer in terminal,
I can run `snapback snapshot` to create a manual checkpoint
so that I have a recovery point before risky operations.

## Actors
- Developer
- CLI
- SDK Client
- BlobStore (local)

## Flow
1. Developer runs: snapback snapshot -m "Before refactor"
2. CLI loads config from .snapbackrc
3. CLI collects files (respecting .snapbackignore)
4. Creates snapshot via SDK
5. Stores in local .snapback/ directory
6. Outputs: Created snapshot snap-{timestamp}-{id}
7. Event tracked: `cli_snapshot_created`

## Constraints
- Works offline (local storage)
- Respects .snapbackignore patterns
- Max 1000 files per snapshot
```

### SCOPE.md
```markdown
# Scope: CLI snapshot

## Files to CREATE
- apps/cli/test/commands/snapshot.test.ts

## Files to MODIFY
- apps/cli/src/commands/snapshot.ts
- packages/sdk/src/snapshot.ts

## Files to READ (context only)
- apps/cli/src/utils/config-loader.ts

## Files OFF-LIMITS
- Everything else
```

---

## 15 - CLI restore

### SPEC.md
```markdown
# Journey: CLI restore

## User Story
As a developer who needs to undo changes,
I can run `snapback restore` to recover previous state
so that I fix mistakes quickly.

## Actors
- Developer
- CLI
- SDK Client
- BlobStore

## Flow
1. Developer runs: snapback restore
2. CLI shows recent snapshots (interactive picker)
3. Developer selects snapshot
4. CLI shows files that will be restored
5. Confirmation prompt
6. CLI restores files via SDK
7. Outputs: Restored {n} files from snapshot {id}

## Constraints
- Confirmation required (--yes to skip)
- Creates backup snapshot before restore
- Works offline
```

### SCOPE.md
```markdown
# Scope: CLI restore

## Files to CREATE
- apps/cli/test/commands/restore.test.ts

## Files to MODIFY
- apps/cli/src/commands/restore.ts
- packages/sdk/src/restore.ts

## Files to READ (context only)
- packages/sdk/src/snapshot.ts

## Files OFF-LIMITS
- Everything else
```

---

## 16 - CLI status

### SPEC.md
```markdown
# Journey: CLI status

## User Story
As a developer,
I can run `snapback status` to see protection state
so that I know what's being tracked.

## Actors
- Developer
- CLI
- Config

## Flow
1. Developer runs: snapback status
2. CLI displays:
   - Protection mode (active/inactive)
   - Files being watched
   - Recent snapshots (last 5)
   - Storage usage
   - Connected account (if any)
3. Optional: --json for machine-readable output

## Constraints
- Works offline
- Fast execution (<500ms)
```

---

## 17 - CLI scan

### SPEC.md
```markdown
# Journey: CLI scan (CI/CD)

## User Story
As a CI/CD pipeline,
I can run `snapback scan` to validate changes
so that risky code doesn't reach production.

## Actors
- CI/CD Pipeline
- CLI
- API Backend (Pro)

## Flow
1. Pipeline runs: snapback scan --fail-on high
2. CLI collects changed files (git diff)
3. Sends to API for analysis (Pro) or local (Free)
4. Returns issues with severity
5. Exit code 1 if severity >= threshold
6. Optional: --format sarif for GitHub Security

## Constraints
- Pro tier for full rule set
- Free tier: Open rules only
- SARIF output for GitHub integration
```

---

## 18 - Web Settings Management

### SPEC.md
```markdown
# Journey: Web Settings Management

## User Story
As a user,
I can manage my account settings
so that I customize my experience.

## Sections
- Profile (name, email, avatar)
- Notifications (email preferences)
- Billing (subscription, usage)
- Team (Pro+ only)

## Flow
1. User navigates to /app/settings
2. Tabs for each section
3. Changes auto-save or submit button
4. Success toast on save
```

---

## 19 - MCP check_dependencies

### SPEC.md
```markdown
# Journey: MCP check_dependencies

## User Story
As an AI assistant,
I can check dependency changes for risks
so that I warn about problematic updates.

## Flow
1. AI sends: snapback.check_dependencies
2. Input: package.json content (before/after)
3. Analyzes:
   - New dependencies
   - Version changes
   - Known vulnerabilities
4. Returns: { issues: [], recommendations: [] }

## Constraints
- Free tier tool
- Works offline (local analysis)
- No network calls to npm registry
```

---

## 20 - MCP Context7 Integration

### SPEC.md
```markdown
# Journey: MCP Context7 Integration

## User Story
As an AI assistant,
I can fetch up-to-date library documentation
so that I provide accurate code suggestions.

## Tools
- ctx7.resolve-library-id
- ctx7.get-library-docs

## Flow
1. AI needs docs for library
2. Calls resolve-library-id("react")
3. Returns: { libraryId: "ctx7/react" }
4. Calls get-library-docs(libraryId)
5. Returns: { docs: "..." }

## Constraints
- Free tier
- Cached for 1 hour
- Retry with exponential backoff
```

---

# Parallel Execution Plan

## Week 1: Foundation + P0 Journeys

```
Agent 1: 01-waitlist-signup, 02-oauth-activation
Agent 2: 05-extension-install, 06-first-protected-save
Agent 3: 03-api-key-generation, 04-dashboard-metrics
Agent 4: 08-mcp-analyze-risk (no dependencies)
```

## Week 2: P0 Complete + P1 Start

```
Agent 1: 07-first-ai-detection, 10-first-recovery
Agent 2: 11-snapshot-creation, 12-session-management
Agent 3: 09-mcp-checkpoints
Agent 4: 14-cli-snapshot, 15-cli-restore
```

## Week 3: P1 Complete + P2 Start

```
Agent 1: 13-cli-init, 16-cli-status, 17-cli-scan
Agent 2: 18-web-settings
Agent 3: 19-mcp-check-dependencies, 20-mcp-context7
Agent 4: Integration testing across surfaces
```

---

# Coordination Files

## LOCK.md Template
```markdown
# Currently Locked Files

| File | Owner | Journey | Expires |
|------|-------|---------|---------|
| apps/web/app/(marketing)/waitlist/actions.ts | agent-1 | 01 | 2024-12-08T10:00Z |
```

## DONE.md Template
```markdown
# Completed Journeys

| Journey | Completed | Agent | Notes |
|---------|-----------|-------|-------|
| 01-waitlist-signup | 2024-12-07 | agent-1 | All tests passing |
```

## BLOCKED.md Template
```markdown
# Blocked Journeys

| Journey | Blocker | Owner | ETA |
|---------|---------|-------|-----|
| 09-mcp-checkpoints | Waiting on 03-api-key-generation | agent-3 | 2024-12-08 |
```
