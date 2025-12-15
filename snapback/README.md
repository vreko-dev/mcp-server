# SnapBack Simplified Architecture

This directory contains the new script-driven architecture that replaces the 12-package monorepo structure.

## Architecture Overview

```
snapback/
├── runtime/           # Core orchestration (~400 LOC total)
│   ├── orchestrator.ts   # Script coordination, result aggregation
│   ├── monitor.ts        # Session coach, continuous health tracking
│   ├── storage.ts        # Blob storage, snapshots, manifests
│   └── events.ts         # Single event emitter, ~15 events
│
├── scripts/           # Self-contained scripts (<100 LOC each)
│   ├── signals/          # Emit data for risk scoring
│   ├── validators/       # Gate 2 validation checks
│   ├── actions/          # Side effects (snapshot, restore, notify)
│   └── monitors/         # Continuous watchers
│
├── transports/        # Thin protocol adapters (~400 LOC total)
│   ├── mcp.ts            # MCP server
│   ├── cli.ts            # CLI commands
│   └── http.ts           # API endpoints
│
└── index.ts           # Single entry point
```

## Design Principles

1. **Each script is <100 LOC** - Does ONE thing, emits structured JSON
2. **Scripts are stateless** - All state lives in runtime/
3. **Transports are thin** - Just protocol translation, no business logic
4. **Runtime orchestrates** - Calls scripts, aggregates results, manages state

## Migration Status

- [ ] Week 1: Foundation (orchestrator + events + first signal)
- [ ] Week 2: All signals complete
- [ ] Week 3: All validators complete
- [ ] Week 4: Storage + actions
- [ ] Week 5: Transports (MCP, CLI, HTTP)
- [ ] Week 6: Integration + cleanup

## Running Scripts Directly

Each script can be run standalone for testing:

```bash
# Run a signal
npx tsx snapback/scripts/signals/risk-score.ts --files src/auth.ts,src/user.ts

# Run a validator
npx tsx snapback/scripts/validators/cycles.ts --files src/auth.ts

# Output is always JSON
{ "status": "pass" | "fail", "score"?: number, "reason"?: string, ... }
```

## Source Files for Extraction

| New File | Extract From | Key Functions |
|----------|--------------|---------------|
| `scripts/signals/risk-score.ts` | `packages/core/src/risk-analyzer.ts` | `analyzeFileChanges()` lines 68-161 |
| `scripts/signals/complexity.ts` | `packages/core/src/guardian.ts` | AST analysis |
| `scripts/validators/cycles.ts` | `apps/vscode/spike/assumptions/madge-*.ts` | madge integration |
| `runtime/storage.ts` | `packages/sdk/src/storage/StorageBroker.ts` | Simplified CRUD |
| `runtime/events.ts` | `packages/contracts/src/events/core.ts` | Types only |

## Testing

```bash
# Run all new architecture tests
pnpm test snapback/

# Run specific script test
pnpm test snapback/scripts/signals/risk-score.test.ts
```
