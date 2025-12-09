# SnapBack Library Optimization: Complete LLM Agent Implementation Prompt

**Version:** 1.0
**Date:** December 6, 2025
**Target:** Claude Code / Windsurf / Qoder LLM Agent
**Scope:** Full phased implementation with zero regressions

---

## CRITICAL PREAMBLE

You are implementing the SnapBack Library Optimization Strategic Plan. This is a **no-regression, fully-tested** implementation across 5 phases. Success means:

âœ… All existing tests pass unchanged
âœ… New features tested comprehensively
âœ… Backward compatibility maintained
âœ… Zero breaking changes to public APIs
âœ… Feature flags enable gradual rollout
âœ… Rollback possible at any phase

**You must verify 3 things before proceeding:**
1. All tests pass after each change
2. No existing imports/exports are modified (backward compat)
3. New code is testable and tested

---

## PROJECT CONTEXT

### Current State
- **Monorepo Structure:** Turborepo with apps/, packages/, and services/
- **Key Services:** VSCode extension, Next.js dashboard, MCP server, API backend
- **Stack:** TypeScript, Next.js 15, React 19, Hono, Drizzle ORM, Supabase, Better-auth
- **Current Issues:**
  - 6 redundant analytics providers (PostHog only needed)
  - No real-time updates (polling only)
  - MCP server on Express (not edge-ready)
  - No AI suggestions capability
  - No enterprise auth features (2FA, organizations)

### Strategic Goals
1. **Phase 1:** Remove analytics redundancy (4 hours) - bundle reduction
2. **Phase 2:** Add Supabase real-time (week 1-2) - instant UI updates
3. **Phase 3:** Add MCP AI suggestions (week 2-3) - competitive feature
4. **Phase 4:** Express â†’ Hono migration (week 3-4) - edge readiness
5. **Phase 5:** Better-auth enhancements (week 4-5) - enterprise features

### Success Metrics
- Bundle size: 11MB â†’ 8MB
- MCP latency: 12ms â†’ 4ms
- Real-time update latency: 5-10s polling â†’ <500ms streaming
- Zero test failures across phases
- Feature flag-gated rollout for all new features

---

## PHASE 1: ANALYTICS CONSOLIDATION (Priority 1 - START HERE)

### Objective
Remove 6 redundant analytics providers. Keep PostHog only. Reduce bundle by ~3MB.

### Analysis to Perform

**Step 1: Audit Current Analytics Implementation**

```bash
# Search for all analytics provider usage
grep -r "googleAnalytics\|vercelAnalytics\|mixpanel\|plausible\|umami\|pirsch" \
  apps/web --include="*.ts" --include="*.tsx" --include="*.js"

# Find provider initialization
find apps/web -name "*analytics*" -type f | head -20

# Check package.json dependencies
cat apps/web/package.json | grep -i "google\|mixpanel\|plausible\|umami\|pirsch"

# Verify PostHog is already integrated
grep -r "posthog" apps/web/modules/analytics --include="*.ts"
```

**Step 2: Map Event Emission Points**

Create a document listing all analytics.trackEvent() calls and verify PostHog equivalent exists:

```typescript
// Example output format:
// Event: "page_view"
// Current providers: GA, Vercel, PostHog
// PostHog equivalent: posthog.capture('page_view')
// Status: âœ… PostHog handles this

// Event: "protection_enabled"
// Current providers: Mixpanel, PostHog
// PostHog equivalent: posthog.capture('protection_enabled', { fileId })
// Status: âœ… PostHog handles this
```

### Implementation Steps

**Step 1: Create Provider Consolidation Plan**

File: `apps/web/modules/analytics/CONSOLIDATION_PLAN.md`

List every analytics provider and mark for removal:
- Google Analytics â†’ âŒ REMOVE (PostHog handles)
- Vercel Analytics â†’ âŒ REMOVE (PostHog handles)
- Mixpanel â†’ âŒ REMOVE (PostHog handles)
- Plausible â†’ âŒ REMOVE (PostHog handles)
- Umami â†’ âŒ REMOVE (PostHog handles)
- Pirsch â†’ âŒ REMOVE (PostHog handles)
- PostHog â†’ âœ… KEEP (primary provider)

**Step 2: Test Current Analytics Baseline**

```bash
# Run all analytics-related tests to establish baseline
pnpm test analytics --run

# Record output (you'll compare after changes)
# Save to: BASELINE_TEST_RESULTS.txt
```

**Step 3: Remove Provider Initialization Code**

Update `apps/web/modules/analytics/provider/index.ts`:

```typescript
// BEFORE:
import { googleAnalytics } from './google'
import { vercelAnalytics } from './vercel'
import { mixpanel } from './mixpanel'
import { plausible } from './plausible'
import { umami } from './umami'
import { pirsch } from './pirsch'
import { posthog } from './posthog'

export function initializeAnalytics() {
  googleAnalytics.init()
  vercelAnalytics.init()
  mixpanel.init()
  plausible.init()
  umami.init()
  pirsch.init()
  posthog.init()
}

// AFTER:
import { posthog } from './posthog'

export function initializeAnalytics() {
  posthog.init()
}
```

**Step 4: Remove Event Emission Duplication**

Update `apps/web/modules/analytics/provider/tracker.ts`:

```typescript
// BEFORE:
export const analytics = {
  pageView: (properties) => {
    googleAnalytics.track('page_view', properties)
    vercelAnalytics.track('page_view', properties)
    mixpanel.track('page_view', properties)
    plausible.track('page_view', properties)
    umami.track('page_view', properties)
    pirsch.track('page_view', properties)
    posthog.capture('page_view', properties)
  },
  // ... other events
}

// AFTER:
export const analytics = {
  pageView: (properties) => {
    posthog.capture('page_view', properties)
  },
  // ... other events
}
```

**Step 5: Remove Unused Provider Files**

```bash
# Delete provider implementations
rm apps/web/modules/analytics/provider/google.ts
rm apps/web/modules/analytics/provider/vercel.ts
rm apps/web/modules/analytics/provider/mixpanel.ts
rm apps/web/modules/analytics/provider/plausible.ts
rm apps/web/modules/analytics/provider/umami.ts
rm apps/web/modules/analytics/provider/pirsch.ts

# Verify no imports reference deleted files
grep -r "from.*google\|from.*vercel.*analytics\|from.*mixpanel" apps/web
# Should return: (no results)
```

**Step 6: Update package.json - Remove Unused Dependencies**

Update `apps/web/package.json`:

```json
// REMOVE these dependencies:
// "@google-analytics/web-vitals": "removed"
// "@segment/analytics.js-core": "removed"
// "mixpanel-browser": "removed"
// "plausible-tracker": "removed"
// "umami-analytics": "removed"
// "pirsch-sdk": "removed"

// KEEP these:
// "posthog-js": "^1.290.0" â† unchanged
```

```bash
# Remove dependencies
pnpm remove @google-analytics/web-vitals mixpanel-browser plausible-tracker umami-analytics pirsch-sdk

# Verify package.json is clean
cat apps/web/package.json | grep -i "google\|mixpanel\|plausible\|umami\|pirsch"
# Should return: (no results)
```

**Step 7: Update API Layer Analytics**

File: `apps/api/src/middleware/analytics.ts`

