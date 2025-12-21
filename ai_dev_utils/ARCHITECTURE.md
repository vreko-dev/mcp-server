# SnapBack Architecture

**Auto-validated by gate-runner.ts**
**Last validated:** 2025-12-21

---

## System Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SNAPBACK PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PRESENTATION LAYER (User-Facing)                                         │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│   │   VS Code Ext   │  │   Web Portal    │  │   CLI Tool      │           │
│   │ apps/vscode/    │  │ apps/web/       │  │ apps/cli/       │           │
│   │   v1.4.3        │  │   Next.js 16    │  │   Commander.js  │           │
│   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘           │
│            │                    │                    │                     │
│            │          ┌─────────┴─────────┐          │                     │
│            │          │   Docs App        │          │                     │
│            │          │ apps/docs/        │          │                     │
│            │          │   Next.js 15      │          │                     │
│            │          └───────────────────┘          │                     │
│   ─────────┼────────────────────┼────────────────────┼──────────────────   │
│            │                    │                    │                     │
│   SERVICE LAYER (Business Logic)                                           │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│   │   MCP Server    │  │   API Server    │  │   SDK           │           │
│   │ apps/mcp-server/│  │ apps/api/       │  │ packages/sdk/   │           │
│   │   v1.1.1        │  │   Hono + oRPC   │  │   v0.2.0        │           │
│   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘           │
│            │                    │                    │                     │
│   ─────────┼────────────────────┼────────────────────┼──────────────────   │
│            │                    │                    │                     │
│   CORE LAYER (Shared Logic)                                                │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│   │   Core Logic    │  │   Engine        │  │   Contracts     │           │
│   │ packages/core/  │  │ packages/engine/│  │ packages/       │           │
│   │   Guardian      │  │   Signals/MCP   │  │   contracts/    │           │
│   │   v0.2.0        │  │   v0.1.0        │  │   v0.2.1        │           │
│   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘           │
│            │                    │                    │                     │
│   ─────────┼────────────────────┼────────────────────┼──────────────────   │
│            │                    │                    │                     │
│   INTELLIGENCE LAYER (AI/ML)                                               │
│   ┌────────────────────────────────────────────────────────────┐           │
│   │   @snapback/intelligence     v0.1.0                        │           │
│   │   ├── /validation   - 7-layer validation pipeline          │           │
│   │   ├── /learning     - LearningEngine, ViolationTracker     │           │
│   │   ├── /context      - ContextEngine, SemanticRetriever     │           │
│   │   ├── /policy       - PolicyEngine, detectors (secret/mock)│           │
│   │   ├── /vitals       - Workspace health (Pulse/Pressure/Temp)│           │
│   │   └── /storage      - ConfigStore, JsonlStore              │           │
│   └────────────────────────────────────────────────────────────┘           │
│            │                    │                    │                     │
│   ─────────┼────────────────────┼────────────────────┼──────────────────   │
│            │                    │                    │                     │
│   INFRASTRUCTURE LAYER (External Services)                                 │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│   │   Platform      │  │   Integrations  │  │   Auth          │           │
│   │ packages/       │  │ packages/       │  │ packages/auth/  │           │
│   │   platform/     │  │   integrations/ │  │   v0.1.0        │           │
│   │   Supabase+Drz  │  │ Stripe/HubSpot  │  │   BetterAuth    │           │
│   │   v0.7.0        │  │   v0.1.0        │  │                 │           │
│   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘           │
│            │                    │                    │                     │
│   ─────────┼────────────────────┼────────────────────┼──────────────────   │
│            │                    │                    │                     │
│   OBSERVABILITY LAYER                                                      │
│   ┌────────────────────────────────────────────────────────────┐           │
│   │   @snapback/infrastructure   v0.2.0                        │           │
│   │   ├── /logging   - Pino structured logging                 │           │
│   │   ├── /metrics   - Prometheus, Counter, Gauge, Histogram   │           │
│   │   ├── /tracing   - OpenTelemetry spans & context           │           │
│   │   └── /health    - Health check endpoints                  │           │
│   └────────────────────────────────────────────────────────────┘           │
│                                                                             │
│   SHARED UTILITIES                                                          │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│   │   Config        │  │   Testing       │  │   GitHub Action │           │
│   │ packages/config/│  │ packages/       │  │ packages/       │           │
│   │   v0.2.0        │  │   testing/      │  │   github-action/│           │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Package Inventory (12 packages)

