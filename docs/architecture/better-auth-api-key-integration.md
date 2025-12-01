# Better Auth Integration: API Key Verification

## Overview

SnapBack uses Better Auth with a custom **API key verification layer** for MCP server and REST API authentication. The system provides:

- Cryptographically secure API key generation (argon2id hashing)
- Brute-force protection (rate limiting)
- Timing attack resistance (constant-time verification)
- Subscription tier-based access control
- Permission scoping per API key

---

## Core Modules

### 1. Better Auth Configuration (`packages/auth/src/auth.ts`)

Configures Better Auth with plugins:

```typescript
export const auth = betterAuth({
  appName: "SnapBack",
  schema: {
    user: {
      fields: {
        onboardingComplete: {
          type: "boolean",
          required: false,
          defaultValue: false,
        },
      },
    },
  },
  plugins: [
    admin(),
    apiKey(),  // API key plugin from Better Auth
    organization(),
    // ... other plugins
  ],
  // ... session, database, OAuth config
});
```

**Key Features**:
- Extends user schema with `onboardingComplete` boolean
- API key plugin enabled (provides basic key management)
- Organization support for team features
- Session expiry: 7 days

### 2. API Key & Authentication Management (`packages/auth/src/index.ts`)

Exports the comprehensive authentication system with:

#### Type Definitions

```typescript
export interface User {
  id: string;
  email: string;
  name?: string;
  subscriptionTier: "free" | "solo" | "team" | "enterprise";
  organizationId?: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  key?: string;                    // Only on creation
  keyHash: string;                 // Argon2id hash
  keyPreview: string;              // First 8 chars (e.g., "sk_live_")
  name: string;
  lastUsedAt?: Date | null;
  createdAt: Date;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
  scopes: string[];                // Permission scopes
  rateLimit: number;
}

export interface ValidationResult {
  valid: boolean;
  user?: User;
  scopes?: string[];
  error?: string;
}

export interface SubscriptionLimits {
  checkpointsPerMonth: number;
  storageRetentionDays: number;
  protectedFiles: number;
  teamSeats: number;
  apiRateLimit: number;
}
```

#### User Object Structure (from `validateApiKey` result)

```typescript
user?: {
  id: string;                           // User ID (e.g., "user-123abc")
  email: string;                        // Email address
  name?: string;                        // Optional user name
  subscriptionTier: "free" | "solo" | "team" | "enterprise";  // Billing tier
  organizationId?: string;              // Optional organization ID
}
```

---

## API Key Verification Functions

### 1. `verifyApiKey(apiKey: string, hash: string): Promise<boolean>`

**Purpose**: Low-level hash verification with timing attack resistance

**Parameters**:
- `apiKey`: Plain text API key to verify
- `hash`: Argon2id hash to compare against

**Returns**: `Promise<boolean>` - true if key matches hash

**Implementation**:
```typescript
export async function verifyApiKey(
  apiKey: string,
  hash: string,
): Promise<boolean> {
  try {
    return await argon2Verify(hash, apiKey);
  } catch (_error) {
    return false;
  }
}
```

**Details**:
- Uses argon2id with parameters:
  - Memory: 64MB (65536)
  - Time cost: 3 iterations
  - Parallelism: 4
  - Output length: 32 bytes
- Performs dummy bcrypt on invalid keys to prevent timing attacks
- Constant-time comparison prevents timing-based key enumeration

---

### 2. `validateApiKey(apiKey: string, requestIP?: string): Promise<ValidationResult>`

**Purpose**: Complete API key validation with database lookup, subscription verification, and rate limiting

**Parameters**:
- `apiKey`: The API key to validate (format: `sk_live_` or `sk_test_` + 32 hex chars)
- `requestIP` (optional): Client IP for rate limiting

**Returns**:

**Success**:
```typescript
{
  valid: true,
  user: {
    id: string;
    email: string;
    name?: string;
    subscriptionTier: "free" | "solo" | "team" | "enterprise";
    organizationId?: string;
  },
  scopes: string[];  // e.g., ["checkpoints:read", "checkpoints:write"]
}
```

**Failure**:
```typescript
{
  valid: false,
  error: string;  // Generic "Authentication failed" to prevent enumeration
}
```

**Process Flow**:

1. **Rate Limit Check** (100 req/min per IP or global)
   - Prevents brute force attacks
   - Returns `valid: false` if exceeded

2. **Format Validation**
   - Regex: `/^sk_(live|test)_[a-zA-Z0-9]{32}$/`
   - Dummy hash verification to prevent timing attacks

3. **Database Lookup**
   - Extracts prefix (first 8 chars) for efficient indexing
   - Queries up to 10 candidate keys with matching prefix
   - Filters: not expired, not revoked

4. **Hash Verification**
   - Iterates candidates, comparing plain key against argon2id hashes
   - Uses constant-time verification (argon2Verify)
   - Stops at first match