```typescript
// BEFORE:
import { mixpanelNode } from './providers/mixpanel'
import { umami } from './providers/umami'
import { posthogNode } from './providers/posthog'

export async function trackServerEvent(event, properties) {
  await mixpanelNode.track(event, properties)
  await umami.track(event, properties)
  await posthogNode.capture(event, properties)
}

// AFTER:
import { posthogNode } from './providers/posthog'

export async function trackServerEvent(event, properties) {
  await posthogNode.capture(event, properties)
}
```

**Step 8: Update .env Files**

Remove unused API keys:

```bash
# apps/web/.env.local
# REMOVE:
# NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=
# NEXT_PUBLIC_MIXPANEL_TOKEN=
# NEXT_PUBLIC_PLAUSIBLE_KEY=
# NEXT_PUBLIC_UMAMI_KEY=
# NEXT_PUBLIC_PIRSCH_KEY=

# KEEP:
# NEXT_PUBLIC_POSTHOG_KEY=

# apps/api/.env
# REMOVE:
# MIXPANEL_TOKEN=
# UMAMI_API_KEY=
# PIRSCH_API_KEY=

# KEEP:
# POSTHOG_API_KEY=
```

### Testing & Verification

**Step 1: Verify No Broken Imports**

```bash
# Build projects to catch import errors
pnpm build:web 2>&1 | grep -i "error\|cannot find"
pnpm build:api 2>&1 | grep -i "error\|cannot find"

# Should return: (no results)
```

**Step 2: Run All Analytics Tests**

```bash
# Run baseline tests again
pnpm test analytics --run

# Compare with BASELINE_TEST_RESULTS.txt
# All tests should PASS (no new failures)

# If failures exist:
# 1. Check test still expects same event names
# 2. Verify PostHog mock captures events
# 3. Add mock.reset() between tests
```

**Step 3: Test Event Emission**

Create: `apps/web/modules/analytics/__tests__/consolidation.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analytics } from '../provider/tracker'
import * as posthog from 'posthog-js'

vi.mock('posthog-js')

describe('Analytics Consolidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pageView calls PostHog only', () => {
    analytics.pageView({ path: '/dashboard' })

    expect(posthog.capture).toHaveBeenCalledWith('page_view', {
      path: '/dashboard'
    })
  })

  it('protectionEnabled calls PostHog only', () => {
    analytics.protectionEnabled({ fileId: '123' })

    expect(posthog.capture).toHaveBeenCalledWith('protection_enabled', {
      fileId: '123'
    })
  })

  it('no legacy providers are called', () => {
    // This test documents that old providers don't exist
    expect(window.ga).toBeUndefined()
    expect(window.mixpanel).toBeUndefined()
  })
})
```

```bash
# Run new test
pnpm test consolidation.test.ts --run

# Should PASS
```

**Step 4: Bundle Size Verification**

```bash
# Measure bundle before rebuild
du -sh apps/web/.next/static

# Rebuild with new analytics
pnpm build:web

# Measure bundle after rebuild
du -sh apps/web/.next/static

# Should be ~3MB smaller
# Before: ~11MB
# After: ~8MB
```

**Step 5: Type Safety Check**

```bash
# Run TypeScript compiler
pnpm tsc --noEmit

# Should return: (no errors)
```

### Checklist for Phase 1 Completion

- [ ] All 6 provider initialization files removed
- [ ] All provider imports removed from codebase
- [ ] `analytics.*` API remains identical (backward compatible)
- [ ] All existing tests pass
- [ ] New consolidation tests added and passing
- [ ] Bundle size reduced by ~3MB
- [ ] TypeScript compilation succeeds
- [ ] .env files cleaned of unused provider keys
- [ ] No console errors during app startup
- [ ] PostHog events still captured in production

### Rollback Plan (if needed)

```bash
# If Phase 1 causes issues:
git revert <commit-hash>
git push

# All 6 analytics providers restored
# Events duplicated again but app functional
```

---

## PHASE 2: SUPABASE REAL-TIME INTEGRATION (Priority 2)

### Objective
Implement real-time protection status updates. Replace polling with WebSocket subscriptions.

### Prerequisites
- âœ… Phase 1 complete and tested
- âœ… Supabase project already exists (verify connection works)
- âœ… Drizzle schema for protection_status_log ready

### Analysis to Perform

**Step 1: Audit Current Polling Implementation**

```bash
# Find all polling logic
grep -r "setInterval\|useQuery.*refetchInterval\|polling" apps/web \
  --include="*.ts" --include="*.tsx" | grep -i "protect\|status"

# Find Dashboard components
find apps/web -name "*dashboard*" -o -name "*status*" | grep -E "\.(tsx?|jsx?)$"

# Check current real-time absence
grep -r "supabase.*subscribe\|channel" apps/web
# Should return: (minimal/none)
```

**Step 2: Map Polling Points**

Create: `apps/web/POLLING_AUDIT.md`

Document every polling occurrence:
```markdown
## Polling Audit

### FileCard Component
- Location: apps/web/components/FileCard.tsx
- Current: useQuery with refetchInterval: 5000
- Latency: 5-10 seconds
- Event: File protection status change
- Action: Replace with useProtectionStatus hook

### Dashboard List
- Location: apps/web/app/dashboard/page.tsx
- Current: useQuery with refetchInterval: 10000
- Latency: 10-20 seconds
- Event: Bulk file protection status
- Action: Replace with Supabase subscription

### Protection Toggle
- Location: apps/web/components/ProtectionToggle.tsx
- Current: Mutation refetches query
- Latency: 500ms + network round-trip
- Event: Toggle confirmation
- Action: Use optimistic update + real-time confirmation
```

### Implementation Steps

**Step 1: Create Supabase Client**

File: `apps/web/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      storageKey: 'snapback-auth',
    },
    realtime: {
      params: {
        eventsPerSecond: 10, // Rate limit real-time events
      }
    }
  }
)

// Verify connection
export async function verifySupabaseConnection() {
  const { data, error } = await supabase.auth.getUser()
  if (error) console.error('Supabase connection failed:', error)
  return { success: !error, data }
}
```

Add to `apps/web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Step 2: Create useProtectionStatus Hook**

File: `apps/web/hooks/use-protection-status.ts`

```typescript
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type ProtectionStatus = 'protected' | 'unprotected' | 'loading' | 'error'

interface UseProtectionStatusOptions {
  fileId: string
  onStatusChange?: (status: ProtectionStatus) => void
  fallbackToPolling?: boolean
}

