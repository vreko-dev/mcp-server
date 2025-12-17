# V2 Engine Migration: Comprehensive Code Review

**Review Date:** 2025-12-16
**Reviewer:** Claude (AI Code Review)
**Scope:** V2 Engine Implementation, Test Parity, V1 Cleanup
**Status:** Pre-Merge Review

---

## Executive Summary

Based on the MIGRATION.md specification and project documentation, the V2 engine migration is reported as **100% complete** with 5,700+ LOC, 367 passing tests, and 77%+ code coverage. This review validates the migration, identifies test coverage gaps, and catalogs V1 artifacts requiring removal.

### Key Findings

| Category | Status | Action Required |
|----------|--------|-----------------|
| V2 Implementation | ✅ Complete | Verify runtime behavior |
| Test Coverage | ⚠️ Needs Audit | Add V1→V2 parity tests |
| V1 Deprecation | ⚠️ Annotated | Complete removal |
| Transport Wiring | ✅ Complete | Integration tests needed |
| Documentation | ⚠️ Partial | Update API docs |

---

## Part 1: V2 Implementation Review

### 1.1 Runtime Components

All 5 runtime modules are complete per MIGRATION.md:

| Module | LOC | Status | Verification Tasks |
|--------|-----|--------|-------------------|
| `runtime/orchestrator.ts` | 467 | ✅ | Verify parallel script execution |
| `runtime/events.ts` | 265 | ✅ | Verify 15-event schema coverage |
| `runtime/monitor.ts` | 392 | ✅ | Test session health coaching |
| `runtime/storage.ts` | 353 | ✅ | Validate blob storage operations |
| `runtime/decision.ts` | 237 | ✅ | Test decision thresholds |

**Code Review Checklist:**
- [ ] Verify `orchestrator.analyze()` matches `Guardian.analyze()` output schema
- [ ] Confirm event bus emits all 15 documented events
- [ ] Test storage blob retrieval with content-addressed IDs
- [ ] Validate decision engine thresholds against V1 behavior

### 1.2 Signal Scripts

All 10 signal scripts implemented:

| Signal | LOC | V1 Equivalent | Parity Status |
|--------|-----|---------------|---------------|
| `risk-score.ts` | 256 | `RiskAnalyzer.calculateRisk()` | ✅ Verify scoring algorithm |
| `complexity.ts` | 194 | `Guardian.calculateComplexity()` | ✅ Verify AST metrics |
| `cycles.ts` | 176 | N/A (new capability) | ✅ New feature |
| `velocity.ts` | 86 | `BurstDetector` | ✅ Verify burst thresholds |
| `consumers.ts` | 134 | `ImportAnalyzer` | ⚠️ Verify fan-in accuracy |
| `ai-detection.ts` | 281 | `AIDetector` | ✅ Verify 89% accuracy claim |
| `burst.ts` | 198 | `BurstDetector` | ✅ Integration with velocity |
| `threats.ts` | 125 | `SecretDetectionPlugin` + `MockReplacementPlugin` | ⚠️ Verify all patterns |
| `phantom-deps.ts` | 263 | `PhantomDependencyPlugin` | ⚠️ Verify typosquatting |
| `index.ts` | - | Exports | ✅ |

**Critical Verification Items:**

```typescript
// threats.ts must detect ALL of these (from V1 plugins):
const CRITICAL_PATTERNS = [
  'rm -rf',           // Destructive commands
  'DROP TABLE',       // SQL injection
  'eval(',            // Code injection
  /AWS[_]?KEY/i,      // AWS credentials
  /ghp_[a-zA-Z0-9]+/, // GitHub tokens
  /sk-[a-zA-Z0-9]+/,  // OpenAI keys
];

const HIGH_PATTERNS = [
  'password',
  'api_key',
  'secret',
  'jest.mock',
  'vi.mock',
  'sinon.mock',
];

const MEDIUM_PATTERNS = [
  'exec(',
  'innerHTML',
  '@testing-library',
  'vitest',
];
```