| Package | Version | Purpose | Key Dependencies |
|---------|---------|---------|------------------|
| `@snapback/contracts` | 0.2.1 | Shared types, schemas, events | zod, eventemitter2 |
| `@snapback/config` | 0.2.0 | Environment & configuration | zod, chokidar |
| `@snapback/infrastructure` | 0.2.0 | Logging, metrics, tracing | pino, @opentelemetry/* |
| `@snapback/core` | 0.2.0 | Guardian detection, MCP federation | esprima, simple-git |
| `@snapback/engine` | 0.1.0 | Signals, runtime, transports | esprima, zod |
| `@snapback/intelligence` | 0.1.0 | Validation, learning, policy | atomically, @huggingface/transformers |
| `@snapback/platform` | 0.7.0 | Database (Supabase/Drizzle) | drizzle-orm, @supabase/supabase-js |
| `@snapback/auth` | 0.1.0 | Authentication | better-auth, bcrypt |
| `@snapback/sdk` | 0.2.0 | Client SDK | ky, quick-lru, @aws-sdk/* |
| `@snapback/integrations` | 0.1.0 | Stripe, HubSpot, email | stripe, @hubspot/api-client |
| `@snapback/testing` | 0.0.1 | Test utilities, fixtures | msw, @faker-js/faker |
| `@snapback/github-action` | - | CI/CD integration | - |

---

## Application Inventory (6 apps)

| App | Version | Stack | Deployment |
|-----|---------|-------|------------|
| `apps/vscode` | 1.4.3 | VSCode API, better-sqlite3 | Marketplace |
| `apps/web` | 0.2.0 | Next.js 16, React 19, TanStack | Vercel |
| `apps/api` | 1.1.0 | Hono, oRPC, Drizzle | Fly.io |
| `apps/mcp-server` | 1.1.1 | @modelcontextprotocol/sdk | npm / Docker |
| `apps/cli` | 0.2.1 | Commander.js, Inquirer | npm global |
| `apps/docs` | 0.0.2 | Next.js 15, FumaDocs | Vercel |

---

## Layer Responsibilities

### Presentation Layer
**Purpose:** User interaction only
**Can Import:** Core, Contracts, SDK
**Cannot Import:** Infrastructure directly, API internals
**Examples:**
- VS Code extension UI commands
- Web dashboard React components
- CLI argument parsing

### Service Layer
**Purpose:** Business logic orchestration
**Can Import:** Core, Infrastructure, Contracts, Intelligence
**Cannot Import:** Presentation internals
**Examples:**
- API procedures (thin orchestration)
- MCP tool handlers
- SDK public methods

### Core Layer
**Purpose:** Shared business logic
**Can Import:** Contracts, Config
**Cannot Import:** Infrastructure, Service, Presentation
**Examples:**
- Guardian threat detection
- Snapshot creation logic
- Diff algorithms
- Session management

### Intelligence Layer
**Purpose:** AI-powered analysis and learning
**Can Import:** Contracts, Storage abstractions
**Cannot Import:** Presentation, Infrastructure directly
**Examples:**
- 7-layer validation pipeline
- Learning engine with feedback loop
- Semantic context retrieval
- Policy engine with detectors

### Infrastructure Layer
**Purpose:** External service integration
**Can Import:** Contracts only
**Cannot Import:** Core, Service, Presentation
**Examples:**
- Database queries (Drizzle)
- PostHog analytics
- Stripe/HubSpot integrations
- OpenTelemetry tracing

---

## Data Flow

```
User Action
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Presentation: Capture intent, validate input            │
│   VSCode → command handlers                             │
│   Web → React hooks + TanStack Query                    │
│   CLI → Commander.js commands                           │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Service: Orchestrate, authorize, coordinate             │
│   API → oRPC procedures → auth middleware               │
│   MCP → tool handlers → Guardian analysis               │
│   SDK → client methods → storage adapters               │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Core: Execute business logic, no side effects           │
│   Guardian → detection plugins → risk scoring           │
│   Engine → signals → validators → actions               │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Intelligence: AI analysis & learning                    │
│   ValidationPipeline → 7 layers parallel                │
│   LearningEngine → feedback → golden dataset            │
│   PolicyEngine → threat detection → SARIF               │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Infrastructure: Persist, fetch, emit (side effects)     │
│   Platform → Supabase/PostgreSQL → Drizzle ORM          │
│   Integrations → Stripe, HubSpot, Email                 │
│   Observability → Pino, OpenTelemetry, PostHog          │
└─────────────────────────────────────────────────────────┘
```

---

## Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Next.js 16 + React 19 | Latest features, Server Components | 2025-12 |
| Hono + oRPC for API | Ultra-lightweight, type-safe RPC | 2025-12 |
| @snapback/intelligence unified | Single source for validation/learning/context | 2025-12 |
| Vitals module for workspace health | Pulse/Pressure/Temperature/Oxygen metrics | 2025-12 |
| DBSCAN over k-means | Better for variable-density clustering of file changes | 2025-12 |
| File-based storage for ai_dev_utils | Privacy-first, git-versioned, no DB dependency | 2025-12 |
| PostHog only for analytics | Consolidation from 7 providers, privacy-compliant | 2025-12 |
| Dual-use MCP architecture | Internal (codebase) vs External (snapback) tools | 2025-12 |
| Auto-promotion at 3x/5x | Balance between noise and signal for patterns | 2025-12 |
| BetterAuth for authentication | Session security, API keys, rate limiting | 2025-12 |

---

## Privacy Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S MACHINE                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │  FILE CONTENT (never leaves)                    │    │
│  │  - Source code                                  │    │
│  │  - Snapshots (~/.snapback/)                     │    │
│  │  - Diffs                                        │    │
│  │  - SQLite database                              │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│                    Metadata only                         │
│                          ▼                               │
└──────────────────────────┼──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    SNAPBACK SERVERS                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │  METADATA ONLY                                  │    │
│  │  - File paths (hashed optional)                 │    │
│  │  - Timestamps                                   │    │
│  │  - Event counts                                 │    │
│  │  - Session IDs                                  │    │
│  │  - Risk scores (no content)                     │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## VS Code Extension Activation Phases

The VS Code extension uses a 5-phase activation sequence for optimal startup performance.
**Critical:** Do not add await calls or blocking operations in early phases.

### Phase Ownership Matrix

| Phase | File | Responsibility | Key Components | Perf Target |
|-------|------|----------------|----------------|-------------|
| **1** | phase1-services.ts | Core service lazy loading | ServiceFederation (lazy) | <10ms |
| **2** | phase2-storage.ts | Storage & configuration | StorageManager, ProtectedFileRegistry, ConfigFileManager, SDK ProtectionManager | <100ms |
| **3** | phase3-managers.ts | Business logic managers | SessionCoordinator, SnapshotManager, StatusBarController, ProtectionService | <200ms |
| **4** | phase4-providers.ts | VS Code providers | TreeProviders, CodeLens, Decorations, WelcomeView | <150ms |
| **5** | phase5-registration.ts | Command registration | TreeView registration, Commands, Event handlers | <50ms |

### Phase Dependencies

```
Phase 1 (Services)
    │
    ▼
Phase 2 (Storage) ──────────────────┐
    │                               │
    ▼                               ▼
Phase 3 (Managers) ◄─── storage, telemetryProxy, protectedFileRegistry
    │
    ▼
Phase 4 (Providers) ◄─── phase3Result, storage
    │
    ▼
Phase 5 (Registration) ◄─── phase4Result, sessionCoordinator
```

### Critical Anti-Patterns

| Anti-Pattern | Example | Fix |
|--------------|---------|-----|
| Await in Phase 1-2 | `await vscode.commands.executeCommand()` | Fire-and-forget with `Promise.resolve()` |
| Duplicate service init | `new ServiceFederation()` in multiple phases | Use LazyLoader, initialize once |
| Blocking setContext | `await vscode.commands.executeCommand('setContext', ...)` | Fire-and-forget, no await |
| Heavy computation | File scanning in phase1-2 | Defer to phase3+ or lazy load |

### Bridge Pattern (Phase 2)

StorageBridge routes to V1 (file-based) or V2 (SQLite) based on feature flag:
```typescript
// In phase2-storage.ts
const storage = new StorageBridge(context, workspaceRoot);
// Returns IStorageManager interface, hides implementation
```

---

## MCP Architecture (Dual-Use)

```
┌─────────────────────────────────────────────────────────┐
│   INTERNAL (ai_dev_utils/mcp)                           │
│   Server name: "codebase"                               │
│   Tools: codebase.start_task, codebase.check_patterns   │
│   Data: ai_dev_utils/ (patterns, learnings, violations) │
│   Users: SnapBack development team                      │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Same intelligence algorithms
                           │ (@snapback/intelligence)
                           │
┌─────────────────────────────────────────────────────────┐
│   EXTERNAL (apps/mcp-server)                            │
│   Server name: "snapback"                               │
│   Tools: snapback.analyze_risk, snapback.check_deps     │
│   Data: Customer workspace (.snapback/)                 │
│   Users: SnapBack platform customers                    │
└─────────────────────────────────────────────────────────┘
```

---

## Recent Architecture Changes

<!-- AUTO-UPDATED: Do not edit below this line -->
| Date | Change | Files | Gate |
|------|--------|-------|------|
| 2025-12-21 | Added vitals module to intelligence | packages/intelligence/src/vitals/ | - |
| 2025-12-20 | Dual-use MCP architecture finalized | apps/mcp-server/, ai_dev_utils/mcp/ | - |
| 2025-12-20 | @snapback/intelligence package extracted | packages/intelligence/ | - |
| 2025-12-20 | Package consolidation (analytics, mail removed) | packages/ | - |

---

*Auto-validated on gate pass. Manual edits require re-validation.*
