# Environment Configuration Quick Start

## Overview

This guide walks you through setting up environment configurations for SnapBack using industry-standard practices.

**Naming Convention:**
- **Development**: `.env.local` (local machine development, git-ignored)
- **Staging**: `.env.staging` (pre-production testing, git-ignored)
- **Production**: `.env.production` (live environment, NEVER committed to git)

---

## 1. Quick Setup (Development)

### One-Command Setup

```bash
# Create all .env.local files from templates
bash scripts/setup-environments.sh dev
```

This will:
- Create `.env.local` in root directory
- Create `.env.local` in all apps: `api`, `web`, `cli`, `mcp-server`, `vscode`
- Create `.env.local` in all packages: `auth`, `platform`

### Manual Setup

```bash
# Copy template files
cp .env.example .env.local
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
cp apps/cli/.env.example apps/cli/.env.local
cp apps/mcp-server/.env.example apps/mcp-server/.env.local
cp apps/vscode/.env.example apps/vscode/.env.local
cp packages/auth/.env.example packages/auth/.env.local
cp packages/platform/.env.example packages/platform/.env.local
```

---

## 2. Configure Each Environment File

### Root `.env.local` - Monorepo Settings

Edit `.env.local` and set:

```env
NODE_ENV=development

# Local database
DATABASE_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev
DIRECT_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev

# Local Redis
REDIS_URL=redis://localhost:6379

# Auth configuration
BETTER_AUTH_SECRET=dev-secret-minimum-32-chars-local
BETTER_AUTH_URL=http://localhost:3001
APP_URL=http://localhost:3001

# Web frontend URLs
NEXT_PUBLIC_APP_URL=http://console.localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### apps/api/.env.local - API Server

```env
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

DATABASE_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev
DIRECT_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev
REDIS_URL=redis://localhost:6379

BETTER_AUTH_SECRET=dev-secret-minimum-32-chars-local
BETTER_AUTH_URL=http://localhost:3001
APP_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://console.localhost:3000

# Optional for OAuth (get from GitHub)
GITHUB_CLIENT_ID=your_github_oauth_id
GITHUB_CLIENT_SECRET=your_github_oauth_secret

# Optional for OAuth (get from Google)
GOOGLE_CLIENT_ID=your_google_oauth_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_oauth_secret

# Optional for email
RESEND_API_KEY=re_your_resend_api_key

# Optional for CAPTCHA
TURNSTILE_SITE_KEY=your_turnstile_key
TURNSTILE_SECRET_KEY=your_turnstile_secret

LOG_LEVEL=debug
```

### apps/web/.env.local - Web Frontend

```env
NODE_ENV=development

# Frontend URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://console.localhost:3000
NEXT_PUBLIC_DOCS_URL=http://docs.localhost:3000
NEXT_PUBLIC_ROOT_DOMAIN=localhost
NEXT_PUBLIC_API_URL=http://localhost:3001

# Database (server-side)
DATABASE_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev
DIRECT_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev
REDIS_URL=redis://localhost:6379

# Auth
BETTER_AUTH_SECRET=dev-secret-minimum-32-chars-local
NEXT_PUBLIC_AUTH_URL=http://localhost:3001
APP_URL=http://console.localhost:3000

# OAuth (same as API)
GITHUB_CLIENT_ID=your_github_oauth_id
GITHUB_CLIENT_SECRET=your_github_oauth_secret
GOOGLE_CLIENT_ID=your_google_oauth_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_oauth_secret

# Email
RESEND_API_KEY=re_your_resend_api_key

# CAPTCHA
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_key
TURNSTILE_SECRET_KEY=your_turnstile_secret

# Stripe (optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### apps/cli/.env.local - CLI Tool

```env
NODE_ENV=development
API_URL=http://localhost:3001
API_KEY=sk_test_your_cli_api_key
OUTPUT_FORMAT=table
LOG_LEVEL=info
```

### apps/mcp-server/.env.local - MCP Server

```env
NODE_ENV=development
API_URL=http://localhost:3001
API_KEY=sk_test_your_mcp_api_key
DATABASE_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev
LOG_LEVEL=info
```

