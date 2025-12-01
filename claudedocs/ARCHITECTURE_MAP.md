# SnapBack System Architecture Map

**Analysis Date:** 2025-10-29
**Repository:** `/Users/user1/WebstormProjects/SnapBack-Site`
**Monorepo Structure:** Turborepo with pnpm workspaces

---

## Executive Summary

SnapBack is a **monolithic-modular architecture** with 4 client applications, 11 packages, and a sophisticated event-driven communication layer. The system provides AI-safe code snapshot management with risk analysis, file protection, and multi-client access patterns.

**Key Architectural Findings:**

-   Detection/analysis logic is centralized in `@snapback/core` (Guardian, RiskAnalyzer, ThreatDetector)
-   Communication uses **dual patterns**: IPC via Unix sockets (EventBus) + HTTP/WebSocket for web API
-   VS Code extension is the primary consumer; MCP server and CLI are secondary interfaces
-   Auth is separate from detection logic; entitlements flow through `@snapback/auth` → `@snapback/platform`
-   No direct VS Code ↔ Web communication; all goes through event bus or API

---

## System Components

### Applications Layer (`apps/`)

#### 1. **VS Code Extension** (`apps/vscode`)

**Path:** `/Users/user1/WebstormProjects/SnapBack-Site/apps/vscode`

**Main Responsibilities:**

-   Primary user interface for snapshot management
-   File protection with Watch/Warn/Block levels
-   Real-time risk analysis on file saves
-   Git integration and semantic snapshot naming
-   Configuration management (.snapbackrc)

**Key Files:**

-   Entry: `src/extension.ts` (phased initialization)
-   Storage: `src/storage/SqliteStorageAdapter.ts` (better-sqlite3)
-   Core Logic: `src/operationCoordinator.ts`, `src/snapshot/`
-   Protection: `src/protection/`, `src/handlers/SaveHandler.ts`

**Dependencies (Internal):**

```typescript
@snapback/contracts  // Shared types & schemas
@snapback/core       // Guardian, RiskAnalyzer, ThreatDetector
@snapback/events     // EventBus for IPC
@snapback/infrastructure  // Logging, utilities
@snapback/sdk        // Storage abstractions
```

**Communication:**

-   **IPC:** EventBus via Unix socket (`/tmp/snapback.sock` or `\\\\.\\pipe\\snapback`)
-   **Local Storage:** SQLite database in workspace
-   **External:** Git commands via `simple-git`

**Data Flow:**

```
File Save → SaveHandler → RiskAnalyzer.analyzeFileChanges()
  → Guardian.analyze() → ThreatDetector.detect()
  → Decision: Create snapshot? → SqliteStorageAdapter.save()
  → EventBus.publish(SNAPSHOT_CREATED)
```

---

#### 2. **MCP Server** (`apps/mcp-server`)

**Path:** `/Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server`

**Main Responsibilities:**

-   Model Context Protocol server for AI assistants (Claude, etc.)
-   Risk analysis API for code changes
-   Snapshot management via IPC
-   External MCP client federation

**Key Files:**

-   Entry: `src/index.ts` (stdio transport)
-   IPC Client: `src/client/extension-ipc.ts`
-   Agent: `src/agent/` (placeholder for future)

**Dependencies (Internal):**

```typescript
@snapback/contracts
@snapback/core       // Guardian, DependencyAnalyzer, MCPClientManager
@snapback/events     // EventBus client
@snapback/sdk        // LocalStorage
```

**Exposed Tools:**

1. `snapback.analyze_risk` - Analyze code changes for risks
2. `snapback.create_checkpoint` - Create snapshot via IPC
3. `snapback.list_checkpoints` - List snapshots
4. `snapback.restore_checkpoint` - Restore snapshot

**Communication:**

-   **Input:** STDIO (MCP protocol)
-   **IPC:** EventBus.connect() + request/response pattern
-   **Extension API:** `ExtensionIPCClient` for snapshot operations

**Data Flow:**

```
AI Client → MCP Tool Call → Guardian.analyze(diffChanges)
  → Return risk analysis OR
  → ExtensionIPCClient.request('createSnapshot')
  → EventBus.request() → Extension creates snapshot
```

---

#### 3. **Next.js Web App** (`apps/web`)

**Path:** `/Users/user1/WebstormProjects/SnapBack-Site/apps/web`

**Main Responsibilities:**

-   SaaS dashboard and account management
-   Snapshot browsing and analytics
-   Subscription/billing management (Stripe)
-   API documentation (Scalar UI)

**Key Files:**

-   App Router: `app/(saas)/`, `app/api/`
-   Middleware: `middleware.ts`, `middleware/auth.ts`
-   API Routes: Via `@snapback/api` package

**Dependencies (Internal):**

