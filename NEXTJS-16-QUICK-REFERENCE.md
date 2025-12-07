# Next.js 16 Quick Reference - API by Feature

**Target:** Implement high-ROI optimizations in 20-25 hours total
**Expected gains:** -150-500ms response time, -40% cache code, instant consistency

---

## Feature 1: 'use cache' Directive (Component-Level Caching)

### What It Does
Caches component output at build time (static) or runtime (dynamic). Replaces manual cache invalidation.

### Before (Current)
```typescript
export async function DashboardPage() {
  const data = await fetchData()  // Fetches every request
  // Manual cache invalidation needed elsewhere
}
```

### After (Next.js 16)
```typescript
async function CachedData() {
  'use cache'  // Automatic caching
  cacheTag('dashboard')  // For invalidation
  return fetchData()
}

export function DashboardPage() {
  return <CachedData />
}
```

### When to Use
- ✅ Server components that fetch data
- ✅ Async data operations
- ✅ Expensive computations
- ❌ Never in client components

### Cache Invalidation
```typescript
// Immediate (use this)
updateTag('dashboard')

// Eventual consistency (avoid)
revalidatePath('/dashboard')
```

---

## Feature 2: cacheLife() - Cache Lifespan

### What It Does
Sets how long data stays fresh. Can use presets or custom values.

### Presets
```typescript
'use cache'
cacheLife('seconds')  // 30 seconds
cacheLife('hours')    // 1 hour
cacheLife('days')     // 1 day
cacheLife('max')      // 1 year
```

### Custom Values
```typescript
'use cache'
cacheLife({
  expire: 300,        // Seconds until stale
  stale: 60           // Stale-while-revalidate duration
})
```

### Use Cases
| Data | Policy | Reason |
|------|--------|--------|
| Blog post | `'days'` | Changes rarely |
| Metrics | `'hours'` | Updates multiple times daily |
| Activity feed | `'seconds'` | Changes constantly |
| API key | Custom 60s | Sensitive, minimal cache |

---

## Feature 3: cacheTag() - Cache Invalidation

### What It Does
Tags cached data for targeted invalidation with `updateTag()`.

### Usage
```typescript
async function getData() {
  'use cache'
  cacheTag('dashboard')
  cacheTag('user-123-data')  // Multiple tags
  return db.query()
}

// Later: Invalidate selectively
updateTag('dashboard')          // Expires first tag
updateTag('user-123-data')      // Expires second tag
```

### Tag Naming Conventions
```typescript
// ✅ Good patterns
cacheTag('api-keys')              // Resource type
cacheTag('dashboard-metrics')     // Component + data
cacheTag(`user-${userId}-profile`) // User-scoped

// ❌ Avoid
cacheTag('data')                  // Too generic
cacheTag('cache')                 // Meaningless
cacheTag('thing-123-456')         // Unclear
```

---

## Feature 4: updateTag() - Immediate Invalidation

### What It Does
Immediately expires all caches with matching tag. Use after mutations.

### Usage Pattern
```typescript
'use server'
import { updateTag } from 'next/cache'

export async function createApiKey(input: any) {
  const key = await db.apiKey.create(input)

  // Immediate invalidation
  updateTag('api-keys')
  updateTag(`user-${input.userId}-keys`)

  return key  // Caller sees fresh data
}
```

### vs revalidatePath()
```typescript
// ❌ Eventual (stale-while-revalidate)
revalidatePath('/api-keys')  // Takes time

// ✅ Immediate (within request)
updateTag('api-keys')        // Instant
```

---

## Feature 5: 'use cache: remote' - Runtime Caching

### What It Does
Caches at runtime (NOT build time) in shared cache. Good for frequently changing data that needs to be shared across users.

### When to Use
```typescript
// ✅ Remote cache (shared)
async function getProductPrice(id: string) {
  'use cache: remote'  // Different user sees same price
  cacheTag(`price-${id}`)
  return db.products.getPrice(id)
}

// ❌ Private cache (per-user)
async function getPersonalRecs(userId: string) {
  'use cache: private'  // Each user gets own recommendations
  return db.recommendations.get(userId)
}
```

---

## Feature 6: 'use cache: private' - User-Scoped Cache

### What It Does
Caches data per user/session. Requires accessing cookies/auth.

### Requirements
```typescript
// Must have minimum stale time for prefetching
async function getRecommendations() {
  'use cache: private'
  cacheLife({ stale: 30 })  // Minimum 30 seconds required

  // Can access cookies (auth)
  const sessionId = (await cookies()).get('session-id')?.value
  return db.getUserRecommendations(sessionId)
}
```

### vs public cache
```typescript
// Public (all users same data)
'use cache: remote'         // Shared
cacheLife({ expire: 3600 })

// Private (per-user data)
'use cache: private'        // Separate per user
cacheLife({ stale: 60 })    // Required minimum
```

---

## Feature 7: after() - Post-Response Work

### What It Does
Schedules work to run AFTER response sent. Perfect for analytics, logging, emails.

### Before (Blocks Response)
```typescript
export default async function Page() {
  const data = await getData()

  // This blocks until complete
  await analytics.track('viewed', {})
  await sendEmail('user@example.com')

  return <Content data={data} />
}
```

### After (Non-Blocking)
```typescript
import { after } from 'next/server'

export default async function Page() {
  const data = await getData()

  // These run AFTER response sent
  after(async () => {
    await analytics.track('viewed', {})
    await sendEmail('user@example.com')
  })

  return <Content data={data} />
}
```

### Gains
- Response time: -100-300ms
- No user-perceived delay
- Perfect for: analytics, logging, webhooks, emails

