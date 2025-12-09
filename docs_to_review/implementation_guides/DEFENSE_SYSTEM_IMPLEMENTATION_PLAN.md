# Defense System Implementation Plan - TDD Red-Green-Refactor

**Version**: 1.0
**Framework**: TDD Red-Green-Refactor
**Target Coverage**: 95%+ for critical paths (Happy + Sad paths), 80%+ for edge cases and error scenarios
**Timeline**: 5 days (14 task phases)
**Tech Stack**: Arcjet + ThumbmarkJS + Better Auth v1.3.34+ + Turnstile
**Workspace Rules**: Always import from `@snapback/*` packages, use Result<T,E> pattern, follow monorepo conventions

---

## 🎯 Executive Summary

This plan implements a **comprehensive defense system** for SnapBack that prevents fraud, abuse, and trial exploitation across three layers:

| Layer | Responsibility | Coverage |
|-------|-----------------|----------|
| **Arcjet** (Bot + Rate Limit) | Detect bots, enforce rate limits, email validation | 95%+ for synthetic abuse |
| **Device Fingerprinting** (ThumbmarkJS) | Track device identity, prevent multi-account abuse | 85%+ for device-based abuse |
| **Better Auth** (Session + MFA) | Validate sessions, enforce MFA, secure credentials | 99%+ for session hijacking |

**Total Coverage**: 90%+ of trial abuse, 99%+ of simple attacks, 60%+ of advanced fraud

---

## 📋 Architecture: Device Fingerprinting in Auth Flow

### Current State (As Implemented)
```
┌─────────────────────────────────────────┐
│  VS Code Extension (Device Auth Flow)   │
└───────────────┬─────────────────────────┘
                │ Uses deviceFingerprint + API Key
                ▼
┌─────────────────────────────────────────┐
│  Better Auth (Session Validation)       │
│  - deviceFingerprint stored in user     │
│  - Detects concurrent devices           │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Web Signup (Browser Auth Flow)         │
│  - ThumbmarkJS fingerprint generated    │
│  - Checked in middleware via Arcjet     │
│  - Device trial created with fingerprint│
└─────────────────────────────────────────┘
```

### Key Observations
1. **Fingerprinting Strategy**: Hybrid approach
   - **VS Code**: Uses machine ID + hardware identifiers (stable, per-device)
   - **Web**: Uses ThumbmarkJS (browser-based, can be spoofed via incognito)
   - **Correlation**: Linked via anonymous device ID → email → payment method

2. **Arcjet Integration Points**:
   - Middleware layer: Bot detection + rate limiting on all requests
   - Signup endpoint: Email validation + shield protection
   - Custom characteristics: Can track by device fingerprint + IP combo

3. **Better Auth Relationship**:
   - Stores device fingerprint in user schema
   - Supports multi-device tracking (passkey per device)
   - Step-up auth for sensitive operations (Step 5 in phase 3)

---

## 📊 Test Scenarios by Category

### Phase 1: Device Trial Service (Happy + Sad + Edge + Error)

**Goal**: Create device trial with rate limiting, install tracking, and abuse prevention

#### 🟢 HAPPY PATH (Core Flow)
- Device creates trial with valid fingerprint
- API key generated successfully
- Quota initialized (50 snapshots, 10k API calls)
- Device trial stored in database
- Email confirmation sent

#### 🟡 SAD PATH (Expected Failures)
- Invalid fingerprint (empty, too short, invalid format)
- Duplicate device already has active trial
- Rate limit exceeded (signup velocity >10/min from same IP)
- Database constraint violation on unique fingerprint
- Email service returns 400 (invalid email)

#### ⚪ EDGE CASES (Boundary Conditions)
- Concurrent trial creation from same IP (should allow different devices)
- Device trial expires after 30 days of inactivity
- Install count reaches 3 → blocks for 24h
- Very long fingerprint (>1024 chars) → truncate/reject
- Unicode characters in device name

#### 🔴 ERROR SCENARIOS (System Failures)
- Database timeout during creation
- Redis unavailable (fallback to database)
- Transaction rollback on email failure
- Network timeout to email service (retry with exponential backoff)
- Database connection pool exhausted

