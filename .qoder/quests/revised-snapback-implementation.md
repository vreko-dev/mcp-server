# Design: SnapBack Engine Migration & Integration

## Objective

Restructure the orphaned `snapback/` directory into a Turborepo-compliant package at `packages/engine/`, complete missing core capabilities (burst detection, AI detection, decision engine), and integrate it into the VS Code extension through a bridge pattern that enables gradual migration from V1 to V2 architecture.

## Background

### Current Architecture Problems

The codebase currently has three architectural issues:

1. **Orphaned Directory**: The `snapback/` directory at workspace root violates Turborepo conventions for monorepo organization
2. **Incomplete Core Capabilities**: Missing signal implementations for burst detection, AI presence detection, and decision aggregation
3. **Tight Coupling**: VS Code extension directly depends on VS Code APIs mixed with business logic, preventing reuse across CLI, MCP server, and other transports

### Target Architecture

```
Layered Architecture with Clean Separation:

┌─────────────────────────────────────────────────────────────┐
│  Transport Layer (apps/vscode, apps/cli, apps/mcp-server)  │
│  - UI components, commands, notifications                   │
│  - Platform-specific APIs (VS Code, terminal, HTTP)         │
│  - Telemetry integration                                    │
└──────────────────┬──────────────────────────────────────────┘
                   │ imports and consumes
┌──────────────────▼──────────────────────────────────────────┐
│  Bridge Layer (apps/vscode/src/bridges/)                    │
│  - StorageBridge: routes to V1 or V2 storage                │
│  - SignalBridge: wraps engine signals for VS Code context   │
│  - EventBridge: maps engine events to PostHog telemetry     │
│  - Feature-flagged: gradual rollout pattern                 │
└──────────────────┬──────────────────────────────────────────┘
                   │ imports @snapback/engine
┌──────────────────▼──────────────────────────────────────────┐
│  Core Engine (packages/engine/) - ZERO Platform APIs        │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐   │
│  │   Signals    │ │   Runtime    │ │    Validators     │   │
│  │  • risk      │ │  • storage   │ │  • types          │   │
│  │  • burst     │ │  • decision  │ │  • cycles         │   │
│  │  • ai-detect │ │  • session   │ │  • security       │   │
│  │  • cycles    │ │  • events    │ └───────────────────┘   │
│  │  • complexity│ │  • rate-limit│                          │
│  └──────────────┘ └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## System Components

### Component 1: Engine Package Structure

**Location**: `packages/engine/`

**Purpose**: Transport-agnostic core engine containing all business logic for risk detection, snapshot management, and validation

**Directory Structure**:
```
packages/engine/
├── src/
│   ├── signals/          # Risk detection signals
│   │   ├── index.ts
│   │   ├── risk.ts       # Overall risk scoring
│   │   ├── burst.ts      # Rapid change detection
│   │   ├── ai-detection.ts # AI tool pattern matching
│   │   ├── cycles.ts     # Circular dependency detection
│   │   └── complexity.ts # Code complexity metrics
│   ├── runtime/          # Orchestration and execution
│   │   ├── index.ts
│   │   ├── decision.ts   # Signal aggregation → action
│   │   ├── protection.ts # Watch/Warn/Block logic
│   │   ├── storage.ts    # PRE/POST checkpoint flow
│   │   ├── session.ts    # Session state tracking
│   │   ├── rate-limiter.ts # Snapshot budget
│   │   └── events.ts     # Event emission
│   ├── validators/       # Code quality gates
│   │   ├── index.ts
│   │   ├── types.ts      # TypeScript validation
│   │   ├── cycles.ts     # Import cycle detection
│   │   └── security.ts   # Security pattern checks
│   ├── types.ts          # Shared type definitions
│   └── index.ts          # Public API exports
├── test/                 # Test files mirroring src/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

**Constraints**:
- ZERO imports from `vscode` module - must be pure TypeScript/Node
- All signals must complete within 50ms for files under 1000 LOC
- File size limit: signals max 100 LOC, runtime modules max 150 LOC
- Must use stdin/stdout JSON protocol for script-based execution

### Component 2: Bridge Layer

**Location**: `apps/vscode/src/bridges/`

**Purpose**: Adapter layer that translates between VS Code extension APIs and the engine package, enabling gradual migration and dual operation

**Modules**:

#### StorageBridge

**Interface**: Implements existing `IStorageManager` from `apps/vscode/src/storage/types.ts`

**Behavior**:
- Routes storage operations to V1 (current) or V2 (engine) based on feature flag `snapback.useV2Engine`
- Ensures backward compatibility: V2 mode can still read V1 snapshots
- Translates V1 manifest schema to V2 schema and vice versa
- Maintains single-writer guarantee through WriterLock

**Decision Flow**:
```
User saves file
    ↓
StorageBridge.createSnapshot()
    ↓
Check config: snapback.useV2Engine?
    ├─ false → route to apps/vscode/src/storage/StorageManager (V1)
    └─ true  → route to @snapback/engine runtime/storage (V2)
    ↓
Return SnapshotManifest (normalized to V1 schema for compatibility)
```

#### SignalBridge

**Purpose**: Wraps engine signal computations with VS Code-specific context (workspace paths, document content)

**Interface**:
```
interface SignalBridge {
  computeBurst(document: vscode.TextDocument): BurstState
  detectAI(change: vscode.TextDocumentChangeEvent): AIDetectionResult
  calculateRisk(files: string[]): RiskSignal
}
```

**Integration Point**: Called by existing `AutoDecisionEngine` in `apps/vscode/src/domain/engine.ts`

