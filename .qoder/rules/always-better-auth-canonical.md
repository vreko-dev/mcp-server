# Always Use Better-Auth as Canonical Provider

## Rule: No Custom Authentication

SnapBack uses **better-auth** as the single source of truth for all authentication and authorization. Never implement custom auth logic.

---

## ❌ NEVER Do These

- ❌ **Custom JWT validation** - Use better-auth's built-in JWT plugin
- ❌ **Custom session management** - Use better-auth's session handling
- ❌ **Custom API key logic** - Use better-auth's API key plugin
- ❌ **Custom rate limiting** - Use better-auth's rate limit configuration
- ❌ **Custom 2FA/MFA** - Use better-auth's twoFactor plugin
- ❌ **Custom password hashing** - Use better-auth's password handling
- ❌ **Custom OAuth flows** - Use better-auth's socialProviders
- ❌ **Custom RBAC** - Use better-auth's permissions system

---

## ✅ ALWAYS Do These

- ✅ **Import from `@snapback/auth`** - Use our wrapper around better-auth
- ✅ **Use `snapbackAuth.requireAuth()`** - For API authentication
- ✅ **Use `auth.api.getSession()`** - For session-based auth
- ✅ **Services receive `userId` from auth** - Never handle auth in business logic
- ✅ **Use better-auth plugins** - For features like passkeys, magic links, etc.

---

## Architecture Pattern

```
┌─────────────────────────────────────────────────┐
│          @snapback/auth (Canonical)             │
│  ┌──────────────────────────────────────────┐   │
│  │   better-auth instance (auth.ts)         │   │
│  │   - Session management                   │   │
│  │   - API key plugin                       │   │
│  │   - Rate limiting                        │   │
│  │   - Organizations                        │   │
│  │   - JWT for tools (VS Code, MCP, CLI)    │   │
│  │   - OAuth (GitHub, Google)               │   │
│  │   - Passkeys, 2FA, Magic Links           │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │   SnapbackAuthImpl (unified auth)        │   │
│  │   - Multi-method support:                │   │
│  │     • Session cookies                    │   │
│  │     • Bearer tokens                      │   │
│  │     • API keys                           │   │
│  │     • x-api-key header                   │   │
│  │   - Plan & org enrichment                │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
         │
         ├─► API Routes (Express/Next.js)
         ├─► ORPC Procedures (type-safe API)
         └─► Services (business logic)
```

---

## Approved Patterns

### 1. API Routes (Express/Next.js)

**File**: `apps/api/src/routes/v1/*.ts`

```typescript
import { auth } from "@snapback/auth";

router.post("/api/endpoint", async (req, res) => {
  // ✅ Get session from better-auth
  const session = await auth.api.getSession({ headers: req.headers });
  
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  // ✅ Pass userId to service
  const result = await myService.doWork(session.user.id);
  
  return res.json(result);
});
```

---

### 2. ORPC Procedures (Type-Safe API)

**File**: `apps/api/orpc/procedures.ts`

```typescript
import { snapbackAuth } from "@snapback/auth";

export const protectedProcedure = publicProcedure.use(async ({ context, next }) => {
  // ✅ Use snapbackAuth for authentication
  const auth = await snapbackAuth.requireAuth(context.request);
  
  return next({
    context: {
      ...context,
      auth,
      user: {
        id: auth.userId,      // ✅ From better-auth
        email: auth.email,    // ✅ From better-auth
        role: auth.role,      // ✅ From better-auth
        plan: auth.plan,      // ✅ Enriched from better-auth user
        orgId: auth.orgId,    // ✅ From better-auth session
      },
    },
  });
});
```

**Usage in routers**:

```typescript
import { protectedProcedure } from "../procedures";

export const myRouter = router({
  createItem: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, context }) => {
      // ✅ context.user.id is from better-auth
      return await createItem(context.user.id, input.name);
    }),
});
```

---

### 3. Services (Business Logic)

**File**: `apps/api/src/services/*.ts`

```typescript
export class MyService {
  // ✅ Receive userId from caller (who used better-auth)
  async doWork(userId: string, data: any): Promise<Result> {
    // ✅ NO auth logic here
    // ✅ Just use userId for business logic
    
    // Store with userId from better-auth
    await db.insert(items).values({
      userId: userId,  // ✅ From better-auth session
      ...data,
    });
  }
}
```

**Example**: `apps/api/src/services/secret-detection.ts`

```typescript
import { SecretDetector } from "@snapback/policy-engine";

export class SecretDetectionService {
  private detector = new SecretDetector();

  async detectSecrets(request: SecretDetectionRequest): Promise<SecretDetectionResult> {
    const { userId, apiKeyId, files } = request;  // ✅ From better-auth
    
    // ✅ Use policy-engine (no auth)
    const detectorResult = this.detector.detect(file.content, file.path);
    
    // ✅ Store in DB with userId from better-auth
    await db.insert(ruleViolations).values({
      userId: userId,      // ✅ From better-auth
      apiKeyId: apiKeyId,  // ✅ From better-auth
      // ... detection results
    });
  }
}
```

---

### 4. Middleware (Express)

**File**: `apps/api/src/middleware/auth.ts`