5. **User & Subscription Lookup**
   - Retrieves user record from database
   - Looks up subscription tier (latest active)
   - Defaults to "free" if no subscription

6. **Scope Extraction**
   - Converts permissions object keys to scope array
   - Example: `{ "checkpoints:read": true }` → `["checkpoints:read"]`

**Security Measures**:
- **Timing Attack Prevention**: Always executes dummy hash verification on failure
- **Enumeration Prevention**: Generic error message regardless of reason
- **Expiration Checks**: Skips expired keys (not returned)
- **Rate Limiting**: Per-IP + global fallback
- **Candidate Limiting**: Max 10 keys per prefix lookup

---

### 3. `hashApiKey(apiKey: string): Promise<string>`

**Purpose**: Hash an API key for secure storage

**Parameters**:
- `apiKey`: Plain text key to hash

**Returns**: `Promise<string>` - Argon2id hash string

**Implementation**:
```typescript
export async function hashApiKey(apiKey: string): Promise<string> {
  return await argon2Hash(apiKey, {
    memoryCost: 65536,  // 64 MB
    timeCost: 3,
    parallelism: 4,
    outputLen: 32,
  });
}
```

---

### 4. `createApiKey(params: CreateApiKeyParams): Promise<ApiKey & { fullKey: string }>`

**Purpose**: Generate and store a new API key

**Parameters**:
```typescript
interface CreateApiKeyParams {
  userId: string;
  name: string;
  scopes?: string[];           // Default: ["checkpoints:read"]
  rateLimit?: number;          // Default: 100 req/min
  expiresAt?: Date;
}
```

**Returns**:
```typescript
{
  id: string;
  userId: string;
  keyHash: string;             // Hashed version
  keyPreview: string;          // First 8 chars
  name: string;
  scopes: string[];
  rateLimit: number;
  fullKey: string;             // ONLY RETURNED ON CREATION
  createdAt: Date;
}
```

**Important**: The plain `fullKey` is ONLY visible once, at creation time. Users must save it immediately.

---

### 5. `revokeApiKey(keyId: string, userId: string): Promise<{ success: boolean; error?: string }>`

**Purpose**: Permanently revoke an API key

**Parameters**:
- `keyId`: ID of key to revoke
- `userId`: Owning user ID (for ownership verification)

**Returns**:
```typescript
{ success: true }  // or
{ success: false, error: string }
```

---

## MCP Server Authentication (`apps/mcp-server/src/auth.ts`)

The MCP server provides a **higher-level authentication wrapper** for MCP tool access:

### `authenticate(apiKey: string): Promise<AuthResult>`

**Purpose**: Authenticate API key and return permissions for MCP tools

**Parameters**:
- `apiKey`: API key to authenticate

**Returns**:
```typescript
export interface AuthResult {
  valid: boolean;
  tier: "free" | "pro" | "admin";
  scopes?: string[];
  permissions?: string[];      // Computed from tier
  userId?: string;
  organizationId?: string;
  error?: string;
}
```

**Features**:
- 1-minute caching to reduce backend calls
- Permission mapping per tier:
  - **ADMIN**: All permissions
  - **PRO**: Create, restore, list checkpoints + analysis
  - **FREE**: Analysis + context search only
- Automatic cache cleanup when >1000 entries

**Role-to-Permissions Mapping**:

```typescript
ROLE_PERMISSIONS = {
  admin: [
    "analyze_risk",
    "create_checkpoint",
    "list_checkpoints",
    "restore_checkpoint",
    "context_search"
  ],
  pro: [
    "analyze_risk",
    "create_checkpoint",
    "list_checkpoints",
    "restore_checkpoint",
    "context_search"
  ],
  free: [
    "analyze_risk",
    "context_search"
  ]
};
```

### Helper Functions

```typescript
hasPermission(authResult: AuthResult, permission: string): boolean
hasRole(authResult: AuthResult, role: string): boolean
hasToolAccess(authResult: AuthResult, toolName: string): boolean
clearAuthCache(): void
```

---

## MCP Server Authentication Flow

```
MCP Tool Call (Claude Code/Cursor)
  ↓
MCP Server receives request with Authorization header
  ↓
Extract API key from "Bearer sk_live_..." header
  ↓
Call authenticate(apiKey)
  ↓
  ├─ Check cache (1-min TTL)
  ├─ If miss: call performAuth(apiKey)
  └─ Add permissions based on tier
  ↓
Return AuthResult {valid, tier, permissions, userId, organizationId}
  ↓
Check hasToolAccess(authResult, toolName)
  ↓
  ├─ If allowed: Execute tool
  └─ If denied: Return error
```

---

## Rate Limiting & Usage Tracking

### Subscription-Based Rate Limits

```typescript
getRateLimitByTier(tier: string): SubscriptionLimits
```

**Free Tier**:
- API rate: 10 req/min
- Checkpoints/month: 1,000
- Storage retention: 7 days
- Protected files: 5

