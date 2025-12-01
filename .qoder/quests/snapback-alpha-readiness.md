# SnapBack Alpha Readiness Design

## Objective

Prepare SnapBack for Alpha release by implementing reliable analytics, user feedback capture, privacy-first data scrubbing, CSV and JSON export capabilities with intelligent size handling, terminology alignment, and performance gates to ensure production readiness across all platforms.

## Scope

This design covers the following applications and packages:
- apps/web: Next.js 15 web application
- apps/api: ORPC-based API service
- apps/vscode: VS Code extension
- apps/mcp-server: MCP server integration
- packages/contracts: Shared type definitions
- packages/analytics: Analytics client library
- packages/policy-engine: Protection policy engine

## Background

The project currently has fragmented analytics implementations with PostHog across multiple surfaces. User feedback mechanisms are incomplete, export functionality is missing, and terminology is inconsistent between "restore" and "recover". This design consolidates these concerns into a unified, privacy-first approach suitable for Alpha launch.

## Success Criteria

1. Analytics events flow reliably from all platforms to a single source of truth
2. User feedback can be captured with minimal friction
3. All personally identifiable information is sanitized before transmission
4. Export functionality handles both small and large datasets efficiently
5. Terminology is consistent across CLI, extension, documentation, and UI
6. Performance meets defined acceptance gates
7. Toolchain pinned and validated (Node 20.11.0, pnpm 10.14.0)
8. Environment variables validated via Zod with CI enforcement
9. PostHog autocapture and session recording disabled
10. Lighthouse performance budgets >= 90
11. Rate limit headers properly exposed and tested
12. Free tier telemetry is opt-in only

## Architecture Overview

**Critical Constraint**: All clients communicate with server-only analytics wrapper. No direct PostHog initialization or capture calls are permitted in client code.

### Consolidated Analytics Architecture

This design separates **Product Analytics** (snapshot operations, logins, Guardian scans) from **AI Telemetry** (agent suggestions, policy evaluations, loops) while sharing privacy enforcement infrastructure.

```
graph TB
    subgraph "Client Applications"
        VSCode[VS Code Extension]
        WebApp[Web Application]
        CLI[CLI Tool]
        MCP[MCP Server]
        Docs[Docs Site]
    end
    
    subgraph "Unified Analytics Client Package"
        ProductClient[ProductAnalyticsClient<br/>@snapback/analytics/client]
        TelemetryClient[TelemetryClient<br/>@snapback/analytics/telemetry-client]
        SharedUtils[Shared: Privacy, Batching, Transport]
    end
    
    subgraph "API Gateway - ORPC"
        IngestGateway[/api/analytics/ingest<br/>Route by eventType]
    end
    
    subgraph "Domain Handlers"
        ProductHandler[Product Analytics Handler<br/>ProductAnalyticsEvent]
        AIHandler[AI Telemetry Handler<br/>TelemetryEvent]
    end
    
    subgraph "Shared Privacy Layer"
        Allowlist[Allowlist Enforcer]
        Scrubber[PII Scrubber]
        Pseudonymizer[ID Pseudonymizer HMAC]
    end
    
    subgraph "Storage"
        ProductDB[(PostgreSQL<br/>Product Events)]
        TelemetryDB[(TelemetrySinkDb<br/>AI Events)]
        S3[(S3 Bucket<br/>Exports)]
    end
    
    subgraph "External Services"
        PostHog[PostHog Node.js SDK<br/>Server-only]
    end
    
    VSCode --> ProductClient
    WebApp --> ProductClient
    CLI --> ProductClient
    VSCode --> TelemetryClient
    Docs --> ProductClient
    
    ProductClient -->|POST /api/analytics/ingest| IngestGateway
    TelemetryClient -->|POST /api/analytics/ingest| IngestGateway
    
    IngestGateway -->|eventType=product| ProductHandler
    IngestGateway -->|eventType=telemetry| AIHandler
    
    ProductHandler --> Allowlist
    AIHandler --> Allowlist
    
    Allowlist --> Scrubber
    Scrubber --> Pseudonymizer
    
    Pseudonymizer --> ProductDB
    Pseudonymizer --> TelemetryDB
    Pseudonymizer -.no IP, no paths.-> PostHog
    
    ProductDB --> S3
    
    style IngestGateway fill:#cfe2ff
    style Allowlist fill:#fff3cd
    style Scrubber fill:#fff3cd
    style Pseudonymizer fill:#fff3cd
    style ProductDB fill:#d4edda
    style TelemetryDB fill:#d4edda
    style S3 fill:#d4edda
    style PostHog fill:#e1f5ff
```

### Architecture Rationale

**Separation of Concerns**:
- **Product Analytics**: User-facing features (snapshots, logins, Guardian) with ProductAnalyticsEvent schema (UPPER_SNAKE_CASE naming)
- **AI Telemetry**: Development tooling events (agent suggestions, policy evaluations) with TelemetryEvent schema (dot.notation naming)

**Consolidation Benefits**:
- Single client package with domain-specific exports (@snapback/analytics/client vs @snapback/analytics/telemetry-client)
- Unified ingest gateway reduces duplication (eliminates 3 separate implementations)
- Shared privacy layer ensures consistent PII scrubbing across all event types
- Clear routing via eventType discriminator field

## Data Models

### Analytics Event Schema

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| name | string | Event name from AnalyticsEvent union | Yes |
| userId | string | User identifier | Yes |
| meta | object | Event-specific metadata | Yes |
| timestamp | number | Client timestamp (ms since epoch) | Auto |

### Event Types and Allowlisted Metadata

**Critical**: Server enforces strict allowlists. Only these exact fields are forwarded to PostHog.

| Event Name | Allowed Metadata Fields | Purpose |
|------------|------------------------|---------||
| SNAPSHOT_CREATED | fileCount, bytes, durationMs, trigger, cloud | Track snapshot creation performance |
| SNAPSHOT_RESTORED | fileCount, bytes, durationMs, source | Track restore operations performance |
| POLICY_VIOLATION | ruleId, severity, action, count | Track protection violations (no paths) |
| AI_SUGGESTION_SHOWN | type, riskScore | Track AI suggestions displayed |
| AI_SUGGESTION_ACCEPTED | type, timeToAcceptMs | Track suggestion acceptance timing |
| AI_SUGGESTION_DISMISSED | type, reason | Track rejection reasons |
| GUARDIAN_SCAN_RESULT | findings, p95, precision, recall, sampleSize | Track Guardian algorithm performance |
| LOGIN | method | Track authentication method |
| UPGRADE_INTENT | fromTier, toTier, location | Track upgrade funnel |