```typescript
import { auth } from "@snapback/auth";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // ✅ Use better-auth session
  const session = await auth.api.getSession({ headers: req.headers });
  
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  // ✅ Attach to request
  req.user = session.user;
  next();
}
```

---

### 5. Authorization Checks

**File**: `apps/api/orpc/procedures.ts`

```typescript
// ✅ Admin-only procedure
export const adminProcedure = protectedProcedure.use(async ({ context, next }) => {
  if (context.user?.role !== "admin") {
    throw new ORPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  
  return next();
});

// ✅ Plan-based access
export const planProtectedProcedure = (requiredPlan: PlanId) =>
  protectedProcedure.use(async ({ context, next }) => {
    const perms = getPlanPermissions(context.auth.plan);
    
    if (!perms.canAccessFeature(requiredFeature)) {
      throw new ORPCError({
        code: "FORBIDDEN",
        message: `Plan upgrade required`,
      });
    }
    
    return next();
  });
```

---

## Type Imports

```typescript
// ✅ Import types from @snapback/auth
import type { 
  Session, 
  ActiveOrganization, 
  OrganizationMemberRole,
  SnapbackAuthContext,
  UserRole,
  PlanId
} from "@snapback/auth";
```

---

## Tool Authentication (VS Code, MCP, CLI)

Better-auth provides JWT tokens for tools:

```typescript
// In packages/auth/src/auth.ts
jwt({
  issuer: appUrl,
  audience: ["vscode", "mcp", "cli"],
  expirationTime: 60 * 15, // 15 minutes
}),
```

**Tool auth flow**:
1. User logs in via web → gets session
2. Tool requests JWT token → better-auth issues it
3. Tool sends JWT in `Authorization: Bearer <token>`
4. `snapbackAuth.requireAuth()` validates JWT → creates context

---

## Why Better-Auth?

### 1. **Single Source of Truth**
- Better-auth handles all auth complexity in one place
- Update auth logic once, applies everywhere

### 2. **Built-in Features**
- ✅ Rate limiting (replaces 340+ lines of custom code)
- ✅ Audit logging (replaces 371 lines of custom code)
- ✅ API key management (replaces 265 lines of RBAC logic)
- ✅ Sessions, OAuth, 2FA, Passkeys, Magic Links
- ✅ Organization management

### 3. **Security**
- Battle-tested, actively maintained
- Automatic CSRF protection
- Secure cookie handling
- Password hashing best practices

### 4. **Consistency**
- Same auth patterns across all entry points (API, ORPC, web)
- Unified user context everywhere

### 5. **Maintainability**
- Update auth logic in `packages/auth/src/auth.ts`
- No scattered auth code across services
- Clear separation of concerns

---

## Anti-Patterns to Avoid

### ❌ Custom JWT Validation
```typescript
// ❌ DON'T DO THIS
import jwt from "jsonwebtoken";

export function verifyToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
```

### ❌ Custom API Key Hashing
```typescript
// ❌ DON'T DO THIS
import bcrypt from "bcrypt";

export async function hashApiKey(key: string) {
  return bcrypt.hash(key, 10);
}
```

### ❌ Auth Logic in Services
```typescript
// ❌ DON'T DO THIS
export class MyService {
  async doWork(token: string) {
    const user = await this.verifyToken(token); // ❌ NO!
    // ...
  }
}
```

### ✅ Correct Pattern
```typescript
// ✅ DO THIS
export class MyService {
  async doWork(userId: string) {  // ✅ Receive userId from caller
    // Caller already used better-auth
    // ...
  }
}
```

---

## Exceptions

There are **NO exceptions** to this rule. If you need auth functionality that better-auth doesn't provide:

1. **Check if better-auth has a plugin** - It probably does
2. **Extend better-auth** - Add a custom plugin in `packages/auth/src/plugins/`
3. **Request feature** - Submit to better-auth project

**Never** implement custom auth outside of `@snapback/auth`.

---

## Testing

### Mock better-auth in tests:

```typescript
import { vi } from "vitest";

vi.mock("@snapback/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
      }),
    },
  },
  snapbackAuth: {
    requireAuth: vi.fn().mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
      role: "user",
      plan: "free",
    }),
  },
}));
```

---

## Related Files

- `packages/auth/src/auth.ts` - Better-auth instance configuration
- `packages/auth/src/shared-auth-impl.ts` - SnapbackAuthImpl wrapper
- `packages/auth/src/better-auth-adapter.ts` - Adapter for better-auth APIs
- `apps/api/orpc/procedures.ts` - ORPC auth procedures
- `apps/api/src/middleware/auth.ts` - Express auth middleware

---

## Summary

✅ **DO**: Use `@snapback/auth` (wraps better-auth)
✅ **DO**: Use `snapbackAuth.requireAuth()` or `auth.api.getSession()`
✅ **DO**: Pass `userId` to services
✅ **DO**: Keep business logic auth-agnostic

❌ **DON'T**: Implement custom JWT validation
❌ **DON'T**: Implement custom API key logic
❌ **DON'T**: Add auth logic to services
❌ **DON'T**: Roll your own authentication

**Better-auth is canonical. Always.**