```typescript
@snapback/api            // Hono API routes
@snapback/auth           // Better-auth integration
@snapback/config
@snapback/core           // Limited usage
@snapback/infrastructure
@snapback/integrations   // Stripe, Email
@snapback/platform       // Database client
```

**Communication:**

-   **HTTP/HTTPS:** Next.js server routes
-   **Database:** PostgreSQL via Drizzle ORM (`@snapback/platform/db`)
-   **Auth:** Better-auth session management
-   **External:** Stripe webhooks, PostHog analytics

**Data Flow:**

```
User Request → Next.js Middleware (auth check)
  → API Route (@snapback/api)
  → Platform DB query
  → Response with snapshot data/metrics
```

---

#### 4. **CLI Tool** (`apps/cli`)

**Path:** `/Users/user1/WebstormProjects/SnapBack-Site/apps/cli`

**Main Responsibilities:**

-   Command-line snapshot management
-   File risk analysis
-   Interactive file selection

**Key Files:**

-   Entry: `src/index.ts` (Commander.js)

**Dependencies (Internal):**

```typescript
@snapback/contracts  // createSnapshotStorage()
@snapback/core       // Guardian
```

**Commands:**

-   `snapback analyze <file>` - Risk analysis with AST option
-   `snapback snapshot` - Create snapshot with file selection
-   `snapback list` - List snapshots
-   `snapback restore` - Restore snapshot

**Communication:**

-   **Local:** Direct file system access
-   **Storage:** Uses `createSnapshotStorage()` from contracts

---

### Core Packages Layer (`packages/`)

#### 5. **Core Logic** (`packages/core`)

**Path:** `/Users/user1/WebstormProjects/SnapBack-Site/packages/core`

**Main Responsibilities:**

-   **Risk Analysis:** Primary detection and analysis engine
-   **Code Intelligence:** AST parsing, complexity metrics
-   **Git Integration:** Commit context, change velocity
-   **MCP Federation:** External MCP client management

**Key Classes:**

**Guardian** (`src/guardian.ts`):

```typescript
class Guardian {
	analyze(content: string | DiffChange[]): Promise<AnalysisResult>;
	analyzeWithAST(content: string): Promise<AnalysisResult>;
	quickCheckDoc(content: string): Promise<AnalysisResult>;

	// Returns: { score, factors, recommendations, severity }
}
```

**RiskAnalyzer** (`src/risk-analyzer.ts`):

```typescript
class RiskAnalyzer {
	analyzeFileChanges(
		fileChanges: FileChangeInfo[]
	): Promise<RiskAnalysisResult>;
	shouldCreateSnapshot(riskScore: number): boolean;
	setSelectiveSnapshotConfig(config: SelectiveSnapshotConfig): void;

	// Returns: { score, factors, threats, changeVelocity, fileComplexity }
}
```

**ThreatDetector** (`src/threat-detection.ts`):

```typescript
function detectThreats(code: string): DetectedThreat[];
// Patterns: rm -rf, DROP TABLE, hardcoded passwords, API keys
```

**GitIntegration** (`src/git-integration.ts`):

-   Commit context extraction
-   Change velocity tracking
-   Semantic commit message generation

**MCPClientManager** (`src/mcp-client.ts`):

-   Federation with external MCP servers
-   Request routing
-   Fallback handling

**Dependencies:**

```typescript
@snapback/config
@snapback/contracts
// External: esprima, typescript-eslint, madge, jscpd
```

**Data Flow:**

```
File Change → RiskAnalyzer → [Guardian, ThreatDetector, GitIntegration]
  → Risk Score Calculation → shouldCreateSnapshot() decision
```

---

#### 6. **API Package** (`packages/api`)

**Path:** `/Users/user1/WebstormProjects/SnapBack-Site/packages/api`

**Main Responsibilities:**

-   REST/RPC API routes (Hono framework)
-   OpenAPI schema generation
-   Middleware: rate limiting, usage tracking, error handling

**Key Files:**

-   Entry: `index.ts` (Hono app setup)
-   Router: `orpc/router.ts`, `orpc/handler.ts`
-   Modules:
    -   `modules/snapshots/procedures/` - CRUD operations
    -   `modules/risk/procedures/` - Risk analysis endpoint
    -   `modules/dashboard/procedures/` - Metrics & analytics
    -   `modules/apikeys/procedures/` - API key management
    -   `modules/privacy/procedures/` - GDPR compliance
    -   `modules/webhooks/` - Email, PostHog, HubSpot

**Dependencies:**

```typescript
@snapback/auth       // Auth middleware
@snapback/config
@snapback/core       // Risk analysis
@snapback/platform   // Database access
@snapback/integrations  // Stripe, Email
// External: hono, orpc, zod
```

**Endpoints:**

-   `/api/auth/**` - Better-auth routes
-   `/api/rpc/**` - oRPC procedures
-   `/api/openapi` - OpenAPI schema
-   `/api/docs` - Scalar documentation UI
-   `/api/webhooks/payments` - Stripe webhooks
-   `/api/health` - Health check

