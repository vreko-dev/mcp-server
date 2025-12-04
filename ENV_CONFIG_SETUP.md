# Environment Configuration Setup Guide

**Status**: Setup instructions for dev, stage, and prod environments
**Last Updated**: 2025-12-04
**Standard**: Industry-standard environment naming conventions

---

## Overview

This guide establishes environment configuration patterns across all packages and apps using industry-standard conventions:

```
Development:  .env.local        (local development)
Staging:      .env.staging      (pre-production testing)
Production:   .env.production   (live environment)
```

---

## Directory Structure

```
workspace-root/
├── .env.example              # Template for all environments
├── .env.local                # Local development (git-ignored)
├── .env.staging              # Staging environment (git-ignored)
├── .env.production           # Production environment (SECURE)
│
├── apps/
│   ├── api/
│   │   ├── .env.example
│   │   ├── .env.local
│   │   ├── .env.staging
│   │   └── .env.production
│   ├── web/
│   │   ├── .env.example
│   │   ├── .env.local
│   │   ├── .env.staging
│   │   └── .env.production
│   ├── cli/
│   │   ├── .env.example
│   │   ├── .env.local
│   │   ├── .env.staging
│   │   └── .env.production
│   ├── mcp-server/
│   │   ├── .env.example
│   │   ├── .env.local
│   │   ├── .env.staging
│   │   └── .env.production
│   └── vscode/
│       ├── .env.example
│       ├── .env.local
│       ├── .env.staging
│       └── .env.production
│
├── packages/
│   ├── auth/
│   │   ├── .env.example
│   │   ├── .env.local
│   │   ├── .env.staging
│   │   └── .env.production
│   ├── platform/
│   │   ├── .env.example
│   │   ├── .env.local
│   │   ├── .env.staging
│   │   └── .env.production
│   └── [other-packages]/
│       ├── .env.example
│       ├── .env.local
│       ├── .env.staging
│       └── .env.production
```

---

## Configuration Naming Convention

### Environment Names
- **dev** (development): Local machine, feature branches
- **staging** (stage): Pre-production, testing environment
- **prod** (production): Live customer-facing environment

### File Naming Pattern
```
.env.{ENVIRONMENT}

Examples:
- .env.local        → NODE_ENV=development
- .env.staging      → NODE_ENV=staging
- .env.production   → NODE_ENV=production
```

### NODE_ENV Values
```typescript
development  // Local development
staging      // Pre-production testing
production   // Live environment
test         // Unit/integration tests
```

---

## Environment Variable Configuration

### Base Environment (Universal)

```env
# Environment designation
NODE_ENV=development|staging|production

# Application identification
APP_NAME=SnapBack
APP_VERSION=1.0.0

# Deployment mode
DEPLOYMENT_ENV=local|staging|production
```

### Database Configuration

**Development:**
```env
DATABASE_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev
DIRECT_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev
```

**Staging:**
```env
DATABASE_URL=postgresql://snapback_staging:${PASSWORD}@staging-db.internal:5432/snapback_staging
DIRECT_URL=postgresql://snapback_staging:${PASSWORD}@staging-db.internal:5432/snapback_staging
```

**Production:**
```env
DATABASE_URL=postgresql://snapback_prod:${PASSWORD}@prod-db.internal:5432/snapback_prod
DIRECT_URL=postgresql://snapback_prod:${PASSWORD}@prod-db.internal:5432/snapback_prod
```

### Authentication Configuration

**Development:**
```env
BETTER_AUTH_SECRET=dev-secret-min-32-characters-local
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://console.localhost:3000
APP_URL=http://localhost:3001
```

**Staging:**
```env
BETTER_AUTH_SECRET=${STAGING_AUTH_SECRET}
BETTER_AUTH_URL=https://api.staging.snapback.dev
NEXT_PUBLIC_APP_URL=https://console.staging.snapback.dev
APP_URL=https://api.staging.snapback.dev
```

