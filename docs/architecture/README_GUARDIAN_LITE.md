# Guardian Lite Package Documentation Index

Guardian Lite is a lightweight, local pattern detection library planned for Phase 2 of the SnapBack MCP bundling strategy. This directory contains complete interface documentation.

## Quick Navigation

### For Getting Started
**👉 Start here**: [`guardian-lite-quick-ref.md`](./guardian-lite-quick-ref.md) (1-page)
- Core types in 5 lines
- Usage in 30 seconds
- All 15 patterns at a glance
- Performance budgets
- Key features checklist

### For Complete Reference
**📚 Full docs**: [`guardian-lite-interface.md`](./guardian-lite-interface.md) (16 KB)
- Detailed type definitions with JSDoc
- Full class signatures and methods
- All 15 detection patterns with regex
- Integration points with MCP and VSCode
- Performance characteristics
- Testing examples
- Configuration guide

## What is Guardian Lite?

Guardian Lite is a basic pattern detection library that:
- Detects 15 common code quality/security issues
- Runs locally (no API needed)
- Provides <50ms analysis for 1000 lines
- Ships with VSCode extension + MCP server
- Protects proprietary algorithms (stays on server)

## The Core Interface (2 Types + 1 Class)

```typescript
// Type 1: Analysis Result
interface AnalysisResult {
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  confidence: number;        // 0-1
  issues: Issue[];
  executionTime: number;     // ms
  upgradePrompt: boolean;    // Show to user?
  recommendations: string[]; // What to do?
}

// Type 2: Individual Issue
interface Issue {
  type: 'secret' | 'mock' | 'dependency';
  severity: 'low' | 'medium' | 'high';
  message: string;
  line?: number;
  pattern: string;
}

// Class 1: The Analyzer
class GuardianLite {
  constructor() // No params!
  analyze(code: string): AnalysisResult
}
```

## 15 Detection Patterns

| Category | Pattern | Severity | What It Detects |
|----------|---------|----------|-----------------|
| **Secrets** | AWS_KEY | High | AWS access keys (AKIA...) |
| | GENERIC_API_KEY | Medium | Generic API keys |
| | JWT | Low | JWT tokens |
| | PRIVATE_KEY | High | RSA/EC private keys |
| | DB_CONNECTION | High | Database URLs |
| **Mocks** | JEST_MOCK | Medium | jest.mock() |
| | VITEST_MOCK | Medium | vi.mock() |
| | SINON_STUB | Medium | sinon.stub/spy/mock |
| | TEST_DOUBLE | Low | testdouble library |
| | MOCK_AXIOS | Low | Axios mocking |
| **Dependencies** | PHANTOM_IMPORT | Medium | Missing external imports |
| | REQUIRE_EXTERNAL | Medium | Missing CommonJS deps |
| | (3 future patterns) | Medium | Enhanced dep detection |

## Usage in 30 Seconds

```typescript
import { GuardianLite } from '@snapback/guardian-lite';

const guardian = new GuardianLite();
const result = guardian.analyze(codeString);

// Result has:
// - riskLevel: 'high' | 'medium' | 'low' | 'none'
// - issues: [{type, severity, message, line, pattern}]
// - upgradePrompt: boolean (true if >2 issues or high severity)
// - recommendations: string[] (actionable suggestions)
// - executionTime: number (milliseconds)
```

## Where Guardian Lite Fits

### Three-Tier Architecture

```
┌────────────────────────────────────┐
│  Tier 1: LOCAL (Free)              │
│  Guardian Lite (15 patterns)       │
│  <50ms, offline, no API            │
├────────────────────────────────────┤
│  Tier 2: CLOUD (Pro)               │
│  Backend API (ML-based)            │
│  100+ patterns, context-aware      │
├────────────────────────────────────┤
│  Tier 3: ENTERPRISE (Team)         │
│  Backend API (custom rules)        │
│  Company-specific patterns         │
└────────────────────────────────────┘
```

Guardian Lite is **Tier 1**: Free, local, offline.

### Integration Points

1. **MCP Server** (primary)
   - Instantiated on startup
   - Used for all free tier requests
   - Fallback when Pro API unavailable
   - Exposed via `analyze_risk` tool

2. **AnalysisRouter** (tier-based routing)
   - Free users: Always Guardian Lite
   - Pro users: Try API, fallback to Guardian Lite
   - Offline: Always Guardian Lite

3. **VSCode Extension** (optional)
   - Could provide inline preview
   - No MCP roundtrip needed
   - Improves perceived performance

## Performance Budgets

| Code Size | Expected Time | Target |
|-----------|---------------|--------|
| Empty | <5ms | <10ms |
| 100 lines | 5-10ms | <20ms |
| 500 lines | 15-30ms | <40ms |
| 1000 lines | 20-50ms | <50ms |
| 5000+ lines | <200ms | <200ms |

