# SnapBack Project Rules & Architecture Patterns

**Status:** Active
**Applies to:** All code in `apps/`, `packages/`, and `tooling/`
**Authority:** Project standards (Y Combinator demo readiness)
**Last Updated:** 2025-12-15

---

## Project Context

SnapBack is an AI-aware code protection platform with:
- **VS Code Extension** - Primary user interface
- **Web Dashboard** - Next.js-based admin/monitoring
- **MCP Server** - Claude integration
- **CLI Tool** - Command-line access
- **API Server** - Backend services

Built as a **Turborepo monorepo** with strict layer separation and performance constraints.

---

## Core Rule: Monorepo Structure (ENFORCED)

```
/
├── apps/              # Deployable applications
│   ├── vscode/        # VS Code extension (consumes packages)
│   ├── web/           # Next.js dashboard
│   ├── mcp-server/    # MCP server
│   ├── cli/           # CLI tool
│   └── api/           # API server
├── packages/          # Shared libraries (no VS Code APIs allowed)
│   ├── engine/        # ⭐ Core engine (pure TS, transport-agnostic)
│   ├── core/          # Legacy (deprecating)
│   ├── sdk/           # Public SDK
│   ├── contracts/     # Shared types/schemas
│   ├── infrastructure/# Logging, error handling
│   ├── auth/          # Authentication
│   └── ...
├── tooling/           # Build configuration, scripts
├── scripts/           # Utility scripts
└── docs/              # Documentation
```

**Foundational Rule:** **Apps consume packages. Packages NEVER import from apps.**

This prevents circular dependencies and ensures libraries remain portable across runtimes.

---

## Critical Rule: Layer Separation

### Layer 1: packages/engine/ - Core Engine (ZERO VS Code)

**Purpose:** Transport-agnostic, runtime-independent core logic

**Rules:**
- ❌ **FORBIDDEN:** `import * as vscode` or ANY vscode API
- ❌ **FORBIDDEN:** VS Code specific types (TreeItem, CodeLens, WebviewPanel, etc.)
- ❌ **FORBIDDEN:** `vscode.Uri`, `vscode.workspace`, `vscode.window`
- ✅ **ALLOWED:** Pure TypeScript, standard library, npm packages
- ✅ **ALLOWED:** Signal processing, validation, transformation logic
- ✅ **ALLOWED:** Data serialization/deserialization
- ✅ **ALLOWED:** Algorithm implementations

**Contains:**
```
packages/engine/src/
├── signals/           # Signal detection and computation
├── runtime/           # Task execution engine
├── validators/        # Input validation
├── transforms/        # Data transformations
├── utils/             # Pure utility functions
└── types.ts           # Shared type definitions
```

**Example - CORRECT:**
```typescript
// packages/engine/src/signals/burstDetector.ts
export function detectBurst(
  timestamps: number[],
  threshold: number
): BurstSignal[] {
  // Pure algorithm - no vscode anywhere
  return computeBursts(timestamps, threshold);
}
```

**Example - WRONG:**
```typescript
// ❌ WRONG - belongs in apps/vscode/, NOT here
export async function showBurstNotification(burst: BurstSignal) {
  vscode.window.showInformationMessage(`Detected burst at ${burst.time}`);
}
```

---

### Layer 2: apps/vscode/ - Extension (VS Code-Specific UI & APIs)

**Purpose:** VS Code extension host with UI integration

**Rules:**
- ✅ **ALLOWED:** All vscode APIs (window, workspace, commands, webviews, etc.)
- ✅ **ALLOWED:** TreeView providers, CodeLens providers, StatusBar
- ✅ **ALLOWED:** Telemetry (with PII scrubbing)
- ✅ **ALLOWED:** Storage (globalState, secrets)
- ✅ **ALLOWED:** Event listeners and handlers
- ✅ **ALLOWED:** Bridge patterns to call engine functions
- ❌ **FORBIDDEN:** Complex business logic (move to engine via bridges)
- ❌ **FORBIDDEN:** Circular imports from packages that import vscode

**Contains:**
```
apps/vscode/src/
├── ui/                # UI components (trees, panels, decorators)
├── commands/          # VS Code command handlers
├── managers/          # Service orchestration
├── bridges/           # Adapters from engine to vscode
├── telemetry/         # Instrumentation (with scrubbing)
└── extension.ts       # Entry point
```

