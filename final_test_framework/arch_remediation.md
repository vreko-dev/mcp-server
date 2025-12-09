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

## Phase 4: Critical Integration Gaps (Week 4-5)

**Context**: After deep codebase analysis, 5 major systems have complete infrastructure but incomplete integration wiring. This phase closes those gaps and enables end-to-end feature functionality.

### Task 4.1: Wire MetricsAggregator into Dashboard Metrics

**Problem**: Dashboard metrics API returns hardcoded empty data

**Files**:
- Primary: `/apps/api/modules/dashboard/procedures/get-metrics.ts` (lines 88-128)
- Backend: `/apps/api/src/services/metrics-aggregator.ts` (lines 1-54)
- Schema: `/packages/platform/src/db/schema/snapback/user-daily-metrics.ts`

#### Current State (BROKEN)

**File**: `apps/api/modules/dashboard/procedures/get-metrics.ts`

```typescript
// Lines 115-128: Hardcoded empty/mock data
const metrics = {
    protection_status: "active" as const,
    total_checkpoints: totalCheckpoints,
    total_recoveries: totalRecoveries,
    files_protected: filesProtected,
    ai_detection_rate: aiDetectionRate,
    recent_activity: [],  // ❌ HARDCODED EMPTY
    ai_breakdown: {       // ❌ HARDCODED MOCKED
        copilot: 0,
        cursor: 0,
        claude: 0,
        windsurf: 0,
    },
};
```

#### Root Cause

- `MetricsAggregator` service exists but is **never instantiated** in dashboard endpoint
- Daily metrics calculation exists but runs **only on manual admin request** (not scheduled)
- AI tool detection has no aggregation by tool type
- Recent activity calculation incomplete

#### Implementation Steps

**Step 1**: Create scheduled daily metrics job

**File**: `apps/api/src/jobs/daily-metrics-aggregation.ts` (NEW)

```typescript
import { CronJob } from 'cron';
import { MetricsAggregator } from '../services/metrics-aggregator';
import { logger } from '@snapback/infrastructure';
import { db } from '@snapback/platform/db';

export function startDailyMetricsAggregation(): void {
    const job = new CronJob('0 0 * * *', async () => {  // Daily at midnight
        try {
            logger.info('Starting daily metrics aggregation');
            
            const aggregator = new MetricsAggregator(db);
            const allUsers = await db.query(
                'SELECT DISTINCT user_id FROM snapshots'
            );
            
            for (const { user_id } of allUsers) {
                const metrics = await aggregator.aggregateDailyMetrics(user_id);
                await db.insert('user_daily_metrics').values(metrics);
            }
            
            logger.info('Daily metrics aggregation completed');
        } catch (error) {
            logger.error('Daily metrics aggregation failed', { error });
        }
    });
    
    job.start();
}

// Call from app startup: startDailyMetricsAggregation()
```

**Step 2**: Update dashboard procedure to use aggregated data

**File**: `apps/api/modules/dashboard/procedures/get-metrics.ts`

```typescript
// ... existing code ...
import { MetricsAggregator } from '../../../src/services/metrics-aggregator';

export async function getMetrics(input: GetMetricsInput) {
    // ... existing code for checksums ...
    
    const aggregator = new MetricsAggregator(db);
    
    // Replace hardcoded values with aggregated data
    const aiToolBreakdown = await aggregator.getAIToolDetectionCounts(userId);
    const recentActivity = await aggregator.getRecentActivity(userId, 7); // Last 7 days
    
    const metrics = {
        protection_status: "active" as const,
        total_checkpoints: totalCheckpoints,
        total_recoveries: totalRecoveries,
        files_protected: filesProtected,
        ai_detection_rate: aiDetectionRate,
        recent_activity: recentActivity,  // ✅ FROM AGGREGATOR
        ai_breakdown: {                   // ✅ FROM AGGREGATOR
            copilot: aiToolBreakdown.copilot ?? 0,
            cursor: aiToolBreakdown.cursor ?? 0,
            claude: aiToolBreakdown.claude ?? 0,
            windsurf: aiToolBreakdown.windsurf ?? 0,
        },
    };
    
    // ... rest of existing code ...
}
```

**Step 3**: Add AI tool breakdown aggregation method

**File**: `apps/api/src/services/metrics-aggregator.ts`

