# Auth Strategy Decision: Stay with Better Auth (With Heightened Security Vigilance)

**Generated**: 2025-12-04
**Status**: STAY FOR NOW - Active Migration Planning for Q2 2025
**Confidence**: MEDIUM (70% - security concerns temper previous HIGH confidence)

---

## Executive Summary

**IMMEDIATE DECISION**: Stay with Better Auth v1.3.34+ (all known vulnerabilities patched)

**STRATEGIC SHIFT**: Multiple critical vulnerabilities discovered in Better Auth (2024-2025) change risk profile. While current version is patched, the pattern of critical security issues (open redirect bypasses, unauthenticated API key creation, XSS) warrants heightened vigilance and active migration planning.

**REVISED TIMELINE**:
- **Now - Demo**: Stay with Better Auth, implement immediate security audit
- **Post-Demo (Weeks 3-4)**: Comprehensive vulnerability testing
- **Q1 2025**: Device authorization alternative research for AuthJS
- **Q2 2025**: Execute AuthJS migration if device auth alternative viable

---

## Critical Vulnerabilities Discovered

### CVE-2025-53535: Open Redirect Bypass (HIGH Severity)

**Description**: Bypass of `trustedOrigins` security feature via manipulation of `callbackURL` parameter. Attackers can redirect users to malicious sites by using scheme-less URLs (e.g., `//malicious-site.com`).

**Affected Versions**: All versions < 1.2.10
**Your Status**: ✅ PROTECTED (on v1.3.34)

**Exploit Vector**:
```typescript
// Vulnerable pattern (pre-1.2.10):
// Server blocks fully qualified URLs but allows scheme-less URLs
const callbackURL = "//attacker-controlled.com/steal-tokens";
// Browser interprets as: https://attacker-controlled.com/steal-tokens
```

**Audit Required**: Verify `trustedOrigins` configuration doesn't use wildcards

---

### Unauthenticated API Key Creation (CRITICAL Severity)

**Description**: Attackers could create API keys without authentication, potentially gaining unauthorized access to protected resources.

**Affected Versions**: All versions < 1.3.26
**Your Status**: ✅ PROTECTED (on v1.3.34)

**Exploit Vector**:
```typescript
// Vulnerable endpoint (pre-1.3.26):
POST /api/auth/api-keys/create
{
  "name": "attacker-key",
  "scopes": ["all"]
}
// No authentication check before v1.3.26
```

**Audit Required**: Verify all API key endpoints require authentication

---

### XSS on /api/auth/error Endpoint (MEDIUM-HIGH Severity)

**Description**: HTML injection on error page leading to reflected cross-site scripting vulnerability.

**Affected Versions**: Unknown (likely < 1.3.34)
**Your Status**: ✅ LIKELY PROTECTED (on v1.3.34)

**Exploit Vector**:
```typescript
// Vulnerable pattern:
/api/auth/error?message=<script>alert(document.cookie)</script>
// Error page reflects unsanitized message parameter
```

**Audit Required**: Test error endpoints for HTML injection

---

### Email Verification Open Redirect (MEDIUM Severity)

**Description**: Email verification endpoint accepts `callbackURL` without proper domain validation, allowing redirection to attacker-controlled sites.

**Affected Versions**: All versions < 1.1.6
**Your Status**: ✅ PROTECTED (on v1.3.34)

**Exploit Vector**:
```typescript
// Vulnerable email verification link:
https://yourapp.com/api/auth/verify-email?token=xyz&callbackURL=https://evil.com
// User completes verification, gets redirected to evil.com
```

**Audit Required**: Verify email verification only redirects to trusted domains

---

## Immediate Security Audit (This Week)

### Audit Checklist

