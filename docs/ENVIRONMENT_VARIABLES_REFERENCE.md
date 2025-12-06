# Environment Variables Reference Guide

**Last Updated:** 2025-12-05
**Purpose:** Complete environment variable reference for dev/staging/production

---

## 📋 Quick Index

- [Local Development (.env.docker)](#local-development-envdocker)
- [Vercel Preview (Staging)](#vercel-preview-staging)
- [Vercel Production](#vercel-production)
- [GitHub Actions Secrets](#github-actions-secrets)
- [Variable Comparison Matrix](#variable-comparison-matrix)

---

## Local Development (.env.docker)

**File:** `.env.docker` (gitignored)
**Template:** `.env.docker.example` (committed)
**Used by:** Docker Compose, local development

### Core Services

```bash
# Node Environment
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1

# Database (PostgreSQL)
POSTGRES_DB=snapback
POSTGRES_USER=snapback
POSTGRES_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://snapback:your_secure_password_here@postgres:5432/snapback

# Redis
REDIS_URL=redis://redis:6379

# API Service
API_URL=http://api:8080
NEXT_PUBLIC_API_URL=http://api.snapback.dev:8080

# Web App
WEB_URL=http://web:3000
NEXT_PUBLIC_WEB_URL=http://snapback.dev

# Docs Site
DOCS_URL=http://docs:3000
NEXT_PUBLIC_DOCS_URL=http://docs.snapback.dev
```

### Authentication

```bash
# Better Auth
BETTER_AUTH_SECRET=your_super_secure_auth_secret_min_32_chars
BETTER_AUTH_URL=http://api.snapback.dev:8080

# OAuth Providers (Optional for local dev)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Development Services

```bash
# CORS (Permissive for local dev)
CORS_ORIGIN=http://snapback.dev,http://console.snapback.dev,http://docs.snapback.dev,http://api.snapback.dev

# Email (MailHog for testing)
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@snapback.dev

# Storage (Optional - use local filesystem)
S3_ACCESS_KEY_ID=local_dev_access_key
S3_SECRET_ACCESS_KEY=local_dev_secret_key
S3_BUCKET_NAME=snapback-uploads-dev
S3_REGION=us-east-1
```

### Cloud Services (Test Keys Only)

```bash
# Stripe (Test mode)
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# PostHog (Development key)
NEXT_PUBLIC_POSTHOG_KEY=phc_dev_your_posthog_key

# OpenAI (Optional)
OPENAI_API_KEY=sk-your_openai_api_key

# Sentry (Optional - disable for local)
DISABLE_SENTRY=true
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

### Generate Required Secrets

```bash
# Generate BETTER_AUTH_SECRET (32+ characters)
openssl rand -base64 32

# Generate PostgreSQL password
openssl rand -base64 24
```

---

## Vercel Preview (Staging)

**Managed in:** Vercel Dashboard → Project → Environment Variables → Preview
**Used by:** PR preview deployments, staging environment

### Core Configuration

```bash
# Environment
NODE_ENV=preview
VERCEL_ENV=preview
VERCEL=1

# URLs (Staging endpoints)
NEXT_PUBLIC_API_URL=https://api-staging.snapback.dev
NEXT_PUBLIC_WEB_URL=https://staging.snapback.dev
NEXT_PUBLIC_DOCS_URL=https://docs-staging.snapback.dev
```

### Database & Cache

```bash
# PostgreSQL (Staging database)
DATABASE_URL=postgresql://user:password@staging-db.host:5432/snapback_staging

# Redis (Staging cache)
REDIS_URL=redis://staging-redis.host:6379
```

### Authentication

```bash
# Better Auth
BETTER_AUTH_SECRET=<staging_secret_min_32_chars>
BETTER_AUTH_URL=https://api-staging.snapback.dev

# OAuth (Can use same test keys as dev)
GITHUB_CLIENT_ID=<staging_github_client_id>
GITHUB_CLIENT_SECRET=<staging_github_client_secret>
GOOGLE_CLIENT_ID=<staging_google_client_id>
GOOGLE_CLIENT_SECRET=<staging_google_client_secret>
```

### Cloud Services

```bash
# Stripe (Test mode)
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_staging_xxx

# PostHog (Staging project)
NEXT_PUBLIC_POSTHOG_KEY=phc_staging_xxx

# Resend (Staging API key)
RESEND_API_KEY=re_staging_xxx

# S3 Storage (Staging bucket)
S3_ACCESS_KEY_ID=<staging_access_key>
S3_SECRET_ACCESS_KEY=<staging_secret_key>
S3_BUCKET_NAME=snapback-uploads-staging
S3_REGION=us-east-1
```

### Feature Flags

```bash
# Analytics
NEXT_PUBLIC_ENABLE_ANALYTICS=false

# Debug Tools
NEXT_PUBLIC_SHOW_DEBUG_PANEL=true
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=true

# Sentry (Optional)
SENTRY_DSN=<staging_sentry_dsn>
NEXT_PUBLIC_SENTRY_DSN=<staging_sentry_dsn>
DISABLE_SENTRY=false
```

### Security

```bash
# CORS (Permissive for previews)
CORS_ORIGIN=https://*.vercel.app,https://staging.snapback.dev,https://docs-staging.snapback.dev

# Rate Limiting (Relaxed)
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=60000
```

---

## Vercel Production

**Managed in:** Vercel Dashboard → Project → Environment Variables → Production
**Used by:** Production deployments (snapback.dev)

### Core Configuration

```bash
# Environment
NODE_ENV=production
VERCEL_ENV=production
VERCEL=1

# URLs (Production endpoints)
NEXT_PUBLIC_API_URL=https://api.snapback.dev
NEXT_PUBLIC_WEB_URL=https://snapback.dev
NEXT_PUBLIC_DOCS_URL=https://docs.snapback.dev
```

### Database & Cache

```bash
# PostgreSQL (Production database)
DATABASE_URL=postgresql://user:password@production-db.host:5432/snapback_production

# Redis (Production cache with replication)
REDIS_URL=redis://production-redis.host:6379
```

### Authentication

```bash
# Better Auth
BETTER_AUTH_SECRET=<production_secret_min_32_chars>
BETTER_AUTH_URL=https://api.snapback.dev

# OAuth (Production apps)
GITHUB_CLIENT_ID=<production_github_client_id>
GITHUB_CLIENT_SECRET=<production_github_client_secret>
GOOGLE_CLIENT_ID=<production_google_client_id>
GOOGLE_CLIENT_SECRET=<production_google_client_secret>
```

### Cloud Services

```bash
# Stripe (Live mode - CRITICAL)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_production_xxx

# PostHog (Production project)
NEXT_PUBLIC_POSTHOG_KEY=phc_prod_xxx

# Resend (Production API key)
RESEND_API_KEY=re_prod_xxx

# S3 Storage (Production bucket)
S3_ACCESS_KEY_ID=<production_access_key>
S3_SECRET_ACCESS_KEY=<production_secret_key>
S3_BUCKET_NAME=snapback-uploads-production
S3_REGION=us-east-1
```

### Feature Flags

```bash
# Analytics (Enabled)
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Debug Tools (Disabled)
NEXT_PUBLIC_SHOW_DEBUG_PANEL=false
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=false

# Sentry (Production monitoring)
SENTRY_DSN=<production_sentry_dsn>
NEXT_PUBLIC_SENTRY_DSN=<production_sentry_dsn>
DISABLE_SENTRY=false

# Google Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Security

```bash
# CORS (Strict production domains)
CORS_ORIGIN=https://snapback.dev,https://docs.snapback.dev,https://app.snapback.dev

# Rate Limiting (Strict)
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Security Headers (Enabled)
ENABLE_SECURITY_HEADERS=true
```

---

## GitHub Actions Secrets

**Managed in:** GitHub Repository → Settings → Secrets and variables → Actions

### Repository Secrets

```yaml
# Vercel Integration
VERCEL_TOKEN: <vercel_api_token>
VERCEL_ORG_ID: <from_.vercel/project.json>
VERCEL_PROJECT_ID_WEB: <web_project_id>
VERCEL_PROJECT_ID_DOCS: <docs_project_id>

# npm Publishing
NPM_TOKEN: <npm_automation_token>

# GitHub Access
GH_TOKEN: <github_pat_for_cross_repo>
```

### Environment: preview

```yaml
# Database
DATABASE_URL: <staging_database_url>

# Cloud Services
POSTHOG_KEY: <staging_posthog_key>
STRIPE_SECRET_KEY: sk_test_xxx

# Auth
BETTER_AUTH_SECRET: <staging_secret>
```

### Environment: production

```yaml
# Database
DATABASE_URL: <production_database_url>

# Cloud Services
POSTHOG_KEY: <production_posthog_key>
STRIPE_SECRET_KEY: sk_live_xxx

# Auth
BETTER_AUTH_SECRET: <production_secret>
```

---

## Variable Comparison Matrix

| Variable | Local Dev | Preview | Production |
|----------|-----------|---------|------------|
| `NODE_ENV` | development | preview | production |
| `NEXT_PUBLIC_API_URL` | http://api.snapback.dev:8080 | https://api-staging.snapback.dev | https://api.snapback.dev |
| `DATABASE_URL` | Local PostgreSQL | Staging DB | Production DB |
| `STRIPE_SECRET_KEY` | sk_test_xxx | sk_test_xxx | sk_live_xxx |
| `POSTHOG_KEY` | phc_dev_xxx | phc_staging_xxx | phc_prod_xxx |
| `BETTER_AUTH_SECRET` | Local secret | Staging secret | Production secret |
| `CORS_ORIGIN` | Permissive | Permissive | Strict |
| `NEXT_PUBLIC_SHOW_DEBUG_PANEL` | true | true | false |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | false | false | true |
| `DISABLE_SENTRY` | true | false | false |

---

## 🔒 Security Best Practices

### Secret Generation

```bash
# Generate 32-character secret
openssl rand -base64 32

# Generate 64-character secret
openssl rand -base64 48

# Generate UUID
uuidgen
```

### Secret Rotation Schedule

| Secret | Environment | Rotation Frequency |
|--------|-------------|-------------------|
| `BETTER_AUTH_SECRET` | Production | 90 days |
| `BETTER_AUTH_SECRET` | Staging | 180 days |
| `DATABASE_URL` password | Production | 180 days |
| `STRIPE_SECRET_KEY` | Production | Annually or after breach |
| `VERCEL_TOKEN` | All | Annually |
| `NPM_TOKEN` | All | Annually |

### Audit Checklist

**Monthly:**
- [ ] Review Vercel deployment logs
- [ ] Check GitHub audit log for secret access
- [ ] Scan dependencies: `pnpm audit`

**Quarterly:**
- [ ] Rotate production secrets
- [ ] Review access permissions
- [ ] Update OAuth app credentials

---

## 🚨 Common Issues

### Issue: "DATABASE_URL is undefined"

**Solution:**
```bash
# Verify variable is set in correct environment
# Vercel: Check Dashboard → Environment Variables
# Local: Check .env.docker exists and has DATABASE_URL
# GitHub: Check repository secrets or environment secrets
```

### Issue: "BETTER_AUTH_SECRET must be at least 32 characters"

**Solution:**
```bash
# Generate new secret
openssl rand -base64 32

# Update in:
# 1. .env.docker (local)
# 2. Vercel Dashboard (preview + production)
# 3. GitHub Environment Secrets (preview + production)
```

### Issue: "Stripe test key used in production"

**Solution:**
```bash
# Immediately update Vercel production environment variables
# Change STRIPE_SECRET_KEY from sk_test_xxx to sk_live_xxx
# Redeploy: vercel --prod
```

---

## 📚 Additional Resources

- **Setup Guide:** `/docs/SETUP_CHECKLIST.md`
- **Quick Reference:** `/docs/QUICK_REFERENCE.md`
- **Vercel Docs:** https://vercel.com/docs/environment-variables
- **GitHub Secrets:** https://docs.github.com/en/actions/security-guides/encrypted-secrets

---

**Last Updated:** 2025-12-05
**Maintained By:** DevOps Team
