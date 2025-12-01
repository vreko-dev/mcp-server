# SnapBack Docker Environment Variables Audit

**Date:** November 20, 2025
**Status:** Comprehensive Audit - Missing & Required Variables Identified
**Scope:** All applications and services configured in docker-compose.yml

---

## Executive Summary

Your SnapBack monorepo includes **6 applications** deployed via Docker:
1. **Web App** (Next.js) - Port 3000
2. **API Service** (Hono) - Port 3001
3. **MCP Server** (Model Context Protocol) - Port 3002
4. **PostgreSQL Database** - Port 5432
5. **Redis Cache** - Port 6379
6. **Documentation Site** (Next.js) - Static

**Total Environment Variables Needed:** 60+
**Variables Currently Configured:** ~15
**Variables Still Missing:** ~45

⚠️ **Critical Priority:** Database and Auth secrets must be set before Docker testing can proceed.

---

## 1. Database Configuration (PostgreSQL)

### Status: ✅ PARTIALLY CONFIGURED

Required variables for `docker-compose.yml`:

| Variable | Current Value | Docker Requirement | Test Value |
|----------|---------------|-------------------|-----------|
| `POSTGRES_DB` | `snapback` | Required | `snapback` |
| `POSTGRES_USER` | `snapback` | Required | `snapback` |
| `POSTGRES_PASSWORD` | ❌ **NOT SET** | **Required** | `snapback_dev_password_123!` |
| `DATABASE_URL` | ❌ **NOT SET** | **Required** | `postgresql://snapback:snapback_dev_password_123!@postgres:5432/snapback` |
| `DIRECT_URL` | ❌ **NOT SET** | Optional (for Prisma) | `postgresql://snapback:snapback_dev_password_123!@postgres:5432/snapback` |
| `POSTGRES_PORT` | `5432` (default) | Default OK | `5432` |

### Action Required:
```bash
# Update your .env.docker file with:
POSTGRES_PASSWORD=snapback_dev_password_123!
DATABASE_URL=postgresql://snapback:snapback_dev_password_123!@postgres:5432/snapback
DIRECT_URL=postgresql://snapback:snapback_dev_password_123!@postgres:5432/snapback
```

---

## 2. Redis Cache Configuration

### Status: ✅ FULLY CONFIGURED

| Variable | Current Value | Status |
|----------|---------------|--------|
| `REDIS_URL` | `redis://redis:6379` | ✅ Configured |
| `REDIS_PORT` | `6379` (default) | ✅ OK |

No action needed for Redis.

---

## 3. Authentication (Better Auth)

### Status: ⚠️ CRITICAL - MISSING SECRETS

**Current Issues:**
- `BETTER_AUTH_SECRET` must be 32+ characters
- JWT key pairs needed for CLI/VSCode/MCP token signing
- OAuth URLs must match your deployment domain

| Variable | Current Value | Requirement | Test Value |
|----------|---------------|-------------|-----------|
| `BETTER_AUTH_SECRET` | ✅ Set in `.env.docker` | 32+ char random | Generate new: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://api:3001` | Service-to-service | Internal Docker URL ✅ |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Browser-facing | For local dev ✅ |
| `BETTER_AUTH_RP_ID` | ❌ **NOT SET** | Passkey credential ID | `localhost` or `snapback.dev` |
| `BETTER_AUTH_JWT_PRIVATE_PEM` | ❌ **NOT SET** | **Required** for tools | Generated key pair |
| `BETTER_AUTH_JWT_PUBLIC_PEM` | ❌ **NOT SET** | **Required** for tools | Generated key pair |

### Action Required:
```bash
# 1. Generate new secrets if needed
BETTER_AUTH_SECRET=$(openssl rand -base64 32)

# 2. Generate JWT key pair for CLI/VSCode/MCP
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# 3. Format for .env.docker (multiline)
BETTER_AUTH_JWT_PRIVATE_PEM="-----BEGIN PRIVATE KEY-----
<paste private.pem content here>
-----END PRIVATE KEY-----"

BETTER_AUTH_JWT_PUBLIC_PEM="-----BEGIN PUBLIC KEY-----
<paste public.pem content here>
-----END PUBLIC KEY-----"

# 4. For passkeys, set to your local domain:
BETTER_AUTH_RP_ID=localhost
```

---

## 4. API Service Environment (.env.docker)

### Status: ⚠️ MULTIPLE MISSING

| Variable | Purpose | Current | Needed |
|----------|---------|---------|--------|
| `NODE_ENV` | Execution mode | ❌ Not in compose | `development` |
| `PORT` | API port | ✅ 3001 | ✅ 3001 |
| `API_URL` | Internal service URL | ❌ Missing | `http://api:3001` |
| `WEB_APP_URL` | Web app URL for CORS | ❌ Missing | `http://localhost:3000` |
| `LOG_LEVEL` | Logging verbosity | ❌ Missing | `info` |

