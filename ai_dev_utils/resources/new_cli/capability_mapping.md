# Customer MCP Capability Mapping

**Purpose:** Map internal pair programming capabilities to customer-facing equivalents
**Principle:** Same intelligence algorithms, different data sources, IP protected server-side
**Reference:** See `the_vision.md` for learning system design, `thin_proxy_architecture.md` for proxy pattern

---

## CORRECTED Architecture Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTERNAL → EXTERNAL COMPONENT MAPPING                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   INTERNAL (SnapBack Dev Team)             EXTERNAL (Customers)             │
│   ════════════════════════════             ═════════════════════            │
│                                                                              │
│   ┌─────────────────────┐                  ┌─────────────────────┐          │
│   │   ai_dev_utils/     │   ──────────►    │   apps/cli/         │          │
│   │   ───────────────   │                  │   ─────────         │          │
│   │                     │                  │                     │          │
│   │   patterns/         │   ══════════►    │   .snapback/        │          │
│   │   feedback/         │                  │     patterns/       │          │
│   │   rules/            │                  │     learnings/      │          │
│   │   state/            │                  │     config.json     │          │
│   │   ROUTER.md         │                  │     vitals.json     │          │
│   │                     │                  │                     │          │
│   │   (Markdown-based   │                  │   (CLI creates and  │          │
│   │    pair programmer  │                  │    manages local    │          │
│   │    guidance system) │                  │    workspace state) │          │
│   └─────────────────────┘                  └─────────────────────┘          │
│              │                                        │                      │
│              │                                        │                      │
│   ┌─────────────────────┐                  ┌─────────────────────┐          │
│   │   ai_dev_utils/mcp/ │   ──────────►    │   apps/mcp-server/  │          │
│   │   ─────────────────  │                  │   ─────────────────  │          │
│   │                     │                  │                     │          │
│   │   Server: "codebase"│                  │   Server: "snapback"│          │
│   │   Reads: ai_dev_utils│                  │   Reads: .snapback/ │          │
│   │   Tools: codebase.* │                  │   Tools: snapback.* │          │
│   │                     │                  │                     │          │
│   │   (MCP server for   │                  │   (MCP server for   │          │
│   │    internal dev)    │                  │    customers)       │          │
│   └─────────────────────┘                  └─────────────────────┘          │
│                                                                              │
│   ════════════════════════════════════════════════════════════════════════  │
│   SHARED: @snapback/intelligence package (ValidationPipeline, LearningEngine)│
│   ════════════════════════════════════════════════════════════════════════  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Current Implementation Status

### apps/mcp-server (Customer MCP Server) - ✅ READY

Already reads from `.snapback/` directory:
- `context-tools.ts` uses `rootDir: workspaceRoot` with `.snapback/` paths
- LearningEngine configured for `.snapback/patterns/`, `.snapback/learnings/`
- SemanticRetriever uses `.snapback/embeddings.db`
- ValidationPipeline shared from `@snapback/intelligence`

### apps/cli (Customer CLI) - 🔴 NEEDS IMPLEMENTATION

Missing commands to create and manage `.snapback/` directory:
- `snap login/logout/whoami` - Auth flow
- `snap init` - Create directory structure
- `snap tools configure` - MCP auto-setup for Cursor/Claude
- `snap protect add/remove/list` - Protected files management
- `snap status` - Workspace health check
- `snap fix <issue>` - Auto-fix detected issues
- `snap session start/status` - Manage development sessions
- `snap learn` - Record learnings
- `snap patterns list/report` - Pattern management

### Key Insight

The MCP server is ready - it just needs the CLI to create `.snapback/` first.
Same pattern as internal: `ai_dev_utils/` must exist before `ai_dev_utils/mcp/` can read from it.

---

## Storage Architecture: Global vs Workspace

