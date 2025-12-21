# Workspace Vitals - Implementation Instructions

**Status**: Phase 1, 2, 3 & 4 Complete ✅ (Fully Integrated)
**Last Validated**: December 2024
**Tests**: 176 passing (packages/intelligence module)
**Priority**: Phase 5 - Persistence & UI

---

## Quick Reference

### What is Vitals?
Four real-time signals that drive automatic protection decisions:

| Signal | Measures | Thresholds |
|--------|----------|------------|
| 💓 **Pulse** | Change velocity (changes/min) | resting <15, elevated <30, racing <50, critical ≥50 |
| 🌡️ **Temperature** | AI activity percentage | cold <20%, warm <50%, hot <80%, burning ≥80% |
| 📊 **Pressure** | Risk accumulation (0-100) | builds over time, decays 50% on snapshot |
| 🫁 **Oxygen** | Snapshot coverage (0-100%) | stale after 30 min |

### Decision Matrix
```
Trajectory    | Condition                              | Action
--------------|----------------------------------------|---------------------
stable        | pressure <30, oxygen >80               | continue
escalating    | pressure >60 OR (hot + racing)         | nudge user
critical      | pressure >80 + burning + oxygen <50    | auto-snapshot
recovering    | pressure trend down, oxygen >70        | relax thresholds
```

---

## Implementation Location

### Package: `@snapback/intelligence` (EXISTING)

Vitals lives in the existing `@snapback/intelligence` package as a new submodule, following the established pattern of context, learning, policy, storage, and validation modules.

```
packages/intelligence/
├── src/
│   ├── Intelligence.ts          # Main facade - ADD vitals methods
│   ├── index.ts                 # Exports - ADD vitals exports
│   │
│   ├── context/                 # ✅ EXISTS - ContextEngine, SemanticRetriever
│   ├── learning/                # ✅ EXISTS - LearningEngine, ViolationTracker
│   ├── policy/                  # ✅ EXISTS - PolicyEngine, detectors
│   ├── storage/                 # ✅ EXISTS - ConfigStore, JsonlStore
│   ├── validation/              # ✅ EXISTS - ValidationPipeline, layers
│   ├── types/                   # ✅ EXISTS - ADD vitals.ts
│   │
│   └── vitals/                  # ← CREATE THIS MODULE
│       ├── index.ts             # Public exports
│       ├── WorkspaceVitals.ts   # Core engine (singleton per workspace)
│       ├── PulseTracker.ts      # Change velocity tracking
│       ├── TemperatureMonitor.ts # AI activity level
│       ├── PressureGauge.ts     # Risk accumulation
│       └── OxygenSensor.ts      # Snapshot coverage
│
├── package.json                 # ADD vitals subpath export
└── tsup.config.ts               # ADD vitals entry point
```

### Subpath Export (add to package.json)

```json
{
  "exports": {
    "./vitals": {
      "types": "./dist/vitals/index.d.ts",
      "default": "./dist/vitals/index.js"
    }
  },
  "typesVersions": {
    "*": {
      "vitals": ["./dist/vitals/index.d.ts"]
    }
  }
}
```

### Consumer Import Paths

```typescript
// Direct submodule import (recommended for MCP servers)
import { WorkspaceVitals, getAgentGuidance } from '@snapback/intelligence/vitals';

// Via main facade (for apps using Intelligence)
import { Intelligence } from '@snapback/intelligence';
const intel = new Intelligence({ rootDir: 'workspace' });
const vitals = intel.getVitals(workspaceId);

// Types only
import type { VitalsSnapshot, Trajectory } from '@snapback/intelligence/vitals';
```

---

## Integration with Existing Intelligence Facade

### Add to Intelligence.ts

```typescript
// packages/intelligence/src/Intelligence.ts

import { WorkspaceVitals } from './vitals/index.js';
import type { VitalsSnapshot, AgentGuidance } from './vitals/index.js';

export class Intelligence {
  // ... existing code ...

  // =========================================================================
  // VITALS (Workspace Health Sensing)
  // =========================================================================

  /**
   * Get or create WorkspaceVitals for a workspace
   * Singleton per workspaceId
   */
  getVitals(workspaceId: string): WorkspaceVitals {
    return WorkspaceVitals.for(workspaceId, this.config);
  }

  /**
   * Get current vitals snapshot for a workspace
   */
  getVitalsSnapshot(workspaceId: string): VitalsSnapshot {
    return this.getVitals(workspaceId).current();
  }

  /**
   * Get agent guidance based on current vitals
   * Used by MCP tools to inform AI behavior
   */
  getAgentGuidance(workspaceId: string): AgentGuidance {
    return this.getVitals(workspaceId).getAgentGuidance();
  }

  /**
   * Check if workspace should create a snapshot based on vitals
   */
  shouldSnapshot(workspaceId: string): { should: boolean; reason: string; urgency: Urgency } {
    return this.getVitals(workspaceId).shouldSnapshot();
  }
}
```

