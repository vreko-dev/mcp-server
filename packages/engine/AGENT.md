# LLM Agent Instructions for SnapBack Migration

## 📊 MIGRATION STATUS (Updated: 2025-12-16)

**Overall Progress: 100% Complete (✅ All Phases Done)**

| Phase | Status | Completion |
|-------|--------|------------|
| Week 1: Foundation | ✅ COMPLETE | 100% (5/5 files) |
| Week 2: Signals | ✅ COMPLETE | 100% (10/10 files) |
| Week 3: Validators | ✅ COMPLETE | 100% (4/4 files) |
| Week 4: Actions | ✅ COMPLETE | 100% (3/3 files) |
| Week 5: Transports | ✅ COMPLETE | 100% (3/3 files) |
| V1→V2 Gap Fill | ✅ COMPLETE | 100% |

**Key Achievements:**
- ✅ 5,700+ LOC of clean, tested code
- ✅ 367 passing unit tests in engine (100% pass rate)
- ✅ 77%+ code coverage (transports: 93%, runtime: 89%, signals: 73%)
- ✅ All runtime, validators, actions, signals, and transports complete
- ✅ MCP Transport (205 LOC, 18 tests) - wired to apps/mcp-server
- ✅ HTTP Transport (193 LOC, 16 tests) - wired to apps/api
- ✅ CLI Transport (182 LOC, 13 tests) - wired to apps/cli
- ✅ V1 Guardian capabilities fully replaced by V2 engine

---

## 🔄 V1 → V2 MIGRATION SPECIFICATION

### Executive Summary

The V2 engine replaces the V1 Guardian/RiskAnalyzer with a unified, script-based architecture.
This eliminates parallel code paths and consolidates all analysis into `@snapback/engine`.

### Capability Matrix (V1 → V2)

| V1 Component | V2 Replacement | Status | Source File |
|--------------|----------------|--------|-------------|
| `Guardian.analyze()` | `orchestrator.analyze()` | ✅ Full | runtime/orchestrator.ts |
| `Guardian.analyzeDiffChanges()` | `MCPEngineAdapter.analyzeRisk()` | ✅ Full | transports/mcp.ts |
| `Guardian.countFunctions()` | `signals/complexity.ts` | ✅ Full | signals/complexity.ts |
| `Guardian.calculateComplexity()` | `signals/complexity.ts` | ✅ Full | signals/complexity.ts |
| `Guardian.calculateMaxNestingDepth()` | `signals/complexity.ts` | ✅ Full | signals/complexity.ts |
| `Guardian.findSecurityIssues()` | `signals/threats.ts` | ✅ Full | signals/threats.ts |
| `Guardian.findLargeFunctions()` | `signals/complexity.ts` | ✅ Full | signals/complexity.ts |
| `SecretDetectionPlugin` | `THREAT_PATTERNS.critical` | ✅ Full | signals/threats.ts |
| `MockReplacementPlugin` | `THREAT_PATTERNS.high/medium` | ✅ Full | signals/threats.ts |
| `PhantomDependencyPlugin` | `signals/phantom-deps.ts` | ✅ Full | signals/phantom-deps.ts |
| Plugin system | Signal/Validator scripts | ✅ **Better** | runtime/orchestrator.ts |

### V2 Additional Capabilities (Not in V1)

| New Signal | Purpose | LOC |
|------------|---------|-----|
| `velocity.ts` | Change velocity tracking | 86 |
| `cycles.ts` | Circular dependency detection | 176 |
| `consumers.ts` | Consumer impact analysis | 134 |
| `ai-detection.ts` | AI tool detection | 281 |
| `burst.ts` | Burst detection | 198 |
| `phantom-deps.ts` | Missing package detection | 263 |
| Session Health | Coaching/warnings over time | runtime/monitor.ts |
| Event Bus | Observability/telemetry | runtime/events.ts |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        V2 ENGINE                                │
│  @snapback/engine (packages/engine)                            │
├─────────────────────────────────────────────────────────────────┤
│  orchestrator.analyze(fileChanges)                              │
│       ↓                                                         │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │ SIGNAL SCRIPTS  │     │ VALIDATOR SCRIPTS│                  │
│  │ (run parallel)  │     │ (run parallel)   │                  │
│  ├─────────────────┤     ├──────────────────┤                  │
│  │ risk-score.ts   │     │ types.ts         │                  │
│  │ complexity.ts   │     │ cycles.ts        │                  │
│  │ cycles.ts       │     │ security.ts      │                  │
│  │ velocity.ts     │     │ patterns.ts      │                  │
│  │ consumers.ts    │     └──────────────────┘                  │
│  │ threats.ts      │                                            │
│  │ phantom-deps.ts │                                            │
│  └─────────────────┘                                            │
│       ↓                                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │ AGGREGATION + SESSION HEALTH            │                   │
│  │ → OrchestratorResult { outcome, riskScore, health }         │
│  └─────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
              │                    │                    │
              ↓                    ↓                    ↓
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ MCPEngineAdapter│ │HTTPEngineAdapter│ │CLIEngineAdapter │
    └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
             ↓                   ↓                   ↓
    apps/mcp-server      apps/api              apps/cli