**Example - CORRECT Bridge Pattern:**
```typescript
// apps/vscode/src/bridges/signalBridge.ts
import { detectBurst } from '@snapback/engine/signals';

export async function handleSaveWithSignals(filePath: string): Promise<void> {
  // Call pure engine function
  const timestamps = await collectTimestamps(filePath);
  const bursts = detectBurst(timestamps, 5);

  // Present results via vscode UI
  if (bursts.length > 0) {
    await vscode.window.showInformationMessage(
      `Detected ${bursts.length} burst patterns`
    );
  }
}
```

---

## Code Style & Tooling

### TypeScript Configuration
- **Strict mode:** Required for all packages
- **No `any` types:** Use `unknown` with type guards instead
- **Strict null checks:** Always enabled
- **Module resolution:** `bundler` (per tsconfig.base.json)

### Linting & Formatting
- **Linter:** Biome (NOT ESLint)
  - Configured in `biome.json`
  - Run: `pnpm biome check apps packages`
- **Formatter:** Biome (NOT Prettier)
  - Run: `pnpm biome format --write .`

### Testing Framework
- **Test runner:** Vitest (NOT Jest)
  - Config: `vitest.config.ts` at root
  - Run: `pnpm test`
- **Test location:** Colocate with source or use `__tests__/` directory

### Runtime Validation
- **Validator:** Zod (NOT io-ts, NOT Ajv for schema validation)
- **Use case:** All system boundaries (file I/O, API input, config loading)
- **Pattern:** Validate on input, trust internally

---

## Package Conventions

### package.json Exports (Subpath Pattern)

**Required structure for all public packages:**

```json
{
  "name": "@snapback/engine",
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
  "typesVersions": {
    "*": {
      "signals": ["./dist/signals/index.d.ts"],
      "runtime": ["./dist/runtime/index.d.ts"],
      "validators": ["./dist/validators/index.d.ts"]
    }
  }
}
```

**Rationale:**
- Enables tree-shaking (only imported modules included in bundle)
- Prevents unnecessary exports in bundles
- Forces deliberate public API boundaries

### Correct Import Patterns

✅ **CORRECT - Subpath imports for tree-shaking:**
```typescript
import { detectBurst } from '@snapback/engine/signals';
import { createRuntime } from '@snapback/engine/runtime';
import { validateSnapshot } from '@snapback/engine/validators';
```

❌ **WRONG - Imports entire package (prevents tree-shaking):**
```typescript
import { detectBurst } from '@snapback/engine';
```

❌ **WRONG - Deep imports bypass encapsulation:**
```typescript
import { detectBurst } from '@snapback/engine/dist/signals/detector';
```

---

## Engine Script Pattern

Scripts in `packages/engine/` follow strict stdin/stdout JSON protocol for process-based invocation:

```typescript
// packages/engine/src/scripts/analyze.ts
import { readStdin } from '../utils/io';

interface AnalyzeInput {
  filePath: string;
  content: string;
  threshold?: number;
}

interface AnalyzeOutput {
  success: boolean;
  data?: {
    burstCount: number;
    signals: Signal[];
  };
  error?: string;
}

async function main(): Promise<void> {
  try {
    // 1. Read JSON input from stdin
    const input = JSON.parse(await readStdin()) as AnalyzeInput;

    // 2. Validate input
    if (!input.filePath || !input.content) {
      throw new Error('Missing required fields');
    }

    // 3. Process
    const signals = detectSignals(input.content, input.threshold || 5);

    // 4. Output JSON to stdout
    const output: AnalyzeOutput = {
      success: true,
      data: {
        burstCount: signals.filter(s => s.type === 'burst').length,
        signals
      }
    };

    console.log(JSON.stringify(output));
    process.exit(0);
  } catch (error) {
    const output: AnalyzeOutput = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    console.log(JSON.stringify(output));
    process.exit(1);
  }
}

main();
```

**Usage from VS Code extension:**
```typescript
// apps/vscode/src/commands/analyzeFile.ts
import { execFile } from 'child_process';

export async function analyzeFile(filePath: string): Promise<AnalyzeOutput> {
  return new Promise((resolve, reject) => {
    const child = execFile('node', ['dist/scripts/analyze.js'], (error, stdout) => {
      if (error) return reject(error);

      const result = JSON.parse(stdout) as AnalyzeOutput;
      if (!result.success) return reject(new Error(result.error));

      resolve(result);
    });

    child.stdin?.write(JSON.stringify({ filePath }));
    child.stdin?.end();
  });
}
```

---

## Performance Budgets (NON-NEGOTIABLE)

These are hard constraints. Exceeding these budgets blocks releases.

