# Protection Levels vs Workspace Vitals: Analysis

## TL;DR

**Vitals is a stronger alternative that can absorb Protection Levels as an optional power-user feature.**

The current system requires users to configure protection. Vitals enables fully automatic protection that "just works" - better aligned with your "invisible until needed" philosophy.

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CURRENT: Configuration-Driven                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User configures    →    Static Policy    →    On-Save Decision     │
│  Protection Level        per-file/pattern       (binary: matches?)   │
│                                                                      │
│  ┌─────────────┐      ┌──────────────┐      ┌──────────────────┐   │
│  │ .snapbackrc │  →   │ WATCH/WARN/  │  →   │ If BLOCK: modal  │   │
│  │ Right-click │      │ BLOCK level  │      │ If WARN: notify  │   │
│  │ Command     │      │              │      │ If WATCH: silent │   │
│  └─────────────┘      └──────────────┘      └──────────────────┘   │
│                                                                      │
│  + AutoDecisionEngine (risk threshold, AI detection)                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### What Protection Levels Do Well
- ✅ User intent is explicit ("this file matters to ME")
- ✅ Business context captured (user knows what's critical)
- ✅ Predictable behavior (same file = same response)
- ✅ Team sharing via .snapbackrc
- ✅ Inheritance model (anchor → deps)

### What Protection Levels Do Poorly
- ❌ Requires configuration before value
- ❌ Static - doesn't adapt to session context
- ❌ New files unprotected by default
- ❌ Can't predict problems, only respond
- ❌ Same response regardless of risk level

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     VITALS: Context-Driven (Primary)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Real-time     →    Dynamic      →    Adaptive         →  Optional  │
│  Signals            Assessment        Response             Override │
│                                                                      │
│  ┌──────────┐    ┌────────────┐    ┌───────────────┐   ┌─────────┐ │
│  │ 💓 Pulse │    │ Trajectory │    │ stable: none  │   │ BLOCK   │ │
│  │ 🌡️ Temp  │ →  │ stable/    │ →  │ escalating:   │ ← │ WARN    │ │
│  │ 📊 Press │    │ escalating/│    │   nudge/auto  │   │ WATCH   │ │
│  │ 🫁 O₂   │    │ critical   │    │ critical:     │   │ (opt-in)│ │
│  └──────────┘    └────────────┘    │   intervene   │   └─────────┘ │
│                                    └───────────────┘                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The Key Insight

**Protection Levels answer: "What files matter?"**
**Vitals answers: "What's happening right now?"**

These are different questions. But here's the insight:

### Vitals Can Infer Criticality

```typescript
// Vitals can learn what matters from behavior:
const inferredCriticality = {
  // Files that break builds when changed
  highChurn: files.filter(f => f.snapshotRestoreCount > 3),

  // Files AI touches cautiously
  aiCautious: files.filter(f => f.aiModificationPaused > 0),

  // Files at the root of dep graphs
  highFanout: files.filter(f => f.dependentCount > 10),

  // Files touched during "oh no" moments
  recoveryCorrelated: files.filter(f => f.involvedInRollback > 0),
};
```

With enough signal, Vitals can **automatically identify critical files** without user configuration.

---

## Comparison Matrix

| Dimension | Protection Levels | Workspace Vitals | Winner |
|-----------|------------------|------------------|--------|
| **Time to value** | Slow (config required) | Instant (automatic) | Vitals |
| **User burden** | High (decisions required) | None (invisible) | Vitals |
| **Adaptability** | Static | Dynamic | Vitals |
| **Predictive** | No | Yes (trajectory) | Vitals |
| **Explicit intent** | Yes | No (inferred) | Levels |
| **Team sharing** | .snapbackrc | N/A (session-based) | Levels |
| **Business context** | User provides | Must infer | Levels |
| **AI-native** | Retrofitted | Designed for it | Vitals |

---

## Recommendation: Vitals as Primary, Levels as Override

### The Evolution Path

```
PHASE 1 (Current): Protection Levels + AutoDecisionEngine
                   User configures → System responds

PHASE 2 (Proposed): Vitals as Primary
                    System senses → System responds → User can override

PHASE 3 (Future): Learning Vitals
                  System senses → Learns patterns → Predicts → User validates
```

### How They Compose

```typescript
// Vitals-first decision with Protection Level override
function shouldSnapshot(file: string, event: SaveEvent): Decision {
  const vitals = WorkspaceVitals.current();
  const protectionLevel = ProtectionManager.getLevel(file); // May be undefined

  // 1. Check explicit override first (power user intent)
  if (protectionLevel === 'BLOCK') {
    return { action: 'block', reason: 'User-defined BLOCK level' };
  }

  // 2. Vitals-driven decision (primary system)
  const vitalDecision = vitals.shouldSnapshot();

  if (vitalDecision.urgency === 'critical') {
    return { action: 'snapshot', reason: vitalDecision.reason };
  }

  if (vitalDecision.urgency === 'high' && !protectionLevel) {
    // No override, use vitals recommendation
    return { action: 'warn', reason: vitalDecision.reason };
  }

  // 3. Fall back to protection level if set
  if (protectionLevel === 'WARN') {
    return { action: 'warn', reason: 'User-defined WARN level' };
  }

  // 4. Default: Vitals-informed silent protection
  if (vitals.pressure.value > 40) {
    return { action: 'snapshot', reason: 'Proactive protection' };
  }

  return { action: 'continue', reason: 'Normal operation' };
}
```

---

## What This Means for UX

### Current UX (Protection Levels)
```
1. Install extension
2. Open file
3. Right-click → "Protect with SnapBack"
4. Choose: Watch/Warn/Block
5. (Repeat for other files)
6. Make changes
7. System responds based on level
```

**Problem:** Steps 3-5 are friction before value.

### Proposed UX (Vitals Primary)
```
1. Install extension
2. Open file
3. Make changes
4. System automatically protects based on vitals
5. (Optional) User sets explicit level for override
```

**Benefit:** Immediate value, configuration optional.

---

## What to Keep from Protection Levels

### Keep
- **Explicit BLOCK** for "never change without my attention"
- **.snapbackrc** for team policies
- **Inheritance model** for dependency protection

### Deprecate
- **Mandatory configuration** before protection
- **WATCH as default** (Vitals handles automatic protection)
- **Static thresholds** in AutoDecisionEngine

### Transform
- **WARN level** → Vitals "nudge" when pressure is high
- **Protection badges** → Vitals status indicator
- **Per-file config** → Per-file override (optional)

---

## Implementation Strategy

### Phase 1: Add Vitals (2 weeks)
- Implement WorkspaceVitals alongside existing system
- Vitals runs in parallel, logs decisions
- A/B test: Does Vitals catch things Levels miss?

### Phase 2: Vitals Primary (2 weeks)
- Vitals becomes primary decision system
- Protection Levels become "override" feature
- Default: No configuration, automatic protection

### Phase 3: Learn & Adapt (ongoing)
- Vitals learns from user behavior
- Infers criticality without configuration
- Protection Levels → "Confirm inference" feature

---

## The Positioning Argument

### Current Message
> "Set protection levels on your critical files"

**Problem:** Requires user to know what's critical and configure it.

### New Message
> "SnapBack automatically protects your code. No configuration needed."

**Benefit:** Instant value, zero friction.

### Power User Message
> "Want more control? Set explicit protection levels to override automatic protection."

**Benefit:** Advanced users get what they want, new users get magic.

---

## Verdict

| Question | Answer |
|----------|--------|
| Is Vitals complementary? | Partially - they solve different problems |
| Is Vitals a replacement? | **Yes, for the primary decision system** |
| Should we keep Levels? | **Yes, as optional override for power users** |
| Which aligns with SnapBack philosophy? | **Vitals** ("invisible until needed") |

### Final Recommendation

**Implement Vitals as the primary protection system.**

Relegate Protection Levels to an "Advanced" feature for users who want explicit control. This:

1. Removes friction (no config required)
2. Provides immediate value (automatic protection)
3. Aligns with "invisible until needed" philosophy
4. Enables AI-native integration (agents query vitals)
5. Preserves power-user control (optional overrides)

This is a **stronger alternative** that absorbs the best of Protection Levels while eliminating their weaknesses.
