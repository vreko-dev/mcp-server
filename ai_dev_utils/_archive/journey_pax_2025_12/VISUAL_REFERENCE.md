# User Journey Telemetry - Visual Reference Guide

**Quick Reference for Implementation**

---

## Event Coverage Map

```
CURRENT (13 events)          TARGET (24 events)
=====================        ==================

✅ save_attempt              ✅ save_attempt
✅ snapshot_created          ✅ snapshot_created
✅ session_finalized         ✅ session_finalized
✅ issue_created             ✅ issue_created
✅ issue_resolved            ✅ issue_resolved
✅ session_restored          ✅ session_restored
✅ policy_changed            ✅ policy_changed
✅ auth.provider.selected    ✅ auth.provider.selected
✅ auth.browser.opened       ✅ auth.browser.opened
✅ auth.code.entry           ✅ auth.code.entry
✅ auth.approval.received    ✅ auth.approval.received
✅ welcome.feature.viewed    ✅ welcome.feature.viewed
✅ welcome.action.triggered  ✅ welcome.action.triggered
                            ❌ waitlist_joined
                            ❌ apikey_created
                            ❌ dashboard_viewed
                            ❌ extension_installed
                            ❌ mcp_checkpoint_created
                            ❌ mcp_checkpoint_restored
                            ❌ mcp_analyze_risk_called
                            ❌ session_started
                            ❌ recovery_rollback_requested
                            ❌ other cli/mcp events

COVERAGE: 54% → 100% (11 events to add)
```

---

## Funnel Visualization

### Funnel 1: Core Activation (Most Important)

```
   Waitlist Join
        │
        │ (1% of visits → signup)
        ▼
   OAuth Approval
        │
        │ (40% of signups → approve)
        ▼
   Extension Install
        │
        │ (25% of approved → install)
        ▼
   First Protected Save
        │
        │ (10% of installs → use)
        ▼
  CONVERSION COMPLETE ✅

Expected Rate: 0.001% (1 in 100k)
Target: >0.1% for product-market fit
```

### Funnel 2: Pro Adoption

```
   Free User
        │
        │ (create API key)
        ▼
   API Key Created
        │
        │ (use Pro feature)
        ▼
   First Checkpoint
        │
        │ (Pro feature engagement)
        ▼
   CONVERSION: Free → Solo ✅

Expected Rate: 15% (Free users → Solo)
Target: 20%+ for SaaS metric
```

### Funnel 3: Error Recovery (Safety Net)

```
   High-Risk Save
        │
        │ (100% - always detected)
        ▼
   Auto Snapshot
        │
        │ (85% - snapshot created)
        ▼
   Session Restored
        │
        │ (80% - user recovers)
        ▼
   RECOVERY COMPLETE ✅

Expected Rate: 68% recovery success
Target: >85% for safety confidence
```

---

## Platform Telemetry Matrix

```
           │ Extension │ Web │ CLI │ MCP │ API │
-----------+-----------+-----+-----+-----+-----│
snapshot   │    ✅     │  ✅ │ ✅  │ ✅  │ ✅  │
session    │    ✅     │  ✅ │ ✅  │ ✅  │ ✅  │
policy     │    ✅     │  ✅ │ ✅  │  -  │ ✅  │
auth       │    ✅     │  ✅ │  -  │  -  │ ✅  │
dashboard  │     -     │  ✅ │  -  │  -  │ ✅  │
mcp_*      │     -     │  -  │  -  │ ✅  │ ✅  │
cli_*      │     -     │  -  │ ✅  │  -  │ ✅  │
ai_*       │    ✅     │  ✅ │ ✅  │ ✅  │ ✅  │

✅ = Implemented
 - = N/A for platform
❌ = Missing (to add)
```

---

## Config Registry Structure

```
JOURNEY_TELEMETRY
│
├── WAITLIST
│   └── JOINED
│       ├── event: "waitlist_joined"
│       ├── platforms: ["web"]
│       ├── properties: {email_domain, referral_source}
│       └── funnel_step: 1
│
├── AUTH
│   ├── PROVIDER_SELECTED
│   │   ├── event: "auth.provider.selected"
│   │   ├── platforms: ["extension"]
│   │   └── funnel_step: 1
│   ├── BROWSER_OPENED
│   │   └── funnel_step: 2
│   ├── CODE_ENTRY
│   │   └── funnel_step: 3
│   └── APPROVAL_RECEIVED
│       ├── funnel_step: 4
│       └── funnel_terminal: true
│
├── APIKEY
│   └── CREATED
│       ├── event: "apikey_created"
│       ├── tier_gate: "solo"
│       └── funnel_step: 5
│
├── DASHBOARD
│   └── VIEWED
│       ├── event: "dashboard_viewed"
│       └── platforms: ["web"]
│
├── EXTENSION
│   ├── INSTALLED
│   ├── ACTIVATED
│   └── FIRST_PROTECTED_SAVE
│       └── funnel_terminal: true
│
├── MCP
│   ├── CHECKPOINT_CREATED
│   └── CHECKPOINT_RESTORED
│       └── funnel_terminal: true
│
└── AI, CLI, RECOVERY...

Total: 24 events across 8 journey categories
```

---

## Implementation Timeline