| Operation | p95 Budget | Measurement | Notes |
|-----------|-----------|-------------|-------|
| Extension activation | <500ms | VS Code startup time | Includes all initialization |
| Save handler (no snapshot) | <50ms | On every file save | No background tasks yet |
| Save handler (with snapshot creation) | <100ms | File save + snapshot capture | Async deferred to after return |
| Signal computation | <50ms | detectBurst, etc. on 1MB file | Amortized across batches |
| Bundle size (VSIX) | <2MB | Compressed extension package | Includes all dependencies |
| Config parsing | <10ms | Loading `.snapbackrc` | Per workspace |

**Verification:**
```bash
# Measure extension activation
pnpm -F @snapback/vscode run measure:activation

# Measure bundle size
pnpm -F @snapback/vscode package --no-update-package-json
ls -lh snapback-*.vsix
```

---

## File Size Limits

If a file exceeds these limits, split into smaller modules. This ensures cognitive load stays manageable.

| Component | Limit | Action |
|-----------|-------|--------|
| Signal implementation | <100 LOC | Split algorithm into helper functions |
| Orchestrator/Manager | <150 LOC | Extract subsystems into modules |
| Validator (per type) | <100 LOC | Break into validation sub-steps |
| Command handler | <80 LOC | Extract business logic to utilities |

**Example Split (Bad → Good):**

❌ **Bad (150 LOC burst detector):**
```typescript
export function detectBurst(timestamps: number[]): BurstSignal[] {
  // 50 lines of preprocessing
  // 50 lines of clustering
  // 50 lines of filtering
}
```

✅ **Good (split across modules):**
```typescript
// signals/preprocessing.ts - <40 LOC
export function preprocessTimestamps(raw: number[]): number[] { }

// signals/clustering.ts - <50 LOC
export function clusterByGap(timestamps: number[], gap: number): Cluster[] { }

// signals/filtering.ts - <30 LOC
export function filterSmallClusters(clusters: Cluster[]): Cluster[] { }

// signals/detector.ts - <50 LOC
export function detectBurst(timestamps: number[]): BurstSignal[] {
  const preprocessed = preprocessTimestamps(timestamps);
  const clusters = clusterByGap(preprocessed, 100);
  const filtered = filterSmallClusters(clusters);
  return clusters.map(toSignal);
}
```

---

## Storage Architecture

**Location:** `~/.snapback/` or workspace-local (depends on scope)

```
blobs/
├── ab/cd/efg...hash       # Content-addressable (SHA256)
├── xy/za/bcd...hash
└── ...

snapshots/
├── snap_001.json          # Snapshot manifest (v2 schema)
├── snap_002.json
└── ...

sessions/
├── session_001.json       # Session grouping metadata
└── ...

audit.jsonl               # Append-only event log (one JSON per line)
```

**Schema Examples:**

```typescript
// Snapshot manifest (immutable after creation)
interface SnapshotManifest {
  id: string;
  version: 2;
  timestamp: number;
  files: {
    path: string;
    hash: string;  // Reference to blobs/*/...hash
    size: number;
    encoding: 'utf-8' | 'binary';
  }[];
  metadata: {
    trigger: 'save' | 'command' | 'before-ai';
    reason?: string;
    tags: string[];
  };
}

// Audit log (append-only, immutable)
type AuditEvent =
  | { type: 'snapshot.created'; snapshotId: string; timestamp: number }
  | { type: 'snapshot.restored'; snapshotId: string; timestamp: number }
  | { type: 'file.protected'; filePath: string; timestamp: number };
```

---

## Privacy Rules (CRITICAL for PostHog/Telemetry)

### What NEVER Goes to Telemetry

❌ **FORBIDDEN:**
- File paths (even normalized)
- File content (any part)
- Variable/function names
- Repository URLs
- Usernames/emails
- Source code snippets

### What CAN Go to Telemetry

✅ **ALLOWED:**
- File extensions (`.ts`, `.py`, etc.)
- File line counts (aggregate)
- Timing measurements (ms)
- Feature flags (on/off)
- Error type names (not messages containing PII)
- Event counts
- Session durations

**Required Implementation:**

```typescript
// packages/infrastructure/src/telemetry/scrubber.ts
export function scrubEventForTelemetry(event: RawEvent): ScrubbedEvent {
  return {
    eventType: event.eventType,  // ✅ OK
    timestamp: event.timestamp,   // ✅ OK
    fileExtension: event.filePath?.split('.').pop(), // ✅ OK (extension only)
    lineCount: countLines(event.content),  // ✅ OK (aggregate)
    durationMs: event.duration,   // ✅ OK (timing)
    // ❌ event.filePath - REMOVED
    // ❌ event.content - REMOVED
    // ❌ event.userId - REMOVED
  };
}
```

