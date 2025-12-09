# Environment Variables by Importance - Complete Reference

**Last Updated**: 2025-12-08
**Status**: Production-ready
**Purpose**: Identify all environment variables needed for each application, organized by criticality

---

## Overview

This document maps all environment variables across SnapBack applications. Each variable is:
- **Verified in code** (not just from .env files)
- **Organized by importance tier** (Critical → Important → Optional)
- **Grouped by application** for deployment clarity
- **Mapped to consequences** of misconfiguration

---

## Importance Tiers

| Tier | Description | Impact | Examples |
|------|-------------|--------|----------|
| **CRITICAL** | Application fails to start or crashes | Service down | DATABASE_URL, BETTER_AUTH_SECRET |
| **IMPORTANT** | Core features broken, auth fails | Partial outage | REDIS_URL, API_KEY, STRIPE_SECRET |
| **OPTIONAL** | Features degraded but app runs | Reduced functionality | POSTHOG_KEY, SENTRY_DSN |

---

## 1. DATABASE (PostgreSQL)

### Critical - Required for all applications
```env
# Direct connection for migrations (non-pooled)
# Used by: Drizzle ORM migration scripts
# Format: postgresql://user:password@host:port/database
# Consequence: Migrations fail, schema not applied
DIRECT_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev

# Pooled connection for application (via pgBouncer in production)
# Used by: All database queries in API, Web
# Format: postgresql://user:password@pgbouncer:port/database
# Consequence: Application cannot connect to database, complete service failure
DATABASE_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev
```

**Where used**:
- `apps/api` - All database operations
- `apps/web` - Server-side operations
- `packages/platform` - ORM configuration
- All database connection pools

**How to get**:
```bash
# Development: Local PostgreSQL
# Staging: Managed database (RDS, etc.)
# Production: Managed database with read replicas
```

---

## 2. AUTHENTICATION & SECRETS

### Critical
```env
# JWT signing secret (minimum 32 characters)
# Generate with: openssl rand -base64 32
# Used by: Better Auth library for session/token signing
# Consequence: All sessions invalid, users cannot log in, existing tokens rejected
BETTER_AUTH_SECRET=dev-secret-minimum-32-characters-for-local-dev

# OAuth callback URL for Better Auth
# Used by: OAuth flow, redirect handling
# Must match GitHub/Google OAuth app settings
# Consequence: OAuth sign-in fails with redirect mismatch
BETTER_AUTH_URL=http://localhost:3001
```

### Important - OAuth Providers
```env
# GitHub OAuth credentials
# Create at: https://github.com/settings/developers
# Step: Settings → Developer settings → OAuth Apps → New OAuth App
# Authorization callback URL: {BETTER_AUTH_URL}/auth/callback/github
# Consequence: GitHub sign-in broken, users cannot authenticate
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Google OAuth credentials
# Create at: https://console.cloud.google.com/apis/credentials
# Authorized redirect URIs: {BETTER_AUTH_URL}/auth/callback/google
# Consequence: Google sign-in broken, cannot create accounts
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Where used**:
- `apps/api` - OAuth flow
- `apps/web` - Auth context
- `packages/auth` - Session management

---

## 3. REDIS (Caching, Sessions, Rate Limiting)

### Critical
```env
# Redis connection for caching, sessions, rate limiting, queues
# Format: redis://[:password]@host:port/[db]
# Used by: Session storage, rate limiting, cache, API queues
# Consequence: Session loss on restart, rate limiting fails, slowdowns
REDIS_URL=redis://localhost:6379
```

**What fails**:
- User sessions lost between requests
- Rate limiting disabled (no protection)
- Cache misses on every request
- API performance degraded significantly

**Where used**:
- `apps/api` - Session storage, rate limiting
- `apps/web` - Server-side sessions
- `packages/platform` - Cache layer
- All caching operations

---

## 4. API SERVICE CONFIGURATION

### Critical
```env
# API server port
# Development: 3001
# Staging: 443 (behind reverse proxy)
# Production: 443 (behind reverse proxy)
# Consequence: Service not accessible on expected port
PORT=3001

# API server host
# 0.0.0.0 for accepting external connections
# localhost for testing only
# Consequence: Service bound to wrong interface
HOST=0.0.0.0

# NODE_ENV - Controls behavior and logging
# Options: development | staging | production | test
# Consequence: Debug features exposed, wrong logging, unsafe defaults
NODE_ENV=development

