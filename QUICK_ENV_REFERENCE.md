# Environment Variables - Quick Reference Guide

**Generated:** 2025-12-17
**Status:** Audit Complete & Fixes Applied

---

## Variable Ownership Map

### Root Level Variables
**File:** `.env.example` (Central source of truth)
**Use:** Shared across multiple services

#### Tier 1: Always Required
- `NODE_ENV` - development | staging | production
- `DATABASE_URL` - PostgreSQL connection (apps/api, packages/platform)
- `DIRECT_URL` - PostgreSQL direct connection for migrations
- `REDIS_URL` - Redis connection (api, platform)
- `BETTER_AUTH_SECRET` - Auth signing key (32+ chars)
- `BETTER_AUTH_URL` - Auth service endpoint

#### Tier 2: Production Required
- `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` - OAuth (root + api)
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` - OAuth (root + api)

#### Tier 3: Feature-Specific
- `RESEND_API_KEY` - Email service
- `STRIPE_SECRET_KEY` - Payment processor
- `TURNSTILE_SECRET_KEY` - Bot protection
- `POSTHOG_API_KEY` - Analytics
- `SENTRY_DSN` - Error tracking
- `LOG_LEVEL` - Logging verbosity

---

## By Service

### 🖥️ apps/api (Backend Service)

**Required:**
```
DATABASE_URL
DIRECT_URL
REDIS_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
APP_URL
```

**Optional (Feature Gates):**
- `GITHUB_CLIENT_ID/SECRET` - OAuth
- `GOOGLE_CLIENT_ID/SECRET` - OAuth
- `STRIPE_SECRET_KEY` - Payments
- `STRIPE_WEBHOOK_SECRET` - Payment webhooks
- `RESEND_API_KEY` - Email
- `POSTHOG_API_KEY` - Analytics
- `SENTRY_DSN` - Error tracking
- `S3_*` - File uploads
- `OPENAI_API_KEY` - AI features
- `LOG_LEVEL` - Logging

**Location:** `.env.local` (development), CI/CD secrets (staging/prod)

---

### 🌐 apps/web (Hybrid Next.js Frontend + Server)

**Server-Side (in lib/env.ts):**
- `DATABASE_URL` - Direct DB access (optional, if web handles some backend)
- `STRIPE_WEBHOOK_SECRET` - Webhook handling
- `REDIS_URL` - Session storage
- `BETTER_AUTH_*` - Server session validation
- `RESEND_API_KEY` - Optional email in web
- `OPENAI_API_KEY` - Optional AI in web

**Client-Side (NEXT_PUBLIC_* prefix):**
- `NEXT_PUBLIC_SITE_URL` - Site domain
- `NEXT_PUBLIC_APP_URL` - App subdomain
- `NEXT_PUBLIC_ROOT_DOMAIN` - Root domain
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Public payment key
- `NEXT_PUBLIC_GITHUB_CLIENT_ID` - Public OAuth ID
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Public OAuth ID
- `NEXT_PUBLIC_POSTHOG_KEY` - Analytics
- `NEXT_PUBLIC_SENTRY_DSN` - Error tracking

**Location:** `.env.local` (development), CI/CD secrets (staging/prod)

---

### 📟 apps/cli (Command-Line Tool)

**Required:**
- `API_URL` - API endpoint
- `API_KEY` - CLI authentication

**Optional:**
- `LOG_LEVEL` - Logging verbosity
- `NODE_ENV` - Environment mode

**Location:** `.env.local` per user, or `~/.snapback/config.json`

---

### 🤖 apps/mcp-server (AI Integration)

**Required:**
- `API_URL` - SnapBack API endpoint
- `API_KEY` - MCP authentication

**Optional:**
- `LOG_LEVEL` - Logging verbosity
- `NODE_ENV` - Environment mode
- Feature flags (ENABLE_FILE_OPERATIONS, etc.)

**Location:** `.env.local` (development), CI/CD secrets (staging/prod)

⚠️ **Note:** MCP connects through API, NOT direct database access

---

### 🔌 apps/vscode (VS Code Extension)

**Required:**
- `API_URL` - SnapBack API endpoint
- `OAUTH_REDIRECT_URI` - VSCode auth callback (vscode://snapback.snapback/auth-callback)

**Optional:**
- `LOG_LEVEL` - Logging verbosity
- `NODE_ENV` - Environment mode
- Feature flags (ENABLE_AUTO_PROTECT, etc.)

**Location:** Extension configuration, not .env files typically

---

### 📦 packages/auth (Authentication)

**Handles:**
- OAuth provider configuration
- Session management
- JWT setup
- Password policies
- 2FA configuration
- Email verification

**Inherits from root:**
- `DATABASE_URL`, `DIRECT_URL` - User/session storage
- `BETTER_AUTH_SECRET` - Token signing
- `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`
- `RESEND_API_KEY` - Verification emails

---

### 📧 packages/mail (Email Service)

**Handles:**
- Email provider integration (Resend, SMTP)
- Email templates
- CRM integration (HubSpot)

**Specific:**
- `RESEND_API_KEY` - Email provider
- `SMTP_*` - SMTP fallback
- `HUBSPOT_ACCESS_TOKEN` - CRM sync
- `EMAIL_FROM` - Sender address
- `UNSUBSCRIBE_TOKEN_SECRET` - Email tokens

---

### 💾 packages/platform (Infrastructure)

**Handles:**
- Database schema & migrations
- Redis configuration
- ORM setup (Drizzle)

**Specific:**
- `DATABASE_URL`, `DIRECT_URL` - Database connection
- `REDIS_URL` - Cache/queue
- Drizzle configuration

---

### 🧠 packages/core (Business Logic)

**Handles:**
- Code analysis (Guardian)
- AI detection
- Threat detection
- Git integration
- Circuit breakers
- Caching
- Performance monitoring

**Specific:**
- `SNAPBACK_*` - Core feature flags
- Analysis timeouts & limits
- Cache configuration
- Concurrency control

---

## Development Checklist

### Setup New Environment
```bash
# 1. Copy root template
cp .env.example .env.local

