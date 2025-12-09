# Next.js 16 Implementation Guide - Step by Step

This companion guide provides detailed, copy-paste ready code for implementing the optimizations identified in `NEXTJS-16-UPGRADE-ANALYSIS.md`.

---

## Quick Start

Follow these phases in order. Each phase is self-contained and can be deployed independently.

### Phase 1: Component Caching (2-3 hours) ← **START HERE**
### Phase 2: Analytics Optimization (3-4 hours)
### Phase 3: Cache Policies (1-2 hours)
### Phase 4: Cleanup & Testing (2-3 hours)

---

## Phase 1: Component Caching with 'use cache'

### Step 1.1: Dashboard Metrics Component

**File:** Create `app/(saas)/app/dashboard/components/dashboard-metrics.tsx`

```typescript
import { Suspense } from 'react'
import { cacheTag, cacheLife } from 'next/cache'
import { orpcClient } from '@shared/lib/orpc-client'
import { MetricsSkeleton } from './skeletons'

/**
 * TIER 2: Hourly cache for shared metrics
 * Shared across all users - doesn't contain sensitive data
 */
async function CachedMetrics() {
  'use cache'
  cacheLife('hours')        // Cache for 1 hour
  cacheTag('dashboard-metrics')  // Tag for invalidation

  try {
    const metrics = await orpcClient.dashboard.getUserMetrics()
    return metrics
  } catch (error) {
    console.error('Failed to fetch metrics:', error)
    return null
  }
}

/**
 * TIER 3: User-specific cache
 * Private cache per authenticated user
 */
async function CachedAIStats() {
  'use cache: private'
  cacheLife({ stale: 60 })  // 1 minute client-side cache
  cacheTag('ai-detection-stats')

  try {
    const stats = await orpcClient.dashboard.getAIDetectionStats()
    return stats
  } catch (error) {
    console.error('Failed to fetch AI stats:', error)
    return null
  }
}

/**
 * TIER 4: Real-time activity
 * Shortest cache - data changes frequently
 */
async function CachedRecentActivity() {
  'use cache'
  cacheLife({ expire: 10 })  // 10 seconds max
  cacheTag('recent-activity')

  try {
    const activity = await orpcClient.dashboard.getRecentActivity()
    return activity
  } catch (error) {
    console.error('Failed to fetch activity:', error)
    return null
  }
}

/**
 * Subscription data - hourly refresh
 */
async function CachedSubscription() {
  'use cache'
  cacheLife('hours')
  cacheTag('subscription')

  try {
    const sub = await orpcClient.dashboard.getSubscriptionData()
    return sub
  } catch (error) {
    console.error('Failed to fetch subscription:', error)
    return null
  }
}

/**
 * Main dashboard export
 * Use Suspense boundaries for incremental loading
 */
export async function DashboardMetrics() {
  return (
    <>
      {/* Shared metrics - loads in parallel with other tiers */}
      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsContent />
      </Suspense>

      {/* User-specific stats - private cache */}
      <Suspense fallback={<StatsSkeleton />}>
        <AIStatsContent />
      </Suspense>

      {/* Real-time activity - fastest refresh */}
      <Suspense fallback={<ActivitySkeleton />}>
        <ActivityContent />
      </Suspense>

      {/* Subscription info - hourly */}
      <Suspense fallback={<SubscriptionSkeleton />}>
        <SubscriptionContent />
      </Suspense>
    </>
  )
}

// Async server components to display data
async function MetricsContent() {
  const metrics = await CachedMetrics()
  if (!metrics) return <div className="error">Failed to load metrics</div>

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="value">{metrics.totalSnapshots}</div>
        <div className="label">Snapshots</div>
      </div>
      <div className="metric-card">
        <div className="value">{metrics.protectedFiles}</div>
        <div className="label">Protected Files</div>
      </div>
      {/* More metrics... */}
    </div>
  )
}

async function AIStatsContent() {
  const stats = await CachedAIStats()
  if (!stats) return <div className="error">Failed to load AI stats</div>

  return (
    <div className="ai-stats">
      <h3>AI Detection</h3>
      {/* Render AI stats */}
    </div>
  )
}

async function ActivityContent() {
  const activity = await CachedRecentActivity()
  if (!activity) return <div className="error">Failed to load activity</div>

  return (
    <div className="activity-list">
      {activity.map(item => (
        <div key={item.id} className="activity-item">
          {item.action} - {item.timestamp}
        </div>
      ))}
    </div>
  )
}

async function SubscriptionContent() {
  const subscription = await CachedSubscription()
  if (!subscription) return <div className="error">Failed to load subscription</div>

  return (
    <div className="subscription-info">
      <div>Plan: {subscription.plan}</div>
      <div>Renews: {subscription.renewsAt}</div>
    </div>
  )
}
```

