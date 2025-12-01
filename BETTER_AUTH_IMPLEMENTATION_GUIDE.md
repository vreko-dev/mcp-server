# SnapBack Better Auth Implementation Guide (Pattern B - Full Alignment)

**Status**: ✅ Implementation Complete
**Date**: 2025-11-12
**Branch**: `claude/better-auth-alignment-full-implementation-011CV46CsqVdBvJmnvzyjk73`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Details](#implementation-details)
4. [Environment Variables](#environment-variables)
5. [Migration Guide](#migration-guide)
6. [Testing](#testing)
7. [Rollback Procedures](#rollback-procedures)
8. [Security Considerations](#security-considerations)

---

## Overview

This implementation migrates SnapBack auth to **Better Auth** hosted on **Hono** at `https://api.snapback.dev` with:

### ✅ Implemented Features

1. **Cross-Subdomain Cookies** - Sessions work across `snapback.dev` and `app.snapback.dev`
2. **All Better Auth Plugins** - username, admin, passkey, 2FA, magic link, email OTP, HIBP, last login, Turnstile, organization, openAPI, oAuthProxy, JWT, API keys, MCP
3. **Passkeys Required for All Roles** - Ultra-sensitive actions require passkey or TOTP (once), then forced enrollment
4. **Step-Up Authentication** - 300s (5 min) window for sensitive operations (billing, API keys, org changes)
5. **Adaptive Turnstile** - Progressive challenge only after ≥5 failures / 10s per ip+identifier+path
6. **JWT for Tools Only** - VSCode/CLI/MCP use 15min RS256 JWT with JWKS; web uses session cookies
7. **API Keys with Argon2id** - Upgraded from bcrypt; reveal-once, scopes, last-used, TTL
8. **RLS Tenant Isolation** - `SET LOCAL app.current_org` for automatic multi-tenancy
9. **PostHog + Audit** - All auth events tracked in PostHog and append-only audit_logs table
10. **CORS for Credentials** - `credentials: "include"` in web client, CORS allows credentials

---

## Architecture

### Component Diagram

```
┌──────────────────────────────────────────────────────────┐
│         Frontend (snapback.dev / app.snapback.dev)       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Next.js App                                       │  │
│  │  • fetch(..., { credentials: "include" })         │  │
│  │  • Session cookies auto-sent                       │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│         API (api.snapback.dev) - Hono Server             │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Better Auth Mount: /api/auth/*                    │  │
│  │  • All plugins enabled                             │  │
│  │  • Cross-subdomain cookies: .snapback.dev          │  │
│  │  • SameSite=Lax, Secure, HttpOnly                  │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Custom Middleware Stack                           │  │
│  │  • requireStepUp (sensitive routes)                │  │
│  │  • requirePasskey (ultra-sensitive routes)         │  │
│  │  • adaptiveTurnstile (auth endpoints)              │  │
│  │  • requireToolJWT (tool endpoints)                 │  │
│  │  • enforceRLS (org-scoped routes)                  │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Custom Routes                                     │  │
│  │  • POST /security/reauth (step-up verify)          │  │
│  │  • GET /security/stepup/status                     │  │
│  │  • POST /challenge/verify (Turnstile)              │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│         Data Layer (Postgres + Drizzle)                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  RLS Policies                                      │  │
│  │  • snapshots, sessions, policies                   │  │
│  │  • WHERE org_id = current_setting('app.current_org')│  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Audit Logs (append-only)                          │  │
│  │  • All auth events                                 │  │
│  │  • Indexed by user_id, org_id, event_type         │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│         External Services                                │
│  • PostHog (analytics)                                   │
│  • Turnstile (Cloudflare captcha)                        │
│  • Resend/SendGrid (email)                               │
│  • Stripe (billing)                                      │
└──────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Cross-Subdomain Cookies

**File**: `packages/auth/src/auth.ts`

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
}
```

**Cookies Set**:
- `better-auth.session_token` with `Domain=.snapback.dev`
- Works across `snapback.dev` and `app.snapback.dev`

### 2. All Better Auth Plugins

**Plugins Added** (packages/auth/src/auth.ts):
- ✅ username
- ✅ admin
- ✅ passkey (WebAuthn)
- ✅ twoFactor (TOTP + backup codes + trusted devices)
- ✅ magicLink (15min TTL, single-use)
- ✅ emailOTP (10min TTL)
- ✅ haveIBeenPwned
- ✅ lastLoginMethod
- ✅ captcha (Turnstile provider)
- ✅ organization (team management)
- ✅ openAPI (docs at `/api/auth/reference`)
- ✅ oAuthProxy (env bridging)
- ✅ jwt (RS256, 15min, JWKS rotation 14d)
- ✅ apiKey (session support)
- ✅ mcp (Claude Code / Cursor integration)

### 3. Step-Up Authentication

**Files**:
- `packages/api/src/middleware/stepup.ts` - Middleware
- `packages/api/src/routes/security/reauth.ts` - Reauth endpoint

**Flow**:
1. User attempts sensitive action (billing, API key reveal, org role change)
2. `requireStepUp` middleware checks if step-up valid (<300s old)
3. If expired, returns 401 `{code: "STEPUP_REQUIRED", reauthUrl: "/security/reauth"}`
4. User re-authenticates with passkey/TOTP/password
5. Step-up marked valid for 300s
6. Subsequent requests within 300s succeed

**Usage**:
```typescript
import { requireStepUp } from "./middleware/stepup";

app.post("/billing/portal", requireStepUp, async (c) => {
  // Only reached if step-up valid
});
```

### 4. Passkey Enforcement (All Roles)

**File**: `packages/api/src/middleware/passkey-policy.ts`

**Policy**:
- **First time**: User without passkey can use TOTP once
- **Second time**: Must enroll passkey before next ultra-sensitive action
- **After enrollment**: Passkey required for all ultra-sensitive actions

**Enforcement**:
- Billing portal access
- API key reveal/creation
- Organization role changes
- Organization deletion
- User deletion

**Usage**:
```typescript
import { requirePasskey } from "./middleware/passkey-policy";

app.post("/settings/api-keys/create", requireStepUp, requirePasskey, async (c) => {
  // Passkey required
});
```

### 5. Adaptive Turnstile

**File**: `packages/api/src/middleware/adaptive-turnstile.ts`

**Flow**:
1. Track failures per `ip:identifier:path`
2. After ≥5 failures in 10s, require Turnstile challenge
3. User completes challenge, gets 15min bypass cookie `sb_challenge=1`
4. Subsequent requests use bypass cookie

**Usage**:
```typescript
import { adaptiveTurnstile } from "./middleware/adaptive-turnstile";

app.post("/api/auth/sign-in", adaptiveTurnstile, async (c) => {
  // Turnstile only after suspicious activity
});
```

### 6. JWT for Tools

**File**: `packages/api/src/middleware/jwt-tools.ts`

**Configuration**:
- Algorithm: RS256
- TTL: 15 minutes
- Issuer: `https://api.snapback.dev`
- Audience: `["vscode", "mcp", "cli"]`
- JWKS Rotation: 14 days with 48h overlap

**Usage**:
```typescript
import { requireToolJWT, requireScope } from "./middleware/jwt-tools";

app.get("/tool/snapshots", requireToolJWT, requireScope("snapshots:read"), async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  // JWT verified, scopes checked
});
```

**JWT Payload**:
```json
{
  "sub": "user_id",
  "aud": "vscode",
  "iss": "https://api.snapback.dev",
  "orgId": "org_id",
  "scopes": ["snapshots:read", "snapshots:write"],
  "iat": 1699999999,
  "exp": 1700000899
}
```

### 7. API Keys with Argon2id

**File**: `packages/auth/src/index.ts`

**Changes**:
- ❌ Removed bcrypt
- ✅ Added argon2id (memory=64MB, time=3, parallel=4)
- ✅ Reveal-once on creation
- ✅ Prefix: `sb_live_` or `sb_test_`
- ✅ Scopes, last-used, TTL

**Hash Comparison**:
```typescript
// Old (bcrypt)
await bcrypt.hash(apiKey, 12);

// New (argon2id)
await argon2Hash(apiKey, {
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
});
```

### 8. RLS Tenant Isolation

**File**: `packages/api/src/middleware/rls-tenant.ts`

**Flow**:
1. Extract orgId from session/JWT/query/path
2. Verify user is member of org
3. `SET LOCAL app.current_org = '${orgId}'`
4. All queries auto-filtered by RLS policies

**SQL Policies** (run in migrations):
```sql
-- Enable RLS
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY snapshots_org_isolation ON snapshots
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true)::uuid);

-- Test isolation
SET LOCAL app.current_org = '00000000-0000-0000-0000-000000000001';
SELECT * FROM snapshots; -- Only org 1's data
```

### 9. PostHog + Audit

**File**: `packages/api/src/hooks/auth-audit.ts`

**Events Tracked**:
- `auth.signup`, `auth.signin`, `auth.signout`, `auth.signin_failed`
- `mfa.totp_enabled`, `mfa.totp_verified`, `mfa.totp_failed`
- `passkey.enrolled`, `passkey.verified`, `passkey.failed`
- `stepup.required`, `stepup.success`, `stepup.failed`
- `challenge.required`, `challenge.passed`, `challenge.failed`
- `apikey.created`, `apikey.revoked`, `apikey.used`
- `jwt.issued`, `jwt.verified`, `jwt.expired`
- `org.member_added`, `org.role_changed`, `org.deleted`
- `billing.portal_accessed`, `billing.subscription_changed`

**Audit Table** (SQL):
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES user(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organization(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL DEFAULT '{}',
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id, created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type, created_at DESC);

-- Append-only: no updates/deletes
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
```

---

## Environment Variables

### Required

```bash
# Core
BETTER_AUTH_URL=https://api.snapback.dev
BETTER_AUTH_SECRET=<random-256bit-secret>
APP_URL=https://snapback.dev
NODE_ENV=production

# Database
DATABASE_URL=postgres://user:pass@host:5432/snapback

# OAuth Providers
GITHUB_CLIENT_ID=<github-oauth-client-id>
GITHUB_CLIENT_SECRET=<github-oauth-client-secret>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>

# Email Provider (Resend/SendGrid)
RESEND_API_KEY=<resend-api-key>

# Turnstile (Cloudflare)
CAPTCHA_SITE_KEY=<turnstile-site-key>
CAPTCHA_SECRET_KEY=<turnstile-secret-key>

# JWT for Tools
BETTER_AUTH_JWT_PRIVATE_PEM=-----BEGIN PRIVATE KEY-----...
BETTER_AUTH_JWT_PUBLIC_PEM=-----BEGIN PUBLIC KEY-----...

# PostHog
POSTHOG_API_KEY=<posthog-project-api-key>
POSTHOG_HOST=https://us.posthog.com

# Stripe
STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
```

### Optional

```bash
# Feature Flags
FEATURE_PASSKEY_ENFORCE_ALL=true  # Default: true
FEATURE_TURNSTILE_ADAPTIVE=true   # Default: true

# Step-Up Configuration
AUTH_STEPUP_WINDOW_SEC=300        # Default: 300 (5 minutes)

# Turnstile Thresholds
TURNSTILE_FAILURE_THRESHOLD=5     # Default: 5
TURNSTILE_WINDOW_MS=10000         # Default: 10000 (10 seconds)

# Signup Control
ENABLE_SIGNUP=false               # Default: false (invitation-only)
```

---

## Migration Guide

### Phase 1: Preparation (Day 1)

1. **Generate JWT Keys**:
   ```bash
   # Generate RS256 key pair
   openssl genrsa -out private.pem 2048
   openssl rsa -in private.pem -pubout -out public.pem

   # Add to .env
   BETTER_AUTH_JWT_PRIVATE_PEM=$(cat private.pem)
   BETTER_AUTH_JWT_PUBLIC_PEM=$(cat public.pem)
   ```

2. **Run Database Migrations**:
   ```sql
   -- Create audit_logs table
   CREATE TABLE audit_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     event_type TEXT NOT NULL,
     user_id UUID REFERENCES user(id) ON DELETE CASCADE,
     org_id UUID REFERENCES organization(id) ON DELETE CASCADE,
     metadata JSONB NOT NULL DEFAULT '{}',
     ip TEXT,
     user_agent TEXT,
     created_at TIMESTAMP NOT NULL DEFAULT NOW()
   );

   -- Indexes
   CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
   CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id, created_at DESC);
   CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type, created_at DESC);
   CREATE INDEX idx_audit_logs_ip ON audit_logs(ip, created_at DESC);

   -- RLS policies
   ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
   CREATE POLICY snapshots_org_isolation ON snapshots
     FOR ALL
     USING (organization_id = current_setting('app.current_org', true)::uuid);

   -- Add more RLS policies for other org-scoped tables
   ```

3. **Set Environment Variables**:
   - Production: Add to Vercel/deployment platform
   - Development: Add to `.env.local`

### Phase 2: Deployment (Day 2)

1. **Deploy API Changes**:
   ```bash
   git checkout claude/better-auth-alignment-full-implementation-011CV46CsqVdBvJmnvzyjk73
   pnpm install
   pnpm build
   # Deploy to Vercel/platform
   ```

2. **Verify Cross-Subdomain Cookies**:
   - Sign in at `snapback.dev`
   - Navigate to `app.snapback.dev`
   - Verify session persists
   - Check browser DevTools → Application → Cookies
   - Should see `Domain=.snapback.dev`

3. **Test Critical Flows**:
   - Sign up → Email verification → Sign in
   - Enable 2FA → Test TOTP
   - Enroll passkey → Test passkey
   - Attempt billing → Step-up prompt → Verify → Access granted
   - Create API key → Verify reveal-once → Test with JWT

### Phase 3: Monitoring (Week 1)

1. **Monitor PostHog**:
   - `auth.signin_failed` spikes → Investigate IPs
   - `challenge.required` frequency → Tune thresholds
   - `stepup.failed` rate → Check UX friction

2. **Check Audit Logs**:
   ```sql
   -- Failed auth attempts
   SELECT ip, COUNT(*) as failures
   FROM audit_logs
   WHERE event_type = 'auth.signin_failed'
     AND created_at > NOW() - INTERVAL '1 hour'
   GROUP BY ip
   HAVING COUNT(*) > 10;

   -- Abuse patterns
   SELECT event_type, COUNT(*)
   FROM audit_logs
   WHERE created_at > NOW() - INTERVAL '1 day'
   GROUP BY event_type
   ORDER BY COUNT(*) DESC;
   ```

3. **Performance Metrics**:
   - Step-up latency (should be <100ms)
   - JWKS cache hit rate (should be >95%)
   - RLS query performance (add indexes if slow)

---

## Testing

### Unit Tests

**Run**:
```bash
pnpm test packages/auth
pnpm test packages/api
```

**Coverage**:
- `hashApiKey` / `verifyApiKey` (argon2id)
- `hasValidStepUp` / `setStepUpValid`
- `isChallengeRequired` / `recordFailure`
- `verifyJWT` / `extractToken`
- `getOrgIdFromContext` / `verifyOrgAccess`

### Integration Tests

**Scenarios**:
1. Cross-subdomain cookies:
   - Sign in → Check cookies have `Domain=.snapback.dev`
2. Step-up flow:
   - Access billing → 401 → Reauth → Access granted
3. Passkey enforcement:
   - No passkey → Use TOTP → Next time requires enrollment
4. Adaptive Turnstile:
   - 5 failed logins → Challenge required → Pass → Bypass set
5. RLS isolation:
   - Set org A → Query snapshots → Only see org A's data

### E2E Tests (Playwright)

**File**: `tests/e2e/auth-flows.spec.ts` (to be created)

```typescript
test("cross-subdomain session persists", async ({ page, context }) => {
  // Sign in at snapback.dev
  await page.goto("https://snapback.dev/auth/signin");
  await page.fill('input[name="email"]', "test@example.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');

  // Navigate to app.snapback.dev
  await page.goto("https://app.snapback.dev/dashboard");

  // Verify user is authenticated
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

  // Check cookies
  const cookies = await context.cookies("https://app.snapback.dev");
  const sessionCookie = cookies.find(c => c.name === "better-auth.session_token");
  expect(sessionCookie?.domain).toBe(".snapback.dev");
});

test("step-up required for billing", async ({ page }) => {
  await signIn(page);

  // Attempt billing access
  await page.goto("https://app.snapback.dev/settings/billing");

  // Should prompt for step-up
  await expect(page.locator('[data-testid="stepup-prompt"]')).toBeVisible();

  // Complete step-up with passkey
  await page.click('button[data-testid="stepup-passkey"]');
  // WebAuthn flow...

  // Access granted
  await expect(page.locator('[data-testid="billing-portal"]')).toBeVisible();
});

test("passkey enforcement after TOTP fallback", async ({ page }) => {
  await signIn(page);

  // First time: Use TOTP
  await page.goto("https://app.snapback.dev/settings/api-keys/create");
  await page.click('button[data-testid="stepup-totp"]');
  await page.fill('input[name="totp"]', "123456");
  await page.click('button[type="submit"]');

  // API key created
  await expect(page.locator('[data-testid="api-key-created"]')).toBeVisible();

  // Second time: Must enroll passkey
  await page.goto("https://app.snapback.dev/settings/billing/portal");
  await expect(page.locator('[data-testid="passkey-enrollment-required"]')).toBeVisible();
});
```

---

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

1. **Disable Feature Flags**:
   ```bash
   FEATURE_PASSKEY_ENFORCE_ALL=false
   FEATURE_TURNSTILE_ADAPTIVE=false
   ```

2. **Revert Git**:
   ```bash
   git revert HEAD~1  # Revert last commit
   git push origin main --force
   ```

3. **Clear JWKS Cache**:
   ```bash
   # Invalidate all JWT tokens
   # Users will need to re-authenticate
   ```

### Graceful Rollback (1 hour)

1. **Serve Old JWKS Kid**:
   - Rotate back to previous JWT key pair
   - Keep serving for 48h overlap

2. **Disable Social Providers**:
   ```bash
   GITHUB_CLIENT_ID=""
   GOOGLE_CLIENT_ID=""
   ```

3. **Export Audit Logs**:
   ```sql
   COPY (
     SELECT * FROM audit_logs
     WHERE created_at > NOW() - INTERVAL '7 days'
   ) TO '/tmp/audit_logs_backup.csv' CSV HEADER;
   ```

---

## Security Considerations

### ✅ Implemented

1. **No JWT in Browser** - Web uses session cookies only; JWT only for tools
2. **Org ID in All Queries** - RLS enforces tenant isolation
3. **Tokens Redacted in Logs** - `logger` sanitizes sensitive data
4. **No Wildcard Origins** - `trustedOrigins` explicitly lists allowed domains
5. **JWKS Rotation** - 14-day cadence with 48h overlap
6. **Argon2id for API Keys** - More secure than bcrypt
7. **Step-Up for Sensitive Actions** - 300s window enforced
8. **Passkeys for All Roles** - Ultra-sensitive actions require passkey
9. **Adaptive Turnstile** - Only triggers on abuse, not happy-path
10. **Append-Only Audit** - `audit_logs` table prevents tampering

### 🔒 Best Practices

1. **Rotate Secrets Regularly**:
   - `BETTER_AUTH_SECRET` every 90 days
   - JWT keys every 14 days (automated)

2. **Monitor Abuse Patterns**:
   - PostHog alerts on `auth.signin_failed` spikes
   - Audit logs for `auth.abuse_detected`

3. **Rate Limit Everything**:
   - Upstash rate limiting on `/api/auth/*`
   - Per-API-key rate limits

4. **Test RLS Isolation**:
   - Negative tests: User A cannot access User B's data
   - Automated tests on CI/CD

5. **Incident Response**:
   - Revoke all sessions: `DELETE FROM sessions`
   - Rotate JWKS: `BETTER_AUTH_JWT_PRIVATE_PEM=<new-key>`
   - Disable providers: `GITHUB_CLIENT_ID=""`
   - Export audit: `SELECT * FROM audit_logs WHERE ...`

---

## Next Steps

### Future Enhancements

1. **Disposable Email Detection** - Block temp email domains
2. **Device Fingerprinting** - Track devices for anomaly detection
3. **SSO (SAML/OIDC)** - Enterprise plan feature
4. **Custom Retention** - Per-org audit log retention policies
5. **Advanced Analytics** - Real-time dashboards for security events

### Documentation

- [ ] Update API reference docs
- [ ] Create user guides for passkey enrollment
- [ ] Add troubleshooting section
- [ ] Record demo videos

### Monitoring Dashboards

- [ ] PostHog dashboard for auth metrics
- [ ] Grafana dashboard for API performance
- [ ] Sentry alerts for auth errors

---

## Support

For issues or questions:
- GitHub: https://github.com/snapback/snapback/issues
- Docs: https://docs.snapback.dev
- Email: support@snapback.dev

---

**Implementation by**: Claude (Anthropic AI)
**Date**: 2025-11-12
**Branch**: `claude/better-auth-alignment-full-implementation-011CV46CsqVdBvJmnvzyjk73`