```markdown
## Better Auth Security Audit

**Auditor**: ___
**Date**: ___
**Version Confirmed**: better-auth@1.3.34+ ✅

---

### 1. Version Verification
- [ ] Run: `pnpm list better-auth`
- [ ] Confirm version ≥ 1.3.34
- [ ] Check for security advisories: https://github.com/better-auth/better-auth/security

---

### 2. Trusted Origins Configuration

**File**: [packages/auth/src/auth.ts](../packages/auth/src/auth.ts)

- [ ] Review `trustedOrigins` configuration
- [ ] Verify NO wildcard usage (e.g., `*.example.com`)
- [ ] Verify NO relative URLs allowed
- [ ] Verify only specific domains listed

**Current Configuration**:
```typescript
// Audit this section:
trustedOrigins: [
  'http://localhost:3000',
  'https://snapback.dev',
  // ADD MORE SPECIFIC DOMAINS HERE
]
```

**Red Flags**:
- ❌ `trustedOrigins: ['*']` (allows all domains)
- ❌ `trustedOrigins: ['*.snapback.dev']` (wildcard subdomain)
- ❌ Empty or undefined `trustedOrigins`

---

### 3. API Key Endpoint Authentication

**Files to Audit**:
- [apps/api/modules/apikeys/router.ts](../apps/api/modules/apikeys/router.ts) (if exists)
- Any endpoint creating/managing API keys

**Checklist**:
- [ ] All API key creation endpoints require authentication
- [ ] Verify: `ctx.auth.user` exists before creating key
- [ ] Verify: Permission checks for scope assignment
- [ ] Verify: Rate limiting on API key creation

**Test Script**:
```bash
# Attempt unauthenticated API key creation
curl -X POST https://your-api.com/api/rpc/createApiKey \
  -H "Content-Type: application/json" \
  -d '{"name": "test-key", "scopes": ["all"]}'

# Expected: 401 Unauthorized
# Red Flag: 200 OK with API key returned
```

---

### 4. Error Endpoint XSS Protection

**File**: Better Auth handles `/api/auth/error` internally

**Test Script**:
```bash
# Test for HTML injection
curl "http://localhost:3000/api/auth/error?message=<script>alert('XSS')</script>"

# Verify response:
# - HTML entities escaped: &lt;script&gt;
# - Content-Type: text/html with proper CSP headers
# - No script execution in browser

# Red Flag: Unescaped HTML in response
```

---

### 5. Email Verification Callback Validation

**File**: [packages/auth/src/auth.ts](../packages/auth/src/auth.ts)

**Checklist**:
- [ ] Email verification callbacks validated against `trustedOrigins`
- [ ] No user-controlled callback URLs without validation
- [ ] Verify default callback used if parameter missing

**Test Script**:
```bash
# Generate email verification link (use your test flow)
# Modify callbackURL parameter to external domain
# Expected: Rejected or redirected to default
# Red Flag: Redirected to attacker-controlled domain
```

---

### 6. Session Security

**Checklist**:
- [ ] Session cookies have `HttpOnly` flag
- [ ] Session cookies have `Secure` flag (production)
- [ ] Session cookies have `SameSite=Lax` or `Strict`
- [ ] CSRF protection enabled for state-changing operations

**Verification**:
```bash
# Check cookie flags in browser DevTools
# Application → Cookies → session cookie

# Expected:
HttpOnly: ✅
Secure: ✅ (production)
SameSite: Lax or Strict
```

---

### 7. OAuth Callback Validation

**Checklist**:
- [ ] OAuth callbacks validate state parameter
- [ ] Redirect URIs match registered URLs exactly
- [ ] No open redirect via OAuth flow

**Test Script**:
```bash
# Initiate OAuth flow
# Modify redirect_uri parameter to external domain
# Expected: OAuth provider rejects or Better Auth validates
# Red Flag: Redirected to attacker-controlled domain after auth
```

---

### Audit Results Summary

**Critical Issues Found**: ___
**Medium Issues Found**: ___
**Low Issues Found**: ___

**Overall Risk Rating**: Low / Medium / High / Critical

**Immediate Actions Required**:
1. ___
2. ___
3. ___
```

---

## Vulnerability Testing Guide (Post-Demo)

### Test Suite: Better Auth Security Validation