```
~/.snapback/                    # GLOBAL (managed by CLI)
├── credentials.json            # Auth tokens (from snap login)
├── config.json                 # User preferences
├── cache/
│   └── user-profile.json       # Cached server profile
└── mcp-configs/                # Auto-generated MCP configs
    ├── cursor.json             # For snap tools configure
    └── claude.json

.snapback/                      # WORKSPACE (managed by CLI)
├── config.json                 # Workspace config
├── vitals.json                 # Workspace vitals
├── protected.json              # Protected files list
├── patterns/                   # Local patterns
├── learnings/                  # Local learnings
├── session/                    # Session state
├── embeddings.db               # Local embeddings cache
└── snapshots/                  # Pro: local snapshots
```

**Creation Flow:**
- `snap login` → Creates `~/.snapback/credentials.json`
- `snap init` → Creates `.snapback/` in workspace
- `snap tools configure` → Writes to `~/.cursor/mcp.json` or `~/.config/claude/`

---

## Data Structure Mapping: ai_dev_utils/ → .snapback/

### Directory Structure Comparison

| Internal (ai_dev_utils/) | Customer (.snapback/) | Purpose | Managed By |
|-------------------------|----------------------|---------|------------|
| `patterns/violations.jsonl` | `patterns/violations.jsonl` | Track repeated mistakes | CLI + MCP |
| `patterns/codebase-patterns.md` | `patterns/workspace-patterns.json` | Promoted patterns | CLI |
| `feedback/learnings.jsonl` | `learnings/user-learnings.jsonl` | User-recorded learnings | CLI |
| `feedback/interactions.jsonl` | `learnings/interactions.jsonl` | AI interaction history | MCP |
| `rules/*.md` | N/A (server provides) | Path-targeted rules | Server |
| `state/current-task.json` | `session/current.json` | Active session state | CLI + MCP |
| `ROUTER.md` | N/A (internal only) | Task routing | Internal only |
| `ARCHITECTURE.md` | `workspace-info.json` | Workspace architecture | CLI (snap init) |
| `CONSTRAINTS.md` | `protection-rules.json` | File protection rules | Server + CLI |

### .snapback/ Directory Structure (Customer)

```
.snapback/
├── config.json               # Workspace configuration
│   ├── workspaceId           # Server-assigned ID
│   ├── tier                  # 'free' | 'pro'
│   ├── protectionLevel       # 'standard' | 'strict'
│   └── syncEnabled           # Sync patterns to server
│
├── vitals.json               # Workspace vitals (from snap init)
│   ├── framework             # Detected framework
│   ├── packageManager        # npm/pnpm/yarn
│   ├── typescript            # TS config detected
│   └── criticalFiles         # Auto-detected critical paths
│
├── session/
│   ├── current.json          # Current session state
│   │   ├── sessionId
│   │   ├── startedAt
│   │   ├── taskDescription
│   │   └── snapshotCount
│   └── history.jsonl         # Past sessions (rolling 30 days)
│
├── patterns/
│   ├── violations.jsonl      # Tracked violations
│   │   ├── type              # Violation type
│   │   ├── file              # Where it happened
│   │   ├── count             # Occurrence count
│   │   └── prevention        # How to prevent
│   └── workspace-patterns.json  # Promoted patterns (3x threshold)
│
├── learnings/
│   ├── user-learnings.jsonl  # User-recorded learnings
│   │   ├── trigger           # When to apply
│   │   ├── action            # What to do
│   │   └── source            # Where learned
│   └── interactions.jsonl    # AI interaction log (for learning)
│
├── snapshots/                # Local snapshot storage (Pro)
│   ├── snap_abc123/
│   │   ├── manifest.json     # File list + metadata
│   │   └── blobs/            # Content-addressable storage
│   └── snap_def456/
│       └── ...
│
└── .gitignore                # Excludes snapshots, keeps config
```

### CLI Commands Mapping (Complete)

