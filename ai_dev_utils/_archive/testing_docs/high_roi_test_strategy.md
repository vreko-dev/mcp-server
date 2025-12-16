# SnapBack High-ROI Test Strategy

## Test Structure Alignment

Based on your existing patterns from the testing assessment:

```
{package}/test/
├── unit/           # Isolated function/class tests
├── integration/    # Component interaction tests
├── contracts/      # NEW: Interface contract tests
├── trust/          # NEW: Trust chain validation
├── performance/    # Budget validation
├── security/       # Boundary checks
├── e2e/           # Full workflow tests
└── smoke/         # Basic functionality
```

---

## Highest ROI Tests (Priority Order)

### Tier 1: Contract Tests (Prevent 80% of integration bugs)

These are the most valuable tests you can write. They define the "agreements" between components and catch violations before they become runtime bugs.

#### 1.1 SDK ProtectionManager Contract

**File**: `packages/sdk/test/contracts/protection-manager.contract.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
    ProtectionManager,
    IProtectionManager
} from '../../src/protection/ProtectionManager';
import { ProtectionLevel } from '@snapback/contracts';

/**
 * Contract Test: ProtectionManager
 *
 * This test defines the EXPECTED interface that all consumers
 * (VSCode, MCP, CLI) can rely on. If this test passes, consumers
 * can trust the interface won't break.
 */
describe('Contract: IProtectionManager', () => {
    let manager: IProtectionManager;

    beforeEach(() => {
        manager = new ProtectionManager();
    });

    describe('Interface Compliance', () => {
        it('should implement isProtected(path: string): boolean', () => {
            expect(typeof manager.isProtected).toBe('function');
            expect(manager.isProtected.length).toBe(1); // Takes 1 arg

            const result = manager.isProtected('/any/path');
            expect(typeof result).toBe('boolean');
        });

        it('should implement getProtectionLevel(path: string): ProtectionLevel', () => {
            expect(typeof manager.getProtectionLevel).toBe('function');

            const validLevels: ProtectionLevel[] = ['Watch', 'Warn', 'Block', 'Protected', 'Ignored'];
            const result = manager.getProtectionLevel('/any/path');
            expect(validLevels).toContain(result);
        });

        it('should implement registerFile(path: string, level: ProtectionLevel): void', () => {
            expect(typeof manager.registerFile).toBe('function');

            // Should not throw
            expect(() => {
                manager.registerFile('/src/index.ts', 'Protected');
            }).not.toThrow();
        });

        it('should implement unregisterFile(path: string): void', () => {
            expect(typeof manager.unregisterFile).toBe('function');

            // Should not throw even for non-existent file
            expect(() => {
                manager.unregisterFile('/nonexistent.ts');
            }).not.toThrow();
        });

        it('should implement getProtectedFiles(): ProtectedFile[]', () => {
            expect(typeof manager.getProtectedFiles).toBe('function');

            const result = manager.getProtectedFiles();
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('Behavioral Guarantees', () => {
        it('isProtected should be true after registerFile', () => {
            const path = '/src/important.ts';

            expect(manager.isProtected(path)).toBe(false);
            manager.registerFile(path, 'Protected');
            expect(manager.isProtected(path)).toBe(true);
        });

        it('isProtected should be false after unregisterFile', () => {
            const path = '/src/important.ts';

            manager.registerFile(path, 'Protected');
            expect(manager.isProtected(path)).toBe(true);

            manager.unregisterFile(path);
            expect(manager.isProtected(path)).toBe(false);
        });

        it('getProtectionLevel should return registered level', () => {
            const path = '/src/critical.ts';

            manager.registerFile(path, 'Block');
            expect(manager.getProtectionLevel(path)).toBe('Block');

            manager.registerFile(path, 'Watch'); // Re-register with different level
            expect(manager.getProtectionLevel(path)).toBe('Watch');
        });

        it('getProtectedFiles should include all registered files', () => {
            manager.registerFile('/src/a.ts', 'Protected');
            manager.registerFile('/src/b.ts', 'Watch');

            const files = manager.getProtectedFiles();
            const paths = files.map(f => f.path);

            expect(paths).toContain('/src/a.ts');
            expect(paths).toContain('/src/b.ts');
        });
    });

    describe('Edge Cases (Consumer Safety)', () => {
        it('should handle empty string path', () => {
            expect(() => manager.isProtected('')).not.toThrow();
            expect(manager.isProtected('')).toBe(false);
        });

        it('should handle paths with special characters', () => {
            const weirdPath = '/path/with spaces/and$pecial#chars.ts';

            expect(() => manager.registerFile(weirdPath, 'Protected')).not.toThrow();
            expect(manager.isProtected(weirdPath)).toBe(true);
        });

        it('should be case-sensitive on case-sensitive systems', () => {
            manager.registerFile('/src/Index.ts', 'Protected');

            // On Linux/Mac, these should be different
            if (process.platform !== 'win32') {
                expect(manager.isProtected('/src/index.ts')).toBe(false);
            }
        });
    });
});
```