### Add to index.ts exports

```typescript
// packages/intelligence/src/index.ts

// Vitals module
export {
  WorkspaceVitals,
  type VitalsSnapshot,
  type VitalsConfig,
  type AgentGuidance,
  type PulseLevel,
  type TempLevel,
  type Trajectory,
  type Urgency,
} from './vitals/index.js';
```

---

## Integration Points (Existing Components)

### From `@snapback/sdk` (use for Temperature)

```typescript
// Temperature monitor should use existing AI detection
import { detectAIPresence, AIPresenceInfo } from '@snapback/sdk';

// In TemperatureMonitor.ts
onFileChange(event: FileChangeEvent): void {
  const aiInfo = detectAIPresence();
  if (aiInfo.hasAI) {
    this.recordAIActivity(aiInfo.detectedAssistants[0]);
  } else {
    this.recordHumanActivity();
  }
}
```

### VS Code Extension Integration

```typescript
// apps/vscode/src/integration/AutoDecisionIntegration.ts

import { WorkspaceVitals } from '@snapback/intelligence/vitals';

export class AutoDecisionIntegration {
  private vitals: WorkspaceVitals;

  constructor(/* ... */) {
    // Get vitals for this workspace
    const workspaceId = this.workspaceContextManager.getWorkspaceRoot() || 'default';
    this.vitals = WorkspaceVitals.for(workspaceId);
  }

  private onFileChange(event: FileChangeEvent): void {
    // Feed events to vitals
    this.vitals.onFileChange({
      path: event.filePath,
      isAI: detectAIPresence().hasAI,
      tool: detectAIPresence().detectedAssistants[0],
    });

    // ... existing processing ...
  }

  private async processBatch(): Promise<void> {
    // Use vitals for dynamic threshold
    const thresholdMultiplier = this.vitals.getThresholdMultiplier();
    const effectiveThreshold = this.config.riskThreshold * thresholdMultiplier;

    // ... rest of processing ...
  }
}
```

### SignalAggregator Enhancement

```typescript
// apps/vscode/src/domain/signalAggregator.ts

import type { VitalsSnapshot } from '@snapback/intelligence/vitals';

// ADD new signal type
export interface VitalsSignal {
  snapshot: VitalsSnapshot;
  thresholdMultiplier: number;
}

export class SignalAggregator {
  private vitalsSignal: VitalsSignal | null = null;

  setVitalsSignal(signal: VitalsSignal): void {
    this.vitalsSignal = signal;
  }

  aggregate(files: FileInfo[], repoId: string): SaveContext {
    return {
      ...existingContext,
      vitals: this.vitalsSignal,  // NEW field
    };
  }
}
```

---

## MCP Tool Specifications

### get_workspace_vitals (User-Facing MCP)

```typescript
// apps/mcp-server/src/tools/get-workspace-vitals.ts

import { WorkspaceVitals } from '@snapback/intelligence/vitals';

export const getWorkspaceVitalsTool = {
  name: 'get_workspace_vitals',
  description: 'Get current workspace health signals before making changes. Returns pulse (change velocity), temperature (AI activity), pressure (risk accumulation), and oxygen (snapshot coverage).',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceId: {
        type: 'string',
        description: 'Workspace path or identifier'
      }
    },
    required: ['workspaceId']
  },
  handler: async ({ workspaceId }: { workspaceId: string }) => {
    const vitals = WorkspaceVitals.for(workspaceId);
    const current = vitals.current();
    const guidance = vitals.getAgentGuidance();

    return {
      vitals: {
        pulse: current.pulse,
        temperature: current.temperature,
        pressure: current.pressure,
        oxygen: current.oxygen,
        trajectory: current.trajectory
      },
      guidance: {
        shouldSnapshot: guidance.shouldSnapshot,
        riskyFiles: guidance.riskyFiles,
        safeOperations: guidance.safeOperations,
        blockedOperations: guidance.blockedOperations,
        suggestion: guidance.suggestion
      }
    };
  }
};
```

### acknowledge_risk (User-Facing MCP)