**Production:**
```env
BETTER_AUTH_SECRET=${PROD_AUTH_SECRET}
BETTER_AUTH_URL=https://api.snapback.dev
NEXT_PUBLIC_APP_URL=https://console.snapback.dev
APP_URL=https://api.snapback.dev
```

### OAuth Provider Configuration

**Development:**
```env
GITHUB_CLIENT_ID=dev_github_oauth_id
GITHUB_CLIENT_SECRET=dev_github_oauth_secret
GOOGLE_CLIENT_ID=dev_google_oauth_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=dev_google_oauth_secret
```

**Staging:**
```env
GITHUB_CLIENT_ID=${STAGING_GITHUB_CLIENT_ID}
GITHUB_CLIENT_SECRET=${STAGING_GITHUB_CLIENT_SECRET}
GOOGLE_CLIENT_ID=${STAGING_GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${STAGING_GOOGLE_CLIENT_SECRET}
```

**Production:**
```env
GITHUB_CLIENT_ID=${PROD_GITHUB_CLIENT_ID}
GITHUB_CLIENT_SECRET=${PROD_GITHUB_CLIENT_SECRET}
GOOGLE_CLIENT_ID=${PROD_GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${PROD_GOOGLE_CLIENT_SECRET}
```

### Redis Configuration

**Development:**
```env
REDIS_URL=redis://localhost:6379
```

**Staging:**
```env
REDIS_URL=redis://:${STAGING_REDIS_PASSWORD}@staging-redis.internal:6379
```

**Production:**
```env
REDIS_URL=redis://:${PROD_REDIS_PASSWORD}@prod-redis.internal:6379
```

---

## Loading Strategy

### Node.js / JavaScript Apps

```typescript
// Load appropriate .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : process.env.NODE_ENV === 'staging'
  ? '.env.staging'
  : '.env.local';

require('dotenv').config({ path: envFile });
```

### Next.js (apps/web, apps/docs)

Next.js automatically loads:
1. `.env.local` (all environments)
2. `.env.${NODE_ENV}` (environment-specific)
3. `.env` (default)

**Load order (highest priority first):**
```
.env.production → .env.local → .env
.env.staging → .env.local → .env
.env.local → .env
```

### TypeScript / Node.js

```typescript
// packages/config/src/load-env.ts
import dotenv from 'dotenv';
import path from 'path';

export function loadEnv(env: 'development' | 'staging' | 'production' = process.env.NODE_ENV) {
  const envFile = env === 'production'
    ? '.env.production'
    : env === 'staging'
    ? '.env.staging'
    : '.env.local';

  const result = dotenv.config({
    path: path.resolve(process.cwd(), envFile)
  });

  if (result.error && env !== 'development') {
    throw new Error(`Failed to load ${envFile}: ${result.error.message}`);
  }

  return result.parsed || {};
}
```

---

## CLI Usage

### Running with Specific Environment

```bash
# Development (default)
NODE_ENV=development pnpm dev

# Staging
NODE_ENV=staging pnpm build
docker-compose -f docker-compose.staging.yml up

# Production
NODE_ENV=production pnpm build
npm start
```

### Using dotenv-cli

```bash
# Install dotenv-cli
pnpm add -D dotenv-cli

# Run with specific environment
dotenv -e .env.local -- pnpm dev
dotenv -e .env.staging -- pnpm build
dotenv -e .env.production -- npm start
```

### Docker Compose

```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Staging
docker-compose -f docker-compose.staging.yml up

# Production
docker-compose -f docker-compose.yml up
```

---

## Git Configuration

Add to `.gitignore`:

```
# Environment files (never commit sensitive data)
.env.local
.env.staging
.env.production

# Optional: allow committed staging/prod if encrypted
# .env.production.encrypted
```

### Secure Production Secrets

**Option 1: Environment Variables on Deployment Platform**
```
Vercel:    Dashboard → Project Settings → Environment Variables
Fly.io:    flyctl secrets set VARIABLE=value
Docker:    --env-file or ENV in Dockerfile
Kubernetes: Secrets in deployment manifests
```

