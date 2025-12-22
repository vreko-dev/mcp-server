# @snapback/auth

Authentication and authorization system for SnapBack - API key management, session security, CSRF protection, and rate limiting.

## Overview

**@snapback/auth** provides a comprehensive authentication system for all SnapBack services. It handles:

- **Authentication**: Better-auth integration for user sessions
- **API Keys**: Generate and verify API keys for programmatic access
- **Session Security**: Secure session management with CSRF protection
- **Rate Limiting**: Prevent abuse with configurable rate limits
- **Tier Management**: Plan-based feature restrictions
- **Audit Logging**: Track all auth-related events

## Important

**This package is private** and not available on npm. It's used internally by SnapBack services:
- API server (`apps/api`)
- Web dashboard (`apps/web`)
- CLI tool (`apps/cli`)
- MCP server (`apps/mcp-server`)

## Architecture

### Core Systems

```
Auth/
├── Authentication
│   ├── User sessions (Better-auth)
│   ├── Login/logout flows
│   ├── OAuth providers
│   └── Account management
│
├── API Keys
│   ├── Key generation
│   ├── Key verification
│   ├── Key rotation
│   └── Revocation
│
├── Security Layers
│   ├── CSRF protection
│   ├── Session hardening
│   ├── API key security
│   └── Rate limiting
│
├── Authorization
│   ├── Role-based access (RBAC)
│   ├── Organization management
│   ├── Permission enforcement
│   └── Tier restrictions
│
└── Auditing
    ├── Login/logout tracking
    ├── API key usage logs
    ├── Permission changes
    └── Security events
```

### Key Modules

#### Authentication (`src/auth.ts`, `src/index.ts`)

Better-auth integration for user sessions:

```typescript
import { auth } from "@snapback/auth";

// Get current session
const session = await auth.getSession();

// Create session
const session = await auth.api.signUpEmail({
  email: "user@example.com",
  password: "secure-password",
  name: "John Doe",
});

// Verify session
const verified = await auth.api.getSession({ token });

// Logout
await auth.api.signOut({ token });
```

#### API Key Management (`src/lib/`)

Create and manage API keys for programmatic access:

```typescript
import { createApiKey, verifyApiKey } from "@snapback/auth";

// Generate new API key
const apiKey = await createApiKey({
  userId: "user-123",
  name: "GitHub Actions",
  expiresAt: new Date("2025-12-31"),
});

// Verify API key
const verified = await verifyApiKey(apiKey.key);

if (verified) {
  console.log("API key is valid, user:", verified.userId);
}
```

#### Security Features

**CSRF Protection** (`src/security/csrf-protection.ts`):

```typescript
import { generateCSRFToken, verifyCSRFToken } from "@snapback/auth/security/csrf-protection";

// Generate token for form
const token = generateCSRFToken(sessionId);

// Verify on form submission
const isValid = verifyCSRFToken(sessionId, userProvidedToken);
```

**Session Security** (`src/security/session-security.ts`):

```typescript
import { hardtenSession, validateSession } from "@snapback/auth/security/session-security";

// Harden session with additional security
await hardenSession(sessionId, {
  ipAddress: req.ip,
  userAgent: req.headers["user-agent"],
});

// Validate session on each request
const valid = await validateSession(sessionId);
```

**Rate Limiting** (`src/security/rate-limiting.ts`):

```typescript
import { createRateLimiter, checkRateLimit } from "@snapback/auth/security/rate-limiting";

// Create limiter: 10 requests per 60 seconds per IP
const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60000 });

// Check if request is allowed
const allowed = await checkRateLimit(req.ip);

if (!allowed) {
  res.status(429).send("Too many requests");
}
```

#### Organization & Tier Management (`src/lib/organization.ts`, `src/lib/tier-utils.ts`)

Manage organizations and subscription tiers:

```typescript
import { getOrganization, getTierFeatures } from "@snapback/auth";

// Get organization
const org = await getOrganization(orgId);

// Check tier features
const features = getTierFeatures(org.tier);

if (features.includes("api-access")) {
  // Allow API access
}
```

#### Audit Logging (`src/lib/audit.ts`)

Track all authentication events:

```typescript
import { logAuthEvent } from "@snapback/auth/lib/audit";

// Log successful login
await logAuthEvent("login", {
  userId: "user-123",
  ip: req.ip,
  success: true,
});

// Log failed API key verification
await logAuthEvent("api-key-failed", {
  apiKey: maskedKey,
  ip: req.ip,
  reason: "Invalid signature",
});
```

## Development

### Getting Started

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Type check
pnpm type-check