# API URL for external access
# Used by: Web app, MCP server, CLI for API calls
# Development: http://localhost:3001
# Production: https://api.snapback.dev
# Consequence: Cannot reach API from frontend
APP_URL=http://localhost:3001
```

**Where used**:
- `apps/api` - Server startup
- `apps/web` - API client base URL
- `apps/mcp-server` - API calls
- `apps/cli` - API communication

---

## 5. WEB APPLICATION URLs

### Critical (Next.js)
```env
# Application URLs (used for CORS, redirects, OAuth)
# Frontend URL
NEXT_PUBLIC_APP_URL=http://console.localhost:3000

# Marketing/landing page
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Documentation site
NEXT_PUBLIC_DOCS_URL=http://docs.localhost:3000

# Root domain (used for subdomains)
NEXT_PUBLIC_ROOT_DOMAIN=localhost

# API endpoint (public, can expose)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Consequence of wrong values**:
- CORS errors prevent API calls
- OAuth redirects to wrong domain
- Subdomains routing fails
- Links broken in frontend

**Where used**:
- `apps/web` - All URL generation
- Email templates
- Redirect handlers

---

## 6. EMAIL SERVICE (Resend)

### Important
```env
# Resend API key for sending emails
# Get from: https://resend.com/api-keys
# Used by: Password resets, magic links, invoices, notifications
# Consequence: Users cannot reset password, no account recovery
RESEND_API_KEY=re_your_resend_api_key_here
```

**Where used**:
- `apps/api` - Email sending service
- Password reset flows
- Account verification emails

**What fails**:
- Password reset emails not sent
- User cannot recover account
- Sign-up verification emails missing
- Invoice delivery fails

---

## 7. SECURITY & CAPTCHA

### Important
```env
# Cloudflare Turnstile for bot protection
# Create at: https://dash.cloudflare.com/
# Get Site Key and Secret Key
# Consequence: Sign-up/login endpoints vulnerable to bots
TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

**Where used**:
- `apps/api` - Authentication endpoints
- Sign-up, sign-in, password reset forms

---

## 8. PAYMENTS (Stripe)

### Important (if payment features enabled)
```env
# Stripe secret key (server-side only)
# Get from: https://dashboard.stripe.com/apikeys
# Used by: Subscription management, billing
# Consequence: Payments fail, subscriptions not processed
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# Stripe webhook secret for verifying callbacks
# Get from: Dashboard → Webhooks → Add endpoint
# Consequence: Payment webhooks rejected, subscriptions not updated
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Publishable key (safe for client-side)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Price IDs for subscription tiers
# Get from: Stripe Dashboard → Products → Copy Price ID
STRIPE_SOLO_MONTHLY_PRICE_ID=price_1234567890abcdef
STRIPE_TEAM_MONTHLY_PRICE_ID=price_team_id
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_enterprise_id
```

**Where used**:
- `apps/api` - Payment processing
- `apps/web` - Checkout, subscription management

---

## 9. MONITORING & OBSERVABILITY

### Important
```env
# Sentry for error tracking
# Create at: https://sentry.io/
# Get DSN from: Settings → Projects → Client Keys (DSN)
# Used by: Error reporting, performance monitoring
# Consequence: Errors not tracked, missing visibility into issues
SENTRY_DSN=your_sentry_dsn_here

# Sentry auth token for releases
# Get from: Settings → Auth Tokens
# Consequence: Source maps not uploaded, stack traces incomplete
SENTRY_AUTH_TOKEN=your_sentry_auth_token

# PostHog API key for analytics
# Get from: https://posthog.com/
# Used by: Event tracking, funnel analysis, feature usage
# Consequence: No analytics data, cannot measure feature adoption
POSTHOG_API_KEY=phc_your_posthog_key_here
NEXT_PUBLIC_POSTHOG_KEY=phc_your_posthog_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**Where used**:
- `apps/api` - Sentry integration
- `apps/web` - Analytics, error tracking
- `apps/vscode` - Telemetry

---

## 10. STORAGE (S3/CloudFront)

### Important (if using cloud backups)
```env
# AWS credentials for S3
# Get from: AWS IAM Console
# Create user with S3 access policy
# Consequence: Cannot upload/download snapshots to cloud
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# S3 bucket for snapshots
# Create bucket in AWS console
# Consequence: Snapshot cloud backup fails
S3_BUCKET_NAME=snapback-snapshots-prod

# Optional: CloudFront CDN URL for faster downloads
# Consequence: Slower downloads, higher S3 costs
CDN_URL=https://d1234567890abcd.cloudfront.net
```

**Where used**:
- `packages/sdk` - Cloud backup service
- Snapshot storage and retrieval
- Avatar uploads (optional)

