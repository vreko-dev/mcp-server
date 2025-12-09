# Auth Package Test Strategy (2025 Best Practices)

**Package:** `@snapback/auth` (OSS - IP-Safe Required)
**Current Coverage:** 55% → **Target:** 85%+
**Status:** 29 FIX-flagged tests
**Framework:** Better Auth + Vitest + MSW
**Created:** 2025-12-05

---

## 📋 Executive Summary

This strategy addresses the 29 FIX-flagged tests in the auth package by:

1. **Aligning with Better Auth 2025 patterns** (`getTestInstance()`, error handling)
2. **Following OWASP 2025 security testing guidelines** (happy/sad/edge/error)
3. **Implementing IP-safe testing** (OSS compliance, no proprietary logic)
4. **Using deterministic infrastructure** (TestCleanupManager, DeterministicTime)
5. **Organizing by 2025 standards** (feature-based, BDD naming)

---

## 🎯 Coverage Matrix (OWASP 2025 + Better Auth)

### ✅ Current Coverage (Mock-Based - Needs Rewrite)

**File:** `authentication/email-password.test.js` (31 tests)

| Scenario Category | Test Cases | Status | 2025 Alignment |
|-------------------|------------|--------|----------------|
| **Happy Path** | Registration, login, email verification, password reset | ✅ Covered | ❌ Uses mocks |
| **Sad Path** | Invalid email, weak password, duplicate user, incorrect password, non-existent user | ✅ Covered | ❌ Uses mocks |
| **Edge Cases** | Empty fields, long input, special chars, unicode, expired tokens | ✅ Covered | ❌ Uses mocks |
| **Security** | SQL injection, XSS, rate limiting, secure cookies, no password in response | ✅ Covered | ❌ Uses mocks |

**Issue:** Tests validate mock behavior, not Better Auth integration. Need to rewrite using `getTestInstance()`.

---

### ❌ Missing Coverage (Must Add)

Based on OWASP 2025 + Better Auth + Phase 1 Analysis:

#### 1. **Better Auth Integration Tests**

| Scenario | Type | OWASP Priority | Better Auth Pattern |
|----------|------|----------------|---------------------|
| Session creation with Better Auth | Happy | HIGH | `getTestInstance()` + `runWithUser()` |
| Session validation via `auth.api.getSession()` | Happy | HIGH | Manual session retrieval |
| Invalid session returns 401 | Sad | HIGH | Error response pattern |
| Session expiration and rotation | Edge | HIGH | DeterministicTime for timing |
| Concurrent sessions handling | Edge | MEDIUM | Multiple `runWithUser()` calls |
| Session invalidation on logout | Happy | HIGH | OAuth2 endsession endpoint |
| Session cleanup on password reset | Happy | HIGH | Revoke other sessions |

#### 2. **Error Scenarios (System Failures)**

| Scenario | Type | OWASP Priority | Infrastructure |
|----------|------|----------------|----------------|
| Database connection failure during registration | Error | HIGH | MSW 500 error |
| Network timeout during email verification | Error | MEDIUM | MSW timeout |
| Redis failure during session creation | Error | HIGH | MSW Redis error |
| Email service unavailable | Error | MEDIUM | MSW email service error |
| Concurrent registration race condition | Error | MEDIUM | Deterministic timing |

#### 3. **Account Security (OWASP A07:2025)**

| Scenario | Type | OWASP Priority | Pattern |
|----------|------|----------------|---------|
| Account lockout after N failed attempts | Sad | CRITICAL | DeterministicTime + TestCleanupManager |
| Lockout reset after timeout period | Edge | HIGH | DeterministicTime.advanceBy() |
| Credential stuffing attack prevention | Security | HIGH | Rate limiting tests |
| Brute force protection | Security | HIGH | Rate limiting tests |
| User enumeration protection (same response for existing/non-existing) | Security | CRITICAL | Error message validation |

#### 4. **API Key Validation (Auth Package Specific)**

| Scenario | Type | OWASP Priority | Function |
|----------|------|----------------|----------|
| Valid API key accepted | Happy | HIGH | `verifyApiKey()` |
| Invalid API key rejected | Sad | HIGH | `verifyApiKey()` |
| Expired API key rejected | Sad | HIGH | DeterministicTime |
| Revoked API key rejected | Sad | HIGH | API key status check |
| API key rate limiting enforced | Security | HIGH | Rate limiter tests |
| API key hash validation (argon2id) | Security | CRITICAL | `hashApiKey()` + `verifyApiKey()` |

