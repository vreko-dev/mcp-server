# Authentication Architecture

**Overview**: SnapBack uses multiple authentication methods depending on the client type. Each method is optimized for its specific use case with appropriate security measures.

---

## Authentication Methods by Client

### 1. Web Dashboard (Browser)
**Method**: Session Cookies (JWT)
**Provider**: Better Auth v1.3.26
**Flow**:
```
User login → Better Auth validates credentials
  ↓
Creates session with JWT token
  ↓
Stores in httpOnly, secure, sameSite cookies
  ↓
Subsequent requests include cookie
  ↓
Better Auth middleware validates JWT
  ↓
Grants access if valid
```

**Implementation**: [apps/web/lib/auth.ts](../../apps/web/lib/auth.ts)

**Security Features**:
- HttpOnly cookies (prevents XSS)
- Secure flag (HTTPS only)
- SameSite=strict (CSRF protection)
- JWT expiration and refresh tokens
- OAuth providers (Google, GitHub)

---

### 2. REST API (HTTP Clients)
**Method**: API Keys with HMAC-SHA256 Signing
**Format**: `sk_live_*` (production) or `sk_test_*` (development)
**Flow**:
```
Developer creates API key via dashboard
  ↓
System generates:
  - Full key: sk_live_[32-char-hex]
  - Key hash: bcrypt(key, 12 rounds)
  - Signing secret: 256-bit random hex
  ↓
Stores in database:
  - api_keys table: keyPrefix, keyHash
  - api_key_metadata table: signingSecret, scopes, rate limits
  ↓
Developer stores full key securely (shown once)
  ↓
Client sends request with headers:
  - X-API-Key: sk_live_[key]
  - X-Signature: HMAC-SHA256(payload, signingSecret)
  ↓
Server validates:
  1. Extract keyPrefix from API key
  2. Query database for matching key
  3. bcrypt.compare(provided_key, stored_hash)
  4. Retrieve signingSecret from api_key_metadata
  5. Verify HMAC signature
  6. Check scopes, rate limits, expiration
  ↓
Grants access if all checks pass
```

**Implementation**:
- Key generation: [packages/auth/src/index.ts:104-191](../../packages/auth/src/index.ts)
- Signature verification: [packages/api/lib/security.ts:1-94](../../packages/api/lib/security.ts)

**Database Schema**:

**`api_keys` table** (Better Auth managed):
```typescript
{
  id: uuid,
  userId: text,
  name: text,                // "Production API Key"
  keyPrefix: text,           // "sk_live_abc123..."
  keyHash: text,             // bcrypt hash
  expiresAt: timestamp,
  revokedAt: timestamp,
  isRevoked: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**`api_key_metadata` table** (SnapBack extensions):
```typescript
{
  id: uuid,
  apiKeyId: uuid,            // References api_keys.id
  userId: text,
  environment: text,         // "production" | "development"
  scopes: jsonb,             // ["code:analyze", "code:refactor", "code:search"]
  rateLimitPerMinute: int,   // Tier-based override
  rateLimitPerHour: int,
  dailyRequestLimit: int,
  lastUsedAt: timestamp,     // Usage tracking
  lastUsedIp: inet,
  lastUsedClient: text,      // "vscode-1.2.3"
  totalRequests: int,
  isActive: boolean,
  expiresAt: timestamp,
  signingSecret: text,       // 256-bit HMAC secret (CRITICAL)
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Security Features**:
- bcrypt hashing (12 salt rounds) - one-way, cannot reverse
- Separate HMAC-SHA256 signing secret per key (prevents replay attacks)
- Constant-time signature comparison (prevents timing attacks)
- Rate limiting per tier (free/solo/team/enterprise)
- Scope-based permissions
- Usage tracking and anomaly detection
- Automatic expiration and revocation

**Rate Limits by Tier**:
- Free: 60 req/min, 1,000 req/hour, 10,000 req/day
- Solo: 300 req/min, 10,000 req/hour, 100,000 req/day
- Team: 1,000 req/min, 50,000 req/hour, 1,000,000 req/day
- Enterprise: Custom limits

---

### 3. MCP Server (Claude Code / Cursor)
**Method**: MCP API Keys
**Format**: `sb_live_*` (SnapBack Live)
**Current Implementation**: Mock authentication (development mode)
**Flow**:
```
Claude Code/Cursor starts MCP server via stdio
  ↓
User provides API key in MCP config
  ↓
MCP server authenticates:
  - Check SNAPBACK_NO_NETWORK env var
  - If true: Use mock auth (dev mode)
  - If false: Call backend service (future)
  ↓
Mock auth logic:
  - No key → tier: "free", scopes: []
  - sb_live_* → tier: "pro", scopes: ["analyze", "checkpoint", "context"]
  - Other → invalid
  ↓
Cache result for 1 minute (reduces backend calls)
  ↓
Subsequent MCP tool calls check tier/scopes
```

**Implementation**: [apps/mcp-server/src/auth.ts](../../apps/mcp-server/src/auth.ts)

**Why Different Prefix (`sb_live_` vs `sk_live_`)?**
- **Security through namespacing**: Prevents accidental cross-use of keys
- **Clear service boundaries**: MCP keys can't be used in REST API and vice versa
- **Future flexibility**: Allows different authentication flows for different services

**Future Production Implementation** (not yet built):
- Backend service validation (similar to REST API)
- Database-backed tier/scope lookup
- Usage tracking and rate limiting
- Same bcrypt + HMAC-SHA256 pattern as REST API

**Current Limitations**:
- Mock authentication only (no real validation)
- No backend service integration
- No usage tracking or rate limiting
- Cache-only (no persistence)

---

### 4. Database Connections (Internal)
**Method**: Supabase Connection Authentication
**Flow**:
```
Application needs database access
  ↓
Initialize Supabase client:
  - SUPABASE_URL (project URL)
  - SUPABASE_ANON_KEY (public anon key)
  OR
  - SUPABASE_SERVICE_ROLE_KEY (admin access)
  ↓
Supabase client handles:
  - Connection pooling
  - Row-level security (RLS) policies
  - JWT token validation
  ↓
Queries execute with appropriate permissions
```

**Implementation**: [packages/platform/src/db/supabase-service.ts](../../packages/platform/src/db/supabase-service.ts)

**Environment Variables**:
```env
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJ...  # Public key (client-side)
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Admin key (server-side only)
```

**Row-Level Security (RLS)**:
- Users can only access their own data
- Organization members can access organization data
- Admin roles can access all data
- Enforced at database level (not application level)

---

## Complete Authentication Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Web Browser  │  REST API    │  MCP Server  │  Internal      │
│              │  Client      │  (Claude)    │  Services      │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │              │              │                │
       │ Session      │ API Key +    │ MCP Key        │ Supabase
       │ Cookie       │ HMAC Sig     │ (sb_live_*)    │ Keys
       │ (JWT)        │ (sk_live_*)  │                │
       ↓              ↓              ↓                ↓
┌──────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION LAYER                        │
├────────────���─┬──────────────┬──────────────┬────────────────┤
│ Better Auth  │ bcrypt +     │ Mock Auth    │ Supabase       │
│ v1.3.26      │ HMAC-SHA256  │ (1min cache) │ Client         │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │              │              │                │
       ↓              ↓              ↓                ↓
┌──────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                           │
│  sessions  │  api_keys  │  api_key_metadata  │  RLS Policies │
└──────────────────────────────────────────────────────────────┘
```

---

## Security Event Tracking

All authentication events are logged for security monitoring:

**Tracked Events**:
- `AUTH_SUCCESS`: Successful authentication
- `AUTH_FAILURE`: Failed authentication attempt
- `API_KEY_CREATED`: New API key generated
- `API_KEY_REVOKED`: API key revoked
- `RATE_LIMIT_EXCEEDED`: Rate limit violation
- `INVALID_SIGNATURE`: HMAC signature mismatch
- `EXPIRED_KEY`: Attempt to use expired key
- `SCOPE_VIOLATION`: Unauthorized scope access

**Event Schema**:
```typescript
{
  eventType: string,
  userId: string,
  apiKeyId?: string,
  ipAddress: string,
  userAgent: string,
  timestamp: Date,
  metadata: {
    reason?: string,
    attemptedScope?: string,
    requestCount?: number
  }
}
```

**Implementation**: [packages/platform/src/db/schema/snapback/security-events.ts](../../packages/platform/src/db/schema/snapback/security-events.ts)

---

## Performance & Caching

### API Key Authentication
- **Hash verification**: ~50-100ms (bcrypt is intentionally slow)
- **HMAC verification**: <1ms (fast cryptographic operation)
- **Database query**: <10ms (indexed on keyPrefix)
- **Total latency**: ~60-120ms per request

### MCP Authentication
- **Cache duration**: 1 minute
- **Cache hit**: <1ms
- **Cache miss**: Depends on backend (currently mock: <5ms)
- **Cache cleanup**: Automatic when >1000 entries

### Session Validation
- **JWT verification**: <5ms
- **Database lookup**: <10ms (cached by Better Auth)
- **Total latency**: ~15ms per request

---

## Migration Notes

### From Archived Proposals
**NOT IMPLEMENTED** (documented in archived files only):
- Client tokens (`sbt_*` format) - proposed but not built
- argon2 hashing - current implementation uses bcrypt
- Separate authentication service - currently embedded in each app

**CURRENT STATE** matches:
- Two-table API key structure (api_keys + api_key_metadata)
- HMAC-SHA256 request signing with dedicated signingSecret
- Scope-based permissions
- Rate limiting per tier
- Better Auth for session management

---

## Development vs Production

### Development Mode
- MCP server: Mock authentication (`SNAPBACK_NO_NETWORK=true`)
- API keys: `sk_test_*` prefix accepted
- Rate limits: Disabled or lenient
- Session cookies: Not secure (HTTP allowed)

### Production Mode
- MCP server: Backend service validation (when implemented)
- API keys: `sk_live_*` prefix required
- Rate limits: Enforced per tier
- Session cookies: Secure, HttpOnly, SameSite=strict
- HTTPS required for all communications

---

## Related Documentation
- [Better Auth Configuration](../../apps/web/lib/auth.ts)
- [API Key Generation](../../packages/auth/src/index.ts)
- [HMAC Signature Verification](../../packages/api/lib/security.ts)
- [Database Schema](../../packages/platform/src/db/schema/snapback/)
- [MCP Server Authentication](../../apps/mcp-server/src/auth.ts)