### Action Required:
```bash
# Add to .env.docker for API service:
NODE_ENV=development
API_URL=http://api:3001
WEB_APP_URL=http://localhost:3000
LOG_LEVEL=info
```

---

## 5. OAuth Providers (GitHub & Google)

### Status: ❌ NOT CONFIGURED

Currently using dummy values. For full testing, you need actual OAuth credentials.

| Variable | Purpose | Test Mode | Production |
|----------|---------|-----------|------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth | Dummy OK for now | ❌ Required |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | Dummy OK for now | ❌ Required |
| `GOOGLE_CLIENT_ID` | Google OAuth | Dummy OK for now | ❌ Required |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Dummy OK for now | ❌ Required |

### Setup Instructions:

**GitHub OAuth:**
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Authorization callback URL: `http://localhost:3001/api/auth/callback/github`
4. Copy Client ID and Secret to `.env.docker`

**Google OAuth:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID (Web Application)
3. Authorized redirect URIs: `http://localhost:3001/api/auth/callback/google`
4. Copy Client ID and Secret to `.env.docker`

---

## 6. Email Service Configuration

### Status: ⚠️ PARTIALLY CONFIGURED

For Docker testing without real email, MailHog is already configured in `docker-compose.yml`.

| Variable | Service | Requirement | Current |
|----------|---------|-------------|---------|
| `RESEND_API_KEY` | Resend (Production) | Optional | ❌ Not set |
| `SMTP_HOST` | MailHog (Testing) | ✅ Set | `mailhog` |
| `SMTP_PORT` | MailHog (Testing) | ✅ Set | `1025` |
| `SMTP_FROM` | Email sender | ✅ Set | `noreply@snapback.dev` |

**MailHog UI:** `http://localhost:8025` (included in docker-compose.yml)

### Action Required:
Skip for testing - MailHog handles local email simulation.

---

## 7. Payment Provider (Stripe)

### Status: ❌ TEST KEYS NOT SET

| Variable | Purpose | Current | Requirement |
|----------|---------|---------|-------------|
| `STRIPE_PUBLISHABLE_KEY` | Client-side key | ❌ Missing | `pk_test_xxxx` |
| `STRIPE_SECRET_KEY` | Server-side key | ❌ Missing | `sk_test_xxxx` |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | ❌ Missing | `whsec_xxxx` |
| `STRIPE_SOLO_MONTHLY_PRICE_ID` | Solo plan pricing | ❌ Missing | From Stripe dashboard |
| `STRIPE_TEAM_MONTHLY_PRICE_ID` | Team plan pricing | ❌ Missing | From Stripe dashboard |
| `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID` | Enterprise pricing | ❌ Missing | From Stripe dashboard |

### Setup Instructions:

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy "Secret key" (starts with `sk_test_`)
3. In Stripe dashboard, create products/prices:
   - Solo: Monthly pricing
   - Team: Monthly pricing
   - Enterprise: Monthly pricing
4. Get price IDs (format: `price_xxxxxxxxxxxx`)

### Action Required:
```bash
# Add to .env.docker:
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
STRIPE_SOLO_MONTHLY_PRICE_ID=price_1234567890
STRIPE_TEAM_MONTHLY_PRICE_ID=price_0987654321
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_5555555555
```

---

## 8. Analytics & Monitoring

### Status: ⚠️ OPTIONAL - SKIPPABLE FOR TESTING

| Variable | Service | Purpose | Current |
|----------|---------|---------|---------|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog | Product analytics | ❌ Optional |
| `POSTHOG_HOST` | PostHog | Analytics backend | ❌ Optional |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry | Error tracking | ❌ Optional |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | Google Analytics | Traffic analytics | ❌ Optional |

**For Docker testing:** Can skip these - they're optional for local development.

---

## 9. Storage (S3/Cloud)

### Status: ❌ NOT CONFIGURED

| Variable | Purpose | Current | Requirement |
|----------|---------|---------|-------------|
| `S3_ACCESS_KEY_ID` | AWS credentials | ❌ Missing | AWS account |
| `S3_SECRET_ACCESS_KEY` | AWS credentials | ❌ Missing | AWS account |
| `S3_BUCKET_NAME` | S3 bucket | ❌ Missing | `snapback-uploads` |
| `S3_REGION` | AWS region | ❌ Missing | `us-east-1` |
| `S3_ENDPOINT` | S3 endpoint | ❌ Missing | `https://s3.amazonaws.com` |

**For Docker testing:** Optional - local storage works without S3.

---

## 10. Captcha (Cloudflare Turnstile)

