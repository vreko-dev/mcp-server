# OAuth & Multi-Service Authentication Architecture Decision

**Applies to:** `packages/auth/**/*.ts`, `packages/config/**/*.ts`, `apps/api/**/*.ts`, `apps/web/**/*.ts`, `docker-compose.yml`, `.env*`
**Authority:** Authentication architecture standard
**Enforcement:** Required for production OAuth support

---

## 1. OAuth Callback URL Routing Problem

### The Core Issue

OAuth providers (Google, GitHub, etc.) redirect back to your application using the **callback URL configured in their console**. This callback must be:
1. **Publicly accessible** from the user's browser
2. **Exactly matching** what you configured in the OAuth provider's settings
3. **Pointing to a valid HTTPS endpoint** in production

**In Docker with multiple services:**
- ❌ **WRONG:** Callback URL = `http://api:3001/api/auth/callback/google`
  - "api" is a Docker internal service name
  - Browser can't resolve `api` - doesn't exist on the internet
  - Google can't redirect to internal Docker hostname

- ✅ **CORRECT:** Callback URL = `http://localhost:3000/api/auth/callback/google`
  - Browser can access localhost:3000
  - Matches what you told Google during OAuth setup

### Current Code Problem

**File:** `packages/config/src/utils/base-url.ts`
```typescript
export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return `http://localhost:${process.env.PORT ?? 3000}`;  // ❌ Falls back to localhost!
}
```

**File:** `packages/auth/src/auth.ts` (lines 30, 86-88)
```typescript
const appUrl = env.APP_URL || getBaseUrl();

// OAuth configuration
socialProviders: {
  google: {
    clientId: env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
    // Implicit: callback URLs are derived from appUrl
  },
}
```

**What happens in Docker:**
```
Docker Container runs API service at "http://api:3001"
  ↓
getBaseUrl() runs with process.env.PORT=3001 (if API)
  ↓
Returns "http://localhost:3001" (fallback)
  ↓
better-auth sets callback = "http://localhost:3001/api/auth/callback/google"
  ↓
Google tries to redirect browser to "http://localhost:3001"
  ↓
❌ Browser on host machine can't reach container-internal URL
```

---

## 2. Architecture Decision: Auth Authority Location

You must choose ONE service as the canonical auth authority:

### Option A: API-First (Recommended for SnapBack) ✅

**Decision:** API service (`@snapback/api-service`) is the sole OAuth authority

```
Browser
  ↓ (OAuth callback)
  → http://localhost:3000/api/auth/callback/google
  ↓
Web service redirects to: /api/auth/callback/google
  ↓
Web → proxies to API: http://api:3001/api/auth/callback/google
  ↓
API handles OAuth with database
  ↓
API returns session cookie (domain: localhost)
  ↓
Browser stores cookie, authenticated to web + api
```

**Implementation:**
```typescript
// packages/auth/src/auth.ts - runs in API only
const appUrl = env.NEXT_PUBLIC_SITE_URL;  // http://localhost:3000

export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // better-auth auto-generates callback = appUrl + "/api/auth/callback/google"
      // Result: http://localhost:3000/api/auth/callback/google ✅
    }
  }
});
```

**Docker Compose:**
```yaml
services:
  api:
    environment:
      NEXT_PUBLIC_SITE_URL: http://localhost:3000  # OAuth callbacks here
      BETTER_AUTH_URL: http://api:3001  # For internal service calls

  web:
    environment:
      NEXT_PUBLIC_SITE_URL: http://localhost:3000  # Forward to API
      NEXT_PUBLIC_API_URL: http://api:3001  # Internal
      # Web doesn't run better-auth at all
```

**Issue with current code:** Both API AND web instantiate `better-auth()`
```typescript
// Current in both places - WRONG!
import { auth } from "@snapback/auth";
```

**Fix:** Only import in API, web proxies to API

---

### Option B: Web-First (Not Recommended for SnapBack) ❌

**Decision:** Web service handles OAuth, API is stateless

```
Browser
  ↓ (OAuth callback)
  → http://localhost:3000/api/auth/callback/google
  ↓
Web service handles OAuth
  ↓
Web issues session cookie
  ↓