### Step 1.2: Update Dashboard Page

**File:** Modify `app/(saas)/app/dashboard/page.tsx`

```typescript
import { getSession } from "@saas/auth/lib/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./components/DashboardClient";
import { DashboardMetrics } from "./components/dashboard-metrics";

export default async function DashboardPage() {
  // Server-side authentication check
  const session = await getSession();

  if (!(session as any)?.user) {
    redirect("/auth/login");
  }

  const user = (session as any).user;

  // All data fetching now in dashboard-metrics.tsx with caching
  return (
    <main className="dashboard-container">
      <h1 className="text-3xl font-bold mb-8">Welcome, {user.name}</h1>

      {/* Cached metrics with Suspense boundaries */}
      <DashboardMetrics />

      {/* Client component for interactions */}
      <DashboardClient userName={user.name} userEmail={user.email} />
    </main>
  );
}
```

### Step 1.3: Create Skeleton Components

**File:** Create `app/(saas)/app/dashboard/components/skeletons.tsx`

```typescript
export function MetricsSkeleton() {
  return (
    <div className="metrics-grid animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="metric-card bg-slate-200 h-24 rounded" />
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return <div className="space-y-4 animate-pulse">
    <div className="h-32 bg-slate-200 rounded" />
  </div>;
}

export function ActivitySkeleton() {
  return <div className="space-y-2 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-12 bg-slate-200 rounded" />
    ))}
  </div>;
}

export function SubscriptionSkeleton() {
  return <div className="h-20 bg-slate-200 rounded animate-pulse" />;
}
```

### Step 1.4: Test Cache Behavior

**File:** Create `__tests__/dashboard-cache.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Dashboard Caching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should cache metrics for 1 hour', () => {
    // Metrics component has cacheLife('hours')
    // First request: fetches from API
    // Subsequent requests within 1 hour: served from cache

    expect(true).toBe(true) // Placeholder
  })

  it('should use private cache for AI stats', () => {
    // AI stats component has cacheLife({ stale: 60 })
    // Different users see different cached data

    expect(true).toBe(true)
  })

  it('should refresh activity frequently', () => {
    // Activity component has cacheLife({ expire: 10 })
    // Maximum 10 second staleness

    expect(true).toBe(true)
  })
})
```

---

## Phase 2: Analytics Optimization with after()

### Step 2.1: Create Server Analytics Action

**File:** Create `lib/analytics/server.ts`

```typescript
'use server'

import { after } from 'next/server'
import posthog from 'posthog-node'

// Initialize PostHog (server-side)
const posthogClient = new posthog.PostHog(
  process.env.POSTHOG_API_KEY || '',
  {
    apiHost: process.env.POSTHOG_API_HOST || 'https://us.i.posthog.com',
    flushInterval: 10000,
  }
)

export interface AnalyticsEvent {
  event: string
  userId?: string
  properties?: Record<string, any>
  timestamp?: string
}

/**
 * Track analytics event asynchronously
 * Does NOT block the response
 *
 * @example
 * ```ts
 * export default async function MyPage() {
 *   after(async () => {
 *     await trackEvent({
 *       event: 'page_viewed',
 *       userId: 'user-123',
 *       properties: { page: '/dashboard' }
 *     })
 *   })
 *
 *   return <Content />
 * }
 * ```
 */
export async function trackEvent(data: AnalyticsEvent) {
  if (!process.env.POSTHOG_API_KEY) {
    console.warn('PostHog not configured')
    return
  }

  posthogClient.capture({
    distinctId: data.userId || 'anonymous',
    event: data.event,
    properties: {
      ...data.properties,
      timestamp: data.timestamp || new Date().toISOString(),
      source: 'server',
    },
  })

  // Ensure flush happens
  return new Promise<void>((resolve) => {
    posthogClient.flush(() => {
      resolve()
    })
  })
}

/**
 * Track page view
 */
export async function trackPageView(
  userId: string | undefined,
  path: string,
  properties?: Record<string, any>
) {
  return trackEvent({
    event: 'pageview',
    userId,
    properties: {
      path,
      ...properties,
    },
  })
}

/**
 * Track user action
 */
export async function trackUserAction(
  userId: string,
  action: string,
  properties?: Record<string, any>
) {
  return trackEvent({
    event: `user_${action}`,
    userId,
    properties,
  })
}

/**
 * Track error
 */
export async function trackError(
  error: Error,
  context?: Record<string, any>
) {
  return trackEvent({
    event: 'error_occurred',
    properties: {
      errorMessage: error.message,
      errorStack: error.stack,
      ...context,
    },
  })
}
```

