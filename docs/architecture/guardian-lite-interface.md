# Guardian Lite Package Interface Documentation

**Package**: `@snapback/guardian-lite`  
**Status**: Not yet implemented (planned for Phase 2 of MCP bundling strategy)  
**Location**: `packages/guardian-lite/`  
**Access**: Private package (not published to npm)  

---

## Overview

Guardian Lite is a lightweight, basic pattern detection library designed for local risk analysis in the SnapBack system. It provides 15 fundamental detection patterns (5 for secrets, 5 for mocks, 5 for dependencies) without exposing advanced proprietary algorithms.

**Key Characteristics**:
- ✅ Fast: <50ms analysis for 1000 lines
- ✅ Offline: No API dependency
- ✅ Simple: Industry-standard regex patterns
- ✅ Safe: Doesn't expose ML models or advanced heuristics
- ✅ Free: Bundled with VSCode extension and MCP server

---

## Type Definitions

### AnalysisResult Interface

```typescript
export interface AnalysisResult {
  /**
   * Overall risk classification
   * - 'none': No issues detected
   * - 'low': Low-severity issues detected
   * - 'medium': Mix of low/medium issues or multiple issues
   * - 'high': High-severity issues present
   */
  riskLevel: 'none' | 'low' | 'medium' | 'high';

  /**
   * Confidence score (0-1)
   * - 1.0 = Very confident (e.g., clear AWS key or no issues)
   * - 0.95 = No issues detected (high confidence in clean code)
   * - 0.85 = Issues detected with local patterns (good confidence)
   * - 0.60 = Many issues detected (suggests API analysis for Pro tier)
   * 
   * Note: Lower confidence suggests upgrading to Pro for ML-based analysis
   */
  confidence: number;

  /**
   * Array of detected issues
   * @see Issue interface
   */
  issues: Issue[];

  /**
   * Time taken to analyze in milliseconds
   * Target: <50ms for 1000 lines, typically 10-20ms
   */
  executionTime: number;

  /**
   * Whether to show upgrade prompt to user
   * Triggered when:
   * - More than 2 issues detected
   * - Any high-severity issue present
   */
  upgradePrompt: boolean;

  /**
   * List of actionable recommendations
   * Generated based on detected issues
   * Always includes upgrade prompt if upgradePrompt is true
   */
  recommendations: string[];
}
```

### Issue Interface

```typescript
export interface Issue {
  /**
   * Category of detected issue
   * - 'secret': Credentials, API keys, private keys, database connections
   * - 'mock': Test framework artifacts in production code
   * - 'dependency': Missing or phantom dependencies
   */
  type: 'secret' | 'mock' | 'dependency';

  /**
   * Severity level
   * - 'low': Minor issues (e.g., test doubles)
   * - 'medium': Notable issues (e.g., generic API keys, jest mocks)
   * - 'high': Critical issues (e.g., AWS keys, private keys)
   */
  severity: 'low' | 'medium' | 'high';

  /**
   * Human-readable issue description
   * Format: "Detected {PATTERN_NAME}"
   * Example: "Detected AWS_KEY"
   */
  message: string;

  /**
   * Line number where issue was detected (1-indexed)
   * undefined if issue type doesn't have line-specific location
   */
  line?: number;

  /**
   * Pattern identifier that matched
   * Matches the pattern name from detection rules
   * @see GuardianLite.PATTERNS
   */
  pattern: string;
}
```

### RiskLevel Type

```typescript
type RiskLevel = 'none' | 'low' | 'medium' | 'high';
```

### Severity Type

```typescript
type Severity = 'low' | 'medium' | 'high';
```

---

## GuardianLite Class

### Constructor

```typescript
export class GuardianLite {
  constructor()
  
  // No parameters required
  // Initializes with built-in pattern definitions
}
```

### Public Methods

#### analyze(code: string): AnalysisResult

**Purpose**: Analyze code string for security and quality issues

**Signature**:
```typescript
analyze(code: string): AnalysisResult
```

**Parameters**:
- `code` (string): Source code to analyze
  - Can be any text content
  - Processed line-by-line for pattern matching
  - No file extension or language detection required