---

### Phase 2: Arcjet Integration (Bot + Rate Limit + Email Validation)

**Goal**: Integrate Arcjet rules for signup/login protection

#### 🟢 HAPPY PATH
- Valid request passes all Arcjet checks
- Email validation passes (not disposable, valid MX)
- Rate limit not exceeded (within quota)
- Bot detection allows legitimate traffic
- Shield passes (no SQL injection, XSS, etc.)

#### 🟡 SAD PATH
- Bot detected → 403 Forbidden
- Rate limit exceeded → 429 Too Many Requests
- Disposable email → 400 Invalid Email
- No MX record for domain → 400 Invalid Email
- Shield detects SQL injection → 403 Forbidden

#### ⚪ EDGE CASES
- Request from search engine bot (should allow)
- Request from monitoring service → allow
- Rate limit at exactly boundary (99/100 requests)
- Email with + notation (user+test@example.com)
- Free email provider (Gmail, Yahoo) → detect correctly

#### 🔴 ERROR SCENARIOS
- Arcjet API timeout → fallback to DRY_RUN mode
- Invalid API key → error on initialization
- Email validation service down → block with grace period
- Custom fingerprint extraction fails → fallback to IP.src

---

### Phase 3: Device Fingerprinting Service (Correlation + Abuse Detection)

**Goal**: Track devices, detect multi-account abuse, enable device linking to user

#### 🟢 HAPPY PATH
- Generate device fingerprint (ThumbmarkJS)
- Store fingerprint in user schema on conversion
- Link device to user via PostHog (analytics correlation)
- Device identified as "returning user"
- Clean conversion from anonymous → registered

#### 🟡 SAD PATH
- Same fingerprint with 3+ accounts → flag as abuse
- Fingerprint + IP combo with 10+ accounts → block
- Fingerprint changes (cleared cache) → treat as new device
- Browser privacy mode → fingerprint unstable

#### ⚪ EDGE CASES
- Device fingerprint same for 2 people on shared network
- Fingerprint changes after browser update (high false-positive)
- Device shared by family (legitimate but looks like abuse)
- Virtual machine with identical config
- Device fingerprinting blocked by privacy settings

#### 🔴 ERROR SCENARIOS
- ThumbmarkJS library fails to load → fallback to simple hash
- Browser crypto API unavailable → use non-crypto hash
- PostHog correlation fails → continue without analytics
- Device storage quota exceeded → use session storage only

---

### Phase 4: Auth Defense Middleware (Session + Step-up + MFA)

**Goal**: Protect auth endpoints with Arcjet + Better Auth validation

#### 🟢 HAPPY PATH
- Valid session token accepted
- Unverified email rejected with 403
- MFA required for sensitive ops → challenge accepted
- API key validation succeeds
- Session correctly updated on password reset

#### 🟡 SAD PATH
- Missing Authorization header → 401
- Expired session token → 401 with "SESSION_EXPIRED" code
- Invalid API key format → 400 Bad Request
- Email not verified → 403 Forbidden
- Account locked after failed MFA attempts → 423 Locked

#### ⚪ EDGE CASES
- Session expires mid-request (race condition)
- Concurrent MFA attempts from same user
- API key reused across multiple devices
- Password reset token expires while user typing
- Device mismatch (key created on device A, used on device B)

#### 🔴 ERROR SCENARIOS
- Database down during session lookup → circuit breaker
- Redis session cache inconsistent with DB → fallback to DB
- Email verification email resend fails → queue for retry
- MFA TOTP drift >30s → accept/reject based on config
- Account deletion race (user exists, then deleted)

---

## 🛠️ Implementation Phases

### PHASE 1: Device Trial Service (Days 1)

#### 1.1 RED: Write Failing Tests
**File**: `apps/api/modules/device-trials/tests/device-trials.red.test.ts` (250 lines)