| ai_dev_utils Equivalent | CLI Command | Description | Storage |
|-----------------------|-------------|-------------|----------|
| N/A (OAuth) | `snap login` | Authenticate with server | `~/.snapback/credentials.json` |
| N/A | `snap logout` | Clear credentials | `~/.snapback/credentials.json` |
| N/A | `snap whoami` | Show current user | `~/.snapback/credentials.json` |
| Create `ai_dev_utils/` | `snap init` | Initialize workspace | `.snapback/` |
| Configure MCP | `snap tools configure` | Auto-setup for Cursor/Claude | `~/.cursor/mcp.json` |
| `scripts/start.sh "task"` | `snap session start "task"` | Start a development session | `.snapback/session/` |
| Read `state/current-task.json` | `snap session status` | Show current session | `.snapback/session/` |
| `scripts/learn.sh` | `snap learn "pattern"` | Record a learning | `.snapback/learnings/` |
| Read `patterns/codebase-patterns.md` | `snap patterns list` | Show active patterns | `.snapback/patterns/` |
| Write `patterns/violations.jsonl` | `snap patterns report` | Report a violation | `.snapback/patterns/` |
| N/A | `snap protect add/remove/list` | Manage protected files | `.snapback/protected.json` |
| N/A | `snap status` | Workspace health check | Reads `.snapback/` |
| N/A | `snap fix <issue>` | Auto-fix detected issues | Workspace files |

---

## Capability Mapping Matrix

### Legend
- 🟢 **Direct Port**: Same interface, different data source
- 🟡 **Adapted**: Modified interface for customer use
- 🔴 **Protected**: Server-side only, not exposed
- ⬛ **New**: Customer-specific capability

| Internal Tool (codebase.*) | Customer Tool (snapback.*) | Status | IP Protection | Notes |
|---------------------------|---------------------------|--------|---------------|-------|
| `start_task` | `snapback.start_session` | 🟡 Adapted | Server classifies task | User gets guidance, not classification logic |
| `get_context` | `snapback.get_context` | 🟢 Direct | Patterns from server | Already implemented, uses customer workspace |
| `check_patterns` | `snapback.check_patterns` | 🟢 Direct | Detection rules server-side | Already implemented, local pattern matching |
| `validate_code` | `snapback.validate_code` | 🟢 Direct | 7-layer pipeline server-side | Already implemented |
| `report_violation` | `snapback.report_issue` | 🟡 Adapted | Aggregation server-side | Customer reports issues, server learns |
| `query_learnings` | `snapback.get_recommendations` | 🟡 Adapted | Pattern DB server-side | Returns recommendations, not raw learnings |
| `record_learning` | `snapback.record_learning` | 🟢 Direct | Stored server-side | Already implemented |
| `get_violations_summary` | N/A | 🔴 Protected | Internal only | Not exposed to customers |
| `ask_ai` | N/A | 🔴 Protected | Internal only | Uses our Anthropic quota |
| `log_interaction` | `snapback.log_activity` | 🟡 Adapted | Server-side analytics | Metadata only, no code |
| `record_feedback` | `snapback.feedback` | 🟡 Adapted | Server learns | Improves recommendations |
| `get_learning_stats` | `snapback.session_stats` | 🟡 Adapted | Aggregated only | User sees their stats |
| N/A | `snapback.analyze_risk` | ⬛ New | Algorithms server-side | Already implemented |
| N/A | `snapback.create_snapshot` | ⬛ New | Storage local | Pro tier |
| N/A | `snapback.get_workspace_vitals` | ⬛ New | Detection server-side | Already implemented |

---

## MCP Resources (for @snap Mentions)

To enable `@snap` mentions in Cursor/Claude, MCP Resources expose data for AI context:

| Resource URI | Name | Data Source | Purpose |
|--------------|------|-------------|----------|
| `snap://context` | SnapBack Context | `.snapback/embeddings.db` | Workspace context, patterns |
| `snap://preferences` | Your Preferences | Server + `~/.snapback/` | Learned coding style |
| `snap://workspace` | Workspace Info | `.snapback/vitals.json` | Protected files, session |
| `snap://patterns` | Local Patterns | `.snapback/patterns/` | Violations, promoted patterns |

**Usage Example:**
```
@snap what should I protect before refactoring auth?
```
→ AI reads `snap://workspace` and `snap://patterns` to answer with context.

