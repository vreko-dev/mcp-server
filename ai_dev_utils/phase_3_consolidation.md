# Quest: Phase 3 - Signal Bridge Implementation

**Goal:**
Create the SignalBridge that wraps `@snapback/engine` signal computations (burst detection, AI detection) for use within the VS Code extension context, integrating with the existing `AutoDecisionEngine`.

---

## Context

### Completed Phases
- ✅ Phase 0: Turborepo restructure (`packages/engine/`)
- ✅ Phase 1: Core capabilities (burst, AI detection, decision engine - 96 tests passing)
- ✅ Phase 2: StorageBridge (17 tests passing, V1/V2 routing works)

### Architecture Reference
```
┌─────────────────────────────────────────────────────────────┐
│  VS Code Extension (apps/vscode/)                           │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  AutoDecisionEngine (existing)                         │ │
│  │  - Aggregates signals                                  │ │
│  │  - Makes protection decisions                          │ │
│  └──────────────────────────┬────────────────────────────┘ │
│                             │ uses                          │
│  ┌──────────────────────────▼────────────────────────────┐ │
│  │  SignalBridge (NEW)                                    │ │
│  │  - Wraps engine signals for VS Code context            │ │
│  │  - Converts TextDocument → engine input format         │ │
│  │  - Feature-flagged (useV2Engine)                       │ │
│  └──────────────────────────┬────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────┘
                              │ imports
┌─────────────────────────────▼───────────────────────────────┐
│  @snapback/engine (packages/engine/)                        │
│  - detectBurst()                                            │
│  - detectAI()                                               │
│  - Already tested (51 tests)                                │
└─────────────────────────────────────────────────────────────┘
```

### Files to Reference

**Engine signals (already implemented):**
```
packages/engine/src/signals/burst.ts        # detectBurst(), BurstState
packages/engine/src/signals/ai-detection.ts # detectAI(), AIDetectionResult
packages/engine/src/index.ts                # Public exports
```

**Existing extension code:**
```
apps/vscode/src/engine/BurstDetector.ts     # V1 burst detection
apps/vscode/src/engine/AIPresenceDetector.ts # V1 AI detection (if exists)
apps/vscode/src/domain/engine.ts            # AutoDecisionEngine
apps/vscode/src/bridges/StorageBridge.ts    # Pattern reference
apps/vscode/test/unit/setup.ts              # Has @snapback/engine mock
```

---

## Acceptance Criteria

### Core Implementation
- [ ] Create `apps/vscode/src/bridges/SignalBridge.ts`
- [ ] Implement `computeBurst(document: vscode.TextDocument, changes: vscode.TextDocumentContentChangeEvent[]): BurstState`
- [ ] Implement `detectAI(document: vscode.TextDocument, changes: vscode.TextDocumentContentChangeEvent[]): AIDetectionResult`
- [ ] Implement `calculateRisk(files: vscode.Uri[]): RiskSignal` (optional, if risk signal exists in engine)
- [ ] Feature flag support: `snapback.useV2Engine`
- [ ] V1 fallback: delegate to existing detectors when flag is false

### Integration
- [ ] Export types compatible with `AutoDecisionEngine` expectations
- [ ] No breaking changes to existing signal consumers
- [ ] Performance: signal computation <50ms for files <1000 LOC

### Tests
- [ ] Create `apps/vscode/test/unit/bridges/SignalBridge.spec.ts`
- [ ] Test V1 mode routing (delegates to existing detectors)
- [ ] Test V2 mode routing (uses @snapback/engine)
- [ ] Test VS Code document → engine input conversion
- [ ] Test performance budget compliance
- [ ] All tests pass

---

## Implementation Specification

### SignalBridge Interface

```typescript
// apps/vscode/src/bridges/SignalBridge.ts

import * as vscode from 'vscode';
import type { BurstState, AIDetectionResult } from '@snapback/engine';

export interface SignalBridgeOptions {
  useV2Engine: boolean;
}

export class SignalBridge {
  private useV2: boolean;
  private v1BurstDetector?: BurstDetector;  // Existing V1
  private changeHistory: ChangeEvent[] = []; // For burst detection window

  constructor(options?: SignalBridgeOptions) {
    this.useV2 = options?.useV2Engine ??
      vscode.workspace.getConfiguration('snapback').get('useV2Engine', false);

    if (!this.useV2) {
      this.v1BurstDetector = new BurstDetector(/* existing config */);
    }
  }

  /**
   * Compute burst state from document changes
   * @param document The changed document
   * @param changes The content changes
   * @returns BurstState indicating if rapid changes detected
   */
  computeBurst(
    document: vscode.TextDocument,
    changes: vscode.TextDocumentContentChangeEvent[]
  ): BurstState {
    if (!this.useV2) {
      return this.v1ComputeBurst(document, changes);
    }
    return this.v2ComputeBurst(document, changes);
  }

  /**
   * Detect AI tool usage from document changes
   * @param document The changed document
   * @param changes The content changes
   * @returns AIDetectionResult with tool identification
   */
  detectAI(
    document: vscode.TextDocument,
    changes: vscode.TextDocumentContentChangeEvent[]
  ): AIDetectionResult {
    if (!this.useV2) {
      return this.v1DetectAI(document, changes);
    }
    return this.v2DetectAI(document, changes);
  }

  /**
   * Record a change event for burst tracking
   */
  recordChange(document: vscode.TextDocument, change: vscode.TextDocumentContentChangeEvent): void {
    // Add to history, prune old entries
  }

  /**
   * Reset detection state (e.g., on session end)
   */
  reset(): void {
    this.changeHistory = [];
    this.v1BurstDetector?.reset?.();
  }

  // Private V1 implementations
  private v1ComputeBurst(...): BurstState { /* delegate to existing */ }
  private v1DetectAI(...): AIDetectionResult { /* delegate to existing */ }

  // Private V2 implementations
  private v2ComputeBurst(...): BurstState { /* use @snapback/engine */ }
  private v2DetectAI(...): AIDetectionResult { /* use @snapback/engine */ }
}
```

