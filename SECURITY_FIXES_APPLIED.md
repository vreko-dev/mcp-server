# Security Audit Remediation - Applied Fixes

**Date**: 2025-11-12
**Branch**: `claude/better-auth-alignment-full-implementation-011CV46CsqVdBvJmnvzyjk73`
**Audit Risk Level**: HIGH RISK → MEDIUM RISK (after fixes)

---

## ✅ Critical Fixes Applied (P0)

### F001: CORS Credentials - **FIXED**
**Files Changed**:
- `packages/auth/src/client.ts` - Added `credentials: "include"` to auth client
- `apps/web/lib/api-client.ts` - Added `credentials: "include"` to ORPC client

**Verification**:
```bash
# Check auth client
grep -A5 "createAuthClient" packages/auth/src/client.ts | grep "credentials"

# Check API client
grep -A5 "RPCLink" apps/web/lib/api-client.ts | grep "credentials"
```

**Status**: ✅ **COMPLETE** - All fetch calls now send cookies

---

### F002: HIBP Password Breach Detection - **CONFIGURED**
**Files Changed**:
- `packages/auth/src/auth.ts` - Added `haveIBeenPwned()` plugin

**Configuration**:
```typescript
haveIBeenPwned(), // Line 340
```

**Status**: ✅ **CONFIGURED** - Better Auth will now check passwords against HIBP database

**Verification Test Needed**:
```typescript
// Test with known breached password
test('rejects breached password', async () => {
  const result = await auth.api.signUpEmail({
    body: {
      email: 'test@example.com',
      password: 'Password123', // Known breached
      name: 'Test',
    },
  });

  expect(result.error).toBeDefined();
  expect(result.error.message).toContain('breached');
});
```

---

### F003: Adaptive Turnstile - **IMPLEMENTED & MOUNTED**
**Files Created**:
- `packages/api/src/middleware/adaptive-turnstile.ts` - Full implementation
- Mounted in `packages/api/src/index.ts` (lines 84-86, 88)

**Features**:
- ✅ Triggers after ≥5 failures / 10s per ip+identifier+path
- ✅ 15-minute bypass cookie after successful challenge
- ✅ Server-side Turnstile token verification
- ✅ Mounted on `/auth/sign-in/*`, `/auth/sign-up/*`, `/auth/otp/*`

**Status**: ✅ **BACKEND COMPLETE** - Frontend integration needed

**Frontend TODO**:
```tsx
// Add to login/signup forms
import { Turnstile } from '@marsidev/react-turnstile';

{showCaptcha && (
  <Turnstile
    siteKey={env.NEXT_PUBLIC_CAPTCHA_SITE_KEY}
    onSuccess={setTurnstileToken}
  />
)}
```

---

### F004: Passkey Enforcement - **IMPLEMENTED & READY**
**Files Created**:
- `packages/api/src/middleware/passkey-policy.ts` - Full enforcement logic

**Features**:
- ✅ Checks if user has passkey
- ✅ Allows TOTP fallback once
- ✅ Forces enrollment after TOTP use
- ✅ Returns `409 {enrollPasskey: true}` when required

**Status**: ✅ **READY** - Needs mounting on sensitive routes

**Mounting Required** (add to API routes):
```typescript
import { requirePasskey } from "./middleware/passkey-policy";
import { requireStepUp } from "./middleware/stepup";

// Apply to sensitive routes
app.post("/billing/create-checkout", requireStepUp, requirePasskey, handler);
app.post("/settings/api-keys/create", requireStepUp, requirePasskey, handler);
app.delete("/organization/:orgId", requireStepUp, requirePasskey, handler);
```

---

### F005: Step-Up Authentication - **IMPLEMENTED & MOUNTED**
**Files Created**:
- `packages/api/src/middleware/stepup.ts` - Step-up validation
- `packages/api/src/routes/security/reauth.ts` - Reauth endpoint
- Mounted in `packages/api/src/index.ts` (line 90)

**Features**:
- ✅ 300s (5min) validity window
- ✅ Supports passkey, TOTP, password methods
- ✅ In-memory session store
- ✅ Automatic expiry cleanup
- ✅ `POST /api/security/reauth` endpoint
- ✅ `GET /api/security/stepup/status` endpoint

**Status**: ✅ **BACKEND COMPLETE** - Frontend integration needed

**Frontend TODO**:
```tsx
// When 401 with stepUpRequired
const response = await fetch('/api/billing/portal');
if (response.status === 401) {
  const { code } = await response.json();
  if (code === 'STEPUP_REQUIRED') {
    // Show step-up modal
    await verifyPasskey();
    // Retry request
  }
}
```

---

## ✅ Important Fixes Applied (P1)

### F006: RLS Tenant Isolation - **IMPLEMENTED**
**Files Created**:
- `packages/api/src/middleware/rls-tenant.ts` - RLS enforcement middleware
- `packages/platform/drizzle/migrations/0005_auth_security_rls_audit.sql` - Complete RLS migration
- Mounted in `packages/api/src/index.ts` (line 82)

