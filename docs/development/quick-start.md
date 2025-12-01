# Quick Start Guide

## First Time Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

**Turborepo Best Practice**: Environment files are kept close to the packages that use them.

Create `.env.local` files in each package from the `.env.example` templates:

```bash
# Database package
cp packages/database/.env.example packages/database/.env.local
# Edit: Add your Supabase DATABASE_URL and DIRECT_URL

# Auth package
cp packages/auth/.env.example packages/auth/.env.local
# Edit: Add BETTER_AUTH_SECRET and OAuth credentials

# Web app
cp apps/web/.env.example apps/web/.env.local
# Edit: Add Stripe, Supabase, analytics keys
```

**Minimum required for development:**

-   `packages/database/.env.local` - Database connection URLs
-   `packages/auth/.env.local` - BETTER_AUTH_SECRET and RESEND_API_KEY
-   `apps/web/.env.local` - NEXT_PUBLIC_SITE_URL and Supabase keys

### 3. Setup Database

**First time only**: Drop existing tables (if any) and create fresh schema:

```bash
# Push schema to database (interactive prompts)
pnpm --filter @snapback/database run push

# When prompted:
# - For enums: select "+ create enum"
# - For tables: select "+ create table"
# - For columns: select "+ create column"
```

**Seed development user** (optional but recommended):

```bash
pnpm seed:dev
```

This creates `dev@snapback.dev` with password `password123` for quick testing.

### 4. Start Development Server

```bash
pnpm dev
```

The web app will start on http://localhost:3000 (or next available port if occupied).

## Development Credentials

After running `pnpm seed:dev`, you can login with:

-   **Email**: `dev@snapback.dev`
-   **Password**: `password123`

Alternatively, create your own account via the signup flow.

## Key Routes

### Marketing (Public)

-   **Homepage**: http://localhost:3000/
-   **Pricing**: http://localhost:3000/pricing
-   **Docs**: http://localhost:3000/docs

### Auth

-   **Signup**: http://localhost:3000/auth/signup
-   **Login**: http://localhost:3000/auth/signin

### SaaS Dashboard (Authenticated)

-   **Dashboard**: http://localhost:3000/app/dashboard
-   **API Keys**: http://localhost:3000/app/api-keys
-   **Settings**: http://localhost:3000/app/settings/general

## Common Development Tasks

### Run Tests

```bash
pnpm test                  # All tests
pnpm test:watch            # Watch mode
pnpm test:coverage         # With coverage
```

### Type Checking

```bash
pnpm turbo type-check      # All packages
pnpm --filter @snapback/web run type-check  # Specific package
```

### Linting & Formatting

```bash
pnpm lint                  # Check lint errors
pnpm format                # Format code with Biome
pnpm check                 # Run all checks
```

### Database Operations

```bash
# Drizzle Studio (GUI for database)
pnpm --filter @snapback/database run studio:dev

# Generate migrations
pnpm --filter @snapback/database run generate

# Push schema changes
pnpm --filter @snapback/database run push:dev
```

## Troubleshooting

### Port Already in Use

Next.js automatically uses the next available port:

```
⚠ Port 3000 is in use, using available port 3001 instead.
```

The auth configuration now supports multiple localhost ports for development.

### Better Auth Origin Error

If you see "Invalid origin" errors, the auth config has been updated to trust:

-   http://localhost:3000
-   http://localhost:3001
-   http://localhost:3002

### Database Connection Failed

Ensure PostgreSQL is running and `DATABASE_URL` in `.env.local` is correct.

### Type Errors Blocking Build

Run type check to see all errors:

```bash
pnpm turbo type-check
```

## Development Workflow

1. **Start Dev Server**: `pnpm dev`
2. **Make Changes**: Edit files, server auto-reloads
3. **Run Tests**: `pnpm test` (in separate terminal)
4. **Type Check**: `pnpm --filter <package> run type-check`
5. **Commit**: Lefthook runs pre-commit checks automatically

## Next Steps

-   See [Development Workflow](./dev-workflow.md) for detailed package-specific workflows
-   Read [Architecture Documentation](../architecture/) for system design
-   Check [Testing Guide](../testing/) for testing strategies
-   Review [Feature Manager](./feature-manager.md) for feature flag documentation