```

### Transport Adapters

| Transport | Adapter Class | Wired To | Input Type | Output Type |
|-----------|---------------|----------|------------|-------------|
| MCP | `MCPEngineAdapter` | apps/mcp-server/src/index.ts | `MCPChange[]` | `MCPRiskResult` |
| HTTP | `HTTPEngineAdapter` | apps/api/modules/risk/... | `HTTPFileInput[]` | `HTTPRiskResponse` |
| CLI | `CLIEngineAdapter` | apps/cli/src/index.ts, apps/cli/src/check.ts | `CLIInput` | `CLIOutput` |

### Migration Steps for Removing V1

**Phase 1: Feature Flag (Opt-in V2)** - ✅ DONE
```typescript
// Settings: snapback.useV2Engine = true (opt-in)
if (config.useV2Engine) {
  const result = await engineAdapter.analyze(...);
} else {
  const result = await guardian.analyze(...);
}
```

**Phase 2: Replace V1 in CLI** - ✅ DONE (2025-12-16)
```typescript
// apps/cli/src/index.ts
// BEFORE (V1):
import { Guardian } from "@snapback/core";
const g = new Guardian();

// AFTER (V2):
import { CLIEngineAdapter } from "@snapback/engine/transports/cli";
const engineAdapter = new CLIEngineAdapter();
```

**Phase 3: Replace V1 in API** - ✅ DONE (2025-12-16)
```typescript
// apps/api/modules/risk/procedures/analyze-risk.ts already uses HTTPEngineAdapter
import { HTTPEngineAdapter } from "@snapback/engine/transports/http";
const engineAdapter = new HTTPEngineAdapter();
```

**Phase 4: Deprecate Guardian** - ✅ DONE (2025-12-16)
- Added `@deprecated` JSDoc annotations to Guardian class
- Added runtime deprecation warning on first Guardian instantiation
- Added `@deprecated` annotations to detection plugins
- Guardian and plugins will be removed in v1.0.0

### Deprecation Timeline

| Version | Action | Status |
|---------|--------|--------|
| v0.9.x | V2 engine feature-flagged (opt-in) | ✅ DONE |
| v0.10.x | V2 engine default, V1 deprecated warning | ✅ DONE |
| v1.0.0 | V1 Guardian removed, V2 only | PLANNED |

---

## Context

You are helping migrate SnapBack from a 12-package monorepo (~15,000 LOC) to a
simplified script-driven architecture (~1,400 LOC). The scaffolding is in place.
Your job is to fill in the implementations.

## Directory Layout

```
src/
├── runtime/              # Core TypeScript - WEEK 1 COMPLETE ✓
│   ├── orchestrator.ts   ✓ COMPLETE (467 LOC) - script runner & aggregator
│   ├── events.ts         ✓ COMPLETE (265 LOC) - 15-event schema
│   ├── monitor.ts        ✓ COMPLETE (392 LOC) - session coaching
│   ├── storage.ts        ✓ COMPLETE (353 LOC) - blob storage
│   ├── decision.ts       ✓ COMPLETE (237 LOC) - decision logic
│   └── index.ts          ✓ COMPLETE - exports
│
├── signals/              # Signal scripts - COMPLETE
│   ├── risk-score.ts     ✓ COMPLETE (256 LOC) - main risk calculation
│   ├── complexity.ts     ✓ COMPLETE (194 LOC) - AST complexity
│   ├── cycles.ts         ✓ COMPLETE (176 LOC) - circular deps via madge
│   ├── consumers.ts      ✓ COMPLETE (134 LOC) - import fan-in analysis
│   ├── velocity.ts       ✓ COMPLETE (86 LOC) - burst detection
│   ├── ai-detection.ts   ✓ COMPLETE (281 LOC) - AI tool detection
│   ├── burst.ts          ✓ COMPLETE (198 LOC) - burst detection
│   ├── threats.ts        ✓ COMPLETE (125 LOC) - security + mock detection
│   ├── phantom-deps.ts   ✓ COMPLETE (263 LOC) - phantom dependency detection
│   ├── index.ts          ✓ COMPLETE - exports
│   └── README.md         ✓ COMPLETE - documentation
│
├── validators/           # Validators - WEEK 3 COMPLETE ✓
│   ├── types.ts          ✓ COMPLETE (197 LOC) - TypeScript checking
│   ├── cycles.ts         ✓ COMPLETE (158 LOC) - circular dependency gate
│   ├── security.ts       ✓ COMPLETE (229 LOC) - security pattern validation
│   ├── patterns.ts       ✓ COMPLETE (126 LOC) - Biome integration
│   ├── index.ts          ✓ COMPLETE - exports
│   └── README.md         ✓ COMPLETE - documentation
│
├── actions/              # Actions - WEEK 4 COMPLETE ✓
│   ├── snapshot.ts       ✓ COMPLETE (114 LOC) - create snapshot
│   ├── restore.ts        ✓ COMPLETE (130 LOC) - restore files
│   ├── notify.ts         ✓ COMPLETE (198 LOC) - notifications
│   └── index.ts          ✓ COMPLETE (empty, reserved)
│
├── transports/           # NOT STARTED - WEEK 5 (deferred)
│   ├── mcp.ts            ✗ TODO - MCP server transport
│   ├── cli.ts            ✗ TODO - CLI transport
│   └── http.ts           ✗ TODO - HTTP API transport
│
├── test/                 # Test suite - EXTENSIVE COVERAGE ✓
│   ├── smoke.test.ts     ✓ COMPLETE (126 LOC) - basic smoke tests
│   ├── runtime/
│   │   ├── orchestrator.test.ts  ✓ COMPLETE (19 tests)
│   │   ├── monitor.test.ts       ✓ COMPLETE (27 tests)
│   │   ├── storage.test.ts       ✓ COMPLETE (37 tests)
│   │   └── decision.test.ts      ✓ COMPLETE (14 tests)
│   └── signals/
│       ├── ai-detection.test.ts  ✓ COMPLETE (34 tests)
│       └── burst.test.ts         ✓ COMPLETE (17 tests)
│
├── types.ts              ✓ COMPLETE (258 LOC) - shared types
├── index.ts              ✓ COMPLETE (51 LOC) - main entry point
├── package.json          ✓ COMPLETE - dependencies
├── tsconfig.json         ✓ COMPLETE - TypeScript config
├── vitest.config.ts      ✓ COMPLETE - test config
└── tsup.config.ts        ✓ COMPLETE - build config