```typescript
// ... existing code ...

/**
 * Get AI tool detection counts for a user
 */
async getAIToolDetectionCounts(userId: string) {
    const result = await this.db.query(`
        SELECT
            COALESCE(SUM(CASE WHEN tool_name = 'copilot' THEN 1 ELSE 0 END), 0) as copilot,
            COALESCE(SUM(CASE WHEN tool_name = 'cursor' THEN 1 ELSE 0 END), 0) as cursor,
            COALESCE(SUM(CASE WHEN tool_name = 'claude' THEN 1 ELSE 0 END), 0) as claude,
            COALESCE(SUM(CASE WHEN tool_name = 'windsurf' THEN 1 ELSE 0 END), 0) as windsurf
        FROM ai_detections
        WHERE user_id = ?
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, [userId]);
    
    return result[0] || { copilot: 0, cursor: 0, claude: 0, windsurf: 0 };
}

/**
 * Get recent activity (snapshots, recoveries, risk detections)
 */
async getRecentActivity(userId: string, days: number = 7) {
    return await this.db.query(`
        SELECT
            'snapshot' as type,
            created_at as timestamp,
            files_changed as count,
            reason as description
        FROM snapshots
        WHERE user_id = ?
            AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        
        UNION ALL
        
        SELECT
            'recovery' as type,
            created_at as timestamp,
            files_restored as count,
            status as description
        FROM recovery_logs
        WHERE user_id = ?
            AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        
        ORDER BY timestamp DESC
        LIMIT 20
    `, [userId, days, userId, days]);
}
```

#### Test Requirements

**File**: `apps/api/test/integration/dashboard/metrics-aggregation.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getMetrics } from '../../../modules/dashboard/procedures/get-metrics';
import { createTestUser, createTestSnapshots } from '../../fixtures';

describe('Dashboard Metrics - Aggregation', () => {
    let userId: string;
    
    beforeEach(async () => {
        userId = await createTestUser();
        // Create 5 snapshots with different AI tools detected
        await createTestSnapshots(userId, [
            { tool: 'copilot', timestamp: Date.now() - 86400000 },
            { tool: 'cursor', timestamp: Date.now() - 86400000 },
            { tool: 'claude', timestamp: Date.now() - 172800000 },
            { tool: 'copilot', timestamp: Date.now() - 172800000 },
            { tool: 'windsurf', timestamp: Date.now() - 259200000 },
        ]);
    });
    
    it('should return aggregated ai_breakdown by tool', async () => {
        const metrics = await getMetrics({ userId });
        
        expect(metrics.ai_breakdown).toEqual({
            copilot: 2,
            cursor: 1,
            claude: 1,
            windsurf: 1,
        });
    });
    
    it('should NOT return hardcoded zeros', async () => {
        const metrics = await getMetrics({ userId });
        
        expect(metrics.ai_breakdown.copilot).toBeGreaterThan(0);
    });
    
    it('should include recent_activity with actual events', async () => {
        const metrics = await getMetrics({ userId });
        
        expect(metrics.recent_activity).not.toEqual([]);
        expect(metrics.recent_activity.length).toBeGreaterThan(0);
        expect(metrics.recent_activity[0]).toHaveProperty('type');
        expect(metrics.recent_activity[0]).toHaveProperty('timestamp');
    });
});
```

---

### Task 4.2: Wire CloudBackup Upload or Presigned URLs

**Problem**: Cloud backup infrastructure exists but never called; snapshots can't be uploaded to cloud

**Files**:
- Primary: `/apps/api/modules/snapshots/procedures/create-snapshot.ts` (lines 167-173)
- Infrastructure: `/packages/sdk/src/cloud/CloudBackupService.ts` (complete implementation)
- Config: Snapshot creation payload includes `cloudBackupEnabled`, `encryptionKeyId`, etc.

#### Current State (BROKEN)

**File**: `apps/api/modules/snapshots/procedures/create-snapshot.ts` (lines 167-173)

```typescript
cloudBackupEnabled: input.cloudBackupEnabled,
encryptionKeyId: input.encryptionKeyId,
encryptedDataKey: input.encryptedDataKey,
encryptionAlgorithm: input.encryptionAlgorithm,
// cloudBackupUrl would be set by separate upload process if enabled
metadata: input.metadata,
```

❌ Comment indicates deferred upload but **no such process exists**

#### Root Cause

- CloudBackupService is fully implemented with S3 upload, compression, checksumming
- Never integrated into snapshot creation flow
- No presigned URL generation for client-side uploads
- Feature flag not enabled in configuration

#### Implementation Steps

**Step 1**: Choose upload strategy (Server-side vs Client-side presigned URLs)

**Option A (Recommended for demo)**: Server-side upload
- Simpler to implement and test
- More control over encryption/compression
- Better for showing progress

**Option B (Better for scale)**: Client presigned URLs
- Reduces API server load
- Faster uploads (direct to S3)
- Client browser handles upload

**For now, implement Option A:**

**Step 2**: Integrate CloudBackupService into snapshot creation

**File**: `apps/api/modules/snapshots/procedures/create-snapshot.ts`

```typescript
import { CloudBackupService } from '@snapback/sdk/cloud';

