# Extension UX Quick Reference

Copy-paste ready code snippets and patterns for implementation.

---

## Tree View Toolbar (package.json)

```json
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

---

## Activity Row Format

```
[Icon] [Event Type] — [File] • [Time]
```

**Examples:**
```
✨ AI Edit — Button.tsx • 2h
💾 Snapshot — Form.tsx • 4h
↩️ Restored — 247 files • 6h
⚙️ Config updated • 4h
```

**Icon Map:**
```typescript
const EVENT_ICONS = {
  'ai-edit': '✨',
  'manual-snapshot': '💾',
  'auto-snapshot': '🔄',
  'restore': '↩️',
  'config-change': '⚙️',
} as const;
```

---

## Status Bar State Machine

```typescript
type StatusBarState = 'idle' | 'idle-stats' | 'ai-session' | 'checkpoint' | 'restored';

const STATUS_BAR_TEXT: Record<StatusBarState, string> = {
  'idle': '$(shield) SnapBack',
  'idle-stats': '$(shield) {n} checkpoints today',
  'ai-session': '$(sparkle) {tool} session protected',
  'checkpoint': '$(check) Checkpoint saved',
  'restored': '$(history) Restored {n} lines',
};

const STATE_TIMEOUTS: Record<StatusBarState, number> = {
  'idle': 0,           // Permanent
  'idle-stats': 0,     // Permanent
  'ai-session': 5000,  // 5s → idle
  'checkpoint': 3000,  // 3s → idle-stats
  'restored': 5000,    // 5s → idle
};
```

---

## Protection Level Badges

```typescript
const LEVEL_DECORATIONS = {
  BLOCK: { badge: '🛑', color: 'charts.red', text: 'BLOCK' },
  WARN:  { badge: '⚠️', color: 'charts.yellow', text: 'WARN' },
  WATCH: { badge: '👁️', color: 'charts.blue', text: 'WATCH' },
} as const;
```

---

## Tree Item Creation Patterns

### Activity Item
```typescript
createActivityItem(event: ActivityEvent): vscode.TreeItem {
  const icon = EVENT_ICONS[event.type];
  const time = formatRelativeTime(event.timestamp);
  
  const item = new vscode.TreeItem(
    `${icon} ${event.label} — ${event.file} • ${time}`,
    vscode.TreeItemCollapsibleState.None
  );
  
  item.tooltip = new vscode.MarkdownString(
    `**${event.label}**\n\n` +
    `File: ${event.file}\n` +
    `Source: ${event.source}\n` +
    `Time: ${formatAbsoluteTime(event.timestamp)}`
  );
  
  item.command = {
    command: 'snapback.showEventDetails',
    arguments: [event.id]
  };
  
  return item;
}
```

### History/Session Item
```typescript
createSessionItem(session: Session): vscode.TreeItem {
  const time = formatTime(session.timestamp); // "5:52 AM"
  const files = session.fileCount;
  const duration = formatDuration(session.duration); // "53s"
  const undoable = session.canRestore ? ' • ↩️' : '';
  
  const item = new vscode.TreeItem(
    `${time} • ${files} file${files > 1 ? 's' : ''} • ${duration}${undoable}`,
    vscode.TreeItemCollapsibleState.Collapsed
  );
  
  item.contextValue = session.canRestore ? 'session-restorable' : 'session';
  
  return item;
}
```

### Protected File Item
```typescript
createProtectedItem(file: ProtectedFile): vscode.TreeItem {
  const decoration = LEVEL_DECORATIONS[file.level];
  
  const item = new vscode.TreeItem(
    path.basename(file.path),
    vscode.TreeItemCollapsibleState.None
  );
  
  item.description = file.isInherited 
    ? `(from ${path.basename(file.anchor)})`
    : undefined;
  
  item.iconPath = new vscode.ThemeIcon(
    'file',
    new vscode.ThemeColor(decoration.color)
  );
  
  item.contextValue = 'protected-file';
  
  return item;
}
```

---

## Notification Patterns

### Should Notify?
```typescript
function shouldNotify(event: SnapbackEvent): boolean {
  switch (event.type) {
    case 'restore': 
      return true;  // Always
    case 'checkpoint':
      return event.linesChanged > 100 || event.trigger === 'burst';
    case 'ai-detected':
      return false;  // Use status bar
    default:
      return false;
  }
}
```

### Restore Toast
```typescript
const selection = await vscode.window.showInformationMessage(
  `Restored ${fileCount} files from ${formatRelativeTime(timestamp)}`,
  'View Changes',
  'Undo'
);

if (selection === 'View Changes') openDiffView(snapshot);
if (selection === 'Undo') undoRestore();
```

---

## Vitals Status Bar Display

```typescript
function formatVitals(v: VitalsSnapshot): string {
  const pulse = { resting: '💚', elevated: '💛', racing: '🧡', critical: '❤️' }[v.pulse.level];
  const temp = { cold: '🧊', warm: '🌡️', hot: '🔥', burning: '🌋' }[v.temperature.level];
  
  return `${pulse}${v.pulse.changesPerMinute} ${temp} 📊${v.pressure.value} 🫁${v.oxygen.value}`;
}
```

---

## Date Grouping Utility

```typescript
function groupByDate<T>(items: T[], getDate: (item: T) => Date): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);
  
  for (const item of items) {
    const date = startOfDay(getDate(item));
    let key: string;
    
    if (isSameDay(date, today)) {
      key = 'Today';
    } else if (isSameDay(date, yesterday)) {
      key = 'Yesterday';
    } else {
      key = 'Earlier';
    }
    
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  
  return groups;
}
```

---

## Context Values for Menus

```typescript
// In TreeItem creation
item.contextValue = 'protected-file';      // For file actions
item.contextValue = 'session-restorable';  // For restore action
item.contextValue = 'snapshot';            // For snapshot actions

// In package.json
"menus": {
  "view/item/context": [
    {
      "command": "snapback.restore",
      "when": "viewItem == session-restorable"
    },
    {
      "command": "snapback.changeLevel",
      "when": "viewItem == protected-file"
    }
  ]
}
```

---

## File Location Reference

```
apps/vscode/src/
├── views/
│   ├── SidebarProvider.ts       # Main tree data provider
│   ├── ActivitySection.ts       # Activity items
│   ├── ProtectedSection.ts      # Protected files items
│   ├── HistorySection.ts        # Session/history items
│   └── CloudSection.ts          # Cloud sync status
├── ui/
│   ├── StatusBarManager.ts      # Status bar state machine
│   └── NotificationManager.ts   # Toast logic
├── decorations/
│   └── ProtectionDecorationProvider.ts
├── commands/
│   ├── undoAISession.ts
│   ├── createSnapshot.ts
│   ├── restore.ts
│   └── setLevel.ts
└── webviews/
    ├── WelcomePanel.ts
    └── SettingsPanel.ts
```

---

*Use alongside EXTENSION_UX_SPEC.md for full context*