#### 1.2 SDK Decision Engine Contract

**File**: `packages/sdk/test/contracts/decision-engine.contract.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
    ProtectionDecisionEngine,
    ProtectionDecision
} from '../../src/protection/ProtectionDecisionEngine';

describe('Contract: ProtectionDecisionEngine', () => {
    let engine: ProtectionDecisionEngine;

    beforeEach(() => {
        engine = createTestEngine();
    });

    describe('Interface: evaluate()', () => {
        it('should return ProtectionDecision shape', () => {
            const result = engine.evaluate({
                filePath: '/src/index.ts',
                trigger: 'save'
            });

            // Required fields
            expect(result).toHaveProperty('shouldSnapshot');
            expect(result).toHaveProperty('shouldProceed');
            expect(result).toHaveProperty('reason');
            expect(result).toHaveProperty('riskScore');

            // Correct types
            expect(typeof result.shouldSnapshot).toBe('boolean');
            expect(typeof result.shouldProceed).toBe('boolean');
            expect(typeof result.reason).toBe('string');
            expect(typeof result.riskScore).toBe('number');
        });

        it('should accept all valid trigger types', () => {
            const triggers = ['save', 'manual', 'ai-detected'] as const;

            for (const trigger of triggers) {
                expect(() => {
                    engine.evaluate({ filePath: '/test.ts', trigger });
                }).not.toThrow();
            }
        });

        it('should accept optional changeMetrics', () => {
            expect(() => {
                engine.evaluate({
                    filePath: '/test.ts',
                    trigger: 'save',
                    changeMetrics: {
                        linesAdded: 10,
                        linesDeleted: 5,
                        charactersChanged: 150
                    }
                });
            }).not.toThrow();
        });

        it('should accept optional aiContext', () => {
            expect(() => {
                engine.evaluate({
                    filePath: '/test.ts',
                    trigger: 'save',
                    aiContext: {
                        detected: true,
                        tool: 'cursor',
                        confidence: 0.95
                    }
                });
            }).not.toThrow();
        });
    });

    describe('Determinism Guarantee', () => {
        it('should return identical results for identical inputs', () => {
            const input = {
                filePath: '/src/index.ts',
                trigger: 'save' as const,
                changeMetrics: { linesAdded: 10, linesDeleted: 5 }
            };

            const result1 = engine.evaluate(input);
            const result2 = engine.evaluate(input);

            expect(result1).toEqual(result2);
        });
    });

    describe('riskScore Guarantee', () => {
        it('should return score in 0-1 range', () => {
            const scenarios = [
                { filePath: '/test.ts', trigger: 'save' as const },
                { filePath: '/test.ts', trigger: 'ai-detected' as const },
                { filePath: '/critical.ts', trigger: 'save' as const,
                  changeMetrics: { linesAdded: 1000 } }
            ];

            for (const input of scenarios) {
                const result = engine.evaluate(input);
                expect(result.riskScore).toBeGreaterThanOrEqual(0);
                expect(result.riskScore).toBeLessThanOrEqual(1);
            }
        });
    });
});
```

---

### Tier 2: Trust Chain Tests (Catch Boundary Violations)

These tests verify that downstream components DON'T second-guess upstream decisions.