---

## 11. API KEYS & AUTHENTICATION

### Critical (for client applications)
```env
# API key for CLI, MCP server, VS Code extension
# Obtained from: User dashboard → API Keys section
# Format: sk_test_* (development) or sk_live_* (production)
# Consequence: Cannot authenticate to API, service calls fail
SNAPBACK_API_KEY=sk_test_your_api_key_here

# API URL for client applications
# Used by: CLI, MCP server, VS Code extension
# Development: http://localhost:3001
# Production: https://api.snapback.dev
SNAPBACK_API_URL=https://api.snapback.dev
```

**Where used**:
- `apps/cli` - API authentication
- `apps/mcp-server` - API calls
- `apps/vscode` - API communication
- Context7 integration

---

## 12. LOGGING & DEBUGGING

### Important
```env
# Logging level
# Options: debug, info, warn, error
# Development: debug or info
# Production: warn or error
# Consequence: Too much/too little visibility into operations
LOG_LEVEL=info

# Enable request/response logging
# Consequence: Cannot debug API issues
LOG_REQUESTS=true

# Enable SQL query logging
# Consequence: Cannot see slow queries, optimization impossible
LOG_SQL_QUERIES=false

# Enable debug mode
# Consequence: Debug features available/unavailable
DEBUG=false
```

**Where used**:
- `packages/infrastructure` - Logger configuration
- All services for logging

---

## 13. THIRD-PARTY INTEGRATIONS

### Optional but useful
```env
# OpenAI API for AI features
# Get from: https://platform.openai.com/api-keys
# Consequence: AI features disabled, user experience degraded
OPENAI_API_KEY=sk_your_openai_key

# HubSpot for CRM integration
# Get from: https://app.hubspot.com/settings/apps/private-apps
# Consequence: Lead tracking disabled, no CRM sync
HUBSPOT_ACCESS_TOKEN=pat-na1_your_hubspot_token

# Slack webhook for notifications
# Get from: https://api.slack.com/messaging/webhooks
# Consequence: Feedback notifications not sent to Slack
SLACK_FEEDBACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK
```

---

## 14. FEATURE FLAGS & CONFIGURATION

### Optional
```env
# Feature flags for environment-specific behavior
FEATURE_DEBUG_MODE=false
FEATURE_VERBOSE_LOGGING=false

# Rate limiting configuration
RATE_LIMIT_ENABLED=false           # Disabled in dev, enabled in prod
RATE_LIMIT_WINDOW_MS=60000         # 1 minute window
RATE_LIMIT_MAX_REQUESTS=100        # Max requests per window

# Timeouts (milliseconds)
API_TIMEOUT_MS=30000               # 30 seconds for external APIs
DATABASE_TIMEOUT_MS=10000          # 10 seconds for DB queries

# Development/testing only
SEED_TEST_DATA=false               # Populate database with test data
SEED_DATABASE=false                # Run migrations and seeding
MOCK_AUTH_SERVICE=false            # Mock auth instead of real
```

---

## Application-Specific Mappings

### API Server (apps/api)

**CRITICAL** - Must have:
- DATABASE_URL, DIRECT_URL
- BETTER_AUTH_SECRET, BETTER_AUTH_URL
- REDIS_URL
- PORT, HOST, NODE_ENV

**IMPORTANT** - Highly recommended:
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (if payments enabled)
- RESEND_API_KEY (email)
- TURNSTILE_SECRET_KEY (bot protection)
- SENTRY_DSN (error tracking)

**OPTIONAL**:
- POSTHOG_API_KEY (analytics)
- AWS credentials (cloud backup)
- OPENAI_API_KEY (AI features)
- SLACK_FEEDBACK_WEBHOOK

**Check with**:
```bash
grep -r "process\.env\." apps/api/src/ | grep -oP 'process\.env\.\K[A-Z_]+' | sort -u
```

### Web Application (apps/web)

**CRITICAL** - Must have:
- DATABASE_URL, DIRECT_URL
- BETTER_AUTH_SECRET
- REDIS_URL
- NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_API_URL
- NODE_ENV

**IMPORTANT** - Highly recommended:
- STRIPE_SECRET_KEY (payments)
- RESEND_API_KEY (email)
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- SENTRY_DSN

**OPTIONAL**:
- NEXT_PUBLIC_POSTHOG_KEY (analytics)
- NEXT_PUBLIC_GOOGLE_ANALYTICS_ID

### MCP Server (apps/mcp-server)