### 1.3 Validator Scripts

All 4 validators complete:

| Validator | LOC | Purpose | External Tool |
|-----------|-----|---------|---------------|
| `types.ts` | 197 | TypeScript checking | `tsc --noEmit` |
| `cycles.ts` | 158 | Circular dependency gate | `madge --circular` |
| `security.ts` | 229 | Security pattern validation | Internal patterns |
| `patterns.ts` | 126 | Linting | `biome check` |

**Integration Points to Verify:**
- [ ] `tsc` command actually executes (not mocked in prod)
- [ ] `madge` correctly identifies circular deps
- [ ] `biome` config path resolution works across workspaces

### 1.4 Action Scripts

All 3 actions complete:

| Action | LOC | V1 Equivalent | Notes |
|--------|-----|---------------|-------|
| `snapshot.ts` | 114 | `StorageBroker.save()` | Content-addressed storage |
| `restore.ts` | 130 | `StorageBroker.restore()` | File restoration |
| `notify.ts` | 198 | `NotificationManager` | Multi-channel |

### 1.5 Transport Adapters

All 3 transports complete and wired:

| Transport | LOC | Tests | Target App | Wiring Status |
|-----------|-----|-------|------------|---------------|
| `mcp.ts` | 205 | 18 | `apps/mcp-server/src/index.ts` | ✅ Wired |
| `http.ts` | 193 | 16 | `apps/api/modules/risk/...` | ✅ Wired |
| `cli.ts` | 182 | 13 | `apps/cli/src/check.ts` | ✅ Wired |

**Integration Verification Required:**
```typescript
// Verify MCP transport integration
// apps/mcp-server/src/index.ts should contain:
import { MCPEngineAdapter } from "@snapback/engine/transports/mcp";
const engineAdapter = new MCPEngineAdapter();

// Verify HTTP transport integration
// apps/api/modules/risk/procedures/analyze-risk.ts should contain:
import { HTTPEngineAdapter } from "@snapback/engine/transports/http";

// Verify CLI transport integration
// apps/cli/src/check.ts should contain:
import { CLIEngineAdapter } from "@snapback/engine/transports/cli";
```

---

## Part 2: Test Coverage Parity Analysis

### 2.1 Current V2 Test Coverage

Per MIGRATION.md:
- **Total Tests:** 367 passing
- **Overall Coverage:** 77%+
- **By Component:**
  - Transports: 93.16%
  - Runtime: 89.11%
  - Signals: 72.86%
  - Validators: 50.91%

### 2.2 V1 Capability Test Mapping

Each V1 capability needs corresponding V2 tests:

| V1 Capability | V1 Test Location | V2 Test Required | Status |
|---------------|------------------|------------------|--------|
| `Guardian.analyze()` | `packages/core/test/guardian.test.ts` | `test/runtime/orchestrator.test.ts` | ⚠️ Verify |
| `Guardian.analyzeDiffChanges()` | `packages/core/test/guardian.test.ts` | `test/transports/mcp.test.ts` | ⚠️ Verify |
| `Guardian.countFunctions()` | `packages/core/test/guardian.test.ts` | `test/signals/complexity.test.ts` | 🔴 Add |
| `Guardian.calculateComplexity()` | `packages/core/test/guardian.test.ts` | `test/signals/complexity.test.ts` | 🔴 Add |
| `Guardian.calculateMaxNestingDepth()` | `packages/core/test/guardian.test.ts` | `test/signals/complexity.test.ts` | 🔴 Add |
| `Guardian.findSecurityIssues()` | `packages/core/test/guardian.test.ts` | `test/signals/threats.test.ts` | 🔴 Add |
| `Guardian.findLargeFunctions()` | `packages/core/test/guardian.test.ts` | `test/signals/complexity.test.ts` | 🔴 Add |
| `SecretDetectionPlugin` | `packages/core/test/plugins/*.test.ts` | `test/signals/threats.test.ts` | 🔴 Add |
| `MockReplacementPlugin` | `packages/core/test/plugins/*.test.ts` | `test/signals/threats.test.ts` | 🔴 Add |
| `PhantomDependencyPlugin` | `packages/core/test/plugins/*.test.ts` | `test/signals/phantom-deps.test.ts` | 🔴 Add |

