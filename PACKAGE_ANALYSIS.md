# Business Logic vs Infrastructure Analysis
## SnapBack Packages Review

**Scope**: packages/events, packages/contracts, packages/infrastructure, packages/config
**Thoroughness**: Medium
**Focus**: Identifying relocatable business logic

---

## 1. PACKAGES/EVENTS

### What: Inter-process pub/sub event bus over TCP sockets
**Location**: `/home/user/snapback.dev/packages/events/src/EventBus.ts`

### Infrastructure Code ✓
- TCP socket server/client lifecycle (startServer, connect, close)
- JSON-RPC 2.0 protocol message framing (newline-delimited)
- Buffer management (1MB limit, accumulation logic)
- Connection pooling (connectedClients Set)
- Port/socket path configuration
- Error handling for socket failures

### Business Logic (RELOCATABLE) ⚠️
**Event Quality of Service (QoS) - 400+ lines**
1. **QoS Levels & Delivery Guarantees**
   ```ts
   enum QoSLevel {
     BEST_EFFORT = 0,       // Fire-and-forget
     AT_LEAST_ONCE = 1,     // With acknowledgments
     EXACTLY_ONCE = 2,      // With deduplication
   }
   ```
   - Retry logic: 5-second timeout, max 3 retries (line 728-743)
   - Deduplication: Checks existing events to prevent duplicates (line 839-845)
   - Sequence numbering for ordering (line 251)
   - Correlation IDs for event grouping (line 50)

2. **EventPersistenceManager (lines 64-262)**
   - Stores events in SQLite via StorageBrokerAdapter
   - Filters events by type, QoS level, status
   - Maintains sequence counter for EXACTLY_ONCE
   - Event lifecycle: pending → acknowledged → processed

3. **Acknowledgment Tracking**
   - Stores acknowledgments with clientId, timestamp, status (line 920-922)
   - Maps event status from acknowledgment (line 927-930)
   - Timeout handling with callback (line 704-710)

4. **Event Replay (line 940-961)**
   - Filters events by time range
   - Replays in order with persistence

**Recommendation**: Move QoS logic to `@snapback/core` - this is state management logic, not transport logic.

---

## 2. PACKAGES/CONTRACTS

### What: Shared types, schemas, feature flags, telemetry mapping
**Locations**: Multiple files in `/packages/contracts/src/`

### Infrastructure Code ✓
- **schemas.ts** (150+ lines): Zod runtime validation schemas
  - SnapshotSchema, FileMetadataSchema, etc.
  - Type definitions matching runtime schemas
  - MCP configuration schemas (RetrySchema, CircuitSchema, McpSchema)

- **types/config.ts** (100+ lines): Config file type definitions
  - ConfigFileTypeSchema enum
  - File baseline tracking schemas

- **logger.ts**: Logger interface contract

- **eventBus.ts**: Event enum definitions

### Business Logic (RELOCATABLE) ⚠️

**1. Feature Management - FeatureManager.ts (72 lines)**
```ts
class FeatureManager {
  isEnabled(flag: FeatureFlag): boolean {
    // Sampling rate heuristic: compare Math.random() < rate
    if (flag === "telemetry.sampling_rate" && typeof value === "number") {
      return Math.random() < value;  // BUSINESS LOGIC
    }
    return Boolean(value);
  }
}
```
- Environment variable override parsing with fallback logic
- Sampling probability evaluation
- Singleton pattern with lazy initialization

**2. Features.ts (38 lines)**
- Feature flag definitions with 36 flags across 6 categories
- Protection, Risk Analysis, Storage, UI/UX, Telemetry, Experimental, A/B Testing categories
- Sampling rate configuration as a feature flag value

**Recommendation**: Core heuristics (sampling probability) should move to `@snapback/core`.

**3. Telemetry Event Mapping - event-mapper.ts (200 lines)** ⭐⭐
Complex business logic transforming 60+ legacy events → 7 core events:

```ts
class TelemetryEventMapper {
  mapOnboardingProtectionAssigned(event) {
    // Protection severity mapping (low→watch, medium→warn, high/critical→block)
    const protectionMap = { low: "watch", medium: "warn", ... }
    // Issue type detection from pattern matching
    let issueType = "secret"
    if (patterns.some(p => p.includes("mock"))) issueType = "mock"
    if (patterns.some(p => p.includes("phantom"))) issueType = "phantom"
  }
}
```