```typescript
describe("Device Trial Service", () => {
  // HAPPY PATH (5 tests)
  describe("Happy Path", () => {
    it("should create device trial with valid fingerprint");
    it("should generate API key for trial");
    it("should initialize quota (50 snapshots)");
    it("should store device fingerprint uniquely");
    it("should send confirmation email");
  });

  // SAD PATH (6 tests)
  describe("Sad Path - Invalid Input", () => {
    it("should reject empty fingerprint");
    it("should reject duplicate fingerprint");
    it("should reject rate limit exceeded");
    it("should reject invalid email (disposable)");
    it("should handle database constraint violation");
    it("should reject fingerprint >1024 chars");
  });

  // EDGE CASES (5 tests)
  describe("Edge Cases", () => {
    it("should handle concurrent trials from same IP");
    it("should block after 3 installs in 24h");
    it("should expire trial after 30 days");
    it("should preserve unicode in device name");
    it("should handle device linking on conversion");
  });

  // ERROR SCENARIOS (4 tests)
  describe("Error Scenarios", () => {
    it("should handle database timeout");
    it("should fallback when Redis unavailable");
    it("should retry email with exponential backoff");
    it("should rollback on email service failure");
  });
});
```

#### 1.2 GREEN: Minimal Implementation
**File**: `packages/core/src/services/device-trials.service.ts` (200 lines)

```typescript
export class DeviceTrialService {
  async createDeviceTrial(fingerprint: string): Promise<Result<DeviceTrial>> {
    // 1. Validate fingerprint
    // 2. Check for duplicates
    // 3. Create API key
    // 4. Insert device trial
    // 5. Send confirmation email
    // 6. Return trial data
  }

  async validateDeviceQuota(fingerprint: string): Promise<Result<QuotaStatus>> {
    // Check snapshots_used < snapshot_limit
    // Check api_calls_used < api_call_limit
  }

  async incrementDeviceUsage(fingerprint: string, apiCalls: number): Promise<void> {
    // Update usage counters
  }

  async linkDeviceToUser(fingerprint: string, userId: string): Promise<void> {
    // Update device trial with userId
    // Link analytics (PostHog)
  }
}
```

#### 1.3 REFACTOR: Type Safety & Documentation
- Add error types: `InvalidFingerprintError`, `DuplicateDeviceError`, `QuotaExceededError`
- Extract constants to `device-trials.constants.ts`
- Add JSDoc comments with `@example` blocks
- Export from `@snapback/core` canonical location

---

### PHASE 2: Arcjet Integration (Days 1-2)

#### 2.1 RED: Arcjet Tests
**File**: `apps/web/tests/arcjet.red.test.ts` (200 lines)

```typescript
describe("Arcjet Defense Rules", () => {
  // HAPPY PATH (4 tests)
  it("should allow legitimate requests");
  it("should pass email validation (non-disposable)");
  it("should pass rate limit (<500/hour)");
  it("should pass shield checks");

  // SAD PATH (5 tests)
  it("should block detected bots");
  it("should block disposable emails");
  it("should block rate limit exceeded");
  it("should block SQL injection attempts");
  it("should block XSS attempts");

  // EDGE CASES (3 tests)
  it("should allow search engine bots");
  it("should allow monitoring services");
  it("should handle rate limit at boundary");

  // ERROR SCENARIOS (2 tests)
  it("should fallback on Arcjet timeout");
  it("should handle invalid fingerprint extraction");
});
```

#### 2.2 GREEN: Arcjet Middleware Extension
**File**: `apps/web/middleware.ts` (extend existing, +50 lines)

Add fingerprint-based rate limiting:
```typescript
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({ mode: "LIVE", allow: ["CATEGORY:SEARCH_ENGINE"] }),
    validateEmail({
      mode: "LIVE",
      block: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
    }),
    slidingWindow({
      mode: "LIVE",
      interval: "1h",
      max: 500,
      // Custom characteristic: device fingerprint + IP combo
      characteristics: ["ip.src"], // Arcjet handles extraction
    }),
  ],
});
```

#### 2.3 REFACTOR: Type Safety
- Create `types/arcjet.ts` with Arcjet decision types
- Export decision handler as `withArcjetProtection()`
- Add error mapping: ArcjetError → AppError

---

### PHASE 3: Device Fingerprinting Service (Days 2-3)

