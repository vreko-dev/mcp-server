# LLM Agent Instructions for SnapBack Migration

This document provides instructions for LLM coding agents (Claude, Cursor, etc.)
working on the SnapBack simplified architecture migration.

## Context

You are helping migrate SnapBack from a 12-package monorepo (~15,000 LOC) to a
simplified script-driven architecture (~1,400 LOC). The scaffolding is in place.
Your job is to fill in the implementations.

## Directory Layout

```
snapback/
├── runtime/           # Core TypeScript (fill in implementations)
│   ├── orchestrator.ts   ✓ SCAFFOLDED - needs runScript() tested
│   ├── events.ts         ✓ SCAFFOLDED - needs telemetry integration
│   ├── monitor.ts        ✗ TODO - session coaching
│   └── storage.ts        ✗ TODO - blob storage
│
├── scripts/           # Executable scripts (fill in implementations)
│   ├── signals/
│   │   ├── risk-score.ts    ✓ SCAFFOLDED
│   │   ├── complexity.ts    ✓ SCAFFOLDED
│   │   ├── cycles.ts        ✓ SCAFFOLDED
│   │   ├── consumers.ts     ✗ TODO
│   │   ├── velocity.ts      ✗ TODO
│   │   └── threats.ts       ✗ TODO
│   │
│   ├── validators/
│   │   ├── types.ts         ✓ SCAFFOLDED
│   │   ├── cycles.ts        ✓ SCAFFOLDED
│   │   ├── security.ts      ✗ TODO
│   │   └── patterns.ts      ✗ TODO
│   │
│   ├── actions/
│   │   ├── snapshot.ts      ✗ TODO
│   │   ├── restore.ts       ✗ TODO
│   │   └── notify.ts        ✗ TODO
│   │
│   └── monitors/
│       ├── watcher.ts       ✗ TODO
│       └── health.ts        ✗ TODO
│
├── transports/
│   ├── mcp.ts           ✓ SCAFFOLDED
│   ├── cli.ts           ✗ TODO
│   └── http.ts          ✗ TODO
│
├── test/
│   └── smoke.test.ts    ✓ SCAFFOLDED
│
├── types.ts             ✓ COMPLETE
├── index.ts             ✓ COMPLETE
├── package.json         ✓ COMPLETE
├── tsconfig.json        ✓ COMPLETE
└── vitest.config.ts     ✓ COMPLETE
```

## Implementation Rules

### 1. Script Pattern

All scripts MUST follow this pattern:

```typescript
#!/usr/bin/env npx tsx
/**
 * [Description]
 *
 * SOURCE REFERENCE: [path to original implementation]
 *
 * INPUT: JSON via stdin
 * OUTPUT: JSON to stdout
 */

import type { ... } from '../../types';

// Read input
async function readInput(): Promise<Input> { ... }

// Main logic
function doThing(input: Input): Output { ... }

// Main
async function main() {
  const input = await readInput();
  const output = doThing(input);
  console.log(JSON.stringify(output));
  process.exit(0);
}

main();
```

### 2. Size Limits

- Each script: **< 100 LOC**
- runtime/orchestrator.ts: **< 150 LOC**
- runtime/events.ts: **< 50 LOC**
- runtime/storage.ts: **< 100 LOC**
- transports/*: **< 200 LOC each**

If you exceed these limits, **split into smaller files**.

### 3. Source References

When implementing, ALWAYS reference the original source:

| New File | Reference Source |
|----------|------------------|
| `signals/risk-score.ts` | `packages/core/src/risk-analyzer.ts` |
| `signals/complexity.ts` | `packages/core/src/risk-analyzer.ts` (analyzeFileComplexity) |
| `signals/threats.ts` | `packages/core/src/threat-detection.ts` |
| `signals/consumers.ts` | `apps/vscode/src/engine/graph/ImportAnalyzer.ts` |
| `validators/security.ts` | `packages/core/src/guardian.ts` |
| `actions/snapshot.ts` | `packages/sdk/src/storage/StorageBroker.ts` |
| `actions/restore.ts` | `packages/sdk/src/storage/StorageBroker.ts` |

### 4. Testing

Every script should be testable in isolation:

```bash
# Test a signal
echo '{"files":[{"path":"test.ts","content":"const x=1","lineCount":1}]}' | npx tsx scripts/signals/risk-score.ts

# Test a validator
echo '{"files":[],"workspace":"."}' | npx tsx scripts/validators/types.ts
```

### 5. External Tools

These tools are available and should be used:

| Tool | Purpose | Command |
|------|---------|---------|
| madge | Circular dependencies | `npx madge --circular --json <path>` |
| tsc | Type checking | `npx tsc --noEmit` |
| biome | Linting | `npx biome check` |
| vitest | Testing | `npx vitest run --changed` |

### 6. Error Handling

Scripts should ALWAYS:
1. Output valid JSON even on error
2. Exit 0 on success, non-zero on failure
3. Include error details in output

```typescript
try {
  // ... do work
  console.log(JSON.stringify({ status: 'pass', ... }));
  process.exit(0);
} catch (error) {
  console.log(JSON.stringify({
    status: 'fail',
    error: error.message,
  }));
  process.exit(1);
}
```

## Priority Order

Implement in this order:

### Week 1 (Foundation)
1. Test `runtime/orchestrator.ts` with existing scripts
2. Implement `runtime/monitor.ts` (session coaching)
3. Add tests for all scaffolded files

### Week 2 (Signals)
1. `signals/consumers.ts` - Import fan-in counting
2. `signals/velocity.ts` - Change velocity tracking
3. `signals/threats.ts` - Security threat patterns

### Week 3 (Validators)
1. `validators/security.ts` - From guardian.ts
2. `validators/patterns.ts` - Biome integration

### Week 4 (Storage + Actions)
1. `runtime/storage.ts` - From StorageBroker.ts
2. `scripts/actions/snapshot.ts`
3. `scripts/actions/restore.ts`
4. `scripts/actions/notify.ts`

### Week 5 (Transports)
1. `transports/cli.ts`
2. `transports/http.ts`

## Validation Checklist

Before marking any file complete:

- [ ] LOC under limit
- [ ] Types imported from `../../types.ts`
- [ ] Input parsed via stdin
- [ ] Output is valid JSON to stdout
- [ ] Exit codes are correct (0 success, 1+ failure)
- [ ] Source reference documented
- [ ] Test written and passing
- [ ] Works in isolation (`echo '{}' | npx tsx <script>`)

## Common Mistakes to Avoid

1. **Don't import from old packages** - Use only `../../types` or stdlib
2. **Don't use console.log for non-JSON** - Use console.error for debug output
3. **Don't exceed LOC limits** - Split if needed
4. **Don't forget error handling** - Always wrap in try/catch
5. **Don't use synchronous I/O** - Use async/await
6. **Don't hardcode paths** - Use workspace from input or env

## Questions?

If you're unsure about an implementation:

1. Check the SOURCE REFERENCE file first
2. Look at similar scaffolded files for patterns
3. Ask the human for clarification
4. When in doubt, keep it simple

Remember: **Simple > Clever**. The goal is a maintainable codebase, not clever code.