**Returns**: `AnalysisResult` object containing:
- Risk classification
- Confidence score
- Detected issues with line numbers
- Execution time
- Upgrade recommendation flag
- Actionable recommendations

**Performance**:
- Typical: 10-20ms
- Target: <50ms for 1000 lines
- Execution time included in result

**Example**:
```typescript
const guardian = new GuardianLite();

// Example 1: Clean code
const result1 = guardian.analyze('const x = 1;\nfunction foo() {}');
// → { riskLevel: 'none', confidence: 0.95, issues: [], ... }

// Example 2: Code with AWS key
const result2 = guardian.analyze('const key = "AKIAIOSFODNN7EXAMPLE";');
// → { 
//     riskLevel: 'high', 
//     confidence: 0.85, 
//     issues: [{ type: 'secret', severity: 'high', line: 1, pattern: 'AWS_KEY', ... }],
//     upgradePrompt: true,
//     ...
//   }

// Example 3: Code with multiple issues
const result3 = guardian.analyze(`
  jest.mock('./module');
  const key = process.env.API_KEY;
  import axios from 'axios';
`);
// → { 
//     riskLevel: 'medium', 
//     confidence: 0.85, 
//     issues: [
//       { type: 'mock', severity: 'medium', line: 1, pattern: 'JEST_MOCK' },
//       { type: 'dependency', severity: 'medium', line: 3, pattern: 'PHANTOM_IMPORT' }
//     ],
//     upgradePrompt: true,
//     recommendations: [
//       'Remove test mocks from production code',
//       'Add missing dependencies to package.json',
//       '💎 Upgrade to Pro for ML-powered detection...'
//     ],
//     ...
//   }
```

### Private Methods (Implementation Details)

These are internal implementation methods, documented for reference:

```typescript
private findMatches(
  code: string,
  regex: RegExp
): Array<{ line: number; match: string }>
// Finds all regex matches in code, returns with line numbers

private calculateRiskLevel(issues: Issue[]): RiskLevel
// Aggregates issue severities to overall risk level

private calculateConfidence(issues: Issue[]): number
// Returns confidence score based on issue count and types

private generateRecommendations(issues: Issue[]): string[]
// Creates actionable recommendations based on detected issues
```

---

## Detection Patterns

Guardian Lite includes 15 built-in patterns across 3 categories:

### Secret Patterns (5)

| Pattern | Regex | Severity | Detection |
|---------|-------|----------|-----------|
| `AWS_KEY` | `/AKIA[0-9A-Z]{16}/` | high | AWS access key format |
| `GENERIC_API_KEY` | `/api[_-]?key.*[a-z0-9]{32,}/i` | medium | Generic API key patterns |
| `JWT` | `/eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/` | low | JWT token format |
| `PRIVATE_KEY` | `/-----BEGIN (RSA \|EC )?PRIVATE KEY-----/` | high | RSA/EC private key headers |
| `DB_CONNECTION` | `/(postgres\|mysql\|mongodb):\/\/[^\s]+/` | high | Database connection strings |

### Mock Patterns (5)

| Pattern | Regex | Severity | Detection |
|---------|-------|----------|-----------|
| `JEST_MOCK` | `/jest\.mock\(/` | medium | Jest mock setup |
| `VITEST_MOCK` | `/vi\.mock\(/` | medium | Vitest mock setup |
| `SINON_STUB` | `/sinon\.(stub\|spy\|mock)/` | medium | Sinon stubbing |
| `TEST_DOUBLE` | `/td\.(replace\|when\|verify)/` | low | Testdouble library usage |
| `MOCK_AXIOS` | `/MockAdapter\|mock\.onGet/` | low | Axios mocking patterns |

### Dependency Patterns (5)