NOTE: monitors/ directory NOT created - functionality merged into monitor.ts
NOTE: transports/ NOT in src/ - will be created for Week 5
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

## Implementation Priority and Progress

### ✅ COMPLETED (Weeks 1-4): ~85% of Core Migration

**Week 1 - Foundation (COMPLETE):**
- [x] `runtime/orchestrator.ts` - Script coordination (467 LOC)
- [x] `runtime/events.ts` - Event bus (265 LOC)
- [x] `runtime/monitor.ts` - Session coaching (392 LOC)
- [x] `runtime/storage.ts` - Blob storage (353 LOC)
- [x] `runtime/decision.ts` - Decision logic (237 LOC)
- [x] Test suite with 160 passing tests

**Week 2 - Signals (MOSTLY COMPLETE):**
- [x] `signals/risk-score.ts` - Main risk calculation (256 LOC)
- [x] `signals/complexity.ts` - AST complexity analysis (194 LOC)
- [x] `signals/cycles.ts` - Circular dependency detection (176 LOC)
- [x] `signals/ai-detection.ts` - AI tool detection (281 LOC) *BONUS*
- [x] `signals/burst.ts` - Burst detection (198 LOC) *BONUS*
- [⚠️] `signals/consumers.ts` - SCAFFOLDED, needs full ImportAnalyzer extraction
- [⚠️] `signals/velocity.ts` - SCAFFOLDED, needs integration with burst.ts
- [ ] `signals/threats.ts` - NOT STARTED (security threat patterns)

**Week 3 - Validators (COMPLETE):**
- [x] `validators/types.ts` - TypeScript type checking (197 LOC)
- [x] `validators/cycles.ts` - Circular dependency gate (158 LOC)
- [x] `validators/security.ts` - Security pattern validation (229 LOC)
- [x] `validators/patterns.ts` - Biome integration (126 LOC)

**Week 4 - Storage + Actions (COMPLETE):**
- [x] `actions/snapshot.ts` - Create snapshot (114 LOC)
- [x] `actions/restore.ts` - Restore files (130 LOC)
- [x] `actions/notify.ts` - Send notifications (198 LOC)

### 🚧 IN PROGRESS / REMAINING

**Week 5 - Transports (NOT STARTED):**
- [ ] `transports/mcp.ts` - MCP server protocol adapter
- [ ] `transports/cli.ts` - CLI command interface
- [ ] `transports/http.ts` - HTTP API endpoints