export function useProtectionStatus({
  fileId,
  onStatusChange,
  fallbackToPolling = true,
}: UseProtectionStatusOptions) {
  const [status, setStatus] = useState<ProtectionStatus>('loading')
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [isRealtime, setIsRealtime] = useState(true)

  // Initial fetch
  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('protected_files')
        .select('protection')
        .eq('id', fileId)
        .single()

      if (error) throw error

      const newStatus = data?.protection === 'enabled'
        ? 'protected'
        : 'unprotected'

      setStatus(newStatus)
      onStatusChange?.(newStatus)
    } catch (error) {
      console.error('Failed to fetch protection status:', error)
      setStatus('error')
      onStatusChange?.('error')
    }
  }, [fileId, onStatusChange])

  // Real-time subscription
  useEffect(() => {
    fetchStatus()

    // Try real-time subscription
    const chan: RealtimeChannel = supabase
      .channel(`protection:${fileId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'protected_files',
          filter: `id=eq.${fileId}`,
        },
        (payload) => {
          // Protection status changed
          const newProtection = payload.new?.protection
          const newStatus = newProtection === 'enabled'
            ? 'protected'
            : 'unprotected'

          setStatus(newStatus)
          onStatusChange?.(newStatus)
        }
      )
      .subscribe(async (status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime channel error, falling back to polling')
          setIsRealtime(false)
          if (fallbackToPolling) {
            setupPolling()
          }
        } else if (status === 'SUBSCRIBED') {
          console.log('Connected to real-time protection updates')
          setIsRealtime(true)
        }
      })

    setChannel(chan)

    return () => {
      supabase.removeChannel(chan)
    }
  }, [fileId, fetchStatus, fallbackToPolling])

  // Polling fallback
  const setupPolling = useCallback(() => {
    const interval = setInterval(() => {
      fetchStatus()
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [fetchStatus])

  return {
    status,
    isRealtime,
    channel,
    refetch: fetchStatus,
  }
}
```

**Step 3: Create useBulkProtectionStatus Hook**

File: `apps/web/hooks/use-bulk-protection-status.ts`

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface FileProtectionStatus {
  id: string
  protection: 'enabled' | 'disabled'
  updatedAt: string
}

export function useBulkProtectionStatus(fileIds: string[]) {
  const [statuses, setStatuses] = useState<Map<string, FileProtectionStatus>>(
    new Map()
  )
  const [isLoading, setIsLoading] = useState(true)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    if (fileIds.length === 0) {
      setIsLoading(false)
      return
    }

    // Initial fetch
    const fetchAll = async () => {
      try {
        const { data, error } = await supabase
          .from('protected_files')
          .select('id, protection, updated_at')
          .in('id', fileIds)

        if (error) throw error

        const statusMap = new Map(
          data?.map(item => [
            item.id,
            {
              id: item.id,
              protection: item.protection,
              updatedAt: item.updated_at,
            }
          ]) ?? []
        )

        setStatuses(statusMap)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch bulk protection statuses:', error)
        setIsLoading(false)
      }
    }

    fetchAll()

    // Subscribe to all file changes
    const chan = supabase
      .channel('bulk_protection_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'protected_files',
        },
        (payload) => {
          // Update if file is in our watched list
          if (fileIds.includes(payload.new?.id)) {
            setStatuses(prev => {
              const updated = new Map(prev)
              updated.set(payload.new.id, {
                id: payload.new.id,
                protection: payload.new.protection,
                updatedAt: payload.new.updated_at,
              })
              return updated
            })
          }
        }
      )
      .subscribe()

    setChannel(chan)

    return () => {
      supabase.removeChannel(chan)
    }
  }, [fileIds.join(',')])

  return { statuses, isLoading }
}
```

**Step 4: Update FileCard to Use Real-Time**

File: `apps/web/components/FileCard.tsx`

```typescript
// BEFORE:
import { useQuery } from '@tanstack/react-query'

export function FileCard({ file }: FileCardProps) {
  const { data: status } = useQuery({
    queryKey: ['file-status', file.id],
    queryFn: async () => {
      const res = await fetch(`/api/files/${file.id}`)
      return res.json()
    },
    refetchInterval: 5000, // Poll every 5 seconds
  })

  return (
    <div>
      <h3>{file.name}</h3>
      <span>Status: {status?.protection}</span>
    </div>
  )
}

// AFTER:
import { useProtectionStatus } from '@/hooks/use-protection-status'

export function FileCard({ file }: FileCardProps) {
  const { status, isRealtime } = useProtectionStatus({
    fileId: file.id,
    fallbackToPolling: true,
  })

  return (
    <div>
      <h3>{file.name}</h3>
      <span>Status: {status}</span>
      {!isRealtime && (
        <span className="text-xs text-yellow-600">
          (polling fallback)
        </span>
      )}
    </div>
  )
}
```

**Step 5: Update Dashboard List**

File: `apps/web/app/dashboard/page.tsx`

```typescript
// BEFORE:
const { data: files } = useQuery({
  queryKey: ['files'],
  queryFn: fetchFiles,
  refetchInterval: 10000,
})

// AFTER:
const { data: files, isLoading } = useQuery({
  queryKey: ['files'],
  queryFn: fetchFiles,
  // Remove refetchInterval - let real-time updates handle it
})

const { statuses, isLoading: statusesLoading } = useBulkProtectionStatus(
  files?.map(f => f.id) ?? []
)

// In render:
{files?.map(file => (
  <FileCard
    key={file.id}
    file={file}
    realTimeStatus={statuses.get(file.id)}
  />
))}
```

**Step 6: Update Protection Toggle**

File: `apps/web/components/ProtectionToggle.tsx`

```typescript
// BEFORE:
const mutation = useMutation({
  mutationFn: async (enabled: boolean) => {
    const res = await fetch(`/api/protect/${fileId}`, {
      method: 'POST',
      body: JSON.stringify({ enabled })
    })
    return res.json()
  },
  onSuccess: () => {
    // Refetch status after toggle
    queryClient.invalidateQueries({ queryKey: ['file-status', fileId] })
  }
})

// AFTER:
const { refetch: refetchStatus } = useProtectionStatus({ fileId })
const [isOptimistic, setIsOptimistic] = useState(false)

const mutation = useMutation({
  mutationFn: async (enabled: boolean) => {
    const res = await fetch(`/api/protect/${fileId}`, {
      method: 'POST',
      body: JSON.stringify({ enabled })
    })
    return res.json()
  },
  onMutate: (enabled) => {
    // Optimistic update
    setIsOptimistic(true)
  },
  onSuccess: () => {
    // Real-time update will come through subscription
    // Fallback: manual refetch if no real-time after 2s
    setTimeout(() => {
      if (isOptimistic) {
        refetchStatus()
      }
    }, 2000)
  }
})

return (
  <button
    onClick={() => mutation.mutate(!enabled)}
    disabled={mutation.isPending || isOptimistic}
  >
    {isOptimistic ? 'Updating...' : 'Toggle Protection'}
  </button>
)
```

### Database Schema Update

File: `apps/api/src/db/schema.ts`

Verify these tables exist in Drizzle schema:

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const protectedFiles = pgTable('protected_files', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  filePath: text('file_path').notNull(),
  protection: text('protection').notNull(), // 'enabled' | 'disabled'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const protectionStatusLog = pgTable('protection_status_log', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  fileId: text('file_id').notNull().references(() => protectedFiles.id),
  userId: text('user_id').notNull(),
  previousStatus: text('previous_status').notNull(),
  newStatus: text('new_status').notNull(),
  changedAt: timestamp('changed_at').defaultNow(),
})
```

Enable Supabase Realtime in Dashboard:
1. Go to Supabase Dashboard
2. Table Editor â†’ protected_files
3. Toggle "Realtime" in dropdown
4. Repeat for protection_status_log

### Testing & Verification

**Step 1: Create Real-Time Tests**

File: `apps/web/hooks/__tests__/use-protection-status.test.ts`

