# SnapBack Platform Architecture Remediation

## Implementation Prompt

**Objective**: Systematically resolve 13 architectural violations identified in the platform audit, discover additional issues while refactoring, and establish comprehensive test coverage aligned with existing patterns.

**Timeline**: 2-4 weeks across 3 phases
**Coverage Target**: 80%+ for all modified code

---

## Pre-Implementation Checklist

Before starting each phase:
- [ ] Run existing test suite to establish baseline: `pnpm test`
- [ ] Note any failing tests (these may indicate violations)
- [ ] Create a new branch: `fix/architecture-remediation-phase-N`
- [ ] Document current behavior before changes

---

## Phase 1: Critical Trust Fixes (Week 1)

### Task 1.1: Remove VscodeStorageAdapter Trust Violation

**File**: `apps/vscode/src/snapshot/SessionCoordinator.ts`
**Lines**: 55-61 (approximately)
**Violation**: Adapter doesn't trust SDK's session finalization decision

#### Current Code (REMOVE):
```typescript
// REMOVE THIS BLOCK - Trust SDK's decision
if (files.length === 0) {
    console.log("[VscodeStorageAdapter] Skipping empty session (0 files)");
    return; // Don't create a session with 0 files
}
```

#### Correct Pattern:
```typescript
async storeSessionManifest(manifest: SessionManifest | null): Promise<void> {
    // Trust SDK decision completely
    if (!manifest) {
        // SDK said no session - we comply without question
        return;
    }

    // SDK said store - we store (HOW, not WHETHER)
    await this.storage.finalizeSession(manifest);
}
```

#### While You're There - Check For:
1. **Other null-check overrides**: Search for `if (manifest === null` or `if (!manifest` with additional logic
2. **Logging that implies distrust**: `"Skipping..."` or `"Ignoring..."` messages
3. **Default value assignments**: `manifest ?? defaultManifest`
4. **Try-catch that swallows SDK decisions**

#### Test Requirements:

**File**: `apps/vscode/test/unit/adapters/VscodeStorageAdapter.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VscodeStorageAdapter } from '../../../src/adapters/VscodeStorageAdapter';

describe('VscodeStorageAdapter', () => {
    describe('Trust Chain Compliance', () => {
        it('should NOT store when SDK returns null', async () => {
            const mockStorage = { finalizeSession: vi.fn() };
            const adapter = new VscodeStorageAdapter(mockStorage);

            await adapter.storeSessionManifest(null);

            expect(mockStorage.finalizeSession).not.toHaveBeenCalled();
        });

        it('should store exactly what SDK provides without modification', async () => {
            const mockStorage = { finalizeSession: vi.fn() };
            const adapter = new VscodeStorageAdapter(mockStorage);
            const manifest = {
                id: 'sess-123',
                files: [{ path: '/test.ts' }],
                // Even with unusual data, adapter trusts SDK
                startedAt: 0,
                endedAt: 0
            };

            await adapter.storeSessionManifest(manifest);

            expect(mockStorage.finalizeSession).toHaveBeenCalledWith(manifest);
        });

        it('should NOT have any conditional logic based on manifest content', async () => {
            const mockStorage = { finalizeSession: vi.fn() };
            const adapter = new VscodeStorageAdapter(mockStorage);

            // Even empty files array - SDK decided to create session
            const manifestWithEmptyFiles = {
                id: 'sess-456',
                files: [],
                startedAt: Date.now(),
                endedAt: Date.now()
            };

            await adapter.storeSessionManifest(manifestWithEmptyFiles);

            // Adapter MUST store - it doesn't second-guess SDK
            expect(mockStorage.finalizeSession).toHaveBeenCalledWith(manifestWithEmptyFiles);
        });
    });
});
```

---

### Task 1.2: Consolidate Protected File State (Critical Refactor)

**Problem**: Two sources of truth for protected files
- SDK: `packages/sdk/src/protection/ProtectionManager.ts`
- VSCode: `apps/vscode/src/services/protectedFileRegistry.ts`

#### Step 1: Audit Current Usage

Run these searches to understand the scope:

```bash
# Find all isProtected calls in VSCode
grep -rn "isProtected\|\.isProtected" apps/vscode/src/

# Find all ProtectedFileRegistry references
grep -rn "ProtectedFileRegistry\|protectedFileRegistry" apps/vscode/src/

# Find SDK ProtectionManager usage
grep -rn "ProtectionManager\|protectionManager" apps/vscode/src/
```

#### Step 2: Define Single Source of Truth