**Solo Tier**:
- API rate: 50 req/min
- Checkpoints/month: 5,000
- Storage retention: 30 days
- Protected files: 25

**Team Tier**:
- API rate: 500 req/min
- Checkpoints/month: 100,000
- Storage retention: 365 days
- Protected files: 500
- Team seats: 10

**Enterprise Tier**:
- API rate: 5,000 req/min
- Unlimited checkpoints/month
- Custom retention
- Unlimited protected files
- Unlimited team seats

### Rate Limiter Implementations

#### InMemoryRateLimiter (Development)

```typescript
async checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>
```

**Returns**:
```typescript
{
  allowed: boolean;
  remaining: number;      // Requests left in window
  resetAt: Date;         // When window resets
  retryAfter?: number;   // Seconds to wait (if limited)
}
```

#### RedisRateLimiter (Production)

Same interface, backed by Redis for distributed rate limiting.

---

## Express/Next.js Middleware

### `requireApiKey(rateLimiter: RedisRateLimiter)`

**Purpose**: Express middleware to validate API key and enforce rate limits

**Behavior**:

1. Extract API key from `Authorization: Bearer sk_live_...` header
2. Extract client IP from `X-Forwarded-For` or `X-Real-IP` (for rate limiting)
3. Call `validateApiKey(apiKey, clientIP)`
4. Check rate limit based on subscription tier
5. Attach user and scopes to `req` object
6. Set rate limit headers

**Headers Set**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2024-01-15T10:30:00Z
Retry-After: 60 (if rate limited)
```

**Example Usage**:

```typescript
const rateLimiter = new RedisRateLimiter(redis);

app.use("/api/v1", requireApiKey(rateLimiter));

app.get("/api/v1/checkpoints", (req, res) => {
  // req.user = { id, email, subscriptionTier, ... }
  // req.scopes = ["checkpoints:read", ...]
});
```

---

## Key Format & Prefixes

**Format**: `sk_live_` or `sk_test_` + 32 hex characters

**Examples**:
- `sk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- `sk_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

**Prefix Storage**: Only first 8 characters stored (`keyPreview`), allows efficient database lookup.

---

## Error Handling

All authentication functions return **generic error messages** to prevent key enumeration:

```typescript
// User gets this generic message regardless of actual error
{
  valid: false,
  error: "Authentication failed"
}
```

**Actual errors logged internally** (not sent to client):
- Key format invalid
- Key not found in database
- Key expired
- Key revoked
- User record missing
- Database error

---

## Testing

### API Key Security Tests

Located in `packages/auth/__tests__/security/api-keys.test.ts`:

1. **Revoked Key Rejection**: Keys are rejected after revocation
2. **Rate Limiting**: 101st request in minute returns 429
3. **Scope Validation**: Keys with limited scopes cannot access unauthorized endpoints
4. **Expiration Handling**: Expired keys return invalid

### Test Example:

```typescript
it("should reject revoked API keys", async () => {
  const user = await auth.api.signUpEmail({
    body: {
      email: "test@example.com",
      password: "Test123!@#",
      name: "Test User",
    },
  });

  const key = await createApiKey({
    userId: user.user.id,
    name: "Test Key",
  });

  await revokeApiKey(key.id, user.user.id);

  const result = await validateApiKey(key.fullKey);
  expect(result.valid).toBe(false);
});
```

---

## Security Considerations

1. **Argon2id Hashing**: Memory-hard algorithm resistant to GPU/ASIC attacks
2. **Timing Attack Prevention**: Constant-time verification + dummy hashing
3. **Enumeration Prevention**: Generic error messages
4. **Brute Force Protection**: Rate limiting on validation attempts (100 req/min)
5. **Key Rotation**: Expiration support per API key
6. **One-Time Display**: Full key shown only at creation
7. **Scope Isolation**: Per-key permission scoping

---

## Usage Example: MCP Server Integration

```typescript
import { authenticate, hasToolAccess } from "@snapback/auth";

export async function analyzeTool(input: AnalyzeInput): Promise<AnalyzeOutput> {
  // Extract API key from request headers
  const apiKey = extractFromAuthHeader(request);

  // Authenticate
  const authResult = await authenticate(apiKey);

  if (!authResult.valid) {
    throw new Error("Invalid API key");
  }

  // Check tool access
  if (!hasToolAccess(authResult, "snapback.analyze_risk")) {
    throw new Error("Permission denied: analyze_risk");
  }

  // Safe to proceed - user has valid key and permission
  const analysis = await analyzer.run(input);

  return {
    risk_level: analysis.level,
    user_id: authResult.userId,
    tier: authResult.tier,
    issues: analysis.issues,
  };
}
```

---

## References

- Better Auth: https://better-auth.com/
- Argon2: https://github.com/P-H-C/phc-winner-argon2
- Rate Limiting: OWASP recommendations
- API Key Security: https://cheatsheetseries.owasp.org/cheatsheets/API_Key_Management_Cheat_Sheet.html