---

#### 7. **Authentication** (`packages/auth`)

**Path:** `/Users/user1/WebstormProjects/SnapBack-Site/packages/auth`

**Main Responsibilities:**

-   User authentication via Better-auth
-   API key generation & validation
-   Rate limiting per user/API key
-   Subscription tier enforcement
-   Session management

**Key Files:**

-   Entry: `index.ts`, `auth.ts` (Better-auth config)
-   Exports:
    -   `generateApiKey()`, `hashApiKey()`, `verifyApiKey()`
    -   `createApiKey()`, `validateApiKey()`, `revokeApiKey()`
    -   `checkRateLimit()`, `trackUsage()`
    -   `getSubscriptionLimits()`

**Dependencies:**

```typescript
@snapback/config
@snapback/contracts
@snapback/infrastructure  // Logger
@snapback/integrations
// External: better-auth, bcrypt, drizzle-orm
```

**Session Structure:**

```typescript
interface Session {
	user: User;
	session: SessionData;
	activeOrganization: ActiveOrganization | null;
}
```

**Rate Limiting:**

-   Per-user rate limits based on subscription tier
-   Per-API-key rate limits (configurable)
-   Tracked via `api_usage` table in PostgreSQL

---

#### 8. **Platform/Database** (`packages/platform`)

**Path:** `/Users/user1/WebstormProjects/SnapBack-Site/packages/platform`

**Main Responsibilities:**

-   Database schema & client (Drizzle ORM)
-   Supabase integration
-   Database migrations

**Key Files:**

-   Schema: `src/db/schema/postgres/` (users, subscriptions, api_keys, snapshots)
-   Client: `src/db/client/` (Drizzle + Supabase)
-   Zod validators: `src/db/zod.ts`

**Tables:**

-   `user` - User accounts
-   `session` - Auth sessions
-   `account` - OAuth accounts
-   `organization` - Team accounts
-   `organization_member` - Team membership
-   `subscriptions` - Subscription tiers
-   `api_keys` - API authentication
-   `api_usage` - Usage tracking
-   `snapshots` - Snapshot metadata (web-accessible)

**Dependencies:**

```typescript
@snapback/config
@snapback/contracts
@snapback/infrastructure
// External: drizzle-orm, supabase, pg
```

---

#### 9. **SDK** (`packages/sdk`)

**Path:** `/Users/user1/WebstormProjects/SnapBack-Site/packages/sdk`

**Main Responsibilities:**

-   Client SDK for SnapBack API
-   Storage abstractions (LocalStorage, MemoryStorage)
-   HTTP client with retry logic
-   Privacy utilities (hashing, sanitization)

**Key Classes:**

-   `SnapbackClient` - Main API client
-   `SnapshotClient` - Snapshot operations
-   `ProtectionClient` - Protection management
-   `SnapbackAnalyticsClient` - Analytics tracking
-   `LocalStorage` - SQLite storage adapter
-   `MemoryStorage` - In-memory storage

**Dependencies:**

```typescript
@snapback/contracts
@snapback/infrastructure
// External: ky, better-sqlite3, p-retry, quick-lru
```

---

#### 10. **Contracts** (`packages/contracts`)

**Path:** `/Users/user1/WebstormProjects/SnapBack-Site/packages/contracts`

**Main Responsibilities:**

-   Shared TypeScript types & interfaces
-   Zod schemas for validation
-   Constants & enums
-   Feature flags

**Key Exports:**

-   `Snapshot`, `ProtectionLevel`, `SnapshotMetadata`
-   `DiffChange`, `AnalysisResult`, `RiskAnalysisResult`
-   `FeatureManager` (feature flags)
-   `createSnapshotStorage()` (factory function)
-   Zod schemas for all entities

**Dependencies:**

```typescript
// External: zod, dotenv
```

---

#### 11. **Events** (`packages/events`)

**Path:** `/Users/user1/WebstormProjects/SnapBack-Site/packages/events`

**Main Responsibilities:**

-   IPC event bus (Unix socket / named pipe)
-   Request/response pattern
-   Pub/sub messaging

**Key Class:**

```typescript
class SnapBackEventBus extends EventEmitter {
	startServer(): Promise<void>; // VS Code extension
	connect(): Promise<void>; // MCP server, CLI
	publish(event: string, payload: any): void;
	request(event: string, data: any): Promise<any>; // RPC-style
	onRequest(event: string, handler): void;
}
```

**Event Types:**