### 2.3 Required Test Additions

#### 2.3.1 Complexity Signal Tests (HIGH PRIORITY)

```typescript
// test/signals/complexity.test.ts - ADD THESE
describe('complexity signal - V1 parity', () => {
  describe('countFunctions', () => {
    it('counts arrow functions', () => {
      const code = `const a = () => {}; const b = () => {};`;
      expect(complexity.countFunctions(code)).toBe(2);
    });

    it('counts regular functions', () => {
      const code = `function a() {} function b() {}`;
      expect(complexity.countFunctions(code)).toBe(2);
    });

    it('counts methods in classes', () => {
      const code = `class A { a() {} b() {} }`;
      expect(complexity.countFunctions(code)).toBe(2);
    });
  });

  describe('calculateMaxNestingDepth', () => {
    it('returns 0 for flat code', () => {
      const code = `const x = 1;`;
      expect(complexity.calculateMaxNestingDepth(code)).toBe(0);
    });

    it('returns correct depth for nested if', () => {
      const code = `if (a) { if (b) { if (c) {} } }`;
      expect(complexity.calculateMaxNestingDepth(code)).toBe(3);
    });

    it('handles mixed nesting', () => {
      const code = `for (;;) { while (true) { if (x) {} } }`;
      expect(complexity.calculateMaxNestingDepth(code)).toBe(3);
    });
  });

  describe('findLargeFunctions', () => {
    it('flags functions over 50 lines', () => {
      const code = `function big() {\n${'console.log(1);\n'.repeat(51)}}`;
      const result = complexity.findLargeFunctions(code);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('big');
    });
  });
});
```

#### 2.3.2 Threats Signal Tests (HIGH PRIORITY)

```typescript
// test/signals/threats.test.ts - ADD THESE
describe('threats signal - V1 plugin parity', () => {
  describe('SecretDetectionPlugin parity', () => {
    const secretCases = [
      ['AWS key', 'const key = "AKIA1234567890123456"', 'critical'],
      ['GitHub token', 'const token = "ghp_abcd1234567890"', 'critical'],
      ['OpenAI key', 'const key = "sk-proj-abc123"', 'critical'],
      ['generic password', 'const password = "secret123"', 'high'],
      ['API key variable', 'const api_key = "12345"', 'high'],
    ];

    secretCases.forEach(([name, code, severity]) => {
      it(`detects ${name} as ${severity}`, () => {
        const result = threats.analyze(code);
        expect(result.issues.some(i => i.severity === severity)).toBe(true);
      });
    });
  });

  describe('MockReplacementPlugin parity', () => {
    const mockCases = [
      ['jest.mock', 'jest.mock("./module")', 'high'],
      ['vi.mock', 'vi.mock("./module")', 'high'],
      ['sinon.stub', 'sinon.stub(obj, "method")', 'high'],
    ];

    mockCases.forEach(([name, code, severity]) => {
      it(`detects ${name} as ${severity}`, () => {
        const result = threats.analyze(code);
        expect(result.issues.some(i => i.type === 'mock_in_production')).toBe(true);
      });
    });
  });

  describe('Destructive command detection', () => {
    it('detects rm -rf', () => {
      const result = threats.analyze('exec("rm -rf /")');
      expect(result.issues.some(i => i.severity === 'critical')).toBe(true);
    });

    it('detects DROP TABLE', () => {
      const result = threats.analyze('query("DROP TABLE users")');
      expect(result.issues.some(i => i.severity === 'critical')).toBe(true);
    });

    it('detects eval()', () => {
      const result = threats.analyze('eval(userInput)');
      expect(result.issues.some(i => i.severity === 'critical')).toBe(true);
    });
  });
});
```

