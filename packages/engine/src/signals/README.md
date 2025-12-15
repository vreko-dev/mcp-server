# Signal Scripts

Signal scripts emit **data** that feeds into risk scoring. They don't block operations - they provide information.

## Contract

Every signal script MUST:

1. Accept files via `--files=a.ts,b.ts` or `SNAPBACK_FILES` env variable
2. Output valid JSON to stdout
3. Exit with code 0 (even if "status" is "fail")
4. Complete within timeout (default 30s)

## Output Schema

```typescript
interface SignalResult {
  status: "pass" | "fail";  // Informational, doesn't block
  score: number;            // Contribution to risk score
  reason?: string;          // Human-readable explanation
  details?: object;         // Additional structured data
}
```

## Available Signals

| Signal | Source | Status | Description |
|--------|--------|--------|-------------|
| `risk-score.ts` | packages/core/src/risk-analyzer.ts | ✅ Implemented | Aggregate risk scoring |
| `cycles.ts` | madge integration | ✅ Implemented | Circular dependency detection |
| `complexity.ts` | packages/core/src/guardian.ts | 📝 TODO | AST complexity analysis |
| `consumers.ts` | ImportAnalyzer.ts | 📝 TODO | Fan-in counting |
| `velocity.ts` | risk-analyzer.ts | 📝 TODO | Change velocity tracking |
| `threats.ts` | threat-detection.ts | 📝 TODO | Security pattern detection |

## Extraction Guide

### complexity.ts

**Source:** `packages/core/src/guardian.ts`

Extract:
- `calculateComplexity()` function
- AST parsing with esprima
- Cyclomatic complexity calculation

Target output:
```json
{
  "status": "pass",
  "score": 15,
  "details": {
    "avgComplexity": 12.5,
    "maxComplexity": 25,
    "hotspots": [
      { "file": "auth.ts", "complexity": 25, "function": "validateToken" }
    ]
  }
}
```

### consumers.ts

**Source:** `apps/vscode/src/engine/graph/ImportAnalyzer.ts`

Extract:
- Import graph building
- Fan-in calculation (who imports this file)

Target output:
```json
{
  "status": "pass",
  "score": 10,
  "details": {
    "files": [
      { "file": "types.ts", "consumers": 15 },
      { "file": "auth.ts", "consumers": 8 }
    ]
  }
}
```

### velocity.ts

**Source:** `packages/core/src/risk-analyzer.ts` lines 68-100

Extract:
- Recent change tracking
- Burst detection logic

Target output:
```json
{
  "status": "pass",
  "score": 5,
  "details": {
    "changesLast5Min": 12,
    "burstDetected": true,
    "avgVelocity": 2.4
  }
}
```

### threats.ts

**Source:** `packages/core/src/threat-detection.ts`

Extract:
- Pattern matching for dangerous code
- Secret detection
- Unsafe function usage

Target output:
```json
{
  "status": "fail",
  "score": 30,
  "reason": "Potential secret detected",
  "details": {
    "threats": [
      { "type": "hardcoded_secret", "file": "config.ts", "line": 42 }
    ]
  }
}
```

## Running Signals Directly

```bash
# Run a single signal
npx tsx scripts/signals/risk-score.ts --files=src/auth.ts,src/user.ts

# Run with env variable
SNAPBACK_FILES="src/auth.ts" npx tsx scripts/signals/cycles.ts

# Expected output (JSON)
{"status":"pass","score":15,"factors":["sensitive_file"],"details":{...}}
```

## Adding New Signals

1. Create `scripts/signals/your-signal.ts`
2. Follow the contract (input via --files, output JSON)
3. Add to `SIGNAL_SCRIPTS` in `runtime/orchestrator.ts`
4. Add test in `scripts/signals/__tests__/your-signal.test.ts`
