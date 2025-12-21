# Workspace Vitals: Adaptive Risk Sensing for AI-Native Development

## The Problem with "Health Scores"

A traditional "health score" is:
- **Static** - A snapshot in time, not a trajectory
- **Reductive** - Collapses complex state into a single number
- **Reactive** - Tells you what happened, not what's coming
- **Generic** - Same score means different things in different contexts

SnapBack needs something more sophisticated: a **multi-dimensional, predictive signal system** that evolves with the coding session.

---

## Proposed Innovation: Workspace Vitals

Think of it like vital signs for your codebase - not a single "health score" but a real-time dashboard of interconnected signals that inform decisions.

### The Four Vital Signs

```
┌─────────────────────────────────────────────────────────────────────┐
│                      WORKSPACE VITALS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  💓 PULSE          🌡️ TEMPERATURE      📊 PRESSURE       🫁 OXYGEN   │
│  Change Velocity   AI Activity Level   Risk Accumulation  Coverage  │
│                                                                      │
│  ████░░░░ 45/min   🔥 HOT (Claude)     ▲▲▲ Rising        ████████░ │
│  Normal            High AI activity    3 unsaved changes  87% safe  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 💓 Pulse: Change Velocity
**What it measures:** Rate of file changes over time
**Signals:**
- `resting` (0-5 changes/min) - Normal development
- `elevated` (5-15 changes/min) - Active coding session
- `racing` (15-30 changes/min) - Refactoring or AI burst
- `critical` (30+ changes/min) - Likely automated/AI mass change

**Triggers:**
- Racing pulse + AI detected → Automatic checkpoint
- Critical pulse → Pause and confirm before continuing

#### 🌡️ Temperature: AI Activity Level
**What it measures:** Presence and intensity of AI tool usage
**Signals:**
- `cold` (0-20%) - Mostly human edits
- `warm` (20-50%) - Mixed human/AI
- `hot` (50-80%) - AI-assisted development
- `burning` (80%+) - Almost entirely AI-generated

**Context enrichment:**
- Which AI tool (Cursor, Copilot, Claude)
- Confidence of AI detection
- Pattern of AI vs human edits

**Triggers:**
- Temperature spike → Increase snapshot frequency
- Burning + critical files → Require confirmation

#### 📊 Pressure: Risk Accumulation
**What it measures:** Compound risk building over time without release
**Signals:**
- Unsnapshot'd changes count
- Time since last checkpoint
- Dependency chain depth affected
- Critical file modifications pending

**The Pressure Metaphor:**
```
Pressure builds when:
  ├── Time passes without snapshots
  ├── More files are modified
  ├── AI activity increases
  ├── Critical files are touched
  └── Dependency chains grow

Pressure releases when:
  ├── Snapshot is created
  ├── Changes are committed (git)
  ├── Session is finalized
  └── User explicitly acknowledges risk
```

**Triggers:**
- High pressure + no action → Nudge for snapshot
- Critical pressure → Auto-snapshot before allowing more changes

#### 🫁 Oxygen: Snapshot Coverage
**What it measures:** How well-protected is the current work
**Signals:**
- Percentage of modified files with snapshots
- Recency of snapshots (stale = low oxygen)
- Critical file coverage specifically

**Triggers:**
- Low oxygen + high temperature → Strong nudge
- Critical files with no oxygen → Block or warn

---

## Signal Composition: The Vitals Matrix

The power isn't in individual signals but in their **composition**:

```typescript
interface WorkspaceVitals {
  pulse: PulseLevel;      // Change velocity
  temperature: TempLevel; // AI activity
  pressure: number;       // 0-100 accumulation
  oxygen: number;         // 0-100 coverage

  // Computed fields
  trajectory: 'stable' | 'escalating' | 'critical' | 'recovering';
  recommendation: VitalsRecommendation;
  agentGuidance: AgentGuidance;
}