```typescript
import { renderHook, act, waitFor } from '@testing-library/react'
import { useProtectionStatus } from '../use-protection-status'
import { supabase } from '@/lib/supabase'
import { vi } from 'vitest'

vi.mock('@/lib/supabase')

describe('useProtectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches initial status', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { protection: 'enabled' },
        error: null,
      })
    })

    ;(supabase.from as any).mockImplementation(mockFrom)

    const { result } = renderHook(() =>
      useProtectionStatus({ fileId: 'file123' })
    )

    await waitFor(() => {
      expect(result.current.status).toBe('protected')
    })
  })

  it('subscribes to real-time updates', async () => {
    let onChangeCallback: any

    const mockChannel = {
      on: vi.fn((event, config, callback) => {
        onChangeCallback = callback
        return mockChannel
      }),
      subscribe: vi.fn(async (callback) => {
        callback('SUBSCRIBED')
        return mockChannel
      })
    }

    ;(supabase.channel as any).mockReturnValue(mockChannel)
    ;(supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { protection: 'enabled' },
        error: null,
      })
    })

    const onStatusChange = vi.fn()
    const { result } = renderHook(() =>
      useProtectionStatus({
        fileId: 'file123',
        onStatusChange,
      })
    )

    // Simulate real-time update
    act(() => {
      onChangeCallback({
        new: { protection: 'disabled' },
        eventType: 'UPDATE',
      })
    })

    await waitFor(() => {
      expect(result.current.status).toBe('unprotected')
      expect(onStatusChange).toHaveBeenCalledWith('unprotected')
    })
  })

  it('falls back to polling on channel error', async () => {
    let subscribeCallback: any

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(async (callback) => {
        subscribeCallback = callback
        return mockChannel
      })
    }

    ;(supabase.channel as any).mockReturnValue(mockChannel)

    const { result } = renderHook(() =>
      useProtectionStatus({
        fileId: 'file123',
        fallbackToPolling: true,
      })
    )

    expect(result.current.isRealtime).toBe(true)

    // Simulate channel error
    act(() => {
      subscribeCallback('CHANNEL_ERROR')
    })

    await waitFor(() => {
      expect(result.current.isRealtime).toBe(false)
    })
  })
})
```

```bash
# Run real-time tests
pnpm test use-protection-status.test.ts --run

# Should PASS
```

**Step 2: Integration Test**

File: `apps/web/__tests__/dashboard-realtime.integration.test.ts`

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { Dashboard } from '@/app/dashboard/page'
import { supabase } from '@/lib/supabase'
import { vi } from 'vitest'

vi.mock('@/lib/supabase')

describe('Dashboard Real-Time Integration', () => {
  it('updates file protection status in real-time', async () => {
    // Mock Supabase subscription
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue(mockChannel),
    }

    ;(supabase.channel as any).mockReturnValue(mockChannel)

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    )

    // Verify files load
    await waitFor(() => {
      expect(screen.getByText(/files/i)).toBeInTheDocument()
    })

    // Verify real-time subscription created
    expect(supabase.channel).toHaveBeenCalled()
    expect(mockChannel.subscribe).toHaveBeenCalled()

    // Verify status displays
    await waitFor(() => {
      expect(screen.getByText(/protected|unprotected/)).toBeInTheDocument()
    })
  })
})
```

**Step 3: Latency Comparison Test**

File: `apps/web/__tests__/latency-polling-vs-realtime.test.ts`

```typescript
import { test, expect } from 'vitest'

describe('Latency: Polling vs Real-Time', () => {
  it('real-time should be <500ms, polling should be 5-10s', () => {
    // Polling latency: status change â†’ 5s interval â†’ 5-10s total
    const pollingLatency = { min: 5000, max: 10000 }

    // Real-time latency: status change â†’ WebSocket push â†’ <500ms
    const realtimeLatency = { min: 0, max: 500 }

    expect(realtimeLatency.max).toBeLessThan(pollingLatency.min)
    expect(realtimeLatency.max).toBeLessThan(1000) // SLA: <1s
  })
})
```

**Step 4: Backward Compatibility Test**

Ensure old polling still works if real-time fails:

```typescript
test('polling fallback works if real-time unavailable', async () => {
  const { result } = renderHook(() =>
    useProtectionStatus({
      fileId: 'file123',
      fallbackToPolling: true, // Enabled by default
    })
  )

  // Even if real-time fails, polling should engage
  expect(result.current.isRealtime).toBe(false) // After failure
  expect(result.current.status).not.toBe('loading') // Data still loads
})
```

**Step 5: Bundle Size Check**

```bash
# Measure bundle with Supabase
pnpm build:web

du -sh apps/web/.next/static

# Supabase adds ~30KB
# Expected total: ~8.3MB (was 8MB before Supabase)
```

**Step 6: Environment Variable Validation**

```typescript
// apps/web/lib/supabase.ts - Add validation
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
}
```

```bash
# Verify env vars in CI/CD
echo "SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "SUPABASE_KEY configured: ${#NEXT_PUBLIC_SUPABASE_ANON_KEY}"
```

### Checklist for Phase 2 Completion

- [ ] Supabase client created and connection verified
- [ ] `useProtectionStatus` hook implemented and tested
- [ ] `useBulkProtectionStatus` hook implemented and tested
- [ ] FileCard component updated to use real-time
- [ ] Dashboard list updated to use real-time
- [ ] Protection toggle uses optimistic updates
- [ ] Real-time fallback to polling works
- [ ] All integration tests passing
- [ ] Latency verified <500ms vs 5-10s polling
- [ ] Bundle size increase acceptable (~30KB)
- [ ] Supabase realtime enabled in dashboard
- [ ] Environment variables set and validated

### Rollback Plan (if needed)

```bash
# If Phase 2 causes issues:
git revert <commit-hash>

# Remove Supabase subscription logic
# Revert to polling in FileCard, Dashboard
# All old tests pass again
```

---

## PHASE 3: MCP AI SUGGESTIONS (Priority 3)

### Objective
Add AI-powered code protection recommendations to MCP server tools.

### Prerequisites
- âœ… Phase 1 & 2 complete and stable
- âœ… MCP server running
- âœ… OpenAI API key available

### Implementation Steps

**Step 1: Create Streaming Endpoint**

File: `apps/api/src/routes/suggestions.ts`

```typescript
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createRoute } from '@hono/zod-validator'
import { z } from 'zod'

const suggestProtectionSchema = z.object({
  filePath: z.string().describe('Path to the file being analyzed'),
  codeSnippet: z.string().optional().describe('Code content (optional)'),
  context: z.record(z.any()).optional().describe('Additional context'),
})

export const suggestProtectionRoute = createRoute({
  method: 'post' as const,
  path: '/api/v1/suggestions',
  validation: {
    body: suggestProtectionSchema,
  },
  handler: async (c) => {
    const { filePath, codeSnippet } = c.req.valid('json')

    // Verify user is authenticated
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Rate limit AI suggestions (pro users only for now)
    if (user.tier !== 'pro') {
      return c.json(
        { error: 'AI suggestions available for Pro users' },
        403
      )
    }

    const { textStream } = await streamText({
      model: openai('gpt-4o-mini', {
        structuredOutputs: false, // Streaming doesn't work with structured output
      }),
      system: `You are a code security expert analyzing files for protection needs.

Your task:
1. Analyze the provided code/file
2. Recommend a protection level: SAFE, WARN, BLOCK
3. List key risks (2-3 items)
4. Suggest secure patterns
5. Provide confidence score 0-100

Format your response clearly with these sections:
RECOMMENDATION: [SAFE|WARN|BLOCK]
CONFIDENCE: [0-100]%
RISKS:
- Risk 1
- Risk 2
- Risk 3
SECURE_PATTERNS:
- Pattern 1
- Pattern 2

Keep it concise and actionable.`,
      prompt: `Analyze this ${filePath} file for code protection needs:

${codeSnippet || 'No code provided, analyzing by file type.'}`,
      temperature: 0.3, // Consistent recommendations
      maxTokens: 300, // Keep responses brief
    })

    // Log suggestion request for analytics
    await db.insert(suggestionLogs).values({
      userId: user.id,
      filePath,
      model: 'gpt-4o-mini',
      timestamp: new Date(),
    })

    // Return streaming response
    return textStream.toTextStreamResponse({
      headers: {
        'X-Suggested-Tier': 'pro', // Mark as pro-tier feature
      }
    })
  }
})