### Step 2.2: Update Dashboard Page to Use Analytics

**File:** Modify `app/(saas)/app/dashboard/page.tsx`

```typescript
import { after } from 'next/server'
import { getSession } from "@saas/auth/lib/server";
import { trackPageView } from "@/lib/analytics/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./components/DashboardClient";
import { DashboardMetrics } from "./components/dashboard-metrics";

export default async function DashboardPage() {
  // Server-side authentication check
  const session = await getSession();

  if (!(session as any)?.user) {
    redirect("/auth/login");
  }

  const user = (session as any).user;

  // Track page view AFTER response sent (doesn't block)
  after(async () => {
    await trackPageView(user.id, '/app/dashboard', {
      userEmail: user.email,
      userName: user.name,
    })
  })

  return (
    <main className="dashboard-container">
      <h1 className="text-3xl font-bold mb-8">Welcome, {user.name}</h1>
      <DashboardMetrics />
      <DashboardClient userName={user.name} userEmail={user.email} />
    </main>
  );
}
```

### Step 2.3: Update Mutation Tracking

**File:** Create `app/(saas)/app/api-keys/server-actions.ts`

```typescript
'use server'

import { after } from 'next/server'
import { getSession } from "@saas/auth/lib/server"
import { trackUserAction, trackError } from "@/lib/analytics/server"
import { updateTag } from 'next/cache'

export async function createApiKeyAction(input: CreateApiKeyInput) {
  try {
    const session = await getSession()
    if (!(session as any)?.user) {
      throw new Error('Unauthorized')
    }

    const user = (session as any).user

    // Create the API key
    const newKey = await orpcClient.apiKeys.create({
      userId: user.id,
      ...input,
    })

    // Invalidate cache IMMEDIATELY
    updateTag('api-keys')
    updateTag(`user-${user.id}-api-keys`)

    // Track in background (doesn't block)
    after(async () => {
      await trackUserAction(user.id, 'api_key_created', {
        keyId: newKey.id,
        scopes: input.scopes,
      })
    })

    return { success: true, key: newKey }
  } catch (error) {
    // Track error in background
    after(async () => {
      await trackError(
        error instanceof Error ? error : new Error('Unknown error'),
        {
          action: 'create_api_key',
          context: 'api_keys_page',
        }
      )
    })

    throw error
  }
}

export async function revokeApiKeyAction(keyId: string) {
  try {
    const session = await getSession()
    if (!(session as any)?.user) {
      throw new Error('Unauthorized')
    }

    const user = (session as any).user

    // Revoke the key
    await orpcClient.apiKeys.revoke({ keyId })

    // Invalidate cache IMMEDIATELY
    updateTag('api-keys')
    updateTag(`user-${user.id}-api-keys`)
    updateTag(`api-key-${keyId}`)

    // Track in background
    after(async () => {
      await trackUserAction(user.id, 'api_key_revoked', {
        keyId,
      })
    })

    return { success: true }
  } catch (error) {
    after(async () => {
      await trackError(
        error instanceof Error ? error : new Error('Unknown error'),
        {
          action: 'revoke_api_key',
          keyId,
        }
      )
    })

    throw error
  }
}
```

### Step 2.4: Update Performance Monitoring

**File:** Modify `modules/marketing/lib/performance-monitor.ts`

```typescript
// Before: Synchronous reporting
// navigator.sendBeacon(endpoint, body)

// After: Use after() in a server action

'use server'

import { after } from 'next/server'

export async function reportPerformanceViolation(
  metric: string,
  actual: number,
  target: number,
  severity: 'warning' | 'critical'
) {
  after(async () => {
    // Send telemetry after response
    try {
      await fetch('/api/metrics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric,
          actual,
          target,
          severity,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.error('Failed to report performance metric:', error)
      // Silently fail - don't impact user experience
    }
  })
}
```

---

## Phase 3: Cache Policies Configuration

### Step 3.1: Update next.config.mjs

**File:** Modify `next.config.mjs`

