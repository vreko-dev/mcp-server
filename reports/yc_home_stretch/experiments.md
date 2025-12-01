# SNAPBACK EXPERIMENTS CATALOG
*Generated: 2025-11-07*

## Active Experiments

### EXP-001: Simplified Onboarding Flow
**Status:** Ready to Launch | **Priority:** HIGH

#### Hypothesis
Reducing onboarding steps from 5 to 3 will increase completion rate by 15% without impacting downstream activation.

#### Design
- **Control (A):** Current 5-step walkthrough
  1. Welcome
  2. Initialize SnapBack
  3. Configure Protection
  4. API Key Setup
  5. First Snapshot
  
- **Variant (B):** Simplified 3-step flow
  1. Welcome + Auto-initialize
  2. Quick Protection Setup (defaults)
  3. First Snapshot (API key deferred)

#### Configuration
```javascript
{
  flag: "simplified_onboarding",
  allocation: 50,
  targeting: "new_installs_only",
  minimum_runtime: 14,
  sample_size: 500
}
```

#### Metrics
- **Primary:** Onboarding completion rate
- **Secondary:** 
  - Time to first snapshot
  - D7 retention
  - Support ticket volume
- **Guardrails:**
  - Error rate < 2%
  - Crash-free sessions > 98%

#### Decision Rules
- Ship if: Completion +10% and D7 neutral or positive
- Kill if: D7 retention drops >5% or errors spike
- Iterate if: Completion improves <10% but D7 stable

---

### EXP-002: AI Detection Sensitivity
**Status:** Design Phase | **Priority:** MEDIUM

#### Hypothesis
Lowering AI detection threshold from 0.8 to 0.6 confidence will increase valuable detections by 25% with <5% false positive increase.

#### Design
- **Control (A):** Current threshold (0.8)
- **Variant (B):** Lower threshold (0.6)
- **Variant (C):** Adaptive threshold (0.6-0.8 based on context)

#### Configuration
```javascript
{
  flag: "ai_detection_threshold",
  allocation: [34, 33, 33],
  targeting: "all_active_users",
  minimum_runtime: 7,
  sample_size: 1000
}
```

#### Metrics
- **Primary:** AI detection rate
- **Secondary:**
  - False positive reports
  - User satisfaction (micro-survey)
  - Snapshot creation rate
- **Guardrails:**
  - False positive reports < 10/day
  - No performance degradation

#### Decision Rules
- Ship winner if: Detection +20% and FP rate acceptable
- Kill if: False positives > 10% increase
- Extended runtime if: Results inconclusive at 7 days

---

### EXP-003: Welcome Email Timing
**Status:** Ready to Launch | **Priority:** LOW

#### Hypothesis
Sending welcome email immediately after signup (vs 1 hour delay) increases activation within 24h by 10%.

#### Design
- **Control (A):** 1-hour delay (current)
- **Variant (B):** Immediate send
- **Variant (C):** Smart timing (based on timezone)

#### Configuration
```javascript
{
  flag: "welcome_email_timing",
  allocation: [34, 33, 33],
  targeting: "new_signups",
  minimum_runtime: 14,
  sample_size: 750
}
```

#### Metrics
- **Primary:** Activation within 24h
- **Secondary:**
  - Email open rate
  - Click-through rate
  - Unsubscribe rate
- **Guardrails:**
  - Unsubscribe < 2%
  - Spam reports < 0.1%

#### Decision Rules
- Ship winner if: Activation improvement >5%
- Kill if: Unsubscribe rate doubles
- Default to control if: No significant difference

---

## Upcoming Experiments Queue

### EXP-004: Contextual Protection Suggestions
**Target:** Q1 2026
- Test ML-based file protection recommendations
- Surface suggestions based on file patterns
- Measure protection coverage and user trust

### EXP-005: Gamified Onboarding
**Target:** Q1 2026
- Add progress bar and achievements
- Test impact on completion and engagement
- Measure long-term retention effects

### EXP-006: Team Invitation Flow
**Target:** Q2 2026
- Test different invitation mechanisms
- Measure team adoption rate
- Track viral coefficient

---

## Experiment Infrastructure

### Feature Flags
```typescript
// PostHog configuration
posthog.init({
  api_key: process.env.POSTHOG_KEY,
  person_profiles: 'identified_only',
  bootstrap: {
    featureFlags: serverBootstrappedFlags
  }
})
```

### Telemetry Events
```typescript
// Track experiment exposure
telemetry.track('experiment.exposed', {
  experiment_id: 'EXP-001',
  variant: 'B',
  user_id: userId,
  session_id: sessionId
})

// Track experiment conversion
telemetry.track('experiment.converted', {
  experiment_id: 'EXP-001',
  metric: 'onboarding_completed',
  value: true
})
```

### Analysis Queries
```sql
-- Experiment performance
SELECT 
  variant,
  COUNT(DISTINCT user_id) as users,
  AVG(CASE WHEN converted THEN 1 ELSE 0 END) as conversion_rate,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_to_convert) as median_ttc
FROM experiments
WHERE experiment_id = 'EXP-001'
  AND exposed_at >= NOW() - INTERVAL '14 days'
GROUP BY variant;
```

---

## Review Schedule

### Weekly
- Monitor guardrail metrics
- Check sample size progress
- Review early indicators

### Bi-weekly
- Statistical significance check
- Segment analysis
- Decision point evaluation

### Monthly
- Full experiment review
- Queue prioritization
- Infrastructure improvements

---

## Success Metrics

### Experiment Velocity
- Target: 2-3 experiments running concurrently
- Ship rate: >60% of experiments lead to changes
- Learning rate: 100% documented insights

### Quality Metrics
- False positive rate: <5% bad ships
- Reversion rate: <10% of shipped changes
- Time to decision: <21 days average