**SDK owns the decision** (packages/sdk/src/protection/ProtectionManager.ts):
```typescript
export interface IProtectionManager {
    // DECISIONS (SDK owns)
    isProtected(filePath: string): boolean;
    getProtectionLevel(filePath: string): ProtectionLevel;
    evaluateRisk(filePath: string, context: RiskContext): RiskScore;
    shouldSnapshot(filePath: string, trigger: SnapshotTrigger): boolean;

    // STATE MANAGEMENT (SDK owns)
    registerFile(filePath: string, level: ProtectionLevel): void;
    unregisterFile(filePath: string): void;
    getProtectedFiles(): ProtectedFile[];
}
```

**VSCode provides storage adapter** (new file):
```typescript
// apps/vscode/src/adapters/VscodeProtectionStorageAdapter.ts
export class VscodeProtectionStorageAdapter implements IProtectionStorageAdapter {
    // HOW to persist (VSCode owns)
    async loadProtectedFiles(): Promise<ProtectedFile[]> {
        // Read from VSCode storage/workspace
    }

    async saveProtectedFiles(files: ProtectedFile[]): Promise<void> {
        // Write to VSCode storage/workspace
    }

    // VSCode-specific concerns
    async syncWithWorkspace(): Promise<void> {
        // Scan .snapbackprotected, etc.
    }
}
```

#### Step 3: Transform ProtectedFileRegistry to Thin Adapter

**Before** (apps/vscode/src/services/protectedFileRegistry.ts):
```typescript
// WRONG: VSCode making protection decisions
export class ProtectedFileRegistry {
    private cachedFiles: ProtectedFileEntry[] = [];
    private protectedPathsIndex = new Set<string>();

    isProtected(filePath: string): boolean {
        // VSCode deciding protection - VIOLATION
        return this.protectedPathsIndex.has(filePath);
    }
}
```

**After**:
```typescript
// RIGHT: VSCode delegating to SDK
export class ProtectedFileRegistry {
    constructor(
        private sdkProtectionManager: IProtectionManager,
        private storageAdapter: VscodeProtectionStorageAdapter
    ) {}

    // Delegate to SDK
    isProtected(filePath: string): boolean {
        return this.sdkProtectionManager.isProtected(filePath);
    }

    // VSCode-specific UI helpers (NOT decisions)
    getProtectedFilesForTreeView(): ProtectedFileTreeItem[] {
        const files = this.sdkProtectionManager.getProtectedFiles();
        return files.map(f => this.toTreeItem(f));
    }
}
```

#### While You're There - Check For:
1. **Duplicate maps/sets**: `protectedPathsIndex`, `cachedFiles`, `registry`
2. **Redundant state sync**: Code syncing VSCode state with SDK state
3. **Protection level evaluation**: Should only be in SDK
4. **File watching logic**: May need to feed events TO SDK, not decide locally

#### Test Requirements:

**File**: `apps/vscode/test/integration/protection/protection-delegation.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Protection Delegation', () => {
    describe('ProtectedFileRegistry delegates to SDK', () => {
        it('should call SDK ProtectionManager for isProtected', async () => {
            const mockSdkManager = {
                isProtected: vi.fn().mockReturnValue(true),
                getProtectedFiles: vi.fn().mockReturnValue([])
            };

            const registry = new ProtectedFileRegistry(mockSdkManager, mockStorageAdapter);

            const result = registry.isProtected('/src/index.ts');

            expect(mockSdkManager.isProtected).toHaveBeenCalledWith('/src/index.ts');
            expect(result).toBe(true);
        });

        it('should NOT cache or override SDK decisions', async () => {
            const mockSdkManager = {
                isProtected: vi.fn()
                    .mockReturnValueOnce(true)
                    .mockReturnValueOnce(false), // SDK changed its mind
                getProtectedFiles: vi.fn().mockReturnValue([])
            };

            const registry = new ProtectedFileRegistry(mockSdkManager, mockStorageAdapter);

            expect(registry.isProtected('/src/index.ts')).toBe(true);
            expect(registry.isProtected('/src/index.ts')).toBe(false);

            // Registry must call SDK each time, not cache
            expect(mockSdkManager.isProtected).toHaveBeenCalledTimes(2);
        });
    });

    describe('Single Source of Truth', () => {
        it('should have NO local isProtected logic', () => {
            // This is a code structure test
            const registrySource = fs.readFileSync(
                'apps/vscode/src/services/protectedFileRegistry.ts',
                'utf-8'
            );

            // Should NOT contain local protection decision patterns
            expect(registrySource).not.toMatch(/protectedPathsIndex\.has/);
            expect(registrySource).not.toMatch(/cachedFiles\.find/);
            expect(registrySource).not.toMatch(/this\.registry\.get/);
        });
    });
});
```