### Status: ⚠️ NOT CONFIGURED

| Variable | Purpose | Current | Requirement |
|----------|---------|---------|-------------|
| `CAPTCHA_SITE_KEY` | Client-side key | ❌ Missing | From Cloudflare |
| `CAPTCHA_SECRET_KEY` | Server-side key | ❌ Missing | From Cloudflare |
| `FEATURE_TURNSTILE_ADAPTIVE` | Feature flag | ❌ Missing | `true` or `false` |
| `TURNSTILE_FAILURE_THRESHOLD` | Threshold | ❌ Missing | `5` |
| `TURNSTILE_WINDOW_MS` | Time window | ❌ Missing | `10000` |

### Setup (Optional):
1. Go to https://dash.cloudflare.com/turnstile
2. Create site, get keys
3. Add to `.env.docker`

---

## 11. MCP Server Configuration

### Status: ⚠️ PARTIAL - SERVICE VARS MISSING

| Variable | Purpose | Current | Required |
|----------|---------|---------|----------|
| `SNAPBACK_API_URL` | API endpoint | ❌ Missing | `http://api:3001` |
| `SNAPBACK_NO_NETWORK` | Offline mode | ❌ Missing | `true` or `false` |
| `MCP_SERVER_HOST` | Server host | ❌ Missing | `0.0.0.0` (Docker) |
| `MCP_SERVER_PORT` | Server port | ✅ 3002 | ✅ 3002 |
| `MCP_SERVER_MODE` | Transport mode | ❌ Missing | `stdio` or `http` |

### Action Required:
```bash
# Add to docker-compose.yml for mcp-server service:
environment:
  SNAPBACK_API_URL: http://api:3001
  SNAPBACK_NO_NETWORK: "false"
  MCP_SERVER_HOST: 0.0.0.0
  MCP_SERVER_PORT: 3002
  MCP_SERVER_MODE: http
```

---

## 12. Feature Flags

### Status: ❌ NOT SET

| Variable | Purpose | Default | Value |
|----------|---------|---------|-------|
| `FEATURE_PASSKEY_ENFORCE_ALL` | Passkey requirement | Not set | `true` or `false` |
| `ENABLE_SIGNUP` | Public signup | Not set | `false` (closed beta) |

### Action Required:
```bash
# Add to .env.docker:
FEATURE_PASSKEY_ENFORCE_ALL=false
ENABLE_SIGNUP=false
```

---

## 13. Additional Security Configuration

### Status: ⚠️ MISSING

| Variable | Purpose | Current | Recommended |
|----------|---------|---------|-------------|
| `CORS_ORIGIN` | CORS whitelist | Set but outdated | Update based on deployment |
| `AUTH_STEPUP_WINDOW_SEC` | Reauth timeout | ❌ Missing | `300` (5 min) |
| `RULES_SIGNING_KEY` | Policy rule signing | ❌ Missing | Generate: `openssl rand -base64 32` |

---

## Quick Reference: Priority Checklist

### 🔴 CRITICAL (Must set before Docker start)
- [ ] `POSTGRES_PASSWORD` - Database auth
- [ ] `DATABASE_URL` - Database connection
- [ ] `DIRECT_URL` - Prisma database
- [ ] `BETTER_AUTH_SECRET` - Auth signing
- [ ] `NEXT_PUBLIC_SITE_URL` - OAuth callbacks

### 🟡 HIGH (Needed for full testing)
- [ ] `BETTER_AUTH_RP_ID` - Passkeys
- [ ] `BETTER_AUTH_JWT_PRIVATE_PEM` - CLI/VSCode/MCP tokens
- [ ] `BETTER_AUTH_JWT_PUBLIC_PEM` - Token verification
- [ ] Stripe keys (payments) - If testing billing
- [ ] OAuth credentials - If testing login

### 🟢 OPTIONAL (Can skip for local testing)
- [ ] S3 credentials - Uses local storage fallback
- [ ] Sentry DSN - Error tracking
- [ ] PostHog key - Analytics
- [ ] Google Analytics - Traffic analytics

---

## Setup Steps for Docker Testing

### Step 1: Create/Update `.env.docker`

```bash
# Copy template if needed
cp .env.docker.example .env.docker

# Or create from scratch with CRITICAL variables:
cat > .env.docker << 'EOF'
# Database (CRITICAL)
POSTGRES_DB=snapback
POSTGRES_USER=snapback
POSTGRES_PASSWORD=snapback_dev_password_123!
DATABASE_URL=postgresql://snapback:snapback_dev_password_123!@postgres:5432/snapback
DIRECT_URL=postgresql://snapback:snapback_dev_password_123!@postgres:5432/snapback

# Redis
REDIS_URL=redis://redis:6379

# Auth (CRITICAL)
BETTER_AUTH_SECRET=YOUR_32_CHAR_SECRET_HERE
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BETTER_AUTH_URL=http://api:3001
BETTER_AUTH_RP_ID=localhost

# Application
NODE_ENV=development
API_URL=http://api:3001
WEB_APP_URL=http://localhost:3000
LOG_LEVEL=info

# OAuth (optional for testing)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Feature flags
FEATURE_PASSKEY_ENFORCE_ALL=false
ENABLE_SIGNUP=false

# Security
RULES_SIGNING_KEY=your_rules_signing_key_min_32_chars
EOF
```