### apps/vscode/.env.local - VSCode Extension

```env
NODE_ENV=development
API_URL=http://localhost:3001
OAUTH_REDIRECT_URI=vscode://snapback.snapback/auth-callback
TOKEN_ENDPOINT=http://localhost:3001/auth/token
REFRESH_TOKEN_ENDPOINT=http://localhost:3001/auth/token/refresh
LOG_LEVEL=info
```

### packages/auth/.env.local - Auth Package

```env
NODE_ENV=development
DATABASE_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev
DIRECT_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev

BETTER_AUTH_SECRET=dev-secret-minimum-32-chars-local
BETTER_AUTH_URL=http://localhost:3001
APP_URL=http://localhost:3001

GITHUB_CLIENT_ID=your_github_oauth_id
GITHUB_CLIENT_SECRET=your_github_oauth_secret
GOOGLE_CLIENT_ID=your_google_oauth_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_oauth_secret

RESEND_API_KEY=re_your_resend_api_key

LOG_LEVEL=info
```

### packages/platform/.env.local - Platform Package

```env
NODE_ENV=development
DATABASE_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev
DIRECT_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

---

## 3. Verify Setup

```bash
# Check that all required variables are set
bash scripts/validate-env.sh

# For specific environment
NODE_ENV=staging bash scripts/validate-env.sh
NODE_ENV=production bash scripts/validate-env.sh
```

---

## 4. Obtain Required Secrets

### GitHub OAuth
1. Go to https://github.com/settings/developers
2. Click "New GitHub App"
3. Set "Authorization callback URL" to `http://localhost:3001/auth/callback/github`
4. Copy `Client ID` and `Client Secret`

### Google OAuth
1. Go to https://console.cloud.google.com/
2. Create new Project
3. Create OAuth 2.0 credentials
4. Set "Authorized redirect URIs" to `http://localhost:3001/auth/callback/google`
5. Copy `Client ID` and `Client Secret`

### Resend (Email)
1. Go to https://resend.com/api-keys
2. Create API key
3. Copy the key to `RESEND_API_KEY`

### Cloudflare Turnstile (CAPTCHA)
1. Go to https://dash.cloudflare.com/
2. Create Site Key and Secret Key
3. Copy both to `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`

### Stripe (Optional)
1. Go to https://dashboard.stripe.com/apikeys
2. Copy Secret Key (starts with `sk_test_`)
3. Copy Publishable Key (starts with `pk_test_`)

---

## 5. Load Environment & Run

```bash
# Start development environment
pnpm dev

# Or specify environment explicitly
NODE_ENV=development pnpm dev

# With dotenv-cli for explicit env file loading
dotenv -e .env.local -- pnpm dev
dotenv -e .env.staging -- pnpm build
dotenv -e .env.production -- npm start
```

---

## 6. Setting Up Staging Environment

```bash
# Create staging environment files
bash scripts/setup-environments.sh staging
```

For staging, you need:
- **Staging database**: `staging-db.internal` (managed separately)
- **Staging Redis**: `staging-redis.internal` (managed separately)
- **Staging OAuth apps**: Create separate OAuth apps pointing to staging domain
- **All secrets from vault**: Database passwords, API keys, OAuth secrets

Edit `.env.staging`, `.env.staging` in each app/package with:

```env
NODE_ENV=staging

# Staging database
DATABASE_URL=postgresql://snapback_staging:${PASSWORD}@staging-db.internal:5432/snapback_staging
DIRECT_URL=postgresql://snapback_staging:${PASSWORD}@staging-db.internal:5432/snapback_staging

# Staging Redis
REDIS_URL=redis://:${PASSWORD}@staging-redis.internal:6379

# Staging domains
BETTER_AUTH_URL=https://api.staging.snapback.dev
APP_URL=https://api.staging.snapback.dev
NEXT_PUBLIC_APP_URL=https://console.staging.snapback.dev
NEXT_PUBLIC_SITE_URL=https://staging.snapback.dev

# Staging OAuth (different app registrations)
GITHUB_CLIENT_ID=staging_github_id
GITHUB_CLIENT_SECRET=staging_github_secret
# ... etc

LOG_LEVEL=info
```

---

