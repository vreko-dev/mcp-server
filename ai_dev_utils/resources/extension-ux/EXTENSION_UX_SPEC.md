# SnapBack Extension UX Specification

**Version**: 2.0.0  
**Status**: Consolidated from all UX discussions  
**Last Updated**: December 2024  
**Scope**: Complete VS Code extension UI/UX implementation guide

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Activity Bar & Sidebar](#activity-bar--sidebar)
3. [Tree View Structure](#tree-view-structure)
4. [Status Bar](#status-bar)
5. [WebView Panels](#webview-panels)
6. [Notifications & Toasts](#notifications--toasts)
7. [File Decorations](#file-decorations)
8. [Commands & Keybindings](#commands--keybindings)
9. [Vitals Integration](#vitals-integration)
10. [Pioneer Program UI](#pioneer-program-ui)
11. [Implementation Checklist](#implementation-checklist)

---

## Design Philosophy

### Core Principles

```
OLD: "I configured my protection" (control = value)
NEW: "SnapBack is watching my back" (outcomes = value)
```

| Principle | Implementation |
|-----------|----------------|
| **Invisible until needed** | Silent during normal coding, hero moment on restore |
| **Event-first, not config-first** | Show what happened, not what's configured |
| **Reduce cognitive load** | Minimal parsing required, file names are anchors |
| **Accessible by default** | Text badges + icons, not color-only indicators |
| **Progressive disclosure** | Simple by default, power features discoverable |

### Value Communication Pattern

Borrowed from successful invisible tools:
- **1Password**: "Watchtower caught 3 breached passwords"
- **Backblaze**: "Your files are backed up" + occasional stats
- **Time Machine**: Silent until you need it, then it's a hero

**SnapBack equivalent:**
- Silent during normal coding
- Brief acknowledgment at protection moments
- Hero moment when you restore
- Periodic value summaries (tooltip, sidebar stats)

---

## Activity Bar & Sidebar

### Activity Bar Icon

```
┌─────┐
│ 🛡️  │  ← SnapBack icon (shield with clock/arrow)
└─────┘
```

**Icon States:**
| State | Visual | Meaning |
|-------|--------|---------|
| Idle | Static shield | Normal operation |
| Active session | Subtle pulse/glow | AI detected, actively protecting |
| Needs attention | Badge dot | Action recommended |

### Sidebar Header

**Non-Pioneer (Guest):**
```
┌─────────────────────────────────────────────────────────────┐
│ SNAPBACK                                              [⚙️]  │
├─────────────────────────────────────────────────────────────┤
│ 🚀 Join Pioneers for Pro features              [Get Started]│
└─────────────────────────────────────────────────────────────┘
```

**Pioneer (Authenticated):**
```
┌─────────────────────────────────────────────────────────────┐
│ SNAPBACK                              🌱 175 pts      [⚙️]  │
├─────────────────────────────────────────────────────────────┤
│ 12 checkpoints today • 3 AI sessions                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Tree View Structure

### Before vs After (The Transformation)

```
BEFORE (Config-focused)              AFTER (Event-focused)
─────────────────────────            ─────────────────────────
│ ▼ ACTIONS             │            │ [Undo] [Snap] [Browse] │  ← Toolbar
│   └─ Undo/Create...   │            │                        │
│ ▸ 🛡️ 5 protected     │            │ ▼ ACTIVITY (12)        │
│ ▼ RECENT 3            │            │   ├─ Today (3)         │
│   └─ fix: Modified... │ ← commit   │   │  └─ ✨ AI Edit •   │ ← event
│ ▸ THIS WEEK 7         │ ← ghost?   │   │      Button.tsx    │
│ ▼ SESSIONS            │            │   │      • 2h          │
│   └─ 12/17/25 5:52... │ ← heavy    │   └─ Yesterday (5)     │
└───────────────────────┘            │ ▸ PROTECTED (5)        │
                                     │   ├─ ⛔ BLOCK (2)      │ ← text badge
                                     │ ▸ HISTORY              │
                                     │   └─ 5:52 AM • 1 file  │ ← compressed
                                     │       • 53s • ↩️       │
                                     └─────────────────────────┘
```

### Toolbar Actions (View Title)

Move actions OUT of tree, INTO toolbar:

```json
// package.json
"menus": {
  "view/title": [
    {
      "command": "snapback.undoAISession",
      "when": "view == snapback.mainView",
      "group": "navigation@1"
    },
    {
      "command": "snapback.createSnapshot",
      "when": "view == snapback.mainView",
      "group": "navigation@2"
    },
    {
      "command": "snapback.browseSnapshots",
      "when": "view == snapback.mainView",
      "group": "navigation@3"
    }
  ]
}
```

**Toolbar Icons:**
| Position | Command | Icon | Tooltip |
|----------|---------|------|---------|
| 1 | `undoAISession` | `$(discard)` | "Undo Last AI Session" |
| 2 | `createSnapshot` | `$(device-camera)` | "Create Snapshot" |
| 3 | `browseSnapshots` | `$(history)` | "Browse All Snapshots" |

### Section 1: ACTIVITY

**Purpose:** What happened (event log, not config display)

**Structure:**
```
▼ ACTIVITY (12)
  ├─ Today (3)
  │  ├─ ✨ AI Edit — Button.tsx • 2h
  │  ├─ 💾 Snapshot — Form.tsx • 4h  
  │  └─ ↩️ Restored — 247 files • 6h
  ├─ Yesterday (5)
  │  └─ ...
  └─ Earlier (4)
     └─ ...
```

**Row Format (Standardized):**
```
[Icon] [Event Type] — [File/Count] • [Time]
```

**Icon Semantics (Type-based, NOT source-based):**
| Icon | Event Type | Example |
|------|------------|---------|
| ✨ | AI-assisted edit | AI Edit — Button.tsx • 2h |
| 💾 | Manual snapshot | Snapshot — Form.tsx • 4h |
| 🔄 | Auto snapshot | Auto — config.ts • 1h |
| ↩️ | Restore | Restored — 247 files • 6h |
| ⚙️ | Config change | Protection updated • 4h |

**Source in tooltip/description, NOT icon:**
```
✨ AI Edit — Button.tsx • 2h
   └─ tooltip: "Cursor detected • 127 lines changed"
```

**Expansion State:**
- Remember last state (don't force always-expanded)
- Default: expanded only on first install
- Collapsible by clicking header

**Empty State:**
```
No activity yet
Edit a protected file to see events here
```

### Section 2: PROTECTED

**Purpose:** What files are being watched

**Structure:**
```
▼ PROTECTED (5)
  ├─ All (5)                    ← Flat list option
  ├─ ⛔ BLOCK (2)               ← Text badge for a11y
  │  ├─ Button.tsx
  │  └─ Form.tsx
  ├─ ⚠️ WARN (1)
  │  └─ useButton.ts
  └─ 👁️ WATCH (2)
     ├─ types/button.ts
     └─ styles.css
```

**Key Improvements:**
1. **Text badges** (`BLOCK`, `WARN`, `WATCH`) for accessibility
2. **"All (5)" node** for flat list view
3. **Severity order**: Block → Warn → Watch (top-down)
4. **Hide empty groups** (no "WARN (0)" ghost sections)

**Inline Actions (on hover):**
| Action | Icon | Behavior |
|--------|------|----------|
| Change level | `$(edit)` | Quick picker for level |
| Remove | `$(trash)` | Remove protection |

**Context Menu:**
- Change Protection Level →
- View Snapshots
- Show in Explorer
- Remove Protection

### Section 3: HISTORY (formerly SESSIONS)

**Purpose:** Undoable checkpoints grouped by time

**Rename Rationale:** "Session" is accurate but generic. "History" matches the mental model: "What can I roll back?"

**Structure:**
```
▼ HISTORY
  ├─ Today
  │  ├─ 5:52 AM • 1 file • 53s • ↩️     ← Undoable badge
  │  └─ 4:12 AM • 1 file • 69s • ↩️
  └─ Yesterday
     └─ 1:00 AM • 247 files • 73s
```

**Row Format:**
```
[Time] • [File count] • [Duration] • [Undoable badge if applicable]
```

**Undoable Signal:** `↩️` badge indicates session has restore capability

**Expansion:**
- Click expands to show files within session
- Each file shows diff stats: `Button.tsx (+12, -3)`

**Click Behavior:**
- Single-click: Expand to show files
- Double-click on file: Open diff view

**Context Menu:**
- Restore All Files
- Restore Selected...
- View Diff
- Delete Session

### Section 4: CLOUD (if connected)

**Connected State:**
```
▼ CLOUD
  └─ ✅ Connected • Last sync 2m ago
```

**Disconnected State:**
```
▼ CLOUD
  └─ 🔗 Connect to sync across devices    [Connect]
```

**Context Menu:**
- Manage Connection
- Force Sync
- View Sync History
- Disconnect

---

## Status Bar

### Position & Priority

```typescript
const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100  // High priority, appears left of other items
);
```

### State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                     STATUS BAR STATES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  IDLE ──────────────────────────────────────────────────────────│
│  $(shield) SnapBack                                              │
│  └─ Minimal, confident presence                                 │
│                                                                  │
│  IDLE + STATS ──────────────────────────────────────────────────│
│  $(shield) 3 checkpoints today                                   │
│  └─ After recent activity (shows ongoing value)                 │
│                                                                  │
│  AI SESSION ACTIVE ─────────────────────────────────────────────│
│  $(sparkle) Cursor session protected                             │
│  └─ Real-time AI detection acknowledgment                       │
│                                                                  │
│  CHECKPOINT CREATED ────────────────────────────────────────────│
│  $(check) Checkpoint saved                                       │
│  └─ Brief confirmation (3s), then return to idle                │
│                                                                  │
│  RESTORED ──────────────────────────────────────────────────────│
│  $(history) Restored 47 lines                                    │
│  └─ Hero moment! Warning background, 5s display                 │
│                                                                  │
│  VITALS (Optional Advanced Mode) ───────────────────────────────│
│  💓45 🌡️🔥 📊78 🫁92                                             │
│  └─ Real-time workspace health (power user mode)                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// apps/vscode/src/ui/StatusBarManager.ts

type StatusBarState = 'idle' | 'idle-stats' | 'ai-session' | 'checkpoint' | 'restored' | 'vitals';

export class StatusBarManager {
  private item: vscode.StatusBarItem;
  private state: StatusBarState = 'idle';
  private todayStats = { checkpoints: 0, aiSessions: 0 };

  showIdle(): void {
    if (this.todayStats.checkpoints > 0) {
      const s = this.todayStats.checkpoints === 1 ? '' : 's';
      this.item.text = `$(shield) ${this.todayStats.checkpoints} checkpoint${s} today`;
    } else {
      this.item.text = '$(shield) SnapBack';
    }
    this.item.tooltip = this.buildTooltip();
    this.item.backgroundColor = undefined;
  }

  showAISession(tool?: string): void {
    this.item.text = tool 
      ? `$(sparkle) ${tool} session protected`
      : '$(zap) Active session';
    
    // Return to idle after 5s
    setTimeout(() => this.showIdle(), 5000);
  }

  showCheckpointCreated(): void {
    this.item.text = '$(check) Checkpoint saved';
    this.todayStats.checkpoints++;
    
    // Return to stats view after 3s
    setTimeout(() => this.showIdle(), 3000);
  }

  showRestored(lines?: number): void {
    this.item.text = `$(history) Restored ${lines ?? ''} lines`;
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    
    // Return to idle after 5s
    setTimeout(() => {
      this.item.backgroundColor = undefined;
      this.showIdle();
    }, 5000);
  }

  showVitals(snapshot: VitalsSnapshot): void {
    const pulse = this.pulseEmoji(snapshot.pulse.level);
    const temp = this.tempEmoji(snapshot.temperature.level);
    const pressure = snapshot.pressure.value;
    const oxygen = snapshot.oxygen.value;
    
    this.item.text = `${pulse}${snapshot.pulse.changesPerMinute} ${temp} 📊${pressure} 🫁${oxygen}`;
    this.item.tooltip = this.buildVitalsTooltip(snapshot);
  }

  private buildTooltip(): string {
    return [
      'SnapBack - Active Protection',
      '',
      `Today: ${this.todayStats.checkpoints} checkpoints | ${this.todayStats.aiSessions} AI sessions`,
      '',
      'Click to view checkpoints'
    ].join('\n');
  }

  private pulseEmoji(level: PulseLevel): string {
    return { resting: '💚', elevated: '💛', racing: '🧡', critical: '❤️' }[level];
  }

  private tempEmoji(level: TempLevel): string {
    return { cold: '🧊', warm: '🌡️', hot: '🔥', burning: '🌋' }[level];
  }
}
```

### Click Behavior

| Click | Action |
|-------|--------|
| Left click | Open SnapBack sidebar |
| Right click | Quick menu (View Checkpoints, Create Checkpoint, Session Summary) |

---

## WebView Panels

### Panel Types

| Panel | Trigger | Purpose |
|-------|---------|---------|
| Welcome | First install | Onboarding flow |
| Diff Viewer | Click snapshot file | Native VS Code diff |
| Cluster Viewer | View cluster | Dependency graph visualization |
| Settings | Gear icon | Configuration UI |
| Pioneer Dashboard | Click tier badge | Points, achievements, referrals |

### Welcome Panel (Onboarding)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Welcome to SnapBack                          │
│                                                                  │
│  The undo button for AI coding.                                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Step 1: Try it out                                         ││
│  │                                                              ││
│  │  Open any file and make some edits.                         ││
│  │  SnapBack will automatically protect your work.             ││
│  │                                                              ││
│  │  [Open Tutorial File]                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Step 2: Unlock Pro features                                ││
│  │                                                              ││
│  │  Join Pioneers to get cluster protection,                   ││
│  │  co-change analysis, and lifetime discounts.                ││
│  │                                                              ││
│  │  [Become a Pioneer - Free]       [Maybe Later]              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Diff Viewer

Use native VS Code diff, NOT custom WebView:

```typescript
// Open diff between snapshot and current
async function showDiff(snapshotFile: SnapshotFile): Promise<void> {
  const snapshotUri = vscode.Uri.parse(`snapback:${snapshotFile.path}?snapshot=${snapshotFile.snapshotId}`);
  const currentUri = vscode.Uri.file(snapshotFile.absolutePath);
  
  await vscode.commands.executeCommand(
    'vscode.diff',
    snapshotUri,
    currentUri,
    `${path.basename(snapshotFile.path)} (Snapshot vs Current)`
  );
}
```

### Cluster Viewer (Future)

Interactive graph showing file relationships:
- Anchor files highlighted
- Protection levels as colors
- Click to jump to file
- Hover for details

---

## Notifications & Toasts

### Notification Strategy

**Anti-patterns to avoid:**
```
❌ "Checkpoint created!"           (every 30 seconds = noise)
❌ "SnapBack is protecting you!"   (empty reassurance)
❌ "AI detected in index.ts"       (who cares?)
```

**Good patterns:**
```
✅ "Restored 247 lines (Cmd+Z to undo)"  (action feedback)
✅ "Large change detected - checkpoint saved"  (meaningful event)
✅ "Session restored from 2 hours ago"  (outcome confirmation)
```

### Notification Types

| Type | When | Message Pattern |
|------|------|-----------------|
| Info | Significant events | Short, action-oriented |
| Warning | Needs attention | Clear next step |
| Error | Something failed | What + How to fix |
| Progress | Long operations | Cancellable with progress |

### Implementation

```typescript
// Only notify for significant events
function shouldNotify(event: SnapbackEvent): boolean {
  switch (event.type) {
    case 'restore': return true;  // Always notify
    case 'checkpoint':
      // Only notify for large/important checkpoints
      return event.linesChanged > 100 || event.trigger === 'burst';
    case 'ai-detected':
      return false;  // Silent, use status bar instead
    default:
      return false;
  }
}
```

### Toast Patterns

**Restore Confirmation:**
```typescript
vscode.window.showInformationMessage(
  `Restored ${fileCount} files from ${formatRelativeTime(snapshot.timestamp)}`,
  'View Changes',
  'Undo'
).then(selection => {
  if (selection === 'View Changes') openDiffView(snapshot);
  if (selection === 'Undo') undoRestore();
});
```

**Large Change Detection:**
```typescript
vscode.window.showInformationMessage(
  'Large change detected - checkpoint saved',
  'View Checkpoint'
).then(selection => {
  if (selection === 'View Checkpoint') revealInSidebar(checkpoint);
});
```

---

## File Decorations

### Decoration Types

| Level | Badge | Color | Description |
|-------|-------|-------|-------------|
| BLOCK | 🛑 | Red | Full protection, modal on save |
| WARN | ⚠️ | Yellow | Warning on save |
| WATCH | 👁️ | Blue | Silent snapshots |
| Cluster member | 🔗 | Gray | Part of protected cluster |

### Implementation

```typescript
// apps/vscode/src/decorations/ProtectionDecorationProvider.ts

export class ProtectionDecorationProvider implements vscode.FileDecorationProvider {
  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    const status = this.protectionManager.getStatus(uri);
    if (!status) return undefined;

    const decorations: Record<ProtectionLevel, vscode.FileDecoration> = {
      BLOCK: {
        badge: '🛑',
        color: new vscode.ThemeColor('charts.red'),
        tooltip: 'Protected: BLOCK level'
      },
      WARN: {
        badge: '⚠️',
        color: new vscode.ThemeColor('charts.yellow'),
        tooltip: 'Protected: WARN level'
      },
      WATCH: {
        badge: '👁️',
        color: new vscode.ThemeColor('charts.blue'),
        tooltip: 'Protected: WATCH level'
      }
    };

    return decorations[status.level];
  }
}
```

---

## Commands & Keybindings

### Command Palette Commands

| Command | ID | Keybinding | When |
|---------|----|-----------:|------|
| Create Snapshot | `snapback.createSnapshot` | `Cmd+Shift+S` | Always |
| Undo AI Session | `snapback.undoAISession` | `Cmd+Shift+Z` | Has session |
| Restore from Snapshot | `snapback.restore` | - | Has snapshots |
| Set Protection Level | `snapback.setLevel` | - | Editor open |
| Show History | `snapback.showHistory` | - | Always |
| Browse Snapshots | `snapback.browse` | - | Always |
| Open Sidebar | `snapback.openSidebar` | - | Always |

### Context Menu Commands

**Explorer Context Menu:**
- Protect with SnapBack →
  - Block
  - Warn
  - Watch
- View Snapshots
- Remove Protection

**Editor Context Menu:**
- Protect this file
- View file snapshots
- Restore to snapshot...

### Keybindings

```json
// package.json
"keybindings": [
  {
    "command": "snapback.createSnapshot",
    "key": "cmd+shift+s",
    "mac": "cmd+shift+s",
    "when": "editorFocus"
  },
  {
    "command": "snapback.undoAISession",
    "key": "cmd+shift+z",
    "mac": "cmd+shift+z",
    "when": "snapback.hasActiveSession"
  }
]
```

---

## Vitals Integration

### Status Bar Mode

Power users can enable vitals display in status bar:

```
┌─────────────────────────────────────────────────────────────────┐
│ 💓45 🌡️🔥 📊78 🫁92 │ SnapBack                                   │
│  │   │    │    │                                                 │
│  │   │    │    └── 92% oxygen (snapshot coverage)               │
│  │   │    └── 78% pressure (risk accumulation)                  │
│  │   └── Hot temperature (AI active)                            │
│  └── 45 changes/min pulse                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Vitals Panel (Sidebar Section)

Optional section for power users:

```
▼ VITALS
  ├─ 💓 Pulse: Racing (45/min)
  ├─ 🌡️ Temperature: Hot (72% AI)
  ├─ 📊 Pressure: 78% ↑
  ├─ 🫁 Oxygen: 92%
  └─ Trajectory: escalating → Consider snapshot
```

### Threshold Multiplier Effect

Vitals affects auto-decision thresholds:

| Condition | Multiplier | Effect |
|-----------|------------|--------|
| Hot temperature | 0.8x | More protective (lower threshold) |
| High oxygen | 1.2x | Less protective (higher threshold) |
| High pressure | 0.8x | More protective |
| Recovering trajectory | 1.1x | Slightly relaxed |

---

## Pioneer Program UI

### Status Bar Badge

**Guest:**
```
$(rocket) Join Pioneers
```

**Pioneer:**
```
🌱 175 pts
```

### Sidebar Integration

Header shows Pioneer status and stats:

```
┌─────────────────────────────────────────────────────────────────┐
│ SNAPBACK                              🌱 175/250 pts      [⚙️]  │
│                                       ├─ Grower in 75 pts       │
└─────────────────────────────────────────────────────────────────┘
```

### Feature Gating UI

When non-Pioneer tries to access Pro feature:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔒 Cluster Protection                                          │
│                                                                  │
│  Protect related files together for atomic snapshots.           │
│                                                                  │
│  This file imports 5 other files that could be                  │
│  protected together.                                            │
│                                                                  │
│  [Become a Pioneer - Free]              [Protect Single File]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1-2)

**Tree View Restructure:**
- [ ] Move ACTIONS to view/title toolbar
- [ ] Create ACTIVITY section with event-first rows
- [ ] Standardize icon semantics (type-based, not source-based)
- [ ] Add text badges for protection levels (a11y)
- [ ] Rename SESSIONS → HISTORY
- [ ] Add undoable `↩️` badge to restorable sessions
- [ ] Implement collapsible date groups (Today/Yesterday/Earlier)
- [ ] Hide empty sections

**Status Bar:**
- [ ] Implement state machine (idle → ai-session → checkpoint → restored)
- [ ] Add tooltip with daily stats
- [ ] Wire click to open sidebar
- [ ] Add 3s/5s auto-return to idle state

### Phase 2: Polish (Week 3-4)

**File Decorations:**
- [ ] Implement ProtectionDecorationProvider
- [ ] Add badges for BLOCK/WARN/WATCH
- [ ] Add cluster member indicator

**Commands:**
- [ ] Register all commands in package.json
- [ ] Add keybindings for common actions
- [ ] Add context menu items (explorer + editor)

**Notifications:**
- [ ] Implement notification strategy (minimal, meaningful)
- [ ] Add restore confirmation toast
- [ ] Add large change notification

### Phase 3: Vitals (Week 5-6)

**Status Bar Vitals:**
- [ ] Add vitals display mode (power user setting)
- [ ] Implement emoji indicators for each vital
- [ ] Add vitals tooltip with detailed breakdown

**Sidebar Vitals Section:**
- [ ] Create optional VITALS section
- [ ] Show trajectory and recommendations
- [ ] Wire to threshold multiplier display

### Phase 4: Pioneer (Week 7-8)

**Pioneer Status:**
- [ ] Add tier badge to sidebar header
- [ ] Implement status bar item for guests
- [ ] Add progress to next tier display

**Feature Gating:**
- [ ] Create upsell WebView panel
- [ ] Implement feature gate checks
- [ ] Add graceful degradation for non-Pioneers

---

## Package.json Contributions Summary

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [{
        "id": "snapback-sidebar",
        "title": "SnapBack",
        "icon": "resources/icon.svg"
      }]
    },
    "views": {
      "snapback-sidebar": [{
        "id": "snapback.mainView",
        "name": "SnapBack"
      }]
    },
    "menus": {
      "view/title": [
        { "command": "snapback.undoAISession", "group": "navigation@1" },
        { "command": "snapback.createSnapshot", "group": "navigation@2" },
        { "command": "snapback.browseSnapshots", "group": "navigation@3" }
      ],
      "explorer/context": [
        { "command": "snapback.protectFile", "group": "snapback@1" },
        { "command": "snapback.viewSnapshots", "group": "snapback@2" }
      ],
      "editor/context": [
        { "command": "snapback.protectFile", "group": "snapback@1" }
      ]
    },
    "commands": [
      { "command": "snapback.undoAISession", "title": "Undo AI Session", "icon": "$(discard)" },
      { "command": "snapback.createSnapshot", "title": "Create Snapshot", "icon": "$(device-camera)" },
      { "command": "snapback.browseSnapshots", "title": "Browse Snapshots", "icon": "$(history)" },
      { "command": "snapback.protectFile", "title": "Protect with SnapBack" },
      { "command": "snapback.viewSnapshots", "title": "View Snapshots" },
      { "command": "snapback.restore", "title": "Restore from Snapshot" },
      { "command": "snapback.setLevel", "title": "Set Protection Level" }
    ],
    "keybindings": [
      { "command": "snapback.createSnapshot", "key": "cmd+shift+s", "when": "editorFocus" },
      { "command": "snapback.undoAISession", "key": "cmd+shift+z", "when": "snapback.hasActiveSession" }
    ]
  }
}
```

---

## Related Documents

- `vitals/VITALS_INSTRUCTIONS.md` - Intelligence layer implementation
- `onboarding_and_tree_view/pioneer_full_spec.md` - Pioneer program details
- `onboarding_and_tree_view/architecture_diagram.md` - System architecture

---

*Last updated: December 2024*
*Consolidated from: Tree View UX audit, Status Bar redesign, Value Communication Framework, Vitals integration, Pioneer Program spec*
