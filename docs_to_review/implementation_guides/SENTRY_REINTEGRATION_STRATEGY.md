# Sentry Reintegration Strategy

## Executive Summary

✅ **Safe to reintegrate Sentry** - The removal was due to temporary dependency issues, not architectural concerns. Current infrastructure stack (Prometheus, Grafana, Jaeger) is now mature enough to support Sentry as a complementary error tracking layer.

---

## Historical Context

### Why Sentry Was Removed

**Timeline:**
- **Nov 16, 2025** (44b7bb1c2): Removed sentry test page (cleanup only)
- **Nov 28, 2025** (ae3cdaef1): **Disabled Sentry in frontend** - Reason:
  ```
  - Remove @sentry/nextjs from dependencies (requires @sentry/core which isn't available)
  - Error tracking should be configured in apps/api backend
  ```
- **Nov 28, 2025** (24326bf9c): Removed Sentry imports from components
- **Nov 28, 2025** (86e43caf6): **Reverted Sentry removal** - Restored imports for backend compatibility

### Decision Context

The Sentry removal was **NOT** a philosophical rejection. Instead:

1. **Frontend Dependencies Issue**: `@sentry/nextjs` required `@sentry/core` which created version conflicts
2. **Deployment Model**: Frontend was deployed frontend-only (no backend integration) at that time
3. **Backend-First Approach**: Decision was made to implement Sentry on `apps/api` where `@sentry/node` was already available
4. **Temporary Disabling**: Used `DISABLE_SENTRY="true"` flag rather than complete removal

### Current Infrastructure State

```
✅ @sentry/node is STILL in apps/api/package.json (catalog:)
✅ SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT configured
✅ DISABLE_SENTRY="true" explicitly disables it, not missing it
❌ Integration code is not present (was removed during cleanup)
```

---

## Current Observability Stack

Your platform now has **four-pillar observability**:

### 1. Metrics Collection (Prometheus)
- Application metrics via `@snapback/infrastructure`
- Time-series data storage
- PromQL queries
- Accessible at http://localhost:9090

### 2. Visualization (Grafana)
- Real-time dashboards
- Alert rules and notifications
- Multi-datasource support
- Accessible at http://localhost:3002 (admin/admin)

### 3. Distributed Tracing (Jaeger)
- Request flow across services
- Latency analysis
- Service dependency mapping
- Accessible at http://localhost:16686

### 4. Cache Management (Redis Insight)
- Real-time cache monitoring
- Memory analysis
- Key pattern exploration
- Accessible at http://localhost:8001

**What's Missing**: Error aggregation and user impact analysis

---

## Why Add Sentry Now?

### Complementary Value

Sentry fills a **specific gap** that metrics, tracing, and dashboards don't cover:

| Tool | Metrics | Traces | Errors | User Impact | Source Maps | Release Tracking |
|------|---------|--------|--------|-------------|-------------|------------------|
| Prometheus | ✅ | ❌ | ⚠️ (as metrics) | ❌ | ❌ | ❌ |
| Jaeger | ❌ | ✅ | ⚠️ (in traces) | ❌ | ❌ | ❌ |
| **Sentry** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |

### Specific Capabilities Sentry Provides

1. **Error Aggregation & Deduplication**
   ```
   Captures unhandled exceptions automatically
   Groups similar errors together
   Tracks error frequency and trends
   ```

2. **User Impact Analysis**
   ```
   Which users were affected by errors?
   How many users experienced the issue?
   Error recovery actions (breadcrumbs)
   ```

3. **Release Tracking**
   ```
   When did this error first appear?
   Was it introduced in version X?
   Has this been fixed in latest release?
   ```

4. **Source Maps**
   ```
   Minified production code → readable source
   Stack traces point to original source lines
   Critical for production debugging
   ```

5. **Smart Alerting**
   ```
   Alert when new error type appears
   Escalate if error spike detected
   Notify relevant team members
   ```

### Business Value

- **Faster MTTR** (Mean Time To Recovery): Know about errors before users report them
- **Proactive Monitoring**: Detect regressions in production immediately
- **User Trust**: Fix issues affecting real users faster
- **Release Safety**: Know if a deployment introduced new errors
- **Team Accountability**: Track which features/teams have highest error rates

---

## Reintegration Plan

### Phase 1: Backend Error Tracking (apps/api) - **RECOMMENDED FIRST**

**Why First?**:
- Highest impact (backend errors affect all users)
- Simpler integration (`@sentry/node` already in catalog)
- No dependency issues
- Immediate production value

