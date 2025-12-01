# SnapBack Architecture Documentation

This directory contains comprehensive architecture documentation for SnapBack.

## Authentication & API Keys

### Better Auth Integration & API Key Verification

Complete documentation of the Better Auth integration with custom API key verification layer.

**Files:**
- **[better-auth-api-key-integration.md](./better-auth-api-key-integration.md)** (14KB)
  - Comprehensive technical reference
  - Complete API function documentation
  - Security architecture details
  - Usage examples and patterns
  - 31 sections covering all aspects
  
- **[api-key-verification-quick-ref.md](./api-key-verification-quick-ref.md)** (4.3KB)
  - Quick reference for developers
  - Function signatures at a glance
  - Common usage patterns
  - Import paths and file locations
  - 17 quick-lookup sections

### Key Documentation Highlights

#### Core Functions
- `validateApiKey()` - Complete API key validation with DB lookup
- `verifyApiKey()` - Low-level hash verification
- `hashApiKey()` - Argon2id hashing for storage
- `createApiKey()` - Generate and store new keys
- `revokeApiKey()` - Revoke existing keys
- `authenticate()` - MCP server authentication

#### User Object Structure
```typescript
{
  id: string;                           // User ID
  email: string;                        // Email address
  name?: string;                        // Optional name
  subscriptionTier: "free" | "solo" | "team" | "enterprise";
  organizationId?: string;              // Optional organization
}
```

#### Subscription Tiers
| Tier | API Rate | Checkpoints/mo | Storage Retention | Protected Files |
|------|----------|----------------|-------------------|-----------------|
| Free | 10/min | 1,000 | 7 days | 5 |
| Solo | 50/min | 5,000 | 30 days | 25 |
| Team | 500/min | 100,000 | 365 days | 500 |
| Enterprise | 5000/min | Unlimited | Custom | Unlimited |

#### Security Features
- Argon2id hashing (memory-hard, GPU-resistant)
- Timing attack prevention (constant-time verification)
- Enumeration prevention (generic error messages)
- Rate limiting (100 req/min per IP)
- Scope isolation (per-key permissions)
- Key expiration support
- One-time display (full key only at creation)

## File Locations in Codebase

### Source Code
- **Better Auth Config**: `packages/auth/src/auth.ts` (lines 1-227)
- **API Key Functions**: `packages/auth/src/index.ts` (lines 101-1030)
- **MCP Server Auth**: `apps/mcp-server/src/auth.ts` (lines 1-266)
- **Security Tests**: `packages/auth/__tests__/security/api-keys.test.ts`

### Documentation
- **Full Technical Reference**: `docs/architecture/better-auth-api-key-integration.md`
- **Quick Reference**: `docs/architecture/api-key-verification-quick-ref.md`
- **This Index**: `docs/architecture/README.md`

## Quick Start Examples

### REST API Middleware
```typescript
const rateLimiter = new RedisRateLimiter(redis);
app.use("/api/v1", requireApiKey(rateLimiter));
// req.user and req.scopes now available
```

### MCP Tool Access Control
```typescript
const authResult = await authenticate(apiKey);
if (!hasToolAccess(authResult, "snapback.analyze_risk")) {
  throw new Error("Access denied");
}
```

### Complete API Key Validation
```typescript
const result = await validateApiKey(apiKey, clientIP);
if (!result.valid) {
  return { status: 401, error: result.error };
}
const user = result.user;  // Fully validated user object
```

## Import Paths

```typescript
// Core authentication functions
import {
  validateApiKey,
  verifyApiKey,
  hashApiKey,
  createApiKey,
  revokeApiKey,
  listApiKeys,
  requireApiKey,
  type User,
  type ValidationResult,
} from "@snapback/auth";

// MCP server authentication
import {
  authenticate,
  hasPermission,
  hasRole,
  hasToolAccess,
  clearAuthCache,
  type AuthResult,
} from "apps/mcp-server/src/auth";
```

## API Key Format

