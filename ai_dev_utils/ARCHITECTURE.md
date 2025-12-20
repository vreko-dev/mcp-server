# SnapBack Architecture

**Auto-validated by gate-runner.ts**
**Last validated:** Auto-updated on successful gate passes

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
│   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘           │
│            │                    │                    │                     │
│   ─────────┼────────────────────┼────────────────────┼──────────────────   │
│            │                    │                    │                     │
│   SERVICE LAYER (Business Logic)                                           │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│   │   MCP Server    │  │   API Server    │  │   SDK           │           │
│   │ apps/mcp-server/│  │ apps/api/       │  │ packages/sdk/   │           │
│   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘           │
│            │                    │                    │                     │
│   ─────────┼────────────────────┼────────────────────┼──────────────────   │
│            │                    │                    │                     │
│   CORE LAYER (Shared Logic)                                                │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│   │   Core Logic    │  │   Engine        │  │   Contracts     │           │
│   │ packages/core/  │  │ packages/engine/│  │ packages/       │           │
│   │                 │  │                 │  │   contracts/    │           │
│   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘           │
│            │                    │                    │                     │
│   ─────────┼────────────────────┼────────────────────┼──────────────────   │
│            │                    │                    │                     │
│   INFRASTRUCTURE LAYER (External Services)                                 │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│   │   Database      │  │   PostHog       │  │   Auth          │           │
│   │ packages/       │  │ (Analytics)     │  │ packages/auth/  │           │
│   │ infrastructure/ │  │                 │  │                 │           │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### Presentation Layer
**Purpose:** User interaction only
**Can Import:** Core, Contracts
**Cannot Import:** Infrastructure, API internals
**Examples:**
- VS Code extension UI commands
- Web dashboard React components
- CLI argument parsing

### Service Layer  
**Purpose:** Business logic orchestration
**Can Import:** Core, Infrastructure, Contracts
**Cannot Import:** Presentation internals
**Examples:**
- API procedures (thin orchestration)
- MCP tool handlers
- SDK public methods

### Core Layer
**Purpose:** Shared business logic
**Can Import:** Contracts only
**Cannot Import:** Infrastructure, Service, Presentation
**Examples:**
- Snapshot creation logic
- Diff algorithms
- Session management

### Infrastructure Layer
**Purpose:** External service integration
**Can Import:** Nothing (leaf node)
**Cannot Import:** Any other layer
**Examples:**
- Database queries
- PostHog calls
- External API clients

---

## Data Flow

```
User Action
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Presentation: Capture intent, validate input            │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Service: Orchestrate, authorize, coordinate             │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Core: Execute business logic, no side effects           │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Infrastructure: Persist, fetch, emit (side effects)     │
└─────────────────────────────────────────────────────────┘
```

---

## Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| DBSCAN over k-means | Better for variable-density clustering of file changes | 2025-12 |
| File-based storage for ai_dev_utils | Privacy-first, git-versioned, no DB dependency | 2025-12 |
| PostHog only for analytics | Consolidation from 7 providers, privacy-compliant | 2025-12 |
| Separate internal MCP | Product tools vs dev tools separation | 2025-12 |
| Auto-promotion at 3x/5x | Balance between noise and signal for patterns | 2025-12 |

---

## Privacy Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S MACHINE                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │  FILE CONTENT (never leaves)                    │    │
│  │  - Source code                                  │    │
│  │  - Snapshots                                    │    │
│  │  - Diffs                                        │    │
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
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Recent Architecture Changes

<!-- AUTO-UPDATED: Do not edit below this line -->
| Date | Change | Files | Gate |
|------|--------|-------|------|

---

*Auto-validated on gate pass. Manual edits require re-validation.*
