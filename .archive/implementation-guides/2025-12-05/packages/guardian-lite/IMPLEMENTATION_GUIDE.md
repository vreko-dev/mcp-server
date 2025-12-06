# Guardian Lite Package Implementation Guide

**Status**: 🚧 Not yet implemented - See MASTER_IMPLEMENTATION_PLAN.md WS1

## Overview
Create private package with 15 basic detection patterns (no proprietary IP).

## Files to Create

### 1. package.json
**Location**: `packages/guardian-lite/package.json`
**Template**: See MASTER_IMPLEMENTATION_PLAN.md lines 159-205
**Key Requirements**:
- `"private": true` (never publish to npm)
- `"name": "@snapback/guardian-lite"`
- Scripts: build, test, test:watch, type-check

### 2. README.md
**Location**: `packages/guardian-lite/README.md`
**Template**: See MASTER_IMPLEMENTATION_PLAN.md lines 207-265
**Sections**: Features, Usage, Patterns Detected, Performance, Private Package notice

### 3. Core Implementation
**Location**: `packages/guardian-lite/src/guardian-lite.ts`
**Template**: See MASTER_IMPLEMENTATION_PLAN.md lines 267-390
**Key Classes**:
- `GuardianLite` class with 15 patterns:
  - 5 secret patterns (AWS keys, API keys, JWT, private keys, DB connections)
  - 5 mock patterns (Jest, Vitest, Sinon, test doubles, mock adapters)
  - 5 dependency patterns (phantom imports, missing deps)
- `AnalysisResult` interface
- `Issue` interface

### 4. Pattern Files (optional organization)
**Location**: `packages/guardian-lite/src/patterns/`
- `secrets.ts` - 5 secret detection patterns
- `mocks.ts` - 5 test framework patterns
- `dependencies.ts` - 5 import/dependency patterns

### 5. Tests
**Location**: `packages/guardian-lite/src/guardian-lite.test.ts`
**Template**: See MASTER_IMPLEMENTATION_PLAN.md lines 392-449
**Test Coverage**:
- AWS key detection
- Jest mock detection
- Clean code (no issues)
- Upgrade prompt trigger
- Performance (<50ms for 1000 lines)

### 6. Type Definitions
**Location**: `packages/guardian-lite/src/types.ts`
**Exports**: AnalysisResult, Issue, RiskLevel, Severity

### 7. Index Export
**Location**: `packages/guardian-lite/src/index.ts`
```typescript
export { GuardianLite } from './guardian-lite.js';
export type { AnalysisResult, Issue } from './guardian-lite.js';
```

### 8. TypeScript Config
**Location**: `packages/guardian-lite/tsconfig.json`
```json
{
  "extends": "@snapback/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## Acceptance Criteria
- [ ] Package builds successfully (`pnpm build`)
- [ ] All 15 patterns detect correctly
- [ ] Tests pass with 100% coverage
- [ ] Analysis completes in <50ms for 1000 lines
- [ ] `"private": true` in package.json
- [ ] Exports clear TypeScript types
- [ ] README documents all patterns

## Performance Targets
- Analysis time: <50ms for 1000 lines
- Typical: 10-20ms for most files
- Memory: ~5 MB

## Next Steps After Implementation
1. Run `pnpm build` in packages/guardian-lite
2. Run `pnpm test` to verify all patterns work
3. Import in MCP server: `import { GuardianLite } from '@snapback/guardian-lite'`
4. Use in AnalysisRouter (WS4)