```typescript
enum SnapBackEvent {
  SNAPSHOT_CREATED = "snapshot:created"
  SNAPSHOT_DELETED = "snapshot:deleted"
  SNAPSHOT_RESTORED = "snapshot:restored"
  PROTECTION_CHANGED = "protection:changed"
  FILE_PROTECTED = "file:protected"
  FILE_UNPROTECTED = "file:unprotected"
  ANALYSIS_REQUESTED = "analysis:requested"
  ANALYSIS_COMPLETED = "analysis:completed"
}
```

**Socket Path:**

-   Unix: `/tmp/snapback.sock`
-   Windows: `\\\\.\\pipe\\snapback`

**Dependencies:**

```typescript
@snapback/config
// Node.js: net, events, fs, os
```

---

#### 12. **Infrastructure** (`packages/infrastructure`)

**Path:** `/Users/user1/WebstormProjects/SnapBack-Site/packages/infrastructure`

**Main Responsibilities:**

-   Logging (Pino)
-   Analytics (PostHog)
-   Unique ID generation (nanoid)

**Key Exports:**

-   `logger` (Pino instance)
-   `analytics` (PostHog client)
-   `generateId()` (nanoid wrapper)

---

#### 13. **Integrations** (`packages/integrations`)

**Path:** `/Users/user1/WebstormProjects/SnapBack-Site/packages/integrations`

**Main Responsibilities:**

-   Stripe payment processing
-   Email delivery (React Email components)
-   External service adapters

**Key Modules:**

-   `stripe/` - Payment provider
-   `email/` - Transactional emails

---

#### 14. **Config** (`packages/config`)

**Path:** `/Users/user1/WebstormProjects/SnapBack-Site/packages/config`

**Main Responsibilities:**

-   Configuration defaults
-   Environment variable schemas
-   Feature flags
-   Utility functions

---

## Communication Architecture

### 1. **IPC Communication (Event Bus)**

**Pattern:** Pub/Sub + Request/Response
**Transport:** Unix Domain Socket (TCP socket on Windows)
**Protocol:** Newline-delimited JSON

**Server:**

-   VS Code Extension (`apps/vscode`)
-   Starts on extension activation
-   Handles: `startServer()`

**Clients:**

-   MCP Server (`apps/mcp-server`)
-   CLI (future)
-   Web App (future - not currently connected)

**Message Types:**

```json
// Event (Pub/Sub)
{
  "type": "snapshot:created",
  "payload": {
    "id": "...",
    "filePath": "...",
    "source": "extension",
    "timestamp": 1234567890
  }
}

// Request (RPC)
{
  "type": "request",
  "id": "unique-request-id",
  "event": "createSnapshot",
  "data": { "filePath": "...", "description": "..." }
}

// Response
{
  "type": "response",
  "id": "unique-request-id",
  "data": { "id": "snapshot-id" },
  "error": null
}
```

**Flow Example:**

```
MCP Server → request('createSnapshot') → EventBus → VS Code Extension
  → Extension creates snapshot → response({ id }) → MCP Server
  → Extension publishes SNAPSHOT_CREATED event → All listeners notified
```

---

### 2. **HTTP/WebSocket Communication**

**Web App → API:**

-   Protocol: HTTP/HTTPS + WebSocket (future)
-   Framework: Hono (API) + Next.js (Web)
-   Format: JSON (REST) + oRPC (typed RPC)

**Endpoints:**

-   `/api/rpc/*` - oRPC procedures (typed, validated)
-   `/api/auth/*` - Better-auth routes
-   `/api/webhooks/*` - External webhooks
-   `/api/openapi` - OpenAPI schema
-   `/api/docs` - API documentation

**Authentication:**

1. Session-based (Better-auth cookies)
2. API Key-based (Bearer token)

**Rate Limiting:**

-   Per user/API key
-   Tracked in `api_usage` table
-   Enforced via middleware

---

### 3. **Storage Layer**

**Local Storage (VS Code Extension & CLI):**

-   SQLite database per workspace
-   Location: `.snapback/snapback.db`
-   Schema: snapshots, protected_files, metadata
-   Library: `better-sqlite3`

**Cloud Storage (Web App):**

-   PostgreSQL (Supabase)
-   Tables: users, organizations, subscriptions, api_keys, snapshots
-   ORM: Drizzle
-   Migrations: Drizzle Kit

**Storage Abstraction:**

```typescript
interface StorageAdapter {
	create(snapshot: SnapshotInput): Promise<Snapshot>;
	get(id: string): Promise<Snapshot | null>;
	list(filters?: Filters): Promise<Snapshot[]>;
	delete(id: string): Promise<void>;
	update(id: string, updates: Partial<Snapshot>): Promise<Snapshot>;
}
```

---

## Detection & Analysis Logic Flow

### Where Detection Logic Lives

**Primary Location:** `packages/core/src/`

**Key Components:**

1. **Guardian** - AST-based code analysis
2. **RiskAnalyzer** - Multi-factor risk scoring
3. **ThreatDetector** - Pattern-based threat detection
4. **GitIntegration** - Change velocity tracking
5. **DependencyAnalyzer** - Dependency graph analysis