#### 5. **Organization RBAC (Better Auth Organization Plugin)**

| Scenario | Type | OWASP Priority | Pattern |
|----------|------|----------------|---------|
| User has correct role in organization | Happy | MEDIUM | `isMemberOfOrganization()` |
| User denied access without role | Sad | HIGH | Authorization failure |
| Organization admin can manage members | Happy | MEDIUM | `isOrganizationAdmin()` |
| Non-admin cannot manage members | Sad | HIGH | Authorization failure |

---

## 🏗️ MSW Handlers (Feature-Specific)

### Create: `packages/auth/test/msw/auth-handlers.ts`

```typescript
import { http, HttpResponse } from "msw";

export const authHandlers = {
  // Success scenarios
  success: [
    // Session validation
    http.post("https://api.snapback.dev/auth/session", () => {
      return HttpResponse.json({
        user: {
          id: "user_test123",
          email: "test@example.com",
          emailVerified: true,
        },
        session: {
          id: "sess_abc123",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }),

    // Registration
    http.post("https://api.snapback.dev/auth/register", async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({
        user: {
          id: `user_${crypto.randomUUID().slice(0, 8)}`,
          email: body.email,
          emailVerified: false,
        },
      });
    }),

    // Login
    http.post("https://api.snapback.dev/auth/login", async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({
        user: {
          id: "user_test123",
          email: body.email,
          emailVerified: true,
        },
        session: {
          id: `sess_${crypto.randomUUID().slice(0, 8)}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }),
  ],

  // Error scenarios
  errors: {
    invalidCredentials: [
      http.post("https://api.snapback.dev/auth/login", () => {
        return HttpResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }),
    ],

    emailTaken: [
      http.post("https://api.snapback.dev/auth/register", () => {
        return HttpResponse.json(
          { error: "Email already registered" },
          { status: 409 }
        );
      }),
    ],

    sessionExpired: [
      http.post("https://api.snapback.dev/auth/session", () => {
        return HttpResponse.json(
          { error: "Session expired" },
          { status: 401 }
        );
      }),
    ],

    databaseError: [
      http.post("https://api.snapback.dev/auth/register", () => {
        return HttpResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }),
    ],

    networkTimeout: [
      http.post("https://api.snapback.dev/auth/session", async () => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Timeout
      }),
    ],
  },
};

// Helper functions for clean test setup
export function useAuthHandlers(server) {
  server.use(...authHandlers.success);
}

export function useAuthError(server, errorType: keyof typeof authHandlers.errors) {
  server.use(...authHandlers.errors[errorType]);
}
```

---

## 🔄 Test Rewrite Strategy

### Pattern: Better Auth Integration

Replace mock-based tests with Better Auth `getTestInstance()`:

**Before (Mock-Based):**
```typescript
// ❌ BAD: Tests mock behavior, not Better Auth
it("should successfully register user", async () => {
  const user = validUsers.standard;
  const result = await mockDb.createUser({
    email: user.email,
    password: user.password,
  });
  expect(result).toBeDefined();
  expect(result.email).toBe(user.email);
});
```

**After (Better Auth Integration):**
```typescript
// ✅ GOOD: Tests real Better Auth behavior
import { getTestInstance } from "better-auth/test-utils";
import { TestCleanupManager } from "@snapback/testing/utils/TestCleanupManager";