# 2. For each app needing custom config:
cd apps/api && cp .env.example .env.local
cd apps/web && cp .env.example .env.local
cd apps/cli && cp .env.example .env.local
cd apps/mcp-server && cp .env.example .env.local

# 3. Fill in required variables
vim .env.local
```

### Required Before Running
- [ ] `DATABASE_URL` - PostgreSQL connection
- [ ] `BETTER_AUTH_SECRET` - Auth signing key (32+ chars)
- [ ] `BETTER_AUTH_URL` - Auth endpoint
- [ ] `REDIS_URL` - Redis connection
- [ ] `NODE_ENV` - Set to "development"

### Optional for Features
- [ ] OAuth IDs/secrets - For GitHub/Google login
- [ ] `RESEND_API_KEY` - For email features
- [ ] `STRIPE_SECRET_KEY` - For payments
- [ ] Monitoring IDs - PostHog, Sentry

---

## CI/CD Secrets Setup

### GitHub Actions / Vercel / Fly.io

**Store these as secrets, NOT in .env:**
```
BETTER_AUTH_SECRET
DATABASE_URL
DIRECT_URL
REDIS_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
GITHUB_CLIENT_SECRET
GOOGLE_CLIENT_SECRET
RESEND_API_KEY
SENTRY_AUTH_TOKEN
SENTRY_DSN
POSTHOG_API_KEY
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
OPENAI_API_KEY
HUBSPOT_ACCESS_TOKEN
```

**Safe to commit (prefixed NEXT_PUBLIC_):**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_GITHUB_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_SENTRY_DSN`

---

## Common Issues & Solutions

### Issue: "DATABASE_URL is not set"
**Solution:** Add DATABASE_URL to .env.local or CI/CD secrets

### Issue: "BETTER_AUTH_SECRET must be 32+ characters"
**Solution:** Generate with: `openssl rand -base64 32`

### Issue: OAuth redirect fails in production
**Solution:** Set `BETTER_AUTH_URL` and `APP_URL` to match production domain

### Issue: Stripe webhooks not working
**Solution:** Ensure `STRIPE_WEBHOOK_SECRET` matches webhook endpoint in Stripe dashboard

### Issue: "SUPABASE_SERVICE_ROLE_KEY is privileged"
**Solution:** Keep in API/backend only, never in frontend code or git

---

## Variable Hierarchy (Precedence)

When multiple places have the same variable, resolution order:

1. **CI/CD Environment Variables** (highest priority)
2. **Local `.env.local` file** (development)
3. **`.env` file** (version controlled, defaults)
4. **Runtime defaults** (lowest priority)

---

## Files Reference

| File | Purpose | Commit? |
|------|---------|---------|
| `.env.example` | Template with placeholders | ✅ Yes |
| `.env` | Default values | ✅ Yes |
| `.env.local` | Local development overrides | ❌ No (in .gitignore) |
| `.env.staging` | Staging secrets | ❌ No (in .gitignore) |
| `.env.production` | Production secrets | ❌ No (in .gitignore) |

---

## Related Documentation

- **Full Audit:** `ENV_VARIABLE_AUDIT.md`
- **Setup Guide:** `docs/environment-setup.md` (or equivalent)
- **Auth Setup:** `packages/auth/.env.example`
- **API Setup:** `apps/api/.env.example`
- **Web Setup:** `apps/web/.env.example`

---

**Last Updated:** 2025-12-17
**Maintainer:** SnapBack Team