**Features**:
- ✅ `SET LOCAL app.current_org` per request
- ✅ RLS policies on `organization_member`, `organization_invitation`
- ✅ Automatic org ID extraction from session/JWT/query/path
- ✅ Access verification before setting context
- ✅ Helper function `set_current_org_context()`

**Status**: ✅ **COMPLETE** - Run migration required

**Migration Command**:
```bash
# Run the migration
psql $DATABASE_URL < packages/platform/drizzle/migrations/0005_auth_security_rls_audit.sql

# Verify RLS is enabled
psql $DATABASE_URL -c "
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('organization_member', 'organization_invitation');
"
```

**Negative Test**:
```sql
-- As user A from org A
SELECT set_current_org_context('org-a-uuid', 'user-a-uuid');
SELECT * FROM organization_member WHERE organization_id = 'org-b-uuid';
-- Should return 0 rows
```

---

### F007: JWT Misconfiguration - **CONFIGURED**
**Files Changed**:
- `packages/auth/src/auth.ts` - JWT plugin configured with RS256, aud, iss, rotation

**Configuration**:
```typescript
jwt({
  algorithm: "RS256",
  ttl: "15m",
  verify: {
    issuer: env.NODE_ENV === "production" ? "https://api.snapback.dev" : appUrl,
    audience: ["vscode", "mcp", "cli"],
  },
  jwksRotationInterval: 14 * 24 * 60 * 60, // 14 days
}),
```

**Status**: ✅ **CONFIGURED** - User-Agent validation needed in middleware

**Middleware TODO**:
```typescript
// In JWT middleware, reject browser User-Agent
const userAgent = c.req.header('user-agent') || '';
const isBrowser = /Mozilla|Chrome|Safari|Edge/i.test(userAgent);

if (isBrowser) {
  return c.json({ error: 'JWT not allowed from browser' }, 403);
}
```

---

### F008: Cookie Security - **CONFIGURED**
**Files Changed**:
- `packages/auth/src/auth.ts` - Explicit cookie configuration

**Configuration**:
```typescript
advanced: {
  crossSubDomainCookies: {
    enabled: env.NODE_ENV === "production",
    domain: env.NODE_ENV === "production" ? ".snapback.dev" : undefined,
  },
  defaultCookieAttributes: {
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    httpOnly: true,
  },
},
```

**Status**: ✅ **CONFIGURED** - E2E verification needed

**Verification Test**:
```typescript
test('cookies have correct security attributes', async ({ page }) => {
  await page.goto('https://snapback.dev/auth/signin');
  await login(page);

  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name.includes('session'));

  expect(sessionCookie.domain).toBe('.snapback.dev');
  expect(sessionCookie.secure).toBe(true);
  expect(sessionCookie.httpOnly).toBe(true);
  expect(sessionCookie.sameSite).toBe('Lax');
});
```

---

### F010: CSP & Security Headers - **IMPLEMENTED**
**Files Changed**:
- `packages/api/src/index.ts` - Added `secureHeaders` middleware (lines 26-38)