describe("User Registration", () => {
  let cleanup: TestCleanupManager;
  let testInstance;

  beforeEach(async () => {
    cleanup = new TestCleanupManager();
    testInstance = await getTestInstance();
    cleanup.register(() => testInstance.cleanup());
  });

  afterEach(async () => {
    await cleanup.runAll();
  });

  it("should successfully register user when valid credentials provided", async () => {
    const { data, error } = await testInstance.client.signUp.email({
      email: "test@example.com",
      password: "StrongPassword123!",
      name: "Test User",
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.user.email).toBe("test@example.com");
    expect(data.user.emailVerified).toBe(false);
  });

  it("should reject registration when email already exists", async () => {
    // First registration
    await testInstance.client.signUp.email({
      email: "duplicate@example.com",
      password: "StrongPassword123!",
    });

    // Duplicate registration
    const { data, error } = await testInstance.client.signUp.email({
      email: "duplicate@example.com",
      password: "DifferentPassword456!",
    });

    expect(data).toBeNull();
    expect(error).toBeDefined();
    expect(error.message).toContain("already registered");
  });
});
```

---

## 🔐 IP-Safety Checklist (OSS Compliance)

Auth package is **PUBLIC (OSS)** - must NOT expose proprietary logic:

### ✅ Allowed in Tests

- Generic user identifiers: `test@example.com`, `user_test123`
- Generic API keys: `sk_test_abc123def456`
- Generic organization IDs: `org_test789`
- Standard HTTP status codes: 200, 401, 403, 404, 500
- Framework patterns: Better Auth, Vitest, MSW
- Security best practices: hashing, session management, rate limiting

### ❌ Forbidden in Tests

- ❌ Subscription tier logic (`if (tier === "enterprise")`)
- ❌ PostHog event names or analytics
- ❌ Stripe integration patterns
- ❌ Database schema details (table names, column names)
- ❌ Internal service URLs (`https://internal.snapback.dev`)
- ❌ Proprietary risk scoring algorithms
- ❌ Enterprise feature flags
- ❌ Real customer data or identifiers

**Example - IP-Safe Test:**
```typescript
// ✅ GOOD: Generic, framework-agnostic test
it("should create session when login successful", async () => {
  const { data, error } = await authClient.signIn.email({
    email: "test@example.com",
    password: "ValidPassword123!",
  });

  expect(error).toBeNull();
  expect(data.session).toBeDefined();
  expect(data.session.expiresAt).toBeInstanceOf(Date);
});

// ❌ BAD: Exposes proprietary tier logic
it("should create session with extended expiry for pro users", async () => {
  const { data } = await authClient.signIn.email({
    email: "pro@example.com",
    password: "ValidPassword123!",
  });

  // ❌ Exposes subscription tier logic
  const expiryHours = data.user.tier === "pro" ? 168 : 24;
  expect(data.session.expiresAt).toBe(Date.now() + expiryHours * 3600 * 1000);
});
```

---

## 📁 File Organization (2025 Standards)

### Critical: Compiled Test Files Issue

**Problem:** Test files have been accidentally compiled to `.js` (e.g., `email-password.test.js`)

**Root Cause:**
- Tests were included in TSC/TSUP build output
- Tests should NEVER be compiled - Vitest runs `.ts` files directly
- TypeScript config may not properly exclude test files

**Solution:**
1. Delete all compiled test files (`.js`, `.d.ts` from `__tests__/`)
2. Verify `tsconfig.json` excludes test files:
   ```json
   "exclude": [
     "**/*.test.ts",
     "**/*.spec.ts",
     "**/__tests__/**",
     "**/test/**"
   ]
   ```
3. Verify `tsup.config.ts` only targets `src/` directory

### Rename Files

```bash
# Current (non-standard)
packages/auth/__tests__/authentication/email-password.test.js  # ❌ Compiled JS (DELETE!)
packages/auth/__tests__/authentication/email-password.test.ts  # ✅ Source file
packages/auth/__tests__/auth-flow.test.ts                     # ❌ No feature prefix

# Target (2025 standard)
packages/auth/test/registration.test.ts                        # ✅ Feature-based
packages/auth/test/login.test.ts                              # ✅ Feature-based
packages/auth/test/session-management.test.ts                 # ✅ Feature-based
packages/auth/test/password-reset.test.ts                     # ✅ Feature-based
packages/auth/test/email-verification.test.ts                 # ✅ Feature-based
packages/auth/test/api-key-validation.test.ts                 # ✅ Feature-based
packages/auth/test/organization-rbac.test.ts                  # ✅ Feature-based
packages/auth/test/account-security.integration.test.ts       # ✅ Integration test
packages/auth/test/rate-limiting.integration.test.ts          # ✅ Integration test
```

### Directory Structure

```
packages/auth/
├── test/                           # 2025 standard location
│   ├── msw/                        # MSW handlers
│   │   ├── auth-handlers.ts        # Feature-specific handlers
│   │   └── index.ts                # Export all handlers
│   ├── fixtures/                   # Test data (IP-safe)
│   │   ├── users.ts                # Generic test users
│   │   └── api-keys.ts             # Generic test API keys
│   ├── utils/                      # Test utilities
│   │   └── auth-helpers.ts         # Better Auth helpers
│   ├── registration.test.ts
│   ├── login.test.ts
│   ├── session-management.test.ts
│   ├── password-reset.test.ts
│   ├── email-verification.test.ts
│   ├── api-key-validation.test.ts
│   ├── organization-rbac.test.ts
│   ├── account-security.integration.test.ts
│   └── rate-limiting.integration.test.ts
├── src/
│   ├── auth.ts                     # Better Auth config
│   ├── index.ts                    # Public API
│   └── lib/                        # Auth utilities
└── vitest.config.ts
```

---

## 🎯 Test Case Templates (BDD Naming)

### Pattern: `should [verb] [result] when [condition]`

#### Registration Tests

```typescript
describe("User Registration", () => {
  // Happy Path
  it("should create user account when valid credentials provided", async () => {});
  it("should send verification email when registration successful", async () => {});

  // Sad Path
  it("should reject registration when email already exists", async () => {});
  it("should reject registration when password too weak", async () => {});
  it("should reject registration when email format invalid", async () => {});

  // Edge Cases
  it("should handle special characters in name field", async () => {});
  it("should truncate excessively long name input", async () => {});
  it("should preserve unicode characters in user data", async () => {});

  // Error Scenarios
  it("should return 500 error when database unavailable", async () => {});
  it("should retry when email service temporarily fails", async () => {});
});
```

#### Session Management Tests

```typescript
describe("Session Management", () => {
  // Happy Path
  it("should create session when login successful", async () => {});
  it("should validate session when token valid", async () => {});
  it("should extend session when activity detected", async () => {});

  // Sad Path
  it("should return 401 when session expired", async () => {});
  it("should return 401 when session token invalid", async () => {});
  it("should invalidate session when user logs out", async () => {});

  // Edge Cases
  it("should expire session after 7 days of inactivity", async () => {});
  it("should allow concurrent sessions from different devices", async () => {});
  it("should limit maximum concurrent sessions to 5", async () => {});

  // Error Scenarios
  it("should gracefully handle Redis connection failure", async () => {});
  it("should fall back to database when Redis unavailable", async () => {});
});
```

#### Account Security Tests

```typescript
describe("Account Security", () => {
  // Happy Path
  it("should allow login after lockout period expires", async () => {});

  // Sad Path
  it("should lock account after 5 failed login attempts", async () => {});
  it("should prevent login when account locked", async () => {});

  // Edge Cases
  it("should reset failed attempts counter after successful login", async () => {});
  it("should unlock account after 30 minutes of lockout", async () => {});

  // Security
  it("should not reveal whether email exists during password reset", async () => {});
  it("should rate limit password reset requests to 3 per hour", async () => {});
});
```

---

## 📅 Implementation Sequence (Week-by-Week)

### Week 1: Infrastructure Setup

**Days 1-2: MSW Handlers**
- Create `test/msw/auth-handlers.ts` with feature-specific handlers
- Add success scenarios (registration, login, session)
- Add error scenarios (401, 409, 500, timeout)
- Test MSW server setup in vitest.setup.ts

**Days 3-4: Test Utilities**
- Create `test/fixtures/users.ts` with IP-safe test data
- Create `test/fixtures/api-keys.ts` with generic keys
- Create `test/utils/auth-helpers.ts` with Better Auth wrappers
- Set up TestCleanupManager integration

**Day 5: File Organization**
- Rename files to 2025 standard (`*.test.ts`, feature-based)
- Delete compiled `.js` and `.d.ts` files from `__tests__/`
- Move tests to `test/` directory
- Update vitest.config.ts paths

### Week 2: Core Auth Flows (P0 Critical)

**Days 6-7: Registration Tests**
- Rewrite using Better Auth `getTestInstance()`
- Cover: happy path, duplicate email, weak password, invalid email
- Add: database error scenario, email service failure
- IP-safety review

**Days 8-9: Login & Session Tests**
- Rewrite login tests with Better Auth
- Add session validation tests (`auth.api.getSession()`)
- Add session expiration tests (DeterministicTime)
- Add concurrent session tests

**Day 10: Password Reset Tests**
- Rewrite with Better Auth patterns
- Add user enumeration protection test
- Add expired token tests (DeterministicTime)
- Add session invalidation test

### Week 3: Security & Integration

**Days 11-12: Account Security**
- Account lockout tests (DeterministicTime for timing)
- Rate limiting tests (login, password reset)
- Brute force protection tests
- User enumeration protection

**Days 13-14: API Key Validation**
- API key generation tests
- API key verification tests (argon2id hashing)
- Expired/revoked API key tests
- Rate limiting tests

**Day 15: Organization RBAC**
- Role-based access tests
- Organization membership tests
- Admin permission tests
- IP-safety review

### Week 4: Verification & Documentation

**Days 16-17: Integration Tests**
- End-to-end auth flow tests
- Database transaction rollback tests
- Redis failover tests
- Email service integration tests

**Days 18-19: Coverage & Cleanup**
- Run coverage report (target: 85%+)
- Fix any gaps in happy/sad/edge/error coverage
- Clean up old mock-based tests
- Update test documentation

**Day 20: Final Review**
- IP-safety audit (OSS compliance)
- 2025 standards compliance check
- Performance profiling (<100ms per test)
- Final coverage report

---

## ✅ Success Criteria

### Coverage Metrics
- ✅ 85%+ line coverage (from 55%)
- ✅ 100% critical path coverage (registration, login, session)
- ✅ 100% error scenario coverage (DB down, network failure)
- ✅ 0 FIX-flagged tests (from 29)

### Quality Metrics
- ✅ All tests use Better Auth `getTestInstance()`
- ✅ All tests follow `{ data, error }` response pattern
- ✅ All tests use TestCleanupManager for resource cleanup
- ✅ All timing tests use DeterministicTime (no flakiness)
- ✅ All tests pass 100 consecutive runs (0% flakiness)

### 2025 Standards Compliance
- ✅ File naming: `[feature].test.ts`, `.integration.test.ts`
- ✅ Test naming: "should [verb] [result] when [condition]"
- ✅ Feature-based organization (not file-structure-based)
- ✅ BDD-inspired describe blocks (max 3 levels)
- ✅ MSW handlers feature-specific with helper functions

### IP-Safety (OSS Compliance)
- ✅ No subscription/tier logic in tests
- ✅ No PostHog event names
- ✅ No Stripe integration patterns
- ✅ No database schema details
- ✅ Generic test identifiers only (`test@example.com`, `user_test123`)
- ✅ Passes Lefthook `ip-guard` scan

---

## 📚 References

### Better Auth
- Testing Guide: https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/reference/contributing.mdx
- Error Handling: https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/concepts/client.mdx
- Session Management: https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/plugins/mcp.mdx

### OWASP 2025
- Authentication Testing: https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/04-Authentication_Testing/
- A07:2025 Auth Failures: https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/

### SnapBack Standards
- Test Infrastructure: `builder_pack/test-infrastructure-patterns.md`
- Code Review Standards: `builder_pack/code-review-standards.md`
- Phase 1 Analysis: `PHASE1_TEST_ANALYSIS.md`

---

## 🎯 DTS Optimization Results (COMPLETED)

### ✅ Successfully Migrated (5 packages)

**Config applied:**
```typescript
dts: {
  resolve: true, // Resolves workspace:* dependencies
  compilerOptions: {
    composite: false,
    incremental: false,
    rootDir: undefined, // Allow workspace deps outside rootDir
  },
}
```

**Packages:**
1. ✅ **@snapback/testing** - 1.5s DTS generation (was: N/A, newly created)
2. ✅ **@snapback/events** - 540ms DTS generation (was: part of 2-step build)
3. ✅ **@snapback/config** - 1.4s DTS generation (was: part of 2-step build)
4. ✅ **@snapback/sdk** - 1.2s DTS generation (was: part of 2-step build)
5. ✅ **@snapback/infrastructure** - 1.8s DTS generation (was: part of 2-step build)

**Build Time Savings:**
- **Per build:** ~5-10 seconds saved (no `tsc --build --force`)
- **Daily impact:** 40-60 min across team (estimated 20 builds/day)
- **CI/CD:** ~2-3 min faster per pipeline run

### ❌ Could Not Migrate (2 packages)

**1. @snapback/auth** - Reverted to old system
- **Error:** `"Session" is not exported by "src/index.ts"`
- **Root cause:** Complex internal structure with circular references
- **Status:** Keeping `dts: false` + `tsc --build --force`
- **Future fix:** Requires refactoring auth package structure

**2. @snapback/core** - Reverted to old system
- **Error:** `Error parsing: utils/logger.ts:1:0`
- **Root cause:** Parsing error in logger utility
- **Status:** Keeping `dts: false`
- **Future fix:** Requires investigating logger.ts structure

### 🔮 Not Tested

**@snapback/platform** - Skipped (known pg-types circular dependency issue)

### 📊 ROI Achievement

**Actual Results:**
- ✅ **5 packages improved** (62.5% of packages tested)
- ✅ **Single-step builds** for 5 packages
- ✅ **Faster DTS generation** (tsup vs tsc)
- ✅ **Proven solution** for future packages

**Next Steps:**
- Monitor build times in CI to confirm savings
- Fix auth/core package structure in future refactoring
- Apply this pattern to new packages by default

---

## 🚀 Build System Optimization (ARCHIVED - SEE RESULTS ABOVE)

### Problem: DTS Generation Disabled Across Monorepo

**Current State:** 8+ packages have `dts: false` in `tsup.config.ts`:
```typescript
dts: false, // Disabled due to monorepo path constraints
```

**Build Script Workaround:**
```json
"build": "tsup && tsc --build --force"
```
- Step 1: TSUP bundles JS (fast)
- Step 2: TSC generates DTS (slow, handles project references)

**Issues:**
- Slow builds (TSC is much slower than TSUP)
- Two-step process adds complexity
- Inconsistent across packages
- Higher CI/CD time

### Solution: Enable `dts.resolve` (PROVEN)

**Discovery:** `packages/policy-engine` successfully uses:
```typescript
dts: {
  resolve: true,  // Resolves workspace:* dependencies
}
```

**Proof:** policy-engine has 8 workspace dependencies and builds successfully:
```json
"dependencies": {
  "@snapback/auth": "workspace:*",
  "@snapback/config": "workspace:*",
  "@snapback/contracts": "workspace:*",
  "@snapback/core": "workspace:*",
  "@snapback/events": "workspace:*",
  "@snapback/infrastructure": "workspace:*",
  "@snapback/integrations": "workspace:*",
  "@snapback/platform": "workspace:*"
}
```

**Build Script:**
```json
"build": "tsup"  // Single step!
```

### Migration Plan (Phased Rollout)

**Phase 1: Low-Risk Packages (Week 1)**

Test on packages with minimal workspace dependencies:

1. **analytics** (already has `dts: true`) ✅
2. **testing** - Update config:
   ```typescript
   dts: {
     resolve: true,
   }
   ```
3. **events** - Update and test
4. **config** - Update and test

**Validation:**
```bash
pnpm build --filter @snapback/testing
pnpm type-check --filter @snapback/testing
```

**Phase 2: Complex Packages (Week 2)**

After Phase 1 success, update:

5. **auth** - Critical auth package
6. **core** - Core snapshot logic
7. **sdk** - Public SDK
8. **infrastructure** - Logging, observability

**For each package:**
```diff
// tsup.config.ts
- dts: false, // Disabled due to monorepo path constraints
+ dts: {
+   resolve: true,
+ }
```

```diff
// package.json
- "build": "tsup && tsc --build --force"
+ "build": "tsup"
```

**Phase 3: Platform Package (Week 3)**

Special case - has circular dependency issue:

9. **platform** - Test carefully due to `pg-types` circular dependency

**If circular dependency persists:**
```typescript
dts: {
  resolve: true,
  // Skip problematic modules if needed
  compilerOptions: {
    skipLibCheck: true,
  }
}
```

### ROI Analysis

**Benefits:**
- ⚡ **50-70% faster builds** (tsup vs tsc for DTS generation)
- 🔧 **Simpler build scripts** (one step instead of two)
- 📦 **Better DTS bundling** (tsup can bundle/merge declarations)
- 🎯 **Consistent configuration** across all packages
- ⏱️ **Reduced CI/CD time** (cumulative effect across all packages)
- 🧹 **Less maintenance** (no more "why is tsc needed?" questions)

**Costs:**
- ⏰ **~2-3 hours** to update configs and test
- 🧪 **Low risk** (policy-engine proves it works)
- 🔄 **Easy rollback** (just revert to `dts: false`)

**Impact:**
- 8 packages × 30 sec saved per build = 4 min saved locally
- In CI with parallel builds: ~2-3 min saved per pipeline run
- With 20 builds/day across team: **40-60 min saved daily**

### Rollback Plan

If any package fails:

```typescript
// Immediate rollback
dts: false,
```

```json
"build": "tsup && tsc --build --force"
```

### Success Criteria

- ✅ All packages build successfully with `dts: { resolve: true }`
- ✅ Type checking passes: `pnpm type-check`
- ✅ No breaking changes in generated `.d.ts` files
- ✅ Build time reduced by 30%+ for affected packages
- ✅ All tests still pass

---

**Status:** ✅ READY FOR IMPLEMENTATION
**Priority:**
1. **HIGH:** DTS optimization (affects 8+ packages, high ROI)
2. **HIGH:** Delete compiled test files (cleanup)
3. **MEDIUM:** Begin Week 1 Day 1 (MSW Handler Creation)

**Recommended Order:**
1. Fix DTS generation first (improves all future builds)
2. Clean up compiled test files
3. Then proceed with auth test rewrite strategy