- **Prefix**: `sk_live_` or `sk_test_`
- **Random**: 32 hexadecimal characters
- **Example**: `sk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

## MCP Tool Permissions by Tier

```
FREE:  [analyze_risk, context_search]
PRO:   [analyze_risk, create_checkpoint, list_checkpoints, 
        restore_checkpoint, context_search]
ADMIN: [All permissions]
```

## Error Handling

All authentication errors return the same generic message to prevent enumeration:
```typescript
{
  valid: false,
  error: "Authentication failed"
}
```

Actual error reasons (logged internally only):
- Invalid format
- Key not found
- Key expired
- Key revoked
- User record missing
- Database error
- Rate limit exceeded

## Security Considerations

1. **Argon2id Hashing** - Memory-hard algorithm resistant to GPU/ASIC attacks
2. **Timing Attack Prevention** - Constant-time verification with dummy hashing
3. **Enumeration Prevention** - Generic error messages for all failure scenarios
4. **Brute Force Protection** - Rate limiting on validation attempts (100 req/min)
5. **Key Rotation** - Expiration support per API key
6. **One-Time Display** - Full key shown only at creation
7. **Scope Isolation** - Per-key permission scoping

## Related Documentation

- [SnapBack CLAUDE.md](../../CLAUDE.md) - System architecture overview
- [VS Code Extension](../../apps/vscode/CLAUDE.md) - Extension architecture
- [MCP Server](../../apps/mcp-server/CLAUDE.md) - MCP server documentation
- [Web App](../../apps/web/CLAUDE.md) - Web application documentation

## Testing

### API Key Security Tests
Located in `packages/auth/__tests__/security/api-keys.test.ts`:

1. **Revoked Key Rejection** - Keys are rejected after revocation
2. **Rate Limiting** - 101st request in minute returns 429
3. **Scope Validation** - Keys with limited scopes cannot access unauthorized endpoints
4. **Expiration Handling** - Expired keys return invalid

### Running Tests
```bash
# Run all tests
pnpm test

# Run auth security tests only
pnpm test packages/auth/__tests__/security/api-keys.test.ts

# Run with coverage
pnpm test -- --coverage
```

## Development Workflow

### Adding a New API Endpoint
1. Create route in `apps/web/app/api/`
2. Extract API key from Authorization header
3. Call `validateApiKey(apiKey, clientIP)`
4. Check `result.valid` before proceeding
5. Use `result.user` for user context
6. Check `result.scopes` for permission validation

### Adding MCP Tool Access Control
1. Get API key from MCP request context
2. Call `authenticate(apiKey)`
3. Check `hasToolAccess(authResult, toolName)`
4. Return error if access denied
5. Proceed with tool execution

### Creating API Keys
1. Call `createApiKey({ userId, name, scopes, expiresAt })`
2. Returns object with `fullKey` (plain text)
3. Display `fullKey` to user ONCE
4. User must save immediately
5. After display, only `keyPreview` is available

## Deployment Considerations

- Database connection required for API key validation
- Rate limiter should use Redis in production (InMemory for dev)
- IP extraction depends on reverse proxy configuration (X-Forwarded-For, X-Real-IP)
- Cache TTL: 1 minute for authentication results
- Monitor: validation errors, rate limit hits, expired key usage

## Next Steps

For new developers:
1. Read [api-key-verification-quick-ref.md](./api-key-verification-quick-ref.md) first
2. Review [better-auth-api-key-integration.md](./better-auth-api-key-integration.md) for deep dives
3. Check source files for implementation details
4. Run tests to verify understanding
5. Implement new integrations following the patterns documented

For security reviews:
1. Review security architecture section
2. Check rate limiting implementation
3. Verify timing attack prevention in use
4. Audit error message handling
5. Test key revocation flow

For system integrations:
1. Determine if REST API or MCP server integration needed
2. Use appropriate auth function (validateApiKey or authenticate)
3. Check permission requirements
4. Implement error handling for failed auth
5. Add rate limit header handling

---

**Last Updated**: November 17, 2025
**Status**: Complete - All functions documented with examples
**Coverage**: 100% of API key verification system