// Example compositions and their meanings:
const VITAL_PATTERNS = {
  // Normal development - no action needed
  healthy: {
    pulse: 'resting',
    temperature: 'cold',
    pressure: '<30',
    oxygen: '>80',
    action: 'continue',
  },

  // AI-assisted but controlled
  assistedDevelopment: {
    pulse: 'elevated',
    temperature: 'warm',
    pressure: '<50',
    oxygen: '>70',
    action: 'monitor',
  },

  // Getting risky - should snapshot soon
  elevatedRisk: {
    pulse: 'elevated',
    temperature: 'hot',
    pressure: '50-70',
    oxygen: '<70',
    action: 'nudge',
  },

  // High risk - need intervention
  criticalState: {
    pulse: 'racing',
    temperature: 'burning',
    pressure: '>70',
    oxygen: '<50',
    action: 'intervene',
  },

  // Danger zone - AI doing lots without safety net
  dangerZone: {
    pulse: 'critical',
    temperature: 'burning',
    pressure: '>85',
    oxygen: '<30',
    action: 'block_or_auto_snapshot',
  },
};
```

---

## Integration Points

### 1. AutoDecisionEngine Enhancement

Currently AutoDecisionEngine uses static thresholds. With Vitals:

```typescript
// Before: Static thresholds
if (riskScore > config.riskThreshold) {
  createSnapshot();
}

// After: Vitals-informed dynamic thresholds
const vitals = WorkspaceVitals.current();

// Thresholds adapt based on vitals
const effectiveThreshold = config.riskThreshold * vitals.thresholdMultiplier;
// High temperature → lower threshold (more protective)
// High oxygen → higher threshold (already protected)
// High pressure → lower threshold (need release)

if (riskScore > effectiveThreshold) {
  createSnapshot();
}
```

### 2. MCP Tool Enhancement

Expose vitals to AI agents via MCP:

```typescript
// New MCP tool: get_workspace_vitals
{
  name: "get_workspace_vitals",
  description: "Get current workspace health signals before making changes",
  returns: {
    pulse: "current change velocity",
    temperature: "AI activity level",
    pressure: "accumulated risk without snapshot",
    oxygen: "snapshot coverage percentage",
    recommendation: "suggested action before proceeding",
    safeToModify: ["file1.ts", "file2.ts"],
    requiresSnapshot: ["critical-file.ts"],
  }
}

// New MCP tool: acknowledge_vitals
{
  name: "acknowledge_risk",
  description: "Acknowledge current risk state and proceed with changes",
  params: {
    files: ["files to modify"],
    reason: "why proceeding despite risk",
  }
}
```

### 3. LLM Agent Guidance

When an AI agent queries SnapBack, include vitals context:

```typescript
// Context injection for AI agents
const agentContext = {
  currentVitals: vitals,
  guidance: {
    // Dynamic based on vitals
    shouldSnapshot: vitals.pressure > 60,
    riskyFiles: vitals.lowOxygenFiles,
    safeOperations: vitals.safeOperations,

    // Suggestions
    suggestion: vitals.pressure > 80
      ? "Consider creating a checkpoint before this change"
      : "Proceed normally",

    // Constraints
    blockedOperations: vitals.trajectory === 'critical'
      ? ['delete', 'refactor', 'mass-rename']
      : [],
  }
};
```

### 4. VS Code Status Bar

```
┌─────────────────────────────────────────┐
│ 💓45 🌡️🔥 📊78% 🫁92% │ SnapBack      │
└─────────────────────────────────────────┘
     │   │    │     │
     │   │    │     └── 92% coverage (good)
     │   │    └── 78% pressure (getting high)
     │   └── Hot temperature (AI active)
     └── 45 changes/min pulse
```

### 5. Dashboard Visualization

```
Session Timeline with Vitals Overlay
────────────────────────────────────────────────────
                    📊 Pressure spike
                         │
    🌡️ AI detected      ▼   💓 Pulse racing
         │          ┌───────┐    │
         ▼          │       │    ▼
    ─────●──────────●───────●────●──────────────▶ Time
         │          │       │    │
         │          │       │    └─ Auto-snapshot triggered
         │          │       └─ Manual snapshot (pressure release)
         │          └─ Pressure rising (no snapshot)
         └─ Session started
```

---

## Implementation Architecture

### Core Module: `@snapback/intelligence/vitals`

```typescript
// packages/intelligence/src/vitals/index.ts

export interface VitalsConfig {
  // Pulse thresholds
  pulseThresholds: {
    elevated: number;  // changes/min
    racing: number;
    critical: number;
  };

  // Temperature calibration
  temperatureWeights: {
    aiConfidence: number;
    toolMultiplier: Record<AITool, number>;
  };

  // Pressure decay
  pressureConfig: {
    baseAccumulationRate: number;
    decayOnSnapshot: number;
    criticalFileMultiplier: number;
  };

  // Oxygen calculation
  oxygenConfig: {
    staleThresholdMinutes: number;
    criticalFileWeight: number;
  };
}