// ... existing imports and code ...

export async function createSnapshot(input: CreateSnapshotInput) {
    // ... existing validation and snapshot creation ...
    
    // After snapshot is saved to database
    const snapshot = await db.snapshots.create({
        // ... existing fields ...
        cloudBackupEnabled: input.cloudBackupEnabled,
        encryptionKeyId: input.encryptionKeyId,
        encryptedDataKey: input.encryptedDataKey,
        encryptionAlgorithm: input.encryptionAlgorithm,
    });
    
    // NEW: Upload to cloud if enabled
    if (input.cloudBackupEnabled && process.env.ENABLE_CLOUD_BACKUP === 'true') {
        try {
            const cloudBackupService = new CloudBackupService({
                s3BucketName: process.env.S3_BUCKET_NAME!,
                s3Region: process.env.S3_REGION!,
                encryptionKey: input.encryptedDataKey,
            });
            
            const uploadResult = await cloudBackupService.upload({
                snapshotId: snapshot.id,
                content: input.snapshotContent,
                metadata: input.metadata,
            });
            
            // Store cloud backup URL
            await db.snapshots.update(snapshot.id, {
                cloudBackupUrl: uploadResult.url,
                cloudBackupChecksum: uploadResult.checksum,
            });
            
            logger.info('Cloud backup completed', {
                snapshotId: snapshot.id,
                url: uploadResult.url,
            });
        } catch (error) {
            logger.warn('Cloud backup failed (non-blocking)', {
                snapshotId: snapshot.id,
                error: toError(error).message,
            });
            // Don't fail snapshot creation if backup fails
        }
    }
    
    return { success: true, snapshot };
}
```

**Step 3**: Enable feature flag

**File**: `.env.local` (or wherever feature flags are configured)

```
ENABLE_CLOUD_BACKUP=true
S3_BUCKET_NAME=snapback-backups-prod
S3_REGION=us-east-1
```

**Step 4**: Add presigned URL endpoint for client-side uploads (Option B for future)

**File**: `apps/api/modules/snapshots/router.ts` (NEW ROUTE)

```typescript
router.post('/presigned-url', async (input) => {
    // When client-side upload is ready to implement
    const cloudBackupService = new CloudBackupService(config);
    const presignedUrl = await cloudBackupService.getPresignedUploadUrl({
        snapshotId: input.snapshotId,
        contentType: 'application/octet-stream',
        expiresIn: 3600,
    });
    return { url: presignedUrl };
});
```

#### Test Requirements

**File**: `apps/api/test/integration/snapshots/cloud-backup.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSnapshot } from '../../../modules/snapshots/procedures/create-snapshot';
import { mockS3Service } from '../../mocks/s3';

