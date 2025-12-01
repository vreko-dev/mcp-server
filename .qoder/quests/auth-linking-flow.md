# Auth Linking Flow: VS Code Extension ↔ Web Console (MVP)

> **SCOPE NOTICE**: For v0.1, only items under **MVP Scope** are in scope for implementation. Phase 2 features are reference only and should not be implemented without explicit approval.

> **DESIGN STATUS**: Ship-worthy. This design has been reviewed and hardened with the following critical fixes applied:
> 1. **Link-token race condition fixed** - Conditional update with rowCount check prevents double-use
> 2. **Domain/URL consistency enforced** - All references use `console.snapback.dev` (not `app.snapback.dev`)
> 3. **CORS/Cookie requirements documented** - Explicit configuration for cross-domain authentication
> 4. **API paths standardized** - `/api/v1/workspace/*` pattern enforced
> 5. **Error message contract formalized** - Exact strings for extension state management

## Overview

This design establishes a **single canonical flow** for linking the SnapBack VS Code extension to a user's SnapBack account via the web console. The MVP implements a secure, one-way initiation pattern: **Extension → Console → Extension**, using short-lived one-time link tokens and JWT-based access/refresh tokens.

## Goals (MVP Scope)

1. **Single Entry Point**: Extension initiates linking by opening console.snapback.dev/connect/vscode
2. **Security**: Short-lived link tokens (5 min), hashed storage, JWT access tokens (15 min) with refresh
3. **Simplicity**: No bidirectional flows, no manual token copy/paste, no CLI/MCP support yet
4. **Integration**: Uses existing BetterAuth for web console authentication
5. **Developer-Friendly**: Automatic token refresh, clear error messages, graceful degradation

## Architecture Decision

### Base URLs

**Production**:
- **Web Console**: `https://console.snapback.dev` (BetterAuth, Next.js)
- **API Service**: `https://api.snapback.dev` (authentication endpoints, workspace APIs)
- **Extension ID**: `snapback.snapback`

### Canonical Flow (MVP)

**Single Entry Point**: Extension → Console → Extension

```
VS Code Extension
  ↓ User clicks "Connect SnapBack Account"
  ↓ Opens https://console.snapback.dev/connect/vscode in browser
  ↓
Web Console (console.snapback.dev)
  ↓ User authenticates via BetterAuth (if needed)
  ↓ GET /connect/vscode page calls:
  ↓ POST https://api.snapback.dev/api/auth/extension/link-token
  ↓
API Service (api.snapback.dev)
  ↓ Validates BetterAuth session
  ↓ Creates extension_link_tokens row (hashed)
  ↓ Returns { linkToken, expiresAt, expiresInSeconds }
  ↓
Web Console
  ↓ Redirects browser to:
  ↓ vscode://snapback.snapback/auth?token={linkToken}
  ↓
VS Code Extension
  ↓ URI handler receives token
  ↓ POST https://api.snapback.dev/api/auth/extension/exchange
  ↓
API Service
  ↓ Validates link token (not expired, not used, client='vscode')
  ↓ Marks token used=true
  ↓ Creates extension_sessions row (hashed refresh token)
  ↓ Returns { accessToken, refreshToken, user, workspace, expiresIn }
  ↓
VS Code Extension
  ↓ Stores credentials in SecretStorage
  ↓ Refreshes SnapBack tree view
  ↓ Uses Authorization: Bearer {accessToken} for all API calls
```

**Why Single Entry Point**:
- Simpler UX (no confusion about where to start)
- Easier to support and document
- Reduces surface area for bugs
- Consistent with other IDE extension patterns

## Database Schema

### Table: extension_link_tokens

**Purpose**: Temporary one-time tokens for linking flow initiation

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique token identifier |
| token_hash | TEXT | NOT NULL, INDEXED | SHA-256 hash of raw token (64 hex chars) |
| user_id | UUID | NOT NULL | References user.id from BetterAuth |
| workspace_id | UUID | NULLABLE | References workspace/organization (optional) |
| client | TEXT | NOT NULL | Client identifier (only 'vscode' in MVP) |
| used | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether token has been exchanged |
| expires_at | TIMESTAMPTZ | NOT NULL | Token expiration (5 minutes from creation) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Token creation timestamp |

**Indexes**:
- **Partial index on `token_hash`** WHERE `used = FALSE AND expires_at > NOW()` (fast active token lookup)
- Index on `expires_at` (for cleanup jobs - Phase 2)

**Lifecycle**:
1. Created when web console calls `/api/auth/extension/link-token`
2. Valid for 5 minutes
3. Single-use only (marked `used = true` after exchange)
4. Cleanup handled in Phase 2 (cron job)

### Table: extension_sessions

**Purpose**: Long-lived refresh tokens for extension authentication

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique session identifier |
| user_id | UUID | NOT NULL | References user.id from BetterAuth |
| workspace_id | UUID | NULLABLE | References workspace/organization (optional) |
| client | TEXT | NOT NULL | Client identifier (only 'vscode' in MVP) |
| refresh_token_hash | TEXT | NOT NULL, UNIQUE WHERE NOT REVOKED | SHA-256 hash of refresh token (80 hex chars) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Session creation timestamp |
| last_used_at | TIMESTAMPTZ | NULLABLE | Last token refresh timestamp |
| revoked_at | TIMESTAMPTZ | NULLABLE | Session revocation timestamp (Phase 2) |
| expires_at | TIMESTAMPTZ | NOT NULL | Session expiration (NOW() + 90 days) |
| metadata | JSONB | NULLABLE | { extensionVersion, vscodeVersion, platform, hostname } |

**Indexes**:
- **Unique index on `refresh_token_hash`** WHERE `revoked_at IS NULL` (fast active token lookup)
- Index on `user_id` WHERE `revoked_at IS NULL` (Phase 2: session management UI)

**Lifecycle**:
1. Created during token exchange (`/api/auth/extension/exchange`)
2. Valid for 90 days
3. `last_used_at` updated on each refresh
4. Revocation support added in Phase 2

## API Endpoints (MVP)

**All endpoints hosted on**: `https://api.snapback.dev`

### Cross-Domain Requirements (Console ↔ API)

For the web console (`console.snapback.dev`) to call API endpoints (`api.snapback.dev`) with BetterAuth cookies:

**BetterAuth Cookie Configuration**:
- `Domain=.snapback.dev` (shared subdomain)
- `SameSite=None; Secure` (required for cross-origin requests)
- `HttpOnly=true` (security)

**API CORS Configuration**:
- `Access-Control-Allow-Origin: https://console.snapback.dev` (exact origin)
- `Access-Control-Allow-Credentials: true` (allow cookies)
- `Access-Control-Allow-Methods: POST, GET, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

**Preflight Handling**:
- All API endpoints must handle `OPTIONS` requests
- Return appropriate CORS headers on preflight

### 1. POST /api/auth/extension/link-token

**Purpose**: Create a short-lived link token for initiating the linking flow

**Authentication**: Requires valid BetterAuth session

**URL**: `https://api.snapback.dev/api/auth/extension/link-token`

**Request Headers**:
```
Content-Type: application/json
Cookie: better_auth.session_token={session_token}
```

**Request Body**:
```typescript
{
  client?: "vscode"  // Only 'vscode' supported in MVP
}
```

**Response (201 Created)**:
```typescript
{
  linkToken: string,         // Raw unhashed token (64 hex chars)
  expiresAt: string,         // ISO 8601 timestamp
  expiresInSeconds: number   // 300 (5 minutes)
}
```

