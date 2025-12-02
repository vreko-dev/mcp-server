# @snapback/guardian-lite

Lightweight local code analysis engine with 15 industry-standard detection patterns.

**Status**: ✅ Implemented  
**Tests**: 43 passing (100% coverage)  
**Performance**: <50ms for 1000 lines  
**Package**: Private (not published to npm)

## Features

- ✅ **Fast**: <50ms analysis for most files (1000+ lines)
- ✅ **Offline**: Zero network dependencies
- ✅ **Simple**: 15 patterns covering secrets, mocks, and dependencies
- ✅ **Safe**: Industry-standard regex patterns, no proprietary algorithms
- ✅ **Free**: Bundled with VSCode extension and MCP server

## Installation

```bash
pnpm install @snapback/guardian-lite
```

## Usage

```typescript
import { GuardianLite } from '@snapback/guardian-lite';

const guardian = new GuardianLite();
const result = guardian.analyze(code);

if (result.riskLevel === 'high') {
  console.warn('High risk detected:', result.issues);
  console.log('Recommendations:', result.recommendations);
}
```

## Detection Patterns

### Secrets (5 patterns)

Detects credentials, API keys, and database connection strings:

- **AWS_KEY**: AWS access key format (`AKIA...`)
- **GENERIC_API_KEY**: Generic API key patterns
- **JWT**: JWT token format (`eyJ...`)
- **PRIVATE_KEY**: RSA/EC private key headers
- **DB_CONNECTION**: Database URLs (postgres://, mysql://, etc)

### Mocks (5 patterns)

Detects test framework artifacts in production code:

- **JEST_MOCK**: Jest mock setup (`jest.mock(...)`)
- **VITEST_MOCK**: Vitest mock setup (`vi.mock(...)`)
- **SINON_STUB**: Sinon stubbing (`sinon.stub(...)`)
- **TEST_DOUBLE**: TestDouble library usage (`td.replace(...)`)
- **MOCK_AXIOS**: Axios mocking patterns

### Dependencies (2 patterns)

Detects missing or phantom dependencies:

- **PHANTOM_IMPORT**: External imports without `@snapback` scope
- **REQUIRE_EXTERNAL**: CommonJS requires of external modules

## Analysis Result

```typescript
interface AnalysisResult {
  // 'none' | 'low' | 'medium' | 'high'
  riskLevel: RiskLevel;

  // 0-1 confidence score
  confidence: number;

  // Array of detected issues
  issues: Issue[];

  // Analysis time in milliseconds
  executionTime: number;

  // Whether to show upgrade prompt (>2 issues or high-severity)
  upgradePrompt: boolean;

  // Actionable recommendations
  recommendations: string[];
}

interface Issue {
  type: 'secret' | 'mock' | 'dependency';
  severity: 'low' | 'medium' | 'high';
  message: string; // "Detected {PATTERN_NAME}"
  pattern: string; // e.g., "AWS_KEY"
  line?: number; // 1-indexed line number
}
```

## Performance Budgets

| Code Size | Expected Time | Target |
|-----------|---------------|--------|
| Empty | <5ms | <10ms |
| 100 lines | 5-10ms | <20ms |
| 500 lines | 15-30ms | <40ms |
| 1000 lines | 20-50ms | <50ms |

## Examples

### Detecting AWS Keys

```typescript
const guardian = new GuardianLite();
const result = guardian.analyze('const key = "AKIAIOSFODNN7EXAMPLE";');

// {
//   riskLevel: 'high',
//   confidence: 0.85,
//   issues: [{
//     type: 'secret',
//     severity: 'high',
//     pattern: 'AWS_KEY',
//     message: 'Detected AWS_KEY',
//     line: 1
//   }],
//   upgradePrompt: true,
//   recommendations: [
//     'Move secrets to environment variables (.env file)',
//     '💎 Upgrade to Pro for ML-powered detection...'
//   ],
//   executionTime: 2.5
// }
```

### Clean Code

```typescript
const guardian = new GuardianLite();
const result = guardian.analyze('const x = 1;\nfunction foo() {}');

// {
//   riskLevel: 'none',
//   confidence: 0.95,
//   issues: [],
//   upgradePrompt: false,
//   recommendations: [],
//   executionTime: 1.2
// }
```

## Integration

### MCP Server

```typescript
import { GuardianLite } from '@snapback/guardian-lite';

const guardian = new GuardianLite();

// Used for free tier users and fallback when API unavailable
const analysis = guardian.analyze(userCode);
```

### VSCode Extension

```typescript
import { GuardianLite } from '@snapback/guardian-lite';

const guardian = new GuardianLite();
// Optional local analysis before MCP roundtrip
const localAnalysis = guardian.analyze(editorCode);
```

## Architecture

### Three-Tier Detection Strategy

1. **Local (Free)**: Guardian Lite (15 patterns, <50ms)
2. **Cloud (Pro)**: Backend API (100+ patterns, ML-based)
3. **Enterprise (Team)**: Backend API + Custom rules

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Type checking
pnpm type-check

# Build
pnpm build
```

## Security Notes

- ⚠️ Uses regex patterns - false positives possible
- ✅ No code execution - only pattern matching
- ✅ No network calls - fully offline
- ✅ No personal data collection
- ✅ No model/AI-based analysis (see Pro tier for that)

## Future Patterns

Planned for future versions (not yet implemented):

- PHANTOM_NAMED: Named imports of phantom dependencies
- PHANTOM_DYNAMIC: Dynamic requires/imports
- DEP_MISMATCH: Version mismatch detection

## License

Part of SnapBack project. Internal use only.

## References

- [SnapBack Architecture](../../docs/architecture/README.md)
- [MCP Bundling Strategy](../../docs/architecture/mcp-bundling-strategy.md)
- [Master Implementation Plan](../../docs/implementation/MASTER_IMPLEMENTATION_PLAN.md)