### Risk Analysis Pipeline

```
File Change Event
  ↓
RiskAnalyzer.analyzeFileChanges()
  ├─ Filter by selective snapshot config
  ├─ Batch processing (10 files at a time)
  │  ├─ ThreatDetector.detect() - Security patterns
  │  ├─ analyzeFileComplexity() - Code metrics
  │  └─ analyzeSensitiveFiles() - File path patterns
  ├─ analyzeChangeVelocity() - Temporal analysis
  ├─ detectPatternTriggers() - Config/build file changes
  └─ Calculate normalized risk score (0-1)
  ↓
shouldCreateSnapshot(riskScore)
  ├─ High risk (>0.5): Check cooldown, create if allowed
  ├─ Medium risk (>0.3): Longer cooldown
  └─ Low risk (<0.3): Skip
  ↓
Decision: Create snapshot or skip
```

### Guardian Analysis Modes

**1. Quick Check (Document Size):**

```typescript
quickCheckDoc(content: string)
// Fast: O(1) - String length only
// Returns: { score, severity, factors }
```

**2. AST Analysis (Code Intelligence):**

```typescript
analyzeWithAST(content: string)
// Deep: O(n) - Full AST traversal
// Metrics:
//   - Function count
//   - Cyclomatic complexity
//   - Nesting depth
//   - Large functions (>1000 chars)
//   - Security issues (eval, Function constructor)
```

**3. Diff Analysis (Change-based):**

```typescript
analyzeDiffChanges(changes: DiffChange[])
// Incremental: O(m) where m = number of changes
// Factors:
//   - Net change size (additions - deletions)
//   - Large insertions (>10k chars = critical)
```

### Threat Detection Patterns

**Critical Threats (severity: 1.0):**

-   `rm -rf` commands
-   `DROP TABLE` SQL statements

**High Threats (severity: 0.8):**

-   Hardcoded passwords: `password = "..."`
-   Exposed API keys: `api_key = "..."`

**Extensibility:**

-   Plugin architecture: `Guardian.addPlugin()`
-   Custom analysis plugins via `AnalysisPlugin` interface

---

## Authentication & Entitlements Flow

### Authentication Layers

**1. User Authentication (Web):**

```
User Login → Better-auth → Session Cookie → PostgreSQL
  → session table + user table
  → Session includes: user, activeOrganization
```

**2. API Key Authentication:**

```
API Request → Bearer Token → validateApiKey()
  → bcrypt.compare() against api_keys.keyHash
  → Load user + scopes from DB
  → Return validation result
```

**3. Rate Limiting:**

```
Request → checkRateLimit(userId | apiKeyId)
  → Query api_usage table (recent requests)
  → Check against limit (from subscription tier or API key)
  → Allow or reject with retry-after header
```

### Entitlements System

**Subscription Tiers:**

```typescript
interface SubscriptionLimits {
	checkpointsPerMonth: number; // Snapshot quota
	storageRetentionDays: number; // How long snapshots kept
	protectedFiles: number; // Max protected files
	teamSeats: number; // Organization members
	apiRateLimit: number; // Requests per hour
}
```

**Tier Mapping:**

```typescript
const TIERS = {
	free: {
		checkpointsPerMonth: 100,
		storageRetentionDays: 7,
		protectedFiles: 10,
		teamSeats: 1,
		apiRateLimit: 60,
	},
	solo: {
		checkpointsPerMonth: 500,
		storageRetentionDays: 30,
		protectedFiles: 50,
		teamSeats: 1,
		apiRateLimit: 300,
	},
	team: {
		checkpointsPerMonth: 2000,
		storageRetentionDays: 90,
		protectedFiles: 200,
		teamSeats: 10,
		apiRateLimit: 1000,
	},
	enterprise: {
		checkpointsPerMonth: -1, // Unlimited
		storageRetentionDays: 365,
		protectedFiles: -1,
		teamSeats: -1,
		apiRateLimit: 5000,
	},
};
```

**Enforcement Points:**

-   API middleware: `@snapback/api/middleware/`
-   Web middleware: `apps/web/middleware/`
-   Usage tracking: `trackUsage()` in `@snapback/auth`

---

## Data Flow Diagrams

### Snapshot Creation Flow