**Contract Test** (packages/sdk/test/contracts/protection-manager.contract.ts):
```typescript
import { describe, it, expect } from 'vitest';
import { ProtectionManager } from '../../src/protection/ProtectionManager';

describe('ProtectionManager Contract', () => {
    describe('isProtected', () => {
        it('should return boolean for any valid path', () => {
            const manager = new ProtectionManager();

            expect(typeof manager.isProtected('/any/path')).toBe('boolean');
            expect(typeof manager.isProtected('')).toBe('boolean');
            expect(typeof manager.isProtected('relative/path')).toBe('boolean');
        });

        it('should be deterministic for same state', () => {
            const manager = new ProtectionManager();
            manager.registerFile('/src/index.ts', 'Protected');

            const result1 = manager.isProtected('/src/index.ts');
            const result2 = manager.isProtected('/src/index.ts');

            expect(result1).toBe(result2);
        });
    });

    describe('getProtectionLevel', () => {
        it('should return ProtectionLevel enum value', () => {
            const manager = new ProtectionManager();
            manager.registerFile('/src/index.ts', 'Protected');

            const level = manager.getProtectionLevel('/src/index.ts');

            expect(['Watch', 'Warn', 'Block', 'Protected', 'Ignored']).toContain(level);
        });
    });
});
```

---

### Task 1.3: Extract shouldSnapshot Decision to SDK

**Problem**: VSCode's `ProtectionLevelHandler` decides `shouldSnapshot`
**Solution**: SDK owns this decision, VSCode only executes

#### Step 1: Create SDK Decision Engine

**File**: `packages/sdk/src/protection/ProtectionDecisionEngine.ts`

```typescript
import { THRESHOLDS } from '../constants';
import type { RiskContext, ProtectionDecision } from '../types';

export interface ProtectionDecision {
    shouldSnapshot: boolean;
    shouldProceed: boolean;
    reason: string;
    riskScore: number;
    recommendations: string[];
}

export class ProtectionDecisionEngine {
    constructor(
        private protectionManager: IProtectionManager,
        private riskAnalyzer: IRiskAnalyzer
    ) {}

    /**
     * THE decision point for all protection logic
     * VSCode/CLI/MCP should call this, not implement their own
     */
    evaluate(context: {
        filePath: string;
        trigger: 'save' | 'manual' | 'ai-detected';
        changeMetrics?: ChangeMetrics;
        aiContext?: AIDetectionContext;
    }): ProtectionDecision {
        const protectionLevel = this.protectionManager.getProtectionLevel(context.filePath);
        const riskScore = this.riskAnalyzer.analyze(context);

        // CENTRALIZED decision logic
        const shouldSnapshot = this.determineShouldSnapshot(protectionLevel, riskScore, context);
        const shouldProceed = this.determineShouldProceed(protectionLevel, riskScore);

        return {
            shouldSnapshot,
            shouldProceed,
            reason: this.buildReason(protectionLevel, riskScore),
            riskScore,
            recommendations: this.buildRecommendations(protectionLevel, riskScore)
        };
    }

    private determineShouldSnapshot(
        level: ProtectionLevel,
        riskScore: number,
        context: EvaluationContext
    ): boolean {
        // ALL snapshot decision logic lives HERE
        if (level === 'Ignored') return false;
        if (level === 'Block') return true; // Always snapshot before block
        if (context.trigger === 'ai-detected') return true;
        if (riskScore >= THRESHOLDS.HIGH_RISK) return true;
        if (level === 'Protected' || level === 'Warn') return riskScore >= THRESHOLDS.MEDIUM_RISK;
        return false;
    }

    private determineShouldProceed(level: ProtectionLevel, riskScore: number): boolean {
        if (level === 'Block' && riskScore >= THRESHOLDS.CRITICAL_RISK) return false;
        return true;
    }
}
```

#### Step 2: Simplify VSCode ProtectionLevelHandler

**Before** (apps/vscode/src/handlers/ProtectionLevelHandler.ts):
```typescript
// WRONG: VSCode making snapshot decisions
export class ProtectionLevelHandler {
    async handle(context: SaveContext): Promise<ProtectionHandlingResult> {
        // Complex decision logic that should be in SDK
        const level = this.registry.getProtectionLevel(context.filePath);
        const shouldSnapshot = this.evaluateSnapshotNeed(level, context);
        const shouldProceed = this.evaluateProceedDecision(level, context);
        // ... lots of business logic
    }
}
```