**Implementation**:

```typescript
// apps/api/src/middleware/sentry.ts
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export function initSentry() {
  if (process.env.DISABLE_SENTRY === "true") {
    return; // Respect disable flag
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({
        request: true,
        serverName: false,
      }),
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    release: process.env.GIT_SHA || "unknown",
  });
}

export function expressSentryMiddleware() {
  return [
    Sentry.Handlers.requestHandler(),
    Sentry.Handlers.errorHandler(),
  ];
}
```

**Integration Points**:
- Request/Response tracking
- Error capturing
- Performance monitoring (profiling)
- Distributed tracing with Jaeger

**Configuration**:
```bash
# .env (add or update)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
DISABLE_SENTRY=false  # Enable it
NODE_ENV=production
GIT_SHA=$(git rev-parse --short HEAD)
```

---

### Phase 2: Frontend Error Tracking (apps/web) - **AFTER BACKEND STABLE**

**Why Second?**:
- Requires resolving `@sentry/nextjs` dependency issues
- Can be done after backend validation
- Provides user session context

**Considerations**:
- Use `@sentry/nextjs` if dependency issues are resolved (v8.0+)
- Alternative: Use `@sentry/browser` with manual Next.js integration
- Implement source map upload to Sentry in build pipeline

```typescript
// apps/web/instrumentation.ts
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NODE_ENV === "production") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_BUILD_ID,
    });
  }
}
```

---

### Phase 3: CLI & Other Services - **OPTIONAL**

**Services to Consider**:
- `apps/cli`: User-facing, errors should be reported
- `apps/mcp-server`: Integration errors affect enterprise users
- `apps/docs`: Lower priority (static content)

---

## Integration with Existing Stack

### How Sentry Complements Your Observability

