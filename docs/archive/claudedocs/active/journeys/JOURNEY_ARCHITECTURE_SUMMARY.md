# User Journey Architecture - Executive Summary

## System at a Glance

```
📱 CLIENTS                  🔄 PROCESSING              🧠 INTELLIGENCE           📨 DELIVERY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VS Code Extension          Event Router               Journey Detector          Email (Resend)
CLI Tool           ──────► Deduplication     ──────►  State Machine    ──────► In-App Messages
Web App                    Enrichment                 Pattern Matching          HubSpot CRM
MCP Server                 PII Sanitization           Progression Tracking      Push (future)

                           PostHog Analytics
                           Database Persistence
```

## Core Components

### 1. Event Processing Pipeline

-   **Input**: Multi-platform events (VS Code, CLI, Web, MCP)
-   **Processing**: Dedupe (Redis) → Enrich (user/subscription context) → Sanitize (GDPR)
-   **Output**: Stored events + PostHog sync + Journey detection triggered

### 2. Journey Intelligence Engine

-   **State Machine**: 8 user states (Visitor → Free → Trial → Paid → Churned → Reactivated)
-   **Pattern Detection**: 24 journey patterns tracked simultaneously
-   **Progression Tracking**: Real-time journey completion percentages
-   **Output**: Journey state updates + Communication triggers

### 3. Communication Orchestration

-   **Trigger Evaluation**: 100+ rules evaluated per event
-   **Frequency Capping**: Anti-spam (3 emails/day, 10/week max)
-   **Scheduling**: BullMQ queue with delay support
-   **Channels**: Email, In-app, HubSpot sequences

## Database Schema (5 New Tables)

```sql
user_journey_states         -- User state & active journeys
journey_events              -- Event stream for analytics
communication_touchpoints   -- Delivery history & tracking
communication_frequency     -- Anti-spam limits
journey_trigger_rules       -- Configurable trigger conditions
```

## Technology Decisions

### Build Custom

✅ Event ingestion API (extend existing)
✅ Journey state machine (core IP)
✅ Pattern detection engine
✅ Trigger evaluation system

### Use Existing/Libraries

✅ PostHog (analytics) - already integrated
✅ HubSpot SDK (CRM sync) - already installed
✅ Resend (email delivery) - already setup
✅ BullMQ (job queue) - **NEW dependency**
✅ Redis (dedup/cache) - already installed

## Key Architectural Patterns

### Event Flow

```
1. Client emits event → API endpoint
2. Deduplicate (Redis cache, 1-hour window)
3. Enrich with user/subscription context
4. Process through state machine
5. Detect triggered journeys
6. Evaluate communication triggers
7. Persist to database
8. Sync to PostHog (async)
9. Sync to HubSpot (async, batched)
10. Schedule communications (BullMQ)
```

### Real-time vs Batch

-   **Real-time**: State transitions, high-priority triggers, in-app messages
-   **Batch**: Journey progression calc, analytics aggregation, email sending, CRM sync

## Scalability Profile

### Current Capacity (no changes)

-   10,000 users
-   500,000 events/day
-   6 events/second average
-   18 events/second peak

### Bottleneck Analysis

-   **Database writes**: 6-10/sec (PostgreSQL handles 10,000+/sec) ✅
-   **PostHog API**: Batched, async (no blocking) ✅
-   **Redis**: Millions ops/sec (no issue) ✅
-   **Email delivery**: Queue-based (scales horizontally) ✅

### When to Scale

-   Read replicas: >100K users
-   Horizontal API scaling: >500K users
-   Event stream (Kafka): >1M users

## Privacy & Compliance

### GDPR Measures

✅ PII sanitization (auto-remove email, passwords, tokens)
✅ File path anonymization (remove usernames)
✅ User consent tracking (analytics/marketing/product)
✅ Opt-out handling (email/in-app/push)
✅ Data retention (2yr events, 1yr communications, 30d deletion)

### Data Minimization

-   Only track essential properties
-   Hash workspace identifiers
-   No code content capture
-   Aggregate metrics for analytics