**After**:
```typescript
// RIGHT: VSCode executing SDK decisions
export class ProtectionLevelHandler {
    constructor(private sdkDecisionEngine: ProtectionDecisionEngine) {}

    async handle(context: SaveContext): Promise<ProtectionHandlingResult> {
        // Delegate decision to SDK
        const decision = this.sdkDecisionEngine.evaluate({
            filePath: context.filePath,
            trigger: context.trigger,
            changeMetrics: context.metrics,
            aiContext: context.aiDetection
        });

        // Execute the decision (VSCode's job)
        if (decision.shouldSnapshot) {
            await this.executeSnapshot(context);
        }

        if (!decision.shouldProceed) {
            await this.showBlockNotification(decision);
        }

        return {
            shouldProceed: decision.shouldProceed,
            shouldSnapshot: decision.shouldSnapshot,
            reason: decision.reason
        };
    }

    // VSCode owns HOW to snapshot, not WHETHER
    private async executeSnapshot(context: SaveContext): Promise<void> {
        // ...
    }
}
```

#### While You're There - Check For:
1. **Risk scoring logic**: Should be in SDK's `RiskAnalyzer`
2. **AI detection evaluation**: Should call SDK, not implement locally
3. **Threshold comparisons**: Should use `THRESHOLDS` from SDK
4. **Protection level switches**: Large switch statements indicate local decisions

#### Test Requirements:

**File**: `packages/sdk/test/unit/protection/ProtectionDecisionEngine.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ProtectionDecisionEngine } from '../../../src/protection/ProtectionDecisionEngine';
import { THRESHOLDS } from '../../../src/constants';

describe('ProtectionDecisionEngine', () => {
    let engine: ProtectionDecisionEngine;
    let mockProtectionManager: MockProtectionManager;
    let mockRiskAnalyzer: MockRiskAnalyzer;

    beforeEach(() => {
        mockProtectionManager = createMockProtectionManager();
        mockRiskAnalyzer = createMockRiskAnalyzer();
        engine = new ProtectionDecisionEngine(mockProtectionManager, mockRiskAnalyzer);
    });

    describe('shouldSnapshot decision', () => {
        it('should return true for AI-detected triggers regardless of risk', () => {
            mockProtectionManager.getProtectionLevel.mockReturnValue('Watch');
            mockRiskAnalyzer.analyze.mockReturnValue(0); // Zero risk

            const decision = engine.evaluate({
                filePath: '/src/index.ts',
                trigger: 'ai-detected'
            });

            expect(decision.shouldSnapshot).toBe(true);
        });

        it('should return true when risk exceeds HIGH_RISK threshold', () => {
            mockProtectionManager.getProtectionLevel.mockReturnValue('Protected');
            mockRiskAnalyzer.analyze.mockReturnValue(THRESHOLDS.HIGH_RISK + 0.1);

            const decision = engine.evaluate({
                filePath: '/src/index.ts',
                trigger: 'save'
            });

            expect(decision.shouldSnapshot).toBe(true);
        });

        it('should return false for Ignored files', () => {
            mockProtectionManager.getProtectionLevel.mockReturnValue('Ignored');
            mockRiskAnalyzer.analyze.mockReturnValue(THRESHOLDS.CRITICAL_RISK); // Even high risk

            const decision = engine.evaluate({
                filePath: '/node_modules/lib/index.js',
                trigger: 'save'
            });

            expect(decision.shouldSnapshot).toBe(false);
        });

        it('should always snapshot before Block', () => {
            mockProtectionManager.getProtectionLevel.mockReturnValue('Block');
            mockRiskAnalyzer.analyze.mockReturnValue(0);

            const decision = engine.evaluate({
                filePath: '/src/critical.ts',
                trigger: 'save'
            });

            expect(decision.shouldSnapshot).toBe(true);
        });
    });

    describe('shouldProceed decision', () => {
        it('should return false for Block level with critical risk', () => {
            mockProtectionManager.getProtectionLevel.mockReturnValue('Block');
            mockRiskAnalyzer.analyze.mockReturnValue(THRESHOLDS.CRITICAL_RISK);

            const decision = engine.evaluate({
                filePath: '/src/index.ts',
                trigger: 'save'
            });

            expect(decision.shouldProceed).toBe(false);
        });

        it('should return true for Watch level regardless of risk', () => {
            mockProtectionManager.getProtectionLevel.mockReturnValue('Watch');
            mockRiskAnalyzer.analyze.mockReturnValue(THRESHOLDS.CRITICAL_RISK);

            const decision = engine.evaluate({
                filePath: '/src/index.ts',
                trigger: 'save'
            });

            expect(decision.shouldProceed).toBe(true);
        });
    });

    describe('determinism', () => {
        it('should return identical decisions for identical inputs', () => {
            mockProtectionManager.getProtectionLevel.mockReturnValue('Protected');
            mockRiskAnalyzer.analyze.mockReturnValue(0.5);

            const context = {
                filePath: '/src/index.ts',
                trigger: 'save' as const
            };

            const decision1 = engine.evaluate(context);
            const decision2 = engine.evaluate(context);

            expect(decision1).toEqual(decision2);
        });
    });
});
```