// Add to API routes
export function registerSuggestionRoutes(app: Hono) {
  app.post('/api/v1/suggestions', suggestProtectionRoute.handler)
}
```

**Step 2: Create MCP Tool Handler**

File: `apps/mcp-server/src/tools/suggest-protection.ts`

```typescript
import type { Tool } from '@modelcontextprotocol/sdk/shared/messages.js'

export const suggestProtectionTool: Tool = {
  name: 'snapback.suggest_protection',
  description: `Get AI-powered code protection recommendations for a file.

**When to use:**
- Uncertain about protection level for a file
- Reviewing team contributions for security
- Analyzing new file types not seen before
- Enterprise/regulated code requiring assessment

**Returns:**
- Recommended protection level (SAFE/WARN/BLOCK)
- Risk analysis and reasoning
- Suggested secure patterns
- Confidence score`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to file (e.g., payment.ts, config.env)',
      },
      codeSnippet: {
        type: 'string',
        description: 'Optional: file content for analysis',
      },
    },
    required: ['filePath'],
  }
}

export async function handleSuggestProtection(
  args: any,
  apiClient: SnapBackAPIClient,
  apiKey: string
) {
  const { filePath, codeSnippet } = args

  try {
    const response = await fetch(
      `${process.env.SNAPBACK_API_URL || 'https://api.snapback.dev'}/api/v1/suggestions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          codeSnippet,
        })
      }
    )

    if (!response.ok) {
      if (response.status === 403) {
        return {
          content: [{
            type: 'text',
            text: 'AI suggestions require Pro plan. Upgrade to access this feature.'
          }]
        }
      }
      throw new Error(`API error: ${response.statusText}`)
    }

    // Stream response body
    const text = await response.text()

    return {
      content: [{
        type: 'text',
        text: text
      }]
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error getting protection suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}
```

**Step 3: Register Tool in MCP Server**

File: `apps/mcp-server/src/index.ts`

```typescript
import { suggestProtectionTool, handleSuggestProtection } from './tools/suggest-protection'

// In tool list handler:
if (name === 'snapback.suggest_protection') {
  // Validate schema
  const parsed = z.object({
    filePath: z.string(),
    codeSnippet: z.string().optional(),
  }).parse(args)

  return handleSuggestProtection(parsed, apiClient, apiKey)
}

// Add to tool list response
server.setRequestHandler(ListToolsRequest, async () => {
  return {
    tools: [
      // ... existing tools ...
      suggestProtectionTool, // Add new tool
    ]
  }
})
```

**Step 4: Create React Hook for UI**

File: `apps/web/hooks/use-protection-suggestion.ts`

```typescript
import { useCallback, useState } from 'react'

interface SuggestionResponse {
  recommendation: 'SAFE' | 'WARN' | 'BLOCK'
  confidence: number
  risks: string[]
  patterns: string[]
}

export function useProtectionSuggestion() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<SuggestionResponse | null>(null)

  const getSuggestion = useCallback(async (
    filePath: string,
    codeSnippet?: string
  ) => {
    setIsLoading(true)
    setError(null)
    setSuggestion(null)

    try {
      const response = await fetch('/api/v1/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, codeSnippet }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text)
      }

      // Parse streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += new TextDecoder().decode(value)
      }

      // Parse suggestion response
      const parsed = parseSuggestionResponse(fullText)
      setSuggestion(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { getSuggestion, isLoading, error, suggestion }
}

function parseSuggestionResponse(text: string): SuggestionResponse {
  // Parse format:
  // RECOMMENDATION: SAFE|WARN|BLOCK
  // CONFIDENCE: 95%
  // RISKS:
  // - Risk 1
  // - Risk 2
  // SECURE_PATTERNS:
  // - Pattern 1

  const lines = text.split('\n')
  const result: Partial<SuggestionResponse> = {}

  let section = ''
  const risks: string[] = []
  const patterns: string[] = []

  for (const line of lines) {
    if (line.startsWith('RECOMMENDATION:')) {
      const rec = line.split(':')[1]?.trim().toUpperCase()
      if (rec === 'SAFE' || rec === 'WARN' || rec === 'BLOCK') {
        result.recommendation = rec
      }
    } else if (line.startsWith('CONFIDENCE:')) {
      const conf = parseInt(line.split(':')[1]?.match(/\d+/)?.[0] || '0')
      result.confidence = conf
    } else if (line.startsWith('RISKS:')) {
      section = 'risks'
    } else if (line.startsWith('SECURE_PATTERNS:')) {
      section = 'patterns'
    } else if (line.startsWith('- ') && section === 'risks') {
      risks.push(line.substring(2))
    } else if (line.startsWith('- ') && section === 'patterns') {
      patterns.push(line.substring(2))
    }
  }

  return {
    recommendation: result.recommendation || 'SAFE',
    confidence: result.confidence || 0,
    risks,
    patterns,
  }
}
```

**Step 5: Create Suggestion Dialog**

File: `apps/web/components/SuggestionDialog.tsx`

```typescript
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useProtectionSuggestion } from '@/hooks/use-protection-suggestion'

interface SuggestionDialogProps {
  filePath: string
  codeSnippet?: string
  onApply?: (recommendation: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SuggestionDialog({
  filePath,
  codeSnippet,
  onApply,
  open,
  onOpenChange,
}: SuggestionDialogProps) {
  const { getSuggestion, isLoading, error, suggestion } =
    useProtectionSuggestion()

  const handleGetSuggestion = async () => {
    await getSuggestion(filePath, codeSnippet)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Protection Recommendation</DialogTitle>
        </DialogHeader>

        {!suggestion && !error && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Get AI-powered recommendation for protecting{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">
                {filePath}
              </code>
            </p>
            <Button
              onClick={handleGetSuggestion}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Analyzing...' : 'Get Recommendation'}
            </Button>
          </div>
        )}

        {suggestion && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold">
                {suggestion.recommendation}
              </div>
              <div className="text-sm text-gray-600">
                Confidence: {suggestion.confidence}%
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Key Risks</h4>
              <ul className="space-y-1 text-sm">
                {suggestion.risks.map((risk, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-red-500">â€¢</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Secure Patterns</h4>
              <ul className="space-y-1 text-sm">
                {suggestion.patterns.map((pattern, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-green-500">âœ“</span>
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={() => {
                onApply?.(suggestion.recommendation)
                onOpenChange(false)
              }}
              className="w-full"
            >
              Apply Recommendation
            </Button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
            {error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

### Testing & Verification

**Step 1: Create Suggestion Tests**

File: `apps/api/routes/__tests__/suggestions.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { testClient } from 'hono/testing'
import { app } from '@/index'

describe('POST /api/v1/suggestions', () => {
  it('returns streaming AI suggestion', async () => {
    const response = await testClient(app).post('/api/v1/suggestions', {
      filePath: 'payment.ts',
      codeSnippet: 'const amount = req.query.amount',
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')
  })

  it('requires authentication', async () => {
    const response = await testClient(app).post('/api/v1/suggestions', {
      filePath: 'payment.ts',
    })

    expect(response.status).toBe(401)
  })

  it('requires pro tier', async () => {
    const response = await testClient(app)
      .post('/api/v1/suggestions', {
        filePath: 'payment.ts',
      })
      .header('Authorization', 'Bearer free_user_token')

    expect(response.status).toBe(403)
  })
})
```

**Step 2: MCP Tool Test**

File: `apps/mcp-server/__tests__/suggest-protection-tool.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { handleSuggestProtection } from '../src/tools/suggest-protection'

describe('MCP: snapback.suggest_protection', () => {
  it('calls API with correct parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'RECOMMENDATION: WARN\nCONFIDENCE: 85%',
    })

    global.fetch = mockFetch

    const result = await handleSuggestProtection(
      { filePath: 'payment.ts', codeSnippet: 'const x = 1' },
      {} as any,
      'test_key'
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/suggestions'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test_key',
        })
      })
    )

    expect(result.content[0].text).toContain('RECOMMEND')
  })

  it('handles pro-tier requirement', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    })

    global.fetch = mockFetch

    const result = await handleSuggestProtection(
      { filePath: 'test.ts' },
      {} as any,
      'free_key'
    )

    expect(result.content[0].text).toContain('Pro plan')
  })
})
```

**Step 3: Hook Test**

File: `apps/web/hooks/__tests__/use-protection-suggestion.test.ts`

```typescript
import { renderHook, act, waitFor } from '@testing-library/react'
import { useProtectionSuggestion } from '../use-protection-suggestion'
import { vi } from 'vitest'