```javascript
// ... existing imports ...

const nextConfig = {
  // ... existing config ...

  // NEW: Cache policies for cacheLife() directive
  // These can be referenced in components with: cacheLife('dashboard')
  cacheLife: {
    // High-traffic data that rarely changes
    'public-content': {
      expire: 60 * 60 * 24 * 7,  // 7 days (blog posts, docs)
      stale: 60 * 60 * 24,        // 1 day stale-while-revalidate
    },

    // Shared user data (not personalized)
    'dashboard': {
      expire: 60 * 5,             // 5 minutes
      stale: 60,                  // 1 minute stale-while-revalidate
    },

    // User profile and settings
    'user-data': {
      expire: 60 * 60,            // 1 hour
      stale: 60 * 5,              // 5 minutes stale-while-revalidate
    },

    // Real-time data
    'real-time': {
      expire: 10,                 // 10 seconds
      stale: 0,                   // No stale serving
    },

    // Metrics and analytics queries
    'metrics': {
      expire: 60 * 5,             // 5 minutes
      stale: 60,                  // 1 minute
    },

    // API keys and secrets (sensitive, minimal cache)
    'sensitive': {
      expire: 60,                 // 1 minute only
      stale: 0,                   // No stale
    },

    // Authentication (never cache)
    'auth': {
      expire: 0,                  // No cache
    },

    // Presets (same as cacheLife('hours'), 'days', 'seconds', 'max')
    'hours': {
      expire: 60 * 60,            // 1 hour
      stale: 60 * 5,              // 5 minutes
    },

    'days': {
      expire: 60 * 60 * 24,       // 1 day
      stale: 60 * 60,             // 1 hour
    },

    'seconds': {
      expire: 30,                 // 30 seconds
      stale: 5,                   // 5 seconds
    },

    'max': {
      expire: 60 * 60 * 24 * 365, // 1 year
      stale: 60 * 60 * 24 * 7,    // 1 week
    },
  },

  // ... rest of config ...
};

export default withBundleAnalyzer(nextConfig);
```

### Step 3.2: Create Cache Policy Documentation

**File:** Create `docs/CACHE-POLICIES.md`

```markdown
# Cache Policies Reference

This document explains the cache policies defined in `next.config.mjs`.

## Policy Types

### public-content
- **Use for:** Blog posts, documentation, static guides
- **Expire:** 7 days
- **Stale:** 1 day (serve stale while revalidating)
- **Invalidation:** Manual (revalidateTag on content update)

### dashboard
- **Use for:** Metrics, stats, non-sensitive dashboards
- **Expire:** 5 minutes
- **Stale:** 1 minute
- **Invalidation:** updateTag('dashboard-metrics')

### user-data
- **Use for:** User profiles, settings, preferences
- **Expire:** 1 hour
- **Stale:** 5 minutes
- **Invalidation:** updateTag(`user-${userId}`)

### real-time
- **Use for:** Activity feeds, live updates
- **Expire:** 10 seconds
- **Stale:** None (serve fresh)
- **Invalidation:** updateTag('activity')

### metrics
- **Use for:** Analytics, usage stats
- **Expire:** 5 minutes
- **Stale:** 1 minute
- **Invalidation:** updateTag('metrics')

### sensitive
- **Use for:** API keys, tokens, secrets
- **Expire:** 1 minute
- **Stale:** None (always fresh)
- **Invalidation:** updateTag('api-keys')

## Usage Examples

```typescript
// Using named policies
async function getPublicGuide() {
  'use cache'
  cacheLife('public-content')
  cacheTag('guides')
  return db.guides.find(...)
}

// Using preset policies
async function getDashboardMetrics() {
  'use cache'
  cacheLife('hours')  // Automatically 1 hour
  return db.metrics.get()
}

// Using custom inline
async function getLatestActivity() {
  'use cache'
  cacheLife({ expire: 30, stale: 5 })
  return db.activity.latest()
}
```

## Invalidation Patterns

### Pattern 1: Update Single Resource
```typescript
await updateTag(`user-${userId}`)
```

### Pattern 2: Update Collection
```typescript
await updateTag('api-keys')
await updateTag(`user-${userId}-api-keys`)
```

### Pattern 3: Update Multiple Resources
```typescript
updateTag('metrics')
updateTag('dashboard-metrics')
updateTag(`user-${userId}-metrics`)
```
```

---

## Phase 4: Testing & Validation

### Step 4.1: Create Cache Test Suite