describe('Cloud Backup Integration', () => {
    beforeEach(() => {
        process.env.ENABLE_CLOUD_BACKUP = 'true';
        vi.mock('@snapback/sdk/cloud');
    });
    
    it('should upload snapshot to S3 when cloudBackupEnabled=true', async () => {
        const mockUpload = vi.fn().mockResolvedValue({
            url: 's3://bucket/snap-123',
            checksum: 'abc123',
        });
        
        const result = await createSnapshot({
            cloudBackupEnabled: true,
            snapshotContent: 'file content',
            encryptionKeyId: 'key-1',
            encryptedDataKey: 'encrypted-data',
            encryptionAlgorithm: 'AES-256-GCM',
            metadata: {},
        });
        
        expect(mockUpload).toHaveBeenCalled();
        expect(result.snapshot.cloudBackupUrl).toBe('s3://bucket/snap-123');
    });
    
    it('should NOT upload when cloudBackupEnabled=false', async () => {
        const mockUpload = vi.fn();
        
        const result = await createSnapshot({
            cloudBackupEnabled: false,  // ❌ Don't upload
            snapshotContent: 'file content',
            metadata: {},
        });
        
        expect(mockUpload).not.toHaveBeenCalled();
        expect(result.snapshot.cloudBackupUrl).toBeUndefined();
    });
    
    it('should NOT fail snapshot creation if backup fails', async () => {
        const mockUpload = vi.fn().mockRejectedValue(new Error('S3 error'));
        
        const result = await createSnapshot({
            cloudBackupEnabled: true,
            snapshotContent: 'file content',
            metadata: {},
        });
        
        expect(result.success).toBe(true); // Snapshot still created
        expect(result.snapshot.cloudBackupUrl).toBeUndefined();
    });
});
```

---

### Task 4.3: Connect Offline Event Queue to Network Restoration

**Problem**: Offline queue infrastructure complete but never triggered on network recovery

**Files**:
- Queue: `/apps/vscode/src/telemetry/OfflineEventQueue.ts` (592 lines, 100% complete)
- Proxy: `/apps/vscode/src/services/telemetry-proxy.ts` (lines 40-54)
- Events: Offline mode detection exists but not wired to queue processing

#### Current State (BROKEN)

**File**: `/apps/vscode/src/services/telemetry-proxy.ts` (lines 40-54)

```typescript
private setupNetworkMonitoring(): void {
    // Monitors online/offline state
    window.addEventListener('online', () => {
        logger.info('Network restored');
        // ❌ Queue processing never called here
    });
    
    window.addEventListener('offline', () => {
        logger.info('Network disconnected');
        // Events should be queued
    });
}
```

#### Root Cause

- `OfflineEventQueue.processQueue()` exists and has exponential backoff retry logic
- Network restoration event handler doesn't call it
- Queue is filled but never drained after network recovery
- Events accumulate indefinitely (7-day TTL prevents data loss but limits utility)

#### Implementation Steps

**Step 1**: Wire queue processor to network restoration event

**File**: `/apps/vscode/src/services/telemetry-proxy.ts`

```typescript
import { OfflineEventQueue } from '../telemetry/OfflineEventQueue';

export class TelemetryProxy {
    private offlineQueue: OfflineEventQueue;
    
    // ... existing code ...
    
    private setupNetworkMonitoring(): void {
        window.addEventListener('online', () => {
            logger.info('Network restored, processing offline queue');
            // ✅ NEW: Process queued events
            this.offlineQueue.processQueue().catch(error => {
                logger.error('Failed to process offline queue', { error });
            });
        });
        
        window.addEventListener('offline', () => {
            logger.info('Network disconnected, switching to offline mode');
            // Events will be automatically queued by queueEvent method
        });
    }
    
    async queueEvent(event: TelemetryEvent): Promise<void> {
        if (!navigator.onLine) {
            // Queue for later
            await this.offlineQueue.enqueue(event);
            logger.debug('Event queued for offline replay', { eventName: event.name });
        } else {
            // Send immediately
            await this.sendEvent(event);
        }
    }
}
```

**Step 2**: Add retry mechanism for network errors

**File**: `/apps/vscode/src/services/telemetry-proxy.ts`

```typescript
private async sendEvent(event: TelemetryEvent): Promise<void> {
    try {
        await this.analytics.track(event.name, event.properties);
    } catch (error) {
        // If send fails (network dropped), queue for retry
        logger.warn('Failed to send event, queuing for retry', { 
            eventName: event.name,
            error: toError(error).message 
        });
        await this.offlineQueue.enqueue(event);
    }
}
```

**Step 3**: Add monitoring for queue processing

**File**: `/apps/vscode/src/telemetry/OfflineEventQueue.ts`

```typescript
// Add at end of processQueue method:
async processQueue(): Promise<void> {
    const queueSize = await this.storage.get('queue:size');
    logger.info('Processing offline queue', { queueSize });
    
    // ... existing process queue logic ...
    
    logger.info('Offline queue processing completed', { processed: queueSize });
}
```

#### Test Requirements

**File**: `apps/vscode/test/integration/telemetry/offline-queue-integration.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelemetryProxy } from '../../../src/services/telemetry-proxy';
import { OfflineEventQueue } from '../../../src/telemetry/OfflineEventQueue';