**Integration Test** (apps/vscode/test/integration/protection-handler.test.ts):
```typescript
describe('ProtectionLevelHandler Integration', () => {
    it('should execute SDK decision without modification', async () => {
        const mockEngine = {
            evaluate: vi.fn().mockReturnValue({
                shouldSnapshot: true,
                shouldProceed: true,
                reason: 'AI detected'
            })
        };

        const handler = new ProtectionLevelHandler(mockEngine);
        const mockSnapshotExecutor = vi.fn();
        handler.setSnapshotExecutor(mockSnapshotExecutor);

        await handler.handle({ filePath: '/src/index.ts', trigger: 'save' });

        // Handler executes SDK's decision
        expect(mockSnapshotExecutor).toHaveBeenCalled();
    });

    it('should NOT override SDK shouldProceed=false', async () => {
        const mockEngine = {
            evaluate: vi.fn().mockReturnValue({
                shouldSnapshot: true,
                shouldProceed: false, // SDK says don't proceed
                reason: 'Blocked'
            })
        };

        const handler = new ProtectionLevelHandler(mockEngine);
        const result = await handler.handle({ filePath: '/src/index.ts', trigger: 'save' });

        expect(result.shouldProceed).toBe(false);
        // Handler must not have "fallback" logic that allows proceed anyway
    });
});
```

---

## Phase 2: Decision Logic Extraction (Week 2)

### Task 2.1: Unify Session ID System

**Problem**: SDK uses `session-XXX`, VSCode storage uses `sess-XXX`

#### Step 1: Identify ID Generation Points

```bash
# Find all session ID generation
grep -rn "session-\|sess-\|generateSessionId\|createSessionId" packages/sdk/ apps/vscode/
```

#### Step 2: Centralize in SDK

**File**: `packages/sdk/src/utils/id-generation.ts`

```typescript
import { randomBytes } from 'crypto';

const ID_PREFIX = {
    SESSION: 'sess',
    SNAPSHOT: 'snap',
    AUDIT: 'audit'
} as const;

export function generateSessionId(): string {
    return `${ID_PREFIX.SESSION}-${Date.now()}-${randomSuffix()}`;
}

export function generateSnapshotId(): string {
    return `${ID_PREFIX.SNAPSHOT}-${Date.now()}-${randomSuffix()}`;
}

function randomSuffix(length = 6): string {
    return randomBytes(length).toString('hex').slice(0, length);
}

// Parsing utilities
export function parseIdTimestamp(id: string): number | null {
    const match = id.match(/^(?:sess|snap|audit)-(\d+)-/);
    return match ? parseInt(match[1], 10) : null;
}
```

#### Step 3: Update VSCode to Use SDK IDs

**Before**:
```typescript
// apps/vscode/src/storage/SessionStore.ts
import { generateSessionId } from '../utils/fileId';
```

**After**:
```typescript
// apps/vscode/src/storage/SessionStore.ts
import { generateSessionId } from '@snapback/sdk';
```

#### Test Requirements:

```typescript
describe('Session ID Consistency', () => {
    it('SDK and VSCode should use same ID format', () => {
        const sdkId = sdkGenerateSessionId();
        const vscodeId = vscodeGenerateSessionId(); // Should be same function

        expect(sdkId).toMatch(/^sess-\d+-[a-f0-9]{6}$/);
        expect(vscodeId).toMatch(/^sess-\d+-[a-f0-9]{6}$/);
    });

    it('IDs should be parseable across components', () => {
        const id = generateSessionId();

        // Both SDK and VSCode should parse correctly
        expect(sdkParseTimestamp(id)).toBeTruthy();
        expect(vscodeParseTimestamp(id)).toBeTruthy();
    });
});
```

---

### Task 2.2: Consolidate Risk/AI Analysis

**Problem**: Three implementations:
- `packages/core/src/ai-detection.ts` (12 lines)
- `apps/vscode/src/ai/AIWarningManager.ts` (234 lines)
- `apps/mcp-server/src/utils/risk-analyzer.ts` (285 lines)

#### Step 1: Create Canonical Implementation in Core

**File**: `packages/core/src/analysis/RiskAnalyzer.ts`

