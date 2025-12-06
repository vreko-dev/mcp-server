# SnapBack: Definitive Implementation Guide

**Version**: 2.0 | **Status**: Canonical Build Document | **Last Updated**: December 2025

---

## Vision

**One sentence**: SnapBack is the safety net for AI-assisted development—automatic checkpoints that let developers code fearlessly with AI, knowing they can always snap back.

**User story**: "I was pair-programming with Claude. It refactored 12 files. Something broke. I hit restore, picked the checkpoint from 3 minutes ago, and I was back. Took 5 seconds."

**Core promise**: Sub-100ms checkpoints. Zero configuration. Works everywhere you code.

---

## Part 1: Architecture Overview

### System Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER SURFACES                                   │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│   VS Code    │     CLI      │     Web      │     MCP      │      SDK        │
│  Extension   │   (Global)   │  Dashboard   │   Server     │   (Library)     │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴────────┬────────┘
       │              │              │              │                │
       └──────────────┴──────────────┼──────────────┴────────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   UNIFIED IDENTITY   │
                          │   (Better Auth +     │
                          │    API Key Layer)    │
                          └──────────┬──────────┘
                                     │
       ┌─────────────────────────────┼─────────────────────────────┐
       │                             │                             │
┌──────▼──────┐          ┌───────────▼───────────┐         ┌───────▼───────┐
│  API Layer  │          │   Growth & Analytics  │         │  PostgreSQL   │
│   (oRPC)    │          │   ┌───────────────┐   │         │   (Storage)   │
└──────┬──────┘          │   │   PostHog     │   │         └───────────────┘
       │                 │   │   HubSpot     │   │