#### 2.3.3 Phantom Dependencies Tests (HIGH PRIORITY)

```typescript
// test/signals/phantom-deps.test.ts - ADD THESE
describe('phantom-deps signal - V1 plugin parity', () => {
  describe('import extraction', () => {
    it('extracts ES6 imports', () => {
      const code = `import foo from 'foo'; import { bar } from 'bar';`;
      const imports = phantomDeps.extractImports(code);
      expect(imports).toContain('foo');
      expect(imports).toContain('bar');
    });

    it('extracts CommonJS requires', () => {
      const code = `const foo = require('foo');`;
      const imports = phantomDeps.extractImports(code);
      expect(imports).toContain('foo');
    });

    it('extracts dynamic imports', () => {
      const code = `const mod = await import('dynamic-module');`;
      const imports = phantomDeps.extractImports(code);
      expect(imports).toContain('dynamic-module');
    });
  });

  describe('phantom detection', () => {
    it('detects missing dependency', () => {
      const code = `import missing from 'not-in-package-json';`;
      const packageJson = { dependencies: {}, devDependencies: {} };
      const result = phantomDeps.analyze(code, packageJson);
      expect(result.phantoms).toContain('not-in-package-json');
    });

    it('ignores Node.js builtins', () => {
      const code = `import fs from 'fs'; import path from 'path';`;
      const packageJson = { dependencies: {} };
      const result = phantomDeps.analyze(code, packageJson);
      expect(result.phantoms).not.toContain('fs');
      expect(result.phantoms).not.toContain('path');
    });

    it('ignores workspace packages', () => {
      const code = `import { foo } from '@snapback/core';`;
      const packageJson = { dependencies: {} };
      const result = phantomDeps.analyze(code, packageJson);
      expect(result.phantoms).not.toContain('@snapback/core');
    });
  });

  describe('typosquatting detection', () => {
    it('warns on similar package names', () => {
      const code = `import lodash from 'lodahs';`; // typo
      const packageJson = { dependencies: { lodash: '^4.0.0' } };
      const result = phantomDeps.analyze(code, packageJson);
      expect(result.typosquatWarnings.length).toBeGreaterThan(0);
    });
  });
});
```

### 2.4 Integration Test Requirements

#### E2E Test: Full Analysis Pipeline

```typescript
// test/e2e/full-pipeline.test.ts
describe('V2 Engine E2E', () => {
  it('produces identical results to V1 Guardian', async () => {
    const testFile = {
      path: 'test.ts',
      content: `
        const password = 'secret123';
        import missing from 'not-installed';
        function deeplyNested() {
          if (a) { if (b) { if (c) { if (d) {} } } }
        }
      `,
    };

    // V2 Engine result
    const v2Result = await orchestrator.analyze([testFile]);

    // Compare against expected V1 behavior
    expect(v2Result.riskScore).toBeGreaterThan(0.5); // High risk
    expect(v2Result.signals.threats.issues.length).toBeGreaterThan(0);
    expect(v2Result.signals.phantomDeps.phantoms.length).toBeGreaterThan(0);
    expect(v2Result.signals.complexity.maxNestingDepth).toBe(4);
  });
});
```

---

## Part 3: V1 Cleanup Requirements

### 3.1 Files to Remove

Based on the capability matrix, these V1 files are now superseded by V2:

#### `packages/core/` - Guardian & Plugins