describe('Offline Queue Integration', () => {
    let telemetryProxy: TelemetryProxy;
    let offlineQueue: OfflineEventQueue;
    
    beforeEach(() => {
        offlineQueue = new OfflineEventQueue(mockStorage);
        telemetryProxy = new TelemetryProxy({ offlineQueue });
    });
    
    it('should queue events when offline', async () => {
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: false,
        });
        
        const enqueueSpy = vi.spyOn(offlineQueue, 'enqueue');
        
        await telemetryProxy.queueEvent({
            name: 'snapshot_created',
            properties: { snapshotId: 'snap-123' },
        });
        
        expect(enqueueSpy).toHaveBeenCalled();
    });
    
    it('should process queue when network is restored', async () => {
        const processSpy = vi.spyOn(offlineQueue, 'processQueue');
        
        // Queue some events
        await offlineQueue.enqueue({ name: 'event1' });
        await offlineQueue.enqueue({ name: 'event2' });
        
        // Simulate network restoration
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: true,
        });
        window.dispatchEvent(new Event('online'));
        
        // Give async processing time
        await new Promise(r => setTimeout(r, 100));
        
        expect(processSpy).toHaveBeenCalled();
    });
    
    it('should NOT lose events if network restoration fails', async () => {
        const mockProcessQueue = vi.fn().mockRejectedValue(new Error('API error'));
        offlineQueue.processQueue = mockProcessQueue;
        
        await offlineQueue.enqueue({ name: 'event1' });
        
        // Simulate network restoration that fails
        window.dispatchEvent(new Event('online'));
        await new Promise(r => setTimeout(r, 100));
        
        // Event should still be in queue
        const queuedEvents = await offlineQueue.getQueuedEvents();
        expect(queuedEvents.length).toBeGreaterThan(0);
    });
});
```

---

### Task 4.4: Enable Trust Calibration Loop

**Problem**: Trust score database schema complete but never updated; AI confidence scores mocked in dashboard

**Files**:
- Schema: `/packages/platform/src/db/schema/snapback/trust-scores.ts` (complete, unused)
- Dashboard: `/apps/api/lib/dashboard-metrics.ts` (lines 130-137 - hardcoded mock scores)
- Recovery logs: Schema exists to track outcomes

#### Current State (BROKEN)

**File**: `/apps/api/lib/dashboard-metrics.ts` (lines 130-137)

```typescript
return aiFeatures.map((feature) => ({
    tool: formatToolName(feature.featureName),
    count: feature.count,
    avgConfidence: 0.9 + Math.random() * 0.09, // ❌ MOCKED: Random 90-99%
}));
```

#### Root Cause

- `trust_scores` table has EWMA (Exponentially Weighted Moving Average) fields:
  - `score`: Current 0.0-1.0 trust rating
  - `momentum`: -1.0 to 1.0 (for adaptive weighting)
  - `volatility`: 0.0-1.0 (uncertainty metric)
  - `recentWindow`: Last 20 outcomes (0 or 1)
- No code updates these scores based on recovery outcomes
- No feedback loop from "user approved this change" to trust calibration
- Confidence scores hardcoded to mock values

#### Implementation Steps

**Step 1**: Create trust calibration engine

**File**: `apps/api/src/services/trust-calibration.ts` (NEW)

```typescript
import { db } from '@snapback/platform/db';
import { logger } from '@snapback/infrastructure';

const EWMA_ALPHA = 0.3; // Weight for new observations

export class TrustCalibrationEngine {
    /**
     * Update trust score based on recovery outcome
     * Outcome: 1 = user approved (correct), 0 = user rejected (incorrect)
     */
    async recordOutcome(
        userId: string,
        aiTool: string,
        context: string,
        outcome: 0 | 1
    ): Promise<void> {
        const trustScore = await db
            .select()
            .from('trust_scores')
            .where({
                user_id: userId,
                tool_name: aiTool,
                context_type: context,
            })
            .first();

        if (!trustScore) {
            // First observation for this tool/context
            await db.insert('trust_scores').values({
                user_id: userId,
                tool_name: aiTool,
                context_type: context,
                score: outcome,
                momentum: outcome > 0.5 ? 0.1 : -0.1,
                volatility: 0.5, // High uncertainty initially
                recentWindow: [outcome],
            });
            return;
        }

        // Update EWMA score
        const newScore = EWMA_ALPHA * outcome + (1 - EWMA_ALPHA) * trustScore.score;
        const newMomentum = this.calculateMomentum(trustScore, outcome);
        const newVolatility = this.calculateVolatility(trustScore, outcome);
        const updatedWindow = [
            outcome,
            ...trustScore.recentWindow.slice(0, 19),
        ];

        await db
            .update('trust_scores')
            .set({
                score: newScore,
                momentum: newMomentum,
                volatility: newVolatility,
                recentWindow: updatedWindow,
                updated_at: new Date(),
            })
            .where({ id: trustScore.id });

        logger.info('Trust score updated', {
            userId,
            tool: aiTool,
            previousScore: trustScore.score.toFixed(3),
            newScore: newScore.toFixed(3),
            outcome,
        });
    }

