# SnapBack - Architecture Overview

**"Code Breaks. SnapBack."**

AI-safe code snapshots with intelligent risk detection, multi-file session tracking, and seamless reversal.

---

## System Architecture

### Core Concept

SnapBack provides **3-level protection** (Watch/Warn/Block) for code files, automatically creating snapshots and detecting AI-generated risks **before** they break production. Sessions enable atomic multi-file rollback for complex AI-assisted changes.

### Component Map

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interfaces                          │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ VS Code Ext  │  Web App     │  MCP Server  │  CLI           │
│ (Primary UI) │  (Dashboard) │  (Claude AI) │  (Git Hooks)   │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │              │              │                │
       ↓              ↓              ↓                ↓
┌──────────────────────────────────────────────────────────────┐
│                      Event Bus (IPC)                          │
│  Pub/Sub: SNAPSHOT_CREATED, PROTECTION_CHANGED, ANALYSIS_*   │
└──────────────────────────────────────────────────────────────┘
       │              │              │                │
       ↓              ↓              ↓                ↓
┌──────────────────────────────────────────────────────────────┐
│                     Core Packages                             │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ @core        │ @sdk         │ @contracts   │ @infrastructure│
│ (Detection)  │ (Storage)    │ (Types)      │ (Observability)│
└──────────────┴──────────────┴──────────────┴────────────────┘
       │                             │
       ↓                             ↓
┌──────────────────────────────────────────────────────────────┐
│                    Data Layer                                 │
│  SQLite (local) ↔ Supabase (cloud) ↔ Event Bus (sync)       │
└──────────────────────────────────────────────────────────────┘
```

---

## Architecture Principles

### API-First Architecture (Web App)

The web application enforces strict **three-layer architecture** with zero tolerance for boundary violations:

```
┌──────────────────────────────────────────────┐
│    Presentation Layer (apps/web)             │
│  • Pages, Components, Server Actions         │
│  • ✅ Uses ORPC client + authClient          │
│  • ❌ ZERO direct DB imports                 │
│  • ✅ Imports from @snapback/auth/client     │
└──────────────────────────────────────────────┘
                    ↓ ORPC/Auth calls
┌──────────────────────────────────────────────┐
│    API Layer (packages/api)                  │
│  • ORPC Procedures (10 analytics + 1 org)    │
│  • ✅ CAN import db (authorized layer)       │
│  • ✅ Business logic + auth here             │
└──────────────────────────────────────────────┘
                    ↓ SQL queries