```typescript
import { THRESHOLDS } from '@snapback/sdk';
import type { RiskAnalysisResult, RiskContext } from '@snapback/contracts';

export class RiskAnalyzer {
    analyze(context: RiskContext): RiskAnalysisResult {
        const scores = {
            changeVolume: this.scoreChangeVolume(context.changeMetrics),
            aiLikelihood: this.scoreAILikelihood(context.aiContext),
            fileImportance: this.scoreFileImportance(context.filePath),
            temporalRisk: this.scoreTemporalRisk(context.timing)
        };

        const aggregateScore = this.aggregateScores(scores);

        return {
            score: aggregateScore,
            breakdown: scores,
            severity: this.determineSeverity(aggregateScore),
            recommendations: this.generateRecommendations(scores)
        };
    }

    // ... implementation details
}

// Factory for different contexts
export function createRiskAnalyzer(config?: RiskAnalyzerConfig): RiskAnalyzer {
    return new RiskAnalyzer(config);
}
```

#### Step 2: Update Consumers

**MCP Server**:
```typescript
// apps/mcp-server/src/utils/risk-analyzer.ts
// DELETE THIS FILE - use @snapback/core instead

// In the MCP tool:
import { createRiskAnalyzer } from '@snapback/core';

const analyzer = createRiskAnalyzer();
const result = analyzer.analyze(context);
```

**VSCode Extension**:
```typescript
// apps/vscode/src/ai/AIWarningManager.ts
// Simplify to UI concerns only

import { createRiskAnalyzer } from '@snapback/core';

export class AIWarningManager {
    private analyzer = createRiskAnalyzer();

    async evaluateAndWarn(context: SaveContext): Promise<void> {
        // Delegate analysis to Core
        const analysis = this.analyzer.analyze({
            filePath: context.filePath,
            changeMetrics: context.metrics,
            aiContext: context.aiDetection
        });

        // VSCode owns HOW to warn, not WHETHER
        if (analysis.severity >= 'high') {
            await this.showWarningNotification(analysis);
        }
    }

    // UI methods only
    private async showWarningNotification(analysis: RiskAnalysisResult): Promise<void> {
        // VSCode-specific notification logic
    }
}
```

#### Test Requirements:

**File**: `packages/core/test/unit/analysis/RiskAnalyzer.test.ts`

```typescript
describe('RiskAnalyzer', () => {
    describe('analyze', () => {
        it('should return consistent scores for same input', () => {
            const analyzer = createRiskAnalyzer();
            const context = createTestContext();

            const result1 = analyzer.analyze(context);
            const result2 = analyzer.analyze(context);

            expect(result1.score).toBe(result2.score);
        });

        it('should increase score for AI-detected changes', () => {
            const analyzer = createRiskAnalyzer();

            const withoutAI = analyzer.analyze({ ...baseContext, aiContext: null });
            const withAI = analyzer.analyze({
                ...baseContext,
                aiContext: { detected: true, tool: 'cursor', confidence: 0.9 }
            });

            expect(withAI.score).toBeGreaterThan(withoutAI.score);
        });

        it('should respect THRESHOLDS from SDK', () => {
            const analyzer = createRiskAnalyzer();
            const highRiskContext = createHighRiskContext();

            const result = analyzer.analyze(highRiskContext);

            expect(result.score).toBeGreaterThanOrEqual(THRESHOLDS.HIGH_RISK);
            expect(result.severity).toBe('high');
        });
    });
});
```

**Cross-Component Integration Test**:
```typescript
describe('Risk Analysis Consistency', () => {
    it('MCP and VSCode should produce same analysis for same input', async () => {
        const testContext = createTestContext();

        // MCP's analysis
        const mcpResult = await mcpAnalyzeRisk(testContext);

        // VSCode's analysis (via AIWarningManager)
        const vscodeResult = await vscodeAnalyzeRisk(testContext);

        // Should be identical since both use @snapback/core
        expect(mcpResult.score).toBe(vscodeResult.score);
        expect(mcpResult.severity).toBe(vscodeResult.severity);
    });
});
```

---

### Task 2.3: Consolidate Cooldown Management

**Problem**: Three cooldown implementations:
- `apps/vscode/src/services/cooldownManager.ts`
- `apps/vscode/src/storage/CooldownCache.ts`
- `ProtectedFileRegistry.temporaryAllowances`

#### Step 1: Single CooldownManager

Keep `CooldownCache.ts` as it follows the storage implementation guide:

```typescript
// apps/vscode/src/storage/CooldownCache.ts
// This is correct - in-memory, ephemeral

export class CooldownCache {
    private cache = new Map<string, CooldownEntry>();
    // ... implementation from storage guide
}
```