export class WorkspaceVitals {
  private pulse: PulseTracker;
  private temperature: TemperatureMonitor;
  private pressure: PressureGauge;
  private oxygen: OxygenSensor;

  // Singleton per workspace
  static for(workspaceId: string): WorkspaceVitals;

  // Real-time vitals
  current(): VitalsSnapshot;

  // Historical trajectory
  trajectory(windowMinutes: number): VitalsTrajectory;

  // Event handlers
  onFileChange(event: FileChangeEvent): void;
  onSnapshot(snapshot: Snapshot): void;
  onAIDetected(detection: AIDetection): void;

  // Decision support
  shouldSnapshot(): { should: boolean; reason: string; urgency: Urgency };
  getAgentGuidance(): AgentGuidance;

  // Pressure release
  releasePressure(reason: PressureReleaseReason): void;
}
```

### Event Flow

```
FileChange Event
       │
       ▼
┌──────────────────┐
│  Vitals Engine   │
├──────────────────┤
│ • Update pulse   │
│ • Check AI temp  │
│ • Add pressure   │
│ • Calc oxygen    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Trajectory Calc  │
│ (is it getting   │
│  better/worse?)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│              Decision Router                  │
├──────────────────────────────────────────────┤
│ stable     → continue, update status bar     │
│ escalating → nudge user, increase monitoring │
│ critical   → auto-snapshot, warn user        │
│ recovering → relax thresholds                │
└──────────────────────────────────────────────┘
```

---

## Differentiation from Competitors

### What Others Do
- **Git hooks**: Point-in-time checks, no continuous monitoring
- **Linters**: Static analysis, no session awareness
- **IDE extensions**: Feature flags, not adaptive behavior

### What Vitals Enables
- **Predictive protection**: Act before problems, not after
- **Context-aware**: Same change = different response based on session state
- **AI-native**: Designed for LLM agent collaboration
- **Invisible until needed**: Vitals work silently, only surface when relevant

---

## Success Metrics

### Leading Indicators
- Vitals-triggered snapshots preventing data loss
- AI agents querying vitals before risky operations
- Pressure spikes correlated with recovery events

### Lagging Indicators
- Reduction in "oh no, what did I just do" moments
- Increase in snapshot coverage over time
- Decrease in emergency rollbacks

---

## Rollout Phases

### Phase 1: Pulse + Pressure (Week 1-2)
- Implement change velocity tracking
- Add pressure accumulation/decay
- Status bar indicator
- Basic auto-snapshot triggers

### Phase 2: Temperature + Oxygen (Week 3-4)
- Integrate with existing AI detection
- Add snapshot coverage calculation
- MCP tool exposure
- Dashboard visualization

### Phase 3: Agent Guidance (Week 5-6)
- LLM context injection
- Acknowledge/proceed flow
- Dynamic threshold adjustment
- Trajectory prediction

### Phase 4: Learning Loop (Week 7-8)
- Learn from user behavior
- Calibrate thresholds per-user
- Predict risky patterns
- Proactive suggestions

---

## Alternative Concepts Considered

### 1. "Codebase Entropy"
Measure disorder/randomness in changes. Rejected because:
- Too abstract for users to understand
- Hard to explain what "low entropy" means

### 2. "Technical Debt Pressure"
Real-time debt accumulation. Rejected because:
- Overlaps with existing linting tools
- Not specific to AI-native workflows

### 3. "Session Risk Profile"
Single risk score per session. Rejected because:
- Too similar to traditional health scores
- Loses multi-dimensional insight

### 4. "Codebase Homeostasis"
Biological equilibrium metaphor. Considered merging with Vitals because:
- Homeostasis = vitals returning to baseline
- Could be a future extension

---

## Open Questions

1. **Storage**: How much vitals history to keep? Per-session? Rolling 24h?
2. **Privacy**: Vitals are metadata-only, but confirm no file content leaks
3. **Performance**: Vitals calculation on every save—budget impact?
4. **Calibration**: How to set initial thresholds per-user/workspace?
5. **Agent Trust**: Should agents be able to override vitals warnings?

---

## Recommendation

**Implement Workspace Vitals** as the evolution of the "health score" concept. It provides:

1. **Richer signals** than a single score
2. **Predictive capability** through trajectory analysis
3. **AI-native design** with MCP integration
4. **Invisible UX** that only surfaces when valuable
5. **Clear metaphor** that users intuitively understand

This positions SnapBack as not just a "safety net" but an **intelligent co-pilot** for AI-native development.