---

## Hybrid Proxy Pattern

### Tool Classification: Local vs Server-Proxied

```typescript
// LOCAL-FIRST TOOLS (read .snapback/ directly)
// Work offline, no server round-trip
const LOCAL_TOOLS = [
  "snapback.get_context",         // SemanticRetriever reads .snapback/embeddings.db
  "snapback.check_patterns",      // ValidationPipeline reads .snapback/patterns/
  "snapback.validate_code",       // 7-layer pipeline, local checks
  "snapback.get_workspace_vitals", // Reads .snapback/vitals.json
  "snapback.check_dependencies",  // Local package.json analysis
];

// SERVER-PROXIED TOOLS (call API for intelligence)
// Need server for cross-workspace learning, Pro features
const PROXIED_TOOLS = [
  "snapback.start_session",       // Server classifies task, returns guidance
  "snapback.get_recommendations", // Server aggregates learnings
  "snapback.record_learning",     // Writes to both local + server
  "snapback.analyze_risk",        // Local basic + Server Pro enrichment
  "snapback.create_snapshot",     // Local storage + Server metadata (Pro)
];
```

### Server Endpoint: Single `/mcp/execute`

Using single endpoint to match thin proxy pattern:

```typescript
// POST /mcp/execute
{
  tool: "snapback.start_session",
  args: { taskDescription: "Add auth" },
  workspaceId: "ws_xxx"
}
```

**Why Single Endpoint:**
- Matches thin proxy pattern (one gateway)
- Simpler client implementation
- Server-side routing adds auth, logging, circuit breaking

---

## IP Protection Strategy

### What Stays Server-Side (PROTECTED)

| Component | Reason | Customer Sees |
|-----------|--------|---------------|
| Task Classification Logic | Core algorithm | Task type label only |
| Violation Detection Rules | Secret patterns | Detected issues, not rules |
| Risk Scoring Weights | Competitive advantage | Risk level + factors |
| Pattern Promotion Thresholds | System configuration | Recommendations |
| DBSCAN Clustering Parameters | ML tuning | Grouped sessions |
| Semantic Embedding Model | Training investment | Relevant context |
| Cross-workspace Aggregation | User behavior analysis | Personalized defaults |

### What Runs Locally (CLIENT-SIDE)

| Component | Reason | Privacy Benefit |
|-----------|--------|-----------------|
| Code Content | Privacy | Never leaves machine |
| Snapshot Storage | Data sovereignty | .snapback/ local |
| File Diffs | Performance | Local comparison |
| Session State | Offline capable | Works without network |
| Git Operations | Security | No credentials shared |

### What Flows Between (METADATA ONLY)

| Data | Direction | Example |
|------|-----------|---------|
| File paths (relative) | Client → Server | `src/auth/login.ts` |
| File sizes | Client → Server | `2345 bytes` |
| File hashes | Client → Server | `sha256:abc123` |
| Package names | Client → Server | `next`, `react` |
| Detection results | Server → Client | `{ severity: 'high', type: 'secret-leak' }` |
| Recommendations | Server → Client | `["Use environment variables", ...]` |
| User preferences | Server → Client | `{ verbosity: 'concise' }` |

---

## Customer MCP Tool Definitions

### Tier 1: Free Tools (Local + Limited Server)

```typescript
const FREE_TIER_TOOLS = [
  // Risk Analysis (local engine + server enrichment)
  {
    name: "snapback.analyze_risk",
    description: "Analyze code changes for risks before applying",
    // Local: pattern matching, basic threats
    // Server: enhanced detection (optional)
  },

  // Dependency Check (fully local)
  {
    name: "snapback.check_dependencies",
    description: "Check for dependency-related risks",
    // 100% local - no server needed
  },

  // Context (local patterns + server defaults)
  {
    name: "snapback.get_context",
    description: "Get workspace context for current task",
    // Local: .snapback/ patterns
    // Server: user preference defaults
  },

  // Workspace Vitals (local scan + server analysis)
  {
    name: "snapback.get_workspace_vitals",
    description: "Scan workspace health and configuration",
    // Local: file listing, config detection
    // Server: issue detection, recommendations
  },
];
```