```
┌─────────────────────────────────────────────────────────┐
│                    Application Code                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Logger] ──→ stdout/JSON                               │
│  [Metrics] ──→ Prometheus (counters, gauges, histograms)│
│  [Tracing] ──→ Jaeger (request flows, latencies)        │
│  [Errors] ───→ Sentry (exceptions, breadcrumbs, context)│
│                                                          │
├─────────────────────────────────────────────────────────┤
│                  Observability Stack                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Sentry              Prometheus         Jaeger          │
│  ├─ Errors           ├─ Metrics         ├─ Traces       │
│  ├─ Issues           ├─ Alerts          ├─ Spans        │
│  ├─ Releases         └─ Time-series     └─ Dependencies │
│  └─ Source Maps                                         │
│                                                          │
│  ↓          ↓               ↓               ↓            │
│                                                          │
│       Grafana (Visualization)                           │
│       Sentry UI (Error Investigation)                   │
│       Redis Insight (Cache Analysis)                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Data Flow Integration

**Without Sentry** (Current):
```
Error occurs → Logger writes to stdout → Prometheus scrapes metrics → Grafana shows error rate
(Coarse-grained, slow feedback loop, no context)
```

**With Sentry** (Proposed):
```
Error occurs → Sentry captures immediately → Alert sent → Sentry UI shows stack trace + context
(Fine-grained, real-time, rich debugging info)
```

**Combined Strategy**:
- Sentry: Real-time error investigation
- Prometheus: Long-term error trends
- Jaeger: Distributed request tracing
- Grafana: Correlated dashboards with all data

---

## Implementation Checklist

### Prerequisites
- [ ] Sentry project created (free tier available at sentry.io)
- [ ] SENTRY_DSN obtained from project settings
- [ ] Git SHA available in deployment pipeline
- [ ] Npm catalog already has `@sentry/node`

### Phase 1: Backend (apps/api)
- [ ] Create `apps/api/src/middleware/sentry.ts`
- [ ] Update `apps/api/src/index.ts` to initialize Sentry
- [ ] Add error handler middleware
- [ ] Update `.env.example` with SENTRY_DSN
- [ ] Set `DISABLE_SENTRY=false` in production `.env`
- [ ] Deploy to staging and test
- [ ] Verify errors appear in Sentry dashboard
- [ ] Document in `/packages/infrastructure/README.md`

### Phase 2: Frontend (apps/web) - *Optional, post-stabilization*
- [ ] Evaluate `@sentry/nextjs` version compatibility
- [ ] Install dependency if compatible
- [ ] Add `instrumentation.ts` integration
- [ ] Configure source map uploads in build
- [ ] Add release tracking
- [ ] Test error capturing in development

### Documentation
- [ ] Add Sentry section to infrastructure docs
- [ ] Document error tracking workflow
- [ ] Create runbook for common error scenarios
- [ ] Link to Sentry alerts from Grafana dashboards

---

## Risk Assessment

### Low Risk Factors ✅

1. **Dependency Already Available**
   - `@sentry/node` is already in `pnpm-workspace.yaml` catalog
   - No new dependency conflicts expected

2. **Non-Blocking Service**
   - Sentry is optional/complimentary
   - Fallback gracefully if DSN is missing
   - Can be disabled with `DISABLE_SENTRY=true`

3. **Historical Success**
   - Was previously integrated (reason for removal was cleanup, not rejection)
   - Revert commits show it worked
   - Many large projects use Sentry successfully

4. **Backward Compatible**
   - Current code doesn't depend on Sentry
   - Can add without breaking changes
   - Staged rollout possible (backend first)

### Medium Risk Factors ⚠️

1. **Frontend Dependencies**
   - `@sentry/nextjs` had issues before
   - Recommend starting with backend only
   - Frontend can be added later when proven stable

2. **Performance Impact**
   - Error capturing adds minimal overhead
   - Sampling reduces impact (tracesSampleRate: 0.1)
   - Should be measured in staging

3. **Data Privacy**
   - Sentry may see request data/cookies
   - Configure to scrub sensitive fields
   - Use allowUrls/denyUrls to limit scope

### Mitigation Strategies

```typescript
// Only capture errors, not performance data initially
Sentry.init({
  tracesSampleRate: 0.01, // Very low sample rate
  beforeSend: (event, hint) => {
    // Filter out sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});
```

---

## Comparison: Sentry vs Current Stack

| Scenario | Current Stack | With Sentry |
|----------|---|---|
| **Error occurs in production** | Logged to stdout, Prometheus counter incremented | Real-time Sentry alert, stack trace, context |
| **User reports random error** | Search logs by timestamp | Sentry groups shows all similar errors |
| **Deployment breaks something** | Monitor error rate dashboard | Immediate Sentry release comparison |
| **Need stack trace** | Search through JSON logs | Sentry UI shows source-mapped trace |
| **Release went wrong** | Review git diff | Sentry shows "new issue in v1.2.3" |
| **Performance degradation** | Prometheus metrics | Jaeger traces + Sentry profiling |

---

## Recommendations

### Immediate Actions (Next Sprint)
1. ✅ **Document** current observability stack (COMPLETED - infrastructure README updated)
2. ⏭️ **Backend Integration**: Add Sentry to `apps/api` with staged rollout
   - Week 1: Implement middleware
   - Week 2: Test in staging
   - Week 3: Production rollout

### Short Term (2-4 Weeks)
3. **Alert Integration**: Connect Sentry alerts to team Slack
4. **Release Tracking**: Automate release creation from deployment
5. **Dashboard Integration**: Link Sentry errors to Grafana dashboards

### Medium Term (1-2 Months)
6. **Frontend**: Evaluate and add Sentry to apps/web if backend proves stable
7. **Profiling**: Enable Sentry profiling for performance investigation
8. **Custom Integrations**: Integrate with GitHub/linear for issue tracking

### Long Term (Ongoing)
9. **ML Insights**: Use Sentry's anomaly detection
10. **Team Insights**: Analyze error patterns by service/team
11. **Customer Impact**: Track which customers affected by errors

---

## Current Configuration

### What's Already Set Up
```bash
# apps/api/.env
SENTRY_DSN=  # Empty but available

# apps/web/.env
SENTRY_AUTH_TOKEN="sntrys_..." # Build-time token
SENTRY_ORG="4510110995447808"
SENTRY_PROJECT="snapback"
DISABLE_SENTRY="true"  # ← Currently disabled
```

### What's Missing
- Sentry middleware in API
- Error handler integration
- Release tracking setup
- Source map uploads

---

## Conclusion

**Assessment**: ✅ **SAFE AND RECOMMENDED**

The removal of Sentry was driven by temporary technical issues, not architectural rejection. Your current observability stack is now mature and Sentry would provide critical **error tracking and user impact analysis** capabilities that complement metrics, tracing, and visualization.

**Recommendation**:
1. Start with backend (apps/api) - low risk, high value
2. Validate in staging for 1-2 weeks
3. Roll out to production with monitoring
4. Evaluate frontend integration after backend success

**Timeline**: 2-3 weeks for full backend integration

**Next Step**: Create implementation PR for `apps/api/src/middleware/sentry.ts`