---

## Feature 8: connection() - Explicit Dynamic Rendering

### What It Does
Tells Next.js "this route is dynamic". Makes intent explicit.

### Usage
```typescript
import { connection } from 'next/server'

export default async function Page({ params }: any) {
  // Explicitly mark as dynamic
  await connection()

  // Now caching behavior is clear to Next.js
  const data = await fetchUserData(params.id)

  return <Content data={data} />
}
```

### vs Implicit
```typescript
// ❌ Implicit (unclear when dynamic)
if (params.userId) {
  const data = await fetchUserData(params.userId)
}

// ✅ Explicit
await connection()  // "This is dynamic"
const data = await fetchUserData(params.userId)
```

---

## Feature 9: Async Request APIs (Next.js 15+ Breaking Change)

### What Changed
Request APIs are now **always async**. Synchronous access removed.

### APIs Affected
- `params` (in pages/layouts/routes)
- `searchParams` (in pages)
- `cookies()`
- `headers()`
- `draftMode()`

### Before (Next.js 14)
```typescript
export default function Page({ params }) {
  const id = params.id  // ❌ Sync (doesn't work in 16)
}
```

### After (Next.js 15+)
```typescript
export default async function Page({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params  // ✅ Async
}
```

### Type Safety
```typescript
// Properly typed in Next.js 16
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const { sort } = await searchParams
}
```

---

## Complete Pattern: Full Page Optimization

### Single Component with All Features

```typescript
// app/page.tsx
'use server'

import { after } from 'next/server'
import { connection } from 'next/server'
import { cookies } from 'next/headers'
import { cacheTag, cacheLife, updateTag } from 'next/cache'

/**
 * TIER 1: Static product data (cached at build time)
 */
async function StaticProduct({ id }: { id: string }) {
  'use cache'
  cacheTag(`product-${id}`)
  return db.products.get(id)
}

/**
 * TIER 2: Shared pricing (cached at runtime, shared across users)
 */
async function ProductPrice({ id }: { id: string }) {
  'use cache: remote'
  cacheTag(`price-${id}`)
  cacheLife({ expire: 300 })  // 5 minutes
  return db.prices.get(id)
}

/**
 * TIER 3: Personalized recommendations (per-user cache)
 */
async function Recommendations({ productId }: { productId: string }) {
  'use cache: private'
  cacheLife({ stale: 60 })
  cacheTag(`recommendations-${productId}`)

  const sessionId = (await cookies()).get('session-id')?.value
  return db.recommendations.get(productId, sessionId)
}

/**
 * Main page
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Explicit: this route is dynamic
  await connection()

  // Async params (required in Next.js 16)
  const { id } = await params

  // Track page view non-blocking
  after(async () => {
    await analytics.track('product_viewed', { productId: id })
  })

  return (
    <div>
      <Suspense fallback={<ProductSkeleton />}>
        <StaticProduct id={id} />
      </Suspense>

      <Suspense fallback={<PriceSkeleton />}>
        <ProductPrice id={id} />
      </Suspense>

      <Suspense fallback={<RecsSkeleton />}>
        <Recommendations productId={id} />
      </Suspense>
    </div>
  )
}

/**
 * Mutation with immediate cache invalidation
 */
export async function updateProductPrice(
  productId: string,
  newPrice: number
) {
  'use server'

  await db.prices.update(productId, newPrice)

  // Immediate (not eventual)
  updateTag(`price-${productId}`)

  // Non-blocking logging
  after(async () => {
    await analytics.track('price_updated', {
      productId,
      newPrice,
    })
  })
}
```

---

## Decision Tree: Which Feature to Use?

```
Is it a server component?
├─ YES → Use 'use cache'
│  ├─ Async data operation?
│  │  └─ YES → Add cacheTag() and cacheLife()
│  ├─ Non-blocking side effect (analytics)?
│  │  └─ YES → Use after()
│  └─ Dynamic route?
│     └─ YES → Add await connection()
│
└─ NO → Use client component
   └─ Use TanStack Query (data fetching)
   └─ Use server actions (mutations)
```

---

## Configuration Example: next.config.mjs

```javascript
const nextConfig = {
  cacheLife: {
    'dashboard': {
      expire: 60 * 5,
      stale: 60,
    },
    'user-data': {
      expire: 60 * 60,
      stale: 60 * 5,
    },
    'real-time': {
      expire: 10,
      stale: 0,
    },
  },
}

export default nextConfig
```

---

## Performance Impact Summary

| Change | Benefit | Effort |
|--------|---------|--------|
| 'use cache' + cacheTag() | -40% code, instant consistency | 2-3h |
| after() for analytics | -200-500ms response time | 3-4h |
| cacheLife() policies | Unified cache config | 1-2h |
| updateTag() mutations | Read-your-own-writes | 2-3h |
| connection() routing | Code clarity, perf hint | 1h |

**Total effort:** 20-25 hours
**Expected ROI:** 8-9/10
**Risk level:** Low (additive features)

---

## Key Takeaways

1. ✅ **'use cache' replaces manual cache management** - Simpler, declarative
2. ✅ **updateTag() is immediate, revalidatePath() is eventual** - Use updateTag for mutations
3. ✅ **after() prevents analytics from blocking** - Big performance win
4. ✅ **Async params are required in Next.js 16** - Already following this pattern
5. ✅ **cacheLife() enables single source of truth** - Define policies once in config

---

See `NEXTJS-16-UPGRADE-ANALYSIS.md` for detailed rationale and `NEXTJS-16-IMPLEMENTATION-GUIDE.md` for step-by-step implementation.