┌──────────────────────────────────────────────┐
│    Data Layer (packages/platform)            │
│  • Drizzle ORM, PostgreSQL                   │
│  • ✅ All schemas formally exported          │
│  • Schema: postgres + snapback namespaces    │
└──────────────────────────────────────────────┘
```

**Boundary Enforcement**:
- **Script**: `scripts/check-api-boundary.sh` prevents DB imports in apps/web
- **Tests**: `boundary.test.ts` (5 tests) validates zero violations
- **CI**: Runs on every commit (pre-commit hook)
- **Result**: 🟢 100% compliance (zero violations)

**ORPC Procedures** (packages/api):
- 10 analytics procedures (agent suggestions, API key usage, feedback, loops, policy evaluations, post-accept outcomes)
- 1 organization procedure (get-by-id)
- Response time: <200ms (p95)

### Authentication Patterns

**Browser (apps/web)**:
- Session cookies (JWT) via Better Auth
- `authClient` from `@snapback/auth/client` for React hooks
- `"use client"` directive for Client Components

**Server (packages/api)**:
- Better Auth server instance
- Organization-level authorization
- Row-level security (RLS) enforcement

**API Keys** (REST/MCP):
- See [Authentication Architecture](./docs/architecture/authentication.md)

### Quality Standards

**Code Quality**:
- **Conventional commits**: Required format (`fix(scope): message`)
- **Biome formatting**: Automated code style enforcement
- **TypeScript strict mode**: Type safety across all packages
- **Pre-commit hooks**: Boundary checks, formatting, linting

**Accessibility**:
- **WCAG 2.1 AA**: Full compliance from day 1
- **Global reduced-motion CSS**: Respects user preferences
- **E2E testing**: Playwright accessibility tests

**Next.js 15 Compliance**:
- Async params pattern: `{ params }: { params: Promise<T> }`
- 24 integration tests verify compliance
- App Router patterns enforced

---

## 📦 Packages (Foundation)

### `packages/core` - [CLAUDE.md](./packages/core/CLAUDE.md)
**Detection Engine & Guardian Orchestration**

- **SecretDetectionPlugin**: Regex + Shannon entropy (>4.5) for credentials
- **MockReplacementPlugin**: Test artifacts in production code
- **PhantomDependencyPlugin**: Import ↔ package.json mismatch
- **Guardian**: Aggregates plugins → single risk score (0-1)
- **MCP Client**: Orchestrates claude-code/cursor MCP servers

**Key Exports**: `Guardian`, `SecretDetectionPlugin`, `MockReplacementPlugin`, `PhantomDependencyPlugin`, `MCPClientManager`

### `packages/events` - [CLAUDE.md](./packages/events/CLAUDE.md)
**Inter-Process Event Bus**

- **TCP-based pub/sub** (JSON-RPC 2.0 protocol)
- **Server mode**: MCP/Web apps start server
- **Client mode**: VSCode extension connects
- **Event types**: `SNAPSHOT_CREATED`, `PROTECTION_CHANGED`, `ANALYSIS_*`
- **Latency**: <10ms intra-machine

**Key Exports**: `SnapBackEventBus`, `SnapBackEvent` enum

### `packages/sdk` - [CLAUDE.md](./packages/sdk/CLAUDE.md)
**Client SDK for SnapBack Services**

- **SnapshotClient**: Create, restore, list snapshots
- **ProtectionClient**: Set/get protection levels
- **LocalStorage**: SQLite-backed (VSCode)
- **MemoryStorage**: Ephemeral (testing)
- **Privacy**: Hasher, Sanitizer, Validator (PII-safe telemetry)

**Key Exports**: `Snapback`, `LocalStorage`, `MemoryStorage`, `SnapshotClient`, `ProtectionClient`

### `packages/contracts` - [CLAUDE.md](./packages/contracts/CLAUDE.md)
**Shared Types & Schemas**

- **FeatureManager**: Feature flags (A/B testing)
- **Zod Schemas**: Runtime validation (`SnapshotSchema`, `ProtectionLevelSchema`, `SessionManifestSchema`)
- **Type Definitions**: `Snapshot`, `ProtectionLevel`, `SessionManifest`, `AnalysisResult`
- **Logger Contract**: Structured logging interface

**Key Exports**: `FeatureManager`, `FeatureFlag`, Zod schemas, type definitions

### `packages/infrastructure` - [CLAUDE.md](./packages/infrastructure/CLAUDE.md)
**Observability & Monitoring**

- **Logging**: Pino-based structured logs (console, file, remote)
- **Metrics**: Prometheus exporters (Counter, Gauge, Histogram, Summary)
- **Tracing**: OpenTelemetry integration

**Key Exports**: `createLogger`, `metrics`, `tracer`

### `packages/storage` - [CLAUDE.md](./packages/storage/CLAUDE.md)
**Data Persistence Layer**

- SQLite with WAL mode (concurrent reads)
- Hash-based deduplication (>90% space savings)
- Query latency: <10ms (indexed)

**Key Exports**: Storage adapters, query utilities

### `packages/config` - [CLAUDE.md](./packages/config/CLAUDE.md)
**Configuration Defaults**

- Centralized config for all apps/packages
- Environment variable parsing
- Test-specific overrides

---

## 🚀 Applications

### `apps/vscode` - [CLAUDE.md](./apps/vscode/CLAUDE.md)
**VS Code Extension - Primary UI** (85% complete)

**Core Features**:
- **3-Level Protection**: 🟢 Watch (silent) | 🟡 Warn (confirm) | 🔴 Block (require note)
- **Session Snapshots**: Multi-file rollback (idle/blur/commit/task triggers)
- **AI Awareness**: Detects 9 assistants (Copilot, Claude, Tabnine, etc.) + burst heuristics
- **Team Sync**: `.snapbackrc` for shared protection policies

**Architecture**:
- **5-Phase Activation**: Services → Storage → Managers → Providers → Registration
- **SessionCoordinator**: Tracks file changes → finalizes sessions (105s idle, blur, commit, etc.)
- **SnapshotManager**: Deduplication, encryption, git-aware naming
- **Storage**: SQLite with WAL mode + session manifests

**Performance Budgets**:
- Snapshot creation: <200ms
- Session finalization: Avg <50ms, P95 <100ms
- Protection check: <10ms

**Gaps**:
- Session tree UI needs `listSessionManifests()` wiring
- Enhanced summaries (AST identifier extraction)
- MCP Guardian integration (detection exists but not wired to extension)

### `apps/mcp-server` - [CLAUDE.md](./apps/mcp-server/CLAUDE.md)
**MCP Server for Claude Code / Cursor**

**Tools Exposed**:
1. **`analyze_risk`**: Guardian detection → risk score + recommendations (<200ms)
2. **`check_dependencies`**: Phantom dependency detection (<300ms)
3. **`create_checkpoint`**: Snapshot via extension IPC (<500ms)

**Architecture**:
- **Stdio transport**: JSON-RPC 2.0 protocol
- **Guardian plugins**: Secret, Mock, Phantom detection
- **Event bus**: Server mode (pub/sub hub)
- **Extension IPC**: Unix sockets for snapshot creation

**Security**:
- Path validation (workspace-only)
- Error sanitization (PII-safe)
- 1MB buffer limit

### `apps/web` - [CLAUDE.md](./apps/web/CLAUDE.md)
**Next.js Marketing Site + SaaS Dashboard**

**Features**:
- **Marketing**: Landing page, pricing, docs, blog (MDX)
- **Dashboard**: Snapshot browser, session timeline, analytics
- **Settings**: Account, security, billing, danger zone
- **Admin**: Organizations, users (role-gated)

**Stack**:
- Next.js 14 (App Router)
- Supabase Auth + PostgreSQL
- Tailwind + shadcn/ui
- Event bus client (real-time updates)

**Deployment**: Vercel (auto-deploy, edge functions, ISR)

### `apps/cli` - [CLAUDE.md](./apps/cli/CLAUDE.md)
**Command-Line Interface**

**Commands**:
- `analyze <file>`: Risk analysis (quick or AST-based)
- `snapshot`: Create snapshot
- `list`: Show all snapshots
- `check`: Pre-commit hook (blocks risky commits)
- `interactive`: Guided TUI

**Use Cases**:
- Git pre-commit hooks (CI/CD gates)
- Standalone analysis tool
- Scriptable snapshots

---

## Data Flow Diagrams

### Snapshot Creation Flow
```
User edits file in VSCode
  ↓