| Pattern | Regex | Severity | Detection |
|---------|-------|----------|-----------|
| `PHANTOM_IMPORT` | `/import .+ from ['"](?!\.|\@snapback)/` | medium | Import of external module |
| `REQUIRE_EXTERNAL` | `/require\(['"](?!\.|\@snapback)/` | medium | CommonJS require of external |
| `PHANTOM_NAMED` | (future) | medium | Named imports of phantom deps |
| `PHANTOM_DYNAMIC` | (future) | medium | Dynamic requires/imports |
| `DEP_MISMATCH` | (future) | medium | Version mismatch detection |

**Note**: 5 dependency patterns shown; implementation may vary

---

## Export Statements

### ES Module Exports (`src/index.ts`)

```typescript
export { GuardianLite } from './guardian-lite.js';
export type { AnalysisResult, Issue } from './guardian-lite.js';
```

### Usage in Other Packages

```typescript
// MCP Server integration
import { GuardianLite } from '@snapback/guardian-lite';
import type { AnalysisResult } from '@snapback/guardian-lite';

const guardian = new GuardianLite();
const result = guardian.analyze(codeString);
```

---

## Integration Points

### MCP Server (`apps/mcp-server`)

```typescript
// Use Guardian Lite for basic analysis
// Fallback when API is unavailable
// Default for free tier users

import { GuardianLite } from '@snapback/guardian-lite';
const guardian = new GuardianLite();
const analysis = guardian.analyze(code);
```

### Extension (`apps/vscode`)

```typescript
// Optional local analysis in extension
// Can display results without MCP roundtrip
```

### AnalysisRouter (`apps/mcp-server/src/services/AnalysisRouter.ts`)

```typescript
// Tier-based routing logic:
// - Free tier: Always uses Guardian Lite
// - Pro tier: Uses API if available, falls back to Guardian Lite
// - Offline mode: Always uses Guardian Lite

export class AnalysisRouter {
  private localGuardian: GuardianLite;

  async analyze(code: string, user?: User): Promise<AnalysisResult> {
    // Implementation uses GuardianLite
  }
}
```

---

## Performance Characteristics

### Analysis Speed

- **Empty code**: <5ms
- **Small file (100 lines)**: 5-10ms
- **Medium file (500 lines)**: 15-30ms
- **Large file (1000 lines)**: 20-50ms
- **Very large (5000+ lines)**: <200ms (linear complexity)

### Memory Usage

- **Base**: ~2 MB (patterns + regex compiled)
- **Per analysis**: <1 MB temporary (varies with code size)
- **Total typical**: ~5 MB for normal usage

### CPU Profile

- **I/O**: None (pure string processing)
- **CPU**: Single-threaded, synchronous
- **Blocking**: Yes (use in worker if needed for >10k lines)

---

## Configuration

Guardian Lite uses no external configuration. All patterns are hardcoded.

### Customization (Future)

Potential for future versions:
```typescript
// Not yet supported
interface GuardianLiteConfig {
  patterns?: PatternDefinition[];
  enabledCategories?: ('secret' | 'mock' | 'dependency')[];
  customRules?: RegExp[];
}
```

---

## Error Handling

Guardian Lite performs no explicit error handling. Behavior:

```typescript
// Invalid regex (shouldn't happen with built-in patterns)
// → Skips that pattern, returns partial results

// Null/undefined input
// → Will throw (caller responsibility to validate)

// Very large input (>100KB)
// → Completes slowly, no error thrown
```

**Best Practice**: Validate code input before passing to `analyze()`:

```typescript
if (!code || typeof code !== 'string') {
  return { riskLevel: 'none', issues: [], ... };
}
const result = guardian.analyze(code);
```

---

## Example Usage

### Basic Usage

```typescript
import { GuardianLite } from '@snapback/guardian-lite';

const guardian = new GuardianLite();

const code = `
  const apiKey = 'sk_live_123456789abcdefghij';
  jest.mock('./module');
  console.log('test');
`;

const result = guardian.analyze(code);

console.log(result.riskLevel); // 'medium'
console.log(result.issues.length); // 2
console.log(result.upgradePrompt); // true
result.recommendations.forEach(r => console.log('→', r));
```

### Integration with AnalysisRouter