---

## Error Handling Pattern

All operations should return consistent error results:

```typescript
interface Result<T> {
  success: true;
  data: T;
} | {
  success: false;
  error: string;  // User-friendly message
}

// Implementation
export async function operation(): Promise<Result<Data>> {
  try {
    const result = await riskyOperation();
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

**When to throw vs return error:**
- **Throw:** Programming errors (null checks, invariant violations)
- **Return error:** Expected failures (file not found, validation failure, timeout)

---

## Testing Requirements

### TDD Methodology

**Required:** Write failing test BEFORE implementation

```bash
# 1. Write failing test
pnpm test -- --watch signals.test.ts

# 2. Implement feature (test should pass)
# 3. Refactor if needed (tests stay green)
```

**Exceptions:** Migrations, refactoring large components (coordinate with team)

### Coverage Standards

- **New code:** >80% coverage required
- **Modified code:** Coverage must not decrease
- **Utility functions:** 100% coverage expected
- **Integration tests:** Minimum one happy path + one error case

### Test Organization

**Option 1: Colocated (preferred for small modules)**
```
packages/engine/src/
├── signals/
│   ├── detector.ts
│   └── detector.test.ts
```

**Option 2: Separate directory (preferred for app-level tests)**
```
apps/vscode/src/
├── commands/
│   ├── analyze.ts
│   └── __tests__/
│       └── analyze.test.ts
```

### Global Mocks

VS Code is globally mocked. **Do NOT override the global mock in tests:**

```typescript
// ✅ CORRECT - Use global mock
import * as vscode from 'vscode';

vscode.window.showInformationMessage('test');  // Uses global mock

// ❌ WRONG - Don't override
vi.mock('vscode', () => ({
  window: { showInformationMessage: vi.fn() }
}));
```

---

## Feature Flags

New capabilities must be feature-flagged to enable gradual rollout:

```typescript
// Read from configuration
const useV2Engine = vscode.workspace
  .getConfiguration('snapback')
  .get<boolean>('useV2Engine', false);

if (useV2Engine) {
  // Use new code path
  const result = await engineV2.processSnapshot(snapshot);
} else {
  // Fall back to stable v1
  const result = await engineV1.processSnapshot(snapshot);
}
```

**Configuration in package.json contributes:**
```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "snapback.useV2Engine": {
          "type": "boolean",
          "default": false,
          "description": "Enable experimental V2 engine (requires restart)"
        }
      }
    }
  }
}
```

---

## Immutable Components (DO NOT MODIFY)

These are locked down to prevent cascading failures:

- ❌ `packages/engine/src/types.ts` - After finalized, breaking changes cascade
- ❌ Performance budget values - Represents hard constraints
- ❌ Snapshot manifest schema (v2) - Data format (backward compatibility)
- ❌ PostHog event names - Breaking change for analytics pipeline
- ❌ Storage blob format - Breaking change for existing backups

**If you need to change these:**
1. File RFC in `docs/decisions/`
2. Get approval from maintainers
3. Plan migration strategy (if data format)
4. Update in coordination with all dependent code

---

## Package Dependencies

**Allowed dependency graph:**

```
packages/engine/       → (none, standalone)
packages/sdk           → @snapback/engine
packages/contracts     → (types only)
apps/vscode            → @snapback/engine, @snapback/sdk
apps/mcp-server        → @snapback/engine
apps/api               → @snapback/engine, @snapback/sdk
```

**Verification:**
```bash
# Check for circular dependencies
pnpm turbo run build --graph=dependency-graph.json
```

**Forbidden patterns:**
- ❌ Apps importing from other apps
- ❌ Packages importing from apps
- ❌ packages/engine importing from any package
- ❌ Circular dependency cycles

---

## References & Related Rules

- **Code Consolidation:** See `always-code-consolidation.md`
- **TypeScript Patterns:** See `always-typescript-patterns.md`
- **Monorepo Imports:** See `always-monorepo-imports.md`
- **Result Type Pattern:** See `always-result-type-pattern.md`
- **Middleware Architecture:** See `always-middleware-architecture.md`
- **Development Practices:** See project memory for TDD, async batching, atomic writes
- **Cross-Cutting Concerns:** See project memory for debug logging, error handling, consolidation

---

**Enforcement:** Code review blocks PRs that violate these rules.
**Last Reviewed:** 2025-12-15