**File**: `packages/auth/test/security/vulnerabilities.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { auth } from '../src/auth';

describe('Better Auth Vulnerability Regression Tests', () => {

  describe('CVE-2025-53535: Open Redirect Prevention', () => {
    it('should reject scheme-less URLs in callbackURL', async () => {
      const maliciousCallback = '//attacker-controlled.com/steal';

      const result = await auth.api.verifyEmail.$post({
        body: {
          token: 'valid-token',
          callbackURL: maliciousCallback,
        },
      });

      // Should reject or redirect to default, NOT to attacker domain
      expect(result.status).toBe(400); // Bad Request
      // OR
      expect(result.headers.get('Location')).not.toContain('attacker-controlled.com');
    });

    it('should only allow trustedOrigins in callbacks', async () => {
      const untrustedCallback = 'https://evil.com/phishing';

      const result = await auth.api.verifyEmail.$post({
        body: {
          token: 'valid-token',
          callbackURL: untrustedCallback,
        },
      });

      expect(result.status).toBe(400);
      // Should not redirect to untrusted domain
    });

    it('should allow trusted domain callbacks', async () => {
      const trustedCallback = 'https://snapback.dev/dashboard';

      const result = await auth.api.verifyEmail.$post({
        body: {
          token: 'valid-token',
          callbackURL: trustedCallback,
        },
      });

      // Should succeed if domain is in trustedOrigins
      expect([200, 302]).toContain(result.status);
    });
  });

  describe('Unauthenticated API Key Creation Prevention', () => {
    it('should reject API key creation without authentication', async () => {
      const result = await fetch('http://localhost:3000/api/rpc/createApiKey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'attacker-key',
          scopes: ['all'],
        }),
      });

      expect(result.status).toBe(401); // Unauthorized
      expect(await result.json()).toHaveProperty('error');
    });

    it('should allow authenticated API key creation', async () => {
      // First authenticate
      const session = await createTestSession();

      const result = await fetch('http://localhost:3000/api/rpc/createApiKey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${session.token}`,
        },
        body: JSON.stringify({
          name: 'legitimate-key',
          scopes: ['snapshots:read'],
        }),
      });

      expect(result.status).toBe(200);
      expect(await result.json()).toHaveProperty('apiKey');
    });

    it('should enforce permission checks for scope assignment', async () => {
      // Non-admin user tries to create admin-scoped key
      const regularUserSession = await createTestSession({ role: 'user' });

      const result = await fetch('http://localhost:3000/api/rpc/createApiKey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${regularUserSession.token}`,
        },
        body: JSON.stringify({
          name: 'escalation-attempt',
          scopes: ['admin:all'], // Requires admin role
        }),
      });

      expect(result.status).toBe(403); // Forbidden
    });
  });

  describe('XSS Prevention on Error Endpoints', () => {
    it('should escape HTML in error messages', async () => {
      const xssPayload = '<script>alert(document.cookie)</script>';

      const result = await fetch(
        `http://localhost:3000/api/auth/error?message=${encodeURIComponent(xssPayload)}`
      );

      const html = await result.text();

      // Should escape HTML entities
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');

      // Should have CSP headers
      expect(result.headers.get('Content-Security-Policy')).toContain("script-src 'self'");
    });

    it('should sanitize error parameters', async () => {
      const htmlInjection = '<img src=x onerror=alert(1)>';

      const result = await fetch(
        `http://localhost:3000/api/auth/error?message=${encodeURIComponent(htmlInjection)}`
      );

      const html = await result.text();
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });
  });

  describe('Email Verification Callback Validation', () => {
    it('should reject external domain redirects', async () => {
      const verificationToken = await createTestVerificationToken();

      const result = await auth.api.verifyEmail.$post({
        body: {
          token: verificationToken,
          callbackURL: 'https://phishing-site.com/steal-tokens',
        },
      });

      expect(result.status).toBe(400);
      expect(result.headers.get('Location')).not.toContain('phishing-site.com');
    });

    it('should use default callback if none provided', async () => {
      const verificationToken = await createTestVerificationToken();

      const result = await auth.api.verifyEmail.$post({
        body: {
          token: verificationToken,
          // No callbackURL provided
        },
      });

      expect([200, 302]).toContain(result.status);
      // Should redirect to default (e.g., dashboard)
      if (result.status === 302) {
        expect(result.headers.get('Location')).toMatch(/\/(dashboard|home)/);
      }
    });
  });

  describe('Session Security', () => {
    it('should set HttpOnly flag on session cookies', async () => {
      const session = await createTestSession();

      // Check Set-Cookie header
      const setCookie = session.headers.get('Set-Cookie');
      expect(setCookie).toContain('HttpOnly');
    });

    it('should set Secure flag in production', async () => {
      // Only test in production-like environment
      if (process.env.NODE_ENV === 'production') {
        const session = await createTestSession();
        const setCookie = session.headers.get('Set-Cookie');
        expect(setCookie).toContain('Secure');
      }
    });

    it('should set SameSite attribute', async () => {
      const session = await createTestSession();
      const setCookie = session.headers.get('Set-Cookie');
      expect(setCookie).toMatch(/SameSite=(Lax|Strict)/);
    });
  });

  describe('CSRF Protection', () => {
    it('should reject state-changing requests without CSRF token', async () => {
      const session = await createTestSession();

      // Attempt state change without CSRF token
      const result = await fetch('http://localhost:3000/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${session.token}`,
          // Missing CSRF token header
        },
        body: JSON.stringify({
          name: 'New Name',
        }),
      });

      expect(result.status).toBe(403); // Forbidden - CSRF check failed
    });

    it('should allow requests with valid CSRF token', async () => {
      const session = await createTestSession();
      const csrfToken = session.csrfToken;

      const result = await fetch('http://localhost:3000/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${session.token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          name: 'New Name',
        }),
      });

      expect(result.status).toBe(200);
    });
  });
});