┌──────▼──────┐          │   │   Resend      │   │         ┌───────────────┐
│ IP-Protected│          │   └───────────────┘   │         │    Redis      │
│    Core     │          └───────────────────────┘         │   (Cache)     │
│  (Server)   │                                            └───────────────┘
└─────────────┘
```

### What Each Surface Does

| Surface | Individual Value | Shared Value |
|---------|------------------|--------------|
| **VS Code** | Auto-checkpoints on save, AI detection, inline restore | Syncs to cloud, cross-device access |
| **CLI** | `snapback restore` from terminal, CI/CD hooks | Same snapshot store as extension |
| **Web** | Visual timeline, side-by-side diffs, team metrics | Unified dashboard across all clients |
| **MCP** | LLMs query/restore checkpoints as tools | AI assistants get time-travel context |
| **SDK** | Embed protection in any tool | Consistent API across integrations |

**Cross-surface magic**:
- Snapshots created by VS Code → restorable by CLI / MCP / web
- MCP tool `snapback.getRecentRiskyChanges(file)` queries protection decisions + snapshot store
- Unified "time saved" dashboard pulls metrics across all `clientType`s

### Design Principles

1. **Local-first**: All protection works offline. Cloud is opt-in sync.
2. **Zero-config**: Install → protected. No setup required.
3. **Privacy-default**: Metadata only. File content never leaves machine without consent.
4. **Sub-100ms**: Protection can't slow down the developer.
5. **Progressive disclosure**: Simple by default, power when needed.

---

## Part 2: Data Model

### Core Tables

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- IDENTITY (Better Auth provides users, sessions, accounts)
-- ═══════════════════════════════════════════════════════════════════════════

-- API Keys: Long-lived tokens for programmatic access
CREATE TABLE api_keys (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  org_id            TEXT REFERENCES organization(id) ON DELETE CASCADE,
  key_prefix        TEXT NOT NULL,           -- "sk_live_abc" (display)
  key_hash          TEXT NOT NULL UNIQUE,    -- SHA-256 of full key
  name              TEXT NOT NULL,           -- "MacBook Pro - VS Code"
  permissions       JSONB DEFAULT '[]',
  last_used_at      TIMESTAMPTZ,
  request_count     INTEGER DEFAULT 0,
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- IDENTITY BRIDGE (Analytics ↔ CRM)
-- ═══════════════════════════════════════════════════════════════════════════

-- Maps one canonical user to PostHog, HubSpot, Resend
CREATE TABLE user_analytics_identities (
  user_id              TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  posthog_distinct_id  TEXT UNIQUE NOT NULL,
  hubspot_contact_id   TEXT,
  resend_contact_id    TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PRODUCT METRICS (Aggregated for dashboards + emails)
-- ═══════════════════════════════════════════════════════════════════════════

-- One row per user, pre-computed for fast access
CREATE TABLE user_product_metrics (
  user_id                   TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  first_seen_at             TIMESTAMPTZ,
  last_seen_at              TIMESTAMPTZ,
  -- Lifetime totals
  snapshots_total           INTEGER DEFAULT 0,
  restores_total            INTEGER DEFAULT 0,
  ai_bursts_detected_total  INTEGER DEFAULT 0,
  critical_files_protected  INTEGER DEFAULT 0,
  estimated_minutes_saved   INTEGER DEFAULT 0,
  -- Rolling 7-day (for emails + dashboard)
  last_week_minutes_saved   INTEGER DEFAULT 0,
  last_week_snapshots       INTEGER DEFAULT 0,
  last_week_restores        INTEGER DEFAULT 0,
  -- Channel info
  primary_client_type       TEXT,            -- 'vscode' | 'cli' | 'web' | 'mcp'
  last_client_type          TEXT,
  last_snapshot_at          TIMESTAMPTZ,
  last_restore_at           TIMESTAMPTZ,
  -- Retention signal
  churn_risk_score          INTEGER DEFAULT 0,  -- 0-100
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Time-series for charts
CREATE TABLE user_daily_metrics (
  user_id                  TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  date                     DATE NOT NULL,
  snapshots_created        INTEGER DEFAULT 0,
  restores_performed       INTEGER DEFAULT 0,
  ai_sessions              INTEGER DEFAULT 0,
  burst_events             INTEGER DEFAULT 0,
  critical_saves_protected INTEGER DEFAULT 0,
  minutes_saved_estimate   INTEGER DEFAULT 0,
  client_types_used        TEXT[] DEFAULT '{}',
  PRIMARY KEY (user_id, date)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- LIFECYCLE & GROWTH
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE user_lifecycle_state (
  user_id                    TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  -- Waitlist
  waitlist_status            TEXT DEFAULT 'none',    -- 'waitlisted' | 'invited' | 'activated'
  waitlist_source            TEXT,                   -- 'yc_form' | 'landing' | 'referral'
  -- Onboarding
  onboarding_stage           TEXT DEFAULT 'not_started',
  last_onboarding_event_at   TIMESTAMPTZ,
  -- Retention
  retention_stage            TEXT DEFAULT 'new',     -- 'new' | 'engaged' | 'at_risk' | 'churned'
  -- Nurture
  last_nurture_email_at      TIMESTAMPTZ,
  current_nurture_track      TEXT,                   -- 'waitlist' | 'new_user' | 'power_user'
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PROTECTION DECISIONS (ML Training Data)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE protection_decisions (
  id                       TEXT PRIMARY KEY,
  user_id                  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  anonymous_id             TEXT,
  session_id               TEXT NOT NULL,
  timestamp                TIMESTAMPTZ DEFAULT NOW(),
  client_type              TEXT NOT NULL,           -- 'vscode' | 'cli' | 'mcp'
  client_version           TEXT NOT NULL,
  -- Decision inputs (features)
  risk_score               INTEGER,                 -- 0-100
  ai_detected              BOOLEAN DEFAULT FALSE,
  burst_detected           BOOLEAN DEFAULT FALSE,
  critical_files_changed   INTEGER DEFAULT 0,
  files_changed            INTEGER DEFAULT 0,
  -- Decision output
  decision_snapshot        BOOLEAN NOT NULL,        -- Did we create snapshot?
  snapshot_id              TEXT,
  algorithm_version        TEXT DEFAULT 'v1',
  -- Outcomes (labels for training)
  restored_within_24h      BOOLEAN DEFAULT FALSE,
  user_marked_helpful      BOOLEAN,
  user_marked_annoying     BOOLEAN
);

CREATE INDEX idx_protection_decisions_user ON protection_decisions(user_id, timestamp DESC);
CREATE INDEX idx_protection_decisions_snapshot ON protection_decisions(snapshot_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SNAPSHOTS (Metadata only - content stays local or in blob storage)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE snapshots (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT REFERENCES "user"(id) ON DELETE CASCADE,
  api_key_id            TEXT REFERENCES api_keys(id) ON DELETE SET NULL,
  trigger               TEXT NOT NULL,              -- 'auto' | 'manual' | 'ai-detected'
  file_count            INTEGER NOT NULL,
  total_bytes           INTEGER NOT NULL,
  ai_detected           BOOLEAN DEFAULT FALSE,
  ai_tool               TEXT,                       -- 'cursor' | 'copilot' | 'claude'
  ai_confidence         REAL,
  cloud_backup_enabled  BOOLEAN DEFAULT FALSE,
  storage_location      TEXT,                       -- S3 path if backed up
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- TELEMETRY (Privacy-compliant event store)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE telemetry_events (
  id              TEXT PRIMARY KEY,
  anonymous_id    TEXT NOT NULL,                    -- NEVER user_id
  event_type      TEXT NOT NULL,
  properties      JSONB NOT NULL,
  client_type     TEXT NOT NULL,
  client_version  TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

### Minutes Saved Estimation

Simple heuristic (perfect is the enemy of "wow, this email feels good"):

```typescript
function estimateMinutesSaved(restore: RestoreEvent): number {
  const baseMinutes = 5;
  const filesMultiplier = Math.min(restore.filesRestored / 3, 3); // Cap at 3x
  const aiBonus = restore.aiDetected ? 5 : 0;
  const criticalBonus = restore.criticalFiles > 0 ? 5 : 0;

  return Math.round(baseMinutes + (baseMinutes * filesMultiplier) + aiBonus + criticalBonus);
  // Range: 5-25 minutes per restore
}
```

---

## Part 3: Identity & Authentication

### Token Hierarchy

```
OAuth Session (httpOnly, 7-day, web only)
       │
       └──► API Key (sk_live_...) ──► All programmatic access
            • Long-lived (no expiry)
            • Revocable
            • Per-device naming
            • Used by: Extension, CLI, SDK, MCP
