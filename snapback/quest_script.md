# Quest: SnapBack Engine Migration & Integration

**Goal:**
Restructure the `snapback/` directory to follow Turborepo conventions as `packages/engine/`, complete missing core capabilities (burst detection, AI detection, decision engine), then integrate it into the VS Code extension with a bridge pattern that allows both systems to coexist.

---

## Context

### Current Problem
```
/                              # ❌ WRONG - violates Turborepo conventions
├── snapback/                  # Orphan directory at root
│   ├── runtime/
│   ├── scripts/
│   └── transports/
```

### Target Structure
```
/                              # ✅ CORRECT - follows Turborepo conventions
├── apps/
│   ├── vscode/               # Consumes @snapback/engine
│   ├── mcp-server/           # Consumes @snapback/engine
│   └── cli/                  # Consumes @snapback/engine
├── packages/
│   ├── engine/               # NEW: Core engine (moved from snapback/)
│   │   ├── package.json      # @snapback/engine
│   │   ├── src/
│   │   │   ├── signals/      # Risk, burst, AI detection, etc.
│   │   │   ├── runtime/      # Orchestrator, storage, decision
│   │   │   └── validators/   # Type checking, cycle detection
│   │   └── test/
│   ├── core/                 # Existing (will deprecate gradually)
│   ├── sdk/                  # Existing
│   └── ...
```

### Architecture Layers (Separation of Concerns)

```
┌─────────────────────────────────────────────────────────────────┐
│                    apps/vscode/ (VS Code Extension)             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  UI: Trees, CodeLens, StatusBar, Notifications          │   │
│  │  Onboarding: Progressive disclosure, tutorials          │   │
│  │  Telemetry: PostHog integration                         │   │
│  │  VS Code APIs: workspace, config, commands              │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │ calls                             │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │           Bridge Layer (NEW)                             │   │
│  │  StorageBridge, SignalBridge, DecisionBridge            │   │
│  └──────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │ imports @snapback/engine
┌─────────────────────────────▼───────────────────────────────────┐
│                  packages/engine/ (Core - Transport Agnostic)    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │   Signals    │ │   Runtime    │ │     Validators       │    │
│  │  • risk      │ │  • storage   │ │  • types             │    │
│  │  • burst     │ │  • decision  │ │  • cycles            │    │
│  │  • ai-detect │ │  • session   │ │  • security          │    │
│  │  • cycles    │ │  • events    │ └──────────────────────┘    │
│  │  • complexity│ │  • rate-limit│                              │
│  └──────────────┘ └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

**Key Principle:** `packages/engine/` contains ZERO VS Code APIs. It's pure TypeScript that can run in Node, Bun, or any JS runtime.

### Technical Constraints
| Constraint | Budget | Notes |
|------------|--------|-------|
| Extension activation | <500ms p95 | No blocking imports from engine |
| Save handler | <50ms (no snap), <100ms (with snap) | Critical path |
| Bundle size | <2MB VSIX | Tree-shake engine imports |
| Signal computation | <50ms | For files <1000 LOC |

---

## Acceptance Criteria

### Phase 0: Turborepo Restructure (Foundation)
- [ ] Move `snapback/` → `packages/engine/`
- [ ] Rename package to `@snapback/engine` in `package.json`
- [ ] Update `pnpm-workspace.yaml` (remove `snapback/` if present)
- [ ] Restructure to `src/` directory convention
- [ ] Update all internal imports to use `src/` paths
- [ ] Add proper `exports` field to `package.json`
- [ ] Verify `pnpm install` succeeds
- [ ] Verify `pnpm build --filter @snapback/engine` succeeds
- [ ] Verify `pnpm test --filter @snapback/engine` passes

### Phase 1: Complete Core Capabilities (Engine)
- [ ] Add `src/signals/burst.ts` - Velocity-based rapid change detection
- [ ] Add `src/signals/ai-detection.ts` - Pattern matching for 9+ AI tools
- [ ] Add `src/runtime/decision.ts` - Signal aggregation → action
- [ ] Add `src/runtime/protection.ts` - Watch/Warn/Block level logic
- [ ] Add `src/runtime/rate-limiter.ts` - Snapshot budget management
- [ ] Add `src/runtime/session.ts` - Session state tracking (not UI)
- [ ] Complete `src/runtime/storage.ts` - PRE/POST checkpoint flow
- [ ] Update `src/index.ts` with all exports
- [ ] All new files have corresponding test files
- [ ] All tests pass

### Phase 2: Storage Bridge (Extension)
- [ ] Create `apps/vscode/src/bridges/StorageBridge.ts`
- [ ] Bridge implements existing `IStorageManager` interface
- [ ] Routes to `@snapback/engine` storage when flag enabled
- [ ] Falls back to v1 storage when flag disabled
- [ ] Feature flag: `snapback.useV2Engine` (default: false)
- [ ] Existing snapshots remain readable

### Phase 3: Signal Bridge (Extension)
- [ ] Create `apps/vscode/src/bridges/SignalBridge.ts`
- [ ] Wraps engine signals for VS Code context
- [ ] Integrates with existing `AutoDecisionEngine`
- [ ] Performance: signal computation <50ms

### Phase 4: Event Bridge (Extension)
- [ ] Create `apps/vscode/src/bridges/EventBridge.ts`
- [ ] Maps engine events to PostHog telemetry
- [ ] No duplicate events
- [ ] Privacy: PII scrubbing preserved

### Phase 5: Validation
- [ ] All existing tests pass
- [ ] New integration tests pass
- [ ] Performance benchmarks within budget
- [ ] Bundle size <2MB
- [ ] Manual smoke test of full workflow

---

## Tests

### Phase 0 Tests (Structure)
```bash
# Verify package exists and builds
pnpm build --filter @snapback/engine