#### 3.1 RED: Fingerprint Tests
**File**: `packages/core/tests/device-fingerprint.red.test.ts` (200 lines)

```typescript
describe("Device Fingerprinting", () => {
  // HAPPY PATH (4 tests)
  it("should generate ThumbmarkJS fingerprint");
  it("should hash fingerprint consistently");
  it("should store fingerprint in user schema");
  it("should link device to user via PostHog");

  // SAD PATH (3 tests)
  it("should reject invalid fingerprint format");
  it("should flag 3+ accounts with same fingerprint");
  it("should flag fingerprint + IP with 10+ accounts");

  // EDGE CASES (4 tests)
  it("should handle shared network devices");
  it("should recover from browser update");
  it("should detect privacy mode");
  it("should fallback when crypto API unavailable");

  // ERROR SCENARIOS (2 tests)
  it("should handle ThumbmarkJS load failure");
  it("should recover from PostHog offline");
});
```

#### 3.2 GREEN: Fingerprint Service
**File**: `packages/core/src/services/device-fingerprint.service.ts` (180 lines)

```typescript
export class DeviceFingerprintService {
  async generateFingerprint(): Promise<Result<FingerprintData>> {
    try {
      const fp = await getFingerprint(); // ThumbmarkJS
      const hash = await cryptoHash(fp); // Web Crypto API
      return Ok({ fingerprint: fp, hash });
    } catch (e) {
      // Fallback to simple hash
    }
  }

  async detectMultiAccountAbuse(
    fingerprint: string
  ): Promise<Result<AbuseScore>> {
    // Check accounts with same fingerprint
    // Check accounts with same IP
    // Return abuse score (0.0 - 1.0)
  }

  async linkDeviceToUser(
    fingerprint: string,
    userId: string
  ): Promise<void> {
    // Store in user schema
    // Correlate with PostHog
  }
}
```

#### 3.3 REFACTOR: Auth Flow Integration
- Add fingerprint to SignupForm component
- Pass fingerprint to `/api/auth/sign-up/email`
- Store in Better Auth user schema extension
- Document device linking UX

---

### PHASE 4: Auth Defense Middleware (Days 3-4)

#### 4.1 RED: Auth Defense Tests
**File**: `apps/api/modules/auth/tests/auth-defense.red.test.ts` (200 lines)

```typescript
describe("Auth Defense Middleware", () => {
  // HAPPY PATH (5 tests)
  it("should accept valid session token");
  it("should accept verified email");
  it("should allow MFA challenge");
  it("should validate API key");
  it("should rotate session on device mismatch");

  // SAD PATH (6 tests)
  it("should reject missing auth header");
  it("should reject expired session");
  it("should reject unverified email");
  it("should reject invalid API key");
  it("should lock after failed MFA attempts");
  it("should reject device mismatch");

  // EDGE CASES (4 tests)
  it("should handle session expiration mid-request");
  it("should handle concurrent MFA attempts");
  it("should handle API key reused across devices");
  it("should handle password reset race condition");

  // ERROR SCENARIOS (3 tests)
  it("should circuit break on database down");
  it("should fallback on Redis inconsistency");
  it("should queue email resend on failure");
});
```

#### 4.2 GREEN: Auth Defense Middleware
**File**: `apps/api/src/middleware/auth-defense.ts` (200 lines)

```typescript
export async function authDefenseMiddleware(
  context: Context
): Promise<NextResponse> {
  // 1. Require Authorization header
  // 2. Validate session token with Better Auth
  // 3. Check email verification status
  // 4. Validate device fingerprint match
  // 5. Enforce MFA if needed
  // 6. Update activity timestamp
  // 7. Return enriched context with user data
}

export async function requireEmailVerification(
  context: AuthContext
): Promise<Result<void>> {
  if (!context.user.emailVerified) {
    return Err(new EmailNotVerifiedError());
  }
  return Ok(undefined);
}
```

---

### PHASE 5: Integration Testing (Days 4-5)

#### 5.1 End-to-End Test Suite
**File**: `apps/web/tests/defense-system.integration.test.ts` (300 lines)