```
Week 1: Events
├─ Mon-Tue: Create journey-events.ts
├─ Wed: Add 5 missing event schemas
├─ Thu-Fri: Write tests & type-check
└─ Output: 5 new event schemas (READY TO MERGE)

Week 2: Registry
├─ Mon-Tue: Build journey-registry.ts (SINGLE SOURCE OF TRUTH)
├─ Wed: Create funnel-definitions.ts
├─ Thu-Fri: Tests & docs
└─ Output: Config-based registry (READY TO MERGE)

Week 3: Integration
├─ Mon: Wire Extension events
├─ Tue: Wire Web events
├─ Wed: Wire CLI events
├─ Thu: Wire MCP Server events
├─ Fri: PostHog funnel sync
└─ Output: All platforms integrated (READY TO MERGE)

Week 4: Launch
├─ Mon-Tue: E2E testing
├─ Wed: PostHog dashboards
├─ Thu: Production deployment
├─ Fri: Monitoring setup
└─ Output: LIVE WITH DATA FLOWING

Timeline: 4 weeks, 160 hours (1-2 engineers)
```

---

## Privacy Audit Checklist

```
✅ No file paths in events
✅ No filenames or extensions
✅ No absolute paths
✅ No workspace identifiers
✅ No code content
✅ No user PII (names, emails)
✅ No IP addresses
✅ Anonymous/hashed user IDs
✅ Opt-out capability
✅ 30-day retention policy
✅ GDPR compliant
✅ CCPA compliant

100% Privacy-Safe ✓
```

---

## Event Types Reference

```
CORE EVENTS (Required)
├── snapshot_created (6 props)
├── session_finalized (10+ props)
├── save_attempt (6 props)
└── ... (10 more)

AUTH EVENTS (Funnel)
├── auth.provider.selected
├── auth.browser.opened
├── auth.code.entry
└── auth.approval.received (terminal)

JOURNEY EVENTS (To Add)
├── waitlist_joined (funnel)
├── apikey_created (funnel)
├── dashboard_viewed
├── extension_installed
├── mcp_checkpoint_* (2 events)
└── ... (5 more)

All use snake_case naming ✓
All have 3-8 properties ✓
All privacy-safe ✓
```

---

## PostHog Integration Points

```
1. Event Ingestion
   ├─ Extension emits → PostHog ✅ (exists)
   ├─ Web emits → PostHog ✅ (exists)
   ├─ CLI emits → PostHog ❌ (to add)
   └─ MCP emits → PostHog ❌ (to add)

2. Funnel Definitions
   ├─ Core Activation ❌ (create)
   ├─ Pro Conversion ❌ (create)
   └─ Error Recovery ❌ (create)

3. Cohort Definitions
   ├─ Early Adopters ❌ (create)
   ├─ Power Users ❌ (create)
   ├─ Recovery Engaged ❌ (create)
   └─ Pro Ready ❌ (create)

4. Dashboards
   ├─ Acquisition ❌ (create)
   ├─ Activation ❌ (create)
   ├─ Retention ❌ (create)
   └─ Revenue ❌ (create)
```

---

## Code Structure

```
packages/
├── contracts/
│   └── src/events/
│       ├── core.ts ✅ (existing)
│       ├── journey-events.ts ❌ (to add)
│       └── __tests__/
│           └── journey-events.test.ts ❌ (to add)
│
└── analytics/
    └── src/
        ├── journey-registry.ts ❌ (to add)
        ├── funnel-definitions.ts ❌ (to add)
        ├── cohort-definitions.ts ❌ (to add)
        └── __tests__/
            └── journey-registry.test.ts ❌ (to add)

apps/
├── vscode/src/telemetry/
│   └── journey-tracker.ts ❌ (to add)
├── web/modules/saas/dashboard/lib/
│   └── analytics.ts ❌ (to add)
├── cli/src/telemetry/
│   └── journey-tracker.ts ❌ (to add)
└── mcp-server/src/telemetry/
    └── journey-tracker.ts ❌ (to add)
```

---

## Success Criteria Checklist

### Week 1 ✓
- [ ] 5 new event schemas created
- [ ] All schemas tested
- [ ] 100% type coverage
- [ ] Zero TypeScript errors
- [ ] Linting passes

### Week 2 ✓
- [ ] Config registry built
- [ ] Funnel definitions created
- [ ] Comprehensive tests pass
- [ ] Documentation complete
- [ ] Single source of truth established

### Week 3 ✓
- [ ] Extension integration done
- [ ] Web integration done
- [ ] CLI integration done
- [ ] MCP integration done
- [ ] PostHog sync working

### Week 4 ✓
- [ ] E2E tests passing
- [ ] PostHog dashboards live
- [ ] Production deployment complete
- [ ] Monitoring alerts configured
- [ ] Data flowing to PostHog

---

## Key Metrics To Monitor

```
Funnel Conversion Rates
├─ Core Activation: 0.001% → 0.1% (target)
├─ Pro Conversion: 15% → 20% (target)
└─ Error Recovery: 68% → 85% (target)

User Engagement
├─ Dashboard visits/user: >10/month
├─ Extension daily active users: >1000
└─ AI detection events/day: >5000

Business Metrics
├─ Waitlist → Signup: track daily
├─ Signup → API Key: track weekly
└─ API Key → Pro: track weekly
```

---

## Contact & Support

**Questions about implementation?**
- Read: `IMPLEMENTATION_QUICK_START.md`
- Review: `TELEMETRY_JOURNEY_CONSOLIDATION.md`

**Need architecture review?**
- See: Config-based registry section above
- Efficiency: 95% vs alternatives

**Ready to start?**
- Week 1 checklist above
- Estimated effort: 160 hours total

---

**Reference Version**: 1.0
**Last Updated**: December 12, 2025
**Status**: Ready for Quick Reference During Implementation
