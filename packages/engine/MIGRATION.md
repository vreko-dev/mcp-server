# SnapBack Simplified Architecture Migration

## Overview

This directory contains the new simplified architecture for SnapBack. The goal is to reduce
~15,000 LOC across 12 packages down to ~1,400 LOC in ~15 files.

## Architecture Principles

1. **Scripts as Units** - Each script does ONE thing, is <100 LOC, emits JSON
2. **Native Orchestration** - TypeScript runtime coordinates scripts, aggregates results
3. **Thin Transports** - MCP, CLI, HTTP are just protocol adapters (~100-200 LOC each)
4. **Session Coaching** - Continuous health monitoring, not just end-of-line validation

## Directory Structure

```
snapback/
├── runtime/                 # Core TypeScript runtime (~400 LOC total)
│   ├── orchestrator.ts      # Script coordination, result aggregation
│   ├── monitor.ts           # Session coach, continuous health tracking
│   ├── storage.ts           # Simplified blob storage
│   └── events.ts            # 15-event schema, single emitter
│
├── scripts/                 # Executable scripts (~700 LOC total)
│   ├── signals/             # Emit metrics for risk scoring
│   │   ├── risk-score.ts    # Main risk calculation (0-10)
│   │   ├── complexity.ts    # AST complexity analysis
│   │   ├── consumers.ts     # Import fan-in counting
│   │   ├── cycles.ts        # Circular dependency detection
│   │   ├── velocity.ts      # Change velocity tracking
│   │   └── threats.ts       # Security threat patterns
│   │
│   ├── validators/          # Pass/fail validation gates
│   │   ├── types.ts         # TypeScript type checking
│   │   ├── cycles.ts        # Circular dependency gate
│   │   ├── security.ts      # Security pattern validation
│   │   └── patterns.ts      # Code pattern linting
│   │
│   ├── actions/             # Side-effect operations
│   │   ├── snapshot.ts      # Create snapshot
│   │   ├── restore.ts       # Restore files
│   │   └── notify.ts        # Send notifications
│   │
│   └── monitors/            # Continuous watchers
│       ├── watcher.ts       # File system watcher
│       └── health.ts        # Health check runner
│
├── transports/              # Protocol adapters (~400 LOC total)
│   ├── mcp.ts               # MCP server
│   ├── cli.ts               # CLI commands
│   └── http.ts              # API endpoints
│
├── index.ts                 # Single entry point
├── types.ts                 # Shared type definitions
├── config.ts                # Configuration schema
└── MIGRATION.md             # This file
```

## Migration Schedule

### Week 1: Foundation
- [x] Create directory structure
- [ ] Implement `runtime/orchestrator.ts`
- [ ] Implement `runtime/events.ts`
- [ ] Extract `scripts/signals/risk-score.ts` from `packages/core/src/risk-analyzer.ts`
- [ ] Wire to existing MCP for side-by-side testing

### Week 2: Complete Signals
- [ ] Implement `scripts/signals/complexity.ts`
- [ ] Implement `scripts/signals/consumers.ts`
- [ ] Implement `scripts/signals/cycles.ts`
- [ ] Implement `scripts/signals/velocity.ts`
- [ ] Implement `scripts/signals/threats.ts`

### Week 3: Validators
- [ ] Implement `scripts/validators/types.ts`
- [ ] Implement `scripts/validators/cycles.ts`
- [ ] Implement `scripts/validators/security.ts`
- [ ] Implement `scripts/validators/patterns.ts`

### Week 4: Storage + Actions
- [ ] Implement `runtime/storage.ts`
- [ ] Implement `scripts/actions/snapshot.ts`
- [ ] Implement `scripts/actions/restore.ts`
- [ ] Implement `scripts/actions/notify.ts`

### Week 5: Transports
- [ ] Implement `transports/mcp.ts`
- [ ] Implement `transports/cli.ts`
- [ ] Implement `transports/http.ts`

### Week 6: Integration + Cleanup
- [ ] Update VS Code extension imports
- [ ] Delete old packages
- [ ] Update tests
- [ ] Documentation

## Key Source Files for Extraction

When implementing scripts, reference these source files:

| New Script | Source File | Key Functions |
|------------|-------------|---------------|
| `signals/risk-score.ts` | `packages/core/src/risk-analyzer.ts` | `analyzeFileChanges()`, scoring formula at line 151 |
| `signals/complexity.ts` | `packages/core/src/risk-analyzer.ts` | `analyzeFileComplexity()` |
| `signals/threats.ts` | `packages/core/src/threat-detection.ts` | `detectThreats()` |
| `signals/consumers.ts` | `apps/vscode/src/engine/graph/ImportAnalyzer.ts` | Consumer counting logic |
| `validators/cycles.ts` | `apps/vscode/spike/assumptions/madge-basic.ts` | madge integration |
| `actions/snapshot.ts` | `packages/sdk/src/storage/StorageBroker.ts` | `createSnapshot()` |
| `actions/restore.ts` | `packages/sdk/src/storage/StorageBroker.ts` | `restoreFromSnapshot()` |

## Script Contract

All scripts MUST:

1. Accept input via command line args or stdin
2. Output JSON to stdout
3. Exit 0 on success, non-zero on failure
4. Complete within timeout (default 30s)

### Signal Script Output Format

```typescript
interface SignalOutput {
  signal: string;      // Signal name (e.g., "risk-score")
  value: number;       // Numeric value
  metadata?: Record<string, unknown>;  // Optional extra data
}
```

### Validator Script Output Format

```typescript
interface ValidatorOutput {
  validator: string;   // Validator name (e.g., "types")
  status: 'pass' | 'fail';
  errors?: Array<{
    message: string;
    file?: string;
    line?: number;
  }>;
  suggestion?: string; // How to fix
}
```

### Action Script Output Format

```typescript
interface ActionOutput {
  action: string;      // Action name (e.g., "snapshot")
  success: boolean;
  result?: unknown;    // Action-specific result
  error?: string;      // Error message if failed
}
```

## Testing Strategy

Each script can be tested in isolation:

```bash
# Test a signal script
echo '{"files": ["src/index.ts"]}' | npx tsx scripts/signals/risk-score.ts
# Output: {"signal": "risk-score", "value": 3.5, "metadata": {...}}

# Test a validator script
npx tsx scripts/validators/types.ts --files src/index.ts
# Output: {"validator": "types", "status": "pass"}

# Test an action script
npx tsx scripts/actions/snapshot.ts --files src/index.ts
# Output: {"action": "snapshot", "success": true, "result": {"id": "snap_123"}}
```

## Side-by-Side Testing

During migration, run new and old implementations in parallel:

```typescript
// In MCP server
const [oldResult, newResult] = await Promise.all([
  legacyRiskAnalyzer.analyze(files),
  orchestrator.runSignal('risk-score', files),
]);

// Compare results
if (Math.abs(oldResult.score - newResult.value) > 0.5) {
  console.warn('Risk score divergence detected');
}
```

## Exit Criteria

Migration is complete when:

1. All scripts pass their unit tests
2. Side-by-side comparison shows <5% divergence
3. All transports work with new architecture
4. Old packages can be deleted without breaking builds
5. Bundle size reduced by >50%
