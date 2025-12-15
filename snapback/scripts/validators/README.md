# Validator Scripts

Validator scripts **block** operations when they fail. They're the Gate 2 checks.

## Contract

Every validator script MUST:

1. Accept files via `--files=a.ts,b.ts` or `SNAPBACK_FILES` env variable
2. Output valid JSON to stdout
3. Exit with code 0 if pass, code 1 if fail
4. Complete within timeout (varies by validator)

## Output Schema

```typescript
interface ValidatorResult {
  status: "pass" | "fail";
  reason?: string;          // Required if status === "fail"
  suggestion?: string;      // How to fix the issue
  errors?: string[];        // List of specific errors
  details?: object;         // Additional structured data
}
```

## Available Validators

| Validator | Source | Timeout | Status | Description |
|-----------|--------|---------|--------|-------------|
| `types.ts` | tsc --noEmit | 60s | ✅ Implemented | TypeScript type checking |
| `cycles.ts` | madge | 30s | 📝 TODO | Circular dependency gate |
| `security.ts` | guardian.ts | 15s | 📝 TODO | Security pattern validation |
| `patterns.ts` | biome | 30s | 📝 TODO | Code pattern linting |
| `config.ts` | validate-project.ts | 10s | 📝 TODO | Configuration validation |

## Extraction Guide

### types.ts (Implemented)

Uses `tsc --noEmit` to check TypeScript types.

### cycles.ts

**Source:** `apps/vscode/spike/assumptions/madge-*.ts`

Like signals/cycles.ts but BLOCKS on cycles instead of just reporting.

### security.ts

**Source:** `packages/core/src/guardian.ts`

Extract:
- Dangerous pattern detection
- eval() usage detection
- Unsafe dynamic code

### patterns.ts

**Source:** External tool (biome)

Runs `pnpm biome check` on changed files.

### config.ts

**Source:** `scripts/validate-project.ts`

Extract:
- Package.json validation
- TSConfig validation
- Export validation

## Running Validators Directly

```bash
# Run a single validator
npx tsx scripts/validators/types.ts --files=src/auth.ts

# Expected output (JSON)
{"status":"pass"}

# Or on failure:
{"status":"fail","reason":"TypeScript errors found","errors":["..."]}
```

## Blocking vs Non-Blocking

Validators are marked as `blocking: true` in orchestrator.ts.

- **Blocking**: types.ts, cycles.ts, security.ts
- **Non-blocking**: patterns.ts (lint warnings don't block)

## Adding New Validators

1. Create `scripts/validators/your-validator.ts`
2. Follow the contract (input via --files, output JSON, exit code)
3. Add to `VALIDATOR_SCRIPTS` in `runtime/orchestrator.ts`
4. Set `blocking: true` or `false` based on severity
5. Add test in `scripts/validators/__tests__/your-validator.test.ts`