    private calculateMomentum(
        current: typeof trustScores,
        newOutcome: 0 | 1
    ): number {
        // Momentum shows trend direction
        const recentAvg =
            current.recentWindow.slice(0, 5).reduce((a, b) => a + b) / 5;
        const trend = newOutcome > recentAvg ? 0.1 : -0.1;
        return Math.max(-1, Math.min(1, current.momentum + trend * 0.2));
    }

    private calculateVolatility(
        current: typeof trustScores,
        newOutcome: 0 | 1
    ): number {
        // Volatility decreases with more observations (increased confidence)
        const stdDev = this.standardDeviation(current.recentWindow);
        const observations = current.recentWindow.length;
        return stdDev / Math.sqrt(Math.log(observations + 1));
    }

    private standardDeviation(values: number[]): number {
        const mean = values.reduce((a, b) => a + b) / values.length;
        const variance =
            values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) /
            values.length;
        return Math.sqrt(variance);
    }
}
```

**Step 2**: Wire trust calibration to recovery outcome webhook

**File**: `apps/api/modules/recovery/router.ts` (NEW ROUTE)

```typescript
import { TrustCalibrationEngine } from '../../src/services/trust-calibration';

router.post('/outcome', async (input: RecoveryOutcomeInput) => {
    // Called when user approves or rejects a recovered change
    const trustEngine = new TrustCalibrationEngine();
    
    // 1 = approved (correct), 0 = rejected (incorrect)
    const outcome = input.approved ? 1 : 0;
    
    await trustEngine.recordOutcome(
        input.userId,
        input.aiTool,
        input.context, // e.g., 'code_generation', 'refactoring'
        outcome
    );
    
    return { success: true, updated: true };
});
```

**Step 3**: Use trust scores in dashboard

**File**: `/apps/api/lib/dashboard-metrics.ts`

```typescript
// ... existing code ...

return aiFeatures.map(async (feature) => {
    // Get actual trust score instead of mocking
    const trustScore = await db
        .select('score')
        .from('trust_scores')
        .where({
            user_id: userId,
            tool_name: formatToolName(feature.featureName),
        })
        .orderBy('updated_at', 'desc')
        .first();
    
    return {
        tool: formatToolName(feature.featureName),
        count: feature.count,
        avgConfidence: trustScore?.score ?? 0.5, // ✅ FROM DATABASE
    };
});
```

#### Test Requirements

**File**: `apps/api/test/unit/services/trust-calibration.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TrustCalibrationEngine } from '../../../src/services/trust-calibration';

describe('Trust Calibration Engine', () => {
    let engine: TrustCalibrationEngine;
    
    beforeEach(() => {
        engine = new TrustCalibrationEngine();
    });
    
    it('should initialize score at first outcome', async () => {
        await engine.recordOutcome('user-1', 'copilot', 'code_gen', 1);
        
        const score = await db
            .select('score')
            .from('trust_scores')
            .where({ user_id: 'user-1', tool_name: 'copilot' })
            .first();
        
        expect(score.score).toBe(1); // Approved
    });
    
    it('should apply EWMA weighting to subsequent outcomes', async () => {
        // First: approved
        await engine.recordOutcome('user-1', 'cursor', 'refactor', 1);
        const score1 = await getScore('user-1', 'cursor');
        expect(score1).toBe(1);
        
        // Second: rejected
        await engine.recordOutcome('user-1', 'cursor', 'refactor', 0);
        const score2 = await getScore('user-1', 'cursor');
        
        // EWMA: 0.3 * 0 + 0.7 * 1 = 0.7
        expect(score2).toBeCloseTo(0.7, 2);
    });
    
    it('should track momentum (trend direction)', async () => {
        // Series of approvals (positive trend)
        for (let i = 0; i < 5; i++) {
            await engine.recordOutcome('user-1', 'claude', 'gen', 1);
        }
        
        const score = await db
            .select('momentum')
            .from('trust_scores')
            .where({ user_id: 'user-1', tool_name: 'claude' })
            .first();
        
        expect(score.momentum).toBeGreaterThan(0); // Positive trend
    });
    
    it('should reduce volatility with more observations', async () => {
        // Few observations = high volatility
        await engine.recordOutcome('user-1', 'windsurf', 'gen', 1);
        const vol1 = await getVolatility('user-1', 'windsurf');
        
        // Many observations = lower volatility
        for (let i = 0; i < 15; i++) {
            await engine.recordOutcome('user-1', 'windsurf', 'gen', i % 2);
        }
        const vol2 = await getVolatility('user-1', 'windsurf');
        
        expect(vol2).toBeLessThan(vol1);
    });
});
```

---

### Task 4.5: Replace Static Feature Flags with Dynamic PostHog

**Problem**: Feature flags wired to PostHog but never actually used in decision paths; all checks are static env var reads

**Files**:
- Feature flags: `/packages/config/src/feature-flags.ts` (lines 1-85)
- Feature manager: `/packages/config/src/utils/feature-flags.ts` (lines 1-41)
- Current implementation: All checks use static `FEATURE_FLAGS` constant

#### Current State (BROKEN)

**File**: `/packages/config/src/utils/feature-flags.ts` (lines 1-41)

```typescript
// Static evaluation only - PostHog never consulted
export function isFeatureEnabled(featureKey: string): boolean {
    const feature = FEATURE_FLAGS[featureKey as keyof typeof FEATURE_FLAGS];
    return feature?.enabled ?? false;
}

