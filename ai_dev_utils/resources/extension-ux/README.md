# Extension UX Documentation

This directory contains the comprehensive UI/UX specifications for the SnapBack VS Code extension.

## Documents

| File | Purpose | Status |
|------|---------|--------|
| `EXTENSION_UX_SPEC.md` | **Master specification** - All UI/UX components | ✅ Complete |
| `QUICK_REFERENCE.md` | Implementation cheat sheet with code snippets | ✅ Complete |
| `ROUTER_HINTS.md` | **AI implementation guide** - Gotchas, priorities, verification | ✅ Complete |

## Scaffolded Code

The following files have been created with implementation stubs and comprehensive test coverage:

```
apps/vscode/src/ui/
├── ux-types.ts              # All type definitions
├── StatusBarManager.ts      # Status bar state machine (stubbed)
├── StatusBarManager.test.ts # 40+ test cases
└── sections/
    ├── index.ts             # Central exports
    ├── ActivitySection.ts   # Event log section (stubbed)
    ├── ActivitySection.test.ts
    ├── HistorySection.ts    # Sessions section (stubbed)  
    ├── HistorySection.test.ts
    ├── ProtectedSection.ts  # Protected files (stubbed)
    └── ProtectedSection.test.ts
```

## What's Covered

### Extension Surfaces
- **Activity Bar** - Icon states, badge indicators
- **Sidebar** - Header, all tree view sections
- **Tree View** - Activity, Protected, History, Cloud sections
- **Status Bar** - State machine, vitals display
- **WebView Panels** - Welcome, diff viewer, settings
- **Notifications** - When/what to notify
- **File Decorations** - Protection level badges
- **Commands** - Palette, context menus, keybindings

### Integration Points
- **Vitals Display** - Status bar + optional sidebar section
- **Pioneer Program** - Tier badges, feature gating UI
- **Telemetry** - Event tracking for UX actions

## Key Design Decisions

### Tree View Structure
```
[Toolbar: Undo | Snap | Browse]
├─ ACTIVITY (event log, not config)
├─ PROTECTED (severity-ordered)
├─ HISTORY (undoable sessions)
└─ CLOUD (sync status)
```

### Status Bar States
```
idle → ai-session → checkpoint → restored → idle
       (5s)         (3s)         (5s)
```

### Icon Semantics
- Icons = **event type** (AI, manual, auto, restore)
- Source goes in **tooltip/description** (Cursor, Copilot, etc.)

## Implementation Guide

See `ROUTER_HINTS.md` for:
- ✅ Implementation priorities (Phase 1, 2, 3)
- ✅ Critical gotchas to avoid
- ✅ Package.json changes required
- ✅ Testing commands
- ✅ Verification checklist

## Related Specs

- `../vitals/` - Intelligence layer (feeds into UX)
- `../onboarding_and_tree_view/` - Pioneer program details
- `/mnt/project/extension-audit.md` - Technical audit

---

*Last updated: December 2024*