## 7. Setting Up Production Environment

```bash
# Create production environment files (DO NOT COMMIT)
bash scripts/setup-environments.sh prod
```

**CRITICAL**: Production environment files should:
- ✅ Be stored in secure vault (Vercel, Fly.io, etc.)
- ✅ NEVER be committed to git
- ✅ Only be loaded via deployment platform secrets
- ❌ NEVER be edited locally on machine

For production deployment:

```env
NODE_ENV=production

# Production database (read from vault)
DATABASE_URL=postgresql://snapback_prod:${VAULT_PROD_DB_PASSWORD}@prod-db.internal:5432/snapback_prod
DIRECT_URL=postgresql://snapback_prod:${VAULT_PROD_DB_PASSWORD}@prod-db.internal:5432/snapback_prod

# Production Redis
REDIS_URL=redis://:${VAULT_PROD_REDIS_PASSWORD}@prod-redis.internal:6379

# Production domains
BETTER_AUTH_URL=https://api.snapback.dev
APP_URL=https://api.snapback.dev
NEXT_PUBLIC_APP_URL=https://console.snapback.dev
NEXT_PUBLIC_SITE_URL=https://snapback.dev

# Production OAuth
GITHUB_CLIENT_ID=${VAULT_PROD_GITHUB_CLIENT_ID}
GITHUB_CLIENT_SECRET=${VAULT_PROD_GITHUB_CLIENT_SECRET}
# ... etc

LOG_LEVEL=warn
SENTRY_DSN=${VAULT_PROD_SENTRY_DSN}
STRIPE_SECRET_KEY=${VAULT_PROD_STRIPE_SECRET}
```

---

## File Structure After Setup

```
SnapBack-Site/
├── .env.local                          # Root development config
├── .env.staging                        # Root staging config
├── .env.production                     # Root production config (secure)
│
├── apps/
│   ├── api/
│   │   ├── .env.example               # Template
│   │   ├── .env.local                 # Development
│   │   ├── .env.staging               # Staging
│   │   └── .env.production            # Production
│   ├── web/
│   │   ├── .env.example
│   │   ├── .env.local
│   │   ├── .env.staging
│   │   └── .env.production
│   ├── cli/
│   ├── mcp-server/
│   └── vscode/
│
├── packages/
│   ├── auth/
│   ├── platform/
│   └── [others]/
│
└── scripts/
    ├── setup-environments.sh          # One-command setup
    └── validate-env.sh                # Validate config completeness
```

---

## Troubleshooting

### Missing Environment Variables

```bash
# Validate environment
bash scripts/validate-env.sh

# Output shows which variables are missing:
# ✗ Missing: GITHUB_CLIENT_ID
# ✗ Missing: STRIPE_SECRET_KEY
```

### "Cannot find module '@snapback/*'"

Ensure all packages have `.env.local` with `DATABASE_URL`:

```bash
# Check each package has env file
ls apps/*/. env.local packages/*/.env.local

# If missing, run setup again
bash scripts/setup-environments.sh dev
```

### Database Connection Failures

Verify connection strings:

```bash
# Test PostgreSQL connection
psql $DATABASE_URL

# Test Redis connection
redis-cli -u $REDIS_URL ping
```

### OAuth Callback Errors

Ensure OAuth apps are registered with correct redirect URLs:
- **GitHub**: `http://localhost:3001/auth/callback/github`
- **Google**: `http://localhost:3001/auth/callback/google`

---

## Summary

| Step | Command | Time |
|---|---|---|
| 1. Setup | `bash scripts/setup-environments.sh dev` | 1 min |
| 2. Configure | Edit `.env.local` files | 5 min |
| 3. Add Secrets | Get OAuth keys, API keys | 10 min |
| 4. Validate | `bash scripts/validate-env.sh` | 1 min |
| 5. Run | `pnpm dev` | 2 min |

**Total**: ~20 minutes to get development environment running

---

## Next Steps

- ✅ Environment setup complete
- → Start development: `pnpm dev`
- → Read [ENV_CONFIG_SETUP.md](./ENV_CONFIG_SETUP.md) for detailed configuration guide
- → See [docs/](./docs/) for application documentation