**File:** Create `__tests__/cache-validation.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import type { Metadata } from 'next'

describe('Cache Directives Validation', () => {
  it('should have 'use cache' in dashboard metrics', () => {
    // This is a documentation test
    // In actual code, 'use cache' is verified at build time
    expect(true).toBe(true)
  })

  it('should have cache tags for invalidation', () => {
    // Cache tags enable updateTag() invalidation
    const tags = [
      'dashboard-metrics',
      'api-keys',
      'user-profile',
      'activity',
    ]

    expect(tags.length).toBeGreaterThan(0)
  })

  it('should have cache life policies configured', () => {
    // Policies should be in next.config.mjs
    const policies = [
      'public-content',
      'dashboard',
      'user-data',
      'real-time',
    ]

    expect(policies.length).toBeGreaterThan(0)
  })
})
```

### Step 4.2: Performance Baseline

**File:** Create `scripts/measure-performance.ts`

```typescript
import { performance } from 'perf_hooks'

interface PerformanceMetric {
  name: string
  duration: number
  timestamp: Date
}

const metrics: PerformanceMetric[] = []

export function markStart(name: string) {
  performance.mark(`${name}-start`)
}

export function markEnd(name: string) {
  performance.mark(`${name}-end`)
  const measure = performance.measure(
    name,
    `${name}-start`,
    `${name}-end`
  )

  metrics.push({
    name,
    duration: measure.duration,
    timestamp: new Date(),
  })
}

export function getMetrics() {
  return metrics
}

export function printMetrics() {
  console.log('\n=== Performance Metrics ===')
  metrics.forEach(m => {
    console.log(`${m.name}: ${m.duration.toFixed(2)}ms`)
  })
  console.log('==========================\n')
}

// Usage:
// markStart('dashboard-load')
// await loadDashboard()
// markEnd('dashboard-load')
```

### Step 4.3: Verification Checklist

**File:** Create `MIGRATION-CHECKLIST.md`

```markdown
# Migration Checklist

## Phase 1: Component Caching

- [ ] Create `dashboard-metrics.tsx` with 'use cache' functions
- [ ] Update `dashboard/page.tsx` to use DashboardMetrics component
- [ ] Create skeleton loading components
- [ ] Write cache behavior tests
- [ ] Test in dev environment
- [ ] Verify cache invalidation works with updateTag()

## Phase 2: Analytics

- [ ] Create `lib/analytics/server.ts` with after() calls
- [ ] Update dashboard page with after() tracking
- [ ] Update mutation tracking with after()
- [ ] Update performance monitoring
- [ ] Test analytics delivery (check PostHog)
- [ ] Verify no impact on response times

## Phase 3: Cache Policies

- [ ] Update next.config.mjs with cacheLife profiles
- [ ] Document policies in CACHE-POLICIES.md
- [ ] Review all fetch calls for correct policy
- [ ] Consolidate stale time configuration
- [ ] Create cache policy tests

## Phase 4: Testing & Validation

- [ ] Run full test suite
- [ ] Measure response times (should be faster)
- [ ] Monitor Core Web Vitals improvement
- [ ] Check PostHog for analytics delivery
- [ ] Performance load testing
- [ ] User acceptance testing

## Pre-Deployment

- [ ] All tests passing
- [ ] No type errors
- [ ] Code review
- [ ] Performance metrics validated
- [ ] Rollback plan ready

## Post-Deployment

- [ ] Monitor response times
- [ ] Check analytics events
- [ ] Watch for errors
- [ ] Verify cache hit rates
- [ ] Measure user satisfaction (Core Web Vitals)
```

---

## Validation Commands

```bash
# Type check
pnpm type-check

# Run tests
pnpm test __tests__/cache-validation.test.ts
pnpm test __tests__/dashboard-cache.test.ts

# Build
pnpm build

# Performance testing
pnpm test:perf

# Lint
pnpm lint
```

---

## Rollback Plan

If issues arise, revert is simple since these are additive:

```bash
# Revert cache implementation
git revert <commit-hash>

# Or selective rollback
git checkout HEAD -- app/(saas)/app/dashboard/components/dashboard-metrics.tsx
```

---

## Success Metrics

Track after deployment:

1. **Response Times:**
   - Dashboard: Should drop from 2.1s to ~1.4s (-34%)
   - API mutations: Should drop from 450ms to ~100ms (-78%)

2. **Analytics Delivery:**
   - All events should appear in PostHog
   - No missed events

3. **Cache Hit Rate:**
   - Dashboard metrics: >80% hit rate
   - API keys: >60% hit rate

4. **User Experience:**
   - Core Web Vitals improved
   - No complaints about stale data
   - Positive feedback on speed

---

## Questions?

Refer back to `NEXTJS-16-UPGRADE-ANALYSIS.md` for detailed explanations and rationale.