```

### Auth Flow: Extension Grant

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Webview   │     │  Extension  │     │   Browser   │     │   Backend   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │ Click "Sign in"   │                   │                   │
       │──────────────────►│                   │                   │
       │                   │ Open browser      │                   │
       │                   │──────────────────►│                   │
       │                   │                   │ OAuth flow        │
       │                   │                   │──────────────────►│
       │                   │                   │◄──────────────────│
       │                   │ vscode://callback │                   │
       │                   │◄──────────────────│                   │
       │                   │                   │                   │
       │                   │ POST /extension-grant ───────────────►│
       │                   │◄───────────────────────────────────────│
       │                   │ { apiKey, tier, userId }              │
       │ "✓ Authenticated" │                   │                   │
       │◄──────────────────│                   │                   │
```

### Storage Keys (Extension)

```typescript
// Secrets (encrypted by VS Code)
'snapback.apiKey'      // sk_live_...
'snapback.keyId'       // For revocation

// Global State (unencrypted, non-sensitive)
'snapback.userId'
'snapback.tier'        // 'free' | 'pro' | 'enterprise'
'snapback.deviceName'
'snapback.anonymousId' // Stable per-machine, for telemetry
```

### Anonymous Mode

Users can skip auth and get full local protection:

| Feature | Authenticated | Anonymous |
|---------|--------------|-----------|
| Local snapshots | ✓ | ✓ |
| AI detection (basic) | ✓ | ✓ |
| Protection levels | ✓ | ✓ |
| Rollback | ✓ | ✓ |
| Cloud sync | ✓ | ✗ |
| Dashboard metrics | ✓ | ✗ |
| Advanced AI detection | ✓ (Pro) | ✗ |