### Tier 2: Pro Tools (Full Server Intelligence)

```typescript
const PRO_TIER_TOOLS = [
  // Snapshots (local storage + server metadata)
  {
    name: "snapback.create_snapshot",
    description: "Create a restoration point before risky changes",
    // Local: content storage in .snapback/
    // Server: metadata tracking, analytics
  },

  {
    name: "snapback.list_snapshots",
    description: "List available restoration points",
  },

  {
    name: "snapback.restore_snapshot",
    description: "Restore from a previous snapshot",
  },

  // Learning System (server-side)
  {
    name: "snapback.get_recommendations",
    description: "Get AI-powered recommendations for current context",
    // Server: learned patterns, cross-workspace insights
  },

  {
    name: "snapback.record_learning",
    description: "Record a pattern or pitfall for future reference",
    // Server: stored in user's learning profile
  },

  // Session Intelligence (server-side)
  {
    name: "snapback.start_session",
    description: "Start a new development session with context",
    // Server: loads user preferences, workspace patterns
  },

  {
    name: "snapback.session_stats",
    description: "Get statistics for current session",
    // Server: aggregated metrics, coaching
  },

  // Advanced Validation (server-side)
  {
    name: "snapback.validate_code",
    description: "Run 7-layer validation pipeline",
    // Server: full pipeline with learned patterns
  },
];
```

---

## Learning System Integration

### From `the_vision.md` - Two-Level Learning

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SNAPBACK LEARNS YOU                                  │
│                                                                              │
│   Global (User Level)                   Per-Workspace                        │
│   ~/.snapback/                          .snapback/                           │
│                                                                              │
│   • Preferred stack (Next.js, pnpm)     • This project's architecture       │
│   • Coding style (tabs vs spaces)       • Critical files for THIS codebase  │
│   • Communication preferences           • Local patterns & conventions       │
│   • Common patterns across projects     • Team-specific rules               │
│   • Tool preferences (Cursor/Claude)    • Framework-specific protection     │
│                                                                              │
│   STORED: Server-side                   STORED: Local + Server metadata     │
│   (user_profiles table)                 (.snapback/ + workspaces table)     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Learning Flow (Customer)

```typescript
// 1. When user initializes workspace
// CLI collects vitals → Server analyzes → Returns recommendations
const vitals = await collectVitals(workspacePath);
const analysis = await server.analyzeVitals(vitals); // Metadata only
// Server learns: "This user uses TypeScript, Next.js, pnpm"

// 2. During development sessions
// MCP reports activity → Server tracks patterns
await server.reportActivity({
  sessionId,
  workspaceId,
  event: 'snapshot_created',
  metadata: { trigger: 'ai-detected', fileCount: 3 }
});
// Server learns: "User frequently snapshots auth files"

// 3. When user provides feedback
// User confirms/rejects recommendation → Server learns
await server.recordFeedback({
  recommendationId,
  accepted: true,
  confidence: 0.9
});
// Server learns: "This type of recommendation works for this user"

// 4. Next session gets smarter
// Server returns personalized context
const context = await server.getContext({
  workspaceId,
  taskDescription: "Add authentication"
});
// Returns: "You typically use better-auth, here are your patterns..."
```

---

## Implementation Roadmap

### Phase 1: Foundation (Current State ✅)

Already implemented in `apps/mcp-server`:
- [x] `snapback.analyze_risk` - Local engine with server enrichment
- [x] `snapback.check_dependencies` - Fully local
- [x] `snapback.get_context` - From @snapback/intelligence
- [x] `snapback.check_patterns` - From @snapback/intelligence
- [x] `snapback.validate_code` - From @snapback/intelligence
- [x] `snapback.record_learning` - From @snapback/intelligence
- [x] `snapback.get_workspace_vitals` - Workspace sensing
- [x] `snapback.create_snapshot` - Pro tier
- [x] `snapback.list_snapshots` - Pro tier
- [x] `snapback.restore_snapshot` - Pro tier