// Helper functions
async function createTestSession(options = {}) {
  // Implementation: Create test user session
}

async function createTestVerificationToken() {
  // Implementation: Create test verification token
}
```

**Test Execution**:
```bash
# Run security tests
pnpm --filter @snapback/auth test test/security/vulnerabilities.test.ts

# Expected: All tests passing
# If failures: CRITICAL - investigate immediately
```

---

## Revised Migration Decision Matrix

### Current Risk Assessment

```markdown
## Better Auth Risk Profile (Updated)

### Security Track Record (2024-2025)
- ❌ CVE-2025-53535: Open Redirect (HIGH severity)
- ❌ Unauthenticated API Key Creation (CRITICAL severity)
- ❌ XSS on error endpoint (MEDIUM-HIGH severity)
- ❌ Email verification open redirect (MEDIUM severity)

**Pattern**: Multiple critical vulnerabilities in short timeframe suggests:
1. Security review process gaps
2. Input validation weaknesses
3. Potential for future vulnerabilities

### Mitigation Factors
- ✅ Quick patch releases (good response time)
- ✅ Active maintenance by Auth.js team
- ✅ Version 1.3.34+ patches all known issues
- ✅ Still provides unique features (device auth, granular API keys)

### Updated Risk Rating: MEDIUM-HIGH
**Previous**: LOW (before vulnerability discovery)
**Current**: MEDIUM-HIGH (pattern of critical vulns concerning)
```

### Migration Decision: Stay with Heightened Vigilance

**DECISION**: Stay with Better Auth through demo and Q1 2025, actively plan AuthJS migration for Q2 2025

**RATIONALE**:
1. **Short-term**: All vulnerabilities patched (v1.3.34)
2. **Device Auth Dependency**: Still blocking feature for AuthJS
3. **Migration Cost**: 360 hours still too high for immediate migration
4. **Strategic**: Use Q1 2025 to research device auth alternatives

**CONDITIONS**:
- ✅ Immediate security audit completed
- ✅ Vulnerability tests added (post-demo)
- ✅ Quarterly monitoring established
- ✅ Q2 2025 migration plan in place

---

## Q2 2025 Migration Plan: AuthJS with Device Auth Alternative

### Device Authorization Alternative Research (Q1 2025)

**Current Blocker**: Better Auth has RFC 8628 device flow, AuthJS lacks it

**Research Goals**:
1. Can AuthJS implement custom device flow?
2. Are there alternative auth flows for remote/WSL scenarios?
3. Can we use magic links as device auth replacement?

#### Alternative 1: Custom Device Flow Implementation

```typescript
// Research: Implement RFC 8628 on top of AuthJS

// 1. Device Code Generation Endpoint
export async function generateDeviceCode() {
  const deviceCode = randomBytes(32).toString('hex');
  const userCode = generateReadableCode(); // e.g., "ABCD-1234"

  await db.deviceAuthorization.create({
    deviceCode,
    userCode,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    status: 'pending',
  });

  return {
    deviceCode,
    userCode,
    verificationUri: 'https://snapback.dev/device',
    interval: 5, // Poll every 5 seconds
  };
}

// 2. User Authorization Endpoint
export async function authorizeDevice(userCode: string, userId: string) {
  const authorization = await db.deviceAuthorization.findUnique({
    where: { userCode },
  });

  if (!authorization || authorization.expiresAt < new Date()) {
    throw new Error('Invalid or expired code');
  }

  await db.deviceAuthorization.update({
    where: { userCode },
    data: { status: 'authorized', userId },
  });
}

// 3. Token Polling Endpoint
export async function pollDeviceToken(deviceCode: string) {
  const authorization = await db.deviceAuthorization.findUnique({
    where: { deviceCode },
  });

  if (!authorization) {
    return { error: 'invalid_grant' };
  }

  if (authorization.status === 'pending') {
    return { error: 'authorization_pending' };
  }

  if (authorization.status === 'authorized') {
    // Create session for user
    const session = await createSession(authorization.userId);
    return { access_token: session.token };
  }

  return { error: 'expired_token' };
}
```

**Estimate**: 20-30 hours implementation
**Feasibility**: HIGH (straightforward to implement on AuthJS)

#### Alternative 2: Magic Link for Remote Scenarios

```typescript
// Instead of device flow, use magic links for VSCode in WSL/Remote SSH