**On sign-in**: Alias `anonymousId` → `posthog_distinct_id` so historical events merge.

---

## Part 4: Telemetry & Events

### Event Categories

```
CORE EVENTS (7) - Business metrics
├── save_attempt        File save with protection context
├── snapshot_created    Checkpoint created
├── session_finalized   Coding session ended
├── issue_created       Problem detected
├── issue_resolved      Problem fixed
├── session_restored    Rollback performed
└── policy_changed      Protection settings modified

INFRASTRUCTURE EVENTS (60) - Detailed tracking
├── Auth: auth_login_completed, auth_logout, auth_flow_failed
├── Extension: extension_installed, extension_activated
├── Welcome: welcome_panel_shown, auth_flow_started, auth_flow_skipped
├── Billing: billing_upgrade_prompt, checkout_completed
└── AI: ai_suggestion_shown, ai_risk_detected
```

### Activation Funnel

```
Install → Activate → Welcome → [Auth/Skip] → First Save → First Snapshot
   │          │         │           │            │              │
   ▼          ▼         ▼           ▼            ▼              ▼
extension  extension  welcome    auth_login   save_attempt  snapshot_
installed  activated  _panel_    _completed      (first)     created
                      shown
```

### Privacy Rules

**Never send to analytics**:
- `path`, `filePath`, `fileName`
- `email`, `user`, `userId`
- `ip`, `ipAddress`
- `content`, `code`, `diff`

**Identity rule**: PostHog receives `anonymousId`, never `userId`.

### Dual Data Strategy

```
┌───────────────┐                    ┌───────────────┐
│   PostHog     │                    │   PostgreSQL  │
│               │                    │               │
│ • Funnels     │                    │ • Metrics     │
│ • Cohorts     │                    │ • Training    │
│ • Retention   │◄────── sync ──────►│ • Churn score │
│ • Behavior    │                    │ • Emails      │
│               │                    │               │
└───────────────┘                    └───────────────┘
   "What happened"                   "Current picture"
```

Both stay in sync: when API handles `snapshot_created`:
1. Insert into `protection_decisions`
2. Update `user_daily_metrics`, `user_product_metrics`
3. Emit telemetry → PostHog

---

## Part 5: UX Signage System

### The Story Arc

Every touchpoint reinforces: **"SnapBack is your safety net."**

### Stage 1: Discovery (Welcome Panel)

```
┌─────────────────────────────────────────────────────────────────────┐
│  SnapBack is active                                                  │
│                                                                      │
│  Your code is protected automatically. When AI activity is           │
│  detected, we create a checkpoint so you can restore in seconds.    │
│                                                                      │
│  ✓ AI changes automatically checkpoint                              │
│  ✓ Restore with one click                                           │
│  ✓ No configuration needed                                          │
│                                                                      │
│  [Sign in to sync]  [Skip for now]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Stage 2: Active Protection (Status Bar)

```
Anonymous:     $(shield) SnapBack (local)
Authenticated: $(shield-check) SnapBack
AI Detected:   $(shield-check) SnapBack · AI

Tooltip: "3 checkpoints today · Last: 2 min ago"
```

### Stage 3: Value Moments (Toasts)

```
Checkpoint: "📸 Checkpoint created · AI burst detected · 3 files"
            [View] [Restore]                           auto-hide

Restore:    "✓ Restored to checkpoint from 3 min ago · 12 files"
            [Undo]                                     auto-hide
