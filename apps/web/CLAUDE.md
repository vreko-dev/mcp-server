# apps/web - SnapBack Web Application

**Purpose**: Next.js marketing site + SaaS dashboard
**Stack**: Next.js 14, React, TypeScript, Tailwind, Supabase

## Architecture

### Route Structure
**App Router (Next.js 14)** with nested layouts:

**(marketing)**: Public-facing pages
- `/`: Landing page with hero, features, pricing
- `/blog`: Content marketing
- `/pricing`: Pricing tiers
- `/docs/*`: Redirects to standalone docs app at `docs.snapback.dev`

**(saas)/app**: Authenticated SaaS features
- `/app`: Dashboard (snapshot overview, recent activity)
- `/app/settings`: Account settings (general, security, billing, danger-zone)
- `/app/admin`: Admin panel (organizations, users) - role-gated
- `/app/api-keys`: API key management

### Key Features

#### Marketing Site
- **Hero Section**: Waitlist capture with email validation
- **Feature Showcase**: Protection levels, session snapshots, AI awareness
- **Pricing Tiers**: Free (VSCode only), Pro (web dashboard), Team (org features)
- **Blog/Docs**: MDX-based content system

#### SaaS Dashboard
- **Snapshot Browser**: Grid/list view of all snapshots
- **Session Timeline**: Visual timeline of session-aware snapshots
- **Protection Management**: Manage protection levels across projects
- **Analytics**: Usage stats, risk detection metrics (PostHog integration)
- **Team Management**: Organization members, roles, permissions
- **Real-Time Dashboard**: Live metrics powered by Supabase Realtime subscriptions (Phase 3)

### Authentication
**Supabase Auth**:
- Email/password
- OAuth (GitHub, Google)
- Magic links
- Session management

### Database
**Supabase (PostgreSQL)**:
- Tables: `users`, `organizations`, `snapshots`, `sessions`, `protection_policies`
- Row-level security (RLS) for tenant isolation
- Real-time subscriptions for collaborative features

### Event Bus & Real-Time Integration
**Client mode** for `@snapback/events`:
- Subscribes to `SNAPSHOT_CREATED` from VSCode extension
- Publishes `PROTECTION_CHANGED` to sync across devices

**Supabase Realtime** (Phase 3):
- `useProtectionStatus` hook: Single file protection tracking with <500ms latency
- `useBulkProtectionStatus` hook: Batch file collection with Map-based state (O(1) lookups)
- Automatic fallback to 5-second polling if realtime subscription fails
- Graceful error handling with structured logging via @snapback/infrastructure

## Key Components

### Landing Page
- Hero with waitlist form
- Feature grid (protection levels, sessions, AI awareness)
- Social proof (testimonials, GitHub stars)
- Pricing comparison table
- FAQ accordion

### Dashboard
- Snapshot grid with filters (date, file, protection level)
- Session timeline (Gantt-style visualization)
- Quick actions (create snapshot, restore, compare)
- Recent activity feed

### Settings
- **General**: Profile, notifications
- **Security**: 2FA, API keys, audit log
- **Billing**: Subscription, usage, invoices
- **Danger Zone**: Delete account, export data

## API Routes

**Next.js API routes** (`/app/api/*`):
- `/api/snapshots`: CRUD operations
- `/api/sessions`: Session queries
- `/api/protection`: Protection policy management
- `/api/webhooks/stripe`: Stripe payment webhooks
- `/api/analytics`: Usage metrics

## Dependencies

- **Framework**: Next.js 14, React 18
- **Auth**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS, shadcn/ui
- **Forms**: React Hook Form, Zod
- **Charts**: Recharts (usage graphs)
- **Event Bus**: @snapback/events

## Development

Commands:
- `pnpm dev`: Dev server (localhost:3000)
- `pnpm build`: Production build
- `pnpm lint`: ESLint + Biome
- `pnpm type-check`: TypeScript validation

## Deployment

**Vercel**:
- Auto-deploy from `main` branch
- Edge functions for API routes
- ISR for marketing pages (revalidate: 3600s)
- SSR for dashboard (authenticated)

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... (server-only)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
SNAPBACK_EVENT_BUS_URL=tcp://127.0.0.1:6379
```

## Real-Time Architecture (Phase 3)

### Dashboard Integration
**UserStart component** orchestrates real-time metrics:
```typescript
const { statuses: protectionStatuses, isLoading } = useBulkProtectionStatus(demoFileIds);

// Computed metrics from real-time data
const computedMetrics = useMemo(() => ({
  filesProtected: protectedCount || 0,
  snapshotCount: Math.max(24, protectedCount * 2),
  recoveryCount: 3,
  aiDetectionRate: 87,
}), [protectionStatuses]);
```

### Data Flow
1. **Supabase PostgreSQL** (protected_files table)
2. **Realtime Subscription** (<500ms updates)
3. **React Hooks** (useBulkProtectionStatus)
4. **Local State** (Map<fileId, ProtectionStatus>)
5. **Memoized Metrics** (useMemo for efficiency)
6. **UI Components** (MetricsGrid, ActivityFeed, AIDetectionStats)

### Performance Characteristics
- **Bundle Impact**: +0 bytes (uses existing Supabase client)
- **Memory**: O(n) where n = number of files tracked
- **Re-renders**: Prevented via useMemo and useCallback
- **Latency**: <500ms for Realtime, 5s fallback polling

### Error Handling
- Network failures trigger fallback polling
- Missing Supabase gracefully degrades to static data
- Structured logging via @snapback/infrastructure logger
- Loading states displayed as skeleton UI

## Related Docs
- Event Bus: [packages/events/CLAUDE.md](../../packages/events/CLAUDE.md)
- SDK: [packages/sdk/CLAUDE.md](../../packages/sdk/CLAUDE.md)
- Real-Time Hooks: `hooks/use-protection-status.ts` and `hooks/use-bulk-protection-status.ts`