```typescript
// apps/mcp-server/src/tools/acknowledge-risk.ts

import { logger } from '../utils/logger';
import { telemetry } from '../telemetry';

export const acknowledgeRiskTool = {
  name: 'acknowledge_risk',
  description: 'Acknowledge risk state and proceed with changes. Use when you understand the risks and want to continue.',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceId: { type: 'string' },
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'Files you intend to modify'
      },
      reason: {
        type: 'string',
        description: 'Why proceeding despite risk'
      }
    },
    required: ['workspaceId', 'files', 'reason']
  },
  handler: async (params: { workspaceId: string; files: string[]; reason: string }) => {
    // Log for audit trail
    logger.info('Risk acknowledged', {
      workspaceId: params.workspaceId,
      files: params.files,
      reason: params.reason,
      timestamp: Date.now()
    });

    // Emit telemetry
    telemetry.capture('vitals_risk_acknowledged', {
      fileCount: params.files.length,
      hasReason: !!params.reason
    });

    return {
      acknowledged: true,
      reminder: 'Consider creating a snapshot after your changes'
    };
  }
};
```

### Internal MCP (ai_dev_utils)

The internal MCP can also use vitals for self-awareness during development:

```typescript
// ai_dev_utils/mcp/tools/dev-vitals.ts

import { WorkspaceVitals } from '@snapback/intelligence/vitals';

// Tool: get_dev_vitals
// Used by AI pair programmer to understand codebase health during development
```

---

## Performance Budget (CRITICAL)

| Operation | Budget | Notes |
|-----------|--------|-------|
| `vitals.onFileChange()` | <5ms | Called on every save |
| `vitals.current()` | <10ms | Snapshot calculation |
| `vitals.shouldSnapshot()` | <5ms | Decision check |
| StatusBar update | <1ms | Throttled to 200ms |
| **Total per-save overhead** | **<20ms** | Must stay under 50ms budget |

### Optimization Requirements
1. **No I/O** in hot path - vitals are in-memory only
2. **Throttle** StatusBar updates (not on every change)
3. **Lazy compute** trajectory only when needed
4. **Bounded history** - max 100 snapshots, FIFO

---

## Types (add to packages/intelligence/src/types/vitals.ts)

```typescript
// packages/intelligence/src/types/vitals.ts

export type PulseLevel = 'resting' | 'elevated' | 'racing' | 'critical';
export type TempLevel = 'cold' | 'warm' | 'hot' | 'burning';
export type Trajectory = 'stable' | 'escalating' | 'critical' | 'recovering';
export type Urgency = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface VitalsSnapshot {
  timestamp: number;
  pulse: {
    level: PulseLevel;
    changesPerMinute: number;
  };
  temperature: {
    level: TempLevel;
    aiPercentage: number;
    detectedTool?: string;
  };
  pressure: {
    value: number; // 0-100
    unsnapshotedChanges: number;
    timeSinceLastSnapshot: number;
    criticalFilesTouched: string[];
  };
  oxygen: {
    value: number; // 0-100
    coveragePercentage: number;
    staleSnapshots: number;
  };
  trajectory: Trajectory;
}

export interface VitalsConfig {
  pulse: {
    elevated: number;  // changes/min threshold (default: 15)
    racing: number;    // (default: 30)
    critical: number;  // (default: 50)
    windowSeconds: number; // (default: 60)
  };
  temperature: {
    warm: number;      // AI percentage (default: 20)
    hot: number;       // (default: 50)
    burning: number;   // (default: 80)
    decaySeconds: number; // (default: 300)
  };
  pressure: {
    baseRate: number;         // pressure/min (default: 5)
    criticalMultiplier: number; // (default: 2)
    decayOnSnapshot: number;   // percentage (default: 50)
    maxPressure: number;       // (default: 100)
  };
  oxygen: {
    staleMinutes: number;     // (default: 30)
    criticalWeight: number;   // (default: 2)
  };
}

export interface AgentGuidance {
  shouldSnapshot: boolean;
  snapshotReason?: string;
  riskyFiles: string[];
  safeOperations: string[];
  blockedOperations: string[];
  suggestion: string;
}
```

---

## Test Requirements

### Unit Tests (packages/intelligence/src/vitals/__tests__/)

```typescript
// WorkspaceVitals.test.ts
describe('WorkspaceVitals', () => {
  describe('pulse tracking', () => {
    it('should classify resting at <15 changes/min');
    it('should classify elevated at 15-29 changes/min');
    it('should classify racing at 30-49 changes/min');
    it('should classify critical at >=50 changes/min');
    it('should prune events older than window');
  });

  describe('temperature monitoring', () => {
    it('should track AI vs human activity ratio');
    it('should detect AI tool from event');
    it('should decay temperature over 5 minutes');
  });

  describe('pressure gauge', () => {
    it('should accumulate pressure on file changes');
    it('should apply 2x multiplier for critical files');
    it('should release 50% pressure on snapshot');
    it('should accumulate time-based pressure');
  });

  describe('oxygen sensor', () => {
    it('should track snapshot coverage percentage');
    it('should mark snapshots stale after 30 minutes');
    it('should weight critical files 2x');
  });

  describe('trajectory calculation', () => {
    it('should return critical when pressure>80 + burning + oxygen<50');
    it('should return escalating when pressure>60 OR (hot + racing)');
    it('should return recovering when pressure trend down + oxygen>70');
    it('should return stable otherwise');
  });

  describe('threshold multiplier', () => {
    it('should lower threshold when temperature is hot (0.8x)');
    it('should raise threshold when oxygen is high (1.2x)');
    it('should compound multipliers correctly');
  });

  describe('singleton behavior', () => {
    it('should return same instance for same workspaceId');
    it('should return different instances for different workspaceIds');
  });
});
```