// 1. Generate magic link in VSCode
const magicLinkUrl = await generateMagicLink({
  email: user.email,
  redirectUrl: 'vscode://snapback/auth-callback',
});

// 2. Display link in VSCode notification
vscode.window.showInformationMessage(
  'Open this link to authenticate:',
  { modal: true },
  { title: 'Open Link', action: () => vscode.env.openExternal(vscode.Uri.parse(magicLinkUrl)) }
);

// 3. User clicks link on local machine, redirects back to VSCode
// Deep link handler catches callback, extracts session token
```

**Estimate**: 10-15 hours implementation
**Feasibility**: HIGH (simpler than device flow)
**Trade-off**: Requires email access, not as seamless as device flow

#### Alternative 3: QR Code Authentication

```typescript
// Generate QR code for mobile app authentication

// 1. Generate auth session ID
const authSessionId = randomBytes(32).toString('hex');

// 2. Display QR code in VSCode terminal
console.log('Scan this QR code with SnapBack mobile app:');
qrcode.generate(`snapback://auth/${authSessionId}`, { small: true });

// 3. Mobile app scans QR, authenticates, approves session
// 4. VSCode polls for session approval
const session = await pollAuthSession(authSessionId);
```

**Estimate**: 15-20 hours implementation
**Feasibility**: MEDIUM (requires mobile app or web app with camera)
**Trade-off**: Requires separate device with camera

### Q2 2025 Migration Timeline

```markdown
## AuthJS Migration Plan (April - June 2025)

### Prerequisites (Complete in Q1 2025)
- [ ] Device auth alternative researched and prototyped
- [ ] AuthJS version ≥ 5.x with stable API
- [ ] All dependencies compatible with AuthJS
- [ ] Test coverage ≥ 90% for auth flows

### Week 1-2: Database Schema Migration
- [ ] Create AuthJS schema in separate tables (parallel deployment)
- [ ] Migrate user, session, account tables
- [ ] Create data migration scripts
- [ ] Test dual-database mode

### Week 3-4: Core Auth Logic
- [ ] Convert 1,139+ import sites from Better Auth to AuthJS
- [ ] Update session management logic
- [ ] Update OAuth providers (GitHub, Google)
- [ ] Update magic link implementation

### Week 5-6: Plugin Reimplementation
- [ ] Reimplement organization/team support
- [ ] Reimplement API key system with granular scopes
- [ ] Reimplement device authorization alternative (magic links or custom flow)
- [ ] Reimplement custom plugins (invitationOnly, admin)

### Week 7: Integration Testing
- [ ] Test all auth flows (email, OAuth, magic link, device alternative)
- [ ] Test API key creation with scopes
- [ ] Test organization invitations
- [ ] Test VSCode/MCP/CLI authentication

### Week 8: Security Audit
- [ ] Run vulnerability tests from Better Auth suite
- [ ] Test for open redirects, XSS, CSRF
- [ ] Penetration testing
- [ ] Security review by external auditor

### Week 9: Deployment
- [ ] Staged rollout (10% → 50% → 100%)
- [ ] Monitor error rates and performance
- [ ] Rollback plan ready
- [ ] User communication about session invalidation

### Success Criteria
- [ ] All 1,139+ import sites migrated
- [ ] 0 critical security vulnerabilities
- [ ] VSCode/MCP/CLI authentication working with device alternative
- [ ] API keys with granular scopes functional
- [ ] Organization/team features parity
- [ ] <1% error rate in production
```

---

## Monitoring & Review Schedule

### Weekly Security Monitoring (Immediate)

```markdown
## Weekly Better Auth Security Check

**Frequency**: Every Monday during sprint, then monthly post-demo

- [ ] Check Better Auth GitHub releases: https://github.com/better-auth/better-auth/releases
- [ ] Check Better Auth security advisories: https://github.com/better-auth/better-auth/security
- [ ] Check npm security advisories: `npm audit`
- [ ] Review SnapBack security logs for auth anomalies

**Red Flags**:
- New CVE assigned
- Security advisory published
- Unusual auth failure patterns
- Unexpected API key creation
```

### Monthly Vulnerability Review (Post-Demo)

```markdown
## Monthly Auth Security Review

**Frequency**: First week of each month