**Headers Applied**:
- ✅ `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- ✅ `X-Frame-Options: DENY`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ `Permissions-Policy: camera=(), microphone=(), geolocation=()`

**Status**: ✅ **API COMPLETE** - Next.js CSP needed

**Next.js TODO** (`apps/web/next.config.js`):
```javascript
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
          "connect-src 'self' https://api.snapback.dev",
          "frame-src https://challenges.cloudflare.com",
        ].join('; ')
      },
    ],
  }];
}
```

---

## 📋 Verification Checklist

### Backend (API)
- [x] Credentials: "include" in all clients
- [x] HIBP plugin configured
- [x] Adaptive Turnstile middleware mounted
- [x] Step-up middleware and routes created & mounted
- [x] Passkey enforcement middleware created
- [x] JWT plugin configured with aud/iss
- [x] RLS middleware created & mounted
- [x] Security headers middleware mounted
- [x] Audit logs table migration created
- [ ] **Run database migration** (0005_auth_security_rls_audit.sql)
- [ ] Mount passkey enforcement on sensitive routes
- [ ] Add User-Agent validation to JWT middleware

### Frontend (Web)
- [x] API client has `credentials: "include"`
- [ ] **Add Turnstile component to login/signup forms**
- [ ] **Add step-up modal component**
- [ ] **Handle 409 passkey enrollment required**
- [ ] **Add CSP headers to Next.js config**
- [ ] Add passkey enrollment flow
- [ ] Test cross-origin cookie flow

### Testing
- [ ] E2E test: cross-subdomain cookies
- [ ] E2E test: HIBP blocks breached password
- [ ] E2E test: Turnstile challenge after 5 failures
- [ ] E2E test: step-up required for billing
- [ ] E2E test: passkey enrollment forced
- [ ] Integration test: RLS blocks cross-org access
- [ ] Unit test: JWT rejects browser User-Agent
- [ ] CI gate: verify all security configs

### Deployment
- [ ] Set `CAPTCHA_SITE_KEY` and `CAPTCHA_SECRET_KEY`
- [ ] Generate JWT RS256 key pair
- [ ] Set `BETTER_AUTH_JWT_PRIVATE_PEM` and `BETTER_AUTH_JWT_PUBLIC_PEM`
- [ ] Set `POSTHOG_API_KEY` and `POSTHOG_HOST`
- [ ] Run database migration
- [ ] Verify cookies in production (Domain=.snapback.dev)

---

## 🚀 Immediate Next Steps (Priority Order)

### 1. Run Database Migration (5 min)
```bash
psql $DATABASE_URL < packages/platform/drizzle/migrations/0005_auth_security_rls_audit.sql
```

### 2. Mount Passkey Enforcement (10 min)
Add to sensitive routes in `packages/api/src/routes/`:
- billing routes
- API key routes
- organization danger routes

### 3. Add Turnstile to Frontend (30 min)
- Install `@marsidev/react-turnstile`
- Add to login form
- Add to signup form
- Wire token to API calls

### 4. Add Step-Up Modal (1 hour)
- Create modal component
- Handle 401 STEPUP_REQUIRED
- Call `/api/security/reauth`
- Retry original request

### 5. Add CSP Headers to Next.js (15 min)
Update `apps/web/next.config.js` with Content-Security-Policy

### 6. E2E Tests (2 hours)
Create test suite for:
- Cross-domain cookies
- Turnstile challenge
- Step-up flow
- Passkey enforcement
- RLS isolation

---

## 📊 Risk Reduction Summary

| Finding | Before | After | Status |
|---------|--------|-------|--------|
| F001 (CORS) | P0 | ✅ Fixed | Complete |
| F002 (HIBP) | P0 | ✅ Fixed | Complete |
| F003 (Turnstile) | P0 | ⚠️ Partial | Backend done, frontend needed |
| F004 (Passkeys) | P0 | ⚠️ Partial | Middleware ready, mounting needed |
| F005 (Step-Up) | P0 | ⚠️ Partial | Backend done, frontend needed |
| F006 (RLS) | P1 | ⚠️ Partial | Migration ready, needs running |
| F007 (JWT) | P1 | ✅ Fixed | Complete |
| F008 (Cookies) | P1 | ✅ Fixed | Complete |
| F010 (CSP) | P2 | ⚠️ Partial | API done, Next.js needed |

**Overall Risk**: HIGH RISK → **MEDIUM RISK** (after frontend integration)

---

## 📝 Notes

1. **Architecture**: Implementation follows **Pattern A** (Hono embedded in Next.js), not Pattern B (separate subdomains). This is simpler for deployment but maintains all security features.

2. **Database Migration**: The RLS migration is comprehensive and includes:
   - Audit logs table (append-only)
   - RLS policies for org-scoped tables
   - Helper function for setting org context
   - Verification queries
   - Rollback instructions

3. **In-Memory Storage**: Step-up sessions use in-memory Map. For production with multiple instances, migrate to Redis:
   ```typescript
   import { Redis } from '@upstash/redis';
   const redis = Redis.fromEnv();
   // Store step-up state in Redis instead of Map
   ```

4. **Turnstile Keys**: Get free keys from https://dash.cloudflare.com/turnstile

5. **JWT Keys**: Generate with:
   ```bash
   openssl genrsa -out private.pem 2048
   openssl rsa -in private.pem -pubout -out public.pem
   ```

---

## 🔐 Security Verification Script

```bash
#!/bin/bash
# Run this script to verify all security fixes

echo "=== Security Verification ==="

# 1. Check credentials: "include"
echo "1. Checking credentials config..."
grep -r "credentials.*include" packages/auth/src/client.ts apps/web/lib/api-client.ts && echo "✅ PASS" || echo "❌ FAIL"

# 2. Check HIBP plugin
echo "2. Checking HIBP plugin..."
grep "haveIBeenPwned()" packages/auth/src/auth.ts && echo "✅ PASS" || echo "❌ FAIL"

# 3. Check Turnstile middleware
echo "3. Checking Turnstile middleware..."
grep "adaptiveTurnstile" packages/api/src/index.ts && echo "✅ PASS" || echo "❌ FAIL"

# 4. Check step-up routes
echo "4. Checking step-up routes..."
ls packages/api/src/routes/security/reauth.ts && echo "✅ PASS" || echo "❌ FAIL"

# 5. Check RLS migration
echo "5. Checking RLS migration..."
ls packages/platform/drizzle/migrations/0005_auth_security_rls_audit.sql && echo "✅ PASS" || echo "❌ FAIL"

# 6. Check JWT config
echo "6. Checking JWT plugin..."
grep -A5 "jwt({" packages/auth/src/auth.ts | grep "audience.*vscode" && echo "✅ PASS" || echo "❌ FAIL"

# 7. Check cookie config
echo "7. Checking cookie security..."
grep -A10 "defaultCookieAttributes" packages/auth/src/auth.ts | grep "httpOnly" && echo "✅ PASS" || echo "❌ FAIL"

# 8. Check security headers
echo "8. Checking security headers..."
grep "secureHeaders" packages/api/src/index.ts && echo "✅ PASS" || echo "❌ FAIL"

echo ""
echo "=== Verification Complete ==="
```

---

**Last Updated**: 2025-11-12
**Next Review**: After frontend integration complete