# Verify tests run
pnpm test --filter @snapback/engine

# Verify can be imported
node -e "require('@snapback/engine')"
```

### Phase 1 Tests (Core)
```typescript
// packages/engine/test/signals/burst.test.ts
describe('BurstDetector', () => {
  it('detects rapid sequential changes', () => {
    const detector = new BurstDetector({ windowMs: 1000, threshold: 5 });
    for (let i = 0; i < 6; i++) {
      detector.recordChange({ path: 'test.ts', timestamp: Date.now() });
    }
    expect(detector.isInBurst()).toBe(true);
  });

  it('resets after window expires', async () => {
    const detector = new BurstDetector({ windowMs: 100, threshold: 5 });
    for (let i = 0; i < 6; i++) {
      detector.recordChange({ path: 'test.ts', timestamp: Date.now() });
    }
    await sleep(150);
    expect(detector.isInBurst()).toBe(false);
  });
});

// packages/engine/test/signals/ai-detection.test.ts
describe('AIDetector', () => {
  it('detects Copilot patterns', () => {
    const result = detectAIPatterns({
      content: '// Generated by GitHub Copilot',
      velocity: 500, // chars per second
    });
    expect(result.detected).toBe(true);
    expect(result.tool).toBe('copilot');
  });

  it('detects paste-like velocity', () => {
    const result = detectAIPatterns({
      content: 'function foo() { return bar; }',
      velocity: 2000, // way too fast for typing
    });
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});

// packages/engine/test/runtime/decision.test.ts
describe('DecisionEngine', () => {
  it('aggregates signals into decision', () => {
    const decision = evaluate({
      signals: {
        risk: { score: 0.8, level: 'high' },
        burst: { active: true, count: 7 },
        ai: { detected: true, tool: 'cursor', confidence: 0.9 },
      },
      protectionLevel: 'warn',
    });
    expect(decision.action).toBe('snapshot');
    expect(decision.notify).toBe(true);
  });
});
```

### Phase 2-4 Tests (Integration)
```typescript
// apps/vscode/test/bridges/StorageBridge.test.ts
describe('StorageBridge', () => {
  it('uses v1 when flag disabled', async () => {
    mockConfig.get.mockReturnValue(false);
    const bridge = new StorageBridge(mockContext);
    await bridge.createSnapshot(files, { name: 'test' });
    expect(v1Storage.createSnapshot).toHaveBeenCalled();
    expect(v2Storage.createSnapshot).not.toHaveBeenCalled();
  });

  it('uses engine when flag enabled', async () => {
    mockConfig.get.mockReturnValue(true);
    const bridge = new StorageBridge(mockContext);
    await bridge.createSnapshot(files, { name: 'test' });
    expect(v2Storage.createSnapshot).toHaveBeenCalled();
  });

  it('reads v1 snapshots in v2 mode', async () => {
    // Create with v1
    await v1Storage.createSnapshot(files, { name: 'legacy' });
    // Read with bridge in v2 mode
    mockConfig.get.mockReturnValue(true);
    const bridge = new StorageBridge(mockContext);
    const snapshot = await bridge.getSnapshot('legacy-id');
    expect(snapshot).toBeDefined();
  });
});
```

---

## Validation

### After Phase 0
```bash
# Structure check
ls packages/engine/src/
# Should show: signals/ runtime/ validators/ types.ts index.ts

# Build check
pnpm build --filter @snapback/engine
# Should succeed with no errors

# Import check
pnpm --filter @snapback/vscode exec -- node -e "require('@snapback/engine')"
# Should not throw
```

### After Phase 1
```bash
# All engine tests pass
pnpm test --filter @snapback/engine
# Expected: All tests pass

# Type check
pnpm typecheck --filter @snapback/engine
# Expected: No errors
```

### After Phase 5
```bash
# Full test suite
pnpm test

# Performance benchmarks
pnpm --filter @snapback/vscode test:perf
# Expected output:
# ✓ Activation: <500ms
# ✓ Save handler: <100ms
# ✓ Signal computation: <50ms

# Bundle size
pnpm --filter @snapback/vscode build
node apps/vscode/scripts/check-bundle-size.js
# Expected: <2MB
```

---

## Guardrails

### DO NOT
- Put VS Code APIs in `packages/engine/` (no `import * as vscode`)
- Modify existing snapshot manifest schema
- Break backward compatibility with existing snapshots
- Exceed performance budgets
- Skip the feature flag (v2 must be opt-in)

### PRESERVE
- All existing public APIs in `apps/vscode/src/storage/`
- PostHog event names and properties
- Privacy: PII scrubbing in telemetry
- Test coverage (don't delete tests)

### FOLLOW
- Turborepo conventions: apps consume packages
- Script pattern in engine: stdin JSON → stdout JSON
- File size limits: <100 LOC per signal, <150 LOC orchestrator
- TDD: Write failing tests first

---

## File Operations

### Phase 0: Move & Restructure

```bash
# 1. Create new package structure
mkdir -p packages/engine/src/{signals,runtime,validators}
mkdir -p packages/engine/test

# 2. Move files (adjust paths as needed)
mv snapback/types.ts packages/engine/src/
mv snapback/index.ts packages/engine/src/
mv snapback/runtime/* packages/engine/src/runtime/
mv snapback/scripts/signals/* packages/engine/src/signals/
mv snapback/scripts/validators/* packages/engine/src/validators/
mv snapback/test/* packages/engine/test/
mv snapback/AGENT.md packages/engine/
mv snapback/MIGRATION.md packages/engine/

# 3. Remove old directory
rm -rf snapback/

# 4. Update pnpm-workspace.yaml if needed
```

### Phase 0: package.json
```json
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
    }
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@snapback/config": "workspace:*",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

### Phase 0: tsconfig.json
```json
{
  "extends": "@snapback/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

---

## Implementation Hints

### Burst Detector Pattern
```typescript
// packages/engine/src/signals/burst.ts
export interface BurstConfig {
  windowMs: number;      // Time window (default: 2000)
  threshold: number;     // Changes to trigger burst (default: 5)
  velocityThreshold: number; // Chars/sec for paste detection (default: 500)
}

export interface BurstState {
  active: boolean;
  changeCount: number;
  windowStart: number;
  velocity: number;
}

export function detectBurst(
  changes: ChangeEvent[],
  config: BurstConfig
): BurstState {
  // Filter to window
  const now = Date.now();
  const recent = changes.filter(c => now - c.timestamp < config.windowMs);

  // Calculate velocity
  const totalChars = recent.reduce((sum, c) => sum + c.charsChanged, 0);
  const elapsed = recent.length > 1
    ? recent[recent.length - 1].timestamp - recent[0].timestamp
    : 1;
  const velocity = totalChars / (elapsed / 1000);

  return {
    active: recent.length >= config.threshold || velocity > config.velocityThreshold,
    changeCount: recent.length,
    windowStart: recent[0]?.timestamp ?? now,
    velocity,
  };
}
```

### AI Detection Pattern
```typescript
// packages/engine/src/signals/ai-detection.ts
const AI_PATTERNS = [
  { tool: 'copilot', patterns: [/Generated by GitHub Copilot/i, /gh copilot/i] },
  { tool: 'cursor', patterns: [/cursor/i, /\[@cursor\]/i] },
  { tool: 'claude', patterns: [/claude/i, /anthropic/i] },
  { tool: 'chatgpt', patterns: [/chatgpt/i, /openai/i] },
  // ... more patterns
];

const VELOCITY_THRESHOLDS = {
  typing: 150,      // Normal typing ~150 chars/min = 2.5 chars/sec
  fastTyping: 400,  // Fast typing
  paste: 1000,      // Definitely paste/AI
};

export function detectAI(input: AIDetectionInput): AIDetectionResult {
  // Check content patterns
  for (const { tool, patterns } of AI_PATTERNS) {
    if (patterns.some(p => p.test(input.content))) {
      return { detected: true, tool, confidence: 0.95, method: 'pattern' };
    }
  }

  // Check velocity
  if (input.velocity > VELOCITY_THRESHOLDS.paste) {
    return { detected: true, tool: 'unknown', confidence: 0.8, method: 'velocity' };
  }

  return { detected: false, confidence: 0 };
}
```

### Decision Engine Pattern
```typescript
// packages/engine/src/runtime/decision.ts
export type ProtectionLevel = 'watch' | 'warn' | 'block';
export type Action = 'allow' | 'snapshot' | 'warn' | 'block';

export interface DecisionInput {
  signals: {
    risk?: RiskSignal;
    burst?: BurstState;
    ai?: AIDetectionResult;
    cycles?: CycleResult;
  };
  protectionLevel: ProtectionLevel;
  rateLimitRemaining: number;
}

export interface Decision {
  action: Action;
  snapshot: boolean;
  notify: boolean;
  reason: string;
  signals: string[]; // Which signals contributed
}

export function evaluate(input: DecisionInput): Decision {
  const { signals, protectionLevel, rateLimitRemaining } = input;
  const activeSignals: string[] = [];

  // Collect active signals
  if (signals.risk?.level === 'high') activeSignals.push('high-risk');
  if (signals.burst?.active) activeSignals.push('burst');
  if (signals.ai?.detected) activeSignals.push('ai-detected');
  if (signals.cycles?.hasCycles) activeSignals.push('cycles');

  // No signals = allow
  if (activeSignals.length === 0) {
    return { action: 'allow', snapshot: false, notify: false, reason: 'clean', signals: [] };
  }

  // Rate limit exhausted = warn only
  if (rateLimitRemaining <= 0) {
    return { action: 'warn', snapshot: false, notify: true, reason: 'rate-limited', signals: activeSignals };
  }

  // Apply protection level
  switch (protectionLevel) {
    case 'watch':
      return { action: 'snapshot', snapshot: true, notify: false, reason: 'watching', signals: activeSignals };
    case 'warn':
      return { action: 'snapshot', snapshot: true, notify: true, reason: 'warning', signals: activeSignals };
    case 'block':
      return { action: 'block', snapshot: true, notify: true, reason: 'blocked', signals: activeSignals };
  }
}
```

---

## Source References

| New File | Reference Source |
|----------|------------------|
| `signals/burst.ts` | `apps/vscode/src/engine/BurstDetector.ts` |
| `signals/ai-detection.ts` | `apps/vscode/src/engine/AIPresenceDetector.ts` |
| `runtime/decision.ts` | `apps/vscode/src/domain/engine.ts` (AutoDecisionEngine) |
| `runtime/protection.ts` | `apps/vscode/src/protection/ProtectedFileRegistry.ts` |
| `runtime/rate-limiter.ts` | `apps/vscode/src/engine/RateLimiter.ts` |
| `runtime/session.ts` | `apps/vscode/src/engine/SessionCoordinator.ts` |
| `runtime/storage.ts` | `apps/vscode/src/storage/StorageManager.ts` |

---

## Definition of Done

1. **Turborepo compliant** - `packages/engine/` follows conventions
2. **All core capabilities present** - Signals, runtime, validators complete
3. **Tests pass** - `pnpm test` all green
4. **Types clean** - `pnpm typecheck` no errors
5. **Bundle size** - Extension still <2MB
6. **Performance** - All budgets met
7. **Backward compatible** - Existing features work unchanged
8. **Feature flagged** - V2 engine opt-in via config

---

## Estimated Timeline

| Phase | Effort | Description |
|-------|--------|-------------|
| Phase 0 | S (2-3h) | Move files, setup package |
| Phase 1 | L (8-10h) | Complete core capabilities |
| Phase 2 | M (4-5h) | Storage bridge |
| Phase 3 | M (3-4h) | Signal bridge |
| Phase 4 | S (2-3h) | Event bridge |
| Phase 5 | M (3-4h) | Validation & fixes |

**Total: ~22-29 hours**

---

## Agent Notes

1. **Start with Phase 0** - Nothing else works until structure is correct
2. **Read source references** - Extract logic, don't reinvent
3. **No VS Code imports in engine** - Zero `import * as vscode`
4. **Test each phase** before moving on
5. **Keep bundle size in check** - Use subpath exports for tree-shaking