# Watch mode for development
pnpm dev
```

### Project Structure

```
packages/auth/
├── src/
│   ├── auth.ts                # Better-auth configuration
│   ├── client.ts              # Client exports
│   ├── index.ts               # Main exports & setup
│   ├── shared-auth.ts         # Shared auth utilities
│   ├── shared-auth-impl.ts    # Implementation details
│   ├── better-auth-adapter.ts # Better-auth adapter
│   ├── lib/
│   │   ├── audit.ts          # Audit logging
│   │   ├── helper.ts         # Helper utilities
│   │   ├── organization.ts   # Organization management
│   │   └── tier-utils.ts     # Subscription tier utilities
│   ├── business/              # Business logic
│   ├── security/
│   │   ├── csrf-protection.ts # CSRF token handling
│   │   ├── session-security.ts # Session hardening
│   │   ├── api-key-security.ts # API key validation
│   │   └── rate-limiting.ts   # Request rate limiting
│   ├── middleware/            # Express/web middleware
│   ├── plugins/               # Better-auth plugins
│   ├── jobs/                  # Background jobs
│   ├── errors.ts              # Custom errors
│   ├── plan.ts                # Plan definitions
│   └── __tests__/             # Test files
├── test/
└── package.json
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific module
pnpm test auth
pnpm test security

# Watch mode
pnpm test --watch

# With coverage
pnpm test --coverage
```

### Code Style

Follow the TypeScript patterns defined in the workspace:

- **Discriminated Unions**: For state management
- **Type Guards**: For type narrowing
- **Result Types**: For error handling (Result<T, E>)
- **Const Assertions**: For immutable data

See [Developer Guide](/docs/developer-guide) for examples.

## Dependencies

Auth depends on:

- **@snapback/contracts**: Type definitions and schemas
- **@snapback/infrastructure**: Logging and observability
- **@snapback/platform**: Database access
- **better-auth**: Authentication framework
- **bcrypt**: Password hashing

Auth does **NOT** depend on:
- UI frameworks
- Web frameworks (handles its own routes)
- Storage systems (uses @snapback/platform)

## Integration Examples

### Using in Express API

```typescript
import { auth } from "@snapback/auth";
import { apiKeyMiddleware } from "@snapback/auth/security/api-key-security";

app.use(apiKeyMiddleware());

app.post("/api/snapshots", async (req, res) => {
  // User is authenticated and stored in req.user
  const snapshot = await createSnapshot(req.user.id);
  res.json(snapshot);
});
```

### Using in Next.js

```typescript
import { auth } from "@snapback/auth";

export async function GET(req: Request) {
  const session = await auth.getSession({ headers: req.headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({ user: session.user });
}
```

### Using in CLI

```typescript
import { verifyApiKey } from "@snapback/auth";

async function authenticateCLI(apiKey: string) {
  const verified = await verifyApiKey(apiKey);

  if (!verified) {
    console.error("Invalid API key");
    process.exit(1);
  }

  return verified;
}
```

## Configuration

### Environment Variables

```bash
# Better-auth configuration
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key

# Database connection
DATABASE_URL=postgresql://user:password@localhost/snapback

# Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# API key expiration (days)
API_KEY_EXPIRATION=365
```

## Security Considerations

1. **API Keys**: Should be treated like passwords - never log or expose them
2. **Sessions**: Use secure cookies with HttpOnly and Secure flags
3. **CSRF**: Always validate CSRF tokens on state-changing requests
4. **Rate Limiting**: Configure based on your expected traffic patterns
5. **Password Hashing**: Uses bcrypt with 10 salt rounds

## Performance Considerations

- Session validation is cached (default: 5 minutes)
- API key verification uses database indexes
- Rate limiting uses in-memory store (consider Redis for distributed setups)

## Observability

Auth includes structured logging for all operations:

```typescript
import { logger } from "@snapback/infrastructure";

// Automatically logged:
// - Successful logins/logouts
// - API key creation/validation
// - Failed authentication attempts
// - Rate limit violations
// - Security events
```

Enable debug logging:

```bash
LOG_LEVEL=debug pnpm dev
```

## Contributing

To contribute to Auth:

1. Understand the security implications of your changes
2. Write tests for authentication/authorization logic
3. Follow code style guidelines
4. Run `pnpm test` and `pnpm build`
5. Submit PR with clear security justification

See [Contributing Guide](/docs/contributing) for details.

### Security Checklist

- [ ] No secrets in logs
- [ ] Rate limiting configured
- [ ] CSRF protection enabled
- [ ] Session validation on each request
- [ ] API key format cannot be guessed
- [ ] Password hashing verified
- [ ] Tests cover failure cases

## Resources

- **Contracts**: [Type Definitions](../contracts/README.md)
- **Infrastructure**: [Logging & Observability](../infrastructure/README.md)
- **Platform**: [Database & Client](../platform/README.md)
- **Developer Guide**: [Technical Guide](/docs/developer-guide)
- **Contributing**: [How to Contribute](/docs/contributing)
- **Better-auth Docs**: https://www.better-auth.com

## License

Proprietary - SnapBack Auth is not open source