#### Step 2: Remove Duplicates

```bash
# Find all cooldown-related code
grep -rn "cooldown\|Cooldown\|temporaryAllowance" apps/vscode/src/
```

Delete or redirect:
- `cooldownManager.ts` → use `CooldownCache` directly
- `temporaryAllowances` in registry → use `CooldownCache`

#### Step 3: Test Requirements

```typescript
describe('Cooldown Single Source', () => {
    it('should have exactly ONE cooldown storage', () => {
        // Structural test
        const vscodeFiles = glob.sync('apps/vscode/src/**/*.ts');

        const cooldownDeclarations = vscodeFiles.filter(f => {
            const content = fs.readFileSync(f, 'utf-8');
            return content.includes('Map<') &&
                   (content.includes('cooldown') || content.includes('Cooldown'));
        });

        expect(cooldownDeclarations.length).toBe(1);
        expect(cooldownDeclarations[0]).toContain('CooldownCache');
    });
});
```

---

## Phase 3: Ancillary Cleanup (Week 3-4)

### Task 3.1: Configuration Centralization

**Problem**: Multiple `vscode.workspace.getConfiguration("snapback")` calls

#### Solution: ConfigManager

```typescript
// apps/vscode/src/config/ConfigManager.ts
export class ConfigManager {
    private config: vscode.WorkspaceConfiguration;
    private disposables: vscode.Disposable[] = [];

    constructor() {
        this.config = vscode.workspace.getConfiguration('snapback');

        // Listen for changes
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('snapback')) {
                    this.config = vscode.workspace.getConfiguration('snapback');
                    this.emit('configChanged');
                }
            })
        );
    }

    get<T>(key: string, defaultValue: T): T {
        return this.config.get<T>(key, defaultValue);
    }

    // Type-safe accessors
    get telemetryEnabled(): boolean {
        return this.get('telemetry.enabled', true);
    }

    get protectionLevel(): ProtectionLevel {
        return this.get('defaultProtectionLevel', 'Protected');
    }
}

// Singleton
let instance: ConfigManager | null = null;
export function getConfigManager(): ConfigManager {
    if (!instance) {
        instance = new ConfigManager();
    }
    return instance;
}
```

#### Test:
```typescript
describe('ConfigManager', () => {
    it('should be singleton', () => {
        const manager1 = getConfigManager();
        const manager2 = getConfigManager();

        expect(manager1).toBe(manager2);
    });

    it('should emit events on config change', async () => {
        const manager = getConfigManager();
        const listener = vi.fn();
        manager.on('configChanged', listener);

        await vscode.workspace.getConfiguration('snapback').update('telemetry.enabled', false);

        expect(listener).toHaveBeenCalled();
    });
});
```

---

### Task 3.2: Event Bus Standardization

**Problem**: Events scattered across `vscode.EventEmitter`, `@snapback/events`, custom implementations

#### Solution: Single Event Flow

```typescript
// apps/vscode/src/events/EventBridge.ts
import { SnapBackEventBus } from '@snapback/events';

/**
 * Bridge between VSCode events and platform event bus
 */
export class EventBridge {
    constructor(
        private platformBus: SnapBackEventBus,
        private vscodeContext: vscode.ExtensionContext
    ) {}

    // Convert VSCode events to platform events
    bridgeFileSaveEvent(document: vscode.TextDocument): void {
        this.platformBus.emit('file.saved', {
            filePath: document.uri.fsPath,
            languageId: document.languageId,
            timestamp: Date.now()
        });
    }

    // Subscribe to platform events for VSCode actions
    setupSubscriptions(): void {
        this.platformBus.on('snapshot.created', (event) => {
            // Update VSCode UI
            this.updateStatusBar(event);
        });
    }
}
```

---

## High-ROI Test Matrix

Based on your existing test patterns (Vitest, test/unit/, test/integration/, etc.), here are the highest-value tests to implement:

### Priority 1: Contract Tests (Highest ROI)

These tests ensure components can communicate correctly and catch boundary violations early.

| Test | Location | What It Validates |
|------|----------|-------------------|
| SDK ProtectionManager Contract | `packages/sdk/test/contracts/` | SDK exposes expected interface |
| SDK → VSCode Adapter Contract | `apps/vscode/test/contracts/` | VSCode correctly implements SDK interfaces |
| Risk Analysis Contract | `packages/core/test/contracts/` | Consistent analysis across consumers |

**Example Structure**:
```
packages/sdk/test/
├── contracts/
│   ├── protection-manager.contract.ts
│   ├── session-coordinator.contract.ts
│   └── decision-engine.contract.ts
└── ...

apps/vscode/test/
├── contracts/
│   ├── sdk-adapter.contract.ts
│   └── storage-adapter.contract.ts
└── ...
```