### Step 2: Start Docker Services

```bash
# Using memory from project config:
docker-compose -f docker-compose.yml --env-file .env.docker up -d

# Or with specific services:
docker-compose -f docker-compose.yml --env-file .env.docker up -d postgres redis api web
```

### Step 3: Verify Services

```bash
# Check container status
docker-compose ps

# Check API health
curl http://localhost:3001/api/health

# Check Web app
curl http://localhost:3000/api/health

# Check database
docker-compose exec postgres psql -U snapback -d snapback -c "SELECT 1"

# Check Redis
docker-compose exec redis redis-cli ping
```

### Step 4: Run Database Migrations

```bash
# Apply pending migrations
docker-compose exec api npm run migrate

# Or via prisma
docker-compose exec api npx prisma migrate deploy
```

---

## Environment Variable Templates

### Minimal (.env.docker for testing)
```
POSTGRES_PASSWORD=snapback_dev_password_123!
DATABASE_URL=postgresql://snapback:snapback_dev_password_123!@postgres:5432/snapback
DIRECT_URL=postgresql://snapback:snapback_dev_password_123!@postgres:5432/snapback
REDIS_URL=redis://redis:6379
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BETTER_AUTH_URL=http://api:3001
BETTER_AUTH_RP_ID=localhost
NODE_ENV=development
API_URL=http://api:3001
WEB_APP_URL=http://localhost:3000
LOG_LEVEL=info
FEATURE_PASSKEY_ENFORCE_ALL=false
ENABLE_SIGNUP=false
```

### Full (.env.docker with all services)
See `.env.docker.example` in project root - contains all 141 variables documented.

---

## Troubleshooting

### Database Connection Failed
```
Error: connect ECONNREFUSED postgres:5432
```
**Solution:** Ensure `DATABASE_URL` uses `postgres` (Docker service name), not `localhost`
```
✅ DATABASE_URL=postgresql://snapback:password@postgres:5432/snapback
❌ DATABASE_URL=postgresql://snapback:password@localhost:5432/snapback
```

### Auth Secret Too Short
```
Error: BETTER_AUTH_SECRET must be at least 32 characters
```
**Solution:** Generate with:
```bash
openssl rand -base64 32
```

### JWT Keys Not Loading
```
Error: JWT_PRIVATE_PEM or JWT_PUBLIC_PEM not found
```
**Solution:** Ensure PEM keys include full BEGIN/END markers and are properly escaped:
```bash
# Generate keys
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# View content
cat private.pem
cat public.pem

# Add to .env.docker with full markers
```

### CORS Errors in Browser
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:** Update `CORS_ORIGIN` in `.env.docker`:
```
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

---

## Next Steps

1. **Update `.env.docker`** with critical variables (Step 1 above)
2. **Generate secrets** (BETTER_AUTH_SECRET, JWT keys)
3. **Start Docker** with memory profile: `--env-file .env.docker`
4. **Run migrations** to initialize database schema
5. **Test endpoints** with curl or Postman
6. **Add OAuth keys** when ready for full authentication testing
7. **Configure Stripe** when testing payments

---

## Files to Review

- **Root config:** `/Users/user1/WebstormProjects/SnapBack-Site/.env.docker`
- **Example template:** `/Users/user1/WebstormProjects/SnapBack-Site/.env.docker.example`
- **Auth template:** `/Users/user1/WebstormProjects/SnapBack-Site/.env.example.better-auth`
- **Web app config:** `/Users/user1/WebstormProjects/SnapBack-Site/apps/web/.env.example`
- **API config:** `/Users/user1/WebstormProjects/SnapBack-Site/apps/api/.env`
- **Docker compose:** `/Users/user1/WebstormProjects/SnapBack-Site/docker-compose.yml`

---

## Summary

**Total Variables:** 60+
**Configured:** ~15
**Missing:** ~45
**Critical (must set):** 5
**High priority:** 3
**Optional:** 25+

**Time to configure:** 15-30 minutes for basic testing
**Time with OAuth/Stripe:** 1-2 hours for full feature testing

Your Docker infrastructure is well-architected. The missing environment variables are mostly for optional features. Focus on the 5 critical variables to get the core services running.

