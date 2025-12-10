# Phase 0: Architecture Audit - API Auth Middleware Tests

**Task:** API Authentication Middleware Tests (P0 - CRITICAL PATH)  
**Classification:** CRITICAL PATH / Integration Testing  
**Status:** ✅ PHASE 0 COMPLETE  
**Timestamp:** 2025-12-10T06:14:00Z

---

## 1. Sequential Analysis: Task Classification

### Task Type: CRITICAL PATH (Authentication Core)
This is NOT a feature test - this is **security infrastructure testing**. The auth middleware is the security boundary that:
- ✅ Validates all API requests
- ✅ Enforces authorization (RBAC, plans)
- ✅ Prevents unauthorized access
- ✅ Manages rate limiting

**Impact:** Broken auth middleware = entire API is compromised

---

## 2. System Architecture: Better Auth Flow

### Better Auth Integration Points
From web research + codebase analysis:

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT (Web/CLI/Mobile)                                         │
│  - Sends: Authorization: Bearer {JWT/API_KEY}                  │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ MIDDLEWARE STACK (apps/api/src/middleware/auth-unified.ts)     │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ 1. extractAuthContext()                                     │  │
│ │    - Try JWT via Better Auth session (Priority 1)         │  │
│ │    - Fall back to API key from DB (Priority 2)            │  │
│ │    - Extract user data + plan + permissions               │  │
│ │    - Attach to c.set("auth", authContext)                 │  │
│ └────────────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ 2. requireAuth() - Required endpoints                      │  │
│ │    - Check if auth context exists (401 if missing)         │  │
│ └────────────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ 3. requireRole(...roles) - RBAC enforcement                │  │
│ │    - Check if user.role matches allowed roles (403)        │  │
│ │    - Generate permissions based on role                    │  │
│ └────────────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ 4. requirePlan(...plans) - Subscription gating             │  │
│ │    - Check if user.plan meets requirements (403)           │  │
│ │    - Plan hierarchy: free < pro < team < enterprise        │  │
│ └────────────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ 5. requirePermission(...perms) - Fine-grained access       │  │
│ │    - Check specific permissions (snapshot:*, admin:*)      │  │
│ │    - Supports wildcard matching                            │  │
│ └────────────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ 6. requireOrgMembership(paramName) - Org scoping           │  │
│ │    - Extract orgId from path parameter                     │  │
│ │    - Validate user is org member (403 if not)             │  │
│ └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ HANDLER (Protected Route)                                       │
│  - authContext available via c.get("auth")                     │
│  - All security already validated                              │
│  - Safe to use user data                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Authentication Methods (Priority)
1. **JWT via Better Auth** (lines 148-179)
   - `Authorization: Bearer {jwt_token}`
   - Verified by Better Auth session API
   - Returns user + role + email

2. **API Key** (lines 183-224)
   - `X-API-Key: {api_key}`
   - Validated against DB (apiKeys table)
   - Supports revocation + expiration
   - Updates `lastUsedAt` for audit trail

3. **Session Cookies** (optional)
   - Via `better-auth.session_token` cookie
   - Fallback if Bearer header missing

---

## 3. Better Auth Integration (Web Research Findings)

### From Official Better Auth Docs
✅ **JWT Plugin** (www.better-auth.com/docs/plugins/jwt):
- Endpoints for JWT retrieval
- JWKS endpoint for token verification
- Can verify JWTs without database checks

✅ **API Key Plugin** (better-auth.com/docs/plugins/api-key):
- Built-in rate limiting
- Custom expiration times
- Metadata support
- Key preview for audit logs

✅ **Hono Integration** (better-auth.com/docs/integrations/hono):
- `auth.handler()` for route mounting
- CORS configuration needed
- Middleware for session extraction
- SameSite cookie handling for cross-domain