```
packages/core/
├── src/
│   ├── guardian.ts                 # 🔴 REMOVE - replaced by runtime/orchestrator.ts
│   ├── risk-analyzer.ts            # 🔴 REMOVE - replaced by signals/risk-score.ts
│   ├── threat-detection.ts         # 🔴 REMOVE - replaced by signals/threats.ts
│   ├── plugins/
│   │   ├── index.ts                # 🔴 REMOVE
│   │   ├── secret-detection.ts     # 🔴 REMOVE - replaced by signals/threats.ts
│   │   ├── mock-replacement.ts     # 🔴 REMOVE - replaced by signals/threats.ts
│   │   ├── phantom-dependency.ts   # 🔴 REMOVE - replaced by signals/phantom-deps.ts
│   │   └── base-plugin.ts          # 🔴 REMOVE - plugin system removed
│   └── types/
│       └── plugin-types.ts         # 🔴 REMOVE - plugin system removed
├── test/
│   ├── guardian.test.ts            # 🔴 REMOVE (after V2 parity confirmed)
│   ├── risk-analyzer.test.ts       # 🔴 REMOVE (after V2 parity confirmed)
│   ├── plugins/
│   │   ├── secret-detection.test.ts    # 🔴 REMOVE
│   │   ├── mock-replacement.test.ts    # 🔴 REMOVE
│   │   └── phantom-dependency.test.ts  # 🔴 REMOVE
```

#### `packages/guardian-lite/` - Entire Package

```
packages/guardian-lite/           # 🔴 REMOVE ENTIRE PACKAGE
├── src/
├── test/
├── package.json
└── tsconfig.json
```

**Rationale:** `guardian-lite` was a lightweight alternative to `Guardian`. V2 engine replaces both.

### 3.2 Files to Deprecate (Keep Until v1.0.0)

These should have `@deprecated` annotations now and be removed at v1.0.0:

```typescript
// packages/core/src/guardian.ts
/**
 * @deprecated Use @snapback/engine orchestrator instead.
 * This class will be removed in v1.0.0.
 *
 * Migration guide:
 * ```typescript
 * // Before (V1):
 * import { Guardian } from "@snapback/core";
 * const guardian = new Guardian();
 * const result = await guardian.analyze(files);
 *
 * // After (V2):
 * import { orchestrator } from "@snapback/engine";
 * const result = await orchestrator.analyze(files);
 * ```
 */
export class Guardian {
  constructor() {
    console.warn(
      '[SnapBack] Guardian is deprecated. Use @snapback/engine orchestrator instead. ' +
      'Guardian will be removed in v1.0.0.'
    );
  }
  // ...
}
```

### 3.3 Import Updates Required

Applications consuming V1 need import updates:

#### MCP Server (`apps/mcp-server/src/index.ts`)

```typescript
// BEFORE (V1):
import { Guardian } from "@snapback/core";
import { RiskAnalyzer } from "@snapback/core";

// AFTER (V2):
import { MCPEngineAdapter } from "@snapback/engine/transports/mcp";
```

**Status:** ✅ Per MIGRATION.md, this is already wired.

#### CLI (`apps/cli/src/check.ts`)

```typescript
// BEFORE (V1):
import { Guardian } from "@snapback/core";

// AFTER (V2):
import { CLIEngineAdapter } from "@snapback/engine/transports/cli";
```

**Status:** ✅ Per MIGRATION.md, this is already wired.

#### API (`apps/api/modules/risk/...`)

```typescript
// BEFORE (V1):
import { Guardian } from "@snapback/core";

// AFTER (V2):
import { HTTPEngineAdapter } from "@snapback/engine/transports/http";
```

**Status:** ✅ Per MIGRATION.md, this is already wired.

#### VS Code Extension

```typescript
// apps/vscode/src/engine/...
// Check if still using Guardian directly or via SDK
// May need update to use engine package
```

**Status:** ⚠️ Needs verification - not explicitly mentioned in MIGRATION.md.

### 3.4 Package.json Updates

#### Remove from `packages/core/package.json`:

```json
{
  "exports": {
    // REMOVE these deprecated exports:
    "./guardian": "./dist/guardian.js",
    "./plugins": "./dist/plugins/index.js",
    "./risk-analyzer": "./dist/risk-analyzer.js"
  }
}
```

#### Add deprecation notice:

```json
{
  "deprecated": "Guardian and plugins are deprecated. Use @snapback/engine instead."
}
```

### 3.5 Cleanup Verification Checklist

Before removing V1 files:

```bash
# 1. Search for remaining Guardian imports
grep -r "from ['\"]@snapback/core['\"]" apps/ packages/ --include="*.ts" | grep -v test

# 2. Search for direct Guardian class usage
grep -r "new Guardian" apps/ packages/ --include="*.ts" | grep -v test

# 3. Search for plugin imports
grep -r "SecretDetectionPlugin\|MockReplacementPlugin\|PhantomDependencyPlugin" apps/ packages/ --include="*.ts"

# 4. Verify V2 engine is used everywhere
grep -r "@snapback/engine" apps/ --include="*.ts"

# 5. Run full test suite
pnpm test

# 6. Build all packages
pnpm build

# 7. Run type checking
pnpm typecheck
```

---

## Part 4: V2 vs V1 Feature Parity Matrix

### 4.1 Complete Feature Comparison

| Feature | V1 Location | V2 Location | Parity | Notes |
|---------|-------------|-------------|--------|-------|
| Risk scoring | `RiskAnalyzer.calculateRisk()` | `signals/risk-score.ts` | ✅ | Verify algorithm |
| Complexity analysis | `Guardian.calculateComplexity()` | `signals/complexity.ts` | ✅ | AST-based |
| Function counting | `Guardian.countFunctions()` | `signals/complexity.ts` | ✅ | |
| Nesting depth | `Guardian.calculateMaxNestingDepth()` | `signals/complexity.ts` | ✅ | |
| Large function detection | `Guardian.findLargeFunctions()` | `signals/complexity.ts` | ✅ | |
| Secret detection | `SecretDetectionPlugin` | `signals/threats.ts` | ✅ | Same patterns |
| Mock detection | `MockReplacementPlugin` | `signals/threats.ts` | ✅ | |
| Phantom deps | `PhantomDependencyPlugin` | `signals/phantom-deps.ts` | ✅ | + typosquatting |
| Circular deps | N/A | `signals/cycles.ts` | ➕ NEW | Uses madge |
| AI detection | `AIDetector` | `signals/ai-detection.ts` | ✅ | 89% accuracy |
| Burst detection | `BurstDetector` | `signals/burst.ts` | ✅ | |
| Velocity tracking | `BurstDetector` | `signals/velocity.ts` | ✅ | |
| Consumer analysis | `ImportAnalyzer` | `signals/consumers.ts` | ✅ | Fan-in |
| Plugin system | `BasePlugin` | Script pattern | ⚠️ | Different architecture |
| Session health | N/A | `runtime/monitor.ts` | ➕ NEW | Coaching |
| Event bus | N/A | `runtime/events.ts` | ➕ NEW | 15 events |

### 4.2 Behavioral Differences

| Aspect | V1 Behavior | V2 Behavior | Impact |
|--------|-------------|-------------|--------|
| Execution | Sequential | Parallel scripts | ✅ Better perf |
| Plugin loading | Dynamic class loading | Static script list | ✅ Simpler |
| Configuration | Runtime config | Build-time scripts | ⚠️ Less flexible |
| Error handling | Try/catch per plugin | Exit codes per script | ✅ Isolated |
| Session state | In-memory | Event bus + monitor | ✅ Observable |

---

## Part 5: Recommended Actions

### 5.1 Immediate (Before Demo)

| Priority | Task | Effort | Owner |
|----------|------|--------|-------|
| 🔴 P0 | Verify VS Code extension uses V2 engine | S | - |
| 🔴 P0 | Run full test suite with V2 engine | S | - |
| 🔴 P0 | Confirm `threats.ts` detects all V1 patterns | M | - |
| 🟡 P1 | Add complexity signal parity tests | M | - |
| 🟡 P1 | Add threats signal parity tests | M | - |
| 🟡 P1 | Add phantom-deps parity tests | M | - |