```
┌─────────────────────┐
│  VS Code Extension  │
│  (File Save Event)  │
└──────────┬──────────┘
           │
           │ 1. Pre-save hook
           ↓
    ┌──────────────┐
    │ SaveHandler  │
    └──────┬───────┘
           │
           │ 2. Check protection level
           ↓
┌──────────────────────────┐
│ ProtectedFileRegistry    │
│ (Get protection config)  │
└──────────┬───────────────┘
           │
           │ 3. Analyze risk
           ↓
    ┌──────────────┐
    │ RiskAnalyzer │
    └──────┬───────┘
           │
           ├─→ Guardian.analyze()
           ├─→ ThreatDetector.detect()
           └─→ GitIntegration.getCommitContext()
           │
           │ 4. Risk score calculated
           ↓
    ┌────────────────────┐
    │ shouldCreate       │
    │ Snapshot decision  │
    └──────┬─────────────┘
           │
           │ 5. If yes, create snapshot
           ↓
┌──────────────────────────┐
│ SqliteStorageAdapter     │
│ (Save to .snapback/db)   │
└──────────┬───────────────┘
           │
           │ 6. Publish event
           ↓
    ┌──────────────┐
    │  EventBus    │
    │ (IPC socket) │
    └──────┬───────┘
           │
           │ 7. Broadcast to listeners
           ├─→ MCP Server (if connected)
           └─→ Other clients
           │
           │ 8. Update UI
           ↓
┌──────────────────────────┐
│ VS Code Status Bar       │
│ (Show confirmation)      │
└──────────────────────────┘
```

### MCP Risk Analysis Flow

```
┌──────────────────┐
│  AI Assistant    │
│  (Claude, etc.)  │
└────────┬─────────┘
         │
         │ 1. Call snapback.analyze_risk tool
         ↓
  ┌──────────────┐
  │  MCP Server  │
  └──────┬───────┘
         │
         │ 2. Parse diff changes
         ↓
  ┌──────────────┐
  │   Guardian   │
  │ (@snapback/  │
  │    core)     │
  └──────┬───────┘
         │
         │ 3. Analyze diff
         ├─→ analyzeDiffChanges()
         ├─→ Calculate net change size
         └─→ Determine severity
         │
         │ 4. Return risk analysis
         ↓
  ┌──────────────┐
  │  MCP Server  │
  └──────┬───────┘
         │
         │ 5. Format response
         ↓
┌──────────────────┐
│  AI Assistant    │
│ (Show to user)   │
└──────────────────┘
```

### Web Dashboard Flow

```
┌──────────────────┐
│  User Browser    │
└────────┬─────────┘
         │
         │ 1. HTTP request (with session cookie)
         ↓
  ┌──────────────────┐
  │  Next.js Web App │
  │  (middleware.ts) │
  └────────┬─────────┘
         │
         │ 2. Auth check
         ↓
  ┌──────────────────┐
  │  @snapback/auth  │
  │  (Better-auth)   │
  └────────┬─────────┘
         │
         │ 3. Load session from PostgreSQL
         ↓
  ┌──────────────────────┐
  │  @snapback/platform  │
  │  (Drizzle ORM)       │
  └────────┬─────────────┘
         │
         │ 4. Route to API handler
         ↓
  ┌──────────────────┐
  │  @snapback/api   │
  │  (Hono routes)   │
  └────────┬─────────┘
         │
         │ 5. Execute procedure (e.g., listSnapshots)
         ├─→ Check rate limit
         ├─→ Check subscription limits
         └─→ Query database
         │
         │ 6. Return JSON response
         ↓
┌──────────────────┐
│  User Browser    │
│ (React UI)       │
└──────────────────┘
```

---

## Component Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                        APPLICATIONS                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   VS Code    │  │  MCP Server  │  │     CLI      │    │
│  │  Extension   │  │              │  │              │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                  │            │
│         │                 │                  │            │
│  ┌──────────────────────────────────────────────────┐    │
│  │              Next.js Web App                     │    │
│  └──────────────────────┬───────────────────────────┘    │
│                         │                                 │
└─────────────────────────┼─────────────────────────────────┘
                          │
┌─────────────────────────┼─────────────────────────────────┐
│                    CORE PACKAGES                          │
├─────────────────────────┼─────────────────────────────────┤
│                         │                                 │
│  ┌──────────────────────▼─────────────────┐              │
│  │         @snapback/core                 │              │
│  │  ┌──────────┐ ┌──────────┐ ┌────────┐ │              │
│  │  │ Guardian │ │   Risk   │ │ Threat │ │              │
│  │  │          │ │ Analyzer │ │Detector│ │              │
│  │  └──────────┘ └──────────┘ └────────┘ │              │
│  └────────────────────┬───────────────────┘              │
│                       │                                   │
│  ┌────────────────────▼──────────────────┐               │
│  │      @snapback/contracts              │               │
│  │  (Types, Schemas, Interfaces)         │               │
│  └────────────────────┬──────────────────┘               │
│                       │                                   │
│  ┌───────────────┬────▼────┬───────────────┐            │
│  │               │         │               │            │
│  ▼               ▼         ▼               ▼            │
│ ┌─────┐  ┌─────────┐  ┌──────┐  ┌────────────┐        │
│ │ SDK │  │   API   │  │ Auth │  │  Platform  │        │
│ └─────┘  └─────────┘  └──────┘  └────────────┘        │
│                                                          │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐       │
│  │  Events  │  │Infrastructure│ │ Integrations │       │
│  │(EventBus)│  │  (Logging)  │  │(Stripe, etc.)│       │
│  └──────────┘  └────────────┘  └──────────────┘       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Key Architectural Patterns