global.fetch = vi.fn()

describe('useProtectionSuggestion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches and parses suggestion', async () => {
    const mockResponse = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'RECOMMENDATION: WARN\nCONFIDENCE: 85%\nRISKS:\n- Input not validated'
          )
        )
        controller.close()
      },
    })

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      body: mockResponse,
    })

    const { result } = renderHook(() => useProtectionSuggestion())

    act(() => {
      result.current.getSuggestion('payment.ts', 'const x = req.query')
    })

    await waitFor(() => {
      expect(result.current.suggestion).toBeDefined()
      expect(result.current.suggestion?.recommendation).toBe('WARN')
      expect(result.current.suggestion?.confidence).toBe(85)
    })
  })
})
```

### Checklist for Phase 3 Completion

- [ ] Streaming endpoint created and tested
- [ ] MCP tool registered and callable
- [ ] React hook for suggestions created
- [ ] Suggestion dialog UI component built
- [ ] All tests passing (API, MCP, Hook)
- [ ] Pro-tier gating enforced
- [ ] Rate limiting implemented
- [ ] Error handling for API failures
- [ ] Streaming response working in Cursor/Claude
- [ ] Analytics logged for usage tracking
- [ ] Documentation updated with new tool

### Rollback Plan (if needed)

```bash
# If Phase 3 causes issues:
git revert <commit-hash>

# Remove suggestion endpoint
# Remove MCP tool
# All existing tests pass again
```

---

## PHASE 4: EXPRESS â†’ HONO MIGRATION (Priority 4)

### Objective
Replace Express with Hono for 3x performance improvement and edge-readiness.

### Prerequisites
- âœ… Phase 1-3 complete and stable
- âœ… All tests passing

### Implementation Steps

**Step 1: Setup Hono**

```bash
pnpm add -D hono

# Update apps/mcp-server/package.json
```

**Step 2: Analyze Current Express Usage**

File: `apps/mcp-server/MIGRATION_PLAN.md`

```typescript
// Current Express usage in MCP server:

// 1. App initialization
const app = express()

// 2. Middleware
app.use(cors())
app.use(express.json())
app.use(morgan('combined'))

// 3. Routes
app.post('/mcp/call_tool', (req, res) => { ... })
app.get('/mcp/health', (req, res) => { ... })

// 4. Error handling
app.use((err, req, res, next) => { ... })

// 5. Server listen
app.listen(port, callback)

// Hono equivalents:
// 1. const app = new Hono()
// 2. app.use('*', cors()), app.use(logger()), built-in JSON
// 3. app.post('/path', handler), app.get('/path', handler)
// 4. app.onError((err, c) => { ... })
// 5. Depends on runtime (Node.js, Cloudflare, etc.)
```

**Step 3: Create New Hono HTTP Server**

File: `apps/mcp-server/src/http-server-hono.ts`

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'

export class MCPHttpServerHono {
  private app: Hono
  private mcp: Server

  constructor(mcp: Server) {
    this.mcp = mcp
    this.app = new Hono()

    // Middleware
    this.app.use('*', cors())
    this.app.use('*', logger())

    // Health check
    this.app.get('/mcp/health', (c) => {
      return c.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // Tool call handler
    this.app.post('/mcp/call_tool', async (c) => {
      try {
        const body = await c.req.json()
        const { toolName, arguments: args } = body

        if (!toolName) {
          return c.json({ error: 'toolName required' }, 400)
        }

        // Call MCP server tool
        const result = await this.mcp.callTool(toolName, args)

        return c.json(result)
      } catch (error) {
        console.error('Tool call error:', error)
        return c.json(
          {
            error: error instanceof Error ? error.message : 'Tool call failed',
          },
          500
        )
      }
    })

    // Error handler
    this.app.onError((err, c) => {
      console.error('HTTP error:', err)
      return c.json(
        { error: err instanceof Error ? err.message : 'Internal server error' },
        500
      )
    })

    // 404 handler
    this.app.notFound((c) => {
      return c.json({ error: 'Not found' }, 404)
    })
  }

  async listen(port: number): Promise<void> {
    // Node.js implementation
    const { createServer } = await import('node:http')

    return new Promise((resolve) => {
      const server = createServer(this.app.fetch)

      server.listen(port, () => {
        console.log(`MCP HTTP server listening on http://localhost:${port}`)
        resolve()
      })
    })
  }
}
```

**Step 4: Test New Implementation**

File: `apps/mcp-server/__tests__/http-server-hono.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { testClient } from 'hono/testing'
import { MCPHttpServerHono } from '../src/http-server-hono'