**Additional Work Needed:**
- [ ] Complete `signals/consumers.ts` - Extract full logic from ImportAnalyzer.ts
- [x] Complete `signals/velocity.ts` - Integrate with burst.ts detector
- [x] Implement `signals/threats.ts` - Extract from threat-detection.ts
- [x] Integration testing with existing MCP server (apps/mcp-server)
- [x] Update VS Code extension to use new engine (2025-12-16)
- [ ] Documentation and migration guide

### 📊 PROGRESS METRICS

**Overall Completion: ~75%**

| Category | Files | Status | LOC | Tests |
|----------|-------|--------|-----|-------|
| Runtime | 5/5 | ✅ Complete | 1,714 | 97 tests |
| Signals | 10/10 | ✅ Complete | 2,034 | 80 tests |
| Validators | 4/4 | ✅ Complete | 710 | Integrated |
| Actions | 3/3 | ✅ Complete | 442 | Integrated |
| Transports | 3/3 | ✅ Complete | 580 | 47 |
| **TOTAL** | **25/25** | **100%** | **5,700+** | **367** |

**Test Coverage (77%+ overall):**
- Transports: 93.16% statements (direct import testing)
- Runtime: 89.11% statements (direct import testing)
- Signals: 72.86% statements (core functions + stdin main)
- Validators: 50.91% statements (core functions + execSync calls)
- Unit tests: 367 passing
- Test execution time: ~32s (with coverage)

**Architecture Deviations from MIGRATION.md:**
1. ✅ Added `ai-detection.ts` and `burst.ts` signals (not in original plan)
2. ✅ Added `decision.ts` runtime module for decision logic
3. ❌ No `monitors/` directory - functionality integrated into `monitor.ts`
4. ❌ No `threats.ts` signal yet - deferred
5. ❌ Transports not in `src/` yet - will be added in Week 5

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

## Known Issues & TODO Items

### ✅ All Signals Complete

**signals/threats.ts** (✅ COMPLETE - 125 LOC)
- Detects: critical (rm -rf, DROP TABLE, eval, AWS keys, GitHub tokens, OpenAI keys)
- Detects: high (password, API key, secret, jest.mock, vi.mock, sinon mocks)
- Detects: medium (exec, XSS, testing-library imports, vitest imports)
- Source: threat-detection.ts + mock-replacement.ts + secret-detection.ts

**signals/phantom-deps.ts** (✅ COMPLETE - 263 LOC)
- Extracts imports from ES6, CommonJS, dynamic imports
- Compares against package.json declared dependencies
- Detects typosquatting with Levenshtein distance
- Skips Node.js built-ins and @snapback/* workspace packages
- Source: PhantomDependencyPlugin

**signals/velocity.ts** (✅ COMPLETE - 86 LOC)
- Integration: BurstDetector from burst.ts
- Output: SignalOutput schema with burstDetected, velocity, charCount

**signals/consumers.ts** (✅ COMPLETE - 134 LOC)
- Uses TypeScript AST for import analysis
- Counts fan-in (number of consumers) per file

### ✅ Week 5 - Transports (COMPLETE):

**transports/mcp.ts** (✅ COMPLETE - 205 LOC, 18 tests)
- Purpose: MCP (Model Context Protocol) server transport
- Wired to: `apps/mcp-server/src/index.ts`
- Adapter: MCPEngineAdapter class
- Input: MCPChange[] from MCP tool arguments
- Output: MCPRiskResult with session health for coaching
- TDD gates: All passed (refactor, quality, certify)

**transports/http.ts** (✅ COMPLETE - 193 LOC, 16 tests)
- Purpose: HTTP API endpoints
- Wired to: `apps/api/modules/risk/procedures/analyze-risk.ts`
- Adapter: HTTPEngineAdapter class
- Input: HTTPFileInput[] from API request body
- Output: HTTPRiskResponse matching apps/api contract
- TDD gates: All passed (refactor, quality, certify)

**transports/cli.ts** (✅ COMPLETE - 182 LOC, 13 tests)
- Purpose: Command-line interface
- Wired to: `apps/cli/src/check.ts`
- Adapter: CLIEngineAdapter class
- Input: CLIInput with files and format (text/json/sarif)
- Output: CLIOutput with exitCode, output, riskScore
- TDD gates: All passed (refactor, quality, certify)

## Questions?

If you're unsure about an implementation:

1. Check the SOURCE REFERENCE file first
2. Look at similar scaffolded files for patterns
3. Ask the human for clarification
4. When in doubt, keep it simple

Remember: **Simple > Clever**. The goal is a maintainable codebase, not clever code.
