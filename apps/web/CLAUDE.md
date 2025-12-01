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
- **Analytics**: Usage stats, risk detection metrics
- **Team Management**: Organization members, roles, permissions

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

### Event Bus Integration
**Client mode** for `@snapback/events`:
- Subscribes to `SNAPSHOT_CREATED` from VSCode extension
- Publishes `PROTECTION_CHANGED` to sync across devices
- Real-time dashboard updates

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

## Related Docs
- Event Bus: [packages/events/CLAUDE.md](../../packages/events/CLAUDE.md)
- SDK: [packages/sdk/CLAUDE.md](../../packages/sdk/CLAUDE.md)