#### 2.1 VSCode Adapter Trust Tests

**File**: `apps/vscode/test/trust/adapter-trust.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VscodeStorageAdapter } from '../../src/adapters/VscodeStorageAdapter';
import { ProtectedFileRegistry } from '../../src/services/protectedFileRegistry';

describe('Trust Chain: SDK → VSCode Adapters', () => {
    describe('VscodeStorageAdapter', () => {
        let adapter: VscodeStorageAdapter;
        let mockStorage: any;

        beforeEach(() => {
            mockStorage = {
                finalizeSession: vi.fn(),
                storeSnapshot: vi.fn()
            };
            adapter = new VscodeStorageAdapter(mockStorage);
        });

        describe('storeSessionManifest trust', () => {
            it('should NOT store when SDK returns null', async () => {
                await adapter.storeSessionManifest(null);

                expect(mockStorage.finalizeSession).not.toHaveBeenCalled();
            });

            it('should store EXACTLY what SDK provides', async () => {
                const manifest = {
                    id: 'sess-123',
                    files: [{ path: '/test.ts', snapshotId: 'snap-1' }],
                    startedAt: 1000,
                    endedAt: 2000,
                    reason: 'idle' as const
                };

                await adapter.storeSessionManifest(manifest);

                expect(mockStorage.finalizeSession).toHaveBeenCalledWith(manifest);
            });

            it('should NOT modify manifest before storing', async () => {
                const manifest = {
                    id: 'sess-123',
                    files: [], // Empty files - SDK decided this is valid
                    startedAt: 0,
                    endedAt: 0,
                    reason: 'manual' as const
                };

                await adapter.storeSessionManifest(manifest);

                // Adapter must not have added/modified fields
                expect(mockStorage.finalizeSession).toHaveBeenCalledWith(manifest);
            });

            it('should NOT have conditional logic on files.length', async () => {
                // Code structure test
                const adapterSource = await import('fs').then(fs =>
                    fs.promises.readFile(
                        'apps/vscode/src/adapters/VscodeStorageAdapter.ts',
                        'utf-8'
                    )
                );

                // These patterns indicate trust violations
                expect(adapterSource).not.toMatch(/files\.length\s*===\s*0/);
                expect(adapterSource).not.toMatch(/files\.length\s*==\s*0/);
                expect(adapterSource).not.toMatch(/!files\.length/);
            });
        });
    });

    describe('ProtectedFileRegistry', () => {
        let registry: ProtectedFileRegistry;
        let mockSdkManager: any;

        beforeEach(() => {
            mockSdkManager = {
                isProtected: vi.fn(),
                getProtectionLevel: vi.fn(),
                getProtectedFiles: vi.fn().mockReturnValue([])
            };
            registry = new ProtectedFileRegistry(mockSdkManager);
        });

        describe('isProtected delegation', () => {
            it('should delegate to SDK without caching', () => {
                mockSdkManager.isProtected
                    .mockReturnValueOnce(true)
                    .mockReturnValueOnce(false);

                const result1 = registry.isProtected('/test.ts');
                const result2 = registry.isProtected('/test.ts');

                expect(result1).toBe(true);
                expect(result2).toBe(false);
                expect(mockSdkManager.isProtected).toHaveBeenCalledTimes(2);
            });

            it('should NOT have local isProtected logic', async () => {
                const registrySource = await import('fs').then(fs =>
                    fs.promises.readFile(
                        'apps/vscode/src/services/protectedFileRegistry.ts',
                        'utf-8'
                    )
                );

                // These patterns indicate local decision-making
                expect(registrySource).not.toMatch(/protectedPathsIndex\.has/);
                expect(registrySource).not.toMatch(/cachedFiles\.find/);
                expect(registrySource).not.toMatch(/this\.registry\.has/);
            });
        });
    });
});
```

#### 2.2 ProtectionLevelHandler Trust Tests

