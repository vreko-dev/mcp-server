# @snapback/api

**Backend API service for SnapBack** - REST endpoints, authentication, and data management.

## Overview

The SnapBack API provides backend services for:
- User authentication and session management
- Snapshot CRUD operations
- Protection policy management
- Analytics and metrics
- Team/organization management
- Subscription billing (Stripe)

## Tech Stack

- **Framework**: [Hono](https://hono.dev/) (fast edge-ready web framework)
- **RPC**: [oRPC](https://orpc.io/) for type-safe APIs
- **Auth**: [Better Auth](https://www.better-auth.com/) with `@snapback/auth`
- **Database**: PostgreSQL via `@snapback/platform`
- **Validation**: Zod schemas from `@snapback/contracts`
- **Logging**: Pino via `@snapback/infrastructure`
- **Email**: Resend
- **Payments**: Stripe
- **Analytics**: PostHog

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm --filter @snapback/api dev

# Server runs at http://localhost:3001
```

### Environment Variables

Copy `.env.example` and configure:

```bash
cp apps/api/.env.example .env
```

Required variables:
```env
DATABASE_URL=postgres://...
REDIS_URL=redis://localhost:6379
BETTER_AUTH_SECRET=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
POSTHOG_API_KEY=phc_...
```

See [ENVIRONMENT.md](./ENVIRONMENT.md) for complete reference.

## API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/*` | ALL | Better Auth routes |
| `/api/auth/session` | GET | Get current session |
| `/api/auth/sign-in/*` | POST | Sign in (email, OAuth) |
| `/api/auth/sign-out` | POST | Sign out |

### Snapshots

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/snapshots` | GET | List snapshots |
| `/api/snapshots` | POST | Create snapshot |
| `/api/snapshots/:id` | GET | Get snapshot |
| `/api/snapshots/:id` | DELETE | Delete snapshot |
| `/api/snapshots/:id/restore` | POST | Restore snapshot |

### Protection

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/protection` | GET | Get protection policies |
| `/api/protection` | POST | Create/update policy |
| `/api/protection/:fileId` | GET | Get file protection status |

### API Keys

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/keys` | GET | List API keys |
| `/api/keys` | POST | Create API key |
| `/api/keys/:id` | DELETE | Revoke API key |

### Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/usage` | GET | Usage statistics |
| `/api/analytics/dashboard` | GET | Dashboard metrics |

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/stripe` | POST | Stripe webhook handler |

See [API_ENDPOINTS.md](./API_ENDPOINTS.md) for complete reference.

## Project Structure

```
apps/api/
├── src/
│   ├── server.ts          # Entry point, Hono app
│   ├── app.ts             # App configuration
│   ├── middleware/        # Auth, validation, logging
│   └── routes/            # Route handlers
├── modules/               # Feature modules (oRPC)
│   ├── auth/              # Authentication
│   ├── snapshots/         # Snapshot management
│   ├── protection/        # Protection policies
│   ├── analytics/         # Analytics & metrics
│   ├── apikeys/           # API key management
│   ├── billing/           # Stripe integration
│   └── contact/           # Contact form
├── lib/                   # Shared utilities
│   ├── redis-client.ts    # Redis connection
│   ├── posthog-server.ts  # PostHog integration
│   └── client-tokens.ts   # Token utilities
├── orpc/                  # oRPC router & types
└── emails/                # Email templates
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
pnpm lint:fix
```

### Testing

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration
```

## Deployment

### Docker

```bash
# Build production image
pnpm docker-build

# Build dev image
pnpm docker-build:dev
```

### Fly.io

```bash
# Deploy to Fly.io
pnpm deploy
```

Configuration in `fly-api.toml`.

## Architecture

### Service Layer Pattern

All business logic goes through service layer:

```typescript
// modules/snapshots/services/snapshot-service.ts
export class SnapshotService {
  async create(input: CreateSnapshotInput): Promise<Snapshot> {
    // Business logic here
  }
}

// modules/snapshots/procedures/create.ts
export const createSnapshotProcedure = publicProcedure
  .input(CreateSnapshotSchema)
  .mutation(async ({ input, ctx }) => {
    return snapshotService.create(input);
  });
```

### Authentication

Uses `@snapback/auth` for centralized auth:

```typescript
import { auth, verifyApiKey } from "@snapback/auth";

// Session-based auth
const session = await auth.api.getSession({ headers });

// API key auth
const verified = await auth.api.verifyApiKey({ key: apiKey });
```

### Validation

Uses Zod schemas from `@snapback/contracts`:

```typescript
import { CreateSnapshotSchema } from "@snapback/contracts";
import { zValidator } from "@hono/zod-validator";

app.post("/snapshots",
  zValidator("json", CreateSnapshotSchema),
  async (c) => { ... }
);
```

## Dependencies

### Internal Packages

- `@snapback/auth` - Authentication
- `@snapback/contracts` - Type definitions & schemas
- `@snapback/core` - Core business logic
- `@snapback/infrastructure` - Logging, observability
- `@snapback/platform` - Database access
- `@snapback/intelligence` - Validation & learning

### External

- `hono` - Web framework
- `@orpc/server` - Type-safe RPC
- `better-auth` - Authentication
- `zod` - Validation
- `pino` - Logging
- `stripe` - Payments
- `resend` - Email

## Related Documentation

- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - Complete endpoint reference
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Environment variables
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Implementation details

## License

Apache-2.0