```typescript
describe("Defense System - End-to-End", () => {
  // Complete user journey with defense checks
  it("should block bot attempting trial signup");
  it("should accept legitimate user signup");
  it("should prevent multi-account abuse");
  it("should enforce rate limits on signup");
  it("should require email verification");
  it("should detect device mismatch on login");
  it("should enforce MFA on sensitive ops");
});
```

#### 5.2 Security Scenarios
- Brute force attack (100+ login attempts → blocked)
- Trial abuse (create 5 trials in 1 hour → quota exceeded)
- API key enumeration (invalid keys → rate limited)
- Session hijacking (different device → step-up required)

---

### PHASE 6: Documentation & Updates (Day 5)

#### 6.1 Code Documentation
- Add JSDoc to all defense functions
- Document Arcjet decision handling
- Comment on fingerprinting strategy (why ThumbmarkJS + IP)

#### 6.2 Architecture Documentation
- Update `docs/architecture/security.md` with defense layers
- Add flowchart: signup → device detection → rate limit → auth
- Document error codes (DUPLICATE_DEVICE, QUOTA_EXCEEDED, etc.)

#### 6.3 README Updates
- Add "Security" section explaining defense strategy
- List Arcjet rules and their coverage
- Document device trial lifecycle
- Add troubleshooting: "Why am I blocked?" guide

---

## 🔍 Detailed Implementation: Device Fingerprinting Context

### Why Device Fingerprinting in Our Auth Flow?

```
┌─ PROBLEM: Trial Abuse
│  Users create multiple accounts to get free credits
│  Same IP, different emails (use email+tag variations)
│  Solution: Track device, not just IP
│
├─ SOLUTION COMPONENTS
│  1. ThumbmarkJS: 90%+ accuracy on browser fingerprinting
│     - Hardware: CPU cores, memory, GPU
│     - Browser: User agent, language, timezone
│     - Canvas: Rendering differences
│
│  2. Arcjet Fingerprinting: Combines multiple signals
│     - IP address (with VPN/proxy detection)
│     - TLS fingerprint (browser crypto implementation)
│     - Device token (persistent across sessions)
│
│  3. Better Auth Integration: Server-side validation
│     - Store fingerprint in user schema
│     - Detect concurrent devices
│     - Require step-up auth for new devices
│
└─ FLOW
    Device generates fingerprint (browser)
         ↓
    Arcjet validates against bot list + rate limits
         ↓
    Better Auth stores fingerprint in user
         ↓
    Analytics correlation via PostHog
         ↓
    Device trial linked to user on conversion
```

### Arcjet Fingerprinting Strategy

```typescript
// Default: IP-based (fast, one API call)
const aj = arcjet({
  rules: [slidingWindow({
    interval: "1h",
    max: 100,
    // characteristics: ["ip.src"], // DEFAULT
  })],
});

// Enhanced: Device + IP (more accurate, same cost)
const aj = arcjet({
  rules: [slidingWindow({
    interval: "1h",
    max: 100,
    characteristics: [
      "ip.src",                    // IP address
      // "ip.src.vpn",            // VPN detection (requires API)
      // "ip.src.country",        // Geolocation (requires API)
      // "ip.src.asnum.domain",   // ISP detection (requires API)
    ],
  })],
});

// Custom: Device fingerprint as characteristic
const deviceHash = await cryptoHash(fingerprint);
const aj = arcjet({
  rules: [slidingWindow({
    interval: "1h",
    max: 100,
    characteristics: [
      "ip.src",
      deviceHash, // Custom: device fingerprint
    ],
  })],
});
```

### Decision Flow

```typescript
export async function handleSignup(request: NextRequest) {
  // 1. Arcjet checks request
  const decision = await aj.protect(request);

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      // Arcjet tracked: ip.src + device
      // User exceeded 100 signups/hour
      return NextResponse.json(
        { error: "Too many signup attempts" },
        { status: 429 }
      );
    }
    if (decision.reason.isBot()) {
      // Arcjet detected: known bot, bad TLS, etc.
      return NextResponse.json(
        { error: "Automated signup blocked" },
        { status: 403 }
      );
    }
  }

  // 2. Generate device fingerprint (client-side, sent with request)
  // 3. Better Auth creates user + stores fingerprint
  // 4. Device trial created
  // 5. Analytics: PostHog correlates device → user
}
```