#### EventBridge

**Purpose**: Maps engine-emitted events to PostHog telemetry events while preserving PII scrubbing

**Event Mapping**:
```
Engine Event              → PostHog Event
─────────────────────────────────────────────
burst.detected            → burst_detected
ai.detected               → ai_presence_detected
snapshot.created          → snapshot_created
decision.made             → protection_decision_made
```

**Privacy Rules**:
- Strip absolute file paths (keep relative workspace paths only)
- Hash user identifiers
- Never log file content
- Aggregate metrics (counts, averages) only

### Component 3: Signal Implementations

#### Burst Detection Signal

**File**: `packages/engine/src/signals/burst.ts`

**Purpose**: Detect rapid sequential changes indicating AI-assisted coding or paste operations

**Algorithm**:
1. Track document changes in sliding 2-second window
2. Calculate velocity (characters per second)
3. Compare against thresholds:
   - Normal typing: ~150 chars/min = 2.5 chars/sec
   - Fast typing: ~400 chars/min = 6.7 chars/sec
   - AI/Paste: >1000 chars/sec
4. Mark as burst if velocity exceeds threshold OR change count exceeds 5 in window

**Configuration**:
```
interface BurstConfig {
  windowMs: number         // Default: 2000 (2 seconds)
  threshold: number        // Changes to trigger burst (default: 5)
  velocityThreshold: number // Chars/sec for paste detection (default: 500)
}
```

**Output**:
```
interface BurstState {
  active: boolean          // Is burst currently active?
  changeCount: number      // Changes in current window
  windowStart: number      // Timestamp of window start
  velocity: number         // Characters per second
}
```

**Reference Source**: `apps/vscode/src/engine/BurstDetector.ts` lines 74-393

#### AI Detection Signal

**File**: `packages/engine/src/signals/ai-detection.ts`

**Purpose**: Pattern matching to detect AI tool usage (Copilot, Cursor, Claude, ChatGPT, etc.)

**Detection Methods**:

1. **Content Pattern Matching**:
   - Copilot: `/Generated by GitHub Copilot/i`, `/gh copilot/i`
   - Cursor: `/cursor/i`, `/\[@cursor\]/i`
   - Claude: `/claude/i`, `/anthropic/i`
   - ChatGPT: `/chatgpt/i`, `/openai/i`
   - Codeium: `/codeium/i`
   - Tabnine: `/tabnine/i`
   - Amazon Q: `/amazon q/i`
   - Sourcegraph: `/sourcegraph/i`, `/cody/i`
   - JetBrains AI: `/jetbrains/i`, `/intellij ai/i`

2. **Velocity Analysis**:
   - Calculate typing speed from change events
   - If speed > 1000 chars/sec → likely paste or AI
   - If speed consistent across multiple files → AI session

**Output**:
```
interface AIDetectionResult {
  detected: boolean
  tool?: 'copilot' | 'cursor' | 'claude' | 'chatgpt' | 'unknown'
  confidence: number       // 0-1 scale
  method: 'pattern' | 'velocity' | 'combined'
}
```

**Confidence Scoring**:
- Pattern match with known signature: 0.95
- Velocity-only detection: 0.8
- Combined pattern + velocity: 0.98

**Reference Source**: `apps/vscode/src/engine/AIPresenceDetector.ts` (verify actual path - may be in `apps/vscode/src/ai/` or `apps/vscode/src/engine/`)

#### Decision Aggregation

**File**: `packages/engine/src/runtime/decision.ts`

**Purpose**: Combine multiple signals into a single protection decision

**Note**: This is distinct from the orchestrator module (`runtime/orchestrator.ts`) which coordinates script execution and session health tracking. The decision module focuses purely on signal aggregation logic for determining snapshot/notification actions.

**Input**:
```
interface DecisionInput {
  signals: {
    risk?: RiskSignal
    burst?: BurstState
    ai?: AIDetectionResult
    cycles?: CycleResult
  }
  protectionLevel: 'watch' | 'warn' | 'block'
  rateLimitRemaining: number
}
```

**Decision Logic** (priority order):

1. **Rate Limit Check**:
   - If `rateLimitRemaining <= 0` → action = 'warn', snapshot = false

2. **Critical Signals** (any triggers snapshot):
   - AI detected with confidence >= 0.8
   - Risk score >= configured threshold (default: 70)
   - Critical files modified (package.json, .env, auth files)

3. **Burst Signals**:
   - Burst active AND file count >= minFilesForBurst (default: 3)

4. **Protection Level Application**:
   - watch: snapshot = true, notify = false
   - warn: snapshot = true, notify = true
   - block: snapshot = true, notify = true, prevent save

**Output**:
```
interface Decision {
  action: 'allow' | 'snapshot' | 'warn' | 'block'
  snapshot: boolean        // Should create snapshot?
  notify: boolean          // Should show notification?
  reason: string           // Human-readable explanation
  signals: string[]        // Which signals contributed
}
```

**Reference Source**: `apps/vscode/src/domain/engine.ts` lines 1-350

### Component 4: Storage Implementation

**File**: `packages/engine/src/runtime/storage.ts`

**Purpose**: Content-addressable blob storage with PRE/POST checkpoint pattern

**Architecture**:

1. **Content-Addressable Blobs**:
   - SHA-256 hash as blob ID
   - Automatic deduplication (unchanged files stored once)
   - Blobs stored in `blobs/` directory keyed by hash

