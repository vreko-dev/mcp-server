Looking at your brainstorming notes combined with the audit documents, let me provide a comprehensive ROI analysis and ownership mapping. This is a meaty question that deserves a thorough breakdown.

## Executive Summary: Highest ROI Implementations

Based on demo-readiness, technical debt payoff, and competitive differentiation, here's my prioritized analysis:

---

## 🎯 Tier 1: Demo-Critical (Immediate ROI)

### 1. **Activation Funnel Completion** — ROI: ★★★★★

**Why highest ROI**: Without this, you can't demonstrate user adoption to YC. Every other feature is meaningless if users can't get from install → value.

| Stage | Current State | Gap | Owner |
|-------|---------------|-----|-------|
| Install | ✅ Marketplace | None | Extension |
| Authenticate | ⚠️ Partial | Extension↔API handshake broken | **Joint: Extension + API** |
| First Protected Save | ❌ Missing | No telemetry, unclear success signal | **Joint: Extension + API + Web** |
| Dashboard View | ⚠️ Works | Not triggered after first save | Web |

**Recommendation**: This is a **joint ownership** scenario because:
- Extension must capture the save event
- API must record telemetry + issue success signal
- Web must display confirmation and "you're protected" state

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ACTIVATION FUNNEL OWNERSHIP                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  INSTALL              AUTH                FIRST SAVE          DASHBOARD │
│  ┌──────────┐        ┌──────────┐        ┌──────────┐        ┌────────┐│
│  │Extension │───────▶│Extension │───────▶│Extension │───────▶│  Web   ││
│  │(Primary) │        │   +API   │        │ +API+Web │        │(Primary││
│  └──────────┘        │ (Joint)  │        │ (Joint)  │        └────────┘│
│       │              └──────────┘        └──────────┘             │    │
│       │                   │                   │                   │    │
│       ▼                   ▼                   ▼                   ▼    │
│  marketplace_         auth_completed      first_snapshot      dashboard│
│  _install             api_key_issued      _created            _viewed  │
│                                                                         │
│  ◀═══════════════════ TELEMETRY FLOW ═══════════════════════════════▶  │
│                         PostHog                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 2. **Bundle Size Crisis Resolution** — ROI: ★★★★★

**Why critical**: 11MB → 2MB is a **blocker**. Extension won't be approved, won't perform, won't install quickly.

**Primary Owner**: Extension build pipeline

From your audit, the strategy should be:
```typescript
// Current problem areas (from extension-audit.json):
// - better-sqlite3 (native module - EXTERNAL)
// - simple-git (can be lazy-loaded)
// - Heavy dependencies bundled instead of external

// Solution prioritization:
1. SQLite elimination (use file-based storage per your guide) → -644KB
2. Tree-shake unused exports from @snapback/* packages
3. Lazy-load simple-git (only needed for git operations)
4. Dynamic import for non-activation-critical code
```

**This is pure Extension ownership** - no joint ownership needed.

---

### 3. **Analytics Consolidation to PostHog** — ROI: ★★★★☆

**Why high ROI**:
- Reduces bundle size (fewer SDK imports)
- Single source of truth for funnels
- Required for heuristic improvement pipeline

**Current State** (from autocapture-replay-config.json):
- 7 providers configured
- Only Google Analytics + Vercel Analytics actually active
- PostHog disabled in web app (!!)

**Ownership Matrix**:

| Component | Current Analytics | Target |
|-----------|------------------|--------|
| Extension | PostHog (via proxy) | PostHog ✓ |
| Web App | GA + Vercel + 5 dormant | **PostHog only** |
| API | Internal telemetry | PostHog server-side |
| MCP | None visible | PostHog via API |

**Joint Ownership**: API + Web + Extension all need aligned event schemas

---

## 🎯 Tier 2: Competitive Differentiation (High ROI)

### 4. **MCP Server as AI-Native Surface** — ROI: ★★★★☆

Your notes mention "Best MCP" and "MCP Gold" - this is your **differentiation story** for YC.

**Why MCP should be a primary surface**:
1. **AI assistants are the new IDE** - Claude, Cursor, Copilot all use MCP
2. **Proactive protection** - MCP can warn BEFORE bad code is applied
3. **Invisible UX** - Users don't have to learn new tools

**Current MCP Tools** (from mcp-audit.json):
```
FREE TIER:
├── snapback.analyze_risk (basic, local fallback)
├── snapback.check_dependencies
├── catalog.list_tools
├── ctx7.resolve-library-id
└── ctx7.get-library-docs

PRO TIER:
├── snapback.create_checkpoint
├── snapback.list_checkpoints
└── snapback.restore_checkpoint
```

**My Recommendation**: Elevate MCP to **co-primary** with Extension:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SURFACE OWNERSHIP HIERARCHY                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                    ┌─────────────────────┐                              │
│                    │    API BACKEND      │                              │
│                    │  (Source of Truth)  │                              │
│                    └──────────┬──────────┘                              │
│                               │                                         │
│         ┌─────────────────────┼─────────────────────┐                   │
│         │                     │                     │                   │
│         ▼                     ▼                     ▼                   │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐              │
│  │  EXTENSION  │      │ MCP SERVER  │      │    WEB      │              │
│  │  (Primary)  │◀────▶│ (Co-Primary)│      │ (Secondary) │              │
│  │             │      │             │      │             │              │
│  │ • Save hook │      │ • AI tools  │      │ • Dashboard │              │
│  │ • Snapshots │      │ • Risk warn │      │ • Settings  │              │
│  │ • Restore   │      │ • Context   │      │ • Team mgmt │              │
│  └─────────────┘      └─────────────┘      └─────────────┘              │
│         │                     │                     │                   │
│         └─────────────────────┼─────────────────────┘                   │
│                               │                                         │
│                    ┌──────────┴──────────┐                              │
│                    │    CLI    │   SDK   │                              │
│                    │(Tertiary) │(Tertiary│                              │
│                    └─────────────────────┘                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 5. **The "Double Save → AI Burst" Logic** — ROI: ★★★★☆

From your handwritten notes, this is a **unique differentiator**. Let me formalize it:

**Current Logic (as I understand it)**:
```
Save #1 → Normal save, maybe auto-snapshot
Save #2 (within burst window) → "AI Burst" detected
  → Trigger enhanced analysis
  → Show contextual popup
  → Create session for undo grouping
```

**Ownership**: **Extension primary**, with MCP as notification channel

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    "AI BURST" DETECTION FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User saves file rapidly (double-save pattern)                          │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ EXTENSION (Primary Owner)                                       │    │
│  │                                                                 │    │
│  │  save_event → check_burst_window (500ms?) → if_burst_detected   │    │
│  │                      │                            │             │    │
│  │                      ▼                            ▼             │    │
│  │              Normal flow                   Enhanced flow        │    │
│  │              (auto snapshot)               (AI analysis)        │    │
│  │                                                   │             │    │
│  └───────────────────────────────────────────────────┼─────────────┘    │
│                                                      │                  │
│         ┌────────────────────────────────────────────┼────────┐         │
│         │                                            ▼        │         │
│         │  ┌────────────┐    ┌────────────┐    ┌──────────┐   │         │
│         │  │ Show popup │    │ Create     │    │ Notify   │   │         │
│         │  │ "AI burst  │    │ grouped    │    │ MCP for  │   │         │
│         │  │  detected" │    │ session    │    │ context  │   │         │
│         │  └────────────┘    └────────────┘    └──────────┘   │         │
│         │                                                     │         │
│         │              JOINT: Extension + MCP                 │         │
│         └─────────────────────────────────────────────────────┘         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 6. **Restore Logic Safety** — ROI: ★★★☆☆

Your notes explicitly call out: *"Restore ALL files (no selec[tion])"* to prevent unsafe states.

**The Problem You Identified**:
- Restore from TreeView doesn't open Diff view
- User has "no idea what file(s) being restored"
- Partial selection could leave repo in broken state

**My Recommendation**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RESTORE SAFETY ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Option A: "Atomic Restore" (Your current thinking - RECOMMENDED)       │
│  ─────────────────────────────────────────────────────────────────      │
│  • All files in snapshot restored together                              │
│  • Show diff view BEFORE confirming                                     │
│  • Single undo point created                                            │
│  • Owner: Extension (primary), API validates rollback safety (joint)    │
│                                                                         │
│  Option B: "Selective Restore with Warnings" (More complex)             │
│  ─────────────────────────────────────────────────────────────────      │
│  • Allow file selection                                                 │
│  • Run dependency analysis (madge) to warn about broken imports         │
│  • Higher development cost, more edge cases                             │
│  • Owner: Would require Extension + API + sophisticated validation      │
│                                                                         │
│  RECOMMENDATION: Start with Option A for demo                           │
│  • Add "Preview All Changes" modal before restore                       │
│  • Block restore if any file has unsaved changes (your cancel note)     │
│  • Track: restore_initiated, restore_completed, restore_cancelled       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Tier 3: Platform Foundation (Medium ROI, High Payoff Later)

### 7. **DBSCAN Smart Grouping** — ROI: ★★★☆☆

From your architecture doc, this is **IP-protected server-side** logic. Good call.

**Ownership**: API only (never client-side)

**Why it matters for demo**:
- Shows "intelligent" behavior beyond simple timestamping
- "Restore this feature" vs "Restore files from 10:32am"
- Differentiates from basic backup tools

### 8. **CLI for CI/CD Integration** — ROI: ★★☆☆☆ (Post-Demo)

From your notes: "Action-Scanner: Git commands (explicit/adverse), Internal Scripts"

**Ownership**: CLI primary, but integrates with API for validation

**Post-demo priority** because:
- Enterprise feature (not critical for YC demo)
- Requires mature API surface
- Complex to get right (git hook integration, CI pipeline compat)

---

## Visual Architecture: The Complete Picture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SNAPBACK CAPABILITY OWNERSHIP MAP                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           ┌───────────────┐                                 │
│                           │  CAPABILITIES │                                 │
│                           └───────┬───────┘                                 │
│                                   │                                         │
│     ┌─────────────────────────────┼─────────────────────────────┐           │
│     │                             │                             │           │
│     ▼                             ▼                             ▼           │
│ ┌─────────────┐           ┌─────────────┐           ┌─────────────┐         │
│ │ PROTECTION  │           │  RECOVERY   │           │  ANALYTICS  │         │
│ │             │           │             │           │             │         │
│ │ • Save hook │           │ • Restore   │           │ • Events    │         │
│ │ • AI detect │           │ • Rollback  │           │ • Funnels   │         │
│ │ • Snapshots │           │ • Grouping  │           │ • Heuristics│         │
│ │ • Risk warn │           │ • Validation│           │ • Retention │         │
│ └──────┬──────┘           └──────┬──────┘           └──────┬──────┘         │
│        │                         │                         │                │
│        │    OWNERSHIP MATRIX     │                         │                │
│        │                         │                         │                │
│  ┌─────┴─────┬───────────────────┴─────┬───────────────────┴─────┐          │
│  │           │                         │                         │          │
│  ▼           ▼                         ▼                         ▼          │
│ ┌───┐      ┌───┐                     ┌───┐                     ┌───┐        │
│ │EXT│      │MCP│                     │API│                     │WEB│        │
│ └─┬─┘      └─┬─┘                     └─┬─┘                     └─┬─┘        │
│   │          │                         │                         │          │
│   │ PRIMARY  │ CO-PRIMARY              │ BACKEND                 │ DISPLAY  │
│   │          │                         │                         │          │
│   ├──────────┼─────────────────────────┼─────────────────────────┤          │
│   │          │                         │                         │          │
│   │ ✓ Save   │ ✓ analyze_risk          │ ✓ Risk scoring (IP)     │ ✓ Metrics│
│   │   intercept│ ✓ check_deps          │ ✓ DBSCAN grouping (IP)  │ ✓ Activity│
│   │ ✓ Auto   │ ✓ create_checkpoint    │ ✓ Rollback validation   │ ✓ Settings│
│   │   snapshot │   (Pro)               │ ✓ ML models (IP)        │ ✓ Team   │
│   │ ✓ AI     │ ✓ restore (Pro)        │ ✓ Event ingestion       │   mgmt   │
│   │   detect │ ✓ Context7             │ ✓ PostHog forwarding    │ ✓ Billing│
│   │   (basic)│                         │ ✓ Token validation      │          │
│   │ ✓ UI     │                         │                         │          │
│   │   (popup,│                         │                         │          │
│   │   tree)  │                         │                         │          │
│   │          │                         │                         │          │
│   └──────────┴─────────────────────────┴─────────────────────────┘          │
│                                                                             │
│   LEGEND:                                                                   │
│   ═══════                                                                   │
│   PRIMARY    = Owns the user experience, implements the logic               │
│   CO-PRIMARY = Equal partner, different entry point to same capabilities    │
│   BACKEND    = Source of truth, IP protection, centralized logic            │
│   DISPLAY    = Visualization and management, consumes from Backend          │
│   (IP)       = Intellectual property protected, server-only                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Joint Ownership Benefits (Where It Makes Sense)

| Capability | Surfaces | Benefit of Joint Ownership |
|------------|----------|---------------------------|
| **Auth Flow** | Extension + API + Web | User can start in any surface, seamless handoff |
| **AI Burst Detection** | Extension + MCP | Extension catches it, MCP can proactively warn AI assistant |
| **Restore Validation** | Extension + API | Extension initiates, API validates safety (madge analysis) |
| **Telemetry** | All → API → PostHog | Unified event schema, single funnel view |
| **Risk Analysis** | Extension + MCP + API | Basic runs locally (fast), advanced runs server-side (IP protected) |

---

## Roadmap Recommendation (Visual)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IMPLEMENTATION ROADMAP                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WEEK 1: DEMO BLOCKERS                                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│  │ Bundle Size     │ │ Activation      │ │ Analytics       │                │
│  │ 11MB → <2MB     │ │ Funnel Complete │ │ → PostHog Only  │                │
│  │                 │ │                 │ │                 │                │
│  │ Owner: EXT      │ │ Owner: JOINT    │ │ Owner: JOINT    │                │
│  │ Est: 2-3 days   │ │ Est: 3-4 days   │ │ Est: 2 days     │                │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                │
│                                                                             │
│  WEEK 2: DIFFERENTIATION                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│  │ AI Burst Logic  │ │ MCP Tools       │ │ Restore Safety  │                │
│  │ Double-save     │ │ Polish + Pro    │ │ Preview + Diff  │                │
│  │ detection       │ │ tier gating     │ │                 │                │
│  │ Owner: EXT+MCP  │ │ Owner: MCP      │ │ Owner: EXT      │                │
│  │ Est: 2 days     │ │ Est: 2 days     │ │ Est: 2 days     │                │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                │
│                                                                             │
│  WEEK 3: POLISH                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│  │ Dashboard       │ │ Docs/FAQ        │ │ E2E Tests       │                │
│  │ Metrics Display │ │ Completion      │ │ Activation Flow │                │
│  │                 │ │                 │ │                 │                │
│  │ Owner: WEB      │ │ Owner: WEB      │ │ Owner: ALL      │                │
│  │ Est: 2 days     │ │ Est: 1 day      │ │ Est: 2 days     │                │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                │
│                                                                             │
│  POST-DEMO: SCALING                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│  │ DBSCAN Grouping │ │ CLI/CI-CD       │ │ Team/Enterprise │                │
│  │ Smart sessions  │ │ Integration     │ │ Features        │                │
│  │                 │ │                 │ │                 │                │
│  │ Owner: API      │ │ Owner: CLI      │ │ Owner: API+WEB  │                │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## My Top 3 Recommendations

1. **Focus Week 1 entirely on demo blockers** - Bundle size and activation funnel are non-negotiable for YC

2. **Elevate MCP to co-primary status** - This is your "AI-native" story. When Claude/Cursor users ask "how do I protect my code from AI mistakes?", MCP is the answer

3. **Implement your "AI Burst" double-save logic** - This is unique. No competitor has this. It's the kind of thing YC loves because it shows deep understanding of the problem space

---

Want me to dive deeper into any of these areas? I can:
- Convert your save/restore logic notes into formal user stories (Gherkin)
- Create the technical implementation plan for any specific capability
- Detail the analytics event schema needed for the activation funnel