SaveHandler detects save
  ↓
Check protection level (ProtectedFileRegistry)
  ↓
[Watch] → Auto-create snapshot
[Warn]  → Show dialog → create if confirmed
[Block] → Require note → create with note
  ↓
SnapshotManager.create()
  ↓
SnapshotDeduplicator (hash check → reuse if duplicate)
  ↓
Storage.save() (SQLite WAL mode)
  ↓
EventBus.publish(SNAPSHOT_CREATED)
  ↓
SessionCoordinator.addCandidate()
  ↓
[On idle/blur/commit/task] → SessionCoordinator.finalizeSession()
  ↓
Storage.storeSessionManifest()
```

### Risk Analysis Flow (MCP)
```
Claude Code suggests code change
  ↓
Claude calls MCP tool: analyze_risk(diff)
  ↓
MCP Server receives request
  ↓
Guardian.analyze(content, filePath)
  ↓
[SecretPlugin, MockPlugin, PhantomPlugin] run in parallel
  ↓
Aggregate results → AnalysisResult {score, severity, factors, recommendations}
  ↓
EventBus.publish(ANALYSIS_COMPLETED)
  ↓
MCP Server returns risk_level + issues
  ↓
Claude presents to user: "⚠️ High risk: Potential AWS key detected"
```

### Session Restore Flow
```
User clicks "Restore Session" in tree view
  ↓
sessionCommands.previewRestoreSession()
  ↓
For each file in session:
  - Retrieve snapshot by ID
  - Open side-by-side diff (snapshot ↔ current)
  ↓
User confirms
  ↓
sessionCommands.restoreSessionFiles()
  ↓
For each file:
  - Storage.restore() (atomic: temp write → rename)
  ↓
