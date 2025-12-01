# SNAPBACK KPI DASHBOARD CONFIGURATION
*Generated: 2025-11-07*

## Dashboard Structure

### Dashboard: SnapBack Core Metrics
**URL:** app.posthog.com/dashboard/snapback-core
**Refresh:** Every 5 minutes
**Access:** All team members

---

## Primary KPIs

### 1. TTFV (Time to First Value) - p75
**Target:** ≤ 5 minutes | **Current:** TBD | **Review:** Weekly

**PostHog Query:**
```sql
SELECT
  percentile_cont(0.75) WITHIN GROUP (ORDER BY first_value_time) as p75_ttfv
FROM (
  SELECT 
    distinct_id,
    MIN(CASE WHEN event = 'extension_activated' THEN timestamp END) as install_time,
    MIN(CASE WHEN event = 'snapshot_created' THEN timestamp END) as first_value_time
  FROM events
  WHERE timestamp >= now() - interval '7 days'
  GROUP BY distinct_id
  HAVING first_value_time IS NOT NULL
)
```

**Widget Config:**
```json
{
  "type": "number",
  "format": "duration_minutes",
  "trend": "7d",
  "goal": 5,
  "alert": ">7"
}
```

---

### 2. Onboarding Completion Rate
**Target:** ≥ 70% | **Current:** TBD | **Review:** Weekly

**PostHog Query:**
```sql
SELECT
  COUNT(DISTINCT CASE WHEN completed THEN distinct_id END) * 100.0 / 
  COUNT(DISTINCT distinct_id) as completion_rate
FROM (
  SELECT
    distinct_id,
    MAX(CASE WHEN event = 'onboarding_completed' THEN 1 ELSE 0 END) as completed
  FROM events
  WHERE event IN ('onboarding_started', 'onboarding_completed')
    AND timestamp >= now() - interval '7 days'
  GROUP BY distinct_id
)
```

**Widget Config:**
```json
{
  "type": "percentage",
  "trend": "7d",
  "goal": 70,
  "alert": "<60",
  "breakdown": "onboarding_step"
}
```

---

### 3. D7 Retention
**Target:** Baseline +20% | **Current:** TBD | **Review:** Weekly

**PostHog Retention Table:**
```json
{
  "type": "retention",
  "target_event": "snapshot_created",
  "returning_event": "snapshot_created",
  "period": "Week",
  "retention_type": "retention_first_time",
  "total_intervals": 4
}
```

**Alert Query:**
```sql
WITH cohort_retention AS (
  SELECT
    date_trunc('week', first_seen) as cohort_week,
    COUNT(DISTINCT CASE WHEN days_since <= 7 THEN user_id END) * 100.0 / 
    COUNT(DISTINCT user_id) as d7_retention
  FROM user_activity
  WHERE first_seen >= now() - interval '30 days'
  GROUP BY cohort_week
)
SELECT 
  AVG(d7_retention) as avg_d7,
  CASE WHEN AVG(d7_retention) < 30 THEN 'ALERT' ELSE 'OK' END as status
FROM cohort_retention
```

---

### 4. Crash-free Sessions
**Target:** ≥ 98% | **Current:** TBD | **Review:** Daily

**PostHog Query:**
```sql
SELECT
  (COUNT(DISTINCT CASE WHEN NOT has_error THEN session_id END) * 100.0 / 
   COUNT(DISTINCT session_id)) as crash_free_rate
FROM (
  SELECT
    properties->>'$session_id' as session_id,
    MAX(CASE WHEN event = 'error' THEN 1 ELSE 0 END) as has_error
  FROM events
  WHERE timestamp >= now() - interval '24 hours'
    AND properties->>'$session_id' IS NOT NULL
  GROUP BY session_id
)
```

**Widget Config:**
```json
{
  "type": "percentage",
  "format": "inverse_error_rate",
  "refresh": "5m",
  "goal": 98,
  "alert": "<95",
  "breakdown": "error_type"
}
```

---

### 5. Session Replay Budget
**Target:** ≤ $5k/month | **Current:** TBD | **Review:** Weekly

**Custom Calculation:**
```javascript
// Weekly budget check
const MONTHLY_BUDGET = 5000;
const COST_PER_1K_REPLAYS = 25; // Sentry pricing

function calculateReplayBudget() {
  const currentReplays = getReplayCount('month_to_date');
  const projectedMonthly = (currentReplays / dayOfMonth()) * 30;
  const projectedCost = (projectedMonthly / 1000) * COST_PER_1K_REPLAYS;
  
  return {
    used: currentReplays,
    projected: projectedMonthly,
    cost: projectedCost,
    budget_remaining: MONTHLY_BUDGET - projectedCost,
    alert: projectedCost > MONTHLY_BUDGET * 0.8
  };
}
```

---

## Supporting Metrics

### Activation Funnel
```json
{
  "type": "funnel",
  "steps": [
    {"event": "extension_installed"},
    {"event": "auth_completed"},
    {"event": "api_key_created"},
    {"event": "first_snapshot_created"}
  ],
  "window": "1 day",
  "breakdown": "source"
}
```

### AI Detection Accuracy
```sql
SELECT
  ai_tool,
  COUNT(*) as detections,
  AVG(confidence) as avg_confidence,
  SUM(CASE WHEN user_reported_incorrect THEN 1 ELSE 0 END) as false_positives
FROM ai_detections
WHERE timestamp >= now() - interval '7 days'
GROUP BY ai_tool
```

### Error Rate by Component
```sql
SELECT
  component,
  COUNT(*) as error_count,
  COUNT(DISTINCT session_id) as affected_sessions,
  array_agg(DISTINCT error_message) as error_types
FROM error_events
WHERE timestamp >= now() - interval '24 hours'
GROUP BY component
ORDER BY error_count DESC
LIMIT 10
```

### Feature Usage
```sql
SELECT
  feature,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_uses,
  AVG(duration_ms) as avg_duration
FROM feature_usage
WHERE timestamp >= now() - interval '7 days'
GROUP BY feature
ORDER BY unique_users DESC
```

---

## Dashboards by Team

### Analytics Team Dashboard
- Activation funnel (detailed)
- Retention cohorts
- Experiment results
- Survey responses

### Engineering Team Dashboard
- Error rates by service
- Performance metrics
- API latency p50/p95/p99
- Test coverage trends

### Product Team Dashboard
- Feature adoption
- User segments
- NPS trends
- Competitive metrics

### Support Team Dashboard
- Ticket volume
- Common issues
- User satisfaction
- Response times

---

## Alert Configuration

### Critical Alerts (PagerDuty)
```yaml
- metric: crash_free_rate
  condition: "< 95%"
  window: 15m
  
- metric: error_spike
  condition: "> 3x baseline"
  window: 5m
  
- metric: api_availability
  condition: "< 99.5%"
  window: 5m
```

### Warning Alerts (Slack)
```yaml
- metric: onboarding_completion
  condition: "< 60%"
  window: 1d
  channel: "#product-alerts"
  
- metric: replay_budget
  condition: "> 80%"
  window: 1d
  channel: "#analytics-alerts"
  
- metric: d7_retention
  condition: "< baseline - 5%"
  window: 1w
  channel: "#growth-alerts"
```

---

## Review Cadence

### Real-time Monitoring
- Error rates
- API availability
- Current active users

### Daily Review (9am Standup)
- Crash-free rate
- Error trends
- Activation funnel

### Weekly Review (Friday 11am)
- D7 retention
- Onboarding completion
- TTFV trends
- Replay budget

### Monthly Business Review
- MRR growth
- Churn analysis
- Feature adoption
- Competitive benchmarks