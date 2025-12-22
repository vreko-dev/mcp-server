# @snapback/web

**SnapBack Web Application** - Next.js marketing site and SaaS dashboard.

## Overview

The SnapBack web application provides:
- **Marketing Site**: Landing pages, pricing, blog, documentation
- **SaaS Dashboard**: Snapshot management, analytics, settings
- **Admin Panel**: User and organization management

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **UI**: [React 18](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **Auth**: [Better Auth](https://www.better-auth.com/) via `@snapback/auth`
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Analytics**: [PostHog](https://posthog.com/)
- **Payments**: [Stripe](https://stripe.com/)
- **Monitoring**: [Sentry](https://sentry.io/)

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm --filter @snapback/web dev

# Runs at http://localhost:3000
```

### Environment Variables

```bash
cp apps/web/.env.example .env.local
```

Required variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Auth
BETTER_AUTH_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry
SENTRY_DSN=https://...
```

See [DEPLOYMENT_ENV_VARS.md](./DEPLOYMENT_ENV_VARS.md) for complete reference.

## Routes

### Marketing (Public)

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero, features, pricing |
| `/pricing` | Pricing comparison |
| `/blog` | Blog posts (MDX) |
| `/blog/[slug]` | Individual blog post |
| `/docs` | Redirects to docs.snapback.dev |

### SaaS Dashboard (Authenticated)

| Route | Description |
|-------|-------------|
| `/app` | Dashboard (snapshot overview, activity) |
| `/app/snapshots` | Snapshot browser |
| `/app/sessions` | Session timeline |
| `/app/protection` | Protection management |
| `/app/settings` | Account settings |
| `/app/settings/general` | Profile & notifications |
| `/app/settings/security` | 2FA, API keys |
| `/app/settings/billing` | Subscription & invoices |
| `/app/api-keys` | API key management |

### Admin (Role-Gated)

| Route | Description |
|-------|-------------|
| `/app/admin` | Admin dashboard |
| `/app/admin/users` | User management |
| `/app/admin/organizations` | Organization management |

## Project Structure

```
apps/web/
├── app/                    # Next.js App Router
│   ├── (marketing)/        # Public marketing pages
│   │   ├── page.tsx        # Landing page
│   │   ├── pricing/        # Pricing page
│   │   └── blog/           # Blog
│   ├── (saas)/             # Authenticated SaaS
│   │   └── app/            # Dashboard routes
│   ├── api/                # API routes
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   ├── dashboard/          # Dashboard components
│   └── marketing/          # Marketing components
├── hooks/                  # React hooks
│   ├── use-protection-status.ts
│   └── use-bulk-protection-status.ts
├── lib/                    # Utilities
│   ├── auth.ts             # Auth utilities
│   ├── supabase/           # Supabase clients
│   └── utils.ts            # Helper functions
├── modules/                # Feature modules
│   ├── dashboard/          # Dashboard features
│   ├── marketing/          # Marketing features
│   └── settings/           # Settings features
├── content/                # MDX content
│   ├── blog/               # Blog posts
│   └── docs/               # Documentation
└── public/                 # Static assets
```

## Key Features

### Marketing Site

- **Hero Section**: Email capture with waitlist
- **Feature Showcase**: Protection levels, sessions, AI awareness
- **Pricing Tiers**: Free, Pro, Team
- **Blog**: MDX-powered content
- **SEO**: Optimized meta tags, structured data

### SaaS Dashboard

- **Snapshot Browser**: Grid/list view with filters
- **Session Timeline**: Gantt-style visualization
- **Real-Time Updates**: Supabase Realtime subscriptions
- **Protection Management**: Per-file protection settings
- **Analytics**: Usage graphs, risk detection metrics
- **Team Management**: Organizations, members, roles

### Real-Time Features

Uses Supabase Realtime for live updates:

```typescript
import { useBulkProtectionStatus } from "@/hooks/use-bulk-protection-status";

const { statuses, isLoading } = useBulkProtectionStatus(
  fileIds,
  (fileId, newStatus) => {
    // Handle status change
  }
);
```

## Development

### Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### Testing

```bash
# Unit tests (Vitest)
pnpm test

# E2E tests (Playwright)
pnpm test:e2e

# Run specific test
pnpm test -- --grep "dashboard"
```

## Deployment

### Vercel (Production)

Auto-deploys from `main` branch:
- Edge functions for API routes
- ISR for marketing pages (revalidate: 1 hour)
- SSR for dashboard (authenticated)

### Manual Deploy

```bash
pnpm build
vercel deploy --prod
```

## Architecture

### Authentication

Uses `@snapback/auth` with Better Auth:

```typescript
import { auth } from "@/lib/auth";

// Server component
const session = await auth.api.getSession({
  headers: await headers(),
});

// Client component
const { data: session } = useSession();
```

### Database

Supabase with Row-Level Security:

```typescript
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const { data } = await supabase
  .from("snapshots")
  .select("*")
  .eq("user_id", userId);
```

### Event Bus

Client mode for `@snapback/events`:

```typescript
import { SnapBackEventBus } from "@snapback/events";

const eventBus = new SnapBackEventBus({ mode: "client" });
await eventBus.subscribe("SNAPSHOT_CREATED", handleSnapshot);
```

## Dependencies

### Internal Packages

- `@snapback/auth` - Authentication
- `@snapback/contracts` - Types & schemas
- `@snapback/events` - Event bus
- `@snapback/infrastructure` - Logging

### External

- `next` - React framework
- `react` - UI library
- `tailwindcss` - Styling
- `@supabase/supabase-js` - Database
- `stripe` - Payments
- `posthog-js` - Analytics
- `@sentry/nextjs` - Error tracking

## Related Documentation

- [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md) - Auth setup details
- [DEPLOYMENT_ENV_VARS.md](./DEPLOYMENT_ENV_VARS.md) - Environment variables
- [MARKETING_SITE_ARCHITECTURE.md](./MARKETING_SITE_ARCHITECTURE.md) - Marketing site structure
- [TDD_QUICK_REFERENCE.md](./TDD_QUICK_REFERENCE.md) - Testing guide

## License

Apache-2.0