Web proxies API calls with session header
```

**Why NOT for SnapBack:**
1. Web runs Next.js (cannot directly manage database connections reliably in serverless)
2. SnapBack needs persistent database state (snapshots, checkpoints)
3. API already exists with Drizzle ORM
4. Creates auth state duplication

---

### Option C: Federated (Not Recommended - Complexity) ❌

Multiple auth services - don't do this for SnapBack

---

## 3. Correct Multi-Service Setup

### Environment Variables

**`.env.docker` (Docker production):**
```bash
# The PUBLIC URL - what OAuth providers redirect to
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# The INTERNAL service URL - for service-to-service communication
BETTER_AUTH_URL=http://api:3001

# Also set for web to know where API is
NEXT_PUBLIC_API_URL=http://api:3001
```

**Why two URLs?**
```
NEXT_PUBLIC_SITE_URL (public-facing):
  - Used by getBaseUrl() in browser context
  - Passed to OAuth providers
  - Must be accessible from outside Docker
  - Example: http://localhost:3000 or https://snapback.dev

BETTER_AUTH_URL (internal service):
  - Used by API for validating sessions
  - Used by other services to call auth endpoints
  - Uses Docker service name (http://api:3001)
  - Never exposed to browser
```

### Google OAuth Configuration

**In Google Cloud Console:**

1. Go to: Credentials → OAuth 2.0 Client IDs → Your Web Application
2. Add Authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
3. Download credentials → Set in `.env.docker`:
   ```bash
   GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
   ```

**Critical:** The redirect URI MUST EXACTLY match what you configured, including protocol and port

### Docker Compose Integration

```yaml
version: '3.8'
services:
  postgres:
    # ... database config

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      NODE_ENV: production
      PORT: 3001

      # OAuth configuration
      NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL}  # http://localhost:3000
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}

      # Database
      DATABASE_URL: postgresql://snapback:${POSTGRES_PASSWORD}@postgres:5432/snapback

    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: Dockerfile  # Next.js app
    environment:
      NODE_ENV: production
      PORT: 3000

      # OAuth configuration (same for consistency)
      NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL}  # http://localhost:3000

      # API location (internal)
      NEXT_PUBLIC_API_URL: http://api:3001

    ports:
      - "3000:3000"
    depends_on:
      api:
        condition: service_healthy
```

**Startup Command:**
```bash
docker-compose --env-file .env.docker up
```

---

## 4. Environment Validation Pattern

### Current Problem

**File:** `packages/config/src/env.ts` (lines 92-111)

```typescript
// Validation DISABLED for development
const envParseResult = isBrowser
  ? { success: true as const, data: process.env as any }
  : { success: true as const, data: process.env as any };  // No validation!

// Commented out:
// if (!envParseResult.success) {
//   console.error("❌ Invalid environment variables:");
//   throw new Error("Invalid environment variables");
// }
```

**Impact:** Missing `GOOGLE_CLIENT_ID` fails silently - OAuth appears to work until user tries to log in

### Fix: Proper Validation

```typescript
// packages/config/src/env.ts

const envParseResult = isBrowser
  ? { success: true as const, data: process.env as any }
  : envSchema.safeParse(process.env);

if (!envParseResult.success) {
  const errors = envParseResult.error.flatten().fieldErrors;
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(errors, null, 2));

  if (process.env.NODE_ENV === "production") {
    throw new Error(`Invalid environment variables: ${JSON.stringify(errors)}`);
  }

  console.warn("⚠️ Continuing in development mode with warnings");
}

export const env = envParseResult.data;
```

---

## 5. Better-Auth Configuration for Multi-Service

### Pattern: trustedOrigins for CORS

**Current (in `packages/auth/src/auth.ts` lines 34-41):**
```typescript
const isDevelopment = env.NODE_ENV !== "production";
const trustedOrigins = isDevelopment
  ? [
      appUrl,
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",  // MCP server
    ]
  : [appUrl];