**Option 2: Encrypted Files**
```bash
# Encrypt with git-crypt or similar
git-crypt add-gpg-user user@example.com
git-crypt lock

# Commit encrypted files
git add .env.production.encrypted
```

---

## Environment-Specific Configuration

### Logging Levels

```env
# Development
LOG_LEVEL=debug

# Staging
LOG_LEVEL=info

# Production
LOG_LEVEL=warn
```

### Feature Flags

```env
# Development
FEATURE_DEBUG_MODE=true
FEATURE_VERBOSE_LOGGING=true

# Staging
FEATURE_DEBUG_MODE=false
FEATURE_VERBOSE_LOGGING=true

# Production
FEATURE_DEBUG_MODE=false
FEATURE_VERBOSE_LOGGING=false
```

### Rate Limiting

```env
# Development
RATE_LIMIT_ENABLED=false

# Staging
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000

# Production
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
```

### API Timeouts

```env
# Development
API_TIMEOUT_MS=30000

# Staging
API_TIMEOUT_MS=10000

# Production
API_TIMEOUT_MS=5000
```

---

## Validation

### Environment Variable Checklist

For each environment before deployment:

**Development**
- [ ] `.env.local` created from `.env.example`
- [ ] All required variables set
- [ ] Local database running
- [ ] NODE_ENV=development

**Staging**
- [ ] `.env.staging` created with staging credentials
- [ ] All OAuth apps configured for staging domain
- [ ] Staging database accessible
- [ ] NODE_ENV=staging
- [ ] Secrets sourced from vault/secrets manager

**Production**
- [ ] `.env.production` stored securely (NOT in git)
- [ ] All OAuth apps configured for production domain
- [ ] Production database credentials correct
- [ ] NODE_ENV=production
- [ ] All secrets sourced from production vault
- [ ] BETTER_AUTH_URL matches domain
- [ ] NEXT_PUBLIC_APP_URL matches domain
- [ ] SSL certificates configured
- [ ] Rate limiting enabled
- [ ] Logging level appropriate

---

## Scripts for Environment Setup

### Setup Script

```bash
#!/bin/bash
# scripts/setup-env.sh

ENV=${1:-local}

case $ENV in
  local)
    echo "Setting up local development environment..."
    cp .env.example .env.local
    # Populate with local defaults
    ;;
  staging)
    echo "Setting up staging environment..."
    if [ ! -f .env.staging ]; then
      echo "Error: .env.staging not found. Set up secure staging config."
      exit 1
    fi
    ;;
  production)
    echo "Setting up production environment..."
    if [ ! -f .env.production ]; then
      echo "Error: .env.production not found. Load from vault."
      exit 1
    fi
    ;;
  *)
    echo "Usage: $0 {local|staging|production}"
    exit 1
    ;;
esac

echo "Environment setup complete for $ENV"
```

### Validation Script

```bash
#!/bin/bash
# scripts/validate-env.sh

ENV=${NODE_ENV:-local}
ENV_FILE=".env.${ENV}"

echo "Validating $ENV environment..."

# Check required variables
REQUIRED_VARS=(
  "NODE_ENV"
  "BETTER_AUTH_SECRET"
  "DATABASE_URL"
  "REDIS_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required variable: $var"
    exit 1
  fi
done

echo "✅ Environment validation passed"
```

---

## Summary

| Environment | File | NODE_ENV | Usage | Secrets |
|---|---|---|---|---|
| Local | `.env.local` | `development` | Local machine | Plaintext OK |
| Staging | `.env.staging` | `staging` | Pre-prod testing | Vault/Encrypted |
| Production | `.env.production` | `production` | Live environment | Vault Only |

This setup provides:
- ✅ Clear separation of concerns
- ✅ Industry-standard naming
- ✅ Secure secrets management
- ✅ Easy environment switching
- ✅ Consistent across all apps/packages