**File**: `apps/vscode/test/trust/protection-handler-trust.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProtectionLevelHandler } from '../../src/handlers/ProtectionLevelHandler';

describe('Trust Chain: SDK DecisionEngine → ProtectionLevelHandler', () => {
    let handler: ProtectionLevelHandler;
    let mockEngine: any;
    let mockSnapshotExecutor: any;
    let mockNotificationService: any;

    beforeEach(() => {
        mockEngine = {
            evaluate: vi.fn()
        };
        mockSnapshotExecutor = vi.fn();
        mockNotificationService = {
            showBlockNotification: vi.fn()
        };

        handler = new ProtectionLevelHandler(
            mockEngine,
            mockSnapshotExecutor,
            mockNotificationService
        );
    });

    describe('shouldSnapshot trust', () => {
        it('should execute snapshot when SDK says true', async () => {
            mockEngine.evaluate.mockReturnValue({
                shouldSnapshot: true,
                shouldProceed: true,
                reason: 'AI detected'
            });

            await handler.handle({ filePath: '/test.ts', trigger: 'save' });

            expect(mockSnapshotExecutor).toHaveBeenCalled();
        });

        it('should NOT execute snapshot when SDK says false', async () => {
            mockEngine.evaluate.mockReturnValue({
                shouldSnapshot: false,
                shouldProceed: true,
                reason: 'Low risk'
            });

            await handler.handle({ filePath: '/test.ts', trigger: 'save' });

            expect(mockSnapshotExecutor).not.toHaveBeenCalled();
        });

        it('should NOT have fallback snapshot logic', async () => {
            // SDK says don't snapshot, but context seems "risky"
            mockEngine.evaluate.mockReturnValue({
                shouldSnapshot: false,
                shouldProceed: true,
                reason: 'SDK decided no'
            });

            const context = {
                filePath: '/critical-file.ts',
                trigger: 'save',
                // Handler might be tempted to snapshot anyway
                changeMetrics: { linesAdded: 1000 }
            };

            await handler.handle(context);

            // Handler MUST trust SDK
            expect(mockSnapshotExecutor).not.toHaveBeenCalled();
        });
    });

    describe('shouldProceed trust', () => {
        it('should return false when SDK says false', async () => {
            mockEngine.evaluate.mockReturnValue({
                shouldSnapshot: true,
                shouldProceed: false, // SDK says block
                reason: 'Critical risk'
            });

            const result = await handler.handle({ filePath: '/test.ts', trigger: 'save' });

            expect(result.shouldProceed).toBe(false);
        });

        it('should NOT have override logic for shouldProceed', async () => {
            // SDK blocks, handler should NOT have "allow anyway" logic
            mockEngine.evaluate.mockReturnValue({
                shouldSnapshot: true,
                shouldProceed: false,
                reason: 'Blocked by policy'
            });

            const result = await handler.handle({ filePath: '/test.ts', trigger: 'save' });

            // No matter what, respect SDK
            expect(result.shouldProceed).toBe(false);
        });
    });

    describe('reason passthrough', () => {
        it('should pass SDK reason without modification', async () => {
            const sdkReason = 'High-risk AI-generated changes detected';
            mockEngine.evaluate.mockReturnValue({
                shouldSnapshot: true,
                shouldProceed: true,
                reason: sdkReason
            });

            const result = await handler.handle({ filePath: '/test.ts', trigger: 'save' });

            expect(result.reason).toBe(sdkReason);
        });
    });
});
```

---

### Tier 3: Single Source of Truth Tests

#### 3.1 State Ownership Tests