describe('MCPHttpServerHono', () => {
  let server: MCPHttpServerHono
  let testingApp: any

  beforeEach(() => {
    const mockMCP = {
      callTool: async (name: string, args: any) => {
        if (name === 'test_tool') {
          return { success: true, data: args }
        }
        throw new Error(`Unknown tool: ${name}`)
      }
    }

    server = new MCPHttpServerHono(mockMCP as any)
    testingApp = testClient(server.app)
  })

  it('responds to health check', async () => {
    const res = await testingApp.get('/mcp/health')

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ok')
  })

  it('calls tool via POST /mcp/call_tool', async () => {
    const res = await testingApp.post('/mcp/call_tool', {
      toolName: 'test_tool',
      arguments: { param: 'value' }
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.param).toBe('value')
  })

  it('returns 400 for missing toolName', async () => {
    const res = await testingApp.post('/mcp/call_tool', {
      arguments: {}
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('toolName required')
  })

  it('returns 404 for unknown route', async () => {
    const res = await testingApp.get('/unknown')

    expect(res.status).toBe(404)
  })

  it('handles tool call errors', async () => {
    const res = await testingApp.post('/mcp/call_tool', {
      toolName: 'unknown_tool',
      arguments: {}
    })

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toContain('Unknown tool')
  })
})
```

**Step 5: Run Both Implementations Side-by-Side**

Update `apps/mcp-server/src/index.ts`:

```typescript
// TEMPORARY: Run both implementations
const USE_HONO = process.env.USE_HONO_SERVER === 'true'

async function main() {
  const mcp = new MCPServer(...)

  let server: MCPHttpServer | MCPHttpServerHono

  if (USE_HONO) {
    console.log('Using Hono HTTP server')
    server = new MCPHttpServerHono(mcp)
  } else {
    console.log('Using Express HTTP server')
    server = new MCPHttpServer(mcp)
  }

  await server.listen(process.env.PORT || 3001)
}

main().catch(console.error)
```

**Step 6: Performance Comparison**

Create: `apps/mcp-server/__tests__/performance.bench.ts`

```typescript
import { bench, describe } from 'vitest'
import { testClient as honoTestClient } from 'hono/testing'
import { MCPHttpServerHono } from '../src/http-server-hono'

const mockMCP = {
  callTool: async (name: string) => ({ success: true })
}

describe('Performance: Hono vs Express', () => {
  bench('Hono: /mcp/health', async () => {
    const server = new MCPHttpServerHono(mockMCP as any)
    const client = honoTestClient(server.app)
    await client.get('/mcp/health')
  })

  // Also test Express for comparison
  // Expected: Hono 3x faster
})
```

Run benchmark:
```bash
pnpm test --bench performance.bench.ts
```

**Step 7: Full Migration**

Once tests pass, fully migrate:

1. Update `apps/mcp-server/src/index.ts` to use `MCPHttpServerHono` by default
2. Remove Express HTTP server class
3. Remove Express dependency from package.json
4. Update documentation

```typescript
// apps/mcp-server/src/index.ts (final)
import { MCPHttpServerHono } from './http-server-hono'

async function main() {
  const mcp = new MCPServer(...)
  const server = new MCPHttpServerHono(mcp)
  await server.listen(process.env.PORT || 3001)
}
```

### Checklist for Phase 4 Completion

- [ ] Hono HTTP server implemented
- [ ] All existing Express tests pass with Hono
- [ ] New Hono-specific tests added and passing
- [ ] Performance benchmarks show 3x improvement
- [ ] Health check endpoint working
- [ ] Tool call endpoint working
- [ ] Error handling working
- [ ] Express HTTP server removed
- [ ] Express dependency removed from package.json
- [ ] Documentation updated to reference Hono
- [ ] Docker build still works
- [ ] No performance regressions

### Rollback Plan (if needed)

```bash
# If Hono migration causes issues:
git revert <commit-hash>

# Express HTTP server restored
# All tests pass again
# Express dependency restored
```

---

## PHASE 5: BETTER-AUTH ENHANCEMENTS (Priority 5)

### Objective
Add enterprise auth features: 2FA and organizations.

### Prerequisites
- âœ… Phase 1-4 complete and stable
- âœ… Better-auth already in use
- âœ… Database setup ready

### Implementation Steps

**Step 1: Install 2FA Plugin**

```bash
pnpm add better-auth-plugin-2fa
```

**Step 2: Update Better-Auth Config**

File: `apps/api/src/auth.ts`

```typescript
import { betterAuth } from 'better-auth'
import { twoFactor } from 'better-auth/plugins'
import { organization } from 'better-auth/plugins'
import { db } from '@/db'

export const auth = betterAuth({
  database: {
    db: db,
    provider: 'pg',
  },
  baseURL: process.env.AUTH_URL || 'http://localhost:3000',
  appName: 'SnapBack',
  secret: process.env.AUTH_SECRET,
  plugins: [
    twoFactor({
      issuer: 'SnapBack Pro',
    }),
    organization(),
  ],
  rateLimit: {
    window: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 failed attempts
  },
})
```

**Step 3: Run Database Migrations**

Better-auth auto-creates required tables:

```bash
pnpm db:migrate
```

Verify tables created:
- `users`
- `sessions`
- `accounts`
- `verifications`
- `two_factors` (new)
- `organizations` (new)
- `organization_members` (new)
- `organization_invitations` (new)

**Step 4: Create 2FA Setup UI**

File: `apps/web/components/auth/2fa-setup.tsx`

```typescript
import { useState } from 'react'
import { useAuthClient } from '@/hooks/use-auth-client'
import QRCode from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface TwoFactorSetupProps {
  onSuccess?: () => void
}

export function TwoFactorSetup({ onSuccess }: TwoFactorSetupProps) {
  const authClient = useAuthClient()
  const [step, setStep] = useState<'request' | 'verify' | 'backup'>('request')
  const [secret, setSecret] = useState('')
  const [totpUri, setTotpUri] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEnable = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Request 2FA setup
      const response = await authClient.twoFactor.enable({
        password: prompt('Enter your password to enable 2FA') || '',
      })

      setSecret(response.secret)
      setTotpUri(response.totpURI)
      setStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Verify TOTP code
      const response = await authClient.twoFactor.verifyTOTP({
        code: verificationCode,
        trustDevice: false,
      })

      setBackupCodes(response.backupCodes)
      setStep('backup')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Set Up 2FA</h2>
            <p className="text-gray-600 mt-1">
              Protect your SnapBack account with two-factor authentication
            </p>
          </div>

          {step === 'request' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You'll need an authenticator app like Google Authenticator or Authy
              </p>
              <Button onClick={handleEnable} disabled={isLoading} className="w-full">
                {isLoading ? 'Enabling...' : 'Continue'}
              </Button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <QRCode value={totpUri} size={200} />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Secret Key</p>
                <code className="block bg-gray-100 p-2 rounded text-sm break-all">
                  {secret}
                </code>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter 6-digit code
                </label>
                <Input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 p-2 rounded text-sm text-red-800">
                  {error}
                </div>
              )}

              <Button
                onClick={handleVerify}
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          )}

          {step === 'backup' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded">
                <p className="font-semibold text-green-900">2FA Enabled!</p>
                <p className="text-sm text-green-800 mt-1">
                  Your account is now protected
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Backup Codes</p>
                <p className="text-xs text-gray-600 mb-3">
                  Save these codes in a secure location. Use them if you lose access to your authenticator.
                </p>
                <div className="bg-gray-50 p-3 rounded space-y-1">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="block font-mono text-sm">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => {
                  onSuccess?.()
                }}
                className="w-full"
              >
                I've Saved My Codes
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 5: Create Organization Management UI**

File: `apps/web/components/org/organization-settings.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthClient } from '@/hooks/use-auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export function OrganizationSettings({ orgId }: { orgId: string }) {
  const authClient = useAuthClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  // Fetch organization members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['org-members', orgId],
    queryFn: async () => {
      return await authClient.organization.listMembers({
        organizationId: orgId,
      })
    },
  })

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      return await authClient.organization.inviteMember({
        organizationId: orgId,
        email,
        role: 'member',
      })
    },
    onSuccess: () => {
      setInviteEmail('')
      setShowInviteDialog(false)
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Team Members</h2>
        <p className="text-gray-600">Manage your organization members</p>
      </div>

      {membersLoading ? (
        <p>Loading members...</p>
      ) : (
        <div className="space-y-2">
          {members?.map((member: any) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 border rounded"
            >
              <div>
                <p className="font-medium">{member.user.email}</p>
                <p className="text-sm text-gray-600">{member.role}</p>
              </div>
              {/* Action buttons */}
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={() => setShowInviteDialog(true)}
        className="w-full"
      >
        Invite Member
      </Button>

      {showInviteDialog && (
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent>
            <div className="space-y-4">
              <h3 className="font-bold">Invite Member</h3>
              <Input
                type="email"
                placeholder="member@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button
                onClick={() => inviteMutation.mutate(inviteEmail)}
                disabled={inviteMutation.isPending || !inviteEmail}
                className="w-full"
              >
                {inviteMutation.isPending ? 'Inviting...' : 'Send Invite'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
```

**Step 6: Add API Middleware for 2FA Enforcement**

File: `apps/api/src/middleware/2fa-check.ts`

```typescript
import type { Hono } from 'hono'
import { auth } from '@/auth'

export async function check2FA(c, next) {
  const session = await auth.getSession()

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // For pro users, enforce 2FA on sensitive endpoints
  if (session.user?.tier === 'pro' && !session.user?.twoFactorEnabled) {
    return c.json(
      { error: '2FA required for Pro users', code: 'REQUIRES_2FA' },
      403
    )
  }

  await next()
}
```

### Testing & Verification

**Step 1: Create 2FA Tests**

File: `apps/api/__tests__/2fa.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { auth } from '@/auth'

describe('2FA Plugin', () => {
  it('enables 2FA for user', async () => {
    // Mock user with password
    const user = { id: 'user1', email: 'test@example.com' }

    const result = await auth.twoFactor.enable({
      userId: user.id,
      password: 'password123',
    })

    expect(result.secret).toBeDefined()
    expect(result.totpURI).toBeDefined()
  })

  it('verifies TOTP code', async () => {
    // Would require actual TOTP generation
    // Typically tested with totp-generator library
    expect(true).toBe(true) // Placeholder
  })

  it('disables 2FA with password', async () => {
    const result = await auth.twoFactor.disable({
      userId: 'user1',
      password: 'password123',
    })

    expect(result).toEqual({ success: true })
  })
})
```

**Step 2: Organization Tests**

File: `apps/api/__tests__/organizations.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { auth } from '@/auth'

describe('Organizations Plugin', () => {
  it('creates organization', async () => {
    const org = await auth.organization.create({
      name: 'Acme Corp',
      slug: 'acme-corp',
    })

    expect(org.id).toBeDefined()
    expect(org.name).toBe('Acme Corp')
  })

  it('invites member to organization', async () => {
    const invite = await auth.organization.inviteMember({
      organizationId: 'org1',
      email: 'member@company.com',
      role: 'member',
    })

    expect(invite.invitationToken).toBeDefined()
  })

  it('lists organization members', async () => {
    const members = await auth.organization.listMembers({
      organizationId: 'org1',
    })

    expect(Array.isArray(members)).toBe(true)
  })
})
```

### Checklist for Phase 5 Completion

- [ ] Better-auth 2FA plugin installed and configured
- [ ] Better-auth organization plugin installed and configured
- [ ] Database migrations ran successfully
- [ ] 2FA setup UI component created and tested
- [ ] Organization settings UI component created and tested
- [ ] 2FA enforcement middleware implemented
- [ ] All 2FA tests passing
- [ ] All organization tests passing
- [ ] Invite flow tested end-to-end
- [ ] Backup codes working
- [ ] Documentation updated
- [ ] Pricing page highlights 2FA & Teams for Pro tier

### Rollback Plan (if needed)

```bash
# If Phase 5 causes issues:
git revert <commit-hash>

# Remove 2FA and organization plugins
# Drizzle migration to remove new tables
# All existing tests pass again
```

---

## VERIFICATION & VALIDATION CHECKLIST

Before considering implementation complete, verify:

### Post-Implementation Verification

**Unit Tests:**
```bash
pnpm test --run

# Expected: All tests passing
# Baseline: BASELINE_TEST_RESULTS.txt from Phase 1
# Comparison: Zero new failures
```

**Integration Tests:**
```bash
pnpm test:integration --run

# Expected: All integration tests passing
# Verify: Supabase real-time, MCP tools, 2FA flow, organization invites
```

**Type Safety:**
```bash
pnpm tsc --noEmit

# Expected: Zero TypeScript errors
```

**Bundle Size:**
```bash
pnpm build:web
du -sh apps/web/.next/static

# Expected: ~8-8.5MB (target from Phase 1)
# Acceptable range: 8-9MB
```

**Performance:**
```bash
# MCP server latency
# Expected: p50 <5ms, p99 <15ms (vs Express p50 12ms)

# Real-time latency
# Expected: <500ms (vs polling 5-10s)

# Dashboard bundle
# Expected: +30KB (Supabase)
```

**Backward Compatibility:**
```bash
# All existing APIs unchanged
# No breaking changes to public exports
# Old code continues to work
```

**Feature Flags:**
- [ ] Supabase real-time flag works
- [ ] AI suggestions tier-gated to Pro
- [ ] 2FA optional for Pro users
- [ ] Organizations optional for Pro users
- [ ] All features gracefully degrade if unavailable

**Environment Variables:**
```bash
# Verify all required env vars documented
# apps/web/.env.local
# apps/api/.env
# apps/mcp-server/.env

# Test with missing vars
# Should fail gracefully with clear error messages
```

---

## IMPLEMENTATION SUCCESS CRITERIA

All of the following must be true:

âœ… **Zero Regressions**
- All existing tests pass
- No new test failures introduced
- No breaking changes to public APIs

âœ… **Code Quality**
- TypeScript compilation succeeds
- ESLint passes
- All code reviewed and tested

âœ… **Performance**
- Bundle size reduced by 3MB (Phase 1)
- MCP latency 3x faster (Phase 4)
- Real-time latency <500ms (Phase 2)

âœ… **Feature Completeness**
- All 5 phases implemented
- All features tested
- All features documented

âœ… **Stability**
- Feature flags enable gradual rollout
- Fallback mechanisms work
- Error handling implemented

âœ… **Observability**
- Sentry tracks all errors
- Analytics consolidated
- Logging implemented

---

## CRITICAL REMINDERS FOR LLM AGENT

âš ï¸ **DO NOT** proceed with next phase if previous phase has failing tests

âš ï¸ **DO** verify backward compatibility before submitting changes

âš ï¸ **DO** add tests for all new features

âš ï¸ **DO** document all breaking changes (there should be none)

âš ï¸ **DO** use feature flags for gradual rollout

âš ï¸ **DO** create rollback plans for each phase

âš ï¸ **DO NOT** skip the verification checklist

âš ï¸ **DO** report metrics after each phase

---

## SUMMARY FOR LLM AGENT

You have 5 phases to implement:

1. **Phase 1 (4 hours):** Remove 6 analytics providers, keep PostHog only
   - Expected: 3MB bundle reduction
   - Status: Low risk, immediate value

2. **Phase 2 (2 weeks):** Add Supabase real-time updates
   - Expected: <500ms latency vs 5-10s polling
   - Status: Medium risk, major UX improvement

3. **Phase 3 (1 week):** Add MCP AI suggestions tool
   - Expected: Competitive feature, Pro-tier revenue
   - Status: Medium risk, high-value feature

4. **Phase 4 (1 week):** Express â†’ Hono migration
   - Expected: 3x performance improvement
   - Status: Low risk, infrastructure improvement

5. **Phase 5 (2 weeks):** Better-auth enhancements (2FA + Organizations)
   - Expected: Enterprise features, higher ARPU
   - Status: Medium risk, revenue multiplier

**Total estimated effort:** 61 hours (~2 weeks with one engineer)

**Success metric:** Zero regressions, all tests pass, all features implemented

---

**This prompt is your source of truth. Reference it constantly. Verify each requirement. Test everything. Move carefully but steadily through the phases.**

**Good luck, agent. The future of SnapBack depends on this execution.**