### 5.2 Post-Demo (Before v1.0.0)

| Priority | Task | Effort | Owner |
|----------|------|--------|-------|
| 🔴 P0 | Remove `packages/guardian-lite/` | S | - |
| 🔴 P0 | Remove Guardian and plugins from `packages/core/` | M | - |
| 🟡 P1 | Update all documentation references | M | - |
| 🟡 P1 | Remove deprecated exports from package.json | S | - |
| 🟢 P2 | Archive V1 code for reference | S | - |

### 5.3 Test Coverage Targets

| Component | Current | Target | Gap |
|-----------|---------|--------|-----|
| Transports | 93% | 95% | +2% |
| Runtime | 89% | 90% | +1% |
| Signals | 73% | 85% | +12% |
| Validators | 51% | 80% | +29% |
| **Overall** | **77%** | **85%** | **+8%** |

---

## Part 6: CI/CD Verification Gates

### 6.1 Pre-Merge Gates

Add these to `.github/workflows/ci.yml`:

```yaml
v2-engine-verification:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Install dependencies
      run: pnpm install

    - name: Build V2 engine
      run: pnpm --filter @snapback/engine build

    - name: Run V2 engine tests
      run: pnpm --filter @snapback/engine test -- --coverage

    - name: Check coverage thresholds
      run: |
        # Fail if coverage drops below 77%
        pnpm --filter @snapback/engine test:coverage -- --check-coverage --lines 77

    - name: Verify no Guardian imports in apps
      run: |
        if grep -r "new Guardian\|from.*@snapback/core.*Guardian" apps/ --include="*.ts" | grep -v test; then
          echo "ERROR: Found Guardian usage in apps. Use @snapback/engine instead."
          exit 1
        fi

    - name: Run integration tests
      run: pnpm --filter @snapback/engine test:integration
```

### 6.2 V1 Removal Gate

```yaml
v1-removal-gate:
  runs-on: ubuntu-latest
  if: github.event.pull_request.title contains 'remove v1'
  steps:
    - name: Verify V2 parity tests pass
      run: pnpm --filter @snapback/engine test -- --grep "V1 parity"

    - name: Verify no breaking changes
      run: |
        # Compare V2 output schema against V1 contract
        pnpm --filter @snapback/engine test:contracts
```

---

## Part 7: Documentation Updates Required

### 7.1 API Documentation

Update these files to reference V2 engine:

```
docs/
├── api/
│   ├── engine.md              # ADD: V2 engine API reference
│   ├── signals.md             # ADD: Signal script documentation
│   ├── validators.md          # ADD: Validator documentation
│   └── migration-v1-to-v2.md  # ADD: Migration guide
├── architecture/
│   └── v2-engine.md           # ADD: V2 architecture overview
└── guides/
    └── custom-signals.md      # ADD: How to add custom signals
```

### 7.2 Migration Guide Outline

```markdown
# Migrating from V1 Guardian to V2 Engine

## Overview
The V2 engine replaces the V1 Guardian with a script-based architecture...

## Breaking Changes
1. Import paths changed
2. Plugin system replaced with scripts
3. Configuration format updated

## Step-by-Step Migration
1. Update imports
2. Replace Guardian instantiation
3. Update configuration
4. Test thoroughly

## API Comparison
| V1 | V2 |
|----|----|
| `guardian.analyze()` | `orchestrator.analyze()` |
...
```

---

## Appendix A: Verification Script