2. **Manifest-Based Snapshots**:
   - Manifest contains file paths → blob hash mapping
   - Manifests stored in `snapshots/` directory
   - Sequential ID allocation with WriterLock protection

3. **PRE/POST Checkpoint Pattern**:
   - PRE: Create pointer-only checkpoint (files: {}) BEFORE risky operation
   - POST: Create content checkpoint AFTER operation completes
   - Orphan Detection: PRE without matching POST indicates interrupted operation

**V2 Manifest Schema**:
```
interface SnapshotManifestV2 {
  id: string               // Unique snapshot ID
  seq: number              // Sequential number
  timestamp: number        // Creation timestamp
  anchorFile: string       // Primary file that triggered snapshot
  files: Record<string, string> // path → blob hash mapping
  metadata: {
    riskScore: number
    origin: 'INTERACTIVE' | 'AUTOMATED'
    reasons: string[]      // Why snapshot was created
    aiDetection?: AIDetectionResult
    sessionId?: string
  }
  parentSeq?: number       // For PRE/POST linking
  parentId?: string
}
```

**Critical Operations**:

**Create PRE Checkpoint**:
```
Input: { anchorFile, reason }
Process:
  1. Synchronously reserve seq number (prevent race)
  2. Create manifest with files: {} (pointer only)
  3. Write to disk with atomic write
  4. Return manifest
```

**Create POST Checkpoint**:
```
Input: { files, anchorFile, parentSeq, parentId }
Process:
  1. Hash all file contents
  2. Write new blobs (only changed files)
  3. Create manifest with full file mapping
  4. Link to parent PRE via parentSeq
  5. Atomic write manifest
  6. Delete parent PRE
```

**Reference Source**: `apps/vscode/src/storage/StorageManager.ts`, `apps/vscode/src/storage/SnapshotStore.ts`

## Data Flow

### Flow 1: File Save with Burst Detection (V2 Engine)

```
User modifies file in editor
    ↓
VS Code triggers onDidChangeTextDocument event
    ↓
SignalBridge.computeBurst(document)
    ├─ Extract change velocity
    ├─ Update sliding window history
    └─ Return BurstState { active: boolean, ... }
    ↓
SignalBridge.detectAI(changeEvent)
    ├─ Scan content for AI patterns
    ├─ Compare velocity against thresholds
    └─ Return AIDetectionResult { detected, tool, confidence }
    ↓
DecisionEngine.evaluate(signals, protectionLevel)
    ├─ Aggregate signals: burst + AI + risk
    ├─ Apply protection level rules
    └─ Return Decision { action, snapshot, notify }
    ↓
If decision.snapshot === true:
    ↓
    StorageBridge.createSnapshot()
    ├─ Check feature flag: snapback.useV2Engine
    ├─ Route to engine storage
    ├─ Create PRE checkpoint (synchronous seq reservation)
    ├─ Hash file contents
    ├─ Write blobs
    ├─ Create POST checkpoint
    └─ Delete PRE
    ↓
EventBridge.publish('snapshot.created')
    ├─ Scrub PII from file paths
    ├─ Map to PostHog event schema
    └─ Send telemetry
    ↓
If decision.notify === true:
    Show VS Code notification with decision.reason
```

### Flow 2: Gradual Migration (Feature Flag)

```
Extension activation
    ↓
Read config: snapback.useV2Engine (default: false)
    ↓
Initialize StorageBridge
    ├─ If false → V1 path (current StorageManager)
    └─ If true  → V2 path (@snapback/engine storage)
    ↓
All storage operations route through bridge
    ├─ createSnapshot() → bridge decides V1 or V2
    ├─ getSnapshot(id) → try V2 first, fallback to V1
    └─ listSnapshots() → merge results from both stores
```

### Flow 3: Session Health Tracking

```
Session starts (first file modification)
    ↓
Orchestrator.resetSession()
    ├─ Initialize health: { score: 100, warnings: [], ... }
    └─ Capture baseline: cycles, complexity at start
    ↓
Each file save triggers analysis
    ↓
Orchestrator.analyze(fileChanges)
    ├─ Run signals in parallel (burst, AI, risk, cycles, complexity)
    ├─ Run validators in parallel (types, cycles, security)
    ├─ Aggregate results → outcome
    └─ Update session health
    ↓
Calculate health delta:
    health.score -= cyclesIntroduced * 15
    health.score -= warnings.length * 5
    health.score -= complexityDelta * 20
    health.score -= failedValidators.length * 10
    ↓
Generate coaching message based on score:
    ├─ score >= 90 → no coaching
    ├─ score >= 70 → note with first warning
    ├─ score >= 50 → caution with all warnings
    └─ score < 50  → critical stop message
    ↓
Return health with MCP response (for AI agent coaching)
```

## Configuration

### Feature Flags

**Primary Flag**: `snapback.useV2Engine`
- Type: boolean
- Default: false
- Location: VS Code settings (snapback.useV2Engine)
- Purpose: Enable V2 engine for gradual rollout
- Rollout Strategy:
  - Week 1: Internal testing (flag = true for dev team)
  - Week 2: Canary users (5% random assignment)
  - Week 3: Opt-in beta (flag visible in settings)
  - Week 4: Default true for new installations
  - Week 5: Force migration for all users

### Engine Configuration

**File**: `packages/engine/src/types.ts`