```

### Stage 4: Growth Moments (Non-Intrusive)

```
First Restore:    "🎉 SnapBack just saved your code! Sign in to sync."
                  [Sign in] [Not now]

Week Anniversary: "📊 50 checkpoints this week. Sign in for stats."
                  [Sign in] [Maybe later]

Rule: Max 1 nudge per day. Never block functionality.
```

### Stage 5: Retention Value (Email)

```
Subject: Your week with SnapBack

This week:
• 47 checkpoints created
• 3 restores saved ~15 minutes
• AI detected 12 times (Cursor, Copilot)

Your safety net is working. Keep coding fearlessly.
```

### Consistent Language

| Concept | Say | Don't Say |
|---------|-----|-----------|
| Create checkpoint | "Checkpoint created" | "Snapshot saved" |
| Rollback | "Restore" | "Revert", "Undo" |
| AI activity | "AI detected" | "Bot activity" |
| Time saved | "~X minutes saved" | Exact times |
| Protection active | "Protected" | "Monitored" |

### Color Semantics

```
Green  (#10B981) = Protected, Success, Checkpoint
Yellow (#F59E0B) = Warning, AI detected, Attention
Red    (#EF4444) = Blocked, Critical, Action required
Blue   (#3B82F6) = Info, Sync, Cloud features
Gray   (#6B7280) = Local only, Disabled
```

---

## Part 6: Feature Gating

### Tier Matrix

```typescript
const TIER_FEATURES = {
  anonymous: [
    'local_snapshots',
    'basic_ai_detection',
    'protection_levels',
    'rollback_local',
  ],
  free: [
    ...TIER_FEATURES.anonymous,
    'cloud_sync',
    'dashboard_metrics',
    'cross_device_access',
  ],
  pro: [
    ...TIER_FEATURES.free,
    'advanced_ai_detection',
    'smart_grouping',
    'rollback_validation',
    'priority_support',
  ],
  enterprise: [
    ...TIER_FEATURES.pro,
    'team_management',
    'audit_logs',
    'sso',
    'custom_policies',
  ],
};
```

### Gating UX

```typescript
// Never block, always explain
{
  message: "Sign in to sync snapshots across devices",
  actions: ["Sign in", "Not now"],
  blocking: false
}
```

---

## Part 7: Growth & Nurture

### Lifecycle Stages

```
Waitlisted → Invited → Installed → Activated → Engaged → Power User
     │          │          │           │           │          │
     ▼          ▼          ▼           ▼           ▼          ▼
  nurture    welcome    onboard    retention   expansion   advocacy
```

### Nurture Triggers

| Trigger | Action | Timing |
|---------|--------|--------|
| Joined waitlist | Welcome email | Immediate |
| Invited | Invitation email | Immediate |
| Installed, no snapshot 24h | Help email | +24h |
| First restore | Celebration email | +1h |
| 7 days active | Stats email | +7d |
| 3 days inactive | Re-engagement | +3d |
| Hit free limit | Upgrade prompt | On event |

### HubSpot Sync Fields

```typescript
{
  snapback_tier: 'free' | 'pro' | 'enterprise',
  snapback_last_seen: Date,
  snapback_snapshots_7d: number,
  snapback_restores_7d: number,
  snapback_minutes_saved_7d: number,
  snapback_retention_stage: string,
  snapback_primary_client: string,
  snapback_ai_tools_detected: string[],
}
```

---

## Part 8: API Endpoints

### Public API (Authenticated)

```typescript
// Metrics (dashboard, emails, CLI, extension "Show stats")
metrics.getMyUsage() → {
  lifetime: { snapshots, restores, minutesSaved, criticalFiles },
  last7Days: { snapshots, restores, minutesSaved, aiSessions },
  channels: { primary: 'vscode', used: ['vscode', 'cli'] }
}

metrics.getMyTimeline(range) → {
  daily: [{ date, snapshots, restores, minutesSaved }]
}

// Snapshots
snapshots.list(filters) → SnapshotManifest[]
snapshots.get(id) → SnapshotWithContent
snapshots.restore(id) → RestoreResult

// Settings
settings.getProtectionLevels() → ProtectionConfig
settings.updateLevel(pattern, level)
```

### Internal API (Server-only)

```typescript
// Growth (called by jobs/webhooks)
growth.updateLifecycle(userId, event)   // Transition lifecycle stages
growth.syncToHubspot(userId)            // Push fields to HubSpot
growth.enqueueEmail(userId, template)   // Queue via Resend

// Training (ML pipeline)
training.logDecision(decision)
training.markRestored(snapshotId)
training.exportDataset(range) → CSV
```

---

## Part 9: Implementation Phases

### Phase 1: Core Protection (Week 1-2)

**Goal**: Extension creates local snapshots, detects AI, allows restore.

```
Tests first:
├── SnapshotStore.test.ts      → Create, retrieve, list
├── AIDetector.test.ts         → Cursor, Copilot, Claude patterns
├── ProtectionEngine.test.ts   → Decision logic
└── RestoreService.test.ts     → File restoration

Implementation:
├── StorageManager (file-based)
├── AIDetector (pattern matching)
├── ProtectionEngine (when to snapshot)
└── RestoreService (file restoration)

UX: Status bar, checkpoint toast, restore command
```

### Phase 2: Auth & Identity (Week 2-3)

**Goal**: Users can sign in, get API key.

```
Tests first:
├── OAuthHandler.test.ts       → Browser flow, callback
├── TokenManager.test.ts       → Store, retrieve API key
├── AnonymousMode.test.ts      → Feature gating
└── ExtensionGrant.test.ts     → Backend endpoint

Implementation:
├── OAuthHandler (vscode://callback)
├── TokenManager (secrets storage)
├── AnonymousMode (degraded UX)
└── /api/auth/extension-grant

UX: Welcome panel, auth state in status bar, nudge system
```

### Phase 3: Telemetry (Week 3-4)

**Goal**: Track funnel, send to PostHog, respect privacy.

```
Tests first:
├── TelemetryClient.test.ts    → Emission, sanitization
├── PrivacyFilter.test.ts      → Blocklist enforcement
├── FunnelTracker.test.ts      → Activation events
└── EventMapper.test.ts        → Legacy → Core mapping

Implementation:
├── TelemetryClient (PostHog wrapper)
├── PrivacyFilter (sanitization)
├── FunnelTracker (activation)
└── /api/telemetry/ingest

Events: welcome_panel_shown, auth_flow_*, first_snapshot, first_restore
```

### Phase 4: Protection Decisions + Metrics (Week 4-5)

**Goal**: Log decisions for ML, aggregate metrics for dashboard/emails.

```
Tests first:
├── DecisionLogger.test.ts     → Log with correct features
├── OutcomeLabeler.test.ts     → Mark restored/helpful
├── MetricsAggregator.test.ts  → Daily/lifetime aggregation
└── MinutesSavedCalc.test.ts   → Time estimation

Implementation:
├── protection_decisions table
├── user_product_metrics + user_daily_metrics tables
├── DecisionLogger (called from ProtectionEngine)
├── OutcomeLabeler (called from RestoreService)
├── Aggregation cron job
└── metrics.getMyUsage endpoint

UX: Dashboard metrics, CLI `snapback stats`, extension command
```

### Phase 5: Growth Integration (Week 5-6)

**Goal**: HubSpot + Resend connected, nurture emails flowing.

```
Tests first:
├── LifecycleService.test.ts   → Stage transitions
├── HubspotSync.test.ts        → Field mapping (mock)
├── EmailService.test.ts       → Template selection
└── NudgeManager.test.ts       → Rate limiting

Implementation:
├── user_lifecycle_state table
├── user_analytics_identities table
├── LifecycleService (stage machine)
├── HubspotSyncService (contact updates)
├── EmailService (Resend)
└── Weekly stats email job

UX: Weekly email, milestone celebrations, re-engagement
```

### Phase 6: ML Feedback Loop (Week 6-7)

**Goal**: Labeled dataset for algorithm improvement.

```
Tests first:
├── DatasetBuilder.test.ts     → Feature matrix + labels
└── ModelVersioning.test.ts    → A/B comparison

Implementation:
├── Export script → CSV/Parquet
├── Offline training pipeline
├── algorithm_version field for A/B
└── Feature flags for rollout

Future: Retrain weekly, deploy via flags
```

---

## Part 10: Quality Gates

### Every PR

```
□ TypeScript: Zero errors (strict)
□ Tests: 80%+ coverage for new code
□ Bundle: <2MB for extension
□ Performance: <100ms protection decision
□ Privacy: Blocklist validated in tests
□ UX: No blocking modals, consistent language
```

### Demo Readiness

```
□ Install → Welcome → [Auth/Skip] → Save → Checkpoint ✓
□ AI detection: Cursor, Copilot, Claude
□ Restore flow working
□ Status bar correct
□ Telemetry → PostHog
□ Dashboard shows metrics
```

---

## Appendix A: Environment Variables

```bash
# Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=https://api.snapback.dev
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Analytics
POSTHOG_API_KEY=
POSTHOG_HOST=https://app.posthog.com

# Growth
HUBSPOT_API_KEY=
RESEND_API_KEY=

# Monitoring
SENTRY_DSN=
```

---

## Appendix B: File Structure

```
apps/
├── vscode/
│   └── src/
│       ├── auth/           # OAuthHandler, TokenManager, AnonymousMode
│       ├── storage/        # StorageManager, BlobStore, SnapshotStore
│       ├── protection/     # ProtectionEngine, AIDetector, DecisionLogger
│       ├── telemetry/      # TelemetryClient, FunnelTracker
│       ├── ui/             # StatusBar, WelcomePanel, Notifications
│       └── extension.ts
├── web/
│   └── app/
│       ├── (marketing)/    # Landing, pricing
│       └── (saas)/         # Dashboard, settings
├── mcp-server/
└── cli/

packages/
├── api/                    # oRPC endpoints
├── contracts/              # Zod schemas, types
├── platform/               # Drizzle schema, migrations
├── analytics/              # Metrics aggregation, ML export
└── infrastructure/         # Redis, telemetry client
```

---

## Appendix C: Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token type | API Key (not JWT) | Long-lived, revocable, no refresh |
| Storage | File-based (not SQLite) | No native module bundling |
| Analytics | PostHog only | Consolidate 7 → 1 |
| AI detection | Pattern + ML | Ship patterns, improve with data |
| Minutes saved | Estimate (~5-25) | Directionally correct > precise |
| Nudges | Max 1/day, never blocking | Respect user, build trust |
| Anonymous | Full local features | Prove value before auth |
| Metrics | Pre-aggregated tables | Fast emails + dashboard |
| ML data | Same table as decisions | Labels join naturally |

---

## Appendix D: API Services Summary

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           SERVICE ARCHITECTURE                             │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  METRICS SERVICE (Public)                                                  │
│  ├── metrics.getMyUsage        → Dashboard, emails, CLI, extension         │
│  └── metrics.getMyTimeline     → Charts, activity view                    │
│                                                                            │
│  GROWTH SERVICE (Internal)                                                 │
│  ├── growth.updateLifecycle    → Stage transitions on events              │
│  ├── growth.syncToHubspot      → Push fields for segmentation             │
│  └── growth.enqueueEmail       → Resend integration                       │
│                                                                            │
│  TRAINING SERVICE (Internal)                                               │
│  ├── training.logDecision      → Write to protection_decisions            │
│  ├── training.markRestored     → Label outcomes                           │
│  └── training.exportDataset    → CSV for offline training                 │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

*This document is the single source of truth for SnapBack implementation.*