---

## Telemetry Events (Add to PostHog)

```typescript
// Add to packages/infrastructure/src/telemetry/events.ts

export const VITALS_EVENTS = {
  // State changes
  VITALS_TRAJECTORY_CHANGED: 'vitals_trajectory_changed',
  VITALS_CRITICAL_STATE: 'vitals_critical_state',

  // Decisions
  VITALS_AUTO_SNAPSHOT: 'vitals_auto_snapshot',
  VITALS_NUDGE_SHOWN: 'vitals_nudge_shown',
  VITALS_RISK_ACKNOWLEDGED: 'vitals_risk_acknowledged',

  // MCP usage
  VITALS_AGENT_QUERIED: 'vitals_agent_queried',
  VITALS_AGENT_BLOCKED: 'vitals_agent_blocked'
} as const;
```

---

## Migration Checklist

### Phase 1: Foundation (Week 1-2) ✅ COMPLETE
- [x] Create `packages/intelligence/src/vitals/` directory
- [x] Implement PulseTracker with tests (15 tests passing)
- [x] Implement PressureGauge with tests (18 tests passing)
- [x] Add vitals types to `packages/intelligence/src/types/vitals.ts`
- [x] Add subpath export to package.json
- [x] Export from main index.ts

### Phase 2: Full Engine (Week 3-4) ✅ COMPLETE
- [x] Implement TemperatureMonitor with tests (18 tests passing)
- [x] Implement OxygenSensor with tests (18 tests passing)
- [x] Implement WorkspaceVitals main class (25 tests passing)
- [x] Add vitals methods to Intelligence facade (lines 224-258)
- [x] Wire to AutoDecisionIntegration in VS Code extension ✅ **DONE**
- [x] Add threshold multiplier to engine

### Phase 3: UI & MCP (Week 5-6) ✅ COMPLETE
- [x] Create StatusBar vitals display (VS Code) ✅ **DONE** - StatusBarManager + VitalsIntegration wired into extension.ts
- [x] Implement get_workspace_vitals MCP tool ✅ **DONE**
- [x] Implement acknowledge_risk MCP tool ✅ **DONE**
- [x] Add telemetry events to PostHog ✅ **DONE** - vitals_trajectory_changed, vitals_critical_state
- [ ] Dashboard visualization (future)

### Phase 4: Learning (Week 7-8) ✅ COMPLETE + INTEGRATED
- [x] User behavior learning - UserBehaviorLearner tracks snapshot patterns
- [x] Per-workspace threshold calibration - ThresholdCalibrator with lifecycle (uncalibrated→learning→calibrated→locked)
- [x] Trajectory prediction improvements - TrajectoryPredictor forecasts future states
- [x] Proactive suggestions - Types defined, ready for wiring
- [x] **Integration Complete:**
  - [x] recordBehavior() wired to AutoDecisionIntegration.ts (lines 676, 695)
  - [x] MCP tools expose forecast, calibration, behaviorStats
  - [x] Intelligence facade exposes Phase 4 methods

### Phase 5: Persistence & UI (Future)
- [ ] Persist learning data to disk
- [ ] Dashboard visualization
- [ ] Proactive suggestion UI

---

## Open Decisions

| Question | Options | Recommended |
|----------|---------|-------------|
| Singleton scope? | Per session vs per workspace | **Per workspace** (persistent during extension lifecycle) |
| How much history to keep? | 50/100/unlimited | **100 snapshots** (bounded FIFO) |
| Should agents override warnings? | Yes/No/Tiered | **Tiered by trust level** |
| StatusBar update frequency? | Every change/200ms/500ms | **200ms throttle** |
| Store vitals history to disk? | Yes/No | **No** (memory only for performance) |

---

## Related Documents

- `workspace_vitals_design.md` - Conceptual design and rationale
- `vitals_implementation.ts` - Reference implementation sketch
- `migrate_2_vitals.md` - Migration strategy from Protection Levels

---

*Last updated: December 2024*
*Validated against codebase: packages/intelligence exists with context, learning, policy, storage, validation, types modules*