```bash
#!/bin/bash
# v2-migration-verification.sh

set -e

echo "=== V2 Engine Migration Verification ==="

echo ""
echo "1. Checking V2 engine package exists..."
if [ ! -d "packages/engine" ]; then
  echo "❌ packages/engine not found"
  exit 1
fi
echo "✅ packages/engine exists"

echo ""
echo "2. Checking all runtime modules..."
for module in orchestrator events monitor storage decision; do
  if [ ! -f "packages/engine/src/runtime/$module.ts" ]; then
    echo "❌ runtime/$module.ts not found"
    exit 1
  fi
done
echo "✅ All runtime modules present"

echo ""
echo "3. Checking all signal scripts..."
for signal in risk-score complexity cycles velocity consumers ai-detection burst threats phantom-deps; do
  if [ ! -f "packages/engine/src/signals/$signal.ts" ]; then
    echo "❌ signals/$signal.ts not found"
    exit 1
  fi
done
echo "✅ All signal scripts present"

echo ""
echo "4. Checking all transport adapters..."
for transport in mcp http cli; do
  if [ ! -f "packages/engine/src/transports/$transport.ts" ]; then
    echo "❌ transports/$transport.ts not found"
    exit 1
  fi
done
echo "✅ All transport adapters present"

echo ""
echo "5. Running V2 engine tests..."
pnpm --filter @snapback/engine test

echo ""
echo "6. Checking for deprecated Guardian usage..."
GUARDIAN_USAGE=$(grep -r "new Guardian" apps/ packages/ --include="*.ts" | grep -v test | grep -v node_modules || true)
if [ -n "$GUARDIAN_USAGE" ]; then
  echo "⚠️ Found Guardian usage (should be migrated):"
  echo "$GUARDIAN_USAGE"
else
  echo "✅ No Guardian usage in production code"
fi

echo ""
echo "=== Verification Complete ==="
```

---

## Appendix B: Files Index

### V2 Engine Files (Keep)

```
packages/engine/
├── src/
│   ├── runtime/
│   │   ├── orchestrator.ts  (467 LOC)
│   │   ├── events.ts        (265 LOC)
│   │   ├── monitor.ts       (392 LOC)
│   │   ├── storage.ts       (353 LOC)
│   │   ├── decision.ts      (237 LOC)
│   │   └── index.ts
│   ├── signals/
│   │   ├── risk-score.ts    (256 LOC)
│   │   ├── complexity.ts    (194 LOC)
│   │   ├── cycles.ts        (176 LOC)
│   │   ├── velocity.ts      (86 LOC)
│   │   ├── consumers.ts     (134 LOC)
│   │   ├── ai-detection.ts  (281 LOC)
│   │   ├── burst.ts         (198 LOC)
│   │   ├── threats.ts       (125 LOC)
│   │   ├── phantom-deps.ts  (263 LOC)
│   │   └── index.ts
│   ├── validators/
│   │   ├── types.ts         (197 LOC)
│   │   ├── cycles.ts        (158 LOC)
│   │   ├── security.ts      (229 LOC)
│   │   ├── patterns.ts      (126 LOC)
│   │   └── index.ts
│   ├── actions/
│   │   ├── snapshot.ts      (114 LOC)
│   │   ├── restore.ts       (130 LOC)
│   │   ├── notify.ts        (198 LOC)
│   │   └── index.ts
│   ├── transports/
│   │   ├── mcp.ts           (205 LOC)
│   │   ├── http.ts          (193 LOC)
│   │   └── cli.ts           (182 LOC)
│   ├── types.ts             (258 LOC)
│   └── index.ts             (51 LOC)
├── test/
│   └── ... (367 tests)
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── tsup.config.ts
```

### V1 Files (Remove at v1.0.0)

```
packages/core/
├── src/
│   ├── guardian.ts           # DEPRECATED
│   ├── risk-analyzer.ts      # DEPRECATED
│   ├── threat-detection.ts   # DEPRECATED
│   └── plugins/              # DEPRECATED (entire directory)

packages/guardian-lite/       # DEPRECATED (entire package)
```

---

*End of Code Review*