**File**: `apps/vscode/test/ssot/state-ownership.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

describe('Single Source of Truth Verification', () => {
    const VSCODE_SRC = 'apps/vscode/src';
    const SDK_SRC = 'packages/sdk/src';

    describe('Protected Files State', () => {
        it('should have exactly ONE protected files storage in SDK', () => {
            const sdkFiles = glob.sync(`${SDK_SRC}/**/*.ts`);

            let protectedStorageCount = 0;

            for (const file of sdkFiles) {
                const content = fs.readFileSync(file, 'utf-8');

                // Look for Map/Set that stores protected files
                if (content.includes('ProtectedFile') &&
                    (content.includes('new Map') || content.includes('new Set'))) {
                    protectedStorageCount++;
                }
            }

            expect(protectedStorageCount).toBe(1);
        });

        it('VSCode should NOT have its own protected files storage', () => {
            const vscodeFiles = glob.sync(`${VSCODE_SRC}/**/*.ts`);

            for (const file of vscodeFiles) {
                const content = fs.readFileSync(file, 'utf-8');

                // VSCode should not declare its own protected file storage
                const hasOwnStorage =
                    content.includes('private protectedFiles') ||
                    content.includes('private cachedFiles') ||
                    content.includes('protectedPathsIndex = new Set');

                if (hasOwnStorage) {
                    throw new Error(`VSCode has own protected storage in: ${file}`);
                }
            }
        });
    });

    describe('Session State', () => {
        it('should have exactly ONE session state owner', () => {
            const allFiles = glob.sync(`{${SDK_SRC},${VSCODE_SRC}}/**/*.ts`);

            let sessionStateOwners = [];

            for (const file of allFiles) {
                const content = fs.readFileSync(file, 'utf-8');

                // Look for session state declarations
                if (content.match(/private\s+(?:current)?session\s*[:=]/i) ||
                    content.match(/this\.candidates\s*=\s*new/)) {
                    sessionStateOwners.push(file);
                }
            }

            // Should only be SDK's SessionCoordinator
            expect(sessionStateOwners.length).toBeLessThanOrEqual(1);
            if (sessionStateOwners.length === 1) {
                expect(sessionStateOwners[0]).toContain('packages/sdk');
            }
        });
    });

    describe('Cooldown State', () => {
        it('should have exactly ONE cooldown storage', () => {
            const vscodeFiles = glob.sync(`${VSCODE_SRC}/**/*.ts`);

            let cooldownStorages = [];

            for (const file of vscodeFiles) {
                const content = fs.readFileSync(file, 'utf-8');

                if (content.includes('cooldown') &&
                    (content.includes('new Map') || content.includes('Map<'))) {
                    cooldownStorages.push(file);
                }
            }

            expect(cooldownStorages.length).toBe(1);
            expect(cooldownStorages[0]).toContain('CooldownCache');
        });

        it('should NOT have temporaryAllowances separate from CooldownCache', () => {
            const registryContent = fs.readFileSync(
                `${VSCODE_SRC}/services/protectedFileRegistry.ts`,
                'utf-8'
            );

            expect(registryContent).not.toContain('temporaryAllowances');
        });
    });
});
```

---

### Tier 4: Integration Tests (Decision Flows)