```

**Issue:** Hardcoded localhost ports - breaks in Docker with different port mapping

**Fix:** Derive from environment variables

```typescript
const trustedOrigins = [
  env.NEXT_PUBLIC_SITE_URL,  // http://localhost:3000
  // In docker-compose, internal service URLs can be added if needed
  ...(env.NODE_ENV !== "production" ? [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
  ] : [])
];
```

Or cleaner - just use the configured URL:

```typescript
const trustedOrigins = [env.NEXT_PUBLIC_SITE_URL];
```

---

## 6. Debugging OAuth Failures

### Checklist

- [ ] **Does `.env.docker` exist?**
  ```bash
  test -f .env.docker && echo "✅ Exists" || echo "❌ Missing"
  ```

- [ ] **Are OAuth credentials set?**
  ```bash
  grep "GOOGLE_CLIENT_ID" .env.docker | grep -v "^#"
  grep "GOOGLE_CLIENT_SECRET" .env.docker | grep -v "^#"
  ```

- [ ] **Is `NEXT_PUBLIC_SITE_URL` set correctly?**
  ```bash
  grep "NEXT_PUBLIC_SITE_URL" .env.docker
  # Should show: http://localhost:3000 (or your public domain)
  # NOT: http://api:3001 (internal Docker service name)
  ```

- [ ] **Does the callback URI match Google OAuth configuration?**
  ```
  Configured in Google: http://localhost:3000/api/auth/callback/google
  Environment says: NEXT_PUBLIC_SITE_URL=http://localhost:3000
  Implies callback: http://localhost:3000/api/auth/callback/google ✅
  ```

- [ ] **Can you reach the API health check?**
  ```bash
  curl http://localhost:3001/api/health
  # Should return 200 with health status
  ```

- [ ] **Are database tables created?**
  ```bash
  docker exec snapback-postgres psql -U snapback -d snapback -c "\dt"
  # Should show user, session, account, etc. tables
  ```

- [ ] **Does better-auth initialization work?**
  ```bash
  docker logs snapback-api | grep -i "auth\|oauth\|error"
  # Check for initialization messages or errors
  ```

### Common Error Messages & Fixes

**Error:** `OAuth callback failed`
- **Cause:** Redirect URI mismatch
- **Fix:** Ensure `NEXT_PUBLIC_SITE_URL` matches Google OAuth configuration

**Error:** `Session table doesn't exist`
- **Cause:** Database migrations didn't run
- **Fix:** Run `pnpm --filter @snapback/platform run db:push`

**Error:** `GOOGLE_CLIENT_ID is empty string`
- **Cause:** Environment variable not loaded or validation disabled
- **Fix:** Ensure `.env.docker` has credentials, enable validation in env.ts

**Error:** `Connection refused to http://api:3001`
- **Cause:** API service not running or health check failing
- **Fix:** Check `docker logs snapback-api` for startup errors

---

## Implementation Checklist

### Immediate (Blocking OAuth)

- [ ] Create `.env.docker` with all required variables
- [ ] Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- [ ] Set `BETTER_AUTH_URL=http://api:3001`
- [ ] Add Google OAuth credentials to `.env.docker`
- [ ] Configure redirect URI in Google Cloud Console
- [ ] Run database migrations in API Dockerfile/entrypoint
- [ ] Enable environment variable validation in `packages/config/src/env.ts`

### High Priority (Structural)

- [ ] Choose API-first architecture (recommended)
- [ ] Remove `better-auth` instantiation from web app
- [ ] Create entrypoint script for API to run migrations
- [ ] Update docker-compose.yml to load `.env.docker`
- [ ] Add migration dependency to docker-compose

### Medium Priority (Robustness)

- [ ] Add OAuth error logging in better-auth onAPIError handler
- [ ] Create health check endpoint that verifies database
- [ ] Add environment variable validation warnings in logs
- [ ] Document OAuth setup in deployment guide

---

## References

- **Auth Package:** `packages/auth/src/auth.ts`
- **Config Package:** `packages/config/src/env.ts`, `utils/base-url.ts`
- **Better Auth Docs:** https://www.better-auth.com/docs
- **Google OAuth Setup:** https://developers.google.com/identity/protocols/oauth2/web-server
- **Docker Compose Env:** https://docs.docker.com/compose/env-file/

**Last Updated:** 2025-11-19
**Created to prevent:** OAuth failures, silent credential issues, service routing problems, callback URL mismatches
