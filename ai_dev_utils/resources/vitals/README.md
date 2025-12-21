# Vitals Documentation

This directory contains the design and implementation specifications for the **Workspace Vitals** system - SnapBack's adaptive risk sensing for AI-native development.

## Documents

| File | Purpose | Status |
|------|---------|--------|
| `workspace_vitals_design.md` | Conceptual design, rationale, and architecture | ✅ Complete |
| `vitals_implementation.ts` | Reference TypeScript implementation sketch | ✅ Complete |
| `migrate_2_vitals.md` | Migration strategy from Protection Levels | ✅ Complete |
| `VITALS_INSTRUCTIONS.md` | **Validated implementation instructions** | ✅ Updated Dec 2024 |

## Package Location

Vitals will be implemented in the **existing** `@snapback/intelligence` package:

```
packages/intelligence/src/vitals/    # ← New module
├── index.ts
├── WorkspaceVitals.ts
├── PulseTracker.ts
├── TemperatureMonitor.ts
├── PressureGauge.ts
└── OxygenSensor.ts
```

Import via:
```typescript
import { WorkspaceVitals } from '@snapback/intelligence/vitals';
```

## Quick Start

1. Read `workspace_vitals_design.md` for the conceptual overview
2. Review `VITALS_INSTRUCTIONS.md` for validated implementation paths
3. Use `vitals_implementation.ts` as a reference when coding
4. Follow `migrate_2_vitals.md` for the Protection Levels transition

## Key Concepts

```
💓 Pulse       → Change velocity (how fast is code changing?)
🌡️ Temperature → AI activity level (how much AI involvement?)
📊 Pressure    → Risk accumulation (how long without snapshot?)
🫁 Oxygen      → Snapshot coverage (how protected is the work?)
```

## Trajectory States

| State | Condition | Action |
|-------|-----------|--------|
| `stable` | pressure <30, oxygen >80 | Continue normally |
| `escalating` | pressure >60 OR (hot + racing) | Nudge user |
| `critical` | pressure >80 + burning + oxygen <50 | Auto-snapshot |
| `recovering` | pressure trend ↓, oxygen >70 | Relax thresholds |

## Integration Points

- **VS Code Extension**: `AutoDecisionIntegration` → feeds events to Vitals
- **MCP Server (user)**: `get_workspace_vitals`, `acknowledge_risk` tools
- **MCP Server (internal)**: `get_dev_vitals` for AI pair programmer
- **Intelligence Facade**: `intel.getVitals(workspaceId)` method

## UI/UX Implementation

See `../extension-ux/EXTENSION_UX_SPEC.md` for:
- Status bar vitals display mode
- Optional sidebar VITALS section
- Emoji indicators and formatting
- How vitals affects threshold multipliers

## Implementation Priority

| Phase | Focus | Timeline | Status |
|-------|-------|----------|--------|
| Phase 1 | PulseTracker + PressureGauge | Week 1-2 | ✅ **COMPLETE** (33 tests) |
| Phase 2 | Temperature + Oxygen + WorkspaceVitals | Week 3-4 | ✅ **COMPLETE** (98 tests) |
| Phase 3 | StatusBar + MCP tools + Telemetry | Week 5-6 | ✅ **COMPLETE** |
| Phase 4 | Learning & calibration | Week 7-8 | ⏳ Pending |

---

*Last updated: December 2024*