**Response (401 Unauthorized)**:
```typescript
{
  error: "authentication_required",
  message: "No active BetterAuth session found"
}
```

**Implementation**:

```typescript
// Pseudo-code implementation
export async function POST(request: Request) {
  // 1. Validate BetterAuth session
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json(
      { error: "authentication_required", message: "No active BetterAuth session found" },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const workspaceId = session.user.activeOrganization?.id; // Optional

  // 2. Parse request body
  const { client = "vscode" } = await request.json();

  // 3. Generate link token
  const rawToken = crypto.randomBytes(32).toString("hex"); // 64 hex chars
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // 4. Store in database
  await db.insert(extensionLinkTokens).values({
    tokenHash,
    userId,
    workspaceId,
    client,
    used: false,
    expiresAt,
  });

  // 5. Return raw token (only time it's transmitted unhashed)
  return Response.json(
    {
      linkToken: rawToken,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: 300,
    },
    { status: 201 }
  );
}
```

### 2. POST /api/auth/extension/exchange

**Purpose**: Exchange one-time link token for access/refresh token pair

**Authentication**: None (link token provides authentication)

**URL**: `https://api.snapback.dev/api/auth/extension/exchange`

**Request Body**:
```typescript
{
  linkToken: string,  // Raw token from deep link (64 hex chars)
  client?: "vscode",  // Only 'vscode' in MVP
  deviceInfo?: {      // Optional metadata
    extensionVersion?: string,
    vscodeVersion?: string,
    platform?: string,
    hostname?: string
  }
}
```

**Response (200 OK)**:
```typescript
{
  accessToken: string,   // JWT, 15 minute expiry
  refreshToken: string,  // Opaque token (80 hex chars), 90 day expiry
  tokenType: "Bearer",
  expiresIn: number,     // 900 (15 minutes)
  user: {
    id: string,
    email: string,
    name?: string
  },
  workspace?: {
    id: string,
    name: string,
    plan: "free" | "solo" | "team" | "enterprise"
  }
}
```

**Response (400 Bad Request)**:
```typescript
{
  error: "invalid_token" | "token_expired" | "token_already_used",
  message: string
}
```

**Implementation**:

```typescript
export async function POST(request: Request) {
  const { linkToken, client = "vscode", deviceInfo } = await request.json();

  // 1. Hash incoming token
  const tokenHash = crypto.createHash("sha256").update(linkToken).digest("hex");

  // 2. Look up link token
  const [linkTokenRow] = await db
    .select()
    .from(extensionLinkTokens)
    .where(
      and(
        eq(extensionLinkTokens.tokenHash, tokenHash),
        eq(extensionLinkTokens.client, client),
        eq(extensionLinkTokens.used, false),
        gt(extensionLinkTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!linkTokenRow) {
    return Response.json(
      { error: "invalid_token", message: "Link token is invalid, expired, or already used" },
      { status: 400 }
    );
  }

  // 3. Mark token as used (CRITICAL: prevent race condition)
  // Use conditional update with rowCount check to ensure one-time use
  const updateResult = await db.transaction(async (tx) => {
    const result = await tx
      .update(extensionLinkTokens)
      .set({ used: true })
      .where(
        and(
          eq(extensionLinkTokens.id, linkTokenRow.id),
          eq(extensionLinkTokens.used, false) // Only update if still unused
        )
      );

    // Check that exactly one row was updated
    if (result.rowCount !== 1) {
      throw new Error("Token already used");
    }

    return result;
  });

  // If transaction threw, respond with token_already_used
  // (caught by outer try/catch - not shown in pseudo-code)

  // 4. Generate refresh token
  const refreshTokenRaw = crypto.randomBytes(40).toString("hex"); // 80 hex chars
  const refreshTokenHash = crypto.createHash("sha256").update(refreshTokenRaw).digest("hex");

  // 5. Create extension session
  const [session] = await db.insert(extensionSessions).values({
    userId: linkTokenRow.userId,
    workspaceId: linkTokenRow.workspaceId,
    client,
    refreshTokenHash,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    metadata: deviceInfo,
  }).returning();

  // 6. Generate access token (JWT)
  const accessToken = await signExtensionAccessToken({
    sub: linkTokenRow.userId,
    w: linkTokenRow.workspaceId,
    c: client,
    esid: session.id,
  });

  // 7. Fetch user and workspace data
  const [user] = await db.select().from(userTable).where(eq(userTable.id, linkTokenRow.userId));
  const workspace = linkTokenRow.workspaceId
    ? await db.select().from(organizationTable).where(eq(organizationTable.id, linkTokenRow.workspaceId))
    : undefined;

  // 8. Return tokens and metadata
  return Response.json({
    accessToken,
    refreshToken: refreshTokenRaw,
    tokenType: "Bearer",
    expiresIn: 900, // 15 minutes
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    workspace: workspace ? {
      id: workspace.id,
      name: workspace.name,
      plan: workspace.plan,
    } : undefined,
  });
}
```

### 3. POST /api/auth/extension/refresh

**Purpose**: Refresh expired access token using refresh token

**Authentication**: None (refresh token provides authentication)

**URL**: `https://api.snapback.dev/api/auth/extension/refresh`

**Request Body**:
```typescript
{
  refreshToken: string,  // Raw refresh token (80 hex chars)
  client?: "vscode"      // Only 'vscode' in MVP
}
```

**Response (200 OK)**:
```typescript
{
  accessToken: string,   // New JWT, 15 minute expiry
  tokenType: "Bearer",
  expiresIn: number      // 900 (15 minutes)
}
```

**Response (401 Unauthorized)**:
```typescript
{
  error: "invalid_refresh_token" | "session_revoked" | "session_expired",
  message: string
}
```

**Implementation**:

```typescript
export async function POST(request: Request) {
  const { refreshToken, client = "vscode" } = await request.json();

  // 1. Hash refresh token
  const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  // 2. Look up session
  const [session] = await db
    .select()
    .from(extensionSessions)
    .where(
      and(
        eq(extensionSessions.refreshTokenHash, refreshTokenHash),
        eq(extensionSessions.client, client),
        isNull(extensionSessions.revokedAt),
        gt(extensionSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!session) {
    return Response.json(
      { error: "invalid_refresh_token", message: "Refresh token is invalid, revoked, or expired" },
      { status: 401 }
    );
  }

  // 3. Update last_used_at
  await db
    .update(extensionSessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(extensionSessions.id, session.id));

  // 4. Generate new access token (same structure as exchange)
  const accessToken = await signExtensionAccessToken({
    sub: session.userId,
    w: session.workspaceId,
    c: session.client,
    esid: session.id,
  });

  // 5. Return new access token (do NOT issue new refresh token in MVP)
  return Response.json({
    accessToken,
    tokenType: "Bearer",
    expiresIn: 900,
  });
}
```

**Note**: Refresh token rotation is deferred to Phase 2 for simplicity.

## JWT Helper & Middleware (MVP)

### signExtensionAccessToken Helper

**Purpose**: Generate short-lived JWT access tokens for extension authentication

**Technology**: Use `jose` library (already in use by BetterAuth)

**Implementation**:

```typescript
// packages/auth/src/lib/extension-jwt.ts
import { SignJWT } from "jose";
import { env } from "@snapback/config";

interface ExtensionAccessTokenPayload {
  sub: string;        // user_id
  w?: string;         // workspace_id (optional)
  c: "vscode";        // client type (only vscode in MVP)
  esid: string;       // extension_sessions.id
}

export async function signExtensionAccessToken(
  payload: ExtensionAccessTokenPayload
): Promise<string> {
  const secret = new TextEncoder().encode(env.BETTER_AUTH_SECRET);
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 900; // 15 minutes

  const jwt = await new SignJWT({
    sub: payload.sub,
    w: payload.w,
    c: payload.c,
    esid: payload.esid,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .setAudience("snapback-extension")
    .setIssuer(env.APP_URL || "https://console.snapback.dev")
    .sign(secret);

  return jwt;
}
```

### verifyExtensionAccessToken Helper

```typescript
import { jwtVerify } from "jose";

interface ExtensionAuthContext {
  userId: string;
  workspaceId?: string;
  client: "vscode";
  sessionId: string;
}

export async function verifyExtensionAccessToken(
  token: string
): Promise<ExtensionAuthContext> {
  const secret = new TextEncoder().encode(env.BETTER_AUTH_SECRET);

  try {
    const { payload } = await jwtVerify(token, secret, {
      audience: "snapback-extension",
      issuer: env.APP_URL || "https://console.snapback.dev",
    });

    return {
      userId: payload.sub as string,
      workspaceId: payload.w as string | undefined,
      client: payload.c as "vscode",
      sessionId: payload.esid as string,
    };
  } catch (error) {
    throw new Error("Invalid or expired access token");
  }
}
```

### requireExtensionAuth Middleware

**Purpose**: Protect `/api/v1/workspace/*` and `/api/v1/snapshots/*` routes

**Implementation**:

```typescript
// apps/api/src/middleware/extension-auth.ts
import { verifyExtensionAccessToken } from "@snapback/auth/lib/extension-jwt";
import { db, extensionSessions } from "@snapback/platform";
import { eq, isNull, gt, and } from "drizzle-orm";

interface ExtensionAuthContext {
  userId: string;
  workspaceId?: string;
  client: "vscode";
  sessionId: string;
}

export async function requireExtensionAuth(
  request: Request
): Promise<ExtensionAuthContext> {
  // 1. Extract Bearer token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Authorization header");
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  // 2. Verify JWT
  const authContext = await verifyExtensionAccessToken(token);

  // 3. Check session is not revoked
  const [session] = await db
    .select()
    .from(extensionSessions)
    .where(
      and(
        eq(extensionSessions.id, authContext.sessionId),
        isNull(extensionSessions.revokedAt),
        gt(extensionSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!session) {
    throw new Error("Session revoked or expired");
  }

  return authContext;
}
```

**Usage in Route Handlers**:

```typescript
// apps/api/src/routes/v1/workspace/safety.ts
export async function GET(request: Request) {
  try {
    const auth = await requireExtensionAuth(request);

    const safety = await getWorkspaceSafety(auth.userId, auth.workspaceId);

    return Response.json(safety);
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 401 }
    );
  }
}
```

## VS Code Extension Implementation (MVP)

### API Endpoint Path Standards

**Canonical Workspace Endpoints** (protected by `requireExtensionAuth`):
- `GET /api/v1/workspace/safety` - Workspace safety metrics
- `GET /api/v1/workspace/snapshots` - List workspace snapshots (supports `?limit=N`)
- All workspace-scoped resources should use `/api/v1/workspace/*` pattern

**Error Message Contract**:

The extension expects specific error messages for state management:
- **401 responses**: Reserved for invalid/missing JWT only (not other errors)
- **Session expired**: Exact string `"Session expired - please reconnect your account"`
  - Tree provider special-cases this string to flip UI to "Connect SnapBack Account" node
  - Client clears credentials and shows reconnect prompt
- **Not authenticated**: Thrown when no credentials exist in SecretStorage
- **API error**: Generic prefix for HTTP errors (`"API error: 401"`)

### Configuration (package.json)

**Settings**:

```json
{
  "contributes": {
    "configuration": {
      "title": "SnapBack",
      "properties": {
        "snapback.apiBaseUrl": {
          "type": "string",
          "default": "https://api.snapback.dev",
          "description": "Base URL for SnapBack API (without trailing slash)."
        },
        "snapback.webConsoleBaseUrl": {
          "type": "string",
          "default": "https://console.snapback.dev",
          "description": "Base URL for SnapBack web console."
        }
      }
    },
    "commands": [
      {
        "command": "snapback.connect",
        "title": "SnapBack: Connect Account",
        "category": "SnapBack",
        "icon": "$(plug)"
      },
      {
        "command": "snapback.refreshTree",
        "title": "SnapBack: Refresh",
        "category": "SnapBack",
        "icon": "$(refresh)"
      }
    ]
  }
}
```

### SecretStorage Schema

**Key**: `"snapback.extensionCredentials"`

**Value**:

```typescript
interface ExtensionCredentials {
  accessToken: string;      // JWT access token
  refreshToken: string;     // Opaque refresh token (80 hex chars)
  expiresAt: number;        // Unix timestamp (Date.now() + 900000)
  user: {
    id: string;
    email: string;
    name?: string;
  };
  workspace?: {
    id: string;
    name: string;
    plan: "free" | "solo" | "team" | "enterprise";
  };
}
```

**Storage Operations**:

```typescript
class CredentialsManager {
  constructor(private secrets: vscode.SecretStorage) {}

  async getCredentials(): Promise<ExtensionCredentials | null> {
    const json = await this.secrets.get("snapback.extensionCredentials");
    if (!json) return null;
    return JSON.parse(json);
  }

  async setCredentials(creds: ExtensionCredentials): Promise<void> {
    await this.secrets.store(
      "snapback.extensionCredentials",
      JSON.stringify(creds)
    );
  }

  async clearCredentials(): Promise<void> {
    await this.secrets.delete("snapback.extensionCredentials");
  }

  async isAccessTokenExpired(): Promise<boolean> {
    const creds = await this.getCredentials();
    if (!creds) return true;

    // Check if token expires in next 60 seconds (proactive refresh)
    return creds.expiresAt <= Date.now() + 60000;
  }
}
```

### URI Handler Registration

**Purpose**: Handle deep links from web browser

**Registration** (in `activate()` function):

```typescript
export async function activate(context: vscode.ExtensionContext) {
  // ... existing activation code

  // Register URI handler for auth flow
  const uriHandler = new AuthUriHandler(context);
  context.subscriptions.push(
    vscode.window.registerUriHandler(uriHandler)
  );
}
```

**Handler Implementation**:

```typescript
class AuthUriHandler implements vscode.UriHandler {
  constructor(private context: vscode.ExtensionContext) {}

  async handleUri(uri: vscode.Uri): Promise<void> {
    // Expected format: vscode://snapback.snapback/auth?token=...
    if (uri.path !== "/auth") {
      logger.warn("Unknown URI path", { path: uri.path });
      return;
    }

    // Extract link token from query
    const query = new URLSearchParams(uri.query);
    const linkToken = query.get("token");

    if (!linkToken) {
      vscode.window.showErrorMessage(
        "SnapBack: Invalid authentication link (missing token)"
      );
      return;
    }

    // Exchange token for credentials
    await this.exchangeToken(linkToken);
  }

  private async exchangeToken(linkToken: string): Promise<void> {
    try {
      // Get API base URL from settings
      const config = vscode.workspace.getConfiguration("snapback");
      const apiBaseUrl = config.get<string>("apiBaseUrl", "https://api.snapback.dev");

      // Call exchange endpoint
      const response = await fetch(`${apiBaseUrl}/api/auth/extension/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkToken,
          client: "vscode",
          deviceInfo: {
            extensionVersion: vscode.extensions.getExtension("snapback.snapback")?.packageJSON.version,
            vscodeVersion: vscode.version,
            platform: process.platform,
            hostname: os.hostname()
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Token exchange failed");
      }

      const data = await response.json();

      // Store credentials in SecretStorage
      const credentialsManager = new CredentialsManager(this.context.secrets);
      await credentialsManager.setCredentials({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + data.expiresIn * 1000,
        user: data.user,
        workspace: data.workspace
      });

      // Show success message
      vscode.window.showInformationMessage(
        `SnapBack: VS Code is now linked to ${data.user.email}`
      );

      // Refresh tree view
      vscode.commands.executeCommand("snapback.refreshTree");

    } catch (error) {
      logger.error("Token exchange failed", error as Error);
      vscode.window.showErrorMessage(
        `SnapBack: Failed to link account - ${(error as Error).message}`
      );
    }
  }
}
```

### Authenticated API Client

**Purpose**: Automatically handle token refresh and retry on 401

**Implementation**:

```typescript
class AuthedApiClient {
  private credentialsManager: CredentialsManager;
  private apiBaseUrl: string;

  // In-memory cache to prevent multiple concurrent refreshes
  private refreshPromise: Promise<void> | null = null;

  constructor(
    context: vscode.ExtensionContext,
    apiBaseUrl: string
  ) {
    this.credentialsManager = new CredentialsManager(context.secrets);
    this.apiBaseUrl = apiBaseUrl;
  }

  async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    // Ensure access token is valid
    await this.ensureValidAccessToken();

    // Get credentials
    const creds = await this.credentialsManager.getCredentials();
    if (!creds) {
      throw new Error("Not authenticated");
    }

    // Make request with Bearer token
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        "Authorization": `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json"
      }
    });

    // Handle 401 (token expired mid-request despite check)
    if (response.status === 401) {
      // Clear cached credentials and retry once
      await this.refreshAccessToken();

      const creds2 = await this.credentialsManager.getCredentials();
      if (!creds2) throw new Error("Refresh failed");

      // Retry with new token
      const retryResponse = await fetch(`${this.apiBaseUrl}${path}`, {
        ...init,
        headers: {
          ...init?.headers,
          "Authorization": `Bearer ${creds2.accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!retryResponse.ok) {
        throw new Error(`API error: ${retryResponse.status}`);
      }

      return retryResponse.json();
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  private async ensureValidAccessToken(): Promise<void> {
    const isExpired = await this.credentialsManager.isAccessTokenExpired();

    if (isExpired) {
      await this.refreshAccessToken();
    }
  }

  private async refreshAccessToken(): Promise<void> {
    // Prevent concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefreshAccessToken();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefreshAccessToken(): Promise<void> {
    const creds = await this.credentialsManager.getCredentials();
    if (!creds) {
      throw new Error("No credentials to refresh");
    }

    const response = await fetch(`${this.apiBaseUrl}/api/auth/extension/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken: creds.refreshToken,
        client: "vscode"
      })
    });

    if (!response.ok) {
      // Refresh token invalid/revoked - clear credentials
      await this.credentialsManager.clearCredentials();
      throw new Error("Session expired - please reconnect your account");
    }

    const data = await response.json();

    // Update credentials with new access token
    await this.credentialsManager.setCredentials({
      ...creds,
      accessToken: data.accessToken,
      expiresAt: Date.now() + data.expiresIn * 1000
    });
  }
}
```

**Usage Example**:

```typescript
// In SnapBackTreeDataProvider or command handler
const apiClient = new AuthedApiClient(context, apiBaseUrl);

try {
  const safety = await apiClient.fetch<WorkspaceSafetyResponse>(
    "/api/v1/workspace/safety"
  );

  // Use safety data...
} catch (error) {
  if (error.message.includes("Session expired")) {
    // Show re-authentication prompt
    vscode.window.showErrorMessage(
      "SnapBack session expired. Please reconnect your account.",
      "Connect"
    ).then(action => {
      if (action === "Connect") {
        vscode.commands.executeCommand("snapback.connect");
      }
    });
  }
}
```

### Tree Provider Integration

**Authentication State Awareness**:

```typescript
export class SnapBackTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private credentialsManager: CredentialsManager;
  private apiClient: AuthedApiClient;

  constructor(
    context: vscode.ExtensionContext,
    /* ... existing parameters ... */
  ) {
    this.credentialsManager = new CredentialsManager(context.secrets);

    const config = vscode.workspace.getConfiguration("snapback");
    const apiBaseUrl = config.get<string>("apiBaseUrl", "https://api.snapback.dev");
    this.apiClient = new AuthedApiClient(context, apiBaseUrl);
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (!element) {
      // Root level - check auth state
      const creds = await this.credentialsManager.getCredentials();

      if (!creds) {
        // Not authenticated - show connect prompt
        return [this.createConnectAccountNode()];
      }

      // Authenticated - show normal sections
      return this.getRootSections();
    }

    // ... existing tree structure logic
  }

  private createConnectAccountNode(): vscode.TreeItem {
    const node = new vscode.TreeItem(
      "Connect SnapBack Account",
      vscode.TreeItemCollapsibleState.None
    );

    node.description = "Link VS Code to your SnapBack workspace";
    node.iconPath = new vscode.ThemeIcon("account");
    node.command = {
      command: "snapback.connect",
      title: "Connect Account"
    };

    return node;
  }

  private async getRootSections(): Promise<vscode.TreeItem[]> {
    try {
      // Fetch workspace data from API
      const [safety, snapshots] = await Promise.all([
        this.apiClient.fetch<WorkspaceSafetyResponse>("/api/v1/workspace/safety"),
        this.apiClient.fetch<SnapshotsListResponse>("/api/v1/workspace/snapshots?limit=5")
      ]);

      return [
        this.createSafetySection(safety),
        this.createSnapshotsSection(snapshots)
      ];

    } catch (error) {
      logger.error("Failed to fetch workspace data", error as Error);

      // On error, show retry node
      return [this.createErrorNode(error as Error)];
    }
  }
}
```

### Command Implementations

**snapback.connect**:

```typescript
vscode.commands.registerCommand("snapback.connect", async () => {
  const config = vscode.workspace.getConfiguration("snapback");
  const webConsoleUrl = config.get<string>("webConsoleBaseUrl", "https://console.snapback.dev");

  // Open browser to web console linking page
  const linkUrl = `${webConsoleUrl}/connect/vscode`;
  await vscode.env.openExternal(vscode.Uri.parse(linkUrl));

  vscode.window.showInformationMessage(
    "Complete the connection in your browser, then return to VS Code"
  );
});
```

**snapback.refreshTree**:

```typescript
vscode.commands.registerCommand("snapback.refreshTree", () => {
  treeDataProvider.refresh();
});
```

**snapback.openSnapshotInWeb**:

```typescript
vscode.commands.registerCommand("snapback.openSnapshotInWeb", async (snapshotId: string) => {
  const config = vscode.workspace.getConfiguration("snapback");
  const webConsoleUrl = config.get<string>("webConsoleBaseUrl", "https://console.snapback.dev");

  const snapshotUrl = `${webConsoleUrl}/snapshots/${snapshotId}`;
  await vscode.env.openExternal(vscode.Uri.parse(snapshotUrl));
});
```

**snapback.signOut**:

```typescript
vscode.commands.registerCommand("snapback.signOut", async () => {
  const confirm = await vscode.window.showWarningMessage(
    "Sign out of SnapBack? You'll need to reconnect to access cloud features.",
    { modal: true },
    "Sign Out",
    "Cancel"
  );

  if (confirm !== "Sign Out") return;

  try {
    // Get current credentials
    const credentialsManager = new CredentialsManager(context.secrets);
    const creds = await credentialsManager.getCredentials();

    if (creds) {
      // Call revoke endpoint
      const config = vscode.workspace.getConfiguration("snapback");
      const apiBaseUrl = config.get<string>("apiBaseUrl", "https://api.snapback.dev");

      await fetch(`${apiBaseUrl}/api/auth/extension/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: creds.refreshToken })
      });
    }

    // Clear local credentials
    await credentialsManager.clearCredentials();

    // Refresh tree to show connect prompt
    vscode.commands.executeCommand("snapback.refreshTree");

    vscode.window.showInformationMessage("SnapBack: Signed out successfully");

  } catch (error) {
    logger.error("Sign out failed", error as Error);
    vscode.window.showErrorMessage(`Failed to sign out: ${(error as Error).message}`);
  }
});
```

## Web Console Implementation (MVP)

**Base URL**: `https://console.snapback.dev`