### VS Code → Engine Input Conversion

```typescript
// Helper to convert VS Code types to engine input

interface EngineChangeEvent {
  timestamp: number;
  charsChanged: number;
  path: string;
  content?: string;
}

function toEngineChanges(
  document: vscode.TextDocument,
  changes: vscode.TextDocumentContentChangeEvent[]
): EngineChangeEvent[] {
  return changes.map(change => ({
    timestamp: Date.now(),
    charsChanged: change.text.length,
    path: document.uri.fsPath,
    content: change.text,
  }));
}
```

### Integration with AutoDecisionEngine

The existing `AutoDecisionEngine` (or similar) should consume SignalBridge:

```typescript
// In AutoDecisionEngine or SaveHandler

class AutoDecisionEngine {
  private signalBridge: SignalBridge;

  constructor() {
    this.signalBridge = new SignalBridge();
  }

  async evaluate(document: vscode.TextDocument, changes: ...): Decision {
    const burstState = this.signalBridge.computeBurst(document, changes);
    const aiResult = this.signalBridge.detectAI(document, changes);

    // Aggregate signals into decision
    return this.makeDecision({ burst: burstState, ai: aiResult });
  }
}
```

---

## Tests

### Test Structure

```typescript
// apps/vscode/test/unit/bridges/SignalBridge.spec.ts

describe('SignalBridge', () => {
  describe('V1 Mode (useV2Engine: false)', () => {
    it('delegates computeBurst to V1 BurstDetector');
    it('delegates detectAI to V1 AIPresenceDetector');
    it('returns BurstState compatible with AutoDecisionEngine');
    it('returns AIDetectionResult compatible with AutoDecisionEngine');
  });

  describe('V2 Mode (useV2Engine: true)', () => {
    it('uses @snapback/engine detectBurst');
    it('uses @snapback/engine detectAI');
    it('converts TextDocument to engine input format');
    it('converts TextDocumentContentChangeEvent to engine format');
    it('maintains change history for burst window');
  });

  describe('Input Conversion', () => {
    it('extracts charsChanged from change events');
    it('extracts timestamp for each change');
    it('handles multi-change events');
    it('handles empty change arrays');
  });

  describe('Performance', () => {
    it('computes burst within 50ms for 1000 LOC file');
    it('detects AI within 50ms for 1000 LOC file');
  });

  describe('State Management', () => {
    it('tracks change history across calls');
    it('prunes old changes from history');
    it('resets state on reset() call');
  });
});
```

---

## Validation

```bash
# Run SignalBridge tests
pnpm --filter snapback-vscode test -- --grep "SignalBridge"

# Run all bridge tests
pnpm --filter snapback-vscode test -- --grep "Bridge"

# Typecheck
pnpm --filter snapback-vscode typecheck

# Build
pnpm --filter snapback-vscode build
```

---

## Guardrails

### DO NOT
- Modify `@snapback/engine` signal implementations
- Break existing `AutoDecisionEngine` integration
- Remove V1 detection code (keep for fallback)
- Exceed 50ms performance budget

### PRESERVE
- Existing signal type contracts
- V1 behavior when flag is false
- Thread safety (if applicable)

### FOLLOW
- StorageBridge pattern for V1/V2 routing
- Existing mock pattern in `setup.ts` for engine imports
- Test naming conventions from StorageBridge.spec.ts

---

## Definition of Done

- [ ] `SignalBridge.ts` created with V1/V2 routing
- [ ] `SignalBridge.spec.ts` with comprehensive tests
- [ ] All SignalBridge tests pass
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Performance budget met (<50ms)
- [ ] Integration point with AutoDecisionEngine documented

---

## Estimated Time

| Task | Estimate |
|------|----------|
| Create SignalBridge class | 1.5h |
| Implement V1 delegation | 30min |
| Implement V2 engine calls | 1h |
| Input conversion helpers | 30min |
| Write tests | 1.5h |
| Integration verification | 30min |
| **Total** | **~5.5 hours** |