```typescript
import { GuardianLite } from '@snapback/guardian-lite';
import type { AnalysisResult } from '@snapback/guardian-lite';

export class AnalysisRouter {
  private localGuardian: GuardianLite;

  constructor() {
    this.localGuardian = new GuardianLite();
  }

  async analyze(code: string, user?: User): Promise<AnalysisResult> {
    // Free tier: Always local
    if (!user || !user.isPro) {
      const result = this.localGuardian.analyze(code);
      return this.addUpgradePrompt(result);
    }

    // Pro tier: Try API, fallback to local
    try {
      return await this.apiClient.analyze(code);
    } catch (error) {
      console.warn('API unavailable, using local Guardian Lite');
      return this.localGuardian.analyze(code);
    }
  }

  private addUpgradePrompt(result: AnalysisResult): AnalysisResult {
    if (result.upgradePrompt) {
      result.recommendations.push(
        '💎 Upgrade to Pro for ML-powered detection and context-aware analysis'
      );
    }
    return result;
  }
}
```

### MCP Tool Handler

```typescript
import { GuardianLite } from '@snapback/guardian-lite';

// In MCP server tool handler
const guardian = new GuardianLite();

const tool = {
  name: 'analyze_risk',
  description: 'Analyze code for security issues',
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Code to analyze' },
    },
  },
  handler: async (input: { code: string }) => {
    const analysis = guardian.analyze(input.code);
    return {
      risk_level: analysis.riskLevel,
      issues: analysis.issues,
      recommendations: analysis.recommendations,
      execution_time_ms: analysis.executionTime,
    };
  },
};
```

---

## Package.json

```json
{
  "name": "@snapback/guardian-lite",
  "version": "0.1.0",
  "description": "Lightweight local code analysis for SnapBack",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { GuardianLite } from './guardian-lite';

describe('GuardianLite', () => {
  const guardian = new GuardianLite();

  it('should detect AWS keys', () => {
    const code = 'const key = "AKIAIOSFODNN7EXAMPLE";';
    const result = guardian.analyze(code);

    expect(result.riskLevel).toBe('high');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe('secret');
    expect(result.issues[0].severity).toBe('high');
    expect(result.issues[0].pattern).toBe('AWS_KEY');
  });

  it('should detect jest mocks', () => {
    const code = 'jest.mock("./module");';
    const result = guardian.analyze(code);

    expect(result.riskLevel).toBe('medium');
    expect(result.issues[0].type).toBe('mock');
  });

  it('should return none for clean code', () => {
    const code = 'const x = 1;\nfunction foo() { return x; }';
    const result = guardian.analyze(code);

    expect(result.riskLevel).toBe('none');
    expect(result.issues).toHaveLength(0);
    expect(result.confidence).toBe(0.95);
  });

  it('performance: <50ms for 1000 lines', () => {
    const code = 'const x = 1;\n'.repeat(1000);
    const start = performance.now();
    guardian.analyze(code);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });
});
```

---

## Implementation Status

**Current Status**: 🚧 Not yet implemented

**Expected Timeline**:
- Phase 2 of MCP bundling strategy
- After MCP lifecycle manager (Phase 1)
- Before API integration (Phase 3)

**Prerequisites**:
- ✅ MCP bundling functional
- ✅ TypeScript configuration in place
- ✅ Vitest testing setup

**Acceptance Criteria**:
- [ ] Package builds with `pnpm build`
- [ ] All 15 patterns detect correctly
- [ ] 100% test coverage
- [ ] Analysis <50ms for 1000 lines
- [ ] `"private": true` in package.json
- [ ] Clear TypeScript types exported
- [ ] README documents all patterns

---

## Related Documentation

- **MCP Bundling Strategy**: `docs/architecture/mcp-bundling-strategy.md`
- **Master Implementation Plan**: `docs/implementation/MASTER_IMPLEMENTATION_PLAN.md`
- **MCP Server**: `apps/mcp-server/CLAUDE.md`
- **AnalysisRouter**: `apps/mcp-server/src/services/AnalysisRouter.IMPLEMENTATION.ts`
- **SnapBack Architecture**: `CLAUDE.md`