### 1. **Phased Initialization (VS Code Extension)**

```typescript
// Phase 1: Core services
initializePhase1Services()

// Phase 2: Storage & configuration (fail-fast)
const { storage, protectedFileRegistry } = await initializePhase2Storage()

// Phase 3: Business logic managers
const { operationCoordinator, ... } = await initializePhase3Managers()

// Phase 4: UI providers
const { snapshotNavigator, ... } = await initializePhase4Providers()

// Phase 5: Command registration
await initializePhase5Registration()
```

**Benefit:** Clear dependency order, graceful degradation, better error handling

---

### 2. **Event-Driven Architecture**

-   **Pattern:** Pub/Sub + Request/Response hybrid
-   **Transport:** Unix socket IPC (EventBus)
-   **Decoupling:** Components don't need direct references
-   **Scalability:** Easy to add new listeners/clients

**Example:**

```typescript
// Publisher (VS Code Extension)
eventBus.publish(SnapBackEvent.SNAPSHOT_CREATED, {
	id: snapshot.id,
	filePath: snapshot.filePath,
	source: "extension",
	timestamp: Date.now(),
});

// Subscriber (MCP Server)
eventBus.on(SnapBackEvent.SNAPSHOT_CREATED, (payload) => {
	logger.info("Snapshot created:", payload);
});

// Request/Response (MCP Server → Extension)
const result = await eventBus.request("createSnapshot", {
	filePath: "/path/to/file.ts",
	description: "Before refactor",
});
```

---

### 3. **Storage Abstraction Pattern**

```typescript
interface StorageAdapter {
	create(snapshot: SnapshotInput): Promise<Snapshot>;
	get(id: string): Promise<Snapshot | null>;
	list(filters?: Filters): Promise<Snapshot[]>;
	delete(id: string): Promise<void>;
	update(id: string, updates: Partial<Snapshot>): Promise<Snapshot>;
}

// Implementations:
// - SqliteStorageAdapter (local, VS Code)
// - LocalStorage (SDK)
// - MemoryStorage (testing)
// - PostgreSQL (web, via Drizzle)
```

**Benefit:** Swap storage backends without changing business logic

---

### 4. **Plugin Architecture (Guardian)**

```typescript
interface AnalysisPlugin {
	name: string;
	analyze(content: string): Promise<AnalysisResult>;
}

const guardian = new Guardian();
guardian.addPlugin(customSecurityPlugin);
guardian.addPlugin(aiDetectionPlugin);

const result = await guardian.analyze(code);
// Aggregates results from all plugins
```

**Benefit:** Extensible analysis without modifying core

---

### 5. **Middleware Pipeline (API)**

```typescript
app.use(cors());
app.use(honoLogger());
app.use(authMiddleware);
app.use(rateLimitMiddleware);
app.use(usageTrackingMiddleware);
app.use(errorHandlingMiddleware);
```

**Benefit:** Composable, reusable, testable request processing

---

## Data Persistence

### Local Storage (SQLite)

**Location:** `.snapback/snapback.db` in workspace root

**Schema:**

```sql
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  description TEXT,
  timestamp INTEGER,
  protected INTEGER DEFAULT 0,
  file_path TEXT,
  content TEXT,
  metadata TEXT  -- JSON
);

CREATE TABLE protected_files (
  file_path TEXT PRIMARY KEY,
  protection_level TEXT,  -- 'watch', 'warn', 'block'
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

**Indexes:**

-   `idx_snapshots_timestamp` - Fast chronological queries
-   `idx_snapshots_file_path` - Fast file-specific queries

---

### Cloud Storage (PostgreSQL)

**Provider:** Supabase (managed PostgreSQL)

**Schema:** See `packages/platform/src/db/schema/postgres/`

**Key Tables:**

```sql
-- User management
user, session, account, verification, organization, organization_member

-- Subscriptions & billing
subscriptions, payment_methods, invoices

-- API access
api_keys, api_usage

-- Snapshots (metadata only, content in object storage)
snapshots