EventBus.publish(SNAPSHOT_RESTORED)
```

---

## Key Concepts

### Protection Levels
- **🟢 Watch**: Silent auto-snapshot (zero friction)
- **🟡 Warn**: Confirmation dialog before save
- **🔴 Block**: Required note (audit trail)

**Set via**:
- Right-click → "SnapBack: Set Protection Level"
- `.snapbackrc` team policies (auto-synced)
- CLI: `snapback protect <file> --level block`

### Session-Aware Snapshots
**Problem**: AI often changes 5+ files simultaneously
**Solution**: Group snapshots into sessions with atomic restore

**Triggers**:
- Idle gap (105s of no activity)
- Window blur (switching apps)
- Git commit
- Task completion
- Max duration (1h)

**Output**: `SessionManifest` with file references + metadata

### Detection Engine (Guardian)
**Multi-plugin risk analysis**:
- **Secrets**: Regex + entropy (AWS keys, JWT, DB strings)
- **Mocks**: Test framework artifacts in `src/`
- **Phantom Deps**: Imports missing from package.json

**Scoring**: Each plugin returns 0-1 score → Guardian aggregates → severity (low/medium/high/critical)

---

## Configuration

### VS Code Extension Settings
```json
{
  "snapback.protectionLevels.defaultLevel": "watch",
  "snapback.snapshot.deduplication.enabled": true,
  "snapback.offlineMode.enabled": false
}
```

### Team Protection Policies (`.snapbackrc`)
```json
{
  "protectionRules": [
    { "pattern": "package.json", "level": "block", "reason": "Critical dependency file" },
    { "pattern": "**/*.env", "level": "block" },
    { "pattern": "src/**/*.critical.ts", "level": "warn" }
  ]
}
```

Auto-loaded on workspace open → syncs across team.

### Environment Variables
```env
# Event Bus
SNAPBACK_EVENT_BUS_PORT=6379

# MCP Server
SNAPBACK_IPC_SOCKET=/tmp/snapback.sock

# Web App
NEXT_PUBLIC_SUPABASE_URL=https://...
STRIPE_SECRET_KEY=sk_...

# Telemetry
TELEMETRY_URL=https://telemetry.snapback.dev
```

---

## Performance Budgets

| Operation | Budget | Enforced |
|-----------|--------|----------|
| Snapshot creation | <200ms | ✅ Tests |
| Session finalization | Avg <50ms, P95 <100ms | ✅ Tests |
| Protection check | <10ms | ✅ Tests |
| MCP analyze_risk | <200ms | ✅ Logging |
| Event pub/sub | <10ms | ✅ Logging |
| Storage query | <10ms | ✅ Indexed |

---

## Testing Strategy

### Unit Tests
- All packages: Vitest (>90% coverage target)
- Contracts: Zod schema validation
- SDK: Storage adapters, clients

### Integration Tests
- VS Code: Activation phases, storage persistence
- MCP: Guardian plugin orchestration
- Event Bus: Multi-process pub/sub

### E2E Tests
- VS Code: WDIO (planned, not yet implemented)
- Web: Playwright (dashboard flows)
- CLI: Commander integration

**Run all tests**: `pnpm test` (root)

---

## Development Setup

### Prerequisites
```bash
node >= 20.0.0
pnpm >= 9.0.0
```

### Clone & Install
```bash
git clone https://github.com/snapback/snapback.git
cd snapback
pnpm install
```

### Run All Services
```bash
# Terminal 1: VS Code Extension (F5 in VSCode)
code .

# Terminal 2: MCP Server
pnpm -F @snapback/mcp-server dev

# Terminal 3: Web App
pnpm -F @snapback/web dev

# Terminal 4: Event Bus
pnpm -F @snapback/events start-server
```

### Monorepo Commands
```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all packages
pnpm type-check       # TypeScript validation
```

---

## Documentation Index

### Packages
- [Core (Detection Engine)](./packages/core/CLAUDE.md)
- [Events (Pub/Sub Bus)](./packages/events/CLAUDE.md)
- [SDK (Storage & Clients)](./packages/sdk/CLAUDE.md)
- [Contracts (Types & Schemas)](./packages/contracts/CLAUDE.md)
- [Infrastructure (Observability)](./packages/infrastructure/CLAUDE.md)
- [Storage (Persistence)](./packages/storage/CLAUDE.md)
- [Config (Defaults)](./packages/config/CLAUDE.md)

### Applications
- [VS Code Extension](./apps/vscode/CLAUDE.md)
- [MCP Server (Claude/Cursor)](./apps/mcp-server/CLAUDE.md)
- [Web App (Next.js)](./apps/web/CLAUDE.md)
- [CLI (Command-Line)](./apps/cli/CLAUDE.md)

---

## License

See [LICENSE](./LICENSE)