```
interface EngineConfig {
  burst: {
    windowMs: number           // Default: 2000
    threshold: number          // Default: 5
    velocityThreshold: number  // Default: 500
  }
  aiDetection: {
    enabled: boolean           // Default: true
    tools: string[]            // Which tools to detect
    velocityThreshold: number  // Default: 1000
  }
  decision: {
    riskThreshold: number      // Default: 70 (0-100 scale)
    notifyThreshold: number    // Default: 50
    minFilesForBurst: number   // Default: 3
  }
  rateLimit: {
    maxSnapshotsPerHour: number // Default: 30
    burstAllowance: number      // Default: 5
  }
  protection: {
    defaultLevel: 'watch' | 'warn' | 'block' // Default: 'warn'
    criticalFilePatterns: string[] // Default: ['package.json', '.env*', 'auth*']
  }
}
```

**Storage**: VS Code workspace settings merged with defaults

**Validation**: Zod schema at package boundary ensures type safety

### Package Configuration

**File**: `packages/engine/package.json`

```
{
  "name": "@snapback/engine",
  "version": "0.1.0",
  "description": "Core SnapBack engine - transport agnostic",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./signals": {
      "import": "./dist/signals/index.js",
      "types": "./dist/signals/index.d.ts"
    },
    "./runtime": {
      "import": "./dist/runtime/index.js",
      "types": "./dist/runtime/index.d.ts"
    },
    "./validators": {
      "import": "./dist/validators/index.js",
      "types": "./dist/validators/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "catalog:"
  },
  "devDependencies": {
    "@snapback/config": "workspace:*",
    "tsup": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

**Workspace Update**: Remove `snapback/` from `pnpm-workspace.yaml`, add `packages/engine`

## Testing Strategy

### Unit Tests (Per-File Coverage)

**Location**: `packages/engine/test/` (mirrors src/ structure)

**Coverage Target**: >80% line coverage

**Test Organization**:
```
test/
├── signals/
│   ├── burst.test.ts          # Burst detector tests
│   ├── ai-detection.test.ts   # AI pattern matching tests
│   └── risk.test.ts           # Risk scoring tests
├── runtime/
│   ├── decision.test.ts       # Decision aggregation tests
│   ├── storage.test.ts        # Storage operations tests
│   └── session.test.ts        # Session tracking tests
└── validators/
    ├── types.test.ts          # TypeScript validation tests
    └── cycles.test.ts         # Import cycle detection tests
