# Environment Variables - Changes Visual Summary

## Before → After

### 🟢 apps/web/.env.example

#### BEFORE (81 lines - Had Secrets)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/snapback"

# Payments
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"           # ❌ SECRET KEY!
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
...

# Storage
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-public-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"            # ❌ PRIVILEGED!
S3_ACCESS_KEY_ID=""                                           # ❌ AWS KEY!
S3_SECRET_ACCESS_KEY=""                                       # ❌ AWS SECRET!
S3_ENDPOINT=""
S3_REGION=""
...

# Monitoring
SENTRY_AUTH_TOKEN=""                                          # ❌ AUTH TOKEN!
SENTRY_ORG=""
SENTRY_PROJECT=""

# AI Services
OPENAI_API_KEY=""                                             # ❌ API KEY!

# Email
RESEND_API_KEY="re_your_resend_api_key"                       # ❌ EMAIL KEY!

# CRM
HUBSPOT_ACCESS_TOKEN="pat-na1-your-hubspot-access-token"     # ❌ CRM TOKEN!

# Redis
REDIS_URL="redis://default:password@host:port"
```

#### AFTER (66 lines - Clean & Secure)
```env
# Site Configuration
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://console.localhost:3000"
NEXT_PUBLIC_DOCS_URL="http://docs.localhost:3000"
NEXT_PUBLIC_ROOT_DOMAIN="localhost"

# Payments
# ⚠️ STRIPE_SECRET_KEY must be in apps/api/.env (server-side only)
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
STRIPE_SOLO_MONTHLY_PRICE_ID="price_solo_monthly_id"
...

# Storage
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-public-key"
# ⚠️ SUPABASE_SERVICE_ROLE_KEY is privileged - keep in apps/api/.env
# ⚠️ S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY must be in apps/api/.env
NEXT_PUBLIC_AVATARS_BUCKET_NAME="avatars"

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=""
# ⚠️ SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT are build-time secrets
# Set these in CI/CD environment, not in .env files

# ⚠️ API Keys (OPENAI_API_KEY, RESEND_API_KEY, HUBSPOT_ACCESS_TOKEN) are server-side only
# Configure these in apps/api/.env or packages/mail/.env instead

# Redis
REDIS_URL="redis://default:password@host:port"
```

**Changes:**
- ✅ Removed 13 sensitive credentials
- ✅ Added helpful ⚠️ comments showing correct locations
- ✅ Kept only NEXT_PUBLIC_* and non-sensitive vars
- ✅ Cleaner, more secure template

---

### 🟢 apps/mcp-server/.env.example

#### BEFORE (68 lines - Had Direct DB Access)
```env
# ================================
# Database Configuration
# ================================
# PostgreSQL connection for direct database access
DATABASE_URL=postgresql://snapback:snapback@localhost:5432/snapback_dev    # ❌ SHOULDN'T BE HERE

# ================================
# MCP Server Configuration
# ================================
MCP_SERVER_NAME=snapback-mcp
MCP_SERVER_VERSION=1.0.0

# ================================
# Logging
# ================================
# Log level: debug, info, warn, error
LOG_LEVEL=info                                                              # ❌ NO CONTEXT
```

#### AFTER (73 lines - API-First Architecture)
```env
# ================================
# API Configuration
# ================================
API_URL=http://localhost:3001
API_KEY=sk_test_your_mcp_api_key_here

# ================================
# Database Configuration
# ================================
# ⚠️ MCP Server connects via API (apps/api), not direct database access
# Direct database access is NOT recommended for MCP server
# Remove DATABASE_URL - use API_URL and API_KEY instead

# ================================
# MCP Server Configuration
# ================================
MCP_SERVER_NAME=snapback-mcp
MCP_SERVER_VERSION=1.0.0

