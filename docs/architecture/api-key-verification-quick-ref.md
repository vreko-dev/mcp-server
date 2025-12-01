# API Key Verification - Quick Reference

## Function Signatures

### Core Verification

```typescript
// Low-level hash verification
verifyApiKey(apiKey: string, hash: string): Promise<boolean>

// Complete validation with database lookup
validateApiKey(apiKey: string, requestIP?: string): Promise<ValidationResult>

// Hash for storage
hashApiKey(apiKey: string): Promise<string>

// Create new key
createApiKey(params: CreateApiKeyParams): Promise<ApiKey & { fullKey: string }>

// Revoke key
revokeApiKey(keyId: string, userId: string): Promise<{ success: boolean; error?: string }>
```

## User Object Structure

```typescript
interface User {
  id: string;                           // User ID
  email: string;                        // Email address
  name?: string;                        // Optional name
  subscriptionTier: "free" | "solo" | "team" | "enterprise";
  organizationId?: string;              // Optional org ID
}
```

## ValidationResult on Success

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
  scopes: string[];  // ["checkpoints:read", "checkpoints:write", ...]
}
```

## ValidationResult on Failure

```typescript
{
  valid: false,
  error: "Authentication failed"  // Generic message for all failure reasons
}
```

## MCP Server Authentication

```typescript
// Returns tier-based result for MCP tools
authenticate(apiKey: string): Promise<AuthResult>

interface AuthResult {
  valid: boolean;
  tier: "free" | "pro" | "admin";
  scopes?: string[];
  permissions?: string[];  // Computed from tier
  userId?: string;
  organizationId?: string;
  error?: string;
}
```

## Permission Mapping by Tier

```
FREE:  [analyze_risk, context_search]
PRO:   [analyze_risk, create_checkpoint, list_checkpoints, restore_checkpoint, context_search]
ADMIN: [all permissions]
```

## API Key Format

- Prefix: `sk_live_` or `sk_test_`
- Random: 32 hex characters
- Full: `sk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

## Key Security Features

1. **Argon2id hashing** - Memory-hard, GPU-resistant
2. **Timing attack prevention** - Constant-time verification
3. **Enumeration prevention** - Generic error messages
4. **Rate limiting** - 100 req/min per IP
5. **Scope isolation** - Per-key permission scoping
6. **Expiration support** - Optional key expiration
7. **One-time display** - Full key shown only at creation

## Subscription Tier Limits

| Tier       | API Rate | Checkpoints/mo | Retention | Protected Files | Seats |
|------------|----------|----------------|-----------|-----------------|-------|
| Free       | 10/min   | 1,000          | 7 days    | 5               | 1     |
| Solo       | 50/min   | 5,000          | 30 days   | 25              | 1     |
| Team       | 500/min  | 100,000        | 365 days  | 500             | 10    |
| Enterprise | 5000/min | Unlimited      | Custom    | Unlimited       | Unlimited |

## Import Paths

```typescript
// Core functions
import {
  validateApiKey,
  verifyApiKey,
  hashApiKey,
  createApiKey,
  revokeApiKey,
  listApiKeys,
  requireApiKey,
} from "@snapback/auth";

// MCP server auth
import {
  authenticate,
  hasPermission,
  hasRole,
  hasToolAccess,
} from "apps/mcp-server/src/auth";
```

## Common Usage Patterns

### REST API Middleware

```typescript
const rateLimiter = new RedisRateLimiter(redis);
app.use("/api/v1", requireApiKey(rateLimiter));
// req.user and req.scopes now available
```

### MCP Tool Handler

```typescript
const authResult = await authenticate(apiKey);
if (!hasToolAccess(authResult, "snapback.analyze_risk")) {
  throw new Error("Access denied");
}
```

### Validation with IP

```typescript
const result = await validateApiKey(apiKey, clientIP);
if (!result.valid) {
  return 401;  // Unauthorized
}
const user = result.user;  // Safe - validated
```

## Error Scenarios

All return `{ valid: false, error: "Authentication failed" }`:

- Invalid format
- Key not found
- Key expired
- Key revoked
- User deleted
- Rate limited
- Database error

## File Locations

- Core auth config: `packages/auth/src/auth.ts`
- API key functions: `packages/auth/src/index.ts` (line 101+)
- MCP server auth: `apps/mcp-server/src/auth.ts`
- Tests: `packages/auth/__tests__/security/api-keys.test.ts`
- Full docs: `docs/architecture/better-auth-api-key-integration.md`