**CRITICAL** - Must have:
- SNAPBACK_API_KEY
- SNAPBACK_API_URL
- API_URL (for health checks)
- NODE_ENV

**IMPORTANT**:
- CONTEXT7_API_KEY (optional, for code search)
- CONTEXT7_API_URL
- DATABASE_URL (if using local storage)

**OPTIONAL**:
- SNAPBACK_NO_NETWORK (testing flag)
- SNAPBACK_WORKSPACE (custom workspace)

### CLI Tool (apps/cli)

**CRITICAL** - Must have:
- SNAPBACK_API_KEY
- SNAPBACK_API_URL
- NODE_ENV

**OPTIONAL**:
- OUTPUT_FORMAT (table, json, csv)
- LOG_LEVEL

### VS Code Extension (apps/vscode)

**CRITICAL** - Must have:
- API_URL (from config or environment)
- OAuth credentials for sign-in

**OPTIONAL**:
- POSTHOG_PROJECT_KEY (telemetry)
- SNAPBACK_RULES_PUBLIC_KEY (rule validation)
- SNAPBACK_TELEMETRY_PROXY (custom telemetry endpoint)

---

## Deployment Checklist

### Before Deploying to Production

**Database**
- [ ] DATABASE_URL is pooled connection (pgBouncer)
- [ ] DIRECT_URL is non-pooled for migrations
- [ ] Database credentials rotated within last 90 days
- [ ] Backup configured

**Authentication**
- [ ] BETTER_AUTH_SECRET is 32+ characters
- [ ] OAuth apps created for production domain
- [ ] BETTER_AUTH_URL matches production domain
- [ ] APP_URL matches production domain

**API & Services**
- [ ] REDIS_URL points to production Redis
- [ ] PORT and HOST correct for production
- [ ] NODE_ENV=production
- [ ] API_URL points to production endpoint

**Payment Processing** (if enabled)
- [ ] Using production Stripe keys (not test)
- [ ] STRIPE_WEBHOOK_SECRET configured
- [ ] Webhook endpoint enabled in Stripe

**Email & Notifications**
- [ ] RESEND_API_KEY from production account
- [ ] Email "from" address verified in Resend
- [ ] SLACK_FEEDBACK_WEBHOOK (if using)

**Monitoring**
- [ ] SENTRY_DSN configured
- [ ] POSTHOG_API_KEY from production
- [ ] Error tracking initialized
- [ ] Analytics project created

**Security**
- [ ] TURNSTILE keys from production project
- [ ] AWS credentials have S3 access only
- [ ] No hardcoded secrets in code
- [ ] Secrets stored in vault/secrets manager

**Storage** (if cloud backups enabled)
- [ ] AWS credentials configured
- [ ] S3 bucket exists and versioning enabled
- [ ] CloudFront distribution configured (optional)

---

## Environment Variables Rotation Schedule

| Variable | Rotation | Risk | Action |
|----------|----------|------|--------|
| Database credentials | 90 days | CRITICAL | Change in managed database |
| BETTER_AUTH_SECRET | 90 days | CRITICAL | Requires migration |
| API keys (Stripe, etc) | 180 days | CRITICAL | Generate new in dashboard |
| OAuth secrets | 180 days | IMPORTANT | Update in GitHub/Google |
| AWS credentials | 180 days | IMPORTANT | Create new IAM user |
| Redis password | 90 days | IMPORTANT | Update in Redis provider |

---

## Common Mistakes to Avoid

| Mistake | Impact | Fix |
|---------|--------|-----|
| Using test keys in production | Payment processing broken | Use production Stripe keys |
| DATABASE_URL with SSL disabled | Connection fails | Add `?sslmode=require` |
| BETTER_AUTH_SECRET too short | Sessions invalid | Generate with openssl rand -base64 32 |
| REDIS_URL without password | Connection refused | Add `:password@` if required |
| Missing NEXT_PUBLIC_ prefix | Variables not available on client | Use NEXT_PUBLIC_ for client-side |
| Wrong BETTER_AUTH_URL | OAuth redirects fail | Must match registered redirect URL |
| API_URL localhost in production | Frontend cannot reach API | Use production domain |
| Hardcoded secrets in code | Security breach | Move to environment variables |
| Missing DIRECT_URL | Migrations fail | Set DIRECT_URL for non-pooled |

---

## References

- Database Setup: See `docker/postgres/init.sql`
- Authentication: See `packages/auth/src`
- API Routes: See `apps/api/src/index.ts`
- Environment Loading: See `config/index.ts`
- Validation: Run `bash scripts/validate-env.sh`