### Phase 2: Server-Side Learning (Week 1-2)

Build out `apps/api` endpoints to support:
- [ ] `POST /api/mcp/session/start` - Initialize session with user context
- [ ] `POST /api/mcp/activity` - Report activity metadata
- [ ] `POST /api/mcp/feedback` - Record user feedback
- [ ] `GET /api/mcp/recommendations` - Get personalized recommendations
- [ ] Database: `user_profiles`, `user_preference_signals`, `aggregated_patterns`

### Phase 3: Thin Proxy Enhancement (Week 2)

Enhance `apps/mcp-server` to:
- [ ] Call server for session start/context enrichment
- [ ] Report activity metadata (not code) to server
- [ ] Cache user preferences locally for offline use
- [ ] Implement graceful degradation when offline

### Phase 4: Cross-Workspace Intelligence (Week 3)

Build aggregation in `apps/api`:
- [ ] Pattern aggregation across user's workspaces
- [ ] Preference promotion (2+ workspaces = preference)
- [ ] Personalized defaults for new workspaces

---

## Internal → Customer Tool Mapping Details

### `codebase.start_task` → `snapback.start_session`

**Internal (codebase.start_task):**
```typescript
// Returns full context + learnings + violations + checklist
{
  task: "Add authentication",
  taskType: "NEW_FEATURE",  // ← Classification logic (protected)
  architecture: { ... },
  learnings: [ ... ],       // ← Raw learnings (protected)
  recentViolations: [ ... ], // ← Full violations (protected)
  checklist: [ ... ],
  beforeCommit: "..."
}
```

**Customer (snapback.start_session):**
```typescript
// Returns decisions and recommendations, not raw data
{
  sessionId: "sess_xxx",
  guidance: {
    taskType: "feature",    // Simplified label
    recommendations: [      // Server decides what's relevant
      "Consider creating a snapshot before major changes",
      "You typically use better-auth for authentication"
    ],
    protectionLevel: "standard",  // Server decides
    relevantPatterns: [     // Curated, not raw
      { name: "auth-pattern-1", description: "..." }
    ]
  },
  userPreferences: {
    verbosity: "concise",
    autoSnapshot: true
  }
}
```

### `codebase.query_learnings` → `snapback.get_recommendations`

**Internal:**
```typescript
// Returns raw learnings with triggers and sources
{
  matches: [
    { trigger: "vitest config", action: "use nodeConfig", source: "session-123" }
  ]
}
```

**Customer:**
```typescript
// Returns curated recommendations
{
  recommendations: [
    {
      type: "pattern",
      title: "Vitest Configuration",
      description: "Use the nodeConfig preset for this type of project",
      confidence: 0.85,
      // No trigger/source exposed
    }
  ]
}
```

---

## Security Considerations

### Never Expose

1. **Raw violation data** - Reveals detection patterns
2. **Learning triggers** - Reveals how system learns
3. **Classification weights** - Reveals scoring logic
4. **Cross-user patterns** - Privacy violation
5. **Internal file paths** - Security risk

### Always Sanitize

1. **Error messages** - Use generic messages in production
2. **File paths** - Hash or use relative paths only
3. **Stack traces** - Log internally, return log ID
4. **User data** - Never expose other users' data

---

## References

- **Vision:** `ai_dev_utils/resources/new_cli/the_vision.md`
- **Thin Proxy:** `ai_dev_utils/resources/new_cli/thin_proxy_architecture.md`
- **Local First:** `ai_dev_utils/resources/new_cli/local_first_adherence.md`
- **Internal MCP:** `ai_dev_utils/mcp/server.ts`
- **Customer MCP:** `apps/mcp-server/src/index.ts`
- **ROUTER.md:** Internal MCP scope clarification (lines 306-316)

**Last Updated:** 2025-12-21
**Status:** Planning Complete