// Never called dynamically
let posthogInstance: PostHog | null = null;
```

#### Root Cause

- PostHog SDK initialized but never called in actual feature checks
- `isFeatureEnabled()` only reads static `FEATURE_FLAGS` object from env
- Changes require code deployment instead of PostHog dashboard
- No A/B testing, gradual rollouts, or user targeting possible

#### Implementation Steps

**Step 1**: Update FeatureManager to call PostHog

**File**: `/packages/config/src/utils/feature-flags.ts`

```typescript
import { PostHog } from 'posthog-js';
import { logger } from '@snapback/infrastructure';

let posthogInstance: PostHog | null = null;

export function initializePostHog(config: {
    apiKey: string;
    apiHost: string;
}): void {
    posthogInstance = new PostHog(config.apiKey, {
        api_host: config.apiHost,
        autocapture: false, // We'll track manually
    });
}

/**
 * Dynamically check if feature is enabled
 * Falls back to static config if PostHog unavailable
 */
export async function isFeatureEnabled(
    featureKey: string,
    userId?: string,
    context?: Record<string, unknown>
): Promise<boolean> {
    // Try PostHog first
    if (posthogInstance && userId) {
        try {
            const isEnabled = await posthogInstance.isFeatureEnabled(
                featureKey,
                userId,
                { groups: context }
            );
            return isEnabled ?? getFallbackFeatureState(featureKey);
        } catch (error) {
            logger.warn('PostHog feature flag check failed, using fallback', {
                feature: featureKey,
                error: toError(error).message,
            });
        }
    }
    
    // Fallback to static config
    return getFallbackFeatureState(featureKey);
}

function getFallbackFeatureState(featureKey: string): boolean {
    const feature = FEATURE_FLAGS[featureKey as keyof typeof FEATURE_FLAGS];
    return feature?.enabled ?? false;
}
```

**Step 2**: Update all feature check call sites to await PostHog

Search for all uses of `isFeatureEnabled`:

```bash
grep -rn "isFeatureEnabled" apps/ packages/ --include="*.ts" --include="*.tsx"
```

Example fixes:

**File**: `apps/api/modules/snapshots/router.ts` (if it checks for feature)

```typescript
// Before:
if (isFeatureEnabled('storage.cloud-backup')) {
    // cloud backup logic
}

// After:
const cloudBackupEnabled = await isFeatureEnabled(
    'storage.cloud-backup',
    userId,
    { tier: user.tier } // Context for PostHog targeting
);

if (cloudBackupEnabled) {
    // cloud backup logic
}
```

**Step 3**: Configure PostHog feature flags in dashboard

After code is deployed:
1. Log into PostHog.com
2. Create feature flags:
   - `storage.cloud-backup` (initially false, enable gradually)
   - `storage.deduplication` (initially false)
   - `risk.guardian_v2` (initially false)
   - `experimental.mcp_tools` (initially true for MCP users)
   - etc.
3. Set targeting rules:
   - Start with internal users (tier: 'team')
   - Gradually roll out to free users
   - Use A/B testing for hypothesis validation

#### Test Requirements

**File**: `packages/config/test/unit/feature-flags.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isFeatureEnabled, initializePostHog } from '../../../src/utils/feature-flags';