- **4 mapping functions** (mapOnboardingProtectionAssigned, mapSnapshotCreated, mapSnapBackUsed, mapRiskDetected)
- **Severity classification logic**: Maps low/medium/high/critical to enum
- **Pattern-based issue type detection**: Secret vs Mock vs Phantom
- **Event schema validation**: Zod parsing with error handling
- **Fallback values for legacy events**: Placeholder IDs, estimated sizes

**Recommendation**: Move entire TelemetryEventMapper to `@snapback/core` - this is core domain logic for risk analysis transformation.

---

## 3. PACKAGES/INFRASTRUCTURE

### What: Observability, metrics, logging, tracing

### Infrastructure Code ✓
- **logging/logger.ts**: Pino-based structured logging wrapper
- **metrics/client/, metrics/server/**: Prometheus exporter configuration
- **metrics/react/**: React integration hooks (browser instrumentation)
- **tracing/**: OpenTelemetry SDK initialization and span creation
- **posthog/{cohorts,alerts}.ts**: API wrappers for PostHog (CRUD operations)

### Business Logic (RELOCATABLE) ⚠️⚠️

**1. Error Budget Tracking - error-budget.ts (104 lines)** ⭐
```ts
const ERROR_BUDGET = 0.01        // 1% threshold
const ALERT_THRESHOLD = 0.005    // 0.5% early warning

export async function checkErrorBudget() {
  const errorRate = getErrorRate()
  
  // Decision logic: two-tier alerting
  if (errorRate > ALERT_THRESHOLD) {
    // Early warning (every 60 seconds)
  }
  if (errorRate > ERROR_BUDGET) {
    // Hard alert - recommend rollback
    sendAlert({ 
      message: "🚨 Error budget exceeded",
      recommendation: "Investigate root cause immediately"
    })
  }
}
```

- **Metrics tracking**: errorCount, totalRequests, lastAlertTime
- **Rate calculation**: errorCount / totalRequests
- **Threshold-based decisions**: 1% budget, 0.5% early warning
- **Alert orchestration**: Sends to external webhook (commented code)

**Recommendation**: Move to `@snapback/core` - error budget is a business policy decision.

**2. Event Sampling - metrics/core/sampling.ts (235 lines)** ⭐⭐
Critical cost-optimization logic:

```ts
enum EventTier {
  CORE = 1.0,        // Auth, snapshots, billing (100%)
  ENGAGEMENT = 0.5,  // Dashboard views (50%)
  OPTIONAL = 0.1,    // Diffs, searches (10%)
  ERRORS = 1.0,      // Always track (100%)
}

// EVENT_SAMPLING_RATES: 50+ event-to-tier mappings
// BUDGET_EXAMPLE: 1000 users × 26 events/user/day = 780K events
// Target: 800K/month (80% of PostHog free tier 1M limit)

export function shouldSampleEvent(event: string): boolean {
  const samplingRate = EVENT_SAMPLING_RATES[event] ?? EventTier.CORE
  return Math.random() <= samplingRate  // HEURISTIC
}

export function estimateSampledEventCount(
  rawEventCount: number,
  eventDistribution: { core: 0.375, engagement: 0.25, ... }
): number {
  // Cost projection: which events survive sampling
  return Math.round(
    rawEventCount * distribution.core * CORE +
    rawEventCount * distribution.engagement * ENGAGEMENT +
    ...
  )
}
```

- **Event taxonomy**: CORE (auth, billing), ENGAGEMENT (usage), OPTIONAL (low-value), ERRORS (all)
- **Tier mapping**: 50+ events assigned to sampling rates
- **Budget calculation**: PostHog free tier = 1M events/month, target 800K (80%)
- **Distribution modeling**: Assumes 37.5% core, 25% engagement, 12.5% optional, 25% errors

**Recommendation**: Move to `@snapback/core/analytics` - this is product/business cost management.

**3. Session Replay Sampling - metrics/session-replay/sampling.ts (279 lines)** ⭐⭐
Dynamic sampling strategy with budget awareness:

```ts
interface SamplingContext {
  plan?: "free" | "pro" | "team" | "enterprise"
  userId?: string
  isOnboarding?: boolean
  hasErrors?: boolean
  engagementScore?: number    // 0-100
  segments?: string[]
}

interface SamplingStrategy {
  baseRate: number            // 0.1-0.7
  errorRate: number           // Usually 1.0
  conditions: SamplingCondition[]
}

// THREE PRESET STRATEGIES
CONSERVATIVE_SAMPLING: baseRate 0.1, errorRate 1.0
  - Pro users: 3.0x multiplier
  - Onboarding: 5.0x multiplier
  - High engagement (>75): 2.0x multiplier

BALANCED_SAMPLING: baseRate 0.3
  - Paid plans: 2.0x
  - Onboarding: 3.0x
  - Sessions with errors: 2.0x

AGGRESSIVE_SAMPLING: baseRate 0.7
  - Non-free users: 1.5x
  - Error sessions: 1.5x

export function calculateSamplingRate(context, strategy): number {
  let rate = context.hasErrors ? strategy.errorRate : strategy.baseRate
  for (const condition of strategy.conditions) {
    if (condition.evaluator(context)) {
      rate *= condition.multiplier
    }
  }
  return Math.min(1.0, Math.max(0.0, rate))  // Clamp 0-1
}

// BUDGET ADJUSTMENT ALGORITHM
export function adjustStrategyForBudget(budget, currentStrategy): SamplingStrategy {
  const utilization = budget.currentMonthSessions / budget.maxSessionsPerMonth
  
  if (utilization > 0.9) {
    // Aggressive reduction: halve base rate, 0.7x multipliers
    baseRate *= 0.5
    conditions.forEach(c => c.multiplier *= 0.7)
  } else if (utilization > 0.75) {
    // Moderate reduction: 0.7x base rate, 0.8x multipliers
    baseRate *= 0.7
    conditions.forEach(c => c.multiplier *= 0.8)
  }
  return adjusted
}
```

- **User segmentation**: By plan tier, onboarding status, engagement score
- **Context-based evaluation**: Multipliers for high-value users
- **Strategy presets**: 3 profiles (conservative, balanced, aggressive)
- **Budget monitoring**: 75% and 90% utilization thresholds trigger strategy reduction
- **Dynamic adjustment**: Real-time reduction of sampling rates to stay under budget

**Recommendation**: Move to `@snapback/core/analytics` - this is product-level cost/value optimization.

**4. PostHog Correlation Analysis - posthog/correlation.ts (173 lines)**
```ts
interface CorrelationAnalysisConfig {
  name: string
  eventName: string
  propertyNames: string[]
}

export async function performCorrelationAnalysis(config): CorrelationAnalysis {
  // Currently returns simulated results
  const results = config.propertyNames.map(property => ({
    property,
    correlation: Math.random() * 2 - 1,  // -1 to 1
    count: Math.floor(Math.random() * 1000) + 100,
    relativeFrequency: Math.random(),
  }))
  results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
  return { results: results.slice(0, 10) }  // Top 10
}

// Predefined correlation analyses
CORRELATION_ANALYSES = [
  { name: "Onboarding Completion Factors", ... },
  { name: "Feature Adoption Correlations", ... },
  { name: "Churn Risk Indicators", ... },
  { name: "High Value User Characteristics", ... },
]
```

- **Correlation configuration**: Event-property analysis setup
- **Analysis definitions**: 4 predefined correlation analyses
- **Business models**: Churn risk, high-value user indicators, onboarding factors

**Recommendation**: Currently stub/simulated - move predefined analyses to `@snapback/core/analytics` once implemented.

**5. PostHog Cohorts - posthog/cohorts.ts (365 lines)**
```ts
// Predefined cohort definitions
RETENTION_COHORTS = [
  { name: "D7 Retention", filters: { first_seen within 7 days } },
  { name: "D30 Retention", filters: { first_seen within 30 days } },
  { name: "Onboarding Completion Cohort", ... },
  { name: "High Engagement Users", filters: { 5+ sessions in 7 days } },
]

CORRELATION_COHORTS = [
  { name: "Feature Power Users", ... },
  { name: "At-Risk Churn", filters: { days_since_last_activity > 14 } },
  { name: "Free to Paid Converters", ... },
]
```

- **Cohort strategy definitions**: Retention, engagement, churn indicators
- **Segmentation logic**: Plan tier, activity patterns, feature usage

**Recommendation**: Move cohort definitions to `@snapback/core/analytics` - these are business segments.

---

## 4. PACKAGES/CONFIG

### What: Configuration defaults and environment parsing
**Locations**: `/packages/config/src/`

### Infrastructure Code ✓
- **defaults.ts** (40 lines): Configuration value constants
  ```ts
  mcp: { timeoutMs: 5_000, maxConcurrent: 4, retry: {...}, circuit: {...} }
  watcher: { debounceMs: 120, awaitWriteFinish: {...} }
  storage: { retention: {...}, compression: "brotli" }
  ```
  
  These are **infrastructure parameters**, not business logic.

- **env.ts**: Environment variable parsing

- **feature-flags.ts** (71 lines): PostHog feature flag client
  ```ts
  export async function isFeatureEnabled(flag, userId): boolean {
    // Delegates to PostHog SDK
    return await posthog.isFeatureEnabled(flag, userId)
  }
  ```
  
  Wrapper around PostHog - **infrastructure**.

### Infrastructure Code Only
- **monorepo-flattener.ts**: Demo/utility for path transformations
- **demo-tdd-flattening.ts**: Script demonstrating TDD process

---

## Summary Table

| Package | Component | Type | Lines | Recommendation |
|---------|-----------|------|-------|-----------------|
| **events** | QoS Persistence & Retry Logic | Business Logic | 400+ | → @snapback/core |
| **contracts** | FeatureManager Sampling | Business Logic | 35 | → @snapback/core |
| **contracts** | TelemetryEventMapper | Business Logic | 200 | → @snapback/core |
| **infrastructure** | Error Budget Tracking | Business Logic | 104 | → @snapback/core |
| **infrastructure** | Event Sampling Tiers | Business Logic | 235 | → @snapback/core/analytics |
| **infrastructure** | Session Replay Sampling | Business Logic | 279 | → @snapback/core/analytics |
| **infrastructure** | PostHog Correlation Analyses | Business Logic | 173 | → @snapback/core/analytics |
| **infrastructure** | PostHog Cohort Definitions | Business Logic | 80+ | → @snapback/core/analytics |
| **config** | Configuration Defaults | Infrastructure | 40 | Keep ✓ |
| **config** | Feature Flag Client | Infrastructure | 71 | Keep ✓ |

---

## Key Findings

### Business Logic Currently in Infrastructure
1. **Event Delivery Guarantees** (event bus QoS)
   - Retry strategies
   - Deduplication
   - Acknowledgment tracking
   - Event sequencing

2. **Analytics Cost Optimization** (event sampling)
   - Event taxonomy and tier mappings
   - Budget estimation
   - PostHog free tier optimization (1M events/month limit)
   - Sampling rate calculations with heuristics

3. **Session Replay Optimization** (dynamic sampling)
   - User segmentation by plan/engagement
   - Context-based multipliers
   - Budget utilization thresholds (75%, 90%)
   - Strategy adjustment algorithms

4. **Risk & Health Monitoring** (error budget)
   - Error rate calculations
   - Alert thresholds (1% hard limit, 0.5% warning)
   - Decision logic for escalation

5. **Telemetry Transformation** (event mapping)
   - 60+ event legacy → 7 core event mapping
   - Severity classification
   - Pattern-based issue type detection

### Where This Belongs
**@snapback/core** should own:
- QoS & event delivery guarantees (is core to snapshot reliability)
- Error budgeting & health policies (core product SLA)
- Telemetry transformation (core domain logic)
- Analytics cost optimization (business decision)
- User segmentation & sampling strategies (product strategy)

**@snapback/infrastructure** should only own:
- Logging, tracing, metrics instrumentation
- External service integrations (PostHog, Datadog, etc.)
- Protocol implementations (TCP, JSON-RPC)

---

## Validation Logic & Processing

Beyond pure infrastructure wrappers, found:
- **Zod schema validation** in contracts (keeps data integrity)
- **Configuration validation** in config/schemas
- **Event schema validation** in event-mapper.ts (ensures event integrity)

These are **appropriate** in their current locations - they're about data shape, not business behavior.