**File**: `apps/vscode/test/integration/decision-flows.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestHarness } from '../helpers/test-harness';

describe('Integration: Complete Decision Flows', () => {
    let harness: TestHarness;

    beforeEach(async () => {
        harness = await createTestHarness();
    });

    describe('File Save Flow', () => {
        it('Protected file save → SDK evaluation → Snapshot created', async () => {
            // Setup
            harness.sdkProtectionManager.registerFile('/src/index.ts', 'Protected');
            harness.mockAIDetection({ detected: true, tool: 'cursor', confidence: 0.9 });

            // Trigger
            await harness.simulateFileSave('/src/index.ts', 'new content');

            // Verify flow
            expect(harness.sdkDecisionEngine.evaluate).toHaveBeenCalledWith(
                expect.objectContaining({
                    filePath: '/src/index.ts',
                    trigger: 'save',
                    aiContext: expect.objectContaining({ detected: true })
                })
            );

            expect(harness.snapshotStore.create).toHaveBeenCalled();
            expect(harness.telemetry.track).toHaveBeenCalledWith(
                'snapshot.created',
                expect.any(Object)
            );
        });

        it('Unprotected file save → No SDK evaluation → No snapshot', async () => {
            // Setup - file is not protected
            harness.sdkProtectionManager.unregisterFile('/src/temp.ts');

            // Trigger
            await harness.simulateFileSave('/src/temp.ts', 'content');

            // SDK should still be consulted (it returns "not protected")
            expect(harness.sdkDecisionEngine.evaluate).toHaveBeenCalled();

            // But no snapshot should be created
            expect(harness.snapshotStore.create).not.toHaveBeenCalled();
        });

        it('Block level file save → Snapshot → Block proceed', async () => {
            // Setup
            harness.sdkProtectionManager.registerFile('/src/critical.ts', 'Block');
            harness.sdkDecisionEngine.evaluate.mockReturnValue({
                shouldSnapshot: true,
                shouldProceed: false, // Block!
                reason: 'Critical file blocked'
            });

            // Trigger
            const result = await harness.simulateFileSave('/src/critical.ts', 'changes');

            // Snapshot should be created (before block)
            expect(harness.snapshotStore.create).toHaveBeenCalled();

            // But save should be blocked
            expect(result.shouldProceed).toBe(false);
            expect(harness.notifications.showWarning).toHaveBeenCalled();
        });
    });

    describe('Session Lifecycle Flow', () => {
        it('First edit → Session started → Edits tracked → Finalize', async () => {
            // First edit starts session
            await harness.simulateFileSave('/src/a.ts', 'change 1');

            expect(harness.sdkSessionCoordinator.startSession).toHaveBeenCalled();
            expect(harness.sdkSessionCoordinator.addCandidate).toHaveBeenCalledWith(
                '/src/a.ts',
                expect.any(Object)
            );

            // More edits
            await harness.simulateFileSave('/src/b.ts', 'change 2');
            expect(harness.sdkSessionCoordinator.addCandidate).toHaveBeenCalledWith(
                '/src/b.ts',
                expect.any(Object)
            );

            // Finalize after idle
            await harness.advanceTime(5 * 60 * 1000); // 5 min idle

            expect(harness.sdkSessionCoordinator.finalizeSession).toHaveBeenCalled();
            expect(harness.sessionStore.create).toHaveBeenCalled();
        });

        it('Empty session → SDK returns null → No storage', async () => {
            // Start session but make no edits
            harness.sdkSessionCoordinator.finalizeSession.mockReturnValue(null);

            await harness.triggerSessionFinalization();

            // SDK said null, storage should NOT be called
            expect(harness.sessionStore.create).not.toHaveBeenCalled();
        });
    });
});
```

---

## Test Organization Summary

### New Test Structure

```
packages/sdk/test/
├── contracts/                    # Interface contracts
│   ├── protection-manager.contract.ts
│   ├── decision-engine.contract.ts
│   ├── session-coordinator.contract.ts
│   └── risk-analyzer.contract.ts
├── unit/                        # Existing unit tests
└── integration/                 # SDK internal integration

apps/vscode/test/
├── contracts/                   # VSCode's SDK adapter contracts
│   └── sdk-adapter.contract.ts
├── trust/                       # Trust chain validation
│   ├── adapter-trust.test.ts
│   ├── protection-handler-trust.test.ts
│   └── storage-trust.test.ts
├── ssot/                        # Single source of truth
│   └── state-ownership.test.ts
├── unit/                        # Existing unit tests
├── integration/                 # Decision flow integration
│   ├── decision-flows.test.ts
│   └── protection-delegation.test.ts
├── performance/                 # Existing performance tests
├── security/                    # Existing security tests
└── e2e/                        # Existing e2e tests

packages/core/test/
├── contracts/
│   └── risk-analyzer.contract.ts
└── unit/                       # Existing tests
```

### Test Priority Execution Order

1. **Contract tests first** - Define expected interfaces
2. **Trust tests second** - Catch delegation violations
3. **SSOT tests third** - Verify no duplicate state
4. **Integration tests fourth** - Validate complete flows
5. **Existing tests last** - Ensure no regressions

### Coverage Targets

| Test Type | Target | Rationale |
|-----------|--------|-----------|
| Contract | 100% of public interfaces | Defines API stability |
| Trust | 100% of adapter methods | Catches violations early |
| SSOT | All state-holding classes | Prevents fragmentation |
| Integration | All major user flows | Validates architecture |
| Unit | 80% of implementation | Existing standard |

---

## Running Tests

```bash
# Run new architecture tests
pnpm test --filter="**/contracts/**"
pnpm test --filter="**/trust/**"
pnpm test --filter="**/ssot/**"

# Run all tests with coverage
pnpm test --coverage

# Run specific test file
pnpm test packages/sdk/test/contracts/protection-manager.contract.ts
```