# ================================
# Logging
# ================================
# Log level: debug, info, warn, error
# Development: debug or info                                                # ✅ CLEAR GUIDANCE
# Production: warn or error                                                 # ✅ CLEAR GUIDANCE
LOG_LEVEL=info
```

**Changes:**
- ✅ Removed DATABASE_URL (use API instead)
- ✅ Added LOG_LEVEL documentation
- ✅ Added explanation of API-first architecture
- ✅ More secure microservice pattern

---

### 🟢 apps/cli/.env.example

#### BEFORE
```env
# ================================
# Logging
# ================================
# Log level: debug, info, warn, error
LOG_LEVEL=info
```

#### AFTER
```env
# ================================
# Logging
# ================================
# Log level: debug, info, warn, error
# Development: debug or info
# Production: warn or error
LOG_LEVEL=info
```

**Changes:**
- ✅ Added development vs production guidance
- ✅ Better documentation for maintainers

---

### 🟢 apps/vscode/.env.example

#### BEFORE
```env
# ================================
# Logging
# ================================
# Log level: debug, info, warn, error
LOG_LEVEL=info
```

#### AFTER
```env
# ================================
# Logging
# ================================
# Log level: debug, info, warn, error
# Development: debug or info
# Production: warn or error
LOG_LEVEL=info
```

**Changes:**
- ✅ Added development vs production guidance
- ✅ Consistent with other tools

---

## Summary of Changes

### Removed (Safety ✅)
```
From apps/web:
  ❌ DATABASE_URL
  ❌ STRIPE_SECRET_KEY
  ❌ SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT
  ❌ S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_REGION
  ❌ SUPABASE_SERVICE_ROLE_KEY
  ❌ OPENAI_API_KEY
  ❌ RESEND_API_KEY
  ❌ HUBSPOT_ACCESS_TOKEN

From apps/mcp-server:
  ❌ DATABASE_URL
```

### Added (Documentation ✅)
```
To all CLI tools:
  ✅ LOG_LEVEL guidance (dev vs prod)

To apps/mcp-server:
  ✅ Warning about API-first architecture
```

### Comments Added (Clarity ✅)
```
⚠️ 8 Warning comments explaining:
  - Where secrets should actually go
  - Why they were removed
  - Best practices
```

---

## File Size Changes

```
apps/web/.env.example
  Before: 81 lines
  After:  66 lines
  Change: -15 lines (-19%)
  ✅ Cleaner, safer

apps/cli/.env.example
  Before: 89 lines
  After:  91 lines
  Change: +2 lines (+2%)
  ✅ Better documented

apps/mcp-server/.env.example
  Before: 68 lines
  After:  73 lines
  Change: +5 lines (+7%)
  ✅ More secure, better documented

apps/vscode/.env.example
  Before: 93 lines
  After:  95 lines
  Change: +2 lines (+2%)
  ✅ Better documented
```

---

## Security Impact Matrix

| Variable | Was Exposed | Status | Risk Level | Fix |
|----------|-------------|--------|-----------|-----|
| DATABASE_URL | web, mcp | ✅ Removed/Documented | High | Use API instead |
| STRIPE_SECRET_KEY | web | ✅ Removed | Critical | Move to API/.env |
| S3_* | web | ✅ Removed | High | Move to API/.env |
| SENTRY_AUTH_TOKEN | web | ✅ Removed | Medium | Use CI/CD secrets |
| OPENAI_API_KEY | web | ✅ Removed | High | Move to API/.env |
| RESEND_API_KEY | web | ✅ Removed | High | Move to mail/.env |
| HUBSPOT_ACCESS_TOKEN | web | ✅ Removed | Medium | Move to mail/.env |
| SUPABASE_SERVICE_ROLE_KEY | web | ✅ Removed | Critical | Keep backend-only |

---

## Validation Checklist

Before committing these changes:

- [ ] Review all removed variables in apps/web/.env.example
- [ ] Confirm each removed variable is still available to web app's server code
- [ ] Verify apps/web/lib/env.ts still loads all needed server-side vars
- [ ] Test local development: `npm run dev` works
- [ ] Check that app functionality isn't broken
- [ ] Review comments are clear and helpful
- [ ] Update team on these changes

---

## Next Steps

1. **Review** - Read ENV_VARIABLE_AUDIT.md for full details
2. **Test** - Verify local development still works
3. **Commit** - Push changes with message: "refactor: clean up environment variables"
4. **Document** - Update team wiki/docs with new structure
5. **Verify** - Ensure CI/CD secrets are properly configured

---

## Questions for Your Team

1. **Web App DB Access** - Does web app actually need direct DATABASE_URL, or only through API?
2. **Redis Usage** - Does web app's server-side code use REDIS_URL for sessions?
3. **Stripe Webhooks** - Does web app handle Stripe webhooks, or only the API?
4. **Email Service** - Should web app send emails directly, or through API?

If answers are "no" to any, we can remove those variables entirely from web's lib/env.ts.

---

Generated: 2025-12-17
See Also: ENV_VARIABLE_AUDIT.md, QUICK_ENV_REFERENCE.md