### Priority 2: Trust Chain Tests

These tests verify that downstream components trust upstream decisions.

| Test | What It Catches |
|------|-----------------|
| Adapter null handling | Adapters overriding SDK null returns |
| Decision passthrough | Components modifying SDK decisions |
| State delegation | Components caching SDK state locally |

**Template**:
```typescript
describe('Trust Chain: [Upstream] → [Downstream]', () => {
    it('downstream should NOT modify upstream decision', () => {
        const upstreamDecision = upstream.decide(input);
        const downstreamResult = downstream.handle(upstreamDecision);

        expect(downstreamResult.decision).toEqual(upstreamDecision);
    });

    it('downstream should NOT have fallback for upstream null', () => {
        const upstreamDecision = null;
        const downstreamResult = downstream.handle(upstreamDecision);

        expect(downstreamResult).toBeNull(); // or appropriate no-op
    });
});
```

### Priority 3: Single Source of Truth Tests

These verify no duplicate state.

| Test | What It Validates |
|------|-------------------|
| Protected files SSOT | Only SDK holds protected file state |
| Session state SSOT | Only SDK holds session state |
| Cooldown state SSOT | Only CooldownCache holds cooldowns |

**Template**:
```typescript
describe('Single Source of Truth: [State Name]', () => {
    it('should have exactly one storage location', () => {
        // Code analysis test
        const stateDeclarations = findStateDeclarations('protected');
        expect(stateDeclarations).toHaveLength(1);
    });

    it('all reads should go through single source', () => {
        // Trace all read calls
        const readCalls = traceMethodCalls('isProtected');
        const uniqueTargets = new Set(readCalls.map(c => c.target));

        expect(uniqueTargets.size).toBe(1);
    });
});
```

### Priority 4: Integration Tests for Decision Flows

Test complete flows from trigger to outcome.

```typescript
describe('Decision Flow: File Save', () => {
    it('save → SDK decision → VSCode execution', async () => {
        // Setup
        const testFile = '/src/index.ts';
        sdkProtectionManager.registerFile(testFile, 'Protected');

        // Trigger
        await vscode.commands.executeCommand('workbench.action.files.save');

        // Verify SDK was consulted
        expect(sdkDecisionEngine.evaluate).toHaveBeenCalledWith(
            expect.objectContaining({ filePath: testFile })
        );

        // Verify VSCode executed SDK's decision
        expect(snapshotStore.create).toHaveBeenCalled();
    });
});
```

---

## Verification Checklist

After completing all phases, verify:

### Architecture
- [ ] All `isProtected()` calls go through SDK ProtectionManager
- [ ] All `shouldSnapshot` decisions made by SDK ProtectionDecisionEngine
- [ ] Single session ID format (from SDK)
- [ ] VscodeStorageAdapter has ZERO business logic (only storage)
- [ ] One risk analysis implementation (in @snapback/core)
- [ ] One protected file registry (SDK-owned)
- [ ] One cooldown storage (CooldownCache)
- [ ] Events flow through @snapback/events EventBus

### Tests
- [ ] Contract tests for all SDK public interfaces
- [ ] Trust chain tests for all adapter relationships
- [ ] SSOT tests for all state
- [ ] Integration tests for all major flows
- [ ] 80%+ coverage on modified code

### Documentation
- [ ] Architecture doc updated with correct boundaries
- [ ] Component responsibility matrix updated
- [ ] API documentation reflects new interfaces

---

## Run Order

Execute in this order to minimize disruption:

```bash
# Phase 1: Critical Trust Fixes
# Task 1.1: VscodeStorageAdapter
# Task 1.2: Protected File State
# Task 1.3: shouldSnapshot Extraction

# Phase 2: Decision Logic Extraction
# Task 2.1: Session ID Unification
# Task 2.2: Risk Analysis Consolidation
# Task 2.3: Cooldown Consolidation

# Phase 3: Ancillary Cleanup
# Task 3.1: Config Centralization
# Task 3.2: Event Standardization
```

Between each task:
1. Run tests: `pnpm test`
2. Check for new TypeScript errors: `pnpm typecheck`
3. Verify bundle size: `pnpm build && ls -la dist/`
4. Manual smoke test in VSCode

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Decision points in VSCode | 8+ | 0 |
| SDK interface coverage | ~40% | 80%+ |
| Contract test count | 0 | 10+ |
| Trust chain violations | 3 | 0 |
| Duplicate state stores | 6+ | 0 |
| Bundle size | Current | Same or smaller |