```

**Key Test Scenarios**:

**Burst Detection**:
- Rapid typing (50 chars in 50ms) triggers burst
- Slow typing (50 chars in 500ms) no burst
- Large paste (500 chars instant) triggers burst
- Sliding window resets after expiry
- Per-file cooldown tracking

**AI Detection**:
- Pattern match for Copilot signature
- Pattern match for Cursor signature
- Velocity-based detection for paste
- Combined pattern + velocity confidence boost
- False positive prevention (normal fast typing)

**Decision Engine**:
- High AI confidence → snapshot
- High risk score → snapshot
- Burst + multiple files → snapshot
- Rate limit exhausted → warn only
- Protection level enforcement

**Storage**:
- Content-addressable deduplication
- PRE/POST checkpoint linking
- Orphan PRE detection on startup
- Concurrent save race condition prevention
- V1 manifest backward compatibility

### Integration Tests

**Location**: `apps/vscode/test/bridges/`

**Test Cases**:

**StorageBridge**:
- V1 mode routes to StorageManager
- V2 mode routes to engine storage
- V2 mode can read V1 snapshots
- Feature flag toggle works without restart
- Manifest schema translation accuracy

**SignalBridge**:
- VS Code document change → engine burst signal
- Engine AI detection integrates with AutoDecisionEngine
- Signal computation within 50ms budget

**EventBridge**:
- Engine events map to PostHog events
- PII scrubbing works correctly
- No duplicate events emitted
- Event payload schema validation

### Performance Benchmarks

**File**: `packages/engine/test/perf/benchmarks.test.ts`

**Benchmarks**:

| Operation | Budget | Measurement |
|-----------|--------|-------------|
| Signal computation (per file <1000 LOC) | <50ms | Measure burst + AI + risk in parallel |
| Snapshot creation (10 files, 500 LOC each) | <100ms | Measure hash + write + manifest |
| Decision aggregation | <5ms | Measure signal combination |
| Engine import overhead | <10ms | Measure cold import time |

**Measurement Method**: Vitest with performance profiling

**Failure Handling**: Tests fail if any operation exceeds budget by >20%

### End-to-End Tests

**Location**: `e2e/extension/engine-integration.spec.ts`

**Test Scenarios**:
1. Install extension with V2 engine enabled
2. Modify file rapidly (trigger burst)
3. Verify snapshot created
4. Check PostHog event received
5. Verify V1 snapshots still accessible
6. Toggle feature flag, verify routing change

## Migration Plan

### Phase 0: Turborepo Restructure (2-3 hours)

**Goal**: Move `snapback/` to `packages/engine/` following Turborepo conventions

**Important**: The `transports/` directory should remain with its consuming app (`apps/mcp-server/`) rather than moving to the engine package, as transports are platform-specific. The engine provides signals/runtime, apps provide transports.

**Steps**:

1. Create new package structure:
   ```bash
   mkdir -p packages/engine/src/{signals,runtime,validators}
   mkdir -p packages/engine/test
   ```

2. Move existing files:
   ```bash
   # Core types and index
   mv snapback/types.ts packages/engine/src/
   mv snapback/index.ts packages/engine/src/

   # Runtime modules (including existing scaffolded files)
   mv snapback/runtime/orchestrator.ts packages/engine/src/runtime/
   mv snapback/runtime/events.ts packages/engine/src/runtime/
   # Move any other runtime/* files if they exist

   # Signal scripts
   mv snapback/scripts/signals/* packages/engine/src/signals/ 2>/dev/null || true

   # Validator scripts
   mv snapback/scripts/validators/* packages/engine/src/validators/ 2>/dev/null || true

   # Tests
   mv snapback/test/* packages/engine/test/ 2>/dev/null || true

   # Documentation
   mv snapback/{AGENT.md,MIGRATION.md,README.md} packages/engine/

   # NOTE: Do NOT move snapback/transports/ - these are app-specific
   # Transports will be moved to apps/mcp-server/ separately if needed
   ```

3. Handle transports separately:
   ```bash
   # Transports stay with their consuming app
   # If MCP transport exists, it belongs in apps/mcp-server/src/transports/
   # Leave snapback/transports/ for now or move to appropriate app
   ```

4. Create `packages/engine/package.json` with proper exports

5. Update `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - apps/**
     - packages/*
     # Remove 'snapback' line if present
     - packages-oss/*
     - tests
     - e2e
     - tooling/*
   ```

6. Update internal imports to use `src/` paths:
   - In `packages/engine/src/runtime/orchestrator.ts`: Update imports from `../types` to `./types` or absolute
   - In `packages/engine/src/runtime/events.ts`: Update event schema imports
   - In `packages/engine/src/index.ts`: Update all re-exports

7. Verify:
   ```bash
   pnpm install
   pnpm build --filter @snapback/engine
   pnpm test --filter @snapback/engine
   ```

**Commit**: "chore: restructure snapback to packages/engine"

**Success Criteria**:
- `pnpm install` succeeds
- `pnpm build --filter @snapback/engine` succeeds
- No import errors
- Existing tests pass

### Phase 1: Complete Core Capabilities (8-10 hours)

**Goal**: Implement missing signal and runtime modules

**Tasks**:

1. **Burst Detection** (2 hours):
   - Create `src/signals/burst.ts`
   - Extract logic from `apps/vscode/src/engine/BurstDetector.ts`
   - Remove VS Code API dependencies
   - Write tests in `test/signals/burst.test.ts`

2. **AI Detection** (2 hours):
   - Create `src/signals/ai-detection.ts`
   - Implement pattern matching for 9+ tools
   - Add velocity-based detection
   - Write tests in `test/signals/ai-detection.test.ts`

3. **Decision Engine** (2 hours):
   - Create `src/runtime/decision.ts`
   - Extract logic from `apps/vscode/src/domain/engine.ts`
   - Implement signal aggregation
   - Write tests in `test/runtime/decision.test.ts`

4. **Protection Logic** (1 hour):
   - Create `src/runtime/protection.ts`
   - Implement watch/warn/block levels
   - Write tests

5. **Rate Limiter** (1 hour):
   - Create `src/runtime/rate-limiter.ts`
   - Implement snapshot budget tracking
   - Write tests

6. **Session Tracking** (1 hour):
   - Create `src/runtime/session.ts`
   - Extract from `orchestrator.ts`
   - Write tests

7. **Storage** (1 hour):
   - Complete `src/runtime/storage.ts`
   - Verify PRE/POST checkpoint flow
   - Write tests

**Commit After Each Module**: "feat(engine): add [module-name]"

**Success Criteria**:
- All new modules have tests
- `pnpm test --filter @snapback/engine` passes
- No TypeScript errors
- File size limits respected (<100 LOC signals, <150 LOC runtime)

### Phase 2: Storage Bridge (4-5 hours)

**Goal**: Create bridge layer in VS Code extension to route to V1 or V2 storage

**Tasks**:

1. **Create StorageBridge** (2 hours):
   - File: `apps/vscode/src/bridges/StorageBridge.ts`
   - Implement `IStorageManager` interface
   - Add feature flag check: `snapback.useV2Engine`
   - Route to V1 or V2 based on flag
   - Ensure V2 can read V1 snapshots

2. **Schema Translation** (1 hour):
   - Convert V1 manifest → V2 manifest
   - Convert V2 manifest → V1 manifest (for backward compat)
   - Preserve all metadata fields

3. **Update Extension Integration** (1 hour):
   - Replace direct `StorageManager` usage with `StorageBridge`
   - Keep V1 as default (flag = false)
   - Test both modes

4. **Write Tests** (1 hour):
   - V1 mode routes correctly
   - V2 mode routes correctly
   - V1 snapshots readable in V2 mode
   - Flag toggle works

**Commit**: "feat(vscode): add StorageBridge for V1/V2 routing"

**Success Criteria**:
- Existing snapshots remain accessible
- V1 mode works unchanged
- V2 mode creates engine-compatible snapshots
- All extension tests pass

### Phase 3: Signal Bridge (3-4 hours)

**Goal**: Wrap engine signals for VS Code context

**Tasks**:

1. **Create SignalBridge** (2 hours):
   - File: `apps/vscode/src/bridges/SignalBridge.ts`
   - Wrap `@snapback/engine` burst detector
   - Wrap AI detector
   - Integrate with `AutoDecisionEngine`

2. **VS Code Context Adaptation** (1 hour):
   - Convert `vscode.TextDocument` to engine input format
   - Convert `vscode.TextDocumentChangeEvent` to engine input
   - Extract file paths, content, line counts

3. **Write Tests** (1 hour):
   - Signal computation within 50ms budget
   - VS Code document → engine format conversion
   - Integration with existing decision engine

**Commit**: "feat(vscode): add SignalBridge for engine integration"

**Success Criteria**:
- Burst detection works with V2 engine
- AI detection works with V2 engine
- Performance budget met (<50ms)
- AutoDecisionEngine integration works

### Phase 4: Event Bridge (2-3 hours)

**Goal**: Map engine events to PostHog telemetry

**Tasks**:

1. **Create EventBridge** (1 hour):
   - File: `apps/vscode/src/bridges/EventBridge.ts`
   - Map engine events to PostHog event names
   - Preserve PII scrubbing rules

2. **Event Schema Validation** (1 hour):
   - Ensure PostHog payload schema unchanged
   - Verify privacy rules applied
   - Test event deduplication

3. **Write Tests** (1 hour):
   - Events map correctly
   - No duplicate events
   - PII scrubbed properly

**Commit**: "feat(vscode): add EventBridge for telemetry mapping"

**Success Criteria**:
- PostHog events still received
- Event schema unchanged
- Privacy preserved
- No duplicate events

### Phase 5: Validation (3-4 hours)

**Goal**: Comprehensive testing and performance validation

**Tasks**:

1. **Full Test Suite** (1 hour):
   ```bash
   pnpm test
   pnpm typecheck
   pnpm build
   ```

2. **Performance Benchmarks** (1 hour):
   - Run `pnpm --filter @snapback/vscode test:perf`
   - Verify all budgets met:
     - Activation: <500ms
     - Save handler: <100ms
     - Signal computation: <50ms

3. **Bundle Size Check** (30 min):
   ```bash
   pnpm --filter @snapback/vscode build
   node apps/vscode/scripts/check-bundle-size.js
   ```
   - Expected: <2MB VSIX

4. **Manual Smoke Test** (1 hour):
   - Install extension locally
   - Enable V2 engine (set flag = true)
   - Modify files rapidly (trigger burst)
   - Verify snapshot created
   - Check PostHog events
   - Toggle flag, verify V1 mode works
   - Verify existing snapshots accessible in both modes

5. **Fix Issues** (30 min buffer):
   - Address any test failures
   - Fix performance regressions
   - Resolve bundle size issues

**Commit**: "test: validate engine integration end-to-end"

**Success Criteria**:
- All tests pass
- Performance budgets met
- Bundle size <2MB
- Manual workflow works
- No regressions in V1 mode

## Performance Requirements

### Critical Path Budgets

| Operation | Budget (p95) | Measurement Point | Failure Impact |
|-----------|--------------|-------------------|----------------|
| Extension activation | <500ms | `extension.ts` activate() | User perceives slow start |
| File save handler | <50ms (no snapshot)<br><100ms (with snapshot) | onDidSaveTextDocument | Blocks save UX |
| Signal computation | <50ms | Per signal for files <1000 LOC | Delays decision |
| Snapshot creation | <100ms | 10 files, 500 LOC each | Blocks save UX |
| Decision aggregation | <5ms | Decision engine | Minimal but additive |

### Bundle Size Constraints

| Target | Budget | Current | Constraint Reason |
|--------|--------|---------|-------------------|
| VSIX package | <2MB | TBD | VS Code marketplace limits |
| Engine package | <500KB | TBD | Tree-shaking efficiency |

### Memory Constraints

| Component | Budget | Monitoring |
|-----------|--------|------------|
| Change history cache | <10MB | Track map size in burst detector |
| Cooldown cache | <1MB | Track entry count |
| Session health | <100KB | Single object, minimal |

## Error Handling

### Error Categories

**Programming Errors** (throw immediately):
- Null/undefined where value required
- Type assertion failures
- Invalid function arguments
- Invariant violations

**Expected Failures** (return Result type):
- File not found during snapshot retrieval
- Network timeout during telemetry
- Validation failures (type check, cycle check)
- Rate limit exceeded

**Initialization Failures** (throw with user guidance):
- Storage directory creation failed (disk full)
- Storage permission denied
- Configuration file malformed

### Result Type Pattern

**Use Result<T, E> for**:
- Expected failures (user input validation, file not found)
- Recoverable errors (retry logic, fallback values)
- Public APIs (SDK methods, VS Code commands)
- Chainable operations (snapshot create → validate → store)

**Example**:
```
interface Result<T, E = Error> {
  success: boolean
  value?: T
  error?: E
}

async function createSnapshot(files: Map<string, string>): Promise<Result<Snapshot, SnapshotError>> {
  // Validate input
  if (files.size === 0) {
    return { success: false, error: new SnapshotError('No files provided') }
  }

  try {
    const snapshot = await storage.create(files)
    return { success: true, value: snapshot }
  } catch (err) {
    return { success: false, error: toSnapshotError(err) }
  }
}
```

### Error Context Preservation

**Chain errors with `cause`**:
```
export class SnapshotCreationError extends BaseError {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'SnapshotCreationError'
  }
}

// Usage
try {
  await lowLevelOperation()
} catch (err) {
  throw new SnapshotCreationError(
    'High-level operation failed',
    filePath,
    toError(err)  // Chain the original error
  )
}
```

### Telemetry Error Logging

**Structured errors with context**:
```
logger.error('Snapshot creation failed', {
  errorType: error.name,
  message: error.message,
  filePath: error.filePath,
  stack: error.stack,
  userId: hashUserId(userId),  // PII scrubbed
  timestamp: Date.now()
})
```

## Privacy & Security

### PII Scrubbing Rules

**Telemetry Events**:
- Strip absolute file paths (keep relative workspace paths only)
- Hash user identifiers (email, username)
- Never log file content or diffs
- Aggregate metrics only (counts, averages, percentiles)

**Example**:
```
// ❌ WRONG - PII leak
logger.info('File saved', {
  path: '/Users/john.doe/projects/secret-app/api/auth.ts',
  userId: 'john.doe@company.com'
})

// ✅ CORRECT - PII scrubbed
logger.info('File saved', {
  path: 'api/auth.ts',  // Relative path only
  userId: hashUserId('john.doe@company.com'),
  category: 'authentication'  // Aggregated category
})
```

### Event Payload Validation

**Zod schema at boundary**:
```
const TelemetryEventSchema = z.object({
  event: z.string(),
  properties: z.object({
    path: z.string().refine(val => !val.startsWith('/'), 'Absolute paths forbidden'),
    userId: z.string().regex(/^[a-f0-9]{64}$/, 'Must be hashed'),
    // ... other fields
  })
})

function sendTelemetry(event: unknown) {
  const validated = TelemetryEventSchema.parse(event)
  posthog.capture(validated.event, validated.properties)
}
```

### Storage Security

**WriterLock for Race Prevention**:
- Single-writer guarantee on critical files (manifests, metadata)
- Prevents concurrent seq allocation conflicts
- Prevents manifest corruption from simultaneous writes

**Atomic Writes**:
- Write to temp file first
- Rename atomically (OS-level guarantee)
- Prevents partial writes on crash

## Dependencies

### Package Dependency Graph

```
@snapback/engine (packages/engine/)
├─ ZERO platform dependencies (no VS Code, no DOM APIs)
├─ Runtime: Node.js built-ins only (fs, path, crypto)
└─ Dev: vitest, typescript, tsup

apps/vscode/
├─ Consumes: @snapback/engine (signals, runtime)
├─ Consumes: @snapback/events (event bus)
├─ Consumes: @snapback/infrastructure (logger)
├─ Platform: vscode module
└─ Telemetry: posthog-node
```

### Allowed Imports

**Engine Package** (`packages/engine/`):
```
✅ ALLOWED:
- node:fs, node:path, node:crypto (Node built-ins)
- zod (validation)
- @snapback/contracts (types only)

❌ FORBIDDEN:
- vscode module
- @snapback/infrastructure (logger - would create circular dependency)
- Any DOM APIs (window, document)
- Any platform-specific APIs
```

**VS Code Extension** (`apps/vscode/`):
```
✅ ALLOWED:
- vscode module
- @snapback/engine (all subpaths)
- @snapback/events
- @snapback/infrastructure
- posthog-node

❌ FORBIDDEN:
- Direct imports from packages/engine/src/* (use public exports only)
```

### Forbidden Patterns

**Circular Dependencies**:
```
❌ WRONG:
@snapback/engine imports @snapback/infrastructure
@snapback/infrastructure imports @snapback/core
@snapback/core imports @snapback/engine

✅ CORRECT:
@snapback/engine → standalone (no package deps)
@snapback/infrastructure → @snapback/contracts only
apps/vscode → @snapback/engine, @snapback/infrastructure
```

**Cross-App Imports**:
```
❌ WRONG:
apps/web importing from apps/vscode

✅ CORRECT:
Both apps import from shared packages
```

## Rollout Strategy

### Week 1: Internal Testing

**Target**: Dev team only

**Configuration**:
- Feature flag `snapback.useV2Engine` manually set to `true`
- Verbose logging enabled
- Telemetry events prefixed with `dev_`

**Success Metrics**:
- No crashes during normal workflow
- V1 snapshots remain accessible
- Performance budgets met
- No regressions in existing features

### Week 2: Canary Users

**Target**: 5% of users (random assignment)

**Configuration**:
- Automatic flag assignment based on user ID hash
- Normal logging level
- Telemetry events include `canary: true` property

**Success Metrics**:
- Error rate <0.1% (compared to V1 baseline)
- Performance degradation <5%
- No user complaints about lost snapshots

### Week 3: Opt-In Beta

**Target**: Users who enable flag in settings

**Configuration**:
- Flag visible in VS Code settings UI
- Documentation published in release notes
- Beta badge in UI for V2 features

**Success Metrics**:
- >10% adoption rate
- Positive user feedback
- Issue reports actionable and fixed

### Week 4: Default True for New Installations

**Target**: New users only

**Configuration**:
- Flag default changes to `true` for first-time installations
- Existing users remain on V1 unless they opt in
- Migration guide published

**Success Metrics**:
- New user onboarding smooth
- No increase in support tickets
- Positive sentiment in community

### Week 5: Force Migration for All Users

**Target**: All users migrated to V2

**Configuration**:
- Flag removed (V2 becomes the only path)
- V1 code deprecated but kept for emergency rollback
- Announcement in release notes

**Success Metrics**:
- <1% rollback requests
- Performance improvements visible in aggregate metrics
- Clean removal of V1 code path in next release

## Success Criteria

### Technical Milestones

- [ ] `packages/engine/` follows Turborepo conventions
- [ ] All core capabilities implemented (burst, AI detection, decision, storage)
- [ ] Tests pass: `pnpm test` all green
- [ ] Type-safe: `pnpm typecheck` no errors
- [ ] Bundle size: Extension VSIX <2MB
- [ ] Performance: All budgets met (activation <500ms, save <100ms, signals <50ms)
- [ ] Backward compatible: Existing V1 snapshots readable in V2 mode
- [ ] Feature flagged: V2 engine opt-in via `snapback.useV2Engine`

### Functional Requirements

- [ ] Burst detection accurately identifies rapid changes
- [ ] AI detection recognizes 9+ tools with >90% accuracy
- [ ] Decision engine aggregates signals correctly
- [ ] Storage uses content-addressable blobs with deduplication
- [ ] PRE/POST checkpoints prevent data loss on interruption
- [ ] Rate limiting prevents snapshot spam
- [ ] Session health tracking provides useful coaching messages
- [ ] Telemetry events preserve privacy (PII scrubbed)

### User Experience

- [ ] No visible behavior change when V2 enabled (except performance improvements)
- [ ] Existing workflows work unchanged
- [ ] Error messages clear and actionable
- [ ] Feature flag toggle works without restart
- [ ] Migration guide clear and complete

## Risks & Mitigations

### Risk 1: Performance Regression

**Impact**: High - Could block file saves, degrade UX

**Likelihood**: Medium - New code paths, engine overhead

**Mitigation**:
- Implement performance benchmarks in CI
- Measure cold import time of engine package
- Profile signal computation with real-world files
- Add performance budgets to tests (fail if exceeded)
- Lazy-load engine components to minimize activation impact

**Monitoring**:
- Track p95 latency for save operations
- Alert if >100ms threshold exceeded
- Dashboard showing engine overhead vs V1 baseline

### Risk 2: Data Loss During Migration

**Impact**: Critical - Users lose snapshot history

**Likelihood**: Low - Bridge pattern preserves V1 access

**Mitigation**:
- StorageBridge reads from both V1 and V2 stores
- V2 mode can read V1 manifests (schema translation)
- Keep V1 code path intact during rollout
- Automated backup before migration
- Emergency rollback procedure documented

**Monitoring**:
- Track snapshot count before and after migration
- Alert on any decrease in snapshot count
- Manual audit of migrated snapshots

### Risk 3: Feature Flag Complexity

**Impact**: Medium - Increases code complexity, testing burden

**Likelihood**: High - Feature flags inherently add branches

**Mitigation**:
- Centralize flag check in single bridge layer
- Avoid nested flag checks (single decision point)
- Remove flag code after full rollout (Week 6+)
- Document flag removal timeline

**Testing**:
- Test both modes (V1 and V2) in CI
- Integration tests verify flag toggle
- E2E tests cover both paths

### Risk 4: Bundle Size Increase

**Impact**: Medium - Could exceed VS Code marketplace limit

**Likelihood**: Medium - Engine adds new dependencies

**Mitigation**:
- Use subpath exports for tree-shaking
- Lazy-load engine modules (import on first use)
- Remove unused V1 code after migration
- Monitor bundle size in CI (fail if >2MB)

**Monitoring**:
- Track VSIX size in each build
- Alert if >1.8MB (90% of limit)
- Dashboard showing bundle size trend

### Risk 5: AI Detection False Positives

**Impact**: Low - Annoys users with incorrect notifications

**Likelihood**: Medium - Pattern matching can be noisy

**Mitigation**:
- Use confidence thresholds (only notify if >0.8)
- Combine pattern matching with velocity analysis
- Allow users to dismiss false positives
- Collect feedback on detection accuracy

**Monitoring**:
- Track false positive rate (user dismissals)
- A/B test different confidence thresholds
- Refine patterns based on feedback

## Decisions Made

### 1. Session Persistence
**Decision**: In-memory only (resets on restart)

**Rationale**: Simpler implementation, clearer session boundaries. A restart = fresh session with clean health score. Add persistence later only if users request it.

### 2. Rate Limit Scope
**Decision**: Per-workspace (prevents overall snapshot flood)

**Rationale**: Prevents flood across all files in workspace. More practical than per-file limits which could still allow workspace-wide spam.

### 3. Orphan PRE Cleanup
**Decision**: 7-day TTL with user notification

**Rationale**: Balances forensics value with storage cleanup. 7 days gives enough time to investigate interrupted saves while preventing indefinite accumulation.

**Implementation**:
- On startup: Detect orphan PREs
- If found: Log warning with file path and timestamp
- If >7 days old: Auto-delete with notification
- User can disable auto-cleanup via config

### 4. V1 Code Removal Timeline
**Decision**: 1 month after full migration (Week 9)

**Rationale**: Enough buffer for emergency rollback without dragging tech debt. Allows time to catch edge cases in production.

**Timeline**:
- Week 5: V2 becomes default for all users
- Week 5-9: V1 code marked as deprecated but kept
- Week 9: Remove V1 code path entirely
- Emergency rollback: Revert to Week 4 tag if critical issues

### 5. Engine Package Versioning
**Decision**: SemVer (0.1.0 → 0.2.0 → 1.0.0)

**Rationale**: Predictable breaking changes, better for package consumers. CalVer doesn't communicate API stability.

**Version Strategy**:
- 0.1.0: Initial release (Phase 0-1 complete)
- 0.2.0: Bridge integration complete (Phase 2-4)
- 1.0.0: V2 engine default, production-ready
- Breaking changes: Bump major (e.g., 1.0.0 → 2.0.0)

### 6. Transports Location
**Decision**: Transports live with their consuming app (e.g., `apps/mcp-server/src/transports/`)

**Rationale**: Transports are platform-specific and may need app-specific context (VS Code APIs, HTTP request objects, etc.). The engine provides signals/runtime, apps provide transports.

**Implementation**:
- MCP transport: `apps/mcp-server/src/transports/mcp.ts`
- CLI transport: `apps/cli/src/transports/stdio.ts`
- HTTP transport (if added): `apps/api/src/transports/http.ts`
- Engine: Provides orchestrator and signals, not transports