## Implementation Timeline

```
Week 1-2: Database schema + Event tracking foundation
Week 3-4: Journey state machine + Pattern detection
Week 5-6: Communication engine + Trigger system
Week 7:   HubSpot integration + CRM sync
Week 8:   Analytics dashboards + Monitoring
```

## API Changes Required

### New Endpoint

```typescript
POST /api/telemetry/journey-event

// Enhanced from existing /api/telemetry/event
{
  event: string,
  category: "lifecycle" | "feature_usage" | "conversion" | "engagement",
  properties: Record<string, unknown>,
  platform: "vscode" | "cli" | "web" | "mcp",
  clientVersion?: string,
  sessionId?: string
}

// Returns
{
  success: true,
  stateChanged: boolean,
  triggeredJourneys: string[],
  scheduledCommunications: number
}
```

## Monitoring Metrics

### Event Health

-   Events ingested/min
-   Processing latency (p50, p95, p99)
-   Deduplication rate
-   PostHog sync success

### Journey Metrics

-   State transitions/hour
-   Journey completion rates
-   Journey abandonment rates
-   Active journeys/user

### Communication Metrics

-   Touchpoints scheduled/hour
-   Delivery success rates
-   Frequency cap violations
-   Email open/click rates

## Risk Mitigation

### Event Loss Prevention

-   Idempotency keys (deduplication)
-   Client retry logic
-   Database transaction safety
-   Queue persistence (BullMQ)

### Performance Protection

-   Connection pooling (Drizzle)
-   Redis caching (5-min TTL)
-   Async external calls (PostHog, HubSpot)
-   Database indexing strategy

### Anti-Spam Protection

-   Frequency limits (3/day, 10/week)
-   Opt-out enforcement
-   Channel-specific caps
-   Time-based windows

## Integration Points

### Existing Systems

-   **Better Auth**: User authentication context
-   **Stripe**: Payment events → Journey triggers
-   **API Keys**: Platform attribution
-   **Subscriptions**: Plan-based journey logic

### External Services

-   **PostHog**: Analytics warehouse, experiments
-   **HubSpot**: Marketing automation, email sequences
-   **Resend**: Transactional email delivery

## Success Criteria

✅ 100+ communication touchpoints configured
✅ 24 user journeys tracked and optimized
✅ Multi-platform event tracking (4+ platforms)
✅ <5s journey detection latency
✅ 99.9% event delivery reliability
✅ GDPR compliant with full audit trail
✅ <50ms API response time (p95)
✅ Zero PII leakage to analytics platforms

## Cost Analysis

### Infrastructure Costs (Monthly)

-   **Database storage**: +5GB (~$0.50/month in Supabase)
-   **Redis memory**: +500MB (~$5/month in Redis Cloud)
-   **PostHog events**: 500K/day = 15M/month (Free tier: 1M, then $0.000225/event)
-   **HubSpot API**: Included in existing plan
-   **Email delivery**: Resend pricing (existing)

**Total incremental cost**: ~$10-50/month for 10K users

### Development Investment

-   **Weeks**: 8 weeks (1 engineer)
-   **LOC**: ~5,000 lines (TypeScript)
-   **New dependencies**: 1 (BullMQ)
-   **Database migrations**: 5 new tables

## Next Actions

1. **Approve architecture** and technology choices
2. **Prioritize journeys** (which 8-12 to implement first)
3. **Design email templates** for priority journeys
4. **Create database migrations** (Phase 1)
5. **Setup monitoring dashboards** (PostHog, Grafana)

---

**Questions to Answer**:

-   Which 8-12 journeys are highest priority? (Recommendation: Start with conversion journeys: trial activation, limit hit, trial ending, winback)
-   Email sending volume expectations? (For Resend pricing estimation)
-   PostHog plan tier? (Free tier: 1M events/month)
-   HubSpot workflow integration depth? (Basic contact sync vs full automation)
-   Timeline pressure? (8 weeks is conservative, can accelerate to 6 weeks if needed)

---

_For full technical details, see: USER_JOURNEY_ARCHITECTURE.md_