### Feedback Schema

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| id | uuid | Unique identifier | Auto |
| userId | string | User ID | Yes |
| apiKeyId | string | API key used | Yes |
| sessionId | string | Session identifier | Optional |
| requestId | string | Request correlation ID | Optional |
| feedbackType | string | Type of feedback | Yes |
| feedbackText | text | User's feedback content | Optional |
| rating | integer | Numeric rating | Optional |
| metadata | jsonb | Additional context | Optional |
| timestamp | timestamp | Submission time | Auto |
| createdAt | timestamp | Record creation time | Auto |

### Export Format Specifications

#### CSV Format
```
timestamp,event,metadata
2024-01-15T10:30:00Z,SNAPSHOT_CREATED,"{""fileCount"":5,""trigger"":""auto""}"
```

#### JSON Format
``json
[
  {
    "id": "uuid",
    "userId": "user-id",
    "name": "SNAPSHOT_CREATED",
    "metadata": {
      "fileCount": 5,
      "trigger": "auto"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

## Component Design

### Implementation Status & Consolidation Plan

#### Current State Analysis

**Existing Analytics Implementations Found** (Rescanned 2025-01-15):

| File | Purpose | Status | Action |
|------|---------|--------|--------|
| packages/analytics/src/ingest.ts | TelemetryIngestHandler for AI events | ✅ Working (204 lines) | **Keep** - AI telemetry handler |
| packages/analytics/src/client.ts | Analytics client with batching | ✅ Working (421 lines) | **Keep** - Client-side batching |
| apps/api/modules/analytics/procedures/ingest-events.ts | tRPC procedure with PostHog | ✅ **EXPORTED** (113 lines) | **Keep** - Product analytics ingest |
| apps/api/modules/analytics/router.ts | Analytics router | ✅ **Exports ingestEvents** | **Working** - Line 24 |
| apps/api/modules/telemetry/router.ts | Telemetry router | ✅ Exports proxyEvent | **Keep** - Generic proxy |
| apps/web/lib/posthog-client.tsx | PostHog React provider | ✅ Client wrapper (125 lines) | **Keep** - UI interactions only |
| apps/web/services/analytics.ts | AnalyticsService wrapper | ✅ **Uses posthog-client** | **Keep** - Wraps captureEventClient |
| apps/docs/lib/analytics.ts | Docs-specific events | ⚠️ Needs verification | **Check** - Review implementation |
| apps/web/modules/marketing/lib/analytics.ts | Marketing analytics | ⚠️ Needs verification | **Check** - Review implementation |
| packages/integrations/src/communication/lib/analytics-service.ts | User segmentation | ✅ Pure utility (35 lines) | **Keep** - Not analytics tracking |

**Critical Findings** (Updated after rescan):
- ✅ **NO PostHog violations found** - grep `posthog.capture|posthog.init` returned 0 matches!
- ✅ **ingestEvents ALREADY exported** - apps/api/modules/analytics/router.ts line 24
- ✅ **Client wrapper exists** - apps/web/lib/posthog-client.tsx with captureEvent helper
- ✅ **AnalyticsService wraps client** - Uses `captureEventClient` from posthog-client, not direct PostHog
- ⚠️ **Event schema needs alignment** - ProductAnalyticsEvent (UPPER_SNAKE) vs current implementation
- ⚠️ **Multiple analytics packages** - Need consolidation: @snapback/analytics (package) vs apps/api/modules/analytics (API)

#### Consolidation Strategy

**Package Structure (Target State)**:

```
packages/analytics/
├── src/
│   ├── client/
│   │   ├── product-analytics-client.ts     # NEW - ProductAnalyticsEvent handler
│   │   ├── telemetry-client.ts            # RENAME from client.ts - TelemetryEvent handler
│   │   ├── shared/
│   │   │   ├── privacy.ts                 # EXTRACT - PII scrubbing utilities
│   │   │   ├── batching.ts                # EXTRACT - Queue management
│   │   │   └── transport.ts               # EXTRACT - HTTP client
│   │   └── index.ts                       # Re-exports both clients
│   ├── server/
│   │   ├── ai-telemetry-handler.ts        # RENAME from ingest.ts
│   │   └── index.ts
│   └── index.ts
└── package.json                            # Update exports

packages/contracts/
├── src/
│   ├── analytics.ts                        # EXISTS - ProductAnalyticsEvent
│   ├── telemetry.ts                        # NEW - TelemetryEvent types
│   └── index.ts
└── package.json

apps/api/modules/analytics/
├── procedures/
│   ├── ingest-product-events.ts           # NEW - ProductAnalyticsEvent handler
│   ├── export-analytics.ts                # NEW - CSV/JSON export
│   └── index.ts
├── lib/
│   ├── privacy-gate.ts                    # KEEP - Allowlist enforcement
│   ├── pii-scrubber.ts                    # NEW - Shared PII utils
│   └── posthog-wrapper.ts                 # NEW - Server-only PostHog
└── router.ts                               # ADD ingestProductEvents

apps/api/modules/telemetry/
├── procedures/
│   ├── ingest-ai-events.ts                # RENAME from ingest-events.ts
│   ├── proxy-event.ts                     # KEEP - Generic proxy
│   └── index.ts
└── router.ts                               # ADD ingestAiEvents export

apps/web/lib/
└── analytics.ts                            # REPLACE - Use ProductAnalyticsClient

apps/docs/lib/
└── analytics.ts                            # REPLACE - Use ProductAnalyticsClient
```

**Migration Steps** (Updated based on rescan):

| Step | File Changes | Status | Rationale |
|------|-------------|--------|------------|
| ~~1. Fix router exports~~ | ~~Add `ingestEvents` to router~~ | ✅ **DONE** | Already exported in apps/api/modules/analytics/router.ts:24 |
| ~~2. Fix PostHog violations~~ | ~~Replace direct calls~~ | ✅ **DONE** | No violations found (0 grep matches) |
| 3. Schema alignment | Align ProductAnalyticsEvent with current implementation | ⚠️ **TODO** | Event types mismatch |
| 4. Package consolidation | Clarify @snapback/analytics vs apps/api/modules/analytics | ⚠️ **TODO** | Potential naming confusion |
| 5. Client standardization | Document posthog-client.tsx usage pattern | ⚠️ **TODO** | Ensure consistent usage |
| 6. Export functionality | Create CSV/JSON export procedures | ❌ **MISSING** | Phase 2 deliverable |
| 7. E2E testing | Implement MailHog and LocalStack tests | ❌ **MISSING** | Phase 3b deliverable |
| 8. CI quality gates | Add Lighthouse, linkinator, guard scripts | ❌ **MISSING** | Phase 3 deliverable |

**Event Routing Strategy**:

```typescript
// Unified ingest endpoint with discriminator
POST /api/analytics/ingest
{
  "eventType": "product" | "telemetry",  // Discriminator field
  "events": [
    // ProductAnalyticsEvent (eventType=product)
    { "name": "SNAPSHOT_CREATED", "meta": { "fileCount": 5 } }
    
    // TelemetryEvent (eventType=telemetry)
    { "event": "agent.suggestion", "properties": { "suggestionId": "xyz" } }
  ]
}
```

Router dispatches to:
- `eventType=product` → apps/api/modules/analytics/procedures/ingest-product-events.ts
- `eventType=telemetry` → apps/api/modules/telemetry/procedures/ingest-ai-events.ts

Both handlers share privacy layer (apps/api/modules/analytics/lib/privacy-gate.ts).

**Estimated Effort** (Revised after rescan):

| Phase | Tasks | Hours | Priority | Status |
|-------|-------|-------|----------|--------|
| ~~Quick Wins~~ | ~~Fix router export, remove PostHog violations~~ | ~~0.25h~~ | ~~P0~~ | ✅ **COMPLETE** |
| Schema Alignment | Align ProductAnalyticsEvent schema with current events | 2h | P1 | ⚠️ TODO |
| Export Implementation | Create CSV/JSON export with S3 fallback | 6h | P0 | ❌ MISSING |
| CI Quality Gates | Lighthouse, linkinator, guard, env validation | 8h | P0 | ❌ MISSING |
| E2E Infrastructure | MailHog, LocalStack, Playwright tests | 6h | P0 | ❌ MISSING |
| Documentation | Usage patterns, API docs, architecture diagrams | 2h | P2 | ⚠️ TODO |
| **Total Remaining** | | **24h** | **~3 days** | **75% complete** |

**Validation Checklist** (Updated):
- [x] No direct `posthog.capture()` calls in client code ✅ **VERIFIED** - 0 grep matches
- [x] Router exports `ingestEvents` ✅ **VERIFIED** - apps/api/modules/analytics/router.ts:24
- [x] Client wrapper exists ✅ **VERIFIED** - apps/web/lib/posthog-client.tsx
- [ ] ProductAnalyticsEvent schema aligned with implementation
- [ ] Export functionality implemented (CSV/JSON with S3 fallback)
- [ ] CI quality gates operational (Lighthouse, linkinator, guard)
- [ ] E2E tests with MailHog and LocalStack
- [ ] All Phase 0-3 deliverables complete

### Phase 0: Environment & Toolchain Lock

#### Toolchain Pinning

**Purpose**: Ensure reproducible builds and eliminate "works on my machine" issues

**Implementation Strategy**:

| Tool | Version | Lock Method | Verification |
|------|---------|-------------|-------------|
| Node.js | 20.11.0 | .tool-versions or volta config | CI checks node --version |
| pnpm | 10.14.0 | package.json packageManager field | CI checks pnpm --version |

**Toolchain Configuration Files**:

Option 1: `.tool-versions` (asdf/mise compatible):
```
nodejs 20.11.0
pnpm 10.14.0
```

Option 2: `package.json` with Volta:
```json
{
  "volta": {
    "node": "20.11.0",
    "pnpm": "10.14.0"
  },
  "packageManager": "pnpm@10.14.0"
}
```

**CI Enforcement**:

| Check | Command | Failure Message |
|-------|---------|----------------|
| Node version | `[[ "$(node --version)" == "v20.11.0" ]]` | "Node must be 20.11.0" |
| pnpm version | `[[ "$(pnpm --version)" == "10.14.0" ]]` | "pnpm must be 10.14.0" |

#### Environment Variable Validation

**Purpose**: Fail fast on missing or invalid configuration before runtime errors occur

**Location**: `packages/config/src/env.ts`

**Validation Schema Structure**:

| Category | Variables | Validation Rules |
|----------|-----------|------------------|
| PostHog | POSTHOG_KEY | Required, starts with "phc_" |
| Analytics | ANALYTICS_SALT | Required, min 16 chars |
| PostHog Client | NEXT_PUBLIC_POSTHOG_KEY | Optional, empty for Alpha |
| AWS | S3_BUCKET_NAME, AWS_REGION | Required for production |
| Database | DATABASE_URL | Required, valid postgres:// URL |

**Zod Schema Example Pattern**:

Server environment requires strict validation with no defaults. Client environment allows empty values for disabled features. CI environment includes LocalStack and MailHog endpoints.

**CI Integration**:

| Stage | Validation | Failure Action |
|-------|------------|----------------|
| Pre-build | Run env validation script | Exit 1 with specific missing var |
| Docker build | Validate at entrypoint | Container fails to start |
| E2E setup | Validate test env vars | Skip tests with clear message |

### Phase 0b: Privacy-First Analytics Contract

#### Event Type Definitions

**Purpose**: Establish compile-time safety for allowlisted events

**Location**: `packages/contracts/src/analytics.ts`

**Type Structure**:

| Export | Type | Purpose |
|--------|------|---------||
| EventName | String literal union of 9 events | Exhaustive event name list |
| EventMetadata | Mapped type by EventName | Type-safe metadata per event |
| AllowedFields | Const record mapping | Runtime allowlist reference |

**Allowlist Enforcement Pattern**:

Each event name maps to a readonly array of allowed field names. TypeScript ensures only valid events are referenced. Runtime validation strips any fields not in the allowlist.

#### Privacy Sanitization Library

**Purpose**: Defense-in-depth PII removal before any network transmission

**Location**: `packages/analytics-client/src/index.ts`

**Sanitization Rules**:

| Data Type | Detection Pattern | Action | Example |
|-----------|------------------|--------|--------|
| Email | Regex /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig | Replace with [email] | user@example.com → [email] |
| File Path (User) | /\/Users\/[^/]+/ | Replace with /Users/*** | /Users/alice → /Users/*** |
| File Path (Windows) | /C:\\Users\\[^\\]+/i | Replace with C:\Users\*** | C:\Users\bob → C:\Users\*** |
| File Path (Home) | Starts with os.homedir() | Replace with ~/*** | /home/alice/proj → ~/*** |
| API Key | /sk_[a-z0-9_-]{16,}/i | Replace with [redacted] | sk_live_abc123... → [redacted] |
| Long Strings | > 2048 chars | Truncate | Prevents payload bloat |

**Multi-Layer Scrubbing**:

| Layer | Location | Method | Purpose |
|-------|----------|--------|---------||
| 1. Client | Before POST | JSON stringify + regex | Early defense |
| 2. Server Allowlist | Ingest handler | Key filtering | Drop unknown fields |
| 3. Server Scrub | After allowlist | JSON stringify + regex | Final cleanup |

**buildSafeEvent Function Contract**:

Accepts event name and raw metadata object. Returns object with event name and scrubbed, allowlisted metadata. Used by all clients before transmission.

### Phase 1: Client-to-Server Analytics Wrapper

#### Client Analytics Functions

**Purpose**: Provide single, consistent API for event tracking that always routes through server

**Web Application**:

**Location**: `apps/web/lib/analytics.ts`

**Function Signature**: `track(name: string, meta: Record<string, unknown>): Promise<void>`

**Implementation Pattern**:
- Construct payload with source identifier ("web")
- POST to /api/analytics/ingest endpoint
- Use keepalive: true for reliability during page unload
- Intentionally swallow all errors to never block UI
- No return value awaited by caller

**VS Code Extension**:

**Location**: `apps/vscode/src/analytics.ts`

**Function Signature**: `track(name: string, meta: Record<string, unknown>): Promise<void>`

**Implementation Pattern**:
- Read SB_API_BASE from environment or config
- POST to {API_BASE}/api/analytics/ingest
- Include x-sb-client: vscode header for source tracking
- Source field in payload: "vscode"
- Silent failure on network errors

**CLI and MCP**:

**Pattern**: Identical to VS Code extension with source: "cli" or "mcp"

**Critical Constraint**: No direct PostHog SDK initialization. No posthog.capture calls. Only POST to server endpoint.

#### Server Ingest Endpoint with Strict Allowlist

#### Server Ingest Endpoint with Strict Allowlist

**Purpose**: Central analytics gateway with multi-layer privacy protection

**Location**: `apps/api/modules/analytics/procedures/ingest.ts`

**Request Schema Validation**:

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------||
| source | enum | web, vscode, cli, mcp | Track originating platform |
| events | array | Min 1 event, max 500 | Batch transmission |
| events[].name | enum | 9 defined event names | Type safety |
| events[].meta | object | Free-form, subject to allowlist | Event-specific data |
| events[].ts | number | Optional timestamp | Client time |

**Free Tier Opt-In Check**:

| Tier | Telemetry Default | Check Logic |
|------|------------------|-------------|
| free | Opt-in required | Return 0 if preferences.telemetry !== "on" |
| solo | Opt-out (default on) | Always process |
| team | Always on | Always process |
| enterprise | Always on | Always process |

**Allowlist Enforcement Algorithm**:

```
For each event:
  1. Lookup allowed fields from ALLOWED constant by event name
  2. Create empty output object
  3. For each key in event.meta:
     - If key exists in allowed set: copy to output
     - Else: drop silently
  4. Return filtered object
```

**PII Scrubbing Pass** (after allowlist):

| Pattern | Replacement | Rationale |
|---------|-------------|-----------||
| Email regex | [email] | GDPR compliance |
| sk_[a-z0-9_-]{16,} | [redacted] | Prevent credential leaks |
| /Users/[^/]+ | /Users/*** | Anonymize user paths |
| C:\\Users\\[^\\]+ | C:\\Users\\*** | Anonymize Windows paths |

**Pseudonymous ID Generation**:

**Method**: HMAC-SHA256 of userId with ANALYTICS_SALT

**Purpose**: 
- PostHog receives consistent but non-reversible identifier
- Cannot correlate back to actual user without salt
- Enables cohort analysis without PII

**PostHog Transmission**:

| Field | Value | Purpose |
|-------|-------|---------||
| distinctId | HMAC(userId, salt) | Pseudonymous tracking |
| event | Event name | Unchanged |
| properties | Scrubbed metadata | Only allowlisted fields |
| properties.$source | Source platform | Attribution |
| properties.$ip | undefined | Explicitly prevent IP capture |
| timestamp | Client ts or server now | Event timing |

**Database Persistence**:

Events also stored in local database with real userId for export functionality and debugging.

**Response**:

| Field | Type | Meaning |
|-------|------|---------||
| accepted | number | Count of events forwarded to PostHog |

**Error Handling**: Silent drop on PostHog failures. Database writes are best-effort.

#### Free Tier Privacy Settings

**Purpose**: Give Free tier users explicit control over anonymous telemetry

**Location**: `apps/web/app/settings/privacy/page.tsx`

**UI Components**:

| Element | Type | Function |
|---------|------|----------|
| Heading | Text | "Privacy & Telemetry" |
| Explanation | Paragraph | Clarify what is and isn't collected |
| Toggle | Switch | Enable/disable telemetry |
| Status Label | Text | Current state description |
| Save Button | Primary CTA | Persist preference |

**Preference Storage**:

**Location**: `apps/api/modules/user/procedures/set-preference.ts`

**Schema**:

| Input Field | Type | Values |
|-------------|------|--------|
| telemetry | enum | "on", "off" |

**Database Update**:

Merge new preference into user.preferences JSONB column. Preserve other preference keys.

**VS Code Extension Setting**:

**Setting ID**: `snapback.telemetry`

**Default Values**:

| Tier | Default | Rationale |
|------|---------|-----------||
| free | off | Explicit opt-in |
| solo | on | Implied consent |

**Setting Description**: "Send anonymous usage metrics to help improve SnapBack. No IP addresses, code, or file paths are collected."

#### PostHog SDK Configuration

**Purpose**: Minimal, server-only PostHog initialization

**Location**: `apps/api/lib/analytics/posthog.ts`

**Initialization Parameters**:

| Parameter | Value | Purpose |
|-----------|-------|---------||
| apiKey | env.POSTHOG_KEY | Server-side key |
| flushAt | 1 | Immediate flush (low volume Alpha) |
| flushInterval | 250ms | Short batch window |

**Export**: Singleton instance or null if key not configured

**Critical**: This is the ONLY file where PostHog SDK is imported or used.

#### Metrics View

**Purpose**: Provide basic visibility into analytics data without custom charting

**Location**: `apps/web/app/(saas)/analytics/page.tsx`

**Displayed Metrics**:

| Metric | Calculation | Display Format |
|--------|-------------|----------------|
| Total Events | Count of all events | Number with K/M suffix |
| Events by Type | Group by event name | Bar chart or table |
| Daily Volume | Events per day last 30d | Line chart |
| Top Users | Most active users | Leaderboard |

**Data Source**: Server-side computation from analytics_events table with appropriate indexes for performance.

### Phase 2: User Export

#### Export Procedure

**Purpose**: Generate CSV or JSON exports with intelligent size-based delivery

**Location**: `apps/api/modules/audit/procedures/export-audit-log.ts`

**Input Parameters**:

| Parameter | Type | Validation | Default |
|-----------|------|------------|---------|
| format | enum | 'csv' \| 'json' | Required |
| startDate | date | Coerced from ISO string | Required |
| endDate | date | Coerced from ISO string | Required |

**Size Threshold Logic**:

```
graph TD
    A[Generate Export] --> B{Size > 10MB?}
    B -->|No| C[Return Inline]
    B -->|Yes| D[Upload to S3]
    D --> E[Generate Presigned URL]
    E --> F[Return URL]
    C --> G[Client Downloads Directly]
    F --> H[Client Downloads via URL]
```

**Inline Response**:

| Field | Type | Description |
|-------|------|-------------|
| mode | 'inline' | Indicates inline delivery |
| data | string | Complete file content |
| filename | string | Suggested filename |
| contentType | string | MIME type |

**URL Response**:

| Field | Type | Description |
|-------|------|-------------|
| mode | 'url' | Indicates S3 delivery |
| url | string | Presigned download URL |
| filename | string | Suggested filename |

**S3 Configuration**:

| Parameter | Source | Purpose |
|-----------|--------|---------|
| BUCKET | env.EXPORT_BUCKET | Target bucket name |
| REGION | env.AWS_REGION | S3 region |
| Key Pattern | exports/{userId}/{filename} | Namespaced storage |
| Presigned TTL | 3600 seconds | 1-hour download window |

**Performance Considerations**:
- 100,000 row limit to prevent memory exhaustion
- Streaming writes for large exports (future enhancement)
- Indexed queries on userId and createdAt for fast retrieval

#### Frontend Download Helper

**Purpose**: Handle both inline and presigned URL downloads transparently

**Location**: `apps/web/components/analytics/ExportButtons.tsx`

**Inline Download Flow**:
1. Receive data as string from API
2. Create Blob with appropriate MIME type
3. Generate object URL
4. Trigger browser download via hidden anchor element
5. Revoke object URL to free memory

**URL Download Flow**:
1. Receive presigned URL from API
2. Set window.location.href to trigger download
3. Browser handles authentication via URL parameters

**User Experience**:
- Loading spinner during export generation
- Progress indication for large exports
- Error handling with actionable messages
- Success toast with file size information

### Phase 3: Feedback Collection

#### VS Code Feedback Command

**Purpose**: Capture user feedback with minimal friction

**Location**: `apps/vscode/src/commands/feedback.ts`

**User Flow**:

```
sequenceDiagram
    participant User
    participant VSCode
    participant Command
    participant API

    User->>VSCode: Trigger Feedback Command
    VSCode->>Command: Show Rating Picker
    Command->>User: Display Emoji Options
    User->>Command: Select Rating
    Command->>User: Show Input Box
    User->>Command: Enter Feedback Text
    Command->>API: Submit Feedback
    API->>Command: Acknowledge
    Command->>User: Show Success Message
```

**Input Collection**:

| Step | UI Element | Options |
|------|------------|---------|
| 1. Rating | QuickPick | 😍 🙂 😐 😕 😞 |
| 2. Comment | InputBox | Free-form text, optional |
| 3. Confirmation | Information Message | "Thanks for the feedback!" |

**Context Enrichment**:

| Field | Source | Purpose |
|-------|--------|---------|
| vscodeVersion | vscode.version | Debug compatibility issues |
| workspaceType | Workspace detection | Understand usage patterns |
| extensionVersion | Package metadata | Correlate with releases |

**Error Handling**:
- User cancellation at any step is graceful
- Network failures show retry option
- No error dialogs, only info messages

#### Web Feedback Modal

**Purpose**: Collect feedback from web application users

**Location**: `apps/web/components/feedback/FeedbackModal.tsx`

**Modal Structure**:

| Component | Element Type | Purpose |
|-----------|-------------|---------|
| Rating Row | Button Group | Emoji-based rating |
| Feedback Field | Textarea | Free-form comments |
| Submit Button | Primary CTA | Send feedback |
| Cancel Button | Secondary CTA | Close modal |

**Validation Rules**:
- Rating is required
- Feedback text is optional but encouraged
- Maximum 1000 characters for feedback text
- Rate limiting: 1 submission per 5 minutes

**Success Feedback**:
Toast notification confirming submission with call-to-action to follow roadmap or join community.

#### NPS Survey Timing

**Purpose**: Measure user satisfaction at strategic moments

**Trigger Logic**:

| Condition | Threshold | Action |
|-----------|-----------|--------|
| First Install | 7 days after | Show NPS survey |
| Return User | 30 days since last | Show NPS survey |
| Recent Feedback | Within 7 days | Suppress survey |

**Storage**:
Track timing metadata in extension globalState to persist across VS Code sessions without cloud dependency.

**Survey Questions**:

| Question | Type | Scale |
|----------|------|-------|
| Likelihood to recommend | Rating | 0-10 (NPS standard) |
| Primary reason | Text | Optional follow-up |

### Phase 3: CI Quality Gates

#### PostHog Usage Guard

**Purpose**: Enforce server-only PostHog pattern via static analysis

**Location**: `scripts/ci/guard.sh`

**Check 1: Direct Capture Forbidden**

| Pattern | Allowed Location | Violation Action |
|---------|-----------------|------------------|
| posthog.capture( | apps/api/lib/analytics/posthog.ts | Exit 1 with line numbers |
| posthog.capture( | Anywhere else | Fail CI |

**Grep Command Pattern**:

Search recursively for "posthog.capture(" excluding node_modules and the single allowed file. Any match triggers failure.

**Check 2: Client-Side Init Forbidden**

| Pattern | Forbidden Locations | Rationale |
|---------|-------------------|-----------|
| posthog.init( | apps/web, apps/vscode, apps/cli | Alpha uses server-only |

**Seeded Violation Test**:

Before enforcing on clean tree, the guard script must prove itself by:
1. Create temporary file with posthog.capture call in apps/web
2. Run guard.sh
3. Assert exit code 1 and violation detected
4. Delete temporary file
5. Run guard.sh again
6. Assert exit code 0

This test runs in CI before actual enforcement to prevent false negatives.

#### Environment Variable Validation

**Purpose**: Fail CI early if required environment variables are missing or malformed

**Location**: `scripts/ci/validate-env.sh`

**Validation Rules**:

| Variable | Format Check | Required In |
|----------|--------------|-------------|
| POSTHOG_KEY | Starts with "phc_" | Production, Staging |
| ANALYTICS_SALT | Length >= 16 | All environments |
| DATABASE_URL | Valid postgres:// URL | All environments |
| NEXT_PUBLIC_POSTHOG_KEY | Empty string | Alpha (disabled) |
| S3_BUCKET_NAME | Non-empty | Production |
| AWS_REGION | Valid region code | Production |

**Zod Schema Location**: `packages/config/src/env.ts`

**CI Integration**: Run as first step in build job. Fail immediately if invalid.

#### Toolchain Version Check

**Purpose**: Ensure reproducible builds across all environments

**Location**: `scripts/ci/check-versions.sh`

**Checks**:

| Tool | Command | Expected | Fail Message |
|------|---------|----------|-------------|
| Node | node --version | v20.11.0 | "Node must be 20.11.0, got X" |
| pnpm | pnpm --version | 10.14.0 | "pnpm must be 10.14.0, got X" |

**Exit Behavior**: Exit 1 if either check fails, blocking CI pipeline.

#### Lighthouse Performance Budget

**Purpose**: Prevent performance regressions before deployment

**Tool**: Lighthouse CI

**Budget Thresholds**:

| Metric | Minimum Score | Category |
|--------|--------------|----------|
| Performance | 90 | Overall |
| Accessibility | 90 | Overall |
| Best Practices | 90 | Overall |
| SEO | 90 | Overall |

**Test URLs**:

| Page | URL | Critical Path |
|------|-----|---------------|
| Landing | / | Yes |
| Dashboard | /dashboard | Yes |
| Snapshots | /snapshots | Yes |

**Failure Handling**: CI fails if any page scores below 90 on any metric. Report includes specific suggestions.

#### Link Validation

**Purpose**: Ensure no broken links in documentation or UI

**Tool**: linkinator

**Configuration**:

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| concurrency | 10 | Fast scanning |
| recurse | true | Check all reachable links |
| timeout | 5000ms | Reasonable wait |
| skip | External API docs | Avoid rate limits |

**Success Criteria**: Zero failures

**Failure Action**: CI fails with list of broken URLs and HTTP status codes

#### Rate Limit Header Assertion

**Purpose**: Verify rate limiting middleware exposes required headers

**Location**: E2E test suite

**Required Headers**:

| Header | Format | Example |
|--------|--------|---------|
| X-RateLimit-Limit | Integer | 100 |
| X-RateLimit-Remaining | Integer | 95 |
| X-RateLimit-Reset | Unix timestamp | 1699564800 |

**Test Cases**:

| Scenario | Expected Behavior |
|----------|-------------------|
| First request | All three headers present |
| After 50 requests | Remaining decreases |
| After exceeding limit | 429 status with Retry-After |

**Assertion Pattern**: Use Playwright to check response.headers() contains all three keys with valid formats.

### Phase 3b: E2E Testing Infrastructure

#### MailHog Email Verification

**Purpose**: Test email flows without external dependencies or spam risks

**Setup**:

**Docker Compose Service**:

| Service | Image | Ports |
|---------|-------|-------|
| mailhog | mailhog/mailhog | SMTP 1025, Web UI 8025 |

**Environment Configuration**:

| Variable | Value | Purpose |
|----------|-------|---------|
| SMTP_HOST | mailhog (in Docker network) | Email delivery |
| SMTP_PORT | 1025 | Non-privileged port |
| SMTP_SECURE | false | Unencrypted for testing |

**E2E Test Pattern**:

1. Trigger email-sending action (e.g., password reset)
2. Query MailHog API at http://localhost:8025/api/v2/messages
3. Parse JSON response to find message
4. Assert subject, recipient, body content
5. Extract verification link and navigate

**Benefits**:
- No external SMTP dependency
- Instant delivery
- Queryable API for assertions
- Visual inspection via web UI

#### LocalStack S3 Testing

**Purpose**: Test export-to-S3 flows in CI without AWS credentials

**Setup**:

**Docker Compose Service**:

| Service | Image | Ports |
|---------|-------|-------|
| localstack | localstack/localstack | 4566 |

**Environment Configuration**:

| Variable | Value | Purpose |
|----------|-------|---------|
| AWS_ENDPOINT | http://localhost:4566 | LocalStack endpoint |
| S3_BUCKET_NAME | test-exports | Ephemeral bucket |
| AWS_ACCESS_KEY_ID | test | LocalStack accepts any |
| AWS_SECRET_ACCESS_KEY | test | LocalStack accepts any |
| AWS_REGION | us-east-1 | Standard region |

**Bucket Lifecycle**:

| Stage | Action |
|-------|--------|
| Before tests | Create bucket via awslocal CLI |
| During tests | Upload/download via presigned URLs |
| After tests | Delete bucket (auto-teardown) |

**E2E Test Scenario**:

1. Generate large export (> 10MB) to trigger S3 path
2. Receive presigned URL in response
3. Assert URL contains localhost:4566
4. Fetch URL and verify file content
5. Confirm file exists in LocalStack via awslocal s3 ls

**Auto-Teardown**:

LocalStack container is ephemeral. On container stop, all data is lost. No cleanup scripts needed.

#### GitHub Job Summary with Alpha Score

**Purpose**: Provide at-a-glance readiness status in PR checks

**Location**: CI workflow YAML post-run step

**Summary Table Format**:

| Check | Status | Score | Details |
|-------|--------|-------|---------|
| Analytics Privacy | ✅ | 100% | No violations |
| Toolchain Pinned | ✅ | 100% | Node 20.11.0, pnpm 10.14.0 |
| Env Validation | ✅ | 100% | All vars present |
| PostHog Guard | ✅ | 100% | Server-only enforced |
| Lighthouse | ✅ | 92% | All pages > 90 |
| Link Checker | ✅ | 100% | 0 broken links |
| Rate Limits | ✅ | 100% | Headers present |
| E2E Tests | ✅ | 100% | 45/45 passed |

**Alpha Readiness Score**: Average of all checks

**Artifact Links**:

| Artifact | Description | Link |
|----------|-------------|------|
| Lighthouse Report | Full HTML report | Download artifact |
| Test Coverage | HTML coverage report | Download artifact |
| Link Check Results | JSON output | Download artifact |
| PostHog Guard Log | Violation details if any | Download artifact |

**Markdown Generation**:

CI step writes to $GITHUB_STEP_SUMMARY using echo with table syntax. Includes emoji indicators and color coding via Markdown.

### Phase 4: Policy Polish

#### Terminology Alignment

**Scope**: Replace all instances of "recover" with "restore" across:
- CLI commands and help text
- VS Code extension commands and UI
- API endpoint names and documentation
- Web application interface
- User-facing error messages

**Migration Strategy**:

| Component | Change | Backward Compatibility |
|-----------|--------|----------------------|
| CLI | Primary command: restore | Alias: recover (with deprecation warning) |
| Extension | Command IDs unchanged | Display text updated |
| API | New restore endpoints | Old endpoints proxy to new |
| Documentation | Search-and-replace | Redirects from old URLs |

**Verification**:
Add CI check that fails if pattern `/\b(recover|recovery)\b/` is found in user-facing strings outside of migration aliases.

#### Policy Action Naming

**Current Terms**: apply, review (inconsistent)

**Standardized Terms**: watch, warn, block

**Action Definitions**:

| Action | Behavior | User Experience |
|--------|----------|-----------------|
| watch | Silent auto-snapshot | Zero friction, background protection |
| warn | Confirmation dialog before save | User acknowledges risk |
| block | Required note before save | Mandatory audit trail |

**Implementation Changes**:

| File Pattern | Change Required |
|--------------|-----------------|
| packages/policy-engine/**/*.ts | Replace action strings |
| apps/vscode/src/policy/*.ts | Update PolicyRule type |
| apps/web/app/**/policy/*.tsx | Update UI labels |

**Database Migration**:
Update existing policy rules in database to use new action names with backward compatibility mapping during transition period.

#### Policy Presets

**Purpose**: Provide framework-specific starting configurations

**Location**: `packages/policy-engine/presets/`

**Preset Files**:

| Framework | File | Key Protections |
|-----------|------|-----------------|
| Next.js | nextjs.json | next.config.js, .env*, middleware.ts |
| React | react.json | package.json, public/index.html |
| Express | express.json | server.js, .env*, routes/* |

**Preset Structure**:

| Field | Type | Purpose |
|-------|------|---------|
| name | string | Display name |
| description | string | Preset explanation |
| pathRules | array | Glob patterns with actions |
| thresholds | object | Risk score limits |

**Example Next.js Preset**:
- Block: `**/.env*`, `**/next.config.*`
- Warn: `**/middleware.ts`, `**/app/layout.tsx`
- Watch: `**/*.tsx`, `**/*.ts`

**Application**:
VS Code command: "SnapBack: Apply Preset" with QuickPick menu for framework selection.

## Security & Privacy

### Data Sanitization Rules

**Automatic Redaction**:

| Data Type | Detection Method | Action |
|-----------|------------------|--------|
| File Paths | Regex pattern | Convert to relative with tilde |
| Email Addresses | Field name match | Remove field |
| API Keys | Pattern: sk-* | Remove field |
| Authorization Headers | Field name match | Remove field |
| Stack Traces | Multiline detection | Truncate to message only |

**Manual Sanitization Points**:
- Before event capture in client
- Before batch transmission
- Before database storage (defense in depth)

### Authentication & Authorization

**Analytics Ingest**:
- Requires authenticated session
- User ID extracted from auth context
- Rate limited per user: 500 events per minute

**Export**:
- Requires authenticated session
- Can only export own user's data
- Rate limited: 10 exports per hour

**Feedback**:
- Requires authenticated session
- Auto-populated userId and apiKeyId
- Rate limited: 1 feedback per 5 minutes

### Storage Security

**Database**:
- Row-level security on analytics_events table
- User can only query own events
- Indexes support efficient user-scoped queries

**S3**:
- Server-side encryption at rest (AES-256)
- Bucket policy restricts to API service role
- Presigned URLs expire after 1 hour
- Object keys namespaced by user ID

## Performance Requirements

### Analytics Client

| Metric | Target | Measurement |
|--------|--------|-------------|
| Capture Latency | < 5ms | Time from call to queue |
| Memory Overhead | < 1MB | Heap size in production |
| Batch Transmission | < 100ms | Network round-trip |

### Server Endpoints

| Endpoint | Target | Load Condition |
|----------|--------|----------------|
| Ingest | < 200ms p95 | 1000 req/min |
| Export Small | < 500ms | < 10MB payload |
| Export Large | < 5s | S3 upload time |

### Database Queries

| Query Type | Target | Row Count |
|------------|--------|-----------|
| Event Insert | < 10ms | Batch of 50 |
| Export Query | < 2s | 100K rows |
| Metrics Aggregation | < 500ms | 1M rows with indexes |

**Index Strategy**:

| Table | Columns | Purpose |
|-------|---------|---------|
| analytics_events | (userId, createdAt) | Export queries |
| analytics_events | (name, createdAt) | Aggregation queries |
| analytics_events | (userId, name) | Filtering |

## Error Handling

### Client-Side Errors

| Error Condition | Behavior | User Impact |
|-----------------|----------|-------------|
| Network Failure | Silent drop | None, events lost |
| Invalid Event Schema | Log to console | Development only |
| Queue Overflow | Drop oldest | Prevent memory leak |

### Server-Side Errors

| Error Condition | Response | Logging |
|-----------------|----------|---------|
| Validation Failure | 400 Bad Request | Warn level |
| Authentication Failure | 401 Unauthorized | Info level |
| Database Unavailable | 503 Service Unavailable | Error level |
| S3 Unavailable | 503 Service Unavailable | Error level |

**User-Facing Messages**:
- "Analytics unavailable, please try again later"
- "Export generation failed, please contact support"
- "Feedback submission failed, please retry"

## Testing Strategy

### Unit Tests

#### Analytics Client Privacy Tests

**Location**: `packages/analytics-client/tests/allowlist.test.ts`

**Test Cases**:

| Test | Input | Expected Output |
|------|-------|----------------|
| Drop unknown keys | { fileCount: 3, secret: "sk_test" } | { fileCount: 3 } |
| Scrub email | { email: "user@example.com" } | {} (field dropped) |
| Scrub file path | { filePath: "/Users/alice/app/.env" } | {} (field dropped) |
| Scrub API key | { token: "sk_live_abc..." } | {} (field dropped) |
| Keep allowed only | { fileCount: 5, bytes: 1234, hack: "bad" } | { fileCount: 5, bytes: 1234 } |

**Coverage Target**: 100% for privacy functions (critical path)

#### Server Ingest Privacy Tests

**Location**: `apps/api/modules/analytics/procedures/ingest.test.ts`

**Test Cases**:

| Test | Assertion |
|------|-----------||
| Never forwards $ip | PostHog properties.$ip === undefined |
| Strips file paths | Meta contains no absolute paths |
| Enforces allowlist | Only allowlisted fields present |
| Pseudonymizes userId | distinctId !== real userId |
| Free tier opt-in | Returns 0 if telemetry off |
| HMAC consistency | Same userId always produces same hash |

**Coverage Target**: 80%

### Integration Tests

| Flow | Scope | Assertion |
|------|-------|-----------||
| Event Capture | Client to DB | Event persisted correctly |
| Export Generation | API to S3 | File accessible via presigned URL |
| Feedback Submission | Extension to DB | Feedback record created |
| LocalStack Upload | Export to LocalStack | Presigned URL works in CI |
| MailHog Delivery | Email sent to MailHog | API returns message |

### End-to-End Tests

#### Rate Limit Header Tests

**Location**: `tests/e2e/rate-limits.spec.ts`

**Test Scenarios**:

| Scenario | Playwright Assertion |
|----------|---------------------|
| First request | response.headers['x-ratelimit-limit'] === '100' |
| After 50 requests | response.headers['x-ratelimit-remaining'] === '50' |
| Exceeds limit | response.status === 429 |
| Has Retry-After | response.headers['retry-after'] matches integer |

#### Email Verification Tests

**Location**: `tests/e2e/email-flows.spec.ts`

**Test Pattern**:

1. Trigger password reset
2. await fetch('http://localhost:8025/api/v2/messages')
3. Assert message subject contains "Password Reset"
4. Extract link from HTML body
5. Navigate to link and complete flow

#### S3 Export Tests

**Location**: `tests/e2e/export.spec.ts`

**Test Pattern**:

1. Generate export > 10MB
2. Assert response.mode === 'url'
3. Assert response.url.includes('localhost:4566')
4. Fetch presigned URL
5. Verify downloaded content matches expected

**Test Cases**:

| Scenario | User Action | Expected Outcome |
|----------|-------------|------------------||
| Create Snapshot | Save file in VS Code | SNAPSHOT_CREATED event in DB |
| Download Small Export | Click export (< 10MB) | Inline CSV downloads |
| Download Large Export | Click export (> 10MB) | S3 presigned URL returned |
| Submit Feedback | Complete feedback flow | Toast notification shown |
| Rate Limit Hit | Send 101 requests | 429 with headers |

## Deployment Plan

### Phase 0 (Day 1)

**Deliverables**:
- Toolchain pinned (.tool-versions or Volta)
- Environment validation via Zod
- Analytics event types with allowlists defined
- Privacy sanitizer library implemented
- Terminology audit complete

**Validation**:
- Node 20.11.0 and pnpm 10.14.0 enforced
- CI fails on missing env vars
- Types compile without errors
- Privacy unit tests pass
- No "recover" in user-facing strings

### Phase 1 (Days 2-3)

**Deliverables**:
- Server ingest endpoint with allowlist enforcement ✅ **COMPLETE** (apps/api/modules/analytics/procedures/ingest-events.ts)
- Pseudonymous ID generation ⚠️ **TODO** (needs HMAC implementation)
- Free tier opt-in UI and logic ❌ **MISSING**
- Web and extension track functions ✅ **COMPLETE** (posthog-client.tsx, AnalyticsService)
- Basic metrics view available ⚠️ **PARTIAL** (analytics router has get procedures)

**Implementation Status** (Rescan verified):
- ✅ **apps/api/modules/analytics/procedures/ingest-events.ts** (113 lines, tRPC procedure):
  - Writes to `analyticsEvents` table
  - Forwards to PostHog via posthog-node
  - Lazy initialization of PostHog client
  - Error handling with partial success tracking
- ✅ **Router export verified** - Line 24 of apps/api/modules/analytics/router.ts
- ✅ **Client wrapper exists** - apps/web/lib/posthog-client.tsx (125 lines):
  - PostHogProvider with React hooks
  - Manual pageview tracking
  - Selective autocapture (click, submit on button/a/form)
  - Session recording with sensitive field masking
- ✅ **AnalyticsService wraps client** - Uses `captureEventClient` helper (no direct PostHog calls)
- ⚠️ **Schema mismatch** - Current uses generic `name/meta`, design specifies ProductAnalyticsEvent discriminated union
- ❌ **Missing opt-in logic** - Free tier telemetry preference not implemented

**Remaining Tasks** (6 hours):
1. Implement HMAC pseudonymous ID generation (2h)
2. Add free tier opt-in UI and backend logic (2h)
3. Align event schema with ProductAnalyticsEvent types (2h)

**Validation**:
- ✅ Events flow from web client via posthog-client.tsx
- ✅ Server receives events via tRPC ingestEvents mutation
- ⚠️ PostHog receives events (needs PII verification)
- ❌ Free tier respects opt-in (not implemented)
- ✅ Database contains events in analyticsEvents table
- ⚠️ Metrics page renders (procedures exist, UI unclear)
- ✅ **NO direct posthog.capture() calls** (grep verified: 0 matches)
- ✅ **Router exports ingestEvents** (verified at line 24)

### Phase 2 (Day 4)

**Deliverables**:
- Export functionality with size threshold
- LocalStack S3 testing setup
- Frontend download helper
- Presigned URL generation

**Validation**:
- Small exports download inline
- Large exports via presigned URL
- LocalStack tests pass in CI
- Both CSV and JSON formats work

### Phase 3 (Days 5-6)

**Deliverables**:
- PostHog usage guard script
- Environment validation script
- Toolchain version checks
- Lighthouse CI integration
- Link checker integration
- Rate limit header tests
- MailHog email verification
- GitHub Job Summary
- VS Code feedback command
- Web feedback modal
- NPS timing logic

**Validation**:
- Guard detects seeded violations
- All CI gates pass
- Lighthouse scores >= 90
- Zero broken links
- Rate limit headers present
- Feedback reaches database
- Alpha score table in PR summary

### Phase 4 (Day 7)

**Deliverables**:
- Policy actions renamed (watch/warn/block)
- Framework presets added
- CI checks enabled for terminology
- Final integration testing

**Validation**:
- Presets apply correctly
- Old terminology fails CI
- Extension commands work
- All acceptance gates green

## Rollout Strategy

### Alpha Release Criteria

**Must Have**:
- All analytics events instrumented across platforms
- Privacy sanitization verified (no PII in PostHog)
- Free tier telemetry opt-in functional
- Export functionality tested with real data (inline and S3)
- Feedback collection operational
- Performance gates met (Lighthouse >= 90)
- Toolchain pinned and validated
- Environment variables validated via Zod
- PostHog guard prevents client-side usage
- Rate limit headers exposed and tested
- MailHog email verification working
- LocalStack S3 testing passing
- GitHub Job Summary showing Alpha score
- Link checker passing (zero failures)
- All CI quality gates green

**Nice to Have**:
- PostHog dashboards configured
- Advanced metrics visualizations
- Multi-language support for feedback

### Monitoring

**Key Metrics**:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Event Ingestion Rate | 1000/min | > 5000/min |
| Export Success Rate | > 95% | < 90% |
| Client Error Rate | < 1% | > 5% |
| P95 API Latency | < 500ms | > 1000ms |

**Observability**:
- PostHog dashboards for event volumes
- CloudWatch alarms for API errors
- Sentry for client-side exceptions

### Rollback Plan

**Trigger Conditions**:
- Critical bug affecting core functionality
- Data loss or corruption
- Performance degradation > 2x baseline

**Rollback Steps**:
1. Disable analytics ingestion via feature flag
2. Roll back API to previous version
3. Disable export functionality
4. Restore database from backup if needed
5. Communicate status to alpha users

## Future Enhancements

**Post-Alpha Improvements**:
- Streaming exports for very large datasets
- Real-time analytics dashboards with WebSocket updates
- Custom event definitions per organization
- A/B testing framework integration
- GDPR data deletion workflows
- Multi-tenant analytics isolation

**Performance Optimizations**:
- Event deduplication at ingestion
- Hot/cold data partitioning
- CDN distribution for exports
- Incremental export generation

## Open Questions

1. Should analytics events be immutable or allow updates?
   - Recommendation: Immutable for audit trail integrity

2. What is the retention policy for analytics data?
   - Recommendation: 90 days for free tier, 1 year for paid tiers

3. Should exports be stored permanently or expire?
   - Recommendation: 7-day TTL on S3 exports with lifecycle policy

4. How do we handle timezone differences in exports?
   - Recommendation: Always UTC with ISO 8601 format

5. Should feedback be anonymous or attributed?
   - Recommendation: Attributed with opt-in for anonymous submission| Metric | Calculation | Display Format |
