I'll search the project knowledge to understand your current analytics architecture and make targeted recommendations.Based on the project knowledge, here's a comprehensive analytics strategy. PostHog + structured logs should be sufficient for your needs, but the key is understanding **what** to collect from **where**.

---

## Analytics Strategy: SnapBack Metadata Collection

### The Answer: PostHog + Structured Logs is Enough (with Caveats)

You don't need more tools. You need **clear ownership of what each surface sends** and **a unified event schema** so everything flows into PostHog cleanly.

---

### Data Collection Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                              │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│  VS Code     │  Web         │  MCP         │  API              │
│  Extension   │  Dashboard   │  Server      │  Backend          │
│              │              │              │                   │
│ • Behavioral │ • Funnels    │ • Tool usage │ • Server-side     │
│ • AI detect  │ • Pageviews  │ • Command    │   events          │
│ • Snapshots  │ • Feature    │   invocation │ • Aggregations    │
│ • Recovery   │   interaction│ • Errors     │ • Telemetry proxy │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬──────────┘
       │              │              │                │
       │    ┌─────────▼──────────────▼────────────────▼─────┐
       │    │              PostHog (Primary)                │
       │    │  • Events, funnels, cohorts, feature flags    │
       │    │  • User identification via anonymous_id       │
       │    └───────────────────────────────────────────────┘
       │
       │    ┌───────────────────────────────────────────────┐
       └───►│        Structured Logs (Secondary)            │
            │  • Debug context for event troubleshooting    │
            │  • Performance traces (not user-facing)       │
            │  • Error context beyond Sentry                │
            └───────────────────────────────────────────────┘