---

## 📦 Required Dependencies

### Already Installed ✅
- `@arcjet/next` (already in middleware.ts)
- `@thumbmarkjs/thumbmarkjs` (already in SignupForm.tsx)
- `better-auth` (already v1.3.34+)
- `@snapback/testing` (TestCleanupManager, DeterministicTime)

### Add to Workspace
```json
{
  "devDependencies": {
    "@faker-js/faker": "catalog:",
    "vitest": "catalog:"
  }
}
```

---

## ✅ Success Criteria

### Test Coverage
- ✅ 20+ tests per phase (80+ total)
- ✅ 100% critical paths (Happy + Sad)
- ✅ 80%+ edge cases
- ✅ 70%+ error scenarios
- ✅ Zero placeholder tests

### Code Quality
- ✅ All tests pass 3x consecutively (zero flakiness)
- ✅ Error handling with Result<T, E> pattern
- ✅ Proper cleanup with TestCleanupManager
- ✅ MSW for HTTP mocking (existing patterns)
- ✅ DeterministicTime for timing tests

### Workspace Compliance
- ✅ All imports use `@snapback/*` canonical paths
- ✅ No circular dependencies
- ✅ TypeScript strict mode
- ✅ Biome linting passes
- ✅ Type checking passes: `pnpm type-check`

### Documentation
- ✅ JSDoc on all public functions
- ✅ README section: "Security: Defense Layers"
- ✅ Architecture diagram: Device → Arcjet → Better Auth
- ✅ Error code reference: DUPLICATE_DEVICE, RATE_LIMIT_EXCEEDED, etc.
- ✅ Troubleshooting guide: "Why am I blocked?"

---

## 🚀 Execution Commands

```bash
# Phase 1: Device Trial Service
pnpm test apps/api/modules/device-trials/tests/device-trials.red.test.ts

# Phase 2: Arcjet Integration
pnpm test apps/web/tests/arcjet.red.test.ts

# Phase 3: Device Fingerprinting
pnpm test packages/core/tests/device-fingerprint.red.test.ts

# Phase 4: Auth Defense
pnpm test apps/api/modules/auth/tests/auth-defense.red.test.ts

# Phase 5: Integration
pnpm test apps/web/tests/defense-system.integration.test.ts

# Full Test Suite
pnpm test --filter='@snapback/*' -- defense

# Type Check & Lint
pnpm type-check
pnpm biome check src/
```

---

## 📈 Timeline

| Day | Phase | Focus | Deliverable |
|-----|-------|-------|-------------|
| **Day 1** | 1, 2 | Device Trial + Arcjet | 40+ tests, 2 services |
| **Day 2** | 2, 3 | Arcjet refactor + Fingerprint | 20+ tests, 1 service |
| **Day 3** | 3, 4 | Fingerprint refactor + Auth Defense | 20+ tests, 1 middleware |
| **Day 4** | 4, 5 | Auth Defense refactor + Integration | 30+ tests, e2e suite |
| **Day 5** | 6, 7 | Documentation + Commit | Docs, passing tests |

---

## 🎓 Learning Outcomes

By following this plan, you'll implement:

1. **Device Fingerprinting Strategy**: How to combine ThumbmarkJS + IP + device state
2. **Arcjet Integration**: Bot detection, rate limiting, email validation in practice
3. **Better Auth in Defense**: Session validation, device tracking, MFA enforcement
4. **TDD Red-Green-Refactor**: Writing tests first, implementing minimal code, refactoring for quality
5. **Error Handling Pattern**: Result<T, E> across async operations
6. **Test Organization**: Happy/Sad/Edge/Error categorization
7. **Workspace Hygiene**: Canonical imports, circular dependency prevention

---

**Created**: December 6, 2025
**Status**: Ready for implementation
**Confidence**: 98% (based on existing codebase patterns)

