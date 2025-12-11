Looking at your status document and cross-referencing with the feature breakdown, here's a precise gap analysis for the auth flow:

---

## Auth Flow Gap Analysis

### The Critical Path (What Blocks Everything)

```
User clicks "Authenticate" in VS Code
         ↓
    [MISSING: Button UI]
         ↓
Extension calls POST /api/auth/device/code
         ↓
    [MISSING: Endpoint returns real device code]
         ↓
User opens browser to /auth/device?code=XXXX
         ↓
    [MISSING: Web page to enter/approve code]
         ↓
Extension polls POST /api/auth/device/token
         ↓
    [MISSING: Returns API key on approval]
         ↓
Extension stores key in context.secrets
         ↓
    [MISSING: E2E wiring]
```

---

## Exact Missing Pieces

### 1. VS Code Extension UI (F3.1 partial)

**Files to create/modify:**
```
apps/vscode/src/commands/authenticateCommand.ts  [CREATE]
apps/vscode/src/views/AuthStatusBar.ts           [CREATE]
apps/vscode/package.json                          [ADD command registration]
```

**What's needed:**
| Component | Status | Work Required |
|-----------|--------|---------------|
| Command: `snapback.authenticate` | ❌ Missing | Register command, trigger device flow |
| Status bar item | ❌ Missing | Show auth state (authenticated/not) |
| "Open Browser" action | ❌ Missing | `vscode.env.openExternal(verificationUri)` |
| User code display | ❌ Missing | Show code prominently while polling |
| Polling progress indicator | ❌ Missing | Status bar or notification |

**Estimated effort:** 4-6 hours

---

### 2. Device Auth Endpoints (RFC 8628)

**Files to create:**
```
apps/web/app/api/auth/device/code/route.ts    [CREATE]
apps/web/app/api/auth/device/token/route.ts   [CREATE]
packages/api/modules/auth/device-auth.ts       [CREATE]
packages/platform/src/db/schema/device-codes.ts [CREATE]
```

**Endpoint specifications:**

```typescript
// POST /api/auth/device/code
// Request: { client_id: string, scope?: string }
// Response:
{
  device_code: string;      // 40-char random, stored hashed
  user_code: string;        // 8-char human-readable (XXXX-XXXX)
  verification_uri: string; // "https://console.snapback.dev/auth/device"
  verification_uri_complete: string; // With code pre-filled
  expires_in: 900;          // 15 minutes
  interval: 5;              // Polling interval in seconds
}

// POST /api/auth/device/token
// Request: { device_code: string, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }
// Response (pending):
{ error: "authorization_pending" }
// Response (approved):
{
  access_token: string;  // The API key (sk_live_...)
  token_type: "Bearer";
  expires_in: number;
  user_id: string;
  tier: "free" | "pro";
}
// Response (denied/expired):
{ error: "access_denied" | "expired_token" }
```

**Database schema needed:**
```sql
CREATE TABLE device_codes (
  id TEXT PRIMARY KEY,
  device_code_hash TEXT NOT NULL UNIQUE,
  user_code TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  scope TEXT,
  user_id TEXT REFERENCES "user"(id),  -- NULL until approved
  status TEXT DEFAULT 'pending',        -- pending | approved | denied | expired
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_device_codes_user_code ON device_codes(user_code);
```

**Estimated effort:** 8-10 hours

---

### 3. Web UI for Code Entry (F3.1 partial)

**Files to create:**
```
apps/web/app/(auth)/auth/device/page.tsx       [CREATE]
apps/web/app/(auth)/auth/device/approve/route.ts [CREATE]
```

**Page flow:**
```
/auth/device
├── If not logged in → Redirect to /login?redirect=/auth/device
├── If no code param → Show input form for user_code
├── If code param → Pre-fill and show "Approve this device?" prompt
└── On approve → Update device_code status, redirect to success
```

**UI requirements:**
- Large, clear code input (XXXX-XXXX format)
- Device info display (if available)
- "Approve" / "Deny" buttons
- Success confirmation with "Return to VS Code" message
- Error states: expired code, invalid code, already used

**Estimated effort:** 4-6 hours

---

### 4. Token Storage in Extension (F3.3)

**Current state:** `DeviceAuthFlow.ts` exists but doesn't persist to `context.secrets`

**What's needed:**
```typescript
// apps/vscode/src/auth/TokenManager.ts
export class TokenManager {
  constructor(private secrets: vscode.SecretStorage) {}

  async storeApiKey(key: string): Promise<void> {
    await this.secrets.store('snapback.apiKey', key);
  }

  async getApiKey(): Promise<string | undefined> {
    return this.secrets.get('snapback.apiKey');
  }

  async clearApiKey(): Promise<void> {
    await this.secrets.delete('snapback.apiKey');
  }

  async hasValidKey(): Promise<boolean> {
    const key = await this.getApiKey();
    if (!key) return false;
    // Validate against API
    return this.validateKey(key);
  }
}
```

**Integration points:**
- On successful device auth → `tokenManager.storeApiKey(apiKey)`
- On extension activation → `tokenManager.hasValidKey()` → set auth state
- On logout command → `tokenManager.clearApiKey()`

**Estimated effort:** 2-3 hours

---

### 5. E2E Integration Wiring

**Missing integration test:**
```typescript
// e2e/auth/device-auth-flow.e2e.test.ts
describe('Device Auth E2E', () => {
  it('complete flow: button → code → approve → stored', async () => {
    // 1. Trigger authenticate command in extension
    // 2. Capture device_code and user_code from response
    // 3. Simulate user visiting /auth/device?code=XXXX
    // 4. Simulate clicking "Approve"
    // 5. Verify extension receives API key
    // 6. Verify key stored in secrets
    // 7. Verify subsequent API calls work
  });
});
```

**Estimated effort:** 4-6 hours

---

## Priority Order for Implementation

```
Week 1: Core Flow (Must Have for Demo)
├── Day 1-2: Device auth endpoints (POST /code, POST /token)
├── Day 2-3: Database schema + approval logic
├── Day 3-4: Web UI for code entry/approval
├── Day 4-5: VS Code button + status bar
└── Day 5: Token storage integration

Week 2: Hardening
├── Error handling (network failures, timeouts)
├── Rate limiting on endpoints
├── Telemetry events
├── E2E tests
└── Documentation
```

---

## What's Actually Solid (Don't Touch)

| Component | Status | Notes |
|-----------|--------|-------|
| `auth.api.verifyApiKey()` | ✅ Working | MCP + CLI use this |
| Better Auth session management | ✅ Working | Sign in/out/OAuth |
| API key generation (`POST /keys`) | ✅ Working | Just needs device flow to call it |
| `DeviceAuthFlow.ts` polling logic | ✅ Working | 929 lines of tests pass |

---

## Specific Questions to Resolve

1. **Device code format**: `XXXX-XXXX` (8 chars) or shorter? Apple uses 6 digits.

2. **Polling interval**: RFC 8628 says server should return `interval`. Default 5 seconds?

3. **Code expiration**: 15 minutes standard, but should we allow "remember this device"?

4. **Multiple pending codes**: Allow user to have multiple devices authenticating simultaneously?

5. **Scope selection**: Should device auth request specific scopes, or default to user's tier permissions?

---

## Immediate Next Step

Start with the **device auth endpoints** since everything else depends on them:

```bash
# Create the foundation
touch apps/web/app/api/auth/device/code/route.ts
touch apps/web/app/api/auth/device/token/route.ts
touch packages/platform/src/db/schema/snapback/device-codes.ts
```

Want me to draft the implementation for the device auth endpoints? That's the critical blocker that unblocks everything else.