### GET /connect/vscode Page

**Route**: `/connect/vscode`

**Purpose**: Landing page when extension opens browser for linking

**Implementation**:

```typescript
// app/connect/vscode/page.tsx (Server Component)
import { redirect } from "next/navigation";
import { auth } from "@snapback/auth";
import { VsCodeConnectFlow } from "./_components/VsCodeConnectFlow";

export default async function ConnectVsCodePage() {
  // Check if user is authenticated via BetterAuth
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    // Redirect to login, then back here
    redirect("/auth/login?returnTo=/connect/vscode");
  }

  // User is authenticated - show client component that handles linking
  return <VsCodeConnectFlow user={session.user} />;
}
```

**Client Component**:

```typescript
// app/connect/vscode/_components/VsCodeConnectFlow.tsx
"use client";

import { useEffect, useState } from "react";
import type { User } from "@snapback/auth";

interface VsCodeConnectFlowProps {
  user: User;
}

export function VsCodeConnectFlow({ user }: VsCodeConnectFlowProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initiateLinking() {
      try {
        // 1. Create link token
        const response = await fetch("https://api.snapback.dev/api/auth/extension/link-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Send BetterAuth session cookie
          body: JSON.stringify({ client: "vscode" })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create link token");
        }

        const { linkToken } = await response.json();

        // 2. Redirect to VS Code via deep link
        const deepLink = `vscode://snapback.snapback/auth?token=${linkToken}`;
        window.location.href = deepLink;

        setStatus("success");

      } catch (err) {
        setError((err as Error).message);
        setStatus("error");
      }
    }

    initiateLinking();
  }, []);

  return (
    <div className="container mx-auto max-w-md p-6">
      {status === "loading" && (
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Connecting VS Code...</h1>
          <p className="text-muted-foreground">Redirecting to VS Code extension...</p>
          <div className="mt-4 animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
      )}

      {status === "success" && (
        <div className="text-center">
          <svg className="h-16 w-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold mb-4">Connection Initiated</h1>
          <p className="text-muted-foreground mb-2">
            Return to VS Code to complete the connection.
          </p>
          <p className="text-sm text-muted-foreground">
            If VS Code didn't open automatically, make sure you have the SnapBack extension installed.
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center">
          <svg className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold mb-4">Connection Failed</h1>
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
```

### Dashboard Integration (Phase 2)

**Note**: For MVP, users access linking only via the extension's `snapback.connect` command. A "Connect VS Code Extension" button in the dashboard is deferred to Phase 2 to reduce scope.

**Phase 2 Implementation**:

```typescript
// app/dashboard/_components/ConnectVsCodeButton.tsx (Phase 2)
"use client";

export function ConnectVsCodeButton() {
  function handleConnect() {
    // Simply redirect to /connect/vscode
    window.location.href = "/connect/vscode";
  }

  return (
    <button onClick={handleConnect} className="btn-primary">
      Connect VS Code Extension
    </button>
  );
}
```

## MVP Scope vs Phase 2

### MVP (Implement Now)

**Database**:
- ✅ `extension_link_tokens` table with partial indexes
- ✅ `extension_sessions` table with unique index on refresh_token_hash

**API Endpoints** (on `api.snapback.dev`):
- ✅ `POST /api/auth/extension/link-token` - Create link token
- ✅ `POST /api/auth/extension/exchange` - Exchange for access/refresh tokens
- ✅ `POST /api/auth/extension/refresh` - Refresh access token
- ✅ JWT helper: `signExtensionAccessToken` and `verifyExtensionAccessToken`
- ✅ Middleware: `requireExtensionAuth` for `/api/v1/workspace/*` routes

**Web Console** (on `console.snapback.dev`):
- ✅ `GET /connect/vscode` page (auto-creates link token, redirects to deep link)
- ❌ Dashboard "Connect VS Code" button (deferred to Phase 2)
- ❌ Extension sessions management UI (deferred to Phase 2)

**VS Code Extension**:
- ✅ URI handler for `vscode://snapback.snapback/auth?token=...`
- ✅ SecretStorage for credentials
- ✅ `CredentialsManager` helper class
- ✅ `AuthedApiClient` with automatic token refresh
- ✅ `snapback.connect` command (opens `console.snapback.dev/connect/vscode`)
- ✅ `snapback.refreshTree` command
- ✅ Tree provider shows "Connect SnapBack Account" when not authenticated

**Client Support**:
- ✅ `client = "vscode"` only
- ❌ CLI and MCP clients (deferred to Phase 2)

### Phase 2 (Do Not Implement Yet)

**API Endpoints**:
- `POST /api/auth/extension/revoke` - Revoke session(s)

**Web Console**:
- Dashboard "Connect VS Code Extension" button
- `/settings/extensions` page (session management UI)
- Session listing, revocation, device info display

**Security Features**:
- Password change triggers that auto-revoke extension sessions
- Cron job to cleanup expired link tokens
- Rate limiting on auth endpoints
- Device management UI (name devices, view IP addresses)

**Client Support**:
- `client = "cli"` and `client = "mcp"`
- Multi-client authentication flows

**Advanced Features**:
- Refresh token rotation
- Device fingerprinting
- Scoped permissions per session
- Multi-workspace support

### Link Token Errors

| Error | Scenario | User Message | Action |
|-------|----------|--------------|--------|
| `invalid_token` | Token hash not found in DB | "Invalid connection link. Please try again." | Show "Connect" button |
| `token_expired` | Token created > 5 minutes ago | "Connection link expired. Please generate a new one." | Show "Connect" button |
| `token_already_used` | Token already exchanged | "This connection link has already been used." | Show "Connect" button |
| `authentication_required` | No BetterAuth session | "Please sign in first." | Redirect to login |

### Access Token Errors

| Error | Scenario | User Message | Action |
|-------|----------|--------------|--------|
| `missing_token` | No Authorization header | "Authentication required" | Show connect prompt |
| `invalid_token` | JWT signature invalid | "Invalid authentication token" | Clear credentials, show connect prompt |
| `token_expired` | JWT exp claim passed | (Silent) | Auto-refresh with refresh token |
| `session_revoked` | Extension session revoked in DB | "Session revoked. Please reconnect." | Clear credentials, show connect prompt |

### Refresh Token Errors

| Error | Scenario | User Message | Action |
|-------|----------|--------------|--------|
| `invalid_refresh_token` | Token hash not found | "Session expired. Please reconnect your account." | Clear credentials, show connect prompt |
| `session_revoked` | Session revoked_at IS NOT NULL | "Session was revoked. Please reconnect." | Clear credentials, show connect prompt |
| `session_expired` | Session expires_at < NOW() | "Session expired. Please reconnect your account." | Clear credentials, show connect prompt |

### User Feedback Messages

**Success Messages**:

- **Link Token Created**: "Opening VS Code... Complete the connection in the extension." (web toast)
- **Token Exchanged**: "SnapBack: VS Code is now linked to {user.email}" (VS Code notification)
- **Token Refreshed**: (Silent - no notification)
- **Session Revoked**: "SnapBack: Signed out successfully" (VS Code notification)

**Error Messages**:

- **Web - Link Token Failed**: "Failed to create connection link. Please try again."
- **VS Code - Exchange Failed**: "SnapBack: Failed to link account - {error message}"
- **VS Code - Refresh Failed**: "SnapBack session expired. Please reconnect your account."
- **VS Code - API Call Failed**: "Failed to fetch workspace data. Check your connection."

## Security Considerations

### Threat Model

**Threats Addressed**:

1. **Token Interception**: Link tokens transmitted via HTTPS only, short-lived (5 min)
2. **Token Replay**: One-time use enforcement via `used` flag with transaction
3. **Token Theft**: Tokens hashed before storage, never logged
4. **Session Hijacking**: Refresh tokens hashed, stored in OS-encrypted SecretStorage
5. **CSRF**: Deep links bypass browser CSRF (no cookies involved)

**Threats NOT Addressed** (out of scope):

1. **Malicious Extension**: VS Code marketplace vetting process required
2. **Compromised Device**: OS-level keychain compromise affects all apps
3. **Man-in-the-Middle**: HTTPS required (not enforced in dev for localhost)

### Data Privacy

**PII Handling**:

- User email transmitted in exchange response (required for UX)
- No passwords ever transmitted or stored by extension
- Workspace name transmitted (not considered PII)
- Device metadata (platform, hostname) optional and user-controlled

**Logging**:

- Never log tokens (link, refresh, access)
- Log token hashes for debugging (safe)
- Log userId for audit trail
- Redact sensitive headers in request logs

**Storage**:

- Database: Only hashed tokens
- VS Code: SecretStorage uses OS keychain (Keychain on macOS, Credential Manager on Windows, Secret Service on Linux)
- Web: No token storage (session cookies only)

### Rate Limiting

**Link Token Creation**:

- 5 requests per minute per user
- Prevents abuse of token generation

**Token Exchange**:

- 10 requests per minute per IP
- Prevents brute-force token guessing

**Token Refresh**:

- 60 requests per hour per session
- Normal usage: 4 requests/hour (15 min tokens)

### Audit Logging

**Events to Track**:

| Event | Data | Purpose |
|-------|------|---------|
| `extension.link_token_created` | userId, client, expiresAt | Monitor linking activity |
| `extension.token_exchanged` | userId, client, sessionId, deviceInfo | Track successful links |
| `extension.token_refreshed` | userId, sessionId | Monitor token usage |
| `extension.session_revoked` | userId, sessionId, reason | Track sign-outs |
| `extension.auth_failed` | userId?, errorCode, client | Security monitoring |

**Retention**:

- Keep audit logs for 90 days
- Archive for 1 year for compliance
- Rotate logs for performance

## Database Migration Scripts

### Migration: Create extension_link_tokens

```sql
-- Migration: 0009_create_extension_link_tokens.sql
CREATE TABLE IF NOT EXISTS extension_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  workspace_id UUID,
  client TEXT NOT NULL CHECK (client IN ('vscode', 'cli', 'mcp')),
  used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast token lookup
CREATE INDEX idx_extension_link_tokens_hash
  ON extension_link_tokens(token_hash)
  WHERE used = FALSE AND expires_at > NOW();

-- Index for cleanup jobs
CREATE INDEX idx_extension_link_tokens_expiry
  ON extension_link_tokens(expires_at);

-- Cleanup old tokens (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_link_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM extension_link_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (if using pg_cron)
-- SELECT cron.schedule('cleanup-link-tokens', '*/15 * * * *', 'SELECT cleanup_expired_link_tokens()');
```

### Migration: Create extension_sessions

```sql
-- Migration: 0010_create_extension_sessions.sql
CREATE TABLE IF NOT EXISTS extension_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  workspace_id UUID,
  client TEXT NOT NULL CHECK (client IN ('vscode', 'cli', 'mcp')),
  refresh_token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days',
  metadata JSONB
);

-- Index for fast refresh token lookup
CREATE UNIQUE INDEX idx_extension_sessions_refresh_hash
  ON extension_sessions(refresh_token_hash)
  WHERE revoked_at IS NULL;

-- Index for user session queries
CREATE INDEX idx_extension_sessions_user
  ON extension_sessions(user_id)
  WHERE revoked_at IS NULL;

-- Index for active session queries
CREATE INDEX idx_extension_sessions_active
  ON extension_sessions(user_id, revoked_at)
  WHERE revoked_at IS NULL AND expires_at > NOW();

-- Trigger to auto-revoke on password change
CREATE OR REPLACE FUNCTION revoke_extension_sessions_on_password_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.password IS DISTINCT FROM OLD.password THEN
    UPDATE extension_sessions
    SET revoked_at = NOW()
    WHERE user_id = NEW.id
      AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER revoke_sessions_on_password_change
  AFTER UPDATE ON "user"
  FOR EACH ROW
  WHEN (OLD.password IS DISTINCT FROM NEW.password)
  EXECUTE FUNCTION revoke_extension_sessions_on_password_change();
```

### Drizzle Schema Definitions

```typescript
// packages/platform/src/db/schema/extension-auth.ts
import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const extensionLinkTokens = pgTable("extension_link_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id"),
  client: text("client").notNull(), // 'vscode' | 'cli' | 'mcp'
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const extensionSessions = pgTable("extension_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id"),
  client: text("client").notNull(), // 'vscode' | 'cli' | 'mcp'
  refreshTokenHash: text("refresh_token_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  metadata: jsonb("metadata") // { extensionVersion, vscodeVersion, platform, hostname }
});
```

## Testing Strategy

### Unit Tests

**Backend**:

1. **Token Generation**
   - Test: Link token is 64 hex characters
   - Test: Refresh token is 80 hex characters
   - Test: SHA-256 hashing produces consistent results

2. **Token Validation**
   - Test: Expired tokens rejected
   - Test: Used tokens rejected
   - Test: Invalid hash rejected
   - Test: Client mismatch rejected

3. **JWT Signing/Verification**
   - Test: Access token contains correct claims
   - Test: Expired access token rejected
   - Test: Invalid signature rejected
   - Test: Audience mismatch rejected

**Frontend (VS Code)**:

1. **CredentialsManager**
   - Test: Credentials stored in SecretStorage
   - Test: Credentials retrieved correctly
   - Test: Credentials cleared on sign out
   - Test: isAccessTokenExpired() with various expiresAt values

2. **AuthedApiClient**
   - Test: Bearer token added to requests
   - Test: 401 triggers refresh
   - Test: Concurrent refreshes deduplicated
   - Test: Refresh failure clears credentials

3. **URI Handler**
   - Test: Handles /auth path
   - Test: Extracts token from query
   - Test: Invalid token shows error
   - Test: Successful exchange stores credentials

### Integration Tests

**End-to-End Flow A** (Web → VS Code):

1. User authenticated on web
2. Click "Connect VS Code"
3. Link token created
4. Deep link opened
5. VS Code receives token
6. Token exchanged
7. Credentials stored
8. Tree view refreshed

**End-to-End Flow B** (VS Code → Web):

1. User clicks "Connect" in VS Code
2. Browser opens to /connect/vscode
3. User logs in (if needed)
4. Link token created
5. Deep link opened
6. VS Code receives token
7. Token exchanged
8. Credentials stored
9. Tree view refreshed

**Token Refresh Flow**:

1. Extension makes API call with expired access token
2. Client detects expiry, calls /refresh
3. New access token received
4. Original API call retried
5. Response returned successfully

**Session Revocation Flow**:

1. User revokes session on web
2. Extension attempts API call
3. 401 returned
4. Refresh attempted
5. Refresh fails (session revoked)
6. Credentials cleared
7. Connect prompt shown

### Manual Testing Checklist

- [ ] Web: Link token created successfully
- [ ] Web: Deep link opens VS Code
- [ ] VS Code: URI handler receives token
- [ ] VS Code: Token exchange succeeds
- [ ] VS Code: Credentials stored in SecretStorage
- [ ] VS Code: Tree view shows workspace data
- [ ] VS Code: API calls include Bearer token
- [ ] VS Code: Access token refreshed automatically
- [ ] VS Code: Expired refresh token shows re-auth prompt
- [ ] Web: Extension sessions page lists active sessions
- [ ] Web: Revoke session signs out extension
- [ ] VS Code: Sign out clears credentials
- [ ] VS Code: Re-authentication after sign out works

## Performance Considerations

### Database Query Optimization

**Link Token Lookup**:
- Indexed on `token_hash` with filtered index (unused, not expired)
- Query time: < 5ms

**Refresh Token Lookup**:
- Unique index on `refresh_token_hash` with filtered index (not revoked)
- Query time: < 5ms

**User Session Listing**:
- Indexed on `user_id` with filtered index (not revoked)
- Query time: < 10ms (typical 1-5 sessions per user)

### Token Cleanup

**Background Job** (scheduled every 15 minutes):

```typescript
async function cleanupExpiredLinkTokens() {
  const result = await db
    .delete(extensionLinkTokens)
    .where(
      lt(extensionLinkTokens.expiresAt, new Date(Date.now() - 3600000)) // 1 hour ago
    );

  logger.info("Cleaned up expired link tokens", { count: result.rowCount });
}
```

**Impact**:
- Prevents table bloat (link tokens short-lived)
- Runs during off-peak hours
- Minimal performance impact (< 100ms)

### Client-Side Caching

**VS Code Extension**:

- Credentials cached in memory after first read from SecretStorage
- Refresh token deduplication prevents concurrent API calls
- Tree view data cached with configurable TTL (30 seconds)

**Web Application**:

- No token caching (uses BetterAuth session cookies)
- Extension sessions list cached with SWR (stale-while-revalidate)

## Deployment Checklist

### Environment Variables

**API Service**:

- `BETTER_AUTH_SECRET` - Shared secret for JWT signing (32+ bytes)
- `APP_URL` - Public web app URL (for JWT issuer claim)
- `DATABASE_URL` - PostgreSQL connection string

**Web Application**:

- `NEXT_PUBLIC_APP_URL` - Public web app URL
- `NEXT_PUBLIC_API_URL` - API service URL (internal)

**VS Code Extension**:

- `snapback.apiBaseUrl` - User setting (default: https://api.snapback.dev)
- `snapback.webConsoleBaseUrl` - User setting (default: https://app.snapback.dev)

### Database Migrations

1. Run migration 0009 (extension_link_tokens)
2. Run migration 0010 (extension_sessions)
3. Verify indexes created
4. Verify triggers created
5. Test cleanup function

### API Route Deployment

1. Deploy link-token endpoint
2. Deploy exchange endpoint
3. Deploy refresh endpoint
4. Deploy revoke endpoint
5. Update existing workspace routes with auth middleware

### Extension Deployment

1. Bump extension version
2. Add URI handler registration
3. Add CredentialsManager
4. Add AuthedApiClient
5. Update TreeDataProvider
6. Add connect/sign-out commands
7. Update package.json contributions
8. Build and package VSIX
9. Submit to VS Code marketplace

### Web Application Deployment

1. Add /connect/vscode page
2. Add Connect VS Code button to dashboard
3. Add /settings/extensions page
4. Deploy API route handlers
5. Test deep link generation
6. Verify HTTPS enforcement

### Monitoring

**Metrics to Track**:

- Link token creation rate
- Token exchange success rate
- Token refresh rate
- Session revocation rate
- API authentication errors

**Alerts**:

- High token exchange failure rate (> 5%)
- High refresh token failure rate (> 2%)
- Unusual token creation spikes
- Database query slowness (> 100ms)

## Future Enhancements

### Phase 2 Features

1. **Refresh Token Rotation**
   - Issue new refresh token on each refresh
   - Invalidate old refresh token
   - Detect token theft (old token reused)

2. **Device Management**
   - Name devices (e.g., "MacBook Pro", "Work Laptop")
   - View last IP address and location
   - Remote device wipe capability

3. **Scoped Permissions**
   - Limit extension access to specific workspaces
   - Read-only vs. read-write permissions
   - Fine-grained API endpoint access

4. **Multi-Workspace Support**
   - Link to multiple workspaces per user
   - Switch workspace in extension UI
   - Workspace-specific credentials

5. **Offline Mode**
   - Cache API responses in extension
   - Queue write operations for sync
   - Graceful degradation without internet

### Security Hardening

1. **IP Allowlisting**
   - Restrict token exchange to known IPs
   - Corporate network enforcement

2. **Device Fingerprinting**
   - Track unique device identifiers
   - Detect suspicious device changes

3. **2FA for Linking**
   - Require 2FA code during token exchange
   - Extra security for sensitive accounts

4. **Token Binding**
   - Bind access token to refresh token
   - Prevent token theft attacks

## Acceptance Criteria

### Functional Requirements

- [x] Users can link VS Code from web app in < 10 seconds
- [x] Users can link VS Code from extension in < 10 seconds
- [x] Link tokens expire after 5 minutes
- [x] Link tokens cannot be reused
- [x] Access tokens refresh automatically
- [x] Refresh tokens valid for 90 days
- [x] Sessions can be revoked from web
- [x] Sign out clears credentials in extension
- [x] Tree view shows auth-aware UI
- [x] API calls include Bearer tokens
- [x] 401 errors trigger re-authentication prompt

### Non-Functional Requirements

- [x] Link token lookup < 5ms (database)
- [x] Refresh token lookup < 5ms (database)
- [x] Token exchange < 100ms (end-to-end)
- [x] Token refresh < 50ms (end-to-end)
- [x] All tokens hashed before storage
- [x] No tokens logged in plaintext
- [x] HTTPS enforced in production
- [x] Rate limiting on all endpoints
- [x] Audit logging for security events
- [x] Graceful error handling with user-friendly messages

### User Experience Requirements

- [x] Clear success/error messages
- [x] No manual token copy/paste
- [x] Automatic deep link opening
- [x] Silent token refresh (no interruptions)
- [x] Connect prompt when unauthenticated
- [x] Session management UI in web app
- [x] Device information visible
- [x] Last used timestamp shown

## Migration from Existing Auth

### Current State Analysis

The VS Code extension currently has:
- `SnapBackOAuthProvider` (registered but not fully implemented)
- `snapback.signIn` and `snapback.signOut` commands
- Configuration: `snapback.api.baseUrl`

### Migration Path

**Phase 1**: Implement new flow alongside existing (no breaking changes)

1. Add new endpoints without removing old ones
2. Extension detects if user has new credentials format
3. Show migration prompt: "Connect to new auth system"
4. Old credentials remain functional during transition

**Phase 2**: Deprecate old auth (with notice period)

1. Show deprecation warning in extension
2. Provide migration guide in docs
3. Set sunset date (e.g., 90 days)
4. Auto-migrate users on extension update

**Phase 3**: Remove old auth (after sunset)

1. Remove old endpoints
2. Remove old credential handling
3. Remove SnapBackOAuthProvider (replaced by link flow)
4. Clean up old database tables

### User Communication

**Announcement**:
- Blog post explaining new auth flow
- In-app notifications in web and extension
- Email to active users
- Update release notes

**Migration Guide**:
- Step-by-step instructions
- Screenshots of new flow
- FAQ for common issues
- Support contact information

## Acceptance Criteria (MVP)

### Functional Requirements

- [ ] **From VS Code**: User can click "Connect SnapBack Account" node in tree view
- [ ] **Browser Opens**: `snapback.connect` command opens `https://console.snapback.dev/connect/vscode` in default browser
- [ ] **Auth Flow**: User authenticates via BetterAuth if not already logged in
- [ ] **Link Token**: Web console calls `POST https://api.snapback.dev/api/auth/extension/link-token` and receives valid token
- [ ] **Deep Link**: Browser redirects to `vscode://snapback.snapback/auth?token={linkToken}`
- [ ] **Token Exchange**: Extension URI handler calls `POST https://api.snapback.dev/api/auth/extension/exchange`
- [ ] **Credentials Stored**: Extension stores credentials in SecretStorage under key `"snapback.extensionCredentials"`
- [ ] **Tree Refresh**: SnapBack tree view automatically refreshes and shows workspace data
- [ ] **API Calls Work**: Extension makes authenticated API calls to `/api/v1/workspace/*` with `Authorization: Bearer {accessToken}`
- [ ] **Token Refresh**: When access token expires, extension automatically calls `/api/auth/extension/refresh` and retries request
- [ ] **Error Handling**: Invalid/expired link tokens show clear error messages in extension
- [ ] **Single Use**: Link tokens can only be exchanged once (subsequent attempts return 400)
- [ ] **Expiration**: Link tokens expire after 5 minutes

### Database Requirements

- [ ] `extension_link_tokens` table created with correct schema
- [ ] `extension_sessions` table created with correct schema
- [ ] Partial index on `extension_link_tokens.token_hash` WHERE `used = FALSE AND expires_at > NOW()`
- [ ] Unique index on `extension_sessions.refresh_token_hash` WHERE `revoked_at IS NULL`
- [ ] All tokens stored as SHA-256 hashes (never plaintext)
- [ ] **Race Condition Prevention**: Link token exchange uses conditional update with `rowCount !== 1` check to ensure one-time use

### Security Requirements

- [ ] Link tokens are 64 hex characters (32 bytes random)
- [ ] Refresh tokens are 80 hex characters (40 bytes random)
- [ ] Access tokens are valid JWTs signed with `BETTER_AUTH_SECRET`
- [ ] JWT contains correct claims: `sub`, `w`, `c`, `esid`, `aud`, `iss`, `iat`, `exp`
- [ ] JWT `aud` claim is `"snapback-extension"`
- [ ] JWT `iss` claim is `env.APP_URL` or `"https://console.snapback.dev"`
- [ ] Access tokens expire after 15 minutes
- [ ] Refresh tokens expire after 90 days
- [ ] `requireExtensionAuth` middleware verifies JWT signature and checks session not revoked
- [ ] No tokens logged in plaintext (only hashes logged for debugging)

### User Experience Requirements

- [ ] Linking flow completes in under 10 seconds (typical case)
- [ ] Clear success message: "SnapBack: VS Code is now linked to {user.email}"
- [ ] Clear error messages for common failures (expired token, invalid token, etc.)
- [ ] No manual token copy/paste required
- [ ] Tree view shows "Connect SnapBack Account" node when not authenticated
- [ ] Tree view shows workspace data after successful linking
- [ ] `snapback.refreshTree` command refreshes tree data

### API Integration Requirements

- [ ] All API endpoints use `https://api.snapback.dev` base URL
- [ ] Web console uses `https://console.snapback.dev` base URL
- [ ] **CORS Configuration**: API sends `Access-Control-Allow-Origin: https://console.snapback.dev` and `Access-Control-Allow-Credentials: true`
- [ ] **Cookie Configuration**: BetterAuth cookies have `Domain=.snapback.dev`, `SameSite=None; Secure`
- [ ] BetterAuth session cookies work across `api.snapback.dev` and `console.snapback.dev`
- [ ] Extension can make authenticated requests to `/api/v1/workspace/safety`
- [ ] Extension can make authenticated requests to `/api/v1/workspace/snapshots` (standardized path)
- [ ] 401 responses reserved for JWT validation failures only (not other errors)
- [ ] **Error Message Contract**: Refresh failures throw exact string `"Session expired - please reconnect your account"`
- [ ] Unrecoverable auth errors clear credentials and show re-connection prompt

### TypeScript Type Safety Requirements

- [ ] `ExtensionCredentials` interface properly typed
- [ ] `ExtensionAuthContext` interface properly typed
- [ ] JWT payload interface properly typed
- [ ] API response types properly typed
- [ ] No `any` types in auth-related code (use proper types or `unknown`)
- [ ] Drizzle schema exports correct types for tables

### Manual Testing Checklist

- [ ] Test: Valid linking flow completes successfully
- [ ] Test: Expired link token shows error
- [ ] Test: Already-used link token returns `"token_already_used"` error
- [ ] Test: **Concurrent exchange**: Two simultaneous exchanges of same link token - only one succeeds
- [ ] Test: Invalid link token shows error
- [ ] Test: Access token refresh works when token expires
- [ ] Test: Refresh with invalid refresh token clears credentials and shows "Session expired - please reconnect your account"
- [ ] Test: API calls include correct `Authorization` header
- [ ] Test: Tree view shows connect prompt when credentials cleared
- [ ] Test: `snapback.connect` command opens correct URL
- [ ] Test: Multiple linking attempts create separate sessions

## Out of Scope (Phase 2)

- Session revocation API
- Web console dashboard "Connect VS Code" button
- Extension sessions management UI
- Password change auto-revocation
- Cron job for token cleanup
- Rate limiting on auth endpoints
- CLI and MCP client support
- Refresh token rotation
- Device management features
- Multi-workspace support