```

---

### What Each Surface Should Collect

#### 1. VS Code Extension (Primary Data Source)

This is your **richest behavioral data source**. Collect metadata only.

| Event | Properties | Why It Matters |
|-------|------------|----------------|
| `extension.activated` | `activation_time_ms`, `version`, `vscode_version` | Performance budget validation |
| `save_attempt` | `protection`, `severity`, `file_kind`, `ai_present`, `ai_burst`, `outcome` | Core conversion metric |
| `snapshot_created` | `session_id`, `bytes_original`, `bytes_stored`, `dedup_hit`, `latency_ms` | Storage efficiency |
| `ai_tool_detected` | `tool` (cursor/copilot/claude/unknown), `confidence`, `pattern_match` | Heuristic improvement |
| `session_finalized` | `files`, `triggers`, `duration_ms`, `highest_severity` | Engagement depth |
| `rollback_initiated` | `session_id`, `files_count`, `time_to_restore_ms` | Recovery usage |
| `feature_gated` | `feature`, `user_tier`, `upsell_shown` | Conversion opportunity |
| `burst_detected` | `edits_in_window`, `window_ms`, `ai_present` | AI detection training |

**Privacy constraints (already implemented):**
- No `path`, `filePath`, `fileName`, `email`, `user`, `ip`
- Only `file_kind` (e.g., ".ts", ".tsx") not full paths
- `anonymous_id` only, never `user_id`

#### 2. Web Dashboard (Conversion Focus)

Track the **activation funnel** and **retention signals**.

| Event | Properties | Why It Matters |
|-------|------------|----------------|
| `page_viewed` | `page`, `referrer`, `utm_*` | Traffic sources |
| `auth_completed` | `provider` (github/google), `is_new_user` | Conversion step |
| `onboarding_step` | `step`, `completed`, `time_on_step_ms` | Funnel friction |
| `api_key_created` | `first_key`, `tier` | Activation milestone |
| `dashboard_loaded` | `metrics_count`, `has_extension_data` | Data flow validation |
| `upgrade_prompt_shown` | `trigger`, `tier_from`, `tier_to` | Revenue funnel |
| `upgrade_completed` | `plan`, `revenue`, `trial_days` | Revenue tracking |
| `settings_changed` | `setting_type`, `new_value` | Feature adoption |

**Critical funnel (demo must track):**
```
Install → Auth → First API Key → First Protected Save → D7 Return
```

#### 3. MCP Server (AI Integration Metrics)

Track **command invocation patterns** to understand AI assistant workflows.

| Event | Properties | Why It Matters |
|-------|------------|----------------|
| `mcp_command_invoked` | `command`, `tier_required`, `tier_actual`, `latency_ms` | Usage patterns |
| `mcp_tool_called` | `tool_name`, `success`, `error_type` | Reliability |
| `mcp_context_fetched` | `context_size`, `cache_hit` | Performance |
| `mcp_feature_gated` | `feature`, `tier`, `upgrade_shown` | Conversion |

#### 4. API Backend (Server-Side Truth)

The API is your **authoritative data aggregation layer**.

| Event | Properties | Why It Matters |
|-------|------------|----------------|
| `telemetry_ingested` | `event_count`, `source`, `anonymous_id` | Data flow validation |
| `api_key_used` | `key_id`, `endpoint`, `response_time_ms` | API health |
| `snapshot_synced` | `snapshot_count`, `bytes_synced` | Cloud backup adoption |
| `risk_analyzed` | `files_count`, `risk_score`, `latency_ms` | Pro feature usage |

---

### Structured Logs: What to Capture

Logs complement PostHog for **debugging and performance tracing**. Don't use logs for user analytics—use them for operational visibility.

```typescript
// packages/infrastructure/src/logging/structured-logger.ts
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: 'extension' | 'web' | 'mcp' | 'api';
  event: string;

  // Correlation
  trace_id?: string;      // Request trace
  anonymous_id?: string;  // Link to PostHog

  // Context (never PII)
  context: {
    duration_ms?: number;
    error_code?: string;
    error_message?: string;  // Sanitized
    stack_trace?: string;    // Dev only
  };
}
```

**Log when:**
- Performance budget exceeded (latency > threshold)
- Error occurred (with sanitized context)
- Unexpected state (defensive code triggered)
- Cache miss on critical path

**Don't log:**
- Every successful operation (that's PostHog)
- User content or file paths
- Anything that belongs in an event

---

### Recommended Tooling Stack

| Purpose | Tool | Why |
|---------|------|-----|
| **Product Analytics** | PostHog | Funnels, cohorts, feature flags, session replay (if enabled) |
| **Error Tracking** | Sentry | Stack traces, error grouping, alerting |
| **Structured Logs** | Your existing logger → Vercel Logs or Axiom | Debug context, performance traces |
| **Infrastructure Monitoring** | Vercel Analytics (free tier) | Edge function performance, web vitals |

You don't need:
- Google Analytics (redundant with PostHog)
- Mixpanel (redundant with PostHog)
- Separate APM (Sentry + logs is enough for your scale)

---

### Core Events to Prioritize (Demo-Critical)

For the demo, focus on these 7 events from your v1 core schema:

| Event | Source | Demo Proves |
|-------|--------|-------------|
| `save_attempt` | Extension | "Protection works" |
| `snapshot_created` | Extension | "Snapshots are fast" |
| `ai_tool_detected` | Extension | "AI detection works" |
| `session_finalized` | Extension | "Sessions are tracked" |
| `session_restored` | Extension | "Recovery works" |
| `auth_completed` | Web | "Funnel step 1" |
| `api_key_created` | Web | "Funnel step 2" |

---

### Implementation Checklist

**Already done (per audit docs):**
- [x] PostHog integration in extension
- [x] PostHog integration in web
- [x] Event sanitization (property blocklist)
- [x] Schema validation (Zod)
- [x] Telemetry proxy in API

**Needs verification/completion:**
- [ ] Activation funnel events fully wired
- [ ] Extension→PostHog flow tested end-to-end
- [ ] MCP server telemetry integrated
- [ ] Anonymous ID consistent across surfaces
- [ ] Deduplication for events tracked multiple places

---

### The Privacy-First Metadata You Can Safely Collect

Everything below is **metadata only**—no code content, no file paths, no PII:

```typescript
// Safe metadata properties
interface SafeMetadata {
  // Temporal
  timestamp: string;
  duration_ms: number;

  // Categorical
  file_kind: string;       // ".ts", not "src/auth/login.ts"
  ai_tool: string;         // "cursor", "copilot", "claude"
  protection_level: string; // "watch", "warn", "block"
  outcome: string;         // "protected", "bypassed", "failed"

  // Numerical
  files_count: number;
  bytes_original: number;
  bytes_stored: number;
  confidence_score: number;

  // Flags
  ai_present: boolean;
  ai_burst: boolean;
  dedup_hit: boolean;
  cache_hit: boolean;

  // IDs (anonymous/hashed)
  anonymous_id: string;    // PostHog identifier
  session_id: string;      // Your session grouping
  snapshot_id: string;     // Reference ID
}
```

---

### Summary

**PostHog + Structured Logs = Sufficient** if you:

1. **Own the schema** — Use your 7 core events consistently across all surfaces
2. **Track the funnel** — Install → Auth → API Key → First Save → D7 Return
3. **Respect privacy** — Metadata only, blocklist enforced, anonymous IDs
4. **Aggregate server-side** — API is the truth layer for dashboards and heuristic improvement

Want me to create a concrete implementation plan for wiring up the missing funnel events, or help consolidate the 127 events down to the actionable core?