- [ ] Re-run vulnerability test suite
- [ ] Review auth-related error logs
- [ ] Check for new Better Auth vulnerabilities
- [ ] Update dependencies (Better Auth patch versions)
- [ ] Review API key usage for anomalies

**Escalation Criteria**:
- New CRITICAL or HIGH severity vulnerability
- Failed vulnerability tests
- Suspicious auth activity in logs
```

### Quarterly Migration Assessment (Q1-Q4 2025)

```markdown
## Q1 2025 Review (March 2025)
- [ ] Better Auth latest version: ___
- [ ] AuthJS latest version: ___
- [ ] New Better Auth vulnerabilities: ___ (count)
- [ ] Device auth alternative research: Complete / In Progress
- [ ] **Decision**: Proceed with Q2 migration / Defer

## Q2 2025 Review (June 2025)
- [ ] Migration completed? Yes / No / In Progress
- [ ] Post-migration security audit: Pass / Fail
- [ ] User impact assessment: Minimal / Moderate / High
- [ ] **Decision**: Continue with AuthJS / Rollback to Better Auth

## Q3 2025 Review (September 2025)
- [ ] AuthJS stability assessment: Stable / Issues
- [ ] New AuthJS features relevant to SnapBack: ___
- [ ] Performance comparison: Better / Same / Worse
- [ ] **Decision**: Stay with AuthJS / Reconsider

## Q4 2025 Review (December 2025)
- [ ] Annual security audit results: Pass / Fail
- [ ] Authentication-related incidents: ___ (count)
- [ ] Strategic auth roadmap for 2026: ___
```

---

## Decision Summary

### Immediate Actions (This Week)
1. ✅ Verify Better Auth version ≥ 1.3.34
2. ⏳ Complete security audit checklist
3. ⏳ Review `trustedOrigins` configuration
4. ⏳ Test API key endpoints for authentication
5. ⏳ Document findings in security audit report

### Post-Demo Actions (Weeks 3-4)
1. ⏳ Implement vulnerability test suite (14 tests)
2. ⏳ Add security tests to CI/CD pipeline
3. ⏳ Expand auth test coverage to 90%+
4. ⏳ Monthly security review cadence established

### Q1 2025 (Jan-March)
1. ⏳ Device authorization alternative research
2. ⏳ Prototype magic link or custom device flow on AuthJS
3. ⏳ Feasibility assessment for Q2 migration
4. ⏳ **Go/No-Go Decision**: Migrate in Q2 or defer

### Q2 2025 (Apr-June)
1. ⏳ **IF GO**: Execute 9-week AuthJS migration
2. ⏳ **IF NO-GO**: Continue Better Auth with enhanced monitoring
3. ⏳ Quarterly review and reassessment

---

## Stakeholder Communication

### For Product Team
"Staying with Better Auth through Q1 2025 due to device auth dependency, but heightened security vigilance required. Multiple critical vulnerabilities discovered (now patched). Actively planning AuthJS migration for Q2 2025 with device auth alternative research."

### For Engineering Team
"Better Auth v1.3.34 patches all known vulnerabilities (open redirect, unauthenticated API keys, XSS). Immediate security audit required. Pattern of critical vulns warrants migration planning - Q1 research device auth alternatives, Q2 execute AuthJS migration if viable."

### For Security Team
"Critical vulnerabilities discovered in Better Auth (CVE-2025-53535, unauthenticated API key creation). Current version 1.3.34 is patched. Immediate actions: security audit, vulnerability testing. Strategic: AuthJS migration planned Q2 2025 pending device auth alternative research."

---

## References

- [Better Auth Security Advisories](https://github.com/better-auth/better-auth/security)
- [Better Auth Changelog](https://www.better-auth.com/changelogs)
- [CVE-2025-53535 Details](https://vulert.com/vuln-db/npm-better-auth-183357)
- [Auth.js Documentation](https://authjs.dev)
- [RFC 8628 - Device Authorization Grant](https://datatracker.ietf.org/doc/html/rfc8628)
- [GitLab Advisory Database - better-auth](https://advisories.gitlab.com/pkg/npm/better-auth/)

---

## Questions for User

1. **Immediate Audit**: Can you complete the security audit checklist this week before demo?
2. **Q2 Migration**: Is April-June 2025 timeline acceptable for AuthJS migration?
3. **Device Auth Alternative**: Which alternative is preferable - magic links (simplest) or custom device flow (most similar to current)?
4. **Risk Tolerance**: Is MEDIUM-HIGH risk acceptable for Better Auth through Q1 2025, or prefer immediate migration despite high cost?