-- Analytics
events, metrics
```

**Object Storage:** S3-compatible (for large snapshot content)

---

## Security Architecture

### Threat Model

**1. API Key Security:**

-   Keys hashed with bcrypt (12 rounds)
-   Never stored in plaintext
-   Preview stored (first 8 chars) for UI display
-   Revocation support

**2. Rate Limiting:**

-   Per-user limits (based on subscription)
-   Per-API-key limits (configurable)
-   Token bucket algorithm
-   Distributed via PostgreSQL (future: Redis)

**3. Input Validation:**

-   All inputs validated via Zod schemas
-   SQL injection prevention (parameterized queries)
-   XSS prevention (React escaping)
-   CSRF protection (SameSite cookies)

**4. Code Analysis Security:**

-   Sandboxed AST parsing (esprima)
-   No `eval()` or code execution
-   Read-only file system access
-   Timeout limits on analysis

**5. IPC Security:**

-   Unix socket permissions (owner-only)
-   Message size limits (1MB buffer)
-   Request timeout (5s default)
-   Max pending requests (1000)

---

## Performance Characteristics

### VS Code Extension

**Activation Time:**

-   Cold start: ~500ms (phased initialization)
-   Warm start: ~100ms (cached storage)

**Snapshot Creation:**

-   Small file (<1KB): ~50ms
-   Medium file (10KB): ~100ms
-   Large file (100KB): ~500ms

**Risk Analysis:**

-   Quick check: <10ms
-   AST analysis: 50-200ms
-   Diff analysis: 20-100ms

---

### MCP Server

**Tool Response Time:**

-   `analyze_risk`: <200ms (target)
-   `create_checkpoint`: <500ms (target, includes IPC)
-   `list_checkpoints`: <100ms

---

### Web API

**Response Time (p95):**

-   Auth check: <50ms
-   List snapshots: <200ms
-   Get snapshot: <100ms
-   Create snapshot: <500ms

**Rate Limits:**

-   Free tier: 60 req/hour
-   Solo tier: 300 req/hour
-   Team tier: 1000 req/hour
-   Enterprise: 5000 req/hour

---

## Deployment Architecture

### VS Code Extension

-   Distribution: VS Code Marketplace
-   Packaging: VSIX
-   Auto-update: VS Code built-in
-   Platform: Cross-platform (Windows, macOS, Linux)

### MCP Server

-   Distribution: npm package (`@snapback/mcp-server`)
-   Execution: stdio transport (spawned by MCP client)
-   Platform: Node.js 20+

### CLI

-   Distribution: npm package (`@snapback/cli`)
-   Binary: `snapback`
-   Platform: Node.js 20+

### Web App

-   Hosting: Vercel (Next.js optimized)
-   Database: Supabase (PostgreSQL)
-   Object Storage: S3-compatible
-   CDN: Vercel Edge Network
-   Analytics: PostHog (self-hosted or cloud)

---

## Missing Components & Gaps

### Components Not Found in Review:

❌ **CLI** mentioned but minimal implementation (only 1 file)
❌ **Direct Web ↔ VS Code** communication (review assumed this exists)
❌ **Entitlements in VS Code** (all enforcement is in web API)
❌ **Database package** (mentioned in API but doesn't exist; it's `@snapback/platform`)

### Architectural Gaps:

1. **No real-time sync** between VS Code and Web (snapshots are local-only)
2. **No WebSocket** implementation (only planned)
3. **No distributed caching** (rate limiting uses PostgreSQL directly)
4. **No snapshot content in PostgreSQL** (metadata only; content location unclear)

---

## File Paths Evidence

**Core Detection Logic:**

-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/core/src/guardian.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/core/src/risk-analyzer.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/core/src/threat-detection.ts`

**Event System:**

-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/events/src/EventBus.ts`

**Authentication:**

-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/auth/index.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/auth/auth.ts`

**API:**

-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/api/index.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/api/modules/*/procedures/`

**VS Code Extension:**

-   `/Users/user1/WebstormProjects/SnapBack-Site/apps/vscode/src/extension.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/apps/vscode/src/handlers/SaveHandler.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/apps/vscode/src/storage/SqliteStorageAdapter.ts`

**MCP Server:**

-   `/Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/src/index.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/src/client/extension-ipc.ts`

**Web App:**

-   `/Users/user1/WebstormProjects/SnapBack-Site/apps/web/middleware.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/apps/web/middleware/auth.ts`

**Platform/Database:**

-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres/`
-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/client/`

---

## Conclusion

SnapBack implements a **sophisticated monolithic-modular architecture** with:

-   **Centralized detection logic** in `@snapback/core`
-   **Dual communication patterns** (IPC for local, HTTP for web)
-   **Clear separation of concerns** (detection ≠ auth ≠ storage)
-   **Extensible plugin system** for custom analysis
-   **Storage abstraction** supporting local SQLite and cloud PostgreSQL
-   **Event-driven decoupling** via Unix socket IPC

The system is designed for **local-first operation** (VS Code extension) with **cloud sync capabilities** (web dashboard), though real-time sync is not yet implemented.

**Key Insight:** Detection/analysis logic is **completely separate from authentication/entitlements**. Risk analysis runs locally in the VS Code extension without needing API calls or auth checks. Web API auth only gates access to cloud-stored snapshot metadata and analytics.