describe('Feature Flags - Dynamic with PostHog Fallback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    it('should check PostHog when initialized and userId provided', async () => {
        const mockPostHog = {
            isFeatureEnabled: vi.fn().mockResolvedValue(true),
        };
        
        initializePostHog(mockPostHog);
        
        const result = await isFeatureEnabled('storage.cloud-backup', 'user-123');
        
        expect(mockPostHog.isFeatureEnabled).toHaveBeenCalledWith(
            'storage.cloud-backup',
            'user-123',
            expect.any(Object)
        );
        expect(result).toBe(true);
    });
    
    it('should fallback to static config if PostHog returns null', async () => {
        const mockPostHog = {
            isFeatureEnabled: vi.fn().mockResolvedValue(null),
        };
        
        initializePostHog(mockPostHog);
        
        const result = await isFeatureEnabled('storage.cloud-backup', 'user-123');
        
        // Should use FEATURE_FLAGS constant
        expect(result).toBe(FEATURE_FLAGS['storage.cloud-backup'].enabled);
    });
    
    it('should fallback to static config if PostHog throws error', async () => {
        const mockPostHog = {
            isFeatureEnabled: vi.fn().mockRejectedValue(new Error('API error')),
        };
        
        initializePostHog(mockPostHog);
        
        const result = await isFeatureEnabled('storage.cloud-backup', 'user-123');
        
        // Should use FEATURE_FLAGS constant, not throw
        expect(result).toBe(FEATURE_FLAGS['storage.cloud-backup'].enabled);
    });
    
    it('should use static config when no PostHog or userId', async () => {
        // Initialize with null (offline mode)
        initializePostHog(null);
        
        const result = await isFeatureEnabled('storage.cloud-backup');
        
        expect(result).toBe(FEATURE_FLAGS['storage.cloud-backup'].enabled);
    });
    
    it('should respect user context for targeting', async () => {
        const mockPostHog = {
            isFeatureEnabled: vi.fn().mockResolvedValue(true),
        };
        
        initializePostHog(mockPostHog);
        
        await isFeatureEnabled('experimental.mcp_tools', 'user-123', {
            tier: 'pro',
            hasGithub: true,
        });
        
        expect(mockPostHog.isFeatureEnabled).toHaveBeenCalledWith(
            'experimental.mcp_tools',
            'user-123',
            expect.objectContaining({ groups: { tier: 'pro', hasGithub: true } })
        );
    });
});
```

---

## Success Metrics for Phase 4

| Gap | Status | Metric | Before | After |
|-----|--------|--------|--------|-------|
| Dashboard Metrics | 4.1 | ai_breakdown data | Hardcoded zeros | Actual counts |
| Cloud Backup | 4.2 | snapshots with cloud URL | 0% | 100% (if enabled) |
| Offline Queue | 4.3 | queued events replayed | 0% | 100% on network restore |
| Trust Calibration | 4.4 | confidence from model | Mocked 90-99% | From trust_scores table |
| Feature Flags | 4.5 | flags checked dynamically | 0% | 100% PostHog-driven |

---

## Next: Recommended Execution Order

1. **Task 4.1: Dashboard Metrics** (4-6 hours)
   - Smallest scope, immediate visibility
   - Shows working metrics on dashboard

2. **Task 4.5: Feature Flags** (3-4 hours)
   - Unblocks all other feature rollout
   - Enables gradual testing of 4.2-4.4

3. **Task 4.2: Cloud Backup** (5-8 hours)
   - Most infrastructure already done
   - Enables Pro feature differentiation

4. **Task 4.3: Offline Queue** (3-5 hours)
   - Well-tested existing code
   - Straightforward wiring

5. **Task 4.4: Trust Calibration** (6-8 hours)
   - Most complex logic
   - Foundation for future ML improvements

**Total:** 21-31 hours across 2-3 weeks

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Dashboard metrics hardcoded | Yes | No |
| Cloud backup integration | Broken | Functional |
| Offline telemetry replay | Non-functional | Functional |
| AI confidence scores mocked | Yes | From database |
| Feature flags dynamic | No | Yes (PostHog) |
| Features shipped end-to-end | 0/5 | 5/5 |
| Integration tests added | 0 | 15+ |