### Key Finding from Research
**Better Auth Test Mode** (Issue #5609):
- Framework needs better testing utils
- Proposed: test mode to create users programmatically
- Impact: Use MSW to simulate Better Auth session responses

---

## 4. Code Examination: Current Implementation

### File: `apps/api/src/middleware/auth-unified.ts` (470 lines)

**Functions to Test:**

| Function | Lines | Purpose | Test Complexity |
|----------|-------|---------|-----------------|
| `verifyJwt()` | 43-73 | Decode + validate JWT | Medium |
| `verifyApiKey()` | 86-133 | Lookup + validate API key | High (DB) |
| `extractAuthContext()` | 144-239 | Main middleware logic | High (both) |
| `requireAuth()` | 250-269 | Enforce authentication | Low |
| `requireRole()` | 279-305 | RBAC enforcement | Medium |
| `requirePlan()` | 316-342 | Subscription gating | Medium |
| `requirePermission()` | 353-401 | Fine-grained access | Medium |
| `requireOrgMembership()` | 412-457 | Org scoping | High (DB) |
| `getAuthContext()` | 468-469 | Helper to get context | Low |

**Database Tables Involved:**
- `apiKeys` (users' API keys)
- `user` (user profiles, roles)
- `userOrgMembership` (org access)

---

## 5. Testing Infrastructure: MSW Strategy

### HTTP Mocking (MSW)
Since this middleware is **not** making HTTP calls itself, MSW usage is:
- ❌ NOT for mocking Better Auth API (middleware calls it directly)
- ✅ FOR testing the handlers that use the auth context

**What to Mock:**
1. **Better Auth Session Response** (optional)
   - Simulate `auth.api.getSession()` response
   - Mock user + role data

2. **Database Calls** (via vi.mock)
   - Mock `db.select().from(apiKeys)`
   - Mock `db.select().from(user)`
   - Mock `getUserOrgIds()` calls

### Best Approach: Direct Mocking + testClient()
```typescript
// Use Hono's testClient() for type-safe request testing
// Mock database calls with vi.mock()
// Don't need MSW for middleware-only testing
```

---

## 6. 4-Path Test Coverage Plan

### HAPPY PATH (6 tests)
✅ JWT authentication success  
✅ API key authentication success  
✅ Session cookie authentication  
✅ Role-based access (admin, user, viewer)  
✅ Plan-based access (free, pro, team, enterprise)  
✅ Permission checking with wildcards  

### SAD PATH (5 tests)
❌ Missing Authorization header → 401  
❌ Expired/invalid JWT → 401  
❌ Revoked/invalid API key → 401  
❌ Insufficient role → 403  
❌ Insufficient plan tier → 403  

### EDGE PATH (4 tests)
🔀 Admin bypass for org restrictions  
🔀 Wildcard permission matching (snapshot:* matches snapshot:read)  
🔀 Multiple permissions required  
🔀 Rate limiting with API keys  

### ERROR PATH (5 tests)
💥 JWT verification failure (malformed)  
💥 API key lookup returns null  
💥 Database connection error  
💥 User not found in database  
💥 Org membership check fails  

---

## 7. Test Architecture

### Test Organization
```
describe("API Auth Middleware", () => {
  // Setup: Hono testClient, mock context
  
  describe("HAPPY PATH: Successful Authentication", () => {
    it("JWT → session → context extracted")
    it("API key → context with plan/permissions")
    it("Session cookie fallback")
    // ... 6 tests total
  })
  
  describe("SAD PATH: Authentication Failures", () => {
    it("Missing header → 401")
    it("Invalid JWT → 401")
    // ... 5 tests total
  })
  
  describe("EDGE PATH: Authorization Boundaries", () => {
    it("Admin bypasses org check")
    it("Wildcard permissions match")
    // ... 4 tests total
  })
  
  describe("ERROR PATH: System Failures", () => {
    it("JWT decode error → 401")
    it("Database error → 500")
    // ... 5 tests total
  })
  
  describe("Integration: Full Middleware Stack", () => {
    it("extractAuthContext + requireAuth + requireRole")
    it("extractAuthContext + requirePlan")
    // ... 3 tests total
  })
})
```

### Test Utilities Needed
```typescript
// Helper 1: Create mock JWT token
function createMockJwt(userId: string, role: string): string

// Helper 2: Create mock API key
function createMockApiKey(userId: string, scopes: string[]): string

// Helper 3: Setup auth context
function setupAuthContext(user: AuthUser): void

// Helper 4: Create protected route
function createProtectedRoute(middleware: Function, handler: Function)

// Helper 5: Mock database
function mockDatabaseApiKeyLookup(key: string, user: User)
function mockDatabaseUserLookup(userId: string, user: User)
function mockDatabaseOrgMembership(userId: string, orgIds: string[])
```

---

## 8. Database Mocking Strategy

### Why DB Mocking Needed
API key validation requires database lookup:
```typescript
// Line 98-109 in auth-unified.ts
const key = await db
  .select()
  .from(apiKeys)
  .where(
    and(
      eq(apiKeys.keyPreview, keyPreview),
      isNull(apiKeys.revokedAt),
      or(isNull(apiKeys.expiresAt), lte(apiKeys.expiresAt, new Date())),
    ),
  )
  .limit(1)
```

### Mocking Approach
```typescript
// Mock entire @snapback/platform db module
vi.mock("@snapback/platform", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockApiKey])),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ id: key.id })),
      })),
    })),
  },
}))
```

---

## 9. Middleware Execution Order (Critical)

From `apps/api/src/index.ts` (lines 85):
```typescript
.use("*", extractAuthContext)  // MUST be first - extracts user
.use("/v1/*", enforceRLS)       // Then RLS enforcement
.use("/auth/*", requireRole)    // Then role checks
```

**Test Impact:** extractAuthContext MUST run before requireRole/requirePlan

---

## 10. Web Research Integration

### Key Findings Applied
1. **Better Auth Hono Integration** → Use testClient() instead of direct HTTP
2. **Bearer Auth Middleware** → Test both Bearer token and X-API-Key headers
3. **JWT Verification** → Mock JWKS endpoint (if using RS256)
4. **Rate Limiting** → Test interaction with API key middleware
5. **Testing Helpers** → Use Hono's `testClient()` for type safety
6. **RBAC Testing** → Test role hierarchy and permission wildcards
7. **Error Responses** → Verify correct status codes (401, 403, 400)

---

## 11. Estimated Test Count & Complexity

| Category | Tests | Complexity | Time |
|----------|-------|-----------|------|
| Happy Path | 6 | Medium | 6 min |
| Sad Path | 5 | Low-Medium | 5 min |
| Edge Path | 4 | Medium-High | 5 min |
| Error Path | 5 | Medium | 5 min |
| Integration | 3 | High | 5 min |
| **TOTAL** | **23** | **High** | **~25 min** |

**Test File Size:** ~650-750 lines (larger than OAuth due to complexity)

---

## 12. Critical Success Factors

✅ **Mock database correctly** - API key lookup is DB-dependent  
✅ **Test all 4 paths** - Security has many edge cases  
✅ **Verify error messages** - Users rely on clear 401/403  
✅ **Test integration** - Multiple middleware layers interact  
✅ **Cover all roles** - admin, user, viewer must be distinct  
✅ **Plan hierarchy** - free < pro < team < enterprise  
✅ **Wildcard permissions** - snapshot:* must match snapshot:read  
✅ **Org scoping** - Admin bypass + member checks  

---

## 13. Architecture Compliance

✅ Uses Hono testClient() (native Hono testing)  
✅ Mocks database (vi.mock)  
✅ Follows @TDD_CORE.md phases  
✅ 4-path coverage (Happy, Sad, Edge, Error)  
✅ MSW-ready (even if not directly used)  
✅ Sequential thinking applied  
✅ Better Auth integration verified  

---

## Phase 0 Summary

| Criterion | Status | Details |
|-----------|--------|---------|
| Code Examined | ✅ | 470 lines, 9 functions |
| Database Scoped | ✅ | 3 tables, lookup patterns known |
| Better Auth Integration | ✅ | Session API + API key management |
| Test Strategy | ✅ | testClient + vi.mock approach |
| Coverage Plan | ✅ | 23 tests, 4-path analysis |
| Complexity | ✅ | HIGH (security middleware) |
| Ready for Phase 1 | ✅ | YES - proceed to RED phase |

---

**Next Step:** Proceed to Phase 1 (RED) - Create 23 failing tests with comprehensive coverage