**Memory**: ~5 MB total  
**CPU**: Single-threaded, synchronous  
**I/O**: None (pure string processing)

## Key Features

✅ **Fast**: <50ms for most files  
✅ **Offline**: No API dependency  
✅ **Simple**: 15 patterns, no ML  
✅ **Safe**: Doesn't expose proprietary algorithms  
✅ **Free**: Bundled with extension  
✅ **Upgradeable**: Shows Pro tier prompts for complex cases  

## Implementation Status

**Status**: 🚧 Not yet implemented (planning phase)

**Timeline**: Phase 2 of MCP bundling strategy
- Phase 1: MCP bundling (Week 1-2) ← Current
- Phase 2: Guardian Lite (Week 3-4) ← Next
- Phase 3: API integration (Week 5-6)
- Phase 4: Standalone MCP distribution (Week 7-8)

**When ready to implement**:
1. See implementation acceptance criteria in [guardian-lite-interface.md](./guardian-lite-interface.md#implementation-status)
2. Follow template in MASTER_IMPLEMENTATION_PLAN.md (lines 267-390)
3. Check test examples in [guardian-lite-interface.md](./guardian-lite-interface.md#testing)

## File Structure (When Implemented)

```
packages/guardian-lite/
├── src/
│   ├── index.ts              # Exports: GuardianLite, AnalysisResult, Issue
│   ├── guardian-lite.ts      # Main class + type definitions
│   ├── types.ts              # Type definitions
│   └── patterns/             # Optional organization
│       ├── secrets.ts        # 5 secret patterns
│       ├── mocks.ts          # 5 mock patterns
│       └── dependencies.ts   # 5 dependency patterns
├── src/guardian-lite.test.ts # Test suite (>90% coverage)
├── package.json              # "private": true
├── tsconfig.json
└── README.md
```

## Important Design Notes

### Why Synchronous?
- Fast local execution (<50ms)
- No async complexity
- Simple to integrate

### Why No Configuration?
- Hardcoded patterns
- Ensures consistency
- Reduces complexity

### Why No Error Throwing?
- Graceful degradation
- Returns partial results if any pattern fails
- Caller validates input

### Why Private Package?
- Protects IP (patterns OK to ship, ML models not)
- Free tier gets basic detection
- Pro tier gets advanced API-based detection

## Example: Free Tier Flow

```typescript
// User has no API key (free tier)
const code = 'const key = "AKIAIOSFODNN7EXAMPLE";';

// Guardian Lite analyzes locally
const guardian = new GuardianLite();
const result = guardian.analyze(code);

// Result shows:
{
  riskLevel: 'high',
  confidence: 0.85,
  issues: [{
    type: 'secret',
    severity: 'high',
    message: 'Detected AWS_KEY',
    line: 1,
    pattern: 'AWS_KEY'
  }],
  upgradePrompt: true,
  recommendations: [
    'Move secrets to environment variables (.env file)',
    '💎 Upgrade to Pro for ML-powered detection...'
  ]
}
```

## Example: Pro Tier Flow

```typescript
// User has API key (pro tier)
const code = 'complex code...';

// AnalysisRouter tries API first
try {
  return await apiClient.analyze(code); // Advanced ML-based
} catch (error) {
  // Fallback to Guardian Lite if API unavailable
  return guardian.analyze(code);
}
```

## Related Documentation

- **Main SnapBack docs**: [`../CLAUDE.md`](../CLAUDE.md)
- **MCP Bundling Strategy**: [`./mcp-bundling-strategy.md`](./mcp-bundling-strategy.md)
- **Master Implementation Plan**: [`../implementation/MASTER_IMPLEMENTATION_PLAN.md`](../implementation/MASTER_IMPLEMENTATION_PLAN.md) (lines 267-390)
- **MCP Server**: [`../../apps/mcp-server/CLAUDE.md`](../../apps/mcp-server/CLAUDE.md)
- **AnalysisRouter**: [`../../apps/mcp-server/src/services/AnalysisRouter.IMPLEMENTATION.ts`](../../apps/mcp-server/src/services/AnalysisRouter.IMPLEMENTATION.ts)
- **VSCode Extension**: [`../../apps/vscode/CLAUDE.md`](../../apps/vscode/CLAUDE.md)

## Questions?

**Quick answer needed?**  
→ See [`guardian-lite-quick-ref.md`](./guardian-lite-quick-ref.md)

**Need complete details?**  
→ See [`guardian-lite-interface.md`](./guardian-lite-interface.md)

**Want to implement it?**  
→ Check MASTER_IMPLEMENTATION_PLAN.md lines 267-390

---

**Documentation Status**: Complete ✓  
**Last Updated**: 2025-11-17  
**Package Status**: Not yet implemented (Phase 2)
